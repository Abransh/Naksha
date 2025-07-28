/**
 * Session Management Routes
 * 
 * Handles all session-related operations:
 * - Session creation and scheduling
 * - Session updates and status management
 * - Session cancellation and rescheduling
 * - Meeting link generation
 * - Session analytics and reporting
 * - Bulk operations on sessions
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getPrismaClient } from '../../config/database';
import { cacheUtils } from '../../config/redis';
import { AuthenticatedRequest } from '../../middleware/auth';
import { validateRequest, commonSchemas } from '../../middleware/validation';
import { AppError, NotFoundError, ValidationError } from '../../middleware/errorHandler';
import { sendSessionConfirmationEmail } from '../../services/resendEmailService';
import { generateMeetingLink } from '../../services/meetingService';
import { calculateSessionMetrics } from '../../utils/analytics';

const router = Router();

/**
 * Validation schemas
 */

const createSessionSchema = z.object({
  clientId: z.string().min(1, 'Client ID is required'),
  title: z.string().min(1, 'Title is required').max(300, 'Title too long'),
  sessionType: z.enum(['PERSONAL', 'WEBINAR']),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  scheduledTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
  durationMinutes: z.number().min(15).max(480).optional().default(60),
  amount: z.number().gte(0, 'Amount cannot be negative'),
  platform: z.enum(['TEAMS']),
  notes: z.string().max(1000).optional(),
  paymentMethod: z.enum(['online', 'cash', 'bank_transfer']).optional().default('online')
});

const updateSessionSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  scheduledTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  durationMinutes: z.number().min(15).max(480).optional(),
  amount: z.number().gte(0).optional(),
  platform: z.enum(['TEAMS']).optional(),
  status: z.enum(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'RETURNED', 'ABANDONED', 'NO_SHOW']).optional(),
  paymentStatus: z.enum(['PENDING', 'PAID', 'REFUNDED', 'FAILED']).optional(),
  notes: z.string().max(1000).optional(),
  consultantNotes: z.string().max(1000).optional()
});

const sessionFiltersSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'RETURNED', 'ABANDONED', 'NO_SHOW']).optional(),
  paymentStatus: z.enum(['PENDING', 'PAID', 'REFUNDED', 'FAILED']).optional(),
  sessionType: z.enum(['PERSONAL', 'WEBINAR']).optional(),
  platform: z.enum(['ZOOM', 'MEET', 'TEAMS']).optional(),
  clientId: z.string().min(1).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  search: z.string().max(100).optional()
});

const bulkUpdateSchema = z.object({
  sessionIds: z.array(z.string().min(1)).min(1, 'At least one session ID required').max(50, 'Too many sessions'),
  updates: z.object({
    status: z.enum(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'RETURNED', 'ABANDONED', 'NO_SHOW']).optional(),
    paymentStatus: z.enum(['PENDING', 'PAID', 'REFUNDED', 'FAILED']).optional(),
    consultantNotes: z.string().max(1000).optional()
  }).refine(data => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update'
  })
});

