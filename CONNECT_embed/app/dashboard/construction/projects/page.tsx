"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import {
    HardHat, MapPin, Search, Calendar, Filter, ChevronLeft, ChevronRight,
    X, ExternalLink, Building2, Briefcase, Clock, ArrowUpDown, ChevronDown, ChevronUp, Download, Mail, Phone
} from 'lucide-react';

interface Project {
    id: number;
    project: string;
    location: string;
    city: string;
    state: string;
    zip: string;
    status: string;
    bid_date: string;
    date_created: string;
    zone_name: string;
    building_use: string;
    construction_type: string;
    project_type: string;
    value_range: string;
    negotiated_work: string;
    gc_selected: string;
    source: string;
    contacts: any;
}

const STATUS_COLORS: Record<string, string> = {
    'GC and Sub Bidding': 'bg-cyan-500/15 text-cyan-400 border-cyan-500/25',
    'Budgeting/Planning': 'bg-purple-500/15 text-purple-400 border-purple-500/25',
    'Awarded': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
    'Sub Bidding Only': 'bg-blue-500/15 text-blue-400 border-blue-500/25',
    'GC Bidding Only': 'bg-indigo-500/15 text-indigo-400 border-indigo-500/25',
    'Completed': 'bg-neutral-500/15 text-neutral-400 border-neutral-500/25',
    'On Hold': 'bg-amber-500/15 text-amber-400 border-amber-500/25',
    'Pre-bidding': 'bg-pink-500/15 text-pink-400 border-pink-500/25',
    'Construction': 'bg-teal-500/15 text-teal-400 border-teal-500/25',
};

const PAGE_SIZE = 25;

