'use client';
import { useState, useEffect } from 'react';
import { MessageCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function MessageNotification() {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMessages();

        // Poll every 30 seconds
        const interval = setInterval(fetchMessages, 30000);

        // Listen for updates from other components
        const handleUpdate = () => fetchMessages();
        window.addEventListener('messages-updated', handleUpdate);

        return () => {
            clearInterval(interval);
            window.removeEventListener('messages-updated', handleUpdate);
        };
    }, []);

    const fetchMessages = async () => {
        try {
            const res = await fetch('/api/messages/my');
            if (res.ok) {
                const result = await res.json();
                setData(result);
            }
        } catch (error) {
            console.error('Failed to fetch messages:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleMessageClick = async (msg: any) => {
        // Mark as read
        try {
            await fetch(`/api/messages/${msg.id}/read`, { method: 'POST' });
            fetchMessages(); // Refresh
        } catch (error) {
            console.error('Failed to mark as read:', error);
        }

        // Navigate to order and step
        const params = new URLSearchParams({
            product: msg.order.productId,
            wo: msg.order.woId,
            step: msg.stepName // Auto-open this step
        });
        router.push(`/dashboard/operation?${params.toString()}`);
        setIsOpen(false);
    };

    const unreadCount = data?.unreadCount || 0;
    const messages = data?.messages || [];

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 hover:bg-slate-100 rounded-lg transition-colors"
                title="Notifications"
            >
                <MessageCircle size={20} className="text-slate-600" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Click outside to close - must be before dropdown */}
            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-[100]"
                        onClick={() => setIsOpen(false)}
                    />

                    <div className="absolute right-0 top-12 w-96 bg-white rounded-lg shadow-xl border z-[101]">
                        <div className="p-4 border-b flex justify-between items-center">
                            <h3 className="font-bold text-gray-900">💬 Messages</h3>
                            <span className="text-sm text-gray-500">{unreadCount} unread</span>
                        </div>

                        <div className="max-h-96 overflow-y-auto">
                            {loading ? (
                                <div className="p-8 text-center text-gray-400">Loading...</div>
                            ) : messages.length === 0 ? (
                                <div className="p-8 text-center text-gray-400">No messages</div>
                            ) : (
                                messages.slice(0, 10).map((msg: any) => (
                                    <div
                                        key={msg.id}
                                        onClick={() => handleMessageClick(msg)}
                                        className={`p-3 border-b cursor-pointer hover:bg-slate-50 transition-colors ${msg.isUnread ? 'bg-blue-50' : ''
                                            }`}
                                    >
                                        <div className="flex items-start gap-2">
                                            {msg.isUnread && (
                                                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <div className="text-xs text-gray-500 mb-1 truncate">
                                                    [{msg.order?.product?.name}] [{msg.order?.woId}] - {msg.stepName}
                                                </div>
                                                <div className="text-sm text-gray-900">
                                                    <strong>{msg.user.username}:</strong> {msg.content || msg.note || '(Structured Message)'}
                                                </div>
                                                <div className="text-xs text-gray-400 mt-1">
                                                    {formatTime(msg.createdAt)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {messages.length > 10 && (
                            <div className="p-2 border-t text-center">
                                <span className="text-xs text-gray-500">Showing last 10 messages</span>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

function formatTime(timestamp: string) {
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    return new Date(timestamp).toLocaleDateString('en-US');
}