const bookSessionSchema = z.object({
  // Client information (auto-create if not exists)
  fullName: z.string().min(1, 'Full name is required').max(200, 'Name too long'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(1, 'Phone number is required').max(20, 'Phone number too long'),
  
  // Session information
  sessionType: z.enum(['PERSONAL', 'WEBINAR']),
  selectedDate: z.string().optional(), // Optional for manual scheduling
  selectedTime: z.string().optional(), // Optional for manual scheduling  
  duration: z.number().min(15).max(480).default(60),
  amount: z.number().gte(0, 'Amount cannot be negative'),
  clientNotes: z.string().max(1000).optional(),
  consultantSlug: z.string().min(1, 'Consultant slug is required')
});


/**
 * GET /api/sessions
 * Get sessions with filtering, sorting, and pagination
 */
router.get('/',
  validateRequest(sessionFiltersSchema, 'query'),
  validateRequest(commonSchemas.pagination, 'query'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const consultantId = req.user!.id;
      const filters = req.query as any;
      const { page, limit, sortBy, sortOrder } = req.query as any;

      // Build cache key
      const cacheKey = `sessions:${consultantId}:${JSON.stringify(filters)}:${page}:${limit}:${sortBy}:${sortOrder}`;
      
      // Check cache first
      const cachedResult = await cacheUtils.get(cacheKey);
      if (cachedResult) {
        res.json({
          data: cachedResult,
          fromCache: true
        });
        return;
      }

      const prisma = getPrismaClient();

      // Build where clause
      const where: any = {
        consultantId,
        ...(filters.status && { status: filters.status }),
        ...(filters.paymentStatus && { paymentStatus: filters.paymentStatus }),
        ...(filters.sessionType && { sessionType: filters.sessionType }),
        ...(filters.platform && { platform: filters.platform }),
        ...(filters.clientId && { clientId: filters.clientId }),
        ...(filters.startDate && filters.endDate && {
          scheduledDate: {
            gte: new Date(filters.startDate),
            lte: new Date(filters.endDate)
          }
        }),
        ...(filters.search && {
          OR: [
            { title: { contains: filters.search, mode: 'insensitive' } },
            { notes: { contains: filters.search, mode: 'insensitive' } },
            { client: { name: { contains: filters.search, mode: 'insensitive' } } },
            { client: { email: { contains: filters.search, mode: 'insensitive' } } }
          ]
        })
      };

      // Build order by clause
      const orderBy: any = {};
      if (sortBy) {
        if (sortBy === 'clientName') {
          orderBy.client = { name: sortOrder };
        } else if (sortBy === 'scheduledDateTime') {
          orderBy.scheduledDate = sortOrder;
        } else {
          orderBy[sortBy] = sortOrder;
        }
      } else {
        orderBy.scheduledDate = 'desc';
      }

      // Get total count
      const totalCount = await prisma.session.count({ where });

      // Get sessions with pagination
      const sessions = await prisma.session.findMany({
        where,
        include: {
          client: {
            select: {
              id: true,
              name: true,
              email: true,
              phoneNumber: true,
              totalSessions: true
            }
          }
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit
      });

      // Format response data
      const formattedSessions = sessions.map((session:any) => ({
        id: session.id,
        title: session.title,
        sessionType: session.sessionType,
        scheduledDate: session.scheduledDate.toISOString().split('T')[0],
        scheduledTime: session.scheduledTime,
        durationMinutes: session.durationMinutes,
        amount: Number(session.amount),
        currency: session.currency,
        platform: session.platform,
        meetingLink: session.meetingLink,
        status: session.status,
        paymentStatus: session.paymentStatus,
        paymentMethod: session.paymentMethod,
        notes: session.notes,
        consultantNotes: session.consultantNotes,
        isRepeatClient: session.isRepeatClient,
        bookingSource: session.bookingSource,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        client: session.client
      }));

      const result = {
        sessions: formattedSessions,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
          hasNextPage: page < Math.ceil(totalCount / limit),
          hasPrevPage: page > 1
        },
        filters: filters
      };

      // Cache for 30 seconds
      await cacheUtils.set(cacheKey, result, 30);

      res.json({
        data: result,
        fromCache: false
      });

    } catch (error) {
      console.error('❌ Get sessions error:', error);
      throw new AppError('Failed to fetch sessions', 500, 'SESSIONS_FETCH_ERROR');
    }
  }
);

/**
 * GET /api/sessions/:id
 * Get a specific session by ID
 */
router.get('/:id',
  validateRequest(z.object({ id: z.string().min(1) }), 'params'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const consultantId = req.user!.id;

      const prisma = getPrismaClient();

      const session = await prisma.session.findFirst({
        where: {
          id,
          consultantId
        },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              email: true,
              phoneCountryCode: true,
              phoneNumber: true,
              address: true,
              city: true,
              state: true,
              country: true,
              totalSessions: true,
              totalAmountPaid: true,
              createdAt: true
            }
          },
          paymentTransactions: {
            select: {
              id: true,
              amount: true,
              status: true,
              paymentMethod: true,
              gatewayPaymentId: true,
              processedAt: true,
              createdAt: true
            },
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      if (!session) {
        throw new NotFoundError('Session');
      }

      // Format the response
      const formattedSession = {
        ...session,
        amount: Number(session.amount),
        client: {
          ...session.client,
          totalAmountPaid: Number(session.client.totalAmountPaid)
        },
        paymentTransactions: session.paymentTransactions.map((tx:any) => ({
          ...tx,
          amount: Number(tx.amount)
        }))
      };

      res.json({
        data: { session: formattedSession }
      });

    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      console.error('❌ Get session error:', error);
      throw new AppError('Failed to fetch session', 500, 'SESSION_FETCH_ERROR');
    }
  }
);

/**
 * POST /api/sessions
 * Create a new session
 */
