import Link from 'next/link';
import type { Metadata } from 'next';
import {
    ArrowRight, CheckCircle2, Zap, Shield, Database, Sparkles,
    Fuel, Search, Users, BarChart3, Globe, Mail, Phone,
    Target, Flame, TrendingUp, Clock, Award, MapPin,
    ChevronRight, Building2, ArrowUpRight, ArrowDownRight, Wrench
} from 'lucide-react';

export const metadata: Metadata = {
    title: 'Scout — Oil & Gas Recruiting Intelligence | Find Top Energy Talent',
    description: 'The #1 intelligence platform for Oil & Gas recruiters. Access 50,000+ verified upstream, midstream, and downstream professionals with real-time hiring intent signals.',
    keywords: ['oil and gas recruiting', 'energy staffing', 'petroleum engineering talent', 'upstream recruiting', 'midstream staffing', 'downstream talent', 'oilfield recruiting'],
    openGraph: {
        title: 'Scout — Oil & Gas Recruiting Intelligence',
        description: 'Access 50,000+ verified energy professionals. Real-time hiring intent signals for Oil & Gas recruiters.',
        url: 'https://scout.bluejax.ai/oil-gas',
        siteName: 'Scout Intelligence',
        images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Scout Oil & Gas Intelligence' }],
        locale: 'en_US',
        type: 'website',
    },
};

const SUB_SECTORS = [
    {
        key: 'upstream',
        label: 'Upstream',
        icon: ArrowUpRight,
        color: 'emerald',
        gradient: 'from-emerald-600 to-teal-700',
        description: 'Exploration & production engineers, geologists, drilling supervisors, reservoir analysts.',
        roles: ['Drilling Engineer', 'Reservoir Engineer', 'Geologist', 'Production Supervisor', 'Completions Manager'],
    },
    {
        key: 'midstream',
        label: 'Midstream',
        icon: Fuel,
        color: 'blue',
        gradient: 'from-blue-600 to-cyan-700',
        description: 'Pipeline engineers, logistics coordinators, gas processing plant operators, SCADA technicians.',
        roles: ['Pipeline Engineer', 'Gas Plant Operator', 'SCADA Technician', 'Logistics Coordinator', 'Compressor Tech'],
    },
    {
        key: 'downstream',
        label: 'Downstream',
        icon: ArrowDownRight,
        color: 'orange',
        gradient: 'from-orange-600 to-amber-700',
        description: 'Refinery operators, chemical engineers, process safety managers, turnaround specialists.',
        roles: ['Refinery Operator', 'Process Engineer', 'Safety Manager', 'Chemical Engineer', 'Turnaround Planner'],
    },
    {
        key: 'services',
        label: 'Oilfield Services',
        icon: Wrench,
        color: 'purple',
        gradient: 'from-purple-600 to-violet-700',
        description: 'Wireline operators, MWD/LWD techs, frac crew leads, coiled tubing specialists.',
        roles: ['Wireline Operator', 'MWD Engineer', 'Frac Crew Lead', 'Coiled Tubing Tech', 'Well Testing Specialist'],
    },
];

const PAIN_POINTS = [
    {
        icon: Clock,
        title: 'Weeks to Source, Minutes to Lose',
        description: 'The average O&G recruiting cycle is 45-90 days. Top candidates go off-market in under 2 weeks. Your database is stale before you dial.',
    },
    {
        icon: Target,
        title: 'Generic Job Boards Don\'t Cut It',
        description: 'LinkedIn and Indeed flood you with unqualified applicants. You need niche-specific talent data — not noise.',
    },
    {
        icon: Globe,
        title: 'Permian or Marcellus? You\'re Missing Profiles.',
        description: 'Talent moves between basins constantly. If your data doesn\'t refresh daily, you\'re recruiting from a snapshot, not from reality.',
    },
];

const SOCIAL_PROOF_STATS = [
    { value: '50K+', label: 'Verified Profiles', icon: Users },
    { value: '4', label: 'Sub-Sectors Covered', icon: BarChart3 },
    { value: '24hr', label: 'Data Refresh Cycle', icon: Clock },
    { value: '87%', label: 'Email Accuracy', icon: Mail },
];

