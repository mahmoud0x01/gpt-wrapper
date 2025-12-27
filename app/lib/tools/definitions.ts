import { z } from 'zod';

// Tool definitions for the AI model

// Confirm action tool - used for dangerous operations
export const confirmActionSchema = z.object({
    action: z.enum(['update', 'delete']).describe('The type of action requiring confirmation'),
    description: z.string().describe('Human-readable description of what will be done'),
    targetType: z.string().describe('Type of target (e.g., "cell", "thread", "message")'),
    targetId: z.string().describe('Identifier of the target'),
    data: z.record(z.unknown()).optional().describe('Additional data for the action'),
});

// Get range tool - read cells from spreadsheet
export const getRangeSchema = z.object({
    sheet: z.string().describe('Sheet name (e.g., "Sheet1")'),
    from: z.string().describe('Starting cell reference (e.g., "A1")'),
    to: z.string().describe('Ending cell reference (e.g., "C10")'),
});

// Update cell tool - write to a cell
export const updateCellSchema = z.object({
    sheet: z.string().describe('Sheet name (e.g., "Sheet1")'),
    cell: z.string().describe('Cell reference (e.g., "A1")'),
    value: z.union([z.string(), z.number()]).describe('New value to write'),
    confirmed: z.boolean().default(false).describe('Whether user has confirmed this action'),
});

// Show table tool - display table data in UI
export const showTableSchema = z.object({
    data: z.object({
        headers: z.array(z.string()),
        rows: z.array(z.array(z.union([z.string(), z.number(), z.boolean(), z.null()]))),
        range: z.string(),
    }).describe('Table data to display'),
    title: z.string().optional().describe('Optional title for the table'),
});

// Read cell tool - read a single cell
export const readCellSchema = z.object({
    sheet: z.string().describe('Sheet name'),
    cell: z.string().describe('Cell reference (e.g., "D4")'),
});

// Delete thread tool
export const deleteThreadSchema = z.object({
    threadId: z.string().describe('ID of the thread to delete'),
    confirmed: z.boolean().default(false).describe('Whether user has confirmed this action'),
});

// Tool type exports for TypeScript
export type ConfirmActionParams = z.infer<typeof confirmActionSchema>;
export type GetRangeParams = z.infer<typeof getRangeSchema>;
export type UpdateCellParams = z.infer<typeof updateCellSchema>;
export type ShowTableParams = z.infer<typeof showTableSchema>;
export type ReadCellParams = z.infer<typeof readCellSchema>;
export type DeleteThreadParams = z.infer<typeof deleteThreadSchema>;
