/**
 * Public Session Booking Routes
 * 
 * Handles public session bookings from the website (no authentication required).
 * This is separate from the authenticated session management routes.
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { getPrismaClient } from '../../config/database';
import { cacheUtils } from '../../config/redis';
import { AuthenticatedRequest, optionalAuth } from '../../middleware/auth';
import { validateRequest } from '../../middleware/validation';
import { AppError, NotFoundError, ValidationError } from '../../middleware/errorHandler';
import { sendSessionConfirmationEmail } from '../../services/resendEmailService';

const router = Router();

/**
 * Validation schema for public session booking
 */
const bookSessionSchema = z.object({
  // Client Information (for guest booking)
  fullName: z.string().min(2, 'Full name is required').max(200),
  email: z.string().email('Invalid email format').max(255),
  phone: z.string().min(6, 'Phone number is required').max(20),
  
  // Session Information
  sessionType: z.enum(['PERSONAL', 'WEBINAR']),
  selectedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format').optional(),
  selectedTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format').optional(),
  duration: z.number().min(30).max(480).default(60), // 30 minutes to 8 hours
  amount: z.number().positive('Amount must be positive'),
  
  // Additional Information
  clientNotes: z.string().max(1000).optional(),
  
  // Consultant Information
  consultantSlug: z.string().min(1, 'Consultant slug is required')
});

/**
 * POST /api/v1/book
 * Public session booking endpoint (no authentication required)
 */
