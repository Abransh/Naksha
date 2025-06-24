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
/**
 * String utilities
 */
export declare const stringUtils: {
    /**
     * Generate URL-friendly slug from text
     */
    generateSlug: (text: string) => string;
    /**
     * Capitalize first letter of each word
     */
    titleCase: (text: string) => string;
    /**
     * Truncate text with ellipsis
     */
    truncate: (text: string, maxLength: number, suffix?: string) => string;
    /**
     * Remove HTML tags from string
     */
    stripHtml: (html: string) => string;
    /**
     * Escape HTML characters
     */
    escapeHtml: (text: string) => string;
    /**
     * Generate random string
     */
    randomString: (length: number) => string;
    /**
     * Check if string is valid email
     */
    isValidEmail: (email: string) => boolean;
    /**
     * Mask email for privacy
     */
    maskEmail: (email: string) => string;
};
/**
 * Date and time utilities
 */
export declare const dateUtils: {
    /**
     * Format date to readable string
     */
    formatDate: (date: Date, format?: "short" | "long" | "iso") => string;
    /**
     * Format time to readable string
     */
    formatTime: (time: string | Date) => string;
    /**
     * Get relative time string (e.g., "2 hours ago")
     */
    getRelativeTime: (date: Date) => string;
    /**
     * Check if date is in the past
     */
    isPast: (date: Date) => boolean;
    /**
     * Check if date is today
     */
    isToday: (date: Date) => boolean;
    /**
     * Add days to date
     */
    addDays: (date: Date, days: number) => Date;
    /**
     * Get start and end of day
     */
    getDateRange: (date: Date) => {
        start: Date;
        end: Date;
    };
    /**
     * Parse time string to minutes since midnight
     */
    timeToMinutes: (timeString: string) => number;
    /**
     * Convert minutes since midnight to time string
     */
    minutesToTime: (minutes: number) => string;
};
/**
 * Number and currency utilities
 */
export declare const numberUtils: {
    /**
     * Format currency (Indian Rupees)
     */
    formatCurrency: (amount: number, currency?: string) => string;
    /**
     * Format number with commas
     */
    formatNumber: (num: number) => string;
    /**
     * Format file size
     */
    formatFileSize: (bytes: number) => string;
    /**
     * Calculate percentage
     */
    calculatePercentage: (value: number, total: number) => number;
    /**
     * Round to specific decimal places
     */
    roundTo: (num: number, decimals: number) => number;
    /**
     * Generate random number in range
     */
    randomInRange: (min: number, max: number) => number;
};
/**
 * Phone number utilities
 */
export declare const phoneUtils: {
    /**
     * Format Indian phone number
     */
    formatIndianPhone: (phone: string) => string;
    /**
     * Validate Indian phone number
     */
    isValidIndianPhone: (phone: string) => boolean;
    /**
     * Extract country code and number
     */
    parsePhone: (phone: string) => {
        countryCode: string;
        number: string;
    };
};
/**
 * Validation utilities
 */
export declare const validationUtils: {
    /**
     * Check if value is empty
     */
    isEmpty: (value: any) => boolean;
    /**
     * Validate Indian PAN number
     */
    isValidPAN: (pan: string) => boolean;
    /**
     * Validate Indian Aadhaar number
     */
    isValidAadhaar: (aadhaar: string) => boolean;
    /**
     * Validate IFSC code
     */
    isValidIFSC: (ifsc: string) => boolean;
    /**
     * Validate Indian pincode
     */
    isValidPincode: (pincode: string) => boolean;
    /**
     * Check if string contains only letters and spaces
     */
    isValidName: (name: string) => boolean;
    /**
     * Validate URL
     */
    isValidURL: (url: string) => boolean;
};
/**
 * Pagination utilities
 */
export declare const paginationUtils: {
    /**
     * Calculate pagination metadata
     */
    getPaginationInfo: (page: number, limit: number, totalCount: number) => {
        page: number;
        limit: number;
        totalCount: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
        startIndex: number;
        endIndex: number;
        showing: string;
    };
    /**
     * Generate page numbers for pagination UI
     */
    getPageNumbers: (currentPage: number, totalPages: number, maxVisible?: number) => number[];
};
/**
 * Security utilities
 */
