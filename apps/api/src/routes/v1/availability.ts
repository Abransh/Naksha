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

import { Router, Response } from 'express';
import { z } from 'zod';
import { getPrismaClient } from '../../config/database';
import { cacheUtils } from '../../config/redis';
import { AuthenticatedRequest, authenticateConsultant } from '../../middleware/auth';
import { validateRequest } from '../../middleware/validation';
import { AppError, NotFoundError, ValidationError } from '../../middleware/errorHandler';

const router = Router();

/**
 * Validation schemas
 */
const weeklyPatternSchema = z.object({
  sessionType: z.enum(['PERSONAL', 'WEBINAR']),
  dayOfWeek: z.number().min(0).max(6), // 0 = Sunday, 6 = Saturday
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  isActive: z.boolean().default(true),
  timezone: z.string().default('Asia/Kolkata')
});

const updatePatternSchema = weeklyPatternSchema.partial();

const bulkPatternsSchema = z.object({
  patterns: z.array(weeklyPatternSchema)
});

const generateSlotsSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  sessionType: z.enum(['PERSONAL', 'WEBINAR']).optional()
});

/**
 * Helper functions
 */
const validateTimeRange = (startTime: string, endTime: string): void => {
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  
  const startTotalMin = startHour * 60 + startMin;
  const endTotalMin = endHour * 60 + endMin;
  
  if (endTotalMin <= startTotalMin) {
    throw new ValidationError('End time must be after start time');
  }
};

const generateDateRange = (startDate: string, endDate: string): Date[] => {
  const dates: Date[] = [];
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
 * OPTIMIZED: With caching and efficient queries
 */
router.get('/patterns', authenticateConsultant, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const prisma = getPrismaClient();
    const consultantId = req.user!.id;

    // Check cache first (patterns don't change frequently)
    const cacheKey = `patterns:${consultantId}`;
    const cached = await cacheUtils.get(cacheKey);
    if (cached) {
      console.log('🎯 Returning cached availability patterns');
      res.json(cached);
      return;
    }

    const patterns = await prisma.weeklyAvailabilityPattern.findMany({
      where: { consultantId },
      select: {
        id: true,
        sessionType: true,
        dayOfWeek: true,
        startTime: true,
        endTime: true,
        isActive: true,
        timezone: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: [
        { sessionType: 'asc' },
        { dayOfWeek: 'asc' },
        { startTime: 'asc' }
      ]
    });

    const responseData = {
      message: 'Weekly availability patterns retrieved successfully',
      data: { 
        patterns,
        totalPatterns: patterns.length,
        activePatterns: patterns.filter(p => p.isActive).length
      }
    };

    // Cache for 2 minutes (patterns change infrequently)
    await cacheUtils.set(cacheKey, responseData, 120);

    res.json(responseData);
  } catch (error) {
    console.error('Error fetching weekly patterns:', error);
    throw new AppError('Failed to fetch availability patterns');
  }
});

/**
 * POST /availability/patterns
 * Create a new weekly availability pattern
 */
router.post('/patterns', 
  authenticateConsultant,
  validateRequest(weeklyPatternSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const prisma = getPrismaClient();
      const consultantId = req.user!.id;
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
        throw new ValidationError('Time slot overlaps with existing pattern');
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

      // Clear all related caches
      const cacheKeysToDelete = [
        `availability:${consultantId}`,
        `patterns:${consultantId}`,
        `slots:${consultantId}:*`
      ];
      
      await Promise.all(
        cacheKeysToDelete.map(key => cacheUtils.delete(key))
      );

      res.status(201).json({
        message: 'Weekly availability pattern created successfully',
        data: { pattern }
      });
    } catch (error) {
      if (error instanceof ValidationError) throw error;
      console.error('Error creating weekly pattern:', error);
      throw new AppError('Failed to create availability pattern');
    }
  }
);

/**
 * PUT /availability/patterns/:id
 * Update a weekly availability pattern
 */
