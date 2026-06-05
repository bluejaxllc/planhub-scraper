"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
    Fuel, Building2, MapPin, Mail, Phone, Search,
    ChevronLeft, ChevronRight, Globe, X, Briefcase,
    ArrowUpRight, ArrowDownRight, Wrench, Download,
    RefreshCw, Activity, Clock, User, Loader
} from 'lucide-react';

interface OilGasLead {
    id: string;
    full_name: string;
    current_title: string;
    current_company: string;
    email: string;
    phone: string;
    location: string;
    sector: string;
    sub_sector: string;
    linkedin_url?: string;
    skills: string[];
    certifications: string[];
    sources: string[];
    created_at: string;
    experience_history?: any;
}

const SUB_SECTOR_LABELS: Record<string, { label: string; icon: any; color: string }> = {
    upstream: { label: 'Upstream', icon: ArrowUpRight, color: 'emerald' },
    midstream: { label: 'Midstream', icon: Fuel, color: 'blue' },
    downstream: { label: 'Downstream', icon: ArrowDownRight, color: 'orange' },
    services: { label: 'Services', icon: Wrench, color: 'purple' },
};

const PAGE_SIZE = 25;

export default function OilGasLeadsPage() {
    const [profiles, setProfiles] = useState<OilGasLead[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [subSectorFilter, setSubSectorFilter] = useState('all');
    const [stateFilter, setStateFilter] = useState('all');
    const [leadDays, setLeadDays] = useState('all');
    const [page, setPage] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const [stats, setStats] = useState({
        total: 0, withEmail: 0, withPhone: 0,
        upstream: 0, midstream: 0, downstream: 0, services: 0,
    });
    const [selectedProfile, setSelectedProfile] = useState<OilGasLead | null>(null);
    const [lastRun, setLastRun] = useState<string | null>(null);
    const [isExporting, setIsExporting] = useState(false);

    const STATE_NAMES: Record<string, string> = {
        'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas', 'CA': 'California',
        'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware', 'FL': 'Florida', 'GA': 'Georgia',
        'HI': 'Hawaii', 'ID': 'Idaho', 'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa',
        'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
        'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi', 'MO': 'Missouri',
        'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada', 'NH': 'New Hampshire', 'NJ': 'New Jersey',
        'NM': 'New Mexico', 'NY': 'New York', 'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio',
        'OK': 'Oklahoma', 'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
        'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah', 'VT': 'Vermont',
        'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia', 'WI': 'Wisconsin', 'WY': 'Wyoming',
        'DC': 'District of Columbia', 'PR': 'Puerto Rico', 'VI': 'Virgin Islands', 'GU': 'Guam',
    };

    const fetchStats = async () => {
        const [
            { count: total },
            { count: withEmail },
            { count: withPhone },
            { count: upstream },
            { count: midstream },
            { count: downstream },
            { count: services },
        ] = await Promise.all([
            supabase.from('oil_gas_profiles').select('*', { count: 'exact', head: true }),
            supabase.from('oil_gas_profiles').select('*', { count: 'exact', head: true }).not('email', 'is', null).neq('email', ''),
            supabase.from('oil_gas_profiles').select('*', { count: 'exact', head: true }).not('phone', 'is', null).neq('phone', ''),
            supabase.from('oil_gas_profiles').select('*', { count: 'exact', head: true }).eq('sub_sector', 'upstream'),
            supabase.from('oil_gas_profiles').select('*', { count: 'exact', head: true }).eq('sub_sector', 'midstream'),
            supabase.from('oil_gas_profiles').select('*', { count: 'exact', head: true }).eq('sub_sector', 'downstream'),
            supabase.from('oil_gas_profiles').select('*', { count: 'exact', head: true }).eq('sub_sector', 'services'),
        ]);

        setStats({
            total: total || 0, withEmail: withEmail || 0, withPhone: withPhone || 0,
            upstream: upstream || 0, midstream: midstream || 0,
            downstream: downstream || 0, services: services || 0,
        });

        const { data: runs } = await supabase
            .from('scraper_runs')
            .select('completed_at')
            .eq('sector', 'oil_gas')
            .eq('status', 'completed')
            .order('completed_at', { ascending: false })
            .limit(1);
        if (runs?.[0]?.completed_at) setLastRun(new Date(runs[0].completed_at).toLocaleString());
    };

    const fetchProfiles = useCallback(async () => {
        setLoading(true);
        let query = supabase.from('oil_gas_profiles').select('*', { count: 'exact' });

        if (search.trim()) {
            query = query.or(`current_company.ilike.%${search}%,current_title.ilike.%${search}%,location.ilike.%${search}%,full_name.ilike.%${search}%`);
        }
        if (subSectorFilter !== 'all') query = query.eq('sub_sector', subSectorFilter);

        if (stateFilter !== 'all') {
            query = query.or(`location.ilike.%${stateFilter}%,location.ilike.%${STATE_NAMES[stateFilter]}%`);
        }

        if (leadDays !== 'all') {
            const cutoff = new Date(Date.now() - parseInt(leadDays) * 86400000).toISOString();
            query = query.gte('created_at', cutoff);
        }

        const { data, count } = await query
            .order('created_at', { ascending: false })
            .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

        setProfiles(data || []);
        setTotalCount(count || 0);
        setLoading(false);
    }, [search, subSectorFilter, stateFilter, leadDays, page]);

    useEffect(() => { fetchStats(); }, []);
    useEffect(() => { fetchProfiles(); }, [fetchProfiles]);
    useEffect(() => {
        const interval = setInterval(() => { fetchStats(); fetchProfiles(); }, 60000);
        return () => clearInterval(interval);
    }, [fetchProfiles]);

    const totalPages = Math.ceil(totalCount / PAGE_SIZE);

    const timeAgo = (ts: string) => {
        if (!ts) return '';
        const diff = Date.now() - new Date(ts).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        const days = Math.floor(hrs / 24);
        return `${days}d ago`;
    };

    const getSubSectorStyle = (sub: string) => {
        const info = SUB_SECTOR_LABELS[sub];
        if (!info) return { bg: 'bg-neutral-500/10', border: 'border-neutral-500/20', text: 'text-neutral-400' };
        return { bg: `bg-${info.color}-500/10`, border: `border-${info.color}-500/20`, text: `text-${info.color}-400` };
    };

    const downloadCSV = async () => {
        setIsExporting(true);
        try {
            let allProfiles: OilGasLead[] = [];
            let from = 0;
            const limit = 5000;
            let hasMore = true;

            while (hasMore) {
                let query = supabase.from('talent_profiles').select('*').eq('sector', 'oil_gas');

                if (search) {
                    query = query.or(`full_name.ilike.%${search}%,current_title.ilike.%${search}%,current_company.ilike.%${search}%`);
                }
                if (subSectorFilter !== 'all') {
                    query = query.eq('sub_sector', subSectorFilter);
                }

                const { data, error } = await query.order('created_at', { ascending: false }).range(from, from + limit - 1);
                if (error) throw error;
                if (!data || data.length === 0) {
                    hasMore = false;
                    break;
                }

                allProfiles.push(...data);
                from += limit;

                if (allProfiles.length >= 50000) {
                    hasMore = false;
                }
            }

            const headers = ['Name', 'Title', 'Company', 'Email', 'Phone', 'Location', 'Sub-Sector', 'Skills', 'Sources', 'Added'];
            const csvContent = [
                headers.join(','),
                ...allProfiles.map(p => [
                    `"${(p.full_name || '').replace(/"/g, '""')}"`,
                    `"${(p.current_title || '').replace(/"/g, '""')}"`,
                    `"${(p.current_company || '').replace(/"/g, '""')}"`,
                    `"${(p.email || '').replace(/"/g, '""')}"`,
                    `"${(p.phone || '').replace(/"/g, '""')}"`,
                    `"${(p.location || '').replace(/"/g, '""')}"`,
                    `"${(p.sub_sector || '').replace(/"/g, '""')}"`,
                    `"${(p.skills || []).join('; ')}"`,
                    `"${(p.sources || []).join('; ')}"`,
                    `"${p.created_at ? new Date(p.created_at).toLocaleDateString() : ''}"`,
                ].join(','))
            ].join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.setAttribute('href', URL.createObjectURL(blob));
            link.setAttribute('download', `oil_gas_leads_${new Date().toISOString().slice(0, 10)}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            console.error('Export error:', err);
            alert('An error occurred during export.');
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                        <Fuel className="w-8 h-8 text-amber-400" />
                        Oil & Gas Leads
                    </h1>
                    <p className="text-neutral-400 font-medium mt-2">
                        {stats.total.toLocaleString()} profiles across upstream, midstream, downstream & services
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={downloadCSV}
                        disabled={profiles.length === 0 || isExporting}
                        className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-lg bg-amber-500 text-[#050505] hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-amber-500/20"
                    >
                        {isExporting ? (
                            <>
                                <Loader className="w-3.5 h-3.5 animate-spin" /> Exporting...
                            </>
                        ) : (
                            <>
                                <Download className="w-3.5 h-3.5" /> Export CSV
                            </>
                        )}
                    </button>
                    {lastRun && (
                        <span className="text-xs text-neutral-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Last scrape: {lastRun}
                        </span>
                    )}
                    <button onClick={() => { fetchStats(); fetchProfiles(); }}
                        className="p-2 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white transition-all">
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'TOTAL PROFILES', value: stats.total, icon: Building2, color: 'amber' },
                    { label: 'WITH EMAIL', value: stats.withEmail, icon: Mail, color: 'indigo' },
                    { label: 'WITH PHONE', value: stats.withPhone, icon: Phone, color: 'emerald' },
                    { label: 'UPSTREAM', value: stats.upstream, icon: ArrowUpRight, color: 'cyan' },
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

            {/* Sub-sector buttons */}
            <div className="grid grid-cols-4 gap-3">
                {Object.entries(SUB_SECTOR_LABELS).map(([key, info]) => {
                    const count = stats[key as keyof typeof stats] || 0;
                    const Icon = info.icon;
                    return (
                        <button key={key}
                            onClick={() => { setSubSectorFilter(subSectorFilter === key ? 'all' : key); setPage(0); }}
                            className={`bg-[#070707]/90 border rounded-2xl p-4 text-left transition-all ${subSectorFilter === key ? `border-${info.color}-500/30 bg-${info.color}-500/5` : 'border-white/5 hover:border-white/10'
                                }`}>
                            <Icon className={`w-5 h-5 text-${info.color}-400 mb-2`} />
                            <p className="text-lg font-black text-white">{(count as number).toLocaleString()}</p>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">{info.label}</p>
                        </button>
                    );
                })}
            </div>

            {/* Prominent State & Search */}
            <div className="flex flex-col md:flex-row gap-3">
                <div className="w-full md:w-80 shrink-0">
                    <div className="relative h-full">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-500" />
                        <select value={stateFilter} onChange={e => { setStateFilter(e.target.value); setPage(0); }}
                            className="w-full h-full pl-12 pr-10 py-3.5 bg-amber-500/10 border-2 border-amber-500/30 rounded-2xl text-amber-400 text-base font-black focus:outline-none focus:border-amber-500/60 appearance-none cursor-pointer hover:bg-amber-500/20 transition-all shadow-[0_0_15px_rgba(245,158,11,0.15)]">
                            <option value="all" className="bg-[#0a0a0a] text-white">All Candidate States</option>
                            {Object.entries(STATE_NAMES).map(([abbr, full]) => (
                                <option key={abbr} value={abbr} className="bg-[#0a0a0a] text-white">{full}</option>
                            ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-amber-500 text-xs font-bold">▼</div>
                    </div>
                </div>
                <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                    <input type="text" placeholder="Search by company, title, or location..."
                        value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
                        className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-medium placeholder:text-neutral-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition" />
                    {search && (
                        <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white">
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
                <select value={subSectorFilter} onChange={e => { setSubSectorFilter(e.target.value); setPage(0); }}
                    className="px-4 py-3 rounded-2xl bg-white/5 border-2 border-white/10 text-neutral-300 text-sm font-bold focus:outline-none cursor-pointer transition-colors hover:border-white/20">
                    <option value="all">All Sub-Sectors</option>
                    <option value="upstream">Upstream</option>
                    <option value="midstream">Midstream</option>
                    <option value="downstream">Downstream</option>
                    <option value="services">Services</option>
                </select>
            </div>

            {/* Age Dial Filter */}
            <div className="bg-[#070707] p-6 rounded-2xl border border-white/5 border-t-white/10 shadow-lg relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-transparent to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
                    <div>
                        <label className="text-base font-black text-white flex items-center gap-2">
                            <Clock className="w-5 h-5 text-orange-400" /> Maximum Pipeline Age
                        </label>
                        <p className="text-xs font-medium text-neutral-500 mt-1">Filter out leads strictly older than this cutoff relative to initial discovery time.</p>
                    </div>

                    <div className={`flex items-center gap-2 px-5 py-2 rounded-xl border-2 transition-colors ${leadDays === 'all' ? 'bg-amber-500/10 border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]' : 'bg-orange-500/10 border-orange-500/30 shadow-[0_0_15px_rgba(249,115,22,0.15)]'}`}>
                        <span className={`text-xl font-black ${leadDays === 'all' ? 'text-amber-400' : 'text-orange-400'}`}>
                            {leadDays === 'all' ? 'All Time' : `≤ ${leadDays} Day${leadDays === '1' ? '' : 's'}`}
                        </span>
                    </div>
                </div>

                <div className="relative z-10">
                    <input
                        type="range"
                        min="1" max="90"
                        value={leadDays === 'all' ? 90 : leadDays}
                        onChange={e => {
                            const val = e.target.value;
                            if (val === "90") { setLeadDays('all'); } else { setLeadDays(val); }
                            setPage(0);
                        }}
                        className={`w-full h-3 rounded-xl appearance-none cursor-pointer outline-none transition-colors ${leadDays === 'all' ? 'bg-amber-500/20 accent-amber-500 hover:accent-amber-400' : 'bg-orange-500/20 accent-orange-500 hover:accent-orange-400'}`}
                    />
                    <div className="flex justify-between text-[11px] text-neutral-500 font-bold mt-3 px-1 uppercase tracking-wider">
                        <span className={leadDays !== 'all' && Number(leadDays) <= 1 ? "text-orange-400" : ""}>1 Day</span>
                        <span className={leadDays !== 'all' && Number(leadDays) > 1 && Number(leadDays) <= 30 ? "text-orange-400" : ""}>30 Days</span>
                        <span className={leadDays !== 'all' && Number(leadDays) > 30 && Number(leadDays) <= 60 ? "text-orange-400" : ""}>60 Days</span>
                        <span className={leadDays === 'all' ? "text-amber-400" : ""}>All Time (90+)</span>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-[#070707]/90 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden">
                <table className="w-full">
                    <thead><tr className="border-b border-white/5">
                        <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-[0.15em] text-neutral-500">Name / Company</th>
                        <th className="px-4 py-4 text-left text-[10px] font-black uppercase tracking-[0.15em] text-neutral-500 hidden md:table-cell">Title</th>
                        <th className="px-4 py-4 text-left text-[10px] font-black uppercase tracking-[0.15em] text-neutral-500 hidden lg:table-cell">Contact</th>
                        <th className="px-4 py-4 text-left text-[10px] font-black uppercase tracking-[0.15em] text-neutral-500">Location</th>
                        <th className="px-4 py-4 text-left text-[10px] font-black uppercase tracking-[0.15em] text-neutral-500 hidden lg:table-cell">Sub-Sector</th>
                        <th className="px-4 py-4 text-left text-[10px] font-black uppercase tracking-[0.15em] text-neutral-500 hidden lg:table-cell">Source</th>
                        <th className="px-4 py-4 text-right text-[10px] font-black uppercase tracking-[0.15em] text-neutral-500">Age</th>
                    </tr></thead>
                    <tbody className="divide-y divide-white/[0.03]">
                        {loading ? Array(8).fill(0).map((_, i) => (
                            <tr key={i} className="animate-pulse">
                                <td className="px-6 py-4"><div className="h-4 bg-white/5 rounded w-48" /></td>
                                <td className="px-4 py-4 hidden md:table-cell"><div className="h-4 bg-white/5 rounded w-36" /></td>
                                <td className="px-4 py-4 hidden lg:table-cell"><div className="h-4 bg-white/5 rounded w-40" /></td>
                                <td className="px-4 py-4"><div className="h-4 bg-white/5 rounded w-28" /></td>
                                <td className="px-4 py-4 hidden lg:table-cell"><div className="h-4 bg-white/5 rounded w-20" /></td>
                                <td className="px-4 py-4 hidden lg:table-cell"><div className="h-4 bg-white/5 rounded w-24" /></td>
                                <td className="px-4 py-4"><div className="h-4 bg-white/5 rounded w-16 ml-auto" /></td>
                            </tr>
                        )) : profiles.length === 0 ? (
                            <tr><td colSpan={7} className="px-6 py-20 text-center">
                                <Fuel className="w-12 h-12 text-neutral-700 mx-auto mb-4" />
                                <p className="font-bold text-neutral-300 text-lg">No profiles found</p>
                                <p className="text-sm text-neutral-500 mt-1">
                                    {search || subSectorFilter !== 'all' ? 'Try adjusting your filters' : 'Run the scraper to populate Oil & Gas leads'}
                                </p>
                            </td></tr>
                        ) : profiles.map(p => {
                            const style = getSubSectorStyle(p.sub_sector);
                            return (
                                <tr key={p.id} onClick={() => setSelectedProfile(p)}
                                    className="hover:bg-white/[0.02] transition-colors cursor-pointer group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-sm shrink-0">
                                                {(p.full_name || p.current_company || 'U')[0].toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-bold text-white text-sm group-hover:text-amber-300 transition-colors truncate max-w-[220px]">
                                                    {p.full_name || p.current_company || '—'}
                                                </p>
                                                {p.full_name && p.current_company && (
                                                    <p className="text-xs text-neutral-500 mt-0.5 truncate max-w-[200px]">{p.current_company}</p>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 hidden md:table-cell">
                                        <span className="text-xs text-neutral-300 font-medium truncate block max-w-[240px]">{p.current_title || '—'}</span>
                                    </td>
                                    <td className="px-4 py-4 hidden lg:table-cell">
                                        <div className="space-y-0.5">
                                            {p.email && (
                                                <p className="text-xs text-indigo-400 font-medium truncate max-w-[200px] flex items-center gap-1">
                                                    <Mail className="w-3 h-3 shrink-0" /> {p.email}
                                                </p>
                                            )}
                                            {p.phone && (
                                                <p className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                                                    <Phone className="w-3 h-3 shrink-0" /> {p.phone}
                                                </p>
                                            )}
                                            {!p.email && !p.phone && <span className="text-xs text-neutral-600">—</span>}
                                        </div>
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
                                        <span className="text-xs text-neutral-400 font-medium truncate max-w-[120px] inline-block capitalize">
                                            {(p.sources && p.sources.length > 0) ? p.sources[0].replace(/_/g, ' ') : '—'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4 text-right">
                                        <div className="flex flex-col items-end">
                                            <span className="text-xs text-neutral-300 font-bold tabular-nums">
                                                {timeAgo(p.created_at)}
                                            </span>
                                            <span className="text-[10px] text-neutral-600 font-medium mt-0.5">
                                                {new Date(p.created_at).toLocaleDateString()}
                                            </span>
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
                    <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-white/5 flex items-start justify-between bg-white/[0.02]">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 text-xl font-bold">
                                    {(selectedProfile.full_name || selectedProfile.current_company || 'U')[0].toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-white">{selectedProfile.full_name || selectedProfile.current_company}</h3>
                                    {selectedProfile.current_title && <p className="text-sm text-amber-400 font-bold mt-1">{selectedProfile.current_title}</p>}
                                    {selectedProfile.location && (
                                        <p className="text-sm text-neutral-400 mt-1 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {selectedProfile.location}</p>
                                    )}
                                </div>
                            </div>
                            <button onClick={() => setSelectedProfile(null)} className="p-2 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white transition-all">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-3">
                                    {selectedProfile.current_company && (
                                        <div className="flex items-center gap-3 text-sm text-neutral-300">
                                            <Building2 className="w-4 h-4 text-neutral-500" />
                                            <span className="font-medium">{selectedProfile.current_company}</span>
                                        </div>
                                    )}
                                    {selectedProfile.sub_sector && (
                                        <div className="flex items-center gap-2 text-sm">
                                            <Briefcase className="w-4 h-4 text-amber-400" />
                                            <span className="text-neutral-300 font-medium">{SUB_SECTOR_LABELS[selectedProfile.sub_sector]?.label || selectedProfile.sub_sector}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-3">
                                    {selectedProfile.email && (
                                        <div className="flex items-center gap-3 text-sm">
                                            <Mail className="w-4 h-4 text-indigo-400" />
                                            <a href={`mailto:${selectedProfile.email}`} className="text-indigo-400 hover:text-indigo-300 hover:underline font-medium truncate">{selectedProfile.email}</a>
                                        </div>
                                    )}
                                    {selectedProfile.phone && (
                                        <div className="flex items-center gap-3 text-sm">
                                            <Phone className="w-4 h-4 text-emerald-400" />
                                            <a href={`tel:${selectedProfile.phone}`} className="text-emerald-400 hover:text-emerald-300 font-medium">{selectedProfile.phone}</a>
                                        </div>
                                    )}
                                    {selectedProfile.linkedin_url && (
                                        <div className="flex items-center gap-3 text-sm">
                                            <Globe className="w-4 h-4 text-blue-400" />
                                            <a href={selectedProfile.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 hover:underline font-medium">LinkedIn Profile</a>
                                        </div>
                                    )}
                                </div>
                            </div>
                            {selectedProfile.skills?.length > 0 && (
                                <div>
                                    <p className="text-xs font-black text-neutral-400 uppercase tracking-wider mb-2">Skills</p>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedProfile.skills.map(s => <span key={s} className="text-xs font-bold px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">{s}</span>)}
                                    </div>
                                </div>
                            )}
                            {(selectedProfile.certifications?.length ?? 0) > 0 && (
                                <div>
                                    <p className="text-xs font-black text-neutral-400 uppercase tracking-wider mb-2">Certifications</p>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedProfile.certifications.map(c => <span key={c} className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400">{c}</span>)}
                                    </div>
                                </div>
                            )}

                            {selectedProfile.experience_history && Array.isArray(selectedProfile.experience_history) && selectedProfile.experience_history.length > 0 && (
                                <div>
                                    <p className="text-xs font-black text-neutral-400 uppercase tracking-wider mb-2">Experience History</p>
                                    <div className="space-y-3">
                                        {selectedProfile.experience_history.map((exp: any, i: number) => (
                                            <div key={i} className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                                                <div className="flex justify-between items-start gap-4">
                                                    <div>
                                                        <p className="font-bold text-neutral-300 text-sm">{exp.title || 'Unknown Title'}</p>
                                                        <p className="text-neutral-500 text-xs mt-0.5">{exp.company || 'Unknown Company'}</p>
                                                    </div>
                                                    <span className="text-[10px] font-medium text-neutral-600 whitespace-nowrap bg-white/5 px-2 py-1 rounded-md">
                                                        {exp.duration || '—'}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t border-white/5">
                                <div className="flex items-center gap-2">
                                    <Activity className="w-4 h-4 text-neutral-500" />
                                    <span className="text-xs text-neutral-500">
                                        Sources: {(selectedProfile.sources || []).map(s => s.replace(/_/g, ' ')).join(', ')} • Added {new Date(selectedProfile.created_at).toLocaleDateString()}
                                    </span>
                                </div>

                                {selectedProfile.linkedin_url && (
                                    <a
                                        href={selectedProfile.linkedin_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-lg bg-[#0077b5] text-white hover:bg-[#005e93] transition-colors"
                                    >
                                        View on LinkedIn
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
