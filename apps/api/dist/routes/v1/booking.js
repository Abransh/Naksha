"use strict";
/**
 * Public Session Booking Routes
 *
 * Handles public session bookings from the website (no authentication required).
 * This is separate from the authenticated session management routes.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const database_1 = require("../../config/database");
const redis_1 = require("../../config/redis");
const auth_1 = require("../../middleware/auth");
const validation_1 = require("../../middleware/validation");
const errorHandler_1 = require("../../middleware/errorHandler");
const resendEmailService_1 = require("../../services/resendEmailService");
const router = (0, express_1.Router)();
/**
 * Validation schema for public session booking
 */
const bookSessionSchema = zod_1.z.object({
    // Client Information (for guest booking)
    fullName: zod_1.z.string().min(2, 'Full name is required').max(200),
    email: zod_1.z.string().email('Invalid email format').max(255),
    phone: zod_1.z.string().min(6, 'Phone number is required').max(20),
    // Session Information
    sessionType: zod_1.z.enum(['PERSONAL', 'WEBINAR']),
    selectedDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
    selectedTime: zod_1.z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
    duration: zod_1.z.number().min(30).max(480).default(60), // 30 minutes to 8 hours
    amount: zod_1.z.number().positive('Amount must be positive'),
    // Additional Information
    clientNotes: zod_1.z.string().max(1000).optional(),
    // Consultant Information
    consultantSlug: zod_1.z.string().min(1, 'Consultant slug is required')
});
/**
 * POST /api/v1/book
 * Public session booking endpoint (no authentication required)
 */
router.post('/', auth_1.optionalAuth, // Allow both authenticated and unauthenticated access
(0, validation_1.validateRequest)(bookSessionSchema), async (req, res) => {
    try {
        const bookingData = req.body;
        console.log('📅 Public session booking request:', {
            consultantSlug: bookingData.consultantSlug,
            sessionType: bookingData.sessionType,
            clientEmail: bookingData.email,
            selectedDate: bookingData.selectedDate,
            selectedTime: bookingData.selectedTime
        });
        const prisma = (0, database_1.getPrismaClient)();
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
            throw new errorHandler_1.NotFoundError('Consultant not found or not available for booking');
        }
        // Validate session price matches consultant's pricing
        const expectedPrice = bookingData.sessionType === 'PERSONAL'
            ? Number(consultant.personalSessionPrice || 0)
            : Number(consultant.webinarSessionPrice || 0);
        if (Math.abs(bookingData.amount - expectedPrice) > 0.01) {
            throw new errorHandler_1.ValidationError('Session amount does not match consultant pricing');
        }
        // Check if the selected date/time is available
        const scheduledDateTime = new Date(`${bookingData.selectedDate}T${bookingData.selectedTime}:00`);
        if (scheduledDateTime <= new Date()) {
            throw new errorHandler_1.ValidationError('Cannot book sessions in the past');
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
            throw new errorHandler_1.ValidationError('This time slot is already booked. Please choose a different time.');
        }
        // Start transaction for client and session creation
        const result = await prisma.$transaction(async (tx) => {
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
            }
            else {
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
                    scheduledDate: scheduledDateTime,
                    scheduledTime: bookingData.selectedTime,
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
            return { client, session };
        });
        // Send confirmation email to client via Resend
        try {
            await (0, resendEmailService_1.sendSessionConfirmationEmail)({
                sessionId: result.session.id,
                sessionTitle: `${bookingData.sessionType} Session`,
                sessionType: bookingData.sessionType,
                clientName: result.client.name,
                clientEmail: result.client.email,
                consultantName: `${consultant.firstName} ${consultant.lastName}`,
                consultantEmail: consultant.email,
                sessionDate: bookingData.selectedDate,
                sessionTime: bookingData.selectedTime,
                amount: bookingData.amount,
                currency: 'INR',
                //meetingLink: meetingLink || '',
                meetingPlatform: 'Zoom'
            });
            console.log('✅ Confirmation emails sent');
        }
        catch (emailError) {
            console.error('❌ Email sending failed:', emailError);
            // Don't fail the booking if email fails
        }
        // Clear related caches
        await redis_1.cacheUtils.clearPattern(`clients:${consultant.id}:*`);
        await redis_1.cacheUtils.clearPattern(`sessions:${consultant.id}:*`);
        await redis_1.cacheUtils.clearPattern(`dashboard_*:${consultant.id}:*`);
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
    }
    catch (error) {
        if (error instanceof errorHandler_1.NotFoundError || error instanceof errorHandler_1.ValidationError) {
            throw error;
        }
        console.error('❌ Public session booking error:', error);
        throw new errorHandler_1.AppError('Failed to book session', 500, 'SESSION_BOOKING_ERROR');
    }
});
exports.default = router;
//# sourceMappingURL=booking.js.map