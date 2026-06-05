"use client";

import React from 'react';
import { SECTOR_MAP, type SectorId, type SubNiche } from '@/lib/taxonomy';
import { Zap, Radio, HardHat, Wrench, Paintbrush, Flame, Tractor, Cog, Fuel, FileText, Construction } from 'lucide-react';

const ICONS: Record<string, any> = {
    Zap, Radio, HardHat, Wrench, Paintbrush, Flame, Tractor, Cog, Fuel, FileText,
};

interface SectorPageProps {
    sectorId: SectorId;
}

export default function SectorDashboard({ sectorId }: SectorPageProps) {
    const sector = SECTOR_MAP[sectorId];
    if (!sector) return null;

    const Icon = ICONS[sector.icon] || Cog;

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${sector.color.gradient} flex items-center justify-center shadow-lg`}>
                    <Icon className="w-7 h-7 text-white" />
                </div>
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight">{sector.label}</h1>
                    <p className="text-neutral-400 font-medium mt-1">{sector.description}</p>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[#070707]/90 backdrop-blur-xl border border-white/5 rounded-2xl p-6">
                    <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Total Companies</p>
                    <p className="text-3xl font-black text-white">—</p>
                    <p className="text-xs text-neutral-500 mt-1">Awaiting data</p>
                </div>
                <div className="bg-[#070707]/90 backdrop-blur-xl border border-white/5 rounded-2xl p-6">
                    <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">With Contact Info</p>
                    <p className="text-3xl font-black text-white">—</p>
                    <p className="text-xs text-neutral-500 mt-1">Phone or email</p>
                </div>
                <div className="bg-[#070707]/90 backdrop-blur-xl border border-white/5 rounded-2xl p-6">
                    <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Sub-Niches</p>
                    <p className="text-3xl font-black text-white">{sector.subNiches.length}</p>
                    <p className="text-xs text-neutral-500 mt-1">Categories tracked</p>
                </div>
            </div>

            {/* Sub-Niches Grid */}
            <div>
                <h2 className="text-lg font-bold text-white mb-4">Sub-Niches</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {sector.subNiches.map((niche: SubNiche) => (
                        <div
                            key={niche.id}
                            className={`relative group p-4 rounded-xl border ${sector.color.border} ${sector.color.bg} hover:border-opacity-50 transition-all cursor-pointer`}
                        >
                            <h3 className={`text-sm font-bold ${sector.color.text}`}>{niche.label}</h3>
                            <p className="text-xs text-neutral-500 mt-1">
                                {niche.tradeMatches.length > 0
                                    ? `${niche.tradeMatches.length} trade${niche.tradeMatches.length > 1 ? 's' : ''} mapped`
                                    : 'No data yet'}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Data Status Banner */}
            {sector.subNiches.every(n => n.tradeMatches.length === 0) && (
                <div className="p-5 rounded-2xl bg-amber-500/5 border border-amber-500/20">
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Zap className="w-4 h-4 text-amber-400" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-amber-400">Data Source Pending</p>
                            <p className="text-xs text-neutral-400 mt-1">
                                This sector is ready for data intake. Once a data source is connected,
                                companies will be auto-categorized into the sub-niches above.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
