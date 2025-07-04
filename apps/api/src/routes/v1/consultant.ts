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

import { Router, Response } from 'express';
import { z } from 'zod';
import { getPrismaClient } from '../../config/database';
import { cacheUtils } from '../../config/redis';
import { AuthenticatedRequest, optionalAuth, authenticateConsultantBasic, authenticateConsultant } from '../../middleware/auth';
import { validateRequest, commonSchemas, validationUtils } from '../../middleware/validation';
import { AppError, NotFoundError, ValidationError, ConflictError } from '../../middleware/errorHandler';
import { uploadToCloudinary } from '../../services/uploadService';
import { generateSlug } from '../../utils/helpers';


const router = Router();

/**
 * Validation schemas
 */
// Helper function to handle optional string fields
const optionalStringField = (maxLength?: number) => {
  let base = z.string();
  if (maxLength) {
    base = base.max(maxLength);
  }
  return z.union([base, z.literal(''), z.null()]).optional().transform(val => {
    if (val === '' || val === null || val === undefined) return undefined;
    return val;
  });
};

// Helper function to handle optional URL fields
const optionalUrlField = () => {
  return z.union([z.string().url(), z.literal(''), z.null()]).optional().transform(val => {
    if (val === '' || val === null || val === undefined) return undefined;
    return val;
  });
};

const updateProfileSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100).optional(),
  lastName: z.string().min(1, 'Last name is required').max(100).optional(),
  phoneCountryCode: z.string().regex(/^\+\d{1,4}$/, 'Invalid country code').optional(),
  phoneNumber: z.union([
    z.string().regex(/^\d{6,15}$/, 'Invalid phone number'), 
    z.literal(''), 
    z.null()
  ]).optional().transform(val => {
    if (val === '' || val === null || val === undefined) return undefined;
    return val;
  }),
  consultancySector: optionalStringField(100),
  bankName: optionalStringField(100),
  accountNumber: optionalStringField(50),
  ifscCode: optionalStringField(20),
  personalSessionTitle: optionalStringField(200),
  webinarSessionTitle: optionalStringField(200),
  description: optionalStringField(2000),
  experienceMonths: z.union([
    z.number().min(0).max(600),
    z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(0).max(600)),
    z.null()
  ]).optional(), // Max 50 years
  personalSessionPrice: z.union([
    z.number().positive().max(999999.99),
    z.string().transform(val => parseFloat(val)).pipe(z.number().positive().max(999999.99)),
    z.null()
  ]).optional(),
  webinarSessionPrice: z.union([
    z.number().positive().max(999999.99),
    z.string().transform(val => parseFloat(val)).pipe(z.number().positive().max(999999.99)),
    z.null()
  ]).optional(),
  instagramUrl: optionalUrlField(),
  linkedinUrl: optionalUrlField(),
  xUrl: optionalUrlField(),
  slug: z.string()
    .min(3, 'Slug must be at least 3 characters')
    .max(100, 'Slug must not exceed 100 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens')
    .optional()
}); // Removed strict mode for debugging

const createAvailabilitySchema = z.object({
  sessionType: z.enum(['PERSONAL', 'WEBINAR']),
  dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format')).min(1, 'At least one date required'),
  timeSlots: z.array(z.object({
    startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
    endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format')
  })).min(1, 'At least one time slot required')
}).refine(
  data => data.timeSlots.every(slot => slot.startTime < slot.endTime),
  {
    message: 'Start time must be before end time',
    path: ['timeSlots']
  }
);

const updateAvailabilitySchema = z.object({
  availabilitySlotIds: z.array(commonSchemas.id).min(1, 'At least one slot ID required'),
  isBooked: z.boolean().optional()
});

/**
 * GET /api/consultant/profile
 * Get consultant's own profile information
 */
router.get('/profile', authenticateConsultantBasic, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const consultantId = req.user!.id;
    
    // Check cache first
    const cacheKey = `consultant_profile:${consultantId}`;
    const cachedProfile = await cacheUtils.get(cacheKey);
    
    if (cachedProfile) {
      res.json({
        data: cachedProfile,
        fromCache: true
      });
      return;
    }

    const prisma = getPrismaClient();

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
        webinarSessionTitle: true,
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
      throw new NotFoundError('Consultant profile');
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
      isProfileComplete: !!(
        consultant.firstName &&
        consultant.lastName &&
        consultant.phoneNumber &&
        consultant.personalSessionTitle &&
        consultant.personalSessionPrice &&
        consultant.description
      )
    };

    // Cache for 5 minutes
    await cacheUtils.set(cacheKey, profile, 300);

    res.json({
      data: { consultant: profile },
      fromCache: false
    });

  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    console.error('❌ Get consultant profile error:', error);
    throw new AppError('Failed to fetch consultant profile', 500, 'PROFILE_FETCH_ERROR');
  }
});

/**
 * PUT /api/consultant/profile
 * Update consultant profile information
 */
