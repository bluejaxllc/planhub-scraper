"use client";

import React, { useEffect, useState } from 'react';
import { useUser } from '@/lib/UserContext';
import { supabase } from '@/lib/supabase';
import {
    Database, Activity, CheckCircle2, XCircle, Clock,
    ArrowDownToLine, RefreshCw, AlertCircle
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

interface ScraperRun {
    id: string;
    scraper_name: string;
    sector: string;
    status: 'running' | 'completed' | 'failed';
    records_found: number;
    records_new: number;
    error: string | null;
    started_at: string;
    completed_at: string | null;
}

export default function ScraperRegistryPage() {
    const { isSuperAdmin, loading: userLoading } = useUser();
    const [runs, setRuns] = useState<ScraperRun[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchScraperRuns = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('scraper_runs')
                .select('*')
                .order('started_at', { ascending: false })
                .limit(100);

            if (error) throw error;
            setRuns(data as ScraperRun[]);
        } catch (err: any) {
            console.error("Error fetching scraper runs:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!userLoading && isSuperAdmin) {
            fetchScraperRuns();
        }
    }, [userLoading, isSuperAdmin]);

    if (userLoading || loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
            </div>
        );
    }

    if (!isSuperAdmin) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-center">
                <Shield className="w-12 h-12 text-red-500 mb-4 opacity-50" />
                <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
                <p className="text-neutral-400">You must be a super admin to view this page.</p>
            </div>
        );
    }

    // Aggregate stats
    const runningScrapers = runs.filter(r => r.status === 'running').length;
    const completedLast24h = runs.filter(r => {
        const isCompleted = r.status === 'completed';
        const isLast24h = new Date(r.started_at).getTime() > Date.now() - 24 * 60 * 60 * 1000;
        return isCompleted && isLast24h;
    }).length;
    const totalNewLeads24h = runs.filter(r => new Date(r.started_at).getTime() > Date.now() - 24 * 60 * 60 * 1000)
        .reduce((sum, r) => sum + (r.records_new || 0), 0);

    // Get unique sources active
    const activeSources = Array.from(new Set(runs.map(r => r.scraper_name))).length;

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Completed
                    </span>
                );
            case 'running':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Running
                    </span>
                );
            case 'failed':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                        <XCircle className="w-3.5 h-3.5" />
                        Failed
                    </span>
                );
            default:
                return null;
        }
    };

    const getSectorBadge = (sector: string) => {
        const colors: Record<string, string> = {
            'oil_gas': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
            'telecom': 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
            'energy': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
        };
        const color = colors[sector] || 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20';
        return (
            <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${color}`}>
                {sector.replace('_', ' ')}
            </span>
        );
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <Database className="w-6 h-6 text-indigo-400" />
                        Scraper Registry
                    </h1>
                    <p className="text-sm text-neutral-400 mt-1">
                        Monitor active intelligence gathering sources, scrapers, and pipeline logs.
                    </p>
                </div>
                <button
                    onClick={fetchScraperRuns}
                    className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm font-medium text-white transition-colors"
                >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                </button>
            </div>

            {error && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                    <div>
                        <h3 className="text-sm font-medium text-red-400">Error loading logs</h3>
                        <p className="text-sm text-red-400/80 mt-1">{error}</p>
                    </div>
                </div>
            )}

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-[#0a0a0a] border border-white/5 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                            <Activity className="w-6 h-6 text-indigo-400" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Active Sources</p>
                            <p className="text-2xl font-bold text-white">{activeSources}</p>
                        </div>
                    </div>
                </div>

                <div className="p-5 rounded-2xl bg-[#0a0a0a] border border-white/5 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                            <ArrowDownToLine className="w-6 h-6 text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">New Leads (24H)</p>
                            <p className="text-2xl font-bold text-white">+{totalNewLeads24h}</p>
                        </div>
                    </div>
                </div>

                <div className="p-5 rounded-2xl bg-[#0a0a0a] border border-white/5 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                            <CheckCircle2 className="w-6 h-6 text-blue-400" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Runs Completed (24H)</p>
                            <p className="text-2xl font-bold text-white">{completedLast24h}</p>
                        </div>
                    </div>
                </div>

                <div className="p-5 rounded-2xl bg-[#0a0a0a] border border-white/5 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-red-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
                            <RefreshCw className={`w-6 h-6 text-orange-400 ${runningScrapers > 0 ? 'animate-spin' : ''}`} />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Currently Running</p>
                            <p className="text-2xl font-bold text-white">{runningScrapers}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Run History Table */}
            <div className="bg-[#0a0a0a] rounded-2xl border border-white/5 overflow-hidden">
                <div className="px-6 py-4 border-b border-white/5">
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider">Scraper Execution Logs</h2>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/[0.02]">
                                <th className="px-6 py-3 text-xs font-semibold text-neutral-400">Scraper Source</th>
                                <th className="px-6 py-3 text-xs font-semibold text-neutral-400">Sector</th>
                                <th className="px-6 py-3 text-xs font-semibold text-neutral-400">Status</th>
                                <th className="px-6 py-3 text-xs font-semibold text-neutral-400">Records Found</th>
                                <th className="px-6 py-3 text-xs font-semibold text-neutral-400">Records Inserted</th>
                                <th className="px-6 py-3 text-xs font-semibold text-neutral-400">Started</th>
                                <th className="px-6 py-3 text-xs font-semibold text-neutral-400">Time</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {runs.map((run) => {
                                let durationStr = '—';
                                if (run.completed_at && run.started_at) {
                                    const ms = new Date(run.completed_at).getTime() - new Date(run.started_at).getTime();
                                    const s = Math.floor(ms / 1000);
                                    if (s < 60) durationStr = `${s}s`;
                                    else durationStr = `${Math.floor(s / 60)}m ${s % 60}s`;
                                } else if (run.status === 'running') {
                                    durationStr = 'Running...';
                                }

                                return (
                                    <tr key={run.id} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-semibold text-white font-mono">{run.scraper_name}</span>
                                                {run.error && (
                                                    <span className="text-xs text-red-400/80 mt-1 max-w-xs truncate" title={run.error}>
                                                        {run.error}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {getSectorBadge(run.sector)}
                                        </td>
                                        <td className="px-6 py-4">
                                            {getStatusBadge(run.status)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm text-neutral-300">
                                                {run.status === 'running' ? '—' : (run.records_found ?? 0).toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`text-sm font-medium ${run.records_new > 0 ? 'text-emerald-400' : 'text-neutral-500'}`}>
                                                {run.status === 'running' ? '—' : `+${(run.records_new ?? 0).toLocaleString()}`}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm text-neutral-300">
                                                    {format(new Date(run.started_at), 'MMM d, h:mm a')}
                                                </span>
                                                <span className="text-xs text-neutral-500">
                                                    {formatDistanceToNow(new Date(run.started_at), { addSuffix: true })}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1.5 text-sm text-neutral-400">
                                                <Clock className="w-3.5 h-3.5" />
                                                {durationStr}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}

                            {runs.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center text-neutral-500">
                                        No scraper runs found. Start the Python scheduler to collect data.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// Add a dummy Shield icon if we don't import it at the top
function Shield(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
        </svg>
    );
}
