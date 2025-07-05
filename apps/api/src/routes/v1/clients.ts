/**
 * Client Management Routes
 * 
 * Handles all client-related operations:
 * - Client registration and profile management
 * - Client search and filtering
 * - Client analytics and insights
 * - Client session history
 * - Client communication tracking
 * - Import/export functionality
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { getPrismaClient } from '../../config/database';
import { cacheUtils } from '../../config/redis';
import { AuthenticatedRequest } from '../../middleware/auth';
import { validateRequest, commonSchemas, validationUtils } from '../../middleware/validation';
import { AppError, NotFoundError, ValidationError, ConflictError } from '../../middleware/errorHandler';
import { sendClientWelcomeEmail } from '../../services/resendEmailService';
import { generateClientInsights } from '../../utils/analytics';
import { exportToCSV } from '../../utils/export';

const router = Router();

/**
 * Validation schemas
 */
const createClientSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(200, 'Name must not exceed 200 characters')
    .regex(/^[a-zA-Z\s]+$/, 'Name must contain only letters and spaces'),
  email: z.string()
    .email('Invalid email format')
    .max(255, 'Email must not exceed 255 characters')
    .toLowerCase(),
  phoneCountryCode: z.string()
    .regex(/^\+\d{1,4}$/, 'Invalid country code format')
    .optional()
    .default('+91'),
  phoneNumber: z.string()
    .regex(/^\d{6,15}$/, 'Invalid phone number format')
    .optional(),
  address: z.string().max(500, 'Address too long').optional(),
  city: z.string().max(100, 'City name too long').optional(),
  state: z.string().max(100, 'State name too long').optional(),
  country: z.string().max(100, 'Country name too long').optional().default('India'),
  notes: z.string().max(1000, 'Notes too long').optional()
});

const updateClientSchema = createClientSchema.partial().extend({
  isActive: z.boolean().optional()
});

const clientFiltersSchema = z.object({
  isActive: z.boolean().optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  hasActiveSessions: z.boolean().optional(),
  minSessions: z.number().min(0).optional(),
  maxSessions: z.number().min(0).optional(),
  minRevenue: z.number().min(0).optional(),
  maxRevenue: z.number().min(0).optional(),
  registeredAfter: z.string().datetime().optional(),
  registeredBefore: z.string().datetime().optional(),
  search: z.string().max(100).optional()
});

const importClientsSchema = z.object({
  clients: z.array(
    z.object({
      name: z.string().min(2).max(200),
      email: z.string().email().max(255),
      phoneCountryCode: z.string().optional().default('+91'),
      phoneNumber: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      country: z.string().optional().default('India')
    })
  ).min(1, 'At least one client required').max(100, 'Too many clients in single import')
});

/**
 * GET /api/clients
 * Get clients with filtering, sorting, and pagination
 */
