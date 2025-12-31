'use client';

import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import {
    LayoutDashboard, FileText, Settings, LogOut,
    Maximize, Minimize, Activity, AlertCircle, ScanBarcode, ArrowRight,
    Play, Ban, PauseCircle, Eraser, Info, HardHat, Upload, Users,
    Factory, ChevronDown, Table2, Pencil, Eye, EyeOff, ClipboardList,
    RefreshCw, X, FileSpreadsheet, Check, Clock, CheckCircle2, Layers, AlertTriangle, Sparkles, Megaphone,
    History, Loader2, Download, Trash2, BarChart2, TrendingUp, Monitor, ChevronUp
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line, AreaChart, Area
} from 'recharts';
import PlannerTable from '@/components/PlannerTable';
import MobilePlannerCards from '@/components/MobilePlannerCards';
import DraggableMenu from '@/components/DraggableMenu';
import type { Order } from '@/lib/excel';
import dynamic from 'next/dynamic';
import AIChatPanel from '@/components/AIChatPanel';
import { calculateECD } from '@/lib/ecd';

// Dynamic import for barcode scanner (client-only)
const BarcodeScanner = dynamic(() => import('@/components/BarcodeScanner'), { ssr: false });

interface OperationLog {
    id: string;
    timestamp: string;
    productId: string;
    productName: string;
    woId: string;
    step: string;
    action: string;
    previousValue: string;
    newValue: string;
    operatorId: string;
}

interface Product {
    id: string;
    name: string;
    excelPath: string;
    detailColumns: string[];
    steps: string[];
    stepDurations?: Record<string, number>;
    monthlyTarget?: number;
    includeSaturday?: boolean;
    includeSunday?: boolean;
}



