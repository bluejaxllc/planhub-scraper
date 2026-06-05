import { NextRequest, NextResponse } from 'next/server';
import turso from '@/lib/turso';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const mode = searchParams.get('mode') || 'directory';
        const page = parseInt(searchParams.get('page') || '0');
        const limit = Math.min(parseInt(searchParams.get('limit') || '25'), 100);
        const search = searchParams.get('search') || '';
        const state = searchParams.get('state') || '';
        const source = searchParams.get('source') || '';
        const days = searchParams.get('days') || 'all';
        const sort = searchParams.get('sort') || 'recent';
        const exportAll = searchParams.get('export') === 'true';
        const status = searchParams.get('status') || '';

        if (mode === 'directory') {
            const conditions: string[] = ["(email IS NOT NULL OR phone IS NOT NULL)"];
            const args: any[] = [];
            if (search) { conditions.push("(contact_name LIKE ? OR company_name LIKE ?)"); args.push(`%${search}%`, `%${search}%`); }
            if (state) { conditions.push("(state LIKE ?)"); args.push(`%${state}%`); }
            if (source) { conditions.push("source = ?"); args.push(source); }
            if (days !== 'all') { const cutoff = new Date(Date.now() - parseInt(days) * 86400000).toISOString(); conditions.push("last_enriched_at >= ?"); args.push(cutoff); }
            const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
            const hasFilters = search || state || source || (days !== 'all');
            
            // Skip expensive COUNT for filtered queries
            let total = 0;
            if (!hasFilters) {
                const countResult = await turso.execute({ sql: `SELECT COUNT(*) as cnt FROM companies WHERE email IS NOT NULL OR phone IS NOT NULL`, args: [] });
                total = Number(countResult.rows[0]?.cnt || 0);
            }
            
            const offset = page * limit;
            const dataLimit = exportAll ? 50000 : limit;
            const dataOffset = exportAll ? 0 : offset;
            const dataResult = await turso.execute({ sql: `SELECT id, planhub_id, company_name, address, city, state, zip, phone, email, website, industry_type, created_at, source, last_enriched_at, contact_name FROM companies ${where} ORDER BY last_enriched_at DESC LIMIT ? OFFSET ?`, args: [...args, dataLimit, dataOffset] });
            
            if (hasFilters) {
                total = dataResult.rows.length < dataLimit ? (dataOffset + dataResult.rows.length) : (dataOffset + dataLimit + 1);
            }
            
            return NextResponse.json({ data: dataResult.rows, count: total, page, limit, totalPages: Math.ceil(total / limit) });
        }

        // Projects listing (with search, state, status filters)
        if (mode === 'projects') {
            const conditions: string[] = [];
            const args: any[] = [];
            if (search) { conditions.push("(project LIKE ? OR city LIKE ? OR state LIKE ?)"); args.push(`%${search}%`, `%${search}%`, `%${search}%`); }
            if (state) { conditions.push("(state LIKE ? OR state LIKE ?)"); args.push(`%${state}%`, `%${state}%`); }
            if (status) { conditions.push("status = ?"); args.push(status); }
            const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
            const countResult = await turso.execute({ sql: `SELECT COUNT(*) as cnt FROM construction_projects ${where}`, args });
            const total = Number(countResult.rows[0]?.cnt || 0);
            const offset = page * limit;
            const dataLimit = exportAll ? 100000 : limit;
            const dataOffset = exportAll ? 0 : offset;
            const orderDir = sort === 'asc' ? 'ASC' : 'DESC';
            const dataResult = await turso.execute({ sql: `SELECT id, project, location, city, state, bid_date, status, source, building_use, construction_type, synced_at, date_created FROM construction_projects ${where} ORDER BY bid_date ${orderDir} LIMIT ? OFFSET ?`, args: [...args, dataLimit, dataOffset] });
            return NextResponse.json({ data: dataResult.rows, count: total, page, limit });
        }

        // Upcoming projects (bid_date between today and max days)
        if (mode === 'upcoming') {
            const maxDays = parseInt(searchParams.get('maxDays') || '90');
            const todayStr = new Date().toISOString().split('T')[0] + "T00:00:00Z";
            const maxDateStr = new Date(Date.now() + maxDays * 86400000).toISOString().split('T')[0] + "T23:59:59Z";
            const conditions: string[] = ["p.bid_date >= ?", "p.bid_date <= ?"];
            const args: any[] = [todayStr, maxDateStr];
            if (search) { conditions.push("(p.project LIKE ? OR p.city LIKE ? OR p.state LIKE ?)"); args.push(`%${search}%`, `%${search}%`, `%${search}%`); }
            if (state) { conditions.push("(p.state LIKE ?)"); args.push(`%${state}%`); }
            const where = `WHERE ${conditions.join(' AND ')}`;
            const offset = page * limit;
            const dataLimit = exportAll ? 100000 : limit;
            const dataOffset = exportAll ? 0 : offset;
            
            // Run count + data in parallel
            const [countResult, dataResult] = await Promise.all([
                turso.execute({ sql: `SELECT COUNT(*) as cnt FROM construction_projects p ${where}`, args }),
                turso.execute({ sql: `SELECT p.id, p.project, p.location, p.city, p.state, p.bid_date, p.status, p.source, p.building_use, p.construction_type, p.synced_at, p.date_created FROM construction_projects p ${where} ORDER BY p.bid_date ASC LIMIT ? OFFSET ?`, args: [...args, dataLimit, dataOffset] })
            ]);
            const total = Number(countResult.rows[0]?.cnt || 0);
            
            // Batch-fetch contractor counts for just these project IDs
            const projectIds = dataResult.rows.map((r: any) => r.id);
            let countMap: Record<string, number> = {};
            if (projectIds.length > 0) {
                const placeholders = projectIds.map(() => '?').join(',');
                const countsResult = await turso.execute({ sql: `SELECT project_planhub_id, COUNT(*) as cnt FROM project_companies WHERE project_planhub_id IN (${placeholders}) GROUP BY project_planhub_id`, args: projectIds });
                countsResult.rows.forEach((r: any) => { countMap[String(r.project_planhub_id)] = Number(r.cnt); });
            }
            const enrichedData = dataResult.rows.map((r: any) => ({ ...r, contractor_count: countMap[String(r.id)] || 0 }));
            
            return NextResponse.json({ data: enrichedData, count: total, page, limit });
        }

        // Project statuses (distinct values)
        if (mode === 'project_statuses') {
            const result = await turso.execute("SELECT DISTINCT status FROM construction_projects WHERE status IS NOT NULL AND status != '' ORDER BY status");
            return NextResponse.json({ data: result.rows.map((r: any) => r.status) });
        }

        if (mode === 'bids') {
            const conditions: string[] = ["(c.email IS NOT NULL OR c.phone IS NOT NULL)"];
            const args: any[] = [];
            if (search) { conditions.push("(c.contact_name LIKE ? OR c.company_name LIKE ?)"); args.push(`%${search}%`, `%${search}%`); }
            if (state) {
                // Use indexed exact match on state columns instead of LOWER+LIKE
                conditions.push("(c.state LIKE ? OR p.state LIKE ?)"); 
                args.push(`%${state}%`, `%${state}%`); 
            }
            if (source) { conditions.push("c.source = ?"); args.push(source); }
            if (days !== 'all') { const cutoff = new Date(Date.now() - parseInt(days) * 86400000).toISOString(); conditions.push("c.last_enriched_at >= ?"); args.push(cutoff); }
            const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
            
            // Skip expensive COUNT for filtered queries — estimate instead
            let total = 0;
            const hasFilters = search || state || source || (days !== 'all');
            if (!hasFilters) {
                const countResult = await turso.execute({ 
                    sql: `SELECT COUNT(*) as cnt FROM project_companies l JOIN companies c ON l.company_planhub_id = c.planhub_id WHERE c.email IS NOT NULL OR c.phone IS NOT NULL`, 
                    args: [] 
                });
                total = Number(countResult.rows[0]?.cnt || 0);
            }
            
            const offset = page * limit;
            const dataLimit = exportAll ? 50000 : limit;
            const dataOffset = exportAll ? 0 : offset;
            const orderBy = sort === 'bid_date' ? `ORDER BY p.bid_date ASC` : `ORDER BY COALESCE(c.last_enriched_at, c.created_at) DESC`;

            const dataResult = await turso.execute({ 
                sql: `
SELECT 
    l.id as lead_id, p.planhub_id as project_planhub_id, p.project as project_name, p.bid_date,
    p.city as project_city, p.state as project_state, c.company_name, c.contact_name, c.email, c.phone,
    c.industry_type, c.city as company_city, c.state as company_state, c.address as company_address,
    c.website, c.last_enriched_at as scraped_at, c.source as lead_source, c.planhub_id as company_planhub_id
FROM project_companies l 
JOIN companies c ON l.company_planhub_id = c.planhub_id 
JOIN construction_projects p ON l.project_planhub_id = p.id 
${where} ${orderBy} LIMIT ? OFFSET ?`, 
                args: [...args, dataLimit, dataOffset] 
            });
            
            // For filtered queries, estimate total from result size
            if (hasFilters) {
                total = dataResult.rows.length < dataLimit ? (dataOffset + dataResult.rows.length) : (dataOffset + dataLimit + 1);
            }
            
            return NextResponse.json({ data: dataResult.rows, count: total, page, limit, totalPages: Math.ceil(total / limit) });
        }

        // Find projects near a company (by city+state or state only)
        if (mode === 'company_projects') {
            const city = searchParams.get('city') || '';
            if (state && city) {
                const result = await turso.execute({ sql: `SELECT id, project, city, state, status, building_use FROM construction_projects WHERE (state LIKE ? OR state LIKE ?) AND city = ? ORDER BY bid_date DESC LIMIT 15`, args: [`%${state}%`, `%${state}%`, city] });
                if (result.rows.length > 0) return NextResponse.json({ data: result.rows });
            }
            if (state) {
                const result = await turso.execute({ sql: `SELECT id, project, city, state, status, building_use FROM construction_projects WHERE (state LIKE ? OR state LIKE ?) ORDER BY bid_date DESC LIMIT 15`, args: [`%${state}%`, `%${state}%`] });
                return NextResponse.json({ data: result.rows });
            }
            return NextResponse.json({ data: [] });
        }

        // Find companies near a project (by state, optionally city)
        if (mode === 'project_companies_lookup') {
            const city = searchParams.get('city') || '';
            const projectId = searchParams.get('projectId') || '';
            const pcPage = parseInt(searchParams.get('pcPage') || '0');
            const pcLimit = parseInt(searchParams.get('pcLimit') || '30');
            
            if (projectId) {
                // Get total count first (fast — indexed)
                const countResult = await turso.execute({ sql: `SELECT COUNT(*) as cnt FROM project_companies WHERE project_planhub_id = ?`, args: [projectId] });
                const totalCount = Number(countResult.rows[0]?.cnt || 0);
                
                if (totalCount > 0) {
                    // Get paginated junction entries
                    const jResult = await turso.execute({ 
                        sql: `SELECT company_planhub_id, contact_name FROM project_companies WHERE project_planhub_id = ? LIMIT ? OFFSET ?`, 
                        args: [projectId, pcLimit, pcPage * pcLimit] 
                    });
                    const ids = jResult.rows.map((r: any) => r.company_planhub_id);
                    const contactMap: Record<string, string> = {};
                    jResult.rows.forEach((r: any) => { if (r.contact_name) contactMap[r.company_planhub_id] = r.contact_name; });
                    
                    // Batch lookup companies
                    const allCompanies: any[] = [];
                    for (let i = 0; i < ids.length; i += 200) {
                        const batch = ids.slice(i, i + 200);
                        const placeholders = batch.map(() => '?').join(',');
                        const result = await turso.execute({ sql: `SELECT id, planhub_id, company_name, city, state, email, phone, industry_type, website, address, contact_name FROM companies WHERE planhub_id IN (${placeholders})`, args: batch });
                        allCompanies.push(...result.rows);
                    }
                    const enriched = allCompanies.map((c: any) => ({ ...c, contact_name: c.contact_name || contactMap[String(c.planhub_id)] || '' }));
                    return NextResponse.json({ data: enriched, total: totalCount, page: pcPage, limit: pcLimit });
                }
            }
            // Fallback: geographic matching — find nearby companies with contact info
            if (state) {
                // Use exact state match (indexed) instead of LIKE
                const stateVal = state.length === 2 ? state.toUpperCase() : state;
                let countSql = `SELECT COUNT(*) as cnt FROM companies WHERE state = ?`;
                let dataSql = `SELECT id, company_name, city, state, email, phone, industry_type, website, address, contact_name FROM companies WHERE state = ?`;
                const args: any[] = [stateVal];
                if (city) { countSql += ` AND city = ?`; dataSql += ` AND city = ?`; args.push(city); }
                // Prioritize companies with contact info
                dataSql += ` ORDER BY CASE WHEN email IS NOT NULL AND email != '' THEN 0 WHEN phone IS NOT NULL AND phone != '' THEN 1 ELSE 2 END, company_name ASC`;
                dataSql += ` LIMIT ? OFFSET ?`;
                const pcPageVal = parseInt(searchParams.get('pcPage') || '0');
                const pcLimitVal = parseInt(searchParams.get('pcLimit') || '30');
                const [countRes, dataRes] = await Promise.all([
                    turso.execute({ sql: countSql, args }),
                    turso.execute({ sql: dataSql, args: [...args, pcLimitVal, pcPageVal * pcLimitVal] }),
                ]);
                const geoTotal = Number(countRes.rows[0]?.cnt || 0);
                if (dataRes.rows.length > 0 || !city) {
                    return NextResponse.json({ data: dataRes.rows, total: geoTotal, page: pcPageVal, limit: pcLimitVal, source: 'geographic' });
                }
                // Retry without city filter
                const [stateCountRes, stateDataRes] = await Promise.all([
                    turso.execute({ sql: `SELECT COUNT(*) as cnt FROM companies WHERE state = ?`, args: [stateVal] }),
                    turso.execute({ sql: `SELECT id, company_name, city, state, email, phone, industry_type, website, address, contact_name FROM companies WHERE state = ? ORDER BY CASE WHEN email IS NOT NULL AND email != '' THEN 0 WHEN phone IS NOT NULL AND phone != '' THEN 1 ELSE 2 END, company_name ASC LIMIT ? OFFSET ?`, args: [stateVal, pcLimitVal, pcPageVal * pcLimitVal] }),
                ]);
                return NextResponse.json({ data: stateDataRes.rows, total: Number(stateCountRes.rows[0]?.cnt || 0), page: pcPageVal, limit: pcLimitVal, source: 'geographic' });
            }
            return NextResponse.json({ data: [], total: 0 });
        }

        if (mode === 'recent_companies') {
            const result = await turso.execute({ sql: `SELECT id, company_name, industry_type, state, last_enriched_at FROM companies WHERE last_enriched_at IS NOT NULL ORDER BY last_enriched_at DESC LIMIT ?`, args: [limit] });
            return NextResponse.json({ data: result.rows });
        }

        if (mode === 'recent_projects') {
            const result = await turso.execute({ sql: `SELECT id, project, city, state, bid_date FROM construction_projects WHERE bid_date IS NOT NULL ORDER BY bid_date DESC LIMIT ?`, args: [limit] });
            return NextResponse.json({ data: result.rows });
        }

        if (mode === 'source_counts') {
            const [companySources, projectSources] = await Promise.all([
                turso.execute("SELECT source, COUNT(*) as count FROM companies WHERE source IS NOT NULL AND source != '' GROUP BY source ORDER BY count DESC"),
                turso.execute("SELECT source, COUNT(*) as count FROM construction_projects WHERE source IS NOT NULL AND source != '' GROUP BY source ORDER BY count DESC"),
            ]);
            return NextResponse.json({ companySources: companySources.rows, projectSources: projectSources.rows });
        }

        if (mode === 'sector_counts') {
            const [companies, projects, leads] = await Promise.all([
                turso.execute("SELECT COUNT(*) as cnt FROM companies"),
                turso.execute("SELECT COUNT(*) as cnt FROM construction_projects"),
                turso.execute("SELECT COUNT(*) as cnt FROM project_companies"),
            ]);
            return NextResponse.json({
                companies: Number(companies.rows[0]?.cnt || 0),
                construction_projects: Number(projects.rows[0]?.cnt || 0),
                project_companies: Number(leads.rows[0]?.cnt || 0),
            });
        }

        return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
    } catch (err: any) {
        console.error('Turso query error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

