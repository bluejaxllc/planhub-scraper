"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/lib/UserContext';
import { Lock, ChevronLeft, ChevronRight, User, Mail, Building2, Calendar, Link as LinkIcon, ShieldAlert, ArrowRight, Phone, Tag, MapPin, Filter, Download } from 'lucide-react';

interface TelecomProfile {
    id: string;
    full_name: string;
    current_title: string | null;
    current_company: string | null;
    skills: string[] | null;
    linkedin_url: string | null;
    emails: string[] | null;
    phone_numbers: string[] | null;
    sources: string[] | null;
    sub_sector: string | null;
    location: string | null;
    certifications: string[] | null;
    created_at: string;
}

const SUB_SECTOR_LABELS: Record<string, string> = {
    tower_infrastructure: 'Tower / Infrastructure',
    fiber_osp: 'Fiber / OSP',
    network_engineering: 'Network Engineering',
    wireless_rf: 'Wireless / RF',
    data_center: 'Data Center',
    it_infrastructure: 'IT Infrastructure',
    it_project_mgmt: 'IT Project Mgmt',
    project_management: 'Telecom PM',
    telecom_sales: 'Telecom Sales',
    fcc_cellular: 'FCC Cellular',
    fcc_microwave: 'FCC Microwave',
    fcc_land_mobile: 'FCC Land Mobile',
    fcc_broadband: 'FCC Broadband',
};

const SUB_SECTOR_COLORS: Record<string, string> = {
    tower_infrastructure: 'bg-orange-500/10 text-orange-300 border-orange-500/20',
    fiber_osp: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20',
    network_engineering: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
    wireless_rf: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
    data_center: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
    it_infrastructure: 'bg-teal-500/10 text-teal-300 border-teal-500/20',
    it_project_mgmt: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20',
    project_management: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
    telecom_sales: 'bg-pink-500/10 text-pink-300 border-pink-500/20',
    fcc_cellular: 'bg-lime-500/10 text-lime-300 border-lime-500/20',
    fcc_microwave: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/20',
    fcc_land_mobile: 'bg-green-500/10 text-green-300 border-green-500/20',
    fcc_broadband: 'bg-sky-500/10 text-sky-300 border-sky-500/20',
};

interface TelecomProfilesTableProps {
    isPro?: boolean;
}

