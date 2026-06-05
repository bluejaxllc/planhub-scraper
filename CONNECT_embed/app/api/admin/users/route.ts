import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// Helper to verify the requester is a super_admin
async function verifySuperAdmin(cookieStore: any) {
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll(); },
                setAll() { },
            },
        }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'super_admin') return null;
    return user;
}

// GET /api/admin/users — List all users
export async function GET() {
    const cookieStore = await cookies();
    const admin = await verifySuperAdmin(cookieStore);
    if (!admin) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ users: data });
}

// POST /api/admin/users — Invite a new user
export async function POST(request: Request) {
    const cookieStore = await cookies();
    const admin = await verifySuperAdmin(cookieStore);
    if (!admin) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { email, sectors, display_name } = await request.json();

    if (!email || !sectors?.length) {
        return NextResponse.json({ error: 'Email and sectors are required' }, { status: 400 });
    }

    // Use service role key for admin operations
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Create auth user with a temp password
    const tempPassword = `Scout${Math.random().toString(36).slice(2, 10)}!${Math.floor(Math.random() * 100)}`;
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: false,
    });

    if (authErr) {
        return NextResponse.json({ error: authErr.message }, { status: 400 });
    }

    if (authData.user) {
        // Insert into public.users with assigned sectors
        const { error: insertErr } = await supabase.from('users').upsert({
            id: authData.user.id,
            email,
            role: 'viewer',
            sectors,
            display_name: display_name || email.split('@')[0],
            subscription_status: 'active',
            invited_by: admin.id,
        });

        if (insertErr) {
            return NextResponse.json({ error: insertErr.message }, { status: 500 });
        }
    }

    return NextResponse.json({
        user: { id: authData.user?.id, email },
        tempPassword,
    });
}

// PATCH /api/admin/users — Update user role/sectors
export async function PATCH(request: Request) {
    const cookieStore = await cookies();
    const admin = await verifySuperAdmin(cookieStore);
    if (!admin) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { userId, role, sectors } = await request.json();

    if (!userId) {
        return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const updates: any = {};
    if (role !== undefined) updates.role = role;
    if (sectors !== undefined) updates.sectors = sectors;

    const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
