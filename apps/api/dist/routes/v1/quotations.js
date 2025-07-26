"use strict";
/**
 * File Path: apps/api/src/routes/quotations.ts
 *
 * Quotation Management Routes
 *
 * Handles all quotation-related operations:
 * - Quotation creation and management
 * - Quotation sharing via email
 * - Quotation analytics and tracking
 * - Quotation status updates
 * - Client quotation viewing and responses
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const database_1 = require("../../config/database");
const redis_1 = require("../../config/redis");
const validation_1 = require("../../middleware/validation");
const errorHandler_1 = require("../../middleware/errorHandler");
const resendEmailService_1 = require("../../services/resendEmailService");
const router = (0, express_1.Router)();
/**
 * Validation schemas
 */
const createQuotationSchema = zod_1.z.object({
    clientId: validation_1.commonSchemas.id.optional(),
    clientEmail: zod_1.z.string().email('Invalid email format').max(255),
    clientName: zod_1.z.string().min(1, 'Client name is required').max(200),
    quotationName: zod_1.z.string().min(1, 'Quotation name is required').max(300),
    description: zod_1.z.string().max(2000, 'Description too long').optional(),
    baseAmount: zod_1.z.number().gte(0, 'Base amount cannot be negative'),
    discountPercentage: zod_1.z.number().min(0).max(100, 'Discount cannot exceed 100%').optional().default(0),
    currency: zod_1.z.string().length(3, 'Currency must be 3 characters').optional().default('INR'),
    durationText: zod_1.z.string().max(100, 'Duration text too long').optional(),
    expiryDays: zod_1.z.number().min(1).max(365, 'Expiry must be between 1-365 days').optional().default(30),
    notes: zod_1.z.string().max(1000, 'Notes too long').optional(),
    includeImage: zod_1.z.boolean().optional().default(false)
});
const updateQuotationSchema = zod_1.z.object({
    quotationName: zod_1.z.string().min(1).max(300).optional(),
    description: zod_1.z.string().max(2000).optional(),
    baseAmount: zod_1.z.number().gte(0).optional(),
    discountPercentage: zod_1.z.number().min(0).max(100).optional(),
    durationText: zod_1.z.string().max(100).optional(),
    expiresAt: zod_1.z.string().datetime().optional(),
    status: zod_1.z.enum(['DRAFT', 'SENT', 'VIEWED', 'ACCEPTED', 'REJECTED', 'EXPIRED']).optional(),
    notes: zod_1.z.string().max(1000).optional()
});
const quotationFiltersSchema = zod_1.z.object({
    status: zod_1.z.enum(['DRAFT', 'SENT', 'VIEWED', 'ACCEPTED', 'REJECTED', 'EXPIRED']).optional(),
    clientId: zod_1.z.string().uuid().optional(),
    minAmount: zod_1.z.number().min(0).optional(),
    maxAmount: zod_1.z.number().min(0).optional(),
    createdAfter: zod_1.z.string().datetime().optional(),
    createdBefore: zod_1.z.string().datetime().optional(),
    search: zod_1.z.string().max(100).optional()
});
const shareQuotationSchema = zod_1.z.object({
    emailMessage: zod_1.z.string().max(1000, 'Email message too long').optional(),
    includeAttachment: zod_1.z.boolean().optional().default(true)
});
/**
 * GET /api/quotations
 * Get quotations with filtering, sorting, and pagination
 */