router.get('/',
  validateRequest(clientFiltersSchema, 'query'),
  validateRequest(commonSchemas.pagination, 'query'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const consultantId = req.user!.id;
      const filters = req.query as any;
      const { page, limit, sortBy, sortOrder } = req.query as any;

      // Build cache key
      const cacheKey = `clients:${consultantId}:${JSON.stringify(filters)}:${page}:${limit}:${sortBy}:${sortOrder}`;
      
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
        ...(filters.isActive !== undefined && { isActive: filters.isActive }),
        ...(filters.city && { city: { contains: filters.city, mode: 'insensitive' } }),
        ...(filters.state && { state: { contains: filters.state, mode: 'insensitive' } }),
        ...(filters.country && { country: { contains: filters.country, mode: 'insensitive' } }),
        ...(filters.minSessions !== undefined && { totalSessions: { gte: filters.minSessions } }),
        ...(filters.maxSessions !== undefined && { totalSessions: { lte: filters.maxSessions } }),
        ...(filters.minRevenue !== undefined && { totalAmountPaid: { gte: filters.minRevenue } }),
        ...(filters.maxRevenue !== undefined && { totalAmountPaid: { lte: filters.maxRevenue } }),
        ...(filters.registeredAfter && { createdAt: { gte: new Date(filters.registeredAfter) } }),
        ...(filters.registeredBefore && { createdAt: { lte: new Date(filters.registeredBefore) } }),
        ...(filters.search && {
          OR: [
            { name: { contains: filters.search, mode: 'insensitive' } },
            { email: { contains: filters.search, mode: 'insensitive' } },
            { phoneNumber: { contains: filters.search, mode: 'insensitive' } },
            { city: { contains: filters.search, mode: 'insensitive' } }
          ]
        })
      };

      // Add filter for clients with active sessions
      if (filters.hasActiveSessions) {
        where.sessions = {
          some: {
            status: {
              in: ['PENDING', 'CONFIRMED']
            }
          }
        };
      }

      // Build order by clause
      const orderBy: any = {};
      if (sortBy) {
        if (sortBy === 'lastSessionDate') {
          orderBy.sessions = {
            _count: sortOrder
          };
        } else {
          orderBy[sortBy] = sortOrder;
        }
      } else {
        orderBy.createdAt = 'desc';
      }

      // Get total count
      const totalCount = await prisma.client.count({ where });

      // Get clients with pagination
      const clients = await prisma.client.findMany({
        where,
        include: {
          sessions: {
            select: {
              id: true,
              status: true,
              scheduledDate: true,
              amount: true,
              createdAt: true
            },
            orderBy: { scheduledDate: 'desc' },
            take: 5 // Get last 5 sessions for each client
          },
          _count: {
            select: {
              sessions: true
            }
          }
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit
      });

      // Format response data
      const formattedClients = clients.map((client:any) => {
        const lastSession = client.sessions[0];
        const activeSessions = client.sessions.filter((s:any) => ['PENDING', 'CONFIRMED'].includes(s.status));
        const completedSessions = client.sessions.filter((s:any) => s.status === 'COMPLETED');

        return {
          id: client.id,
          name: client.name,
          email: client.email,
          phoneCountryCode: client.phoneCountryCode,
          phoneNumber: client.phoneNumber,
          address: client.address,
          city: client.city,
          state: client.state,
          country: client.country,
          isActive: client.isActive,
          totalSessions: client.totalSessions,
          totalAmountPaid: Number(client.totalAmountPaid),
          createdAt: client.createdAt,
          updatedAt: client.updatedAt,
          stats: {
            activeSessions: activeSessions.length,
            completedSessions: completedSessions.length,
            lastSessionDate: lastSession?.scheduledDate || null,
            averageSessionValue: completedSessions.length > 0 
              ? completedSessions.reduce((sum:any, s:any) => sum + Number(s.amount), 0) / completedSessions.length 
              : 0
          },
          recentSessions: client.sessions.slice(0, 3).map((session:any) => ({
            id: session.id,
            status: session.status,
            scheduledDate: session.scheduledDate,
            amount: Number(session.amount)
          }))
        };
      });

      // Calculate summary statistics
      const summaryStats = {
        totalClients: totalCount,
        activeClients: formattedClients.filter((c:any) => c.isActive).length,
        clientsWithActiveSessions: formattedClients.filter((c:any) => c.stats.activeSessions > 0).length,
        totalRevenue: formattedClients.reduce((sum:any, c:any) => sum + c.totalAmountPaid, 0),
        averageRevenuePerClient: totalCount > 0 
          ? formattedClients.reduce((sum:any, c:any) => sum + c.totalAmountPaid, 0) / totalCount 
          : 0
      };

      const result = {
        clients: formattedClients,
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
      console.error('❌ Get clients error:', error);
      throw new AppError('Failed to fetch clients', 500, 'CLIENTS_FETCH_ERROR');
    }
  }
);

/**
 * GET /api/clients/:id
 * Get a specific client with detailed information
 */
