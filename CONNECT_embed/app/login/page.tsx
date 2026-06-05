"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Database, Mail, Lock, ArrowRight, Loader2, Eye, EyeOff, Sparkles } from 'lucide-react';

export default function LoginPage() {
    const router = useRouter();
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const endpoint = isSignUp ? '/api/auth/signup' : '/api/auth/login';
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Authentication failed');
            }

            if (isSignUp) {

                setSuccess('Check your email to confirm your account!');
            } else {
                // Cookies are already set server-side by the API route
                router.refresh();
                router.push('/dashboard');
            }
        } catch (err: any) {
            console.error('Auth error:', err);
            setError(err.message || 'Authentication failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#030303] text-neutral-200 font-sans flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background Glows */}
            <div className="fixed top-[10%] left-[20%] w-[40%] h-[40%] bg-indigo-600/8 rounded-full blur-[150px] pointer-events-none" />
            <div className="fixed bottom-[10%] right-[10%] w-[30%] h-[50%] bg-purple-600/8 rounded-full blur-[150px] pointer-events-none" />

            <div className="w-full max-w-md relative z-10">
                {/* Brand */}
                <div className="text-center mb-10">
                    <Link href="/" className="inline-flex items-center gap-3 group mb-6">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 group-hover:shadow-indigo-500/50 transition-shadow">
                            <Database className="w-6 h-6 text-white" />
                        </div>
                        <span className="font-extrabold text-3xl text-white tracking-tight">Scout<span className="text-indigo-500">.</span></span>
                    </Link>
                    <p className="text-neutral-400 font-medium text-lg">
                        {isSignUp ? 'Create your account' : 'Welcome back'}
                    </p>
                </div>

                {/* Auth Card */}
                <div className="relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                    <div className="relative bg-[#070707]/95 backdrop-blur-3xl border border-white/10 rounded-2xl p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                        <form onSubmit={handleAuth} className="space-y-5">
                            {/* Email */}
                            <div>
                                <label className="block text-sm font-bold text-neutral-400 mb-2">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        placeholder="you@company.com"
                                        className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-neutral-500 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
                                    />
                                </div>
                            </div>

                            {/* Password */}
                            <div>
                                <label className="block text-sm font-bold text-neutral-400 mb-2">Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        minLength={6}
                                        placeholder="••••••••"
                                        className="w-full pl-12 pr-12 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-neutral-500 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
                                    />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors">
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            {/* Error / Success Messages */}
                            {error && (
                                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm font-medium">
                                    {error}
                                </div>
                            )}
                            {success && (
                                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm font-medium">
                                    {success}
                                </div>
                            )}

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full relative group/btn overflow-hidden py-4 bg-white text-black font-black rounded-xl transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                            >
                                <span className="relative z-10 flex items-center gap-2">
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                                    {isSignUp ? 'Create Account' : 'Sign In'}
                                    {!loading && <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />}
                                </span>
                                <div className="absolute inset-0 bg-neutral-200 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300" />
                            </button>
                        </form>

                        {/* Divider */}
                        <div className="flex items-center gap-4 my-6">
                            <div className="flex-1 h-px bg-white/10" />
                            <span className="text-xs text-neutral-500 font-bold uppercase tracking-widest">or</span>
                            <div className="flex-1 h-px bg-white/10" />
                        </div>

                        {/* Toggle Sign Up / Sign In */}
                        <button
                            onClick={() => { setIsSignUp(!isSignUp); setError(''); setSuccess(''); }}
                            className="w-full py-3.5 bg-white/5 border border-white/10 text-neutral-300 font-bold rounded-xl hover:bg-white/10 transition-all text-sm"
                        >
                            {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-xs text-neutral-600 font-medium mt-8 flex items-center justify-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> Powered by Supabase Auth & Stripe
                </p>
            </div>
        </div>
    );
}
