/**
 * Cloudinary Upload Service
 * Handles image uploads to Cloudinary for profile photos
 */

const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'ml_default'; // Fallback to default preset



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
 * Upload image to Cloudinary without upload preset (for debugging)
 */
export async function uploadToCloudinarySimple(file: File): Promise<CloudinaryUploadResponse> {
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
  formData.append('upload_preset', UPLOAD_PRESET); // Upload preset is required for unsigned uploads
  
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
      console.error('Cloudinary error details:', errorData);
      
      let errorMessage = 'Failed to upload image';
      if (errorData.error?.message) {
        errorMessage = errorData.error.message;
        
        // Provide specific guidance for common errors
        if (errorData.error.message.includes('Upload preset')) {
          errorMessage = `Upload preset "${UPLOAD_PRESET}" not found. Please create it in your Cloudinary dashboard or set NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET environment variable.`;
        }
      }
      
      throw new CloudinaryUploadError(errorMessage, response.status);
    }

    const data: CloudinaryUploadResponse = await response.json();
    return data;
  } catch (error) {
    if (error instanceof CloudinaryUploadError) {
      throw error;
    }
    console.error('Network error during upload:', error);
    throw new CloudinaryUploadError('Network error during upload');
  }
}

/**
 * Upload image to Cloudinary with upload preset
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
  
  // Add transformation for profile photos (simplified)
  //formData.append('transformation', 'w_400,h_400,c_fill,g_face');

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
      console.error('Cloudinary error details:', errorData);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to upload image';
      if (errorData.error?.message) {
        errorMessage = errorData.error.message;
        
        // Provide specific guidance for common errors
        if (errorData.error.message.includes('Upload preset')) {
          errorMessage = `Upload preset "${UPLOAD_PRESET}" not found. Please create it in your Cloudinary dashboard or set NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET environment variable.`;
        }
      } else if (response.status === 400) {
        errorMessage = 'Invalid upload parameters. Check if upload preset exists and is configured correctly.';
      }
      
      throw new CloudinaryUploadError(errorMessage, response.status);
    }

    const data: CloudinaryUploadResponse = await response.json();
    return data;
  } catch (error) {
    if (error instanceof CloudinaryUploadError) {
      throw error;
    }
    console.error('Network error during upload:', error);
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