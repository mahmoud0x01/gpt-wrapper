'use client';

import { useChat } from '@ai-sdk/react';
import { useState, useEffect, useRef, useCallback } from 'react';
import type { Message as DBMessage } from '@/app/types';

interface ChatAreaProps {
    threadId: string;
    initialMessages?: DBMessage[];
    onTableClick?: (range: string, data: unknown) => void;
}

interface PendingConfirmation {
    toolCallId: string;
    action: string;
    description: string;
    sheet?: string;
    cell?: string;
    value?: unknown;
    threadId?: string;
}

export default function ChatArea({ threadId, initialMessages = [], onTableClick }: ChatAreaProps) {
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation | null>(null);

    // Convert DB messages to AI SDK format
    const convertedMessages = initialMessages.map(msg => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
    }));

    const { messages, input, handleInputChange, handleSubmit, isLoading, append } = useChat({
        api: '/api/chat',
        body: { threadId },
        initialMessages: convertedMessages,
        maxSteps: 10,
    });

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);

    // Detect confirmation-requiring tool results via useEffect
    useEffect(() => {
        if (pendingConfirmation) return; // Already have one pending

        for (const message of messages) {
            if (message.toolInvocations) {
                for (const tool of message.toolInvocations) {
                    if (tool.state === 'result') {
                        const result = tool.result as {
                            requiresConfirmation?: boolean;
                            description?: string;
                            action?: string;
                            data?: { sheet?: string; cell?: string; value?: unknown; threadId?: string };
                        };
                        if (result.requiresConfirmation) {
                            setPendingConfirmation({
                                toolCallId: tool.toolCallId,
                                action: result.action || 'action',
                                description: result.description || 'Confirm this action?',
                                sheet: result.data?.sheet,
                                cell: result.data?.cell,
                                value: result.data?.value,
                                threadId: result.data?.threadId,
                            });
                            return;
                        }
                    }
                }
            }
        }
    }, [messages, pendingConfirmation]);

    const handleConfirm = async (confirmed: boolean) => {
        if (!pendingConfirmation) return;

        if (confirmed) {
            // Send a message confirming the action - AI will re-call the tool with confirmed=true
            if (pendingConfirmation.sheet && pendingConfirmation.cell) {
                append({
                    role: 'user',
                    content: `Yes, confirmed. Update cell ${pendingConfirmation.sheet}!${pendingConfirmation.cell} to ${pendingConfirmation.value}`,
                });
            } else if (pendingConfirmation.threadId) {
                append({
                    role: 'user',
                    content: `Yes, confirmed. Delete the thread.`,
                });
            }
        }

        setPendingConfirmation(null);
    };

    // Render table data from tool results
    const renderTableData = (data: { headers: string[]; rows: unknown[][]; range: string }) => {
        return (
            <div
                className="my-2 overflow-x-auto cursor-pointer hover:ring-2 hover:ring-blue-400 rounded-lg transition-all"
                onClick={() => onTableClick?.(data.range, data)}
            >
                <table className="min-w-full border-collapse border border-zinc-300 dark:border-zinc-700 text-sm">
                    <thead>
                        <tr className="bg-zinc-100 dark:bg-zinc-800">
                            {data.headers.map((header, i) => (
                                <th key={i} className="border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-left font-medium">
                                    {header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.rows.map((row, i) => (
                            <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-zinc-900">
                                {(row as unknown[]).map((cell, j) => (
                                    <td key={j} className="border border-zinc-300 dark:border-zinc-700 px-3 py-2">
                                        {String(cell ?? '')}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
                <p className="text-xs text-zinc-500 mt-1">Click to open in full view • {data.range}</p>
            </div>
        );
    };

    // Parse message content for tool results
    const renderMessageContent = (message: typeof messages[0]) => {
        // Check for tool invocations
        if (message.toolInvocations) {
            return (
                <div className="space-y-2">
                    {message.content && <p className="whitespace-pre-wrap">{message.content}</p>}
                    {message.toolInvocations.map((tool, i) => {
                        if (tool.state === 'result') {
                            const result = tool.result as {
                                data?: { headers: string[]; rows: unknown[][]; range: string };
                                requiresConfirmation?: boolean;
                                success?: boolean;
                                message?: string;
                            };

                            // Render table if data exists
                            if (result.data?.headers) {
                                return <div key={i}>{renderTableData(result.data)}</div>;
                            }

                            // Show success message
                            if (result.success && result.message) {
                                return (
                                    <div key={i} className="text-green-600 dark:text-green-400 text-sm">
                                        ✅ {result.message}
                                    </div>
                                );
                            }
                        }
                        return null;
                    })}
                </div>
            );
        }

        return <p className="whitespace-pre-wrap">{message.content}</p>;
    };

    return (
        <div className="flex flex-col h-full">
            {/* Messages area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                    <div className="flex items-center justify-center h-full text-zinc-400">
                        <div className="text-center">
                            <h2 className="text-xl font-medium mb-2">Start a conversation</h2>
                            <p className="text-sm">Ask about spreadsheet data, update cells, or chat about anything.</p>
                            <p className="text-xs mt-4 text-zinc-500">
                                Try: &quot;Show me the data in Sheet1&quot; or &quot;What&apos;s in cell D4?&quot;
                            </p>
                        </div>
                    </div>
                )}

                {messages.map((message) => (
                    <div
                        key={message.id}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`max-w-[80%] rounded-2xl px-4 py-3 ${message.role === 'user'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'
                                }`}
                        >
                            {renderMessageContent(message)}
                        </div>
                    </div>
                ))}

                {/* Confirmation dialog */}
                {pendingConfirmation && (
                    <div className="flex justify-start">
                        <div className="max-w-[80%] rounded-2xl px-4 py-4 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-amber-600 dark:text-amber-400">⚠️</span>
                                <span className="font-medium text-amber-800 dark:text-amber-200">
                                    Confirmation Required
                                </span>
                            </div>
                            <p className="text-amber-900 dark:text-amber-100 mb-4">
                                {pendingConfirmation.description}
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleConfirm(true)}
                                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                                >
                                    Yes, proceed
                                </button>
                                <button
                                    onClick={() => handleConfirm(false)}
                                    className="px-4 py-2 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-800 dark:text-zinc-200 rounded-lg font-medium transition-colors"
                                >
                                    No, cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-zinc-100 dark:bg-zinc-800 rounded-2xl px-4 py-3">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div className="border-t border-zinc-200 dark:border-zinc-800 p-4">
                <form onSubmit={handleSubmit} className="flex gap-2">
                    <input
                        value={input}
                        onChange={handleInputChange}
                        placeholder="Type a message... (use @Sheet1!A1:B5 to reference cells)"
                        className="flex-1 px-4 py-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-400 text-white rounded-xl font-medium transition-colors"
                    >
                        Send
                    </button>
                </form>
            </div>
        </div>
    );
}
