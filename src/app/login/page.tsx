'use client';

import { useState } from 'react';
import { Lock, LogIn, Loader2, Eye, EyeOff, CreditCard } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const [employeeId, setEmployeeId] = useState('');
    const [password, setPassword] = useState('');
    const [visible, setVisible] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const [successMsg, setSuccessMsg] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMsg('');
        setLoading(true);

        try {
            const res = await fetch('/api/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ employeeId, password })
            });

            const data = await res.json();

            if (data.success) {
                setSuccessMsg('Login successful! Redirecting...');
                // Delay to let user see the outcome
                setTimeout(() => {
                    window.location.href = '/dashboard';
                }, 1000);
            } else {
                setError(data.error || 'Invalid credentials');
                setLoading(false);
            }
        } catch {
            setError('Login failed. Please try again.');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8">
                    <div className="flex flex-col items-center mb-8">
                        <div className="bg-indigo-500/20 p-4 rounded-2xl mb-4">
                            <Lock className="w-10 h-10 text-indigo-400" />
                        </div>
                        <h1 className="text-3xl font-bold text-white">ProTracker <span className="text-indigo-400 text-lg">V6.3.0</span></h1>
                        <p className="text-slate-400 mt-2">Sign in to your account</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="relative">
                            <input
                                id="employeeId"
                                name="employeeId"
                                type="text"
                                value={employeeId}
                                onChange={(e) => setEmployeeId(e.target.value)}
                                className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white pl-12 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder-slate-500"
                                placeholder="Employee ID"
                                autoFocus
                            />
                            <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                        </div>

                        <div className="relative">
                            <input
                                id="password"
                                name="password"
                                type={visible ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white pl-12 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all pr-12 placeholder-slate-500"
                                placeholder="Password"
                            />
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                            <button
                                type="button"
                                onClick={() => setVisible(!visible)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                            >
                                {visible ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>

                        {error && (
                            <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300 text-sm text-center">
                                {error}
                            </div>
                        )}

                        {successMsg && (
                            <div className="p-3 bg-green-500/20 border border-green-500/30 rounded-xl text-green-300 text-sm text-center">
                                {successMsg}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading || !employeeId || !password}
                            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all mt-4"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    <LogIn className="w-5 h-5" />
                                    Login
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <a href="/register" className="text-slate-400 hover:text-white transition-colors text-sm">
                            Don't have an account? Create one
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
