"use strict";
/**
 * File Path: apps/api/src/routes/consultant.ts
 *
 * Consultant Profile Management Routes
 *
 * Handles all consultant profile-related operations:
 * - Profile information management
 * - Availability slot management
 * - Public consultant page data
 * - Settings and preferences
 * - Business information updates
 * - Profile photo management
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const database_1 = require("../../config/database");
const redis_1 = require("../../config/redis");
const auth_1 = require("../../middleware/auth");
const validation_1 = require("../../middleware/validation");
const errorHandler_1 = require("../../middleware/errorHandler");
const uploadService_1 = require("../../services/uploadService");
const router = (0, express_1.Router)();
/**
 * Validation schemas
 */
// Helper function to handle optional string fields
const optionalStringField = (maxLength) => {
    let base = zod_1.z.string();
    if (maxLength) {
        base = base.max(maxLength);
    }
    return zod_1.z.union([base, zod_1.z.literal(''), zod_1.z.null()]).optional().transform(val => {
        if (val === '' || val === null || val === undefined)
            return undefined;
        return val;
    });
};
// Helper function to handle optional URL fields
const optionalUrlField = () => {
    return zod_1.z.union([zod_1.z.string().url(), zod_1.z.literal(''), zod_1.z.null()]).optional().transform(val => {
        if (val === '' || val === null || val === undefined)
            return undefined;
        return val;
    });
};
const updateProfileSchema = zod_1.z.object({
    firstName: zod_1.z.string().min(1, 'First name is required').max(100).optional(),
    lastName: zod_1.z.string().min(1, 'Last name is required').max(100).optional(),
    phoneCountryCode: zod_1.z.string().regex(/^\+\d{1,4}$/, 'Invalid country code').optional(),
    phoneNumber: zod_1.z.union([
        zod_1.z.string().regex(/^\d{6,15}$/, 'Invalid phone number'),
        zod_1.z.literal(''),
        zod_1.z.null()
    ]).optional().transform(val => {
        if (val === '' || val === null || val === undefined)
            return undefined;
        return val;
    }),
    consultancySector: optionalStringField(100),
    bankName: optionalStringField(100),
    accountNumber: optionalStringField(50),
    ifscCode: optionalStringField(20),
    personalSessionTitle: optionalStringField(200),
    personalSessionDescription: optionalStringField(2000),
    webinarSessionTitle: optionalStringField(200),
    webinarSessionDescription: optionalStringField(2000),
    description: optionalStringField(2000),
    experienceMonths: zod_1.z.union([
        zod_1.z.number().min(0).max(600),
        zod_1.z.string().transform(val => parseInt(val, 10)).pipe(zod_1.z.number().min(0).max(600)),
        zod_1.z.null()
    ]).optional(), // Max 50 years
    personalSessionPrice: zod_1.z.union([
        zod_1.z.number().gte(0, 'Personal session price cannot be negative').max(999999.99),
        zod_1.z.string().transform(val => parseFloat(val)).pipe(zod_1.z.number().gte(0, 'Personal session price cannot be negative').max(999999.99)),
        zod_1.z.null()
    ]).optional(),
    webinarSessionPrice: zod_1.z.union([
        zod_1.z.number().gte(0, 'Webinar session price cannot be negative').max(999999.99),
        zod_1.z.string().transform(val => parseFloat(val)).pipe(zod_1.z.number().gte(0, 'Webinar session price cannot be negative').max(999999.99)),
        zod_1.z.null()
    ]).optional(),
    instagramUrl: optionalUrlField(),
    linkedinUrl: optionalUrlField(),
    xUrl: optionalUrlField(),
    slug: zod_1.z.string()
        .min(3, 'Slug must be at least 3 characters')
        .max(100, 'Slug must not exceed 100 characters')
        .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens')
        .optional()
}); // Removed strict mode for debugging
const createAvailabilitySchema = zod_1.z.object({
    sessionType: zod_1.z.enum(['PERSONAL', 'WEBINAR']),
    dates: zod_1.z.array(zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format')).min(1, 'At least one date required'),
    timeSlots: zod_1.z.array(zod_1.z.object({
        startTime: zod_1.z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
        endTime: zod_1.z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format')
    })).min(1, 'At least one time slot required')
}).refine(data => data.timeSlots.every(slot => slot.startTime < slot.endTime), {
    message: 'Start time must be before end time',
    path: ['timeSlots']
});
const updateAvailabilitySchema = zod_1.z.object({
    availabilitySlotIds: zod_1.z.array(validation_1.commonSchemas.id).min(1, 'At least one slot ID required'),
    isBooked: zod_1.z.boolean().optional()
});
/**
 * GET /api/consultant/profile
 * Get consultant's own profile information
 */
router.get('/profile', auth_1.authenticateConsultantBasic, async (req, res) => {
    try {
        const consultantId = req.user.id;
        // Check cache first
        const cacheKey = `consultant_profile:${consultantId}`;
        const cachedProfile = await redis_1.cacheUtils.get(cacheKey);
        if (cachedProfile) {
            res.json({
                data: cachedProfile,
                fromCache: true
            });
            return;
        }
        const prisma = (0, database_1.getPrismaClient)();
        const consultant = await prisma.consultant.findUnique({
            where: { id: consultantId },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                phoneCountryCode: true,
                phoneNumber: true,
                consultancySector: true,
                bankName: true,
                accountNumber: true,
                ifscCode: true,
                personalSessionTitle: true,
                personalSessionDescription: true,
                webinarSessionTitle: true,
                webinarSessionDescription: true,
                description: true,
                experienceMonths: true,
                personalSessionPrice: true,
                webinarSessionPrice: true,
                instagramUrl: true,
                linkedinUrl: true,
                xUrl: true,
                profilePhotoUrl: true,
                slug: true,
                isActive: true,
                isEmailVerified: true,
                subscriptionPlan: true,
                subscriptionExpiresAt: true,
                createdAt: true,
                updatedAt: true,
            }
        });
        if (!consultant) {
            throw new errorHandler_1.NotFoundError('Consultant profile');
        }
        // Format the response
        const profile = {
            ...consultant,
            personalSessionPrice: consultant.personalSessionPrice ? Number(consultant.personalSessionPrice) : null,
            webinarSessionPrice: consultant.webinarSessionPrice ? Number(consultant.webinarSessionPrice) : null,
            stats: {
                totalSessions: 0, // Will be calculated separately if needed
                totalClients: 0,
                totalQuotations: 0
            },
            isProfileComplete: !!(consultant.firstName &&
                consultant.lastName &&
                consultant.phoneNumber &&
                consultant.personalSessionTitle &&
                consultant.personalSessionPrice &&
                consultant.description)
        };
        // Cache for 5 minutes
        await redis_1.cacheUtils.set(cacheKey, profile, 300);
        res.json({
            data: { consultant: profile },
            fromCache: false
        });
    }
    catch (error) {
        if (error instanceof errorHandler_1.NotFoundError) {
            throw error;
        }
        console.error('❌ Get consultant profile error:', error);
        throw new errorHandler_1.AppError('Failed to fetch consultant profile', 500, 'PROFILE_FETCH_ERROR');
    }
});
/**
 * PUT /api/consultant/profile
 * Update consultant profile information
 */
