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
    const testSteps = ['Material', 'Welding', 'Assembly', 'Testing', 'Packing'];

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
            alert('Comment submitted successfully!');
        } catch (error) {
            console.error('Submit error:', error);
            throw error;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            {/* Header with notification */}
            <div className="bg-slate-800 text-white p-4 rounded-lg mb-8 flex justify-between items-center">
                <h1 className="text-2xl font-bold">Comment Feature Test Page</h1>
                <MessageNotification key={refreshKey} />
            </div>

            <div className="max-w-4xl mx-auto space-y-8">
                {/* Test Controls */}
                <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-lg font-bold mb-4">Test Controls</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">
                                Order ID (From system DB)
                            </label>
                            <input
                                type="text"
                                value={testOrderId}
                                onChange={(e) => setTestOrderId(e.target.value)}
                                placeholder="Enter an Order ID, e.g., test-order-1"
                                className="w-full p-2 border rounded"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Tip: Create an order in Dashboard first, then enter its ID here.
                            </p>
                        </div>
                    </div>
                </div>

                {testOrderId && (
                    <>
                        {/* Step Indicators */}
                        <div className="bg-white p-6 rounded-lg shadow">
                            <h2 className="text-lg font-bold mb-4">Step Message Indicators</h2>
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
                                                Add Comment
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
                                        {selectedStep} - Comment List
                                    </h2>
                                    <button
                                        onClick={() => setSelectedStep('')}
                                        className="text-sm text-gray-500 hover:text-gray-700"
                                    >
                                        Close
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
                    <h3 className="font-bold text-blue-900 mb-2">Instructions</h3>
                    <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
                        <li>Create a test order in Dashboard first.</li>
                        <li>Copy the Order ID to the input above.</li>
                        <li>Click "Add Comment" to test structured message creation.</li>
                        <li>Check the bubble icon next to the step (shows count/unread).</li>
                        <li>Click the bell icon in the top right to check personal inbox.</li>
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
