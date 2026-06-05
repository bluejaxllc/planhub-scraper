"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
    Zap, Building2, MapPin, Mail, Phone, Globe, User, Briefcase,
    ChevronLeft, ChevronRight, Clock, Search, Download, Calendar,
    ExternalLink, X, Filter, ChevronDown, Loader, HardHat
} from 'lucide-react';

interface ContractorLead {
    id: number;
    project_planhub_id: number;
    project_name: string;
    bid_date: string | null;
    project_city: string | null;
    project_state: string | null;
    company_name: string | null;
    contact_name: string | null;
    email: string | null;
    phone: string | null;
    contractor_type: string | null;
    contractor_city: string | null;
    contractor_state: string | null;
    company_address: string | null;
    website: string | null;
    scraped_at: string | null;
    lead_source?: string | null;
    company_planhub_id?: string | null;
}

const PAGE_SIZE = 25;

// US state abbreviation to full name map
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
    'DC': 'District of Columbia',
};

function getFullStateName(state: string | null): string {
    if (!state) return '';
    if (state.length === 2) {
        return STATE_NAMES[state.toUpperCase()] || state;
    }
    return state;
}

function formatPhone(phone: string | null): string {
    if (!phone) return '';
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10) {
        return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    if (digits.length === 11 && digits.startsWith('1')) {
        return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
    }
    return phone;
}

function formatBidDate(date: string | null): string {
    if (!date) return '—';
    try {
        const d = new Date(date);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
        return date;
    }
}

function formatTimeAgo(dateStr: string | null): string {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hr${diffHours !== 1 ? 's' : ''} ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
}

