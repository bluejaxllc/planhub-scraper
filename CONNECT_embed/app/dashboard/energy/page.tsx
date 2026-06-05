"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
    UtilityPole, Building2, MapPin, Mail, Phone, Search,
    ChevronLeft, ChevronRight, X, Briefcase,
    RefreshCw, Activity, Clock, Download
} from 'lucide-react';

interface Profile {
    id: string;
    full_name: string;
    current_title: string;
    current_company: string;
    email: string;
    phone: string;
    location: string;
    sector: string;
    sub_sector: string;
    skills: string[];
    certifications: string[];
    sources: string[];
    created_at: string;
}

const SOURCE_CONFIG: Record<string, { label: string; color: string }> = {
    IndeedEnergyScraper: { label: 'Indeed', color: 'indigo' },
    indeed: { label: 'Indeed', color: 'indigo' },
    directory_seed: { label: 'Directory', color: 'neutral' },
};

const PAGE_SIZE = 25;

export default function EnergyPage() {
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [sourceFilter, setSourceFilter] = useState('all');
    const [page, setPage] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const [stats, setStats] = useState({ total: 0, withEmail: 0, withPhone: 0 });
    const [sourceCounts, setSourceCounts] = useState<Record<string, number>>({});
    const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
    const [lastRun, setLastRun] = useState<string | null>(null);

    const fetchStats = async () => {
        const [
            { count: total },
            { count: withEmail },
            { count: withPhone },
        ] = await Promise.all([
            supabase.from('energy_profiles').select('*', { count: 'exact', head: true }),
            supabase.from('energy_profiles').select('*', { count: 'exact', head: true }).not('email', 'is', null).neq('email', ''),
            supabase.from('energy_profiles').select('*', { count: 'exact', head: true }).not('phone', 'is', null).neq('phone', ''),
        ]);

        setStats({ total: total || 0, withEmail: withEmail || 0, withPhone: withPhone || 0 });

        // Count by source
        const { data: allRows } = await supabase.from('energy_profiles').select('sources');
        if (allRows) {
            const srcCounts: Record<string, number> = {};
            allRows.forEach((row: any) => {
                (row.sources || []).forEach((s: string) => { srcCounts[s] = (srcCounts[s] || 0) + 1; });
            });
            setSourceCounts(srcCounts);
        }

        const { data: runs } = await supabase.from('scraper_runs').select('completed_at')
            .eq('sector', 'energy').eq('status', 'completed')
            .order('completed_at', { ascending: false }).limit(1);
        if (runs?.[0]?.completed_at) setLastRun(new Date(runs[0].completed_at).toLocaleString());
    };

    const fetchProfiles = useCallback(async () => {
        setLoading(true);
        let query = supabase.from('energy_profiles').select('*', { count: 'exact' });
        if (search.trim()) {
            query = query.or(`current_company.ilike.%${search}%,current_title.ilike.%${search}%,location.ilike.%${search}%,full_name.ilike.%${search}%`);
        }
        if (sourceFilter !== 'all') query = query.contains('sources', [sourceFilter]);
        const { data, count } = await query.order('created_at', { ascending: false }).range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
        setProfiles(data || []);
        setTotalCount(count || 0);
        setLoading(false);
    }, [search, sourceFilter, page]);

    useEffect(() => { fetchStats(); }, []);
    useEffect(() => { fetchProfiles(); }, [fetchProfiles]);

    const totalPages = Math.ceil(totalCount / PAGE_SIZE);

    const downloadCSV = () => {
        if (!profiles.length) return;
        const headers = ['Name', 'Company', 'Title', 'Location', 'Email', 'Phone', 'Sources', 'Added'];
        const csvContent = [
            headers.join(','),
            ...profiles.map(p => [
                `"${(p.full_name || '').replace(/"/g, '""')}"`,
                `"${(p.current_company || '').replace(/"/g, '""')}"`,
                `"${(p.current_title || '').replace(/"/g, '""')}"`,
                `"${(p.location || '').replace(/"/g, '""')}"`,
                `"${(p.email || '').replace(/"/g, '""')}"`,
                `"${(p.phone || '').replace(/"/g, '""')}"`,
                `"${(p.sources || []).join(', ')}"`,
                `"${new Date(p.created_at).toLocaleDateString()}"`,
            ].join(','))
        ].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.setAttribute('href', URL.createObjectURL(blob));
        link.setAttribute('download', `energy_profiles_${sourceFilter}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const getSourceStyle = (source: string) => {
        const styles: Record<string, { bg: string; border: string; text: string }> = {
            IndeedEnergyScraper: { bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', text: 'text-indigo-400' },
            indeed: { bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', text: 'text-indigo-400' },
            directory_seed: { bg: 'bg-neutral-500/10', border: 'border-neutral-500/20', text: 'text-neutral-400' },
        };
        return styles[source] || { bg: 'bg-neutral-500/10', border: 'border-neutral-500/20', text: 'text-neutral-400' };
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                        <UtilityPole className="w-8 h-8 text-amber-500" />
                        Energy Intelligence
                    </h1>
                    <p className="text-neutral-400 font-medium mt-2">
                        {stats.total.toLocaleString()} energy & utility professional profiles
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {lastRun && (
                        <span className="text-xs text-neutral-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Last scrape: {lastRun}
                        </span>
                    )}
                    <button onClick={downloadCSV}
                        className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg bg-amber-500 text-black hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20">
                        <Download className="w-3.5 h-3.5" /> CSV
                    </button>
                    <button onClick={() => { fetchStats(); fetchProfiles(); }}
                        className="p-2 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white transition-all">
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                    { label: 'TOTAL PROFILES', value: stats.total, icon: Building2, color: 'amber' },
                    { label: 'WITH EMAIL', value: stats.withEmail, icon: Mail, color: 'indigo' },
                    { label: 'WITH PHONE', value: stats.withPhone, icon: Phone, color: 'emerald' },
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

            {/* Source filter pills */}
            {Object.keys(sourceCounts).length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    <span className="text-[10px] font-black text-neutral-500 uppercase tracking-wider shrink-0 mr-1">Source:</span>
                    <button onClick={() => { setSourceFilter('all'); setPage(0); }}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold tracking-wide transition-all whitespace-nowrap ${sourceFilter === 'all'
                            ? 'bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                            : 'bg-white/5 border border-white/10 text-neutral-400 hover:text-white hover:border-white/20'}`}
                    >ALL</button>
                    {Object.entries(SOURCE_CONFIG).map(([key, info]) => {
                        const count = sourceCounts[key] || 0;
                        if (count === 0) return null;
                        const style = getSourceStyle(key);
                        return (
                            <button key={key} onClick={() => { setSourceFilter(key); setPage(0); }}
                                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold tracking-wide transition-all whitespace-nowrap ${sourceFilter === key
                                    ? `${style.bg} border ${style.border} ${style.text}`
                                    : 'bg-white/5 border border-white/10 text-neutral-400 hover:text-white hover:border-white/20'}`}>
                                {info.label} <span className="text-neutral-500 ml-0.5">({count})</span>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Search */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                    <input type="text" placeholder="Search by company, title, name, or location..."
                        value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
                        className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-medium placeholder:text-neutral-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition" />
                </div>
                {(sourceFilter !== 'all' || search) && (
                    <button onClick={() => { setSourceFilter('all'); setSearch(''); setPage(0); }}
                        className="text-xs font-bold text-amber-400 hover:text-amber-300 px-4 py-2 bg-amber-500/10 rounded-xl border border-amber-500/20 transition-colors whitespace-nowrap">
                        Clear Filters</button>
                )}
            </div>

            {/* Table */}
            <div className="bg-[#070707]/90 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden">
                <table className="w-full">
                    <thead><tr className="border-b border-white/5">
                        <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-[0.15em] text-neutral-500">Company / Name</th>
                        <th className="px-4 py-4 text-left text-[10px] font-black uppercase tracking-[0.15em] text-neutral-500 hidden md:table-cell">Title</th>
                        <th className="px-4 py-4 text-left text-[10px] font-black uppercase tracking-[0.15em] text-neutral-500">Location</th>
                        <th className="px-4 py-4 text-left text-[10px] font-black uppercase tracking-[0.15em] text-neutral-500 hidden lg:table-cell">Source</th>
                    </tr></thead>
                    <tbody className="divide-y divide-white/[0.03]">
                        {loading ? Array(5).fill(0).map((_, i) => (
                            <tr key={i} className="animate-pulse">
                                <td className="px-6 py-4"><div className="h-4 bg-white/5 rounded w-48" /></td>
                                <td className="px-4 py-4 hidden md:table-cell"><div className="h-4 bg-white/5 rounded w-36" /></td>
                                <td className="px-4 py-4"><div className="h-4 bg-white/5 rounded w-28" /></td>
                                <td className="px-4 py-4 hidden lg:table-cell"><div className="h-4 bg-white/5 rounded w-16" /></td>
                            </tr>
                        )) : profiles.length === 0 ? (
                            <tr><td colSpan={4} className="px-6 py-20 text-center">
                                <UtilityPole className="w-12 h-12 text-neutral-700 mx-auto mb-4" />
                                <p className="font-bold text-neutral-300 text-lg">No profiles found</p>
                                <p className="text-sm text-neutral-500 mt-1">
                                    {search || sourceFilter !== 'all' ? 'Try adjusting your filters' : 'Run the scraper to populate data'}
                                </p>
                            </td></tr>
                        ) : profiles.map(p => (
                            <tr key={p.id} onClick={() => setSelectedProfile(p)}
                                className="hover:bg-white/[0.02] transition-colors cursor-pointer group">
                                <td className="px-6 py-4">
                                    <p className="font-bold text-white text-sm group-hover:text-amber-300 transition-colors truncate max-w-[280px]">
                                        {p.current_company || p.full_name}
                                    </p>
                                </td>
                                <td className="px-4 py-4 hidden md:table-cell">
                                    <span className="text-xs text-neutral-300 font-medium truncate block max-w-[240px]">{p.current_title || '—'}</span>
                                </td>
                                <td className="px-4 py-4">
                                    <span className="text-xs text-neutral-400 font-medium flex items-center gap-1">
                                        <MapPin className="w-3 h-3 shrink-0" /> {p.location || '—'}
                                    </span>
                                </td>
                                <td className="px-4 py-4 hidden lg:table-cell">
                                    <div className="flex gap-1.5">
                                        {(p.sources || []).map(s => {
                                            const sStyle = getSourceStyle(s);
                                            return (
                                                <span key={s} className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${sStyle.bg} border ${sStyle.border} ${sStyle.text}`}>
                                                    {SOURCE_CONFIG[s]?.label || s}
                                                </span>
                                            );
                                        })}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between">
                        <span className="text-xs text-neutral-500 font-medium">
                            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} of {totalCount.toLocaleString()}
                        </span>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                                className="p-2 rounded-lg bg-white/5 border border-white/10 text-neutral-400 hover:text-white disabled:opacity-30 transition-all">
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="text-sm font-bold text-neutral-300 px-3">{page + 1} / {totalPages}</span>
                            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                                className="p-2 rounded-lg bg-white/5 border border-white/10 text-neutral-400 hover:text-white disabled:opacity-30 transition-all">
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            {selectedProfile && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedProfile(null)}>
                    <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-white/5 flex items-start justify-between">
                            <div>
                                <h3 className="text-xl font-black text-white">{selectedProfile.current_company || selectedProfile.full_name}</h3>
                                {selectedProfile.current_title && <p className="text-sm text-amber-400 font-bold mt-1">{selectedProfile.current_title}</p>}
                                {selectedProfile.location && (
                                    <p className="text-sm text-neutral-400 mt-1 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {selectedProfile.location}</p>
                                )}
                            </div>
                            <button onClick={() => setSelectedProfile(null)} className="p-2 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white transition-all">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {selectedProfile.email && (
                                    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                                        <Mail className="w-4 h-4 text-indigo-400" /><span className="text-sm text-white font-medium truncate">{selectedProfile.email}</span>
                                    </div>
                                )}
                                {selectedProfile.phone && (
                                    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                                        <Phone className="w-4 h-4 text-emerald-400" /><span className="text-sm text-white font-medium">{selectedProfile.phone}</span>
                                    </div>
                                )}
                            </div>
                            {selectedProfile.skills?.length > 0 && (
                                <div>
                                    <p className="text-xs font-black text-neutral-400 uppercase tracking-wider mb-2">Skills</p>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedProfile.skills.map(s => <span key={s} className="text-xs font-bold px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">{s}</span>)}
                                    </div>
                                </div>
                            )}
                            <div className="flex items-center gap-2 pt-2">
                                <Activity className="w-4 h-4 text-neutral-500" />
                                <span className="text-xs text-neutral-500">
                                    Sources: {(selectedProfile.sources || []).map(s => SOURCE_CONFIG[s]?.label || s).join(', ')} • Added {new Date(selectedProfile.created_at).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
