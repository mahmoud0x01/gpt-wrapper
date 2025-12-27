import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { createMessage, getThread, createThread, touchThread, deleteThread } from '@/app/lib/db';
import { readRange, readCell as readCellFn, writeCell, getSheetNames, tableToMarkdown } from '@/app/lib/xlsx';

export const maxDuration = 30;

export async function POST(req: Request) {
    const { messages, threadId } = await req.json();

    // Ensure thread exists
    let thread = getThread(threadId);
    if (!thread) {
        // Create thread with first user message as title
        const firstUserMessage = messages.find((m: { role: string }) => m.role === 'user');
        const title = firstUserMessage?.content?.slice(0, 50) || 'New Chat';
        thread = createThread(threadId, title);
    }

    // Save the latest user message
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.role === 'user') {
        createMessage(uuidv4(), threadId, 'user', lastMessage.content);
    }

    // Get available sheets for context
    const sheets = getSheetNames();

    const result = streamText({
        model: openai('gpt-4o-mini'),
        system: `You are a helpful AI assistant that can work with spreadsheet data.
    
Available spreadsheet: The file contains data in these sheets: ${sheets.join(', ')}.
Sheet "Sheet1" contains: Names, Emails, Amounts, and Bonus calculations.

When the user mentions ranges like @Sheet1!A1:B5, use the getRange tool to read that data.
When asked to update cells, ALWAYS use the updateCell tool with confirmed=false first to trigger user confirmation.
When asked to delete threads, use the deleteThread tool with confirmed=false first.

After reading spreadsheet data, display it nicely formatted for the user.
If a user selects cells or mentions a range, help them understand or manipulate that data.`,
        messages,
        tools: {
            // Read range of cells
            getRange: {
                description: 'Read a range of cells from the spreadsheet',
                parameters: z.object({
                    sheet: z.string().describe('Sheet name (e.g., "Sheet1")'),
                    from: z.string().describe('Starting cell reference (e.g., "A1")'),
                    to: z.string().describe('Ending cell reference (e.g., "C10")'),
                }),
                execute: async ({ sheet, from, to }: { sheet: string; from: string; to: string }) => {
                    try {
                        const data = readRange({ sheet, from, to });
                        const markdown = tableToMarkdown(data);
                        return {
                            success: true,
                            data,
                            markdown,
                            message: `Here is the data from ${sheet}!${from}:${to}`,
                        };
                    } catch (error) {
                        return {
                            success: false,
                            error: error instanceof Error ? error.message : 'Unknown error',
                        };
                    }
                },
            },

            // Read single cell
            readCell: {
                description: 'Read a single cell from the spreadsheet, useful for getting cell formulas',
                parameters: z.object({
                    sheet: z.string().describe('Sheet name'),
                    cell: z.string().describe('Cell reference (e.g., "D4")'),
                }),
                execute: async ({ sheet, cell }: { sheet: string; cell: string }) => {
                    try {
                        const data = readCellFn(sheet, cell);
                        return {
                            success: true,
                            data,
                            message: data.formula
                                ? `Cell ${sheet}!${cell} contains formula =${data.formula} which evaluates to ${data.value}`
                                : `Cell ${sheet}!${cell} contains value: ${data.value}`,
                        };
                    } catch (error) {
                        return {
                            success: false,
                            error: error instanceof Error ? error.message : 'Unknown error',
                        };
                    }
                },
            },

            // Update cell (requires confirmation)
            updateCell: {
                description: 'Update a cell in the spreadsheet. Set confirmed=false to request user confirmation first.',
                parameters: z.object({
                    sheet: z.string().describe('Sheet name (e.g., "Sheet1")'),
                    cell: z.string().describe('Cell reference (e.g., "A1")'),
                    value: z.union([z.string(), z.number()]).describe('New value to write'),
                    confirmed: z.boolean().default(false).describe('Whether user has confirmed this action'),
                }),
                execute: async ({ sheet, cell, value, confirmed }: { sheet: string; cell: string; value: string | number; confirmed: boolean }) => {
                    if (!confirmed) {
                        // Return a request for confirmation - this will be rendered as UI
                        return {
                            success: false,
                            requiresConfirmation: true,
                            action: 'update',
                            description: `Update cell ${sheet}!${cell} to "${value}"`,
                            targetType: 'cell',
                            targetId: `${sheet}!${cell}`,
                            data: { sheet, cell, value },
                        };
                    }

                    try {
                        writeCell(sheet, cell, value);
                        return {
                            success: true,
                            message: `Successfully updated cell ${sheet}!${cell} to "${value}"`,
                        };
                    } catch (error) {
                        return {
                            success: false,
                            error: error instanceof Error ? error.message : 'Unknown error',
                        };
                    }
                },
            },

            // Delete thread (requires confirmation)
            deleteThreadTool: {
                description: 'Delete a chat thread. Set confirmed=false to request user confirmation first.',
                parameters: z.object({
                    threadId: z.string().describe('ID of the thread to delete'),
                    confirmed: z.boolean().default(false).describe('Whether user has confirmed this action'),
                }),
                execute: async ({ threadId: targetThreadId, confirmed }: { threadId: string; confirmed: boolean }) => {
                    if (!confirmed) {
                        return {
                            success: false,
                            requiresConfirmation: true,
                            action: 'delete',
                            description: `Delete thread "${targetThreadId}" and all its messages`,
                            targetType: 'thread',
                            targetId: targetThreadId,
                            data: { threadId: targetThreadId },
                        };
                    }

                    try {
                        deleteThread(targetThreadId);
                        return {
                            success: true,
                            message: `Successfully deleted thread ${targetThreadId}`,
                        };
                    } catch (error) {
                        return {
                            success: false,
                            error: error instanceof Error ? error.message : 'Unknown error',
                        };
                    }
                },
            },
        },
        onFinish: async ({ text }) => {
            // Save assistant's response
            if (text) {
                createMessage(uuidv4(), threadId, 'assistant', text);
                touchThread(threadId);
            }
        },
    });

    return result.toDataStreamResponse();
}
