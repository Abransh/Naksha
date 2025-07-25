"use strict";
/**
 * Public Session Booking Routes - PERFORMANCE OPTIMIZED
 *
 * Handles public session bookings with sub-10-second response times.
 * Implements async processing and circuit breaker patterns for production scale.
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
 * Performance Configuration - Sub-15-second booking guarantee
 */
const BOOKING_TIMEOUT = 30000; // 30 seconds max
const QUICK_BOOKING_TIMEOUT = 15000; // 15 seconds for optimized flow (increased from 8)
/**
 * Timeout middleware for booking endpoints
 */
const withTimeout = (timeoutMs) => {
    return (req, res, next) => {
        const timeout = setTimeout(() => {
            if (!res.headersSent) {
                res.status(408).json({
                    error: 'Request timeout',
                    message: 'Booking request took too long. Please try again.',
                    code: 'BOOKING_TIMEOUT'
                });
            }
        }, timeoutMs);
        res.on('finish', () => clearTimeout(timeout));
        res.on('close', () => clearTimeout(timeout));
        next();
    };
};
/**
 * Async email processing - prevents booking delays
 */
const processEmailAsync = async (emailData) => {
    try {
        // Add to background job queue instead of processing immediately
        await (0, resendEmailService_1.sendSessionConfirmationEmail)(emailData);
        console.log('✅ Confirmation email queued successfully');
    }
    catch (error) {
        console.error('❌ Email processing failed (non-blocking):', error);
        // Email failure doesn't block booking completion
    }
};
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
    selectedDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format').optional(),
    selectedTime: zod_1.z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format').optional(),
    duration: zod_1.z.number().min(30).max(480).default(60), // 30 minutes to 8 hours
    amount: zod_1.z.number().gte(0, 'Amount cannot be negative'),
    // Additional Information
    clientNotes: zod_1.z.string().max(1000).optional(),
    // Consultant Information
    consultantSlug: zod_1.z.string().min(1, 'Consultant slug is required')
});
/**
 * POST /api/v1/book - PERFORMANCE OPTIMIZED
 * Public session booking endpoint with sub-10-second response time
 */
router.post('/', withTimeout(QUICK_BOOKING_TIMEOUT), // 8-second timeout for fast response
auth_1.optionalAuth, // Allow both authenticated and unauthenticated access
(0, validation_1.validateRequest)(bookSessionSchema), async (req, res) => {
    const startTime = Date.now();
    try {
        const bookingData = req.body;
        console.log('📅 OPTIMIZED booking request started:', {
            consultantSlug: bookingData.consultantSlug,
            sessionType: bookingData.sessionType,
            clientEmail: bookingData.email,
            selectedDate: bookingData.selectedDate,
            selectedTime: bookingData.selectedTime,
            startTime: new Date().toISOString()
        });
        const prisma = (0, database_1.getPrismaClient)();
        // STEP 1: Find consultant by slug (PERFORMANCE TRACKED)
        console.log('🔍 Step 1: Finding consultant...');
        const consultantStartTime = Date.now();
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
        console.log(`✅ Step 1 completed: ${Date.now() - consultantStartTime}ms`);
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
        // Check if the selected date/time is available (only if provided)
        let scheduledDateTime = null;
        if (bookingData.selectedDate && bookingData.selectedTime) {
            scheduledDateTime = new Date(`${bookingData.selectedDate}T${bookingData.selectedTime}:00`);
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
        }
        // STEP 2: Fast transaction with minimal database operations (PERFORMANCE TRACKED)
        console.log('🔍 Step 2: Starting database transaction...');
        const transactionStartTime = Date.now();
        const result = await prisma.$transaction(async (tx) => {
            let availabilitySlot = null;
            // SIMPLIFIED: Fast availability check (only if specific time selected)
            if (scheduledDateTime && bookingData.selectedTime) {
                // Single optimized query - no debug queries to reduce timeout risk
                availabilitySlot = await tx.availabilitySlot.findFirst({
                    where: {
                        consultantId: consultant.id,
                        sessionType: bookingData.sessionType,
                        date: scheduledDateTime,
                        startTime: bookingData.selectedTime,
                        isBooked: false,
                        isBlocked: false
                    },
                    select: { id: true } // Only select ID for performance
                });
                if (!availabilitySlot) {
                    throw new errorHandler_1.ValidationError('This time slot is not available for booking.');
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
            // OPTIMIZED: Fast slot booking update
            if (scheduledDateTime && bookingData.selectedTime && availabilitySlot) {
                await tx.availabilitySlot.update({
                    where: { id: availabilitySlot.id },
                    data: {
                        isBooked: true,
                        sessionId: session.id
                    }
                });
                console.log(`✅ Availability slot booked: ${availabilitySlot.id}`);
            }
            return { client, session };
        }, {
            timeout: 10000, // 10 second transaction timeout
        });
        console.log(`✅ Step 2 completed: ${Date.now() - transactionStartTime}ms`);
        // PERFORMANCE: Async email processing (non-blocking)
        processEmailAsync({
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
            meetingPlatform: 'Zoom'
        }).catch(console.error); // Fire and forget - don't block response
        // PERFORMANCE: Async cache clearing (non-blocking)
        const clearCachesAsync = async () => {
            try {
                const cacheKeys = [
                    `clients:${consultant.id}:*`,
                    `sessions:${consultant.id}:*`,
                    `dashboard_*:${consultant.id}:*`,
                    `slots:${consultant.slug}:*`,
                    `availability:${consultant.id}:*`
                ];
                await Promise.all(cacheKeys.map(pattern => redis_1.cacheUtils.clearPattern(pattern)));
                console.log(`🧹 Caches cleared for session: ${result.session.id}`);
            }
            catch (error) {
                console.error('❌ Cache clearing failed (non-critical):', error);
            }
        };
        // Fire and forget - don't block response
        clearCachesAsync().catch(console.error);
        const totalTime = Date.now() - startTime;
        console.log(`✅ BOOKING COMPLETED: ${result.session.id} in ${totalTime}ms`);
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