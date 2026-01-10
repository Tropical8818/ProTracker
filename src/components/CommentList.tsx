'use client';
import { useEffect, useState } from 'react';
import { MessageCircle, Package, Wrench, AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface Props {
    orderId: string;
    stepName: string;
}

interface Comment {
    id: string;
    category: string;
    content?: string;
    note?: string;
    triggeredStatus?: string;
    createdAt: string;
    user: {
        username: string;
        role: string;
    };
    mentionedUsers?: Array<{
        id: string;
        username: string;
    }>;
}

export function CommentList({ orderId, stepName }: Props) {
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(true);

    const t = useTranslations('Operation');

    const fetchComments = async () => {
        try {
            const res = await fetch(
                `/api/comments?orderId=${orderId}&stepName=${encodeURIComponent(stepName)}`
            );
            if (res.ok) {
                const data = await res.json();
                setComments(data.comments || []);
            }
        } catch (error) {
            console.error('Failed to fetch comments:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchComments();
    }, [orderId, stepName]); // eslint-disable-line react-hooks/exhaustive-deps

    const getCategoryIcon = (category: string) => {
        const cat = (category || '').toUpperCase();
        if (cat === 'MATERIAL_SHORTAGE' || cat === 'MATERIAL') {
            return <Package size={16} className="text-orange-600" />;
        }
        if (cat === 'EQUIPMENT_FAILURE' || cat === 'MACHINE') {
            return <Wrench size={16} className="text-red-600" />;
        }
        if (cat === 'QUALITY_ISSUE' || cat === 'QUALITY') {
            return <AlertTriangle size={16} className="text-yellow-600" />;
        }
        return <MessageCircle size={16} className="text-blue-600" />;
    };

    const getCategoryLabel = (category: string) => {
        const cat = (category || '').toUpperCase();
        if (cat === 'MATERIAL_SHORTAGE' || cat === 'MATERIAL') return t('category_material');
        if (cat === 'EQUIPMENT_FAILURE' || cat === 'MACHINE') return t('category_machine');
        if (cat === 'QUALITY_ISSUE' || cat === 'QUALITY') return t('category_quality');
        if (cat === 'PROCESS_ISSUE' || cat === 'PROCESS') return t('category_process');
        return t('category_other');
    };

    if (loading) {
        return <div className="text-sm text-gray-500 text-center py-4">Loading...</div>;
    }

    if (comments.length === 0) {
        return (
            <div className="text-sm text-gray-400 text-center py-8">
                No messages
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {comments.map((comment) => (
                <div
                    key={comment.id}
                    className="p-3 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow"
                >
                    <div className="flex items-start gap-2 mb-2">
                        {getCategoryIcon(comment.category)}
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-sm text-gray-900">
                                    {comment.user?.username || 'Unknown'}
                                </span>
                                <span className="text-xs text-gray-500">
                                    {comment.user?.role === 'admin' ? 'Admin' :
                                        comment.user?.role === 'supervisor' ? 'Supervisor' : 'Worker'}
                                </span>
                                <span className="text-xs px-2 py-0.5 bg-gray-100 rounded">
                                    {getCategoryLabel(comment.category)}
                                </span>
                                {comment.mentionedUsers && comment.mentionedUsers.length > 0 && (
                                    <>
                                        <span className="text-[8px] text-slate-400">→</span>
                                        {comment.mentionedUsers.map((user: any) => ( // eslint-disable-line @typescript-eslint/no-explicit-any
                                            <span
                                                key={user.id}
                                                className="text-[8px] px-1 py-0.5 bg-indigo-50 text-indigo-600 rounded font-medium"
                                            >
                                                @{user.username}
                                            </span>
                                        ))}
                                    </>
                                )}
                            </div>

                            <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                {comment.content || comment.note || '(No Content)'}
                            </p>

                            {comment.triggeredStatus && (
                                <div className="mt-2 text-xs">
                                    <span className={`px-2 py-1 rounded ${comment.triggeredStatus === 'HOLD' ? 'bg-orange-100 text-orange-700' :
                                        comment.triggeredStatus === 'QN' ? 'bg-yellow-100 text-yellow-700' :
                                            'bg-gray-100 text-gray-700'
                                        }`}>
                                        Status updated to: {comment.triggeredStatus}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="text-xs text-gray-400">
                        {new Date(comment.createdAt).toLocaleString()}
                    </div>
                </div>
            ))}
        </div>
    );
}
