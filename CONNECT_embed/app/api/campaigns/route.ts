import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET /api/campaigns — list all campaigns
export async function GET() {
    const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
}

// POST /api/campaigns — create a new campaign
export async function POST(req: Request) {
    const body = await req.json();
    const { name, channel, subject, body_template, sector_filter, state_filter, custom_filters } = body;

    if (!name || !channel) {
        return NextResponse.json({ error: 'Name and channel are required' }, { status: 400 });
    }

    const { data, error } = await supabase
        .from('campaigns')
        .insert({
            name,
            channel,
            subject: subject || null,
            body_template: body_template || '',
            sector_filter: sector_filter || [],
            state_filter: state_filter || [],
            custom_filters: custom_filters || {},
            status: 'draft',
        })
        .select()
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
}
