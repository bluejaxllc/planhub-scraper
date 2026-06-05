"use client";

import React, { useState, useEffect } from 'react';
import { useUser } from '@/lib/UserContext';
import { supabase } from '@/lib/supabase';
import { Settings as SettingsIcon, User, Bell, Shield, Globe, Check, Loader2 } from 'lucide-react';

export default function SettingsPage() {
    const { user, refresh } = useUser();
    const [displayName, setDisplayName] = useState('');
    const [email, setEmail] = useState('');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [notifications, setNotifications] = useState({
        leads_digest: true,
        engine_errors: true,
        billing_updates: false,
    });

    useEffect(() => {
        if (user) {
            setDisplayName(user.display_name || '');
            setEmail(user.email || '');
        }
    }, [user]);

    const handleSaveProfile = async () => {
        if (!user) return;
        setSaving(true);
        setSaved(false);
        try {
            await supabase
                .from('users')
                .update({ display_name: displayName })
                .eq('id', user.id);
            await refresh();
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (err) {
            console.error('Save failed:', err);
        } finally {
            setSaving(false);
        }
    };

    const toggleNotification = (key: keyof typeof notifications) => {
        setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
        // TODO: Persist notification preferences to Supabase
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                    <SettingsIcon className="w-8 h-8 text-indigo-400" />
                    Settings
                </h1>
                <p className="text-neutral-400 font-medium mt-2">Configure your account and preferences</p>
            </div>

            {/* Settings Sections */}
            <div className="space-y-6">
                {/* Profile */}
                <div className="bg-[#070707]/90 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden">
                    <div className="px-6 py-5 border-b border-white/5 flex items-center gap-3">
                        <User className="w-5 h-5 text-indigo-400" />
                        <h3 className="font-bold text-white text-lg">Profile</h3>
                    </div>
                    <div className="p-6 space-y-5">
                        <div>
                            <label className="block text-sm font-bold text-neutral-400 mb-2">Display Name</label>
                            <input
                                type="text"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                placeholder="Your name"
                                className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-neutral-500 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-neutral-400 mb-2">Email</label>
                            <input
                                type="email"
                                value={email}
                                disabled
                                className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-neutral-500 font-medium text-sm cursor-not-allowed"
                            />
                            <p className="text-[11px] text-neutral-600 mt-1.5">Email cannot be changed. Contact support for assistance.</p>
                        </div>
                        <button
                            onClick={handleSaveProfile}
                            disabled={saving}
                            className="px-6 py-3 bg-indigo-500/20 text-indigo-300 text-sm font-bold rounded-xl border border-indigo-500/20 hover:bg-indigo-500/30 transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4 text-emerald-400" /> : null}
                            {saved ? 'Saved!' : 'Save Changes'}
                        </button>
                    </div>
                </div>

                {/* Notifications */}
                <div className="bg-[#070707]/90 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden">
                    <div className="px-6 py-5 border-b border-white/5 flex items-center gap-3">
                        <Bell className="w-5 h-5 text-purple-400" />
                        <h3 className="font-bold text-white text-lg">Notifications</h3>
                    </div>
                    <div className="p-6 space-y-5">
                        {[
                            { key: 'leads_digest' as const, label: 'New leads digest', desc: 'Get a daily summary of freshly scraped leads' },
                            { key: 'engine_errors' as const, label: 'Engine errors', desc: 'Alert when the scraping engine encounters failures' },
                            { key: 'billing_updates' as const, label: 'Billing updates', desc: 'Subscription renewals and payment notifications' },
                        ].map((item) => (
                            <div key={item.key} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5">
                                <div>
                                    <p className="font-bold text-white text-sm">{item.label}</p>
                                    <p className="text-xs text-neutral-500 mt-0.5">{item.desc}</p>
                                </div>
                                <button
                                    onClick={() => toggleNotification(item.key)}
                                    className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${notifications[item.key] ? 'bg-indigo-500' : 'bg-neutral-700'}`}
                                >
                                    <div className={`absolute top-[2px] left-[2px] w-5 h-5 bg-white rounded-full transition-transform duration-200 ${notifications[item.key] ? 'translate-x-5' : ''}`} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Integrations */}
                <div className="bg-[#070707]/90 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden">
                    <div className="px-6 py-5 border-b border-white/5 flex items-center gap-3">
                        <Globe className="w-5 h-5 text-emerald-400" />
                        <h3 className="font-bold text-white text-lg">Integrations</h3>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                    <Shield className="w-5 h-5 text-emerald-400" />
                                </div>
                                <div>
                                    <p className="font-bold text-white text-sm">GoHighLevel (BlueJax)</p>
                                    <p className="text-xs text-neutral-500 mt-0.5">Sync new subscribers to your CRM automatically</p>
                                </div>
                            </div>
                            <button className="px-4 py-2 bg-emerald-500/20 text-emerald-300 text-xs font-bold rounded-lg border border-emerald-500/20 hover:bg-emerald-500/30 transition-all">
                                Configure
                            </button>
                        </div>
                    </div>
                </div>

                {/* Danger Zone */}
                <div className="bg-[#070707]/90 backdrop-blur-xl border border-red-500/10 rounded-2xl overflow-hidden">
                    <div className="px-6 py-5 border-b border-red-500/10 flex items-center gap-3">
                        <Shield className="w-5 h-5 text-red-400" />
                        <h3 className="font-bold text-red-400 text-lg">Danger Zone</h3>
                    </div>
                    <div className="p-6">
                        <div className="flex items-center justify-between p-4 rounded-xl bg-red-500/5 border border-red-500/10">
                            <div>
                                <p className="font-bold text-white text-sm">Delete Account</p>
                                <p className="text-xs text-neutral-500 mt-0.5">Permanently delete your account and all associated data</p>
                            </div>
                            <button className="px-4 py-2 bg-red-500/20 text-red-300 text-xs font-bold rounded-lg border border-red-500/20 hover:bg-red-500/30 transition-all">
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
