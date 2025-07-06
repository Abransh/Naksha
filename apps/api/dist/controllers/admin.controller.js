"use strict";
// apps/api/src/controllers/admin.controller.ts
// Nakksha Consulting Platform - Admin Controller
// Handles admin-specific operations including consultant approval workflow
// Implements the core admin approval requirement for consultants
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAdminDashboard = exports.getAllAdmins = exports.createAdmin = exports.updateConsultant = exports.approveConsultant = exports.getConsultantDetails = exports.getAllConsultants = void 0;
const zod_1 = require("zod");
const database_1 = require("@nakksha/database");
const logger_1 = require("../utils/logger");
const appError_1 = require("../utils/appError");
const resendEmailService_1 = require("../services/resendEmailService");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
// Using shared prisma instance from @nakksha/database
// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================
const approveConsultantSchema = zod_1.z.object({
    consultantId: zod_1.z.string().uuid('Invalid consultant ID'),
    approved: zod_1.z.boolean(),
    adminNotes: zod_1.z.string().optional()
});
const createAdminSchema = zod_1.z.object({
    firstName: zod_1.z.string().min(2, 'First name must be at least 2 characters').max(50),
    lastName: zod_1.z.string().min(2, 'Last name must be at least 2 characters').max(50),
    email: zod_1.z.string().email('Invalid email address'),
    password: zod_1.z.string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 'Password must contain uppercase, lowercase, number and special character'),
    role: zod_1.z.enum(['ADMIN', 'MODERATOR', 'SUPER_ADMIN']).default('ADMIN')
});
const updateConsultantSchema = zod_1.z.object({
    isActive: zod_1.z.boolean().optional(),
    personalSessionPrice: zod_1.z.number().positive().max(999999.99).optional(),
    webinarSessionPrice: zod_1.z.number().positive().max(999999.99).optional(),
    consultancySector: zod_1.z.string().max(100).optional(),
    adminNotes: zod_1.z.string().optional()
});
// ============================================================================
// CONSULTANT MANAGEMENT
// ============================================================================
/**
 * Get all consultants with approval status
 */
