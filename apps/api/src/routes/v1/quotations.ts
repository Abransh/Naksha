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

import { Router, Response } from 'express';
import { z } from 'zod';
import { getPrismaClient } from '../../config/database';
import { cacheUtils } from '../../config/redis';
import { AuthenticatedRequest } from '../../middleware/auth';
import { validateRequest, commonSchemas } from '../../middleware/validation';
import { AppError, NotFoundError, ValidationError } from '../../middleware/errorHandler';
import { sendEmail } from '../../services/emailService';
// import { generateQuotationPDF } from '../../services/pdfService'; // TODO: Create PDF service
import { uploadToCloudinary } from '../../services/uploadService';

const router = Router();

/**
 * Validation schemas
 */
const createQuotationSchema = z.object({
  clientId: z.string().uuid('Invalid client ID').optional(),
  clientEmail: z.string().email('Invalid email format').max(255),
  clientName: z.string().min(1, 'Client name is required').max(200),
  quotationName: z.string().min(1, 'Quotation name is required').max(300),
  description: z.string().max(2000, 'Description too long').optional(),
  baseAmount: z.number().positive('Base amount must be positive'),
  discountPercentage: z.number().min(0).max(100, 'Discount cannot exceed 100%').optional().default(0),
  currency: z.string().length(3, 'Currency must be 3 characters').optional().default('INR'),
  durationText: z.string().max(100, 'Duration text too long').optional(),
  expiryDays: z.number().min(1).max(365, 'Expiry must be between 1-365 days').optional().default(30),
  notes: z.string().max(1000, 'Notes too long').optional(),
  includeImage: z.boolean().optional().default(false)
});

const updateQuotationSchema = z.object({
  quotationName: z.string().min(1).max(300).optional(),
  description: z.string().max(2000).optional(),
  baseAmount: z.number().positive().optional(),
  discountPercentage: z.number().min(0).max(100).optional(),
  durationText: z.string().max(100).optional(),
  expiresAt: z.string().datetime().optional(),
  status: z.enum(['DRAFT', 'SENT', 'VIEWED', 'ACCEPTED', 'REJECTED', 'EXPIRED']).optional(),
  notes: z.string().max(1000).optional()
});

const quotationFiltersSchema = z.object({
  status: z.enum(['DRAFT', 'SENT', 'VIEWED', 'ACCEPTED', 'REJECTED', 'EXPIRED']).optional(),
  clientId: z.string().uuid().optional(),
  minAmount: z.number().min(0).optional(),
  maxAmount: z.number().min(0).optional(),
  createdAfter: z.string().datetime().optional(),
  createdBefore: z.string().datetime().optional(),
  search: z.string().max(100).optional()
});

const shareQuotationSchema = z.object({
  emailMessage: z.string().max(1000, 'Email message too long').optional(),
  includeAttachment: z.boolean().optional().default(true)
});

/**
 * GET /api/quotations
 * Get quotations with filtering, sorting, and pagination
 */