export default function TelecomProfilesTable({ isPro: isPropPro = false }: TelecomProfilesTableProps) {
    const { isSuperAdmin, user } = useUser();
    const isPro = isSuperAdmin || user?.subscription_status === 'active' || isPropPro;
    const [profiles, setProfiles] = useState<TelecomProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [subSectorFilter, setSubSectorFilter] = useState<string>('');
    const ITEMS_PER_PAGE = 15;

    useEffect(() => {
        fetchProfiles();
    }, [page, subSectorFilter]);

    const fetchProfiles = async () => {
        setLoading(true);
        try {
            let countQuery = supabase
                .from('telecom_profiles')
                .select('*', { count: 'exact', head: true });
            if (subSectorFilter) countQuery = countQuery.eq('sub_sector', subSectorFilter);

            const { count } = await countQuery;

            const total = count || 0;
            setTotalCount(total);
            setTotalPages(Math.ceil(total / ITEMS_PER_PAGE));

            const from = (page - 1) * ITEMS_PER_PAGE;
            const to = from + ITEMS_PER_PAGE - 1;

            let dataQuery = supabase
                .from('telecom_profiles')
                .select('*')
                .order('created_at', { ascending: false })
                .range(from, to);
            if (subSectorFilter) dataQuery = dataQuery.eq('sub_sector', subSectorFilter);

            const { data, error } = await dataQuery;

            if (error) throw error;
            if (data) setProfiles(data);
        } catch (err) {
            console.error('Error fetching profiles:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-7xl mx-auto relative group/table mt-10">
            {/* Background glow for the table container */}
            <div className="absolute -inset-1 bg-gradient-to-b from-blue-500/10 to-indigo-500/5 rounded-3xl blur-2xl opacity-50 z-0"></div>

            <div className="relative z-10 bg-[#070707]/90 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.6)] overflow-hidden text-neutral-200 font-sans">

                {/* Sleek Header */}
                <div className="px-8 py-6 border-b border-white/5 bg-black/40">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-2xl font-black text-white flex items-center gap-3 tracking-tight">
                                <div className="w-10 h-10 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center shadow-inner">
                                    <User className="w-5 h-5 text-blue-400" />
                                </div>
                                Telecom Talent Intelligence
                            </h2>
                            <p className="text-sm font-medium text-neutral-400 mt-2 ml-13">
                                {totalCount.toLocaleString()} profiles synced from FCC, job boards, and industry networks
                            </p>
                        </div>
                        {!isPro && (
                            <button className="relative group px-6 py-3 bg-gradient-to-b from-neutral-800 to-neutral-900 overflow-hidden text-white text-sm font-bold rounded-xl border border-white/10 shadow-lg transition-all hover:scale-105 active:scale-95 flex items-center gap-2">
                                <div className="absolute inset-0 bg-blue-500/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                                <span className="relative z-10 flex items-center gap-2 shadow-sm">
                                    <Lock className="w-4 h-4 text-blue-400" /> Unlock Premium
                                </span>
                            </button>
                        )}
                    </div>

                    {/* Sub-Sector Filter Bar */}
                    <div className="mt-4 flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-2 text-neutral-500">
                            <Filter className="w-4 h-4" />
                            <span className="text-xs font-bold uppercase tracking-wider">Filter:</span>
                        </div>
                        <button
                            onClick={() => { setSubSectorFilter(''); setPage(1); }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${!subSectorFilter
                                ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                                : 'bg-white/5 text-neutral-400 border-white/5 hover:bg-white/10'
                                }`}
                        >
                            All
                        </button>
                        {Object.entries(SUB_SECTOR_LABELS).map(([key, label]) => (
                            <button
                                key={key}
                                onClick={() => { setSubSectorFilter(key); setPage(1); }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${subSectorFilter === key
                                    ? (SUB_SECTOR_COLORS[key] || 'bg-blue-500/20 text-blue-300 border-blue-500/30')
                                    : 'bg-white/5 text-neutral-400 border-white/5 hover:bg-white/10'
                                    }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Dynamic Table Content */}
                <div className="overflow-x-auto relative min-h-[500px]">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-white/[0.02] text-neutral-400 uppercase text-xs font-bold tracking-widest border-b border-white/5">
                            <tr>
                                <th className="px-6 py-5">Profile Details</th>
                                <th className="px-6 py-5">Company & Location</th>
                                <th className="px-6 py-5">Verified Contact</th>
                                <th className="px-6 py-5">Skills & Certs</th>
                                <th className="px-6 py-5 text-right">Added</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse bg-white/[0.01]">
                                        <td className="px-8 py-6"><div className="h-4 bg-white/10 rounded-md w-48"></div></td>
                                        <td className="px-8 py-6"><div className="h-4 bg-white/10 rounded-md w-32"></div></td>
                                        <td className="px-8 py-6"><div className="h-4 bg-white/10 rounded-md w-40"></div></td>
                                        <td className="px-8 py-6"><div className="h-4 bg-white/10 rounded-md w-32"></div></td>
                                        <td className="px-8 py-6 flex justify-end"><div className="h-4 bg-white/10 rounded-md w-24"></div></td>
                                    </tr>
                                ))
                            ) : profiles.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-8 py-24 text-center">
                                        <div className="flex flex-col items-center justify-center text-neutral-500">
                                            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 shadow-inner">
                                                <User className="w-8 h-8 text-neutral-600" />
                                            </div>
                                            <p className="text-xl text-neutral-300 font-bold tracking-tight">Database is Empty</p>
                                            <p className="text-sm mt-2 font-medium">Initialize the telecom scraper to populate profiles.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                profiles.map((profile) => (
                                    <tr key={profile.id} className="hover:bg-blue-500/5 transition-all duration-300 group">

                                        {/* Profile Details */}
                                        <td className="px-6 py-5">
                                            <div className="font-bold text-white text-sm flex flex-col gap-1.5">
                                                <div className="flex items-center gap-3">
                                                    {profile.full_name}
                                                    {profile.linkedin_url && (
                                                        <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer" className="opacity-0 group-hover:opacity-100 flex items-center justify-center w-7 h-7 rounded-md bg-white/10 text-neutral-300 hover:bg-blue-500 hover:text-white transition-all transform scale-90 group-hover:scale-100">
                                                            <LinkIcon className="w-3.5 h-3.5" />
                                                        </a>
                                                    )}
                                                </div>
                                                <span className="text-xs font-medium text-neutral-400">{profile.current_title || 'No title specified'}</span>
                                                {profile.sub_sector && (
                                                    <span className={`inline-flex w-fit text-[10px] font-bold px-2 py-0.5 rounded-full border ${SUB_SECTOR_COLORS[profile.sub_sector] || 'bg-white/5 text-neutral-400 border-white/10'}`}>
                                                        {SUB_SECTOR_LABELS[profile.sub_sector] || profile.sub_sector}
                                                    </span>
                                                )}
                                            </div>
                                        </td>

                                        {/* Blurry Company Name */}
                                        <td className="px-6 py-5">
                                            {!isPro ? (
                                                <div className="flex flex-col gap-2">
                                                    <div className="relative inline-block w-40 h-7 group/blur cursor-not-allowed">
                                                        <div className="absolute inset-0 bg-white/10 rounded-md blur-md opacity-70 filter select-none transition-all group-hover/blur:bg-blue-500/20"></div>
                                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/blur:opacity-100 transition-opacity duration-300 text-xs font-bold tracking-widest text-blue-300 uppercase">
                                                            <Lock className="w-3.5 h-3.5 mr-2" /> Hidden
                                                        </div>
                                                    </div>
                                                    {profile.location && (
                                                        <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                                                            <MapPin className="w-3 h-3" />
                                                            {profile.location}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="flex flex-col gap-2">
                                                    <div className="flex items-center gap-3 text-neutral-200 font-medium bg-white/5 py-1.5 px-3 rounded-md w-fit border border-white/5 shadow-inner">
                                                        <Building2 className="w-4 h-4 text-blue-400 shrink-0" />
                                                        <span className="truncate max-w-[200px]">{profile.current_company || 'Independent'}</span>
                                                    </div>
                                                    {profile.location && (
                                                        <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                                                            <MapPin className="w-3 h-3 text-neutral-500" />
                                                            {profile.location}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </td>

                                        {/* Blurry Contact Info */}
                                        <td className="px-8 py-5">
                                            {!isPro ? (
                                                <div className="relative inline-block w-52 h-7 group/blur cursor-not-allowed">
                                                    <div className="absolute inset-0 bg-white/10 rounded-md blur-md opacity-70 filter select-none transition-all group-hover/blur:bg-blue-500/20"></div>
                                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/blur:opacity-100 transition-opacity duration-300 text-xs font-bold tracking-widest text-blue-300 uppercase">
                                                        <Lock className="w-3.5 h-3.5 mr-2" /> Upgrade
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col gap-2 text-neutral-200 font-medium">
                                                    {profile.emails && profile.emails.length > 0 ? (
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-6 h-6 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                                                                <Mail className="w-3 h-3 text-emerald-400" />
                                                            </div>
                                                            <span className="text-sm">{profile.emails[0]}</span>
                                                        </div>
                                                    ) : null}
                                                    {profile.phone_numbers && profile.phone_numbers.length > 0 ? (
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-6 h-6 rounded-md bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                                                                <Phone className="w-3 h-3 text-indigo-400" />
                                                            </div>
                                                            <span className="text-sm">{profile.phone_numbers[0]}</span>
                                                        </div>
                                                    ) : null}
                                                    {(!profile.emails || profile.emails.length === 0) && (!profile.phone_numbers || profile.phone_numbers.length === 0) && (
                                                        <span className="text-neutral-600 italic">No contact info</span>
                                                    )}
                                                </div>
                                            )}
                                        </td>

                                        {/* Skills & Certs */}
                                        <td className="px-6 py-5 max-w-xs overflow-hidden">
                                            <div className="flex gap-1.5 items-center flex-wrap">
                                                {profile.skills && profile.skills.slice(0, 3).map((skill, i) => (
                                                    <span key={i} className="text-[10px] font-bold bg-blue-500/10 text-blue-300 px-2 py-0.5 rounded-full border border-blue-500/20">
                                                        {skill}
                                                    </span>
                                                ))}
                                                {profile.skills && profile.skills.length > 3 && (
                                                    <span className="text-[10px] font-bold text-neutral-500">+{profile.skills.length - 3}</span>
                                                )}
                                            </div>
                                            {profile.certifications && profile.certifications.length > 0 && (
                                                <div className="flex gap-1.5 items-center flex-wrap mt-1.5">
                                                    {profile.certifications.slice(0, 1).map((cert, i) => (
                                                        <span key={i} className="text-[10px] font-bold bg-emerald-500/10 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/20 truncate max-w-[180px]">
                                                            {cert}
                                                        </span>
                                                    ))}
                                                    {profile.certifications.length > 1 && (
                                                        <span className="text-[10px] font-bold text-neutral-500">+{profile.certifications.length - 1}</span>
                                                    )}
                                                </div>
                                            )}
                                            <div className="flex gap-1.5 items-center flex-wrap mt-1.5">
                                                {profile.sources && profile.sources.map((src, i) => (
                                                    <span key={i} className="text-[9px] uppercase tracking-wider font-bold bg-white/5 text-neutral-500 px-2 py-0.5 rounded-full border border-white/5">
                                                        {src}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>

                                        {/* Date Added */}
                                        <td className="px-6 py-5 text-neutral-400 font-medium text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Calendar className="w-4 h-4 text-neutral-500 shrink-0" />
                                                {new Date(profile.created_at).toLocaleDateString(undefined, {
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
                    {!isPro && !loading && profiles.length > 0 && (
                        <div className="absolute top-[30%] left-0 right-0 bottom-0 bg-gradient-to-t from-[#050505] via-[#050505]/95 to-transparent flex flex-col items-center justify-end pb-12 z-20 pointer-events-none">
                            <div className="relative">
                                <div className="absolute -inset-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl blur-xl opacity-30 animate-pulse" />
                                <div className="bg-[#0f0f0f]/90 backdrop-blur-2xl p-10 rounded-2xl border border-white/10 shadow-[0_0_60px_rgba(0,0,0,0.8)] flex flex-col items-center text-center max-w-lg transform translate-y-6 pointer-events-auto ring-1 ring-white/5 relative z-10 transition-transform hover:-translate-y-1 duration-500">
                                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(59,130,246,0.5)] border border-white/20">
                                        <ShieldAlert className="w-8 h-8 text-white drop-shadow-md" />
                                    </div>
                                    <h3 className="text-2xl font-black text-white mb-3 tracking-tight">Premium Talent Revealed</h3>
                                    <p className="text-base text-neutral-400 mb-8 leading-relaxed font-medium">
                                        We've blurred the verified emails, phone numbers, and full company details for thousands of telecom professionals. Upgrade to Pro to bypass obfuscation and pipe these straight to your CRM.
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
                        Showing <span className="font-bold text-white">{(page - 1) * ITEMS_PER_PAGE + (profiles.length > 0 ? 1 : 0)}</span> <span className="text-neutral-600">—</span> <span className="font-bold text-white">{Math.min(page * ITEMS_PER_PAGE, (page - 1) * ITEMS_PER_PAGE + profiles.length)}</span> bounds
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
