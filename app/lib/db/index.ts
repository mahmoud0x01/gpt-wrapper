import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import type { Thread, Message } from '@/app/types';

// Ensure data directory exists
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'chat.db');
const db = new Database(dbPath);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS threads (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    created_at INTEGER DEFAULT (unixepoch()),
    updated_at INTEGER DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    thread_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    tool_calls TEXT,
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (thread_id) REFERENCES threads(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON messages(thread_id);
`);

// Thread operations
export function getAllThreads(): Thread[] {
    const stmt = db.prepare(`
    SELECT id, title, created_at as createdAt, updated_at as updatedAt 
    FROM threads 
    ORDER BY updated_at DESC
  `);
    return stmt.all() as Thread[];
}

export function getThread(id: string): Thread | undefined {
    const stmt = db.prepare(`
    SELECT id, title, created_at as createdAt, updated_at as updatedAt 
    FROM threads 
    WHERE id = ?
  `);
    return stmt.get(id) as Thread | undefined;
}

export function createThread(id: string, title: string): Thread {
    const now = Math.floor(Date.now() / 1000);
    const stmt = db.prepare(`
    INSERT INTO threads (id, title, created_at, updated_at) 
    VALUES (?, ?, ?, ?)
  `);
    stmt.run(id, title, now, now);
    return { id, title, createdAt: now, updatedAt: now };
}

export function updateThreadTitle(id: string, title: string): void {
    const now = Math.floor(Date.now() / 1000);
    const stmt = db.prepare(`
    UPDATE threads SET title = ?, updated_at = ? WHERE id = ?
  `);
    stmt.run(title, now, id);
}

export function deleteThread(id: string): void {
    const stmt = db.prepare('DELETE FROM threads WHERE id = ?');
    stmt.run(id);
}

export function touchThread(id: string): void {
    const now = Math.floor(Date.now() / 1000);
    const stmt = db.prepare('UPDATE threads SET updated_at = ? WHERE id = ?');
    stmt.run(now, id);
}

// Message operations
export function getMessagesByThreadId(threadId: string): Message[] {
    const stmt = db.prepare(`
    SELECT id, thread_id as threadId, role, content, tool_calls as toolCalls, created_at as createdAt 
    FROM messages 
    WHERE thread_id = ? 
    ORDER BY created_at ASC
  `);
    return stmt.all(threadId) as Message[];
}

export function createMessage(
    id: string,
    threadId: string,
    role: Message['role'],
    content: string,
    toolCalls?: string
): Message {
    const now = Math.floor(Date.now() / 1000);
    const stmt = db.prepare(`
    INSERT INTO messages (id, thread_id, role, content, tool_calls, created_at) 
    VALUES (?, ?, ?, ?, ?, ?)
  `);
    stmt.run(id, threadId, role, content, toolCalls || null, now);

    // Update thread's updated_at
    touchThread(threadId);

    return { id, threadId, role, content, toolCalls, createdAt: now };
}

export function deleteMessagesByThreadId(threadId: string): void {
    const stmt = db.prepare('DELETE FROM messages WHERE thread_id = ?');
    stmt.run(threadId);
}

export function deleteMessage(id: string): void {
    const stmt = db.prepare('DELETE FROM messages WHERE id = ?');
    stmt.run(id);
}

export default db;
