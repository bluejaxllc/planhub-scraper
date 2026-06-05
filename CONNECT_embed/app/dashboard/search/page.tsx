"use client";

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
    Search as SearchIcon, SlidersHorizontal, X, Briefcase,
    Building2, MapPin, Loader2, User, Fuel, Radio, Zap, Activity,
    ExternalLink, Mail, Phone, ChevronRight
} from 'lucide-react';

interface GlobalSearchResult {
    id: string;
    full_name: string;
    current_title: string;
    current_company: string;
    location: string;
    sector: 'telecom' | 'oil_gas' | 'fire_safety' | 'energy';
    sources: string[];
    email?: string;
    phone?: string;
    created_at: string;
}

const SECTOR_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: any }> = {
    telecom: { label: 'Telecom', color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', icon: Radio },
    oil_gas: { label: 'Oil & Gas', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', icon: Fuel },
    fire_safety: { label: 'Fire & Safety', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', icon: Zap },
    energy: { label: 'Energy', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: Activity },
};

export default function SearchPage() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<GlobalSearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);

    const handleSearch = async () => {
        if (!query.trim()) return;
        setLoading(true);
        setSearched(true);

        try {
            const TABLES = [
                { name: 'telecom_profiles', sector: 'telecom' },
                { name: 'oil_gas_profiles', sector: 'oil_gas' },
                { name: 'fire_safety_profiles', sector: 'fire_safety' },
                { name: 'energy_profiles', sector: 'energy' }
            ];

            const searchPromises = TABLES.map(t => {
                let sQuery = supabase.from(t.name).select('*');

                // Multi-column search
                const filter = `full_name.ilike.%${query}%,current_title.ilike.%${query}%,current_company.ilike.%${query}%,location.ilike.%${query}%`;
                return sQuery.or(filter).limit(20);
            });

            const responses = await Promise.all(searchPromises);
            const combinedResults: GlobalSearchResult[] = [];

            responses.forEach((res, i) => {
                if (res.data) {
                    const sector = TABLES[i].sector as any;
                    res.data.forEach(p => {
                        combinedResults.push({
                            id: p.id,
                            full_name: p.full_name || 'Unknown',
                            current_title: p.current_title || '',
                            current_company: p.current_company || '',
                            location: p.location || '',
                            sector,
                            sources: p.sources || [],
                            email: p.email || (p.emails && p.emails[0]) || '',
                            phone: p.phone || (p.phone_numbers && p.phone_numbers[0]) || '',
                            created_at: p.created_at
                        });
                    });
                }
            });

            // Sort combining by relevance (newest first for now)
            combinedResults.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            setResults(combinedResults);
        } catch (err) {
            console.error('Deep search error:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                    <SearchIcon className="w-8 h-8 text-indigo-400" />
                    Deep Intelligence Search
                </h1>
                <p className="text-neutral-400 font-medium mt-2">Search across all sectoral talent pipelines and profiles</p>
            </div>

            {/* Search Bar */}
            <div className="bg-[#070707]/90 backdrop-blur-xl border border-white/5 rounded-2xl p-6">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 relative">
                        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500 pointer-events-none" />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            placeholder="Enter name, company, job title, or location..."
                            className="w-full pl-12 pr-10 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-neutral-500 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all shadow-inner"
                        />
                        {query && (
                            <button onClick={() => { setQuery(''); setResults([]); setSearched(false); }} className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    <button
                        onClick={handleSearch}
                        disabled={loading || !query.trim()}
                        className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black rounded-xl hover:shadow-[0_0_20px_rgba(99,102,241,0.4)] transition-all transform hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[140px]"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <SearchIcon className="w-5 h-5" />}
                        SEARCH
                    </button>
                </div>
            </div>

            {/* Search Results */}
            {searched && (
                <div className="bg-[#070707]/90 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
                    <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                        <p className="font-bold text-white text-sm">
                            {loading ? 'Searching...' : `${results.length} talent profiles found`}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-neutral-500">
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                            CROSS-SECTOR INDEX
                        </div>
                    </div>

                    {loading ? (
                        <div className="p-20 flex flex-col items-center justify-center gap-4">
                            <Loader2 className="w-10 h-10 animate-spin text-indigo-400" />
                            <p className="text-neutral-500 font-bold animate-pulse">Running Deep Search...</p>
                        </div>
                    ) : results.length === 0 ? (
                        <div className="p-20 text-center">
                            <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-6">
                                <SearchIcon className="w-10 h-10 text-neutral-700" />
                            </div>
                            <p className="text-white font-black text-xl tracking-tight">No intelligence found</p>
                            <p className="text-neutral-500 font-medium mt-2 max-w-sm mx-auto">We couldn't find any profiles matching &ldquo;{query}&rdquo; across our active sectors.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-white/5">
                            {results.map((item) => {
                                const cfg = SECTOR_CONFIG[item.sector];
                                const Icon = cfg?.icon || User;
                                return (
                                    <div key={`${item.sector}-${item.id}`} className="px-6 py-5 flex items-center gap-6 hover:bg-white/[0.02] transition-all group">
                                        <div className={`w-12 h-12 rounded-2xl ${cfg.bg} border ${cfg.border} flex items-center justify-center shrink-0 shadow-lg group-hover:scale-110 transition-transform`}>
                                            <Icon className={`w-6 h-6 ${cfg.color}`} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className="font-black text-white text-lg tracking-tight group-hover:text-indigo-400 transition-colors truncate">
                                                    {item.full_name}
                                                </p>
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black border ${cfg.bg} ${cfg.border} ${cfg.color} uppercase tracking-tighter`}>
                                                    {cfg.label}
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                                                <p className="text-sm text-neutral-400 font-bold truncate flex items-center gap-1.5">
                                                    <Briefcase className="w-3.5 h-3.5 text-neutral-600" /> {item.current_title || 'No Title'}
                                                </p>
                                                <p className="text-sm text-neutral-500 font-medium truncate flex items-center gap-1.5">
                                                    <Building2 className="w-3.5 h-3.5 text-neutral-600" /> {item.current_company || 'Independent'}
                                                </p>
                                                {item.location && (
                                                    <p className="text-sm text-neutral-500 font-medium truncate flex items-center gap-1.5">
                                                        <MapPin className="w-3.5 h-3.5 text-neutral-600" /> {item.location}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="hidden md:flex flex-col items-end gap-2 shrink-0">
                                            <div className="flex items-center gap-2">
                                                {item.email && <Mail className="w-3.5 h-3.5 text-indigo-400 opacity-60" />}
                                                {item.phone && <Phone className="w-3.5 h-3.5 text-emerald-400 opacity-60" />}
                                                <span className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">
                                                    Added {new Date(item.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <button className="flex items-center gap-1.5 text-[10px] font-black text-indigo-400 hover:text-indigo-300 transition-colors uppercase tracking-widest group-hover:translate-x-1 transition-transform">
                                                View Intel <ChevronRight className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
