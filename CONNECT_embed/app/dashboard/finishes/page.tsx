"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
    Paintbrush, Building2, MapPin, Mail, Phone, Search,
    ChevronLeft, ChevronRight, X, Briefcase, Shield,
    RefreshCw, Clock, Download, Activity, Scissors,
    Layout, Layers, Grid, Maximize, PanelTop
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

const SUB_SECTOR_LABELS: Record<string, { label: string; icon: any; color: string }> = {
    painting: { label: 'Painting', icon: Paintbrush, color: 'blue' },
    drywall: { label: 'Drywall & Plaster', icon: Layers, color: 'amber' },
    tile: { label: 'Tile & Stone', icon: Grid, color: 'emerald' },
    flooring: { label: 'Flooring', icon: Layout, color: 'indigo' },
    ceilings: { label: 'Ceilings', icon: PanelTop, color: 'cyan' },
    countertops: { label: 'Countertops', icon: Maximize, color: 'orange' },
    wall_coverings: { label: 'Wall Coverings', icon: Scissors, color: 'rose' },
};

const SOURCE_CONFIG: Record<string, { label: string; color: string }> = {
    indeed: { label: 'Indeed', color: 'blue' },
    JSearch: { label: 'JSearch API', color: 'violet' },
    directory_seed: { label: 'Directory', color: 'neutral' },
};

const PAGE_SIZE = 25;

