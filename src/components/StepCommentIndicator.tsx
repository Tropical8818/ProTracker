'use client';
import { useEffect, useState } from 'react';
import { MessageCircle } from 'lucide-react';

interface Props {
    orderId: string;
    stepName: string;
    onClick?: () => void;
}

interface CommentStats {
    total: number;
    unread: number;
}

export function StepCommentIndicator({ orderId, stepName, onClick }: Props) {
    const [stats, setStats] = useState<CommentStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, [orderId, stepName]);

    const fetchStats = async () => {
        try {
            const res = await fetch(
                `/api/comments/stats?orderId=${orderId}&stepName=${encodeURIComponent(stepName)}`
            );
            if (res.ok) {
                const data = await res.json();
                setStats(data);
            }
        } catch (error) {
            console.error('Failed to fetch comment stats:', error);
        } finally {
            setLoading(false);
        }
    };

    // Don't show anything if no comments
    if (!loading && (!stats || stats.total === 0)) {
        return null;
    }

    if (loading) {
        return (
            <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg opacity-50">
                <MessageCircle size={14} className="text-gray-300" />
            </div>
        );
    }

    const hasUnread = stats && stats.unread > 0;

    return (
        <button
            onClick={onClick}
            className="relative inline-flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors"
            title={`${stats!.total} 条消息${hasUnread ? `，${stats!.unread} 条未读` : ''}`}
        >
            <MessageCircle
                size={16}
                className={hasUnread ? 'text-blue-600' : 'text-gray-400'}
            />

            {/* Message count */}
            <span className={`text-xs ${hasUnread ? 'text-blue-600 font-semibold' : 'text-gray-500'}`}>
                {stats!.total}
            </span>

            {/* Unread indicator (red dot) */}
            {hasUnread && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            )}
        </button>
    );
}
