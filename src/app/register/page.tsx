'use client';

import { useState } from 'react';
import { Lock, User, Loader2, UserPlus, ArrowLeft, Eye, EyeOff, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passVisible, setPassVisible] = useState(false);

    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);

        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await res.json();

            if (data.success) {
                setSuccess(true);
            } else {
                setError(data.error || 'Registration failed');
            }
        } catch {
            setError('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
                <div className="w-full max-w-md bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8 text-center animate-in fade-in zoom-in duration-300">
                    <div className="inline-flex bg-green-500/20 p-4 rounded-full mb-6">
                        <CheckCircle className="w-12 h-12 text-green-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Registration Successful</h2>
                    <p className="text-slate-300 mb-8">
                        Your account has been created and is pending approval. Please contact your administrator.
                    </p>
                    <Link
                        href="/login"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Login
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8">
                    <div className="flex flex-col items-center mb-8">
                        <div className="bg-purple-500/20 p-4 rounded-2xl mb-4">
                            <UserPlus className="w-10 h-10 text-purple-400" />
                        </div>
                        <h1 className="text-3xl font-bold text-white">Create Account</h1>
                        <p className="text-slate-400 mt-2">Join the Production Tracker</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="relative">
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white pl-12 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all placeholder-slate-500"
                                placeholder="Username"
                                required
                            />
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                        </div>

                        <div className="relative">
                            <input
                                type={passVisible ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white pl-12 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all pr-12 placeholder-slate-500"
                                placeholder="Password"
                                required
                            />
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                            <button
                                type="button"
                                onClick={() => setPassVisible(!passVisible)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                            >
                                {passVisible ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>

                        <div className="relative">
                            <input
                                type={passVisible ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white pl-12 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all pr-12 placeholder-slate-500"
                                placeholder="Confirm Password"
                                required
                            />
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                        </div>

                        {error && (
                            <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300 text-sm text-center">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-600/50 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all mt-6"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    <UserPlus className="w-5 h-5" />
                                    Sign Up
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <Link href="/login" className="text-slate-400 hover:text-white transition-colors text-sm">
                            Already have an account? Sign in
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
