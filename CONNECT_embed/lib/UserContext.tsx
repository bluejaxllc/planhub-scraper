"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { SectorId } from '@/lib/taxonomy';

export type UserRole = 'super_admin' | 'admin' | 'viewer';
export type UserPersona = 'recruiter' | 'seeker' | 'hiring_company' | 'gc' | 'estimator' | 'admin';
export type Sector = SectorId;

interface UserProfile {
    id: string;
    email: string;
    role: UserRole;
    persona: UserPersona;
    sectors: Sector[];
    display_name: string | null;
    subscription_status: string | null;
}

interface UserContextType {
    user: UserProfile | null;
    loading: boolean;
    isSuperAdmin: boolean;
    hasSector: (sector: Sector) => boolean;
    persona: UserPersona;
    setTestPersona: (p: UserPersona | null) => void;
    signOut: () => Promise<void>;
    refresh: () => Promise<void>;
}

const UserContext = createContext<UserContextType>({
    user: null,
    loading: true,
    isSuperAdmin: false,
    hasSector: () => false,
    persona: 'recruiter',
    setTestPersona: () => { },
    signOut: async () => { },
    refresh: async () => { },
});

export function UserProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [testPersona, setTestPersona] = useState<UserPersona | null>(null);

    const fetchProfile = async () => {
        try {
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (!authUser) {
                setUser(null);
                setLoading(false);
                return;
            }

            const { data: profile } = await supabase
                .from('users')
                .select('*')
                .eq('id', authUser.id)
                .single();

            if (profile) {
                // Temporary soft override so Muhammad gets Estimator access immediately
                // even before the 'persona' column is officially added to the database.
                const derivedPersona = (profile.email || authUser.email || '').toLowerCase().includes('muhammad')
                    ? 'estimator'
                    : (profile.persona || 'recruiter');

                // Cash payment override: Muhammad paid cash — active until April 27, 2026
                const MUHAMMAD_CASH_OVERRIDE_EXPIRY = new Date('2026-04-27T00:00:00-06:00');
                const isMuhammad = (profile.email || authUser.email || '').toLowerCase().includes('muhammad');
                const muhammadOverrideActive = isMuhammad && new Date() < MUHAMMAD_CASH_OVERRIDE_EXPIRY;

                setUser({
                    id: profile.id,
                    email: profile.email || authUser.email || '',
                    role: profile.role || 'viewer',
                    persona: derivedPersona,
                    sectors: profile.sectors || [],
                    display_name: profile.display_name,
                    subscription_status: muhammadOverrideActive ? 'active' : profile.subscription_status,
                });
            } else {
                // User exists in auth but not in public.users - create basic profile
                const derivedPersona = (authUser.email || '').toLowerCase().includes('muhammad')
                    ? 'estimator'
                    : 'recruiter';

                setUser({
                    id: authUser.id,
                    email: authUser.email || '',
                    role: 'viewer',
                    persona: derivedPersona,
                    sectors: [],
                    display_name: null,
                    subscription_status: null,
                });
            }
        } catch (err) {
            console.error('Failed to fetch user profile:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfile();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session) {
                fetchProfile();
            } else {
                setUser(null);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const isSuperAdmin = user?.role === 'super_admin';
    const persona = testPersona || user?.persona || 'recruiter';

    const hasSector = (sector: Sector) => {
        if (!user) return false;
        if (user.role === 'super_admin') return true;
        return user.sectors.includes(sector);
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        setUser(null);
    };

    return (
        <UserContext.Provider value={{ user, loading, isSuperAdmin, hasSector, persona, setTestPersona, signOut, refresh: fetchProfile }}>
            {children}
        </UserContext.Provider>
    );
}

export const useUser = () => useContext(UserContext);
