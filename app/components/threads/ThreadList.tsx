'use client';

import { useState } from 'react';
import type { Thread } from '@/app/types';

interface ThreadListProps {
    threads: Thread[];
    activeThreadId: string | null;
    onSelectThread: (id: string) => void;
    onNewThread: () => void;
    onDeleteThread: (id: string) => void;
}

export default function ThreadList({
    threads,
    activeThreadId,
    onSelectThread,
    onNewThread,
    onDeleteThread,
}: ThreadListProps) {
    const [hoveredId, setHoveredId] = useState<string | null>(null);

    const formatDate = (timestamp: number) => {
        const date = new Date(timestamp * 1000);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days === 0) return 'Today';
        if (days === 1) return 'Yesterday';
        if (days < 7) return `${days} days ago`;
        return date.toLocaleDateString();
    };

    return (
        <div className="flex flex-col h-full bg-zinc-50 dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800">
            {/* Header */}
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
                <button
                    onClick={onNewThread}
                    className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    New Chat
                </button>
            </div>

            {/* Thread list */}
            <div className="flex-1 overflow-y-auto">
                {threads.length === 0 ? (
                    <div className="p-4 text-center text-zinc-400 text-sm">
                        No conversations yet
                    </div>
                ) : (
                    <div className="p-2 space-y-1">
                        {threads.map((thread) => (
                            <div
                                key={thread.id}
                                className={`relative group rounded-lg transition-colors cursor-pointer ${activeThreadId === thread.id
                                        ? 'bg-blue-100 dark:bg-blue-900/30'
                                        : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'
                                    }`}
                                onClick={() => onSelectThread(thread.id)}
                                onMouseEnter={() => setHoveredId(thread.id)}
                                onMouseLeave={() => setHoveredId(null)}
                            >
                                <div className="px-3 py-3">
                                    <div className="flex items-center gap-2">
                                        <svg className="w-4 h-4 text-zinc-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                        </svg>
                                        <span className={`truncate font-medium ${activeThreadId === thread.id
                                                ? 'text-blue-700 dark:text-blue-300'
                                                : 'text-zinc-700 dark:text-zinc-300'
                                            }`}>
                                            {thread.title}
                                        </span>
                                    </div>
                                    <div className="mt-1 text-xs text-zinc-400 pl-6">
                                        {formatDate(thread.updatedAt)}
                                    </div>
                                </div>

                                {/* Delete button */}
                                {hoveredId === thread.id && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDeleteThread(thread.id);
                                        }}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                        title="Delete thread"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 text-xs text-zinc-400 text-center">
                ChatGPT Clone • AI SDK Demo
            </div>
        </div>
    );
}