router.post('/',
  validateRequest(createSessionSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const consultantId = req.user!.id;
      const sessionData = req.body;

      const prisma = getPrismaClient();

      // Verify client belongs to consultant
      const client = await prisma.client.findFirst({
        where: {
          id: sessionData.clientId,
          consultantId
        }
      });

      if (!client) {
        throw new NotFoundError('Client');
      }

      // Check if consultant has availability at this time
      const scheduledDateTime = new Date(`${sessionData.scheduledDate}T${sessionData.scheduledTime}`);
      
      const conflictingSession = await prisma.session.findFirst({
        where: {
          consultantId,
          scheduledDate: new Date(sessionData.scheduledDate),
          scheduledTime: sessionData.scheduledTime,
          status: {
            not: 'CANCELLED'
          }
        }
      });

      if (conflictingSession) {
        throw new ValidationError('You already have a session scheduled at this time');
      }

      // Check if it's a repeat client (commented out as not needed for Resend email)
      // const clientSessionCount = await prisma.session.count({
      //   where: {
      //     clientId: sessionData.clientId,
      //     status: 'COMPLETED'
      //   }
      // });

      // const isRepeatClient = clientSessionCount > 0; // Not used in Resend email

      // Get consultant's Teams access token if needed
      let consultantAccessToken: string | undefined;
      if (sessionData.platform === 'TEAMS') {
        console.log('🔍 [SESSIONS] Checking Teams integration for consultant:', consultantId);
        
        const consultant = await prisma.consultant.findUnique({
          where: { id: consultantId },
          select: { 
            id: true,
            teamsAccessToken: true,
            teamsTokenExpiresAt: true,
            teamsUserEmail: true
          }
        });

        if (!consultant?.teamsAccessToken || !consultant?.teamsTokenExpiresAt) {
          console.error('❌ [SESSIONS] Teams integration not connected:', {
            consultantId,
            hasToken: !!consultant?.teamsAccessToken,
            hasExpiration: !!consultant?.teamsTokenExpiresAt,
            userEmail: consultant?.teamsUserEmail
          });
          throw new ValidationError('Microsoft Teams integration is not connected. Please connect your Microsoft account in Settings.');
        }

        const currentTime = new Date();
        const tokenExpiresAt = new Date(consultant.teamsTokenExpiresAt);
        const isExpired = tokenExpiresAt < currentTime;
        
        console.log('🕐 [SESSIONS] Token expiration check:', {
          consultantId,
          currentTime: currentTime.toISOString(),
          tokenExpiresAt: tokenExpiresAt.toISOString(),
          isExpired,
          timeUntilExpiration: tokenExpiresAt.getTime() - currentTime.getTime(),
          userEmail: consultant.teamsUserEmail
        });

        if (isExpired) {
          console.error('❌ [SESSIONS] Teams token expired:', {
            consultantId,
            expiredAt: tokenExpiresAt.toISOString(),
            currentTime: currentTime.toISOString(),
            expiredBy: currentTime.getTime() - tokenExpiresAt.getTime()
          });
          throw new ValidationError('Microsoft Teams access token has expired. Please reconnect your Microsoft account in Settings.');
        }

        consultantAccessToken = consultant.teamsAccessToken;
        console.log('✅ [SESSIONS] Teams token valid, proceeding with meeting creation');
      }

      // Generate meeting link based on platform
      let meetingDetails;
      try {
        console.log('🔗 [SESSIONS] Generating meeting link:', {
          platform: sessionData.platform,
          title: sessionData.title,
          startTime: scheduledDateTime.toISOString(),
          duration: sessionData.durationMinutes,
          consultantEmail: req.user!.email,
          clientEmail: client.email,
          hasAccessToken: !!consultantAccessToken
        });

        meetingDetails = await generateMeetingLink(
          sessionData.platform,
          {
            title: sessionData.title,
            startTime: scheduledDateTime,
            duration: sessionData.durationMinutes,
            consultantEmail: req.user!.email,
            clientEmail: client.email
          },
          consultantAccessToken
        );

        console.log('✅ [SESSIONS] Meeting link generated successfully:', {
          meetingId: meetingDetails.meetingId,
          meetingLink: meetingDetails.meetingLink,
          platform: sessionData.platform
        });
      } catch (meetingError: any) {
        console.error('❌ [SESSIONS] Meeting link generation failed:', {
          error: meetingError.message,
          platform: sessionData.platform,
          consultantId,
          clientId: sessionData.clientId,
          meetingDetails: {
            title: sessionData.title,
            startTime: scheduledDateTime.toISOString(),
            duration: sessionData.durationMinutes
          }
        });

        // Re-throw with additional context for Teams-specific errors
        if (sessionData.platform === 'TEAMS') {
          if (meetingError.message.includes('authentication failed') || 
              meetingError.message.includes('expired') ||
              meetingError.message.includes('invalid')) {
            throw new ValidationError('Microsoft Teams authentication failed. Please reconnect your Microsoft account in Settings and try again.');
          }
          if (meetingError.message.includes('permissions') || 
              meetingError.message.includes('scopes')) {
            throw new ValidationError('Microsoft Teams permissions are insufficient. Please reconnect your Microsoft account with proper permissions.');
          }
          if (meetingError.message.includes('404') || 
              meetingError.message.includes('not found')) {
            throw new ValidationError('Microsoft Teams service is not available. Please check your account permissions and try again.');
          }
        }

        throw new AppError('Failed to create meeting link: ' + meetingError.message, 500, 'MEETING_GENERATION_ERROR');
      }

      // Create session
      const session = await prisma.session.create({
        data: {
          consultantId,
          clientId: sessionData.clientId,
          title: sessionData.title,
          sessionType: sessionData.sessionType,
          scheduledDate: new Date(sessionData.scheduledDate),
          scheduledTime: sessionData.scheduledTime,
          durationMinutes: sessionData.durationMinutes,
          amount: sessionData.amount,
          platform: sessionData.platform,
          meetingLink: meetingDetails.meetingLink,
          meetingId: meetingDetails.meetingId,
          meetingPassword: meetingDetails.password,
          notes: sessionData.notes,
          paymentMethod: sessionData.paymentMethod,
          status: 'PENDING',
          paymentStatus: sessionData.paymentMethod === 'online' ? 'PENDING' : 'PAID',
          bookingSource: 'manually_added' // Mark as MANUALLY ADDED
        },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              email: true,
              phoneNumber: true
            }
          }
        }
      });

      // Update availability slot if exists
      await prisma.availabilitySlot.updateMany({
        where: {
          consultantId,
          sessionType: sessionData.sessionType,
          date: new Date(sessionData.scheduledDate),
          startTime: sessionData.scheduledTime,
          isBooked: false
        },
        data: {
          isBooked: true,
          sessionId: session.id
        }
      });

      // Update client session count
      await prisma.client.update({
        where: { id: sessionData.clientId },
        data: {
          totalSessions: {
            increment: 1
          },
          ...(sessionData.paymentMethod !== 'online' && {
            totalAmountPaid: {
              increment: sessionData.amount
            }
          })
        }
      });

      // Send confirmation emails via Resend
      try {
        // Email to client and consultant
        await sendSessionConfirmationEmail({
          sessionId: session.id,
          sessionTitle: session.title,
          sessionType: session.sessionType,
          clientName: client.name,
          clientEmail: client.email,
          consultantName: req.user!.slug || req.user!.email,
          consultantEmail: req.user!.email,
          sessionDate: session.scheduledDate.toISOString().split('T')[0],
          sessionTime: session.scheduledTime,
          amount: Number(session.amount),
          currency: session.currency || 'INR',
          meetingLink: session.meetingLink || '',
          meetingPlatform: (session.platform || 'ZOOM').toUpperCase()
        });
      } catch (emailError) {
        console.error('❌ Email sending failed:', emailError);
        // Don't fail the session creation if email fails
      }

      // Clear related caches
      await cacheUtils.clearPattern(`sessions:${consultantId}:*`);
      await cacheUtils.clearPattern(`dashboard_*:${consultantId}:*`);

      console.log(`✅ Session created: ${session.id} for client ${client.name}`);

      res.status(201).json({
        message: 'Session created successfully',
        data: {
          session: {
            ...session,
            amount: Number(session.amount)
          }
        }
      });

    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      console.error('❌ Create session error:', error);
      throw new AppError('Failed to create session', 500, 'SESSION_CREATE_ERROR');
    }
  }
);