router.put('/profile', auth_1.authenticateConsultantBasic, 
// Temporarily disable validation middleware for debugging
// validateRequest(updateProfileSchema),
async (req, res) => {
    try {
        const consultantId = req.user.id;
        const updates = req.body;
        console.log('🔍 API: Received profile update request:', {
            consultantId,
            updates,
            requestBody: req.body
        });
        // TEMPORARY: Skip validation for debugging
        console.log('⚠️ API: BYPASSING VALIDATION FOR DEBUGGING');
        const validatedUpdates = updates;
        const prisma = (0, database_1.getPrismaClient)();
        // Check if slug is being updated and if it's unique
        if (validatedUpdates.slug) {
            const existingSlug = await prisma.consultant.findFirst({
                where: {
                    slug: validatedUpdates.slug,
                    id: { not: consultantId }
                }
            });
            if (existingSlug) {
                throw new errorHandler_1.ConflictError('This slug is already taken. Please choose a different one.');
            }
        }
        // Clean the validated updates - remove undefined values
        const cleanedUpdates = Object.fromEntries(Object.entries(validatedUpdates).filter(([_, value]) => value !== undefined));
        console.log('🔍 API: Final data for database update:', cleanedUpdates);
        // Update consultant profile
        const updatedConsultant = await prisma.consultant.update({
            where: { id: consultantId },
            data: {
                ...cleanedUpdates,
                updatedAt: new Date()
            },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                phoneCountryCode: true,
                phoneNumber: true,
                consultancySector: true,
                bankName: true,
                accountNumber: true,
                ifscCode: true,
                personalSessionTitle: true,
                personalSessionDescription: true,
                webinarSessionTitle: true,
                webinarSessionDescription: true,
                description: true,
                experienceMonths: true,
                personalSessionPrice: true,
                webinarSessionPrice: true,
                instagramUrl: true,
                linkedinUrl: true,
                xUrl: true,
                profilePhotoUrl: true,
                slug: true,
                isActive: true,
                isEmailVerified: true,
                subscriptionPlan: true,
                subscriptionExpiresAt: true,
                createdAt: true,
                updatedAt: true
            }
        });
        // Clear related caches
        await redis_1.cacheUtils.clearPattern(`consultant_profile:${consultantId}`);
        await redis_1.cacheUtils.clearPattern(`public_consultant:${updates.slug || '*'}`);
        console.log(`✅ Consultant profile updated: ${consultantId}`);
        res.json({
            message: 'Profile updated successfully',
            data: {
                consultant: {
                    ...updatedConsultant,
                    personalSessionPrice: updatedConsultant.personalSessionPrice ? Number(updatedConsultant.personalSessionPrice) : null,
                    webinarSessionPrice: updatedConsultant.webinarSessionPrice ? Number(updatedConsultant.webinarSessionPrice) : null,
                    stats: {
                        totalSessions: 0, // Will be calculated separately if needed
                        totalClients: 0,
                        totalQuotations: 0
                    },
                    isProfileComplete: !!(updatedConsultant.firstName &&
                        updatedConsultant.lastName &&
                        updatedConsultant.phoneNumber &&
                        updatedConsultant.personalSessionTitle &&
                        updatedConsultant.personalSessionPrice &&
                        updatedConsultant.description)
                }
            }
        });
    }
    catch (error) {
        if (error instanceof errorHandler_1.ConflictError) {
            throw error;
        }
        console.error('❌ Update consultant profile error:', error);
        throw new errorHandler_1.AppError('Failed to update consultant profile', 500, 'PROFILE_UPDATE_ERROR');
    }
});
/**
 * POST /api/consultant/upload-photo
 * Upload consultant profile photo
 */
