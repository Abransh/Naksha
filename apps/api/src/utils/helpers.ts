/**
 * File Path: apps/api/src/utils/helpers.ts
 * 
 * Utility Functions and Helpers
 * 
 * Common utility functions used throughout the application:
 * - String manipulation and formatting
 * - Date and time utilities
 * - Data validation helpers
 * - Slug generation
 * - Pagination utilities
 * - Phone number formatting
 * - Email validation
 * - File size formatting
 */

import crypto from 'crypto';

/**
 * String utilities
 */
export const stringUtils = {
  /**
   * Generate URL-friendly slug from text
   */
  generateSlug: (text: string): string => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
  },

  /**
   * Capitalize first letter of each word
   */
  titleCase: (text: string): string => {
    return text.replace(/\w\S*/g, (txt) => 
      txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
  },

  /**
   * Truncate text with ellipsis
   */
  truncate: (text: string, maxLength: number, suffix = '...'): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - suffix.length) + suffix;
  },

  /**
   * Remove HTML tags from string
   */
  stripHtml: (html: string): string => {
    return html.replace(/<[^>]*>/g, '');
  },

  /**
   * Escape HTML characters
   */
  escapeHtml: (text: string): string => {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  },

  /**
   * Generate random string
   */
  randomString: (length: number): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },

  /**
   * Check if string is valid email
   */
  isValidEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  /**
   * Mask email for privacy
   */
  maskEmail: (email: string): string => {
    const [username, domain] = email.split('@');
    const maskedUsername = username.charAt(0) + '*'.repeat(username.length - 2) + username.charAt(username.length - 1);
    return `${maskedUsername}@${domain}`;
  }
};

/**
 * Date and time utilities
 */
export const dateUtils = {
  /**
   * Format date to readable string
   */
  formatDate: (date: Date, format: 'short' | 'long' | 'iso' = 'short'): string => {
    switch (format) {
      case 'short':
        return date.toLocaleDateString('en-IN');
      case 'long':
        return date.toLocaleDateString('en-IN', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      case 'iso':
        return date.toISOString().split('T')[0];
      default:
        return date.toLocaleDateString('en-IN');
    }
  },

  /**
   * Format time to readable string
   */
  formatTime: (time: string | Date): string => {
    if (typeof time === 'string') {
      return time;
    }
    return time.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  },

  /**
   * Get relative time string (e.g., "2 hours ago")
   */
  getRelativeTime: (date: Date): string => {
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInSeconds = Math.floor(diffInMs / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInSeconds < 60) return 'just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    
    return dateUtils.formatDate(date);
  },

  /**
   * Check if date is in the past
   */
  isPast: (date: Date): boolean => {
    return date.getTime() < Date.now();
  },

  /**
   * Check if date is today
   */
  isToday: (date: Date): boolean => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  },

  /**
   * Add days to date
   */
  addDays: (date: Date, days: number): Date => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  },

  /**
   * Get start and end of day
   */
  getDateRange: (date: Date): { start: Date; end: Date } => {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    
    return { start, end };
  },

  /**
   * Parse time string to minutes since midnight
   */
  timeToMinutes: (timeString: string): number => {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  },

  /**
   * Convert minutes since midnight to time string
   */
  minutesToTime: (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }
};

/**
 * Number and currency utilities
 */
export const numberUtils = {
  /**
   * Format currency (Indian Rupees)
   */
  formatCurrency: (amount: number, currency = 'INR'): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  },

  /**
   * Format number with commas
   */
  formatNumber: (num: number): string => {
    return new Intl.NumberFormat('en-IN').format(num);
  },

  /**
   * Format file size
   */
  formatFileSize: (bytes: number): string => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  },

  /**
   * Calculate percentage
   */
  calculatePercentage: (value: number, total: number): number => {
    if (total === 0) return 0;
    return Math.round((value / total) * 100 * 100) / 100; // Round to 2 decimal places
  },

  /**
   * Round to specific decimal places
   */
  roundTo: (num: number, decimals: number): number => {
    return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
  },

  /**
   * Generate random number in range
   */
  randomInRange: (min: number, max: number): number => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
};

