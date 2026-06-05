"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Send, ArrowLeft, ArrowRight, Users, Mail, MessageSquare,
    Zap, CheckCircle2, Eye, FileText, ChevronDown, Loader2,
    HardHat, Radio, UtilityPole, Globe, Fuel
} from 'lucide-react';

interface Template {
    id: string;
    name: string;
    channel: string;
    subject: string;
    body: string;
    sector: string;
}

const SECTORS = [
    { id: 'telecom', label: 'Telecom', icon: Radio, color: 'cyan' },
    { id: 'oil_gas', label: 'Oil & Gas', icon: Fuel, color: 'amber' },
    { id: 'fire_safety', label: 'Fire & Safety', icon: Zap, color: 'red' },
    { id: 'energy', label: 'Energy', icon: UtilityPole, color: 'emerald' },
    { id: 'construction', label: 'Construction', icon: HardHat, color: 'orange' },
];

const US_STATES = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA',
    'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT',
    'VA', 'WA', 'WV', 'WI', 'WY'
];

const STEPS = ['Audience', 'Channel', 'Compose', 'Preview'];

export default function NewCampaignPage() {
    const router = useRouter();
    const [step, setStep] = useState(0);
    const [saving, setSaving] = useState(false);
    const [sending, setSending] = useState(false);
    const [templates, setTemplates] = useState<Template[]>([]);

    // Form state
    const [name, setName] = useState('');
    const [sectors, setSectors] = useState<string[]>([]);
    const [states, setStates] = useState<string[]>([]);
    const [channel, setChannel] = useState<'email' | 'sms' | 'both'>('email');
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');

    // Preview state
    const [preview, setPreview] = useState<any>(null);
    const [loadingPreview, setLoadingPreview] = useState(false);
    const [campaignId, setCampaignId] = useState<string | null>(null);
    const [sendResult, setSendResult] = useState<any>(null);

    useEffect(() => {
        fetch('/api/campaigns/templates')
            .then(r => r.json())
            .then(setTemplates)
            .catch(() => { });
    }, []);

    const toggleSector = (id: string) => {
        setSectors(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
    };

    const toggleState = (st: string) => {
        setStates(prev => prev.includes(st) ? prev.filter(s => s !== st) : [...prev, st]);
    };

    const loadTemplate = (t: Template) => {
        setSubject(t.subject || '');
        setBody(t.body || '');
        if (t.channel) setChannel(t.channel as any);
    };

    const handlePreview = async () => {
        setLoadingPreview(true);

        // Save campaign as draft first
        let id = campaignId;
        if (!id) {
            const res = await fetch('/api/campaigns', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name || 'Untitled Campaign',
                    channel,
                    subject,
                    body_template: body,
                    sector_filter: sectors,
                    state_filter: states,
                }),
            });
            const data = await res.json();
            id = data.id;
            setCampaignId(id);
        } else {
            // Update existing draft
            await fetch(`/api/campaigns/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name || 'Untitled Campaign',
                    channel,
                    subject,
                    body_template: body,
                    sector_filter: sectors,
                    state_filter: states,
                }),
            });
        }

        // Get preview
        const previewRes = await fetch(`/api/campaigns/${id}/preview`, { method: 'POST' });
        const previewData = await previewRes.json();
        setPreview(previewData);
        setLoadingPreview(false);
    };

    const handleSend = async () => {
        if (!campaignId) return;
        setSending(true);
        const res = await fetch(`/api/campaigns/${campaignId}/send`, { method: 'POST' });
        const result = await res.json();
        setSendResult(result);
        setSending(false);
    };

    const personalizeSample = (template: string, sample: any) => {
        return template
            .replace(/\{\{name\}\}/g, sample?.name || '[Name]')
            .replace(/\{\{company\}\}/g, sample?.company || '[Company]')
            .replace(/\{\{city\}\}/g, sample?.city || '[City]')
            .replace(/\{\{state\}\}/g, sample?.state || '[State]')
            .replace(/\{\{title\}\}/g, sample?.title || '[Title]')
            .replace(/\{\{sector\}\}/g, sample?.sector || '[Sector]');
    };

    const canProceed = () => {
        switch (step) {
            case 0: return name.trim().length > 0;
            case 1: return true;
            case 2: return body.trim().length > 0;
            case 3: return preview && preview.total > 0;
            default: return false;
        }
    };

    const next = () => {
        if (step === 2) {
            handlePreview();
        }
        setStep(s => Math.min(s + 1, STEPS.length - 1));
    };

    // Sent success screen
    if (sendResult) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center max-w-md">
                    <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                    </div>
                    <h2 className="text-2xl font-black text-white mb-2">Campaign Sent!</h2>
                    <p className="text-neutral-400 text-sm mb-6">
                        {sendResult.sent} messages sent to {sendResult.total_recipients} recipients
                        {sendResult.failed > 0 && ` (${sendResult.failed} failed)`}
                    </p>
                    <div className="flex gap-3 justify-center">
                        <button
                            onClick={() => router.push(`/dashboard/campaigns/${campaignId}`)}
                            className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-all"
                        >
                            View Details
                        </button>
                        <button
                            onClick={() => router.push('/dashboard/campaigns')}
                            className="px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-sm hover:bg-white/10 transition-all"
                        >
                            Back to Campaigns
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button onClick={() => router.push('/dashboard/campaigns')} className="p-2 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white transition-all">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="text-2xl font-black text-white">New Campaign</h1>
                    <p className="text-neutral-500 text-sm font-medium">Step {step + 1} of {STEPS.length}: {STEPS[step]}</p>
                </div>
            </div>

            {/* Progress */}
            <div className="flex gap-2">
                {STEPS.map((s, i) => (
                    <button
                        key={s}
                        onClick={() => i < step && setStep(i)}
                        className={`flex-1 h-1.5 rounded-full transition-all ${i <= step ? 'bg-indigo-500' : 'bg-white/5'}`}
                    />
                ))}
            </div>

            {/* Step Content */}
            <div className="bg-[#070707]/90 border border-white/5 rounded-2xl p-8">

                {/* Step 0: Audience */}
                {step === 0 && (
                    <div className="space-y-6">
                        <div>
                            <label className="block text-xs font-black text-neutral-400 uppercase tracking-wider mb-2">Campaign Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="e.g. Q1 Construction Outreach"
                                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-medium placeholder:text-neutral-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-black text-neutral-400 uppercase tracking-wider mb-3">Target Sectors</label>
                            <p className="text-xs text-neutral-600 mb-3">Leave empty to target all sectors</p>
                            <div className="grid grid-cols-3 gap-3">
                                {SECTORS.map(s => (
                                    <button
                                        key={s.id}
                                        onClick={() => toggleSector(s.id)}
                                        className={`p-4 rounded-xl border transition-all text-left ${sectors.includes(s.id)
                                            ? `bg-${s.color}-500/10 border-${s.color}-500/30`
                                            : 'bg-white/[0.02] border-white/5 hover:border-white/10'
                                            }`}
                                    >
                                        <s.icon className={`w-5 h-5 mb-2 ${sectors.includes(s.id) ? `text-${s.color}-400` : 'text-neutral-500'}`} />
                                        <p className={`text-sm font-bold ${sectors.includes(s.id) ? 'text-white' : 'text-neutral-400'}`}>{s.label}</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-black text-neutral-400 uppercase tracking-wider mb-3">Filter by State</label>
                            <p className="text-xs text-neutral-600 mb-3">Leave empty to target all states</p>
                            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 rounded-xl bg-white/[0.02] border border-white/5">
                                {US_STATES.map(st => (
                                    <button
                                        key={st}
                                        onClick={() => toggleState(st)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${states.includes(st)
                                            ? 'bg-indigo-500/20 border border-indigo-500/30 text-indigo-300'
                                            : 'bg-white/5 border border-white/5 text-neutral-500 hover:text-neutral-300'
                                            }`}
                                    >
                                        {st}
                                    </button>
                                ))}
                            </div>
                            {states.length > 0 && (
                                <p className="text-xs text-indigo-400 mt-2 font-medium">{states.length} states selected</p>
                            )}
                        </div>
                    </div>
                )}

                {/* Step 1: Channel */}
                {step === 1 && (
                    <div className="space-y-4">
                        <label className="block text-xs font-black text-neutral-400 uppercase tracking-wider mb-4">Select Channel</label>
                        {[
                            { id: 'email', label: 'Email Only', desc: 'Send personalized emails via Resend', icon: Mail, color: 'indigo' },
                            { id: 'sms', label: 'SMS Only', desc: 'Send text messages via Twilio', icon: MessageSquare, color: 'emerald' },
                            { id: 'both', label: 'Email + SMS', desc: 'Send via both channels simultaneously', icon: Zap, color: 'purple' },
                        ].map(ch => (
                            <button
                                key={ch.id}
                                onClick={() => setChannel(ch.id as any)}
                                className={`w-full p-5 rounded-xl border transition-all text-left flex items-center gap-4 ${channel === ch.id
                                    ? `bg-${ch.color}-500/10 border-${ch.color}-500/30`
                                    : 'bg-white/[0.02] border-white/5 hover:border-white/10'
                                    }`}
                            >
                                <div className={`w-12 h-12 rounded-xl bg-${ch.color}-500/10 border border-${ch.color}-500/20 flex items-center justify-center`}>
                                    <ch.icon className={`w-6 h-6 text-${ch.color}-400`} />
                                </div>
                                <div>
                                    <p className={`font-bold ${channel === ch.id ? 'text-white' : 'text-neutral-300'}`}>{ch.label}</p>
                                    <p className="text-xs text-neutral-500">{ch.desc}</p>
                                </div>
                                {channel === ch.id && <CheckCircle2 className={`w-5 h-5 text-${ch.color}-400 ml-auto`} />}
                            </button>
                        ))}
                    </div>
                )}

                {/* Step 2: Compose */}
                {step === 2 && (
                    <div className="space-y-6">
                        {/* Template selector */}
                        <div>
                            <label className="block text-xs font-black text-neutral-400 uppercase tracking-wider mb-2">Load Template</label>
                            <div className="flex flex-wrap gap-2">
                                {templates
                                    .filter(t => t.channel === channel || channel === 'both')
                                    .map(t => (
                                        <button
                                            key={t.id}
                                            onClick={() => loadTemplate(t)}
                                            className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-bold text-neutral-300 hover:bg-white/10 hover:text-white transition-all"
                                        >
                                            <FileText className="w-3 h-3 inline mr-1.5" />
                                            {t.name}
                                        </button>
                                    ))}
                            </div>
                        </div>

                        {(channel === 'email' || channel === 'both') && (
                            <div>
                                <label className="block text-xs font-black text-neutral-400 uppercase tracking-wider mb-2">Email Subject</label>
                                <input
                                    type="text"
                                    value={subject}
                                    onChange={e => setSubject(e.target.value)}
                                    placeholder="e.g. New Project Opportunity in {{city}}, {{state}}"
                                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-medium placeholder:text-neutral-600 focus:outline-none focus:border-indigo-500/50 transition"
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-black text-neutral-400 uppercase tracking-wider mb-2">Message Body</label>
                            <textarea
                                value={body}
                                onChange={e => setBody(e.target.value)}
                                rows={8}
                                placeholder={"Hi {{name}},\n\nI came across {{company}} and wanted to reach out..."}
                                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-medium placeholder:text-neutral-600 focus:outline-none focus:border-indigo-500/50 transition resize-none font-mono"
                            />
                        </div>

                        <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10">
                            <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2">Available Variables</p>
                            <div className="flex flex-wrap gap-2">
                                {['{{name}}', '{{company}}', '{{city}}', '{{state}}', '{{title}}', '{{sector}}'].map(v => (
                                    <button
                                        key={v}
                                        onClick={() => setBody(prev => prev + ' ' + v)}
                                        className="px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-xs font-mono font-bold text-indigo-300 hover:bg-indigo-500/20 transition-all"
                                    >
                                        {v}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 3: Preview & Send */}
                {step === 3 && (
                    <div className="space-y-6">
                        {loadingPreview ? (
                            <div className="flex items-center justify-center py-16">
                                <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                                <span className="ml-3 text-neutral-400 font-medium">Building recipient list...</span>
                            </div>
                        ) : preview ? (
                            <>
                                {/* Stats */}
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 text-center">
                                        <p className="text-2xl font-black text-white">{preview.total}</p>
                                        <p className="text-[10px] font-bold uppercase text-neutral-500 tracking-wider">Total Recipients</p>
                                    </div>
                                    {Object.entries(preview.by_sector || {}).map(([sector, count]) => (
                                        <div key={sector} className="p-4 rounded-xl bg-white/[0.03] border border-white/5 text-center">
                                            <p className="text-2xl font-black text-white">{String(count)}</p>
                                            <p className="text-[10px] font-bold uppercase text-neutral-500 tracking-wider">{sector}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* Sample preview */}
                                <div>
                                    <h3 className="text-xs font-black text-neutral-400 uppercase tracking-wider mb-3">Sample Message Preview</h3>
                                    <div className="p-5 rounded-xl bg-white/[0.03] border border-white/5 space-y-3">
                                        {subject && (
                                            <div>
                                                <p className="text-[10px] text-neutral-600 font-bold uppercase tracking-wider">Subject</p>
                                                <p className="text-sm text-white font-medium">
                                                    {personalizeSample(subject, preview.sample?.[0])}
                                                </p>
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-[10px] text-neutral-600 font-bold uppercase tracking-wider mb-1">Body</p>
                                            <p className="text-sm text-neutral-300 whitespace-pre-wrap font-mono leading-relaxed">
                                                {personalizeSample(body, preview.sample?.[0])}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Sample recipients */}
                                <div>
                                    <h3 className="text-xs font-black text-neutral-400 uppercase tracking-wider mb-3">Sample Recipients ({Math.min(5, preview.sample?.length || 0)} of {preview.total})</h3>
                                    <div className="space-y-2">
                                        {preview.sample?.slice(0, 5).map((r: any, i: number) => (
                                            <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                                                <span className="text-xs font-bold text-neutral-500 w-6">{i + 1}</span>
                                                <span className="text-sm font-bold text-white flex-1 truncate">{r.name || r.company}</span>
                                                <span className="text-xs text-indigo-400 truncate max-w-[200px]">{r.email}</span>
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/5 text-neutral-400">{r.sector}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Send button */}
                                <button
                                    onClick={handleSend}
                                    disabled={sending || preview.total === 0}
                                    className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-sm transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {sending ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Sending to {preview.total} recipients...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-4 h-4" />
                                            Send to {preview.total} Recipients
                                        </>
                                    )}
                                </button>
                            </>
                        ) : (
                            <div className="text-center py-16">
                                <p className="text-neutral-500">Loading preview...</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Navigation */}
            <div className="flex justify-between">
                <button
                    onClick={() => setStep(s => Math.max(0, s - 1))}
                    disabled={step === 0}
                    className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-neutral-300 font-bold text-sm hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                    <ArrowLeft className="w-4 h-4" /> Back
                </button>
                {step < STEPS.length - 1 && (
                    <button
                        onClick={next}
                        disabled={!canProceed()}
                        className="flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                        Next <ArrowRight className="w-4 h-4" />
                    </button>
                )}
            </div>
        </div>
    );
}
