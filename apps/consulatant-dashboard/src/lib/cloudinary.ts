/**
 * Cloudinary Upload Service
 * Handles image uploads to Cloudinary for profile photos
 */

const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = 'consultant_profiles'; // You may need to create this preset in Cloudinary

export interface CloudinaryUploadResponse {
  secure_url: string;
  public_id: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

export class CloudinaryUploadError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = 'CloudinaryUploadError';
  }
}

/**
 * Upload image to Cloudinary
 */
export async function uploadToCloudinary(file: File): Promise<CloudinaryUploadResponse> {
  if (!CLOUDINARY_CLOUD_NAME) {
    throw new CloudinaryUploadError('Cloudinary cloud name not configured');
  }

  // Validate file type
  if (!file.type.startsWith('image/')) {
    throw new CloudinaryUploadError('Only image files are allowed');
  }

  // Validate file size (max 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    throw new CloudinaryUploadError('File size must be less than 10MB');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', 'consultant-profiles');
  
  // Add transformation for profile photos
  formData.append('transformation', JSON.stringify([
    { width: 400, height: 400, crop: 'fill', gravity: 'face' },
    { quality: 'auto', fetch_format: 'auto' }
  ]));

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new CloudinaryUploadError(
        errorData.error?.message || 'Failed to upload image',
        response.status
      );
    }

    const data: CloudinaryUploadResponse = await response.json();
    return data;
  } catch (error) {
    if (error instanceof CloudinaryUploadError) {
      throw error;
    }
    throw new CloudinaryUploadError('Network error during upload');
  }
}

/**
 * Delete image from Cloudinary
 */
export async function deleteFromCloudinary(publicId: string): Promise<void> {
  if (!CLOUDINARY_CLOUD_NAME) {
    throw new CloudinaryUploadError('Cloudinary cloud name not configured');
  }

  // Note: Deletion requires server-side implementation with API secret
  // This is a placeholder for the API call
  console.log('Delete public ID:', publicId);
}

/**
 * Get optimized image URL from Cloudinary
 */
export function getOptimizedImageUrl(
  publicId: string, 
  options: {
    width?: number;
    height?: number;
    quality?: string;
    format?: string;
  } = {}
): string {
  if (!CLOUDINARY_CLOUD_NAME) {
    return '';
  }

  const { width = 400, height = 400, quality = 'auto', format = 'auto' } = options;
  
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/w_${width},h_${height},c_fill,g_face,q_${quality},f_${format}/${publicId}`;
}