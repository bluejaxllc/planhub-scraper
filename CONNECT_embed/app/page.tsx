import Link from 'next/link';
import { ArrowRight, Terminal as TerminalIcon, CheckCircle2, Zap, Shield, Database, Sparkles, Code2, Rocket, Search } from 'lucide-react';
import GlobalSearch from '@/components/GlobalSearch';

export default function Home() {
    return (
        <div className="min-h-screen bg-[#030303] text-neutral-200 font-sans selection:bg-indigo-500/30 overflow-x-hidden">
            {/* Custom Keyframe Animations */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes floatTerminal {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-18px); }
                }
                @keyframes pulseGlow {
                    0%, 100% { opacity: 0.08; transform: scale(1); }
                    50% { opacity: 0.18; transform: scale(1.08); }
                }
                @keyframes shimmer {
                    0% { background-position: -200% 0; }
                    100% { background-position: 200% 0; }
                }
                .anim-float { animation: floatTerminal 7s ease-in-out infinite; }
                .anim-glow { animation: pulseGlow 8s ease-in-out infinite; }
                .anim-glow-delay { animation: pulseGlow 8s ease-in-out 4s infinite; }
                .anim-shimmer {
                    background: linear-gradient(90deg, transparent 0%, rgba(99,102,241,0.08) 50%, transparent 100%);
                    background-size: 200% 100%;
                    animation: shimmer 3s linear infinite;
                }
            `}} />

            {/* Ambient Background Glows */}
            <div className="fixed top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/10 rounded-full blur-[150px] pointer-events-none anim-glow" />
            <div className="fixed top-[20%] right-[-10%] w-[40%] h-[60%] bg-purple-600/10 rounded-full blur-[150px] pointer-events-none anim-glow-delay" />

            {/* Glassmorphic Navigation */}
            <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-black/40 backdrop-blur-2xl">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                            <Search className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-extrabold text-2xl text-white tracking-tight">Scout<span className="text-indigo-500">.</span></span>
                    </div>
                    <div className="flex items-center gap-8">
                        <Link href="#features" className="text-sm font-medium text-neutral-400 hover:text-white transition-colors hidden md:block">Features</Link>
                        <Link href="#pricing" className="text-sm font-medium text-neutral-400 hover:text-white transition-colors hidden md:block">Pricing</Link>
                        <Link href="/login" className="text-sm font-medium text-white hover:text-indigo-400 transition-colors">Sign In</Link>
                        <Link href="/dashboard" className="group relative px-6 py-2.5 bg-white text-black text-sm font-bold rounded-xl transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.15)] flex items-center gap-2 overflow-hidden">
                            <span className="relative z-10 flex items-center gap-2">Explore Leads <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></span>
                            <div className="absolute inset-0 bg-gradient-to-r from-neutral-200 to-white opacity-0 group-hover:opacity-100 transition-opacity z-0"></div>
                        </Link>
                    </div>
                </div>
            </nav>

            <main className="pt-40 pb-24 px-6 max-w-7xl mx-auto relative z-10">

                {/* Extreme Hero Section */}
                <section className="flex flex-col xl:flex-row items-center gap-20 py-10 lg:py-20">
                    <div className="flex-1 space-y-10 text-center xl:text-left relative z-20">
                        <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm font-semibold backdrop-blur-md shadow-[0_0_20px_rgba(99,102,241,0.1)]">
                            <span className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
                            </span>
                            Live Multi-Niche Feed Active
                        </div>

                        <h1 className="text-6xl sm:text-7xl lg:text-8xl font-black text-white tracking-tighter leading-[1.05]">
                            The Ultimate <br className="hidden lg:block" />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-300 to-indigo-500">
                                B2B Architect
                            </span> <br className="hidden lg:block" />
                            For BlueJax
                        </h1>

                        <p className="text-xl lg:text-2xl text-neutral-400 max-w-2xl mx-auto xl:mx-0 leading-relaxed font-medium">
                            Search seamlessly across <span className="text-white font-bold">Telecom, Security, Solar, and Construction</span>. Over 800k verified profiles.
                        </p>

                        {/* Global Search Component */}
                        <div className="pt-4 max-w-2xl">
                            <GlobalSearch />
                        </div>

                        <div className="flex flex-col sm:flex-row items-center gap-6 justify-center xl:justify-start pt-4">
                            <Link href="/dashboard" className="group relative w-full sm:w-auto px-8 py-5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-2xl shadow-[0_0_40px_rgba(99,102,241,0.4)] hover:shadow-[0_0_60px_rgba(99,102,241,0.6)] transition-all flex items-center justify-center gap-3 text-lg overflow-hidden hover:-translate-y-1">
                                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out"></div>
                                <span className="relative z-10 flex items-center gap-2">Explore Directory <ArrowRight className="w-6 h-6 group-hover:translate-x-1.5 transition-transform" /></span>
                            </Link>
                            <Link href="#pricing" className="group w-full sm:w-auto px-8 py-5 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold rounded-2xl backdrop-blur-md transition-all flex items-center justify-center text-lg hover:-translate-y-1">
                                View Pricing
                            </Link>
                        </div>

                        <div className="pt-8 flex flex-wrap items-center justify-center xl:justify-start gap-x-10 gap-y-4 text-sm text-neutral-400 font-bold uppercase tracking-widest">
                            <div className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-emerald-500" /> Verified Emails</div>
                            <div className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-emerald-500" /> Instant Updates</div>
                            <div className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-neutral-600" /> No Contracts</div>
                        </div>
                    </div>

                    {/* Premium Glassmorphic Terminal Window */}
                    <div className="flex-1 w-full max-w-2xl xl:max-w-none relative perspective-1000 mt-10 xl:mt-0 z-10 group anim-float">
                        <div className="absolute -inset-1.5 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-3xl blur-2xl opacity-40 group-hover:opacity-70 transition-opacity duration-700 anim-glow" />

                        <div className="w-full bg-[#050505]/90 backdrop-blur-3xl border border-white/10 rounded-3xl shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden transition-all group-hover:scale-[1.02] duration-700 relative">

                            {/* Terminal macOS style Header */}
                            <div className="bg-white/5 border-b border-white/5 px-6 py-4 flex items-center justify-between">
                                <div className="flex gap-2.5">
                                    <div className="w-3.5 h-3.5 rounded-full bg-[#ff5f56] shadow-[0_0_10px_#ff5f56]"></div>
                                    <div className="w-3.5 h-3.5 rounded-full bg-[#ffbd2e] shadow-[0_0_10px_#ffbd2e]"></div>
                                    <div className="w-3.5 h-3.5 rounded-full bg-[#27c93f] shadow-[0_0_10px_#27c93f]"></div>
                                </div>
                                <div className="text-xs text-neutral-400 font-mono flex items-center gap-2 bg-black/50 px-5 py-2 rounded-full border border-white/5 tracking-wider">
                                    <TerminalIcon className="w-4 h-4 text-indigo-400" /> root@scout:~
                                </div>
                                <div className="w-16"></div> {/* Spacer for centering */}
                            </div>

                            {/* Terminal Content */}
                            <div className="p-8 font-mono text-sm md:text-base text-neutral-300 leading-relaxed overflow-x-auto min-h-[420px]">
                                <div className="flex items-center gap-3 text-indigo-400 font-bold mb-2">
                                    <span className="text-emerald-400 font-black">❯</span>
                                    <span className="text-white">curl https://scout.bluejax.ai/api/v1/stream</span>
                                </div>
                                <div className="text-neutral-500 mb-6 italic">{`Connecting to live websocket stream... Connected.`}</div>

                                <pre className="text-neutral-300 font-medium">
                                    <span className="text-purple-400">{"{"}</span>
                                    {"\n  "}<span className="text-indigo-300">"event"</span>: <span className="text-emerald-300">"niche.profile.discovered"</span>,
                                    {"\n  "}<span className="text-indigo-300">"data"</span>: <span className="text-yellow-200">{"{"}</span>
                                    {"\n    "}<span className="text-indigo-300">"company"</span>: <span className="text-emerald-300">"Texas Builders Auth"</span>,
                                    {"\n    "}<span className="text-indigo-300">"niche"</span>: <span className="text-emerald-300">"Construction GC"</span>,
                                    {"\n    "}<span className="text-indigo-300">"intent_score"</span>: <span className="text-orange-400">99</span>,
                                    {"\n    "}<span className="text-indigo-300">"contacts"</span>: <span className="text-cyan-200">{"{"}</span>
                                    {"\n      "}<span className="text-indigo-300">"name"</span>: <span className="text-emerald-300">"Edgar"</span>,
                                    {"\n      "}<span className="text-indigo-300">"email"</span>: <span className="text-emerald-300">"edgar@bluejax.ai"</span>,
                                    {"\n      "}<span className="text-indigo-300">"verified"</span>: <span className="text-purple-400">true</span>
                                    {"\n    "}<span className="text-cyan-200">{"}"}</span>
                                    {"\n  "}<span className="text-yellow-200">{"}"}</span>
                                    {"\n"}<span className="text-purple-400">{"}"}</span>
                                </pre>

                                <div className="mt-8 flex items-center gap-2 text-indigo-400 text-lg">
                                    <span className="opacity-70">waiting for next event</span><span className="animate-pulse w-3 h-6 bg-indigo-500 ml-2 inline-block shadow-[0_0_10px_#6366f1]"></span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Premium Feature Highlights */}
                <section id="features" className="py-24 mt-16 relative">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg h-full bg-indigo-500/5 blur-[120px] -z-10 rounded-full anim-glow-delay" />

                    <div className="text-center max-w-3xl mx-auto mb-20">
                        <h2 className="text-4xl lg:text-5xl font-black text-white mb-6 tracking-tight">An Unfair Advantage.</h2>
                        <p className="text-xl text-neutral-400 leading-relaxed font-medium">Equip your agency with the tools needed to close reqs faster. Our infrastructure handles the heavy lifting.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="group bg-gradient-to-br from-neutral-900/80 to-[#0a0a0a] backdrop-blur-xl border border-white/5 p-10 rounded-3xl hover:border-indigo-500/30 hover:bg-white/5 transition-all duration-500 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-10 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform duration-700">
                                <Rocket className="w-32 h-32 text-indigo-400" />
                            </div>
                            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-8 shadow-inner shadow-indigo-500/20">
                                <Zap className="w-8 h-8 text-indigo-400" />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-4 tracking-tight">Live Scraping</h3>
                            <p className="text-neutral-400 leading-relaxed text-base font-medium">Our global infrastructure continuously monitors thousands of job boards, instantly delivering fresh hiring signals.</p>
                        </div>

                        <div className="group bg-gradient-to-br from-neutral-900/80 to-[#0a0a0a] backdrop-blur-xl border border-white/5 p-10 rounded-3xl hover:border-emerald-500/30 hover:bg-white/5 transition-all duration-500 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-10 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform duration-700">
                                <Shield className="w-32 h-32 text-emerald-400" />
                            </div>
                            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-8 shadow-inner shadow-emerald-500/20">
                                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-4 tracking-tight">Verified Emails</h3>
                            <p className="text-neutral-400 leading-relaxed text-base font-medium">Stop bouncing. We mathematically verify decision-maker emails so your cold outreach always lands in the primary inbox.</p>
                        </div>

                        <div className="group bg-gradient-to-br from-neutral-900/80 to-[#0a0a0a] backdrop-blur-xl border border-white/5 p-10 rounded-3xl hover:border-purple-500/30 hover:bg-white/5 transition-all duration-500 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-10 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform duration-700">
                                <Code2 className="w-32 h-32 text-purple-400" />
                            </div>
                            <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-8 shadow-inner shadow-purple-500/20">
                                <Database className="w-8 h-8 text-purple-400" />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-4 tracking-tight">One-Click Export</h3>
                            <p className="text-neutral-400 leading-relaxed text-base font-medium">Export leads as structured CSV files or push them directly to your team's pipeline with a single click.</p>
                        </div>
                    </div>
                </section>

                {/* Pricing Section Ultra Premium */}
                <section id="pricing" className="py-32 my-10 relative">
                    <div className="text-center max-w-2xl mx-auto mb-16">
                        <h2 className="text-5xl lg:text-6xl font-black text-white mb-6 tracking-tight">Transparent Pricing.</h2>
                        <p className="text-xl text-neutral-400 font-medium">One flat rate for VIP access to the internet's best hiring intent data.</p>
                    </div>

                    <div className="max-w-lg mx-auto relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 rounded-[2.5rem] blur-xl opacity-30 group-hover:opacity-60 transition-opacity duration-500 anim-glow" />

                        <div className="relative bg-[#050505] border border-white/10 rounded-[2rem] p-10 lg:p-12 shadow-[0_0_80px_rgba(0,0,0,0.8)] overflow-hidden">
                            <div className="absolute top-0 right-0 bg-gradient-to-l from-indigo-500 to-purple-600 text-white text-xs font-black px-6 py-2 rounded-bl-2xl tracking-widest uppercase shadow-lg">Premium Tier</div>

                            <div className="mb-8 pt-4">
                                <h3 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                                    <Sparkles className="w-6 h-6 text-indigo-400" /> Scout Pro
                                </h3>
                                <p className="text-neutral-400 mt-3 text-base font-medium">Full automation, zero bottlenecks.</p>
                            </div>

                            <div className="mb-10 pb-10 border-b border-white/10">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-7xl font-black text-white tracking-tighter">$150</span>
                                    <span className="text-xl text-neutral-500 font-bold">/mo</span>
                                </div>
                            </div>

                            <ul className="space-y-6 mb-12 text-base font-medium">
                                <li className="flex items-center gap-4 text-white">
                                    <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0 border border-indigo-500/30">
                                        <CheckCircle2 className="w-5 h-5 text-indigo-400" />
                                    </div>
                                    Unlimited Lead Access & Feed
                                </li>
                                <li className="flex items-center gap-4 text-white">
                                    <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0 border border-indigo-500/30">
                                        <CheckCircle2 className="w-5 h-5 text-indigo-400" />
                                    </div>
                                    Verified Email Addresses Readout
                                </li>
                                <li className="flex items-center gap-4 text-white">
                                    <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0 border border-indigo-500/30">
                                        <CheckCircle2 className="w-5 h-5 text-indigo-400" />
                                    </div>
                                    Full Decision-Maker Profiles
                                </li>
                                <li className="flex items-center gap-4 text-white">
                                    <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0 border border-indigo-500/30">
                                        <CheckCircle2 className="w-5 h-5 text-indigo-400" />
                                    </div>
                                    Unlimited CSV Exports
                                </li>
                                <li className="flex items-center gap-4 text-neutral-500 opacity-80">
                                    <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center shrink-0 border border-white/5">
                                        <CheckCircle2 className="w-5 h-5 text-neutral-400" />
                                    </div>
                                    Cancel Anytime Guarantee
                                </li>
                            </ul>

                            <Link href="/dashboard" className="w-full relative flex justify-center py-5 bg-white text-black font-black rounded-2xl overflow-hidden group/btn">
                                <span className="relative z-10 text-lg flex items-center gap-2">Get Started Now <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" /></span>
                                <div className="absolute inset-0 bg-neutral-200 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300"></div>
                            </Link>
                        </div>
                    </div>
                </section>

            </main>

            {/* Modern Footer */}
            <footer className="border-t border-white/5 py-16 bg-black">
                <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-3 font-extrabold text-xl text-white">
                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/10">
                            <Database className="w-4 h-4 text-indigo-500" />
                        </div>
                        Scout.
                    </div>
                    <p className="text-sm font-medium text-neutral-500">© 2026 Scout by BlueJax. Engineered for magnitude.</p>
                    <div className="text-sm font-medium text-neutral-500 flex gap-6">
                        <Link href="#" className="hover:text-white transition-colors">Terms of Service</Link>
                        <Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