router.post('/',
  optionalAuth, // Allow both authenticated and unauthenticated access
  validateRequest(bookSessionSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const bookingData = req.body;
      
      console.log('📅 Public session booking request:', {
        consultantSlug: bookingData.consultantSlug,
        sessionType: bookingData.sessionType,
        clientEmail: bookingData.email,
        selectedDate: bookingData.selectedDate,
        selectedTime: bookingData.selectedTime
      });

      const prisma = getPrismaClient();

      // Find consultant by slug
      const consultant = await prisma.consultant.findFirst({
        where: {
          slug: bookingData.consultantSlug,
          isActive: true,
          isEmailVerified: true,
          isApprovedByAdmin: true
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          slug: true,
          personalSessionPrice: true,
          webinarSessionPrice: true
        }
      });

      if (!consultant) {
        throw new NotFoundError('Consultant not found or not available for booking');
      }

      // Validate session price matches consultant's pricing
      const expectedPrice = bookingData.sessionType === 'PERSONAL' 
        ? Number(consultant.personalSessionPrice || 0)
        : Number(consultant.webinarSessionPrice || 0);

      if (Math.abs(bookingData.amount - expectedPrice) > 0.01) {
        throw new ValidationError('Session amount does not match consultant pricing');
      }

      // Check if the selected date/time is available (only if provided)
      let scheduledDateTime: Date | null = null;
      
      if (bookingData.selectedDate && bookingData.selectedTime) {
        scheduledDateTime = new Date(`${bookingData.selectedDate}T${bookingData.selectedTime}:00`);
        
        if (scheduledDateTime <= new Date()) {
          throw new ValidationError('Cannot book sessions in the past');
        }

        // Check for conflicting sessions
        const conflictingSession = await prisma.session.findFirst({
          where: {
            consultantId: consultant.id,
            scheduledDate: scheduledDateTime,
            status: {
              in: ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'ONGOING']
            }
          }
        });

        if (conflictingSession) {
          throw new ValidationError('This time slot is already booked. Please choose a different time.');
        }

      }

      // Start transaction for client and session creation
      const result = await prisma.$transaction(async (tx) => {
        let availabilitySlot = null;
        
        // Check if availability slot exists and is available (only if specific time selected)
        if (scheduledDateTime && bookingData.selectedTime) {
          console.log('🔍 Booking: Checking availability slot:', {
            consultantId: consultant.id,
            sessionType: bookingData.sessionType,
            date: scheduledDateTime.toISOString().split('T')[0],
            startTime: bookingData.selectedTime
          });

          availabilitySlot = await tx.availabilitySlot.findFirst({
            where: {
              consultantId: consultant.id,
              sessionType: bookingData.sessionType,
              date: scheduledDateTime,
              startTime: bookingData.selectedTime,
              isBooked: false,
              isBlocked: false
            }
          });

          console.log('📊 Booking: Availability slot query result:', {
            slotFound: !!availabilitySlot,
            slotId: availabilitySlot?.id,
            slotDetails: availabilitySlot ? {
              id: availabilitySlot.id,
              date: availabilitySlot.date.toISOString().split('T')[0],
              time: `${availabilitySlot.startTime}-${availabilitySlot.endTime}`,
              isBooked: availabilitySlot.isBooked,
              isBlocked: availabilitySlot.isBlocked
            } : null
          });

          if (!availabilitySlot) {
            // Let's also check if there are any slots for this date/time to debug
            const debugSlots = await tx.availabilitySlot.findMany({
              where: {
                consultantId: consultant.id,
                date: scheduledDateTime,
                startTime: bookingData.selectedTime
              },
              select: {
                id: true,
                sessionType: true,
                isBooked: true,
                isBlocked: true,
                sessionId: true
              }
            });
            
            console.log('🚨 Booking: No available slot found. Debug info:', {
              consultantId: consultant.id,
              requestedDate: scheduledDateTime.toISOString().split('T')[0],
              requestedTime: bookingData.selectedTime,
              requestedSessionType: bookingData.sessionType,
              existingSlotsForDateTime: debugSlots
            });
            
            throw new ValidationError('This time slot is not available for booking.');
          }
        }
        // Find or create client
        const nameParts = bookingData.fullName.trim().split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        let client = await tx.client.findFirst({
          where: {
            email: bookingData.email,
            consultantId: consultant.id
          }
        });

        if (!client) {
          // Create new client
          client = await tx.client.create({
            data: {
              consultantId: consultant.id,
              email: bookingData.email,
              firstName,
              lastName,
              name: bookingData.fullName,
              phoneNumber: bookingData.phone,
              isActive: true,
              totalSessions: 0,
              totalAmountPaid: 0
            }
          });

          console.log(`✅ New client created: ${client.id} (${client.name})`);
        } else {
          console.log(`✅ Existing client found: ${client.id} (${client.name})`);
        }

        // Create session
        const session = await tx.session.create({
          data: {
            consultantId: consultant.id,
            clientId: client.id,
            title: `${bookingData.sessionType === 'PERSONAL' ? '1-on-1' : 'Webinar'} Session with ${consultant.firstName}`,
            description: bookingData.clientNotes || '',
            sessionType: bookingData.sessionType,
            status: 'PENDING',
            scheduledDate: scheduledDateTime || new Date(), // Use current date if not specified
            scheduledTime: bookingData.selectedTime || '00:00',
            duration: bookingData.duration,
            durationMinutes: bookingData.duration,
            amount: bookingData.amount,
            currency: 'INR',
            paymentStatus: 'PENDING',
            platform: 'zoom',
            clientNotes: bookingData.clientNotes || '',
            timezone: 'Asia/Kolkata',
            bookingSource: 'naksha_platform' // Mark as FROM NAKSHA
          }
        });

        // Update client session count
        await tx.client.update({
          where: { id: client.id },
          data: {
            totalSessions: {
              increment: 1
            }
          }
        });

        // Mark availability slot as booked (only if specific time was selected)
        if (scheduledDateTime && bookingData.selectedTime && availabilitySlot) {
          const updatedSlot = await tx.availabilitySlot.update({
            where: { id: availabilitySlot.id },
            data: {
              isBooked: true,
              sessionId: session.id
            }
          });
          
          console.log(`✅ Availability slot marked as booked:`, {
            slotId: availabilitySlot.id,
            sessionId: session.id,
            consultantId: consultant.id,
            date: updatedSlot.date.toISOString().split('T')[0],
            time: `${updatedSlot.startTime}-${updatedSlot.endTime}`,
            sessionType: updatedSlot.sessionType
          });
        } else {
          console.log('ℹ️  Manual booking - no specific availability slot reserved');
        }

        return { client, session };
      });

      // Send confirmation email to client via Resend
      try {
        await sendSessionConfirmationEmail({
          sessionId: result.session.id,
          sessionTitle: `${bookingData.sessionType} Session`,
          sessionType: bookingData.sessionType,
          clientName: result.client.name,
          clientEmail: result.client.email,
          consultantName: `${consultant.firstName} ${consultant.lastName}`,
          consultantEmail: consultant.email,
          sessionDate: bookingData.selectedDate || 'To be scheduled',
          sessionTime: bookingData.selectedTime || 'To be scheduled',
          amount: bookingData.amount,
          currency: 'INR',
          //meetingLink: meetingLink || '',
          meetingPlatform: 'Zoom'
        });

        console.log('✅ Confirmation emails sent');
      } catch (emailError) {
        console.error('❌ Email sending failed:', emailError);
        // Don't fail the booking if email fails
      }

      // Clear related caches - ENHANCED for immediate availability updates
      const cacheKeysToDelete = [
        `clients:${consultant.id}:*`,
        `sessions:${consultant.id}:*`,
        `dashboard_*:${consultant.id}:*`,
        `slots:${consultant.slug}:*`, // Clear public availability slots cache
        `availability:${consultant.id}:*`,
        `patterns:${consultant.id}`, // Clear patterns cache
      ];
      
      console.log('🧹 Clearing caches after successful booking:', {
        sessionId: result.session.id,
        consultantId: consultant.id,
        consultantSlug: consultant.slug,
        clientEmail: result.client.email,
        hasTimeSlot: !!(bookingData.selectedDate && bookingData.selectedTime),
        cacheKeysToDelete
      });
      
      await Promise.all(
        cacheKeysToDelete.map(pattern => cacheUtils.clearPattern(pattern))
      );

      console.log(`✅ Public session booked successfully: ${result.session.id}`);

      res.status(201).json({
        message: 'Session booked successfully! Confirmation emails have been sent.',
        data: {
          session: {
            id: result.session.id,
            title: result.session.title,
            sessionType: result.session.sessionType,
            scheduledDate: result.session.scheduledDate,
            scheduledTime: result.session.scheduledTime,
            duration: result.session.duration,
            amount: Number(result.session.amount),
            status: result.session.status,
            paymentStatus: result.session.paymentStatus
          },
          client: {
            id: result.client.id,
            name: result.client.name,
            email: result.client.email
          },
          consultant: {
            name: `${consultant.firstName} ${consultant.lastName}`,
            slug: consultant.slug
          },
          nextSteps: [
            'You will receive payment instructions via email',
            'Complete payment to confirm your session',
            'Meeting details will be shared after payment confirmation'
          ]
        }
      });

    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      console.error('❌ Public session booking error:', error);
      throw new AppError('Failed to book session', 500, 'SESSION_BOOKING_ERROR');
    }
  }
);

export default router;