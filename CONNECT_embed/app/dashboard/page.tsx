"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { Zap, TrendingUp, Users, Mail, ArrowRight, Activity, Clock, Database, Sparkles, ChevronRight, BarChart3, Radio, UtilityPole, HardHat, User, Fuel, CheckCircle2, XCircle, RefreshCw, FileText, Building2, Flame } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useUser } from '@/lib/UserContext';

interface SectorStat {
    id: string;
    table: string;
    label: string;
    count: number;
    icon: any;
    color: string;
    href: string;
}

interface SourceStat {
    name: string;
    sector: string;
    records: number;
    runs?: number;
    status: 'active' | 'completed' | 'failed' | 'running' | 'empty';
    last_run?: string;
    type: 'pipeline' | 'scraper';
}

export default function DashboardOverview() {
    const { user, persona, hasSector, isSuperAdmin } = useUser();
    const [sectorStats, setSectorStats] = useState<SectorStat[]>([]);
    const [recentItems, setRecentItems] = useState<any[]>([]);
    const [totalRecords, setTotalRecords] = useState(0);
    const [sourceStats, setSourceStats] = useState<SourceStat[]>([]);
    const [loading, setLoading] = useState(true);

    // Time-based greeting
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 17) return 'Good afternoon';
        return 'Good evening';
    };
    const displayName = user?.display_name?.split(' ')[0] || 'there';

    useEffect(() => {
        fetchDashboardData();
    }, [persona]);

    const fetchDashboardData = async () => {
        try {
            const allSectors = [
                { id: 'construction', table: 'project_companies', label: 'Lead Feed', icon: FileText, color: 'cyan', href: '/dashboard/construction' },
                { id: 'construction', table: 'companies', label: 'Companies', icon: Building2, color: 'orange', href: '/dashboard/construction' },
                { id: 'construction', table: 'construction_projects', label: 'Projects', icon: HardHat, color: 'rose', href: '/dashboard/construction' },
                { id: 'oil_gas', table: 'oil_gas_profiles', label: 'Oil & Gas', icon: Fuel, color: 'indigo', href: '/dashboard/oil-gas' },
                { id: 'telecom', table: 'telecom_profiles', label: 'Telecom', icon: Radio, color: 'blue', href: '/dashboard/telecom' },
                { id: 'energy', table: 'energy_profiles', label: 'Energy', icon: UtilityPole, color: 'amber', href: '/dashboard/energy' },
                { id: 'fire_safety', table: 'fire_safety_profiles', label: 'Fire & Safety', icon: Flame, color: 'red', href: '/dashboard/fire-safety' },
            ];

            const visibleSectors = allSectors.filter(s => isSuperAdmin || hasSector(s.id as any));
            const results: SectorStat[] = [];
            let total = 0;

            // Fetch enrichment table counts from Turso
            const tursoTables = ['companies', 'construction_projects', 'project_companies'];
            let tursoCounts: Record<string, number> = {};
            try {
                const tcRes = await fetch('/api/enrichment?mode=sector_counts');
                if (tcRes.ok) tursoCounts = await tcRes.json();
            } catch {}

            for (const s of visibleSectors) {
                let c = 0;
                if (tursoTables.includes(s.table)) {
                    c = tursoCounts[s.table] || 0;
                } else {
                    const { count, error } = await supabase
                        .from(s.table)
                        .select('*', { count: 'exact', head: true });
                    c = error ? 0 : (count || 0);
                }
                total += c;
                results.push({ ...s, count: c });
            }

            setSectorStats(results);
            setTotalRecords(total);

            // Fetch recent items based on persona
            if (persona === 'estimator') {
                // Fetch from Turso API
                const [projRes, compRes, leadsRes] = await Promise.all([
                    fetch('/api/enrichment?mode=recent_projects&limit=4').then(r => r.json()),
                    fetch('/api/enrichment?mode=recent_companies&limit=4').then(r => r.json()),
                    supabase.from('lead_feed').select('id, company_name, project_name, contractor_state, updated_at').order('updated_at', { ascending: false }).limit(4),
                ]);
                const projectsRes = { data: projRes.data || [] };
                const companiesRes = { data: compRes.data || [] };

                const combined = [
                    ...(projectsRes.data || []).map((d: any) => ({
                        id: d.id,
                        full_name: d.project,
                        current_title: [d.city, d.state].filter(Boolean).join(', '),
                        current_company: 'New Project Bid',
                        created_at: d.bid_date,
                        sector: 'Project',
                        type: 'project'
                    })),
                    ...(companiesRes.data || []).map((d: any) => ({
                        id: d.id,
                        full_name: d.company_name,
                        current_title: d.industry_type,
                        current_company: d.state,
                        created_at: d.last_enriched_at,
                        sector: 'Company',
                        type: 'company'
                    })),
                    ...(leadsRes.data || []).map(d => ({
                        id: d.id,
                        full_name: d.company_name,
                        current_title: d.project_name,
                        current_company: d.contractor_state,
                        created_at: d.updated_at,
                        sector: 'Lead',
                        type: 'profile'
                    })),
                ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 8);
                setRecentItems(combined);
            } else {
                const [telecomRes, energyRes] = await Promise.all([
                    supabase.from('telecom_profiles').select('id, full_name, current_title, current_company, created_at').order('created_at', { ascending: false }).limit(3),
                    supabase.from('energy_profiles').select('id, full_name, current_title, current_company, created_at').order('created_at', { ascending: false }).limit(3),
                ]);

                const combined = [
                    ...(telecomRes.data || []).map(d => ({ ...d, sector: 'Telecom', type: 'profile' })),
                    ...(energyRes.data || []).map(d => ({ ...d, sector: 'Energy', type: 'profile' })),
                ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);
                setRecentItems(combined);
            }

            // Fetch unified source breakdown from all tables
            try {
                const allSources: SourceStat[] = [];

                // Friendly name map for raw source values
                const friendlyNames: Record<string, string> = {
                    'planhub': 'PlanHub Companies',
                    'sam_gov': 'SAM.gov (Federal)',
                    'bluebook': 'BlueBook Network',
                    'tdlr_texas': 'TDLR Texas Licenses',
                    'manually_scraped_private_projects_blackridge': 'Blackridge Projects',
                    'planhub-supplier': 'PlanHub Supplier Projects',
                    'manually_scraped_private_projects_ph_sourced': 'PlanHub Sourced Projects',
                    'cal': 'CAL Projects',
                };

                // 1 & 2. Companies + Projects by source (from Turso)
                try {
                    const srcRes = await fetch('/api/enrichment?mode=source_counts');
                    if (srcRes.ok) {
                        const { companySources, projectSources } = await srcRes.json();
                        for (const row of (companySources || [])) {
                            allSources.push({
                                name: friendlyNames[row.source] || row.source,
                                sector: 'construction',
                                records: Number(row.count),
                                status: Number(row.count) > 0 ? 'active' : 'empty',
                                type: 'pipeline',
                            });
                        }
                        for (const row of (projectSources || [])) {
                            allSources.push({
                                name: friendlyNames[row.source] || row.source,
                                sector: 'construction',
                                records: Number(row.count),
                                status: Number(row.count) > 0 ? 'active' : 'empty',
                                type: 'pipeline',
                            });
                        }
                    }
                } catch {}

                // 3. Lead feed (all PlanHub)
                const { count: leadCount } = await supabase
                    .from('lead_feed').select('*', { count: 'exact', head: true });
                allSources.push({
                    name: 'PlanHub Lead Feed',
                    sector: 'leads',
                    records: leadCount || 0,
                    status: (leadCount || 0) > 0 ? 'active' : 'empty',
                    type: 'pipeline',
                });

                // 4. Sector profile tables
                const profileTables = [
                    { table: 'telecom_profiles', name: 'Telecom Profiles', sector: 'telecom' },
                    { table: 'oil_gas_profiles', name: 'Oil & Gas Profiles', sector: 'oil_gas' },
                    { table: 'fire_safety_profiles', name: 'Fire Safety Profiles', sector: 'fire_safety' },
                    { table: 'energy_profiles', name: 'Energy Profiles', sector: 'energy' },
                    { table: 'finishes_profiles', name: 'Finishes Profiles', sector: 'finishes' },
                    { table: 'sitework_profiles', name: 'Sitework Profiles', sector: 'sitework' },
                ];
                for (const pt of profileTables) {
                    const { count: ptCount } = await supabase
                        .from(pt.table).select('*', { count: 'exact', head: true });
                    if ((ptCount || 0) > 0) {
                        allSources.push({
                            name: pt.name,
                            sector: pt.sector,
                            records: ptCount || 0,
                            status: 'active',
                            type: 'pipeline',
                        });
                    }
                }

                // 5. Scraper runs (grouped by scraper_name)
                const { data: runs } = await supabase
                    .from('scraper_runs')
                    .select('scraper_name,sector,records_found,records_new,status,started_at')
                    .order('started_at', { ascending: false })
                    .limit(200);

                if (runs) {
                    const grouped: Record<string, { name: string; sector: string; records: number; runs: number; status: string; last_run: string }> = {};
                    for (const run of runs) {
                        const key = run.scraper_name;
                        if (!grouped[key]) {
                            grouped[key] = {
                                name: run.scraper_name,
                                sector: run.sector,
                                records: 0,
                                runs: 0,
                                status: run.status,
                                last_run: run.started_at,
                            };
                        }
                        grouped[key].records += run.records_new || 0;
                        grouped[key].runs += 1;
                    }
                    for (const g of Object.values(grouped)) {
                        // Skip if already covered by a profile table
                        if (allSources.find(s => s.name === g.name)) continue;
                        allSources.push({
                            name: g.name,
                            sector: g.sector,
                            records: g.records,
                            runs: g.runs,
                            status: g.status === 'completed' ? 'completed' : g.status === 'failed' ? 'failed' : 'running',
                            last_run: g.last_run,
                            type: 'scraper',
                        });
                    }
                }

                setSourceStats(allSources.sort((a, b) => b.records - a.records));
            } catch (err) {
                console.error('Source stats error:', err);
            }
        } catch (err) {
            console.error('Dashboard data error:', err);
        } finally {
            setLoading(false);
        }
    };

    const colorMap: Record<string, { gradient: string; glow: string; bgIcon: string; text: string }> = {
        blue: { gradient: 'from-blue-500 to-blue-600', glow: 'shadow-blue-500/20', bgIcon: 'bg-blue-500/10 border-blue-500/20', text: 'text-blue-400' },
        amber: { gradient: 'from-amber-500 to-amber-600', glow: 'shadow-amber-500/20', bgIcon: 'bg-amber-500/10 border-amber-500/20', text: 'text-amber-400' },
        orange: { gradient: 'from-orange-500 to-red-600', glow: 'shadow-orange-500/20', bgIcon: 'bg-orange-500/10 border-orange-500/20', text: 'text-orange-400' },
        indigo: { gradient: 'from-indigo-500 to-indigo-600', glow: 'shadow-indigo-500/20', bgIcon: 'bg-indigo-500/10 border-indigo-500/20', text: 'text-indigo-400' },
        cyan: { gradient: 'from-cyan-500 to-teal-600', glow: 'shadow-cyan-500/20', bgIcon: 'bg-cyan-500/10 border-cyan-500/20', text: 'text-cyan-400' },
        rose: { gradient: 'from-rose-500 to-pink-600', glow: 'shadow-rose-500/20', bgIcon: 'bg-rose-500/10 border-rose-500/20', text: 'text-rose-400' },
        red: { gradient: 'from-red-500 to-rose-600', glow: 'shadow-red-500/20', bgIcon: 'bg-red-500/10 border-red-500/20', text: 'text-red-400' },
    };

    return (
        <div className="space-y-8">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                        {getGreeting()}, {displayName}
                        <span className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 ml-2">
                            <Zap className="w-3 h-3" /> Pro
                        </span>
                    </h1>
                    <p className="text-neutral-400 font-medium mt-2">
                        {persona === 'estimator'
                            ? 'Your construction intelligence command center'
                            : 'Your real-time intelligence overview'}
                    </p>
                </div>
            </div>

            {/* Total + Sector Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-7 gap-4">
                {/* Total Records Card */}
                <div className="group relative bg-[#070707]/90 backdrop-blur-xl border border-white/5 rounded-2xl p-6 shadow-lg shadow-indigo-500/20 hover:border-white/10 transition-all duration-300 overflow-hidden hover:-translate-y-1">
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-500" />
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                                <Database className="w-6 h-6 text-indigo-400" />
                            </div>
                            <Sparkles className="w-4 h-4 text-neutral-700 group-hover:text-neutral-500 transition-colors" />
                        </div>
                        <div className="space-y-1">
                            {loading ? (
                                <div className="h-8 bg-white/10 rounded-lg w-20 animate-pulse" />
                            ) : (
                                <p className="text-3xl font-black text-white tracking-tight">{totalRecords.toLocaleString()}</p>
                            )}
                            <p className="text-sm font-semibold text-neutral-400 uppercase tracking-wider">Total Records</p>
                        </div>
                    </div>
                </div>

                {/* Per-sector cards */}
                {sectorStats.map((sector) => {
                    const c = colorMap[sector.color] || colorMap.indigo;
                    return (
                        <Link key={sector.table} href={sector.href} className="group relative bg-[#070707]/90 backdrop-blur-xl border border-white/5 rounded-2xl p-6 shadow-lg hover:border-white/10 transition-all duration-300 overflow-hidden hover:-translate-y-1 no-underline">
                            <div className={`absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br ${c.gradient} rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-500`} />
                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-4">
                                    <div className={`w-12 h-12 rounded-xl ${c.bgIcon} border flex items-center justify-center`}>
                                        <sector.icon className={`w-6 h-6 ${c.text}`} />
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-neutral-700 group-hover:text-neutral-400 transition-colors" />
                                </div>
                                <div className="space-y-1">
                                    {loading ? (
                                        <div className="h-8 bg-white/10 rounded-lg w-20 animate-pulse" />
                                    ) : (
                                        <p className="text-3xl font-black text-white tracking-tight">{sector.count.toLocaleString()}</p>
                                    )}
                                    <p className="text-sm font-semibold text-neutral-400 uppercase tracking-wider">{sector.label}</p>
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>

            {/* Activity Section */}
            <div className="grid xl:grid-cols-3 gap-6">
                {/* Recent Items */}
                <div className="xl:col-span-2 bg-[#070707]/90 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden">
                    <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
                        <h3 className="font-bold text-white text-lg flex items-center gap-2">
                            <Zap className="w-5 h-5 text-indigo-400" /> Recent Activity
                        </h3>
                    </div>
                    <div className="divide-y divide-white/5">
                        {loading ? (
                            Array(5).fill(0).map((_, i) => (
                                <div key={i} className="px-6 py-4 flex items-center gap-4 animate-pulse">
                                    <div className="w-10 h-10 bg-white/10 rounded-xl" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-4 bg-white/10 rounded w-48" />
                                        <div className="h-3 bg-white/5 rounded w-32" />
                                    </div>
                                    <div className="h-4 bg-white/10 rounded w-16" />
                                </div>
                            ))
                        ) : recentItems.length === 0 ? (
                            <div className="px-6 py-16 text-center">
                                <Database className="w-10 h-10 text-neutral-700 mx-auto mb-4" />
                                <p className="text-neutral-400 font-medium">No data yet. Run the scraper engines to begin.</p>
                            </div>
                        ) : (
                            recentItems.map((item) => {
                                let Icon = User;
                                let colorClass = 'bg-amber-500/10 border-amber-500/20 text-amber-400';
                                if (item.type === 'project') {
                                    Icon = HardHat;
                                    colorClass = 'bg-rose-500/10 border-rose-500/20 text-rose-400';
                                } else if (item.type === 'company') {
                                    Icon = Building2;
                                    colorClass = 'bg-orange-500/10 border-orange-500/20 text-orange-400';
                                } else if (item.sector === 'Telecom') {
                                    Icon = Radio;
                                    colorClass = 'bg-blue-500/10 border-blue-500/20 text-blue-400';
                                }

                                return (
                                    <div key={`${item.sector}-${item.id}`} className="px-6 py-4 flex items-center gap-4 hover:bg-white/[0.02] transition-colors group">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors border ${colorClass.split(' ').slice(0, 2).join(' ')} group-hover:bg-opacity-20`}>
                                            <Icon className={`w-5 h-5 ${colorClass.split(' ').pop()}`} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-white text-sm truncate">{item.full_name}</p>
                                            <p className="text-xs text-neutral-500 font-medium truncate mt-0.5">{item.current_title || 'No Title'} {item.current_company ? `at ${item.current_company}` : ''}</p>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-md ${colorClass.split(' ').slice(0, 1).join(' ')} ${colorClass.split(' ').pop()}`}>
                                                {item.sector}
                                            </span>
                                            <div className="text-xs text-neutral-500 font-medium flex items-center gap-1">
                                                <Clock className="w-3.5 h-3.5" />
                                                {new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Source Intelligence Breakdown */}
                <div className="bg-[#070707]/90 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden">
                    <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
                        <h3 className="font-bold text-white text-lg flex items-center gap-2">
                            <Database className="w-5 h-5 text-cyan-400" /> Source Intelligence
                        </h3>
                        <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">{sourceStats.length} Data Sources</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/5 bg-white/[0.02]">
                                    <th className="px-6 py-3 text-xs font-semibold text-neutral-400">Source</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-neutral-400">Sector</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-neutral-400">Records</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-neutral-400">Type</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-neutral-400">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {loading ? (
                                    Array(4).fill(0).map((_, i) => (
                                        <tr key={i}><td colSpan={5} className="px-6 py-4"><div className="h-4 bg-white/5 rounded animate-pulse" /></td></tr>
                                    ))
                                ) : sourceStats.length === 0 ? (
                                    <tr><td colSpan={5} className="px-6 py-8 text-center text-neutral-500">No data sources found.</td></tr>
                                ) : (
                                    sourceStats.map((src) => {
                                        const sectorColors: Record<string, string> = {
                                            oil_gas: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
                                            telecom: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
                                            energy: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
                                            construction: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
                                            leads: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
                                            fire_safety: 'bg-red-500/10 text-red-400 border-red-500/20',
                                            finishes: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                                            sitework: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                                        };
                                        const sColor = sectorColors[src.sector] || 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20';

                                        return (
                                            <tr key={src.name} className="hover:bg-white/[0.02] transition-colors">
                                                <td className="px-6 py-4">
                                                    <span className="text-sm font-semibold text-white">{src.name}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${sColor}`}>
                                                        {src.sector.replace('_', ' ')}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`text-sm font-bold ${src.records > 0 ? 'text-white' : 'text-neutral-600'}`}>
                                                        {src.records.toLocaleString()}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${src.type === 'pipeline' ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' : 'bg-white/5 border-white/10 text-neutral-400'}`}>
                                                        {src.type === 'pipeline' ? '⚡ Pipeline' : '🤖 Scraper'}
                                                        {src.runs ? ` · ${src.runs} runs` : ''}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {src.status === 'active' || src.status === 'completed' ? (
                                                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400"><CheckCircle2 className="w-3.5 h-3.5" /> Active</span>
                                                    ) : src.status === 'failed' ? (
                                                        <span className="inline-flex items-center gap-1 text-xs font-medium text-red-400"><XCircle className="w-3.5 h-3.5" /> Failed</span>
                                                    ) : src.status === 'running' ? (
                                                        <span className="inline-flex items-center gap-1 text-xs font-medium text-indigo-400"><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Running</span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 text-xs font-medium text-neutral-600">— Empty</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Quick Actions Panel */}
                <div className="bg-[#070707]/90 backdrop-blur-xl border border-white/5 rounded-2xl p-6 space-y-5 h-fit">
                    <h3 className="font-bold text-white text-lg flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-purple-400" /> Sectors
                    </h3>

                    <Link href="/dashboard/telecom" className="group flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-blue-500/5 hover:border-blue-500/20 transition-all no-underline">
                        <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                            <Radio className="w-5 h-5 text-blue-400" />
                        </div>
                        <div className="flex-1">
                            <p className="font-bold text-white text-sm">Telecom Intelligence</p>
                            <p className="text-xs text-neutral-500 mt-0.5">View telecom talent pipeline</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-neutral-600 group-hover:text-blue-400 transition-colors" />
                    </Link>

                    <Link href="/dashboard/energy" className="group flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-amber-500/5 hover:border-amber-500/20 transition-all no-underline">
                        <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                            <UtilityPole className="w-5 h-5 text-amber-400" />
                        </div>
                        <div className="flex-1">
                            <p className="font-bold text-white text-sm">Energy Intelligence</p>
                            <p className="text-xs text-neutral-500 mt-0.5">View energy/utility pipeline</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-neutral-600 group-hover:text-amber-400 transition-colors" />
                    </Link>

                    <Link href="/dashboard/construction" className="group flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-orange-500/5 hover:border-orange-500/20 transition-all no-underline">
                        <div className="w-10 h-10 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
                            <HardHat className="w-5 h-5 text-orange-400" />
                        </div>
                        <div className="flex-1">
                            <p className="font-bold text-white text-sm">Construction</p>
                            <p className="text-xs text-neutral-500 mt-0.5">PlanHub project intelligence</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-neutral-600 group-hover:text-orange-400 transition-colors" />
                    </Link>
                </div>
            </div>
        </div>
    );
}