const FEATURES = [
    {
        icon: Zap,
        title: 'Real-Time Scraping Engine',
        description: 'Our crawlers monitor job boards, industry directories, and public registries across every major basin 24/7. New profiles appear in your feed within hours, not weeks.',
        color: 'amber',
    },
    {
        icon: Shield,
        title: 'Verified Contact Data',
        description: 'Every email and phone number is triple-validated. Mathematical verification ensures your outreach lands in the primary inbox — no bounces, no wasted send credits.',
        color: 'emerald',
    },
    {
        icon: Database,
        title: 'Sub-Sector Intelligence',
        description: 'Filter by Upstream, Midstream, Downstream, or Oilfield Services. Each profile is auto-classified with role, certifications, basin experience, and hiring intent score.',
        color: 'blue',
    },
    {
        icon: TrendingUp,
        title: 'Hiring Intent Signals',
        description: 'Know which companies are ramping up before your competitors. Our intent engine detects job postings, project awards, and expansion signals in real time.',
        color: 'purple',
    },
    {
        icon: Mail,
        title: 'One-Click CRM Export',
        description: 'Push qualified leads directly to your GoHighLevel, Bullhorn, or download as structured CSV. Your recruiters start calling in minutes, not days.',
        color: 'cyan',
    },
    {
        icon: MapPin,
        title: 'Basin-Level Geo Filters',
        description: 'Permian, Eagle Ford, Bakken, Marcellus, DJ Basin — filter talent by the exact geography your client needs. No more guessing who\'s local.',
        color: 'rose',
    },
];