/**
 * Phone number utilities
 */
export const phoneUtils = {
  /**
   * Format Indian phone number
   */
  formatIndianPhone: (phone: string): string => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `+91 ${cleaned.substring(0, 5)} ${cleaned.substring(5)}`;
    }
    return phone;
  },

  /**
   * Validate Indian phone number
   */
  isValidIndianPhone: (phone: string): boolean => {
    const cleaned = phone.replace(/\D/g, '');
    return /^[6-9]\d{9}$/.test(cleaned);
  },

  /**
   * Extract country code and number
   */
  parsePhone: (phone: string): { countryCode: string; number: string } => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('91') && cleaned.length === 12) {
      return { countryCode: '+91', number: cleaned.substring(2) };
    }
    if (cleaned.length === 10) {
      return { countryCode: '+91', number: cleaned };
    }
    return { countryCode: '', number: phone };
  }
};

/**
 * Validation utilities
 */
export const validationUtils = {
  /**
   * Check if value is empty
   */
  isEmpty: (value: any): boolean => {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') return value.trim().length === 0;
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return false;
  },

  /**
   * Validate Indian PAN number
   */
  isValidPAN: (pan: string): boolean => {
    return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan);
  },

  /**
   * Validate Indian Aadhaar number
   */
  isValidAadhaar: (aadhaar: string): boolean => {
    const cleaned = aadhaar.replace(/\D/g, '');
    return /^\d{12}$/.test(cleaned);
  },

  /**
   * Validate IFSC code
   */
  isValidIFSC: (ifsc: string): boolean => {
    return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc);
  },

  /**
   * Validate Indian pincode
   */
  isValidPincode: (pincode: string): boolean => {
    return /^\d{6}$/.test(pincode);
  },

  /**
   * Check if string contains only letters and spaces
   */
  isValidName: (name: string): boolean => {
    return /^[a-zA-Z\s]+$/.test(name);
  },

  /**
   * Validate URL
   */
  isValidURL: (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
};

/**
 * Pagination utilities
 */
export const paginationUtils = {
  /**
   * Calculate pagination metadata
   */
  getPaginationInfo: (page: number, limit: number, totalCount: number) => {
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;
    const startIndex = (page - 1) * limit;
    const endIndex = Math.min(startIndex + limit - 1, totalCount - 1);

    return {
      page,
      limit,
      totalCount,
      totalPages,
      hasNextPage,
      hasPrevPage,
      startIndex,
      endIndex,
      showing: `${startIndex + 1}-${endIndex + 1} of ${totalCount}`
    };
  },

  /**
   * Generate page numbers for pagination UI
   */
  getPageNumbers: (currentPage: number, totalPages: number, maxVisible = 5): number[] => {
    const pages: number[] = [];
    const half = Math.floor(maxVisible / 2);

    let start = Math.max(1, currentPage - half);
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  }
};

/**
 * Security utilities
 */
export const securityUtils = {
  /**
   * Generate secure random token
   */
  generateToken: (length = 32): string => {
    return crypto.randomBytes(length).toString('hex');
  },

  /**
   * Hash string using SHA-256
   */
  hashString: (input: string): string => {
    return crypto.createHash('sha256').update(input).digest('hex');
  },

  /**
   * Generate OTP
   */
  generateOTP: (length = 6): string => {
    const digits = '0123456789';
    let otp = '';
    for (let i = 0; i < length; i++) {
      otp += digits[Math.floor(Math.random() * digits.length)];
    }
    return otp;
  },

  /**
   * Sanitize filename for security
   */
  sanitizeFilename: (filename: string): string => {
    return filename
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_{2,}/g, '_')
      .substring(0, 255);
  },

  /**
   * Mask sensitive data
   */
  maskSensitiveData: (data: string, visibleChars = 4): string => {
    if (data.length <= visibleChars * 2) return data;
    const start = data.substring(0, visibleChars);
    const end = data.substring(data.length - visibleChars);
    const middle = '*'.repeat(data.length - visibleChars * 2);
    return start + middle + end;
  }
};

