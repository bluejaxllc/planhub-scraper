import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET /api/campaigns/templates — list templates
export async function GET() {
    const { data, error } = await supabase
        .from('message_templates')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
}

// POST /api/campaigns/templates — create template
export async function POST(req: Request) {
    const body = await req.json();
    const { name, channel, subject, body: templateBody, sector } = body;

    if (!name || !channel || !templateBody) {
        return NextResponse.json({ error: 'Name, channel, and body are required' }, { status: 400 });
    }

    const { data, error } = await supabase
        .from('message_templates')
        .insert({ name, channel, subject, body: templateBody, sector })
        .select()
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
}
