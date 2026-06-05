"use client";

import React from 'react';
import { CreditCard, CheckCircle2, Zap, ArrowRight, ExternalLink, Shield, Crown } from 'lucide-react';
import { useUser } from '@/lib/UserContext';

const SCOUT_PRO_URL = process.env.NEXT_PUBLIC_SCOUT_PRO_PAYMENT_URL
    || `https://admin.bluejax.ai/v2/location/GC3Q5eqwDKw2MhZQ0KSj/payments/checkout`;

export default function BillingPage() {
    const { user, isSuperAdmin } = useUser();

    // Super admins always have full access — no billing needed
    if (isSuperAdmin) {
        return (
            <div className="space-y-8">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                        <CreditCard className="w-8 h-8 text-indigo-400" />
                        Billing
                    </h1>
                    <p className="text-neutral-400 font-medium mt-2">Manage your subscription and payment method</p>
                </div>

                <div className="bg-[#070707]/90 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden">
                    <div className="px-6 py-5 border-b border-white/5">
                        <h3 className="font-bold text-white text-lg">Current Plan</h3>
                    </div>
                    <div className="p-6">
                        <div className="flex items-center gap-4 p-6 rounded-xl bg-gradient-to-r from-cyan-500/10 to-indigo-500/10 border border-cyan-500/20">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                                <Shield className="w-7 h-7 text-white" />
                            </div>
                            <div className="flex-1">
                                <p className="text-xl font-black text-white flex items-center gap-2">
                                    Super Admin
                                    <Crown className="w-5 h-5 text-amber-400" />
                                </p>
                                <p className="text-sm text-neutral-400 font-medium mt-0.5">Full platform access • No billing required</p>
                            </div>
                        </div>
                        <div className="mt-6 p-5 rounded-xl bg-white/[0.02] border border-white/5">
                            <p className="text-sm font-bold text-white mb-3">Super Admin Privileges</p>
                            <ul className="space-y-2.5">
                                {[
                                    'Unlimited access to all sectors & data',
                                    'Full Lead Feed with emails, phones & contacts',
                                    'User Management — invite, remove & assign sectors',
                                    'Scraper Registry & system configuration',
                                    'CSV exports with no limits',
                                    'No subscription required',
                                ].map((feature) => (
                                    <li key={feature} className="flex items-center gap-3 text-sm text-neutral-300 font-medium">
                                        <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" /> {feature}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Regular users — check subscription
    const isPro = user?.subscription_status === 'active';

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                    <CreditCard className="w-8 h-8 text-indigo-400" />
                    Billing
                </h1>
                <p className="text-neutral-400 font-medium mt-2">Manage your subscription and payment method</p>
            </div>

            {/* Current Plan */}
            <div className="bg-[#070707]/90 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden">
                <div className="px-6 py-5 border-b border-white/5">
                    <h3 className="font-bold text-white text-lg">Current Plan</h3>
                </div>
                <div className="p-6">
                    {isPro ? (
                        <div className="flex items-center gap-4 p-6 rounded-xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                                <Zap className="w-7 h-7 text-white" />
                            </div>
                            <div className="flex-1">
                                <p className="text-xl font-black text-white">Scout Pro</p>
                                <p className="text-sm text-neutral-400 font-medium mt-0.5">$150/month • Active</p>
                            </div>
                            <button className="px-5 py-2.5 bg-white/10 border border-white/10 text-white text-sm font-bold rounded-xl hover:bg-white/20 transition-all flex items-center gap-2">
                                Manage <ExternalLink className="w-4 h-4" />
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex items-center gap-4 p-6 rounded-xl bg-white/[0.02] border border-white/10">
                                <div className="w-14 h-14 rounded-2xl bg-neutral-800 flex items-center justify-center border border-white/10">
                                    <Zap className="w-7 h-7 text-neutral-500" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-xl font-black text-white">Free Tier</p>
                                    <p className="text-sm text-neutral-500 font-medium mt-0.5">Limited access • Emails & companies hidden</p>
                                </div>
                            </div>

                            {/* Upgrade Card */}
                            <div className="relative group">
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity" />
                                <div className="relative bg-[#0a0a0a] border border-white/10 rounded-2xl p-8">
                                    <div className="flex items-baseline gap-2 mb-4">
                                        <span className="text-5xl font-black text-white">$150</span>
                                        <span className="text-lg text-neutral-500 font-bold">/month</span>
                                    </div>
                                    <ul className="space-y-3 mb-8">
                                        {['Unlimited Lead Access', 'Verified Email Addresses', 'Full Company Profiles', 'GoHighLevel CRM Integration', 'Cancel Anytime'].map((feature) => (
                                            <li key={feature} className="flex items-center gap-3 text-sm text-neutral-200 font-medium">
                                                <CheckCircle2 className="w-5 h-5 text-indigo-400 shrink-0" /> {feature}
                                            </li>
                                        ))}
                                    </ul>
                                    <a href={SCOUT_PRO_URL} target="_blank" rel="noopener noreferrer" className="w-full relative group/btn overflow-hidden py-4 bg-white text-black font-black rounded-xl transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 no-underline">
                                        <span className="relative z-10 flex items-center gap-2">Upgrade to Pro <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" /></span>
                                        <div className="absolute inset-0 bg-neutral-200 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300" />
                                    </a>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
