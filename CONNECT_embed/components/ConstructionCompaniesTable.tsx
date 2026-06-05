"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Building2, MapPin, Phone, Mail, Globe, Search, ChevronLeft, ChevronRight, ExternalLink, Filter } from 'lucide-react';

interface Company {
    id: number;
    planhub_id: string;
    company_name: string;
    address: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    industry_type: string | null;
}

export default function ConstructionCompaniesTable() {
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [stateFilter, setStateFilter] = useState('');
    const [page, setPage] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const pageSize = 25;

    useEffect(() => {
        fetchCompanies();
    }, [page, searchTerm, stateFilter]);

    const fetchCompanies = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('companies')
                .select('*', { count: 'exact' });

            if (searchTerm) {
                query = query.or(`company_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,city.ilike.%${searchTerm}%`);
            }
            if (stateFilter) {
                query = query.eq('state', stateFilter);
            }

            const { data, count, error } = await query
                .range(page * pageSize, (page + 1) * pageSize - 1)
                .order('company_name', { ascending: true });

            if (error) throw error;
            setCompanies(data || []);
            setTotalCount(count || 0);
        } catch (err) {
            console.error('Failed to fetch companies:', err);
        } finally {
            setLoading(false);
        }
    };

    const totalPages = Math.ceil(totalCount / pageSize);

    return (
        <div className="space-y-5">
            {/* Search & Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                    <input
                        type="text"
                        placeholder="Search companies, emails, cities..."
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
                        className="w-full pl-11 pr-4 py-3 bg-[#0a0a0a] border border-white/10 rounded-xl text-white text-sm font-medium placeholder:text-neutral-600 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition-all"
                    />
                </div>
                <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                    <input
                        type="text"
                        placeholder="State (e.g. TX)"
                        value={stateFilter}
                        onChange={(e) => { setStateFilter(e.target.value.toUpperCase()); setPage(0); }}
                        className="pl-10 pr-4 py-3 bg-[#0a0a0a] border border-white/10 rounded-xl text-white text-sm font-medium placeholder:text-neutral-600 focus:outline-none focus:border-orange-500/50 w-36 transition-all"
                        maxLength={2}
                    />
                </div>
            </div>

            {/* Results count */}
            <div className="flex items-center justify-between text-sm">
                <p className="text-neutral-500 font-medium">
                    {totalCount.toLocaleString()} companies
                    {searchTerm && ` matching "${searchTerm}"`}
                    {stateFilter && ` in ${stateFilter}`}
                </p>
            </div>

            {/* Table */}
            <div className="bg-[#070707]/90 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/5">
                                <th className="px-5 py-4 text-left text-xs font-bold text-neutral-400 uppercase tracking-wider">Company</th>
                                <th className="px-5 py-4 text-left text-xs font-bold text-neutral-400 uppercase tracking-wider">Location</th>
                                <th className="px-5 py-4 text-left text-xs font-bold text-neutral-400 uppercase tracking-wider">Contact</th>
                                <th className="px-5 py-4 text-left text-xs font-bold text-neutral-400 uppercase tracking-wider">Type</th>
                                <th className="px-5 py-4 text-left text-xs font-bold text-neutral-400 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-5 py-4"><div className="h-4 bg-white/10 rounded w-40" /></td>
                                        <td className="px-5 py-4"><div className="h-4 bg-white/10 rounded w-32" /></td>
                                        <td className="px-5 py-4"><div className="h-4 bg-white/10 rounded w-36" /></td>
                                        <td className="px-5 py-4"><div className="h-4 bg-white/10 rounded w-20" /></td>
                                        <td className="px-5 py-4"><div className="h-4 bg-white/10 rounded w-16" /></td>
                                    </tr>
                                ))
                            ) : companies.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-5 py-12 text-center">
                                        <Building2 className="w-10 h-10 text-neutral-700 mx-auto mb-3" />
                                        <p className="text-neutral-400 font-medium">No companies found</p>
                                    </td>
                                </tr>
                            ) : (
                                companies.map((company) => (
                                    <tr key={company.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
                                                    <Building2 className="w-4 h-4 text-orange-400" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-white">{company.company_name}</p>
                                                    {company.planhub_id && (
                                                        <p className="text-[10px] text-neutral-600 font-mono mt-0.5">PH-{company.planhub_id}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-2">
                                                <MapPin className="w-3.5 h-3.5 text-neutral-600 shrink-0" />
                                                <span className="text-sm text-neutral-300">
                                                    {[company.city, company.state].filter(Boolean).join(', ') || '—'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="space-y-1">
                                                {company.email && (
                                                    <div className="flex items-center gap-2">
                                                        <Mail className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                                        <a href={`mailto:${company.email}`} className="text-sm text-indigo-300 hover:text-indigo-200 truncate max-w-[200px]">{company.email}</a>
                                                    </div>
                                                )}
                                                {company.phone && (
                                                    <div className="flex items-center gap-2">
                                                        <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                                        <span className="text-sm text-neutral-300">{company.phone}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            {company.industry_type && (
                                                <span className="px-2.5 py-1 bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[11px] font-bold rounded-lg uppercase">
                                                    {company.industry_type}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-5 py-4">
                                            {company.website && (
                                                <a href={company.website.startsWith('http') ? company.website : `https://${company.website}`} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors inline-flex">
                                                    <ExternalLink className="w-3.5 h-3.5 text-neutral-400" />
                                                </a>
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
                    <div className="px-5 py-4 border-t border-white/5 flex items-center justify-between">
                        <p className="text-sm text-neutral-500 font-medium">
                            Page {page + 1} of {totalPages}
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage(Math.max(0, page - 1))}
                                disabled={page === 0}
                                className="p-2 rounded-lg bg-white/5 border border-white/10 text-neutral-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
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