/**
 * POST /api/book  
 * Book a session with automatic client creation
 * This endpoint is used by the public booking system (no authentication required)
 */
router.post('/book',
  validateRequest(bookSessionSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        fullName,
        email,
        phone,
        sessionType,
        selectedDate,
        selectedTime,
        duration,
        amount,
        clientNotes,
        consultantSlug
      } = req.body;

      console.log('🚀 Session booking request received:', {
        consultantSlug,
        sessionType,
        email,
        hasSchedule: !!(selectedDate && selectedTime),
        timestamp: new Date().toISOString()
      });

      const prisma = getPrismaClient();

      // Find consultant by slug
      const consultant = await prisma.consultant.findUnique({
        where: { slug: consultantSlug },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          teamsAccessToken: true,
          teamsTokenExpiresAt: true,
          personalSessionPrice: true,
          webinarSessionPrice: true,
          isApprovedByAdmin: true,
          isActive: true
        }
      });

      if (!consultant) {
        throw new NotFoundError('Consultant');
      }

      if (!consultant.isApprovedByAdmin || !consultant.isActive) {
        throw new ValidationError('Consultant is not available for bookings');
      }

      // Find or create client
      let client = await prisma.client.findFirst({
        where: {
          email: email.toLowerCase(),
          consultantId: consultant.id
        }
      });

      if (!client) {
        console.log('📋 Creating new client:', { email, consultantId: consultant.id });
        
        client = await prisma.client.create({
          data: {
            consultantId: consultant.id,
            name: fullName,
            email: email.toLowerCase(),
            phoneNumber: phone,
            isActive: true,
            totalSessions: 0,
            totalAmountPaid: 0
          }
        });

        console.log('✅ Client created:', { clientId: client.id, email: client.email });
      } else {
        console.log('📋 Using existing client:', { clientId: client.id, email: client.email });
      }

      // Validate session pricing
      const expectedPrice = sessionType === 'PERSONAL' 
        ? consultant.personalSessionPrice 
        : consultant.webinarSessionPrice;
      
      if (expectedPrice && Math.abs(Number(expectedPrice) - amount) > 0.01) {
        console.warn('⚠️ Price mismatch:', { 
          expected: expectedPrice, 
          received: amount, 
          sessionType 
        });
      }

      // Generate session title
      const sessionTitle = sessionType === 'PERSONAL' 
        ? `Personal Consultation with ${consultant.firstName} ${consultant.lastName}`
        : `Webinar Session with ${consultant.firstName} ${consultant.lastName}`;

      // Create session data
      const sessionData: any = {
        consultantId: consultant.id,
        clientId: client.id,
        title: sessionTitle,
        sessionType,
        durationMinutes: duration,
        amount,
        notes: clientNotes || '',
        status: 'PENDING',
        paymentStatus: 'PENDING',
        paymentMethod: 'online',
        bookingSource: 'public_booking', // Mark as public booking
        currency: 'INR',
        platform: 'TEAMS' // Default to Teams
      };

      // Handle scheduled vs manual booking
      if (selectedDate && selectedTime) {
        console.log('📅 Scheduled booking:', { selectedDate, selectedTime });
        
        // Validate scheduling data
        const scheduledDateTime = new Date(`${selectedDate}T${selectedTime}`);
        if (scheduledDateTime <= new Date()) {
          throw new ValidationError('Selected time must be in the future');
        }

        // Check for scheduling conflicts
        const conflictingSession = await prisma.session.findFirst({
          where: {
            consultantId: consultant.id,
            scheduledDate: new Date(selectedDate),
            scheduledTime: selectedTime,
            status: {
              not: 'CANCELLED'
            }
          }
        });

        if (conflictingSession) {
          throw new ValidationError('This time slot is already booked');
        }

        sessionData.scheduledDate = new Date(selectedDate);
        sessionData.scheduledTime = selectedTime;

        // Try to generate meeting link for scheduled sessions
        if (consultant.teamsAccessToken && consultant.teamsTokenExpiresAt) {
          if (consultant.teamsTokenExpiresAt > new Date()) {
            try {
              console.log('🔗 Generating Teams meeting for scheduled session...');
              
              const meetingDetails = await generateMeetingLink(
                'TEAMS',
                {
                  title: sessionTitle,
                  startTime: scheduledDateTime,
                  duration: duration,
                  consultantEmail: consultant.email,
                  clientEmail: client.email
                },
                consultant.teamsAccessToken
              );

              sessionData.meetingLink = meetingDetails.meetingLink;
              sessionData.meetingId = meetingDetails.meetingId;
              sessionData.meetingPassword = meetingDetails.password;

              console.log('✅ Teams meeting created:', { meetingId: meetingDetails.meetingId });
            } catch (meetingError) {
              console.warn('⚠️ Teams meeting creation failed (will retry after payment):', meetingError);
              // Don't fail the booking, meeting can be created after payment
            }
          } else {
            console.warn('⚠️ Teams token expired, meeting will be created after payment');
          }
        } else {
          console.warn('⚠️ Teams not connected, meeting will be created after payment');
        }
      } else {
        console.log('📝 Manual booking (no specific schedule)');
        // For manual bookings, consultant will contact client directly
      }

      // Create the session
      const session = await prisma.session.create({
        data: sessionData,
        include: {
          client: {
            select: {
              id: true,
              name: true,
              email: true,
              phoneNumber: true
            }
          }
        }
      });

      // Mark availability slot as booked if applicable
      if (selectedDate && selectedTime) {
        await prisma.availabilitySlot.updateMany({
          where: {
            consultantId: consultant.id,
            sessionType,
            date: new Date(selectedDate),
            startTime: selectedTime,
            isBooked: false
          },
          data: {
            isBooked: true,
            sessionId: session.id
          }
        });
      }

      // Clear related caches
      await cacheUtils.clearPattern(`sessions:${consultant.id}:*`);
      await cacheUtils.clearPattern(`dashboard_*:${consultant.id}:*`);
      await cacheUtils.clearPattern(`availability:*:${consultantSlug}:*`);

      console.log('✅ Session booking created:', {
        sessionId: session.id,
        clientId: client.id,
        consultantId: consultant.id,
        hasSchedule: !!(selectedDate && selectedTime),
        hasMeeting: !!session.meetingLink
      });

      res.status(201).json({
        success: true,
        message: selectedDate && selectedTime 
          ? 'Session booked successfully' 
          : 'Booking request submitted successfully',
        data: {
          session: {
            ...session,
            amount: Number(session.amount)
          },
          client: session.client,
          consultant: {
            id: consultant.id,
            name: `${consultant.firstName} ${consultant.lastName}`,
            email: consultant.email
          },
          bookingType: selectedDate && selectedTime ? 'scheduled' : 'manual'
        }
      });

    } catch (error: any) {
      // Comprehensive error logging
      console.error('❌ Session booking error:', {
        consultantSlug,
        sessionType,
        email,
        errorType: error.constructor.name,
        errorMessage: error.message,
        errorStack: error.stack,
        timestamp: new Date().toISOString(),
        requestData: {
          fullName,
          email,
          phone,
          sessionType,
          selectedDate,
          selectedTime,
          duration,
          amount
        }
      });

      // Handle specific error types
      if (error instanceof NotFoundError) {
        console.error('🔍 Consultant not found:', { consultantSlug });
        throw new NotFoundError('Consultant not found or not available for bookings');
      }
      
      if (error instanceof ValidationError) {
        console.error('⚠️ Validation error in booking:', {
          consultantSlug,
          validationError: error.message
        });
        throw error;
      }

      // Handle Prisma database errors
      if (error.code) {
        switch (error.code) {
          case 'P2002':
            console.error('🔒 Database constraint violation:', {
              consultantSlug,
              constraint: error.meta?.target
            });
            throw new ValidationError('A session already exists for this time slot');
          
          case 'P2025':
            console.error('🔍 Database record not found:', {
              consultantSlug,
              recordType: error.meta?.cause
            });
            throw new NotFoundError('Required data not found');
          
          case 'P2003':
            console.error('🔗 Database foreign key constraint failed:', {
              consultantSlug,
              field: error.meta?.field_name
            });
            throw new ValidationError('Invalid consultant or client data');
          
          default:
            console.error('💾 Database error:', {
              consultantSlug,
              code: error.code,
              message: error.message
            });
            throw new AppError('Database error during booking', 500, 'DATABASE_ERROR');
        }
      }

      // Handle meeting service errors
      if (error.message?.includes('Teams') || error.message?.includes('meeting')) {
        console.error('🔗 Meeting creation error (non-blocking):', {
          consultantSlug,
          meetingError: error.message
        });
        // Continue with booking even if meeting creation fails
      }

      // Handle network/timeout errors
      if (error.name === 'TimeoutError' || error.code === 'ETIMEDOUT') {
        console.error('⏰ Booking timeout error:', {
          consultantSlug,
          timeout: true
        });
        throw new AppError('Booking request timed out. Please try again.', 408, 'BOOKING_TIMEOUT');
      }

      // Generic error fallback
      console.error('🚨 Unexpected booking error:', {
        consultantSlug,
        errorName: error.name,
        errorMessage: error.message,
        errorCode: error.code
      });
      
      throw new AppError(
        'Failed to book session. Please try again or contact support.',
        500,
        'SESSION_BOOKING_ERROR'
      );
    }
  }
);