router.get('/',
  validateRequest(quotationFiltersSchema, 'query'),
  validateRequest(commonSchemas.pagination, 'query'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const consultantId = req.user!.id;
      const filters = req.query as any;
      const { page, limit, sortBy, sortOrder } = req.query as any;

      // Build cache key
      const cacheKey = `quotations:${consultantId}:${JSON.stringify(filters)}:${page}:${limit}:${sortBy}:${sortOrder}`;
      
      // Check cache first
      const cachedResult = await cacheUtils.get(cacheKey);
      if (cachedResult) {
        res.json({
          data: cachedResult,
          fromCache: true
        });
        return;
      }

      const prisma = getPrismaClient();

      // Build where clause
      const where: any = {
        consultantId,
        ...(filters.status && { status: filters.status }),
        ...(filters.clientId && { clientId: filters.clientId }),
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
      const orderBy: any = {};
      if (sortBy) {
        orderBy[sortBy] = sortOrder;
      } else {
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
      const formattedQuotations = quotations.map((quotation:any) => {
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
        draftQuotations: formattedQuotations.filter((q:any) => q.status === 'DRAFT').length,
        sentQuotations: formattedQuotations.filter((q:any) => q.status === 'SENT').length,
        acceptedQuotations: formattedQuotations.filter((q:any) => q.status === 'ACCEPTED').length,
        totalValue: formattedQuotations.reduce((sum:any, q:any) => sum + q.finalAmount, 0),
        averageValue: formattedQuotations.length > 0 
          ? formattedQuotations.reduce((sum:any , q:any) => sum + q.finalAmount, 0) / formattedQuotations.length 
          : 0,
        conversionRate: formattedQuotations.filter((q:any) => q.status === 'SENT').length > 0
          ? (formattedQuotations.filter((q:any) => q.status === 'ACCEPTED').length / formattedQuotations.filter((q:any) => q.status === 'SENT').length) * 100
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
      await cacheUtils.set(cacheKey, result, 120);

      res.json({
        data: result,
        fromCache: false
      });

    } catch (error) {
      console.error('❌ Get quotations error:', error);
      throw new AppError('Failed to fetch quotations', 500, 'QUOTATIONS_FETCH_ERROR');
    }
  }
);

/**
 * GET /api/quotations/:id
 * Get a specific quotation by ID
 */
router.get('/:id',
  validateRequest(z.object({ id: z.string().uuid() }), 'params'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const consultantId = req.user!.id;

      const prisma = getPrismaClient();

      const quotation = await prisma.quotation.findFirst({
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
              phoneNumber: true,
              city: true,
              state: true,
              totalSessions: true,
              totalAmountPaid: true
            }
          }
        }
      });

      if (!quotation) {
        throw new NotFoundError('Quotation');
      }

      // Format the response
      const formattedQuotation = {
        ...quotation,
        baseAmount: Number(quotation.amount),
        discountPercentage: Number(0),
        finalAmount: Number(quotation.finalAmount),
        client: quotation.client ? {
          ...quotation.client,
          totalAmountPaid: Number(quotation.client.totalAmountPaid)
        } : null,
        isExpired: quotation.expiresAt ? new Date() > quotation.expiresAt : false,
        daysUntilExpiry: quotation.expiresAt 
          ? Math.ceil((quotation.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          : null
      };

      res.json({
        data: { quotation: formattedQuotation }
      });

    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      console.error('❌ Get quotation error:', error);
      throw new AppError('Failed to fetch quotation', 500, 'QUOTATION_FETCH_ERROR');
    }
  }
);

/**
 * POST /api/quotations
 * Create a new quotation
 */
router.post('/',
  validateRequest(createQuotationSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const consultantId = req.user!.id;
      const quotationData = req.body;

      const prisma = getPrismaClient();

      // Calculate final amount
      const finalAmount = quotationData.baseAmount * (1 - quotationData.discountPercentage / 100);

      // Calculate expiry date
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + quotationData.expiryDays);

      // If clientId is provided, verify it belongs to consultant
      if (quotationData.clientId) {
        const client = await prisma.client.findFirst({
          where: {
            id: quotationData.clientId,
            consultantId
          }
        });

        if (!client) {
          throw new NotFoundError('Client');
        }
      }

      // Create quotation
      const quotation = await prisma.quotation.create({
        data: {
          consultantId,
          clientId: quotationData.clientId || null,
          clientEmail: quotationData.clientEmail,
          clientName: quotationData.clientName,
          quotationName: quotationData.quotationName,
          description: quotationData.description,
          baseAmount: quotationData.baseAmount,
          discountPercentage: quotationData.discountPercentage,
          finalAmount,
          currency: quotationData.currency,
          durationText: quotationData.durationText,
          expiresAt,
          notes: quotationData.notes,
          status: 'DRAFT'
        },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
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

        } catch (imageError) {
          console.error('❌ Quotation image generation failed:', imageError);
          // Don't fail quotation creation if image generation fails
        }
      }

      // Clear related caches
      await cacheUtils.clearPattern(`quotations:${consultantId}:*`);
      await cacheUtils.clearPattern(`dashboard_*:${consultantId}:*`);

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

    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      console.error('❌ Create quotation error:', error);
      throw new AppError('Failed to create quotation', 500, 'QUOTATION_CREATE_ERROR');
    }
  }
);

/**
 * PUT /api/quotations/:id
 * Update a quotation
 */
router.put('/:id',
  validateRequest(z.object({ id: z.string().uuid() }), 'params'),
  validateRequest(updateQuotationSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const consultantId = req.user!.id;
      const updates = req.body;

      const prisma = getPrismaClient();

      // Get existing quotation
      const existingQuotation = await prisma.quotation.findFirst({
        where: {
          id,
          consultantId
        }
      });

      if (!existingQuotation) {
        throw new NotFoundError('Quotation');
      }

      // Check if quotation can be updated
      if (existingQuotation.status === 'ACCEPTED' || existingQuotation.status === 'REJECTED') {
        throw new ValidationError('Cannot update quotation that has been accepted or rejected');
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
        },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      // Clear related caches
      await cacheUtils.clearPattern(`quotations:${consultantId}:*`);

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

    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      console.error('❌ Update quotation error:', error);
      throw new AppError('Failed to update quotation', 500, 'QUOTATION_UPDATE_ERROR');
    }
  }
);

/**
 * POST /api/quotations/:id/send
 * Send quotation to client via email
 */