router.get('/:id',
  validateRequest(z.object({ id: z.string().min(1) }), 'params'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const consultantId = req.user!.id;

      const prisma = getPrismaClient();

      const client = await prisma.client.findFirst({
        where: {
          id,
          consultantId
        },
        include: {
          sessions: {
            select: {
              id: true,
              title: true,
              sessionType: true,
              scheduledDate: true,
              scheduledTime: true,
              durationMinutes: true,
              amount: true,
              status: true,
              paymentStatus: true,
              platform: true,
              clientNotes: true,
              createdAt: true
            },
            orderBy: { scheduledDate: 'desc' }
          },
        }
      });

      if (!client) {
        throw new NotFoundError('Client');
      }

      // Generate client insights
      const insights = await generateClientInsights(client);

      // Format the response
      const formattedClient = {
        ...client,
        totalAmountPaid: Number(client.totalAmountPaid),
        sessions: client.sessions.map((session:any) => ({
          ...session,
          amount: Number(session.amount)
        })),
        insights
      };

      res.json({
        data: { client: formattedClient }
      });

    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      console.error('❌ Get client error:', error);
      throw new AppError('Failed to fetch client', 500, 'CLIENT_FETCH_ERROR');
    }
  }
);

/**
 * POST /api/clients
 * Create a new client
 */
router.post('/',
  validateRequest(createClientSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const consultantId = req.user!.id;
      const clientData = req.body;

      const prisma = getPrismaClient();

      // Check if client with same email already exists for this consultant
      const existingClient = await prisma.client.findFirst({
        where: {
          consultantId,
          email: clientData.email
        }
      });

      if (existingClient) {
        throw new ConflictError('A client with this email address already exists');
      }

      // Create client - need to set both name and firstName/lastName
      const nameParts = clientData.name.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      const client = await prisma.client.create({
        data: {
          consultantId,
          ...clientData,
          firstName,
          lastName,
          isActive: true,
          totalSessions: 0,
          totalAmountPaid: 0
        }
      });

      // Send welcome email to client via Resend
      try {
        await sendClientWelcomeEmail({
          clientName: client.name,
          clientEmail: client.email,
          consultantName: `${req.user!.slug || req.user!.email}`.trim(),
          consultantEmail: req.user!.email,
          profileUrl: `${process.env.FRONTEND_URL}/${req.user!.slug || ''}`
        });
      } catch (emailError) {
        console.error('❌ Welcome email failed:', emailError);
        // Don't fail client creation if email fails
      }

      // Clear related caches
      await cacheUtils.clearPattern(`clients:${consultantId}:*`);
      await cacheUtils.clearPattern(`dashboard_*:${consultantId}:*`);

      console.log(`✅ Client created: ${client.id} (${client.name})`);

      res.status(201).json({
        message: 'Client created successfully',
        data: {
          client: {
            ...client,
            totalAmountPaid: Number(client.totalAmountPaid)
          }
        }
      });

    } catch (error) {
      if (error instanceof ConflictError) {
        throw error;
      }
      console.error('❌ Create client error:', error);
      throw new AppError('Failed to create client', 500, 'CLIENT_CREATE_ERROR');
    }
  }
);

/**
 * PUT /api/clients/:id
 * Update a client
 */
router.put('/:id',
  validateRequest(z.object({ id: z.string().min(1) }), 'params'),
  validateRequest(updateClientSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const consultantId = req.user!.id;
      const updates = req.body;

      const prisma = getPrismaClient();

      // Check if client exists and belongs to consultant
      const existingClient = await prisma.client.findFirst({
        where: {
          id,
          consultantId
        }
      });

      if (!existingClient) {
        throw new NotFoundError('Client');
      }

      // Check email uniqueness if email is being updated
      if (updates.email && updates.email !== existingClient.email) {
        const emailConflict = await prisma.client.findFirst({
          where: {
            consultantId,
            email: updates.email,
            id: { not: id }
          }
        });

        if (emailConflict) {
          throw new ConflictError('A client with this email address already exists');
        }
      }

      // Update client
      const updatedClient = await prisma.client.update({
        where: { id },
        data: {
          ...updates,
          updatedAt: new Date()
        }
      });

      // Clear related caches
      await cacheUtils.clearPattern(`clients:${consultantId}:*`);

      console.log(`✅ Client updated: ${id}`);

      res.json({
        message: 'Client updated successfully',
        data: {
          client: {
            ...updatedClient,
            totalAmountPaid: Number(updatedClient.totalAmountPaid)
          }
        }
      });

    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ConflictError) {
        throw error;
      }
      console.error('❌ Update client error:', error);
      throw new AppError('Failed to update client', 500, 'CLIENT_UPDATE_ERROR');
    }
  }
);

