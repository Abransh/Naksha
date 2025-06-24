/**
 * File Path: apps/api/src/utils/export.ts
 *
 * Data Export Utilities
 *
 * Handles exporting data to various formats:
 * - CSV export
 * - Excel export
 * - PDF export
 * - JSON export
 */
import { Response } from 'express';
/**
 * Export data to CSV format
 */
export declare const exportToCSV: (data: any[], options?: {
    headers?: string[];
    fields?: string[];
    filename?: string;
}) => Promise<string>;
/**
 * Export data to CSV format (legacy function for Response object)
 */
export declare const exportToCSVResponse: (data: any[], filename: string, res: Response) => void;
/**
 * Export data to JSON format
 */
export declare const exportToJSON: (data: any[], filename: string, res: Response) => void;
/**
 * Prepare data for export by formatting dates and cleaning up
 */
export declare const prepareDataForExport: (data: any[]) => any[];
//# sourceMappingURL=export.d.ts.map