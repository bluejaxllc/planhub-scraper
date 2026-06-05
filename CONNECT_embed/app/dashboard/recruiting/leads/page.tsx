"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import {
    Fuel, Radio, Zap, Activity, Filter, Search,
    Download, RefreshCw, ChevronLeft, ChevronRight, User, Users,
    ArrowDownToLine, MapPin, Briefcase, Mail, Phone, ExternalLink,
    Clock, CheckCircle2, Shield, Calendar, Building2, Trash2, Loader, X
} from 'lucide-react';

type RecruitingSector = 'oil_gas' | 'telecom' | 'construction' | 'energy';

interface RecruitingLead {
    id: string;
    sector: RecruitingSector;
    name: string;
    title: string;
    company: string;
    location: string;
    email: string;
    phone: string;
    sub_sector: string;
    skills: string[];
    sources: string[];
    timestamp: string;
    raw: any;
    linkedin_url?: string;
    job_url?: string;
    certifications?: string[];
    experience_history?: any;
}

const SECTOR_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; glow: string; icon: any }> = {
    telecom: { label: 'Telecom & IT', color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', glow: 'shadow-cyan-500/20', icon: Radio },
    oil_gas: { label: 'Oil & Gas', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', glow: 'shadow-amber-500/20', icon: Fuel },
    fire_safety: { label: 'Fire & Safety', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', glow: 'shadow-red-500/20', icon: Zap },
    energy: { label: 'Energy', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', glow: 'shadow-emerald-500/20', icon: Activity },
};

const PAGE_SIZE = 25;

export default function RecruitingLeadFeedPage() {
    const [leads, setLeads] = useState<RecruitingLead[]>([]);
    const [filtered, setFiltered] = useState<RecruitingLead[]>([]);
    const [loading, setLoading] = useState(true);
    const [sectorFilter, setSectorFilter] = useState<string>('all');
    const [stateFilter, setStateFilter] = useState('all');
    const [leadDays, setLeadDays] = useState('all');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(0);
    const [counts, setCounts] = useState<Record<string, number>>({});
    const [selectedProfile, setSelectedProfile] = useState<RecruitingLead | null>(null);
    const [lastRefresh, setLastRefresh] = useState<string>('');
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

    const timeWindow = useMemo(() => new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), []);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        const allLeads: RecruitingLead[] = [];

        try {
            // Sector Mapping Table definitions
            const SOURCES = [
                { table: 'telecom_profiles', sector: 'telecom' },
                { table: 'oil_gas_profiles', sector: 'oil_gas' },
                { table: 'fire_safety_profiles', sector: 'fire_safety' },
                { table: 'energy_profiles', sector: 'energy' }
            ];

            const results = await Promise.all(
                SOURCES.map(s => supabase.from(s.table).select('*').order('created_at', { ascending: false }).limit(250))
            );

            results.forEach((res, index) => {
                if (res.data) {
                    const sector = SOURCES[index].sector as RecruitingSector;
                    res.data.forEach(p => {
                        allLeads.push({
                            id: `${sector}-${p.id}`,
                            sector: sector,
                            name: p.full_name || p.current_company || 'Unknown',
                            title: p.current_title || '',
                            company: p.current_company || '',
                            location: p.location || '',
                            email: p.email || (p.emails && p.emails[0]) || '',
                            phone: p.phone || (p.phone_numbers && p.phone_numbers[0]) || '',
                            sub_sector: p.sub_sector || '',
                            skills: p.skills || [],
                            certifications: p.certifications || [],
                            experience_history: p.experience_history,
                            linkedin_url: p.linkedin_url,
                            sources: p.sources || [],
                            timestamp: p.created_at || '',
                            raw: p,
                        });
                    });
                }
            });

            // Sort by newest discovery across all sectors
            allLeads.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

            // Accurate counts per sector
            const sectorCounts: Record<string, number> = {};
            allLeads.forEach(l => { sectorCounts[l.sector] = (sectorCounts[l.sector] || 0) + 1; });
            setCounts(sectorCounts);

            setLeads(allLeads);
            setLastRefresh(new Date().toLocaleTimeString());
        } catch (err) {
            console.error('Talent Pool update error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    // Auto-refresh every 60 seconds
    useEffect(() => {
        const interval = setInterval(() => { fetchAll(); }, 60000);
        return () => clearInterval(interval);
    }, [fetchAll]);

    // Apply filters
    useEffect(() => {
        setPage(0);
        let result = leads;
        if (sectorFilter !== 'all') {
            result = result.filter(l => l.sector === sectorFilter);
        }
        if (stateFilter !== 'all') {
            const statePattern = new RegExp(`\\b(?:${stateFilter}|${STATE_NAMES[stateFilter]})\\b`, 'i');
            result = result.filter(l => statePattern.test(l.location));
        }
        if (leadDays !== 'all') {
            const cutoff = Date.now() - parseInt(leadDays) * 86400000;
            result = result.filter(l => new Date(l.timestamp).getTime() >= cutoff);
        }
        if (search.trim()) {
            const q = search.toLowerCase();
            result = result.filter(l =>
                l.name.toLowerCase().includes(q) ||
                l.company.toLowerCase().includes(q) ||
                l.title.toLowerCase().includes(q) ||
                l.location.toLowerCase().includes(q) ||
                l.email.toLowerCase().includes(q)
            );
        }
        setFiltered(result);
    }, [leads, sectorFilter, stateFilter, leadDays, search]);

    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    const pageLeads = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

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

    const totalLeads = leads.length;

    const downloadCSV = async () => {
        setIsExporting(true);
        try {
            const allLeads: RecruitingLead[] = [];
            const tables = [
                { name: 'telecom_profiles', sector: 'telecom' },
                { name: 'oil_gas_profiles', sector: 'oil_gas' },
                { name: 'fire_safety_profiles', sector: 'fire_safety' },
                { name: 'energy_profiles', sector: 'energy' }
            ];

            const activeTables = sectorFilter === 'all'
                ? tables
                : tables.filter(t => t.sector === sectorFilter);

            const limit = 5000;

            for (const table of activeTables) {
                let from = 0;
                let hasMore = true;

                while (hasMore) {
                    let query = supabase.from(table.name).select('*');

                    const { data, error } = await query
                        .order('created_at', { ascending: false })
                        .range(from, from + limit - 1);

                    if (error) {
                        console.error(`Export failed for ${table.name}:`, error);
                        break;
                    }

                    if (!data || data.length === 0) {
                        hasMore = false;
                        break;
                    }

                    data.forEach(p => {
                        const name = p.full_name || p.current_company || 'Unknown';
                        const title = p.current_title || '';
                        const company = p.current_company || '';
                        const location = p.location || '';
                        const email = p.email || (p.emails && p.emails[0]) || '';
                        const phone = p.phone || (p.phone_numbers && p.phone_numbers[0]) || '';

                        allLeads.push({
                            id: `${table.sector}-${p.id}`,
                            sector: table.sector as RecruitingSector,
                            name,
                            title,
                            company,
                            location,
                            email,
                            phone,
                            sub_sector: p.sub_sector || '',
                            skills: p.skills || [],
                            sources: p.sources || [],
                            timestamp: p.created_at || '',
                            raw: p
                        });
                    });

                    from += limit;
                    if (data.length < limit) hasMore = false;
                    if (allLeads.length >= 100000) hasMore = false;
                }
            }

            let result = allLeads;
            if (search.trim()) {
                const q = search.toLowerCase();
                result = result.filter(l =>
                    l.name.toLowerCase().includes(q) ||
                    l.company.toLowerCase().includes(q) ||
                    l.title.toLowerCase().includes(q) ||
                    l.location.toLowerCase().includes(q) ||
                    l.email.toLowerCase().includes(q)
                );
            }

            const headers = ['Sector', 'Name', 'Title', 'Company', 'Location', 'Email', 'Phone', 'Sub-Sector', 'Sources', 'Added'];
            const csvContent = [
                headers.join(','),
                ...result.map(l => [
                    `"${SECTOR_CONFIG[l.sector]?.label || l.sector}"`,
                    `"${(l.name || '').replace(/"/g, '""')}"`,
                    `"${(l.title || '').replace(/"/g, '""')}"`,
                    `"${(l.company || '').replace(/"/g, '""')}"`,
                    `"${(l.location || '').replace(/"/g, '""')}"`,
                    `"${(l.email || '').replace(/"/g, '""')}"`,
                    `"${(l.phone || '').replace(/"/g, '""')}"`,
                    `"${(l.sub_sector || '').replace(/"/g, '""')}"`,
                    `"${(l.sources || []).join('; ')}"`,
                    `"${l.timestamp ? new Date(l.timestamp).toLocaleDateString() : ''}"`,
                ].join(','))
            ].join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.setAttribute('href', URL.createObjectURL(blob));
            link.setAttribute('download', `recruiting_leads_${new Date().toISOString().slice(0, 10)}.csv`);
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
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                        <Users className="w-8 h-8 text-indigo-400" />
                        Talent Pool
                    </h1>
                    <p className="text-neutral-400 font-medium mt-2">
                        Cross-sector database of job seekers, professionals, and talent profiles
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={downloadCSV}
                        disabled={filtered.length === 0 || isExporting}
                        className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-lg bg-violet-500 text-white hover:bg-violet-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-violet-500/20"
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
                    <button onClick={() => fetchAll()}
                        className="p-2 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white transition-all">
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <div className="flex items-center gap-2 text-xs text-neutral-500 font-medium">
                        <Clock className="w-3.5 h-3.5" />
                        {lastRefresh ? `Updated ${lastRefresh}` : 'Loading...'}
                    </div>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(SECTOR_CONFIG).map(([key, cfg]) => {
                    const count = counts[key] || 0;
                    const Icon = cfg.icon;
                    const isActive = sectorFilter === key;
                    return (
                        <button
                            key={key}
                            onClick={() => setSectorFilter(sectorFilter === key ? 'all' : key)}
                            className={`p-5 rounded-2xl border text-left transition-all group relative overflow-hidden ${isActive
                                ? `${cfg.bg} ${cfg.border} shadow-lg ${cfg.glow}`
                                : 'bg-[#070707]/90 border-white/5 hover:border-white/10'
                                }`}
                        >
                            <div className={`absolute inset-0 bg-gradient-to-br ${isActive ? 'from-white/5 to-transparent' : 'from-transparent to-transparent group-hover:from-white/[0.02]'} transition-all`} />
                            <div className="relative z-10">
                                <div className={`w-10 h-10 rounded-xl ${cfg.bg} ${cfg.border} border flex items-center justify-center mb-3`}>
                                    <Icon className={`w-5 h-5 ${cfg.color}`} />
                                </div>
                                <p className="text-2xl font-black text-white">{count.toLocaleString()}</p>
                                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-500 mt-1">{cfg.label}</p>
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Prominent State & Search */}
            <div className="flex flex-col md:flex-row gap-3">
                <div className="w-full md:w-80 shrink-0">
                    <div className="relative h-full">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-violet-400" />
                        <select value={stateFilter} onChange={e => { setStateFilter(e.target.value); setPage(0); }}
                            className="w-full h-full pl-12 pr-10 py-3.5 bg-violet-500/10 border-2 border-violet-500/30 rounded-2xl text-violet-300 text-base font-black focus:outline-none focus:border-violet-500/60 appearance-none cursor-pointer hover:bg-violet-500/20 transition-all shadow-[0_0_15px_rgba(139,92,246,0.15)]">
                            <option value="all" className="bg-[#0a0a0a] text-white">All Candidate States</option>
                            {Object.entries(STATE_NAMES).map(([abbr, full]) => (
                                <option key={abbr} value={abbr} className="bg-[#0a0a0a] text-white">{full}</option>
                            ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-violet-400 text-xs font-bold">▼</div>
                    </div>
                </div>
                <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                    <input
                        type="text"
                        placeholder="Search by name, company, title, location, or email..."
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(0); }}
                        className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-medium placeholder:text-neutral-600 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition"
                    />
                    {search && (
                        <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white">
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
                {(sectorFilter !== 'all' || search || stateFilter !== 'all' || leadDays !== 'all') && (
                    <button
                        onClick={() => { setSectorFilter('all'); setStateFilter('all'); setLeadDays('all'); setSearch(''); setPage(0); }}
                        className="text-xs font-bold text-violet-400 hover:text-violet-300 px-4 py-2 bg-violet-500/10 rounded-lg border border-violet-500/20 transition-colors whitespace-nowrap"
                    >
                        Clear Filters
                    </button>
                )}
            </div>

            {/* Age Dial Filter */}
            <div className="bg-[#070707] p-6 rounded-2xl border border-white/5 border-t-white/10 shadow-lg relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-violet-500/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
                    <div>
                        <label className="text-base font-black text-white flex items-center gap-2">
                            <Clock className="w-5 h-5 text-purple-400" /> Maximum Pipeline Age
                        </label>
                        <p className="text-xs font-medium text-neutral-500 mt-1">Filter out talent profiles strictly older than this cutoff relative to initial discovery time.</p>
                    </div>

                    <div className={`flex items-center gap-2 px-5 py-2 rounded-xl border-2 transition-colors ${leadDays === 'all' ? 'bg-violet-500/10 border-violet-500/20 shadow-[0_0_15px_rgba(139,92,246,0.1)]' : 'bg-purple-500/10 border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.15)]'}`}>
                        <span className={`text-xl font-black ${leadDays === 'all' ? 'text-violet-400' : 'text-purple-400'}`}>
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
                        className={`w-full h-3 rounded-xl appearance-none cursor-pointer outline-none transition-colors ${leadDays === 'all' ? 'bg-violet-500/20 accent-violet-500 hover:accent-violet-400' : 'bg-purple-500/20 accent-purple-500 hover:accent-purple-400'}`}
                    />
                    <div className="flex justify-between text-[11px] text-neutral-500 font-bold mt-3 px-1 uppercase tracking-wider">
                        <span className={leadDays !== 'all' && Number(leadDays) <= 1 ? "text-purple-400" : ""}>1 Day</span>
                        <span className={leadDays !== 'all' && Number(leadDays) > 1 && Number(leadDays) <= 30 ? "text-purple-400" : ""}>30 Days</span>
                        <span className={leadDays !== 'all' && Number(leadDays) > 30 && Number(leadDays) <= 60 ? "text-purple-400" : ""}>60 Days</span>
                        <span className={leadDays === 'all' ? "text-violet-400" : ""}>All Time (90+)</span>
                    </div>
                </div>
            </div>

            {/* Feed Table */}
            <div className="bg-[#070707]/90 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/5">
                                <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-[0.15em] text-neutral-500">Sector</th>
                                <th className="px-4 py-4 text-left text-[10px] font-black uppercase tracking-[0.15em] text-neutral-500">Name / Title</th>
                                <th className="px-4 py-4 text-left text-[10px] font-black uppercase tracking-[0.15em] text-neutral-500 hidden md:table-cell">Company</th>
                                <th className="px-4 py-4 text-left text-[10px] font-black uppercase tracking-[0.15em] text-neutral-500 hidden lg:table-cell">Contact</th>
                                <th className="px-4 py-4 text-left text-[10px] font-black uppercase tracking-[0.15em] text-neutral-500 hidden xl:table-cell">Location</th>
                                <th className="px-4 py-4 text-left text-[10px] font-black uppercase tracking-[0.15em] text-neutral-500 hidden xl:table-cell">Source</th>
                                <th className="px-4 py-4 text-right text-[10px] font-black uppercase tracking-[0.15em] text-neutral-500">Age</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.03]">
                            {loading ? (
                                Array(10).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-6 py-4"><div className="h-6 bg-white/5 rounded-full w-24" /></td>
                                        <td className="px-4 py-4"><div className="h-4 bg-white/5 rounded w-48" /></td>
                                        <td className="px-4 py-4 hidden md:table-cell"><div className="h-4 bg-white/5 rounded w-32" /></td>
                                        <td className="px-4 py-4 hidden lg:table-cell"><div className="h-4 bg-white/5 rounded w-40" /></td>
                                        <td className="px-4 py-4 hidden xl:table-cell"><div className="h-4 bg-white/5 rounded w-28" /></td>
                                        <td className="px-4 py-4 hidden xl:table-cell"><div className="h-4 bg-white/5 rounded w-20" /></td>
                                        <td className="px-4 py-4"><div className="h-4 bg-white/5 rounded w-16 ml-auto" /></td>
                                    </tr>
                                ))
                            ) : pageLeads.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                                                <User className="w-8 h-8 text-neutral-700" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-neutral-300 text-lg">No profiles found</p>
                                                <p className="text-sm text-neutral-500 mt-1">
                                                    {search || sectorFilter !== 'all' ? 'Try adjusting your search or filters' : 'Run the scrapers to populate recruiting data'}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                pageLeads.map((lead) => {
                                    const cfg = SECTOR_CONFIG[lead.sector];
                                    const Icon = cfg?.icon || User;
                                    return (
                                        <tr key={lead.id} onClick={() => setSelectedProfile(lead)}
                                            className="hover:bg-white/[0.02] transition-colors cursor-pointer group">
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full border ${cfg?.bg} ${cfg?.border} ${cfg?.color}`}>
                                                    <Icon className="w-3.5 h-3.5" />
                                                    {cfg?.label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500/20 to-indigo-500/20 border border-violet-500/30 flex items-center justify-center text-violet-400 font-bold text-sm shrink-0">
                                                        {(lead.name || 'U')[0].toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-white text-sm group-hover:text-violet-300 transition-colors truncate max-w-[220px]">
                                                            {lead.name}
                                                        </p>
                                                        <p className="text-xs text-neutral-500 mt-0.5 truncate max-w-[200px]">
                                                            {lead.title || '—'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 hidden md:table-cell">
                                                <div className="flex items-center gap-1.5 text-sm text-neutral-300 font-medium truncate max-w-[200px]">
                                                    <Building2 className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                                                    {lead.company || '—'}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 hidden lg:table-cell">
                                                <div className="space-y-0.5">
                                                    {lead.email && (
                                                        <p className="text-xs text-indigo-400 font-medium truncate max-w-[200px] flex items-center gap-1">
                                                            <Mail className="w-3 h-3 shrink-0" /> {lead.email}
                                                        </p>
                                                    )}
                                                    {lead.phone && (
                                                        <p className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                                                            <Phone className="w-3 h-3 shrink-0" /> {lead.phone}
                                                        </p>
                                                    )}
                                                    {!lead.email && !lead.phone && <span className="text-xs text-neutral-600">—</span>}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 hidden xl:table-cell">
                                                <span className="text-xs text-neutral-400 font-medium flex items-center gap-1 truncate max-w-[160px]">
                                                    <MapPin className="w-3 h-3 text-neutral-600 shrink-0" />
                                                    {lead.location || '—'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 hidden xl:table-cell">
                                                <span className="text-xs text-neutral-400 font-medium truncate max-w-[120px] inline-block capitalize">
                                                    {(lead.sources && lead.sources.length > 0) ? lead.sources[0].replace(/_/g, ' ') : '—'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 text-right">
                                                <div className="flex flex-col items-end">
                                                    <span className="text-xs text-neutral-300 font-bold tabular-nums">
                                                        {timeAgo(lead.timestamp)}
                                                    </span>
                                                    <span className="text-[10px] text-neutral-600 font-medium mt-0.5">
                                                        {lead.timestamp ? new Date(lead.timestamp).toLocaleDateString() : ''}
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between">
                        <span className="text-xs text-neutral-500 font-medium">
                            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length.toLocaleString()}
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(0, p - 1))}
                                disabled={page === 0}
                                className="p-2 rounded-lg bg-white/5 border border-white/10 text-neutral-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="text-sm font-bold text-neutral-300 px-3">{page + 1} / {totalPages}</span>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                                disabled={page >= totalPages - 1}
                                className="p-2 rounded-lg bg-white/5 border border-white/10 text-neutral-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            {selectedProfile && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedProfile(null)}>
                    <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-white/5 flex items-start justify-between bg-white/[0.02]">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-500/20 to-indigo-500/20 border border-violet-500/30 flex items-center justify-center text-violet-400 text-xl font-bold">
                                    {(selectedProfile.name || 'U')[0].toUpperCase()}
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-white tracking-tight">{selectedProfile.name}</h2>
                                    {selectedProfile.title && <p className="text-violet-400 font-medium">{selectedProfile.title}</p>}
                                    <span className={`inline-flex items-center gap-1 mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${SECTOR_CONFIG[selectedProfile.sector]?.bg} ${SECTOR_CONFIG[selectedProfile.sector]?.border} ${SECTOR_CONFIG[selectedProfile.sector]?.color}`}>
                                        {SECTOR_CONFIG[selectedProfile.sector]?.label}
                                    </span>
                                </div>
                            </div>
                            <button onClick={() => setSelectedProfile(null)} className="p-2 rounded-xl hover:bg-white/10 text-neutral-400 hover:text-white transition-all">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-3">
                                    <div className="flex items-center gap-3 text-sm text-neutral-300">
                                        <Building2 className="w-4 h-4 text-neutral-500" />
                                        <span className="font-medium">{selectedProfile.company || '—'}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-neutral-300">
                                        <MapPin className="w-4 h-4 text-neutral-500" />
                                        <span>{selectedProfile.location || '—'}</span>
                                    </div>
                                    {selectedProfile.sub_sector && (
                                        <div className="flex items-center gap-3 text-sm">
                                            <Briefcase className="w-4 h-4 text-neutral-500" />
                                            <span className="text-neutral-300 font-medium capitalize">{selectedProfile.sub_sector.replace(/_/g, ' ')}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-3">
                                    {selectedProfile.email ? (
                                        <div className="flex items-center gap-3 text-sm">
                                            <Mail className="w-4 h-4 text-indigo-400" />
                                            <a href={`mailto:${selectedProfile.email}`} className="text-indigo-400 hover:text-indigo-300 hover:underline font-medium truncate">{selectedProfile.email}</a>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-3 text-sm text-neutral-500">
                                            <Mail className="w-4 h-4" /> <span>No email</span>
                                        </div>
                                    )}
                                    {selectedProfile.phone ? (
                                        <div className="flex items-center gap-3 text-sm">
                                            <Phone className="w-4 h-4 text-emerald-400" />
                                            <a href={`tel:${selectedProfile.phone}`} className="text-emerald-400 hover:text-emerald-300 font-medium">{selectedProfile.phone}</a>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-3 text-sm text-neutral-500">
                                            <Phone className="w-4 h-4" /> <span>No phone</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {selectedProfile.skills?.length > 0 && (
                                <div>
                                    <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3">Skills & Keywords</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedProfile.skills.map((s, i) => (
                                            <span key={i} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/[0.03] border border-white/10 text-neutral-300">
                                                {s}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {(selectedProfile.certifications?.length ?? 0) > 0 && (
                                <div>
                                    <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3">Certifications</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedProfile.certifications?.map((c, i) => (
                                            <span key={i} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                                                {c}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {selectedProfile.experience_history && Array.isArray(selectedProfile.experience_history) && selectedProfile.experience_history.length > 0 && (
                                <div>
                                    <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3">Experience History</h3>
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
                                        Sources: {(selectedProfile.sources || []).map(s => s.replace(/_/g, ' ')).join(', ') || '—'} • Added {selectedProfile.timestamp ? new Date(selectedProfile.timestamp).toLocaleDateString() : '—'}
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
