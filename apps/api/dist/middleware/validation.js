"use strict";
/**
 * Validation Middleware
 *
 * Provides comprehensive request validation using Zod schemas:
 * - Body validation
 * - Query parameter validation
 * - URL parameter validation
 * - File upload validation
 * - Custom validation rules
 * - Error formatting and reporting
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validationTestUtils = exports.schemaComposition = exports.validationUtils = exports.commonSchemas = exports.validateBusinessRules = exports.validateFileUpload = exports.validateMultiple = exports.validateRequest = exports.ValidationError = void 0;
const zod_1 = require("zod");
/**
 * Custom validation error class
 */
class ValidationError extends Error {
    constructor(message, details) {
        super(message);
        this.name = 'ValidationError';
        this.statusCode = 400;
        this.details = details;
        this.code = 'VALIDATION_ERROR';
    }
}
exports.ValidationError = ValidationError;
/**
 * Main validation middleware factory
 * Creates middleware that validates requests using Zod schemas
 */
const validateRequest = (schema, target = 'body', options = {}) => {
    return (req, res, next) => {
        try {
            const { stripUnknown = true, allowUnknown = false, abortEarly = false } = options;
            // Get the data to validate based on target
            let dataToValidate;
            switch (target) {
                case 'body':
                    dataToValidate = req.body;
                    break;
                case 'query':
                    dataToValidate = req.query;
                    break;
                case 'params':
                    dataToValidate = req.params;
                    break;
                case 'headers':
                    dataToValidate = req.headers;
                    break;
                default:
                    dataToValidate = req.body;
            }
            // Configure Zod parsing options
            const parseOptions = {};
            if (!stripUnknown) {
                parseOptions.stripUnknown = false;
            }
            // Validate the data
            const result = schema.safeParse(dataToValidate);
            if (!result.success) {
                const formattedErrors = formatZodErrors(result.error);
                console.error('❌ Validation Error:', {
                    target,
                    dataToValidate,
                    zodError: result.error,
                    formattedErrors
                });
                res.status(400).json({
                    error: 'Validation failed',
                    message: 'The request data is invalid. Please check the errors and try again.',
                    code: 'VALIDATION_ERROR',
                    details: formattedErrors,
                    target
                });
                return;
            }
            // Replace the original data with validated (and potentially transformed) data
            switch (target) {
                case 'body':
                    req.body = result.data;
                    break;
                case 'query':
                    req.query = result.data;
                    break;
                case 'params':
                    req.params = result.data;
                    break;
                case 'headers':
                    // Don't replace headers, just validate them
                    break;
            }
            next();
        }
        catch (error) {
            console.error('❌ Validation middleware error:', error);
            res.status(500).json({
                error: 'Validation error',
                message: 'An error occurred during request validation',
                code: 'VALIDATION_SYSTEM_ERROR'
            });
        }
    };
};
exports.validateRequest = validateRequest;
/**
 * Multiple validation middleware
 * Validates multiple parts of the request
 */
const validateMultiple = (validations) => {
    return (req, res, next) => {
        const errors = [];
        for (const validation of validations) {
            const { schema, target, options = {} } = validation;
            let dataToValidate;
            switch (target) {
                case 'body':
                    dataToValidate = req.body;
                    break;
                case 'query':
                    dataToValidate = req.query;
                    break;
                case 'params':
                    dataToValidate = req.params;
                    break;
                case 'headers':
                    dataToValidate = req.headers;
                    break;
            }
            const result = schema.safeParse(dataToValidate);
            if (!result.success) {
                const formattedErrors = formatZodErrors(result.error);
                errors.push({
                    target,
                    errors: formattedErrors
                });
            }
            else {
                // Update the validated data
                switch (target) {
                    case 'body':
                        req.body = result.data;
                        break;
                    case 'query':
                        req.query = result.data;
                        break;
                    case 'params':
                        req.params = result.data;
                        break;
                }
            }
        }
        if (errors.length > 0) {
            res.status(400).json({
                error: 'Validation failed',
                message: 'Multiple validation errors occurred',
                code: 'MULTIPLE_VALIDATION_ERRORS',
                details: errors
            });
            return;
        }
        next();
    };
};
exports.validateMultiple = validateMultiple;
/**
 * File upload validation middleware
 */
