'use client';
import { useState } from 'react';
import { StepCommentIndicator } from '@/components/StepCommentIndicator';
import { StructuredCommentDialog } from '@/components/StructuredCommentDialog';
import { CommentList } from '@/components/CommentList';
import { MessageNotification } from '@/components/MessageNotification';

export default function CommentTestPage() {
    const [showDialog, setShowDialog] = useState(false);
    const [selectedStep, setSelectedStep] = useState('');
    const [testOrderId, setTestOrderId] = useState('');
    const [refreshKey, setRefreshKey] = useState(0);

    // This is a test page - in production, orderId would come from actual data
    const testSteps = ['领料', '焊接', '组装', '测试', '包装'];

    const handleSubmitComment = async (data: any) => {
        try {
            const res = await fetch('/api/comments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (!res.ok) {
                throw new Error('Failed to create comment');
            }

            // Refresh the page
            setRefreshKey(prev => prev + 1);
            alert('评论提交成功！');
        } catch (error) {
            console.error('Submit error:', error);
            throw error;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            {/* Header with notification */}
            <div className="bg-slate-800 text-white p-4 rounded-lg mb-8 flex justify-between items-center">
                <h1 className="text-2xl font-bold">评论功能测试页面</h1>
                <MessageNotification key={refreshKey} />
            </div>

            <div className="max-w-4xl mx-auto space-y-8">
                {/* Test Controls */}
                <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-lg font-bold mb-4">测试控制</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">
                                工单ID（用于测试，实际使用时从数据库获取）
                            </label>
                            <input
                                type="text"
                                value={testOrderId}
                                onChange={(e) => setTestOrderId(e.target.value)}
                                placeholder="输入一个工单ID，如：test-order-1"
                                className="w-full p-2 border rounded"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                提示：先到 Dashboard 创建一个工单，然后在这里输入工单ID
                            </p>
                        </div>
                    </div>
                </div>

                {testOrderId && (
                    <>
                        {/* Step Indicators */}
                        <div className="bg-white p-6 rounded-lg shadow">
                            <h2 className="text-lg font-bold mb-4">工步消息指示器</h2>
                            <div className="space-y-2">
                                {testSteps.map(step => (
                                    <div key={step} className="flex items-center justify-between p-3 border rounded">
                                        <span className="font-medium">{step}</span>
                                        <div className="flex items-center gap-2">
                                            <StepCommentIndicator
                                                key={`${testOrderId}-${step}-${refreshKey}`}
                                                orderId={testOrderId}
                                                stepName={step}
                                                onClick={() => {
                                                    setSelectedStep(step);
                                                }}
                                            />
                                            <button
                                                onClick={() => {
                                                    setSelectedStep(step);
                                                    setShowDialog(true);
                                                }}
                                                className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                                            >
                                                添加评论
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Comment List for Selected Step */}
                        {selectedStep && (
                            <div className="bg-white p-6 rounded-lg shadow">
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-lg font-bold">
                                        {selectedStep} - 评论列表
                                    </h2>
                                    <button
                                        onClick={() => setSelectedStep('')}
                                        className="text-sm text-gray-500 hover:text-gray-700"
                                    >
                                        关闭
                                    </button>
                                </div>
                                <CommentList
                                    key={`${testOrderId}-${selectedStep}-${refreshKey}`}
                                    orderId={testOrderId}
                                    stepName={selectedStep}
                                />
                            </div>
                        )}
                    </>
                )}

                {/* Instructions */}
                <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                    <h3 className="font-bold text-blue-900 mb-2">使用说明</h3>
                    <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
                        <li>先在 Dashboard 创建一个测试工单</li>
                        <li>将工单ID复制到上面的输入框</li>
                        <li>点击"添加评论"按钮测试结构化消息创建</li>
                        <li>查看工步旁边的气泡图标（显示消息数量和未读状态）</li>
                        <li>点击右上角的消息铃铛查看个人收件箱</li>
                    </ol>
                </div>
            </div>

            {/* Comment Dialog */}
            {showDialog && (
                <StructuredCommentDialog
                    orderId={testOrderId}
                    stepName={selectedStep}
                    onClose={() => setShowDialog(false)}
                    onSubmit={handleSubmitComment}
                />
            )}
        </div>
    );
}
