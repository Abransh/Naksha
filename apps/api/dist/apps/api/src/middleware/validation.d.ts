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
import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';
/**
 * Validation target types
 */
type ValidationTarget = 'body' | 'query' | 'params' | 'headers';
/**
 * Validation options
 */
interface ValidationOptions {
    target?: ValidationTarget;
    stripUnknown?: boolean;
    allowUnknown?: boolean;
    abortEarly?: boolean;
}
/**
 * Custom validation error class
 */
export declare class ValidationError extends Error {
    statusCode: number;
    details: any[];
    code: string;
    constructor(message: string, details: any[]);
}
/**
 * Main validation middleware factory
 * Creates middleware that validates requests using Zod schemas
 */
export declare const validateRequest: (schema: ZodSchema, target?: ValidationTarget, options?: ValidationOptions) => (req: Request, res: Response, next: NextFunction) => void;
/**
 * Multiple validation middleware
 * Validates multiple parts of the request
 */
export declare const validateMultiple: (validations: Array<{
    schema: ZodSchema;
    target: ValidationTarget;
    options?: ValidationOptions;
}>) => (req: Request, res: Response, next: NextFunction) => void;
/**
 * File upload validation middleware
 */
export declare const validateFileUpload: (options: {
    maxSize?: number;
    allowedTypes?: string[];
    required?: boolean;
    maxFiles?: number;
}) => (req: Request, res: Response, next: NextFunction) => void;
/**
 * Custom validation middleware for business logic
 */
export declare const validateBusinessRules: (validator: (req: Request) => Promise<boolean | string>) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Common validation schemas that can be reused across routes
 */
export declare const commonSchemas: {
    pagination: z.ZodObject<{
        page: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
        limit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
        sortBy: z.ZodOptional<z.ZodString>;
        sortOrder: z.ZodDefault<z.ZodOptional<z.ZodEnum<["asc", "desc"]>>>;
    }, "strip", z.ZodTypeAny, {
        page: number;
        limit: number;
        sortOrder: "asc" | "desc";
        sortBy?: string | undefined;
    }, {
        page?: number | undefined;
        limit?: number | undefined;
        sortBy?: string | undefined;
        sortOrder?: "asc" | "desc" | undefined;
    }>;
    dateRange: z.ZodEffects<z.ZodObject<{
        startDate: z.ZodOptional<z.ZodString>;
        endDate: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        startDate?: string | undefined;
        endDate?: string | undefined;
    }, {
        startDate?: string | undefined;
        endDate?: string | undefined;
    }>, {
        startDate?: string | undefined;
        endDate?: string | undefined;
    }, {
        startDate?: string | undefined;
        endDate?: string | undefined;
    }>;
    objectId: z.ZodString;
    uuid: z.ZodString;
    email: z.ZodString;
    phoneNumber: z.ZodObject<{
        countryCode: z.ZodString;
        number: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        number: string;
        countryCode: string;
    }, {
        number: string;
        countryCode: string;
    }>;
    password: z.ZodString;
    amount: z.ZodNumber;
    searchQuery: z.ZodObject<{
        q: z.ZodOptional<z.ZodString>;
        filters: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        q?: string | undefined;
        filters?: Record<string, string> | undefined;
    }, {
        q?: string | undefined;
        filters?: Record<string, string> | undefined;
    }>;
    fileUpload: z.ZodObject<{
        filename: z.ZodString;
        mimetype: z.ZodString;
        size: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        filename: string;
        mimetype: string;
        size: number;
    }, {
        filename: string;
        mimetype: string;
        size: number;
    }>;
};
/**
 * Validation utilities
 */
export declare const validationUtils: {
    /**
     * Create a schema for array validation with min/max items
     */
    arraySchema: <T>(itemSchema: ZodSchema<T>, minItems?: number, maxItems?: number) => z.ZodArray<z.ZodType<T, z.ZodTypeDef, T>, "many">;
    /**
     * Create a conditional schema based on a field value
     */
    conditionalSchema: (condition: (data: any) => boolean, schema: ZodSchema) => z.ZodIntersection<z.ZodEffects<z.ZodAny, any, any>, z.ZodType<any, z.ZodTypeDef, any>>;
    /**
     * Create a schema that validates enum values
     */
    enumSchema: (values: string[], message?: string) => z.ZodEnum<[string, ...string[]]>;
    /**
     * Create a schema for Indian-specific validations
     */
    indianValidations: {
        pan: z.ZodString;
        aadhaar: z.ZodString;
        ifsc: z.ZodString;
        pincode: z.ZodString;
        mobile: z.ZodString;
    };
};
/**
 * Schema composition utilities
 */
export declare const schemaComposition: {
    /**
     * Merge multiple schemas
     */
    merge: (...schemas: z.ZodObject<any>[]) => z.ZodObject<any, z.UnknownKeysParam, z.ZodTypeAny, {
        [x: string]: any;
    }, {
        [x: string]: any;
    }>;
    /**
     * Make all fields in a schema optional
     */
    makeOptional: (schema: z.ZodObject<any>) => z.ZodObject<{
        [x: string]: z.ZodOptional<any>;
    }, z.UnknownKeysParam, z.ZodTypeAny, {
        [x: string]: any;
    }, {
        [x: string]: any;
    }>;
    /**
     * Pick specific fields from a schema
     */
    pick: (schema: z.ZodObject<any>, fields: string[]) => z.ZodObject<Pick<any, never>, z.UnknownKeysParam, z.ZodTypeAny, {}, {}>;
    /**
     * Omit specific fields from a schema
     */
    omit: (schema: z.ZodObject<any>, fields: string[]) => z.ZodObject<Omit<any, never>, z.UnknownKeysParam, z.ZodTypeAny, {
        [x: string]: any;
        [x: number]: any;
        [x: symbol]: any;
    }, {
        [x: string]: any;
        [x: number]: any;
        [x: symbol]: any;
    }>;
};
/**
 * Development and testing utilities
 */
export declare const validationTestUtils: {
    /**
     * Test a schema with sample data
     */
    testSchema: (schema: ZodSchema, data: any) => {
        success: boolean;
        data: any;
        errors: any[] | null;
    };
    /**
     * Generate mock data that passes a schema
     */
    generateMockData: (schema: ZodSchema) => {
        message: string;
    };
} | {
    /**
     * Test a schema with sample data
     */
    testSchema?: undefined;
    /**
     * Generate mock data that passes a schema
     */
    generateMockData?: undefined;
};
export default validateRequest;
//# sourceMappingURL=validation.d.ts.map