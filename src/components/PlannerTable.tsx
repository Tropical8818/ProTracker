'use client';

import { useState, useMemo } from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown, Download } from 'lucide-react';
import { format, isValid, parseISO } from 'date-fns';
import type { Order } from '@/lib/excel';

interface Props {
    orders: Order[];
    steps: string[];
    detailColumns?: string[];  // Dynamic detail columns from config
    onNavigate: (woId: string) => void;
    pMode?: boolean;
    onSetP?: (woId: string, step: string, currentValue: string) => void;
    naMode?: boolean;
    onSetNA?: (woId: string, step: string, currentVal: string) => void;
    onBulkSetP?: (step: string) => void;
    onBulkSetNA?: (step: string) => void;
    holdMode?: boolean;
    onSetHold?: (woId: string, step: string, currentVal: string) => void;
    onBulkSetHold?: (step: string) => void;
    qnMode?: boolean;
    onSetQN?: (woId: string, step: string, currentVal: string) => void;
    onBulkSetQN?: (step: string) => void;
    wipMode?: boolean;
    onSetWIP?: (woId: string, step: string, currentVal: string) => void;
    onBulkSetWIP?: (step: string) => void;
    completeMode?: boolean;
    onSetComplete?: (woId: string, step: string) => void;
    onBulkSetComplete?: (step: string) => void;
    eraseMode?: boolean;
    onErase?: (woId: string, step: string) => void;
    highlightedWos: string[];
    extraColumns?: string[];
}

type SortDir = 'asc' | 'desc' | null;

// Abbreviation mapping for long step names
const STEP_ABBREV: Record<string, string> = {
    'WO Released': 'WO Rel',
    'Housing Readiness': 'Housing',
    'Shaft Readiness': 'Shaft',
    'MTR Material Received': 'MTR Mat',
    'Lam Pressing': 'Lam',
    '1st Straigtening': '1st Str',
    'Flush & Dry': 'F&D',
    'ENCAP Flush & Dry': 'ENC F&D',
    'Mag Wire Cutting': 'MagWire',
    'Winding': 'Wind',
    'Epoxy': 'Epoxy',
    'GT ENCAP LEAD': 'GT ENC',
    'ENCAP': 'ENCAP',
    'Shaft Straighten': 'Sh Str',
    'PICKING': 'PICK',
    'Lead': 'Lead',
    'Motor ASSY': 'Mtr Assy',
    'WELDING': 'WELD',
    'Dye Pen': 'DyePen',
    'Painting': 'Paint',
    'MIST': 'MIST',
    'Outgoing': 'Outgo',
    'Receipt': 'Receipt',
};

// Get abbreviated step name or use original if not mapped
function getStepAbbrev(step: string): string {
    return STEP_ABBREV[step] || step;
}

