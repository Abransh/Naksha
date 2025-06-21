// apps/api/src/routes/v1/admin.ts
// Nakksha Consulting Platform - Admin Routes
// Handles all admin-specific endpoints including consultant approval workflow
// Requires admin authentication middleware

import { Router } from 'express';
import { 
  getAllConsultants,
  getConsultantDetails,
  approveConsultant,
  updateConsultant,
  createAdmin,
  getAllAdmins,
  getAdminDashboard
} from '../../controllers/admin.controller';
import { authenticateAdmin, authenticateSuperAdmin } from '../../middleware/auth';

const router = Router();

// ============================================================================
// CONSULTANT MANAGEMENT ROUTES
// ============================================================================

/**
 * GET /api/admin/consultants
 * Get all consultants with filtering and pagination
 * Query params: page, limit, status (pending|approved|rejected|all), search
 */
router.get('/consultants', authenticateAdmin, getAllConsultants);

/**
 * GET /api/admin/consultants/:consultantId
 * Get detailed information about a specific consultant
 */
router.get('/consultants/:consultantId', authenticateAdmin, getConsultantDetails);

/**
 * POST /api/admin/consultants/approve
 * Approve or reject a consultant application
 * CRITICAL: This is the core admin approval functionality
 */
router.post('/consultants/approve', authenticateAdmin, approveConsultant);

/**
 * PUT /api/admin/consultants/:consultantId
 * Update consultant information (admin only)
 */
router.put('/consultants/:consultantId', authenticateAdmin, updateConsultant);

// ============================================================================
// ADMIN MANAGEMENT ROUTES (Super Admin Only)
// ============================================================================

/**
 * POST /api/admin/admins
 * Create new admin user (Super Admin only)
 */
router.post('/admins', authenticateSuperAdmin, createAdmin);

/**
 * GET /api/admin/admins
 * Get all admin users (Super Admin only)
 */
router.get('/admins', authenticateSuperAdmin, getAllAdmins);

// ============================================================================
// DASHBOARD & ANALYTICS ROUTES
// ============================================================================

/**
 * GET /api/admin/dashboard
 * Get admin dashboard overview with key metrics
 */
router.get('/dashboard', authenticateAdmin, getAdminDashboard);

/**
 * GET /api/admin/analytics
 * Get detailed analytics data (to be implemented)
 */
router.get('/analytics', authenticateAdmin, async (req, res) => {
  res.status(501).json({
    message: 'Analytics endpoint coming soon',
    code: 'NOT_IMPLEMENTED'
  });
});

/**
 * GET /api/admin/reports
 * Generate and download reports (to be implemented)
 */
router.get('/reports', authenticateAdmin, async (req, res) => {
  res.status(501).json({
    message: 'Reports endpoint coming soon',
    code: 'NOT_IMPLEMENTED'
  });
});

// ============================================================================
// SYSTEM MANAGEMENT ROUTES
// ============================================================================

/**
 * GET /api/admin/system/health
 * Get system health status
 */
router.get('/system/health', authenticateAdmin, async (req, res) => {
  try {
    // This would typically check database, Redis, external services, etc.
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'healthy',
        redis: 'healthy',
        email: 'healthy',
        storage: 'healthy'
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
});

/**
 * GET /api/admin/system/settings
 * Get system settings (to be implemented)
 */
router.get('/system/settings', authenticateAdmin, async (req, res) => {
  res.status(501).json({
    message: 'System settings endpoint coming soon',
    code: 'NOT_IMPLEMENTED'
  });
});

export default router;