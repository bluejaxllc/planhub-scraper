"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/lib/UserContext';
import { Lock, ChevronLeft, ChevronRight, Briefcase, Mail, Building2, Calendar, Link as LinkIcon, ShieldAlert, ArrowRight } from 'lucide-react';

interface Lead {
    id: string;
    company_name: string;
    job_title: string;
    job_url: string | null;
    required_tech: string[] | null;
    verified_email: string | null;
    date_posted: string;
}

interface LeadsTableProps {
    isPro?: boolean;
}

export default function LeadsTable({ isPro: isPropPro = false }: LeadsTableProps) {
    const { isSuperAdmin, user } = useUser();
    const isPro = isSuperAdmin || user?.subscription_status === 'active' || isPropPro;
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const ITEMS_PER_PAGE = 10;

    useEffect(() => {
        fetchLeads();
    }, [page]);

    const fetchLeads = async () => {
        setLoading(true);
        try {
            const { count } = await supabase
                .from('leads')
                .select('*', { count: 'exact', head: true });

            if (count) {
                setTotalPages(Math.ceil(count / ITEMS_PER_PAGE));
            }

            const from = (page - 1) * ITEMS_PER_PAGE;
            const to = from + ITEMS_PER_PAGE - 1;

            const { data, error } = await supabase
                .from('leads')
                .select('*')
                .order('date_posted', { ascending: false })
                .range(from, to);

            if (error) throw error;
            if (data) setLeads(data);
        } catch (err) {
            console.error('Error fetching leads:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-7xl mx-auto relative group/table mt-10">
            {/* Background glow for the table container */}
            <div className="absolute -inset-1 bg-gradient-to-b from-indigo-500/10 to-purple-500/5 rounded-3xl blur-2xl opacity-50 z-0"></div>

            <div className="relative z-10 bg-[#070707]/90 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.6)] overflow-hidden text-neutral-200 font-sans">

                {/* Sleek Header */}
                <div className="px-8 py-6 border-b border-white/5 flex justify-between items-center bg-black/40">
                    <div>
                        <h2 className="text-2xl font-black text-white flex items-center gap-3 tracking-tight">
                            <div className="w-10 h-10 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center shadow-inner">
                                <Briefcase className="w-5 h-5 text-indigo-400" />
                            </div>
                            Live Opportunities Feed
                        </h2>
                        <p className="text-sm font-medium text-neutral-400 mt-2 ml-13">Synchronized directly from the scraping cluster</p>
                    </div>
                    {!isPro && (
                        <button className="relative group px-6 py-3 bg-gradient-to-b from-neutral-800 to-neutral-900 overflow-hidden text-white text-sm font-bold rounded-xl border border-white/10 shadow-lg transition-all hover:scale-105 active:scale-95 flex items-center gap-2">
                            <div className="absolute inset-0 bg-indigo-500/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                            <span className="relative z-10 flex items-center gap-2 shadow-sm">
                                <Lock className="w-4 h-4 text-indigo-400" /> Unlock Premium
                            </span>
                        </button>
                    )}
                </div>

                {/* Dynamic Table Content */}
                <div className="overflow-x-auto relative min-h-[500px]">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-white/[0.02] text-neutral-400 uppercase text-xs font-bold tracking-widest border-b border-white/5">
                            <tr>
                                <th className="px-8 py-5">Job Details</th>
                                <th className="px-8 py-5">Verified Company</th>
                                <th className="px-8 py-5">Decision Maker Email</th>
                                <th className="px-8 py-5 text-right">Age</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse bg-white/[0.01]">
                                        <td className="px-8 py-6"><div className="h-4 bg-white/10 rounded-md w-48"></div></td>
                                        <td className="px-8 py-6"><div className="h-4 bg-white/10 rounded-md w-32"></div></td>
                                        <td className="px-8 py-6"><div className="h-4 bg-white/10 rounded-md w-40"></div></td>
                                        <td className="px-8 py-6 flex justify-end"><div className="h-4 bg-white/10 rounded-md w-24"></div></td>
                                    </tr>
                                ))
                            ) : leads.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-8 py-24 text-center">
                                        <div className="flex flex-col items-center justify-center text-neutral-500">
                                            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 shadow-inner">
                                                <Briefcase className="w-8 h-8 text-neutral-600" />
                                            </div>
                                            <p className="text-xl text-neutral-300 font-bold tracking-tight">Feed is Empty</p>
                                            <p className="text-sm mt-2 font-medium">Please initialize the Python scraper to load your database.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                leads.map((lead) => (
                                    <tr key={lead.id} className="hover:bg-indigo-500/5 transition-all duration-300 group">
                                        <td className="px-8 py-5">
                                            <div className="font-bold text-white text-base flex items-center gap-3">
                                                {lead.job_title}
                                                {lead.job_url && (
                                                    <a href={lead.job_url} target="_blank" rel="noopener noreferrer" className="opacity-0 group-hover:opacity-100 flex items-center justify-center w-7 h-7 rounded-md bg-white/10 text-neutral-300 hover:bg-indigo-500 hover:text-white transition-all transform scale-90 group-hover:scale-100 mb-0.5">
                                                        <LinkIcon className="w-3.5 h-3.5" />
                                                    </a>
                                                )}
                                            </div>
                                        </td>

                                        {/* Blurry Company Name */}
                                        <td className="px-8 py-5">
                                            {!isPro ? (
                                                <div className="relative inline-block w-40 h-7 group/blur cursor-not-allowed">
                                                    <div className="absolute inset-0 bg-white/10 rounded-md blur-md opacity-70 filter select-none transition-all group-hover/blur:bg-indigo-500/20"></div>
                                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/blur:opacity-100 transition-opacity duration-300 text-xs font-bold tracking-widest text-indigo-300 uppercase">
                                                        <Lock className="w-3.5 h-3.5 mr-2" /> Hidden
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-3 text-neutral-200 font-medium bg-white/5 py-1.5 px-3 rounded-md w-fit border border-white/5 shadow-inner">
                                                    <Building2 className="w-4 h-4 text-indigo-400 shrink-0" />
                                                    <span className="truncate max-w-[200px]">{lead.company_name}</span>
                                                </div>
                                            )}
                                        </td>

                                        {/* Blurry Email */}
                                        <td className="px-8 py-5">
                                            {!isPro ? (
                                                <div className="relative inline-block w-52 h-7 group/blur cursor-not-allowed">
                                                    <div className="absolute inset-0 bg-white/10 rounded-md blur-md opacity-70 filter select-none transition-all group-hover/blur:bg-indigo-500/20"></div>
                                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/blur:opacity-100 transition-opacity duration-300 text-xs font-bold tracking-widest text-indigo-300 uppercase">
                                                        <Lock className="w-3.5 h-3.5 mr-2" /> Upgrade
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-3 text-neutral-200 font-medium">
                                                    <div className="w-8 h-8 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                                                        <Mail className="w-4 h-4 text-emerald-400" />
                                                    </div>
                                                    {lead.verified_email || <span className="text-neutral-600 italic">Not available</span>}
                                                </div>
                                            )}
                                        </td>

                                        {/* Date */}
                                        <td className="px-8 py-5 text-neutral-400 font-medium text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Calendar className="w-4 h-4 text-neutral-500 shrink-0" />
                                                {new Date(lead.date_posted).toLocaleDateString(undefined, {
                                                    month: 'short',
                                                    day: 'numeric'
                                                })}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>

                    {/* Intense Glassmorphic Overlay for non-pro users */}
                    {!isPro && !loading && leads.length > 0 && (
                        <div className="absolute top-[30%] left-0 right-0 bottom-0 bg-gradient-to-t from-[#050505] via-[#050505]/95 to-transparent flex flex-col items-center justify-end pb-12 z-20 pointer-events-none">
                            <div className="relative">
                                <div className="absolute -inset-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl blur-xl opacity-30 animate-pulse" />
                                <div className="bg-[#0f0f0f]/90 backdrop-blur-2xl p-10 rounded-2xl border border-white/10 shadow-[0_0_60px_rgba(0,0,0,0.8)] flex flex-col items-center text-center max-w-lg transform translate-y-6 pointer-events-auto ring-1 ring-white/5 relative z-10 transition-transform hover:-translate-y-1 duration-500">
                                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(99,102,241,0.5)] border border-white/20">
                                        <ShieldAlert className="w-8 h-8 text-white drop-shadow-md" />
                                    </div>
                                    <h3 className="text-2xl font-black text-white mb-3 tracking-tight">Premium Leads Identified</h3>
                                    <p className="text-base text-neutral-400 mb-8 leading-relaxed font-medium">
                                        We've blurred the verified emails and company details for thousands of high-intent roles. Upgrade to Pro to bypass obfuscation and pipe these straight to your CRM.
                                    </p>
                                    <button className="w-full relative group overflow-hidden py-4 bg-white text-black font-black rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_4px_20px_rgba(255,255,255,0.15)] flex items-center justify-center gap-2">
                                        <span className="relative z-10 flex items-center gap-2">Upgrade Instance for $49 <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></span>
                                        <div className="absolute inset-0 bg-neutral-200 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                                    </button>
                                    <p className="mt-4 text-xs font-bold uppercase tracking-widest text-neutral-600 mt-5">Verified Stripe Architecture</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Elegant Pagination */}
                <div className="px-8 py-5 border-t border-white/5 flex items-center justify-between bg-black/40">
                    <span className="text-sm font-medium text-neutral-500">
                        Showing <span className="font-bold text-white">{(page - 1) * ITEMS_PER_PAGE + (leads.length > 0 ? 1 : 0)}</span> <span className="text-neutral-600">—</span> <span className="font-bold text-white">{Math.min(page * ITEMS_PER_PAGE, (page - 1) * ITEMS_PER_PAGE + leads.length)}</span> bounds
                    </span>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1 || loading}
                            className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-neutral-400 hover:bg-white/10 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-all shadow-sm flex items-center justify-center group"
                        >
                            <ChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
                        </button>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page >= totalPages || loading}
                            className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-neutral-400 hover:bg-white/10 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-all shadow-sm flex items-center justify-center group"
                        >
                            <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
