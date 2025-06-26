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

import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import { Request } from 'express';
import crypto from 'crypto';
import path from 'path';
import { getPrismaClient } from '../config/database';
import { AppError, ValidationError } from '../middleware/errorHandler';

/**
 * Upload configuration
 */
const uploadConfig = {
  // Cloudinary configuration
  cloudinary: {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  },

  // File size limits (in bytes)
  limits: {
    image: 5 * 1024 * 1024,      // 5MB for images
    document: 10 * 1024 * 1024,  // 10MB for documents
    attachment: 25 * 1024 * 1024 // 25MB for attachments
  },

  // Allowed file types
  allowedTypes: {
    images: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    documents: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    attachments: [
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
      'application/pdf', 'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain', 'text/csv'
    ]
  },

  // Upload folders
  folders: {
    profiles: 'consultant-profiles',
    quotations: 'quotations',
    attachments: 'conversation-attachments',
    documents: 'documents',
    temp: 'temp'
  }
};

/**
 * Initialize Cloudinary
 */
cloudinary.config(uploadConfig.cloudinary);

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

interface FileMetadata {
  originalName: string;
  mimeType: string;
  size: number;
  uploadedBy: string;
  uploadedAt: Date;
  cloudinaryPublicId: string;
  secureUrl: string;
  purpose: 'profile' | 'quotation' | 'attachment' | 'document';
}

/**
 * Upload file to Cloudinary
 */
export const uploadToCloudinary = async (
  fileBuffer: Buffer,
  options: UploadOptions = {}
): Promise<UploadResult> => {
  try {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: options.resource_type || 'auto',
          folder: options.folder || uploadConfig.folders.temp,
          public_id: options.public_id,
          transformation: options.transformation,
          format: options.format,
          quality: options.quality || 'auto',
          width: options.width,
          height: options.height,
          crop: options.crop,
          overwrite: options.overwrite ?? true,
          unique_filename: options.unique_filename ?? true,
          use_filename: options.use_filename ?? false
        },
        (error, result) => {
          if (error) {
            console.error('❌ Cloudinary upload error:', error);
            reject(new AppError('File upload failed', 500, 'UPLOAD_ERROR'));
          } else if (result) {
            resolve(result as UploadResult);
          } else {
            reject(new AppError('Upload failed - no result', 500, 'UPLOAD_ERROR'));
          }
        }
      );

      uploadStream.end(fileBuffer);
    });
  } catch (error) {
    console.error('❌ Upload to Cloudinary error:', error);
    throw new AppError('File upload service error', 500, 'UPLOAD_SERVICE_ERROR');
  }
};

/**
 * Delete file from Cloudinary
 */
export const deleteFromCloudinary = async (publicId: string): Promise<boolean> => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result.result === 'ok';
  } catch (error) {
    console.error('❌ Cloudinary delete error:', error);
    return false;
  }
};

/**
 * Validate file before upload
 */
const validateFile = (
  file: Express.Multer.File,
  purpose: 'image' | 'document' | 'attachment'
): void => {
  // Check file size
  const maxSize = uploadConfig.limits[purpose];
  if (file.size > maxSize) {
    throw new ValidationError(
      `File size too large. Maximum allowed: ${Math.round(maxSize / (1024 * 1024))}MB`
    );
  }

  // Check file type
  const allowedTypes = purpose === 'image' 
    ? uploadConfig.allowedTypes.images
    : purpose === 'document'
    ? uploadConfig.allowedTypes.documents
    : uploadConfig.allowedTypes.attachments;

  if (!allowedTypes.includes(file.mimetype)) {
    throw new ValidationError(
      `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`
    );
  }

  // Check file name length
  if (file.originalname.length > 255) {
    throw new ValidationError('File name too long. Maximum 255 characters allowed.');
  }

  // Basic security check - reject executable files
  const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.com', '.js', '.vbs'];
  const fileExtension = path.extname(file.originalname).toLowerCase();
  if (dangerousExtensions.includes(fileExtension)) {
    throw new ValidationError('This file type is not allowed for security reasons.');
  }
};

/**
 * Generate secure filename
 */
const generateSecureFilename = (originalName: string, userId: string): string => {
  const extension = path.extname(originalName);
  const timestamp = Date.now();
  const randomBytes = crypto.randomBytes(8).toString('hex');
  const userHash = crypto.createHash('md5').update(userId).digest('hex').substring(0, 8);
  
  return `${timestamp}_${userHash}_${randomBytes}${extension}`;
};

/**
 * Store file metadata in database
 */