export default function ConstructionProjectsPage() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [page, setPage] = useState(0);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [stateFilter, setStateFilter] = useState('');
    const [statuses, setStatuses] = useState<string[]>([]);
    const [states, setStates] = useState<string[]>([]);
    const [expandedProjectId, setExpandedProjectId] = useState<number | null>(null);
    const [nearbyCompanies, setNearbyCompanies] = useState<any[]>([]);
    const [loadingCompanies, setLoadingCompanies] = useState(false);

    const expandedProject = projects.find(p => p.id === expandedProjectId);

    // Load filter options
    useEffect(() => {
        async function loadFilters() {
            const { data: statusData } = await supabase
                .from('construction_projects')
                .select('status')
                .not('status', 'is', null);
            if (statusData) {
                const seen: Record<string, boolean> = {};
                const unique = statusData.map(r => r.status).filter(s => { if (!s || seen[s]) return false; seen[s] = true; return true; }).sort();
                setStatuses(unique);
            }

            const { data: stateData } = await supabase
                .from('construction_projects')
                .select('state')
                .not('state', 'is', null);
            if (stateData) {
                const seen2: Record<string, boolean> = {};
                const unique = stateData.map(r => r.state).filter(s => { if (!s || seen2[s]) return false; seen2[s] = true; return true; }).sort();
                setStates(unique);
            }
        }
        loadFilters();
    }, []);

    const fetchProjects = useCallback(async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('construction_projects')
                .select('*', { count: 'exact' })
                .order('date_created', { ascending: false })
                .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

            if (search) {
                query = query.or(`project.ilike.%${search}%,location.ilike.%${search}%,city.ilike.%${search}%`);
            }
            if (statusFilter) query = query.eq('status', statusFilter);
            if (stateFilter) query = query.eq('state', stateFilter);

            const { data, count, error } = await query;
            if (error) throw error;
            setProjects(data || []);
            setTotalCount(count || 0);
        } catch (err) {
            console.error('Error loading projects:', err);
        } finally {
            setLoading(false);
        }
    }, [page, search, statusFilter, stateFilter]);

    useEffect(() => { fetchProjects(); }, [fetchProjects]);

    // Load nearby companies when a project is expanded
    useEffect(() => {
        if (!expandedProjectId || !expandedProject) return;
        async function loadNearby() {
            setLoadingCompanies(true);
            let query = supabase
                .from('companies')
                .select('*')
                .or("email.neq.,phone.neq.")
                .limit(500);

            if (expandedProject!.state) {
                query = query.eq('state', expandedProject!.state);
            }

            const { data } = await query;
            setNearbyCompanies(data || []);
            setLoadingCompanies(false);
        }
        loadNearby();
    }, [expandedProjectId, expandedProject]);

    const downloadCSV = () => {
        if (!nearbyCompanies.length || !expandedProject) return;

        const headers = ['Company Name', 'City', 'State', 'Phone', 'Email', 'Website'];
        const csvContent = [
            headers.join(','),
            ...nearbyCompanies.map(c => [
                `"${(c.company_name || '').replace(/"/g, '""')}"`,
                `"${(c.city || '').replace(/"/g, '""')}"`,
                `"${(c.state || '').replace(/"/g, '""')}"`,
                `"${(c.phone || '').replace(/"/g, '""')}"`,
                `"${(c.email || '').replace(/"/g, '""')}"`,
                `"${(c.website || '').replace(/"/g, '""')}"`
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `contractors_${expandedProject.project.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const totalPages = Math.ceil(totalCount / PAGE_SIZE);
    const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
    const getStatusChip = (status: string) => STATUS_COLORS[status] || 'bg-neutral-500/15 text-neutral-400 border-neutral-500/25';

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                        <HardHat className="w-8 h-8 text-orange-400" />
                        Construction Projects
                    </h1>
                    <p className="text-neutral-400 font-medium mt-2">
                        {totalCount.toLocaleString()} projects tracked nationwide
                    </p>
                </div>
                <Link href="/dashboard/construction" className="text-sm font-bold text-orange-400 hover:text-orange-300 transition-colors flex items-center gap-1">
                    ← Back to Overview
                </Link>
            </div>

            {/* Search + Filters */}
            <div className="bg-[#070707]/90 backdrop-blur-xl border border-white/5 rounded-2xl p-5 space-y-4">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                    <input
                        type="text"
                        placeholder="Search projects by name, location, or city..."
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white placeholder-neutral-500 text-sm font-medium focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                    />
                    {search && (
                        <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white">
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
                <div className="flex flex-wrap gap-3">
                    <select
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
                        className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-neutral-300 font-medium focus:outline-none focus:border-indigo-500/50 cursor-pointer"
                    >
                        <option value="">All Statuses</option>
                        {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select
                        value={stateFilter}
                        onChange={(e) => { setStateFilter(e.target.value); setPage(0); }}
                        className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-neutral-300 font-medium focus:outline-none focus:border-indigo-500/50 cursor-pointer"
                    >
                        <option value="">All States</option>
                        {states.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    {(statusFilter || stateFilter || search) && (
                        <button
                            onClick={() => { setStatusFilter(''); setStateFilter(''); setSearch(''); setPage(0); }}
                            className="text-xs font-bold text-orange-400 hover:text-orange-300 px-3 py-2 bg-orange-500/10 rounded-lg border border-orange-500/20 transition-colors"
                        >
                            Clear Filters
                        </button>
                    )}
                </div>
            </div>

            {/* Projects Table */}
            <div className="bg-[#070707]/90 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/5">
                                <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-[0.15em] text-neutral-500">Project</th>
                                <th className="px-4 py-4 text-left text-[10px] font-black uppercase tracking-[0.15em] text-neutral-500">Location</th>
                                <th className="px-4 py-4 text-left text-[10px] font-black uppercase tracking-[0.15em] text-neutral-500">Status</th>
                                <th className="px-4 py-4 text-left text-[10px] font-black uppercase tracking-[0.15em] text-neutral-500 hidden lg:table-cell">Type</th>
                                <th className="px-4 py-4 text-left text-[10px] font-black uppercase tracking-[0.15em] text-neutral-500 hidden md:table-cell">Bid Date</th>
                                <th className="px-4 py-4 text-left text-[10px] font-black uppercase tracking-[0.15em] text-neutral-500 hidden md:table-cell">Created</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.03]">
                            {loading ? (
                                Array(8).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-6 py-4"><div className="h-4 bg-white/5 rounded w-48" /></td>
                                        <td className="px-4 py-4"><div className="h-4 bg-white/5 rounded w-32" /></td>
                                        <td className="px-4 py-4"><div className="h-5 bg-white/5 rounded-full w-24" /></td>
                                        <td className="px-4 py-4 hidden lg:table-cell"><div className="h-4 bg-white/5 rounded w-24" /></td>
                                        <td className="px-4 py-4 hidden md:table-cell"><div className="h-4 bg-white/5 rounded w-20" /></td>
                                        <td className="px-4 py-4 hidden md:table-cell"><div className="h-4 bg-white/5 rounded w-20" /></td>
                                    </tr>
                                ))
                            ) : projects.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-16 text-center">
                                        <HardHat className="w-10 h-10 text-neutral-700 mx-auto mb-4" />
                                        <p className="text-neutral-400 font-medium">No projects match your filters</p>
                                    </td>
                                </tr>
                            ) : (
                                projects.map((p) => (
                                    <React.Fragment key={p.id}>
                                        <tr
                                            onClick={() => setExpandedProjectId(expandedProjectId === p.id ? null : p.id)}
                                            className={`hover:bg-white/[0.04] transition-colors cursor-pointer group ${expandedProjectId === p.id ? 'bg-white/[0.02]' : ''}`}
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    {expandedProjectId === p.id ? (
                                                        <ChevronUp className="w-4 h-4 text-orange-400 shrink-0" />
                                                    ) : (
                                                        <ChevronDown className="w-4 h-4 text-neutral-500 group-hover:text-orange-400 shrink-0 transition-colors" />
                                                    )}
                                                    <p className="font-bold text-white text-sm group-hover:text-orange-300 transition-colors truncate max-w-[300px]">
                                                        {p.project || 'Untitled'}
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className="text-xs text-neutral-400 font-medium flex items-center gap-1">
                                                    <MapPin className="w-3 h-3 text-neutral-600" />
                                                    {[p.city, p.state].filter(Boolean).join(', ') || p.location || '—'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className={`text-[11px] font-bold px-3 py-1 rounded-full border ${getStatusChip(p.status)}`}>
                                                    {p.status || '—'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 hidden lg:table-cell">
                                                <span className="text-xs text-neutral-500 font-medium truncate block max-w-[150px]">
                                                    {p.building_use || p.construction_type || '—'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 hidden md:table-cell">
                                                <span className="text-xs text-neutral-500 font-medium">{formatDate(p.bid_date)}</span>
                                            </td>
                                            <td className="px-4 py-4 hidden md:table-cell">
                                                <span className="text-xs text-neutral-500 font-medium">{formatDate(p.date_created)}</span>
                                            </td>
                                        </tr>

                                        {/* Expanded Accordion Content */}
                                        {expandedProjectId === p.id && (
                                            <tr className="bg-black/40 border-b border-white/5">
                                                <td colSpan={6} className="px-0 py-0">
                                                    <div className="p-6 md:p-8 animate-in slide-in-from-top-2 fade-in duration-200">
                                                        <div className="flex flex-col xl:flex-row gap-8">
                                                            {/* Details Column */}
                                                            <div className="flex-1 space-y-6">
                                                                <div>
                                                                    <h2 className="text-xl font-black text-white">{p.project || 'Untitled Project'}</h2>
                                                                    <div className="flex flex-wrap items-center gap-2 mt-3">
                                                                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md border ${getStatusChip(p.status)}`}>
                                                                            {p.status || '—'}
                                                                        </span>
                                                                        {p.gc_selected === 'Yes' && (
                                                                            <span className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                                                                                GC Selected
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-white/[0.02] p-5 rounded-xl border border-white/5">
                                                                    <div className="space-y-3">
                                                                        <h3 className="text-xs font-black text-neutral-400 uppercase tracking-wider flex items-center gap-2">
                                                                            <MapPin className="w-3.5 h-3.5" /> Location
                                                                        </h3>
                                                                        <div className="space-y-1.5">
                                                                            {[
                                                                                ['Address', p.location],
                                                                                ['City / State', [p.city, p.state].filter(Boolean).join(', ')],
                                                                                ['ZIP', p.zip],
                                                                                ['Region', p.zone_name],
                                                                            ].map(([label, value]) => (
                                                                                <div key={label as string} className="flex items-center justify-between py-1 border-b border-white/[0.03]">
                                                                                    <span className="text-[11px] text-neutral-500">{label}</span>
                                                                                    <span className="text-xs text-neutral-300 font-medium text-right max-w-[150px] truncate">{value || '—'}</span>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>

                                                                    <div className="space-y-3">
                                                                        <h3 className="text-xs font-black text-neutral-400 uppercase tracking-wider flex items-center gap-2">
                                                                            <Briefcase className="w-3.5 h-3.5" /> Details
                                                                        </h3>
                                                                        <div className="space-y-1.5">
                                                                            {[
                                                                                ['Bid Date', formatDate(p.bid_date)],
                                                                                ['Created', formatDate(p.date_created)],
                                                                                ['Building Use', p.building_use],
                                                                                ['Type', p.project_type],
                                                                                ['Value Range', p.value_range],
                                                                            ].map(([label, value]) => (
                                                                                <div key={label as string} className="flex items-center justify-between py-1 border-b border-white/[0.03]">
                                                                                    <span className="text-[11px] text-neutral-500">{label}</span>
                                                                                    <span className="text-xs text-neutral-300 font-medium text-right max-w-[150px] truncate">{value || '—'}</span>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <a
                                                                    href={`https://generalcontractor.planhub.com/project/${p.id}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="inline-flex items-center gap-2 text-xs font-bold text-orange-400 hover:text-orange-300 transition-colors bg-orange-500/10 px-4 py-2 rounded-lg border border-orange-500/20"
                                                                >
                                                                    <ExternalLink className="w-3.5 h-3.5" /> Open in PlanHub
                                                                </a>
                                                            </div>

                                                            {/* Contractors Column */}
                                                            <div className="flex-1 xl:max-w-md flex flex-col min-h-0 bg-[#0a0a0a] rounded-xl border border-white/5 overflow-hidden">
                                                                <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                                                                    <h3 className="text-sm font-black text-white flex items-center gap-2">
                                                                        <Building2 className="w-4 h-4 text-orange-400" />
                                                                        Local Contractors
                                                                        {!loadingCompanies && (
                                                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-neutral-300 ml-1">
                                                                                {nearbyCompanies.length}
                                                                            </span>
                                                                        )}
                                                                    </h3>
                                                                    <button
                                                                        onClick={downloadCSV}
                                                                        disabled={loadingCompanies || nearbyCompanies.length === 0}
                                                                        className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-orange-500/20"
                                                                    >
                                                                        <Download className="w-3.5 h-3.5" />
                                                                        Export CSV
                                                                    </button>
                                                                </div>

                                                                <div className="p-4 max-h-[320px] overflow-y-auto space-y-3 custom-scrollbar">
                                                                    {loadingCompanies ? (
                                                                        Array(4).fill(0).map((_, i) => (
                                                                            <div key={i} className="animate-pulse bg-white/[0.02] rounded-lg p-3">
                                                                                <div className="h-3.5 bg-white/10 rounded w-40 mb-2" />
                                                                                <div className="h-2.5 bg-white/5 rounded w-24" />
                                                                            </div>
                                                                        ))
                                                                    ) : nearbyCompanies.length > 0 ? (
                                                                        nearbyCompanies.map((c) => (
                                                                            <div key={c.id} className="bg-white/[0.03] border border-white/5 rounded-lg p-3 hover:bg-white/[0.06] transition-colors group/company">
                                                                                <p className="font-bold text-white text-xs truncate group-hover/company:text-orange-300 transition-colors">{c.company_name}</p>
                                                                                <p className="text-[10px] text-neutral-500 mt-1 truncate">{[c.city, c.state].filter(Boolean).join(', ')}</p>
                                                                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
                                                                                    {c.email && <span className="text-[10px] text-indigo-400 flex items-center gap-1"><Mail className="w-3 h-3" /> {c.email}</span>}
                                                                                    {c.phone && <span className="text-[10px] text-emerald-400 flex items-center gap-1"><Phone className="w-3 h-3" /> {c.phone}</span>}
                                                                                </div>
                                                                            </div>
                                                                        ))
                                                                    ) : (
                                                                        <div className="text-center py-8">
                                                                            <p className="text-xs text-neutral-500 font-medium">No valid contractors found in this state</p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between">
                        <span className="text-xs text-neutral-500 font-medium">
                            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} of {totalCount.toLocaleString()}
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


        </div>
    );
}