/**
 * PUT /api/sessions/:id
 * Update a session
 */
router.put('/:id',
  validateRequest(z.object({ id: z.string().min(1) }), 'params'),
  validateRequest(updateSessionSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const consultantId = req.user!.id;
      const updates = req.body;

      const prisma = getPrismaClient();

      // Get existing session
      const existingSession = await prisma.session.findFirst({
        where: {
          id,
          consultantId
        },
        include: {
          client: true
        }
      });

      if (!existingSession) {
        throw new NotFoundError('Session');
      }

      // Check if rescheduling conflicts with another session
      if (updates.scheduledDate || updates.scheduledTime) {
        const newDate = updates.scheduledDate || existingSession.scheduledDate.toISOString().split('T')[0];
        const newTime = updates.scheduledTime || existingSession.scheduledTime;

        const conflictingSession = await prisma.session.findFirst({
          where: {
            consultantId,
            scheduledDate: new Date(newDate),
            scheduledTime: newTime,
            status: {
              not: 'CANCELLED'
            },
            id: {
              not: id
            }
          }
        });

        if (conflictingSession) {
          throw new ValidationError('You already have a session scheduled at this time');
        }
      }

      // Update meeting link if platform or time changes
      let meetingDetails = null;
      if (updates.platform || updates.scheduledDate || updates.scheduledTime) {
        const scheduledDateTime = new Date(
          `${updates.scheduledDate || existingSession.scheduledDate.toISOString().split('T')[0]}T${updates.scheduledTime || existingSession.scheduledTime}`
        );

        // Get consultant's Teams access token if needed
        let consultantAccessToken: string | undefined;
        const newPlatform = updates.platform || existingSession.platform;
        
        if (newPlatform === 'TEAMS') {
          const consultant = await prisma.consultant.findUnique({
            where: { id: consultantId },
            select: { 
              id: true,
              teamsAccessToken: true,
              teamsTokenExpiresAt: true
            }
          });

          if (!consultant?.teamsAccessToken || !consultant?.teamsTokenExpiresAt) {
            throw new ValidationError('Microsoft Teams integration is not connected. Please connect your Microsoft account in Settings.');
          }

          if (consultant.teamsTokenExpiresAt < new Date()) {
            throw new ValidationError('Microsoft Teams access token has expired. Please reconnect your Microsoft account in Settings.');
          }

          consultantAccessToken = consultant.teamsAccessToken;
        }

        meetingDetails = await generateMeetingLink(
          newPlatform,
          {
            title: existingSession.title,
            startTime: scheduledDateTime,
            duration: updates.durationMinutes || existingSession.durationMinutes,
            consultantEmail: req.user!.email,
            clientEmail: existingSession.client.email
          },
          consultantAccessToken
        );
      }

      // Update session
      const updatedSession = await prisma.session.update({
        where: { id },
        data: {
          ...updates,
          ...(updates.scheduledDate && { scheduledDate: new Date(updates.scheduledDate) }),
          ...(meetingDetails && {
            meetingLink: meetingDetails.meetingLink,
            meetingId: meetingDetails.meetingId,
            meetingPassword: meetingDetails.password
          }),
          updatedAt: new Date()
        },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              email: true,
              phoneNumber: true
            }
          }
        }
      });

      // Update client payment if session is marked as paid
      if (updates.paymentStatus === 'PAID' && existingSession.paymentStatus !== 'PAID') {
        await prisma.client.update({
          where: { id: existingSession.clientId },
          data: {
            totalAmountPaid: {
              increment: Number(updatedSession.amount)
            }
          }
        });
      }

      // Send update notifications if significant changes via Resend
      if (updates.scheduledDate || updates.scheduledTime || updates.status === 'CANCELLED') {
        try {
          await sendSessionConfirmationEmail({
            sessionId: updatedSession.id,
            sessionTitle: `${updates.status === 'CANCELLED' ? 'CANCELLED: ' : 'UPDATED: '}${updatedSession.title}`,
            sessionType: existingSession.sessionType,
            clientName: existingSession.client.name,
            clientEmail: existingSession.client.email,
            consultantName: req.user!.slug || req.user!.email,
            consultantEmail: req.user!.email,
            sessionDate: updatedSession.scheduledDate.toISOString().split('T')[0],
            sessionTime: updatedSession.scheduledTime,
            amount: Number(updatedSession.amount),
            currency: updatedSession.currency || 'INR',
            meetingLink: updatedSession.meetingLink || '',
            meetingPlatform: (existingSession.platform || 'ZOOM').toUpperCase()
          });
        } catch (emailError) {
          console.error('❌ Update notification email failed:', emailError);
        }
      }

      // Clear related caches
      await cacheUtils.clearPattern(`sessions:${consultantId}:*`);
      await cacheUtils.clearPattern(`dashboard_*:${consultantId}:*`);

      console.log(`✅ Session updated: ${id}`);

      res.json({
        message: 'Session updated successfully',
        data: {
          session: {
            ...updatedSession,
            amount: Number(updatedSession.amount)
          }
        }
      });

    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      console.error('❌ Update session error:', error);
      throw new AppError('Failed to update session', 500, 'SESSION_UPDATE_ERROR');
    }
  }
);