/**
 * Array utilities
 */
export const arrayUtils = {
  /**
   * Remove duplicates from array
   */
  unique: <T>(array: T[]): T[] => {
    return [...new Set(array)];
  },

  /**
   * Group array by key
   */
  groupBy: <T>(array: T[], key: keyof T): Record<string, T[]> => {
    return array.reduce((groups, item) => {
      const groupKey = String(item[key]);
      groups[groupKey] = groups[groupKey] || [];
      groups[groupKey].push(item);
      return groups;
    }, {} as Record<string, T[]>);
  },

  /**
   * Shuffle array
   */
  shuffle: <T>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  },

  /**
   * Get random item from array
   */
  randomItem: <T>(array: T[]): T | undefined => {
    return array[Math.floor(Math.random() * array.length)];
  },

  /**
   * Chunk array into smaller arrays
   */
  chunk: <T>(array: T[], size: number): T[][] => {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
};

/**
 * Object utilities
 */
export const objectUtils = {
  /**
   * Pick specific keys from object
   */
  pick: <T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> => {
    const result = {} as Pick<T, K>;
    keys.forEach(key => {
      if (key in obj) {
        result[key] = obj[key];
      }
    });
    return result;
  },

  /**
   * Omit specific keys from object
   */
  omit: <T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> => {
    const result = { ...obj };
    keys.forEach(key => delete result[key]);
    return result;
  },

  /**
   * Deep clone object
   */
  deepClone: <T>(obj: T): T => {
    return JSON.parse(JSON.stringify(obj));
  },

  /**
   * Check if object is empty
   */
  isEmpty: (obj: Record<string, any>): boolean => {
    return Object.keys(obj).length === 0;
  },

  /**
   * Flatten nested object
   */
  flatten: (obj: any, prefix = ''): Record<string, any> => {
    const flattened: Record<string, any> = {};
    
    Object.keys(obj).forEach(key => {
      const value = obj[key];
      const newKey = prefix ? `${prefix}.${key}` : key;
      
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        Object.assign(flattened, objectUtils.flatten(value, newKey));
      } else {
        flattened[newKey] = value;
      }
    });
    
    return flattened;
  }
};

/**
 * URL utilities
 */
export const urlUtils = {
  /**
   * Build query string from object
   */
  buildQueryString: (params: Record<string, any>): string => {
    const query = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        query.append(key, String(value));
      }
    });
    
    return query.toString();
  },

  /**
   * Parse query string to object
   */
  parseQueryString: (queryString: string): Record<string, string> => {
    const params = new URLSearchParams(queryString);
    const result: Record<string, string> = {};
    
    params.forEach((value, key) => {
      result[key] = value;
    });
    
    return result;
  },

  /**
   * Join URL parts
   */
  joinURL: (...parts: string[]): string => {
    return parts
      .map(part => part.replace(/^\/+|\/+$/g, ''))
      .filter(part => part.length > 0)
      .join('/');
  }
};

// Export individual utility functions for convenience
export const generateSlug = stringUtils.generateSlug;
export const formatCurrency = numberUtils.formatCurrency;
export const formatDate = dateUtils.formatDate;
export const formatTime = dateUtils.formatTime;
export const isValidEmail = stringUtils.isValidEmail;
export const isValidIndianPhone = phoneUtils.isValidIndianPhone;

// Export default object with all utilities
export default {
  string: stringUtils,
  date: dateUtils,
  number: numberUtils,
  phone: phoneUtils,
  validation: validationUtils,
  pagination: paginationUtils,
  security: securityUtils,
  array: arrayUtils,
  object: objectUtils,
  url: urlUtils
};