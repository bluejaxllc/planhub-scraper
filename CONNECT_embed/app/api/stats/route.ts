import { NextResponse } from 'next/server';
import turso from '@/lib/turso';

// Cache stats in memory for 5 minutes
let cachedStats: any = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function GET() {
    try {
        const now = Date.now();
        if (cachedStats && (now - cacheTime) < CACHE_TTL) {
            return NextResponse.json(cachedStats);
        }

        // All counts in parallel
        const [companies, projects, leads, withEmail, withPhone, types, states, statuses, buildingUses, constructionTypes, projectTypes] = await Promise.all([
            turso.execute('SELECT COUNT(*) as cnt FROM companies'),
            turso.execute('SELECT COUNT(*) as cnt FROM construction_projects'),
            turso.execute('SELECT COUNT(*) as cnt FROM project_companies'),
            turso.execute("SELECT COUNT(*) as cnt FROM companies WHERE email IS NOT NULL AND email != ''"),
            turso.execute("SELECT COUNT(*) as cnt FROM companies WHERE phone IS NOT NULL AND phone != ''"),
            turso.execute("SELECT industry_type, COUNT(*) as cnt FROM companies WHERE industry_type IS NOT NULL AND industry_type != '' GROUP BY industry_type ORDER BY cnt DESC LIMIT 10"),
            turso.execute("SELECT state, COUNT(*) as cnt FROM companies WHERE state IS NOT NULL AND state != '' GROUP BY state ORDER BY cnt DESC LIMIT 10"),
            turso.execute("SELECT DISTINCT status FROM construction_projects WHERE status IS NOT NULL AND status != '' ORDER BY status"),
            turso.execute("SELECT DISTINCT building_use FROM construction_projects WHERE building_use IS NOT NULL AND building_use != '' ORDER BY building_use"),
            turso.execute("SELECT DISTINCT construction_type FROM construction_projects WHERE construction_type IS NOT NULL AND construction_type != '' ORDER BY construction_type"),
            turso.execute("SELECT DISTINCT project_type FROM construction_projects WHERE project_type IS NOT NULL AND project_type != '' ORDER BY project_type"),
        ]);

        const result = {
            totalCompanies: Number(companies.rows[0]?.cnt || 0),
            totalProjects: Number(projects.rows[0]?.cnt || 0),
            totalLeads: Number(leads.rows[0]?.cnt || 0),
            withEmail: Number(withEmail.rows[0]?.cnt || 0),
            withPhone: Number(withPhone.rows[0]?.cnt || 0),
            typeDist: types.rows.map(r => ({ status: String(r.industry_type), count: Number(r.cnt) })),
            topStates: states.rows.map(r => ({ state: String(r.state), count: Number(r.cnt) })),
            allStatuses: statuses.rows.map(r => String(r.status)),
            allBuildingUses: buildingUses.rows.map(r => String(r.building_use)),
            allConstructionTypes: constructionTypes.rows.map(r => String(r.construction_type)),
            allProjectTypes: projectTypes.rows.map(r => String(r.project_type)),
        };

        cachedStats = result;
        cacheTime = now;

        return NextResponse.json(result);
    } catch (err: any) {
        console.error('Turso stats error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
