'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Factory, Table2, HardHat, Settings, LogOut, Search, User, CheckCircle, Clock, AlertTriangle, Ban, RotateCcw, X, ScanBarcode, PauseCircle } from 'lucide-react';
import type { Order } from '@/lib/excel';
import dynamic from 'next/dynamic';

// Dynamic import for barcode scanner
const BarcodeScanner = dynamic(() => import('@/components/BarcodeScanner'), { ssr: false });

function OperationContent() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [steps, setSteps] = useState<string[]>([]);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [confirmModal, setConfirmModal] = useState<{ step: string; status: string } | null>(null);
    const [pendingAction, setPendingAction] = useState<{ step: string; status: string } | null>(null);
    const [unplannedModal, setUnplannedModal] = useState(false);
    const [role, setRole] = useState<'user' | 'supervisor' | 'admin'>('user');
    const [username, setUsername] = useState('');
    const [scannerOpen, setScannerOpen] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();

    // Get productId from URL
    const productId = searchParams.get('product') || '';

    const fetchData = async () => {
        try {
            // Fetch auth first
            const authRes = await fetch('/api/auth');
            const authData = await authRes.json();

            if (!authData.authenticated) {
                router.push('/login');
                return;
            }

            setRole(authData.role || 'user');
            setUsername(authData.username || 'Unknown');

            // Build orders URL
            const ordersUrl = productId
                ? `/api/orders?productId=${productId}`
                : '/api/orders';

            const ordersRes = await fetch(ordersUrl);

            if (!ordersRes.ok) {
                // Don't throw - just set empty orders
                console.warn('Orders fetch failed:', ordersRes.status);
                setOrders([]);
                setSteps([]);
                return;
            }

            const ordersData = await ordersRes.json();

            setOrders(ordersData.orders || []);
            setSteps(ordersData.steps || []);

            // Auto-select from URL
            const woParam = searchParams.get('wo');
            if (woParam) {
                const order = ordersData.orders?.find((o: Order) => o['WO ID'] === woParam);
                if (order) setSelectedOrder(order);
            }
        } catch (err) {
            console.error('fetchData error:', err);
            setOrders([]);
            setSteps([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [productId]);

    const handleLogout = async () => {
        await fetch('/api/auth', { method: 'DELETE' });
        router.push('/login');
        router.refresh();
    };

    const handleSearch = () => {
        if (!searchQuery.trim()) {
            // Don't search if query is empty
            return;
        }
        const order = orders.find(o =>
            o['WO ID'].toLowerCase().includes(searchQuery.toLowerCase())
        );
        if (order) setSelectedOrder(order);
    };

    const handleAction = (step: string, status: string) => {
        // Check if step is not planned (not P) - only for non-admin users
        if (role === 'user' && selectedOrder) {
            const stepValue = (selectedOrder[step] || '').toUpperCase();
            const isPlanned = stepValue === 'P' || stepValue.startsWith('P,');
            if (!isPlanned && stepValue !== 'WIP' && !stepValue.includes('-')) {
                setPendingAction({ step, status });
                setUnplannedModal(true);
                return;
            }
        }

        setConfirmModal({ step, status });
    };

    const confirmAction = async () => {
        if (!confirmModal || !selectedOrder) return;

        setUpdating(true);
        try {
            const res = await fetch(`/api/orders/${selectedOrder['WO ID']}/step`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    step: confirmModal.step,
                    status: confirmModal.status,
                    productId
                })
            });

            if (res.ok) {
                await fetchData();
                // Re-select the updated order
                const ordersUrl = productId
                    ? `/api/orders?productId=${productId}`
                    : '/api/orders';
                const updatedOrders = await (await fetch(ordersUrl)).json();
                const updated = updatedOrders.orders?.find((o: Order) => o['WO ID'] === selectedOrder['WO ID']);
                if (updated) setSelectedOrder(updated);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setUpdating(false);
            setConfirmModal(null);
        }
    };

    const getStatusStyle = (val: string): string => {
        if (!val) return 'bg-slate-100 text-slate-400';
        const v = val.toUpperCase();
        if (v.startsWith('P')) return 'bg-[#0014DC] text-white';
        if (v === 'WIP') return 'bg-yellow-100 text-yellow-800';
        if (v === 'HOLD') return 'bg-orange-100 text-orange-800';
        if (v === 'QN' || v === 'DIFA') return 'bg-red-100 text-red-800';
        if (v === 'N/A') return 'bg-slate-200 text-slate-600';
        if (/\d{4}-\d{2}-\d{2}/.test(val)) return 'bg-green-100 text-green-800';
        return 'bg-slate-100 text-slate-600';
    };

    return (
        <div className="min-h-screen bg-slate-100">
            {/* Header - Mobile optimized */}
            <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-50">
                <div className="max-w-full mx-auto px-2 sm:px-4 h-14 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="bg-indigo-600 p-1.5 sm:p-2 rounded-lg">
                            <Factory className="w-5 h-5 text-white" />
                        </div>
                        <h1 className="text-base sm:text-lg font-bold text-slate-900 hidden sm:block">ProTracker <span className="text-indigo-600 text-xs ml-1">V5.0.0</span></h1>
                    </div>

                    {/* Operator Display */}
                    <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 px-3 py-2 rounded-lg">
                        <User className="w-4 h-4 text-indigo-500" />
                        <span className="text-sm font-medium text-indigo-700">{username}</span>
                    </div>

                    <nav className="flex items-center gap-1 sm:gap-2">
                        <button
                            onClick={() => router.push('/dashboard')}
                            className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:bg-slate-50 rounded-lg text-sm font-medium"
                        >
                            <Table2 className="w-4 h-4" />
                            <span className="hidden sm:inline">Home</span>
                        </button>

                        <button className="flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium">
                            <HardHat className="w-4 h-4" />
                            <span className="hidden sm:inline">Operation</span>
                        </button>

                        {role === 'admin' && (
                            <button
                                onClick={() => router.push('/dashboard/settings')}
                                className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:bg-slate-50 rounded-lg text-sm font-medium"
                            >
                                <Settings className="w-4 h-4" />
                                <span className="hidden sm:inline">Settings</span>
                            </button>
                        )}

                        <button
                            onClick={handleLogout}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                        >
                            <LogOut className="w-5 h-5" />
                        </button>
                    </nav>
                </div>
            </header>

            {/* Main Content */}
            <main className="p-4 max-w-4xl mx-auto">
                {/* Search */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 mb-4">
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search WO ID..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200 text-black font-mediumPlaceholder:text-slate-400"
                            />
                        </div>
                        <button
                            onClick={handleSearch}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-500"
                        >
                            Search
                        </button>
                        <button
                            onClick={() => setScannerOpen(true)}
                            className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200"
                            title="Scan Barcode"
                        >
                            <ScanBarcode className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Selected Order */}
                {selectedOrder ? (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        {/* Order Header */}
                        <div className="p-4 bg-slate-50 border-b border-slate-200">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900">{selectedOrder['WO ID']}</h2>
                                    <p className="text-sm text-slate-500">{selectedOrder['PN']} - {selectedOrder['Description']}</p>
                                </div>
                                <button
                                    onClick={() => setSelectedOrder(null)}
                                    className="p-1 text-slate-400 hover:text-slate-600"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Steps Grid - Mobile optimized */}
                        <div className="p-3 sm:p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                            {steps.map(step => {
                                const stepValue = selectedOrder[step] || '';
                                // Check if step is completed (has a date)
                                const isCompleted = /\d{4}-\d{2}-\d{2}/.test(stepValue) || /\d{2}[-\/]\w{3}/.test(stepValue);
                                // Only admin can modify completed steps
                                const isLocked = isCompleted && role === 'user';

                                return (
                                    <div key={step} className={`bg-slate-50 rounded-xl p-3 sm:p-4 border ${isLocked ? 'border-slate-300 opacity-60' : 'border-slate-200'}`}>
                                        <p className="text-xs sm:text-sm font-medium text-slate-500 mb-2 truncate">{step}</p>
                                        <div className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-bold text-center mb-3 ${getStatusStyle(stepValue)}`}>
                                            {stepValue || '-'}
                                        </div>

                                        {/* Action Buttons - Mobile optimized with larger touch targets */}
                                        <div className={`grid grid-cols-3 gap-2 ${isLocked ? 'pointer-events-none' : ''}`}>
                                            <button
                                                onClick={() => handleAction(step, 'Done')}
                                                disabled={updating || isLocked}
                                                className={`flex flex-col items-center justify-center p-3 rounded-lg text-xs font-medium transition-all active:scale-95 ${isLocked ? 'text-slate-300 bg-slate-100' : 'text-green-600 bg-green-50 hover:bg-green-100 active:bg-green-200'}`}
                                            >
                                                <CheckCircle className="w-6 h-6 mb-1" />
                                                Done
                                            </button>
                                            <button
                                                onClick={() => handleAction(step, 'WIP')}
                                                disabled={updating || isLocked}
                                                className={`flex flex-col items-center justify-center p-3 rounded-lg text-xs font-medium transition-all active:scale-95 ${isLocked ? 'text-slate-300 bg-slate-100' : 'text-yellow-600 bg-yellow-50 hover:bg-yellow-100 active:bg-yellow-200'}`}
                                            >
                                                <Clock className="w-6 h-6 mb-1" />
                                                WIP
                                            </button>
                                            <button
                                                onClick={() => handleAction(step, 'Hold')}
                                                disabled={updating || isLocked}
                                                className={`flex flex-col items-center justify-center p-3 rounded-lg text-xs font-medium transition-all active:scale-95 ${isLocked ? 'text-slate-300 bg-slate-100' : 'text-orange-600 bg-orange-50 hover:bg-orange-100 active:bg-orange-200'}`}
                                            >
                                                <PauseCircle className="w-6 h-6 mb-1" />
                                                Hold
                                            </button>
                                            <button
                                                onClick={() => handleAction(step, 'QN')}
                                                disabled={updating || isLocked}
                                                className={`flex flex-col items-center justify-center p-3 rounded-lg text-xs font-medium transition-all active:scale-95 ${isLocked ? 'text-slate-300 bg-slate-100' : 'text-red-600 bg-red-50 hover:bg-red-100 active:bg-red-200'}`}
                                            >
                                                <AlertTriangle className="w-6 h-6 mb-1" />
                                                QN
                                            </button>
                                            <button
                                                onClick={() => handleAction(step, 'N/A')}
                                                disabled={updating || isLocked}
                                                className={`flex flex-col items-center justify-center p-3 rounded-lg text-xs font-medium transition-all active:scale-95 ${isLocked ? 'text-slate-300 bg-slate-100' : 'text-slate-500 bg-slate-100 hover:bg-slate-200 active:bg-slate-300'}`}
                                            >
                                                <Ban className="w-6 h-6 mb-1" />
                                                N/A
                                            </button>
                                            <button
                                                onClick={() => handleAction(step, 'Reset')}
                                                disabled={updating || isLocked}
                                                className={`col-span-3 flex items-center justify-center gap-2 p-2 rounded-lg text-xs font-medium transition-all active:scale-95 ${isLocked ? 'text-slate-300 bg-slate-100' : 'text-slate-400 bg-slate-100 hover:bg-slate-200 active:bg-slate-300'}`}
                                            >
                                                <RotateCcw className="w-4 h-4" />
                                                Reset
                                            </button>
                                        </div>

                                        {isLocked && (
                                            <p className="text-[10px] text-slate-400 text-center mt-2">🔒 Locked</p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-20 text-slate-400">
                        Search for a Work Order to get started
                    </div>
                )}
            </main>



            {/* Confirm Modal */}
            {confirmModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 max-w-sm mx-4 shadow-xl">
                        <h3 className="text-lg font-bold text-slate-900 mb-2">Confirm Action</h3>
                        <p className="text-slate-500 mb-4">
                            Set <strong>{confirmModal.step}</strong> to <strong>{confirmModal.status}</strong>?
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setConfirmModal(null)}
                                className="flex-1 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmAction}
                                disabled={updating}
                                className="flex-1 py-2 bg-indigo-600 text-white rounded-lg font-medium"
                            >
                                {updating ? 'Updating...' : 'Confirm'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Unplanned Step Warning Modal */}
            {unplannedModal && pendingAction && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 max-w-sm mx-4 shadow-xl">
                        <h3 className="text-lg font-bold text-amber-600 mb-2">⚠️ Unplanned Operation</h3>
                        <p className="text-slate-600 mb-4">
                            This step has not been planned yet. Are you sure you want to proceed with <strong>{pendingAction.status}</strong>?
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    setUnplannedModal(false);
                                    setPendingAction(null);
                                }}
                                className="flex-1 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    setUnplannedModal(false);
                                    setConfirmModal(pendingAction);
                                    setPendingAction(null);
                                }}
                                className="flex-1 py-2 bg-amber-500 text-white rounded-lg font-medium"
                            >
                                Proceed Anyway
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Barcode Scanner Modal */}
            <BarcodeScanner
                isOpen={scannerOpen}
                onClose={() => setScannerOpen(false)}
                onScan={(code) => {
                    setSearchQuery(code);
                    // Auto-select matching order
                    const order = orders.find(o =>
                        o['WO ID']?.includes(code) ||
                        o['PN']?.includes(code)
                    );
                    if (order) {
                        setSelectedOrder(order);
                    }
                }}
            />
        </div>
    );
}

export default function OperationPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-slate-100 flex items-center justify-center">Loading...</div>}>
            <OperationContent />
        </Suspense>
    );
}