router.get('/', (0, validation_1.validateRequest)(quotationFiltersSchema, 'query'), (0, validation_1.validateRequest)(validation_1.commonSchemas.pagination, 'query'), async (req, res) => {
    try {
        const consultantId = req.user.id;
        const filters = req.query;
        const { page, limit, sortBy, sortOrder } = req.query;
        // Build cache key
        const cacheKey = `quotations:${consultantId}:${JSON.stringify(filters)}:${page}:${limit}:${sortBy}:${sortOrder}`;
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
            ...(filters.clientId && { clientEmail: filters.clientId }), // Filter by client email since no direct clientId
            ...(filters.minAmount !== undefined && { finalAmount: { gte: filters.minAmount } }),
            ...(filters.maxAmount !== undefined && { finalAmount: { lte: filters.maxAmount } }),
            ...(filters.createdAfter && { createdAt: { gte: new Date(filters.createdAfter) } }),
            ...(filters.createdBefore && { createdAt: { lte: new Date(filters.createdBefore) } }),
            ...(filters.search && {
                OR: [
                    { quotationName: { contains: filters.search, mode: 'insensitive' } },
                    { clientName: { contains: filters.search, mode: 'insensitive' } },
                    { clientEmail: { contains: filters.search, mode: 'insensitive' } },
                    { description: { contains: filters.search, mode: 'insensitive' } }
                ]
            })
        };
        // Build order by clause
        const orderBy = {};
        if (sortBy) {
            orderBy[sortBy] = sortOrder;
        }
        else {
            orderBy.createdAt = 'desc';
        }
        // Get total count
        const totalCount = await prisma.quotation.count({ where });
        // Get quotations with pagination
        const quotations = await prisma.quotation.findMany({
            where,
            orderBy,
            skip: (page - 1) * limit,
            take: limit
        });
        // Format response data
        const formattedQuotations = quotations.map((quotation) => {
            const finalAmount = Number(quotation.amount) * (1 - Number(0) / 100);
            return {
                id: quotation.id,
                quotationName: quotation.quotationName,
                clientName: quotation.clientName,
                clientEmail: quotation.clientEmail,
                // client info available through clientName and clientEmail
                description: quotation.description,
                baseAmount: Number(quotation.amount),
                discountPercentage: 0, // Not implemented yet
                finalAmount: Number(quotation.amount),
                currency: quotation.currency,
                validUntil: quotation.validUntil,
                status: quotation.status,
                quotationNumber: quotation.quotationNumber,
                // viewCount not implemented yet
                lastViewedAt: quotation.lastViewedAt,
                sentAt: quotation.sentAt,
                acceptedAt: quotation.acceptedAt,
                notes: quotation.notes,
                createdAt: quotation.createdAt,
                updatedAt: quotation.updatedAt,
                isExpired: quotation.validUntil ? new Date() > quotation.validUntil : false,
                daysUntilExpiry: quotation.validUntil
                    ? Math.ceil((quotation.validUntil.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                    : null
            };
        });
        // Calculate summary statistics
        const summaryStats = {
            totalQuotations: totalCount,
            draftQuotations: formattedQuotations.filter((q) => q.status === 'DRAFT').length,
            sentQuotations: formattedQuotations.filter((q) => q.status === 'SENT').length,
            acceptedQuotations: formattedQuotations.filter((q) => q.status === 'ACCEPTED').length,
            totalValue: formattedQuotations.reduce((sum, q) => sum + q.finalAmount, 0),
            averageValue: formattedQuotations.length > 0
                ? formattedQuotations.reduce((sum, q) => sum + q.finalAmount, 0) / formattedQuotations.length
                : 0,
            conversionRate: formattedQuotations.filter((q) => q.status === 'SENT').length > 0
                ? (formattedQuotations.filter((q) => q.status === 'ACCEPTED').length / formattedQuotations.filter((q) => q.status === 'SENT').length) * 100
                : 0
        };
        const result = {
            quotations: formattedQuotations,
            pagination: {
                page,
                limit,
                totalCount,
                totalPages: Math.ceil(totalCount / limit),
                hasNextPage: page < Math.ceil(totalCount / limit),
                hasPrevPage: page > 1
            },
            filters,
            summaryStats
        };
        // Cache for 2 minutes
        await redis_1.cacheUtils.set(cacheKey, result, 120);
        res.json({
            data: result,
            fromCache: false
        });
    }
    catch (error) {
        console.error('❌ Get quotations error:', error);
        throw new errorHandler_1.AppError('Failed to fetch quotations', 500, 'QUOTATIONS_FETCH_ERROR');
    }
});
/**
 * GET /api/quotations/:id
 * Get a specific quotation by ID
 */
router.get('/:id', (0, validation_1.validateRequest)(zod_1.z.object({ id: validation_1.commonSchemas.id }), 'params'), async (req, res) => {
    try {
        const { id } = req.params;
        const consultantId = req.user.id;
        const prisma = (0, database_1.getPrismaClient)();
        const quotation = await prisma.quotation.findFirst({
            where: {
                id,
                consultantId
            }
        });
        if (!quotation) {
            throw new errorHandler_1.NotFoundError('Quotation');
        }
        // Format the response
        const formattedQuotation = {
            ...quotation,
            baseAmount: Number(quotation.baseAmount),
            discountPercentage: Number(quotation.discountPercentage),
            finalAmount: Number(quotation.finalAmount),
            client: {
                name: quotation.clientName,
                email: quotation.clientEmail,
                company: quotation.clientCompany
            },
            isExpired: quotation.expiresAt ? new Date() > quotation.expiresAt : false,
            daysUntilExpiry: quotation.expiresAt
                ? Math.ceil((quotation.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                : null
        };
        res.json({
            data: { quotation: formattedQuotation }
        });
    }
    catch (error) {
        if (error instanceof errorHandler_1.NotFoundError) {
            throw error;
        }
        console.error('❌ Get quotation error:', error);
        throw new errorHandler_1.AppError('Failed to fetch quotation', 500, 'QUOTATION_FETCH_ERROR');
    }
});
/**
 * POST /api/quotations
 * Create a new quotation
 */
router.post('/', (0, validation_1.validateRequest)(createQuotationSchema), async (req, res) => {
    try {
        const consultantId = req.user.id;
        const quotationData = req.body;
        const prisma = (0, database_1.getPrismaClient)();
        // Calculate final amount
        const finalAmount = quotationData.baseAmount * (1 - quotationData.discountPercentage / 100);
        // Calculate expiry date
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + quotationData.expiryDays);
        // If clientId is provided, verify it belongs to consultant and get client info
        if (quotationData.clientId) {
            const client = await prisma.client.findFirst({
                where: {
                    id: quotationData.clientId,
                    consultantId
                }
            });
            if (!client) {
                throw new errorHandler_1.NotFoundError('Client');
            }
            // Use client's information if not provided in quotation data
            if (!quotationData.clientName) {
                quotationData.clientName = client.name;
            }
            if (!quotationData.clientEmail) {
                quotationData.clientEmail = client.email;
            }
        }
        // Create quotation
        const quotation = await prisma.quotation.create({
            data: {
                consultantId,
                clientEmail: quotationData.clientEmail,
                clientName: quotationData.clientName,
                quotationName: quotationData.quotationName,
                title: quotationData.quotationName, // Required field
                description: quotationData.description || '',
                baseAmount: quotationData.baseAmount,
                discountPercentage: quotationData.discountPercentage,
                finalAmount,
                amount: finalAmount, // Alias for finalAmount
                currency: quotationData.currency,
                validUntil: expiresAt, // Required field
                expiresAt,
                notes: quotationData.notes,
                status: 'DRAFT',
                quotationNumber: `QT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}` // Generate unique quotation number
            }
        });
        // Generate quotation image/PDF if requested
        if (quotationData.includeImage) {
            try {
                // TODO: Implement PDF generation service
                const quotationPDF = { secure_url: null }; // Placeholder
                /*
                const quotationPDF = await generateQuotationPDF({
                  quotation: {
                    ...quotation,
                    finalAmount: Number(finalAmount),
                    baseAmount: Number(quotation.amount),
                    discountPercentage: Number(0)
                  },
                  consultant: {
                    name: `${req.user!.firstName} ${req.user!.lastName}`,
                    email: req.user!.email
                  }
                });
                */
                // Upload PDF to Cloudinary
                // TODO: Upload generated PDF to cloud storage
                const uploadResult = { secure_url: null }; // Placeholder
                // Update quotation with image URL
                await prisma.quotation.update({
                    where: { id: quotation.id },
                    data: { // quotationImageUrl: uploadResult.secure_url // TODO: Remove when PDF service is implemented
                    }
                });
            }
            catch (imageError) {
                console.error('❌ Quotation image generation failed:', imageError);
                // Don't fail quotation creation if image generation fails
            }
        }
        // Clear related caches
        await redis_1.cacheUtils.clearPattern(`quotations:${consultantId}:*`);
        await redis_1.cacheUtils.clearPattern(`dashboard_*:${consultantId}:*`);
        console.log(`✅ Quotation created: ${quotation.id} for ${quotationData.clientName}`);
        res.status(201).json({
            message: 'Quotation created successfully',
            data: {
                quotation: {
                    ...quotation,
                    baseAmount: Number(quotation.amount),
                    discountPercentage: 0, // Not implemented yet
                    finalAmount: Number(quotation.finalAmount)
                }
            }
        });
    }
    catch (error) {
        if (error instanceof errorHandler_1.NotFoundError) {
            throw error;
        }
        console.error('❌ Create quotation error:', error);
        throw new errorHandler_1.AppError('Failed to create quotation', 500, 'QUOTATION_CREATE_ERROR');
    }
});
/**
 * PUT /api/quotations/:id
 * Update a quotation
 */
router.put('/:id', (0, validation_1.validateRequest)(zod_1.z.object({ id: validation_1.commonSchemas.id }), 'params'), (0, validation_1.validateRequest)(updateQuotationSchema), async (req, res) => {
    try {
        const { id } = req.params;
        const consultantId = req.user.id;
        const updates = req.body;
        const prisma = (0, database_1.getPrismaClient)();
        // Get existing quotation
        const existingQuotation = await prisma.quotation.findFirst({
            where: {
                id,
                consultantId
            }
        });
        if (!existingQuotation) {
            throw new errorHandler_1.NotFoundError('Quotation');
        }
        // Check if quotation can be updated
        if (existingQuotation.status === 'ACCEPTED' || existingQuotation.status === 'REJECTED') {
            throw new errorHandler_1.ValidationError('Cannot update quotation that has been accepted or rejected');
        }
        // Recalculate final amount if base amount or discount changed
        let finalAmount = Number(existingQuotation.finalAmount);
        if (updates.baseAmount !== undefined || updates.discountPercentage !== undefined) {
            const baseAmount = updates.baseAmount || Number(existingQuotation.baseAmount);
            const discountPercentage = updates.discountPercentage || Number(existingQuotation.discountPercentage);
            finalAmount = baseAmount * (1 - discountPercentage / 100);
        }
        // Update quotation
        const updatedQuotation = await prisma.quotation.update({
            where: { id },
            data: {
                ...updates,
                ...(updates.expiresAt && { expiresAt: new Date(updates.expiresAt) }),
                finalAmount,
                updatedAt: new Date()
            }
        });
        // Clear related caches
        await redis_1.cacheUtils.clearPattern(`quotations:${consultantId}:*`);
        console.log(`✅ Quotation updated: ${id}`);
        res.json({
            message: 'Quotation updated successfully',
            data: {
                quotation: {
                    ...updatedQuotation,
                    baseAmount: Number(updatedQuotation.baseAmount),
                    discountPercentage: Number(updatedQuotation.discountPercentage),
                    finalAmount: Number(updatedQuotation.finalAmount)
                }
            }
        });
    }
    catch (error) {
        if (error instanceof errorHandler_1.NotFoundError || error instanceof errorHandler_1.ValidationError) {
            throw error;
        }
        console.error('❌ Update quotation error:', error);
        throw new errorHandler_1.AppError('Failed to update quotation', 500, 'QUOTATION_UPDATE_ERROR');
    }
});
/**
 * POST /api/quotations/:id/send
 * Send quotation to client via email
 */
router.post('/:id/send', (0, validation_1.validateRequest)(zod_1.z.object({ id: validation_1.commonSchemas.id }), 'params'), (0, validation_1.validateRequest)(shareQuotationSchema), async (req, res) => {
    try {
        const { id } = req.params;
        const { emailMessage, includeAttachment } = req.body;
        const consultantId = req.user.id;
        const prisma = (0, database_1.getPrismaClient)();
        // Get quotation and consultant information
        const quotation = await prisma.quotation.findFirst({
            where: {
                id,
                consultantId
            },
            include: {
                consultant: {
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true,
                        personalSessionTitle: true,
                        webinarSessionTitle: true
                    }
                }
            }
        });
        if (!quotation) {
            throw new errorHandler_1.NotFoundError('Quotation');
        }
        // Check if quotation can be sent
        if (quotation.status === 'ACCEPTED' || quotation.status === 'REJECTED') {
            throw new errorHandler_1.ValidationError('Cannot send quotation that has been accepted or rejected');
        }
        // Check if quotation is expired
        if (quotation.expiresAt && new Date() > quotation.expiresAt) {
            throw new errorHandler_1.ValidationError('Cannot send expired quotation');
        }
        // Prepare email data for Resend service
        const emailData = {
            quotationId: quotation.id,
            quotationNumber: quotation.quotationNumber,
            quotationName: quotation.quotationName,
            description: quotation.description,
            baseAmount: Number(quotation.baseAmount),
            discountPercentage: Number(quotation.discountPercentage),
            finalAmount: Number(quotation.finalAmount),
            currency: quotation.currency,
            validUntil: quotation.expiresAt?.toISOString(),
            notes: quotation.notes || undefined,
            clientName: quotation.clientName,
            clientEmail: quotation.clientEmail,
            consultantName: `${quotation.consultant.firstName} ${quotation.consultant.lastName}`,
            consultantEmail: quotation.consultant.email,
            emailMessage: emailMessage || '',
            viewQuotationUrl: `${process.env.FRONTEND_URL}/quotation/${quotation.id}`,
            sentDate: new Date().toLocaleDateString()
        };
        // Send emails using Resend service
        console.log(`📧 Sending quotation emails via Resend for quotation: ${quotation.id}`);
        const emailResults = await (0, resendEmailService_1.sendQuotationEmails)(emailData);
        // Check if both emails were sent successfully
        if (!emailResults.client.success) {
            console.error('❌ Failed to send quotation email to client:', emailResults.client.error);
            throw new errorHandler_1.AppError('Failed to send quotation email to client', 500, 'EMAIL_SEND_ERROR');
        }
        if (!emailResults.consultant.success) {
            console.warn('⚠️ Failed to send confirmation email to consultant:', emailResults.consultant.error);
            // Don't fail the request if consultant email fails - client email is more important
        }
        console.log(`✅ Quotation emails sent successfully:`, {
            client: emailResults.client.success,
            consultant: emailResults.consultant.success,
            clientEmailId: emailResults.client.emailId,
            consultantEmailId: emailResults.consultant.emailId
        });
        // Update quotation status and sent timestamp
        const updatedQuotation = await prisma.quotation.update({
            where: { id },
            data: {
                status: 'SENT',
                sentAt: new Date(),
                updatedAt: new Date()
            }
        });
        // Clear related caches
        await redis_1.cacheUtils.clearPattern(`quotations:${consultantId}:*`);
        await redis_1.cacheUtils.clearPattern(`dashboard_*:${consultantId}:*`);
        console.log(`✅ Quotation sent: ${id} to ${quotation.clientEmail}`);
        res.json({
            message: 'Quotation sent successfully',
            data: {
                quotation: {
                    ...updatedQuotation,
                    baseAmount: Number(updatedQuotation.baseAmount),
                    discountPercentage: Number(updatedQuotation.discountPercentage),
                    finalAmount: Number(updatedQuotation.finalAmount)
                },
                emailStatus: {
                    clientEmailSent: emailResults.client.success,
                    consultantEmailSent: emailResults.consultant.success,
                    clientEmailId: emailResults.client.emailId,
                    consultantEmailId: emailResults.consultant.emailId
                }
            }
        });
    }
    catch (error) {
        if (error instanceof errorHandler_1.NotFoundError || error instanceof errorHandler_1.ValidationError || error instanceof errorHandler_1.AppError) {
            throw error;
        }
        console.error('❌ Send quotation error:', error);
        throw new errorHandler_1.AppError('Failed to send quotation', 500, 'QUOTATION_SEND_ERROR');
    }
});
/**
 * DELETE /api/quotations/:id
 * Delete a quotation (only if draft)
 */
router.delete('/:id', (0, validation_1.validateRequest)(zod_1.z.object({ id: validation_1.commonSchemas.id }), 'params'), async (req, res) => {
    try {
        const { id } = req.params;
        const consultantId = req.user.id;
        const prisma = (0, database_1.getPrismaClient)();
        // Get quotation
        const quotation = await prisma.quotation.findFirst({
            where: {
                id,
                consultantId
            }
        });
        if (!quotation) {
            throw new errorHandler_1.NotFoundError('Quotation');
        }
        // Only allow deletion of draft quotations
        if (quotation.status !== 'DRAFT') {
            throw new errorHandler_1.ValidationError('Can only delete draft quotations');
        }
        // Delete quotation
        await prisma.quotation.delete({
            where: { id }
        });
        // Clear related caches
        await redis_1.cacheUtils.clearPattern(`quotations:${consultantId}:*`);
        await redis_1.cacheUtils.clearPattern(`dashboard_*:${consultantId}:*`);
        console.log(`✅ Quotation deleted: ${id}`);
        res.json({
            message: 'Quotation deleted successfully'
        });
    }
    catch (error) {
        if (error instanceof errorHandler_1.NotFoundError || error instanceof errorHandler_1.ValidationError) {
            throw error;
        }
        console.error('❌ Delete quotation error:', error);
        throw new errorHandler_1.AppError('Failed to delete quotation', 500, 'QUOTATION_DELETE_ERROR');
    }
});
/**
 * GET /api/quotations/analytics
 * Get quotation analytics and insights
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
        const cacheKey = `quotation_analytics:${consultantId}:${dateRange.start.toISOString()}:${dateRange.end.toISOString()}`;
        // Check cache
        const cachedAnalytics = await redis_1.cacheUtils.get(cacheKey);
        if (cachedAnalytics) {
            res.json({
                data: cachedAnalytics,
                fromCache: true
            });
            return;
        }
        const prisma = (0, database_1.getPrismaClient)();
        // Get quotation analytics
        const [totalQuotations, statusBreakdown, valueAnalytics, conversionAnalytics, topQuotations] = await Promise.all([
            // Total quotations count
            prisma.quotation.count({
                where: {
                    consultantId,
                    createdAt: {
                        gte: dateRange.start,
                        lte: dateRange.end
                    }
                }
            }),
            // Status breakdown
            prisma.quotation.groupBy({
                by: ['status'],
                where: {
                    consultantId,
                    createdAt: {
                        gte: dateRange.start,
                        lte: dateRange.end
                    }
                },
                _count: true,
                _sum: { finalAmount: true }
            }),
            // Value analytics
            prisma.quotation.aggregate({
                where: {
                    consultantId,
                    createdAt: {
                        gte: dateRange.start,
                        lte: dateRange.end
                    }
                },
                _sum: { finalAmount: true },
                _avg: { finalAmount: true },
                _max: { finalAmount: true },
                _min: { finalAmount: true }
            }),
            // Conversion analytics (view to acceptance)
            prisma.quotation.findMany({
                where: {
                    consultantId,
                    status: { in: ['VIEWED', 'ACCEPTED', 'REJECTED'] },
                    createdAt: {
                        gte: dateRange.start,
                        lte: dateRange.end
                    }
                },
                select: { status: true, viewCount: true, sentAt: true, respondedAt: true }
            }),
            // Top quotations by value
            prisma.quotation.findMany({
                where: {
                    consultantId,
                    createdAt: {
                        gte: dateRange.start,
                        lte: dateRange.end
                    }
                },
                orderBy: { finalAmount: 'desc' },
                take: 5,
                select: {
                    id: true,
                    quotationName: true,
                    clientName: true,
                    finalAmount: true,
                    status: true,
                    createdAt: true
                }
            })
        ]);
        const analytics = {
            summary: {
                totalQuotations,
                totalValue: Number(valueAnalytics._sum.finalAmount || 0),
                averageValue: Number(valueAnalytics._avg.finalAmount || 0),
                highestValue: Number(valueAnalytics._max.finalAmount || 0),
                lowestValue: Number(valueAnalytics._min.finalAmount || 0)
            },
            statusBreakdown: statusBreakdown.map((item) => ({
                status: item.status,
                count: item._count,
                totalValue: Number(item._sum.finalAmount || 0)
            })),
            conversion: {
                viewedQuotations: conversionAnalytics.filter((q) => q.status === 'VIEWED').length,
                acceptedQuotations: conversionAnalytics.filter((q) => q.status === 'ACCEPTED').length,
                rejectedQuotations: conversionAnalytics.filter((q) => q.status === 'REJECTED').length,
                conversionRate: conversionAnalytics.length > 0
                    ? (conversionAnalytics.filter((q) => q.status === 'ACCEPTED').length / conversionAnalytics.length) * 100
                    : 0,
                averageResponseTime: conversionAnalytics
                    .filter((q) => q.sentAt && q.respondedAt)
                    .reduce((sum, q) => {
                    const responseTime = new Date(q.respondedAt).getTime() - new Date(q.sentAt).getTime();
                    return sum + responseTime;
                }, 0) / Math.max(1, conversionAnalytics.filter((q) => q.sentAt && q.respondedAt).length)
            },
            topQuotations: topQuotations.map((q) => ({
                ...q,
                finalAmount: Number(q.finalAmount)
            })),
            dateRange: {
                start: dateRange.start.toISOString(),
                end: dateRange.end.toISOString()
            }
        };
        // Cache for 30 minutes
        await redis_1.cacheUtils.set(cacheKey, analytics, 1800);
        res.json({
            data: analytics,
            fromCache: false
        });
    }
    catch (error) {
        console.error('❌ Quotation analytics error:', error);
        throw new errorHandler_1.AppError('Failed to generate quotation analytics', 500, 'QUOTATION_ANALYTICS_ERROR');
    }
});
exports.default = router;
//# sourceMappingURL=quotations.js.map