"use strict";
/**
 * File Path: apps/api/src/routes/v1/availability.ts
 *
 * Availability Management Routes
 *
 * Handles all availability-related operations:
 * - Weekly availability pattern management
 * - Availability slot generation
 * - Getting available time slots for booking
 * - Managing consultant schedules
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const database_1 = require("../../config/database");
const redis_1 = require("../../config/redis");
const auth_1 = require("../../middleware/auth");
const validation_1 = require("../../middleware/validation");
const errorHandler_1 = require("../../middleware/errorHandler");
const router = (0, express_1.Router)();
/**
 * Validation schemas
 */
const weeklyPatternSchema = zod_1.z.object({
    sessionType: zod_1.z.enum(['PERSONAL', 'WEBINAR']),
    dayOfWeek: zod_1.z.number().min(0).max(6), // 0 = Sunday, 6 = Saturday
    startTime: zod_1.z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
    endTime: zod_1.z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
    isActive: zod_1.z.boolean().default(true),
    timezone: zod_1.z.string().default('Asia/Kolkata')
});
const updatePatternSchema = weeklyPatternSchema.partial();
const bulkPatternsSchema = zod_1.z.object({
    patterns: zod_1.z.array(weeklyPatternSchema)
});
const generateSlotsSchema = zod_1.z.object({
    startDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
    endDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
    sessionType: zod_1.z.enum(['PERSONAL', 'WEBINAR']).optional()
});
/**
 * Helper functions
 */
const validateTimeRange = (startTime, endTime) => {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    const startTotalMin = startHour * 60 + startMin;
    const endTotalMin = endHour * 60 + endMin;
    if (endTotalMin <= startTotalMin) {
        throw new errorHandler_1.ValidationError('End time must be after start time');
    }
};
const generateDateRange = (startDate, endDate) => {
    const dates = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    for (const date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
        dates.push(new Date(date));
    }
    return dates;
};
/**
 * GET /availability/patterns
 * Get all weekly availability patterns for authenticated consultant
 */
router.get('/patterns', auth_1.authenticateConsultant, async (req, res) => {
    try {
        const prisma = (0, database_1.getPrismaClient)();
        const consultantId = req.user.id;
        const patterns = await prisma.weeklyAvailabilityPattern.findMany({
            where: { consultantId },
            orderBy: [
                { sessionType: 'asc' },
                { dayOfWeek: 'asc' },
                { startTime: 'asc' }
            ]
        });
        res.json({
            message: 'Weekly availability patterns retrieved successfully',
            data: { patterns }
        });
    }
    catch (error) {
        console.error('Error fetching weekly patterns:', error);
        throw new errorHandler_1.AppError('Failed to fetch availability patterns');
    }
});
/**
 * POST /availability/patterns
 * Create a new weekly availability pattern
 */
router.post('/patterns', auth_1.authenticateConsultant, (0, validation_1.validateRequest)(weeklyPatternSchema), async (req, res) => {
    try {
        const prisma = (0, database_1.getPrismaClient)();
        const consultantId = req.user.id;
        const { sessionType, dayOfWeek, startTime, endTime, isActive, timezone } = req.body;
        // Validate time range
        validateTimeRange(startTime, endTime);
        // Check for overlapping patterns
        const existingPattern = await prisma.weeklyAvailabilityPattern.findFirst({
            where: {
                consultantId,
                sessionType,
                dayOfWeek,
                OR: [
                    {
                        startTime: { lte: startTime },
                        endTime: { gt: startTime }
                    },
                    {
                        startTime: { lt: endTime },
                        endTime: { gte: endTime }
                    },
                    {
                        startTime: { gte: startTime },
                        endTime: { lte: endTime }
                    }
                ]
            }
        });
        if (existingPattern) {
            throw new errorHandler_1.ValidationError('Time slot overlaps with existing pattern');
        }
        const pattern = await prisma.weeklyAvailabilityPattern.create({
            data: {
                consultantId,
                sessionType,
                dayOfWeek,
                startTime,
                endTime,
                isActive,
                timezone
            }
        });
        // Clear availability cache
        await redis_1.cacheUtils.delete(`availability:${consultantId}`);
        res.status(201).json({
            message: 'Weekly availability pattern created successfully',
            data: { pattern }
        });
    }
    catch (error) {
        if (error instanceof errorHandler_1.ValidationError)
            throw error;
        console.error('Error creating weekly pattern:', error);
        throw new errorHandler_1.AppError('Failed to create availability pattern');
    }
});
/**
 * PUT /availability/patterns/:id
 * Update a weekly availability pattern
 */
