import { NextRequest, NextResponse } from 'next/server';

/**
 * PlanHub Login API Proxy — relays login requests from Railway's clean IP
 * 
 * Since your home IP (177.236.x.x) is banned, this endpoint relays
 * PlanHub API calls from Railway's datacenter IP (35.212.x.x)
 * 
 * POST: Relay a login request
 * GET ?action=projects&token=xxx: Relay a projects API call
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { email, password, recaptchaToken } = body;
        
        if (!email || !password) {
            return NextResponse.json({ error: 'email and password required' }, { status: 400 });
        }
        
        const loginPayload: any = {
            username: email,
            password: password,
        };
        if (recaptchaToken) {
            loginPayload.recaptcha = recaptchaToken;
            loginPayload['g-recaptcha-response'] = recaptchaToken;
        }
        
        const loginRes = await fetch('https://api.planhub.com/api/v2/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                'Origin': 'https://access.planhub.com',
                'Referer': 'https://access.planhub.com/signin',
                'Accept': 'application/json, text/plain, */*',
            },
            body: JSON.stringify(loginPayload),
            signal: AbortSignal.timeout(15000),
        });
        
        const responseText = await loginRes.text();
        let responseBody;
        try { responseBody = JSON.parse(responseText); } 
        catch { responseBody = responseText.slice(0, 500); }
        
        return NextResponse.json({ status: loginRes.status, body: responseBody });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    const action = req.nextUrl.searchParams.get('action');
    const token = req.nextUrl.searchParams.get('token');
    
    if (action === 'projects' && token) {
        const page = req.nextUrl.searchParams.get('page') || '1';
        const perPage = req.nextUrl.searchParams.get('per_page') || '50';
        const state = req.nextUrl.searchParams.get('state') || '';
        
        let url = `https://api.planhub.com/api/v1/projects?page=${page}&per_page=${perPage}`;
        if (state) url += `&state=${encodeURIComponent(state)}`;
        
        try {
            const res = await fetch(url, {
                headers: {
                    'authorization': `auth_token ${token}`,
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'application/json',
                },
                signal: AbortSignal.timeout(15000),
            });
            
            const text = await res.text();
            let body;
            try { body = JSON.parse(text); } 
            catch { body = text.slice(0, 500); }
            
            return NextResponse.json({ status: res.status, body });
        } catch (e: any) {
            return NextResponse.json({ error: e.message }, { status: 500 });
        }
    }
    
    if (action === 'ip') {
        const ipRes = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(5000) });
        return NextResponse.json(await ipRes.json());
    }
    
    return NextResponse.json({ 
        message: 'PlanHub API Proxy',
        endpoints: {
            'POST /': 'Login: { email, password, recaptchaToken }',
            'GET ?action=projects&token=xxx': 'Fetch projects via proxy',
            'GET ?action=ip': 'Check Railway IP',
        }
    });
}
