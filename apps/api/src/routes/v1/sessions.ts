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

import { Router, Response } from 'express';
import { z } from 'zod';
import { getPrismaClient } from '../../config/database';
import { cacheUtils } from '../../config/redis';
import { AuthenticatedRequest } from '../../middleware/auth';
import { validateRequest, commonSchemas } from '../../middleware/validation';
import { AppError, NotFoundError, ValidationError } from '../../middleware/errorHandler';
import { sendEmail } from '../../services/emailService';
import { generateMeetingLink } from '../../services/meetingService';
import { calculateSessionMetrics } from '../../utils/analytics';

const router = Router();

/**
 * Validation schemas
 */
const createSessionSchema = z.object({
  clientId: z.string().uuid('Invalid client ID'),
  title: z.string().min(1, 'Title is required').max(300, 'Title too long'),
  sessionType: z.enum(['PERSONAL', 'WEBINAR']),
  scheduledDate: z.string().datetime('Invalid date format'),
  scheduledTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
  durationMinutes: z.number().min(15).max(480).optional().default(60),
  amount: z.number().positive('Amount must be positive'),
  platform: z.enum(['ZOOM', 'MEET', 'TEAMS']),
  notes: z.string().max(1000).optional(),
  paymentMethod: z.enum(['online', 'cash', 'bank_transfer']).optional().default('online')
});

const updateSessionSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  scheduledDate: z.string().datetime().optional(),
  scheduledTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  durationMinutes: z.number().min(15).max(480).optional(),
  amount: z.number().positive().optional(),
  platform: z.enum(['ZOOM', 'MEET', 'TEAMS']).optional(),
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
  clientId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  search: z.string().max(100).optional()
});

const bulkUpdateSchema = z.object({
  sessionIds: z.array(z.string().uuid()).min(1, 'At least one session ID required').max(50, 'Too many sessions'),
  updates: z.object({
    status: z.enum(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'RETURNED', 'ABANDONED', 'NO_SHOW']).optional(),
    paymentStatus: z.enum(['PENDING', 'PAID', 'REFUNDED', 'FAILED']).optional(),
    consultantNotes: z.string().max(1000).optional()
  }).refine(data => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update'
  })
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
  validateRequest(z.object({ id: z.string().uuid() }), 'params'),
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

      // Check if it's a repeat client
      const clientSessionCount = await prisma.session.count({
        where: {
          clientId: sessionData.clientId,
          status: 'COMPLETED'
        }
      });

      const isRepeatClient = clientSessionCount > 0;

      // Generate meeting link based on platform
      const meetingDetails = await generateMeetingLink(
        sessionData.platform,
        {
          title: sessionData.title,
          startTime: scheduledDateTime,
          duration: sessionData.durationMinutes,
          consultantEmail: req.user!.email,
          clientEmail: client.email
        }
      );

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
          isRepeatClient,
          paymentMethod: sessionData.paymentMethod,
          status: 'PENDING',
          paymentStatus: sessionData.paymentMethod === 'online' ? 'PENDING' : 'PAID'
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

      // Send confirmation emails
      try {
        // Email to client
        await sendEmail('session_confirmation', {
          to: client.email,
          data: {
            clientName: client.name,
            consultantName: `${req.user!.slug || req.user!.email}`,
            sessionTitle: session.title,
            sessionDate: session.scheduledDate.toLocaleDateString(),
            sessionTime: session.scheduledTime,
            platform: session.platform,
            meetingLink: session.meetingLink,
            meetingPassword: session.meetingPassword,
            amount: Number(session.amount),
            currency: session.currency
          }
        });

        // Email to consultant
        await sendEmail('session_booked', {
          to: req.user!.email,
          data: {
            consultantName: `${req.user!.slug} ${req.user!.email}`,
            clientName: client.name,
            clientEmail: client.email,
            sessionTitle: session.title,
            sessionDate: session.scheduledDate.toLocaleDateString(),
            sessionTime: session.scheduledTime,
            amount: Number(session.amount),
            currency: session.currency,
            isRepeatClient
          }
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
 * PUT /api/sessions/:id
 * Update a session
 */
router.put('/:id',
  validateRequest(z.object({ id: z.string().uuid() }), 'params'),
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

        meetingDetails = await generateMeetingLink(
          updates.platform || existingSession.platform,
          {
            title: existingSession.title,
            startTime: scheduledDateTime,
            duration: updates.durationMinutes || existingSession.durationMinutes,
            consultantEmail: req.user!.email,
            clientEmail: existingSession.client.email
          }
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

      // Send update notifications if significant changes
      if (updates.scheduledDate || updates.scheduledTime || updates.status === 'CANCELLED') {
        try {
          const emailType = updates.status === 'CANCELLED' ? 'session_cancelled' : 'session_rescheduled';
          
          await sendEmail(emailType, {
            to: existingSession.client.email,
            data: {
              clientName: existingSession.client.name,
              consultantName: `${req.user!.slug} ${req.user!.email}`,
              sessionTitle: updatedSession.title,
              sessionDate: updatedSession.scheduledDate.toLocaleDateString(),
              sessionTime: updatedSession.scheduledTime,
              meetingLink: updatedSession.meetingLink,
              reason: updates.consultantNotes || 'Schedule change'
            }
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
  validateRequest(z.object({ id: z.string().uuid() }), 'params'),
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

      // Send cancellation email
      try {
        await sendEmail('session_cancelled', {
          to: session.client.email,
          data: {
            clientName: session.client.name,
            consultantName: `${req.user!.slug} ${req.user!.email}`,
            sessionTitle: session.title,
            sessionDate: session.scheduledDate.toLocaleDateString(),
            sessionTime: session.scheduledTime,
            reason: 'Cancelled by consultant'
          }
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