router.put('/profile',
  authenticateConsultantBasic,
  // Temporarily disable validation middleware for debugging
  // validateRequest(updateProfileSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const consultantId = req.user!.id;
      const updates = req.body;

      console.log('🔍 API: Received profile update request:', {
        consultantId,
        updates,
        requestBody: req.body
      });

      // TEMPORARY: Skip validation for debugging
      console.log('⚠️ API: BYPASSING VALIDATION FOR DEBUGGING');
      const validatedUpdates = updates;

      const prisma = getPrismaClient();

      // Check if slug is being updated and if it's unique
      if (validatedUpdates.slug) {
        const existingSlug = await prisma.consultant.findFirst({
          where: {
            slug: validatedUpdates.slug,
            id: { not: consultantId }
          }
        });

        if (existingSlug) {
          throw new ConflictError('This slug is already taken. Please choose a different one.');
        }
      }

      // Clean the validated updates - remove undefined values
      const cleanedUpdates = Object.fromEntries(
        Object.entries(validatedUpdates).filter(([_, value]) => value !== undefined)
      );

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
          webinarSessionTitle: true,
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
      await cacheUtils.clearPattern(`consultant_profile:${consultantId}`);
      await cacheUtils.clearPattern(`public_consultant:${updates.slug || '*'}`);

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
            isProfileComplete: !!(
              updatedConsultant.firstName &&
              updatedConsultant.lastName &&
              updatedConsultant.phoneNumber &&
              updatedConsultant.personalSessionTitle &&
              updatedConsultant.personalSessionPrice &&
              updatedConsultant.description
            )
          }
        }
      });

    } catch (error) {
      if (error instanceof ConflictError) {
        throw error;
      }
      console.error('❌ Update consultant profile error:', error);
      throw new AppError('Failed to update consultant profile', 500, 'PROFILE_UPDATE_ERROR');
    }
  }
);

/**
 * POST /api/consultant/upload-photo
 * Upload consultant profile photo
 */
router.post('/upload-photo', authenticateConsultantBasic, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const consultantId = req.user!.id;
    const file = req.file;

    if (!file) {
      throw new ValidationError('No photo file provided');
    
    }

    // Validate file type and size
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new ValidationError('Invalid file type. Please upload a JPEG, PNG, or WebP image.');
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new ValidationError('File size too large. Please upload an image smaller than 5MB.');
    }

    // Upload to Cloudinary
    const uploadResult = await uploadToCloudinary(file.buffer, {
      folder: 'consultant-profiles',
      public_id: `consultant-${consultantId}`,
      transformation: [
        { width: 400, height: 400, crop: 'fill' },
        { quality: 'auto' },
        { format: 'webp' }
      ]
    });

    const prisma = getPrismaClient();

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
    await cacheUtils.clearPattern(`consultant_profile:${consultantId}`);

    console.log(`✅ Profile photo updated for consultant: ${consultantId}`);

    res.json({
      message: 'Profile photo updated successfully',
      data: {
        profilePhotoUrl: updatedConsultant.profilePhotoUrl
      }
    });

  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    console.error('❌ Upload profile photo error:', error);
    throw new AppError('Failed to upload profile photo', 500, 'PHOTO_UPLOAD_ERROR');
  }
});

/**
 * GET /api/consultant/:slug
 * Get public consultant profile by slug (for client booking page)
 */
router.get('/:slug',
  optionalAuth, // Allow both authenticated and unauthenticated access
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { slug } = req.params;

      // Check cache first
      const cacheKey = `public_consultant:${slug}`;
      const cachedProfile = await cacheUtils.get(cacheKey);
      
      if (cachedProfile) {
        res.json({
          data: cachedProfile,
          fromCache: true
        });
        return;
      }

      const prisma = getPrismaClient();

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
          webinarSessionTitle: true,
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
        throw new NotFoundError('Consultant not found');
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
        availableSlots: availableSlots.map((slot:any) => ({
          id: slot.id,
          sessionType: slot.sessionType,
          date: slot.date.toISOString().split('T')[0],
          startTime: slot.startTime,
          endTime: slot.endTime
        }))
      };

      // Cache for 10 minutes
      await cacheUtils.set(cacheKey, publicProfile, 600);

      res.json({
        data: publicProfile,
        fromCache: false
      });

    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      console.error('❌ Get public consultant profile error:', error);
      throw new AppError('Failed to fetch consultant profile', 500, 'PUBLIC_PROFILE_FETCH_ERROR');
    }
  }
);

/**
 * GET /api/consultant/availability
 * Get consultant's availability slots
 */
