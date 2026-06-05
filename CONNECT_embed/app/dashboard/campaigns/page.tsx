"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    Send, Plus, Mail, MessageSquare, Clock, CheckCircle2,
    Pause, BarChart3, Users, Zap, ChevronRight, Trash2
} from 'lucide-react';

interface Campaign {
    id: string;
    name: string;
    channel: string;
    status: string;
    subject: string;
    recipient_count: number;
    sent_count: number;
    opened_count: number;
    clicked_count: number;
    failed_count: number;
    created_at: string;
    completed_at: string;
    sector_filter: string[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
    draft: { label: 'Draft', color: 'text-neutral-400', bg: 'bg-neutral-500/10', icon: Clock },
    scheduled: { label: 'Scheduled', color: 'text-blue-400', bg: 'bg-blue-500/10', icon: Clock },
    sending: { label: 'Sending', color: 'text-amber-400', bg: 'bg-amber-500/10', icon: Zap },
    sent: { label: 'Sent', color: 'text-emerald-400', bg: 'bg-emerald-500/10', icon: CheckCircle2 },
    paused: { label: 'Paused', color: 'text-orange-400', bg: 'bg-orange-500/10', icon: Pause },
};

export default function CampaignsPage() {
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/campaigns')
            .then(r => r.json())
            .then(d => { setCampaigns(d); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    const deleteCampaign = async (id: string) => {
        if (!confirm('Delete this campaign?')) return;
        await fetch(`/api/campaigns/${id}`, { method: 'DELETE' });
        setCampaigns(prev => prev.filter(c => c.id !== id));
    };

    const totalSent = campaigns.reduce((s, c) => s + (c.sent_count || 0), 0);
    const totalOpened = campaigns.reduce((s, c) => s + (c.opened_count || 0), 0);
    const drafts = campaigns.filter(c => c.status === 'draft').length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                        <Send className="w-8 h-8 text-indigo-400" />
                        Campaigns
                    </h1>
                    <p className="text-neutral-400 font-medium mt-2">
                        Create and manage outreach campaigns across all sectors
                    </p>
                </div>
                <Link
                    href="/dashboard/campaigns/new"
                    className="flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                    <Plus className="w-4 h-4" />
                    New Campaign
                </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'TOTAL CAMPAIGNS', value: campaigns.length, icon: Send, color: 'indigo' },
                    { label: 'MESSAGES SENT', value: totalSent, icon: Mail, color: 'emerald' },
                    { label: 'OPENED', value: totalOpened, icon: BarChart3, color: 'cyan' },
                    { label: 'DRAFTS', value: drafts, icon: Clock, color: 'amber' },
                ].map(s => (
                    <div key={s.label} className="bg-[#070707]/90 backdrop-blur-xl border border-white/5 rounded-2xl p-5">
                        <div className={`w-10 h-10 rounded-xl bg-${s.color}-500/10 border border-${s.color}-500/20 flex items-center justify-center mb-3`}>
                            <s.icon className={`w-5 h-5 text-${s.color}-400`} />
                        </div>
                        <p className="text-2xl font-black text-white">{s.value.toLocaleString()}</p>
                        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-500 mt-1">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* Campaign List */}
            <div className="space-y-3">
                {loading ? (
                    Array(4).fill(0).map((_, i) => (
                        <div key={i} className="bg-[#070707]/90 border border-white/5 rounded-2xl p-6 animate-pulse">
                            <div className="h-5 bg-white/5 rounded w-64 mb-3" />
                            <div className="h-4 bg-white/5 rounded w-40" />
                        </div>
                    ))
                ) : campaigns.length === 0 ? (
                    <div className="bg-[#070707]/90 border border-white/5 rounded-2xl p-16 text-center">
                        <Send className="w-12 h-12 text-neutral-700 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-white mb-2">No campaigns yet</h3>
                        <p className="text-neutral-500 text-sm mb-6">Create your first outreach campaign to start connecting with contacts</p>
                        <Link
                            href="/dashboard/campaigns/new"
                            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-all"
                        >
                            <Plus className="w-4 h-4" />
                            Create Campaign
                        </Link>
                    </div>
                ) : (
                    campaigns.map(campaign => {
                        const statusConfig = STATUS_CONFIG[campaign.status] || STATUS_CONFIG.draft;
                        const StatusIcon = statusConfig.icon;
                        return (
                            <Link
                                key={campaign.id}
                                href={`/dashboard/campaigns/${campaign.id}`}
                                className="block bg-[#070707]/90 border border-white/5 rounded-2xl p-6 hover:border-indigo-500/20 hover:bg-white/[0.02] transition-all group"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors truncate">
                                                {campaign.name}
                                            </h3>
                                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${statusConfig.bg} border border-white/5 ${statusConfig.color} flex items-center gap-1 shrink-0`}>
                                                <StatusIcon className="w-3 h-3" />
                                                {statusConfig.label}
                                            </span>
                                            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-white/5 border border-white/5 text-neutral-400 shrink-0">
                                                {campaign.channel === 'both' ? '📧 + 📱' : campaign.channel === 'email' ? '📧 Email' : '📱 SMS'}
                                            </span>
                                        </div>
                                        {campaign.subject && (
                                            <p className="text-sm text-neutral-500 truncate">{campaign.subject}</p>
                                        )}
                                        <div className="flex items-center gap-4 mt-3">
                                            <span className="text-xs text-neutral-500 flex items-center gap-1">
                                                <Users className="w-3 h-3" /> {campaign.recipient_count || 0} recipients
                                            </span>
                                            {campaign.sent_count > 0 && (
                                                <span className="text-xs text-emerald-500 flex items-center gap-1">
                                                    <CheckCircle2 className="w-3 h-3" /> {campaign.sent_count} sent
                                                </span>
                                            )}
                                            {campaign.sector_filter?.length > 0 && (
                                                <span className="text-xs text-neutral-600">
                                                    Sectors: {campaign.sector_filter.join(', ')}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 ml-4">
                                        {campaign.status === 'draft' && (
                                            <button
                                                onClick={(e) => { e.preventDefault(); deleteCampaign(campaign.id); }}
                                                className="p-2 rounded-lg hover:bg-red-500/10 text-neutral-600 hover:text-red-400 transition-all"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                        <ChevronRight className="w-5 h-5 text-neutral-600 group-hover:text-indigo-400 transition-colors" />
                                    </div>
                                </div>
                            </Link>
                        );
                    })
                )}
            </div>
        </div>
    );
}