export default function FinishesPage() {
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [subSectorFilter, setSubSectorFilter] = useState('all');
    const [sourceFilter, setSourceFilter] = useState('all');
    const [page, setPage] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const [stats, setStats] = useState({
        total: 0, withEmail: 0, withPhone: 0,
        painting: 0, drywall: 0, tile: 0, flooring: 0, ceilings: 0, countertops: 0, wall_coverings: 0
    });
    const [sourceCounts, setSourceCounts] = useState<Record<string, number>>({});
    const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
    const [lastRun, setLastRun] = useState<string | null>(null);

    const fetchStats = async () => {
        const [
            { count: total },
            { count: withEmail },
            { count: withPhone },
            { count: painting },
            { count: drywall },
            { count: tile },
            { count: flooring },
            { count: ceilings },
            { count: countertops },
            { count: wall_coverings },
        ] = await Promise.all([
            supabase.from('finishes_profiles').select('*', { count: 'exact', head: true }),
            supabase.from('finishes_profiles').select('*', { count: 'exact', head: true }).not('email', 'is', null).neq('email', ''),
            supabase.from('finishes_profiles').select('*', { count: 'exact', head: true }).not('phone', 'is', null).neq('phone', ''),
            supabase.from('finishes_profiles').select('*', { count: 'exact', head: true }).eq('sub_sector', 'painting'),
            supabase.from('finishes_profiles').select('*', { count: 'exact', head: true }).eq('sub_sector', 'drywall'),
            supabase.from('finishes_profiles').select('*', { count: 'exact', head: true }).eq('sub_sector', 'tile'),
            supabase.from('finishes_profiles').select('*', { count: 'exact', head: true }).eq('sub_sector', 'flooring'),
            supabase.from('finishes_profiles').select('*', { count: 'exact', head: true }).eq('sub_sector', 'ceilings'),
            supabase.from('finishes_profiles').select('*', { count: 'exact', head: true }).eq('sub_sector', 'countertops'),
            supabase.from('finishes_profiles').select('*', { count: 'exact', head: true }).eq('sub_sector', 'wall_coverings'),
        ]);

        setStats({
            total: total || 0, withEmail: withEmail || 0, withPhone: withPhone || 0,
            painting: painting || 0, drywall: drywall || 0,
            tile: tile || 0, flooring: flooring || 0,
            ceilings: ceilings || 0, countertops: countertops || 0,
            wall_coverings: wall_coverings || 0
        });

        const { data: allSources } = await supabase.from('finishes_profiles').select('sources');
        if (allSources) {
            const counts: Record<string, number> = {};
            allSources.forEach((row: any) => {
                (row.sources || []).forEach((s: string) => { counts[s] = (counts[s] || 0) + 1; });
            });
            setSourceCounts(counts);
        }

        const { data: runs } = await supabase
            .from('scraper_runs')
            .select('completed_at')
            .eq('sector', 'finishes')
            .eq('status', 'completed')
            .order('completed_at', { ascending: false })
            .limit(1);
        if (runs?.[0]?.completed_at) setLastRun(new Date(runs[0].completed_at).toLocaleString());
    };

    const fetchProfiles = useCallback(async () => {
        setLoading(true);
        let query = supabase.from('finishes_profiles').select('*', { count: 'exact' });

        if (search.trim()) {
            query = query.or(`current_company.ilike.%${search}%,current_title.ilike.%${search}%,location.ilike.%${search}%,full_name.ilike.%${search}%`);
        }
        if (subSectorFilter !== 'all') query = query.eq('sub_sector', subSectorFilter);
        if (sourceFilter !== 'all') query = query.contains('sources', [sourceFilter]);

        const { data, count } = await query
            .order('created_at', { ascending: false })
            .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

        setProfiles(data || []);
        setTotalCount(count || 0);
        setLoading(false);
    }, [search, subSectorFilter, sourceFilter, page]);

    useEffect(() => { fetchStats(); }, []);
    useEffect(() => { fetchProfiles(); }, [fetchProfiles]);

    const totalPages = Math.ceil(totalCount / PAGE_SIZE);

    const downloadCSV = () => {
        if (!profiles.length) return;
        const headers = ['Company', 'Title', 'Location', 'Sub-Sector', 'Email', 'Phone', 'Certifications', 'Sources', 'Added'];
        const csvContent = [
            headers.join(','),
            ...profiles.map(p => [
                `"${(p.current_company || '').replace(/"/g, '""')}"`,
                `"${(p.current_title || '').replace(/"/g, '""')}"`,
                `"${(p.location || '').replace(/"/g, '""')}"`,
                `"${(p.sub_sector || '').replace(/"/g, '""')}"`,
                `"${(p.email || '').replace(/"/g, '""')}"`,
                `"${(p.phone || '').replace(/"/g, '""')}"`,
                `"${(p.certifications || []).join(', ')}"`,
                `"${(p.sources || []).join(', ')}"`,
                `"${new Date(p.created_at).toLocaleDateString()}"`,
            ].join(','))
        ].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.setAttribute('href', URL.createObjectURL(blob));
        link.setAttribute('download', `finishes_profiles_${subSectorFilter}_${sourceFilter}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const getSubSectorStyle = (sub: string) => {
        const styles: Record<string, { bg: string; border: string; text: string }> = {
            painting: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400' },
            drywall: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400' },
            tile: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400' },
            flooring: { bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', text: 'text-indigo-400' },
            ceilings: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', text: 'text-cyan-400' },
            countertops: { bg: 'bg-orange-500/10', border: 'border-orange-500/20', text: 'text-orange-400' },
            wall_coverings: { bg: 'bg-rose-500/10', border: 'border-rose-500/20', text: 'text-rose-400' },
        };
        return styles[sub] || { bg: 'bg-neutral-500/10', border: 'border-neutral-500/20', text: 'text-neutral-400' };
    };

    const getSourceStyle = (source: string) => {
        const styles: Record<string, { bg: string; border: string; text: string }> = {
            indeed: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400' },
            JSearch: { bg: 'bg-violet-500/10', border: 'border-violet-500/20', text: 'text-violet-400' },
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
                        <Paintbrush className="w-8 h-8 text-indigo-400" />
                        Finishes Intelligence
                    </h1>
                    <p className="text-neutral-400 font-medium mt-2">
                        {stats.total.toLocaleString()} profiles — painting, drywall, flooring, tile & interior trades
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {lastRun && (
                        <span className="text-xs text-neutral-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Last scrape: {lastRun}
                        </span>
                    )}
                    <button onClick={downloadCSV}
                        className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg bg-indigo-500 text-white hover:bg-indigo-400 transition-colors shadow-lg shadow-indigo-500/20"
                    >
                        <Download className="w-3.5 h-3.5" /> CSV
                    </button>
                    <button onClick={() => { fetchStats(); fetchProfiles(); }}
                        className="p-2 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white transition-all">
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'TOTAL PROFILES', value: stats.total, icon: Building2, color: 'indigo' },
                    { label: 'WITH EMAIL', value: stats.withEmail, icon: Mail, color: 'cyan' },
                    { label: 'WITH PHONE', value: stats.withPhone, icon: Phone, color: 'emerald' },
                    { label: 'PAINTING', value: stats.painting, icon: Paintbrush, color: 'blue' },
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

            {/* Sub-sector filter pills */}
            <div className="space-y-3">
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    <span className="text-[10px] font-black text-neutral-500 uppercase tracking-wider shrink-0 mr-1">Trade:</span>
                    <button
                        onClick={() => { setSubSectorFilter('all'); setPage(0); }}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold tracking-wide transition-all whitespace-nowrap ${subSectorFilter === 'all'
                            ? 'bg-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.3)]'
                            : 'bg-white/5 border border-white/10 text-neutral-400 hover:text-white hover:border-white/20'
                            }`}
                    >ALL</button>
                    {Object.entries(SUB_SECTOR_LABELS).map(([key, info]) => {
                        const Icon = info.icon;
                        const count = stats[key as keyof typeof stats] || 0;
                        return (
                            <button key={key}
                                onClick={() => { setSubSectorFilter(key); setPage(0); }}
                                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold tracking-wide transition-all whitespace-nowrap ${subSectorFilter === key
                                    ? 'bg-white/10 border border-white/20 text-white'
                                    : 'bg-white/5 border border-white/10 text-neutral-400 hover:text-white hover:border-white/20'
                                    }`}
                            >
                                <Icon className="w-3.5 h-3.5" />
                                {info.label} <span className="text-neutral-500 ml-0.5">({(count as number).toLocaleString()})</span>
                            </button>
                        );
                    })}
                </div>

                {/* Source filter pills */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    <span className="text-[10px] font-black text-neutral-500 uppercase tracking-wider shrink-0 mr-1">Source:</span>
                    <button
                        onClick={() => { setSourceFilter('all'); setPage(0); }}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold tracking-wide transition-all whitespace-nowrap ${sourceFilter === 'all'
                            ? 'bg-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.3)]'
                            : 'bg-white/5 border border-white/10 text-neutral-400 hover:text-white hover:border-white/20'
                            }`}
                    >ALL</button>
                    {Object.entries(SOURCE_CONFIG).map(([key, info]) => {
                        const count = sourceCounts[key] || 0;
                        if (count === 0) return null;
                        const style = getSourceStyle(key);
                        return (
                            <button key={key}
                                onClick={() => { setSourceFilter(key); setPage(0); }}
                                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold tracking-wide transition-all whitespace-nowrap ${sourceFilter === key
                                    ? `${style.bg} border ${style.border} ${style.text}`
                                    : 'bg-white/5 border border-white/10 text-neutral-400 hover:text-white hover:border-white/20'
                                    }`}
                            >
                                {info.label} <span className="text-neutral-500 ml-0.5">({count})</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Search */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                    <input type="text" placeholder="Search by company, title, or location..."
                        value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
                        className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-medium placeholder:text-neutral-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition" />
                </div>
                {(subSectorFilter !== 'all' || sourceFilter !== 'all' || search) && (
                    <button
                        onClick={() => { setSubSectorFilter('all'); setSourceFilter('all'); setSearch(''); setPage(0); }}
                        className="text-xs font-bold text-indigo-400 hover:text-indigo-300 px-4 py-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20 transition-colors whitespace-nowrap"
                    >Clear Filters</button>
                )}
            </div>

            {/* Table */}
            <div className="bg-[#070707]/90 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden">
                <table className="w-full">
                    <thead><tr className="border-b border-white/5">
                        <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-[0.15em] text-neutral-500">Company</th>
                        <th className="px-4 py-4 text-left text-[10px] font-black uppercase tracking-[0.15em] text-neutral-500 hidden md:table-cell">Title</th>
                        <th className="px-4 py-4 text-left text-[10px] font-black uppercase tracking-[0.15em] text-neutral-500">Location</th>
                        <th className="px-4 py-4 text-left text-[10px] font-black uppercase tracking-[0.15em] text-neutral-500 hidden lg:table-cell">Trade</th>
                        <th className="px-4 py-4 text-left text-[10px] font-black uppercase tracking-[0.15em] text-neutral-500 hidden lg:table-cell">Source</th>
                    </tr></thead>
                    <tbody className="divide-y divide-white/[0.03]">
                        {loading ? Array(8).fill(0).map((_, i) => (
                            <tr key={i} className="animate-pulse">
                                <td className="px-6 py-4"><div className="h-4 bg-white/5 rounded w-48" /></td>
                                <td className="px-4 py-4 hidden md:table-cell"><div className="h-4 bg-white/5 rounded w-36" /></td>
                                <td className="px-4 py-4"><div className="h-4 bg-white/5 rounded w-28" /></td>
                                <td className="px-4 py-4 hidden lg:table-cell"><div className="h-4 bg-white/5 rounded w-20" /></td>
                                <td className="px-4 py-4 hidden lg:table-cell"><div className="h-4 bg-white/5 rounded w-16" /></td>
                            </tr>
                        )) : profiles.length === 0 ? (
                            <tr><td colSpan={5} className="px-6 py-20 text-center">
                                <Paintbrush className="w-12 h-12 text-neutral-700 mx-auto mb-4" />
                                <p className="font-bold text-neutral-300 text-lg">No profiles yet</p>
                                <p className="text-sm text-neutral-500 mt-1">
                                    {search || subSectorFilter !== 'all' || sourceFilter !== 'all' ? 'Try adjusting your filters' : 'Run: python engine/scheduler.py --once --sector finishes'}
                                </p>
                            </td></tr>
                        ) : profiles.map(p => {
                            const style = getSubSectorStyle(p.sub_sector);
                            return (
                                <tr key={p.id} onClick={() => setSelectedProfile(p)}
                                    className="hover:bg-white/[0.02] transition-colors cursor-pointer group">
                                    <td className="px-6 py-4">
                                        <p className="font-bold text-white text-sm group-hover:text-indigo-300 transition-colors truncate max-w-[280px]">
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
                                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${style.bg} border ${style.border} ${style.text}`}>
                                            {SUB_SECTOR_LABELS[p.sub_sector]?.label || p.sub_sector || '—'}
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
                            );
                        })}
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
                                {selectedProfile.current_title && <p className="text-sm text-indigo-400 font-bold mt-1">{selectedProfile.current_title}</p>}
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
                            {selectedProfile.sub_sector && (
                                <div className="flex items-center gap-2">
                                    <Briefcase className="w-4 h-4 text-indigo-400" />
                                    <span className="text-sm text-neutral-300 font-medium">Trade: {SUB_SECTOR_LABELS[selectedProfile.sub_sector]?.label || selectedProfile.sub_sector}</span>
                                </div>
                            )}
                            {selectedProfile.certifications?.length > 0 && (
                                <div>
                                    <p className="text-xs font-black text-neutral-400 uppercase tracking-wider mb-2">Certifications</p>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedProfile.certifications.map(c => <span key={c} className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400">{c}</span>)}
                                    </div>
                                </div>
                            )}
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
