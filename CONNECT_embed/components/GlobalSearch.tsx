'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, Loader2, Database, Building2, Zap, PhoneCall } from 'lucide-react';

export default function GlobalSearch() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (query.length < 3) {
                setResults([]);
                setHasSearched(false);
                return;
            }

            setLoading(true);
            setHasSearched(true);

            try {
                // Query multiple tables concurrently
                // We catch errors on individual queries so if a table is missing, it doesn't break everything
                const safeQuery = async (table: string, column: string) => {
                    try {
                        const { data, error } = await supabase.from(table).select('*').ilike(column, `%${query}%`).limit(5);
                        return { data: error ? [] : (data || []) };
                    } catch {
                        return { data: [] };
                    }
                };

                const [telecomRes, energyRes, leadsRes, companiesRes] = await Promise.all([
                    safeQuery('telecom_profiles', 'current_company'),
                    safeQuery('energy_profiles', 'company_name'),
                    safeQuery('leads', 'company_name'),
                    safeQuery('companies', 'name')
                ]);

                const combined = [
                    ...(telecomRes.data || []).map((r: any) => ({ ...r, _source: 'Telecom', _title: r.current_company || r.full_name, _icon: PhoneCall, _color: 'text-blue-400' })),
                    ...(energyRes.data || []).map((r: any) => ({ ...r, _source: 'Energy', _title: r.company_name, _icon: Zap, _color: 'text-yellow-400' })),
                    ...(leadsRes.data || []).map((r: any) => ({ ...r, _source: 'General', _title: r.company_name, _icon: Database, _color: 'text-indigo-400' })),
                    ...(companiesRes.data || []).map((r: any) => ({ ...r, _source: 'Construction', _title: r.name, _icon: Building2, _color: 'text-orange-400' }))
                ];

                setResults(combined);
            } catch (err) {
                console.error("Global search error:", err);
            } finally {
                setLoading(false);
            }
        }, 400);

        return () => clearTimeout(delayDebounceFn);
    }, [query]);

    return (
        <div className="w-full max-w-2xl mx-auto relative group z-50">
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 rounded-2xl blur-lg opacity-40 group-hover:opacity-75 transition-opacity duration-500 anim-glow"></div>

            <div className="relative bg-[#050505]/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 focus-within:ring-2 focus-within:ring-indigo-500/50">
                <div className="flex items-center px-4 py-3 border-b border-transparent focus-within:border-white/10 transition-colors">
                    <Search className="w-6 h-6 text-neutral-400 shrinks-0" />
                    <input
                        type="text"
                        placeholder="Search across Telecom, Energy, Construction & more..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="w-full bg-transparent border-none text-white text-lg px-4 py-2 outline-none placeholder:text-neutral-500 focus:ring-0"
                        autoComplete="off"
                        spellCheck="false"
                    />
                    {loading && <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />}
                </div>

                {(hasSearched && query.length >= 3) && (
                    <div className="max-h-[400px] overflow-y-auto bg-black/60 border-t border-white/10 custom-scrollbar">
                        {results.length > 0 ? (
                            <div className="flex flex-col py-2">
                                {results.map((item, idx) => {
                                    const Icon = item._icon;
                                    return (
                                        <div key={idx} className="flex items-center gap-4 px-6 py-4 hover:bg-white/5 cursor-pointer border-b border-white/5 last:border-0 transition-colors">
                                            <div className={`p-2 rounded-lg bg-white/5 border border-white/10 ${item._color}`}>
                                                <Icon className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-3">
                                                    <h4 className="text-white font-bold truncate">{item._title}</h4>
                                                    <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-sm bg-white/10 text-neutral-300">
                                                        {item._source}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-neutral-400 truncate mt-1">
                                                    {item.email || item.verified_email || item.job_title || item.city || 'Profile Entity'}
                                                </p>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            <div className="py-8 text-center text-neutral-500 flex flex-col items-center justify-center">
                                {!loading && (
                                    <>
                                        <Database className="w-8 h-8 opacity-20 mb-3" />
                                        <p>No records found across databases.</p>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