router.put('/patterns/:id',
  authenticateConsultant,
  validateRequest(updatePatternSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const prisma = getPrismaClient();
      const consultantId = req.user!.id;
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
        throw new NotFoundError('Availability pattern not found');
      }

      const pattern = await prisma.weeklyAvailabilityPattern.update({
        where: { id: patternId },
        data: updateData
      });

      // Clear all related caches
      const cacheKeysToDelete = [
        `availability:${consultantId}`,
        `patterns:${consultantId}`,
        `slots:${consultantId}:*`
      ];
      
      await Promise.all(
        cacheKeysToDelete.map(key => cacheUtils.delete(key))
      );

      res.json({
        message: 'Weekly availability pattern updated successfully',
        data: { pattern }
      });
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError) throw error;
      console.error('Error updating weekly pattern:', error);
      throw new AppError('Failed to update availability pattern');
    }
  }
);

/**
 * DELETE /availability/patterns/:id
 * Delete a weekly availability pattern
 */
router.delete('/patterns/:id', authenticateConsultant, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = getPrismaClient();
    const consultantId = req.user!.id;
    const patternId = req.params.id;

    // Verify pattern ownership
    const existingPattern = await prisma.weeklyAvailabilityPattern.findFirst({
      where: { id: patternId, consultantId }
    });

    if (!existingPattern) {
      throw new NotFoundError('Availability pattern not found');
    }

    await prisma.weeklyAvailabilityPattern.delete({
      where: { id: patternId }
    });

    // Clear all related caches
    const cacheKeysToDelete = [
      `availability:${consultantId}`,
      `patterns:${consultantId}`,
      `slots:${consultantId}:*`
    ];
    
    await Promise.all(
      cacheKeysToDelete.map(key => cacheUtils.delete(key))
    );

    res.json({
      message: 'Weekly availability pattern deleted successfully'
    });
  } catch (error) {
    if (error instanceof NotFoundError) throw error;
    console.error('Error deleting weekly pattern:', error);
    throw new AppError('Failed to delete availability pattern');
  }
});

/**
 * POST /availability/patterns/bulk
 * Create or update multiple weekly availability patterns
 */
router.post('/patterns/bulk',
  authenticateConsultant,
  validateRequest(bulkPatternsSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const prisma = getPrismaClient();
      const consultantId = req.user!.id;
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
      const createdPatterns = await prisma.$transaction(
        patterns.map((pattern: {
          sessionType: 'PERSONAL' | 'WEBINAR';
          dayOfWeek: number;
          startTime: string;
          endTime: string;
          isActive: boolean;
          timezone: string;
        }) => 
          prisma.weeklyAvailabilityPattern.create({
            data: {
              consultantId,
              ...pattern
            }
          })
        )
      );

      // Clear all related caches
      const cacheKeysToDelete = [
        `availability:${consultantId}`,
        `patterns:${consultantId}`,
        `slots:${consultantId}:*` // Pattern prefix for all slots cache
      ];
      
      await Promise.all(
        cacheKeysToDelete.map(key => cacheUtils.delete(key))
      );

      console.log('✅ Bulk patterns updated:', {
        consultantId,
        patternsCreated: createdPatterns.length,
        patternsDeleted: 'all_existing'
      });

      res.json({
        message: 'Weekly availability patterns updated successfully',
        data: { 
          patterns: createdPatterns,
          totalCreated: createdPatterns.length,
          operation: 'bulk_replace'
        }
      });
    } catch (error) {
      if (error instanceof ValidationError) throw error;
      console.error('Error bulk updating patterns:', error);
      throw new AppError('Failed to update availability patterns');
    }
  }
);

/**
 * POST /availability/generate-slots
 * Generate availability slots from weekly patterns for a date range
 * OPTIMIZED: Batch processing, efficient queries, and better error handling
 */
