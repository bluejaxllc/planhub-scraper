import { createBrowserClient } from '@supabase/ssr';

// Global singleton client for all "use client" components across the dashboard.
// This automatically syncs LocalStorage auth with traditional browser cookies,
// ensuring that middleware.ts on the edge can successfully parse the jwt access token.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables');
}

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