router.post('/upload-photo', auth_1.authenticateConsultantBasic, async (req, res) => {
    try {
        const consultantId = req.user.id;
        const file = req.file;
        if (!file) {
            throw new errorHandler_1.ValidationError('No photo file provided');
        }
        // Validate file type and size
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.mimetype)) {
            throw new errorHandler_1.ValidationError('Invalid file type. Please upload a JPEG, PNG, or WebP image.');
        }
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            throw new errorHandler_1.ValidationError('File size too large. Please upload an image smaller than 5MB.');
        }
        // Upload to Cloudinary
        const uploadResult = await (0, uploadService_1.uploadToCloudinary)(file.buffer, {
            folder: 'consultant-profiles',
            public_id: `consultant-${consultantId}`,
            transformation: [
                { width: 400, height: 400, crop: 'fill' },
                { quality: 'auto' },
                { format: 'webp' }
            ]
        });
        const prisma = (0, database_1.getPrismaClient)();
        // Update consultant profile with new photo URL
        const updatedConsultant = await prisma.consultant.update({
            where: { id: consultantId },
            data: {
                profilePhotoUrl: uploadResult.secure_url,
                updatedAt: new Date()
            },
            select: {
                id: true,
                profilePhotoUrl: true
            }
        });
        // Clear related caches
        await redis_1.cacheUtils.clearPattern(`consultant_profile:${consultantId}`);
        console.log(`✅ Profile photo updated for consultant: ${consultantId}`);
        res.json({
            message: 'Profile photo updated successfully',
            data: {
                profilePhotoUrl: updatedConsultant.profilePhotoUrl
            }
        });
    }
    catch (error) {
        if (error instanceof errorHandler_1.ValidationError) {
            throw error;
        }
        console.error('❌ Upload profile photo error:', error);
        throw new errorHandler_1.AppError('Failed to upload profile photo', 500, 'PHOTO_UPLOAD_ERROR');
    }
});
/**
 * GET /api/consultant/test-route
 * Simple test route
 */