router.post('/generate-slots',
  authenticateConsultant,
  validateRequest(generateSlotsSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const prisma = getPrismaClient();
      const consultantId = req.user!.id;
      const { startDate, endDate, sessionType } = req.body;

      console.log('🔧 Generating slots for consultant:', { consultantId, startDate, endDate, sessionType });

      // Validate date range (prevent generating too many slots at once)
      const start = new Date(startDate);
      const end = new Date(endDate);
      const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff > 90) {
        throw new ValidationError('Date range cannot exceed 90 days');
      }

      // Get weekly patterns with optimized query
      const patterns = await prisma.weeklyAvailabilityPattern.findMany({
        where: {
          consultantId,
          isActive: true,
          ...(sessionType && { sessionType })
        },
        select: {
          id: true,
          sessionType: true,
          dayOfWeek: true,
          startTime: true,
          endTime: true
        },
        orderBy: [
          { dayOfWeek: 'asc' },
          { startTime: 'asc' }
        ]
      });

      if (patterns.length === 0) {
        res.json({
          message: 'No active patterns found',
          data: { slotsCreated: 0, patternsFound: 0 }
        });
        return;
      }

      console.log('📅 Found patterns:', patterns.length);

      // Generate date range efficiently
      const dates = generateDateRange(startDate, endDate);
      console.log('📆 Date range generated:', { totalDays: dates.length, startDate, endDate });

      // Get existing slots in batch to avoid N+1 queries
      const existingSlots = await prisma.availabilitySlot.findMany({
        where: {
          consultantId,
          date: {
            gte: start,
            lte: end
          },
          ...(sessionType && { sessionType })
        },
        select: {
          date: true,
          startTime: true,
          sessionType: true
        }
      });

      // Create a Set for O(1) lookup of existing slots
      const existingSlotKeys = new Set(
        existingSlots.map(slot => 
          `${slot.date.toISOString().split('T')[0]}-${slot.startTime}-${slot.sessionType}`
        )
      );

      console.log('📋 Existing slots found:', existingSlots.length);

      const slotsToCreate: Array<{
        consultantId: string;
        sessionType: 'PERSONAL' | 'WEBINAR';
        date: Date;
        startTime: string;
        endTime: string;
        isBooked: boolean;
        isBlocked: boolean;
      }> = [];

      // Efficiently generate slots without individual database checks
      for (const date of dates) {
        const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
        const dateStr = date.toISOString().split('T')[0];
        
        const matchingPatterns = patterns.filter(p => p.dayOfWeek === dayOfWeek);
        
        for (const pattern of matchingPatterns) {
          const slotKey = `${dateStr}-${pattern.startTime}-${pattern.sessionType}`;
          
          // Check if slot already exists using our efficient lookup
          if (!existingSlotKeys.has(slotKey)) {
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

      console.log('🔄 Slots to create:', slotsToCreate.length);

      let createdSlots = [];
      if (slotsToCreate.length > 0) {
        // Create slots in optimized batches to avoid transaction limits
        const batchSize = 100;
        const batches = [];
        
        for (let i = 0; i < slotsToCreate.length; i += batchSize) {
          batches.push(slotsToCreate.slice(i, i + batchSize));
        }

        console.log('📦 Processing in batches:', batches.length);

        for (const batch of batches) {
          const batchResult = await prisma.$transaction(
            batch.map(slot => prisma.availabilitySlot.create({ data: slot }))
          );
          createdSlots.push(...batchResult);
        }
      }

      // Clear relevant caches
      const cacheKeysToDelete = [
        `availability:${consultantId}`,
        `slots:${consultantId}:*`, // Clear all slots cache for this consultant
      ];
      
      await Promise.all(
        cacheKeysToDelete.map(key => cacheUtils.delete(key))
      );

      console.log('✅ Slot generation completed:', {
        slotsCreated: createdSlots.length,
        patternsUsed: patterns.length,
        daysProcessed: dates.length
      });

      res.json({
        message: 'Availability slots generated successfully',
        data: { 
          slotsCreated: createdSlots.length,
          dateRange: { startDate, endDate },
          patternsFound: patterns.length,
          daysProcessed: dates.length,
          existingSlotsSkipped: existingSlots.length
        }
      });
    } catch (error) {
      if (error instanceof ValidationError) throw error;
      console.error('Error generating slots:', error);
      throw new AppError('Failed to generate availability slots');
    }
  }
);

/**
 * GET /availability/slots
 * Get available slots for booking (public endpoint with consultant slug)
 * OPTIMIZED: With caching, pagination, and efficient queries
 */
router.get('/slots/:consultantSlug', async (req, res: Response): Promise<void> => {
  try {
    const prisma = getPrismaClient();
    const { consultantSlug } = req.params;
    const { sessionType, startDate, endDate, limit, offset } = req.query;

    // Parse pagination parameters with defaults
    const pageLimit = Math.min(parseInt(limit as string) || 100, 200); // Max 200 slots
    const pageOffset = parseInt(offset as string) || 0;

    // Create cache key for this specific request
    const cacheKey = `slots:${consultantSlug}:${sessionType || 'all'}:${startDate || 'today'}:${endDate || 'default'}:${pageLimit}:${pageOffset}`;
    
    // Check cache first (30-second TTL for frequently changing data)
    const cached = await cacheUtils.get(cacheKey);
    if (cached) {
      console.log('🎯 Returning cached availability slots');
      res.json(cached);
      return;
    }

    // Find consultant by slug with optimized query
    const consultant = await prisma.consultant.findUnique({
      where: { slug: consultantSlug },
      select: { id: true, firstName: true, lastName: true } // Select only needed fields
    });

    if (!consultant) {
      throw new NotFoundError('Consultant not found');
    }

    const consultantId = consultant.id;

    // Build optimized date filter
    const dateFilter: any = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today
    
    if (startDate) {
      const start = new Date(startDate as string);
      dateFilter.gte = start >= today ? start : today; // Don't show past dates
    } else {
      dateFilter.gte = today; // Default: start from today
    }
    
    if (endDate) {
      dateFilter.lte = new Date(endDate as string);
    } else {
      // Default: show next 14 days instead of 30 for better performance
      const defaultEnd = new Date(dateFilter.gte);
      defaultEnd.setDate(defaultEnd.getDate() + 14);
      dateFilter.lte = defaultEnd;
    }

    const whereClause = {
      consultantId,
      isBooked: false,
      isBlocked: false,
      date: dateFilter,
      ...(sessionType && typeof sessionType === 'string' && { sessionType: sessionType as 'PERSONAL' | 'WEBINAR' })
    };

    // Optimized query with proper field selection and limits
    const [availableSlots, totalCount] = await Promise.all([
      prisma.availabilitySlot.findMany({
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
        },
        take: pageLimit,
        skip: pageOffset
      }),
      // Get total count for pagination info
      prisma.availabilitySlot.count({
        where: whereClause
      })
    ]);

    // Efficiently group slots by date
    const slotsByDate = availableSlots.reduce((acc, slot) => {
      const dateKey = slot.date.toISOString().split('T')[0];
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(slot);
      return acc;
    }, {} as Record<string, typeof availableSlots>);

    const responseData = {
      message: 'Available slots retrieved successfully',
      data: { 
        slots: availableSlots,
        slotsByDate,
        totalSlots: availableSlots.length,
        totalAvailable: totalCount,
        pagination: {
          limit: pageLimit,
          offset: pageOffset,
          hasMore: totalCount > pageOffset + availableSlots.length
        },
        consultant: {
          name: `${consultant.firstName} ${consultant.lastName}`.trim()
        }
      }
    };

    // Cache the response for 30 seconds
    await cacheUtils.set(cacheKey, responseData, 30);

    console.log('📊 Availability slots query executed:', {
      consultantSlug,
      slotsReturned: availableSlots.length,
      totalAvailable: totalCount,
      cached: false,
      queryTime: Date.now()
    });

    res.json(responseData);
  } catch (error) {
    if (error instanceof NotFoundError) throw error;
    console.error('Error fetching available slots:', error);
    throw new AppError('Failed to fetch available slots');
  }
});

export default router;