export default function DashboardPage() {
    const [currentDate, setCurrentDate] = useState('');

    useEffect(() => {
        setCurrentDate(new Date().toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }));
    }, []);

    const [orders, setOrders] = useState<Order[]>([]);
    const [steps, setSteps] = useState<string[]>([]);
    const [detailColumns, setDetailColumns] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showCompleted, setShowCompleted] = useState(false);
    const [role, setRole] = useState<'user' | 'supervisor' | 'admin'>('user');
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [pMode, setPMode] = useState(false);
    const [naMode, setNaMode] = useState(false);
    const [holdMode, setHoldMode] = useState(false);
    const [qnMode, setQnMode] = useState(false);
    const [wipMode, setWipMode] = useState(false);
    const [completeMode, setCompleteMode] = useState(false);
    const [eraseMode, setEraseMode] = useState(false);
    const [erasePasswordModal, setErasePasswordModal] = useState(false);

    const [erasePassword, setErasePassword] = useState('');
    const [erasePasswordVisible, setErasePasswordVisible] = useState(false);
    const [erasePasswordError, setErasePasswordError] = useState('');
    const [refreshing, setRefreshing] = useState(false);

    // Bulk Confirm Modal State
    const [bulkConfirmState, setBulkConfirmState] = useState<{
        isOpen: boolean;
        step: string;
        mode: 'P' | 'NA' | 'Hold' | 'QN' | 'WIP' | 'Complete';
        count: number;
        targets: Order[];
    }>({ isOpen: false, step: '', mode: 'P', count: 0, targets: [] });

    // Product state
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedProductId, setSelectedProductId] = useState<string>('');
    const [productMenuOpen, setProductMenuOpen] = useState(false);

    // Logs state
    const [logs, setLogs] = useState<OperationLog[]>([]);
    const [showLogsModal, setShowLogsModal] = useState(false);
    const [loadingLogs, setLoadingLogs] = useState(false);
    const [logsNotification, setLogsNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const [confirmingClear, setConfirmingClear] = useState(false);

    // ECD settings - separate Saturday/Sunday


    // Barcode Scanner
    const [scannerOpen, setScannerOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showAnalytics, setShowAnalytics] = useState(false);
    const [analyticsData, setAnalyticsData] = useState<{
        productivity: { name: string, count: number }[],
        bottlenecks: { name: string, count: number }[],
        trend: { date: string, output: number }[],
        summary: { topProducer: string, bottleneck: string, totalOutput: number }
    } | null>(null);
    const [loadingAnalytics, setLoadingAnalytics] = useState(false);

    // Import State
    const [isImporting, setIsImporting] = useState(false);
    const [importFile, setImportFile] = useState<File | null>(null);
    const [importPreview, setImportPreview] = useState<any>(null);
    const [showImportModal, setShowImportModal] = useState(false);
    const [importMsg, setImportMsg] = useState<{ type: string, text: string } | null>(null);



    // Monthly Target Edit State
    const [editingTarget, setEditingTarget] = useState(false);
    const [tempTarget, setTempTarget] = useState<string>('');
    const [savingTarget, setSavingTarget] = useState(false);

    const router = useRouter();

    const selectedProduct = products.find(p => p.id === selectedProductId);





    const saveTarget = async () => {
        if (!selectedProductId || !tempTarget) return;
        setSavingTarget(true);
        try {
            const res = await fetch(`/api/products/${selectedProductId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ monthlyTarget: Number(tempTarget) })
            });

            if (res.ok) {
                // Update local state to reflect change immediately
                const updatedProducts = products.map(p =>
                    p.id === selectedProductId
                        ? { ...p, monthlyTarget: Number(tempTarget) }
                        : p
                );
                setProducts(updatedProducts);
                setEditingTarget(false);
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to update target');
            }
        } catch (error) {
            console.error('Save target error:', error);
            alert('Failed to save target');
        } finally {
            setSavingTarget(false);
        }
    };

    const handleSetP = async (woId: string, step: string, currentValue: string) => {
        try {
            const newStatus = currentValue.toUpperCase() === 'P' ? 'Reset' : 'P';
            const res = await fetch(`/api/orders/${woId}/step`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ step, status: newStatus, productId: selectedProductId })
            });
            if (res.ok) {
                await fetchOrders();
            }
        } catch (err) {
            console.error('Failed to toggle P:', err);
        }
    };

    const handleSetNA = async (woId: string, step: string, currentValue: string) => {
        try {
            const newStatus = currentValue.toUpperCase() === 'N/A' ? 'Reset' : 'N/A';
            const res = await fetch(`/api/orders/${woId}/step`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ step, status: newStatus, productId: selectedProductId })
            });
            if (res.ok) {
                await fetchOrders();
            }
        } catch (err) {
            console.error('Failed to toggle N/A:', err);
        }
    };

    const handleSetHold = async (woId: string, step: string, currentValue: string) => {
        try {
            const newStatus = currentValue.toUpperCase() === 'HOLD' ? 'Reset' : 'Hold';
            const res = await fetch(`/api/orders/${woId}/step`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ step, status: newStatus, productId: selectedProductId })
            });
            if (res.ok) {
                await fetchOrders();
            }
        } catch (err) {
            console.error('Failed to toggle Hold:', err);
        }
    };

    const handleSetQN = async (woId: string, step: string, currentValue: string) => {
        try {
            const newStatus = currentValue.toUpperCase() === 'QN' ? 'Reset' : 'QN';
            const res = await fetch(`/api/orders/${woId}/step`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ step, status: newStatus, productId: selectedProductId })
            });
            if (res.ok) {
                await fetchOrders();
            }
        } catch (err) {
            console.error('Failed to toggle QN:', err);
        }
    };

    const handleSetWIP = async (woId: string, step: string, currentValue: string) => {
        try {
            const newStatus = currentValue.toUpperCase() === 'WIP' ? 'Reset' : 'WIP';
            const res = await fetch(`/api/orders/${woId}/step`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ step, status: newStatus, productId: selectedProductId })
            });
            if (res.ok) {
                await fetchOrders();
            }
        } catch (err) {
            console.error('Failed to toggle WIP:', err);
        }
    };

    const handleErase = async (woId: string, step: string) => {
        try {
            const res = await fetch(`/api/orders/${woId}/step`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ step, status: 'Reset', productId: selectedProductId })
            });
            if (res.ok) {
                await fetchOrders();
            }
        } catch (err) {
            console.error('Failed to erase:', err);
        }
    };

    const handleSetComplete = async (woId: string, step: string) => {
        try {
            // Complete marks with current date
            const today = format(new Date(), 'dd-MMM, HH:mm');
            const res = await fetch(`/api/orders/${woId}/step`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ step, status: today, productId: selectedProductId })
            });
            if (res.ok) {
                await fetchOrders();
            }
        } catch (err) {
            console.error('Failed to complete:', err);
        }
    };



    const handleDeleteOrder = async (woId: string) => {
        try {
            const res = await fetch(`/api/orders/${woId}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                // Optimistic update
                setOrders(prev => prev.filter(o => o.id !== woId));
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to delete order');
            }
        } catch (error) {
            console.error('Error deleting order:', error);
            alert('Failed to delete order');
        }
    };

    // Fetch products and auth
    const fetchConfig = async () => {
        try {
            const [authRes, configRes] = await Promise.all([
                fetch('/api/auth', { cache: 'no-store' }),
                fetch(`/api/config?t=${Date.now()}`, { cache: 'no-store' })
            ]);

            const authData = await authRes.json();
            if (authData.role) {
                setRole(authData.role);
            }

            const configData = await configRes.json();
            if (configData.products && configData.products.length > 0) {
                setProducts(configData.products);
                // Set initial product
                if (!selectedProductId || !configData.products.find((p: Product) => p.id === selectedProductId)) {
                    setSelectedProductId(configData.activeProductId || configData.products[0].id);
                }
            }
        } catch (err) {
            console.error('Failed to fetch config:', err);
        }
    };

    // Fetch orders for selected product
    const fetchOrders = async () => {
        if (!selectedProductId) return;

        setRefreshing(true);
        const startTime = Date.now();
        try {
            const ordersRes = await fetch(`/api/orders?productId=${selectedProductId}`);
            if (!ordersRes.ok) {
                const errData = await ordersRes.json().catch(() => ({}));
                throw new Error(errData.error || 'Failed to fetch orders');
            }

            const ordersData = await ordersRes.json();
            setOrders(ordersData.orders || []);
            setSteps(ordersData.steps || []);
            setError('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load data');
        } finally {
            const elapsed = Date.now() - startTime;
            if (elapsed < 500) {
                await new Promise(r => setTimeout(r, 500 - elapsed));
            }
            setLoading(false);
            setRefreshing(false);
        }
    };

    // Fetch analytics data
    const fetchAnalyticsData = async (productId: string) => {
        if (!productId) return;
        setLoadingAnalytics(true);
        try {
            const res = await fetch(`/api/analytics?productId=${productId}`);
            if (res.ok) {
                const data = await res.json();
                setAnalyticsData(data);
            }
        } catch (err) {
            console.error('Failed to fetch analytics:', err);
        } finally {
            setLoadingAnalytics(false);
        }
    };

    useEffect(() => {
        if (showAnalytics && selectedProductId) {
            fetchAnalyticsData(selectedProductId);
        }
    }, [showAnalytics, selectedProductId]);

    // Initial load - fetch config and orders
    useEffect(() => {
        const loadData = async () => {
            try {
                // Fetch auth and config
                const [authRes, configRes] = await Promise.all([
                    fetch('/api/auth', { cache: 'no-store' }),
                    fetch(`/api/config?t=${Date.now()}`, { cache: 'no-store' })
                ]);

                const authData = await authRes.json();
                if (authData.role) {
                    setRole(authData.role);
                }

                const configData = await configRes.json();
                let targetId = '';
                if (configData.products && configData.products.length > 0) {
                    setProducts(configData.products);

                    // Priority: Local Storage -> Active Product -> First Product
                    const savedId = localStorage.getItem('selectedProductId');
                    targetId = configData.activeProductId || configData.products[0].id;

                    if (savedId && configData.products.find((p: Product) => p.id === savedId)) {
                        targetId = savedId;
                    }

                    setSelectedProductId(targetId);
                }
                // Set weekend setting from config


                // Fetch orders for the product (using targetId)
                if (targetId) {
                    const activeProduct = configData.products.find((p: Product) => p.id === targetId);
                    if (activeProduct?.detailColumns) {
                        setDetailColumns(activeProduct.detailColumns);
                    }
                    const ordersRes = await fetch(`/api/orders?productId=${targetId}`);
                    if (ordersRes.ok) {
                        const ordersData = await ordersRes.json();
                        setOrders(ordersData.orders || []);
                        setSteps(ordersData.steps || []);
                        if (ordersData.detailColumns) {
                            setDetailColumns(ordersData.detailColumns);
                        }
                    }
                }

            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load data');
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    // Fetch orders when product changes (after initial load)
    const handleProductChange = async (productId: string) => {
        setSelectedProductId(productId);
        localStorage.setItem('selectedProductId', productId);
        setProductMenuOpen(false);
        setLoading(true);

        // Update global active product (Best Effort)
        try {
            await fetch('/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ activeProductId: productId })
            });
        } catch (e) {
            console.error('Failed to set active product', e);
        }

        // Set detailColumns from product
        const activeProduct = products.find(p => p.id === productId);
        if (activeProduct?.detailColumns) {
            setDetailColumns(activeProduct.detailColumns);
        }

        try {
            const ordersRes = await fetch(`/api/orders?productId=${productId}`);
            if (ordersRes.ok) {
                const ordersData = await ordersRes.json();
                setOrders(ordersData.orders || []);
                setSteps(ordersData.steps || []);
                if (ordersData.detailColumns) {
                    setDetailColumns(ordersData.detailColumns);
                }
                setError('');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    // Auto-refresh
    useEffect(() => {
        if (!selectedProductId) return;
        const interval = setInterval(() => {
            fetchOrders();
        }, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [selectedProductId]);

    const handleLogout = async () => {
        await fetch('/api/auth', { method: 'DELETE' });
        router.push('/login');
        router.refresh();
    };

    const handleNavigate = (woId: string) => {
        router.push(`/dashboard/operation?wo=${woId}&product=${selectedProductId}`);
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    const fetchLogs = async () => {
        setLoadingLogs(true);
        try {
            const res = await fetch(`/api/logs?limit=100&productId=${selectedProductId}`);
            if (res.ok) {
                const data = await res.json();
                setLogs(data.logs || []);
            }
        } catch (err) {
            console.error('Failed to fetch logs:', err);
        } finally {
            setLoadingLogs(false);
        }
    };

    const openLogsModal = () => {
        setShowLogsModal(true);
        fetchLogs();
    };

    const downloadLogsCSV = () => {
        if (!logs.length) return;
        const headers = ['Time', 'Operator', 'WO ID', 'Step', 'Action', 'Previous', 'New Value'];
        const csvContent = [
            headers.join(','),
            ...logs.map(log => [
                new Date(log.timestamp).toISOString(),
                log.operatorId,
                log.woId,
                `"${log.step?.replace(/"/g, '""') || ''}"`,
                log.action,
                `"${log.previousValue?.replace(/"/g, '""') || ''}"`,
                `"${log.newValue?.replace(/"/g, '""') || ''}"`
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', `operation_logs_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const clearLogs = () => {
        setConfirmingClear(true);
    };

    const performClearLogs = async () => {
        setConfirmingClear(false);
        try {
            const res = await fetch('/api/logs', { method: 'DELETE' });
            if (res.ok) {
                setLogsNotification({ type: 'success', message: 'Logs cleared successfully!' });
                fetchLogs();
                // Auto-dismiss after 5 seconds
                setTimeout(() => setLogsNotification(null), 5000);
            } else {
                const data = await res.json();
                setLogsNotification({ type: 'error', message: data.error || 'Failed to clear logs' });
                setTimeout(() => setLogsNotification(null), 5000);
            }
        } catch (e) {
            console.error(e);
            setLogsNotification({ type: 'error', message: 'Failed to clear logs' });
            setTimeout(() => setLogsNotification(null), 5000);
        }
    };

    const handleImportFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !selectedProductId) return;

        setImportFile(file);
        setIsImporting(true);
        setImportMsg(null);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('productId', selectedProductId);

        try {
            const res = await fetch('/api/import-excel/preview', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (res.ok) {
                setImportPreview(data);
                setShowImportModal(true);
            } else {
                alert(data.error || 'Failed to analyze file');
            }
        } catch (error) {
            console.error('Preview error:', error);
            alert('Error analyzing file');
        } finally {
            setIsImporting(false);
            // Reset input
            e.target.value = '';
        }
    };

    const confirmImport = async () => {
        if (!importFile || !selectedProductId) return;
        setIsImporting(true);

        const formData = new FormData();
        formData.append('file', importFile);
        formData.append('productId', selectedProductId);
        formData.append('mode', 'skip-existing'); // Default for daily upload

        try {
            const res = await fetch('/api/import-excel', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();

            if (res.ok) {
                const p = [];
                if (data.imported > 0) p.push(`${data.imported} new`);
                if (data.skipped > 0) p.push(`${data.skipped} skipped`);

                alert(`✅ Import Successful: ${p.join(', ')}`);
                setShowImportModal(false);
                setImportFile(null);
                setImportPreview(null);
                fetchOrders(); // Refresh table
            } else {
                setImportMsg({ type: 'error', text: data.error || 'Import failed' });
            }
        } catch (error) {
            setImportMsg({ type: 'error', text: 'Network error during import' });
        } finally {
            setIsImporting(false);
        }
    };



    // Sort orders by priority (Red first, then Yellow, then normal)
    const sortedOrders = [...orders].sort((a, b) => {
        const getPriority = (order: any) => {
            if (order.priority === 'Red') return 3;
            if (order.priority === 'Yellow') return 2;
            return 1;
        };
        return getPriority(b) - getPriority(a);
    });

    const displayedOrders = showCompleted
        ? sortedOrders
        : sortedOrders.filter(order => {
            // Prioritize 'Receipt' as completion step
            let completionStep = steps.find(s => s.toLowerCase() === 'receipt');
            if (!completionStep) {
                completionStep = steps.find(s =>
                    s.toLowerCase() === 'outgoing' ||
                    s.toLowerCase() === 'completion'
                ) || steps[steps.length - 1];
            }

            const val = order[completionStep] || '';
            const hasDate = /\d{4}-\d{2}-\d{2}/.test(val) || /\d{2}[-\/]\w{3}/.test(val);
            const isNA = val.toUpperCase() === 'N/A';
            return !hasDate && !isNA;
        });


    // Calculate highlighted WOs based on search query (for Barcode Scanner)
    const highlightedWos = useMemo(() => {
        if (!searchQuery) return [];
        const lowerQuery = searchQuery.toLowerCase();
        return displayedOrders
            .filter(o => {
                const woId = o['WO ID']?.toString().toLowerCase() || '';
                const pn = o['PN']?.toString().toLowerCase() || '';
                return woId.includes(lowerQuery) || pn.includes(lowerQuery);
            })
            .map(o => o['WO ID']);
    }, [displayedOrders, searchQuery]);

    return (
        <div className="min-h-screen bg-slate-100">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-50">
                <div className="max-w-full mx-auto px-4 h-14 flex items-center justify-between">
                    {/* Left: Logo and Title */}
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer"
                        title="Return to Home"
                    >
                        <div className="bg-indigo-600 p-2 rounded-lg">
                            <Factory className="w-5 h-5 text-white" />
                        </div>
                        <h1 className="text-lg font-bold text-slate-900">ProTracker <span className="text-indigo-600 text-xs ml-1">V6.6.0</span></h1>
                        <div className="hidden sm:block text-sm text-slate-500 border-l border-slate-200 pl-3">
                            {currentDate}
                        </div>
                    </button>

                    {/* Right: Product Selector & Nav */}
                    <div className="flex items-center gap-2 justify-end min-w-0">
                        {/* Product Selector - Outside overflow container to prevent clipping */}
                        <div className="relative shrink-0">
                            <button
                                onClick={() => setProductMenuOpen(!productMenuOpen)}
                                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg border border-slate-200 bg-white"
                            >
                                <span className="max-w-[150px] truncate">{selectedProduct?.name || 'Select Product'}</span>
                                <ChevronDown className={`w-4 h-4 transition-transform ${productMenuOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {productMenuOpen && products.length > 0 && (
                                <div className="absolute top-full right-0 mt-1 bg-white rounded-lg shadow-lg border border-slate-200 py-1 min-w-[200px] z-50 max-h-[80vh] overflow-y-auto">
                                    {products.map(product => (
                                        <button
                                            key={product.id}
                                            onClick={() => handleProductChange(product.id)}
                                            className={`w-full text-left px-4 py-3 text-sm hover:bg-slate-50 ${product.id === selectedProductId ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-700'
                                                }`}
                                        >
                                            {product.name}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {(role === 'admin' || role === 'supervisor') && (
                            <div className="shrink-0 ml-1 mr-2">
                                <input
                                    type="file"
                                    id="dashboard-import-input"
                                    accept=".xlsx,.xls"
                                    className="hidden"
                                    onChange={handleImportFileSelect}
                                />
                                <button
                                    onClick={() => {
                                        if (!selectedProductId) { alert('Select a product line first'); return; }
                                        document.getElementById('dashboard-import-input')?.click();
                                    }}
                                    disabled={isImporting}
                                    className="flex items-center gap-2 px-3 py-2 border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-blue-600 rounded-lg text-sm font-medium transition-colors shadow-sm"
                                    title="Import Excel Orders for this Product Line"
                                >
                                    <Upload className="w-4 h-4" />
                                    Import
                                </button>
                            </div>
                        )}

                        {/* DESKTOP NAV - Hidden on Mobile */}
                        <nav className="hidden md:flex items-center gap-2 overflow-x-auto max-w-full scrollbar-hide px-1">

                            <div className="w-px h-6 bg-slate-200" />

                            <button className="flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium">
                                <Table2 className="w-4 h-4" />
                                <span className="hidden sm:inline">Home</span>
                            </button>



                            <button
                                onClick={() => router.push(`/dashboard/operation?product=${selectedProductId}`)}
                                className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:bg-slate-50 rounded-lg text-sm font-medium"
                                title="Go to Operation View"
                            >
                                <HardHat className="w-5 h-5 sm:w-4 sm:h-4" />
                                <span className="hidden sm:inline">Operation</span>
                            </button>



                            <button
                                onClick={() => setShowAnalytics(!showAnalytics)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${showAnalytics ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
                                    }`}
                                title="Production Insights"
                            >
                                <BarChart2 className="w-4 h-4" />
                                <span className="hidden sm:inline">Insights</span>
                            </button>

                            {/* Batch Operations Group */}
                            {(role === 'admin' || role === 'supervisor') && (
                                <div className="flex items-center gap-1 px-2 py-1 bg-slate-100 rounded-lg border border-slate-200">
                                    <Layers className="w-3.5 h-3.5 text-slate-400 mr-0.5" />
                                    <button
                                        onClick={() => { setPMode(!pMode); if (!pMode) { setNaMode(false); setEraseMode(false); setHoldMode(false); setCompleteMode(false); setQnMode(false); setWipMode(false); } }}
                                        className={`flex items-center gap-1 px-2 py-1.5 rounded text-xs font-medium transition-all ${pMode
                                            ? 'bg-blue-600 text-white shadow-sm'
                                            : 'text-slate-600 hover:bg-white hover:shadow-sm'
                                            }`}
                                        title={pMode ? 'Exit P Mode' : 'Enter P Mode - Click cells to set P'}
                                    >
                                        <Pencil className="w-3.5 h-3.5" />
                                        <span>P</span>
                                    </button>

                                    <button
                                        onClick={() => { setNaMode(!naMode); if (!naMode) { setPMode(false); setEraseMode(false); setHoldMode(false); setCompleteMode(false); setQnMode(false); setWipMode(false); } }}
                                        className={`flex items-center gap-1 px-2 py-1.5 rounded text-xs font-medium transition-all ${naMode
                                            ? 'bg-slate-600 text-white shadow-sm'
                                            : 'text-slate-600 hover:bg-white hover:shadow-sm'
                                            }`}
                                        title={naMode ? 'Exit N/A Mode' : 'Enter N/A Mode - Click cells to set N/A'}
                                    >
                                        <Ban className="w-3.5 h-3.5" />
                                        <span>N/A</span>
                                    </button>

                                    <button
                                        onClick={() => { setHoldMode(!holdMode); if (!holdMode) { setPMode(false); setNaMode(false); setEraseMode(false); setCompleteMode(false); setQnMode(false); setWipMode(false); } }}
                                        className={`flex items-center gap-1 px-2 py-1.5 rounded text-xs font-medium transition-all ${holdMode
                                            ? 'bg-orange-600 text-white shadow-sm'
                                            : 'text-slate-600 hover:bg-white hover:shadow-sm'
                                            }`}
                                        title={holdMode ? 'Exit Hold Mode' : 'Enter Hold Mode - Click cells to set Hold'}
                                    >
                                        <PauseCircle className="w-3.5 h-3.5" />
                                        <span>Hold</span>
                                    </button>

                                    <button
                                        onClick={() => { setQnMode(!qnMode); if (!qnMode) { setPMode(false); setNaMode(false); setEraseMode(false); setCompleteMode(false); setHoldMode(false); setWipMode(false); } }}
                                        className={`flex items-center gap-1 px-2 py-1.5 rounded text-xs font-medium transition-all ${qnMode
                                            ? 'bg-red-600 text-white shadow-sm'
                                            : 'text-slate-600 hover:bg-white hover:shadow-sm'
                                            }`}
                                        title={qnMode ? 'Exit QN Mode' : 'Enter QN Mode - Click cells to set Quality Notification'}
                                    >
                                        <AlertTriangle className="w-3.5 h-3.5" />
                                        <span>QN</span>
                                    </button>

                                    <button
                                        onClick={() => { setWipMode(!wipMode); if (!wipMode) { setPMode(false); setNaMode(false); setEraseMode(false); setCompleteMode(false); setHoldMode(false); setQnMode(false); } }}
                                        className={`flex items-center gap-1 px-2 py-1.5 rounded text-xs font-medium transition-all ${wipMode
                                            ? 'bg-yellow-500 text-white shadow-sm'
                                            : 'text-slate-600 hover:bg-white hover:shadow-sm'
                                            }`}
                                        title={wipMode ? 'Exit WIP Mode' : 'Enter WIP Mode - Click cells to set Work In Progress'}
                                    >
                                        <Clock className="w-3.5 h-3.5" />
                                        <span>WIP</span>
                                    </button>

                                    <button
                                        onClick={() => { setCompleteMode(!completeMode); if (!completeMode) { setPMode(false); setNaMode(false); setHoldMode(false); setQnMode(false); setEraseMode(false); setWipMode(false); } }}
                                        className={`flex items-center gap-1 px-2 py-1.5 rounded text-xs font-medium transition-all ${completeMode
                                            ? 'bg-green-600 text-white shadow-sm'
                                            : 'text-slate-600 hover:bg-white hover:shadow-sm'
                                            }`}
                                        title={completeMode ? 'Exit Complete Mode' : 'Enter Complete Mode - Click cells to mark complete with date'}
                                    >
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        <span>C</span>
                                    </button>

                                    <div className="w-px h-5 bg-slate-300 mx-0.5" />

                                    <button
                                        onClick={() => {
                                            if (eraseMode) {
                                                setEraseMode(false);
                                            } else if (role === 'admin') {
                                                setEraseMode(true);
                                                setPMode(false);
                                                setNaMode(false);
                                                setHoldMode(false);
                                                setCompleteMode(false);
                                            } else {
                                                setErasePasswordModal(true);
                                                setErasePassword('');
                                                setErasePasswordError('');
                                            }
                                        }}
                                        className={`flex items-center gap-1 px-2 py-1.5 rounded text-xs font-medium transition-all ${eraseMode
                                            ? 'bg-red-600 text-white shadow-sm'
                                            : 'text-red-500 hover:bg-white hover:shadow-sm'
                                            }`}
                                        title={eraseMode ? 'Exit Erase Mode' : 'Enter Erase Mode - Click any cell to clear'}
                                    >
                                        <Eraser className="w-3.5 h-3.5" />
                                        <span>Erase</span>
                                    </button>
                                </div>
                            )}

                            {/* Show/Hide Completed Toggle */}
                            <button
                                onClick={() => setShowCompleted(!showCompleted)}
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${showCompleted
                                    ? 'bg-slate-600 text-white shadow-md'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                                title={showCompleted ? 'Hide Completed Orders' : 'Show Completed Orders'}
                            >
                                {showCompleted ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                <span className="hidden sm:inline">Completed</span>
                                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-200 text-slate-600">
                                    {orders.filter(o => {
                                        let completionStep = steps.find(s => s.toLowerCase() === 'receipt');
                                        if (!completionStep) {
                                            completionStep = steps.find(s =>
                                                s.toLowerCase() === 'outgoing' ||
                                                s.toLowerCase() === 'completion'
                                            ) || steps[steps.length - 1];
                                        }
                                        const val = o[completionStep] || '';
                                        return /\d{4}-\d{2}-\d{2}/.test(val) || /\d{2}[-\/]\w{3}/.test(val);
                                    }).length}
                                </span>
                            </button>



                            <div className="w-px h-6 bg-slate-200 mx-1" />

                            <button
                                onClick={openLogsModal}
                                className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
                                title="Operation Logs"
                            >
                                <ClipboardList className="w-5 h-5" />
                            </button>

                            <button
                                onClick={fetchOrders}
                                disabled={refreshing}
                                className={`p-2 rounded-lg ${refreshing ? 'text-indigo-500 bg-indigo-50' : 'text-slate-500 hover:bg-slate-100'}`}
                                title="Refresh"
                            >
                                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
                            </button>

                            {/* Barcode Scanner - Mobile only */}
                            <button
                                onClick={() => setScannerOpen(true)}
                                className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg md:hidden"
                                title="Scan Barcode"
                            >
                                <ScanBarcode className="w-6 h-6" />
                            </button>

                            <button
                                onClick={toggleFullscreen}
                                className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
                                title="Fullscreen"
                            >
                                {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                            </button>



                            <button
                                onClick={() => router.push('/dashboard/settings')}
                                className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:bg-slate-50 rounded-lg text-sm font-medium"
                            >
                                <Settings className="w-4 h-4" />
                                <span className="hidden sm:inline">Settings</span>
                            </button>


                        </nav>

                        {/* Fixed Actions (Info, Logout) */}
                        <div className="flex items-center gap-1 shrink-0 ml-1 border-l border-slate-200 pl-2">
                            <button
                                onClick={handleLogout}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                                title="Logout"
                            >
                                <LogOut className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Production Insights Section */}
            {showAnalytics && (
                <div className="bg-white border-b border-slate-200 animate-in slide-in-from-top duration-300">
                    <div className="max-w-7xl mx-auto px-4 py-8">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-indigo-600" />
                                <h2 className="text-xl font-bold text-slate-900">Production Insights</h2>
                                <span className="text-xs bg-indigo-100 text-indigo-700 font-medium px-2 py-0.5 rounded-full ml-2">Last 7 Days</span>
                            </div>
                            <button
                                onClick={() => fetchAnalyticsData(selectedProductId)}
                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                            >
                                <RefreshCw className={`w-4 h-4 ${loadingAnalytics ? 'animate-spin' : ''}`} />
                            </button>
                        </div>

                        {loadingAnalytics && !analyticsData ? (
                            <div className="h-[300px] flex items-center justify-center">
                                <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                            </div>
                        ) : analyticsData ? (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Summary Cards */}
                                <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4 mb-2">
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                        <div className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Top Producing Step</div>
                                        <div className="text-xl font-bold text-indigo-600">{analyticsData.summary.topProducer}</div>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                        <div className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Current Bottleneck</div>
                                        <div className="text-xl font-bold text-orange-600">{analyticsData.summary.bottleneck}</div>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                        <div className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Total Yield (7d)</div>
                                        <div className="text-xl font-bold text-emerald-600">{analyticsData.summary.totalOutput} units</div>
                                    </div>
                                </div>

                                {/* Step Productivity Chart */}
                                <div className="bg-white p-5 rounded-xl border border-slate-200 h-[350px]">
                                    <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Output per Step
                                    </h3>
                                    <ResponsiveContainer width="100%" height="90%">
                                        <BarChart data={analyticsData.productivity}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                                            <YAxis fontSize={10} axisLine={false} tickLine={false} />
                                            <Tooltip
                                                cursor={{ fill: '#f8fafc' }}
                                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            />
                                            <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={32} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>

                                {/* Bottleneck Chart */}
                                <div className="bg-white p-5 rounded-xl border border-slate-200 h-[350px]">
                                    <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                                        <AlertTriangle className="w-4 h-4 text-orange-500" /> Work In Progress
                                    </h3>
                                    <ResponsiveContainer width="100%" height="90%">
                                        <BarChart data={analyticsData.bottlenecks}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                                            <YAxis fontSize={10} axisLine={false} tickLine={false} />
                                            <Tooltip
                                                cursor={{ fill: '#fff7ed' }}
                                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            />
                                            <Bar dataKey="count" fill="#f97316" radius={[4, 4, 0, 0]} barSize={32} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>

                                {/* Yield Trend Chart */}
                                <div className="bg-white p-5 rounded-xl border border-slate-200 h-[350px]">
                                    <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                                        <TrendingUp className="w-4 h-4 text-indigo-500" /> Daily Production
                                    </h3>
                                    <ResponsiveContainer width="100%" height="90%">
                                        <AreaChart data={analyticsData.trend}>
                                            <defs>
                                                <linearGradient id="colorOutput" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1} />
                                                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis
                                                dataKey="date"
                                                fontSize={10}
                                                axisLine={false}
                                                tickLine={false}
                                                tickFormatter={(str) => {
                                                    const date = new Date(str);
                                                    return format(date, 'MMM d');
                                                }}
                                            />
                                            <YAxis fontSize={10} axisLine={false} tickLine={false} />
                                            <Tooltip
                                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            />
                                            <Area type="monotone" dataKey="output" stroke="#4f46e5" fillOpacity={1} fill="url(#colorOutput)" strokeWidth={3} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        ) : (
                            <div className="h-[300px] flex items-center justify-center text-slate-400">
                                No production data found for the last 7 days.
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Main Content */}
            <main className="p-4">
                {loading ? (
                    <div className="text-center py-20 text-slate-500">Loading orders...</div>
                ) : error ? (
                    <div className="text-center py-20 text-red-500">{error}</div>
                ) : (
                    <>
                        {/* Statistics Cards */}
                        <div className="grid grid-cols-4 gap-2 mb-4">
                            <div className="bg-white rounded-lg border border-slate-200 p-3">
                                <div className="text-xs text-slate-500">Active WOs</div>
                                <div className="text-xl font-bold text-slate-900">{displayedOrders.length}</div>
                            </div>
                            <div className={`rounded-lg border p-3 ${displayedOrders.filter(o => {
                                const due = o['WO DUE'];
                                if (!due) return false;
                                // Exclude completed orders (last step has date or N/A)
                                const lastStep = steps[steps.length - 1];
                                const lastStepValue = lastStep ? (o[lastStep] || '') : '';
                                if (/\d{4}-\d{2}-\d{2}/.test(lastStepValue) || /\d{2}[-\/]\w{3}/.test(lastStepValue) || lastStepValue.toUpperCase() === 'N/A') return false;
                                const dueDate = new Date(due);
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                dueDate.setHours(0, 0, 0, 0);
                                return dueDate < today;
                            }).length > 0
                                ? 'bg-red-50 border-red-200'
                                : 'bg-white border-slate-200'
                                }`}>
                                <div className="text-xs text-slate-500">Overdue</div>
                                <div className={`text-xl font-bold ${displayedOrders.filter(o => {
                                    const due = o['WO DUE'];
                                    if (!due) return false;
                                    const lastStep = steps[steps.length - 1];
                                    const lastStepValue = lastStep ? (o[lastStep] || '') : '';
                                    if (/\d{4}-\d{2}-\d{2}/.test(lastStepValue) || /\d{2}[-\/]\w{3}/.test(lastStepValue) || lastStepValue.toUpperCase() === 'N/A') return false;
                                    const dueDate = new Date(due);
                                    const today = new Date();
                                    today.setHours(0, 0, 0, 0);
                                    dueDate.setHours(0, 0, 0, 0);
                                    return dueDate < today;
                                }).length > 0 ? 'text-red-600' : 'text-slate-900'
                                    }`}>
                                    {displayedOrders.filter(o => {
                                        const due = o['WO DUE'];
                                        if (!due) return false;
                                        const lastStep = steps[steps.length - 1];
                                        const lastStepValue = lastStep ? (o[lastStep] || '') : '';
                                        if (/\d{4}-\d{2}-\d{2}/.test(lastStepValue) || /\d{2}[-\/]\w{3}/.test(lastStepValue) || lastStepValue.toUpperCase() === 'N/A') return false;
                                        if (/\d{4}-\d{2}-\d{2}/.test(lastStepValue) || /\d{2}[-\/]\w{3}/.test(lastStepValue)) return false;
                                        const dueDate = new Date(due);
                                        const today = new Date();
                                        today.setHours(0, 0, 0, 0);
                                        dueDate.setHours(0, 0, 0, 0);
                                        return dueDate < today;
                                    }).length}
                                </div>
                            </div>
                            <div className="bg-orange-50 rounded-lg border border-orange-200 p-3">
                                <div className="text-xs text-slate-500">Due Today</div>
                                <div className="text-xl font-bold text-orange-700">
                                    {displayedOrders.filter(o => {
                                        const due = o['WO DUE'];
                                        if (!due) return false;
                                        const dueDate = new Date(due);
                                        const today = new Date();
                                        today.setHours(0, 0, 0, 0);
                                        dueDate.setHours(0, 0, 0, 0);
                                        return dueDate.getTime() === today.getTime();
                                    }).length}
                                </div>
                            </div>
                            <div className="bg-blue-50 rounded-lg border border-blue-200 p-3">
                                <div className="text-xs text-slate-500">Monthly Goal</div>
                                <div className="text-xl font-bold text-blue-700">
                                    {(() => {
                                        const today = new Date();
                                        const currentMonth = today.getMonth();
                                        const currentYear = today.getFullYear();

                                        // Find receipt/completion column (case-insensitive)
                                        const receiptCol = steps.find(s =>
                                            s.toLowerCase() === 'receipt' ||
                                            s.toLowerCase() === 'outgoing' ||
                                            s.toLowerCase() === 'completion'
                                        ) || steps[steps.length - 1];

                                        let completed = 0;
                                        if (receiptCol) {
                                            completed = orders.filter(o => {
                                                const val = o[receiptCol];
                                                if (!val) return false;
                                                const d = new Date(val);
                                                return !isNaN(d.getTime()) &&
                                                    d.getMonth() === currentMonth &&
                                                    d.getFullYear() === currentYear;
                                            }).length;
                                        }

                                        const target = (products.find(p => p.id === selectedProductId))?.monthlyTarget || 100;
                                        const percentage = Math.round((completed / target) * 100);

                                        if (editingTarget) {
                                            return (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xl font-bold text-slate-900">{completed}</span>
                                                    <span className="text-sm text-slate-400">/</span>
                                                    <input
                                                        type="number"
                                                        value={tempTarget}
                                                        onChange={(e) => setTempTarget(e.target.value)}
                                                        className="w-20 px-2 py-1 text-sm border border-blue-300 rounded focus:ring-2 focus:ring-blue-200 outline-none"
                                                        autoFocus
                                                        onKeyDown={(e) => e.key === 'Enter' && saveTarget()}
                                                    />
                                                    <div className="flex gap-1">
                                                        <button onClick={saveTarget} disabled={savingTarget} className="p-1 hover:bg-green-100 rounded text-green-600"><Check className="w-4 h-4" /></button>
                                                        <button onClick={() => setEditingTarget(false)} className="p-1 hover:bg-red-100 rounded text-red-500"><X className="w-4 h-4" /></button>
                                                    </div>
                                                </div>
                                            );
                                        }

                                        return (
                                            <div className="flex items-baseline gap-2">
                                                <span>{completed}</span>
                                                <span
                                                    className={`text-xs font-normal text-slate-500 ${(role === 'admin' || role === 'supervisor') ? 'cursor-pointer hover:text-blue-600 hover:bg-blue-100 px-1 rounded transition-colors' : ''}`}
                                                    title={(role === 'admin' || role === 'supervisor') ? "Click to edit target" : ""}
                                                    onClick={() => {
                                                        if (role === 'admin' || role === 'supervisor') {
                                                            setTempTarget(target.toString());
                                                            setEditingTarget(true);
                                                        }
                                                    }}
                                                >
                                                    / {target}
                                                </span>
                                                <span className={`text-xs ml-1 ${percentage >= 100 ? 'text-green-600' : 'text-slate-400'}`}>({percentage}%)</span>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>




                        {(() => {
                            // Use selectedProduct defined at component level or find it safely
                            const activeProd = products.find(p => p.id === selectedProductId);

                            // Empty State Handling
                            if (activeProd && steps.length === 0 && detailColumns.length === 0 && orders.length === 0) {
                                return (
                                    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-lg border-2 border-dashed border-slate-200 mx-4 mt-8">
                                        <div className="p-4 bg-slate-50 rounded-full mb-4">
                                            <Settings className="w-8 h-8 text-slate-400" />
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-900 mb-2">Setup Required</h3>
                                        <p className="text-slate-500 mb-6 text-center max-w-sm">
                                            This production line is empty. Please configure columns and steps in Settings to get started.
                                        </p>
                                        <button
                                            onClick={() => router.push('/dashboard/settings')}
                                            className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 flex items-center gap-2"
                                        >
                                            <Settings className="w-4 h-4" />
                                            Go to Settings
                                        </button>
                                    </div>
                                );
                            }



                            const ordersToRender = displayedOrders.map(o => ({
                                ...o,
                                'ECD': calculateECD({
                                    order: o,
                                    steps,
                                    durations: activeProd?.stepDurations,
                                    includeSaturday: activeProd?.includeSaturday,
                                    includeSunday: activeProd?.includeSunday
                                })
                            })) as Order[];

                            return (
                                <>
                                    {/* Mobile Cards View */}
                                    <div className="md:hidden">
                                        <MobilePlannerCards
                                            orders={ordersToRender}
                                            steps={steps}
                                            onSetP={handleSetP}
                                            onNavigate={handleNavigate}
                                        />
                                    </div>

                                    {/* Desktop Table View */}
                                    <div className="hidden md:block">
                                        <PlannerTable
                                            orders={ordersToRender}
                                            steps={steps}
                                            detailColumns={detailColumns}
                                            extraColumns={['ECD']}
                                            onNavigate={handleNavigate}
                                            pMode={pMode}
                                            onSetP={handleSetP}
                                            onBulkSetP={role !== 'user' ? (step) => {
                                                const targets = ordersToRender.filter(o => !o[step]);
                                                if (targets.length === 0) {
                                                    alert('No empty cells to update in this column.');
                                                    return;
                                                }
                                                setBulkConfirmState({ isOpen: true, step, mode: 'P', count: targets.length, targets });
                                            } : undefined}
                                            naMode={naMode}
                                            onSetNA={handleSetNA}
                                            onBulkSetNA={role !== 'user' ? (step) => {
                                                const targets = ordersToRender.filter(o => !o[step]);
                                                if (targets.length === 0) {
                                                    alert('No empty cells to update in this column.');
                                                    return;
                                                }
                                                setBulkConfirmState({ isOpen: true, step, mode: 'NA', count: targets.length, targets });
                                            } : undefined}
                                            holdMode={holdMode}
                                            onSetHold={handleSetHold}
                                            onBulkSetHold={role !== 'user' ? (step) => {
                                                const targets = ordersToRender.filter(o => !o[step]);
                                                if (targets.length === 0) {
                                                    alert('No empty cells to update in this column.');
                                                    return;
                                                }
                                                setBulkConfirmState({ isOpen: true, step, mode: 'Hold', count: targets.length, targets });
                                            } : undefined}
                                            qnMode={qnMode}
                                            onSetQN={handleSetQN}
                                            onBulkSetQN={role !== 'user' ? (step) => {
                                                const targets = ordersToRender.filter(o => !o[step]);
                                                if (targets.length === 0) {
                                                    alert('No empty cells to update in this column.');
                                                    return;
                                                }
                                                setBulkConfirmState({ isOpen: true, step, mode: 'QN', count: targets.length, targets });
                                            } : undefined}
                                            wipMode={wipMode}
                                            onSetWIP={handleSetWIP}
                                            onBulkSetWIP={role !== 'user' ? (step) => {
                                                const targets = ordersToRender.filter(o => !o[step]);
                                                if (targets.length === 0) {
                                                    alert('No empty cells to update in this column.');
                                                    return;
                                                }
                                                setBulkConfirmState({ isOpen: true, step, mode: 'WIP', count: targets.length, targets });
                                            } : undefined}
                                            completeMode={completeMode}
                                            onSetComplete={handleSetComplete}
                                            onBulkSetComplete={role !== 'user' ? (step) => {
                                                const targets = ordersToRender.filter(o => !o[step]);
                                                if (targets.length === 0) {
                                                    alert('No empty cells to update in this column.');
                                                    return;
                                                }
                                                setBulkConfirmState({ isOpen: true, step, mode: 'Complete', count: targets.length, targets });
                                            } : undefined}
                                            eraseMode={eraseMode}
                                            onErase={handleErase}
                                            highlightedWos={highlightedWos} // Pass highlighted WOs
                                            role={role}
                                            onUpdateDetail={async (woId, field, value) => {
                                                try {
                                                    const res = await fetch('/api/orders/update-detail', {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({ woId, field, value, productId: selectedProductId })
                                                    });

                                                    if (res.ok) {
                                                        // Optimistic update
                                                        setOrders(prev => prev.map(o => {
                                                            if (o['WO ID'] === woId) {
                                                                return { ...o, [field]: value };
                                                            }
                                                            return o;
                                                        }));
                                                    } else {
                                                        alert('Failed to update detail');
                                                        fetchOrders();
                                                    }
                                                } catch (e) {
                                                    console.error(e);
                                                    alert('Error updating detail');
                                                }
                                            }}

                                            onDeleteOrder={handleDeleteOrder}
                                        />
                                    </div>
                                </>
                            );
                        })()}
                    </>
                )}

                {/* Footer Info Icon */}
                <div className="fixed bottom-4 left-4 z-50">
                    <div className="relative group">
                        <button className="p-1.5 text-slate-300 hover:text-indigo-400 hover:bg-slate-800/50 rounded-full transition-all cursor-help opacity-50 hover:opacity-100">
                            <Info className="w-3 h-3" />
                        </button>
                        {/* Tooltip */}
                        <div className="absolute bottom-full left-0 mb-2 w-auto min-w-[120px] bg-[#4e80ff] text-white text-[10px] p-3 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 animate-in slide-in-from-bottom-2">
                            <div className="font-bold text-xs mb-1 whitespace-nowrap">ProTracker</div>
                            <div className="space-y-0.5 text-slate-300">
                                <div className="flex justify-between gap-3"><span>Version:</span> <span>6.6.0</span></div>
                                <div className="flex justify-between gap-3"><span>Developer:</span> <span>Eric</span></div>
                                <div className="flex justify-between gap-3"><span>License:</span> <span>MIT</span></div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Bulk Confirmation Modal */}
            {bulkConfirmState.isOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 max-w-sm mx-4 shadow-xl">
                        <h3 className="text-lg font-bold text-slate-900 mb-2">Confirm Bulk Action</h3>
                        <p className="text-slate-600 mb-4">
                            Are you sure you want to mark <strong>{bulkConfirmState.count}</strong> orders as
                            <span className={`font-bold ml-1 ${bulkConfirmState.mode === 'P' ? 'text-blue-600' : bulkConfirmState.mode === 'Hold' ? 'text-orange-600' : bulkConfirmState.mode === 'QN' ? 'text-red-600' : bulkConfirmState.mode === 'WIP' ? 'text-yellow-600' : bulkConfirmState.mode === 'Complete' ? 'text-green-600' : 'text-slate-500'}`}>
                                {bulkConfirmState.mode === 'P' ? 'P' : bulkConfirmState.mode === 'Hold' ? 'Hold' : bulkConfirmState.mode === 'QN' ? 'QN' : bulkConfirmState.mode === 'WIP' ? 'WIP' : bulkConfirmState.mode === 'Complete' ? 'Complete (Today)' : 'N/A'}
                            </span> for
                            <span className="font-semibold ml-1">{bulkConfirmState.step}</span>?
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setBulkConfirmState({ ...bulkConfirmState, isOpen: false })}
                                className="flex-1 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    const { step, mode, targets } = bulkConfirmState;
                                    let status = 'N/A';
                                    if (mode === 'P') status = 'P';
                                    else if (mode === 'Hold') status = 'Hold';
                                    else if (mode === 'QN') status = 'QN';
                                    else if (mode === 'WIP') status = 'WIP';
                                    else if (mode === 'Complete') status = format(new Date(), 'dd-MMM, HH:mm');
                                    try {
                                        const updates = targets.map((o: any) => ({
                                            woId: o['WO ID'],
                                            step,
                                            status
                                        }));

                                        const res = await fetch('/api/orders/batch', {
                                            method: 'PATCH',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ updates, operatorId: 'admin', productId: selectedProductId })
                                        });

                                        if (res.ok) {
                                            await fetchOrders();
                                            setBulkConfirmState({ ...bulkConfirmState, isOpen: false });
                                        } else {
                                            alert('Batch update failed');
                                        }
                                    } catch (err) {
                                        console.error(err);
                                        alert('Batch update failed');
                                    }
                                }}
                                className={`flex-1 py-2 text-white rounded-lg font-medium ${bulkConfirmState.mode === 'P' ? 'bg-indigo-600 hover:bg-indigo-500' : bulkConfirmState.mode === 'Complete' ? 'bg-green-600 hover:bg-green-500' : 'bg-slate-600 hover:bg-slate-500'}`}
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Erase Mode Password Confirmation Modal */}
            {erasePasswordModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 max-w-sm mx-4 shadow-xl">
                        <h3 className="text-lg font-bold text-red-600 mb-2">⚠️ Enable Erase Mode</h3>
                        <p className="text-slate-600 mb-4 text-sm">
                            Erase mode allows you to clear any cell content. Please enter your password to confirm.
                        </p>


                        <div className="relative mb-4">
                            <input
                                type={erasePasswordVisible ? 'text' : 'password'}
                                value={erasePassword}
                                onChange={(e) => setErasePassword(e.target.value)}
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-200 pr-10 text-slate-800"
                                placeholder={role === 'supervisor' ? 'Supervisor Password' : 'Admin Password'}
                                autoFocus
                                onKeyDown={async (e) => {
                                    if (e.key === 'Enter' && erasePassword) {
                                        const res = await fetch('/api/auth', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ password: erasePassword })
                                        });
                                        const data = await res.json();
                                        if (data.role === role) {
                                            setErasePasswordModal(false);
                                            setEraseMode(true);
                                            setPMode(false);
                                            setNaMode(false);
                                            setHoldMode(false);
                                        } else {
                                            setErasePasswordError('Invalid password');
                                        }
                                    }
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => setErasePasswordVisible(!erasePasswordVisible)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                {erasePasswordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        {erasePasswordError && (
                            <p className="text-red-500 text-sm mb-2">{erasePasswordError}</p>
                        )}

                        <div className="flex gap-2">
                            <button
                                onClick={() => setErasePasswordModal(false)}
                                className="flex-1 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    const res = await fetch('/api/auth', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ password: erasePassword })
                                    });
                                    const data = await res.json();
                                    if (data.role === role) {
                                        setErasePasswordModal(false);
                                        setEraseMode(true);
                                        setPMode(false);
                                        setNaMode(false);
                                    } else {
                                        setErasePasswordError('Invalid password');
                                    }
                                }}
                                disabled={!erasePassword}
                                className="flex-1 py-2 bg-red-600 text-white rounded-lg font-medium disabled:opacity-50"
                            >
                                Enable
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Click outside to close product menu */}
            {productMenuOpen && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setProductMenuOpen(false)}
                />
            )}

            {/* Operation Logs Modal */}
            {showLogsModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl p-6 max-w-5xl w-full mx-4 shadow-xl max-h-[85vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                <History className="w-6 h-6 text-indigo-600" />
                                Operation Logs
                            </h3>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={downloadLogsCSV}
                                    title="Download CSV"
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors border border-green-200"
                                >
                                    <Download className="w-4 h-4" />
                                    CSV
                                </button>

                                {role === 'admin' && (
                                    confirmingClear ? (
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={performClearLogs}
                                                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-sm"
                                            >
                                                Sure?
                                            </button>
                                            <button
                                                onClick={() => setConfirmingClear(false)}
                                                className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={clearLogs}
                                            title="Clear All Logs"
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-200"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            Clear
                                        </button>
                                    )
                                )}

                                <div className="w-px h-6 bg-slate-200 mx-1"></div>

                                <button onClick={() => setShowLogsModal(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                        </div>

                        {/* Notification */}
                        {logsNotification && (
                            <div className={`mx-6 mt-4 px-4 py-3 rounded-lg flex items-center gap-2 ${logsNotification.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                                }`}>
                                {logsNotification.type === 'success' ? (
                                    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                ) : (
                                    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                )}
                                <span className="font-medium">{logsNotification.message}</span>
                            </div>
                        )}

                        {loadingLogs ? (
                            <div className="py-20 text-center text-slate-400 flex flex-col items-center gap-3">
                                <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                                <span>Loading history...</span>
                            </div>
                        ) : logs.length === 0 ? (
                            <div className="py-20 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                No operation logs found
                            </div>
                        ) : (
                            <div className="flex-1 overflow-y-auto border border-slate-200 rounded-lg shadow-sm">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                                        <tr>
                                            <th className="px-4 py-3 text-left font-semibold text-slate-700 border-b border-slate-200">Time</th>
                                            <th className="px-4 py-3 text-left font-semibold text-slate-700 border-b border-slate-200">Operator</th>
                                            <th className="px-4 py-3 text-left font-semibold text-slate-700 border-b border-slate-200">WO ID</th>
                                            <th className="px-4 py-3 text-left font-semibold text-slate-700 border-b border-slate-200">Step</th>
                                            <th className="px-4 py-3 text-left font-semibold text-slate-700 border-b border-slate-200">Action</th>
                                            <th className="px-4 py-3 text-left font-semibold text-slate-700 border-b border-slate-200">Change</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white">
                                        {logs.map(log => (
                                            <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-4 py-3 whitespace-nowrap text-slate-500 font-mono text-xs">
                                                    {new Date(log.timestamp).toLocaleString('en-US', {
                                                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                                    })}
                                                </td>
                                                <td className="px-4 py-3 font-medium text-indigo-600">{log.operatorId}</td>
                                                <td className="px-4 py-3 font-medium text-slate-900">{log.woId}</td>
                                                <td className="px-4 py-3 truncate max-w-[150px] text-slate-600" title={log.step}>{log.step}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-1 rounded-md text-xs font-semibold border ${log.action === 'Done' ? 'bg-green-50 text-green-700 border-green-100' :
                                                        log.action === 'WIP' ? 'bg-yellow-50 text-yellow-700 border-yellow-100' :
                                                            log.action === 'P' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                                                log.action === 'Reset' ? 'bg-slate-100 text-slate-600 border-slate-200' :
                                                                    'bg-slate-50 text-slate-600 border-slate-100'
                                                        }`}>
                                                        {log.action}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-slate-600 text-sm">
                                                    {log.previousValue ? (
                                                        <span className="flex items-center gap-1.5 flex-wrap">
                                                            <span className="line-through text-slate-400 text-xs">{log.previousValue}</span>
                                                            <ArrowRight className="w-3 h-3 text-slate-400" />
                                                            <span className="font-medium text-slate-900">{log.newValue || '-'}</span>
                                                        </span>
                                                    ) : (
                                                        <span className="font-medium text-slate-900">{log.newValue || '-'}</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )
            }

            {/* Barcode Scanner Modal */}
            <BarcodeScanner
                isOpen={scannerOpen}
                onClose={() => setScannerOpen(false)}
                onScan={(code) => {
                    setSearchQuery(code);
                    // Find order matching barcode (check WO ID, PN, etc.)
                    const matchedOrder = orders.find(o =>
                        o['WO ID']?.includes(code) ||
                        o['PN']?.includes(code) ||
                        Object.values(o).some(v => typeof v === 'string' && v.includes(code))
                    );
                    if (matchedOrder) {
                        // Play beep sound
                        try {
                            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
                            if (AudioContext) {
                                const ctx = new AudioContext();
                                const osc = ctx.createOscillator();
                                const gain = ctx.createGain();
                                osc.connect(gain);
                                gain.connect(ctx.destination);
                                osc.frequency.value = 1000; // 1000Hz beep
                                osc.type = 'sine';
                                gain.gain.value = 0.1;
                                osc.start();
                                setTimeout(() => {
                                    osc.stop();
                                    ctx.close();
                                }, 150);
                            }
                        } catch (e) {
                            console.error('Audio play failed', e);
                        }

                        // Redirect to operation view
                        setScannerOpen(false);
                        router.push(`/dashboard/operation?wo=${matchedOrder['WO ID']}&product=${selectedProductId}`);
                    } else {
                        alert(`No order found for barcode: ${code}`);
                    }
                }}
            />

            {/* Draggable Menu (Mobile Only) */}
            <div className="md:hidden">
                <DraggableMenu
                    products={products}
                    selectedProductId={selectedProductId}
                    onProductChange={handleProductChange}
                    role={role}
                    onNavigate={(path) => router.push(path)}

                    pMode={pMode} setPMode={setPMode}
                    naMode={naMode} setNaMode={setNaMode}
                    holdMode={holdMode} setHoldMode={setHoldMode}
                    eraseMode={eraseMode} setEraseMode={setEraseMode}
                    handleEraseRequest={() => {
                        if (eraseMode) setEraseMode(false);
                        else if (role === 'admin') setEraseMode(true);
                        else {
                            setErasePasswordModal(true);
                            setErasePassword('');
                            setErasePasswordError('');
                        }
                    }}

                    onImport={() => {
                        if (!selectedProductId) { alert('Select a product line first'); return; }
                        document.getElementById('dashboard-import-input')?.click();
                    }}
                    onScan={() => setScannerOpen(true)}
                    onRefresh={fetchOrders}
                    onLogout={handleLogout}
                />
            </div>

            {/* Import Orders Modal */}
            {
                showImportModal && importPreview && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
                            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                    <FileSpreadsheet className="w-5 h-5 text-green-600" />
                                    Import Orders
                                </h3>
                                <button onClick={() => { setShowImportModal(false); setImportFile(null); }} className="text-slate-400 hover:text-slate-600">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-6 space-y-4">
                                <div className="grid grid-cols-3 gap-3 text-center">
                                    <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                                        <div className="text-2xl font-bold text-green-700">{importPreview.newOrders}</div>
                                        <div className="text-xs text-green-600 font-medium uppercase tracking-wide">New</div>
                                    </div>
                                    <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                                        <div className="text-2xl font-bold text-blue-700">{importPreview.existingOrders}</div>
                                        <div className="text-xs text-blue-600 font-medium uppercase tracking-wide">Skipped</div>
                                    </div>
                                    <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                                        <div className="text-2xl font-bold text-slate-700">{importPreview.totalRows}</div>
                                        <div className="text-xs text-slate-500 font-medium uppercase tracking-wide">Total Rows</div>
                                    </div>
                                </div>

                                {/* Missing Columns Warning */}
                                {importPreview.missingColumns && importPreview.missingColumns.length > 0 && (
                                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                                        <div className="flex items-start gap-2">
                                            <Info className="w-5 h-5 text-amber-600 mt-0.5" />
                                            <div>
                                                <div className="text-sm font-bold text-amber-800 mb-1">
                                                    ⚠️ Missing Columns
                                                </div>
                                                <div className="text-xs text-amber-700 mb-2">
                                                    The following columns from your settings were not found in this Excel file.
                                                    Data for these columns will be empty.
                                                </div>
                                                <div className="flex flex-wrap gap-1">
                                                    {importPreview.missingColumns.map((col: string, i: number) => (
                                                        <span key={i} className="px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded text-[10px] font-medium border border-amber-200">
                                                            {col}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Success State if no missing columns and no errors */}
                                {(!importPreview.missingColumns || importPreview.missingColumns.length === 0) && (!importPreview.validationErrors || importPreview.validationErrors.length === 0) && (
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
                                        <Check className="w-5 h-5 text-green-600" />
                                        <span className="text-sm text-green-700 font-medium">All configured columns found!</span>
                                    </div>
                                )}

                                {importPreview.validationErrors?.length > 0 && (
                                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 max-h-32 overflow-y-auto">
                                        <div className="text-xs font-bold text-red-800 mb-1">Errors Found:</div>
                                        {importPreview.validationErrors.map((err: any, i: number) => (
                                            <div key={i} className="text-xs text-red-600">Row {err.row}: {err.error}</div>
                                        ))}
                                    </div>
                                )}

                                {importMsg && (
                                    <div className={`p-3 rounded-lg text-sm ${importMsg.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                                        {importMsg.text}
                                    </div>
                                )}

                                <p className="text-sm text-slate-500 text-center">
                                    Importing to <b>{selectedProduct?.name}</b>.
                                    <br />Existing orders (by WO ID) will be skipped.
                                </p>
                            </div>

                            <div className="px-6 py-4 border-t border-slate-100 flex gap-3 bg-slate-50">
                                <button
                                    onClick={() => { setShowImportModal(false); setImportFile(null); }}
                                    className="flex-1 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmImport}
                                    disabled={isImporting || importPreview.newOrders === 0}
                                    className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isImporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                    {isImporting ? 'Importing...' : 'Confirm Import'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* AI Chat Panel */}
            <AIChatPanel
                productId={selectedProductId}
                role={role}
                onNavigate={(woId) => {
                    // Navigate to operation view for this order
                    if (selectedProductId) {
                        router.push(`/dashboard/operation?wo=${woId}&product=${selectedProductId}`);
                    }
                }}
            />
        </div >
    );
}
