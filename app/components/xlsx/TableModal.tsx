'use client';

import { useState, useCallback } from 'react';

interface TableModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: {
        headers: string[];
        rows: (string | number | boolean | null)[][];
        range: string;
    } | null;
    onInsertReference: (reference: string) => void;
}

export default function TableModal({ isOpen, onClose, data, onInsertReference }: TableModalProps) {
    const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
    const [isSelecting, setIsSelecting] = useState(false);
    const [selectionStart, setSelectionStart] = useState<{ row: number; col: number } | null>(null);

    if (!isOpen || !data) return null;

    // Parse sheet name from range
    const sheetName = data.range.split('!')[0];

    // Convert column index to letter
    const colToLetter = (col: number): string => {
        let letter = '';
        let c = col;
        while (c >= 0) {
            letter = String.fromCharCode((c % 26) + 65) + letter;
            c = Math.floor(c / 26) - 1;
        }
        return letter;
    };

    // Generate cell reference
    const getCellRef = (row: number, col: number): string => {
        return `${colToLetter(col)}${row + 1}`;
    };

    // Handle mouse down on cell
    const handleMouseDown = (row: number, col: number) => {
        setIsSelecting(true);
        setSelectionStart({ row, col });
        setSelectedCells(new Set([getCellRef(row, col)]));
    };

    // Handle mouse enter on cell (for drag selection)
    const handleMouseEnter = (row: number, col: number) => {
        if (!isSelecting || !selectionStart) return;

        const minRow = Math.min(selectionStart.row, row);
        const maxRow = Math.max(selectionStart.row, row);
        const minCol = Math.min(selectionStart.col, col);
        const maxCol = Math.max(selectionStart.col, col);

        const newSelection = new Set<string>();
        for (let r = minRow; r <= maxRow; r++) {
            for (let c = minCol; c <= maxCol; c++) {
                newSelection.add(getCellRef(r, c));
            }
        }
        setSelectedCells(newSelection);
    };

    // Handle mouse up
    const handleMouseUp = () => {
        setIsSelecting(false);
    };

    // Get selection range string
    const getSelectionRange = (): string => {
        if (selectedCells.size === 0) return '';

        const cells = Array.from(selectedCells).sort((a, b) => {
            const aCol = a.replace(/[0-9]/g, '');
            const aRow = parseInt(a.replace(/[^0-9]/g, ''));
            const bCol = b.replace(/[0-9]/g, '');
            const bRow = parseInt(b.replace(/[^0-9]/g, ''));
            if (aCol !== bCol) return aCol.localeCompare(bCol);
            return aRow - bRow;
        });

        if (cells.length === 1) {
            return `@${sheetName}!${cells[0]}`;
        }

        return `@${sheetName}!${cells[0]}:${cells[cells.length - 1]}`;
    };

    // Insert reference
    const handleInsertReference = () => {
        const reference = getSelectionRange();
        if (reference) {
            onInsertReference(reference);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div
                className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-4xl max-h-[80vh] w-full mx-4 flex flex-col"
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
                    <div>
                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                            Spreadsheet View
                        </h2>
                        <p className="text-sm text-zinc-500">{data.range}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Selection info */}
                {selectedCells.size > 0 && (
                    <div className="px-6 py-3 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                                Selected: {getSelectionRange()}
                            </span>
                            <span className="text-xs text-blue-500">
                                ({selectedCells.size} cell{selectedCells.size !== 1 ? 's' : ''})
                            </span>
                        </div>
                        <button
                            onClick={handleInsertReference}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                            Insert Reference
                        </button>
                    </div>
                )}

                {/* Table */}
                <div className="flex-1 overflow-auto p-6">
                    <table className="min-w-full border-collapse select-none">
                        <thead>
                            <tr>
                                <th className="sticky top-0 left-0 z-20 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-500">

                                </th>
                                {data.headers.map((header, i) => (
                                    <th
                                        key={i}
                                        className="sticky top-0 z-10 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-left font-medium text-zinc-700 dark:text-zinc-300"
                                    >
                                        <div className="text-xs text-zinc-400 mb-1">{colToLetter(i)}</div>
                                        {header}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {data.rows.map((row, rowIndex) => (
                                <tr key={rowIndex}>
                                    <td className="sticky left-0 z-10 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-500 text-center">
                                        {rowIndex + 2}
                                    </td>
                                    {row.map((cell, colIndex) => {
                                        const cellRef = getCellRef(rowIndex + 1, colIndex);
                                        const isSelected = selectedCells.has(cellRef);

                                        return (
                                            <td
                                                key={colIndex}
                                                className={`border border-zinc-300 dark:border-zinc-700 px-4 py-2 cursor-cell transition-colors ${isSelected
                                                        ? 'bg-blue-100 dark:bg-blue-900/40 ring-2 ring-blue-500 ring-inset'
                                                        : 'bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                                                    }`}
                                                onMouseDown={() => handleMouseDown(rowIndex + 1, colIndex)}
                                                onMouseEnter={() => handleMouseEnter(rowIndex + 1, colIndex)}
                                            >
                                                {String(cell ?? '')}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 text-sm text-zinc-500">
                    Click and drag to select cells, then click "Insert Reference" to add to your message.
                </div>
            </div>
        </div>
    );
}
