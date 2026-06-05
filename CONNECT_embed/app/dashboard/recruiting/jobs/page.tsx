"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
    Briefcase, Search, Filter, ArrowDownToLine, RefreshCw,
    Building2, MapPin, Calendar, Clock, ChevronRight, X, ExternalLink
} from 'lucide-react';

interface JobPosting {
    id: string;
    job_title: string;
    company_name: string;
    location: string;
    description?: string;
    job_url: string;
    date_posted: string;
    created_at: string;
    sector?: string;
}

export default function JobsIndexPage() {
    const [jobs, setJobs] = useState<JobPosting[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [lastRefresh, setLastRefresh] = useState('');

    const fetchJobs = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('leads')
                .select('*')
                .order('date_posted', { ascending: false })
                .limit(500);

            if (error) throw error;
            setJobs(data || []);
            setLastRefresh(new Date().toLocaleTimeString());
        } catch (err) {
            console.error('Jobs fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchJobs();
    }, [fetchJobs]);

    const filtered = jobs.filter(j =>
        j.job_title?.toLowerCase().includes(search.toLowerCase()) ||
        j.company_name?.toLowerCase().includes(search.toLowerCase()) ||
        j.location?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                        <Briefcase className="w-8 h-8 text-violet-400" />
                        Jobs Index
                    </h1>
                    <p className="text-neutral-400 font-medium mt-2">Active job postings and hiring companies found across sources</p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={fetchJobs} className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-neutral-400 hover:text-white transition-all">
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-lg text-sm transition-all">
                        <ArrowDownToLine className="w-4 h-4" />
                        Export Jobs
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Search Bar */}
                <div className="md:col-span-2 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by title, company, or location..."
                        className="w-full pl-12 pr-4 py-3.5 bg-[#070707]/90 border border-white/10 rounded-xl text-white placeholder-neutral-500 font-medium focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                    />
                </div>
                {/* Filters */}
                <div className="relative">
                    <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                    <select className="w-full pl-12 pr-4 py-3.5 bg-[#070707]/90 border border-white/10 rounded-xl text-white font-medium focus:outline-none">
                        <option>All Sectors</option>
                        <option>Telecom</option>
                        <option>Oil & Gas</option>
                        <option>Construction</option>
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="space-y-4">
                    {Array(5).fill(0).map((_, i) => (
                        <div key={i} className="h-24 rounded-2xl bg-white/5 border border-white/10 animate-pulse" />
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <div className="bg-[#070707]/90 border border-white/5 rounded-2xl p-20 text-center">
                    <Briefcase className="w-16 h-16 text-neutral-800 mx-auto mb-6" />
                    <p className="text-white font-black text-xl">No active jobs found</p>
                    <p className="text-neutral-500 mt-2 max-w-sm mx-auto">Our scrapers are currently indexing hiring companies. New opportunities will appear here automatically.</p>
                </div>
            ) : (
                <div className="bg-[#070707]/90 border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-white/[0.02] border-b border-white/5">
                                <th className="px-6 py-4 text-[10px] font-black uppercase text-neutral-500 tracking-widest">Title & Company</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase text-neutral-500 tracking-widest text-center">Location</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase text-neutral-500 tracking-widest text-center">Posted</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase text-neutral-500 tracking-widest text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filtered.map((job) => (
                                <tr key={job.id} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="px-6 py-5">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-white group-hover:text-violet-400 transition-colors uppercase tracking-tight">{job.job_title}</span>
                                            <span className="text-sm text-neutral-500 flex items-center gap-1.5 mt-1">
                                                <Building2 className="w-3.5 h-3.5" /> {job.company_name}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center justify-center gap-1.5 text-sm text-neutral-400">
                                            <MapPin className="w-3.5 h-3.5" /> {job.location || 'Remote/US'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-center">
                                        <span className="text-xs text-neutral-500">
                                            {job.date_posted ? new Date(job.date_posted).toLocaleDateString() : 'Recently'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <a
                                            href={job.job_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 text-xs font-black text-violet-400 hover:text-violet-300 transition-colors uppercase tracking-widest"
                                        >
                                            View Job <ExternalLink className="w-3.5 h-3.5" />
                                        </a>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
