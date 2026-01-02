'use client';
import { useEffect, useState } from 'react';
import { MessageCircle, Package, Wrench, AlertTriangle } from 'lucide-react';

interface Props {
    orderId: string;
    stepName: string;
}

export function CommentList({ orderId, stepName }: Props) {
    const [comments, setComments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchComments();
    }, [orderId, stepName]);

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

    if (loading) {
        return <div className="text-sm text-gray-500 text-center py-4">加载中...</div>;
    }

    if (comments.length === 0) {
        return (
            <div className="text-sm text-gray-400 text-center py-8">
                暂无消息
            </div>
        );
    }

    const getCategoryIcon = (category: string) => {
        switch (category) {
            case 'MATERIAL_SHORTAGE':
                return <Package size={16} className="text-orange-600" />;
            case 'EQUIPMENT_FAILURE':
                return <Wrench size={16} className="text-red-600" />;
            case 'QUALITY_ISSUE':
                return <AlertTriangle size={16} className="text-yellow-600" />;
            default:
                return <MessageCircle size={16} className="text-blue-600" />;
        }
    };

    const getCategoryLabel = (category: string) => {
        switch (category) {
            case 'MATERIAL_SHORTAGE': return '缺料';
            case 'EQUIPMENT_FAILURE': return '设备故障';
            case 'QUALITY_ISSUE': return '质量异常';
            default: return '一般';
        }
    };

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
                                    {comment.user.username}
                                </span>
                                <span className="text-xs text-gray-500">
                                    {comment.user.role === 'admin' ? '管理员' :
                                        comment.user.role === 'supervisor' ? '主管' : '工人'}
                                </span>
                                <span className="text-xs px-2 py-0.5 bg-gray-100 rounded">
                                    {getCategoryLabel(comment.category)}
                                </span>
                            </div>

                            <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                {comment.content || comment.note || '(无内容)'}
                            </p>

                            {comment.triggeredStatus && (
                                <div className="mt-2 text-xs">
                                    <span className={`px-2 py-1 rounded ${comment.triggeredStatus === 'HOLD' ? 'bg-orange-100 text-orange-700' :
                                        comment.triggeredStatus === 'QN' ? 'bg-yellow-100 text-yellow-700' :
                                            'bg-gray-100 text-gray-700'
                                        }`}>
                                        状态已更新为: {comment.triggeredStatus}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="text-xs text-gray-400">
                        {new Date(comment.createdAt).toLocaleString('zh-CN')}
                    </div>
                </div>
            ))}
        </div>
    );
}