const validateFileUpload = (options) => {
    return (req, res, next) => {
        const { maxSize = 10 * 1024 * 1024, // 10MB default
        allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'], required = false, maxFiles = 1 } = options;
        const files = req.files;
        const file = req.file;
        // Check if file is required
        if (required && !file && (!files || files.length === 0)) {
            res.status(400).json({
                error: 'File required',
                message: 'A file upload is required for this request',
                code: 'FILE_REQUIRED'
            });
            return;
        }
        // If no file provided and not required, continue
        if (!file && (!files || files.length === 0)) {
            next();
            return;
        }
        const filesToValidate = files || (file ? [file] : []);
        // Check file count
        if (filesToValidate.length > maxFiles) {
            res.status(400).json({
                error: 'Too many files',
                message: `Maximum ${maxFiles} files allowed`,
                code: 'TOO_MANY_FILES'
            });
            return;
        }
        // Validate each file
        for (const uploadedFile of filesToValidate) {
            // Check file size
            if (uploadedFile.size > maxSize) {
                res.status(400).json({
                    error: 'File too large',
                    message: `File size must be less than ${maxSize / (1024 * 1024)}MB`,
                    code: 'FILE_TOO_LARGE',
                    details: {
                        filename: uploadedFile.originalname,
                        size: uploadedFile.size,
                        maxSize
                    }
                });
                return;
            }
            // Check file type
            if (!allowedTypes.includes(uploadedFile.mimetype)) {
                res.status(400).json({
                    error: 'Invalid file type',
                    message: `File type ${uploadedFile.mimetype} is not allowed`,
                    code: 'INVALID_FILE_TYPE',
                    details: {
                        filename: uploadedFile.originalname,
                        type: uploadedFile.mimetype,
                        allowedTypes
                    }
                });
                return;
            }
        }
        next();
    };
};
exports.validateFileUpload = validateFileUpload;
/**
 * Custom validation middleware for business logic
 */
const validateBusinessRules = (validator) => {
    return async (req, res, next) => {
        try {
            const result = await validator(req);
            if (result === true) {
                next();
                return;
            }
            const errorMessage = typeof result === 'string' ? result : 'Business rule validation failed';
            res.status(400).json({
                error: 'Business rule violation',
                message: errorMessage,
                code: 'BUSINESS_RULE_ERROR'
            });
        }
        catch (error) {
            console.error('❌ Business rule validation error:', error);
            res.status(500).json({
                error: 'Validation error',
                message: 'An error occurred during business rule validation',
                code: 'BUSINESS_RULE_SYSTEM_ERROR'
            });
        }
    };
};
exports.validateBusinessRules = validateBusinessRules;
/**
 * Format Zod validation errors into a user-friendly format
 */
function formatZodErrors(error) {
    return error.errors.map(err => ({
        field: err.path.join('.') || 'root',
        message: err.message,
        code: err.code,
        value: err.code !== 'invalid_type' ? err.received : undefined
    }));
}
/**
 * Common validation schemas that can be reused across routes
 */
exports.commonSchemas = {
    // Pagination
    pagination: zod_1.z.object({
        page: zod_1.z.coerce.number().min(1).optional().default(1),
        limit: zod_1.z.coerce.number().min(1).max(100).optional().default(10),
        sortBy: zod_1.z.string().optional(),
        sortOrder: zod_1.z.enum(['asc', 'desc']).optional().default('desc')
    }),
    // Date range
    dateRange: zod_1.z.object({
        startDate: zod_1.z.string().datetime().optional(),
        endDate: zod_1.z.string().datetime().optional()
    }).refine(data => {
        if (data.startDate && data.endDate) {
            return new Date(data.startDate) <= new Date(data.endDate);
        }
        return true;
    }, {
        message: 'Start date must be before end date',
        path: ['dateRange']
    }),
    // MongoDB ObjectId
    objectId: zod_1.z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format'),
    // UUID
    uuid: zod_1.z.string().uuid('Invalid UUID format'),
    // CUID (Prisma default ID format)
    cuid: zod_1.z.string().cuid('Invalid CUID format'),
    // Generic ID that accepts both UUID and CUID
    id: zod_1.z.string().refine((value) => {
        // Check if it's a valid UUID
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        // Check if it's a valid CUID
        const cuidRegex = /^[a-z0-9]{25}$/i;
        return uuidRegex.test(value) || cuidRegex.test(value);
    }, 'Invalid ID format'),
    // Email
    email: zod_1.z.string().email('Invalid email format').max(255),
    // Phone number (international format)
    phoneNumber: zod_1.z.object({
        countryCode: zod_1.z.string().regex(/^\+\d{1,4}$/, 'Invalid country code'),
        number: zod_1.z.string().regex(/^\d{6,15}$/, 'Invalid phone number')
    }),
    // Password requirements
    password: zod_1.z.string()
        .min(8, 'Password must be at least 8 characters')
        .max(128, 'Password must not exceed 128 characters')
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
    // Currency amount
    amount: zod_1.z.number().gte(0, 'Amount cannot be negative').max(999999.99, 'Amount too large'),
    // Search query
    searchQuery: zod_1.z.object({
        q: zod_1.z.string().min(1).max(100).optional(),
        filters: zod_1.z.record(zod_1.z.string()).optional()
    }),
    // File upload
    fileUpload: zod_1.z.object({
        filename: zod_1.z.string().min(1, 'Filename is required'),
        mimetype: zod_1.z.string().min(1, 'File type is required'),
        size: zod_1.z.number().gte(0, 'File size cannot be negative')
    })
};
/**
 * Validation utilities
 */
exports.validationUtils = {
    /**
     * Create a schema for array validation with min/max items
     */
    arraySchema: (itemSchema, minItems = 0, maxItems = 100) => {
        return zod_1.z.array(itemSchema).min(minItems).max(maxItems);
    },
    /**
     * Create a conditional schema based on a field value
     */
    conditionalSchema: (condition, schema) => {
        return zod_1.z.any().refine(condition).and(schema);
    },
    /**
     * Create a schema that validates enum values
     */
    enumSchema: (values, message) => {
        return zod_1.z.enum(values, {
            errorMap: () => ({ message: message || `Value must be one of: ${values.join(', ')}` })
        });
    },
    /**
     * Create a schema for Indian-specific validations
     */
    indianValidations: {
        // PAN number validation
        pan: zod_1.z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN number format'),
        // Aadhaar number validation
        aadhaar: zod_1.z.string().regex(/^\d{12}$/, 'Invalid Aadhaar number format'),
        // IFSC code validation
        ifsc: zod_1.z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC code format'),
        // Indian pincode validation
        pincode: zod_1.z.string().regex(/^\d{6}$/, 'Invalid pincode format'),
        // Indian mobile number validation
        mobile: zod_1.z.string().regex(/^[6-9]\d{9}$/, 'Invalid mobile number format')
    }
};
/**
 * Schema composition utilities
 */
exports.schemaComposition = {
    /**
     * Merge multiple schemas
     */
    merge: (...schemas) => {
        return schemas.reduce((acc, schema) => acc.merge(schema));
    },
    /**
     * Make all fields in a schema optional
     */
    makeOptional: (schema) => {
        return schema.partial();
    },
    /**
     * Pick specific fields from a schema
     */
    pick: (schema, fields) => {
        return schema.pick(fields.reduce((acc, field) => ({ ...acc, [field]: true }), {}));
    },
    /**
     * Omit specific fields from a schema
     */
    omit: (schema, fields) => {
        return schema.omit(fields.reduce((acc, field) => ({ ...acc, [field]: true }), {}));
    }
};
/**
 * Development and testing utilities
 */
exports.validationTestUtils = process.env.NODE_ENV !== 'production' ? {
    /**
     * Test a schema with sample data
     */
    testSchema: (schema, data) => {
        const result = schema.safeParse(data);
        return {
            success: result.success,
            data: result.success ? result.data : null,
            errors: result.success ? null : formatZodErrors(result.error)
        };
    },
    /**
     * Generate mock data that passes a schema
     */
    generateMockData: (schema) => {
        // This would need a more sophisticated implementation
        // For now, return a placeholder
        return {
            message: 'Mock data generation not implemented yet'
        };
    }
} : {};
exports.default = exports.validateRequest;
//# sourceMappingURL=validation.js.map