export default function LeadFeedPage() {
    const [leads, setLeads] = useState<ContractorLead[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [stateFilter, setStateFilter] = useState('');
    const [showStateDropdown, setShowStateDropdown] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [leadDays, setLeadDays] = useState<string>('all');
    const [sourceFilter, setSourceFilter] = useState('');
    const [showSourceDropdown, setShowSourceDropdown] = useState(false);
    const [sortMode, setSortMode] = useState<'recent' | 'bid_date'>('recent');

    const SOURCE_NAMES: Record<string, string> = {
        'tdlr_texas': 'TDLR Texas',
        'bluebook': 'The Blue Book',
        'sam_gov': 'SAM.gov',
        'planhub': 'PlanHub',
    };
    const availableSources = Object.keys(SOURCE_NAMES);

    // All US states derived from the STATE_NAMES map — no DB query needed
    const availableStates = Object.keys(STATE_NAMES).sort((a, b) =>
        STATE_NAMES[a].localeCompare(STATE_NAMES[b])
    );

    const fetchLeads = useCallback(async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('lead_feed')
                .select('*', { count: 'exact' })
                .order(sortMode === 'bid_date' ? 'bid_date' : 'updated_at', { ascending: sortMode === 'bid_date', nullsFirst: false });

            // Apply search by contact_name or company_name
            if (searchQuery) {
                query = query.or(`contact_name.ilike.%${searchQuery}%,company_name.ilike.%${searchQuery}%`);
            }

            // Apply state filter — match project OR company state by abbreviation or full name
            if (stateFilter) {
                const fullName = STATE_NAMES[stateFilter];
                const stateConditions = [
                    `project_state.ilike.%${stateFilter}%`,
                    `company_state.ilike.%${stateFilter}%`,
                ];
                if (fullName) {
                    stateConditions.push(`project_state.ilike.%${fullName}%`);
                    stateConditions.push(`company_state.ilike.%${fullName}%`);
                }
                query = query.or(stateConditions.join(','));
            }

            // Apply source filter
            if (sourceFilter) {
                query = query.eq('lead_source', sourceFilter);
            }

            // Apply date longevity
            if (leadDays !== 'all') {
                const cutoff = new Date(Date.now() - parseInt(leadDays) * 86400000).toISOString();
                query = query.gte('updated_at', cutoff);
            }

            const from = page * PAGE_SIZE;
            const to = from + PAGE_SIZE - 1;

            const { data, count, error } = await query.range(from, to);

            if (error) throw error;
            setTotalCount(count || 0);

            if (!data) {
                setLeads([]);
                return;
            }

            const mappedLeads: ContractorLead[] = data.map(item => ({
                id: item.lead_id,
                project_planhub_id: item.project_planhub_id,
                project_name: item.project_name || '—',
                bid_date: item.bid_date || null,
                project_city: item.project_city || null,
                project_state: item.project_state || null,
                company_name: item.company_name || null,
                contact_name: item.contact_name || null,
                email: item.email || null,
                phone: item.phone || null,
                contractor_type: item.industry_type || null,
                contractor_city: item.company_city || null,
                contractor_state: item.company_state || null,
                company_address: item.company_address || null,
                website: item.website || null,
                scraped_at: item.updated_at || item.scraped_at || null,
                lead_source: item.lead_source || null,
                company_planhub_id: item.company_planhub_id || null,
            }));

            setLeads(mappedLeads);
        } catch (err) {
            console.error('Lead feed error:', err);
        } finally {
            setLoading(false);
        }
    }, [page, searchQuery, stateFilter, sourceFilter, leadDays, sortMode]);

    useEffect(() => { fetchLeads(); }, [fetchLeads]);

    const totalPages = Math.ceil(totalCount / PAGE_SIZE);

    const handleExportCSV = async () => {
        setIsExporting(true);
        try {
            let query = supabase
                .from('lead_feed')
                .select('*')
                .order('updated_at', { ascending: false });

            if (searchQuery) query = query.or(`contact_name.ilike.%${searchQuery}%,company_name.ilike.%${searchQuery}%`);
            if (stateFilter) {
                const fullName = STATE_NAMES[stateFilter];
                const stateConditions = [
                    `project_state.ilike.%${stateFilter}%`,
                    `company_state.ilike.%${stateFilter}%`,
                ];
                if (fullName) {
                    stateConditions.push(`project_state.ilike.%${fullName}%`);
                    stateConditions.push(`company_state.ilike.%${fullName}%`);
                }
                query = query.or(stateConditions.join(','));
            }
            if (sourceFilter) {
                query = query.eq('lead_source', sourceFilter);
            }
            if (leadDays !== 'all') {
                const cutoff = new Date(Date.now() - parseInt(leadDays) * 86400000).toISOString();
                query = query.gte('updated_at', cutoff);
            }

            const { data, error } = await query.limit(50000); // 50k limit for CSV
            if (error) throw error;
            if (!data) return;

            const headers = [
                'Discovered At', 'Project Name', 'Project ID', 'Bid Date', 'Project City', 'Project State',
                'Company Name', 'Contact Name', 'Email', 'Phone',
                'Source', 'Contractor Type', 'Contractor City', 'Contractor State', 'Address', 'Website'
            ];
            const rows = data.map(item => [
                item.scraped_at ? formatTimeAgo(item.scraped_at) : '—',
                item.project_name || '—',
                item.project_planhub_id || '—',
                item.bid_date || '—',
                item.project_city || '—',
                item.project_state || '—',
                item.company_name || '—',
                item.contact_name || '—',
                item.email || '—',
                item.phone || '—',
                item.lead_source ? (SOURCE_NAMES[item.lead_source] || item.lead_source) : '—',
                item.industry_type || '—',
                item.company_city || '—',
                item.company_state || '—',
                item.company_address || '—',
                item.website || '—'
            ]);

            const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", `lead_feed_${stateFilter || 'all'}_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            console.error('Export error:', err);
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center">
                            <Zap className="w-5 h-5 text-indigo-400" />
                        </div>
                        Intelligence Contractors Feed
                    </h1>
                    <p className="text-neutral-400 font-medium mt-2 ml-[52px]">
                        {totalCount.toLocaleString()} contractor leads across all projects
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-xs text-neutral-500 font-medium">
                        <Clock className="w-4 h-4" />
                        Multi-Source Intelligence Sync
                    </div>
                    <button
                        onClick={handleExportCSV}
                        disabled={leads.length === 0 || isExporting}
                        className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-neutral-300 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm font-bold flex items-center gap-2"
                    >
                        {isExporting ? (
                            <>
                                <Loader className="w-4 h-4 animate-spin" />
                                Exporting...
                            </>
                        ) : (
                            <>
                                <Download className="w-4 h-4" />
                                Export CSV
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Sort Mode Tabs */}
            <div className="flex gap-1 bg-white/[0.03] border border-white/5 rounded-xl p-1">
                <button
                    onClick={() => { setSortMode('recent'); setPage(0); }}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${sortMode === 'recent'
                        ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 shadow-lg shadow-indigo-500/10'
                        : 'text-neutral-500 hover:text-neutral-300 hover:bg-white/[0.03] border border-transparent'
                        }`}
                >
                    <Clock className="w-4 h-4" />
                    Recently Enriched
                </button>
                <button
                    onClick={() => { setSortMode('bid_date'); setPage(0); }}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${sortMode === 'bid_date'
                        ? 'bg-orange-500/15 text-orange-300 border border-orange-500/30 shadow-lg shadow-orange-500/10'
                        : 'text-neutral-500 hover:text-neutral-300 hover:bg-white/[0.03] border border-transparent'
                        }`}
                >
                    <Calendar className="w-4 h-4" />
                    By Bid Deadline
                </button>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-wrap gap-3">
                {/* Search bar */}
                <div className="relative flex-1 min-w-[240px] max-w-md">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                    <input
                        type="text"
                        placeholder="Search by contact name..."
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-sm font-medium placeholder:text-neutral-500 focus:outline-none focus:border-indigo-500/40 focus:bg-white/[0.06] transition-all"
                    />
                    {searchQuery && (
                        <button onClick={() => { setSearchQuery(''); setPage(0); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white">
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* State filter dropdown */}
                <div className="relative">
                    <button
                        onClick={() => setShowStateDropdown(!showStateDropdown)}
                        className={`px-4 py-2.5 rounded-xl text-sm font-bold border flex items-center gap-2 transition-all ${stateFilter
                            ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300'
                            : 'bg-white/[0.04] border-white/10 text-neutral-400 hover:bg-white/[0.06] hover:text-white'
                            }`}
                    >
                        <Filter className="w-4 h-4" />
                        {stateFilter ? getFullStateName(stateFilter) : 'All States'}
                        <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                    {showStateDropdown && (
                        <div className="absolute top-12 left-0 z-50 w-56 max-h-72 overflow-y-auto bg-[#111] border border-white/10 rounded-xl shadow-2xl py-1">
                            <button
                                onClick={() => { setStateFilter(''); setShowStateDropdown(false); setPage(0); }}
                                className={`w-full text-left px-4 py-2 text-sm font-medium hover:bg-white/5 transition-colors ${!stateFilter ? 'text-indigo-400' : 'text-neutral-300'}`}
                            >
                                All States
                            </button>
                            {availableStates.map(s => (
                                <button
                                    key={s}
                                    onClick={() => { setStateFilter(s); setShowStateDropdown(false); setPage(0); }}
                                    className={`w-full text-left px-4 py-2 text-sm font-medium hover:bg-white/5 transition-colors ${stateFilter === s ? 'text-indigo-400' : 'text-neutral-300'}`}
                                >
                                    {getFullStateName(s)}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Source filter dropdown */}
                <div className="relative">
                    <button
                        onClick={() => setShowSourceDropdown(!showSourceDropdown)}
                        className={`px-4 py-2.5 rounded-xl text-sm font-bold border flex items-center gap-2 transition-all ${sourceFilter
                            ? 'bg-orange-500/10 border-orange-500/30 text-orange-300'
                            : 'bg-white/[0.04] border-white/10 text-neutral-400 hover:bg-white/[0.06] hover:text-white'
                            }`}
                    >
                        <Filter className="w-4 h-4" />
                        {sourceFilter ? SOURCE_NAMES[sourceFilter] : 'All Sources'}
                        <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                    {showSourceDropdown && (
                        <div className="absolute top-12 left-0 z-50 w-56 max-h-72 overflow-y-auto bg-[#111] border border-white/10 rounded-xl shadow-2xl py-1">
                            <button
                                onClick={() => { setSourceFilter(''); setShowSourceDropdown(false); setPage(0); }}
                                className={`w-full text-left px-4 py-2 text-sm font-medium hover:bg-white/5 transition-colors ${!sourceFilter ? 'text-orange-400' : 'text-neutral-300'}`}
                            >
                                All Sources
                            </button>
                            {availableSources.map(s => (
                                <button
                                    key={s}
                                    onClick={() => { setSourceFilter(s); setShowSourceDropdown(false); setPage(0); }}
                                    className={`w-full text-left px-4 py-2 text-sm font-medium hover:bg-white/5 transition-colors ${sourceFilter === s ? 'text-orange-400' : 'text-neutral-300'}`}
                                >
                                    {SOURCE_NAMES[s]}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {stateFilter && (
                    <button
                        onClick={() => { setStateFilter(''); setPage(0); }}
                        className="px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-bold flex items-center gap-1.5 hover:bg-red-500/20 transition-all"
                    >
                        <X className="w-3.5 h-3.5" />
                        Clear State
                    </button>
                )}

                {sourceFilter && (
                    <button
                        onClick={() => { setSourceFilter(''); setPage(0); }}
                        className="px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-bold flex items-center gap-1.5 hover:bg-red-500/20 transition-all"
                    >
                        <X className="w-3.5 h-3.5" />
                        Clear Source
                    </button>
                )}
            </div>

            {/* Age Dial Filter */}
            <div className="bg-[#070707] p-6 rounded-2xl border border-white/5 border-t-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)] relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-transparent to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
                    <div>
                        <label className="text-base font-black text-white flex items-center gap-2">
                            <HardHat className="w-5 h-5 text-orange-400" /> Maximum Lead Age
                        </label>
                        <p className="text-xs font-medium text-neutral-500 mt-1">Filter out leads strictly older than this cutoff relative to ingestion time.</p>
                    </div>

                    <div className={`flex items-center gap-2 px-5 py-2 rounded-xl border-2 transition-colors ${leadDays === 'all' ? 'bg-indigo-500/10 border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.1)]' : 'bg-orange-500/10 border-orange-500/30 shadow-[0_0_15px_rgba(249,115,22,0.15)]'}`}>
                        <span className={`text-xl font-black ${leadDays === 'all' ? 'text-indigo-400' : 'text-orange-400'}`}>
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
                        className={`w-full h-3 rounded-xl appearance-none cursor-pointer outline-none transition-colors ${leadDays === 'all' ? 'bg-indigo-500/20 accent-indigo-500 hover:accent-indigo-400' : 'bg-orange-500/20 accent-orange-500 hover:accent-orange-400'}`}
                    />
                    <div className="flex justify-between text-[11px] text-neutral-500 font-bold mt-3 px-1 uppercase tracking-wider">
                        <span className={leadDays !== 'all' && Number(leadDays) <= 1 ? "text-orange-400" : ""}>1 Day</span>
                        <span className={leadDays !== 'all' && Number(leadDays) > 1 && Number(leadDays) <= 30 ? "text-orange-400" : ""}>30 Days</span>
                        <span className={leadDays !== 'all' && Number(leadDays) > 30 && Number(leadDays) <= 60 ? "text-orange-400" : ""}>60 Days</span>
                        <span className={leadDays === 'all' ? "text-indigo-400" : ""}>All Time (90+)</span>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-[#070707]/90 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.5)]">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/[0.02]">
                                <th className="px-5 py-4 text-[10px] font-black uppercase tracking-[0.15em] text-neutral-500 whitespace-nowrap min-w-[120px]">Discovered</th>
                                <th className="px-5 py-4 text-[10px] font-black uppercase tracking-[0.15em] text-neutral-500 whitespace-nowrap min-w-[220px]">Project Name</th>
                                <th className="px-4 py-4 text-[10px] font-black uppercase tracking-[0.15em] text-neutral-500 whitespace-nowrap">Bid Date</th>
                                <th className="px-4 py-4 text-[10px] font-black uppercase tracking-[0.15em] text-neutral-500 whitespace-nowrap">Project Location</th>
                                <th className="px-4 py-4 text-[10px] font-black uppercase tracking-[0.15em] text-neutral-500 whitespace-nowrap min-w-[180px]">Company</th>
                                <th className="px-4 py-4 text-[10px] font-black uppercase tracking-[0.15em] text-neutral-500 whitespace-nowrap">Contact</th>
                                <th className="px-4 py-4 text-[10px] font-black uppercase tracking-[0.15em] text-neutral-500 whitespace-nowrap">Email</th>
                                <th className="px-4 py-4 text-[10px] font-black uppercase tracking-[0.15em] text-neutral-500 whitespace-nowrap">Phone</th>
                                <th className="px-4 py-4 text-[10px] font-black uppercase tracking-[0.15em] text-neutral-500 whitespace-nowrap">Source</th>
                                <th className="px-4 py-4 text-[10px] font-black uppercase tracking-[0.15em] text-neutral-500 whitespace-nowrap">Type</th>
                                <th className="px-4 py-4 text-[10px] font-black uppercase tracking-[0.15em] text-neutral-500 whitespace-nowrap">Contractor Location</th>
                                <th className="px-4 py-4 text-[10px] font-black uppercase tracking-[0.15em] text-neutral-500 whitespace-nowrap min-w-[200px]">Address</th>
                                <th className="px-4 py-4 text-[10px] font-black uppercase tracking-[0.15em] text-neutral-500 whitespace-nowrap">Website</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.03]">
                            {loading ? (
                                Array(10).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        {Array(12).fill(0).map((_, j) => (
                                            <td key={j} className="px-5 py-4">
                                                <div className="h-4 bg-white/5 rounded w-20" />
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : leads.length === 0 ? (
                                <tr>
                                    <td colSpan={12} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                                                <Briefcase className="w-8 h-8 text-neutral-700" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-neutral-300 text-lg">No contractors found</p>
                                                <p className="text-sm text-neutral-500 mt-1">Try adjusting your search or filters</p>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                leads.map((lead) => (
                                    <tr key={lead.id} className="hover:bg-white/[0.02] transition-colors group">
                                        {/* Discovered At */}
                                        <td className="px-5 py-3.5">
                                            <span className="text-xs text-neutral-400 font-medium whitespace-nowrap">
                                                {formatTimeAgo(lead.scraped_at)}
                                            </span>
                                        </td>

                                        {/* Project Name */}
                                        <td className="px-5 py-3.5">
                                            {lead.project_name ? (
                                                <a href={`/dashboard/construction?tab=projects&p=${encodeURIComponent(lead.project_name)}`} className="font-bold text-white text-sm hover:text-indigo-400 transition-colors truncate max-w-[260px] block" title={lead.project_name}>
                                                    {lead.project_name}
                                                </a>
                                            ) : (
                                                <p className="font-bold text-white text-sm group-hover:text-indigo-300 transition-colors truncate max-w-[260px]" title={lead.project_name}>
                                                    {lead.project_name}
                                                </p>
                                            )}
                                            {lead.project_planhub_id && (
                                                <p className="text-[11px] text-neutral-600 mt-0.5 font-mono">
                                                    ID: {lead.project_planhub_id}
                                                </p>
                                            )}
                                        </td>

                                        {/* Bid Date */}
                                        <td className="px-4 py-3.5">
                                            <span className="text-xs text-neutral-400 font-medium flex items-center gap-1.5 whitespace-nowrap">
                                                <Calendar className="w-3.5 h-3.5 text-neutral-600 shrink-0" />
                                                {formatBidDate(lead.bid_date)}
                                            </span>
                                        </td>

                                        {/* Project Location */}
                                        <td className="px-4 py-3.5">
                                            {(lead.project_city || lead.project_state) ? (
                                                <span className="text-xs text-neutral-300 font-medium flex items-center gap-1.5 whitespace-nowrap">
                                                    <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                                    {[lead.project_city, getFullStateName(lead.project_state)].filter(Boolean).join(', ')}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-neutral-600">—</span>
                                            )}
                                        </td>

                                        {/* Company Name */}
                                        <td className="px-4 py-3.5">
                                            {lead.company_name ? (
                                                <a href={`/dashboard/construction?tab=companies&c=${encodeURIComponent(lead.company_name)}`} className="text-sm text-neutral-200 hover:text-indigo-400 font-medium truncate block max-w-[200px]" title={lead.company_name || ''}>
                                                    {lead.company_name}
                                                </a>
                                            ) : (
                                                <span className="text-sm text-neutral-200 font-medium truncate block max-w-[200px]" title={lead.company_name || ''}>
                                                    {lead.company_name || <span className="text-neutral-600 italic">—</span>}
                                                </span>
                                            )}
                                        </td>

                                        {/* Contact Name */}
                                        <td className="px-4 py-3.5">
                                            {lead.contact_name ? (
                                                <span className="text-xs text-neutral-300 font-medium flex items-center gap-1.5 whitespace-nowrap">
                                                    <User className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                                                    <span className="truncate max-w-[140px]">{lead.contact_name}</span>
                                                </span>
                                            ) : (
                                                <span className="text-xs text-neutral-600">—</span>
                                            )}
                                        </td>

                                        {/* Email */}
                                        <td className="px-4 py-3.5">
                                            {lead.email ? (
                                                <a
                                                    href={`mailto:${lead.email}`}
                                                    className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1.5 transition-colors truncate max-w-[180px]"
                                                    title={lead.email}
                                                >
                                                    <Mail className="w-3.5 h-3.5 shrink-0" />
                                                    <span className="truncate">{lead.email}</span>
                                                </a>
                                            ) : (
                                                <span className="text-xs text-neutral-600">—</span>
                                            )}
                                        </td>

                                        {/* Phone */}
                                        <td className="px-4 py-3.5">
                                            {lead.phone ? (
                                                <a
                                                    href={`tel:${lead.phone}`}
                                                    className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap"
                                                >
                                                    <Phone className="w-3.5 h-3.5 shrink-0" />
                                                    {formatPhone(lead.phone)}
                                                </a>
                                            ) : (
                                                <span className="text-xs text-neutral-600">—</span>
                                            )}
                                        </td>

                                        {/* Source */}
                                        <td className="px-4 py-3.5">
                                            {lead.lead_source ? (
                                                <span className="text-[10px] font-bold px-2.5 py-1 rounded-md border border-white/10 bg-white/5 text-neutral-300 whitespace-nowrap">
                                                    {SOURCE_NAMES[lead.lead_source] || lead.lead_source}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-neutral-600">—</span>
                                            )}
                                        </td>

                                        {/* Contractor Type */}
                                        <td className="px-4 py-3.5">
                                            {lead.contractor_type ? (
                                                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 whitespace-nowrap">
                                                    {lead.contractor_type}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-neutral-600">—</span>
                                            )}
                                        </td>

                                        {/* Contractor Location */}
                                        <td className="px-4 py-3.5">
                                            {(lead.contractor_city || lead.contractor_state) ? (
                                                <span className="text-xs text-neutral-400 font-medium whitespace-nowrap">
                                                    {[lead.contractor_city, getFullStateName(lead.contractor_state)].filter(Boolean).join(', ')}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-neutral-600">—</span>
                                            )}
                                        </td>

                                        {/* Contractor Address */}
                                        <td className="px-4 py-3.5">
                                            {lead.company_address ? (
                                                <span className="text-xs text-neutral-400 font-medium whitespace-nowrap truncate block max-w-[200px]" title={lead.company_address}>
                                                    {lead.company_address}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-neutral-600">—</span>
                                            )}
                                        </td>

                                        {/* Website */}
                                        <td className="px-4 py-3.5">
                                            {lead.website ? (
                                                <a
                                                    href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1.5 transition-colors truncate max-w-[140px]"
                                                    title={lead.website}
                                                >
                                                    <Globe className="w-3.5 h-3.5 shrink-0" />
                                                    <span className="truncate">{lead.website.replace(/^https?:\/\/(www\.)?/, '')}</span>
                                                </a>
                                            ) : (
                                                <span className="text-xs text-neutral-600">—</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between bg-black/30">
                        <span className="text-xs text-neutral-500 font-medium">
                            Showing <span className="font-bold text-white">{page * PAGE_SIZE + 1}</span> — <span className="font-bold text-white">{Math.min((page + 1) * PAGE_SIZE, totalCount)}</span> of <span className="font-bold text-white">{totalCount.toLocaleString()}</span>
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(0, p - 1))}
                                disabled={page === 0}
                                className="p-2 rounded-lg bg-white/5 border border-white/10 text-neutral-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="text-sm font-bold text-neutral-300 px-3 tabular-nums">{page + 1} / {totalPages.toLocaleString()}</span>
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
        </div>
    );
}