const getAllConsultants = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const status = req.query.status; // 'pending', 'approved', 'rejected', 'all'
        const search = req.query.search;
        const skip = (page - 1) * limit;
        // Build where clause
        const where = {};
        if (status && status !== 'all') {
            switch (status) {
                case 'pending':
                    where.isApprovedByAdmin = false;
                    where.isActive = true;
                    break;
                case 'approved':
                    where.isApprovedByAdmin = true;
                    where.isActive = true;
                    break;
                case 'rejected':
                    where.isActive = false;
                    break;
            }
        }
        if (search) {
            where.OR = [
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { consultancySector: { contains: search, mode: 'insensitive' } }
            ];
        }
        // Get consultants with stats
        const [consultants, totalCount] = await Promise.all([
            database_1.prisma.consultant.findMany({
                where,
                skip,
                take: limit,
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    phoneCountryCode: true,
                    phoneNumber: true,
                    consultancySector: true,
                    personalSessionPrice: true,
                    webinarSessionPrice: true,
                    description: true,
                    experienceMonths: true,
                    profilePhotoUrl: true,
                    slug: true,
                    isEmailVerified: true,
                    isApprovedByAdmin: true,
                    isActive: true,
                    profileCompleted: true,
                    createdAt: true,
                    updatedAt: true,
                    lastLoginAt: true,
                    _count: {
                        select: {
                            sessions: true,
                            clients: true,
                            quotations: true
                        }
                    }
                },
                orderBy: [
                    { isApprovedByAdmin: 'asc' }, // Pending first
                    { createdAt: 'desc' }
                ]
            }),
            database_1.prisma.consultant.count({ where })
        ]);
        // Format the response
        const formattedConsultants = consultants.map((consultant) => ({
            ...consultant,
            personalSessionPrice: consultant.personalSessionPrice ? Number(consultant.personalSessionPrice) : null,
            webinarSessionPrice: consultant.webinarSessionPrice ? Number(consultant.webinarSessionPrice) : null,
            experienceYears: consultant.experienceMonths ? Math.floor(consultant.experienceMonths / 12) : 0,
            stats: {
                totalSessions: consultant._count.sessions,
                totalClients: consultant._count.clients,
                totalQuotations: consultant._count.quotations
            },
            status: consultant.isActive
                ? (consultant.isApprovedByAdmin ? 'approved' : 'pending')
                : 'rejected'
        }));
        const totalPages = Math.ceil(totalCount / limit);
        logger_1.logger.logBusiness('admin_consultants_viewed', {
            adminId: req.user?.id,
            status,
            search,
            page,
            count: consultants.length
        });
        res.json({
            message: 'Consultants retrieved successfully',
            data: {
                consultants: formattedConsultants,
                pagination: {
                    page,
                    limit,
                    totalCount,
                    totalPages,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1
                }
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Get all consultants error:', error);
        res.status(500).json({
            error: 'Failed to retrieve consultants',
            message: 'Could not fetch consultant list',
            code: 'CONSULTANTS_FETCH_ERROR'
        });
    }
};
exports.getAllConsultants = getAllConsultants;
/**
 * Get consultant details for admin review
 */
const getConsultantDetails = async (req, res) => {
    try {
        const { consultantId } = req.params;
        const consultant = await database_1.prisma.consultant.findUnique({
            where: { id: consultantId },
            include: {
                sessions: {
                    include: {
                        client: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                email: true
                            }
                        }
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 10 // Latest 10 sessions
                },
                clients: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        createdAt: true
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 10 // Latest 10 clients
                },
                quotations: {
                    select: {
                        id: true,
                        title: true,
                        clientName: true,
                        clientEmail: true,
                        amount: true,
                        status: true,
                        createdAt: true
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 10 // Latest 10 quotations
                }
            }
        });
        if (!consultant) {
            throw new appError_1.NotFoundError('Consultant not found');
        }
        // Get revenue statistics
        const revenueStats = await database_1.prisma.session.aggregate({
            where: {
                consultantId,
                paymentStatus: 'PAID'
            },
            _sum: { amount: true },
            _count: { id: true }
        });
        const formattedConsultant = {
            ...consultant,
            personalSessionPrice: consultant.personalSessionPrice ? Number(consultant.personalSessionPrice) : null,
            webinarSessionPrice: consultant.webinarSessionPrice ? Number(consultant.webinarSessionPrice) : null,
            experienceYears: consultant.experienceMonths ? Math.floor(consultant.experienceMonths / 12) : 0,
            stats: {
                totalSessions: consultant.sessions.length,
                totalClients: consultant.clients.length,
                totalQuotations: consultant.quotations.length,
                totalRevenue: Number(revenueStats._sum.amount || 0),
                paidSessions: revenueStats._count
            },
            status: consultant.isActive
                ? (consultant.isApprovedByAdmin ? 'approved' : 'pending')
                : 'rejected'
        };
        logger_1.logger.logBusiness('admin_consultant_viewed', {
            adminId: req.user?.id,
            consultantId,
            consultantEmail: consultant.email
        });
        res.json({
            message: 'Consultant details retrieved successfully',
            data: { consultant: formattedConsultant }
        });
    }
    catch (error) {
        if (error instanceof appError_1.NotFoundError) {
            res.status(404).json({
                error: 'Consultant not found',
                message: 'The specified consultant does not exist',
                code: 'CONSULTANT_NOT_FOUND'
            });
        }
        else {
            logger_1.logger.error('Get consultant details error:', error);
            res.status(500).json({
                error: 'Failed to retrieve consultant details',
                message: 'Could not fetch consultant information',
                code: 'CONSULTANT_DETAILS_ERROR'
            });
        }
    }
};
exports.getConsultantDetails = getConsultantDetails;
/**
 * Approve or reject consultant
 * CRITICAL: This is the core admin approval functionality
 */
