"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/lib/UserContext';
import { SECTORS, ALL_SECTOR_IDS, type SectorId } from '@/lib/taxonomy';
import { Users, Shield, Mail, Copy, Check, Plus, X, Search, Loader2 } from 'lucide-react';

interface ManagedUser {
    id: string;
    email: string;
    role: string;
    sectors: string[];
    display_name: string | null;
    subscription_status: string | null;
    created_at: string;
}

const ALL_SECTORS = ALL_SECTOR_IDS;

const SECTOR_COLORS: Record<string, { bg: string; border: string; text: string }> =
    Object.fromEntries(SECTORS.map(s => [s.id, { bg: s.color.bg, border: s.color.border, text: s.color.text }]));

export default function AdminUsersPage() {
    const { user: currentUser, isSuperAdmin } = useUser();
    const [users, setUsers] = useState<ManagedUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [showInvite, setShowInvite] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteSectors, setInviteSectors] = useState<SectorId[]>([]);
    const [inviteLoading, setInviteLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [generatedPassword, setGeneratedPassword] = useState<{ email: string, password: string } | null>(null);

    useEffect(() => {
        if (isSuperAdmin) fetchUsers();
    }, [isSuperAdmin]);

    const fetchUsers = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false });
        if (data) setUsers(data);
        setLoading(false);
    };

    const toggleSector = async (userId: string, sector: SectorId, currentSectors: string[]) => {
        const newSectors = currentSectors.includes(sector)
            ? currentSectors.filter(s => s !== sector)
            : [...currentSectors, sector];

        const { error } = await supabase.from('users').update({ sectors: newSectors }).eq('id', userId);
        if (!error) {
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, sectors: newSectors } : u));
        }
    };

    const toggleRole = async (userId: string, currentRole: string) => {
        const newRole = currentRole === 'admin' ? 'viewer' : 'admin';
        const { error } = await supabase.from('users').update({ role: newRole }).eq('id', userId);
        if (!error) {
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
        }
    };

    const inviteUser = async () => {
        if (!inviteEmail || inviteSectors.length === 0) return;
        setInviteLoading(true);
        try {
            const res = await fetch('/api/admin/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: inviteEmail,
                    sectors: inviteSectors,
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to create user');

            setGeneratedPassword({ email: inviteEmail, password: data.tempPassword });
            setInviteEmail('');
            setInviteSectors([]);
            fetchUsers();
        } catch (err: any) {
            console.error('Invite failed:', err);
            alert(`Invite failed: ${err.message}`);
        } finally {
            setInviteLoading(false);
        }
    };

    const copyPassword = () => {
        if (generatedPassword) {
            navigator.clipboard.writeText(`Email: ${generatedPassword.email}\nPassword: ${generatedPassword.password}\nLogin at: ${window.location.origin}/login`);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const filteredUsers = users.filter(u =>
        u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.display_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!isSuperAdmin) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="text-center">
                    <Shield className="w-16 h-16 text-neutral-700 mx-auto mb-4" />
                    <h2 className="text-2xl font-black text-white mb-2">Access Denied</h2>
                    <p className="text-neutral-400">Only super administrators can manage users.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                        <Users className="w-8 h-8 text-cyan-400" />
                        User Management
                    </h1>
                    <p className="text-neutral-400 font-medium mt-2">Manage access, assign sectors, and generate invite links</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => { setShowInvite(true); setGeneratedPassword(null); }}
                        className="px-5 py-3 bg-gradient-to-r from-cyan-600 to-indigo-600 text-white text-sm font-bold rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] transition-all flex items-center gap-2 hover:-translate-y-0.5"
                    >
                        <Plus className="w-4 h-4" /> Invite User
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <input
                    type="text"
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full max-w-md pl-11 pr-4 py-3 bg-[#0a0a0a] border border-white/10 rounded-xl text-white text-sm font-medium placeholder:text-neutral-600 focus:outline-none focus:border-cyan-500/50 transition-all"
                />
            </div>

            {/* Users Table */}
            <div className="bg-[#070707]/90 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-white/5">
                            <th className="px-5 py-4 text-left text-xs font-bold text-neutral-400 uppercase tracking-wider">User</th>
                            <th className="px-5 py-4 text-left text-xs font-bold text-neutral-400 uppercase tracking-wider">Role</th>
                            <th className="px-5 py-4 text-left text-xs font-bold text-neutral-400 uppercase tracking-wider">Sectors</th>
                            <th className="px-5 py-4 text-left text-xs font-bold text-neutral-400 uppercase tracking-wider">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {loading ? (
                            Array(3).fill(0).map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    <td className="px-5 py-4"><div className="h-4 bg-white/10 rounded w-40" /></td>
                                    <td className="px-5 py-4"><div className="h-4 bg-white/10 rounded w-20" /></td>
                                    <td className="px-5 py-4"><div className="h-4 bg-white/10 rounded w-48" /></td>
                                    <td className="px-5 py-4"><div className="h-4 bg-white/10 rounded w-16" /></td>
                                </tr>
                            ))
                        ) : filteredUsers.map((u) => (
                            <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                                <td className="px-5 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-sm">
                                            {(u.display_name || u.email)?.[0]?.toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-white">{u.display_name || u.email?.split('@')[0]}</p>
                                            <p className="text-[11px] text-neutral-500">{u.email}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-5 py-4">
                                    {u.role === 'super_admin' ? (
                                        <span className="px-2.5 py-1 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[11px] font-bold rounded-lg">SUPER ADMIN</span>
                                    ) : (
                                        <button
                                            onClick={() => toggleRole(u.id, u.role)}
                                            className={`px-2.5 py-1 ${u.role === 'admin' ? 'bg-violet-500/10 border-violet-500/20 text-violet-400' : 'bg-white/5 border-white/10 text-neutral-400'} border text-[11px] font-bold rounded-lg hover:opacity-80 transition-opacity`}
                                        >
                                            {u.role?.toUpperCase()}
                                        </button>
                                    )}
                                </td>
                                <td className="px-5 py-4">
                                    <div className="flex flex-wrap gap-1.5">
                                        {ALL_SECTORS.map(sector => {
                                            const isActive = u.sectors?.includes(sector) || u.role === 'super_admin';
                                            const c = SECTOR_COLORS[sector];
                                            return (
                                                <button
                                                    key={sector}
                                                    onClick={() => u.role !== 'super_admin' && toggleSector(u.id, sector, u.sectors || [])}
                                                    disabled={u.role === 'super_admin'}
                                                    className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-md border transition-all ${isActive
                                                        ? `${c.bg} ${c.border} ${c.text}`
                                                        : 'bg-white/5 border-white/5 text-neutral-600 hover:border-white/20'
                                                        } ${u.role === 'super_admin' ? 'cursor-default' : 'cursor-pointer'}`}
                                                >
                                                    {sector}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </td>
                                <td className="px-5 py-4">
                                    {(() => {
                                        const isActive = u.role === 'super_admin' || u.subscription_status === 'active';
                                        return (
                                            <span className={`px-2.5 py-1 text-[11px] font-bold rounded-lg ${isActive
                                                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                                                : 'bg-neutral-500/10 border border-neutral-500/20 text-neutral-400'
                                                }`}>
                                                {isActive ? 'ACTIVE' : 'PENDING'}
                                            </span>
                                        );
                                    })()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Invite Modal */}
            {showInvite && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && setShowInvite(false)}>
                    <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 w-full max-w-md space-y-5">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-black text-white flex items-center gap-2">
                                <Plus className="w-5 h-5 text-cyan-400" /> Invite User
                            </h3>
                            <button onClick={() => { setShowInvite(false); setGeneratedPassword(null); }} className="p-1.5 rounded-lg hover:bg-white/10 text-neutral-400">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider block mb-2">Email Address</label>
                            <input
                                type="email"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                placeholder="user@example.com"
                                className="w-full px-4 py-3 bg-black border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500/50 transition-all"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider block mb-2">Assign Sectors</label>
                            <div className="flex flex-wrap gap-2">
                                {ALL_SECTORS.map(sector => {
                                    const isSelected = inviteSectors.includes(sector);
                                    const c = SECTOR_COLORS[sector];
                                    return (
                                        <button
                                            key={sector}
                                            onClick={() => setInviteSectors(prev => isSelected ? prev.filter(s => s !== sector) : [...prev, sector])}
                                            className={`px-3 py-1.5 text-xs font-bold uppercase rounded-lg border transition-all ${isSelected ? `${c.bg} ${c.border} ${c.text}` : 'bg-white/5 border-white/10 text-neutral-500 hover:border-white/20'
                                                }`}
                                        >
                                            {sector}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={inviteUser}
                                disabled={inviteLoading || !inviteEmail || inviteSectors.length === 0}
                                className="flex-1 py-3 bg-gradient-to-r from-cyan-600 to-indigo-600 text-white text-sm font-bold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {inviteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                                Add User
                            </button>
                        </div>

                        {generatedPassword && (
                            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-3">
                                <div className="flex items-center gap-2 text-emerald-400">
                                    <Check className="w-4 h-4" />
                                    <h4 className="text-sm font-bold">User created successfully!</h4>
                                </div>
                                <p className="text-xs text-neutral-400">Share these credentials with the user so they can log in.</p>

                                <div className="space-y-2 bg-black/50 p-3 rounded-lg relative group">
                                    <div className="flex justify-between items-center text-xs font-mono">
                                        <span className="text-neutral-500">Email:</span>
                                        <span className="text-neutral-200">{generatedPassword.email}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs font-mono">
                                        <span className="text-neutral-500">Password:</span>
                                        <span className="text-white font-bold">{generatedPassword.password}</span>
                                    </div>
                                    <button
                                        onClick={copyPassword}
                                        className="absolute top-2 right-2 p-1.5 rounded-md bg-white/5 opacity-0 group-hover:opacity-100 transition-all hover:bg-white/15"
                                        title="Copy Credentials"
                                    >
                                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-neutral-400" />}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