export default function PlannerTable({
    orders,
    steps: orderedSteps, // Renamed to avoid conflict with local 'steps' variable
    detailColumns = [], // Default to empty array if not provided
    onNavigate,
    pMode,
    onSetP,
    naMode,
    onSetNA,
    onBulkSetP,
    onBulkSetNA,
    holdMode,
    onSetHold,
    onBulkSetHold,
    qnMode,
    onSetQN,
    onBulkSetQN,
    wipMode,
    onSetWIP,
    onBulkSetWIP,
    completeMode,
    onSetComplete,
    onBulkSetComplete,
    eraseMode = false,
    onErase,
    highlightedWos = [],
    extraColumns = []
}: Props) {
    const [sortKey, setSortKey] = useState<string | null>(null);
    const [sortDir, setSortDir] = useState<SortDir>(null);
    const [filters, setFilters] = useState<Record<string, string>>({});

    // Calculate optimal column width based on content length
    const calculateColumnWidth = (col: string, orders: Order[], isStep: boolean): string => {
        // Sample content from first 20 orders for performance
        const sampleOrders = orders.slice(0, Math.min(20, orders.length));
        const contents = sampleOrders.map(o => String(o[col] || '')).filter(c => c);

        // Get max content length (including header)
        const maxLength = Math.max(
            col.length,
            ...contents.map(c => c.length)
        );

        // Different sizing strategies for steps vs detail columns
        if (isStep) {
            // Step columns: compact sizing (36-80px)
            const baseWidth = Math.max(36, Math.min(80, maxLength * 8));
            return `${baseWidth}px`;
        } else {
            // Detail columns: compact (60-100px)
            const baseWidth = Math.max(60, Math.min(100, maxLength * 8));
            return `${baseWidth}px`;
        }
    };

    const handleSort = (key: string) => {
        if (sortKey === key) {
            if (sortDir === 'asc') setSortDir('desc');
            else if (sortDir === 'desc') { setSortKey(null); setSortDir(null); }
        } else {
            setSortKey(key);
            setSortDir('asc');
        }
    };

    const formatDate = (val: string) => {
        if (!val) return '';
        try {
            const date = new Date(val);
            if (isValid(date)) return format(date, 'dd-MMM-yy');
        } catch { }
        return val.split('T')[0] || val;
    };

    const getCellStyle = (val: string): React.CSSProperties => {
        if (!val) return {};
        const v = val.toUpperCase();
        if (v.startsWith('P,') || v === 'P') return { backgroundColor: '#0014DC', color: 'white' };
        if (v === 'HOLD') return { backgroundColor: '#FDBA74', color: '#9A3412', fontWeight: 'bold' };
        if (v === 'WIP') return { backgroundColor: '#FEF9C3', color: '#854D0E', fontWeight: 'bold' }; // Yellow for WIP
        if (v === 'QN' || v === 'DIFA') return { backgroundColor: '#FEE2E2', color: '#B91C1C' };
        if (v === 'N/A') return { backgroundColor: '#E5E7EB', color: '#6B7280' };
        if (/\d{4}-\d{2}-\d{2}/.test(val) || /\d{2}[-\/]\w{3}/.test(val)) {
            return { backgroundColor: '#D1FAE5', color: '#065F46' };
        }
        return {};
    };

    const getPriorityStyle = (val: string): React.CSSProperties => {
        if (val === '!!!') return { backgroundColor: '#FEE2E2', color: '#B91C1C', fontWeight: 'bold' };
        if (val === '!!') return { backgroundColor: '#FED7AA', color: '#9A3412', fontWeight: 'bold' };
        if (val === '!') return { backgroundColor: '#D9F99D', color: '#3F6212', fontWeight: 'bold' };
        return {};
    };

    // Identify completion column once
    const completionStep = useMemo(() => {
        return orderedSteps.find(s =>
            s.toLowerCase() === 'receipt' ||
            s.toLowerCase() === 'outgoing' ||
            s.toLowerCase() === 'completion'
        ) || orderedSteps[orderedSteps.length - 1];
    }, [orderedSteps]);

    const isOrderCompleted = (order: Order) => {
        if (!completionStep) return false;
        const val = order[completionStep] as string; // Type assertion
        if (!val) return false;
        return /\d{4}-\d{2}-\d{2}/.test(val) || /\d{2}[-\/]\w{3}/.test(val);
    };

    // Due date warning - returns style and countdown text
    const getDueDateInfo = (val: string, order: Order): { style: React.CSSProperties; countdown: string } => {
        if (!val) return { style: {}, countdown: '' };

        // If completed, do not show overdue warning
        if (isOrderCompleted(order)) return { style: {}, countdown: '' };

        try {
            const dueDate = new Date(val);
            if (!isValid(dueDate)) return { style: {}, countdown: '' };

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            dueDate.setHours(0, 0, 0, 0);

            const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

            if (diffDays < 0) {
                // Overdue = light red
                return {
                    style: { backgroundColor: '#FEE2E2', color: '#B91C1C', fontWeight: 'bold' },
                    countdown: `${Math.abs(diffDays)}d late!`
                };
            }
            if (diffDays === 0) {
                // Today = yellow
                return {
                    style: { backgroundColor: '#FBBF24', color: '#78350F', fontWeight: 'bold' },
                    countdown: 'TODAY!'
                };
            }
            if (diffDays <= 3) {
                // ≤3 days = light yellow
                return {
                    style: { backgroundColor: '#FEF3C7', color: '#92400E' },
                    countdown: `${diffDays}d`
                };
            }
            if (diffDays <= 7) {
                // ≤7 days = no color, just show countdown
                return {
                    style: {},
                    countdown: `${diffDays}d`
                };
            }
            return { style: {}, countdown: '' };
        } catch {
            return { style: {}, countdown: '' };
        }
    };

    const formatCellValue = (val: string) => {
        if (!val) return '';
        if (val.toUpperCase().startsWith('P,')) return 'P';
        if (/\d{4}-\d{2}-\d{2}/.test(val)) {
            const match = val.match(/(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})/);
            if (match) {
                try {
                    const date = new Date(val.split(' ')[0]);
                    if (isValid(date)) return format(date, 'dd-MMM') + ', ' + match[2];
                } catch { }
            }
            return formatDate(val);
        }
        return val;
    };

    // Calculate P + WIP counts for summary row
    const pCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        orderedSteps.forEach(step => {
            counts[step] = orders.filter(o => {
                const v = (o[step] || '').toUpperCase();
                // Count both P and WIP (WIP is also a type of P)
                return v === 'P' || v.startsWith('P,') || v === 'WIP' || v.startsWith('WIP,');
            }).length;
        });
        return counts;
    }, [orders, orderedSteps]);

    // Apply filters and sorting
    const processedOrders = useMemo(() => {
        let result = [...orders];

        // Filter
        Object.entries(filters).forEach(([key, value]) => {
            if (value) {
                result = result.filter(o =>
                    String(o[key] || '').toLowerCase().includes(value.toLowerCase())
                );
            }
        });

        // Sort
        if (sortKey && sortDir) {
            result.sort((a, b) => {
                const aVal = String(a[sortKey] || '');
                const bVal = String(b[sortKey] || '');
                const cmp = aVal.localeCompare(bVal);
                return sortDir === 'asc' ? cmp : -cmp;
            });
        }

        return result;
    }, [orders, filters, sortKey, sortDir]);

    // Use provided detail columns or fallback to defaults
    // Combine columns: Details + Steps
    // Integrate extraColumns (ECD) into details after WO DUE
    let effectiveDetailColumns = detailColumns.length > 0 ? detailColumns : ['WO ID', 'PN', 'Description', 'WO DUE', 'Priority'];

    // Insert extraColumns (like ECD) after WO DUE if present
    if (extraColumns.length > 0) {
        const woDueIndex = effectiveDetailColumns.indexOf('WO DUE');
        if (woDueIndex !== -1) {
            const newCols = [...effectiveDetailColumns];
            newCols.splice(woDueIndex + 1, 0, ...extraColumns);
            effectiveDetailColumns = newCols;
        } else {
            // Fallback: append if WO DUE not found
            effectiveDetailColumns = [...effectiveDetailColumns, ...extraColumns];
        }
    }

    const columns = [...effectiveDetailColumns, ...orderedSteps];

    // Memoize column widths for performance
    // AGGRESSIVE FIXED WIDTHS - ensure all steps visible without scrolling
    const columnWidths = useMemo(() => {
        const widths: Record<string, string> = {};

        // FIXED widths for detail columns - minimal to maximize step space
        effectiveDetailColumns.forEach((col) => {
            if (col === 'WO ID') {
                widths[col] = '70px';  // Must see full WO ID
            } else if (col === 'PN') {
                widths[col] = '50px';  // Compact PN
            } else if (col === 'Description') {
                widths[col] = '40px';  // Reduced from 60px
            } else if (col === 'Remarks') {
                widths[col] = '40px';  // Reduced from 60px
            } else {
                widths[col] = '20px';  // All other columns minimal
            }
        });

        // FIXED width for ALL step columns - 35px each
        // 23 steps × 35px = 805px + ~260px details = ~1065px (fits in 1366px screen)
        orderedSteps.forEach(step => {
            widths[step] = '35px';
        });

        return widths;
    }, [effectiveDetailColumns, orderedSteps]);

    return (
        <div className="overflow-auto bg-white rounded-xl shadow-sm border border-slate-200 max-h-[calc(100vh-200px)]">
            <table className="text-xs border-collapse w-full">
                <thead className="sticky top-0 z-20 bg-white">
                    {/* Summary Row */}
                    <tr className="bg-slate-50 border-b border-slate-200">
                        <td className="px-1 py-0.5 text-center font-bold text-amber-600 bg-slate-50 sticky left-0 z-30 min-w-[70px]">
                            WO: {orders.length}
                        </td>
                        {effectiveDetailColumns.length > 1 && (
                            <td colSpan={effectiveDetailColumns.length - 1} className="px-2 py-1 text-right font-medium text-slate-500 bg-slate-50">P+WIP:</td>
                        )}

                        {orderedSteps.map(step => {
                            const count = pCounts[step] || 0;
                            return (
                                <td
                                    key={step}
                                    className={`px-1 py-1 text-center font-bold bg-slate-50 ${count === 0 ? 'text-red-600 bg-red-50' : 'text-blue-600 bg-blue-50'
                                        }`}
                                >
                                    {count}
                                </td>
                            );
                        })}
                    </tr>

                    {/* Header Row */}
                    <tr className="bg-slate-100">
                        {effectiveDetailColumns.map((col, i) => (
                            <th
                                key={col}
                                style={{
                                    width: columnWidths[col],
                                    minWidth: i === 0 ? '70px' : undefined
                                }}
                                className={`px-0.5 py-1 font-semibold text-slate-700 cursor-pointer hover:bg-slate-200 whitespace-nowrap border-r border-slate-200 bg-slate-100 ${i === 0 ? 'sticky left-0 z-30' : ''
                                    } ${i >= 5 ? 'text-center text-[9px]' : 'text-left text-[10px]'}`}
                                onClick={() => handleSort(col)}
                                title={col}
                            >
                                <div className="flex items-center gap-0.5 justify-center">
                                    <span>{i >= 5 ? getStepAbbrev(col) : col}</span>
                                    {sortKey === col ? (
                                        sortDir === 'asc' ? <ArrowUp className="w-2 h-2" /> : <ArrowDown className="w-2 h-2" />
                                    ) : (
                                        <ArrowUpDown className="w-2 h-2 opacity-30" />
                                    )}
                                </div>
                            </th>
                        ))}

                        {orderedSteps.map(step => {
                            // Calculate step counts - only count dates as completed
                            const completeCount = processedOrders.filter(o => {
                                const val = o[step] || '';
                                return /\d{4}-\d{2}-\d{2}/.test(val) || /\d{2}[-\/]\w{3}/.test(val);
                            }).length;
                            const naCount = processedOrders.filter(o => o[step] === 'N/A').length;
                            const pendingCount = processedOrders.length - completeCount - naCount;

                            const isBulkP = pMode && onBulkSetP;
                            const isBulkNA = naMode && onBulkSetNA;
                            const isBulkHold = holdMode && onBulkSetHold;
                            const isBulkQN = qnMode && onBulkSetQN;
                            const isBulkWIP = wipMode && onBulkSetWIP;
                            const isBulkComplete = completeMode && onBulkSetComplete;

                            return (
                                <th
                                    key={step}
                                    style={{ width: columnWidths[step] }}
                                    className={`px-0.5 py-1 text-[10px] font-semibold text-slate-600 bg-slate-50 border-r border-slate-200
                                        ${isBulkP ? 'cursor-pointer hover:bg-blue-100 ring-inset hover:ring-2 hover:ring-blue-300' : ''}
                                        ${isBulkNA ? 'cursor-pointer hover:bg-slate-200 ring-inset hover:ring-2 hover:ring-slate-400' : ''}
                                        ${isBulkHold ? 'cursor-pointer hover:bg-orange-100 ring-inset hover:ring-2 hover:ring-orange-300' : ''}
                                        ${isBulkQN ? 'cursor-pointer hover:bg-red-100 ring-inset hover:ring-2 hover:ring-red-300' : ''}
                                        ${isBulkWIP ? 'cursor-pointer hover:bg-yellow-100 ring-inset hover:ring-2 hover:ring-yellow-300' : ''}
                                        ${isBulkComplete ? 'cursor-pointer hover:bg-green-100 ring-inset hover:ring-2 hover:ring-green-300' : ''}
                                    `}
                                    onClick={() => {
                                        if (isBulkP && onBulkSetP) onBulkSetP(step);
                                        else if (isBulkNA && onBulkSetNA) onBulkSetNA(step);
                                        else if (isBulkHold && onBulkSetHold) onBulkSetHold(step);
                                        else if (isBulkQN && onBulkSetQN) onBulkSetQN(step);
                                        else if (isBulkWIP && onBulkSetWIP) onBulkSetWIP(step);
                                        else if (isBulkComplete && onBulkSetComplete) onBulkSetComplete(step);
                                        else handleSort(step);
                                    }}
                                    title={isBulkP ? `Click to Fill ${step} with P` : isBulkNA ? `Click to Fill ${step} with N/A` : isBulkHold ? `Click to Fill ${step} with Hold` : isBulkQN ? `Click to Fill ${step} with QN` : isBulkWIP ? `Click to Fill ${step} with WIP` : isBulkComplete ? `Click to Fill ${step} with Today's Date` : `Click to sort by ${step}`}
                                >
                                    <div className="flex flex-col items-center w-full">
                                        <div className="flex items-center gap-0.5 justify-center w-full">
                                            <span className="truncate text-center">{getStepAbbrev(step)}</span>
                                            {sortKey === step && (
                                                sortDir === 'asc' ? <ArrowUp className="w-2 h-2 text-indigo-500" /> : <ArrowDown className="w-2 h-2 text-indigo-500" />
                                            )}
                                        </div>
                                        <div className="flex gap-0.5 mt-1 font-normal text-[9px] opacity-70">
                                            <span className="text-green-600" title="Done (with dates)">{completeCount}</span>
                                            <span className="text-slate-400">/</span>
                                            <span className="text-amber-600" title="Empty or status">{pendingCount}</span>
                                        </div>
                                    </div>
                                </th>
                            );
                        })}
                    </tr>

                    {/* Filter Row */}
                    <tr className="bg-white">
                        {columns.map((col, i) => (
                            <th key={col} className={`px-0.5 py-0.5 bg-white border-r border-slate-200 border-b border-slate-200 ${i === 0 ? 'sticky left-0 z-30 min-w-[70px]' : ''}`}>
                                <input
                                    type="text"
                                    placeholder=".."
                                    className="w-full px-0.5 py-0 text-[10px] text-black font-medium placeholder:text-slate-400 border border-slate-300 rounded focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-300"
                                    value={filters[col] || ''}
                                    onChange={(e) => setFilters({ ...filters, [col]: e.target.value })}
                                />
                            </th>
                        ))}
                    </tr>
                </thead>

                <tbody>
                    {processedOrders.map((order, idx) => (
                        <tr key={order.id} className={`border-b border-slate-100 hover:bg-slate-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                            {/* Detail Columns - Dynamic Rendering */}
                            {effectiveDetailColumns.map((col, colIdx) => {
                                const value = order[col] || '';
                                const colUpper = col.toUpperCase();

                                // WO ID - Clickable, first column sticky
                                if (col === 'WO ID') {
                                    return (
                                        <td
                                            key={col}
                                            style={{ width: columnWidths[col], minWidth: '70px' }}
                                            className="px-1 py-0.5 sticky left-0 bg-inherit z-10 cursor-pointer text-indigo-600 hover:underline font-medium text-[10px] border-r border-slate-200"
                                            onClick={() => onNavigate(value)}
                                        >
                                            {value}
                                        </td>
                                    );
                                }

                                // Due Date - Fuzzy match "DUE"
                                if (colUpper.includes('DUE')) {
                                    const { style, countdown } = getDueDateInfo(value, order);
                                    return (
                                        <td
                                            key={col}
                                            className="px-1 py-0.5 whitespace-nowrap text-[9px] border-r border-slate-200 text-center"
                                            style={style}
                                        >
                                            {formatDate(value)}
                                        </td>
                                    );
                                }

                                // Priority - Fuzzy match "PRIORITY"
                                if (colUpper.includes('PRIORITY')) {
                                    return (
                                        <td key={col} className="px-1 py-0.5 text-center text-[9px] border-r border-slate-200" style={getPriorityStyle(value)}>
                                            {value}
                                        </td>
                                    );
                                }

                                // Description - With tooltip
                                if (col === 'Description') {
                                    return (
                                        <td key={col} style={{ width: columnWidths[col] }} className="px-1 py-0.5 truncate text-slate-700 text-[9px] border-r border-slate-200" title={value}>
                                            {value}
                                        </td>
                                    );
                                }

                                // Default rendering for other detail columns
                                return (
                                    <td
                                        key={col}
                                        style={{ width: columnWidths[col] }}
                                        className={`px-1 py-0.5 text-slate-700 text-[9px] border-r border-slate-200 ${colIdx === 0 ? 'sticky left-0 bg-inherit z-10' : 'truncate'}`}
                                        title={value}
                                    >
                                        {value}
                                    </td>
                                );
                            })}



                            {/* Process Steps */}
                            {orderedSteps.map(step => {
                                const cellValue = order[step] || '';
                                const upperValue = cellValue.toUpperCase();

                                // P Mode logic
                                const isPClickable = pMode && onSetP && (!cellValue || upperValue === 'P');
                                const isPRemovable = pMode && onSetP && upperValue === 'P';

                                // N/A Mode logic
                                const isNAClickable = naMode && onSetNA && (!cellValue || upperValue === 'N/A');
                                const isNARemovable = naMode && onSetNA && upperValue === 'N/A';

                                // Hold Mode logic
                                const isHoldClickable = holdMode && onSetHold && (!cellValue || upperValue === 'HOLD');
                                const isHoldRemovable = holdMode && onSetHold && upperValue === 'HOLD';

                                // QN Mode logic
                                const isQNClickable = qnMode && onSetQN && (!cellValue || upperValue === 'QN');
                                const isQNRemovable = qnMode && onSetQN && upperValue === 'QN';

                                // WIP Mode logic
                                const isWIPClickable = wipMode && onSetWIP && (!cellValue || upperValue === 'WIP');
                                const isWIPRemovable = wipMode && onSetWIP && upperValue === 'WIP';

                                // Complete Mode logic - can click empty cells to fill with date
                                const isCompleteClickable = completeMode && onSetComplete && !cellValue;

                                // Erase Mode logic - can click any cell with content
                                const isEraseClickable = eraseMode && onErase && !!cellValue;

                                const isClickable = isPClickable || isNAClickable || isHoldClickable || isQNClickable || isWIPClickable || isCompleteClickable || isEraseClickable;
                                const isRemovable = isPRemovable || isNARemovable || isHoldRemovable || isQNRemovable || isWIPRemovable;

                                return (
                                    <td
                                        key={step}
                                        className={`px-0.5 py-0.5 text-center text-[9px] tracking-tighter font-medium whitespace-nowrap border-r border-slate-100 ${isEraseClickable
                                            ? 'cursor-pointer hover:bg-red-200 hover:ring-2 hover:ring-red-400'
                                            : isRemovable
                                                ? 'cursor-pointer hover:bg-red-100 hover:ring-2 hover:ring-red-300'
                                                : isPClickable
                                                    ? 'cursor-pointer hover:bg-blue-100 hover:ring-2 hover:ring-blue-300'
                                                    : isNAClickable
                                                        ? 'cursor-pointer hover:bg-slate-200 hover:ring-2 hover:ring-slate-400'
                                                        : isHoldClickable
                                                            ? 'cursor-pointer hover:bg-orange-100 hover:ring-2 hover:ring-orange-300'
                                                            : isQNClickable
                                                                ? 'cursor-pointer hover:bg-red-100 hover:ring-2 hover:ring-red-300'
                                                                : isWIPClickable
                                                                    ? 'cursor-pointer hover:bg-yellow-100 hover:ring-2 hover:ring-yellow-300'
                                                                    : isCompleteClickable
                                                                        ? 'cursor-pointer hover:bg-green-100 hover:ring-2 hover:ring-green-300'
                                                                        : ''
                                            }`}
                                        style={{ width: columnWidths[step], ...getCellStyle(cellValue) }}
                                        onClick={() => {
                                            if (isEraseClickable && onErase) {
                                                onErase(order['WO ID'], step);
                                            } else if (isPClickable && onSetP) {
                                                onSetP(order['WO ID'], step, cellValue);
                                            } else if (isNAClickable && onSetNA) {
                                                onSetNA(order['WO ID'], step, cellValue);
                                            } else if (isHoldClickable && onSetHold) {
                                                onSetHold(order['WO ID'], step, cellValue);
                                            } else if (isQNClickable && onSetQN) {
                                                onSetQN(order['WO ID'], step, cellValue);
                                            } else if (isWIPClickable && onSetWIP) {
                                                onSetWIP(order['WO ID'], step, cellValue);
                                            } else if (isCompleteClickable && onSetComplete) {
                                                onSetComplete(order['WO ID'], step);
                                            }
                                        }}
                                        title={
                                            isEraseClickable ? 'Click to erase'
                                                : isPRemovable ? 'Click to remove P'
                                                    : isPClickable ? 'Click to set P'
                                                        : isNARemovable ? 'Click to remove N/A'
                                                            : isNAClickable ? 'Click to set N/A'
                                                                : isHoldRemovable ? 'Click to remove Hold'
                                                                    : isHoldClickable ? 'Click to set Hold'
                                                                        : isQNRemovable ? 'Click to remove QN'
                                                                            : isQNClickable ? 'Click to set QN'
                                                                                : isWIPRemovable ? 'Click to remove WIP'
                                                                                    : isWIPClickable ? 'Click to set WIP'
                                                                                        : isCompleteClickable ? 'Click to mark Complete with date'
                                                                                            : ''
                                        }
                                    >
                                        {formatCellValue(cellValue)}
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>

            {
                processedOrders.length === 0 && (
                    <div className="py-10 text-center text-slate-400">No orders found</div>
                )
            }
        </div >
    );
}