export declare const securityUtils: {
    /**
     * Generate secure random token
     */
    generateToken: (length?: number) => string;
    /**
     * Hash string using SHA-256
     */
    hashString: (input: string) => string;
    /**
     * Generate OTP
     */
    generateOTP: (length?: number) => string;
    /**
     * Sanitize filename for security
     */
    sanitizeFilename: (filename: string) => string;
    /**
     * Mask sensitive data
     */
    maskSensitiveData: (data: string, visibleChars?: number) => string;
};
/**
 * Array utilities
 */
export declare const arrayUtils: {
    /**
     * Remove duplicates from array
     */
    unique: <T>(array: T[]) => T[];
    /**
     * Group array by key
     */
    groupBy: <T>(array: T[], key: keyof T) => Record<string, T[]>;
    /**
     * Shuffle array
     */
    shuffle: <T>(array: T[]) => T[];
    /**
     * Get random item from array
     */
    randomItem: <T>(array: T[]) => T | undefined;
    /**
     * Chunk array into smaller arrays
     */
    chunk: <T>(array: T[], size: number) => T[][];
};
/**
 * Object utilities
 */
export declare const objectUtils: {
    /**
     * Pick specific keys from object
     */
    pick: <T extends object, K extends keyof T>(obj: T, keys: K[]) => Pick<T, K>;
    /**
     * Omit specific keys from object
     */
    omit: <T extends object, K extends keyof T>(obj: T, keys: K[]) => Omit<T, K>;
    /**
     * Deep clone object
     */
    deepClone: <T>(obj: T) => T;
    /**
     * Check if object is empty
     */
    isEmpty: (obj: Record<string, any>) => boolean;
    /**
     * Flatten nested object
     */
    flatten: (obj: any, prefix?: string) => Record<string, any>;
};
/**
 * URL utilities
 */
