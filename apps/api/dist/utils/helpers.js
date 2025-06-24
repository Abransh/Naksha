"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidIndianPhone = exports.isValidEmail = exports.formatTime = exports.formatDate = exports.formatCurrency = exports.generateSlug = exports.urlUtils = exports.objectUtils = exports.arrayUtils = exports.securityUtils = exports.paginationUtils = exports.validationUtils = exports.phoneUtils = exports.numberUtils = exports.dateUtils = exports.stringUtils = void 0;
const crypto_1 = __importDefault(require("crypto"));
/**
 * String utilities
 */
exports.stringUtils = {
    /**
     * Generate URL-friendly slug from text
     */
    generateSlug: (text) => {
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
    titleCase: (text) => {
        return text.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
    },
    /**
     * Truncate text with ellipsis
     */
    truncate: (text, maxLength, suffix = '...') => {
        if (text.length <= maxLength)
            return text;
        return text.substring(0, maxLength - suffix.length) + suffix;
    },
    /**
     * Remove HTML tags from string
     */
    stripHtml: (html) => {
        return html.replace(/<[^>]*>/g, '');
    },
    /**
     * Escape HTML characters
     */
    escapeHtml: (text) => {
        const map = {
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
    randomString: (length) => {
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
    isValidEmail: (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },
    /**
     * Mask email for privacy
     */
    maskEmail: (email) => {
        const [username, domain] = email.split('@');
        const maskedUsername = username.charAt(0) + '*'.repeat(username.length - 2) + username.charAt(username.length - 1);
        return `${maskedUsername}@${domain}`;
    }
};
/**
 * Date and time utilities
 */
exports.dateUtils = {
    /**
     * Format date to readable string
     */
    formatDate: (date, format = 'short') => {
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
    formatTime: (time) => {
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
    getRelativeTime: (date) => {
        const now = new Date();
        const diffInMs = now.getTime() - date.getTime();
        const diffInSeconds = Math.floor(diffInMs / 1000);
        const diffInMinutes = Math.floor(diffInSeconds / 60);
        const diffInHours = Math.floor(diffInMinutes / 60);
        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInSeconds < 60)
            return 'just now';
        if (diffInMinutes < 60)
            return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
        if (diffInHours < 24)
            return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
        if (diffInDays < 7)
            return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
        return exports.dateUtils.formatDate(date);
    },
    /**
     * Check if date is in the past
     */
    isPast: (date) => {
        return date.getTime() < Date.now();
    },
    /**
     * Check if date is today
     */
    isToday: (date) => {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    },
    /**
     * Add days to date
     */
    addDays: (date, days) => {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    },
    /**
     * Get start and end of day
     */
    getDateRange: (date) => {
        const start = new Date(date);
        start.setHours(0, 0, 0, 0);
        const end = new Date(date);
        end.setHours(23, 59, 59, 999);
        return { start, end };
    },
    /**
     * Parse time string to minutes since midnight
     */
    timeToMinutes: (timeString) => {
        const [hours, minutes] = timeString.split(':').map(Number);
        return hours * 60 + minutes;
    },
    /**
     * Convert minutes since midnight to time string
     */
    minutesToTime: (minutes) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    }
};
/**
 * Number and currency utilities
 */
exports.numberUtils = {
    /**
     * Format currency (Indian Rupees)
     */
    formatCurrency: (amount, currency = 'INR') => {
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
    formatNumber: (num) => {
        return new Intl.NumberFormat('en-IN').format(num);
    },
    /**
     * Format file size
     */
    formatFileSize: (bytes) => {
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        if (bytes === 0)
            return '0 Bytes';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    },
    /**
     * Calculate percentage
     */
    calculatePercentage: (value, total) => {
        if (total === 0)
            return 0;
        return Math.round((value / total) * 100 * 100) / 100; // Round to 2 decimal places
    },
    /**
     * Round to specific decimal places
     */
    roundTo: (num, decimals) => {
        return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
    },
    /**
     * Generate random number in range
     */
    randomInRange: (min, max) => {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
};
/**
 * Phone number utilities
 */
exports.phoneUtils = {
    /**
     * Format Indian phone number
     */
    formatIndianPhone: (phone) => {
        const cleaned = phone.replace(/\D/g, '');
        if (cleaned.length === 10) {
            return `+91 ${cleaned.substring(0, 5)} ${cleaned.substring(5)}`;
        }
        return phone;
    },
    /**
     * Validate Indian phone number
     */
    isValidIndianPhone: (phone) => {
        const cleaned = phone.replace(/\D/g, '');
        return /^[6-9]\d{9}$/.test(cleaned);
    },
    /**
     * Extract country code and number
     */
    parsePhone: (phone) => {
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
exports.validationUtils = {
    /**
     * Check if value is empty
     */
    isEmpty: (value) => {
        if (value === null || value === undefined)
            return true;
        if (typeof value === 'string')
            return value.trim().length === 0;
        if (Array.isArray(value))
            return value.length === 0;
        if (typeof value === 'object')
            return Object.keys(value).length === 0;
        return false;
    },
    /**
     * Validate Indian PAN number
     */
    isValidPAN: (pan) => {
        return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan);
    },
    /**
     * Validate Indian Aadhaar number
     */
    isValidAadhaar: (aadhaar) => {
        const cleaned = aadhaar.replace(/\D/g, '');
        return /^\d{12}$/.test(cleaned);
    },
    /**
     * Validate IFSC code
     */
    isValidIFSC: (ifsc) => {
        return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc);
    },
    /**
     * Validate Indian pincode
     */
    isValidPincode: (pincode) => {
        return /^\d{6}$/.test(pincode);
    },
    /**
     * Check if string contains only letters and spaces
     */
    isValidName: (name) => {
        return /^[a-zA-Z\s]+$/.test(name);
    },
    /**
     * Validate URL
     */
    isValidURL: (url) => {
        try {
            new URL(url);
            return true;
        }
        catch {
            return false;
        }
    }
};
/**
 * Pagination utilities
 */
exports.paginationUtils = {
    /**
     * Calculate pagination metadata
     */
    getPaginationInfo: (page, limit, totalCount) => {
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
    getPageNumbers: (currentPage, totalPages, maxVisible = 5) => {
        const pages = [];
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
exports.securityUtils = {
    /**
     * Generate secure random token
     */
    generateToken: (length = 32) => {
        return crypto_1.default.randomBytes(length).toString('hex');
    },
    /**
     * Hash string using SHA-256
     */
    hashString: (input) => {
        return crypto_1.default.createHash('sha256').update(input).digest('hex');
    },
    /**
     * Generate OTP
     */
    generateOTP: (length = 6) => {
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
    sanitizeFilename: (filename) => {
        return filename
            .replace(/[^a-zA-Z0-9.-]/g, '_')
            .replace(/_{2,}/g, '_')
            .substring(0, 255);
    },
    /**
     * Mask sensitive data
     */
    maskSensitiveData: (data, visibleChars = 4) => {
        if (data.length <= visibleChars * 2)
            return data;
        const start = data.substring(0, visibleChars);
        const end = data.substring(data.length - visibleChars);
        const middle = '*'.repeat(data.length - visibleChars * 2);
        return start + middle + end;
    }
};
/**
 * Array utilities
 */
exports.arrayUtils = {
    /**
     * Remove duplicates from array
     */
    unique: (array) => {
        return [...new Set(array)];
    },
    /**
     * Group array by key
     */
    groupBy: (array, key) => {
        return array.reduce((groups, item) => {
            const groupKey = String(item[key]);
            groups[groupKey] = groups[groupKey] || [];
            groups[groupKey].push(item);
            return groups;
        }, {});
    },
    /**
     * Shuffle array
     */
    shuffle: (array) => {
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
    randomItem: (array) => {
        return array[Math.floor(Math.random() * array.length)];
    },
    /**
     * Chunk array into smaller arrays
     */
    chunk: (array, size) => {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }
};
/**
 * Object utilities
 */
exports.objectUtils = {
    /**
     * Pick specific keys from object
     */
    pick: (obj, keys) => {
        const result = {};
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
    omit: (obj, keys) => {
        const result = { ...obj };
        keys.forEach(key => delete result[key]);
        return result;
    },
    /**
     * Deep clone object
     */
    deepClone: (obj) => {
        return JSON.parse(JSON.stringify(obj));
    },
    /**
     * Check if object is empty
     */
    isEmpty: (obj) => {
        return Object.keys(obj).length === 0;
    },
    /**
     * Flatten nested object
     */
    flatten: (obj, prefix = '') => {
        const flattened = {};
        Object.keys(obj).forEach(key => {
            const value = obj[key];
            const newKey = prefix ? `${prefix}.${key}` : key;
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                Object.assign(flattened, exports.objectUtils.flatten(value, newKey));
            }
            else {
                flattened[newKey] = value;
            }
        });
        return flattened;
    }
};
/**
 * URL utilities
 */
exports.urlUtils = {
    /**
     * Build query string from object
     */
    buildQueryString: (params) => {
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
    parseQueryString: (queryString) => {
        const params = new URLSearchParams(queryString);
        const result = {};
        params.forEach((value, key) => {
            result[key] = value;
        });
        return result;
    },
    /**
     * Join URL parts
     */
    joinURL: (...parts) => {
        return parts
            .map(part => part.replace(/^\/+|\/+$/g, ''))
            .filter(part => part.length > 0)
            .join('/');
    }
};
// Export individual utility functions for convenience
exports.generateSlug = exports.stringUtils.generateSlug;
exports.formatCurrency = exports.numberUtils.formatCurrency;
exports.formatDate = exports.dateUtils.formatDate;
exports.formatTime = exports.dateUtils.formatTime;
exports.isValidEmail = exports.stringUtils.isValidEmail;
exports.isValidIndianPhone = exports.phoneUtils.isValidIndianPhone;
// Export default object with all utilities
exports.default = {
    string: exports.stringUtils,
    date: exports.dateUtils,
    number: exports.numberUtils,
    phone: exports.phoneUtils,
    validation: exports.validationUtils,
    pagination: exports.paginationUtils,
    security: exports.securityUtils,
    array: exports.arrayUtils,
    object: exports.objectUtils,
    url: exports.urlUtils
};
//# sourceMappingURL=helpers.js.map