/**
 * DELETE /api/clients/:id
 * Deactivate a client (soft delete)
 */
router.delete('/:id',
  validateRequest(z.object({ id: z.string().min(1) }), 'params'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const consultantId = req.user!.id;

      const prisma = getPrismaClient();

      // Check if client exists and belongs to consultant
      const client = await prisma.client.findFirst({
        where: {
          id,
          consultantId
        },
        include: {
          sessions: {
            where: {
              status: {
                in: ['PENDING', 'CONFIRMED']
              }
            }
          }
        }
      });

      if (!client) {
        throw new NotFoundError('Client');
      }

      // Check if client has active sessions
      if (client.sessions.length > 0) {
        throw new ValidationError('Cannot deactivate client with active sessions. Please cancel or complete all sessions first.');
      }

      // Deactivate client (soft delete)
      await prisma.client.update({
        where: { id },
        data: {
          isActive: false,
          updatedAt: new Date()
        }
      });

      // Clear related caches
      await cacheUtils.clearPattern(`clients:${consultantId}:*`);
      await cacheUtils.clearPattern(`dashboard_*:${consultantId}:*`);

      console.log(`✅ Client deactivated: ${id}`);

      res.json({
        message: 'Client deactivated successfully'
      });

    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      console.error('❌ Deactivate client error:', error);
      throw new AppError('Failed to deactivate client', 500, 'CLIENT_DEACTIVATE_ERROR');
    }
  }
);

/**
 * POST /api/clients/import
 * Bulk import clients
 */
router.post('/import',
  validateRequest(importClientsSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { clients: clientsData } = req.body;
      const consultantId = req.user!.id;

      const prisma = getPrismaClient();

      const results = {
        imported: 0,
        skipped: 0,
        errors: [] as any[]
      };

      // Process each client
      for (const [index, clientData] of clientsData.entries()) {
        try {
          // Check if client already exists
          const existingClient = await prisma.client.findFirst({
            where: {
              consultantId,
              email: clientData.email
            }
          });

          if (existingClient) {
            results.skipped++;
            results.errors.push({
              row: index + 1,
              email: clientData.email,
              error: 'Client with this email already exists'
            });
            continue;
          }

          // Create client - need to set both name and firstName/lastName
          const nameParts = clientData.name.trim().split(' ');
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';
          
          await prisma.client.create({
            data: {
              consultantId,
              ...clientData,
              firstName,
              lastName,
              isActive: true,
              totalSessions: 0,
              totalAmountPaid: 0
            }
          });

          results.imported++;

        } catch (error: any) {
          results.errors.push({
            row: index + 1,
            email: clientData.email,
            error: error.message
          });
        }
      }

      // Clear related caches
      await cacheUtils.clearPattern(`clients:${consultantId}:*`);
      await cacheUtils.clearPattern(`dashboard_*:${consultantId}:*`);

      console.log(`✅ Bulk import completed: ${results.imported} imported, ${results.skipped} skipped`);

      res.json({
        message: 'Bulk import completed',
        data: results
      });

    } catch (error) {
      console.error('❌ Bulk import clients error:', error);
      throw new AppError('Failed to import clients', 500, 'CLIENT_IMPORT_ERROR');
    }
  }
);

/**
 * GET /api/clients/export
 * Export clients to CSV
 */