router.get('/test-route', (req, res) => {
    res.json({ message: 'Test route works!', slug: req.params.slug });
});
/**
 * GET /api/consultant/:slug
 * Get public consultant profile by slug (for client booking page)
 */
router.get('/:slug', 
// optionalAuth, // TEMPORARILY DISABLED FOR DEBUGGING
async (req, res) => {
    try {
        const { slug } = req.params;
        // Check cache first
        const cacheKey = `public_consultant:${slug}`;
        const cachedProfile = await redis_1.cacheUtils.get(cacheKey);
        if (cachedProfile) {
            res.json({
                data: cachedProfile,
                fromCache: true
            });
            return;
        }
        const prisma = (0, database_1.getPrismaClient)();
        const consultant = await prisma.consultant.findFirst({
            where: {
                slug,
                isActive: true,
                isEmailVerified: true
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                consultancySector: true,
                personalSessionTitle: true,
                personalSessionDescription: true,
                webinarSessionTitle: true,
                webinarSessionDescription: true,
                description: true,
                experienceMonths: true,
                personalSessionPrice: true,
                webinarSessionPrice: true,
                instagramUrl: true,
                linkedinUrl: true,
                xUrl: true,
                profilePhotoUrl: true,
                slug: true,
                createdAt: true
            }
        });
        if (!consultant) {
            throw new errorHandler_1.NotFoundError('Consultant not found');
        }
        // Get available slots for the next 30 days
        const nextMonth = new Date();
        nextMonth.setDate(nextMonth.getDate() + 30);
        const availableSlots = await prisma.availabilitySlot.findMany({
            where: {
                consultantId: consultant.id,
                date: {
                    gte: new Date(),
                    lte: nextMonth
                },
                isBooked: false
            },
            select: {
                id: true,
                sessionType: true,
                date: true,
                startTime: true,
                endTime: true
            },
            orderBy: [
                { date: 'asc' },
                { startTime: 'asc' }
            ]
        });
        // Get some stats (without sensitive information)
        const stats = await prisma.session.aggregate({
            where: {
                consultantId: consultant.id,
                status: 'COMPLETED'
            },
            _count: { id: true }
        });
        const publicProfile = {
            consultant: {
                ...consultant,
                personalSessionPrice: consultant.personalSessionPrice ? Number(consultant.personalSessionPrice) : null,
                webinarSessionPrice: consultant.webinarSessionPrice ? Number(consultant.webinarSessionPrice) : null,
                experienceYears: consultant.experienceMonths ? Math.floor(consultant.experienceMonths / 12) : 0,
                stats: {
                    completedSessions: stats._count.id
                }
            },
            availableSlots: availableSlots.map((slot) => ({
                id: slot.id,
                sessionType: slot.sessionType,
                date: slot.date.toISOString().split('T')[0],
                startTime: slot.startTime,
                endTime: slot.endTime
            }))
        };
        // Cache for 10 minutes
        await redis_1.cacheUtils.set(cacheKey, publicProfile, 600);
        res.json({
            data: publicProfile,
            fromCache: false
        });
    }
    catch (error) {
        if (error instanceof errorHandler_1.NotFoundError) {
            throw error;
        }
        console.error('❌ Get public consultant profile error:', error);
        throw new errorHandler_1.AppError('Failed to fetch consultant profile', 500, 'PUBLIC_PROFILE_FETCH_ERROR');
    }
});
/**
 * GET /api/consultant/availability
 * Get consultant's availability slots
 */
