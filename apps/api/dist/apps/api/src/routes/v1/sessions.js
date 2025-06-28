"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const database_1 = require("../../config/database");
const redis_1 = require("../../config/redis");
const auth_1 = require("../../middleware/auth");
const validation_1 = require("../../middleware/validation");
const errorHandler_1 = require("../../middleware/errorHandler");
const emailService_1 = require("../../services/emailService");
const meetingService_1 = require("../../services/meetingService");
const analytics_1 = require("../../utils/analytics");
const router = (0, express_1.Router)();
/**
 * Validation schemas
 */
// Schema for public session booking
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
const createSessionSchema = zod_1.z.object({
    clientId: zod_1.z.string().uuid('Invalid client ID'),
    title: zod_1.z.string().min(1, 'Title is required').max(300, 'Title too long'),
    sessionType: zod_1.z.enum(['PERSONAL', 'WEBINAR']),
    scheduledDate: zod_1.z.string().datetime('Invalid date format'),
    scheduledTime: zod_1.z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
    durationMinutes: zod_1.z.number().min(15).max(480).optional().default(60),
    amount: zod_1.z.number().positive('Amount must be positive'),
    platform: zod_1.z.enum(['ZOOM', 'MEET', 'TEAMS']),
    notes: zod_1.z.string().max(1000).optional(),
    paymentMethod: zod_1.z.enum(['online', 'cash', 'bank_transfer']).optional().default('online')
});
const updateSessionSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).max(300).optional(),
    scheduledDate: zod_1.z.string().datetime().optional(),
    scheduledTime: zod_1.z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
    durationMinutes: zod_1.z.number().min(15).max(480).optional(),
    amount: zod_1.z.number().positive().optional(),
    platform: zod_1.z.enum(['ZOOM', 'MEET', 'TEAMS']).optional(),
    status: zod_1.z.enum(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'RETURNED', 'ABANDONED', 'NO_SHOW']).optional(),
    paymentStatus: zod_1.z.enum(['PENDING', 'PAID', 'REFUNDED', 'FAILED']).optional(),
    notes: zod_1.z.string().max(1000).optional(),
    consultantNotes: zod_1.z.string().max(1000).optional()
});
const sessionFiltersSchema = zod_1.z.object({
    status: zod_1.z.enum(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'RETURNED', 'ABANDONED', 'NO_SHOW']).optional(),
    paymentStatus: zod_1.z.enum(['PENDING', 'PAID', 'REFUNDED', 'FAILED']).optional(),
    sessionType: zod_1.z.enum(['PERSONAL', 'WEBINAR']).optional(),
    platform: zod_1.z.enum(['ZOOM', 'MEET', 'TEAMS']).optional(),
    clientId: zod_1.z.string().uuid().optional(),
    startDate: zod_1.z.string().datetime().optional(),
    endDate: zod_1.z.string().datetime().optional(),
    search: zod_1.z.string().max(100).optional()
});
const bulkUpdateSchema = zod_1.z.object({
    sessionIds: zod_1.z.array(zod_1.z.string().uuid()).min(1, 'At least one session ID required').max(50, 'Too many sessions'),
    updates: zod_1.z.object({
        status: zod_1.z.enum(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'RETURNED', 'ABANDONED', 'NO_SHOW']).optional(),
        paymentStatus: zod_1.z.enum(['PENDING', 'PAID', 'REFUNDED', 'FAILED']).optional(),
        consultantNotes: zod_1.z.string().max(1000).optional()
    }).refine(data => Object.keys(data).length > 0, {
        message: 'At least one field must be provided for update'
    })
});
/**
 * POST /api/sessions/book
 * Book a new session (public endpoint for clients)
 */
