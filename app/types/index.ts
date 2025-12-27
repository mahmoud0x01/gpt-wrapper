// Types for the ChatGPT clone application

export interface Thread {
    id: string;
    title: string;
    createdAt: number;
    updatedAt: number;
}

export interface Message {
    id: string;
    threadId: string;
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: string;
    toolCalls?: string; // JSON serialized tool calls
    createdAt: number;
}

// XLSX related types
export interface CellReference {
    sheet: string;
    cell: string; // e.g., "A1"
}

export interface RangeReference {
    sheet: string;
    from: string; // e.g., "A1"
    to: string;   // e.g., "B5"
}

export interface CellData {
    address: string;
    value: string | number | boolean | null;
    formula?: string;
}

export interface TableData {
    headers: string[];
    rows: (string | number | boolean | null)[][];
    range: string; // e.g., "Sheet1!A1:C10"
}

// Tool parameter types
export interface ConfirmActionParams {
    action: 'update' | 'delete';
    description: string;
    data?: Record<string, unknown>;
}

export interface GetRangeParams {
    sheet: string;
    from: string;
    to: string;
}

export interface UpdateCellParams {
    sheet: string;
    cell: string;
    value: string | number;
    confirmed?: boolean;
}

// API response types
export interface ThreadsResponse {
    threads: Thread[];
}

export interface MessagesResponse {
    messages: Message[];
}
