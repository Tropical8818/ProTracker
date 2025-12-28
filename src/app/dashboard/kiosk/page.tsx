'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
    Activity, Clock, AlertTriangle, CheckCircle2,
    ChevronRight, Factory, Timer, Layers, Filter, Grid, ChevronDown, Lock, Unlock, X,
    LayoutList, Maximize2
} from 'lucide-react';
import { format } from 'date-fns';

interface Order {
    id: string;
    woId: string;
    productId: string;
    productName: string;
    data: any;
    updatedAt: string;
}

interface Product {
    id: string;
    name: string;
    stepDurations?: Record<string, number>;
}

export default function KioskPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [mounted, setMounted] = useState(false);
    const [selectedStep, setSelectedStep] = useState<string>('ALL');
    const [availableSteps, setAvailableSteps] = useState<string[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedProductId, setSelectedProductId] = useState<string>('');
    const [productMenuOpen, setProductMenuOpen] = useState(false);
    const [isLocked, setIsLocked] = useState(true);
    const [showUnlockModal, setShowUnlockModal] = useState(false);
    const [unlockPin, setUnlockPin] = useState('');
    const [pinError, setPinError] = useState(false);
    const [role, setRole] = useState<string>('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [viewDensity, setViewDensity] = useState<'comfortable' | 'compact'>('comfortable');
    const scrollRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    useEffect(() => {
        setMounted(true);
        const savedDensity = localStorage.getItem('kioskViewDensity') as 'comfortable' | 'compact';
        if (savedDensity) setViewDensity(savedDensity);
    }, []);

    const fetchKioskData = async () => {
        if (!selectedProductId) return;
        try {
            const res = await fetch(`/api/orders/all?status=active&productId=${selectedProductId}`);
            if (res.ok) {
                const data = await res.json();
                setOrders(data.orders || []);
                setAvailableSteps(data.availableSteps || []);
            }
        } catch (err) {
            console.error('Kiosk Fetch Error:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchProducts = async () => {
        try {
            // Fetch auth role
            const authRes = await fetch('/api/auth');
            if (authRes.ok) {
                const authData = await authRes.json();
                if (authData.authenticated) {
                    setRole(authData.role);
                }
            }

            const res = await fetch('/api/config');
            if (res.ok) {
                const data = await res.json();
                setProducts(data.products || []);
                if (data.products?.length > 0) {
                    const savedId = localStorage.getItem('kioskProductId');
                    const targetId = savedId && data.products.find((p: Product) => p.id === savedId)
                        ? savedId
                        : data.activeProductId || data.products[0].id;
                    setSelectedProductId(targetId);
                }
            }
        } catch (err) {
            console.error('Failed to fetch products:', err);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    useEffect(() => {
        if (selectedProductId) {
            fetchKioskData();
            const refreshInterval = setInterval(fetchKioskData, 60000);
            return () => clearInterval(refreshInterval);
        }
    }, [selectedProductId]);

    useEffect(() => {
        const timeInterval = setInterval(() => setCurrentTime(new Date()), 1000);

        // Auto-scroll logic
        const scrollInterval = setInterval(() => {
            if (scrollRef.current) {
                const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
                if (scrollTop + clientHeight >= scrollHeight - 10) {
                    scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
                } else {
                    const scrollAmount = viewDensity === 'comfortable' ? 400 : 200;
                    scrollRef.current.scrollBy({ top: scrollAmount, behavior: 'smooth' });
                }
            }
        }, 8000); // Scroll every 8s

        return () => {
            clearInterval(timeInterval);
            clearInterval(scrollInterval);
        };
    }, []);

    const getStatusInfo = (orderData: any, selectedStep: string = 'ALL') => {
        if (selectedStep !== 'ALL') {
            const val = orderData[selectedStep];
            if (!val || val === '') return { label: 'UNPLANNED', color: 'text-slate-500', bg: 'bg-slate-500/10', border: 'border-slate-500/50' };
            if (val === 'P') return { label: 'PLANNED', color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/50' };
            if (val === 'Hold') return { label: 'HOLD', color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/50' };
            if (val === 'QN') return { label: 'QN', color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/50' };
            if (val === 'WIP') return { label: 'WIP', color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/50' };
            if (val === 'DIFA') return { label: 'DIFA', color: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-purple-500/50' };
            if (/\d{2}-\w{3}/.test(val)) return { label: 'COMPLETED', color: 'text-green-400', bg: 'bg-green-400/10', border: 'border-green-400/50' };
            return { label: val.toString().toUpperCase(), color: 'text-indigo-400', bg: 'bg-indigo-400/10', border: 'border-indigo-400/50' };
        }

        const statuses = Object.values(orderData);
        // Priority-based status detection
        if (statuses.includes('Hold')) return { label: 'HOLD', color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/50' };
        if (statuses.includes('QN')) return { label: 'QN', color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/50' };
        if (statuses.includes('WIP')) return { label: 'WIP', color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/50' };
        if (statuses.includes('P')) return { label: 'PLANNED', color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/50' };
        if (statuses.includes('DIFA')) return { label: 'DIFA', color: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-purple-500/50' };
        // Check if all steps are empty (unplanned)
        const nonDetailKeys = Object.keys(orderData).filter(k =>
            k !== 'WO ID' && !k.toLowerCase().includes('customer') &&
            !k.toLowerCase().includes('qty') && !k.toLowerCase().includes('ecd')
        );
        const allEmpty = nonDetailKeys.every(k => !orderData[k] || orderData[k] === '');
        if (allEmpty) return { label: 'UNPLANNED', color: 'text-slate-500', bg: 'bg-slate-500/10', border: 'border-slate-500/50' };
        return { label: 'ACTIVE', color: 'text-indigo-400', bg: 'bg-indigo-400/10', border: 'border-indigo-400/50' };
    };

    // Check if an order is currently active at a specific step
    const isOrderAtStep = (order: Order, step: string) => {
        const stepValue = String(order.data[step] || '');
        if (stepValue === '') return true;
        if (['WIP', 'HOLD', 'QN', 'P'].includes(stepValue.toUpperCase())) return true;
        // If it's a date-like string, the step is completed, so it shouldn't show up in a filter for this step
        if (/\d{1,2}-\w{3}/.test(stepValue)) return false;
        return true;
    };

    // Filter orders based on selected step
    const filteredOrders = orders.filter(order => {
        if (selectedStep !== 'ALL') {
            return isOrderAtStep(order, selectedStep);
        }

        // In 'ALL' view, hide orders where every available step for this product is already completed
        const isFullyCompleted = availableSteps.length > 0 && availableSteps.every(step => {
            const val = String(order.data[step] || '');
            return /\d{1,2}-\w{3}/.test(val);
        });

        return !isFullyCompleted;
    });

    return (
        <div className="min-h-screen bg-[#0a0a0c] text-slate-200 overflow-hidden flex flex-col font-sans">
            {/* Kiosk Header */}
            <header className="h-24 bg-[#121216] border-b border-slate-800 px-8 flex items-center justify-between shadow-2xl z-10">
                <div
                    onClick={() => !isLocked && router.push('/dashboard')}
                    className={`flex items-center gap-6 transition-all ${isLocked ? 'cursor-default' : 'cursor-pointer hover:opacity-80'}`}
                >
                    <div className="bg-indigo-600 p-3 rounded-2xl shadow-lg transition-colors">
                        <Factory className="w-10 h-10 text-white" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black tracking-tight text-white uppercase">Shop Floor Monitor</h1>
                        <p className="text-indigo-400 font-bold tracking-widest text-sm mt-1 uppercase">
                            {isLocked ? 'Console Locked • Display Mode' : role === 'kiosk' ? 'Administrative Mode' : 'Click Logo to Exit • Administrative Mode'}
                        </p>
                    </div>
                </div>

                <div className="flex-1 flex justify-center items-center gap-4">
                    <div className="relative">
                        <button
                            onClick={() => !isLocked && setProductMenuOpen(!productMenuOpen)}
                            className={`flex items-center gap-3 px-6 py-3 bg-[#1a1a20] border-2 border-indigo-600/50 rounded-2xl transition-all ${isLocked
                                ? 'cursor-default'
                                : 'hover:border-indigo-500 cursor-pointer'}`}
                        >
                            <Factory className="w-5 h-5 text-indigo-400" />
                            <span className="text-xl font-black text-white uppercase tracking-wider">
                                {products.find(p => p.id === selectedProductId)?.name || 'SELECT PRODUCT'}
                            </span>
                            {!isLocked && <ChevronDown className={`w-5 h-5 text-indigo-400 transition-transform ${productMenuOpen ? 'rotate-180' : ''}`} />}
                        </button>

                        {productMenuOpen && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1a20] rounded-2xl shadow-2xl border border-slate-800 py-2 z-50 min-w-[300px]">
                                {products.map(product => (
                                    <button
                                        key={product.id}
                                        onClick={() => {
                                            setSelectedProductId(product.id);
                                            localStorage.setItem('kioskProductId', product.id);
                                            setProductMenuOpen(false);
                                            setSelectedStep('ALL'); // Reset step filter
                                        }}
                                        className={`w-full text-left px-6 py-4 text-lg font-bold uppercase tracking-wider transition-colors ${product.id === selectedProductId
                                            ? 'bg-indigo-600 text-white'
                                            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                            }`}
                                    >
                                        {product.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Density Toggle */}
                    <button
                        onClick={() => {
                            const newDensity = viewDensity === 'comfortable' ? 'compact' : 'comfortable';
                            setViewDensity(newDensity);
                            localStorage.setItem('kioskViewDensity', newDensity);
                        }}
                        className="p-3 rounded-xl border-2 bg-[#1a1a20] border-slate-800 text-slate-400 hover:text-indigo-400 hover:border-indigo-400/50 transition-all"
                        title={viewDensity === 'comfortable' ? "Switch to Compact View" : "Switch to Comfortable View"}
                    >
                        {viewDensity === 'comfortable' ? <LayoutList className="w-6 h-6" /> : <Maximize2 className="w-6 h-6" />}
                    </button>

                    {/* Lock/Unlock Toggle */}
                    <button
                        onClick={() => {
                            if (isLocked) {
                                setShowUnlockModal(true);
                                setUnlockPin('');
                                setPinError(false);
                            } else {
                                setIsLocked(true);
                            }
                        }}
                        className={`p-3 rounded-xl border-2 transition-all ${isLocked
                            ? 'bg-[#1a1a20] border-slate-800 text-slate-700 hover:text-indigo-500 hover:border-indigo-500/50'
                            : 'bg-emerald-600 border-emerald-400 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)]'}`}
                        title={isLocked ? "Unlock Console" : "Lock Console"}
                    >
                        {isLocked ? <Lock className="w-6 h-6" /> : <Unlock className="w-6 h-6" />}
                    </button>
                </div>

                <div className="text-right">
                    <div className="text-5xl font-mono font-bold text-white tabular-nums" suppressHydrationWarning>
                        {mounted ? format(currentTime, 'HH:mm:ss') : '--:--:--'}
                    </div>
                    <div className="text-slate-500 font-bold tracking-tighter uppercase text-sm" suppressHydrationWarning>
                        {mounted ? format(currentTime, 'EEEE, MMM do yyyy') : 'Loading...'}
                    </div>
                </div>
            </header>

            {/* Step Filter Bar */}
            <div className="bg-[#0e0e12] border-b border-slate-800/50 px-6 py-3">
                <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide">
                    <div className="flex items-center gap-2 shrink-0">
                        <Filter className="w-4 h-4 text-indigo-400" />
                        <span className="text-xs font-black text-slate-500 uppercase tracking-widest">STATION:</span>
                    </div>
                    <button
                        onClick={() => !isLocked && setSelectedStep('ALL')}
                        className={`px-6 py-2 rounded-xl font-black text-sm tracking-wider uppercase transition-all shrink-0 ${selectedStep === 'ALL'
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                            : 'bg-[#1a1a20] text-slate-400 border border-slate-800'
                            } ${isLocked ? 'cursor-default' : 'hover:bg-slate-800 cursor-pointer'}`}
                    >
                        <Grid className="w-4 h-4 inline mr-2" />
                        ALL STATIONS
                    </button>
                    {availableSteps.map(step => (
                        <button
                            key={step}
                            onClick={() => !isLocked && setSelectedStep(step)}
                            className={`px-6 py-2 rounded-xl font-black text-sm tracking-wider uppercase transition-all shrink-0 ${selectedStep === step
                                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                                : 'bg-[#1a1a20] text-slate-400 border border-slate-800'
                                } ${isLocked ? 'cursor-default' : 'hover:bg-slate-800 cursor-pointer'}`}
                        >
                            {step}
                        </button>
                    ))}
                </div>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-4 gap-4 p-4 bg-[#0e0e12] border-b border-slate-800/50">
                <div className="bg-[#1a1a20] p-4 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div className="text-slate-400 font-bold text-xs uppercase">Active Orders</div>
                    <div className="text-3xl font-black text-white">{filteredOrders.length}</div>
                </div>
                <div className="bg-[#1a1a20] p-4 rounded-xl border border-red-900/30 flex items-center justify-between">
                    <div className="text-red-400 font-bold text-xs uppercase">Held / Blocked</div>
                    <div className="text-3xl font-black text-red-500">
                        {orders.filter(o => JSON.stringify(o.data).includes('Hold')).length}
                    </div>
                </div>
                <div className="bg-[#1a1a20] p-4 rounded-xl border border-orange-900/30 flex items-center justify-between">
                    <div className="text-orange-400 font-bold text-xs uppercase">Quality Issues</div>
                    <div className="text-3xl font-black text-orange-500">
                        {orders.filter(o => JSON.stringify(o.data).includes('QN')).length}
                    </div>
                </div>
                <div className="bg-[#1a1a20] p-4 rounded-xl border border-indigo-900/30 flex items-center justify-between">
                    <div className="text-indigo-400 font-bold text-xs uppercase">In Progress</div>
                    <div className="text-3xl font-black text-indigo-400">
                        {orders.filter(o => JSON.stringify(o.data).includes('WIP')).length}
                    </div>
                </div>
            </div>

            {/* Scrollable Content */}
            <div
                ref={scrollRef}
                className={`flex-1 overflow-y-auto scrollbar-hide px-4 py-6 ${viewDensity === 'comfortable' ? 'space-y-6' : 'grid grid-cols-2 gap-4 align-start content-start'}`}
            >
                {loading ? (
                    <div className="h-full flex flex-col items-center justify-center gap-4">
                        <Activity className="w-16 h-16 text-indigo-500 animate-pulse" />
                        <span className="text-2xl font-bold tracking-widest text-slate-500 animate-pulse">CONNECTING TO HUB...</span>
                    </div>
                ) : filteredOrders.length > 0 ? (
                    filteredOrders.map((order) => {
                        const status = getStatusInfo(order.data, selectedStep);
                        const completedSteps = Object.values(order.data).filter(v => /\d{2}-\w{3}/.test(v as string)).length;
                        const totalSteps = availableSteps.length;
                        const progressPercent = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

                        return (
                            <div
                                key={order.id}
                                className={`bg-[#14141a] border-l-[12px] ${status.border} rounded-3xl ${viewDensity === 'comfortable' ? 'p-6 grid-cols-[1.6fr_1.2fr_2fr_0.8fr] gap-6' : 'p-3 grid-cols-[1fr_1fr_1.5fr_0.5fr] gap-3'
                                    } grid items-center shadow-2xl transition-all duration-300`}
                            >
                                <div className={`flex flex-col border-r border-slate-800/50 ${viewDensity === 'comfortable' ? 'pr-6' : 'pr-3'}`}>
                                    <div className="text-[10px] text-slate-600 font-black uppercase tracking-[0.4em] mb-2">Order Tracking</div>
                                    <div className={`${viewDensity === 'comfortable' ? 'text-7xl' : 'text-3xl'} font-black text-white tracking-tighter leading-none truncate`} title={order.woId}>
                                        {order.woId}
                                    </div>
                                </div>

                                <div className={`flex justify-center border-r border-slate-800/50 ${viewDensity === 'comfortable' ? 'pr-6' : 'pr-3'} h-full`}>
                                    <div className={`${viewDensity === 'comfortable' ? 'px-6 py-4 rounded-[2rem] border-4' : 'px-3 py-2 rounded-2xl border-2'} ${status.border} ${status.bg} flex flex-col items-center justify-center w-full shadow-lg`}>
                                        <div className={`text-[10px] font-black uppercase tracking-widest mb-1 ${status.color}`}>State</div>
                                        <span className={`${viewDensity === 'comfortable' ? 'text-4xl' : 'text-xl'} font-black tracking-tighter ${status.color}`}>{status.label}</span>
                                    </div>
                                </div>

                                <div className={`border-r border-slate-800/50 ${viewDensity === 'comfortable' ? 'pr-6' : 'pr-3'}`}>
                                    {(() => {
                                        // Determine which step to calculate time for
                                        let targetStep = selectedStep;
                                        if (selectedStep === 'ALL') {
                                            // Find the first step that is NOT completed (the active step)
                                            targetStep = availableSteps.find(step => {
                                                const val = order.data[step];
                                                return !val || !/\d{2}-\w{3}/.test(val as string);
                                            }) || availableSteps[availableSteps.length - 1];
                                        }

                                        // Find index of the target step
                                        const stepIndex = availableSteps.findIndex(s => s === targetStep);

                                        // Safety parsing function for DD-MMM[, HH:mm] format
                                        const parseStepDate = (val: any) => {
                                            if (!val || typeof val !== 'string') return null;
                                            // Extract date and optional time component
                                            const match = val.match(/(\d{1,2})-(\w{3})(?:,\s*(\d{1,2}):(\d{1,2}))?/);
                                            if (!match) return null;

                                            const day = parseInt(match[1]);
                                            const monthStr = match[2];
                                            const hour = match[3] ? parseInt(match[3]) : 0;
                                            const minute = match[4] ? parseInt(match[4]) : 0;

                                            const year = new Date().getFullYear();
                                            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                                            const monthIndex = months.findIndex(m => m.toLowerCase() === monthStr.toLowerCase());

                                            if (monthIndex === -1) return null;
                                            const d = new Date(year, monthIndex, day, hour, minute);
                                            return !isNaN(d.getTime()) ? d : null;
                                        };

                                        const currentVal = order.data[targetStep];
                                        const isCompleted = currentVal && /\d{2}-\w{3}/.test(String(currentVal));

                                        // If the step is already finished, show completed status
                                        if (isCompleted) {
                                            return (
                                                <div className="flex items-center justify-center h-12 text-center">
                                                    <span className="text-xs font-black text-indigo-400 uppercase tracking-[0.2em]">
                                                        Step Completed
                                                    </span>
                                                </div>
                                            );
                                        }

                                        // Successor timing: starts when predecessor finishes
                                        let startTime: number = 0;
                                        if (stepIndex === 0) {
                                            startTime = new Date(order.updatedAt).getTime();
                                        } else {
                                            const prevDate = parseStepDate(order.data[availableSteps[stepIndex - 1]]);
                                            if (prevDate) {
                                                startTime = prevDate.getTime();
                                            }
                                        }

                                        // If it's not the first step and the previous one isn't done yet
                                        if (stepIndex > 0 && !startTime) {
                                            return (
                                                <div className="flex items-center justify-center h-12">
                                                    <span className="text-xs font-black text-slate-800 uppercase tracking-[0.2em]">
                                                        Queueing (Prev Not Done)
                                                    </span>
                                                </div>
                                            );
                                        }

                                        const now = new Date();
                                        let elapsedHours = Math.max(0, (now.getTime() - startTime) / (1000 * 60 * 60));
                                        if (elapsedHours > 8760) elapsedHours = 0; // Guard against bad parsing

                                        const cycleProgress = ((elapsedHours % 24) / 24) * 100;

                                        // Color coding: indigo (<=24h), orange (>24h), red (>48h)
                                        let barColor = 'bg-indigo-500 shadow-[0_0_15px_rgba(79,70,229,0.5)]';
                                        if (elapsedHours > 48) {
                                            barColor = 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]';
                                        } else if (elapsedHours > 24) {
                                            barColor = 'bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.5)]';
                                        }

                                        return (
                                            <div className="w-full">
                                                <div className={`${viewDensity === 'comfortable' ? 'h-4' : 'h-2'} bg-slate-800/50 rounded-full overflow-hidden mb-3 border border-slate-700/30`}>
                                                    <div
                                                        className={`h-full ${barColor} transition-all duration-700 ease-out`}
                                                        style={{ width: `${Math.max(2, cycleProgress)}%` }}
                                                    />
                                                </div>
                                                <div className="flex justify-between items-center px-1">
                                                    <div className={`text-slate-400 font-bold flex items-center gap-2 ${viewDensity === 'comfortable' ? 'text-sm' : 'text-xs'}`}>
                                                        <span className={`text-indigo-400 ${viewDensity === 'comfortable' ? 'text-lg' : 'text-sm'}`}>{elapsedHours.toFixed(1)}h</span>
                                                        <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">/ 24h</span>
                                                    </div>
                                                    {selectedStep === 'ALL' && (
                                                        <div className="text-[8px] text-slate-500 font-black uppercase truncate max-w-[100px] bg-slate-800/40 px-2 py-0.5 rounded-md border border-slate-700/30" title={targetStep}>
                                                            AT: {targetStep}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>

                                {/* Column 4: Last Updated (Fixed Width) */}
                                <div className="text-right">
                                    <div className="text-[10px] text-slate-600 font-black uppercase tracking-widest mb-1 line-clamp-1">Updated</div>
                                    <div className={`${viewDensity === 'comfortable' ? 'text-xl' : 'text-sm'} font-bold text-indigo-400 tabular-nums`}>
                                        {format(new Date(order.updatedAt), viewDensity === 'comfortable' ? 'MMM dd, HH:mm' : 'HH:mm')}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="h-full flex items-center justify-center text-slate-600 text-3xl font-bold italic tracking-tighter uppercase">
                        NO ACTIVE ORDERS IN SYSTEM
                    </div>
                )}
            </div>

            {/* Kiosk Footer */}
            <footer className="h-10 bg-[#070709] border-t border-slate-900 px-6 flex items-center justify-between text-[10px] uppercase tracking-[0.3em] font-black text-slate-600">
                <div className="flex items-center gap-4">
                    <Layers className="w-3 h-3" />
                    <span>SYSTEM CORE V6.1.0</span>
                </div>
                <div className="flex items-center gap-6">
                    <span className="text-indigo-900 animate-pulse">RECEPTION LINK ACTIVE</span>
                    <span className="flex items-center gap-1">
                        <div className="w-1 h-1 rounded-full bg-emerald-500" />
                        DATABASE SYNC OK
                    </span>
                </div>
            </footer>

            {/* PIN Unlock Modal */}
            {showUnlockModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-[#121216] border-2 border-slate-800 p-10 rounded-[2.5rem] w-full max-w-md shadow-[0_0_50px_rgba(0,0,0,0.5)] transform animate-in zoom-in-95 duration-300">
                        <div className="flex justify-between items-start mb-8">
                            <div className="bg-indigo-600/10 p-4 rounded-3xl">
                                <Lock className="w-10 h-10 text-indigo-500" />
                            </div>
                            <button
                                onClick={() => setShowUnlockModal(false)}
                                className="p-2 hover:bg-slate-800 rounded-full text-slate-500 transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-tight">Console Secure</h2>
                        <p className="text-slate-500 font-bold text-sm tracking-widest uppercase mb-8">Enter Account Password to Unlock</p>

                        <div className="space-y-6">
                            <input
                                autoFocus
                                type="password"
                                value={unlockPin}
                                onChange={(e) => {
                                    setUnlockPin(e.target.value);
                                    setPinError(false);
                                }}
                                onKeyDown={async (e) => {
                                    if (e.key === 'Enter') {
                                        if (!unlockPin || isVerifying) return;
                                        setIsVerifying(true);
                                        try {
                                            const res = await fetch('/api/auth/verify', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ password: unlockPin })
                                            });
                                            const data = await res.json();
                                            if (data.success) {
                                                setIsLocked(false);
                                                setShowUnlockModal(false);
                                                setUnlockPin('');
                                            } else {
                                                setPinError(true);
                                                setUnlockPin('');
                                            }
                                        } catch (e) {
                                            console.error('Verification failed', e);
                                        } finally {
                                            setIsVerifying(false);
                                        }
                                    }
                                }}
                                placeholder="Enter Password"
                                className={`w-full bg-[#0a0a0c] border-2 rounded-2xl px-6 py-4 text-2xl text-center font-mono tracking-widest focus:outline-none transition-all ${pinError ? 'border-red-500 animate-shake text-red-500' : 'border-slate-800 focus:border-indigo-600'
                                    }`}
                            />

                            {pinError && (
                                <p className="text-red-500 text-center font-black text-xs uppercase tracking-widest animate-bounce">
                                    Access Denied • Invalid Password
                                </p>
                            )}

                            <button
                                onClick={async () => {
                                    if (!unlockPin || isVerifying) return;
                                    setIsVerifying(true);
                                    try {
                                        const res = await fetch('/api/auth/verify', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ password: unlockPin })
                                        });
                                        const data = await res.json();
                                        if (data.success) {
                                            setIsLocked(false);
                                            setShowUnlockModal(false);
                                            setUnlockPin('');
                                        } else {
                                            setPinError(true);
                                            setUnlockPin('');
                                        }
                                    } catch (e) {
                                        console.error('Verification failed', e);
                                    } finally {
                                        setIsVerifying(false);
                                    }
                                }}
                                disabled={isVerifying}
                                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-5 rounded-2xl text-xl font-black uppercase tracking-[0.2em] shadow-lg shadow-indigo-600/20 active:scale-95 transition-all disabled:opacity-50"
                            >
                                {isVerifying ? 'Verifying...' : 'Authenticate'}
                            </button>
                        </div>

                        <div className="mt-8 text-center">
                            <p className="text-[10px] text-slate-700 font-black uppercase tracking-[0.3em]">Hardware ID: {mounted ? window.navigator.userAgent.slice(0, 20) : 'N/A'}</p>
                        </div>
                    </div>
                </div>
            )}

            <style jsx global>{`
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
                .scrollbar-hide {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </div>
    );
}
