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
export const exportToCSV = async (data: any[], options?: {
  headers?: string[];
  fields?: string[];
  filename?: string;
}): Promise<string> => {
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

/**
 * Export data to CSV format (legacy function for Response object)
 */
export const exportToCSVResponse = (data: any[], filename: string, res: Response): void => {
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

/**
 * Export data to JSON format
 */
export const exportToJSON = (data: any[], filename: string, res: Response): void => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`);
  res.json(data);
};

/**
 * Prepare data for export by formatting dates and cleaning up
 */
export const prepareDataForExport = (data: any[]): any[] => {
  return data.map(item => {
    const cleaned: any = {};
    
    Object.keys(item).forEach(key => {
      const value = item[key];
      
      if (value instanceof Date) {
        cleaned[key] = value.toISOString().split('T')[0]; // Format as YYYY-MM-DD
      } else if (typeof value === 'object' && value !== null) {
        cleaned[key] = JSON.stringify(value);
      } else {
        cleaned[key] = value;
      }
    });
    
    return cleaned;
  });
};