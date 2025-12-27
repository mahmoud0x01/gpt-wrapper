import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import type { TableData, RangeReference, CellData } from '@/app/types';

const XLSX_PATH = path.join(process.cwd(), 'data', 'example.xlsx');

// Ensure the XLSX file exists with sample data
function ensureXlsxExists(): void {
    if (!fs.existsSync(XLSX_PATH)) {
        createSampleXlsx();
    }
}

function createSampleXlsx(): void {
    const wb = XLSX.utils.book_new();

    // Sample data with names, emails, amounts, and formulas
    const data = [
        ['Name', 'Email', 'Amount', 'Bonus'],
        ['Alice Smith', 'alice@example.com', 1500, { f: 'C2*0.1' }],
        ['Bob Johnson', 'bob@example.com', 2200, { f: 'C3*0.1' }],
        ['Carol White', 'carol@example.com', 1800, { f: 'C4*0.1' }],
        ['David Brown', 'david@example.com', 3000, { f: 'C5*0.1' }],
        ['Eve Davis', 'eve@example.com', 2500, { f: 'C6*0.1' }],
        ['Total', '', { f: 'SUM(C2:C6)' }, { f: 'SUM(D2:D6)' }],
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);

    // Set column widths
    ws['!cols'] = [
        { width: 15 },
        { width: 25 },
        { width: 12 },
        { width: 12 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

    // Ensure data directory exists
    const dataDir = path.dirname(XLSX_PATH);
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    XLSX.writeFile(wb, XLSX_PATH);
}

// Parse cell reference (e.g., "A1" -> { col: 0, row: 0 })
function parseCellRef(ref: string): { col: number; row: number } {
    const colStr = ref.replace(/[0-9]/g, '');
    const rowStr = ref.replace(/[^0-9]/g, '');

    let col = 0;
    for (let i = 0; i < colStr.length; i++) {
        col = col * 26 + (colStr.charCodeAt(i) - 64);
    }
    col -= 1; // 0-indexed

    return { col, row: parseInt(rowStr) - 1 };
}

// Convert column index to letter (e.g., 0 -> "A", 26 -> "AA")
function colToLetter(col: number): string {
    let letter = '';
    while (col >= 0) {
        letter = String.fromCharCode((col % 26) + 65) + letter;
        col = Math.floor(col / 26) - 1;
    }
    return letter;
}

// Get workbook
function getWorkbook(): XLSX.WorkBook {
    ensureXlsxExists();
    return XLSX.readFile(XLSX_PATH);
}

// Get sheet names
export function getSheetNames(): string[] {
    const wb = getWorkbook();
    return wb.SheetNames;
}

// Read a range of cells
export function readRange(ref: RangeReference): TableData {
    const wb = getWorkbook();
    const ws = wb.Sheets[ref.sheet];

    if (!ws) {
        throw new Error(`Sheet "${ref.sheet}" not found`);
    }

    const fromRef = parseCellRef(ref.from);
    const toRef = parseCellRef(ref.to);

    const headers: string[] = [];
    const rows: (string | number | boolean | null)[][] = [];

    // Read headers from first row
    for (let col = fromRef.col; col <= toRef.col; col++) {
        const cellAddr = colToLetter(col) + (fromRef.row + 1);
        const cell = ws[cellAddr];
        headers.push(cell ? String(cell.v ?? '') : '');
    }

    // Read data rows
    for (let row = fromRef.row + 1; row <= toRef.row; row++) {
        const rowData: (string | number | boolean | null)[] = [];
        for (let col = fromRef.col; col <= toRef.col; col++) {
            const cellAddr = colToLetter(col) + (row + 1);
            const cell = ws[cellAddr];
            rowData.push(cell ? (cell.v ?? null) : null);
        }
        rows.push(rowData);
    }

    return {
        headers,
        rows,
        range: `${ref.sheet}!${ref.from}:${ref.to}`,
    };
}

// Read a single cell
export function readCell(sheet: string, cell: string): CellData {
    const wb = getWorkbook();
    const ws = wb.Sheets[sheet];

    if (!ws) {
        throw new Error(`Sheet "${sheet}" not found`);
    }

    const cellData = ws[cell];

    return {
        address: `${sheet}!${cell}`,
        value: cellData ? (cellData.v ?? null) : null,
        formula: cellData?.f,
    };
}

// Write to a cell
export function writeCell(sheet: string, cell: string, value: string | number): void {
    const wb = getWorkbook();
    const ws = wb.Sheets[sheet];

    if (!ws) {
        throw new Error(`Sheet "${sheet}" not found`);
    }

    // Create or update cell
    if (!ws[cell]) {
        ws[cell] = {};
    }

    ws[cell].v = value;
    ws[cell].t = typeof value === 'number' ? 'n' : 's';
    delete ws[cell].f; // Remove formula if setting a direct value

    // Update sheet range if needed
    const ref = parseCellRef(cell);
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');
    range.e.r = Math.max(range.e.r, ref.row);
    range.e.c = Math.max(range.e.c, ref.col);
    ws['!ref'] = XLSX.utils.encode_range(range);

    XLSX.writeFile(wb, XLSX_PATH);
}

// Parse a mention like "@Sheet1!A1:B5" or "@Sheet1!D4"
export function parseMention(mention: string): RangeReference | { sheet: string; cell: string } {
    const cleaned = mention.replace('@', '');
    const [sheet, range] = cleaned.split('!');

    if (range.includes(':')) {
        const [from, to] = range.split(':');
        return { sheet, from, to };
    }

    return { sheet, cell: range };
}

// Format table data as markdown
export function tableToMarkdown(data: TableData): string {
    const lines: string[] = [];

    // Header row
    lines.push('| ' + data.headers.join(' | ') + ' |');
    lines.push('| ' + data.headers.map(() => '---').join(' | ') + ' |');

    // Data rows
    for (const row of data.rows) {
        lines.push('| ' + row.map(v => String(v ?? '')).join(' | ') + ' |');
    }

    return lines.join('\n');
}

// Get all data from a sheet
export function getSheetData(sheet: string): TableData {
    const wb = getWorkbook();
    const ws = wb.Sheets[sheet];

    if (!ws) {
        throw new Error(`Sheet "${sheet}" not found`);
    }

    const range = ws['!ref'];
    if (!range) {
        return { headers: [], rows: [], range: `${sheet}!A1:A1` };
    }

    const decoded = XLSX.utils.decode_range(range);
    const from = 'A1';
    const to = colToLetter(decoded.e.c) + (decoded.e.r + 1);

    return readRange({ sheet, from, to });
}
