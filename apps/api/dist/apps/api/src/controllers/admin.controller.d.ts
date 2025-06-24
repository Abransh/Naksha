import { Request, Response } from 'express';
/**
 * Get all consultants with approval status
 */
export declare const getAllConsultants: (req: Request, res: Response) => Promise<void>;
/**
 * Get consultant details for admin review
 */
export declare const getConsultantDetails: (req: Request, res: Response) => Promise<void>;
/**
 * Approve or reject consultant
 * CRITICAL: This is the core admin approval functionality
 */
export declare const approveConsultant: (req: Request, res: Response) => Promise<void>;
/**
 * Update consultant information (admin only)
 */
export declare const updateConsultant: (req: Request, res: Response) => Promise<void>;
/**
 * Create new admin user (Super Admin only)
 */
export declare const createAdmin: (req: Request, res: Response) => Promise<void>;
/**
 * Get all admins (Super Admin only)
 */
export declare const getAllAdmins: (req: Request, res: Response) => Promise<void>;
/**
 * Get admin dashboard overview
 */
export declare const getAdminDashboard: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=admin.controller.d.ts.map