const approveConsultant = async (req, res) => {
    try {
        const validatedData = approveConsultantSchema.parse(req.body);
        const { consultantId, approved, adminNotes } = validatedData;
        // Find the consultant
        const consultant = await database_1.prisma.consultant.findUnique({
            where: { id: consultantId },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                isApprovedByAdmin: true,
                isActive: true
            }
        });
        if (!consultant) {
            throw new appError_1.NotFoundError('Consultant not found');
        }
        // Check if consultant is already in the desired state
        if (consultant.isApprovedByAdmin === approved) {
            throw new appError_1.ConflictError(`Consultant is already ${approved ? 'approved' : 'pending approval'}`);
        }
        // Update consultant approval status
        const updatedConsultant = await database_1.prisma.consultant.update({
            where: { id: consultantId },
            data: {
                isApprovedByAdmin: approved,
                isActive: approved, // If rejected, also deactivate
                updatedAt: new Date()
            },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                isApprovedByAdmin: true,
                isActive: true
            }
        });
        // Send appropriate email notification via Resend
        if (approved) {
            // Send approval email
            await (0, resendEmailService_1.sendConsultantApprovedEmail)({
                firstName: consultant.firstName,
                email: consultant.email,
                adminDashboardUrl: process.env.CONSULTANT_DASHBOARD_URL || 'https://dashboard.nakksha.com'
            });
        }
        else {
            // Send rejection email
            await (0, resendEmailService_1.sendConsultantRejectedEmail)({
                firstName: consultant.firstName,
                email: consultant.email,
                reason: adminNotes || 'Your application did not meet our current requirements',
                supportEmail: process.env.SUPPORT_EMAIL || 'support@nakksha.com'
            });
        }
        // Log the admin action
        logger_1.logger.logBusiness('consultant_approval_decision', {
            adminId: req.user?.id,
            consultantId,
            consultantEmail: consultant.email,
            approved,
            adminNotes,
            adminEmail: req.user?.email
        });
        // Log security event for audit
        logger_1.logger.logSecurity('consultant_approval_change', 'medium', {
            adminId: req.user?.id,
            consultantId,
            previousStatus: consultant.isApprovedByAdmin,
            newStatus: approved,
            adminNotes
        });
        res.json({
            message: `Consultant ${approved ? 'approved' : 'rejected'} successfully`,
            data: {
                consultant: {
                    id: updatedConsultant.id,
                    email: updatedConsultant.email,
                    firstName: updatedConsultant.firstName,
                    lastName: updatedConsultant.lastName,
                    isApprovedByAdmin: updatedConsultant.isApprovedByAdmin,
                    isActive: updatedConsultant.isActive,
                    status: updatedConsultant.isActive
                        ? (updatedConsultant.isApprovedByAdmin ? 'approved' : 'pending')
                        : 'rejected'
                },
                emailSent: true
            }
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            res.status(400).json({
                error: 'Validation failed',
                message: 'Invalid request data',
                details: error.errors,
                code: 'VALIDATION_ERROR'
            });
        }
        else if (error instanceof appError_1.NotFoundError || error instanceof appError_1.ConflictError) {
            const status = error instanceof appError_1.NotFoundError ? 404 : 409;
            res.status(status).json({
                error: error.name,
                message: error.message,
                code: error.errorCode
            });
        }
        else {
            logger_1.logger.error('Approve consultant error:', error);
            res.status(500).json({
                error: 'Approval failed',
                message: 'Could not process consultant approval',
                code: 'APPROVAL_ERROR'
            });
        }
    }
};
exports.approveConsultant = approveConsultant;
/**
 * Update consultant information (admin only)
 */
const updateConsultant = async (req, res) => {
    try {
        const { consultantId } = req.params;
        const validatedData = updateConsultantSchema.parse(req.body);
        const consultant = await database_1.prisma.consultant.findUnique({
            where: { id: consultantId },
            select: { id: true, email: true, firstName: true, lastName: true }
        });
        if (!consultant) {
            throw new appError_1.NotFoundError('Consultant not found');
        }
        const updatedConsultant = await database_1.prisma.consultant.update({
            where: { id: consultantId },
            data: {
                ...validatedData,
                updatedAt: new Date()
            },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                personalSessionPrice: true,
                webinarSessionPrice: true,
                consultancySector: true,
                isActive: true,
                isApprovedByAdmin: true,
                updatedAt: true
            }
        });
        logger_1.logger.logBusiness('consultant_updated_by_admin', {
            adminId: req.user?.id,
            consultantId,
            consultantEmail: consultant.email,
            changes: validatedData
        });
        res.json({
            message: 'Consultant updated successfully',
            data: {
                consultant: {
                    ...updatedConsultant,
                    personalSessionPrice: updatedConsultant.personalSessionPrice ? Number(updatedConsultant.personalSessionPrice) : null,
                    webinarSessionPrice: updatedConsultant.webinarSessionPrice ? Number(updatedConsultant.webinarSessionPrice) : null
                }
            }
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            res.status(400).json({
                error: 'Validation failed',
                message: 'Invalid request data',
                details: error.errors,
                code: 'VALIDATION_ERROR'
            });
        }
        else if (error instanceof appError_1.NotFoundError) {
            res.status(404).json({
                error: 'Consultant not found',
                message: 'The specified consultant does not exist',
                code: 'CONSULTANT_NOT_FOUND'
            });
        }
        else {
            logger_1.logger.error('Update consultant error:', error);
            res.status(500).json({
                error: 'Update failed',
                message: 'Could not update consultant information',
                code: 'UPDATE_ERROR'
            });
        }
    }
};
exports.updateConsultant = updateConsultant;
// ============================================================================
// ADMIN MANAGEMENT
// ============================================================================
/**
 * Create new admin user (Super Admin only)
 */
