# ChatGPT Clone with XLSX Integration

A simplified ChatGPT-like interface built with Next.js 15, Vercel AI SDK, and SQLite persistence. Features threaded conversations, generative UI tools, and spreadsheet manipulation capabilities.

## Features

- **Threaded Conversations**: Create, switch, and delete chat threads with persistent storage
- **AI-Powered Chat**: Streaming responses using Vercel AI SDK with GPT-4o-mini
- **Generative UI Tools**: 
  - `getRange` - Read spreadsheet data with table visualization
  - `updateCell` - Update cells with confirmation UI
  - `readCell` - Read single cells and formulas
  - `deleteThread` - Delete threads with confirmation
- **XLSX Integration**:
  - Interactive table modal with drag-to-select cells
  - Cell range references (`@Sheet1!A1:B5`) in messages
  - Auto-generated sample spreadsheet
- **Confirmation Flow**: Dangerous actions (update/delete) require user confirmation

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **AI**: Vercel AI SDK + OpenAI GPT-4o-mini
- **Database**: SQLite via better-sqlite3
- **Styling**: Tailwind CSS
- **Spreadsheets**: xlsx library

## Getting Started

### Prerequisites

- Node.js 18+ or Bun 1.3+
- OpenAI API key

### Installation

```bash
# Install dependencies
npm install

# Create .env.local with your OpenAI API key
echo "OPENAI_API_KEY=your-key-here" > .env.local
```

### Running the App

```bash
# Development
npm run dev

# Production build
npm run build
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
app/
├── api/
│   ├── chat/route.ts       # Chat streaming endpoint with tools
│   └── threads/route.ts    # Thread CRUD endpoints
├── components/
│   ├── chat/ChatArea.tsx   # Main chat with useChat hook
│   ├── threads/ThreadList.tsx
│   └── xlsx/TableModal.tsx # Cell selection modal
├── lib/
│   ├── db/index.ts         # SQLite operations
│   ├── xlsx/index.ts       # Spreadsheet utilities
│   └── tools/definitions.ts
├── types/index.ts
├── layout.tsx
└── page.tsx
data/
├── chat.db                 # SQLite database (auto-created)
└── example.xlsx            # Sample spreadsheet (auto-created)
```

## Usage Examples

1. **Read spreadsheet data**: "Show me the data in Sheet1 from A1 to D7"
2. **Update a cell**: "Update cell C3 to 2500" (requires confirmation)
3. **Read formulas**: "What formula is in cell D4?"
4. **Use cell references**: After clicking a table, select cells and insert reference like `@Sheet1!B2:B5`

## Database

SQLite database is auto-initialized at `data/chat.db` with tables:
- `threads`: id, title, created_at, updated_at
- `messages`: id, thread_id, role, content, tool_calls, created_at

## Limitations

- Uses npm instead of Bun (Bun install had network issues)
- Single XLSX file at `data/example.xlsx`
- No authentication
- No real email sending (logged only)

## What's Implemented

✅ Thread management (create, switch, delete)  
✅ Chat with streaming AI responses  
✅ Message persistence in SQLite  
✅ Generative UI tools with Zod schemas  
✅ Confirmation flow for dangerous actions  
✅ XLSX reading with table visualization  
✅ XLSX writing with confirmation  
✅ Cell selection modal  
✅ Range reference insertion  
✅ Dark mode UI  

## Future Improvements

- E2E tests with Playwright
- Multiple file support
- Real-time collaboration
- Export conversations
