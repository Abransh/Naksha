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
const validation_1 = require("../../middleware/validation");
const errorHandler_1 = require("../../middleware/errorHandler");
const resendEmailService_1 = require("../../services/resendEmailService");
const meetingService_1 = require("../../services/meetingService");
const analytics_1 = require("../../utils/analytics");
const router = (0, express_1.Router)();
/**
 * Validation schemas
 */
const createSessionSchema = zod_1.z.object({
    clientId: zod_1.z.string().min(1, 'Client ID is required'),
    title: zod_1.z.string().min(1, 'Title is required').max(300, 'Title too long'),
    sessionType: zod_1.z.enum(['PERSONAL', 'WEBINAR']),
    scheduledDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
    scheduledTime: zod_1.z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
    durationMinutes: zod_1.z.number().min(15).max(480).optional().default(60),
    amount: zod_1.z.number().gte(0, 'Amount cannot be negative'),
    platform: zod_1.z.enum(['TEAMS']),
    notes: zod_1.z.string().max(1000).optional(),
    paymentMethod: zod_1.z.enum(['online', 'cash', 'bank_transfer']).optional().default('online')
});
const updateSessionSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).max(300).optional(),
    scheduledDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    scheduledTime: zod_1.z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
    durationMinutes: zod_1.z.number().min(15).max(480).optional(),
    amount: zod_1.z.number().gte(0).optional(),
    platform: zod_1.z.enum(['TEAMS']).optional(),
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
    clientId: zod_1.z.string().min(1).optional(),
    startDate: zod_1.z.string().datetime().optional(),
    endDate: zod_1.z.string().datetime().optional(),
    search: zod_1.z.string().max(100).optional()
});
const bulkUpdateSchema = zod_1.z.object({
    sessionIds: zod_1.z.array(zod_1.z.string().min(1)).min(1, 'At least one session ID required').max(50, 'Too many sessions'),
    updates: zod_1.z.object({
        status: zod_1.z.enum(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'RETURNED', 'ABANDONED', 'NO_SHOW']).optional(),
        paymentStatus: zod_1.z.enum(['PENDING', 'PAID', 'REFUNDED', 'FAILED']).optional(),
        consultantNotes: zod_1.z.string().max(1000).optional()
    }).refine(data => Object.keys(data).length > 0, {
        message: 'At least one field must be provided for update'
    })
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
router.get('/:id', (0, validation_1.validateRequest)(zod_1.z.object({ id: zod_1.z.string().min(1) }), 'params'), async (req, res) => {
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
        // Check if it's a repeat client (commented out as not needed for Resend email)
        // const clientSessionCount = await prisma.session.count({
        //   where: {
        //     clientId: sessionData.clientId,
        //     status: 'COMPLETED'
        //   }
        // });
        // const isRepeatClient = clientSessionCount > 0; // Not used in Resend email
        // Get consultant's Teams access token if needed
        let consultantAccessToken;
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
                throw new errorHandler_1.ValidationError('Microsoft Teams integration is not connected. Please connect your Microsoft account in Settings.');
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
                throw new errorHandler_1.ValidationError('Microsoft Teams access token has expired. Please reconnect your Microsoft account in Settings.');
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
                consultantEmail: req.user.email,
                clientEmail: client.email,
                hasAccessToken: !!consultantAccessToken
            });
            meetingDetails = await (0, meetingService_1.generateMeetingLink)(sessionData.platform, {
                title: sessionData.title,
                startTime: scheduledDateTime,
                duration: sessionData.durationMinutes,
                consultantEmail: req.user.email,
                clientEmail: client.email
            }, consultantAccessToken);
            console.log('✅ [SESSIONS] Meeting link generated successfully:', {
                meetingId: meetingDetails.meetingId,
                meetingLink: meetingDetails.meetingLink,
                platform: sessionData.platform
            });
        }
        catch (meetingError) {
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
                    throw new errorHandler_1.ValidationError('Microsoft Teams authentication failed. Please reconnect your Microsoft account in Settings and try again.');
                }
                if (meetingError.message.includes('permissions') ||
                    meetingError.message.includes('scopes')) {
                    throw new errorHandler_1.ValidationError('Microsoft Teams permissions are insufficient. Please reconnect your Microsoft account with proper permissions.');
                }
                if (meetingError.message.includes('404') ||
                    meetingError.message.includes('not found')) {
                    throw new errorHandler_1.ValidationError('Microsoft Teams service is not available. Please check your account permissions and try again.');
                }
            }
            throw new errorHandler_1.AppError('Failed to create meeting link: ' + meetingError.message, 500, 'MEETING_GENERATION_ERROR');
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
            await (0, resendEmailService_1.sendSessionConfirmationEmail)({
                sessionId: session.id,
                sessionTitle: session.title,
                sessionType: session.sessionType,
                clientName: client.name,
                clientEmail: client.email,
                consultantName: req.user.slug || req.user.email,
                consultantEmail: req.user.email,
                sessionDate: session.scheduledDate.toISOString().split('T')[0],
                sessionTime: session.scheduledTime,
                amount: Number(session.amount),
                currency: session.currency || 'INR',
                meetingLink: session.meetingLink || '',
                meetingPlatform: (session.platform || 'ZOOM').toUpperCase()
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
router.put('/:id', (0, validation_1.validateRequest)(zod_1.z.object({ id: zod_1.z.string().min(1) }), 'params'), (0, validation_1.validateRequest)(updateSessionSchema), async (req, res) => {
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
            // Get consultant's Teams access token if needed
            let consultantAccessToken;
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
                    throw new errorHandler_1.ValidationError('Microsoft Teams integration is not connected. Please connect your Microsoft account in Settings.');
                }
                if (consultant.teamsTokenExpiresAt < new Date()) {
                    throw new errorHandler_1.ValidationError('Microsoft Teams access token has expired. Please reconnect your Microsoft account in Settings.');
                }
                consultantAccessToken = consultant.teamsAccessToken;
            }
            meetingDetails = await (0, meetingService_1.generateMeetingLink)(newPlatform, {
                title: existingSession.title,
                startTime: scheduledDateTime,
                duration: updates.durationMinutes || existingSession.durationMinutes,
                consultantEmail: req.user.email,
                clientEmail: existingSession.client.email
            }, consultantAccessToken);
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
                await (0, resendEmailService_1.sendSessionConfirmationEmail)({
                    sessionId: updatedSession.id,
                    sessionTitle: `${updates.status === 'CANCELLED' ? 'CANCELLED: ' : 'UPDATED: '}${updatedSession.title}`,
                    sessionType: existingSession.sessionType,
                    clientName: existingSession.client.name,
                    clientEmail: existingSession.client.email,
                    consultantName: req.user.slug || req.user.email,
                    consultantEmail: req.user.email,
                    sessionDate: updatedSession.scheduledDate.toISOString().split('T')[0],
                    sessionTime: updatedSession.scheduledTime,
                    amount: Number(updatedSession.amount),
                    currency: updatedSession.currency || 'INR',
                    meetingLink: updatedSession.meetingLink || '',
                    meetingPlatform: (existingSession.platform || 'ZOOM').toUpperCase()
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
router.delete('/:id', (0, validation_1.validateRequest)(zod_1.z.object({ id: zod_1.z.string().min(1) }), 'params'), async (req, res) => {
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
        // Send cancellation email via Resend
        try {
            await (0, resendEmailService_1.sendSessionConfirmationEmail)({
                sessionId: session.id,
                sessionTitle: `CANCELLED: ${session.title}`,
                sessionType: session.sessionType,
                clientName: session.client.name,
                clientEmail: session.client.email,
                consultantName: req.user.slug || req.user.email,
                consultantEmail: req.user.email,
                sessionDate: session.scheduledDate.toISOString().split('T')[0],
                sessionTime: session.scheduledTime,
                amount: Number(session.amount),
                currency: session.currency || 'INR',
                meetingLink: session.meetingLink || '',
                meetingPlatform: (session.platform || 'ZOOM').toUpperCase()
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