const createAdmin = async (req, res) => {
    try {
        const validatedData = createAdminSchema.parse(req.body);
        // Check if admin with this email already exists
        const existingAdmin = await database_1.prisma.admin.findUnique({
            where: { email: validatedData.email.toLowerCase() }
        });
        if (existingAdmin) {
            throw new appError_1.ConflictError('Admin with this email already exists');
        }
        // Hash password
        const saltRounds = 12;
        const passwordHash = await bcryptjs_1.default.hash(validatedData.password, saltRounds);
        // Create admin
        const admin = await database_1.prisma.admin.create({
            data: {
                email: validatedData.email.toLowerCase(),
                passwordHash,
                firstName: validatedData.firstName,
                lastName: validatedData.lastName,
                role: validatedData.role,
                isActive: true
            },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                isActive: true,
                createdAt: true
            }
        });
        logger_1.logger.logSecurity('admin_created', 'high', {
            createdBy: req.user?.id,
            newAdminId: admin.id,
            newAdminEmail: admin.email,
            role: admin.role
        });
        res.status(201).json({
            message: 'Admin created successfully',
            data: { admin }
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            res.status(400).json({
                error: 'Validation failed',
                message: 'Invalid request data',
                details: error.errors,
                code: 'VALIDATION_ERROR'
            });
        }
        else if (error instanceof appError_1.ConflictError) {
            res.status(409).json({
                error: 'Admin already exists',
                message: error.message,
                code: 'ADMIN_EXISTS'
            });
        }
        else {
            logger_1.logger.error('Create admin error:', error);
            res.status(500).json({
                error: 'Admin creation failed',
                message: 'Could not create admin account',
                code: 'ADMIN_CREATE_ERROR'
            });
        }
    }
};
exports.createAdmin = createAdmin;
/**
 * Get all admins (Super Admin only)
 */
const getAllAdmins = async (req, res) => {
    try {
        const admins = await database_1.prisma.admin.findMany({
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                isActive: true,
                createdAt: true,
                lastLoginAt: true
            },
            orderBy: { createdAt: 'desc' }
        });
        logger_1.logger.logBusiness('admin_list_viewed', {
            viewedBy: req.user?.id,
            count: admins.length
        });
        res.json({
            message: 'Admins retrieved successfully',
            data: { admins }
        });
    }
    catch (error) {
        logger_1.logger.error('Get all admins error:', error);
        res.status(500).json({
            error: 'Failed to retrieve admins',
            message: 'Could not fetch admin list',
            code: 'ADMINS_FETCH_ERROR'
        });
    }
};
exports.getAllAdmins = getAllAdmins;
// ============================================================================
// DASHBOARD & ANALYTICS
// ============================================================================
/**
 * Get admin dashboard overview
 */
