/**
 * File Path: apps/api/src/services/uploadService.ts
 *
 * File Upload Service
 *
 * Handles all file upload operations:
 * - Image uploads (profile photos, quotation images)
 * - Document uploads (PDFs, attachments)
 * - File validation and processing
 * - Cloud storage integration (Cloudinary)
 * - Image optimization and transformations
 * - File security and virus scanning
 */
import multer from 'multer';
/**
 * File upload interfaces
 */
interface UploadOptions {
    folder?: string;
    public_id?: string;
    transformation?: any[];
    resource_type?: 'image' | 'video' | 'raw' | 'auto';
    format?: string;
    quality?: string | number;
    width?: number;
    height?: number;
    crop?: string;
    overwrite?: boolean;
    unique_filename?: boolean;
    use_filename?: boolean;
}
interface UploadResult {
    public_id: string;
    secure_url: string;
    url: string;
    format: string;
    width?: number;
    height?: number;
    bytes: number;
    created_at: string;
    resource_type: string;
    type: string;
}
/**
 * Upload file to Cloudinary
 */
export declare const uploadToCloudinary: (fileBuffer: Buffer, options?: UploadOptions) => Promise<UploadResult>;
/**
 * Delete file from Cloudinary
 */
export declare const deleteFromCloudinary: (publicId: string) => Promise<boolean>;
/**
 * Upload profile image
 */
export declare const uploadProfileImage: (file: Express.Multer.File, userId: string) => Promise<UploadResult>;
/**
 * Upload quotation image/document
 */
export declare const uploadQuotationDocument: (file: Express.Multer.File, userId: string, quotationId: string) => Promise<UploadResult>;
/**
 * Upload conversation attachment
 */
export declare const uploadConversationAttachment: (file: Express.Multer.File, userId: string, conversationId: string) => Promise<UploadResult>;
/**
 * Upload multiple files
 */
export declare const uploadMultipleFiles: (files: Express.Multer.File[], userId: string, purpose: "attachment" | "document", contextId?: string) => Promise<UploadResult[]>;
/**
 * Create optimized image variants
 */
export declare const createImageVariants: (publicId: string, variants: Array<{
    name: string;
    width: number;
    height: number;
    quality?: string | number;
    format?: string;
}>) => Promise<Record<string, string>>;
/**
 * Get file information from Cloudinary
 */
export declare const getFileInfo: (publicId: string) => Promise<any>;
/**
 * Cleanup old temporary files
 */
export declare const cleanupTempFiles: () => Promise<void>;
/**
 * Get upload statistics
 */
export declare const getUploadStats: (userId?: string) => Promise<any>;
/**
 * Multer configuration for different upload types
 */
export declare const createMulterConfig: (purpose: "image" | "document" | "attachment", maxFiles?: number) => multer.Multer;
/**
 * Middleware for single file upload
 */
export declare const uploadSingle: (fieldName: string, purpose: "image" | "document" | "attachment") => import("express").RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
/**
 * Middleware for multiple file upload
 */
export declare const uploadMultiple: (fieldName: string, purpose: "document" | "attachment", maxFiles?: number) => import("express").RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
declare const _default: {
    uploadToCloudinary: (fileBuffer: Buffer, options?: UploadOptions) => Promise<UploadResult>;
    deleteFromCloudinary: (publicId: string) => Promise<boolean>;
    uploadProfileImage: (file: Express.Multer.File, userId: string) => Promise<UploadResult>;
    uploadQuotationDocument: (file: Express.Multer.File, userId: string, quotationId: string) => Promise<UploadResult>;
    uploadConversationAttachment: (file: Express.Multer.File, userId: string, conversationId: string) => Promise<UploadResult>;
    uploadMultipleFiles: (files: Express.Multer.File[], userId: string, purpose: "attachment" | "document", contextId?: string) => Promise<UploadResult[]>;
    createImageVariants: (publicId: string, variants: Array<{
        name: string;
        width: number;
        height: number;
        quality?: string | number;
        format?: string;
    }>) => Promise<Record<string, string>>;
    getFileInfo: (publicId: string) => Promise<any>;
    cleanupTempFiles: () => Promise<void>;
    getUploadStats: (userId?: string) => Promise<any>;
    uploadSingle: (fieldName: string, purpose: "image" | "document" | "attachment") => import("express").RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
    uploadMultiple: (fieldName: string, purpose: "document" | "attachment", maxFiles?: number) => import("express").RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
};
export default _default;
//# sourceMappingURL=uploadService.d.ts.map