router.get('/availability', (0, validation_1.validateRequest)(zod_1.z.object({
    startDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    endDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    sessionType: zod_1.z.enum(['PERSONAL', 'WEBINAR']).optional()
}), 'query'), async (req, res) => {
    try {
        const consultantId = req.user.id;
        const { startDate, endDate, sessionType } = req.query;
        // Default date range (next 30 days)
        const defaultStart = new Date();
        const defaultEnd = new Date();
        defaultEnd.setDate(defaultEnd.getDate() + 30);
        const dateRange = {
            start: startDate ? new Date(startDate) : defaultStart,
            end: endDate ? new Date(endDate) : defaultEnd
        };
        const prisma = (0, database_1.getPrismaClient)();
        const where = {
            consultantId,
            date: {
                gte: dateRange.start,
                lte: dateRange.end
            },
            ...(sessionType && { sessionType })
        };
        const availabilitySlots = await prisma.availabilitySlot.findMany({
            where,
            orderBy: [
                { date: 'asc' },
                { startTime: 'asc' }
            ]
        });
        // Group slots by date
        const slotsByDate = availabilitySlots.reduce((acc, slot) => {
            const dateKey = slot.date.toISOString().split('T')[0];
            if (!acc[dateKey]) {
                acc[dateKey] = [];
            }
            acc[dateKey].push({
                id: slot.id,
                sessionType: slot.sessionType,
                startTime: slot.startTime,
                endTime: slot.endTime,
                isBooked: slot.isBooked,
                session: null // Session info not available through availability slots
            });
            return acc;
        }, {});
        res.json({
            data: {
                availability: slotsByDate,
                dateRange: {
                    start: dateRange.start.toISOString().split('T')[0],
                    end: dateRange.end.toISOString().split('T')[0]
                },
                summary: {
                    totalSlots: availabilitySlots.length,
                    bookedSlots: availabilitySlots.filter((s) => s.isBooked).length,
                    availableSlots: availabilitySlots.filter((s) => !s.isBooked).length
                }
            }
        });
    }
    catch (error) {
        console.error('❌ Get availability error:', error);
        throw new errorHandler_1.AppError('Failed to fetch availability', 500, 'AVAILABILITY_FETCH_ERROR');
    }
});
/**
 * POST /api/consultant/availability
 * Create new availability slots
 */
router.post('/availability', (0, validation_1.validateRequest)(createAvailabilitySchema), async (req, res) => {
    try {
        const consultantId = req.user.id;
        const { sessionType, dates, timeSlots } = req.body;
        const prisma = (0, database_1.getPrismaClient)();
        const slotsToCreate = [];
        // Generate all combinations of dates and time slots
        for (const dateStr of dates) {
            const date = new Date(dateStr);
            // Skip past dates
            if (date < new Date()) {
                continue;
            }
            for (const timeSlot of timeSlots) {
                // Check if slot already exists
                const existingSlot = await prisma.availabilitySlot.findFirst({
                    where: {
                        consultantId,
                        sessionType,
                        date,
                        startTime: timeSlot.startTime
                    }
                });
                if (!existingSlot) {
                    slotsToCreate.push({
                        consultantId,
                        sessionType,
                        date,
                        startTime: timeSlot.startTime,
                        endTime: timeSlot.endTime,
                        isBooked: false
                    });
                }
            }
        }
        if (slotsToCreate.length === 0) {
            throw new errorHandler_1.ValidationError('No new availability slots to create. All specified slots already exist.');
        }
        // Create slots in batch
        const createdSlots = await prisma.availabilitySlot.createMany({
            data: slotsToCreate
        });
        // Clear related caches
        await redis_1.cacheUtils.clearPattern(`public_consultant:*`);
        console.log(`✅ Created ${createdSlots.count} availability slots for consultant: ${consultantId}`);
        res.status(201).json({
            message: `${createdSlots.count} availability slots created successfully`,
            data: {
                createdCount: createdSlots.count,
                sessionType,
                dateRange: {
                    start: Math.min(...dates.map((d) => new Date(d).getTime())),
                    end: Math.max(...dates.map((d) => new Date(d).getTime()))
                }
            }
        });
    }
    catch (error) {
        if (error instanceof errorHandler_1.ValidationError) {
            throw error;
        }
        console.error('❌ Create availability error:', error);
        throw new errorHandler_1.AppError('Failed to create availability slots', 500, 'AVAILABILITY_CREATE_ERROR');
    }
});
/**
 * PUT /api/consultant/availability
 * Update availability slots (mark as booked/unbooked)
 */