router.get('/availability',
  validateRequest(z.object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    sessionType: z.enum(['PERSONAL', 'WEBINAR']).optional()
  }), 'query'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const consultantId = req.user!.id;
      const { startDate, endDate, sessionType } = req.query as any;

      // Default date range (next 30 days)
      const defaultStart = new Date();
      const defaultEnd = new Date();
      defaultEnd.setDate(defaultEnd.getDate() + 30);

      const dateRange = {
        start: startDate ? new Date(startDate) : defaultStart,
        end: endDate ? new Date(endDate) : defaultEnd
      };

      const prisma = getPrismaClient();

      const where: any = {
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
      const slotsByDate = availabilitySlots.reduce((acc:any, slot:any) => {
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
      }, {} as Record<string, any[]>);

      res.json({
        data: {
          availability: slotsByDate,
          dateRange: {
            start: dateRange.start.toISOString().split('T')[0],
            end: dateRange.end.toISOString().split('T')[0]
          },
          summary: {
            totalSlots: availabilitySlots.length,
            bookedSlots: availabilitySlots.filter((s:any) => s.isBooked).length,
            availableSlots: availabilitySlots.filter((s:any) => !s.isBooked).length
          }
        }
      });

    } catch (error) {
      console.error('❌ Get availability error:', error);
      throw new AppError('Failed to fetch availability', 500, 'AVAILABILITY_FETCH_ERROR');
    }
  }
);

/**
 * POST /api/consultant/availability
 * Create new availability slots
 */
router.post('/availability',
  validateRequest(createAvailabilitySchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const consultantId = req.user!.id;
      const { sessionType, dates, timeSlots } = req.body;

      const prisma = getPrismaClient();

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
        throw new ValidationError('No new availability slots to create. All specified slots already exist.');
      }

      // Create slots in batch
      const createdSlots = await prisma.availabilitySlot.createMany({
        data: slotsToCreate
      });

      // Clear related caches
      await cacheUtils.clearPattern(`public_consultant:*`);

      console.log(`✅ Created ${createdSlots.count} availability slots for consultant: ${consultantId}`);

      res.status(201).json({
        message: `${createdSlots.count} availability slots created successfully`,
        data: {
          createdCount: createdSlots.count,
          sessionType,
          dateRange: {
            start: Math.min(...dates.map((d:any) => new Date(d).getTime())),
            end: Math.max(...dates.map((d:any) => new Date(d).getTime()))
          }
        }
      });

    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      console.error('❌ Create availability error:', error);
      throw new AppError('Failed to create availability slots', 500, 'AVAILABILITY_CREATE_ERROR');
    }
  }
);

/**
 * PUT /api/consultant/availability
 * Update availability slots (mark as booked/unbooked)
 */
router.put('/availability',
  validateRequest(updateAvailabilitySchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const consultantId = req.user!.id;
      const { availabilitySlotIds, isBooked } = req.body;

      const prisma = getPrismaClient();

      // Verify all slots belong to the consultant
      const slots = await prisma.availabilitySlot.findMany({
        where: {
          id: { in: availabilitySlotIds },
          consultantId
        }
      });

      if (slots.length !== availabilitySlotIds.length) {
        throw new ValidationError('Some availability slots not found or do not belong to you');
      }

      // Update slots
      const updateData: any = {};
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
      await cacheUtils.clearPattern(`public_consultant:*`);

      console.log(`✅ Updated ${result.count} availability slots for consultant: ${consultantId}`);

      res.json({
        message: `${result.count} availability slots updated successfully`,
        data: {
          updatedCount: result.count,
          availabilitySlotIds
        }
      });

    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      console.error('❌ Update availability error:', error);
      throw new AppError('Failed to update availability slots', 500, 'AVAILABILITY_UPDATE_ERROR');
    }
  }
);

/**
 * DELETE /api/consultant/availability/:id
 * Delete an availability slot
 */
router.delete('/availability/:id',
  validateRequest(z.object({ id: commonSchemas.id }), 'params'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const consultantId = req.user!.id;

      const prisma = getPrismaClient();

      // Check if slot exists and belongs to consultant
      const slot = await prisma.availabilitySlot.findFirst({
        where: {
          id,
          consultantId
        }
      });

      if (!slot) {
        throw new NotFoundError('Availability slot');
      }

      // Check if slot is booked
      if (slot.isBooked) {
        throw new ValidationError('Cannot delete a booked availability slot');
      }

      // Delete slot
      await prisma.availabilitySlot.delete({
        where: { id }
      });

      // Clear related caches
      await cacheUtils.clearPattern(`public_consultant:*`);

      console.log(`✅ Availability slot deleted: ${id}`);

      res.json({
        message: 'Availability slot deleted successfully'
      });

    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      console.error('❌ Delete availability slot error:', error);
      throw new AppError('Failed to delete availability slot', 500, 'AVAILABILITY_DELETE_ERROR');
    }
  }
);

/**
 * GET /api/consultant/slug-check/:slug
 * Check if slug is available
 */
router.get('/slug-check/:slug',
  authenticateConsultantBasic,
  validateRequest(z.object({
    slug: z.string()
      .min(3, 'Slug must be at least 3 characters')
      .max(100, 'Slug must not exceed 100 characters')
      .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens')
  }), 'params'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { slug } = req.params;
      const consultantId = req.user!.id;

      const prisma = getPrismaClient();

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

    } catch (error) {
      console.error('❌ Slug check error:', error);
      throw new AppError('Failed to check slug availability', 500, 'SLUG_CHECK_ERROR');
    }
  }
);

export default router;