router.put('/patterns/:id', auth_1.authenticateConsultant, (0, validation_1.validateRequest)(updatePatternSchema), async (req, res) => {
    try {
        const prisma = (0, database_1.getPrismaClient)();
        const consultantId = req.user.id;
        const patternId = req.params.id;
        const updateData = req.body;
        // Validate time range if both times are provided
        if (updateData.startTime && updateData.endTime) {
            validateTimeRange(updateData.startTime, updateData.endTime);
        }
        // Verify pattern ownership
        const existingPattern = await prisma.weeklyAvailabilityPattern.findFirst({
            where: { id: patternId, consultantId }
        });
        if (!existingPattern) {
            throw new errorHandler_1.NotFoundError('Availability pattern not found');
        }
        const pattern = await prisma.weeklyAvailabilityPattern.update({
            where: { id: patternId },
            data: updateData
        });
        // Clear availability cache
        await redis_1.cacheUtils.delete(`availability:${consultantId}`);
        res.json({
            message: 'Weekly availability pattern updated successfully',
            data: { pattern }
        });
    }
    catch (error) {
        if (error instanceof errorHandler_1.ValidationError || error instanceof errorHandler_1.NotFoundError)
            throw error;
        console.error('Error updating weekly pattern:', error);
        throw new errorHandler_1.AppError('Failed to update availability pattern');
    }
});
/**
 * DELETE /availability/patterns/:id
 * Delete a weekly availability pattern
 */
router.delete('/patterns/:id', auth_1.authenticateConsultant, async (req, res) => {
    try {
        const prisma = (0, database_1.getPrismaClient)();
        const consultantId = req.user.id;
        const patternId = req.params.id;
        // Verify pattern ownership
        const existingPattern = await prisma.weeklyAvailabilityPattern.findFirst({
            where: { id: patternId, consultantId }
        });
        if (!existingPattern) {
            throw new errorHandler_1.NotFoundError('Availability pattern not found');
        }
        await prisma.weeklyAvailabilityPattern.delete({
            where: { id: patternId }
        });
        // Clear availability cache
        await redis_1.cacheUtils.delete(`availability:${consultantId}`);
        res.json({
            message: 'Weekly availability pattern deleted successfully'
        });
    }
    catch (error) {
        if (error instanceof errorHandler_1.NotFoundError)
            throw error;
        console.error('Error deleting weekly pattern:', error);
        throw new errorHandler_1.AppError('Failed to delete availability pattern');
    }
});
/**
 * POST /availability/patterns/bulk
 * Create or update multiple weekly availability patterns
 */
router.post('/patterns/bulk', auth_1.authenticateConsultant, (0, validation_1.validateRequest)(bulkPatternsSchema), async (req, res) => {
    try {
        const prisma = (0, database_1.getPrismaClient)();
        const consultantId = req.user.id;
        const { patterns } = req.body;
        // Validate all patterns
        for (const pattern of patterns) {
            validateTimeRange(pattern.startTime, pattern.endTime);
        }
        // Clear existing patterns for this consultant
        await prisma.weeklyAvailabilityPattern.deleteMany({
            where: { consultantId }
        });
        // Create new patterns
        const createdPatterns = await prisma.$transaction(patterns.map((pattern) => prisma.weeklyAvailabilityPattern.create({
            data: {
                consultantId,
                ...pattern
            }
        })));
        // Clear availability cache
        await redis_1.cacheUtils.delete(`availability:${consultantId}`);
        res.json({
            message: 'Weekly availability patterns updated successfully',
            data: { patterns: createdPatterns }
        });
    }
    catch (error) {
        if (error instanceof errorHandler_1.ValidationError)
            throw error;
        console.error('Error bulk updating patterns:', error);
        throw new errorHandler_1.AppError('Failed to update availability patterns');
    }
});
/**
 * POST /availability/generate-slots
 * Generate availability slots from weekly patterns for a date range
 */
