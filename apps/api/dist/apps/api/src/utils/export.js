"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.prepareDataForExport = exports.exportToJSON = exports.exportToCSVResponse = exports.exportToCSV = void 0;
/**
 * Export data to CSV format
 */
const exportToCSV = async (data, options) => {
    if (!data || data.length === 0) {
        return '';
    }
    const headers = options?.headers || Object.keys(data[0]);
    const fields = options?.fields || Object.keys(data[0]);
    // Create CSV content
    let csvContent = headers.join(',') + '\n';
    data.forEach(row => {
        const values = fields.map(field => {
            const value = row[field];
            // Escape commas and quotes in values
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                return `"${value.replace(/"/g, '""')}"`;
            }
            return value || '';
        });
        csvContent += values.join(',') + '\n';
    });
    return csvContent;
};
exports.exportToCSV = exportToCSV;
/**
 * Export data to CSV format (legacy function for Response object)
 */
const exportToCSVResponse = (data, filename, res) => {
    if (!data || data.length === 0) {
        res.status(400).json({ error: 'No data to export' });
        return;
    }
    // Get headers from first object
    const headers = Object.keys(data[0]);
    // Create CSV content
    let csvContent = headers.join(',') + '\n';
    data.forEach(row => {
        const values = headers.map(header => {
            const value = row[header];
            // Escape commas and quotes in values
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                return `"${value.replace(/"/g, '""')}"`;
            }
            return value || '';
        });
        csvContent += values.join(',') + '\n';
    });
    // Set response headers
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
    res.send(csvContent);
};
exports.exportToCSVResponse = exportToCSVResponse;
/**
 * Export data to JSON format
 */
const exportToJSON = (data, filename, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`);
    res.json(data);
};
exports.exportToJSON = exportToJSON;
/**
 * Prepare data for export by formatting dates and cleaning up
 */
const prepareDataForExport = (data) => {
    return data.map(item => {
        const cleaned = {};
        Object.keys(item).forEach(key => {
            const value = item[key];
            if (value instanceof Date) {
                cleaned[key] = value.toISOString().split('T')[0]; // Format as YYYY-MM-DD
            }
            else if (typeof value === 'object' && value !== null) {
                cleaned[key] = JSON.stringify(value);
            }
            else {
                cleaned[key] = value;
            }
        });
        return cleaned;
    });
};
exports.prepareDataForExport = prepareDataForExport;
//# sourceMappingURL=export.js.map