export declare const urlUtils: {
    /**
     * Build query string from object
     */
    buildQueryString: (params: Record<string, any>) => string;
    /**
     * Parse query string to object
     */
    parseQueryString: (queryString: string) => Record<string, string>;
    /**
     * Join URL parts
     */
    joinURL: (...parts: string[]) => string;
};
export declare const generateSlug: (text: string) => string;
export declare const formatCurrency: (amount: number, currency?: string) => string;
export declare const formatDate: (date: Date, format?: "short" | "long" | "iso") => string;
export declare const formatTime: (time: string | Date) => string;
export declare const isValidEmail: (email: string) => boolean;
export declare const isValidIndianPhone: (phone: string) => boolean;
declare const _default: {
    string: {
        /**
         * Generate URL-friendly slug from text
         */
        generateSlug: (text: string) => string;
        /**
         * Capitalize first letter of each word
         */
        titleCase: (text: string) => string;
        /**
         * Truncate text with ellipsis
         */
        truncate: (text: string, maxLength: number, suffix?: string) => string;
        /**
         * Remove HTML tags from string
         */
        stripHtml: (html: string) => string;
        /**
         * Escape HTML characters
         */
        escapeHtml: (text: string) => string;
        /**
         * Generate random string
         */
        randomString: (length: number) => string;
        /**
         * Check if string is valid email
         */
        isValidEmail: (email: string) => boolean;
        /**
         * Mask email for privacy
         */
        maskEmail: (email: string) => string;
    };
    date: {
        /**
         * Format date to readable string
         */
        formatDate: (date: Date, format?: "short" | "long" | "iso") => string;
        /**
         * Format time to readable string
         */
        formatTime: (time: string | Date) => string;
        /**
         * Get relative time string (e.g., "2 hours ago")
         */
        getRelativeTime: (date: Date) => string;
        /**
         * Check if date is in the past
         */
        isPast: (date: Date) => boolean;
        /**
         * Check if date is today
         */
        isToday: (date: Date) => boolean;
        /**
         * Add days to date
         */
        addDays: (date: Date, days: number) => Date;
        /**
         * Get start and end of day
         */
        getDateRange: (date: Date) => {
            start: Date;
            end: Date;
        };
        /**
         * Parse time string to minutes since midnight
         */
        timeToMinutes: (timeString: string) => number;
        /**
         * Convert minutes since midnight to time string
         */
        minutesToTime: (minutes: number) => string;
    };
    number: {
        /**
         * Format currency (Indian Rupees)
         */
        formatCurrency: (amount: number, currency?: string) => string;
        /**
         * Format number with commas
         */
        formatNumber: (num: number) => string;
        /**
         * Format file size
         */
        formatFileSize: (bytes: number) => string;
        /**
         * Calculate percentage
         */
        calculatePercentage: (value: number, total: number) => number;
        /**
         * Round to specific decimal places
         */
        roundTo: (num: number, decimals: number) => number;
        /**
         * Generate random number in range
         */
        randomInRange: (min: number, max: number) => number;
    };
    phone: {
        /**
         * Format Indian phone number
         */
        formatIndianPhone: (phone: string) => string;
        /**
         * Validate Indian phone number
         */
        isValidIndianPhone: (phone: string) => boolean;
        /**
         * Extract country code and number
         */
        parsePhone: (phone: string) => {
            countryCode: string;
            number: string;
        };
    };
    validation: {
        /**
         * Check if value is empty
         */
        isEmpty: (value: any) => boolean;
        /**
         * Validate Indian PAN number
         */
        isValidPAN: (pan: string) => boolean;
        /**
         * Validate Indian Aadhaar number
         */
        isValidAadhaar: (aadhaar: string) => boolean;
        /**
         * Validate IFSC code
         */
        isValidIFSC: (ifsc: string) => boolean;
        /**
         * Validate Indian pincode
         */
        isValidPincode: (pincode: string) => boolean;
        /**
         * Check if string contains only letters and spaces
         */
        isValidName: (name: string) => boolean;
        /**
         * Validate URL
         */
        isValidURL: (url: string) => boolean;
    };
    pagination: {
        /**
         * Calculate pagination metadata
         */
        getPaginationInfo: (page: number, limit: number, totalCount: number) => {
            page: number;
            limit: number;
            totalCount: number;
            totalPages: number;
            hasNextPage: boolean;
            hasPrevPage: boolean;
            startIndex: number;
            endIndex: number;
            showing: string;
        };
        /**
         * Generate page numbers for pagination UI
         */
        getPageNumbers: (currentPage: number, totalPages: number, maxVisible?: number) => number[];
    };
    security: {
        /**
         * Generate secure random token
         */
        generateToken: (length?: number) => string;
        /**
         * Hash string using SHA-256
         */
        hashString: (input: string) => string;
        /**
         * Generate OTP
         */
        generateOTP: (length?: number) => string;
        /**
         * Sanitize filename for security
         */
        sanitizeFilename: (filename: string) => string;
        /**
         * Mask sensitive data
         */
        maskSensitiveData: (data: string, visibleChars?: number) => string;
    };
    array: {
        /**
         * Remove duplicates from array
         */
        unique: <T>(array: T[]) => T[];
        /**
         * Group array by key
         */
        groupBy: <T>(array: T[], key: keyof T) => Record<string, T[]>;
        /**
         * Shuffle array
         */
        shuffle: <T>(array: T[]) => T[];
        /**
         * Get random item from array
         */
        randomItem: <T>(array: T[]) => T | undefined;
        /**
         * Chunk array into smaller arrays
         */
        chunk: <T>(array: T[], size: number) => T[][];
    };
    object: {
        /**
         * Pick specific keys from object
         */
        pick: <T extends object, K extends keyof T>(obj: T, keys: K[]) => Pick<T, K>;
        /**
         * Omit specific keys from object
         */
        omit: <T extends object, K extends keyof T>(obj: T, keys: K[]) => Omit<T, K>;
        /**
         * Deep clone object
         */
        deepClone: <T>(obj: T) => T;
        /**
         * Check if object is empty
         */
        isEmpty: (obj: Record<string, any>) => boolean;
        /**
         * Flatten nested object
         */
        flatten: (obj: any, prefix?: string) => Record<string, any>;
    };
    url: {
        /**
         * Build query string from object
         */
        buildQueryString: (params: Record<string, any>) => string;
        /**
         * Parse query string to object
         */
        parseQueryString: (queryString: string) => Record<string, string>;
        /**
         * Join URL parts
         */
        joinURL: (...parts: string[]) => string;
    };
};
export default _default;
//# sourceMappingURL=helpers.d.ts.map