router.post('/:id/send',
  validateRequest(z.object({ id: z.string().uuid() }), 'params'),
  validateRequest(shareQuotationSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { emailMessage, includeAttachment } = req.body;
      const consultantId = req.user!.id;

      const prisma = getPrismaClient();

      // Get quotation
      const quotation = await prisma.quotation.findFirst({
        where: {
          id,
          consultantId
        }
      });

      if (!quotation) {
        throw new NotFoundError('Quotation');
      }

      // Check if quotation can be sent
      if (quotation.status === 'ACCEPTED' || quotation.status === 'REJECTED') {
        throw new ValidationError('Cannot send quotation that has been accepted or rejected');
      }

      // Check if quotation is expired
      if (quotation.expiresAt && new Date() > quotation.expiresAt) {
        throw new ValidationError('Cannot send expired quotation');
      }

      // Generate quotation PDF if not exists and attachment requested
      let quotationPDFUrl = quotation.quotationImageUrl;
      if (includeAttachment && !quotationPDFUrl) {
        try { 
          // TODO: Implement PDF generation service
          
          const quotationPDF = { secure_url: null };
        }
            catch (error) {
            console.error('Error generating quotation PDF:', error);
            throw new ValidationError('Failed to generate quotation PDF');
          }}
        }
        catch (error) {
          console.error('❌ Send quotation error:', error);
          throw new AppError('Failed to send quotation', 500, 'QUOTATION_SEND_ERROR');
        }
        
  });
    
    
    
            
/**
 * DELETE /api/quotations/:id
 * Delete a quotation (only if draft)
 */
router.delete('/:id',
  validateRequest(z.object({ id: z.string().uuid() }), 'params'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const consultantId = req.user!.id;

      const prisma = getPrismaClient();

      // Get quotation
      const quotation = await prisma.quotation.findFirst({
        where: {
          id,
          consultantId
        }
      });

      if (!quotation) {
        throw new NotFoundError('Quotation');
      }

      // Only allow deletion of draft quotations
      if (quotation.status !== 'DRAFT') {
        throw new ValidationError('Can only delete draft quotations');
      }

      // Delete quotation
      await prisma.quotation.delete({
        where: { id }
      });

      // Clear related caches
      await cacheUtils.clearPattern(`quotations:${consultantId}:*`);
      await cacheUtils.clearPattern(`dashboard_*:${consultantId}:*`);

      console.log(`✅ Quotation deleted: ${id}`);

      res.json({
        message: 'Quotation deleted successfully'
      });

    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      console.error('❌ Delete quotation error:', error);
      throw new AppError('Failed to delete quotation', 500, 'QUOTATION_DELETE_ERROR');
    }
  }
);

/**
 * GET /api/quotations/analytics
 * Get quotation analytics and insights
 */
router.get('/analytics',
  validateRequest(commonSchemas.dateRange, 'query'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const consultantId = req.user!.id;
      const { startDate, endDate } = req.query as any;

      // Set default date range if not provided
      const dateRange = {
        start: startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        end: endDate ? new Date(endDate) : new Date()
      };

      const cacheKey = `quotation_analytics:${consultantId}:${dateRange.start.toISOString()}:${dateRange.end.toISOString()}`;
      
      // Check cache
      const cachedAnalytics = await cacheUtils.get(cacheKey);
      if (cachedAnalytics) {
        res.json({
          data: cachedAnalytics,
          fromCache: true
        });
        return;
      }

      const prisma = getPrismaClient();

      // Get quotation analytics
      const [
        totalQuotations,
        statusBreakdown,
        valueAnalytics,
        conversionAnalytics,
        topQuotations
      ] = await Promise.all([
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
        statusBreakdown: statusBreakdown.map((item:any) => ({
          status: item.status,
          count: item._count,
          totalValue: Number(item._sum.finalAmount || 0)
        })),
        conversion: {
          viewedQuotations: conversionAnalytics.filter((q:any) => q.status === 'VIEWED').length,
          acceptedQuotations: conversionAnalytics.filter((q:any) => q.status === 'ACCEPTED').length,
          rejectedQuotations: conversionAnalytics.filter((q:any) => q.status === 'REJECTED').length,
          conversionRate: conversionAnalytics.length > 0 
            ? (conversionAnalytics.filter((q:any) => q.status === 'ACCEPTED').length / conversionAnalytics.length) * 100 
            : 0,
          averageResponseTime: conversionAnalytics
            .filter((q:any) => q.sentAt && q.respondedAt)
            .reduce((sum:any, q:any) => {
              const responseTime = new Date(q.respondedAt!).getTime() - new Date(q.sentAt!).getTime();
              return sum + responseTime;
            }, 0) / Math.max(1, conversionAnalytics.filter((q:any) => q.sentAt && q.respondedAt).length)
        },
        topQuotations: topQuotations.map((q:any) => ({
          ...q,
          finalAmount: Number(q.finalAmount)
        })),
        dateRange: {
          start: dateRange.start.toISOString(),
          end: dateRange.end.toISOString()
        }
      };

      // Cache for 30 minutes
      await cacheUtils.set(cacheKey, analytics, 1800);

      res.json({
        data: analytics,
        fromCache: false
      });

    } catch (error) {
      console.error('❌ Quotation analytics error:', error);
      throw new AppError('Failed to generate quotation analytics', 500, 'QUOTATION_ANALYTICS_ERROR');
    }
  }
);

export default router;