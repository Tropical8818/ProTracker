'use client';

import { useState } from 'react';
import { format, isValid } from 'date-fns';
import { ChevronDown, ChevronUp, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import type { Order } from '@/lib/excel';

interface Props {
    orders: Order[];
    steps: string[];
    onSetP?: (woId: string, step: string, currentValue: string) => void;
    // We only need basic interaction for now
    onNavigate?: (woId: string) => void;
}

// Abbreviation mapping (Shared with PlannerTable)
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
    'Motor ASSY': 'Mtr Assy',
    'WELDING': 'WELD',
    'Dye Pen': 'DyePen',
    'Painting': 'Paint',
    'MIST': 'MIST',
    'Outgoing': 'Outgo',
    'Receipt': 'Receipt',
};

function getStepAbbrev(step: string): string {
    return STEP_ABBREV[step] || step;
}

export default function MobilePlannerCards({
    orders,
    steps,
    onSetP,
    onNavigate
}: Props) {
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

    const toggleExpand = (id: string) => {
        const next = new Set(expandedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setExpandedIds(next);
    };

    const formatDate = (val: string) => {
        if (!val) return '';
        try {
            const date = new Date(val);
            if (isValid(date)) return format(date, 'dd-MMM');
        } catch { }
        return val.split('T')[0] || val;
    };

    const getPriorityColor = (val: string) => {
        if (val === '!!!') return 'text-red-600 bg-red-50 ring-red-500/20';
        if (val === '!!') return 'text-orange-600 bg-orange-50 ring-orange-500/20';
        if (val === '!') return 'text-lime-700 bg-lime-50 ring-lime-600/20';
        return 'text-slate-600 bg-slate-50 ring-slate-500/20';
    };

    // Helper to identify the next actionable step
    const getNextStep = (order: Order) => {
        for (const step of steps) {
            const val = (order[step] || '').toUpperCase();
            // Skip if completed (date), N/A, or specific flags that imply completion/skip
            const isDate = /\d{4}-\d{2}-\d{2}/.test(val) || /\d{2}[-\/]\w{3}/.test(val);
            const isNA = val === 'N/A';

            if (!isDate && !isNA) {
                return { step, val };
            }
        }
        return null; // All Done
    };

    if (orders.length === 0) {
        return <div className="p-8 text-center text-slate-400">No active orders</div>;
    }

    return (
        <div className="space-y-4 pb-20">
            {orders.map(order => {
                const isExpanded = expandedIds.has(order.id);
                const nextAction = getNextStep(order);
                const priority = order['Priority'] || '';
                const woDue = order['WO DUE'] || '';

                // Active Step Display
                const activeStepName = nextAction ? getStepAbbrev(nextAction.step) : 'Completed';
                const activeStepStatus = nextAction ? nextAction.val : '';

                // Status Color Logic
                let statusColor = 'bg-blue-50 text-blue-700'; // Default P
                if (activeStepStatus.includes('QN') || activeStepStatus.includes('DIFA')) {
                    statusColor = 'bg-red-50 text-red-700 border-red-200';
                } else if (activeStepStatus === 'WIP') {
                    statusColor = 'bg-yellow-50 text-yellow-700 border-yellow-200';
                }

                return (
                    <div key={order.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        {/* Card Header: IDs & Status */}
                        <div className="p-4 border-b border-slate-100 flex justify-between items-start">
                            <div>
                                <div
                                    className="text-lg font-bold text-indigo-600 cursor-pointer flex items-center gap-2"
                                    onClick={() => onNavigate?.(order['WO ID'])}
                                >
                                    {order['WO ID']}
                                    {priority && (
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ring-1 ring-inset font-bold ${getPriorityColor(priority)}`}>
                                            {priority}
                                        </span>
                                    )}
                                </div>
                                <div className="text-sm font-medium text-slate-900 mt-1">{order['PN']}</div>
                                <div className="text-xs text-slate-500 truncate max-w-[200px]">{order['Description']}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-xs font-semibold text-slate-500 mb-1">Due</div>
                                <div className="text-sm font-medium text-slate-700">{formatDate(woDue)}</div>
                            </div>
                        </div>

                        {/* Quick Action Area */}
                        <div className="px-4 py-3 bg-slate-50/50 border-b border-slate-100">
                            <div className="flex justify-between items-center mb-1.5">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Current Process</span>
                                {nextAction ? (
                                    <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                        Step {steps.indexOf(nextAction.step) + 1} of {steps.length}
                                    </span>
                                ) : (
                                    <span className="text-[10px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                                        All Complete
                                    </span>
                                )}
                            </div>

                            <div className={`p-3 rounded-lg border flex items-center justify-between ${statusColor}`}>
                                <div className="font-semibold text-sm">{activeStepName}</div>
                                <div className="text-xs font-bold uppercase tracking-wide bg-white/50 px-2 py-1 rounded">
                                    {activeStepStatus || (nextAction ? 'Pending' : 'Done')}
                                </div>
                            </div>
                        </div>

                        {/* Details Toggle */}
                        <div
                            className="px-4 py-2 bg-white text-xs text-slate-500 font-medium flex justify-center items-center gap-1 cursor-pointer hover:bg-slate-50 active:bg-slate-100 transition-colors"
                            onClick={() => toggleExpand(order.id)}
                        >
                            {isExpanded ? (
                                <>Hide Details <ChevronUp className="w-3 h-3" /></>
                            ) : (
                                <>Show Process <ChevronDown className="w-3 h-3" /></>
                            )}
                        </div>

                        {/* Expanded Details */}
                        {isExpanded && (
                            <div className="p-4 grid grid-cols-2 gap-2 border-t border-slate-100 bg-slate-50 shadow-inner">
                                {steps.map((step, idx) => {
                                    const val = order[step] || '';
                                    const isDate = /\d{4}-\d{2}-\d{2}/.test(val) || /\d{2}[-\/]\w{3}/.test(val);
                                    const isDateOnly = /\d{4}-\d{2}-\d{2}/.test(val) && !val.includes(' ');
                                    const isNA = val === 'N/A';
                                    const isP = val === 'P' || val.startsWith('P,');
                                    const isHold = val === 'HOLD';
                                    const isCurrent = nextAction?.step === step;

                                    let cardStyle = 'bg-white border-slate-200 text-slate-500';
                                    let icon = <span className="w-1.5 h-1.5 rounded-full bg-slate-200" />;

                                    if (isCurrent) {
                                        cardStyle = 'bg-white border-indigo-300 text-indigo-700 ring-1 ring-indigo-200 shadow-sm';
                                        icon = <Clock className="w-3 h-3 text-indigo-500 animate-pulse" />;
                                    } else if (isDate) {
                                        cardStyle = 'bg-green-50 border-green-200 text-green-700 shadow-sm';
                                        icon = <CheckCircle className="w-3 h-3 text-green-600" />;
                                    } else if (isNA) {
                                        cardStyle = 'bg-slate-100 border-slate-200 text-slate-400 opacity-75';
                                        icon = <span className="text-[10px] font-bold">N/A</span>;
                                    } else if (isP) {
                                        cardStyle = 'bg-blue-50 border-blue-200 text-blue-700';
                                        icon = <span className="text-[10px] font-bold">P</span>;
                                    } else if (isHold) {
                                        cardStyle = 'bg-orange-50 border-orange-200 text-orange-700';
                                        icon = <AlertCircle className="w-3 h-3 text-orange-500" />;
                                    }

                                    return (
                                        <div
                                            key={step}
                                            className={`p-2.5 rounded-lg border text-xs flex justify-between items-center transition-all ${cardStyle}`}
                                        >
                                            <div className="flex flex-col min-w-0 pr-2">
                                                <span className="font-semibold truncate" title={step}>{getStepAbbrev(step)}</span>
                                                {isDate && (
                                                    <span className="text-[10px] opacity-80 font-medium mt-0.5">
                                                        {formatDate(val)}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex-shrink-0">
                                                {icon}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
