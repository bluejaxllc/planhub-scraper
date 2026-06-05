"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useUser } from '@/lib/UserContext';
import { useTheme } from '@/lib/ThemeContext';
import { ScraperHealthBanner } from '@/components/ScraperHealthBanner';
import {
    Database, LayoutDashboard, Search, Settings, LogOut, Zap, CreditCard,
    Bell, ChevronRight, Menu, X, Radio, HardHat, Users,
    Shield, ChevronDown, FolderOpen, Building2, Wrench, Paintbrush,
    Flame, Tractor, Cog, FileText, Fuel, Send, RefreshCw, UtilityPole, MessageSquare,
    Briefcase, Sun, Moon
} from 'lucide-react';

interface NavSection {
    title: string;
    items: { label: string; href: string; icon: any; sector?: string }[];
    requiredRole?: string;
    requiredSector?: string;
}

const SCOUT_PRO_URL = process.env.NEXT_PUBLIC_SCOUT_PRO_PAYMENT_URL
    || `https://admin.bluejax.ai/v2/location/GC3Q5eqwDKw2MhZQ0KSj/payments/checkout`;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { user, loading, isSuperAdmin, hasSector, persona, setTestPersona, signOut } = useUser();
    const { theme, toggleTheme } = useTheme();

    // Base system sections available to everyone
    const systemSections = [
        {
            title: 'SYSTEM',
            items: [
                { label: 'Billing', href: '/dashboard/billing', icon: CreditCard },
                { label: 'Settings', href: '/dashboard/settings', icon: Settings },
            ],
        }
    ];

    // Define navigation based on persona
    let personaSections: NavSection[] = [];

    switch (persona) {
        case 'estimator':
            personaSections = [
                {
                    title: 'BIDS & PROJECTS',
                    items: [
                        { label: 'Market Overview', href: '/dashboard', icon: LayoutDashboard },
                        { label: 'Construction', icon: Building2, href: '/dashboard/construction', sector: 'construction' },
                        { label: 'Finishes', icon: Paintbrush, href: '/dashboard/finishes', sector: 'finishes' },
                        { label: 'Sitework', icon: Tractor, href: '/dashboard/sitework', sector: 'sitework' },
                        { label: 'Oil & Gas', icon: Fuel, href: '/dashboard/oil-gas', sector: 'oil_gas' },
                        { label: 'Telecom & IT', icon: Radio, href: '/dashboard/telecom', sector: 'telecom' },
                        { label: 'Fire & Safety', icon: Flame, href: '/dashboard/fire-safety', sector: 'fire_safety' },
                    ],
                },
                {
                    title: 'TOOLS',
                    items: [
                        { label: 'Database Search', href: '/dashboard/search', icon: Search },
                        { label: 'Company Database', href: '/dashboard/construction?tab=companies', icon: Building2, sector: 'construction' },
                        { label: 'General Leads', href: '/dashboard/leads', icon: FileText, sector: 'leads' },
                    ],
                }
            ];
            break;

        default:
            // The default/legacy view for Recruiters and Admins
            personaSections = [
                {
                    title: 'INTELLIGENCE',
                    requiredRole: 'super_admin',
                    items: [
                        { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
                        { label: 'Campaigns', href: '/dashboard/campaigns', icon: Send },
                        { label: 'User Management', href: '/dashboard/admin/users', icon: Users },
                        { label: 'Scraper Registry', href: '/dashboard/admin/scrapers', icon: Database },
                    ],
                },
                {
                    title: 'RECRUITING',
                    requiredSector: 'recruiting',
                    items: [
                        { label: 'Recruiter Hub', href: '/dashboard/recruiter', icon: LayoutDashboard, sector: 'recruiting' },
                        { label: 'Talent Pool', href: '/dashboard/recruiting/leads', icon: Users, sector: 'recruiting' },
                        { label: 'Jobs Index', href: '/dashboard/recruiting/jobs', icon: Briefcase, sector: 'recruiting' },
                        { label: 'Oil & Gas', href: '/dashboard/oil-gas', icon: Fuel, sector: 'oil_gas' },
                        { label: 'Telecom & IT', href: '/dashboard/telecom', icon: Radio, sector: 'telecom' },
                        { label: 'Fire & Safety', href: '/dashboard/fire-safety', icon: Flame, sector: 'fire_safety' },
                    ],
                },
                {
                    title: 'SALES & PIPELINE',
                    items: [
                        { label: 'Database Search', href: '/dashboard/search', icon: Search },
                        { label: 'General Leads', href: '/dashboard/leads', icon: FileText, sector: 'leads' },
                        { label: 'GCs & Subs', href: '/dashboard/construction', icon: HardHat, sector: 'construction' },
                        { label: 'Finishes Pipeline', href: '/dashboard/finishes', icon: Paintbrush, sector: 'finishes' },
                        { label: 'Sitework Pipeline', href: '/dashboard/sitework', icon: Tractor, sector: 'sitework' },
                        { label: 'Oil & Gas Pipeline', href: '/dashboard/leads/oil-gas', icon: Fuel, sector: 'oil_gas' },
                    ],
                }
            ];
            break;
    }

    const sections: NavSection[] = [...personaSections, ...systemSections];

    const handleSignOut = async () => {
        await signOut();
        router.push('/login');
    };

    // Filter sections based on user role and sectors
    const visibleSections = sections.map(section => {
        // Intelligence section: super_admin only
        if (section.requiredRole === 'super_admin' && !isSuperAdmin) {
            // Non-super_admin users still get Overview (as their landing page)
            return {
                ...section,
                title: 'DASHBOARD',
                items: [{ label: 'Overview', href: '/dashboard', icon: LayoutDashboard }],
            };
        }

        // Check if the entire section requires a specific sector
        if (section.requiredSector && !hasSector(section.requiredSector as any)) {
            return null;
        }

        // Filter items by sector access
        const visibleItems = section.items.filter(item => {
            if (!item.sector) return true; // No sector requirement (system items)
            return hasSector(item.sector as any);
        });

        if (visibleItems.length === 0) return null;
        return { ...section, items: visibleItems };
    }).filter(Boolean) as NavSection[];

    const sectionColors: Record<string, string> = {
        'INTELLIGENCE': 'text-cyan-500',
        'DASHBOARD': 'text-cyan-500',
        'RECRUITING': 'text-violet-500',
        'BIDS & PROJECTS': 'text-cyan-500',
        'TOOLS': 'text-indigo-400',
        'SALES & PIPELINE': 'text-orange-500',
        'SYSTEM': 'text-neutral-600',
    };

    return (
        <div className="min-h-screen bg-[#030303] text-neutral-200 font-sans flex">
            {/* Mobile overlay */}
            {sidebarOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
            )}

            {/* Sidebar */}
            <aside className={`fixed lg:sticky top-0 left-0 h-screen w-72 bg-[#070707]/95 backdrop-blur-3xl border-r border-white/5 flex flex-col z-50 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
                {/* Brand */}
                <div className="p-6 border-b border-white/5">
                    <Link href="/" className="flex items-center gap-3 group">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0a0a0f] to-[#111118] border border-white/10 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-shadow">
                            <svg viewBox="0 0 32 32" fill="none" className="w-6 h-6">
                                <rect x="2" y="20" width="8" height="10" rx="1.5" fill="url(#sb1)" />
                                <rect x="12" y="12" width="8" height="18" rx="1.5" fill="url(#sb2)" />
                                <rect x="22" y="4" width="8" height="26" rx="1.5" fill="url(#sb3)" />
                                <defs>
                                    <linearGradient id="sb1" x1="6" y1="20" x2="6" y2="30"><stop stopColor="#60a5fa" /><stop offset="1" stopColor="#3b82f6" /></linearGradient>
                                    <linearGradient id="sb2" x1="16" y1="12" x2="16" y2="30"><stop stopColor="#818cf8" /><stop offset="1" stopColor="#6366f1" /></linearGradient>
                                    <linearGradient id="sb3" x1="26" y1="4" x2="26" y2="30"><stop stopColor="#a78bfa" /><stop offset="1" stopColor="#7c3aed" /></linearGradient>
                                </defs>
                            </svg>
                        </div>
                        <div>
                            <span className="font-extrabold text-xl text-white tracking-tight">Scout<span className="text-indigo-500">.</span></span>
                            <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-[0.2em] mt-0.5">Intelligence v2.1</p>
                        </div>
                    </Link>
                </div>

                {/* Navigation Sections */}
                <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
                    {visibleSections.map((section) => (
                        <div key={section.title}>
                            <p className={`px-4 mb-2.5 text-[10px] font-black uppercase tracking-[0.2em] ${sectionColors[section.title] || 'text-neutral-600'}`}>
                                {section.title}
                            </p>
                            <div className="space-y-1">
                                {section.items.map((item) => {
                                    const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(`${item.href}/`));
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            onClick={() => setSidebarOpen(false)}
                                            className={`flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 group relative overflow-hidden ${isActive
                                                ? 'bg-indigo-500/10 text-white border border-indigo-500/20 shadow-inner shadow-indigo-500/10'
                                                : 'text-neutral-400 hover:text-white hover:bg-white/5 border border-transparent'
                                                }`}
                                        >
                                            {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-indigo-500 rounded-r-full shadow-[0_0_8px_#6366f1]" />}
                                            <item.icon className={`w-5 h-5 ${isActive ? 'text-indigo-400' : 'text-neutral-500 group-hover:text-neutral-300'} transition-colors`} />
                                            {item.label}
                                            {isActive && <ChevronRight className="w-4 h-4 ml-auto text-indigo-400" />}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </nav>

                {/* Theme Toggle */}
                <div className="px-4 pb-2">
                    <button
                        onClick={toggleTheme}
                        className="theme-toggle-btn flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 text-neutral-400 hover:text-white hover:bg-white/5 border border-transparent"
                        title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                    >
                        {theme === 'dark'
                            ? <><Sun className="w-5 h-5 text-amber-400" /> Daylight Mode</>
                            : <><Moon className="w-5 h-5 text-indigo-400" /> Dark Mode</>
                        }
                    </button>
                </div>

                {/* Sidebar Footer */}
                <div className="p-4 border-t border-white/5 space-y-3">
                    {isSuperAdmin && (
                        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-500/10 to-indigo-500/10 border border-cyan-500/20">
                            <div className="w-9 h-9 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                                <Shield className="w-5 h-5 text-cyan-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-white">Super Admin</p>
                                <p className="text-[10px] text-neutral-400 font-medium truncate">{user?.email}</p>
                            </div>
                        </div>
                    )}
                    {!isSuperAdmin && (
                        <a href={SCOUT_PRO_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 hover:border-indigo-500/40 transition-all no-underline">
                            <div className="w-9 h-9 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                                <Zap className="w-5 h-5 text-indigo-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-white">{user?.display_name || 'User'}</p>
                                <p className="text-[10px] text-indigo-400 font-medium">Upgrade for full access →</p>
                            </div>
                        </a>
                    )}
                    <button
                        onClick={handleSignOut}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-neutral-400 hover:text-red-400 hover:bg-red-500/5 transition-all w-full border border-transparent hover:border-red-500/10"
                    >
                        <LogOut className="w-5 h-5" />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-h-screen">
                <ScraperHealthBanner />
                {/* Top Bar */}
                <header className="sticky top-0 z-30 h-16 bg-[#050505]/80 backdrop-blur-2xl border-b border-white/5 flex items-center justify-between px-6 lg:px-8">
                    <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-lg bg-white/5 border border-white/10 text-white">
                        <Menu className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-4 ml-auto">
                        {isSuperAdmin && (
                            <div className="flex items-center gap-2 mr-2">
                                <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest bg-white/5 px-2 py-1 rounded-md border border-white/10">
                                    Persona: <span className="text-white">{persona}</span>
                                </span>
                                <button
                                    onClick={() => setTestPersona(persona === 'estimator' ? 'recruiter' : 'estimator')}
                                    className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:text-white hover:bg-indigo-500/20 transition-all flex items-center gap-2 text-xs font-bold"
                                    title="Switch Dashboard Persona"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    Switch View
                                </button>
                            </div>
                        )}

                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-indigo-500/20 cursor-pointer hover:shadow-indigo-500/40 transition-shadow">
                            {user?.display_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}