router.get('/export',
  validateRequest(clientFiltersSchema, 'query'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const consultantId = req.user!.id;
      const filters = req.query as any;

      const prisma = getPrismaClient();

      // Build where clause (same as GET /clients)
      const where: any = {
        consultantId,
        ...(filters.isActive !== undefined && { isActive: filters.isActive }),
        ...(filters.city && { city: { contains: filters.city, mode: 'insensitive' } }),
        ...(filters.state && { state: { contains: filters.state, mode: 'insensitive' } }),
        ...(filters.country && { country: { contains: filters.country, mode: 'insensitive' } }),
        ...(filters.search && {
          OR: [
            { name: { contains: filters.search, mode: 'insensitive' } },
            { email: { contains: filters.search, mode: 'insensitive' } }
          ]
        })
      };

      // Get all matching clients (without pagination for export)
      const clients = await prisma.client.findMany({
        where,
        include: {
          _count: {
            select: {
              sessions: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      // Generate CSV
      const csvData = await exportToCSV(clients, {
        headers: ['Name', 'Email', 'Phone', 'City', 'Total Sessions', 'Total Amount'],
        fields: ['name', 'email', 'phoneNumber', 'city', 'totalSessions', 'totalAmountPaid']
      });

      // Set response headers for file download
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="clients-export-${new Date().toISOString().split('T')[0]}.csv"`);

      res.send(csvData);

    } catch (error) {
      console.error('❌ Export clients error:', error);
      throw new AppError('Failed to export clients', 500, 'CLIENT_EXPORT_ERROR');
    }
  }
);

/**
 * GET /api/clients/analytics
 * Get client analytics and insights
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

      const cacheKey = `client_analytics:${consultantId}:${dateRange.start.toISOString()}:${dateRange.end.toISOString()}`;
      
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

      // Get comprehensive client analytics
      const [
        totalClients,
        newClients,
        activeClients,
        clientGrowthData,
        topClients,
        locationData,
        sessionData
      ] = await Promise.all([
        // Total clients count
        prisma.client.count({ where: { consultantId } }),

        // New clients in date range
        prisma.client.count({
          where: {
            consultantId,
            createdAt: {
              gte: dateRange.start,
              lte: dateRange.end
            }
          }
        }),

        // Active clients (have at least one session)
        prisma.client.count({
          where: {
            consultantId,
            totalSessions: { gt: 0 }
          }
        }),

        // Client growth over time (monthly)
        prisma.client.groupBy({
          by: ['createdAt'],
          where: { consultantId },
          _count: true,
          orderBy: { createdAt: 'asc' }
        }),

        // Top clients by revenue
        prisma.client.findMany({
          where: { consultantId },
          orderBy: { totalAmountPaid: 'desc' },
          take: 10,
          select: {
            id: true,
            name: true,
            email: true,
            totalAmountPaid: true,
            totalSessions: true
          }
        }),

        // Client distribution by location
        prisma.client.groupBy({
          by: ['city', 'state'],
          where: { consultantId, city: { not: null } },
          _count: true,
          orderBy: { _count: { city: 'desc' } },
          take: 10
        }),

        // Session patterns
        prisma.session.groupBy({
          by: ['status'],
          where: {
            consultantId,
            createdAt: {
              gte: dateRange.start,
              lte: dateRange.end
            }
          },
          _count: true,
          _sum: { amount: true }
        })
      ]);

      const analytics = {
        summary: {
          totalClients,
          newClients,
          activeClients,
          inactiveClients: totalClients - activeClients,
          clientRetentionRate: totalClients > 0 ? (activeClients / totalClients) * 100 : 0
        },
        topClients: topClients.map((client:any) => ({
          ...client,
          totalAmountPaid: Number(client.totalAmountPaid)
        })),
        locationDistribution: locationData.map((location:any) => ({
          location: `${location.city}, ${location.state}`,
          count: location._count
        })),
        sessionPatterns: sessionData.map((pattern:any) => ({
          status: pattern.status,
          count: pattern._count,
          revenue: Number(pattern._sum.amount || 0)
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
      console.error('❌ Client analytics error:', error);
      throw new AppError('Failed to generate client analytics', 500, 'CLIENT_ANALYTICS_ERROR');
    }
  }
);

export default router;