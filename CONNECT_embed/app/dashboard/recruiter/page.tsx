"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { Users, Briefcase, TrendingUp, Radio, Fuel, UtilityPole, Flame, ChevronRight, Activity, Clock, User, Filter } from 'lucide-react';

interface SectorStat {
    table: string;
    label: string;
    count: number;
    icon: any;
    color: string;
    href: string;
}

export default function RecruiterDashboard() {
    const [stats, setStats] = useState<SectorStat[]>([]);
    const [totalPool, setTotalPool] = useState(0);
    const [totalJobs, setTotalJobs] = useState(0);
    const [recentCandidates, setRecentCandidates] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRecruiterData();
    }, []);

    const fetchRecruiterData = async () => {
        try {
            const sectors = [
                { table: 'telecom_profiles', label: 'Telecom & IT', icon: Radio, color: 'blue', href: '/dashboard/telecom' },
                { table: 'oil_gas_profiles', label: 'Oil & Gas', icon: Fuel, color: 'indigo', href: '/dashboard/oil-gas' },
                { table: 'fire_safety_profiles', label: 'Fire & Safety', icon: Flame, color: 'red', href: '/dashboard/fire-safety' },
                { table: 'energy_profiles', label: 'Energy', icon: UtilityPole, color: 'amber', href: '/dashboard/energy' },
            ];

            const results: SectorStat[] = [];
            let total = 0;
            let recent: any[] = [];

            // 1. Fetch Talent Stats
            for (const s of sectors) {
                const { count } = await supabase.from(s.table).select('*', { count: 'exact', head: true });
                const c = count || 0;
                total += c;
                results.push({ ...s, count: c });

                const { data } = await supabase
                    .from(s.table)
                    .select('id, full_name, current_title, current_company, created_at')
                    .order('created_at', { ascending: false })
                    .limit(3);

                if (data) {
                    recent = [...recent, ...data.map(d => ({ ...d, sector: s.label, color: s.color }))];
                }
            }

            // 2. Fetch Job Stats
            const { count: jobCount } = await supabase.from('leads').select('*', { count: 'exact', head: true });
            setTotalJobs(jobCount || 0);

            recent.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            setStats(results);
            setTotalPool(total);
            setRecentCandidates(recent.slice(0, 6));
        } catch (error) {
            console.error('Error fetching recruiter data:', error);
        } finally {
            setLoading(false);
        }
    };

    const colorMap: Record<string, { bgIcon: string; text: string; bgHover: string; borderHover: string }> = {
        blue: { bgIcon: 'bg-blue-500/10 border-blue-500/20', text: 'text-blue-400', bgHover: 'hover:bg-blue-500/5', borderHover: 'hover:border-blue-500/20' },
        indigo: { bgIcon: 'bg-indigo-500/10 border-indigo-500/20', text: 'text-indigo-400', bgHover: 'hover:bg-indigo-500/5', borderHover: 'hover:border-indigo-500/20' },
        red: { bgIcon: 'bg-red-500/10 border-red-500/20', text: 'text-red-400', bgHover: 'hover:bg-red-500/5', borderHover: 'hover:border-red-500/20' },
        amber: { bgIcon: 'bg-amber-500/10 border-amber-500/20', text: 'text-amber-400', bgHover: 'hover:bg-amber-500/5', borderHover: 'hover:border-amber-500/20' },
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-black text-white px-2 tracking-tight flex items-center gap-3">
                    <Briefcase className="w-8 h-8 text-violet-500" />
                    Market <span className="text-violet-500">Recruiting</span>
                </h1>
                <p className="text-neutral-400 px-2 font-medium mt-1">Unified command center for Talent Pool and Job Opportunities.</p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Link href="/dashboard/recruiting/leads" className="p-6 rounded-2xl bg-[#0a0a0a] border border-white/5 flex flex-col justify-center min-h-[160px] relative overflow-hidden group hover:border-violet-500/30 transition-all no-underline">
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-violet-500 rounded-full blur-3xl opacity-10 group-hover:opacity-20 transition-opacity" />
                    <div className="relative z-10 flex items-center justify-between mb-2">
                        <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                            <Users className="w-6 h-6 text-violet-400" />
                        </div>
                        <ChevronRight className="w-5 h-5 text-neutral-600 group-hover:text-violet-400 transition-colors" />
                    </div>
                    <h2 className="text-3xl font-black text-white">{loading ? '...' : totalPool.toLocaleString()}</h2>
                    <p className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mt-1">Talent Pool</p>
                </Link>

                <Link href="/dashboard/recruiting/jobs" className="p-6 rounded-2xl bg-[#0a0a0a] border border-white/5 flex flex-col justify-center min-h-[160px] relative overflow-hidden group hover:border-emerald-500/30 transition-all no-underline">
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500 rounded-full blur-3xl opacity-10 group-hover:opacity-20 transition-opacity" />
                    <div className="relative z-10 flex items-center justify-between mb-2">
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                            <Briefcase className="w-6 h-6 text-emerald-400" />
                        </div>
                        <ChevronRight className="w-5 h-5 text-neutral-600 group-hover:text-emerald-400 transition-colors" />
                    </div>
                    <h2 className="text-3xl font-black text-white">{loading ? '...' : totalJobs.toLocaleString()}</h2>
                    <p className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mt-1">Job Opportunities</p>
                </Link>

                <Link href="/dashboard/recruiting/leads" className="p-6 rounded-2xl bg-[#0a0a0a] border border-white/5 flex flex-col justify-center min-h-[160px] relative overflow-hidden group hover:border-indigo-500/30 transition-all no-underline">
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500 rounded-full blur-3xl opacity-10 group-hover:opacity-20 transition-opacity" />
                    <div className="relative z-10 flex items-center justify-between mb-2">
                        <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                            <Filter className="w-6 h-6 text-indigo-400" />
                        </div>
                        <ChevronRight className="w-5 h-5 text-neutral-600 group-hover:text-indigo-400 transition-colors" />
                    </div>
                    <h2 className="text-xl font-black text-white mt-2">Intelligence</h2>
                    <p className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mt-1">Universal Search</p>
                </Link>

                <Link href="/dashboard/campaigns" className="p-6 rounded-2xl bg-[#0a0a0a] border border-white/5 flex flex-col justify-center min-h-[160px] relative overflow-hidden group hover:border-blue-500/30 transition-all no-underline">
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500 rounded-full blur-3xl opacity-10 group-hover:opacity-20 transition-opacity" />
                    <div className="relative z-10 flex items-center justify-between mb-2">
                        <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                            <TrendingUp className="w-6 h-6 text-blue-400" />
                        </div>
                        <ChevronRight className="w-5 h-5 text-neutral-600 group-hover:text-blue-400 transition-colors" />
                    </div>
                    <h2 className="text-xl font-black text-white mt-2">Outreach</h2>
                    <p className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mt-1">Manage Campaigns</p>
                </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Sector Navigation */}
                <div className="lg:col-span-1 space-y-4">
                    <h3 className="text-lg font-bold text-white px-1">Sectors</h3>
                    <div className="space-y-3">
                        {loading ? (
                            Array(4).fill(0).map((_, i) => <div key={i} className="h-20 bg-[#0a0a0a] rounded-xl border border-white/5 animate-pulse" />)
                        ) : (
                            stats.map((s) => {
                                const c = colorMap[s.color] || colorMap.blue;
                                return (
                                    <Link key={s.table} href={s.href} className={`block p-4 rounded-xl bg-[#0a0a0a] border border-white/5 transition-all no-underline group ${c.bgHover} ${c.borderHover}`}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-12 h-12 rounded-xl ${c.bgIcon} border flex items-center justify-center shrink-0 transition-colors`}>
                                                    <s.icon className={`w-6 h-6 ${c.text}`} />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-white group-hover:text-white transition-colors">{s.label}</h4>
                                                    <p className="text-sm text-neutral-500 font-medium">{s.count.toLocaleString()} profiles</p>
                                                </div>
                                            </div>
                                            <ChevronRight className={`w-5 h-5 text-neutral-600 group-hover:${c.text} transition-colors`} />
                                        </div>
                                    </Link>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Recent Candidates */}
                <div className="lg:col-span-2 space-y-4">
                    <h3 className="text-lg font-bold text-white px-1 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-violet-400" />
                        Recently Added Talent
                    </h3>
                    <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl overflow-hidden divide-y divide-white/5">
                        {loading ? (
                            Array(5).fill(0).map((_, i) => (
                                <div key={i} className="p-4 flex gap-4 animate-pulse">
                                    <div className="w-10 h-10 bg-white/10 rounded-xl shrink-0" />
                                    <div className="space-y-2 w-full">
                                        <div className="h-4 bg-white/10 rounded w-1/3" />
                                        <div className="h-3 bg-white/5 rounded w-1/4" />
                                    </div>
                                </div>
                            ))
                        ) : recentCandidates.length === 0 ? (
                            <div className="p-10 text-center text-neutral-500">
                                No candidates found across any sector.
                            </div>
                        ) : (
                            recentCandidates.map((cand, idx) => {
                                const c = colorMap[cand.color] || colorMap.blue;
                                return (
                                    <div key={idx} className="p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-xl ${c.bgIcon} border flex items-center justify-center shrink-0`}>
                                                <User className={`w-5 h-5 ${c.text}`} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-white text-sm">{cand.full_name}</p>
                                                <p className="text-xs text-neutral-500 font-medium mt-0.5 max-w-[200px] sm:max-w-md truncate">
                                                    {cand.current_title || 'Unknown Title'} {cand.current_company ? `at ${cand.current_company}` : ''}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${c.bgIcon} ${c.text} mb-1`}>
                                                {cand.sector}
                                            </span>
                                            <div className="text-xs text-neutral-600 flex items-center justify-end gap-1">
                                                <Clock className="w-3" />
                                                {new Date(cand.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                        <Link href="/dashboard/recruiting/leads" className="block p-3 text-center text-sm font-bold text-violet-400 hover:text-violet-300 hover:bg-white/[0.02] transition-colors">
                            View Deep Search &rarr;
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