router.post('/generate-slots', auth_1.authenticateConsultant, (0, validation_1.validateRequest)(generateSlotsSchema), async (req, res) => {
    try {
        const prisma = (0, database_1.getPrismaClient)();
        const consultantId = req.user.id;
        const { startDate, endDate, sessionType } = req.body;
        // Get weekly patterns
        const patterns = await prisma.weeklyAvailabilityPattern.findMany({
            where: {
                consultantId,
                isActive: true,
                ...(sessionType && { sessionType })
            }
        });
        if (patterns.length === 0) {
            res.json({
                message: 'No active patterns found',
                data: { slotsCreated: 0 }
            });
            return;
        }
        // Generate date range
        const dates = generateDateRange(startDate, endDate);
        const slotsToCreate = [];
        for (const date of dates) {
            const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
            const matchingPatterns = patterns.filter(p => p.dayOfWeek === dayOfWeek);
            for (const pattern of matchingPatterns) {
                // Check if slot already exists
                const existingSlot = await prisma.availabilitySlot.findFirst({
                    where: {
                        consultantId,
                        sessionType: pattern.sessionType,
                        date,
                        startTime: pattern.startTime
                    }
                });
                if (!existingSlot) {
                    slotsToCreate.push({
                        consultantId,
                        sessionType: pattern.sessionType,
                        date,
                        startTime: pattern.startTime,
                        endTime: pattern.endTime,
                        isBooked: false,
                        isBlocked: false
                    });
                }
            }
        }
        // Create slots in batch
        const createdSlots = await prisma.$transaction(slotsToCreate.map((slot) => prisma.availabilitySlot.create({ data: slot })));
        // Clear availability cache
        await redis_1.cacheUtils.delete(`availability:${consultantId}`);
        res.json({
            message: 'Availability slots generated successfully',
            data: {
                slotsCreated: createdSlots.length,
                dateRange: { startDate, endDate }
            }
        });
    }
    catch (error) {
        console.error('Error generating slots:', error);
        throw new errorHandler_1.AppError('Failed to generate availability slots');
    }
});
/**
 * GET /availability/slots
 * Get available slots for booking (public endpoint with consultant slug)
 */
router.get('/slots/:consultantSlug', async (req, res) => {
    try {
        const prisma = (0, database_1.getPrismaClient)();
        const { consultantSlug } = req.params;
        const { sessionType, startDate, endDate } = req.query;
        // Find consultant by slug
        const consultant = await prisma.consultant.findUnique({
            where: { slug: consultantSlug },
            select: { id: true }
        });
        if (!consultant) {
            throw new errorHandler_1.NotFoundError('Consultant not found');
        }
        const consultantId = consultant.id;
        // Build date filter
        const dateFilter = {};
        if (startDate) {
            dateFilter.gte = new Date(startDate);
        }
        if (endDate) {
            dateFilter.lte = new Date(endDate);
        }
        // If no date range specified, show next 30 days
        if (!startDate && !endDate) {
            const today = new Date();
            const next30Days = new Date();
            next30Days.setDate(today.getDate() + 30);
            dateFilter.gte = today;
            dateFilter.lte = next30Days;
        }
        const whereClause = {
            consultantId,
            isBooked: false,
            isBlocked: false,
            ...(Object.keys(dateFilter).length > 0 && { date: dateFilter }),
            ...(sessionType && typeof sessionType === 'string' && { sessionType: sessionType })
        };
        const availableSlots = await prisma.availabilitySlot.findMany({
            where: whereClause,
            orderBy: [
                { date: 'asc' },
                { startTime: 'asc' }
            ],
            select: {
                id: true,
                sessionType: true,
                date: true,
                startTime: true,
                endTime: true
            }
        });
        // Group slots by date
        const slotsByDate = availableSlots.reduce((acc, slot) => {
            const dateKey = slot.date.toISOString().split('T')[0];
            if (!acc[dateKey]) {
                acc[dateKey] = [];
            }
            acc[dateKey].push(slot);
            return acc;
        }, {});
        res.json({
            message: 'Available slots retrieved successfully',
            data: {
                slots: availableSlots,
                slotsByDate,
                totalSlots: availableSlots.length
            }
        });
    }
    catch (error) {
        if (error instanceof errorHandler_1.NotFoundError)
            throw error;
        console.error('Error fetching available slots:', error);
        throw new errorHandler_1.AppError('Failed to fetch available slots');
    }
});
exports.default = router;
//# sourceMappingURL=availability.js.map