/**
 * DELETE /api/sessions/:id
 * Delete/cancel a session
 */
router.delete('/:id',
  validateRequest(z.object({ id: z.string().min(1) }), 'params'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const consultantId = req.user!.id;

      const prisma = getPrismaClient();

      // Get session to delete
      const session = await prisma.session.findFirst({
        where: {
          id,
          consultantId
        },
        include: {
          client: true
        }
      });

      if (!session) {
        throw new NotFoundError('Session');
      }

      // Check if session can be deleted (only pending/confirmed sessions)
      if (!['PENDING', 'CONFIRMED'].includes(session.status)) {
        throw new ValidationError('Cannot delete a session that is completed, cancelled, or abandoned');
      }

      // Mark session as cancelled instead of deleting
      await prisma.session.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          consultantNotes: `Cancelled by consultant on ${new Date().toISOString()}`,
          updatedAt: new Date()
        }
      });

      // Free up availability slot
      await prisma.availabilitySlot.updateMany({
        where: {
          sessionId: id
        },
        data: {
          isBooked: false,
          sessionId: null
        }
      });

      // Send cancellation email via Resend
      try {
        await sendSessionConfirmationEmail({
          sessionId: session.id,
          sessionTitle: `CANCELLED: ${session.title}`,
          sessionType: session.sessionType,
          clientName: session.client.name,
          clientEmail: session.client.email,
          consultantName: req.user!.slug || req.user!.email,
          consultantEmail: req.user!.email,
          sessionDate: session.scheduledDate.toISOString().split('T')[0],
          sessionTime: session.scheduledTime,
          amount: Number(session.amount),
          currency: session.currency || 'INR',
          meetingLink: session.meetingLink || '',
          meetingPlatform: (session.platform || 'ZOOM').toUpperCase()
        });
      } catch (emailError) {
        console.error('❌ Cancellation email failed:', emailError);
      }

      // Clear related caches
      await cacheUtils.clearPattern(`sessions:${consultantId}:*`);
      await cacheUtils.clearPattern(`dashboard_*:${consultantId}:*`);

      console.log(`✅ Session cancelled: ${id}`);

      res.json({
        message: 'Session cancelled successfully'
      });

    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      console.error('❌ Cancel session error:', error);
      throw new AppError('Failed to cancel session', 500, 'SESSION_CANCEL_ERROR');
    }
  }
);