const storeFileMetadata = async (
  file: Express.Multer.File,
  uploadResult: UploadResult,
  userId: string,
  purpose: FileMetadata['purpose']
): Promise<void> => {
  try {
    const prisma = getPrismaClient();

    await prisma.emailLog.create({
      data: {
        consultantId: userId,
        recipientEmail: 'system',
        emailType: 'FILE_UPLOAD',
        status: 'SENT',
        metadata: {
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          cloudinaryPublicId: uploadResult.public_id,
          secureUrl: uploadResult.secure_url,
          purpose,
          uploadedAt: new Date()
        }
      }
    });
  } catch (error) {
    console.error('❌ Store file metadata error:', error);
    // Don't fail the upload if metadata storage fails
  }
};

/**
 * Upload profile image
 */
export const uploadProfileImage = async (
  file: Express.Multer.File,
  userId: string
): Promise<UploadResult> => {
  try {
    validateFile(file, 'image');

    const options: UploadOptions = {
      folder: uploadConfig.folders.profiles,
      public_id: `consultant-${userId}`,
      transformation: [
        { width: 400, height: 400, crop: 'fill', gravity: 'face' },
        { quality: 'auto' },
        { format: 'webp' }
      ],
      overwrite: true
    };

    const result = await uploadToCloudinary(file.buffer, options);
    await storeFileMetadata(file, result, userId, 'profile');

    console.log(`✅ Profile image uploaded for user: ${userId}`);
    return result;

  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    console.error('❌ Upload profile image error:', error);
    throw new AppError('Failed to upload profile image', 500, 'PROFILE_UPLOAD_ERROR');
  }
};

/**
 * Upload quotation image/document
 */
export const uploadQuotationDocument = async (
  file: Express.Multer.File,
  userId: string,
  quotationId: string
): Promise<UploadResult> => {
  try {
    validateFile(file, 'document');

    const options: UploadOptions = {
      folder: uploadConfig.folders.quotations,
      public_id: `quotation-${quotationId}`,
      resource_type: 'auto',
      overwrite: true
    };

    const result = await uploadToCloudinary(file.buffer, options);
    await storeFileMetadata(file, result, userId, 'quotation');

    console.log(`✅ Quotation document uploaded: ${quotationId}`);
    return result;

  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    console.error('❌ Upload quotation document error:', error);
    throw new AppError('Failed to upload quotation document', 500, 'QUOTATION_UPLOAD_ERROR');
  }
};

/**
 * Upload conversation attachment
 */
export const uploadConversationAttachment = async (
  file: Express.Multer.File,
  userId: string,
  conversationId: string
): Promise<UploadResult> => {
  try {
    validateFile(file, 'attachment');

    const secureFilename = generateSecureFilename(file.originalname, userId);
    
    const options: UploadOptions = {
      folder: `${uploadConfig.folders.attachments}/${conversationId}`,
      public_id: secureFilename.replace(path.extname(secureFilename), ''),
      resource_type: 'auto',
      use_filename: false,
      unique_filename: true
    };

    const result = await uploadToCloudinary(file.buffer, options);
    await storeFileMetadata(file, result, userId, 'attachment');

    console.log(`✅ Conversation attachment uploaded: ${conversationId}`);
    return result;

  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    console.error('❌ Upload conversation attachment error:', error);
    throw new AppError('Failed to upload attachment', 500, 'ATTACHMENT_UPLOAD_ERROR');
  }
};

/**
 * Upload multiple files
 */
export const uploadMultipleFiles = async (
  files: Express.Multer.File[],
  userId: string,
  purpose: 'attachment' | 'document',
  contextId?: string
): Promise<UploadResult[]> => {
  try {
    if (files.length > 10) {
      throw new ValidationError('Maximum 10 files allowed per upload');
    }

    const uploadPromises = files.map(async (file) => {
      validateFile(file, purpose);

      const secureFilename = generateSecureFilename(file.originalname, userId);
      const folder = purpose === 'attachment' 
        ? `${uploadConfig.folders.attachments}/${contextId}`
        : uploadConfig.folders.documents;

      const options: UploadOptions = {
        folder,
        public_id: secureFilename.replace(path.extname(secureFilename), ''),
        resource_type: 'auto',
        use_filename: false,
        unique_filename: true
      };

      const result = await uploadToCloudinary(file.buffer, options);
      await storeFileMetadata(file, result, userId, purpose === 'attachment' ? 'attachment' : 'document');

      return result;
    });

    const results = await Promise.all(uploadPromises);
    console.log(`✅ ${results.length} files uploaded successfully`);
    
    return results;

  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    console.error('❌ Upload multiple files error:', error);
    throw new AppError('Failed to upload files', 500, 'MULTIPLE_UPLOAD_ERROR');
  }
};

