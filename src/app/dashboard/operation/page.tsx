'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { APP_VERSION } from '@/lib/version';
import {
    ArrowLeft, HardHat, Clock, AlertTriangle, CheckCircle2, RotateCcw, X, ScanBarcode, PauseCircle, MessageCircle, Send, Loader2,
    User, Table2, Settings, LogOut, Search, CheckCircle, Ban
} from 'lucide-react';
import type { Order } from '@/lib/excel';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { MessageNotification } from '@/components/MessageNotification';

// Dynamic import for barcode scanner
const BarcodeScanner = dynamic(() => import('@/components/BarcodeScanner'), { ssr: false });

// Comment categories
function OperationContent() {
    const t = useTranslations('Operation');
    const tCommon = useTranslations('Common');
    const tDash = useTranslations('Dashboard');

    // Comment categories
    const COMMENT_CATEGORIES = [
        { key: 'material', label: t('category_material', { defaultValue: 'Material Shortage' }), color: 'bg-purple-100 text-purple-700' },
        { key: 'machine', label: t('category_machine', { defaultValue: 'Machine Issue' }), color: 'bg-red-100 text-red-700' },
        { key: 'quality', label: t('category_quality', { defaultValue: 'Quality Issue' }), color: 'bg-orange-100 text-orange-700' },
        { key: 'process', label: t('category_process', { defaultValue: 'Process Issue' }), color: 'bg-blue-100 text-blue-700' },
        { key: 'other', label: t('category_other', { defaultValue: 'Other' }), color: 'bg-slate-100 text-slate-700' },
    ];
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

    // Comment Modal State
    // Comment Modal State
    const [commentModal, setCommentModal] = useState<{ step: string; orderId: string } | null>(null);
    const [commentCategory, setCommentCategory] = useState('');
    const [commentText, setCommentText] = useState('');
    const [sendingComment, setSendingComment] = useState(false);
    const [commentSuccess, setCommentSuccess] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [stepComments, setStepComments] = useState<any[]>([]); // Store history
    const [loadingComments, setLoadingComments] = useState(false);
    const [mentionMenuOpen, setMentionMenuOpen] = useState(false);
    const [selectedMention, setSelectedMention] = useState('');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [supervisors, setSupervisors] = useState<any[]>([]); // List of supervisors for mentions
    const [unreadStats, setUnreadStats] = useState<Record<string, { unread: number }>>({}); // Per-user unread stats

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
            const stepParam = searchParams.get('step');

            if (woParam) {
                const order = ordersData.orders?.find((o: Order) => o['WO ID'] === woParam);
                if (order) {
                    setSelectedOrder(order);

                    // Fetch unread stats for this order
                    fetchUnreadStats(order.id);

                    // If step provided, open comment modal
                    if (stepParam) {
                        setCommentModal({
                            orderId: order.id,
                            step: stepParam
                        });
                    }

                    // Clear navigation params from URL to prevent re-opening on manual refresh
                    const newParams = new URLSearchParams(searchParams.toString());
                    newParams.delete('wo');
                    newParams.delete('step');
                    const newUrl = `${window.location.pathname}${newParams.toString() ? '?' + newParams.toString() : ''}`;
                    window.history.replaceState({ ...window.history.state, as: newUrl, url: newUrl }, '', newUrl);
                }
            }
        } catch (err) {
            console.error('fetchData error:', err);
            setOrders([]);
            setSteps([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchSupervisors = async () => {
        try {
            const res = await fetch('/api/users/supervisors');
            if (res.ok) {
                const data = await res.json();
                setSupervisors(data.supervisors || []);
            }
        } catch (e) {
            console.error('Failed to fetch supervisors', e);
        }
    };

    const fetchUnreadStats = async (orderId: string) => {
        try {
            const res = await fetch(`/api/comments/unread-stats?orderId=${orderId}`);
            if (res.ok) {
                const data = await res.json();
                setUnreadStats(data.stats || {});
            }
        } catch (e) {
            console.error('Failed to fetch unread stats', e);
        }
    };

    useEffect(() => {
        fetchData();
        fetchSupervisors();

        const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
        return () => clearInterval(interval);
    }, [searchParams]); // Depend on searchParams to re-fetch if product ID changes

    // Fetch unread stats when selectedOrder changes
    useEffect(() => {
        if (selectedOrder?.id) {
            fetchUnreadStats(selectedOrder.id);
        } else {
            setUnreadStats({});
        }
    }, [selectedOrder?.id]);

    // Fetch comments when modal opens
    useEffect(() => {
        if (commentModal) {
            fetchStepComments(commentModal.orderId, commentModal.step);
        } else {
            setStepComments([]);
        }
    }, [commentModal]);

    const fetchStepComments = async (orderId: string, stepName: string) => {
        setLoadingComments(true);
        try {
            const res = await fetch(`/api/comments?orderId=${orderId}&stepName=${encodeURIComponent(stepName)}`);
            if (res.ok) {
                const data = await res.json();
                setStepComments(data.comments || []);

                // Mark comments as read
                await fetch('/api/comments/mark-read', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ orderId, stepName })
                });

                // Notify notification component to refresh
                window.dispatchEvent(new Event('messages-updated'));

                // Refresh unread stats after marking as read
                if (selectedOrder?.id) {
                    fetchUnreadStats(selectedOrder.id);
                }
            }
        } catch (error) {
            console.error('Fetch comments error:', error);
        } finally {
            setLoadingComments(false);
        }
    };

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

    const sendComment = async () => {
        if (!commentModal || !commentText.trim()) return;

        setSendingComment(true);
        try {
            const res = await fetch('/api/comments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId: commentModal.orderId,
                    stepName: commentModal.step,
                    category: commentCategory,
                    content: commentText.trim(),
                    mentions: selectedMention ? [selectedMention] : [] // Backend will parse ID or Username
                })
            });

            if (res.ok) {
                setCommentSuccess(true);
                setTimeout(() => {
                    setCommentModal(null);
                    setCommentText('');
                    setCommentCategory('');
                    setSelectedMention('');
                    setCommentSuccess(false);
                }, 1500);
            } else {
                const err = await res.json();
                alert('Sent failed: ' + (err.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Send comment error:', error);
            alert('Sent failed, please retry');
        } finally {
            setSendingComment(false);
        }
    };



    return (
        <div className="min-h-screen bg-slate-100">
            {/* Header - Mobile optimized */}
            <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-50">
                <div className="max-w-full mx-auto px-2 sm:px-4 h-14 flex items-center justify-between gap-2">
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-opacity cursor-pointer"
                        title={t('returnToHome')}
                    >
                        <img src="/logo.png" alt="iProTraX" className="h-9 w-auto" />
                    </button>

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
                            <span className="hidden sm:inline">{tDash('home')}</span>
                        </button>

                        <button className="flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium">
                            <HardHat className="w-4 h-4" />
                            <span className="hidden sm:inline">{tDash('operation')}</span>
                        </button>

                        {role === 'admin' && (
                            <button
                                onClick={() => router.push('/dashboard/settings')}
                                className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:bg-slate-50 rounded-lg text-sm font-medium"
                            >
                                <Settings className="w-4 h-4" />
                                <span className="hidden sm:inline">{tDash('settings')}</span>
                            </button>
                        )}

                        {/* Message Notification */}
                        <MessageNotification />

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
                                placeholder={t('searchPlaceholder')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200 text-black font-medium placeholder:text-slate-400"
                            />
                        </div>
                        <button
                            onClick={handleSearch}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-500"
                        >
                            {tCommon('search')}
                        </button>
                        <button
                            onClick={() => setScannerOpen(true)}
                            className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200"
                            title={t('scanBarcode')}
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
                                                {t('status.done')}
                                            </button>
                                            <button
                                                onClick={() => handleAction(step, 'WIP')}
                                                disabled={updating || isLocked}
                                                className={`flex flex-col items-center justify-center p-3 rounded-lg text-xs font-medium transition-all active:scale-95 ${isLocked ? 'text-slate-300 bg-slate-100' : 'text-yellow-600 bg-yellow-50 hover:bg-yellow-100 active:bg-yellow-200'}`}
                                            >
                                                <Clock className="w-6 h-6 mb-1" />
                                                {t('status.wip')}
                                            </button>
                                            <button
                                                onClick={() => handleAction(step, 'Hold')}
                                                disabled={updating || isLocked}
                                                className={`flex flex-col items-center justify-center p-3 rounded-lg text-xs font-medium transition-all active:scale-95 ${isLocked ? 'text-slate-300 bg-slate-100' : 'text-orange-600 bg-orange-50 hover:bg-orange-100 active:bg-orange-200'}`}
                                            >
                                                <PauseCircle className="w-6 h-6 mb-1" />
                                                {t('status.hold')}
                                            </button>
                                            <button
                                                onClick={() => handleAction(step, 'QN')}
                                                disabled={updating || isLocked}
                                                className={`flex flex-col items-center justify-center p-3 rounded-lg text-xs font-medium transition-all active:scale-95 ${isLocked ? 'text-slate-300 bg-slate-100' : 'text-red-600 bg-red-50 hover:bg-red-100 active:bg-red-200'}`}
                                            >
                                                <AlertTriangle className="w-6 h-6 mb-1" />
                                                {t('status.qn')}
                                            </button>
                                            <button
                                                onClick={() => handleAction(step, 'N/A')}
                                                disabled={updating || isLocked}
                                                className={`flex flex-col items-center justify-center p-3 rounded-lg text-xs font-medium transition-all active:scale-95 ${isLocked ? 'text-slate-300 bg-slate-100' : 'text-slate-500 bg-slate-100 hover:bg-slate-200 active:bg-slate-300'}`}
                                            >
                                                <Ban className="w-6 h-6 mb-1" />
                                                {t('status.na')}
                                            </button>
                                            <button
                                                onClick={() => handleAction(step, 'Reset')}
                                                disabled={updating || isLocked}
                                                className={`flex flex-col items-center justify-center p-3 rounded-lg text-xs font-medium transition-all active:scale-95 ${isLocked ? 'text-slate-300 bg-slate-100' : 'text-slate-400 bg-slate-100 hover:bg-slate-200 active:bg-slate-300'}`}
                                            >
                                                <RotateCcw className="w-6 h-6 mb-1" />
                                                {t('status.reset')}
                                            </button>
                                        </div>

                                        {/* Comment Button - Full Width */}
                                        <button
                                            onClick={() => setCommentModal({ step, orderId: String(selectedOrder.id) })}
                                            className="w-full mt-2 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-all active:scale-95 text-purple-600 bg-purple-50 hover:bg-purple-100 active:bg-purple-200 relative"
                                        >
                                            <div className="relative">
                                                <MessageCircle className="w-4 h-4" />
                                                {unreadStats?.[step]?.unread > 0 && (
                                                    <span className="absolute -top-1.5 -right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-purple-50"></span>
                                                )}
                                            </div>
                                            {t('comments')}
                                            {(selectedOrder as any).commentStats?.[step]?.total > 0 && (
                                                <span className="ml-1 text-[10px] bg-purple-200 text-purple-700 px-1.5 rounded-full">
                                                    {(selectedOrder as any).commentStats?.[step]?.total}
                                                </span>
                                            )}
                                        </button>

                                        {isLocked && (
                                            <p className="text-[10px] text-slate-400 text-center mt-2">🔒 {t('stepLocked')}</p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-20 text-slate-400">
                        {t('startSearch')}
                    </div>
                )}
            </main>



            {/* Confirm Modal */}
            {confirmModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 max-w-sm mx-4 shadow-xl">
                        <h3 className="text-lg font-bold text-slate-900 mb-2">{t('confirmAction')}</h3>
                        <p className="text-slate-500 mb-4">
                            {t('confirmDesc', { step: confirmModal.step, status: confirmModal.status })}
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setConfirmModal(null)}
                                className="flex-1 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium"
                            >
                                {tCommon('cancel')}
                            </button>
                            <button
                                onClick={confirmAction}
                                disabled={updating}
                                className="flex-1 py-2 bg-indigo-600 text-white rounded-lg font-medium"
                            >
                                {updating ? t('updating') : tCommon('confirm')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Unplanned Step Warning Modal */}
            {unplannedModal && pendingAction && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 max-w-sm mx-4 shadow-xl">
                        <h3 className="text-lg font-bold text-amber-600 mb-2">⚠️ {t('unplannedWarning')}</h3>
                        <p className="text-slate-600 mb-4">
                            {t('unplannedDesc', { status: pendingAction.status })}
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    setUnplannedModal(false);
                                    setPendingAction(null);
                                }}
                                className="flex-1 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium"
                            >
                                {tCommon('cancel')}
                            </button>
                            <button
                                onClick={() => {
                                    setUnplannedModal(false);
                                    setConfirmModal(pendingAction);
                                    setPendingAction(null);
                                }}
                                className="flex-1 py-2 bg-amber-500 text-white rounded-lg font-medium"
                            >
                                {t('proceedAnyway')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Comment Modal */}
            {commentModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
                        {commentSuccess ? (
                            <div className="text-center py-8">
                                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <CheckCircle className="w-8 h-8 text-green-600" />
                                </div>
                                <h3 className="text-lg font-bold text-green-600">{t('messageSent')}</h3>
                            </div>
                        ) : (
                            <>
                                <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-4">
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900">
                                            💬 {t('comments')} - {commentModal.step}
                                        </h3>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            {stepComments.length} {t('comments')}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setCommentModal(null);
                                            setCommentText('');
                                            setCommentCategory('');
                                            setSelectedMention('');
                                        }}
                                        className="p-1 text-slate-400 hover:text-slate-600"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* History Section */}
                                <div className="mb-4 max-h-60 overflow-y-auto bg-white rounded-lg border border-slate-200">
                                    {loadingComments ? (
                                        <div className="text-center py-4 text-slate-400">
                                            <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                                            {t('loadingHistory')}
                                        </div>
                                    ) : stepComments.length > 0 ? (
                                        <div className="divide-y divide-slate-100">
                                            {stepComments.map((comment: any) => ( // eslint-disable-line @typescript-eslint/no-explicit-any
                                                <div key={comment.id} className="px-2.5 py-2 hover:bg-slate-50 transition-colors group">
                                                    {/* 头部：发送者、角色、分类、时间、删除按钮 */}
                                                    <div className="flex items-center gap-1.5 mb-1">
                                                        <span className="text-[11px] font-bold text-slate-900">
                                                            {comment.user?.username || 'Unknown'}
                                                        </span>
                                                        {comment.user?.role && comment.user.role !== 'user' && (
                                                            <span className="text-[8px] text-slate-500 bg-slate-100 px-1 py-0.5 rounded">
                                                                {comment.user.role}
                                                            </span>
                                                        )}
                                                        <span className={`text-[8px] px-1 py-0.5 rounded font-medium ${COMMENT_CATEGORIES.find(c => c.key === comment.category.toLowerCase() || (comment.category === 'MATERIAL_SHORTAGE' && c.key === 'material') || (comment.category === 'EQUIPMENT_FAILURE' && c.key === 'machine') || (comment.category === 'QUALITY_ISSUE' && c.key === 'quality'))?.color || 'bg-slate-100'}`}>
                                                            {(() => {
                                                                const cat = comment.category.toUpperCase();
                                                                if (cat === 'MATERIAL_SHORTAGE' || cat === 'MATERIAL') return t('category_material');
                                                                if (cat === 'EQUIPMENT_FAILURE' || cat === 'MACHINE') return t('category_machine');
                                                                if (cat === 'QUALITY_ISSUE' || cat === 'QUALITY') return t('category_quality');
                                                                if (cat === 'PROCESS_ISSUE' || cat === 'PROCESS') return t('category_process');
                                                                return t('category_other');
                                                            })()}
                                                        </span>
                                                        {comment.mentionedUsers && comment.mentionedUsers.length > 0 && (
                                                            <>
                                                                <span className="text-[8px] text-slate-400">→</span>
                                                                {comment.mentionedUsers.map((user: any, idx: number) => (
                                                                    <span
                                                                        key={user.id}
                                                                        className="text-[8px] px-1 py-0.5 bg-indigo-50 text-indigo-600 rounded font-medium"
                                                                    >
                                                                        @{user.username}
                                                                    </span>
                                                                ))}
                                                            </>
                                                        )}
                                                        <span className="text-[9px] text-slate-400 ml-auto">
                                                            {new Date(comment.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                        {/* Delete button - only for supervisor/admin */}
                                                        {(role === 'supervisor' || role === 'admin') && (
                                                            <button
                                                                onClick={async () => {
                                                                    if (confirm(t('confirmDeleteComment'))) {
                                                                        try {
                                                                            const res = await fetch(`/api/comments/${comment.id}`, {
                                                                                method: 'DELETE'
                                                                            });
                                                                            if (res.ok) {
                                                                                // Refresh comments and order data
                                                                                if (commentModal) {
                                                                                    fetchStepComments(commentModal.orderId, commentModal.step);

                                                                                    // Refresh the selected order to update comment counts on buttons
                                                                                    if (selectedOrder) {
                                                                                        const ordersUrl = productId
                                                                                            ? `/api/orders?productId=${productId}`
                                                                                            : '/api/orders';
                                                                                        const ordersRes = await fetch(ordersUrl);
                                                                                        if (ordersRes.ok) {
                                                                                            const ordersData = await ordersRes.json();
                                                                                            const updatedOrder = ordersData.orders?.find((o: any) => o['WO ID'] === selectedOrder['WO ID']);
                                                                                            if (updatedOrder) {
                                                                                                setSelectedOrder(updatedOrder);
                                                                                            }
                                                                                        }
                                                                                    }
                                                                                }
                                                                            } else {
                                                                                alert(t('failedToDeleteComment'));
                                                                            }
                                                                        } catch (error) {
                                                                            console.error('Delete error:', error);
                                                                            alert(t('failedToDeleteComment'));
                                                                        }
                                                                    }
                                                                }}
                                                                className="opacity-0 group-hover:opacity-100 ml-1 text-red-500 hover:text-red-700 transition-opacity"
                                                                title={t('deleteComment')}
                                                            >
                                                                <X className="w-3 h-3" />
                                                            </button>
                                                        )}
                                                    </div>

                                                    {/* 评论内容 */}
                                                    <div className="flex items-start justify-between gap-2">
                                                        <p className="text-[13px] text-slate-700 break-words leading-snug flex-1">
                                                            {comment.content || comment.note}
                                                        </p>
                                                        {/* Reply button */}
                                                        <button
                                                            onClick={() => {
                                                                setSelectedMention(comment.userId);
                                                                // Scroll to input area and focus
                                                                const textarea = document.querySelector('textarea');
                                                                textarea?.focus();
                                                            }}
                                                            className="flex-shrink-0 text-[10px] text-blue-500 hover:text-blue-700 hover:bg-blue-50 px-2 py-0.5 rounded transition-colors"
                                                            title={t('replyToUser', { username: comment.user?.username })}
                                                        >
                                                            {t('reply')}
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-4 text-slate-400 text-sm italic">
                                            {t('noComments')}
                                        </div>
                                    )}
                                </div>

                                {/* Category Selection */}
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        {t('category')} {role === 'user' && <span className="text-red-500">*</span>}
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {COMMENT_CATEGORIES.map(cat => (
                                            <button
                                                key={cat.key}
                                                onClick={() => setCommentCategory(cat.key)}
                                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${commentCategory === cat.key
                                                    ? cat.color + ' ring-2 ring-offset-1'
                                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                    }`}
                                            >
                                                {cat.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Message Input & Mentions */}
                                <div className="mb-4">
                                    {/* Read-Only Check for Users */}
                                    {role === 'user' && selectedOrder && commentModal && (
                                        (selectedOrder as any)?.[commentModal.step] && (
                                            (selectedOrder as any)[commentModal.step].match(/\d{4}-\d{2}-\d{2}/) ||
                                            (selectedOrder as any)[commentModal.step].toUpperCase() === 'COMPLETED' // Simplified check
                                        )
                                    ) ? (
                                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-amber-700 text-sm flex items-center gap-2">
                                            <AlertTriangle className="w-4 h-4" />
                                            {t('stepCompletedCommentsClosed')}
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex justify-between items-center mb-2">
                                                <label className="block text-sm font-medium text-slate-700">{t('message')}</label>

                                                {/* Mention Selector */}
                                                <div className="relative">
                                                    <button
                                                        onClick={() => setMentionMenuOpen(!mentionMenuOpen)}
                                                        className={`text-xs px-2 py-1 rounded border flex items-center gap-1 ${selectedMention
                                                            ? 'bg-indigo-50 text-indigo-600 border-indigo-200 font-medium'
                                                            : 'bg-slate-50 text-slate-500 border-slate-200'
                                                            }`}
                                                    >
                                                        {selectedMention ? (selectedMention.startsWith('@') ? `To: ${selectedMention}` : `To: ${supervisors.find(s => s.id === selectedMention)?.username || 'User'}`) : t('mentionPlaceholder')}
                                                    </button>

                                                    {mentionMenuOpen && (
                                                        <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-10 w-48 overflow-hidden max-h-60 overflow-y-auto">
                                                            <div className="text-[10px] text-slate-400 px-3 py-1 bg-slate-50 border-b">{t('selectRecipient')}</div>

                                                            {role === 'user' ? (
                                                                <>
                                                                    <div className="px-2 py-1 text-[10px] text-slate-400 bg-slate-50 font-medium">{t('supervisors')}</div>
                                                                    {supervisors
                                                                        .filter(s => s.role === 'supervisor') // Strict requirement: Only Supervisors, no Admins
                                                                        .map(s => (
                                                                            <button
                                                                                key={s.id}
                                                                                onClick={() => { setSelectedMention(s.id); setMentionMenuOpen(false); }}
                                                                                className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 text-indigo-600 truncate"
                                                                            >
                                                                                @{s.username}
                                                                            </button>
                                                                        ))}
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <div className="px-2 py-1 text-[10px] text-slate-400 bg-slate-50 font-medium">{t('groups')}</div>
                                                                    <button
                                                                        onClick={() => { setSelectedMention('@Everyone'); setMentionMenuOpen(false); }}
                                                                        className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 text-indigo-600 font-bold"
                                                                    >
                                                                        @Everyone
                                                                    </button>
                                                                    <button
                                                                        onClick={() => { setSelectedMention('@Operator'); setMentionMenuOpen(false); }}
                                                                        className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 text-blue-600 font-bold"
                                                                    >
                                                                        @Operators
                                                                    </button>

                                                                    <div className="px-2 py-1 text-[10px] text-slate-400 bg-slate-50 font-medium border-t">Supervisors</div>
                                                                    {supervisors.filter(s => s.role === 'admin' || s.role === 'supervisor').map(s => (
                                                                        <button
                                                                            key={s.id}
                                                                            onClick={() => { setSelectedMention(s.id); setMentionMenuOpen(false); }}
                                                                            className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 text-purple-600 truncate"
                                                                        >
                                                                            @{s.username} <span className="text-[10px] text-slate-400">({s.role})</span>
                                                                        </button>
                                                                    ))}

                                                                    <div className="px-2 py-1 text-[10px] text-slate-400 bg-slate-50 font-medium border-t">Operators</div>
                                                                    {supervisors.filter(s => s.role === 'user').map(s => (
                                                                        <button
                                                                            key={s.id}
                                                                            onClick={() => { setSelectedMention(s.id); setMentionMenuOpen(false); }}
                                                                            className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 text-blue-600 truncate"
                                                                        >
                                                                            @{s.username}
                                                                        </button>
                                                                    ))}
                                                                </>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <textarea
                                                value={commentText}
                                                onChange={(e) => setCommentText(e.target.value)}
                                                placeholder={`Type your message... ${selectedMention ? `(notifying selected user)` : ''}`}
                                                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200 text-slate-900 min-h-[80px] resize-none"
                                            />
                                            {selectedMention && (
                                                <p className="text-xs text-indigo-600 mt-1 flex items-center gap-1">
                                                    <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full inline-block"></span>
                                                    Wait for response from: <strong>{selectedMention.startsWith('@') ? selectedMention : supervisors.find(s => s.id === selectedMention)?.username}</strong>
                                                </p>
                                            )}

                                            {/* Send Button */}
                                            <button
                                                onClick={async () => {
                                                    await sendComment();
                                                    // Refresh comments after sending
                                                    if (commentModal) {
                                                        fetchStepComments(commentModal.orderId, commentModal.step);
                                                    }
                                                }}
                                                disabled={sendingComment || !commentText.trim() || (role === 'user' && !commentCategory && !selectedMention)}
                                                className="w-full py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
                                            >
                                                {sendingComment ? (
                                                    <Loader2 className="w-5 h-5 animate-spin" />
                                                ) : (
                                                    <Send className="w-5 h-5" />
                                                )}
                                                {sendingComment ? 'Sending...' : 'Send'}
                                            </button>
                                        </>
                                    )}
                                </div>
                            </>
                        )}
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