/**
 * POST /api/sessions/bulk-update
 * Bulk update multiple sessions
 */
router.post('/bulk-update',
  validateRequest(bulkUpdateSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { sessionIds, updates } = req.body;
      const consultantId = req.user!.id;

      const prisma = getPrismaClient();

      // Verify all sessions belong to the consultant
      const sessions = await prisma.session.findMany({
        where: {
          id: { in: sessionIds },
          consultantId
        }
      });

      if (sessions.length !== sessionIds.length) {
        throw new ValidationError('Some sessions not found or do not belong to you');
      }

      // Perform bulk update
      const result = await prisma.session.updateMany({
        where: {
          id: { in: sessionIds },
          consultantId
        },
        data: {
          ...updates,
          updatedAt: new Date()
        }
      });

      // Clear related caches
      await cacheUtils.clearPattern(`sessions:${consultantId}:*`);
      await cacheUtils.clearPattern(`dashboard_*:${consultantId}:*`);

      console.log(`✅ Bulk updated ${result.count} sessions`);

      res.json({
        message: `${result.count} sessions updated successfully`,
        data: {
          updatedCount: result.count,
          sessionIds
        }
      });

    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      console.error('❌ Bulk update sessions error:', error);
      throw new AppError('Failed to update sessions', 500, 'SESSIONS_BULK_UPDATE_ERROR');
    }
  }
);

/**
 * GET /api/sessions/analytics
 * Get session analytics and metrics
 */
router.get('/analytics',
  validateRequest(commonSchemas.dateRange, 'query'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const consultantId = req.user!.id;
      const { startDate, endDate } = req.query as any;

      // Set default date range if not provided
      const dateRange = {
        start: startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        end: endDate ? new Date(endDate) : new Date()
      };

      const cacheKey = `session_analytics:${consultantId}:${dateRange.start.toISOString()}:${dateRange.end.toISOString()}`;
      
      // Check cache
      const cachedAnalytics = await cacheUtils.get(cacheKey);
      if (cachedAnalytics) {
        res.json({
          data: cachedAnalytics,
          fromCache: true
        });
        return;
      }

      // Calculate analytics
      const analytics = await calculateSessionMetrics(consultantId, dateRange);

      // Cache for 10 minutes
      await cacheUtils.set(cacheKey, analytics, 600);

      res.json({
        data: analytics,
        fromCache: false
      });

    } catch (error) {
      console.error('❌ Session analytics error:', error);
      throw new AppError('Failed to generate session analytics', 500, 'SESSION_ANALYTICS_ERROR');
    }
  }
);

export default router;