"use client";

import React, { useState, useEffect } from 'react';
import { AlertTriangle, XCircle } from 'lucide-react';

const HEALTH_API_URL = process.env.NEXT_PUBLIC_SCRAPER_API_URL || 'https://planhub-scout-production.up.railway.app/api/scrapers/health';

interface ScraperHealth {
    id: number;
    scraper_name: string;
    status: 'Active' | 'Stalled' | 'Error';
    last_heartbeat: string;
    last_error: string | null;
}

export function ScraperHealthBanner() {
    const [scrapers, setScrapers] = useState<ScraperHealth[]>([]);
    const [hasIssue, setHasIssue] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHealth = async () => {
            try {
                const res = await fetch(HEALTH_API_URL);
                if (res.ok) {
                    const data = await res.json();
                    setScrapers(data.scrapers || []);
                    setHasIssue(data.has_issue || false);
                }
            } catch (err) {
                console.error("Failed to fetch scraper health", err);
            } finally {
                setLoading(false);
            }
        };

        fetchHealth();
        // Poll every 30 seconds
        const interval = setInterval(fetchHealth, 30000);
        return () => clearInterval(interval);
    }, []);

    if (loading || !hasIssue) return null;

    return (
        <div className="bg-[#1A0505] border-b border-red-500/20 px-6 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full z-40 relative">
            <div className="flex items-start sm:items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.2)] flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                </div>
                <div>
                    <h3 className="text-sm font-black tracking-wide text-red-400 uppercase">Data Pipeline Alert</h3>
                    <p className="text-xs text-red-400/80 font-medium mt-0.5">
                        One or more intelligent scrapers are currently stalled or reporting errors.
                    </p>
                </div>
            </div>
            <div className="flex flex-col gap-1.5 shrink-0 max-h-24 overflow-y-auto pr-2 w-full sm:w-auto">
                {scrapers.filter(s => s.status !== 'Active').map(s => (
                    <div key={s.id} className="flex items-center gap-2 text-xs bg-black/40 border border-red-500/10 px-2.5 py-1.5 rounded-md">
                        {s.status === 'Error' ? <XCircle className="w-3 h-3 text-red-500" /> : <AlertTriangle className="w-3 h-3 text-amber-500" />}
                        <span className="font-mono text-neutral-300 truncate max-w-[150px]">{s.scraper_name}</span>
                        <span className={`font-black uppercase tracking-wider text-[10px] ${s.status === 'Error' ? 'text-red-400' : 'text-amber-400'}`}>{s.status}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
