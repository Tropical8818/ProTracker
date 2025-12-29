'use client';

import { useState, useMemo, useEffect } from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown, Download, Lock, Unlock, Trash2 } from 'lucide-react';
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
    role?: string;
    onUpdateDetail?: (woId: string, field: string, value: string) => Promise<void>;
    onDeleteOrder?: (woId: string) => Promise<void>;
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
    extraColumns = [],
    role,


    onUpdateDetail,
    onDeleteOrder
}: Props) {
    const [sortKey, setSortKey] = useState<string | null>(null);
    const [sortDir, setSortDir] = useState<SortDir>(null);

    // --- MANUAL RESIZING LOGIC ---
    const [detailWidths, setDetailWidths] = useState<Record<string, number>>({});
    const [manualStepWidth, setManualStepWidth] = useState<number | null>(null);
    const [resizing, setResizing] = useState<{
        colKey: string;
        startX: number;
        startWidth: number;
        isStep: boolean;
    } | null>(null);
    const [isSuperEditing, setIsSuperEditing] = useState(false);

    useEffect(() => {
        if (!resizing) return;

        const handleMouseMove = (e: MouseEvent) => {
            const diff = e.clientX - resizing.startX;
            const newWidth = Math.max(20, resizing.startWidth + diff); // Min 20px

            if (resizing.isStep) {
                setManualStepWidth(newWidth); // Synchronized!
            } else {
                setDetailWidths(prev => ({ ...prev, [resizing.colKey]: newWidth }));
            }
        };

        const handleMouseUp = () => {
            setResizing(null);
            document.body.style.cursor = 'default';
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = 'col-resize';

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'default';
        };
    }, [resizing]);

    const handleResizeStart = (e: React.MouseEvent, colKey: string, isStep: boolean, currentWidthStr: string) => {
        e.preventDefault();
        e.stopPropagation();
        const startWidth = parseInt(currentWidthStr) || (isStep ? 50 : 70);
        setResizing({
            colKey,
            startX: e.clientX,
            startWidth,
            isStep
        });
    };
    // -----------------------------
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
            // Detail columns: compact, tight fit
            // Multiplier 6 is sufficient for text-[9px] (very compact)
            // Min 25px allows short data (like '1') to be very narrow
            const baseWidth = Math.max(25, maxLength * 6);
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
            if (isValid(date)) return format(date, 'dd-MMM');
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

        // Calculate base WO ID width first as it's the reference for others
        // Exact fit: No multiplier, char width 7
        const woIdRawWidth = Math.max(70, parseInt(calculateColumnWidth('WO ID', processedOrders, false)));
        // WO ID: Dynamic, min 70px, max 150px
        const woIdWidthVal = Math.min(150, Math.max(70, woIdRawWidth));
        const woIdWidthStr = `${woIdWidthVal}px`;

        // FIXED widths for detail columns - minimal to maximize step space
        // FIXED widths for detail columns - minimal to maximize step space
        effectiveDetailColumns.forEach((col, index) => {
            // 1st Column (WO ID)
            if (index === 0) {
                widths[col] = woIdWidthStr;
            }
            // 3rd Column (Description) - Index 2
            // User Request: "3 col is 1.5x of 1st" (4th col removed from this rule per user)
            else if (index === 2) {
                const widthVal = Math.floor(woIdWidthVal * 1.5);
                widths[col] = `${widthVal}px`;
            }
            // 4th Column - Index 3
            // User Request: "Lock dead to equal 1st column width"
            else if (index === 3) {
                widths[col] = woIdWidthStr;
            }
            // 2nd Column (PN - Index 1) - Must be visible
            else if (index === 1) {
                // PN: Dynamic, min 60px (was 25), max 120px
                const dynamicWidth = calculateColumnWidth(col, processedOrders, false);
                const widthValue = Math.min(120, Math.max(60, parseInt(dynamicWidth)));
                widths[col] = `${widthValue}px`;
            }
            // Cols 5, 6, 7, 8 (Indices 4, 5, 6, 7) - User: "Too narrow"
            else if (index >= 4 && index <= 7) {
                // Min 50px to ensure visibility
                const dynamicWidth = calculateColumnWidth(col, processedOrders, false);
                const widthValue = Math.min(120, Math.max(50, parseInt(dynamicWidth)));
                widths[col] = `${widthValue}px`;
            }
            // Col 9 (Index 8) - User: "Too wide"
            else if (index === 8) {
                // Cap max at 60px
                const dynamicWidth = calculateColumnWidth(col, processedOrders, false);
                const widthValue = Math.min(60, Math.max(25, parseInt(dynamicWidth)));
                widths[col] = `${widthValue}px`;
            }
            // Any other columns (10+...)
            else {
                // Dynamic Tight Fit
                const dynamicWidth = calculateColumnWidth(col, processedOrders, false);
                const widthValue = Math.min(100, Math.max(25, parseInt(dynamicWidth)));
                widths[col] = `${widthValue}px`;
            }
        });

        // Step columns: 'auto' so they share remaining space
        orderedSteps.forEach(step => {
            // If manual sync width is set, used THAT. Otherwise use auto.
            if (manualStepWidth !== null) {
                widths[step] = `${manualStepWidth}px`;
            } else {
                widths[step] = 'auto';
            }
        });

        // Apply Manual Detail Overrides (User Dragged)
        Object.keys(detailWidths).forEach(key => {
            if (widths[key]) {
                widths[key] = `${detailWidths[key]}px`;
            }
        });

        return widths;
    }, [effectiveDetailColumns, orderedSteps, processedOrders, detailWidths, manualStepWidth]);

    return (
        <div className="overflow-auto bg-white rounded-xl shadow-sm border border-slate-200 max-h-[calc(100vh-200px)]">
            <table className="text-xs border-collapse w-full table-fixed">
                <colgroup>
                    {/* Detail Columns */}
                    {effectiveDetailColumns.map((col) => (
                        <col key={col} style={{ width: columnWidths[col] }} />
                    ))}
                    {/* Step Columns */}
                    {orderedSteps.map((step) => (
                        <col key={step} style={{ width: columnWidths[step] }} />
                    ))}
                </colgroup>
                <thead className="sticky top-0 z-20 bg-white">
                    {/* Summary Row */}
                    <tr className="bg-slate-50 border-b border-slate-200">
                        <td
                            style={{ width: columnWidths['WO ID'] }}
                            className="px-1 py-0.5 text-center font-bold text-amber-600 bg-slate-50 sticky left-0 z-30 group relative"
                        >
                            <div className="flex items-center justify-center gap-1">
                                <span>WO: {orders.length}</span>
                                {role !== 'operator' && (
                                    <button
                                        onClick={() => setIsSuperEditing(!isSuperEditing)}
                                        className={`p-0.5 rounded transition-colors ${isSuperEditing ? 'bg-red-100 text-red-600' : 'text-slate-300 hover:text-slate-500'}`}
                                        title={isSuperEditing ? "Lock Super Edit" : "Unlock Super Edit (Admin Only)"}
                                    >
                                        {isSuperEditing ? <Unlock size={10} /> : <Lock size={10} />}
                                    </button>
                                )}
                            </div>
                        </td>
                        {/* Detail Columns - Fixed 1:1 mapping (No colSpan to ensure perfect width control) */}
                        {effectiveDetailColumns.slice(1).map((col, i) => (
                            <td
                                key={`sum-${col}`}
                                style={{ width: columnWidths[col] }}
                                className="px-2 py-1 text-right font-medium text-slate-500 bg-slate-50 border-r border-slate-100"
                            >
                                {/* Only show P+WIP label in the last detail column to save space */}
                                {i === effectiveDetailColumns.length - 2 ? 'P+WIP:' : ''}
                            </td>
                        ))}

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
                                    maxWidth: columnWidths[col] // Force max width
                                }}
                                className={`px-0.5 py-1 font-semibold text-slate-700 cursor-pointer hover:bg-slate-200 border-r border-slate-200 bg-slate-100 relative group ${i === 0 ? 'sticky left-0 z-30' : ''
                                    } ${i >= 5 ? 'text-center text-[9px]' : 'text-left text-[10px]'}`}
                                onClick={() => handleSort(col)}
                                title={col}
                            >
                                <div className="flex items-center gap-0.5 justify-center overflow-hidden">
                                    <span className="truncate">{i >= 5 ? getStepAbbrev(col) : col}</span>
                                    {sortKey === col ? (
                                        sortDir === 'asc' ? <ArrowUp className="w-2 h-2 shrink-0" /> : <ArrowDown className="w-2 h-2 shrink-0" />
                                    ) : (
                                        <ArrowUpDown className="w-2 h-2 opacity-30 shrink-0" />
                                    )}
                                </div>
                                <div
                                    className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-indigo-400/50 z-50 group-hover:bg-slate-300"
                                    onMouseDown={(e) => handleResizeStart(e, col, false, columnWidths[col])}
                                />
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
                                    className={`px-0.5 py-1 text-[10px] font-semibold text-slate-600 bg-slate-50 border-r border-slate-200 relative group
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
                                    <div
                                        className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-indigo-400/50 z-50 group-hover:bg-slate-300 pointer-events-auto"
                                        onMouseDown={(e) => handleResizeStart(e, step, true, columnWidths[step])}
                                    />
                                </th>
                            );
                        })}
                    </tr>

                    {/* Filter Row */}
                    <tr className="bg-white">
                        {columns.map((col, i) => (
                            <th key={col} className={`px-0.5 py-0.5 bg-white border-r border-slate-200 border-b border-slate-200 ${i === 0 ? 'sticky left-0 z-30' : ''}`}>
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
                                            style={{ width: columnWidths[col] }}
                                            className="px-1 py-0.5 sticky left-0 bg-inherit z-10 font-medium text-[10px] border-r border-slate-200 group/cell"
                                        >
                                            <div className="flex items-center justify-between gap-1">
                                                <span
                                                    className="cursor-pointer text-indigo-600 hover:underline truncate"
                                                    onClick={() => onNavigate(value)}
                                                >
                                                    {value}
                                                </span>
                                                {isSuperEditing && onDeleteOrder && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (confirm(`Are you sure you want to PERMANENTLY DELETE Order ${value}?`)) {
                                                                onDeleteOrder(order.id);
                                                            }
                                                        }}
                                                        className="opacity-0 group-hover/cell:opacity-100 p-0.5 text-slate-400 hover:text-red-600 transition-opacity"
                                                        title="Delete Order"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                )}
                                            </div>
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
                                            style={{ ...style, width: columnWidths[col] }}
                                        >
                                            {isSuperEditing && onUpdateDetail ? (
                                                <input
                                                    type="text"
                                                    defaultValue={value}
                                                    className="w-full h-full bg-yellow-50 px-1 border border-yellow-200 rounded text-[9px] focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                    onBlur={(e) => {
                                                        const newVal = e.target.value.trim();
                                                        if (newVal !== value) {
                                                            onUpdateDetail(order['WO ID'], col, newVal);
                                                        }
                                                    }}
                                                    onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            ) : (
                                                formatDate(value)
                                            )}
                                        </td>
                                    );
                                }

                                // Priority - Fuzzy match "PRIORITY"
                                if (colUpper.includes('PRIORITY')) {
                                    return (
                                        <td key={col} className="px-1 py-0.5 text-center text-[9px] border-r border-slate-200" style={{ ...getPriorityStyle(value), width: columnWidths[col] }}>
                                            {isSuperEditing && onUpdateDetail ? (
                                                <input
                                                    type="text"
                                                    defaultValue={value}
                                                    className="w-full h-full bg-yellow-50 px-1 border border-yellow-200 rounded text-[9px] focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                    onBlur={(e) => {
                                                        const newVal = e.target.value.trim();
                                                        if (newVal !== value) {
                                                            onUpdateDetail(order['WO ID'], col, newVal);
                                                        }
                                                    }}
                                                    onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            ) : (
                                                value
                                            )}
                                        </td>
                                    );
                                }

                                // Description - With tooltip
                                if (col === 'Description') {
                                    return (
                                        <td key={col} style={{ width: columnWidths[col] }} className="px-1 py-0.5 truncate text-slate-700 text-[9px] border-r border-slate-200" title={value}>
                                            {isSuperEditing && onUpdateDetail ? (
                                                <input
                                                    type="text"
                                                    defaultValue={value}
                                                    className="w-full h-full bg-yellow-50 px-1 border border-yellow-200 rounded text-[9px] focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                    onBlur={(e) => {
                                                        const newVal = e.target.value.trim();
                                                        if (newVal !== value) {
                                                            onUpdateDetail(order['WO ID'], col, newVal);
                                                        }
                                                    }}
                                                    onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            ) : (
                                                value
                                            )}
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
                                        {isSuperEditing && onUpdateDetail && col !== 'ECD' ? (
                                            <input
                                                type="text"
                                                defaultValue={value}
                                                className="w-full h-full bg-yellow-50 px-1 border border-yellow-200 rounded text-[9px] focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                onBlur={(e) => {
                                                    const newVal = e.target.value.trim();
                                                    if (newVal !== value) {
                                                        onUpdateDetail(order['WO ID'], col, newVal);
                                                    }
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.currentTarget.blur();
                                                    }
                                                }}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        ) : (
                                            value
                                        )}
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
                                        style={{
                                            width: columnWidths[step],
                                            maxWidth: columnWidths[step],
                                            ...getCellStyle(cellValue)
                                        }}
                                        className={`px-0.5 py-0.5 text-center text-[9px] tracking-tighter font-medium whitespace-nowrap overflow-hidden border-r border-slate-100 ${isEraseClickable
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
