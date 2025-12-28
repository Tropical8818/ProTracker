'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, Loader2, Sparkles, AlertTriangle, Megaphone, CheckCircle2 } from 'lucide-react';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    isAnalysis?: boolean;
    data?: any;
}

interface AIChatPanelProps {
    productId?: string;
    role?: string;
    onNavigate?: (woId: string) => void;
}

export default function AIChatPanel({ productId, role = 'user', onNavigate }: AIChatPanelProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Welcome message
    useEffect(() => {
        if (isOpen && messages.length === 0) {
            setMessages([{
                role: 'assistant',
                content: '👋 Hello! I\'m the ProTracker AI Assistant.\n\nI can help you:\n• Check order status\n• Analyze production data\n• Identify potential issues\n\nTry the Advisor Tools below for deep analysis.',
                timestamp: new Date()
            }]);
        }
    }, [isOpen, messages.length]);

    const sendMessage = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: Message = {
            role: 'user',
            content: input.trim(),
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: input.trim(),
                    productId,
                    conversationHistory: messages.map(m => ({
                        role: m.role,
                        content: m.content
                    }))
                })
            });

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }

            let responseText = data.response;

            // Check for navigation command
            if (responseText && onNavigate) {
                const navMatch = responseText.match(/\[NAVIGATE:(.*?)\]/);
                if (navMatch) {
                    const woId = navMatch[1];
                    onNavigate(woId);
                    // Remove tag from display
                    responseText = responseText.replace(/\[NAVIGATE:.*?\]/, '').trim();
                }
            }

            const assistantMessage: Message = {
                role: 'assistant',
                content: responseText || 'Sorry, I could not process this request.',
                timestamp: new Date()
            };

            setMessages(prev => [...prev, assistantMessage]);
        } catch (error) {
            console.error('Chat error:', error);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: '❌ Sorry, an error occurred. Please check your API configuration or try again later.',
                timestamp: new Date()
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const runTool = async (mode: 'analysis' | 'report') => {
        if (isLoading) return;
        setIsLoading(true);

        // Add a system-like message indicating tool usage
        setMessages(prev => [...prev, {
            role: 'user',
            content: mode === 'analysis' ? '🔍 Running Risk Analysis...' : '📋 Generating Morning Report...',
            timestamp: new Date()
        }]);

        try {
            const res = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productId,
                    mode: mode
                })
            });
            const data = await res.json();

            if (res.ok) {
                let content = data.response;
                let isAnalysis = false;
                let parsedRx = null;

                if (mode === 'analysis' && typeof content === 'string') {
                    try {
                        const cleanJson = content.replace(/```json/g, '').replace(/```/g, '').trim();
                        parsedRx = JSON.parse(cleanJson);
                        isAnalysis = true;
                    } catch (e) {
                        // Fallback if not JSON
                    }
                }

                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: isAnalysis ? 'Here is the risk analysis:' : content,
                    timestamp: new Date(),
                    isAnalysis,
                    data: parsedRx
                }]);
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('Tool error:', error);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: '❌ Tool execution failed.',
                timestamp: new Date()
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    return (
        <>
            {/* Chat Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`fixed bottom-6 right-6 z-50 p-4 rounded-full shadow-lg transition-all transform hover:scale-110 ${isOpen
                    ? 'bg-slate-700 text-white'
                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
                    }`}
            >
                {isOpen ? (
                    <X className="w-6 h-6" />
                ) : (
                    <div className="relative">
                        <MessageCircle className="w-6 h-6" />
                        <Sparkles className="w-3 h-3 absolute -top-1 -right-1 text-yellow-300" />
                    </div>
                )}
            </button>

            {/* Chat Panel */}
            {isOpen && (
                <div className="fixed bottom-24 right-6 z-50 w-96 max-w-[calc(100vw-3rem)] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[70vh] overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-300">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-lg">
                            <Bot className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold">ProTracker AI</h3>
                            <p className="text-xs text-indigo-200">Smart Production Assistant</p>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                        {messages.map((msg, index) => (
                            <div
                                key={index}
                                className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                {msg.role === 'assistant' && (
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                                        <Bot className="w-4 h-4 text-white" />
                                    </div>
                                )}
                                <div
                                    className={`max-w-[85%] p-3 rounded-2xl ${msg.role === 'user'
                                        ? 'bg-indigo-600 text-white rounded-br-md'
                                        : 'bg-white text-slate-800 shadow-sm border border-slate-100 rounded-bl-md'
                                        }`}
                                >
                                    {msg.isAnalysis && msg.data?.risks ? (
                                        <div className="space-y-2">
                                            <p className="font-semibold text-xs text-slate-500 uppercase mb-2">Risk Analysis Report</p>
                                            {msg.data.risks.length === 0 ? (
                                                <p className="text-green-600 flex items-center gap-2 text-sm"><CheckCircle2 className="w-4 h-4" /> No high risks detected.</p>
                                            ) : (
                                                msg.data.risks.map((risk: any, i: number) => (
                                                    <div key={i} className="flex gap-2 text-xs p-2 bg-red-50 rounded border border-red-100">
                                                        <div className="mt-0.5"><AlertTriangle className="w-3 h-3 text-red-600" /></div>
                                                        <div>
                                                            <div className="font-bold text-red-900">{risk.woId}</div>
                                                            <div className="text-red-700">{risk.reason}</div>
                                                            <div className="mt-1 text-slate-600 bg-white px-1.5 py-0.5 rounded border border-red-100 inline-block">💡 {risk.strategy}</div>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    ) : (
                                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                    )}
                                </div>
                                {msg.role === 'user' && (
                                    <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center flex-shrink-0">
                                        <User className="w-4 h-4 text-white" />
                                    </div>
                                )}
                            </div>
                        ))}

                        {isLoading && (
                            <div className="flex gap-2 justify-start">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center">
                                    <Bot className="w-4 h-4 text-white" />
                                </div>
                                <div className="bg-white p-3 rounded-2xl rounded-bl-md shadow-sm border border-slate-100">
                                    <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Advisor Tools (Only for Admin/Supervisor) */}
                    {(role === 'admin' || role === 'supervisor') && (
                        <div className="px-4 py-3 bg-white border-t border-slate-100 grid grid-cols-2 gap-2">
                            <button
                                onClick={() => runTool('analysis')}
                                disabled={isLoading}
                                className="flex items-center justify-center gap-2 px-3 py-2 bg-orange-50 text-orange-700 rounded-lg text-xs font-medium hover:bg-orange-100 transition-colors border border-orange-100"
                            >
                                <AlertTriangle className="w-3.5 h-3.5" />
                                Analyze Risks
                            </button>
                            <button
                                onClick={() => runTool('report')}
                                disabled={isLoading}
                                className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors border border-blue-100"
                            >
                                <Megaphone className="w-3.5 h-3.5" />
                                Morning Report
                            </button>
                        </div>
                    )}

                    {/* Input */}
                    <div className="p-4 bg-white border-t border-slate-200">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Ask about production..."
                                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200 text-slate-800 text-sm"
                                disabled={isLoading}
                            />
                            <button
                                onClick={sendMessage}
                                disabled={!input.trim() || isLoading}
                                className="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <Send className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