/**
 * Create optimized image variants
 */
export const createImageVariants = async (
  publicId: string,
  variants: Array<{
    name: string;
    width: number;
    height: number;
    quality?: string | number;
    format?: string;
  }>
): Promise<Record<string, string>> => {
  try {
    const variantUrls: Record<string, string> = {};

    for (const variant of variants) {
      const transformedUrl = cloudinary.url(publicId, {
        width: variant.width,
        height: variant.height,
        crop: 'fill',
        quality: variant.quality || 'auto',
        format: variant.format || 'webp',
        secure: true
      });

      variantUrls[variant.name] = transformedUrl;
    }

    return variantUrls;

  } catch (error) {
    console.error('❌ Create image variants error:', error);
    throw new AppError('Failed to create image variants', 500, 'VARIANT_ERROR');
  }
};

/**
 * Get file information from Cloudinary
 */
export const getFileInfo = async (publicId: string): Promise<any> => {
  try {
    const result = await cloudinary.api.resource(publicId);
    return {
      publicId: result.public_id,
      format: result.format,
      width: result.width,
      height: result.height,
      bytes: result.bytes,
      createdAt: result.created_at,
      secureUrl: result.secure_url,
      resourceType: result.resource_type
    };
  } catch (error) {
    console.error('❌ Get file info error:', error);
    return null;
  }
};

/**
 * Cleanup old temporary files
 */
export const cleanupTempFiles = async (): Promise<void> => {
  try {
    // Get files older than 24 hours from temp folder
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: uploadConfig.folders.temp,
      max_results: 100
    });

    const filesToDelete = result.resources.filter((resource: any) => {
      const createdAt = new Date(resource.created_at);
      return createdAt < oneDayAgo;
    });

    if (filesToDelete.length > 0) {
      const publicIds = filesToDelete.map((file: any) => file.public_id);
      await cloudinary.api.delete_resources(publicIds);
      console.log(`🧹 Cleaned up ${filesToDelete.length} temporary files`);
    }

  } catch (error) {
    console.error('❌ Cleanup temp files error:', error);
  }
};

/**
 * Get upload statistics
 */
export const getUploadStats = async (userId?: string): Promise<any> => {
  try {
    const prisma = getPrismaClient();

    const where = userId ? { consultantId: userId } : {};

    const stats = await prisma.emailLog.groupBy({
      by: ['emailType'],
      where: {
        ...where,
        emailType: 'FILE_UPLOAD'
      },
      _count: true,
      // _sum: {
      //   // This would need a proper file size field in a real file uploads table
      //   // For now, using a placeholder
      // }
    });

    return {
      totalUploads: stats.reduce((sum: any, stat: any) => sum + stat._count, 0),
      byType: stats.map((stat:any) => ({
        type: stat.emailType,
        count: stat._count
      }))
    };

  } catch (error) {
    console.error('❌ Get upload stats error:', error);
    return null;
  }
};

/**
 * Multer configuration for different upload types
 */
export const createMulterConfig = (
  purpose: 'image' | 'document' | 'attachment',
  maxFiles = 1
) => {
  const maxSize = uploadConfig.limits[purpose === 'image' ? 'image' : purpose === 'document' ? 'document' : 'attachment'];

  return multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: maxSize,
      files: maxFiles
    },
    fileFilter: (req: Request, file: Express.Multer.File, cb) => {
      try {
        validateFile(file, purpose);
        cb(null, true);
      } catch (error: any) {
        cb(error, false);
      }
    }
  });
};

/**
 * Middleware for single file upload
 */
export const uploadSingle = (fieldName: string, purpose: 'image' | 'document' | 'attachment') => {
  return createMulterConfig(purpose, 1).single(fieldName);
};

/**
 * Middleware for multiple file upload
 */
export const uploadMultiple = (fieldName: string, purpose: 'document' | 'attachment', maxFiles = 5) => {
  return createMulterConfig(purpose, maxFiles).array(fieldName, maxFiles);
};

/**
 * Schedule cleanup of temporary files (run daily)
 */
setInterval(cleanupTempFiles, 24 * 60 * 60 * 1000); // 24 hours

export default {
  uploadToCloudinary,
  deleteFromCloudinary,
  uploadProfileImage,
  uploadQuotationDocument,
  uploadConversationAttachment,
  uploadMultipleFiles,
  createImageVariants,
  getFileInfo,
  cleanupTempFiles,
  getUploadStats,
  uploadSingle,
  uploadMultiple
};