export default function OilGasLandingPage() {
    return (
        <div className="min-h-screen bg-[#030303] text-neutral-200 font-sans selection:bg-amber-500/30 overflow-x-hidden scroll-smooth" style={{ scrollBehavior: 'smooth' }}>
            {/* Custom Animations */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes floatSlow {
                    0%, 100% { transform: translateY(0px) rotate(0deg); }
                    50% { transform: translateY(-20px) rotate(1deg); }
                }
                @keyframes pulseGlow {
                    0%, 100% { opacity: 0.06; transform: scale(1); }
                    50% { opacity: 0.15; transform: scale(1.05); }
                }
                @keyframes shimmer {
                    0% { background-position: -200% 0; }
                    100% { background-position: 200% 0; }
                }
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(30px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes countUp {
                    from { opacity: 0; transform: scale(0.8); }
                    to { opacity: 1; transform: scale(1); }
                }
                @keyframes borderGlow {
                    0%, 100% { border-color: rgba(245, 158, 11, 0.1); }
                    50% { border-color: rgba(245, 158, 11, 0.3); }
                }
                @keyframes drillPulse {
                    0%, 100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.3); }
                    50% { box-shadow: 0 0 30px 10px rgba(245, 158, 11, 0.1); }
                }
                .anim-float { animation: floatSlow 8s ease-in-out infinite; }
                .anim-glow { animation: pulseGlow 8s ease-in-out infinite; }
                .anim-glow-delay { animation: pulseGlow 8s ease-in-out 4s infinite; }
                .anim-shimmer {
                    background: linear-gradient(90deg, transparent 0%, rgba(245,158,11,0.06) 50%, transparent 100%);
                    background-size: 200% 100%;
                    animation: shimmer 4s linear infinite;
                }
                .anim-fade-up { animation: fadeInUp 0.8s ease-out both; }
                .anim-fade-up-delay { animation: fadeInUp 0.8s ease-out 0.2s both; }
                .anim-fade-up-delay2 { animation: fadeInUp 0.8s ease-out 0.4s both; }
                .anim-count { animation: countUp 0.6s ease-out both; }
                .anim-border-glow { animation: borderGlow 4s ease-in-out infinite; }
                .anim-drill { animation: drillPulse 3s ease-in-out infinite; }
                .hero-overlay {
                    background: linear-gradient(180deg, rgba(3,3,3,0.4) 0%, rgba(3,3,3,0.85) 40%, rgba(3,3,3,1) 100%);
                }
                .card-shine {
                    background: linear-gradient(135deg, rgba(255,255,255,0.03) 0%, transparent 50%, rgba(255,255,255,0.01) 100%);
                }
                html { scroll-behavior: smooth; }
                .scroll-mt-nav { scroll-margin-top: 6rem; }
                `}} />

            {/* Ambient Glows */}
            <div className="fixed top-[-10%] left-[-10%] w-[50%] h-[50%] bg-amber-600/8 rounded-full blur-[180px] pointer-events-none anim-glow" />
            <div className="fixed top-[30%] right-[-15%] w-[40%] h-[50%] bg-orange-600/6 rounded-full blur-[150px] pointer-events-none anim-glow-delay" />
            <div className="fixed bottom-[-10%] left-[20%] w-[35%] h-[40%] bg-amber-500/5 rounded-full blur-[120px] pointer-events-none anim-glow" />

            {/* Navigation */}
            <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-black/50 backdrop-blur-2xl">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-3 group">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:shadow-amber-500/40 transition-shadow">
                            <Fuel className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <span className="font-extrabold text-2xl text-white tracking-tight">Scout<span className="text-amber-500">.</span></span>
                            <p className="text-[9px] text-amber-400/60 font-bold uppercase tracking-[0.2em] -mt-0.5">Oil & Gas Intelligence</p>
                        </div>
                    </Link>
                    <div className="flex items-center gap-4 md:gap-8">
                        <Link href="#problem" className="text-sm font-medium text-neutral-400 hover:text-white transition-colors hidden lg:block">The Problem</Link>
                        <Link href="#sub-sectors" className="text-sm font-medium text-neutral-400 hover:text-white transition-colors hidden lg:block">Coverage</Link>
                        <Link href="#features" className="text-sm font-medium text-neutral-400 hover:text-white transition-colors hidden lg:block">Features</Link>
                        <Link href="#pricing" className="text-sm font-medium text-neutral-400 hover:text-white transition-colors hidden lg:block">Pricing</Link>
                        <Link href="/login" className="text-sm font-medium text-white hover:text-amber-400 transition-colors hidden sm:block">Sign In</Link>
                        <Link href="/dashboard/oil-gas" className="group relative px-4 sm:px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-black text-sm font-bold rounded-xl transition-all hover:scale-105 active:scale-95 shadow-[0_0_24px_rgba(245,158,11,0.3)] flex items-center gap-2 overflow-hidden whitespace-nowrap">
                            <span className="relative z-10 flex items-center gap-2">Start Free Trial <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></span>
                        </Link>
                    </div>
                </div>
            </nav>

            {/* ═══════════════════════════════════════════ */}
            {/* HERO SECTION */}
            {/* ═══════════════════════════════════════════ */}
            <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
                {/* Background Image */}
                <div className="absolute inset-0 z-0">
                    <img src="/oil-gas-hero.png" alt="" className="w-full h-full object-cover" />
                    <div className="hero-overlay absolute inset-0" />
                </div>

                <div className="relative z-10 max-w-7xl mx-auto px-6 pt-32 pb-20 flex flex-col xl:flex-row items-center gap-16">
                    {/* Hero Text */}
                    <div className="flex-1 space-y-8 text-center xl:text-left anim-fade-up">
                        {/* Industry Badge */}
                        <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm font-semibold backdrop-blur-md shadow-[0_0_20px_rgba(245,158,11,0.1)]">
                            <span className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                            </span>
                            Built for Oil & Gas Recruiters
                        </div>

                        <h1 className="text-5xl sm:text-6xl lg:text-8xl font-black text-white tracking-tighter leading-[1.05]">
                            Stop Losing <br className="hidden lg:block" />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-300 to-amber-500">
                                Top O&G Talent
                            </span> <br className="hidden lg:block" />
                            To Stale Data
                        </h1>

                        <p className="text-xl lg:text-2xl text-neutral-300 max-w-2xl mx-auto xl:mx-0 leading-relaxed font-medium anim-fade-up-delay">
                            Access <span className="text-white font-bold">50,000+ verified energy professionals</span> across every major basin. From Permian drillers to Gulf Coast refinery operators — your next placement is already in our feed.
                        </p>

                        {/* CTA Buttons */}
                        <div className="flex flex-col sm:flex-row items-center gap-5 justify-center xl:justify-start pt-2 anim-fade-up-delay2">
                            <Link href="/dashboard/oil-gas" className="group relative w-full sm:w-auto px-10 py-5 bg-gradient-to-r from-amber-500 to-orange-600 text-black font-black rounded-2xl shadow-[0_0_50px_rgba(245,158,11,0.4)] hover:shadow-[0_0_70px_rgba(245,158,11,0.6)] transition-all flex items-center justify-center gap-3 text-lg overflow-hidden hover:-translate-y-1">
                                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out"></div>
                                <span className="relative z-10 flex items-center gap-2">Explore O&G Directory <ArrowRight className="w-6 h-6 group-hover:translate-x-1.5 transition-transform" /></span>
                            </Link>
                            <Link href="#pricing" className="group w-full sm:w-auto px-10 py-5 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold rounded-2xl backdrop-blur-md transition-all flex items-center justify-center text-lg hover:-translate-y-1">
                                View Pricing
                            </Link>
                        </div>

                        {/* Trust Badges */}
                        <div className="pt-6 flex flex-wrap items-center justify-center xl:justify-start gap-x-10 gap-y-4 text-sm text-neutral-400 font-bold uppercase tracking-widest">
                            <div className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-emerald-500" /> Verified Contacts</div>
                            <div className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-emerald-500" /> Daily Updates</div>
                            <div className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-emerald-500" /> No Contracts</div>
                        </div>
                    </div>

                    {/* Hero Visual: Live Data Preview */}
                    <div className="flex-1 w-full max-w-xl xl:max-w-none relative z-10 anim-float">
                        <div className="absolute -inset-1.5 bg-gradient-to-tr from-amber-500/40 to-orange-600/40 rounded-3xl blur-2xl opacity-30 anim-glow" />

                        <div className="w-full bg-[#050505]/90 backdrop-blur-3xl border border-amber-500/10 rounded-3xl shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden card-shine">
                            {/* Terminal Header */}
                            <div className="bg-white/5 border-b border-white/5 px-6 py-4 flex items-center justify-between">
                                <div className="flex gap-2.5">
                                    <div className="w-3.5 h-3.5 rounded-full bg-[#ff5f56] shadow-[0_0_10px_#ff5f56]"></div>
                                    <div className="w-3.5 h-3.5 rounded-full bg-[#ffbd2e] shadow-[0_0_10px_#ffbd2e]"></div>
                                    <div className="w-3.5 h-3.5 rounded-full bg-[#27c93f] shadow-[0_0_10px_#27c93f]"></div>
                                </div>
                                <div className="text-xs text-neutral-400 font-mono flex items-center gap-2 bg-black/50 px-5 py-2 rounded-full border border-white/5 tracking-wider">
                                    <Fuel className="w-4 h-4 text-amber-400" /> scout://oil-gas/feed
                                </div>
                                <div className="w-16"></div>
                            </div>

                            {/* Live Feed Simulation */}
                            <div className="p-6 space-y-3">
                                {[
                                    { company: 'Halliburton', title: 'Sr. Drilling Engineer', location: 'Midland, TX', sub: 'Upstream', color: 'emerald' },
                                    { company: 'Kinder Morgan', title: 'Pipeline Integrity Mgr', location: 'Houston, TX', sub: 'Midstream', color: 'blue' },
                                    { company: 'Valero Energy', title: 'Refinery Ops Supervisor', location: 'Port Arthur, TX', sub: 'Downstream', color: 'orange' },
                                    { company: 'Schlumberger', title: 'MWD Field Engineer', location: 'Williston, ND', sub: 'Services', color: 'purple' },
                                    { company: 'Pioneer Natural', title: 'Completions Manager', location: 'Midland, TX', sub: 'Upstream', color: 'emerald' },
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center gap-4 px-4 py-3.5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-amber-500/20 hover:bg-amber-500/[0.03] transition-all group cursor-pointer">
                                        <div className={`w-10 h-10 rounded-lg bg-${item.color}-500/10 border border-${item.color}-500/20 flex items-center justify-center shrink-0`}>
                                            <Building2 className={`w-5 h-5 text-${item.color}-400`} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-white truncate group-hover:text-amber-300 transition-colors">{item.company}</p>
                                            <p className="text-xs text-neutral-400 font-medium truncate">{item.title}</p>
                                        </div>
                                        <div className="text-right shrink-0 hidden sm:block">
                                            <p className="text-[10px] text-neutral-500 font-medium">{item.location}</p>
                                            <span className={`text-[10px] font-bold text-${item.color}-400`}>{item.sub}</span>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-neutral-600 group-hover:text-amber-400 transition-colors shrink-0" />
                                    </div>
                                ))}
                                {/* Streaming indicator */}
                                <div className="flex items-center gap-2 px-4 py-2 text-xs text-amber-400/70 font-mono">
                                    <span className="animate-pulse w-2 h-4 bg-amber-500 inline-block shadow-[0_0_8px_rgba(245,158,11,0.6)]"></span>
                                    <span>streaming live profiles...</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Social Proof Stats Bar */}
            <section className="relative z-20 -mt-4">
                <div className="max-w-5xl mx-auto px-6">
                    <div className="bg-[#070707]/90 backdrop-blur-2xl border border-white/5 rounded-2xl p-1 grid grid-cols-2 md:grid-cols-4 gap-0.5 anim-border-glow">
                        {SOCIAL_PROOF_STATS.map((stat, i) => (
                            <div key={i} className="text-center py-6 px-4 rounded-xl hover:bg-white/[0.02] transition-all">
                                <stat.icon className="w-5 h-5 text-amber-400 mx-auto mb-2" />
                                <p className="text-3xl font-black text-white tracking-tight">{stat.value}</p>
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500 mt-1">{stat.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <main className="relative z-10">

                {/* ═══════════════════════════════════════════ */}
                {/* PROBLEM SECTION */}
                {/* ═══════════════════════════════════════════ */}
                <section id="problem" className="py-28 px-6 max-w-7xl mx-auto scroll-mt-nav">
                    <div className="text-center max-w-3xl mx-auto mb-20">
                        <p className="text-amber-400 text-sm font-black uppercase tracking-[0.3em] mb-4">The Industry Problem</p>
                        <h2 className="text-4xl lg:text-6xl font-black text-white mb-6 tracking-tight">
                            O&G Recruiting Is <br className="hidden lg:block" />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400">Broken.</span>
                        </h2>
                        <p className="text-xl text-neutral-400 leading-relaxed font-medium">
                            Your competitors are closing reqs faster because they have better data. Here's what's killing your pipeline.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                        {PAIN_POINTS.map((point, i) => (
                            <div key={i} className="group bg-gradient-to-br from-neutral-900/80 to-[#0a0a0a] backdrop-blur-xl border border-white/5 p-8 rounded-3xl hover:border-red-500/20 transition-all duration-500 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-40 h-40 bg-red-500/5 rounded-full blur-3xl -translate-y-10 translate-x-10 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                                <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6">
                                    <point.icon className="w-7 h-7 text-red-400" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-3 tracking-tight">{point.title}</h3>
                                <p className="text-neutral-400 leading-relaxed text-sm font-medium">{point.description}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ═══════════════════════════════════════════ */}
                {/* SUB-SECTOR COVERAGE */}
                {/* ═══════════════════════════════════════════ */}
                <section id="sub-sectors" className="py-28 px-6 max-w-7xl mx-auto relative scroll-mt-nav">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl h-full bg-amber-500/3 blur-[150px] -z-10 rounded-full" />

                    <div className="text-center max-w-3xl mx-auto mb-20">
                        <p className="text-amber-400 text-sm font-black uppercase tracking-[0.3em] mb-4">Full Coverage</p>
                        <h2 className="text-4xl lg:text-6xl font-black text-white mb-6 tracking-tight">
                            Every Corner of the <br className="hidden lg:block" />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">Energy Sector.</span>
                        </h2>
                        <p className="text-xl text-neutral-400 leading-relaxed font-medium">
                            From wellhead to refinery gate. Scout covers every sub-sector so you never miss a placement.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        {SUB_SECTORS.map((sector) => {
                            const Icon = sector.icon;
                            return (
                                <div key={sector.key} className="group bg-gradient-to-br from-neutral-900/80 to-[#0a0a0a] backdrop-blur-xl border border-white/5 rounded-3xl overflow-hidden hover:border-amber-500/20 transition-all duration-500">
                                    {/* Card Header */}
                                    <div className={`p-8 bg-gradient-to-r ${sector.gradient} relative`}>
                                        <div className="absolute inset-0 bg-black/40" />
                                        <div className="relative flex items-center gap-4">
                                            <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                                                <Icon className="w-7 h-7 text-white" />
                                            </div>
                                            <div>
                                                <h3 className="text-2xl font-black text-white tracking-tight">{sector.label}</h3>
                                                <p className="text-white/60 text-sm font-medium mt-0.5">{sector.key.charAt(0).toUpperCase() + sector.key.slice(1)} Sector</p>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Card Body */}
                                    <div className="p-8">
                                        <p className="text-neutral-400 leading-relaxed text-sm font-medium mb-6">{sector.description}</p>
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 mb-3">Sample Roles</p>
                                        <div className="flex flex-wrap gap-2">
                                            {sector.roles.map(role => (
                                                <span key={role} className={`text-xs font-bold px-3 py-1.5 rounded-full bg-${sector.color}-500/10 border border-${sector.color}-500/20 text-${sector.color}-400`}>
                                                    {role}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* ═══════════════════════════════════════════ */}
                {/* FEATURES SECTION */}
                {/* ═══════════════════════════════════════════ */}
                <section id="features" className="py-28 px-6 max-w-7xl mx-auto scroll-mt-nav">
                    <div className="text-center max-w-3xl mx-auto mb-20">
                        <p className="text-amber-400 text-sm font-black uppercase tracking-[0.3em] mb-4">Platform Features</p>
                        <h2 className="text-4xl lg:text-6xl font-black text-white mb-6 tracking-tight">
                            Your Unfair <br className="hidden lg:block" />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">Advantage.</span>
                        </h2>
                        <p className="text-xl text-neutral-400 font-medium leading-relaxed">
                            Purpose-built intelligence for energy sector recruiters. No generic features. Every tool designed to close reqs faster.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {FEATURES.map((feature, i) => (
                            <div key={i} className="group bg-gradient-to-br from-neutral-900/80 to-[#0a0a0a] backdrop-blur-xl border border-white/5 p-8 rounded-3xl hover:border-amber-500/20 hover:bg-white/[0.02] transition-all duration-500 relative overflow-hidden card-shine">
                                <div className={`absolute top-0 right-0 p-8 opacity-5 transform translate-x-4 -translate-y-4 group-hover:opacity-10 group-hover:scale-110 transition-all duration-700`}>
                                    <feature.icon className={`w-32 h-32 text-${feature.color}-400`} />
                                </div>
                                <div className={`w-14 h-14 rounded-2xl bg-${feature.color}-500/10 border border-${feature.color}-500/20 flex items-center justify-center mb-6 shadow-inner shadow-${feature.color}-500/10 anim-drill`}>
                                    <feature.icon className={`w-7 h-7 text-${feature.color}-400`} />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-3 tracking-tight">{feature.title}</h3>
                                <p className="text-neutral-400 leading-relaxed text-sm font-medium">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ═══════════════════════════════════════════ */}
                {/* "HOW IT WORKS" SECTION */}
                {/* ═══════════════════════════════════════════ */}
                <section className="py-28 px-6 max-w-5xl mx-auto relative">
                    <div className="absolute inset-0 anim-shimmer rounded-3xl" />
                    <div className="text-center max-w-3xl mx-auto mb-20 relative">
                        <p className="text-amber-400 text-sm font-black uppercase tracking-[0.3em] mb-4">How It Works</p>
                        <h2 className="text-4xl lg:text-5xl font-black text-white mb-6 tracking-tight">From Sign-Up to First Placement in <span className="text-amber-400">3 Steps.</span></h2>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8 relative">
                        {/* Connector Line */}
                        <div className="hidden md:block absolute top-24 left-[15%] right-[15%] h-0.5 bg-gradient-to-r from-amber-500/30 via-amber-500/10 to-amber-500/30" />

                        {[
                            { step: '01', title: 'Connect Your Account', desc: 'Sign up in 30 seconds with your email. No credit card required for the 7-day free trial.', icon: Users },
                            { step: '02', title: 'Filter Your Niche', desc: 'Select your sub-sector, basin, and role type. Our engine builds your custom talent feed instantly.', icon: Search },
                            { step: '03', title: 'Start Placing', desc: 'Export verified contacts to your CRM or CSV. Your team starts calling qualified candidates today.', icon: Award },
                        ].map((item, i) => (
                            <div key={i} className="text-center relative z-10">
                                <div className="w-20 h-20 rounded-3xl bg-[#070707] border-2 border-amber-500/20 flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(245,158,11,0.1)]">
                                    <span className="text-3xl font-black text-amber-400">{item.step}</span>
                                </div>
                                <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
                                <p className="text-neutral-400 text-sm font-medium leading-relaxed">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ═══════════════════════════════════════════ */}
                {/* TESTIMONIAL / SOCIAL PROOF */}
                {/* ═══════════════════════════════════════════ */}
                <section className="py-20 px-6 max-w-4xl mx-auto">
                    <div className="bg-[#070707]/90 backdrop-blur-2xl border border-amber-500/10 rounded-3xl p-10 lg:p-14 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500" />
                        <div className="absolute -top-20 -right-20 w-60 h-60 bg-amber-500/5 rounded-full blur-3xl" />

                        <div className="flex items-start gap-6 relative z-10">
                            <div className="text-6xl text-amber-500/30 font-serif leading-none shrink-0">&ldquo;</div>
                            <div>
                                <p className="text-xl lg:text-2xl text-neutral-200 leading-relaxed font-medium italic">
                                    We placed 3 drilling engineers in the Permian Basin within the first week. The verified contact data alone saved us dozens of hours of phone tree navigation. This is the tool every O&G recruiter needs.
                                </p>
                                <div className="mt-8 flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-black text-lg">M</div>
                                    <div>
                                        <p className="font-bold text-white">Marcus Reyes</p>
                                        <p className="text-sm text-neutral-500 font-medium">Director of Recruiting, Permian Staffing Group</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ═══════════════════════════════════════════ */}
                {/* PRICING SECTION */}
                {/* ═══════════════════════════════════════════ */}
                <section id="pricing" className="py-32 px-6 max-w-7xl mx-auto relative scroll-mt-nav">
                    <div className="text-center max-w-2xl mx-auto mb-16">
                        <p className="text-amber-400 text-sm font-black uppercase tracking-[0.3em] mb-4">Pricing</p>
                        <h2 className="text-5xl lg:text-6xl font-black text-white mb-6 tracking-tight">One Price. <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">Zero Surprises.</span></h2>
                        <p className="text-xl text-neutral-400 font-medium">All the data, no per-seat charges, no hidden fees.</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                        {/* Starter Plan */}
                        <div className="relative group">
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-neutral-600/20 to-neutral-700/20 rounded-[2rem] blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <div className="relative bg-[#070707] border border-white/10 rounded-[2rem] p-10 overflow-hidden">
                                <div className="mb-8">
                                    <h3 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                                        <Search className="w-6 h-6 text-neutral-400" /> Scout Starter
                                    </h3>
                                    <p className="text-neutral-400 mt-2 text-sm font-medium">For solo recruiters and small teams getting started.</p>
                                </div>

                                <div className="mb-8 pb-8 border-b border-white/10">
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-6xl font-black text-white tracking-tighter">$49</span>
                                        <span className="text-xl text-neutral-500 font-bold">/mo</span>
                                    </div>
                                </div>

                                <ul className="space-y-4 mb-10 text-sm font-medium">
                                    {['500 profile views / month', 'Verified email access', 'CSV export', '1 sub-sector filter', 'Email support'].map((item, i) => (
                                        <li key={i} className="flex items-center gap-3 text-neutral-300">
                                            <div className="w-6 h-6 rounded-full bg-neutral-800 flex items-center justify-center shrink-0 border border-white/10">
                                                <CheckCircle2 className="w-4 h-4 text-neutral-400" />
                                            </div>
                                            {item}
                                        </li>
                                    ))}
                                </ul>

                                <Link href="/dashboard/oil-gas" className="w-full flex justify-center py-4 bg-white/5 border border-white/10 text-white font-bold rounded-2xl hover:bg-white/10 transition-all text-base">
                                    Get Started
                                </Link>
                            </div>
                        </div>

                        {/* Pro Plan */}
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 rounded-[2.5rem] blur-xl opacity-30 group-hover:opacity-60 transition-opacity duration-500 anim-glow" />

                            <div className="relative bg-[#050505] border border-amber-500/20 rounded-[2rem] p-10 shadow-[0_0_80px_rgba(0,0,0,0.8)] overflow-hidden">
                                <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-500 to-orange-600 text-black text-xs font-black px-6 py-2 rounded-bl-2xl tracking-widest uppercase shadow-lg">Most Popular</div>

                                <div className="mb-8 pt-4">
                                    <h3 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                                        <Sparkles className="w-6 h-6 text-amber-400" /> Scout Pro
                                    </h3>
                                    <p className="text-neutral-400 mt-2 text-sm font-medium">For agencies closing high-volume O&G reqs.</p>
                                </div>

                                <div className="mb-8 pb-8 border-b border-white/10">
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-6xl font-black text-white tracking-tighter">$150</span>
                                        <span className="text-xl text-neutral-500 font-bold">/mo</span>
                                    </div>
                                </div>

                                <ul className="space-y-4 mb-10 text-sm font-medium">
                                    {['Unlimited profile views', 'Verified emails + phone numbers', 'CRM push (GHL, Bullhorn)', 'All 4 sub-sectors', 'Hiring intent signals', 'Basin-level geo filtering', 'Priority support + Slack'].map((item, i) => (
                                        <li key={i} className="flex items-center gap-3 text-white">
                                            <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 border border-amber-500/30">
                                                <CheckCircle2 className="w-4 h-4 text-amber-400" />
                                            </div>
                                            {item}
                                        </li>
                                    ))}
                                </ul>

                                <Link href="/dashboard/oil-gas" className="w-full relative flex justify-center py-4 bg-gradient-to-r from-amber-500 to-orange-600 text-black font-black rounded-2xl overflow-hidden group/btn text-base">
                                    <span className="relative z-10 flex items-center gap-2">Start Free Trial <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" /></span>
                                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300"></div>
                                </Link>
                                <p className="text-center text-xs text-neutral-500 mt-4 font-medium">7-day free trial. Cancel anytime.</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ═══════════════════════════════════════════ */}
                {/* FINAL CTA */}
                {/* ═══════════════════════════════════════════ */}
                <section className="py-28 px-6 max-w-4xl mx-auto text-center relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-orange-500/5 to-amber-500/5 rounded-[3rem] blur-3xl -z-10" />

                    <div className="bg-[#070707]/80 backdrop-blur-2xl border border-amber-500/10 rounded-[2.5rem] p-14 lg:p-20 relative overflow-hidden">
                        <div className="absolute inset-0 anim-shimmer" />
                        <div className="relative z-10">
                            <Fuel className="w-16 h-16 text-amber-400 mx-auto mb-8" />
                            <h2 className="text-4xl lg:text-5xl font-black text-white mb-6 tracking-tight">
                                Your Next <span className="text-amber-400">Big Placement</span> <br className="hidden sm:block" /> Is Already in Our Feed.
                            </h2>
                            <p className="text-xl text-neutral-400 font-medium mb-10 max-w-2xl mx-auto">
                                Join the recruiters who stopped guessing and started closing. 7-day free trial — no credit card required.
                            </p>
                            <Link href="/dashboard/oil-gas" className="inline-flex items-center gap-3 px-12 py-5 bg-gradient-to-r from-amber-500 to-orange-600 text-black font-black rounded-2xl text-lg shadow-[0_0_50px_rgba(245,158,11,0.4)] hover:shadow-[0_0_70px_rgba(245,158,11,0.6)] hover:-translate-y-1 transition-all">
                                Start Your Free Trial <ArrowRight className="w-6 h-6" />
                            </Link>
                        </div>
                    </div>
                </section>

            </main>

            {/* Footer */}
            <footer className="border-t border-white/5 py-16 bg-black">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid md:grid-cols-4 gap-10 mb-12">
                        <div className="md:col-span-2">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                                    <Fuel className="w-5 h-5 text-white" />
                                </div>
                                <span className="font-extrabold text-xl text-white tracking-tight">Scout<span className="text-amber-500">.</span></span>
                            </div>
                            <p className="text-sm text-neutral-500 font-medium max-w-sm leading-relaxed">
                                The intelligence platform built exclusively for Oil & Gas recruiters. Real-time talent data from every major basin.
                            </p>
                        </div>
                        <div>
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 mb-4">Platform</h4>
                            <div className="space-y-3">
                                <Link href="#features" className="block text-sm text-neutral-400 hover:text-white transition-colors font-medium">Features</Link>
                                <Link href="#pricing" className="block text-sm text-neutral-400 hover:text-white transition-colors font-medium">Pricing</Link>
                                <Link href="/login" className="block text-sm text-neutral-400 hover:text-white transition-colors font-medium">Sign In</Link>
                                <Link href="/dashboard/oil-gas" className="block text-sm text-neutral-400 hover:text-white transition-colors font-medium">Dashboard</Link>
                            </div>
                        </div>
                        <div>
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 mb-4">Company</h4>
                            <div className="space-y-3">
                                <Link href="https://bluejax.ai" className="block text-sm text-neutral-400 hover:text-white transition-colors font-medium">BlueJax</Link>
                                <Link href="#" className="block text-sm text-neutral-400 hover:text-white transition-colors font-medium">Terms of Service</Link>
                                <Link href="#" className="block text-sm text-neutral-400 hover:text-white transition-colors font-medium">Privacy Policy</Link>
                                <Link href="mailto:edgar@bluejax.ai" className="block text-sm text-neutral-400 hover:text-white transition-colors font-medium">Contact</Link>
                            </div>
                        </div>
                    </div>
                    <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                        <p className="text-sm font-medium text-neutral-500">© 2026 Scout by BlueJax. Built for magnitude.</p>
                        <div className="text-sm font-medium text-neutral-500 flex gap-6">
                            <Link href="/" className="hover:text-white transition-colors">All Sectors</Link>
                            <Link href="/oil-gas" className="text-amber-400 hover:text-amber-300 transition-colors">Oil & Gas</Link>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