router.post('/book', auth_1.optionalAuth, // Allow both authenticated and unauthenticated access
(0, validation_1.validateRequest)(bookSessionSchema), async (req, res) => {
    try {
        const bookingData = req.body;
        console.log('📅 Session booking request:', {
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
                    timezone: 'Asia/Kolkata'
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
        // Send confirmation emails
        try {
            // Email to client
            await (0, emailService_1.sendEmail)('session_booking_confirmation', {
                to: result.client.email,
                data: {
                    clientName: result.client.name,
                    consultantName: `${consultant.firstName} ${consultant.lastName}`,
                    sessionType: bookingData.sessionType,
                    sessionDate: bookingData.selectedDate,
                    sessionTime: bookingData.selectedTime,
                    sessionAmount: bookingData.amount,
                    sessionId: result.session.id,
                    paymentInstructions: 'Payment details will be sent separately.'
                }
            });
            // Email to consultant
            await (0, emailService_1.sendEmail)('new_session_booking', {
                to: consultant.email,
                data: {
                    consultantName: consultant.firstName,
                    clientName: result.client.name,
                    clientEmail: result.client.email,
                    sessionType: bookingData.sessionType,
                    sessionDate: bookingData.selectedDate,
                    sessionTime: bookingData.selectedTime,
                    sessionAmount: bookingData.amount,
                    sessionId: result.session.id,
                    clientNotes: bookingData.clientNotes || 'No additional notes'
                }
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
        console.log(`✅ Session booked successfully: ${result.session.id}`);
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
        console.error('❌ Session booking error:', error);
        throw new errorHandler_1.AppError('Failed to book session', 500, 'SESSION_BOOKING_ERROR');
    }
});
/**
 * GET /api/sessions
 * Get sessions with filtering, sorting, and pagination
 */
router.get('/', (0, validation_1.validateRequest)(sessionFiltersSchema, 'query'), (0, validation_1.validateRequest)(validation_1.commonSchemas.pagination, 'query'), async (req, res) => {
    try {
        const consultantId = req.user.id;
        const filters = req.query;
        const { page, limit, sortBy, sortOrder } = req.query;
        // Build cache key
        const cacheKey = `sessions:${consultantId}:${JSON.stringify(filters)}:${page}:${limit}:${sortBy}:${sortOrder}`;
        // Check cache first
        const cachedResult = await redis_1.cacheUtils.get(cacheKey);
        if (cachedResult) {
            res.json({
                data: cachedResult,
                fromCache: true
            });
            return;
        }
        const prisma = (0, database_1.getPrismaClient)();
        // Build where clause
        const where = {
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
        const orderBy = {};
        if (sortBy) {
            if (sortBy === 'clientName') {
                orderBy.client = { name: sortOrder };
            }
            else if (sortBy === 'scheduledDateTime') {
                orderBy.scheduledDate = sortOrder;
            }
            else {
                orderBy[sortBy] = sortOrder;
            }
        }
        else {
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
        const formattedSessions = sessions.map((session) => ({
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
        await redis_1.cacheUtils.set(cacheKey, result, 30);
        res.json({
            data: result,
            fromCache: false
        });
    }
    catch (error) {
        console.error('❌ Get sessions error:', error);
        throw new errorHandler_1.AppError('Failed to fetch sessions', 500, 'SESSIONS_FETCH_ERROR');
    }
});
/**
 * GET /api/sessions/:id
 * Get a specific session by ID
 */
router.get('/:id', (0, validation_1.validateRequest)(zod_1.z.object({ id: zod_1.z.string().uuid() }), 'params'), async (req, res) => {
    try {
        const { id } = req.params;
        const consultantId = req.user.id;
        const prisma = (0, database_1.getPrismaClient)();
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
            throw new errorHandler_1.NotFoundError('Session');
        }
        // Format the response
        const formattedSession = {
            ...session,
            amount: Number(session.amount),
            client: {
                ...session.client,
                totalAmountPaid: Number(session.client.totalAmountPaid)
            },
            paymentTransactions: session.paymentTransactions.map((tx) => ({
                ...tx,
                amount: Number(tx.amount)
            }))
        };
        res.json({
            data: { session: formattedSession }
        });
    }
    catch (error) {
        if (error instanceof errorHandler_1.NotFoundError) {
            throw error;
        }
        console.error('❌ Get session error:', error);
        throw new errorHandler_1.AppError('Failed to fetch session', 500, 'SESSION_FETCH_ERROR');
    }
});
/**
 * POST /api/sessions
 * Create a new session
 */
router.post('/', (0, validation_1.validateRequest)(createSessionSchema), async (req, res) => {
    try {
        const consultantId = req.user.id;
        const sessionData = req.body;
        const prisma = (0, database_1.getPrismaClient)();
        // Verify client belongs to consultant
        const client = await prisma.client.findFirst({
            where: {
                id: sessionData.clientId,
                consultantId
            }
        });
        if (!client) {
            throw new errorHandler_1.NotFoundError('Client');
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
            throw new errorHandler_1.ValidationError('You already have a session scheduled at this time');
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
        const meetingDetails = await (0, meetingService_1.generateMeetingLink)(sessionData.platform, {
            title: sessionData.title,
            startTime: scheduledDateTime,
            duration: sessionData.durationMinutes,
            consultantEmail: req.user.email,
            clientEmail: client.email
        });
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
            await (0, emailService_1.sendEmail)('session_confirmation', {
                to: client.email,
                data: {
                    clientName: client.name,
                    consultantName: `${req.user.slug || req.user.email}`,
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
            await (0, emailService_1.sendEmail)('session_booked', {
                to: req.user.email,
                data: {
                    consultantName: `${req.user.slug} ${req.user.email}`,
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
        }
        catch (emailError) {
            console.error('❌ Email sending failed:', emailError);
            // Don't fail the session creation if email fails
        }
        // Clear related caches
        await redis_1.cacheUtils.clearPattern(`sessions:${consultantId}:*`);
        await redis_1.cacheUtils.clearPattern(`dashboard_*:${consultantId}:*`);
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
    }
    catch (error) {
        if (error instanceof errorHandler_1.NotFoundError || error instanceof errorHandler_1.ValidationError) {
            throw error;
        }
        console.error('❌ Create session error:', error);
        throw new errorHandler_1.AppError('Failed to create session', 500, 'SESSION_CREATE_ERROR');
    }
});
/**
 * PUT /api/sessions/:id
 * Update a session
 */
router.put('/:id', (0, validation_1.validateRequest)(zod_1.z.object({ id: zod_1.z.string().uuid() }), 'params'), (0, validation_1.validateRequest)(updateSessionSchema), async (req, res) => {
    try {
        const { id } = req.params;
        const consultantId = req.user.id;
        const updates = req.body;
        const prisma = (0, database_1.getPrismaClient)();
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
            throw new errorHandler_1.NotFoundError('Session');
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
                throw new errorHandler_1.ValidationError('You already have a session scheduled at this time');
            }
        }
        // Update meeting link if platform or time changes
        let meetingDetails = null;
        if (updates.platform || updates.scheduledDate || updates.scheduledTime) {
            const scheduledDateTime = new Date(`${updates.scheduledDate || existingSession.scheduledDate.toISOString().split('T')[0]}T${updates.scheduledTime || existingSession.scheduledTime}`);
            meetingDetails = await (0, meetingService_1.generateMeetingLink)(updates.platform || existingSession.platform, {
                title: existingSession.title,
                startTime: scheduledDateTime,
                duration: updates.durationMinutes || existingSession.durationMinutes,
                consultantEmail: req.user.email,
                clientEmail: existingSession.client.email
            });
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
                await (0, emailService_1.sendEmail)(emailType, {
                    to: existingSession.client.email,
                    data: {
                        clientName: existingSession.client.name,
                        consultantName: `${req.user.slug} ${req.user.email}`,
                        sessionTitle: updatedSession.title,
                        sessionDate: updatedSession.scheduledDate.toLocaleDateString(),
                        sessionTime: updatedSession.scheduledTime,
                        meetingLink: updatedSession.meetingLink,
                        reason: updates.consultantNotes || 'Schedule change'
                    }
                });
            }
            catch (emailError) {
                console.error('❌ Update notification email failed:', emailError);
            }
        }
        // Clear related caches
        await redis_1.cacheUtils.clearPattern(`sessions:${consultantId}:*`);
        await redis_1.cacheUtils.clearPattern(`dashboard_*:${consultantId}:*`);
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
    }
    catch (error) {
        if (error instanceof errorHandler_1.NotFoundError || error instanceof errorHandler_1.ValidationError) {
            throw error;
        }
        console.error('❌ Update session error:', error);
        throw new errorHandler_1.AppError('Failed to update session', 500, 'SESSION_UPDATE_ERROR');
    }
});
/**
 * DELETE /api/sessions/:id
 * Delete/cancel a session
 */
router.delete('/:id', (0, validation_1.validateRequest)(zod_1.z.object({ id: zod_1.z.string().uuid() }), 'params'), async (req, res) => {
    try {
        const { id } = req.params;
        const consultantId = req.user.id;
        const prisma = (0, database_1.getPrismaClient)();
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
            throw new errorHandler_1.NotFoundError('Session');
        }
        // Check if session can be deleted (only pending/confirmed sessions)
        if (!['PENDING', 'CONFIRMED'].includes(session.status)) {
            throw new errorHandler_1.ValidationError('Cannot delete a session that is completed, cancelled, or abandoned');
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
            await (0, emailService_1.sendEmail)('session_cancelled', {
                to: session.client.email,
                data: {
                    clientName: session.client.name,
                    consultantName: `${req.user.slug} ${req.user.email}`,
                    sessionTitle: session.title,
                    sessionDate: session.scheduledDate.toLocaleDateString(),
                    sessionTime: session.scheduledTime,
                    reason: 'Cancelled by consultant'
                }
            });
        }
        catch (emailError) {
            console.error('❌ Cancellation email failed:', emailError);
        }
        // Clear related caches
        await redis_1.cacheUtils.clearPattern(`sessions:${consultantId}:*`);
        await redis_1.cacheUtils.clearPattern(`dashboard_*:${consultantId}:*`);
        console.log(`✅ Session cancelled: ${id}`);
        res.json({
            message: 'Session cancelled successfully'
        });
    }
    catch (error) {
        if (error instanceof errorHandler_1.NotFoundError || error instanceof errorHandler_1.ValidationError) {
            throw error;
        }
        console.error('❌ Cancel session error:', error);
        throw new errorHandler_1.AppError('Failed to cancel session', 500, 'SESSION_CANCEL_ERROR');
    }
});
/**
 * POST /api/sessions/bulk-update
 * Bulk update multiple sessions
 */
router.post('/bulk-update', (0, validation_1.validateRequest)(bulkUpdateSchema), async (req, res) => {
    try {
        const { sessionIds, updates } = req.body;
        const consultantId = req.user.id;
        const prisma = (0, database_1.getPrismaClient)();
        // Verify all sessions belong to the consultant
        const sessions = await prisma.session.findMany({
            where: {
                id: { in: sessionIds },
                consultantId
            }
        });
        if (sessions.length !== sessionIds.length) {
            throw new errorHandler_1.ValidationError('Some sessions not found or do not belong to you');
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
        await redis_1.cacheUtils.clearPattern(`sessions:${consultantId}:*`);
        await redis_1.cacheUtils.clearPattern(`dashboard_*:${consultantId}:*`);
        console.log(`✅ Bulk updated ${result.count} sessions`);
        res.json({
            message: `${result.count} sessions updated successfully`,
            data: {
                updatedCount: result.count,
                sessionIds
            }
        });
    }
    catch (error) {
        if (error instanceof errorHandler_1.ValidationError) {
            throw error;
        }
        console.error('❌ Bulk update sessions error:', error);
        throw new errorHandler_1.AppError('Failed to update sessions', 500, 'SESSIONS_BULK_UPDATE_ERROR');
    }
});
/**
 * GET /api/sessions/analytics
 * Get session analytics and metrics
 */
router.get('/analytics', (0, validation_1.validateRequest)(validation_1.commonSchemas.dateRange, 'query'), async (req, res) => {
    try {
        const consultantId = req.user.id;
        const { startDate, endDate } = req.query;
        // Set default date range if not provided
        const dateRange = {
            start: startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
            end: endDate ? new Date(endDate) : new Date()
        };
        const cacheKey = `session_analytics:${consultantId}:${dateRange.start.toISOString()}:${dateRange.end.toISOString()}`;
        // Check cache
        const cachedAnalytics = await redis_1.cacheUtils.get(cacheKey);
        if (cachedAnalytics) {
            res.json({
                data: cachedAnalytics,
                fromCache: true
            });
            return;
        }
        // Calculate analytics
        const analytics = await (0, analytics_1.calculateSessionMetrics)(consultantId, dateRange);
        // Cache for 10 minutes
        await redis_1.cacheUtils.set(cacheKey, analytics, 600);
        res.json({
            data: analytics,
            fromCache: false
        });
    }
    catch (error) {
        console.error('❌ Session analytics error:', error);
        throw new errorHandler_1.AppError('Failed to generate session analytics', 500, 'SESSION_ANALYTICS_ERROR');
    }
});
exports.default = router;
//# sourceMappingURL=sessions.js.map