import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import {
    getAllThreads,
    getThread,
    createThread,
    updateThreadTitle,
    deleteThread,
    getMessagesByThreadId,
    deleteMessagesByThreadId,
} from '@/app/lib/db';

// GET /api/threads - List all threads
// GET /api/threads?id=xxx - Get specific thread with messages
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (id) {
        const thread = getThread(id);
        if (!thread) {
            return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
        }
        const messages = getMessagesByThreadId(id);
        return NextResponse.json({ thread, messages });
    }

    const threads = getAllThreads();
    return NextResponse.json({ threads });
}

// POST /api/threads - Create a new thread
export async function POST(req: Request) {
    const body = await req.json();
    const id = body.id || uuidv4();
    const title = body.title || 'New Chat';

    const thread = createThread(id, title);
    return NextResponse.json({ thread });
}

// PATCH /api/threads - Update thread title
export async function PATCH(req: Request) {
    const { id, title } = await req.json();

    if (!id || !title) {
        return NextResponse.json({ error: 'id and title are required' }, { status: 400 });
    }

    const thread = getThread(id);
    if (!thread) {
        return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }

    updateThreadTitle(id, title);
    return NextResponse.json({ success: true });
}

// DELETE /api/threads - Delete a thread
export async function DELETE(req: Request) {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const thread = getThread(id);
    if (!thread) {
        return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }

    deleteMessagesByThreadId(id);
    deleteThread(id);
    return NextResponse.json({ success: true });
}