router.put('/availability', (0, validation_1.validateRequest)(updateAvailabilitySchema), async (req, res) => {
    try {
        const consultantId = req.user.id;
        const { availabilitySlotIds, isBooked } = req.body;
        const prisma = (0, database_1.getPrismaClient)();
        // Verify all slots belong to the consultant
        const slots = await prisma.availabilitySlot.findMany({
            where: {
                id: { in: availabilitySlotIds },
                consultantId
            }
        });
        if (slots.length !== availabilitySlotIds.length) {
            throw new errorHandler_1.ValidationError('Some availability slots not found or do not belong to you');
        }
        // Update slots
        const updateData = {};
        if (isBooked !== undefined) {
            updateData.isBooked = isBooked;
            // If marking as unbooked, remove session association
            if (!isBooked) {
                updateData.sessionId = null;
            }
        }
        const result = await prisma.availabilitySlot.updateMany({
            where: {
                id: { in: availabilitySlotIds },
                consultantId
            },
            data: updateData
        });
        // Clear related caches
        await redis_1.cacheUtils.clearPattern(`public_consultant:*`);
        console.log(`✅ Updated ${result.count} availability slots for consultant: ${consultantId}`);
        res.json({
            message: `${result.count} availability slots updated successfully`,
            data: {
                updatedCount: result.count,
                availabilitySlotIds
            }
        });
    }
    catch (error) {
        if (error instanceof errorHandler_1.ValidationError) {
            throw error;
        }
        console.error('❌ Update availability error:', error);
        throw new errorHandler_1.AppError('Failed to update availability slots', 500, 'AVAILABILITY_UPDATE_ERROR');
    }
});
/**
 * DELETE /api/consultant/availability/:id
 * Delete an availability slot
 */
router.delete('/availability/:id', (0, validation_1.validateRequest)(zod_1.z.object({ id: validation_1.commonSchemas.id }), 'params'), async (req, res) => {
    try {
        const { id } = req.params;
        const consultantId = req.user.id;
        const prisma = (0, database_1.getPrismaClient)();
        // Check if slot exists and belongs to consultant
        const slot = await prisma.availabilitySlot.findFirst({
            where: {
                id,
                consultantId
            }
        });
        if (!slot) {
            throw new errorHandler_1.NotFoundError('Availability slot');
        }
        // Check if slot is booked
        if (slot.isBooked) {
            throw new errorHandler_1.ValidationError('Cannot delete a booked availability slot');
        }
        // Delete slot
        await prisma.availabilitySlot.delete({
            where: { id }
        });
        // Clear related caches
        await redis_1.cacheUtils.clearPattern(`public_consultant:*`);
        console.log(`✅ Availability slot deleted: ${id}`);
        res.json({
            message: 'Availability slot deleted successfully'
        });
    }
    catch (error) {
        if (error instanceof errorHandler_1.NotFoundError || error instanceof errorHandler_1.ValidationError) {
            throw error;
        }
        console.error('❌ Delete availability slot error:', error);
        throw new errorHandler_1.AppError('Failed to delete availability slot', 500, 'AVAILABILITY_DELETE_ERROR');
    }
});
/**
 * GET /api/consultant/slug-check/:slug
 * Check if slug is available
 */
router.get('/slug-check/:slug', auth_1.authenticateConsultantBasic, (0, validation_1.validateRequest)(zod_1.z.object({
    slug: zod_1.z.string()
        .min(3, 'Slug must be at least 3 characters')
        .max(100, 'Slug must not exceed 100 characters')
        .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens')
}), 'params'), async (req, res) => {
    try {
        const { slug } = req.params;
        const consultantId = req.user.id;
        const prisma = (0, database_1.getPrismaClient)();
        const existingSlug = await prisma.consultant.findFirst({
            where: {
                slug,
                id: { not: consultantId }
            }
        });
        res.json({
            data: {
                available: !existingSlug,
                slug
            }
        });
    }
    catch (error) {
        console.error('❌ Slug check error:', error);
        throw new errorHandler_1.AppError('Failed to check slug availability', 500, 'SLUG_CHECK_ERROR');
    }
});
exports.default = router;
//# sourceMappingURL=consultant.js.map