const getAdminDashboard = async (req, res) => {
    try {
        const [totalConsultants, pendingApprovals, approvedConsultants, totalSessions, totalRevenue, recentSignups] = await Promise.all([
            // Total consultants
            database_1.prisma.consultant.count(),
            // Pending approvals
            database_1.prisma.consultant.count({
                where: {
                    isApprovedByAdmin: false,
                    isActive: true
                }
            }),
            // Approved consultants
            database_1.prisma.consultant.count({
                where: {
                    isApprovedByAdmin: true,
                    isActive: true
                }
            }),
            // Total sessions
            database_1.prisma.session.count(),
            // Total revenue
            database_1.prisma.session.aggregate({
                where: { paymentStatus: 'PAID' },
                _sum: { amount: true }
            }),
            // Recent signups (last 7 days)
            database_1.prisma.consultant.count({
                where: {
                    createdAt: {
                        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                    }
                }
            })
        ]);
        // Get recent consultant signups for review
        const recentConsultants = await database_1.prisma.consultant.findMany({
            where: {
                isApprovedByAdmin: false,
                isActive: true
            },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                consultancySector: true,
                createdAt: true
            },
            orderBy: { createdAt: 'desc' },
            take: 10
        });
        const dashboardData = {
            overview: {
                totalConsultants,
                pendingApprovals,
                approvedConsultants,
                totalSessions,
                totalRevenue: Number(totalRevenue._sum.amount || 0),
                recentSignups
            },
            recentConsultants,
            approvalRate: totalConsultants > 0 ? (approvedConsultants / totalConsultants) * 100 : 0
        };
        logger_1.logger.logBusiness('admin_dashboard_viewed', {
            adminId: req.user?.id,
            pendingApprovals,
            totalConsultants
        });
        res.json({
            message: 'Admin dashboard data retrieved successfully',
            data: dashboardData
        });
    }
    catch (error) {
        logger_1.logger.error('Get admin dashboard error:', error);
        res.status(500).json({
            error: 'Dashboard data failed',
            message: 'Could not retrieve dashboard information',
            code: 'DASHBOARD_ERROR'
        });
    }
};
exports.getAdminDashboard = getAdminDashboard;
// ============================================================================
// EMAIL TEMPLATES FOR APPROVAL/REJECTION
// ============================================================================
// These email templates should be added to the emailService.ts file:
const approvalEmailTemplates = {
    consultant_approved: (data) => ({
        subject: 'Welcome to Nakksha - Your account has been approved! 🎉',
        html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Account Approved</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { color: #4F46E5; font-size: 24px; font-weight: bold; }
          .button { display: inline-block; padding: 12px 24px; background: #10B981; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .success-card { background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">Nakksha</div>
            <h1>🎉 Congratulations!</h1>
          </div>
          
          <div class="success-card">
            <h2>Your consultant account has been approved!</h2>
            <p>You can now access your dashboard and start offering your services.</p>
          </div>
          
          <p>Hi ${data.firstName},</p>
          
          <p>Great news! Your application to join Nakksha as a consultant has been <strong>approved</strong>.</p>
          
          <p><strong>What's next?</strong></p>
          <ul>
            <li>Complete your profile setup</li>
            <li>Set your session prices and availability</li>
            <li>Start accepting client bookings</li>
            <li>Create and send quotations</li>
          </ul>
          
          <div style="text-align: center;">
            <a href="${data.loginUrl}" class="button">Access Your Dashboard</a>
          </div>
          
          <p>Welcome to the Nakksha community! We're excited to have you on board.</p>
          
          <p>Best regards,<br>The Nakksha Team</p>
        </div>
      </body>
      </html>
    `,
        text: `Hi ${data.firstName},\n\nCongratulations! Your consultant account has been approved.\n\nYou can now access your dashboard at: ${data.loginUrl}\n\nWelcome to Nakksha!\n\nBest regards,\nThe Nakksha Team`
    }),
    consultant_rejected: (data) => ({
        subject: 'Nakksha Application Update',
        html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Application Update</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { color: #4F46E5; font-size: 24px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">Nakksha</div>
            <h1>Application Update</h1>
          </div>
          
          <p>Hi ${data.firstName},</p>
          
          <p>Thank you for your interest in joining Nakksha as a consultant.</p>
          
          <p>After careful review, we're unable to approve your application at this time. ${data.reason}</p>
          
          <p>We encourage you to reapply in the future when you meet our requirements.</p>
          
          <p>If you have any questions, please contact us at ${data.supportEmail}</p>
          
          <p>Best regards,<br>The Nakksha Team</p>
        </div>
      </body>
      </html>
    `,
        text: `Hi ${data.firstName},\n\nThank you for your interest in Nakksha.\n\nWe're unable to approve your application at this time. ${data.reason}\n\nContact us: ${data.supportEmail}\n\nBest regards,\nThe Nakksha Team`
    })
};
//# sourceMappingURL=admin.controller.js.map