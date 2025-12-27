'use client';

import { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import ChatArea from '@/app/components/chat/ChatArea';
import ThreadList from '@/app/components/threads/ThreadList';
import TableModal from '@/app/components/xlsx/TableModal';
import type { Thread, Message } from '@/app/types';

export default function Home() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tableModalData, setTableModalData] = useState<{
    headers: string[];
    rows: (string | number | boolean | null)[][];
    range: string;
  } | null>(null);
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const chatInputRef = useRef<HTMLInputElement>(null);

  // Load threads on mount
  useEffect(() => {
    fetchThreads();
  }, []);

  // Load messages when active thread changes
  useEffect(() => {
    if (activeThreadId) {
      fetchMessages(activeThreadId);
    } else {
      setMessages([]);
    }
  }, [activeThreadId]);

  const fetchThreads = async () => {
    try {
      const res = await fetch('/api/threads');
      const data = await res.json();
      setThreads(data.threads || []);

      // Auto-select first thread if exists
      if (data.threads?.length > 0 && !activeThreadId) {
        setActiveThreadId(data.threads[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch threads:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMessages = async (threadId: string) => {
    try {
      const res = await fetch(`/api/threads?id=${threadId}`);
      const data = await res.json();
      setMessages(data.messages || []);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  };

  const handleNewThread = async () => {
    const id = uuidv4();
    try {
      const res = await fetch('/api/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, title: 'New Chat' }),
      });
      const data = await res.json();
      setThreads(prev => [data.thread, ...prev]);
      setActiveThreadId(id);
      setMessages([]);
    } catch (error) {
      console.error('Failed to create thread:', error);
    }
  };

  const handleSelectThread = (id: string) => {
    setActiveThreadId(id);
  };

  const handleDeleteThread = async (id: string) => {
    if (!confirm('Are you sure you want to delete this conversation?')) return;

    try {
      await fetch(`/api/threads?id=${id}`, { method: 'DELETE' });
      setThreads(prev => prev.filter(t => t.id !== id));

      if (activeThreadId === id) {
        const remaining = threads.filter(t => t.id !== id);
        setActiveThreadId(remaining.length > 0 ? remaining[0].id : null);
      }
    } catch (error) {
      console.error('Failed to delete thread:', error);
    }
  };

  const handleTableClick = (range: string, data: unknown) => {
    setTableModalData(data as typeof tableModalData);
    setIsTableModalOpen(true);
  };

  const handleInsertReference = (reference: string) => {
    // Insert reference at cursor position in chat input
    if (chatInputRef.current) {
      const input = chatInputRef.current;
      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;
      const value = input.value;
      input.value = value.slice(0, start) + reference + ' ' + value.slice(end);
      input.focus();
      input.setSelectionRange(start + reference.length + 1, start + reference.length + 1);
    }
  };

  // If no active thread, create one automatically
  useEffect(() => {
    if (!isLoading && threads.length === 0) {
      handleNewThread();
    }
  }, [isLoading, threads.length]);

  return (
    <div className="flex h-screen bg-white dark:bg-zinc-950">
      {/* Sidebar */}
      <div className="w-72 flex-shrink-0">
        <ThreadList
          threads={threads}
          activeThreadId={activeThreadId}
          onSelectThread={handleSelectThread}
          onNewThread={handleNewThread}
          onDeleteThread={handleDeleteThread}
        />
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-14 border-b border-zinc-200 dark:border-zinc-800 flex items-center px-6">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {activeThreadId
              ? threads.find(t => t.id === activeThreadId)?.title || 'Chat'
              : 'ChatGPT Clone'
            }
          </h1>
        </header>

        {/* Chat */}
        <div className="flex-1 overflow-hidden">
          {activeThreadId ? (
            <ChatArea
              key={activeThreadId}
              threadId={activeThreadId}
              initialMessages={messages}
              onTableClick={handleTableClick}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-zinc-400">
              <p>Select or create a conversation to start chatting</p>
            </div>
          )}
        </div>
      </div>

      {/* Table Modal */}
      <TableModal
        isOpen={isTableModalOpen}
        onClose={() => setIsTableModalOpen(false)}
        data={tableModalData}
        onInsertReference={handleInsertReference}
      />
    </div>
  );
}
