"use client";

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { useSearchParams } from 'next/navigation';
import { useUser } from '@/lib/UserContext';
import {
    Building2, MapPin, Phone, Mail, ChevronRight, ChevronLeft,
    HardHat, FolderOpen, BarChart3, Search, ExternalLink,
    Globe, Filter, X, Download, SlidersHorizontal, Check
} from 'lucide-react';

// US state abbreviation to full name map
const STATE_NAMES: Record<string, string> = {
    'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas', 'CA': 'California',
    'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware', 'FL': 'Florida', 'GA': 'Georgia',
    'HI': 'Hawaii', 'ID': 'Idaho', 'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa',
    'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
    'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi', 'MO': 'Missouri',
    'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada', 'NH': 'New Hampshire', 'NJ': 'New Jersey',
    'NM': 'New Mexico', 'NY': 'New York', 'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio',
    'OK': 'Oklahoma', 'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
    'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah', 'VT': 'Vermont',
    'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia', 'WI': 'Wisconsin', 'WY': 'Wyoming',
    'DC': 'District of Columbia', 'PR': 'Puerto Rico', 'VI': 'Virgin Islands', 'GU': 'Guam',
};
const FULL_NAME_SET = new Set(Object.values(STATE_NAMES));

interface StatusCount { status: string; count: number }
interface StateCount { state: string; count: number }

type Tab = 'overview' | 'companies' | 'projects' | 'upcoming' | 'leads';

export default function ConstructionOverviewWrapper() {
    return (
        <Suspense fallback={<div className="text-neutral-500 p-8">Loading...</div>}>
            <ConstructionOverview />
        </Suspense>
    );
}

function ConstructionOverview() {
    const { persona } = useUser();
    const searchParams = useSearchParams();
    const initialTab = (searchParams.get('tab') as Tab) || 'overview';
    const [tab, setTab] = useState<Tab>(initialTab);

    // ── Overview state ──
    const [stats, setStats] = useState({ totalProjects: 0, totalCompanies: 0, withEmail: 0, withPhone: 0, states: 0 });
    const [statusDist, setStatusDist] = useState<StatusCount[]>([]);
    const [topStates, setTopStates] = useState<StateCount[]>([]);
    const [loading, setLoading] = useState(true);

    // ── Companies state ──
    const [companies, setCompanies] = useState<any[]>([]);
    const [companySearch, setCompanySearch] = useState(searchParams.get('c') || '');
    const [companyPage, setCompanyPage] = useState(0);
    const [companyTotal, setCompanyTotal] = useState(0);
    const [companyLoading, setCompanyLoading] = useState(true);
    const [selectedCompany, setSelectedCompany] = useState<any>(null);
    const [companyProjects, setCompanyProjects] = useState<any[]>([]);

    // ── Projects state ──
    const [projects, setProjects] = useState<any[]>([]);
    const [projectSearch, setProjectSearch] = useState(searchParams.get('p') || '');
    const [projectPage, setProjectPage] = useState(0);
    const [projectTotal, setProjectTotal] = useState(0);
    const [projectLoading, setProjectLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');
    const [stateFilter, setStateFilter] = useState('');
    const [statuses, setStatuses] = useState<string[]>([]);
    const [states, setStates] = useState<string[]>([]);
    const [selectedProject, setSelectedProject] = useState<any>(null);
    const [projectCompanies, setProjectCompanies] = useState<any[]>([]);

    // ── Accordion view state ──
    const [expandedProjectIds, setExpandedProjectIds] = useState<Set<number>>(new Set());
    const [projectCompaniesMap, setProjectCompaniesMap] = useState<Record<number, { items: any[], total: number, loading: boolean, source?: string }>>({});

    // ── Upcoming Projects state ──
    const [upcomingProjects, setUpcomingProjects] = useState<any[]>([]);
    const [upcomingSearch, setUpcomingSearch] = useState('');
    const [upcomingPage, setUpcomingPage] = useState(0);
    const [upcomingTotal, setUpcomingTotal] = useState(0);
    const [upcomingLoading, setUpcomingLoading] = useState(true);
    const [upcomingStateFilter, setUpcomingStateFilter] = useState('');
    const [upcomingDaysMax, setUpcomingDaysMax] = useState(365);
    const [upcomingExporting, setUpcomingExporting] = useState(false);
    const [projectExporting, setProjectExporting] = useState(false);

    // ── Lead Feed state ──
    const [leads, setLeads] = useState<any[]>([]);
    const [leadSearch, setLeadSearch] = useState('');
    const [leadPage, setLeadPage] = useState(0);
    const [leadTotal, setLeadTotal] = useState(0);
    const [leadLoading, setLeadLoading] = useState(true);
    const [leadStateFilter, setLeadStateFilter] = useState('all');
    const [leadExporting, setLeadExporting] = useState(false);

    const [leadPageSize, setLeadPageSize] = useState(100);
    const PAGE_SIZE = leadPageSize;

    // ── Helpers ──
    const stateName = (abbr: string) => STATE_NAMES[abbr?.toUpperCase()] || abbr;
    // Normalize a raw state value to a recognized full name, or null if unrecognized
    const normalizeState = (raw: string): string | null => {
        if (!raw) return null;
        const upper = raw.toUpperCase();
        if (STATE_NAMES[upper]) return STATE_NAMES[upper];
        if (FULL_NAME_SET.has(raw)) return raw;
        // Try title case match
        const titled = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
        if (FULL_NAME_SET.has(titled)) return titled;
        return null;
    };

    // ── Filter / Segmentation state ──
    type DataSource = 'companies' | 'projects';
    const [filterSource, setFilterSource] = useState<DataSource>('companies');
    const [filterType, setFilterType] = useState<string>('all');
    const [filterState, setFilterState] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [filterBuildingUse, setFilterBuildingUse] = useState<string>('all');
    const [filterConstructionType, setFilterConstructionType] = useState<string>('all');
    const [filterProjectType, setFilterProjectType] = useState<string>('all');
    const [filterDateFrom, setFilterDateFrom] = useState<string>('');
    const [filterDateTo, setFilterDateTo] = useState<string>('');
    const [filterHasEmail, setFilterHasEmail] = useState(false);
    const [filterHasPhone, setFilterHasPhone] = useState(false);
    const [filterHasWebsite, setFilterHasWebsite] = useState(false);
    const [filteredCompanies, setFilteredCompanies] = useState<any[]>([]);
    const [filteredTotal, setFilteredTotal] = useState(0);
    const [filteredPage, setFilteredPage] = useState(0);
    const [filteredLoading, setFilteredLoading] = useState(false);
    const [showFiltered, setShowFiltered] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [filterSortByProject, setFilterSortByProject] = useState(false);
    const [filterLeadSource, setFilterLeadSource] = useState<string>('all');
    const [allTypes, setAllTypes] = useState<string[]>([]);
    const [allStates, setAllStates] = useState<string[]>([]);
    const [allStatuses, setAllStatuses] = useState<string[]>([]);
    const [allBuildingUses, setAllBuildingUses] = useState<string[]>([]);
    const [allConstructionTypes, setAllConstructionTypes] = useState<string[]>([]);
    const [allProjectTypes, setAllProjectTypes] = useState<string[]>([]);
    const FILTER_PAGE = 100;

    // Known lead sources with display labels
    const LEAD_SOURCES = [
        { value: 'all', label: 'All Sources' },
        { value: 'procore_network', label: '🟠 Procore Network' },
        { value: 'civcast', label: '🏗️ Civcast' },
        { value: 'cal', label: '📋 PlanHub' },
        { value: 'planhub-supplier', label: '🔧 PlanHub Supplier' },
        { value: 'manually_scraped_private_projects_buildings', label: '🏢 Private/Commercial' },
        { value: 'telecom_scraper', label: '📡 Telecom' },
    ];

    // ── Overview data ──
    useEffect(() => { fetchOverview(); }, []);

    // Auto-refresh every 5 minutes (was 30s which hammered Supabase with 241k rows)
    useEffect(() => {
        const interval = setInterval(() => {
            fetchOverview();
            if (tab === 'companies') applyFilters(filteredPage);
        }, 300000);
        return () => clearInterval(interval);
    }, [tab]);

    // Auto-load companies when tab opens
    useEffect(() => {
        if (tab === 'companies' && !showFiltered) {
            applyFilters();
        }
    }, [tab]);

    const fetchOverview = async () => {
        try {
            // Fetch all overview stats from server-side API (reads from Turso, cached 5min)
            const res = await fetch('/api/stats');
            if (!res.ok) throw new Error(`Stats API: ${res.status}`);
            const data = await res.json();

            const fullStateList = Object.keys(STATE_NAMES).sort((a, b) =>
                STATE_NAMES[a].localeCompare(STATE_NAMES[b])
            );

            setStats({
                totalProjects: data.totalProjects || 0,
                totalCompanies: data.totalCompanies || 0,
                withEmail: data.withEmail || 0,
                withPhone: data.withPhone || 0,
                states: fullStateList.length,
            });
            if (data.totalLeads > leadTotal) {
                setLeadTotal(data.totalLeads);
            }

            if (data.typeDist?.length > 0) {
                setStatusDist(data.typeDist.slice(0, 7));
                setAllTypes(data.typeDist.map((t: any) => t.status).sort());
            }

            if (data.topStates?.length > 0) {
                setTopStates(data.topStates.slice(0, 8));
            }

            setAllStatuses(data.allStatuses || []);
            setAllBuildingUses(data.allBuildingUses || []);
            setAllConstructionTypes(data.allConstructionTypes || []);
            setAllProjectTypes(data.allProjectTypes || []);
            setAllStates(fullStateList);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // ── Apply filter / segmentation ──
    const buildFilterQuery = (pageOverride?: number) => {
        const table = filterSource === 'projects' ? 'construction_projects' : 'companies';
        let query = supabase.from(table).select('*', { count: 'exact' });

        if (filterState !== 'all') query = query.eq('state', filterState);

        if (filterSource === 'companies') {
            if (filterType !== 'all') query = query.eq('industry_type', filterType);
            if (filterLeadSource !== 'all') query = query.eq('source', filterLeadSource);
            // Only show enriched companies with actual contact data
            query = query.not('last_enriched_at', 'is', null);
            query = query.not('company_name', 'is', null).gt('company_name', '');
            // Contact filtering is done client-side for reliability (PostgREST nested and/or is unreliable)
            // Additional contact toggles for further narrowing
            if (filterHasEmail) query = query.not('email', 'is', null).gt('email', '');
            if (filterHasPhone) query = query.not('phone', 'is', null).gt('phone', '');
            if (filterHasWebsite) query = query.not('website', 'is', null).gt('website', '');
            if (filterDateFrom) query = query.gte('created_at', filterDateFrom);
            if (filterDateTo) query = query.lte('created_at', filterDateTo + 'T23:59:59');
            query = query.order('created_at', { ascending: false });
        } else {
            if (filterStatus !== 'all') query = query.eq('status', filterStatus);
            if (filterBuildingUse !== 'all') query = query.eq('building_use', filterBuildingUse);
            if (filterConstructionType !== 'all') query = query.eq('construction_type', filterConstructionType);
            if (filterProjectType !== 'all') query = query.eq('project_type', filterProjectType);
            if (filterDateFrom) query = query.gte('date_created', filterDateFrom);
            if (filterDateTo) query = query.lte('date_created', filterDateTo + 'T23:59:59');
            query = query.order('date_created', { ascending: false });
        }

        return { query, table };
    };

    const applyFilters = async (pageOverride?: number) => {
        setFilteredLoading(true);
        setShowFiltered(true);
        const pg = typeof pageOverride === 'number' ? pageOverride : 0;
        if (typeof pageOverride !== 'number') setFilteredPage(0);

        try {
            const { query } = buildFilterQuery();
            const { data, count } = await query.range(pg * FILTER_PAGE, (pg + 1) * FILTER_PAGE - 1);

            let enrichedData = data || [];
            // Client-side filter: require at least email or phone for companies
            if (filterSource === 'companies') {
                enrichedData = enrichedData.filter((c: any) => {
                    const hasEmail = c.email && c.email.trim() !== '';
                    const hasPhone = c.phone && c.phone.trim() !== '';
                    return hasEmail || hasPhone;
                });
            }
            if (filterSource === 'companies' && enrichedData.length > 0) {
                const projectPromises = enrichedData.map(async (c) => {
                    // Try junction table first (using planhub IDs)
                    if (c.planhub_id) {
                        const { data: junctions } = await supabase
                            .from('project_companies')
                            .select('project_planhub_id,contact_name')
                            .eq('company_planhub_id', String(c.planhub_id))
                            .limit(1);
                        if (junctions && junctions.length > 0) {
                            const { data: proj } = await supabase
                                .from('construction_projects')
                                .select('project, bid_date')
                                .eq('id', junctions[0].project_planhub_id)
                                .limit(1);
                            if (proj && proj.length > 0) {
                                return { ...c, _related_project: proj[0].project, _bid_date: proj[0].bid_date, _contact_name: junctions[0].contact_name };
                            }
                        }
                    }
                    // Fallback: geographic matching
                    const cState = c.state ? c.state.trim() : null;
                    if (cState) {
                        const { data: stateMatch } = await supabase
                            .from('construction_projects')
                            .select('project, bid_date')
                            .eq('state', cState)
                            .limit(1);
                        if (stateMatch && stateMatch.length > 0) {
                            return { ...c, _related_project: stateMatch[0].project, _bid_date: stateMatch[0].bid_date };
                        }
                    }
                    return { ...c, _related_project: null, _bid_date: null };
                });
                enrichedData = await Promise.all(projectPromises);
            }

            setFilteredCompanies(enrichedData);
            setFilteredTotal(count || 0);
        } catch (err) {
            console.error('Filter error:', err);
        } finally {
            setFilteredLoading(false);
        }
    };

    // ── CSV Export ──
    const exportCSV = async () => {
        setExporting(true);
        try {
            const table = filterSource === 'projects' ? 'construction_projects' : 'companies';
            const allRows: any[] = [];
            let offset = 0;
            const MAX = 50000;

            while (offset < MAX) {
                const { query } = buildFilterQuery();
                const { data } = await query.range(offset, offset + 999);
                if (!data || data.length === 0) break;
                allRows.push(...data);
                if (data.length < 1000) break;
                offset += 1000;
            }

            if (allRows.length === 0) return;

            // Build CSV
            const headers = Object.keys(allRows[0]).filter(k => k !== 'raw_json' && k !== 'contacts');
            const csvRows = [headers.join(',')];
            allRows.forEach(row => {
                csvRows.push(headers.map(h => {
                    let val = row[h] ?? '';
                    if (typeof val === 'object') val = JSON.stringify(val);
                    val = String(val).replace(/"/g, '""');
                    return `"${val}"`;
                }).join(','));
            });

            const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const filters = [filterSource, filterType !== 'all' ? filterType : '', filterState !== 'all' ? filterState : '', filterStatus !== 'all' ? filterStatus : ''].filter(Boolean).join('_');
            a.download = `scout_${filters}_${new Date().toISOString().slice(0, 10)}.csv`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Export error:', err);
        } finally {
            setExporting(false);
        }
    };

    const clearAllFilters = () => {
        setFilterSource('companies');
        setFilterType('all');
        setFilterState('all');
        setFilterStatus('all');
        setFilterBuildingUse('all');
        setFilterConstructionType('all');
        setFilterProjectType('all');
        setFilterLeadSource('all');
        setFilterDateFrom('');
        setFilterDateTo('');
        setFilterHasEmail(false);
        setFilterHasPhone(false);
        setFilterHasWebsite(false);
        setShowFiltered(false);
    };

    // ── Companies data ──
    const fetchCompanies = useCallback(async () => {
        setCompanyLoading(true);
        try {
            const params = new URLSearchParams({ mode: 'directory', page: String(companyPage), limit: String(PAGE_SIZE) });
            if (companySearch.trim()) params.set('search', companySearch.trim());
            const res = await fetch(`/api/enrichment?${params}`);
            if (res.ok) {
                const { data, count } = await res.json();
                if (data) setCompanies(data);
                if (count !== null) setCompanyTotal(count);
            }
        } catch (err) { console.error(err); }
        finally { setCompanyLoading(false); }
    }, [companySearch, companyPage]);

    useEffect(() => { if (tab === 'companies') fetchCompanies(); }, [tab, fetchCompanies]);

    // Load projects near a company
    const loadCompanyProjects = async (company: any) => {
        setSelectedCompany(company);
        setCompanyProjects([]);
        if (company.state) {
            const params = new URLSearchParams({ mode: 'company_projects', state: company.state });
            if (company.city) params.set('city', company.city);
            const res = await fetch(`/api/enrichment?${params}`);
            if (res.ok) { const { data } = await res.json(); if (data) setCompanyProjects(data); }
        }
    };

    // ── Projects data ──
    const fetchProjects = useCallback(async () => {
        setProjectLoading(true);
        try {
            const params = new URLSearchParams({ mode: 'projects', page: String(projectPage), limit: String(PAGE_SIZE) });
            if (projectSearch.trim()) params.set('search', projectSearch.trim());
            if (stateFilter) params.set('state', stateFilter);
            if (statusFilter) params.set('status', statusFilter);
            const res = await fetch(`/api/enrichment?${params}`);
            if (res.ok) {
                const { data, count } = await res.json();
                if (data) setProjects(data);
                if (count !== null) setProjectTotal(count);
            }
        } catch (err) { console.error(err); }
        finally { setProjectLoading(false); }
    }, [projectSearch, projectPage, statusFilter, stateFilter]);

    useEffect(() => { if (tab === 'projects') fetchProjects(); }, [tab, fetchProjects]);

    // ── Upcoming Projects data ──
    const fetchUpcoming = useCallback(async () => {
        setUpcomingLoading(true);
        try {
            const params = new URLSearchParams({ mode: 'upcoming', page: String(upcomingPage), limit: String(PAGE_SIZE), maxDays: String(upcomingDaysMax) });
            if (upcomingSearch.trim()) params.set('search', upcomingSearch.trim());
            if (upcomingStateFilter) params.set('state', upcomingStateFilter);
            const res = await fetch(`/api/enrichment?${params}`);
            if (res.ok) {
                const { data, count } = await res.json();
                if (data) setUpcomingProjects(data);
                if (count !== null) setUpcomingTotal(count);
            }
        } catch (err) { console.error(err); }
        finally { setUpcomingLoading(false); }
    }, [upcomingSearch, upcomingPage, upcomingStateFilter, upcomingDaysMax]);

    // ── Upcoming CSV Export ──
    const exportUpcomingCSV = async () => {
        setUpcomingExporting(true);
        try {
            const params = new URLSearchParams({ mode: 'upcoming', maxDays: String(upcomingDaysMax), export: 'true' });
            if (upcomingSearch.trim()) params.set('search', upcomingSearch.trim());
            if (upcomingStateFilter) params.set('state', upcomingStateFilter);
            const res = await fetch(`/api/enrichment?${params}`);
            if (!res.ok) return;
            const { data: allRows } = await res.json();
            if (!allRows || allRows.length === 0) return;
            const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
            const headers = ['Project', 'Bid Date', 'City', 'State', 'Status', 'Building Use', 'Construction Type', 'Project Type', 'Source', 'Discovered'];
            const csvRows = [headers.join(','), ...allRows.map((p: any) => [
                esc(p.project), esc(parseBidDate(p.bid_date)), esc(p.city), esc(p.state), esc(p.status),
                esc(p.building_use), esc(p.construction_type), esc(p.project_type), esc(p.source), esc(p.synced_at ? new Date(p.synced_at).toLocaleDateString() : '')
            ].join(','))];
            const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url;
            a.download = `upcoming_projects_${upcomingDaysMax}d_${new Date().toISOString().slice(0, 10)}.csv`;
            a.click(); URL.revokeObjectURL(url);
        } catch (err) { console.error(err); }
        finally { setUpcomingExporting(false); }
    };

    // ── Projects CSV Export ──
    const exportProjectsCSV = async () => {
        setProjectExporting(true);
        try {
            const params = new URLSearchParams({ mode: 'projects', export: 'true' });
            if (projectSearch.trim()) params.set('search', projectSearch.trim());
            if (statusFilter) params.set('status', statusFilter);
            if (stateFilter) params.set('state', stateFilter);
            const res = await fetch(`/api/enrichment?${params}`);
            if (!res.ok) return;
            const { data: allRows } = await res.json();
            if (!allRows || allRows.length === 0) return;
            const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
            const headers = ['Project', 'Bid Date', 'City', 'State', 'Status', 'Building Use', 'Construction Type', 'Project Type', 'Source', 'Discovered'];
            const csvRows = [headers.join(','), ...allRows.map((p: any) => [
                esc(p.project), esc(parseBidDate(p.bid_date)), esc(p.city), esc(p.state), esc(p.status),
                esc(p.building_use), esc(p.construction_type), esc(p.project_type), esc(p.source), esc(p.synced_at ? new Date(p.synced_at).toLocaleDateString() : '')
            ].join(','))];
            const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url;
            a.download = `all_projects_${new Date().toISOString().slice(0, 10)}.csv`;
            a.click(); URL.revokeObjectURL(url);
        } catch (err) { console.error(err); }
        finally { setProjectExporting(false); }
    };

    useEffect(() => { if (tab === 'upcoming') fetchUpcoming(); }, [tab, fetchUpcoming]);

    // Load project filter options
    useEffect(() => {
        if (tab === 'projects' && statuses.length === 0) {
            (async () => {
                const res = await fetch('/api/enrichment?mode=project_statuses');
                if (res.ok) { const { data } = await res.json(); if (data) setStatuses(data); }
                setStates(Object.keys(STATE_NAMES).sort((a, b) => STATE_NAMES[a].localeCompare(STATE_NAMES[b])));
            })();
        }
    }, [tab, statuses.length]);

    // Load companies near a project
    const loadProjectCompanies = async (project: any) => {
        setSelectedProject(project);
        setProjectCompanies([]);
        if (project.state) {
            const params = new URLSearchParams({ mode: 'project_companies_lookup', state: project.state });
            if (project.city) params.set('city', project.city);
            const res = await fetch(`/api/enrichment?${params}`);
            if (res.ok) { const { data } = await res.json(); if (data) setProjectCompanies(data); }
        }
    };

    const toggleProjectExpand = async (project: any) => {
        if (expandedProjectIds.has(project.id)) {
            setExpandedProjectIds(prev => {
                const next = new Set(prev);
                next.delete(project.id);
                return next;
            });
        } else {
            setExpandedProjectIds(prev => {
                const next = new Set(prev);
                next.add(project.id);
                return next;
            });
            if (!projectCompaniesMap[project.id]) {
                loadInlineProjectCompanies(project, 0);
            }
        }
    };

    const INLINE_PAGE_SIZE = 30;
    const loadInlineProjectCompanies = async (project: any, page: number) => {
        // Mark as loading
        setProjectCompaniesMap(prev => ({
            ...prev,
            [project.id]: { items: prev[project.id]?.items || [], total: prev[project.id]?.total || 0, loading: true, source: prev[project.id]?.source || 'junction' }
        }));
        const params = new URLSearchParams({ mode: 'project_companies_lookup', state: project.state || '', pcPage: String(page), pcLimit: String(INLINE_PAGE_SIZE) });
        if (project.city) params.set('city', project.city);
        if (project.id) params.set('projectId', String(project.id));
        const res = await fetch(`/api/enrichment?${params}`);
        if (res.ok) {
            const { data, total, source } = await res.json();
            setProjectCompaniesMap(prev => {
                const existing = prev[project.id]?.items || [];
                const merged = page === 0 ? (data || []) : [...existing, ...(data || [])];
                return { ...prev, [project.id]: { items: merged, total: total || merged.length, loading: false, source: source || 'junction' } };
            });
        } else {
            setProjectCompaniesMap(prev => ({ ...prev, [project.id]: { items: prev[project.id]?.items || [], total: 0, loading: false, source: 'junction' } }));
        }
    };

    const downloadProjectCsv = (project: any) => {
        const contractors = projectCompaniesMap[project.id]?.items;
        if (!contractors || contractors.length === 0) return;

        const bidDate = parseBidDate(project.bid_date);
        const headers = ['Project Name', 'Bid Date', 'Project City', 'Project State', 'Company Name', 'Contact Name', 'Type', 'Email', 'Phone', 'Address', 'City', 'State', 'Website'];
        const csvContent = [
            headers.join(','),
            ...contractors.map((c: any) => [
                `"${project.project?.replace(/"/g, '""') || ''}"`,
                `"${bidDate}"`,
                `"${project.city || ''}"`,
                `"${project.state || ''}"`,
                `"${c.company_name?.replace(/"/g, '""') || ''}"`,
                `"${c.contact_name?.replace(/"/g, '""') || ''}"`,
                `"${c.industry_type || ''}"`,
                `"${c.email || ''}"`,
                `"${c.phone || ''}"`,
                `"${c.address?.replace(/"/g, '""') || ''}"`,
                `"${c.city || ''}"`,
                `"${c.state || ''}"`,
                `"${c.website || ''}"`
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${project.project.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_contractors.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // ── Helpers ──
    const SOURCE_LABELS: Record<string, string> = {
        'cal': 'PlanHub',
        'planhub-supplier': 'PlanHub',
        'manually_scraped_private_projects_buildings': 'Private/Commercial',
        'telecom_scraper': 'Telecom',
    };
    const formatSource = (raw: string | null | undefined): string => {
        if (!raw) return '—';
        return SOURCE_LABELS[raw] || raw;
    };

    const parseBidDate = (raw: string | null | undefined): string => {
        if (!raw) return '—';
        // Format: "2025/02/25EST12:00:00" → "Feb 25, 2025"
        const cleaned = raw.replace(/EST|CST|PST|MST|EDT|CDT|PDT|MDT/g, 'T');
        try {
            const d = new Date(cleaned);
            if (isNaN(d.getTime())) return raw.split('EST')[0].split('CST')[0] || raw;
            return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        } catch { return raw; }
    };

    const navigateToProject = (projectName: string) => {
        setProjectSearch(projectName);
        setProjectPage(0);
        setTab('projects');
    };

    const STATUS_COLORS: Record<string, string> = {
        'GC and Sub Bidding': '#06b6d4', 'Budgeting/Planning': '#a855f7', 'Awarded': '#22c55e',
        'Sub Bidding Only': '#3b82f6', 'GC Bidding Only': '#6366f1', 'Completed': '#64748b', 'On Hold': '#f59e0b',
    };

    const getStatusChip = (s: string) => {
        const l = s?.toLowerCase() || '';
        if (l.includes('bidding')) return 'bg-cyan-500/15 text-cyan-400 border-cyan-500/25';
        if (l.includes('awarded')) return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25';
        if (l.includes('planning') || l.includes('budget')) return 'bg-purple-500/15 text-purple-400 border-purple-500/25';
        return 'bg-blue-500/15 text-blue-400 border-blue-500/25';
    };

    const totalStatus = statusDist.reduce((s, d) => s + d.count, 0);
    const maxState = topStates.length > 0 ? topStates[0].count : 1;

    const tabs: { id: Tab; label: string; icon: any; count?: number }[] = [
        { id: 'overview', label: 'Overview', icon: BarChart3 },
        { id: 'leads', label: 'Lead Feed', icon: HardHat, count: leadTotal },
        { id: 'companies', label: 'Companies', icon: Building2, count: stats.totalCompanies },
        { id: 'projects', label: 'Projects', icon: FolderOpen, count: stats.totalProjects },
        { id: 'upcoming', label: 'Upcoming', icon: FolderOpen, count: upcomingTotal },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                    <HardHat className="w-8 h-8 text-orange-400" /> Construction Intelligence
                </h1>
                <p className="text-neutral-400 font-medium mt-2">PlanHub project & company nationwide data</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-white/[0.03] rounded-xl p-1 border border-white/5 w-fit flex-wrap">
                {tabs.map(t => {
                    const Icon = t.icon;
                    const active = tab === t.id;
                    return (
                        <button key={t.id} onClick={() => {
                            if (t.id === 'leads') {
                                window.location.href = '/dashboard/leads';
                                return;
                            }
                            setTab(t.id); setCompanyPage(0); setProjectPage(0);
                        }}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${active ? 'bg-white/10 text-white shadow-md border border-white/10' : 'text-neutral-500 hover:text-neutral-300 border border-transparent'
                                }`}>
                            <Icon className={`w-4 h-4 ${active ? 'text-indigo-400' : ''}`} />
                            {t.label}
                            {t.count !== undefined && <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-white/10">{t.count.toLocaleString()}</span>}
                        </button>
                    );
                })}
            </div>

            {/* ════════════════ OVERVIEW TAB ════════════════ */}
            {tab === 'overview' && (
                <div className="space-y-6">
                    {/* Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
                        {[
                            { label: 'Projects', value: stats.totalProjects, icon: FolderOpen, color: 'indigo' },
                            { label: 'Companies', value: stats.totalCompanies, icon: Building2, color: 'orange' },
                            { label: 'With Email', value: stats.withEmail, icon: Mail, color: 'emerald' },
                            { label: 'With Phone', value: stats.withPhone, icon: Phone, color: 'purple' },
                            { label: 'States', value: stats.states, icon: MapPin, color: 'cyan' },
                        ].map(card => (
                            <div key={card.label} className={`bg-[#070707]/90 border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all hover:-translate-y-1`}>
                                <div className={`w-10 h-10 rounded-xl bg-${card.color}-500/10 border border-${card.color}-500/20 flex items-center justify-center mb-3`}>
                                    <card.icon className={`w-5 h-5 text-${card.color}-400`} />
                                </div>
                                {loading ? <div className="h-7 bg-white/10 rounded w-16 animate-pulse" /> : (
                                    <p className="text-2xl font-black text-white">{card.value.toLocaleString()}</p>
                                )}
                                <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mt-1">{card.label}</p>
                            </div>
                        ))}
                    </div>

                    {/* Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Status Dist */}
                        <div className="bg-[#070707]/90 border border-white/5 rounded-2xl p-6">
                            <h3 className="font-bold text-white text-lg flex items-center gap-2 mb-5">
                                <BarChart3 className="w-5 h-5 text-indigo-400" /> Company Types
                                <span className="ml-auto text-xs font-bold text-neutral-500 bg-white/5 px-3 py-1 rounded-full">{statusDist.length} types</span>
                            </h3>
                            <div className="space-y-3">
                                {statusDist.map(d => {
                                    const pct = totalStatus > 0 ? (d.count / totalStatus * 100) : 0;
                                    return (
                                        <div key={d.status}>
                                            <div className="flex items-center justify-between text-xs mb-1">
                                                <span className="text-neutral-300 font-medium truncate max-w-[200px]">{d.status}</span>
                                                <span className="text-neutral-500 font-bold">{d.count.toLocaleString()} ({pct.toFixed(0)}%)</span>
                                            </div>
                                            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: STATUS_COLORS[d.status] || '#94a3b8' }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Top Regions */}
                        <div className="bg-[#070707]/90 border border-white/5 rounded-2xl p-6">
                            <h3 className="font-bold text-white text-lg flex items-center gap-2 mb-5">
                                <MapPin className="w-5 h-5 text-cyan-400" /> Top Regions
                            </h3>
                            <div className="space-y-3">
                                {topStates.map((d, i) => (
                                    <div key={d.state}>
                                        <div className="flex items-center justify-between text-xs mb-1">
                                            <span className="text-neutral-300 font-medium">{d.state}</span>
                                            <span className="text-neutral-500 font-bold">{d.count.toLocaleString()}</span>
                                        </div>
                                        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(d.count / maxState * 100)}%`, backgroundColor: `hsl(${220 + i * 18}, 70%, 65%)` }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* ══ Filter / Segmentation Panel ══ */}
                    <div className="bg-[#070707]/90 border border-white/5 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="font-bold text-white text-lg flex items-center gap-2">
                                <SlidersHorizontal className="w-5 h-5 text-violet-400" /> Data Segmentation
                            </h3>
                            {showFiltered && (
                                <button onClick={clearAllFilters}
                                    className="text-xs text-neutral-500 hover:text-white transition-colors flex items-center gap-1">
                                    <X className="w-3 h-3" /> Clear All
                                </button>
                            )}
                        </div>

                        {/* Data Source Toggle */}
                        <div className="flex gap-2 mb-4">
                            {(['companies', 'projects'] as DataSource[]).map(src => (
                                <button key={src} onClick={() => setFilterSource(src)}
                                    className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${filterSource === src
                                        ? 'bg-violet-600/20 border-violet-500/30 text-violet-300 shadow-lg'
                                        : 'bg-white/[0.03] border-white/10 text-neutral-500 hover:text-white'
                                        }`}>
                                    {src === 'companies' ? '🏢 Companies' : '📁 Projects'}
                                </button>
                            ))}
                        </div>

                        {/* Row 1: Core Filters */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-3">
                            {/* State */}
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1.5 block">State</label>
                                <select value={filterState} onChange={e => setFilterState(e.target.value)}
                                    className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-white text-sm font-medium focus:outline-none focus:border-violet-500/40 appearance-none cursor-pointer">
                                    <option value="all" className="bg-[#0a0a0a] text-white">All States</option>
                                    {allStates.map(s => <option key={s} value={s} className="bg-[#0a0a0a] text-white">{stateName(s)}</option>)}
                                </select>
                            </div>

                            {/* Company-specific: Industry Type + Lead Source */}
                            {filterSource === 'companies' && (
                                <>
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1.5 block">Company Type</label>
                                        <select value={filterType} onChange={e => setFilterType(e.target.value)}
                                            className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-white text-sm font-medium focus:outline-none focus:border-violet-500/40 appearance-none cursor-pointer">
                                            <option value="all" className="bg-[#0a0a0a] text-white">All Types</option>
                                            {allTypes.map(t => <option key={t} value={t} className="bg-[#0a0a0a] text-white">{t}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1.5 block">Lead Source</label>
                                        <select value={filterLeadSource} onChange={e => setFilterLeadSource(e.target.value)}
                                            className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-white text-sm font-medium focus:outline-none focus:border-violet-500/40 appearance-none cursor-pointer">
                                            {LEAD_SOURCES.map(s => (
                                                <option key={s.value} value={s.value} className="bg-[#0a0a0a] text-white">{s.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </>
                            )}

                            {/* Project-specific filters */}
                            {filterSource === 'projects' && (
                                <>
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1.5 block">Status</label>
                                        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                                            className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-white text-sm font-medium focus:outline-none focus:border-violet-500/40 appearance-none cursor-pointer">
                                            <option value="all" className="bg-[#0a0a0a] text-white">All Statuses</option>
                                            {allStatuses.map(s => <option key={s} value={s} className="bg-[#0a0a0a] text-white">{s}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1.5 block">Building Use</label>
                                        <select value={filterBuildingUse} onChange={e => setFilterBuildingUse(e.target.value)}
                                            className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-white text-sm font-medium focus:outline-none focus:border-violet-500/40 appearance-none cursor-pointer">
                                            <option value="all" className="bg-[#0a0a0a] text-white">All Uses</option>
                                            {allBuildingUses.map(u => <option key={u} value={u} className="bg-[#0a0a0a] text-white">{u}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1.5 block">Construction</label>
                                        <select value={filterConstructionType} onChange={e => setFilterConstructionType(e.target.value)}
                                            className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-white text-sm font-medium focus:outline-none focus:border-violet-500/40 appearance-none cursor-pointer">
                                            <option value="all" className="bg-[#0a0a0a] text-white">All Types</option>
                                            {allConstructionTypes.map(t => <option key={t} value={t} className="bg-[#0a0a0a] text-white">{t}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1.5 block">Project Type</label>
                                        <select value={filterProjectType} onChange={e => setFilterProjectType(e.target.value)}
                                            className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-white text-sm font-medium focus:outline-none focus:border-violet-500/40 appearance-none cursor-pointer">
                                            <option value="all" className="bg-[#0a0a0a] text-white">All Types</option>
                                            {allProjectTypes.map(t => <option key={t} value={t} className="bg-[#0a0a0a] text-white">{t}</option>)}
                                        </select>
                                    </div>
                                </>
                            )}

                            {/* Date Range */}
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1.5 block">From Date</label>
                                <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)}
                                    className="w-full px-3 py-2 bg-white/[0.03] border border-white/10 rounded-xl text-white text-sm font-medium focus:outline-none focus:border-violet-500/40" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1.5 block">To Date</label>
                                <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)}
                                    className="w-full px-3 py-2 bg-white/[0.03] border border-white/10 rounded-xl text-white text-sm font-medium focus:outline-none focus:border-violet-500/40" />
                            </div>
                        </div>

                        {/* Row 2: Contact Toggles + Actions */}
                        <div className="flex flex-wrap items-end gap-3">
                            {filterSource === 'companies' && (
                                <>
                                    <button onClick={() => setFilterHasEmail(!filterHasEmail)}
                                        className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold border transition-all ${filterHasEmail ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' : 'bg-white/[0.03] border-white/10 text-neutral-500 hover:text-white'}`}>
                                        <Mail className="w-3.5 h-3.5" />{filterHasEmail && <Check className="w-3 h-3" />} Has Email
                                    </button>
                                    <button onClick={() => setFilterHasPhone(!filterHasPhone)}
                                        className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold border transition-all ${filterHasPhone ? 'bg-purple-500/15 border-purple-500/30 text-purple-400' : 'bg-white/[0.03] border-white/10 text-neutral-500 hover:text-white'}`}>
                                        <Phone className="w-3.5 h-3.5" />{filterHasPhone && <Check className="w-3 h-3" />} Has Phone
                                    </button>
                                    <button onClick={() => setFilterHasWebsite(!filterHasWebsite)}
                                        className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold border transition-all ${filterHasWebsite ? 'bg-blue-500/15 border-blue-500/30 text-blue-400' : 'bg-white/[0.03] border-white/10 text-neutral-500 hover:text-white'}`}>
                                        <Globe className="w-3.5 h-3.5" />{filterHasWebsite && <Check className="w-3 h-3" />} Has Website
                                    </button>
                                </>
                            )}
                            <div className="flex gap-2 ml-auto">
                                <button onClick={() => applyFilters()}
                                    className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold bg-violet-600 hover:bg-violet-500 text-white border border-violet-500/30 transition-all shadow-lg shadow-violet-900/20">
                                    <Filter className="w-3.5 h-3.5" /> Apply Filters
                                </button>
                                <button onClick={exportCSV} disabled={exporting}
                                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-white/[0.03] hover:bg-white/[0.06] text-neutral-300 border border-white/10 transition-all disabled:opacity-50">
                                    <Download className="w-3.5 h-3.5" />
                                    {exporting ? 'Exporting...' : 'Download CSV'}
                                </button>
                            </div>
                        </div>

                        {/* Active Filter Tags */}
                        {(filterType !== 'all' || filterState !== 'all' || filterStatus !== 'all' || filterBuildingUse !== 'all' || filterConstructionType !== 'all' || filterProjectType !== 'all' || filterLeadSource !== 'all' || filterDateFrom || filterDateTo || filterHasEmail || filterHasPhone || filterHasWebsite) && (
                            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-white/5">
                                <span className="text-[10px] font-bold text-neutral-600 uppercase tracking-wider self-center mr-1">Active:</span>
                                {filterLeadSource !== 'all' && (
                                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center gap-1">
                                        Source: {LEAD_SOURCES.find(s => s.value === filterLeadSource)?.label || filterLeadSource} <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => setFilterLeadSource('all')} />
                                    </span>
                                )}
                                {filterType !== 'all' && (
                                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center gap-1">
                                        Type: {filterType} <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => setFilterType('all')} />
                                    </span>
                                )}
                                {filterState !== 'all' && (
                                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center gap-1">
                                        State: {stateName(filterState)} <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => setFilterState('all')} />
                                    </span>
                                )}
                                {filterStatus !== 'all' && (
                                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center gap-1">
                                        Status: {filterStatus} <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => setFilterStatus('all')} />
                                    </span>
                                )}
                                {filterBuildingUse !== 'all' && (
                                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center gap-1">
                                        Use: {filterBuildingUse} <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => setFilterBuildingUse('all')} />
                                    </span>
                                )}
                                {filterConstructionType !== 'all' && (
                                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center gap-1">
                                        Construction: {filterConstructionType} <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => setFilterConstructionType('all')} />
                                    </span>
                                )}
                                {filterProjectType !== 'all' && (
                                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center gap-1">
                                        Project: {filterProjectType} <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => setFilterProjectType('all')} />
                                    </span>
                                )}
                                {filterDateFrom && (
                                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center gap-1">
                                        From: {filterDateFrom} <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => setFilterDateFrom('')} />
                                    </span>
                                )}
                                {filterDateTo && (
                                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center gap-1">
                                        To: {filterDateTo} <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => setFilterDateTo('')} />
                                    </span>
                                )}
                                {filterHasEmail && (
                                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-1">
                                        Has Email <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => setFilterHasEmail(false)} />
                                    </span>
                                )}
                                {filterHasPhone && (
                                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center gap-1">
                                        Has Phone <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => setFilterHasPhone(false)} />
                                    </span>
                                )}
                                {filterHasWebsite && (
                                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center gap-1">
                                        Has Website <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => setFilterHasWebsite(false)} />
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ══ Filtered Results ══ */}
                    {showFiltered && (
                        <div className="bg-[#070707]/90 border border-white/5 rounded-2xl overflow-hidden">
                            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                                <h3 className="font-bold text-white flex items-center gap-2">
                                    <Building2 className="w-4 h-4 text-violet-400" />
                                    Filtered Results
                                    <span className="text-xs font-black px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/20">
                                        {filteredTotal.toLocaleString()} matches
                                    </span>
                                </h3>
                                <div className="flex items-center gap-2">
                                    {filterSource === 'companies' && (
                                        <button onClick={() => setFilterSortByProject(v => !v)}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${filterSortByProject ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/30' : 'bg-white/5 text-neutral-400 border-white/10 hover:bg-white/10'}`}>
                                            <FolderOpen className="w-3.5 h-3.5" /> Sort by Project
                                        </button>
                                    )}
                                    <button onClick={exportCSV} disabled={exporting}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/20 transition-all">
                                        <Download className="w-3.5 h-3.5" /> {exporting ? 'Exporting...' : `Export ${filteredTotal.toLocaleString()} to CSV`}
                                    </button>
                                </div>
                            </div>
                            <table className="w-full">
                                <thead><tr className="border-b border-white/5">
                                    <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-[0.15em] text-neutral-500">{filterSource === 'companies' ? 'Company' : 'Project'}</th>
                                    {filterSource === 'companies' && <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.15em] text-neutral-500">Contact</th>}
                                    {filterSource === 'companies' && <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.15em] text-neutral-500">Local Project</th>}
                                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.15em] text-neutral-500">Location</th>
                                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.15em] text-neutral-500">{filterSource === 'companies' ? 'Type' : 'Status'}</th>
                                    {filterSource === 'companies' && <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.15em] text-neutral-500">Source</th>}
                                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.15em] text-neutral-500">{filterSource === 'companies' ? 'Email' : 'Building Use'}</th>
                                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.15em] text-neutral-500">{filterSource === 'companies' ? 'Phone' : 'Date'}</th>
                                    {filterSource === 'companies' && <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.15em] text-neutral-500">Website</th>}
                                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.15em] text-neutral-500">Discovered</th>
                                </tr></thead>
                                <tbody className="divide-y divide-white/[0.03]">
                                    {filteredLoading ? Array(6).fill(0).map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td className="px-5 py-3.5"><div className="h-4 bg-white/5 rounded w-40" /></td>
                                            {filterSource === 'companies' && <td className="px-4 py-3.5"><div className="h-4 bg-white/5 rounded w-24" /></td>}
                                            {filterSource === 'companies' && <td className="px-4 py-3.5"><div className="h-4 bg-white/5 rounded w-32" /></td>}
                                            <td className="px-4 py-3.5"><div className="h-4 bg-white/5 rounded w-24" /></td>
                                            <td className="px-4 py-3.5"><div className="h-4 bg-white/5 rounded w-20" /></td>
                                            <td className="px-4 py-3.5"><div className="h-4 bg-white/5 rounded w-36" /></td>
                                            <td className="px-4 py-3.5"><div className="h-4 bg-white/5 rounded w-28" /></td>
                                            {filterSource === 'companies' && <td className="px-4 py-3.5"><div className="h-4 bg-white/5 rounded w-28" /></td>}
                                            <td className="px-4 py-3.5"><div className="h-4 bg-white/5 rounded w-20" /></td>
                                        </tr>
                                    )) : (filterSortByProject ? [...filteredCompanies].sort((a, b) => {
                                        const pa = a._related_project || 'zzz';
                                        const pb = b._related_project || 'zzz';
                                        return pa.localeCompare(pb);
                                    }) : filteredCompanies).map((c, idx, arr) => (
                                        <React.Fragment key={c.id}>
                                            {filterSortByProject && idx > 0 && c._related_project && c._related_project !== arr[idx - 1]?._related_project && (
                                                <tr className="bg-indigo-500/5 border-t border-indigo-500/20">
                                                    <td colSpan={10} className="px-5 py-2">
                                                        <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400 flex items-center gap-2">
                                                            <FolderOpen className="w-3 h-3" /> {c._related_project}
                                                        </span>
                                                    </td>
                                                </tr>
                                            )}
                                            {filterSortByProject && idx === 0 && c._related_project && (
                                                <tr className="bg-indigo-500/5 border-t border-indigo-500/20">
                                                    <td colSpan={7} className="px-5 py-2">
                                                        <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400 flex items-center gap-2">
                                                            <FolderOpen className="w-3 h-3" /> {c._related_project}
                                                        </span>
                                                    </td>
                                                </tr>
                                            )}
                                            <tr key={c.id} className="hover:bg-white/[0.02] transition-colors cursor-pointer" onClick={() => filterSource === 'companies' ? loadCompanyProjects(c) : null}>
                                                <td className="px-5 py-3.5">
                                                    {filterSource === 'companies' ? (
                                                        <button onClick={(e) => { e.stopPropagation(); loadCompanyProjects(c); }}
                                                            className="font-bold text-orange-300 hover:text-amber-300 text-sm truncate max-w-[240px] hover:underline transition-colors cursor-pointer text-left">
                                                            {c.company_name}
                                                        </button>
                                                    ) : (
                                                        <button onClick={(e) => { e.stopPropagation(); navigateToProject(c.project); }}
                                                            className="font-bold text-cyan-300 hover:text-cyan-200 text-sm truncate max-w-[240px] hover:underline transition-colors cursor-pointer text-left">
                                                            {c.project}
                                                        </button>
                                                    )}
                                                </td>
                                                {filterSource === 'companies' && (
                                                    <td className="px-4 py-3.5">
                                                        {(c.contact_name || c._contact_name) ? (
                                                            <span className="text-xs text-purple-400 font-medium truncate block max-w-[140px]">
                                                                {c.contact_name || c._contact_name}
                                                            </span>
                                                        ) : (
                                                            <span className="text-xs text-neutral-600">—</span>
                                                        )}
                                                    </td>
                                                )}
                                                {filterSource === 'companies' && (
                                                    <td className="px-4 py-3.5">
                                                        {c._related_project ? (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); navigateToProject(c._related_project); }}
                                                                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1.5 truncate max-w-[200px] hover:underline transition-colors cursor-pointer"
                                                                title={`View ${c._related_project} in Projects tab`}
                                                            >
                                                                <FolderOpen className="w-3 h-3 flex-shrink-0" />
                                                                {c._related_project}
                                                            </button>
                                                        ) : (
                                                            <span className="text-xs text-neutral-600 flex items-center gap-1.5">
                                                                <FolderOpen className="w-3 h-3 flex-shrink-0" />
                                                                —
                                                            </span>
                                                        )}
                                                    </td>
                                                )}
                                                <td className="px-4 py-3.5">
                                                    <span className="text-xs text-neutral-400 flex items-center gap-1"><MapPin className="w-3 h-3" />{[c.address, c.city, stateName(c.state), c.zip].filter(Boolean).join(', ') || c.location || '—'}</span>
                                                </td>
                                                <td className="px-4 py-3.5">
                                                    {filterSource === 'companies' ? (
                                                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400">{c.industry_type || '—'}</span>
                                                    ) : (
                                                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${c.status?.includes('Bidding') ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400' :
                                                            c.status?.includes('Awarded') ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                                                                'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
                                                            }`}>{c.status || '—'}</span>
                                                    )}
                                                </td>
                                                {filterSource === 'companies' && (
                                                    <td className="px-4 py-3.5">
                                                        {c.source ? (
                                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${
                                                                c.source === 'procore_network' ? 'bg-orange-500/10 border-orange-500/20 text-orange-400' :
                                                                c.source === 'civcast' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                                                                c.source === 'cal' || c.source === 'planhub-supplier' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' :
                                                                c.source === 'telecom_scraper' ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400' :
                                                                'bg-neutral-500/10 border-neutral-500/20 text-neutral-400'
                                                            }`}>
                                                                {LEAD_SOURCES.find(s => s.value === c.source)?.label?.replace(/^[^ ]+ /, '') || c.source}
                                                            </span>
                                                        ) : <span className="text-xs text-neutral-600">—</span>}
                                                    </td>
                                                )}
                                                <td className="px-4 py-3.5">
                                                    {filterSource === 'companies' ? (
                                                        c.email ? <a href={`mailto:${c.email}`} className="text-xs text-emerald-400 hover:text-emerald-300 hover:underline truncate block max-w-[200px] transition-colors">{c.email}</a> : <span className="text-xs text-neutral-600">—</span>
                                                    ) : (
                                                        <span className="text-xs text-amber-400">{c.building_use || '—'}</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3.5">
                                                    {filterSource === 'companies' ? (
                                                        c.phone ? <a href={`tel:${c.phone}`} className="text-xs text-purple-400 hover:text-purple-300 hover:underline whitespace-nowrap transition-colors">{c.phone}</a> : <span className="text-xs text-neutral-600">—</span>
                                                    ) : (
                                                        <span className="text-xs text-neutral-500">{c.date_created ? new Date(c.date_created).toLocaleDateString() : '—'}</span>
                                                    )}
                                                </td>
                                                {filterSource === 'companies' && (
                                                    <td className="px-4 py-3.5">
                                                        {c.website ? <a href={c.website.startsWith('http') ? c.website : `https://${c.website}`} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300 hover:underline truncate block max-w-[150px] transition-colors flex items-center gap-1"><ExternalLink className="w-3 h-3 flex-shrink-0" />{c.website.replace(/^https?:\/\//, '')}</a> : <span className="text-xs text-neutral-600">—</span>}
                                                    </td>
                                                )}
                                                <td className="px-4 py-3.5">
                                                    <span className="text-xs text-neutral-500 whitespace-nowrap">{c.created_at ? new Date(c.created_at).toLocaleDateString() : (c.date_created ? new Date(c.date_created).toLocaleDateString() : '—')}</span>
                                                </td>
                                            </tr>
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                            {Math.ceil(filteredTotal / FILTER_PAGE) > 1 && (
                                <div className="px-6 py-3 border-t border-white/5 flex items-center justify-between">
                                    <span className="text-xs text-neutral-500 font-medium">
                                        {filteredPage * FILTER_PAGE + 1}–{Math.min((filteredPage + 1) * FILTER_PAGE, filteredTotal)} of {filteredTotal.toLocaleString()}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => { setFilteredPage(p => Math.max(0, p - 1)); applyFilters(filteredPage - 1); }} disabled={filteredPage === 0}
                                            className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-neutral-400 hover:text-white disabled:opacity-30 transition-all">
                                            <ChevronLeft className="w-4 h-4" />
                                        </button>
                                        <span className="text-xs font-bold text-neutral-300">{filteredPage + 1} / {Math.ceil(filteredTotal / FILTER_PAGE)}</span>
                                        <button onClick={() => { setFilteredPage(p => p + 1); applyFilters(filteredPage + 1); }} disabled={filteredPage >= Math.ceil(filteredTotal / FILTER_PAGE) - 1}
                                            className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-neutral-400 hover:text-white disabled:opacity-30 transition-all">
                                            <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* ════════════════ COMPANIES TAB ════════════════ */}
            {tab === 'companies' && (
                <div className="space-y-4">
                    <div className="flex gap-3">
                        <div className="relative flex-1">
                            <Search className="w-4 h-4 text-neutral-500 absolute left-4 top-1/2 -translate-y-1/2" />
                            <input value={companySearch} onChange={e => { setCompanySearch(e.target.value); setCompanyPage(0); }}
                                placeholder="Search companies by name, city, or state..."
                                className="w-full pl-11 pr-4 py-3 bg-white/[0.03] border border-white/5 rounded-xl text-white text-sm font-medium placeholder:text-neutral-600 focus:outline-none focus:border-indigo-500/30" />
                        </div>
                    </div>

                    <div className="bg-[#070707]/90 border border-white/5 rounded-2xl overflow-x-auto">
                        <table className="w-full min-w-[1200px]">
                            <thead><tr className="border-b border-white/5">
                                <th className="px-5 py-3.5 text-left text-[10px] font-black uppercase tracking-[0.15em] text-neutral-500 whitespace-nowrap min-w-[120px]">Discovered</th>
                                <th className="px-5 py-3.5 text-left text-[10px] font-black uppercase tracking-[0.15em] text-neutral-500">Company</th>
                                <th className="px-4 py-3.5 text-left text-[10px] font-black uppercase tracking-[0.15em] text-neutral-500">Location</th>
                                <th className="px-4 py-3.5 text-left text-[10px] font-black uppercase tracking-[0.15em] text-neutral-500">Email</th>
                                <th className="px-4 py-3.5 text-left text-[10px] font-black uppercase tracking-[0.15em] text-neutral-500">Phone</th>
                                <th className="px-4 py-3.5 text-left text-[10px] font-black uppercase tracking-[0.15em] text-neutral-500">Type</th>
                            </tr></thead>
                            <tbody className="divide-y divide-white/[0.03]">
                                {companyLoading ? Array(8).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-5 py-4"><div className="h-4 bg-white/5 rounded w-20" /></td>
                                        <td className="px-5 py-4"><div className="h-4 bg-white/5 rounded w-40" /></td>
                                        <td className="px-4 py-4"><div className="h-4 bg-white/5 rounded w-24" /></td>
                                        <td className="px-4 py-4"><div className="h-4 bg-white/5 rounded w-32" /></td>
                                        <td className="px-4 py-4"><div className="h-4 bg-white/5 rounded w-24" /></td>
                                        <td className="px-4 py-4"><div className="h-4 bg-white/5 rounded w-20" /></td>
                                    </tr>
                                )) : companies.map(c => (
                                    <tr key={c.id} onClick={() => loadCompanyProjects(c)} className="hover:bg-white/[0.02] transition-colors cursor-pointer group">
                                        <td className="px-5 py-3.5 whitespace-nowrap">
                                            <span className="text-xs text-neutral-400 font-medium">{c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}</span>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <div className="flex flex-col gap-1.5">
                                                <p className="font-bold text-white text-sm group-hover:text-indigo-300 transition-colors truncate max-w-[250px]">{c.company_name}</p>
                                                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-bold text-indigo-400 w-fit group-hover:bg-indigo-500/20 transition-colors">
                                                    <FolderOpen className="w-3 h-3" /> View Local Projects
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <span className="text-xs text-neutral-400 flex items-center gap-1"><MapPin className="w-3 h-3" />{[c.city, c.state].filter(Boolean).join(', ') || '—'}</span>
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <span className="text-xs text-neutral-400 truncate block max-w-[200px]">{c.email || '—'}</span>
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <span className="text-xs text-neutral-400">{c.phone || '—'}</span>
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <span className="text-xs text-neutral-500">{c.industry_type || '—'}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Company pagination */}
                        {Math.ceil(companyTotal / PAGE_SIZE) > 1 && (
                            <div className="px-5 py-3 border-t border-white/5 flex items-center justify-between">
                                <span className="text-xs text-neutral-500">Showing {companyPage * PAGE_SIZE + 1}–{Math.min((companyPage + 1) * PAGE_SIZE, companyTotal)} of {companyTotal.toLocaleString()}</span>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => setCompanyPage(p => Math.max(0, p - 1))} disabled={companyPage === 0}
                                        className="p-1.5 rounded-lg bg-white/5 text-neutral-400 hover:text-white disabled:opacity-30 transition-all"><ChevronLeft className="w-4 h-4" /></button>
                                    <span className="text-xs font-bold text-neutral-300 px-2">{companyPage + 1} / {Math.ceil(companyTotal / PAGE_SIZE)}</span>
                                    <button onClick={() => setCompanyPage(p => p + 1)} disabled={(companyPage + 1) * PAGE_SIZE >= companyTotal}
                                        className="p-1.5 rounded-lg bg-white/5 text-neutral-400 hover:text-white disabled:opacity-30 transition-all"><ChevronRight className="w-4 h-4" /></button>
                                </div>
                            </div>
                        )}
                    </div>


                </div>
            )}

            {/* ════════════════ PROJECTS TAB ════════════════ */}
            {tab === 'projects' && (
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="w-4 h-4 text-neutral-500 absolute left-4 top-1/2 -translate-y-1/2" />
                            <input value={projectSearch} onChange={e => { setProjectSearch(e.target.value); setProjectPage(0); }}
                                placeholder="Search projects by name, location, or city..."
                                className="w-full pl-11 pr-4 py-3 bg-white/[0.03] border border-white/5 rounded-xl text-white text-sm font-medium placeholder:text-neutral-600 focus:outline-none focus:border-indigo-500/30" />
                        </div>
                        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setProjectPage(0); }}
                            className="px-4 py-3 bg-white/[0.03] border border-white/5 rounded-xl text-neutral-300 text-sm font-medium appearance-none cursor-pointer focus:outline-none">
                            <option value="" className="bg-[#0a0a0a] text-white">All Statuses</option>
                            {statuses.map(s => <option key={s} value={s} className="bg-[#0a0a0a] text-white">{s}</option>)}
                        </select>
                        <select value={stateFilter} onChange={e => { setStateFilter(e.target.value); setProjectPage(0); }}
                            className="px-4 py-3 bg-white/[0.03] border border-white/5 rounded-xl text-neutral-300 text-sm font-medium appearance-none cursor-pointer focus:outline-none">
                            <option value="" className="bg-[#0a0a0a] text-white">All States</option>
                            {states.map(s => <option key={s} value={s} className="bg-[#0a0a0a] text-white">{STATE_NAMES[s] || s}</option>)}
                        </select>
                        <button onClick={exportProjectsCSV} disabled={projectExporting}
                            className="flex items-center gap-1.5 px-4 py-3 bg-white/[0.03] border border-white/5 rounded-xl text-neutral-300 text-sm font-bold hover:bg-white/[0.06] hover:text-white transition-all disabled:opacity-50">
                            <Download className="w-4 h-4" /> {projectExporting ? 'Exporting...' : 'Download CSV'}
                        </button>
                    </div>

                    <div className="bg-[#070707]/90 border border-white/5 rounded-2xl overflow-x-auto">
                        <table className="w-full min-w-[1100px]">
                            <thead><tr className="border-b border-white/5">
                                <th className="px-5 py-3.5 text-left text-[10px] font-black uppercase tracking-[0.15em] text-neutral-500 whitespace-nowrap min-w-[120px]">Discovered</th>
                                <th className="px-5 py-3.5 text-left text-[10px] font-black uppercase tracking-[0.15em] text-neutral-500">Project</th>
                                <th className="px-4 py-3.5 text-left text-[10px] font-black uppercase tracking-[0.15em] text-neutral-500">Location</th>
                                <th className="px-4 py-3.5 text-left text-[10px] font-black uppercase tracking-[0.15em] text-neutral-500">Status</th>
                                <th className="px-4 py-3.5 text-left text-[10px] font-black uppercase tracking-[0.15em] text-neutral-500">Building Use</th>
                                <th className="px-4 py-3.5 text-left text-[10px] font-black uppercase tracking-[0.15em] text-neutral-500">Construction</th>
                                <th className="px-4 py-3.5 text-left text-[10px] font-black uppercase tracking-[0.15em] text-neutral-500">Source</th>
                                <th className="px-4 py-3.5 text-left text-[10px] font-black uppercase tracking-[0.15em] text-neutral-500">Bid Date</th>
                            </tr></thead>
                            <tbody className="divide-y divide-white/[0.03]">
                                {projectLoading ? Array(8).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-5 py-4"><div className="h-4 bg-white/5 rounded w-20" /></td>
                                        <td className="px-5 py-4"><div className="h-4 bg-white/5 rounded w-48" /></td>
                                        <td className="px-4 py-4"><div className="h-4 bg-white/5 rounded w-20" /></td>
                                        <td className="px-4 py-4"><div className="h-4 bg-white/5 rounded w-28" /></td>
                                        <td className="px-4 py-4"><div className="h-4 bg-white/5 rounded w-24" /></td>
                                        <td className="px-4 py-4"><div className="h-4 bg-white/5 rounded w-24" /></td>
                                        <td className="px-4 py-4"><div className="h-4 bg-white/5 rounded w-20" /></td>
                                        <td className="px-4 py-4"><div className="h-4 bg-white/5 rounded w-20" /></td>
                                    </tr>
                                )) : projects.map(p => (
                                    <React.Fragment key={p.id}>
                                        <tr onClick={() => toggleProjectExpand(p)} className="hover:bg-white/[0.02] cursor-pointer group transition-colors">
                                            <td className="px-5 py-3.5 whitespace-nowrap">
                                                <span className="text-xs text-neutral-400 font-medium">{(p.synced_at || p.created_at) ? new Date(p.synced_at || p.created_at).toLocaleDateString() : '—'}</span>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <div className="flex flex-col gap-1.5">
                                                    <p className="font-bold text-white text-sm group-hover:text-amber-400 transition-colors truncate max-w-[300px]">{p.project}</p>
                                                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold w-fit transition-colors ${expandedProjectIds.has(p.id) ? 'bg-amber-500/20 border border-amber-500/30 text-amber-400' : 'bg-white/5 border border-white/10 text-neutral-400 group-hover:bg-white/10'}`}>
                                                        <Building2 className="w-3 h-3" /> {expandedProjectIds.has(p.id) ? 'Collapse Contractors' : 'Expand Contractors'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <span className="text-xs text-neutral-400 flex items-center gap-1"><MapPin className="w-3 h-3" />{[p.city, p.state].filter(Boolean).join(', ')}</span>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${getStatusChip(p.status)}`}>{p.status || '—'}</span>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <span className="text-xs text-amber-400 truncate block max-w-[150px]">{p.building_use || '—'}</span>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <span className="text-xs text-neutral-400 truncate block max-w-[150px]">{p.construction_type || '—'}</span>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <span className="text-xs text-neutral-500">{formatSource(p.source)}</span>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                {p.status?.toLowerCase() === 'awarded' && !p.bid_date ? (
                                                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full border bg-green-500/15 text-green-400 border-green-500/25">Awarded</span>
                                                ) : (
                                                    <span className="text-xs text-amber-400 font-medium">{parseBidDate(p.bid_date)}</span>
                                                )}
                                            </td>
                                        </tr>
                                        {/* Nested Accordion for Companies */}
                                        {
                                            expandedProjectIds.has(p.id) && (
                                                <tr className="bg-[#0a0a0a] border-b border-white/5">
                                                    <td colSpan={8} className="px-2 py-4 sm:px-10 sm:py-6">
                                                            <div className="bg-[#070707] border border-orange-500/20 rounded-xl p-5 shadow-inner">
                                                            <div className="flex items-center justify-between mb-4">
                                                                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                                                                    <Building2 className="w-4 h-4 text-orange-400" /> {projectCompaniesMap[p.id]?.source === 'geographic' ? `Nearby Companies in ${p.state || 'this area'}` : 'Bidding/Local Contractors'}
                                                                    {projectCompaniesMap[p.id] && <span className="ml-2 text-[10px] font-black px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400">{projectCompaniesMap[p.id].items.length} of {projectCompaniesMap[p.id].total} loaded</span>}
                                                                </h4>
                                                                {projectCompaniesMap[p.id] && projectCompaniesMap[p.id].items.length > 0 && (
                                                                    <button onClick={(e) => { e.stopPropagation(); downloadProjectCsv(p); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-bold text-white transition-colors">
                                                                        <Download className="w-3.5 h-3.5" /> Download CSV
                                                                    </button>
                                                                )}
                                                            </div>

                                                            {!projectCompaniesMap[p.id] || (projectCompaniesMap[p.id].loading && projectCompaniesMap[p.id].items.length === 0) ? (
                                                                <div className="flex items-center gap-2 text-neutral-500 text-sm animate-pulse">
                                                                    <div className="w-4 h-4 rounded-full border-2 border-orange-500/30 border-t-orange-500 animate-spin" /> Loading contractors...
                                                                </div>
                                                            ) : projectCompaniesMap[p.id].total === 0 ? (
                                                                <div className="flex flex-col items-center py-6 text-center">
                                                                    <Building2 className="w-8 h-8 text-neutral-700 mb-3" />
                                                                    <p className="text-neutral-400 text-sm font-semibold">No contractors found for this project yet</p>
                                                                    <p className="text-neutral-600 text-xs mt-1">Our enrichment pipeline is continuously discovering new companies — check back soon.</p>
                                                                </div>
                                                            ) : (
                                                                <>
                                                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                                                                    {projectCompaniesMap[p.id].items.map((c: any, idx: number) => (
                                                                        <div key={`${c.planhub_id || c.id}-${idx}`} className="flex flex-col p-3 rounded-lg bg-white/[0.03] border border-white/5 hover:border-orange-500/30 transition-colors">
                                                                            <div className="flex items-start justify-between gap-2 mb-2">
                                                                                <p className="text-sm text-white font-bold truncate max-w-[200px]" title={c.company_name}>{c.company_name}</p>
                                                                                {c.industry_type && <span className="shrink-0 text-[9px] font-bold text-neutral-400 bg-white/5 px-2 py-0.5 rounded-md">{c.industry_type}</span>}
                                                                            </div>
                                                                            {c.address && (
                                                                                <p className="text-[11px] text-neutral-500 flex items-center gap-1 mb-1 truncate" title={c.address}>
                                                                                    <MapPin className="w-3 h-3 shrink-0" />{c.address}
                                                                                </p>
                                                                            )}
                                                                            <div className="flex flex-col gap-1 mt-auto">
                                                                                {c.email && <div className="text-xs text-emerald-400 flex items-center gap-1.5 truncate"><Mail className="w-3 h-3" /> {c.email}</div>}
                                                                                {c.phone && <div className="text-xs text-purple-400 flex items-center gap-1.5 truncate"><Phone className="w-3 h-3" /> {c.phone}</div>}
                                                                                <div className="text-[11px] text-neutral-500 flex items-center gap-1.5 truncate"><MapPin className="w-3 h-3" /> {[c.city, c.state].filter(Boolean).join(', ')}</div>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                                {projectCompaniesMap[p.id].items.length < projectCompaniesMap[p.id].total && (
                                                                    <button onClick={(e) => { e.stopPropagation(); loadInlineProjectCompanies(p, Math.ceil(projectCompaniesMap[p.id].items.length / INLINE_PAGE_SIZE)); }}
                                                                        disabled={projectCompaniesMap[p.id].loading}
                                                                        className="mt-3 w-full flex items-center justify-center gap-2 text-xs font-bold text-orange-400 hover:text-orange-300 px-4 py-2.5 rounded-lg bg-orange-500/5 border border-orange-500/20 hover:bg-orange-500/10 transition-all disabled:opacity-50">
                                                                        {projectCompaniesMap[p.id].loading ? (
                                                                            <><div className="w-3 h-3 border-2 border-orange-500/30 border-t-orange-400 rounded-full animate-spin" /> Loading more...</>
                                                                        ) : (
                                                                            <>Load More ({projectCompaniesMap[p.id].total - projectCompaniesMap[p.id].items.length} remaining)</>
                                                                        )}
                                                                    </button>
                                                                )}
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        }
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>

                        {/* Project pagination */}
                        {Math.ceil(projectTotal / PAGE_SIZE) > 1 && (
                            <div className="px-5 py-3 border-t border-white/5 flex items-center justify-between">
                                <span className="text-xs text-neutral-500">Showing {projectPage * PAGE_SIZE + 1}–{Math.min((projectPage + 1) * PAGE_SIZE, projectTotal)} of {projectTotal.toLocaleString()}</span>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => setProjectPage(p => Math.max(0, p - 1))} disabled={projectPage === 0}
                                        className="p-1.5 rounded-lg bg-white/5 text-neutral-400 hover:text-white disabled:opacity-30 transition-all"><ChevronLeft className="w-4 h-4" /></button>
                                    <span className="text-xs font-bold text-neutral-300 px-2">{projectPage + 1} / {Math.ceil(projectTotal / PAGE_SIZE)}</span>
                                    <button onClick={() => setProjectPage(p => p + 1)} disabled={(projectPage + 1) * PAGE_SIZE >= projectTotal}
                                        className="p-1.5 rounded-lg bg-white/5 text-neutral-400 hover:text-white disabled:opacity-30 transition-all"><ChevronRight className="w-4 h-4" /></button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Project → Companies Modal */}
                    {selectedProject && (
                        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedProject(null)}>
                            <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                                    <div>
                                        <h3 className="text-xl font-black text-white truncate max-w-[400px]">{selectedProject.project}</h3>
                                        <p className="text-sm text-neutral-400 mt-1">{[selectedProject.city, selectedProject.state].filter(Boolean).join(', ')}</p>
                                    </div>
                                    <button onClick={() => setSelectedProject(null)} className="p-2 rounded-lg hover:bg-white/5"><X className="w-5 h-5 text-neutral-400" /></button>
                                </div>
                                <div className="p-6 space-y-4">
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        {selectedProject.status && <div><p className="text-neutral-500 text-xs font-bold mb-1">Status</p><span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${getStatusChip(selectedProject.status)}`}>{selectedProject.status}</span></div>}
                                        {selectedProject.building_use && <div><p className="text-neutral-500 text-xs font-bold mb-1">Building Use</p><p className="text-white font-medium">{selectedProject.building_use}</p></div>}
                                        {selectedProject.construction_type && <div><p className="text-neutral-500 text-xs font-bold mb-1">Construction Type</p><p className="text-white font-medium">{selectedProject.construction_type}</p></div>}
                                        {selectedProject.bid_date && <div><p className="text-neutral-500 text-xs font-bold mb-1">Bid Date</p><p className="text-white font-medium">{new Date(selectedProject.bid_date).toLocaleDateString()}</p></div>}
                                        {selectedProject.planhub_url && <div className="col-span-2"><a href={selectedProject.planhub_url} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 text-sm flex items-center gap-1">View on PlanHub <ExternalLink className="w-3 h-3" /></a></div>}
                                    </div>

                                    <div className="pt-4 border-t border-white/5">
                                        <h4 className="font-bold text-white text-sm flex items-center gap-2 mb-3">
                                            <Building2 className="w-4 h-4 text-orange-400" /> GCs & Contractors in Area
                                        </h4>
                                        {projectCompanies.length === 0 ? (
                                            <p className="text-neutral-500 text-sm">No contractors found in this area</p>
                                        ) : (
                                            <div className="space-y-2">
                                                {projectCompanies.map(c => (
                                                    <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                                                        <Building2 className="w-4 h-4 text-orange-400 shrink-0" />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm text-white font-medium truncate">{c.company_name}</p>
                                                            <p className="text-xs text-neutral-500">{c.email || c.phone || [c.city, c.state].filter(Boolean).join(', ')}</p>
                                                        </div>
                                                        {c.industry_type && <span className="text-[10px] font-bold text-neutral-500 bg-white/5 px-2 py-0.5 rounded-full">{c.industry_type}</span>}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )
            }

            {/* ════════════════ UPCOMING PROJECTS TAB ════════════════ */}
            {
                tab === 'upcoming' && (
                    <div className="space-y-4">
                        <div className="flex flex-wrap gap-3 items-center">
                            <div className="relative flex-1 min-w-[250px]">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                                <input type="text" placeholder="Search upcoming projects..." value={upcomingSearch}
                                    onChange={e => { setUpcomingSearch(e.target.value); setUpcomingPage(0); }}
                                    className="w-full pl-11 pr-4 py-3 bg-white/[0.03] border border-white/5 rounded-xl text-white placeholder-neutral-600 text-sm font-medium focus:outline-none focus:border-orange-500/30" />
                            </div>
                            <select value={upcomingStateFilter} onChange={e => { setUpcomingStateFilter(e.target.value); setUpcomingPage(0); }}
                                className="px-4 py-3 bg-white/[0.03] border border-white/5 rounded-xl text-neutral-300 text-sm font-medium appearance-none cursor-pointer focus:outline-none">
                                <option value="" className="bg-[#0a0a0a] text-white">All States</option>
                                {allStates.map(s => <option key={s} value={s} className="bg-[#0a0a0a] text-white">{STATE_NAMES[s] || s}</option>)}
                            </select>
                            <button onClick={exportUpcomingCSV} disabled={upcomingExporting}
                                className="flex items-center gap-1.5 px-4 py-3 bg-white/[0.03] border border-white/5 rounded-xl text-neutral-300 text-sm font-bold hover:bg-white/[0.06] hover:text-white transition-all disabled:opacity-50">
                                <Download className="w-4 h-4" /> {upcomingExporting ? 'Exporting...' : 'Download CSV'}
                            </button>
                        </div>
                        {/* Days Left Slider */}
                        <div className="flex items-center gap-4 px-1">
                            <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider whitespace-nowrap">Max Days:</span>
                            <input type="range" min={1} max={365} value={upcomingDaysMax}
                                onChange={e => { setUpcomingDaysMax(Number(e.target.value)); setUpcomingPage(0); }}
                                className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer"
                                style={{ background: `linear-gradient(to right, #f59e0b ${(upcomingDaysMax / 365) * 100}%, rgba(255,255,255,0.05) ${(upcomingDaysMax / 365) * 100}%)` }} />
                            <span className="text-sm font-black text-orange-400 min-w-[50px] text-right">{upcomingDaysMax}d</span>
                        </div>

                        <div className="bg-[#070707]/90 border border-white/5 rounded-2xl overflow-x-auto">
                            <table className="w-full min-w-[900px]">
                                <thead><tr className="border-b border-white/5">
                                    <th className="px-5 py-3.5 text-left text-[10px] font-black uppercase tracking-[0.15em] text-neutral-500 whitespace-nowrap">Bid Deadline</th>
                                    <th className="px-5 py-3.5 text-left text-[10px] font-black uppercase tracking-[0.15em] text-neutral-500">Project</th>
                                    <th className="px-4 py-3.5 text-left text-[10px] font-black uppercase tracking-[0.15em] text-neutral-500">Location</th>
                                    <th className="px-4 py-3.5 text-left text-[10px] font-black uppercase tracking-[0.15em] text-neutral-500">Status</th>
                                    <th className="px-4 py-3.5 text-left text-[10px] font-black uppercase tracking-[0.15em] text-neutral-500">Type</th>
                                    <th className="px-4 py-3.5 text-left text-[10px] font-black uppercase tracking-[0.15em] text-neutral-500">Leads</th>
                                    <th className="px-4 py-3.5 text-left text-[10px] font-black uppercase tracking-[0.15em] text-neutral-500">Days Left</th>
                                </tr></thead>
                                <tbody className="divide-y divide-white/[0.03]">
                                    {upcomingLoading ? Array(8).fill(0).map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td className="px-5 py-4"><div className="h-4 bg-white/5 rounded w-24" /></td>
                                            <td className="px-5 py-4"><div className="h-4 bg-white/5 rounded w-48" /></td>
                                            <td className="px-4 py-4"><div className="h-4 bg-white/5 rounded w-20" /></td>
                                            <td className="px-4 py-4"><div className="h-4 bg-white/5 rounded w-28" /></td>
                                            <td className="px-4 py-4"><div className="h-4 bg-white/5 rounded w-24" /></td>
                                            <td className="px-4 py-4"><div className="h-4 bg-white/5 rounded w-12" /></td>
                                            <td className="px-4 py-4"><div className="h-4 bg-white/5 rounded w-16" /></td>
                                        </tr>
                                    )) : upcomingProjects.map(p => {
                                        const daysLeft = p.bid_date ? Math.max(0, Math.ceil((new Date(p.bid_date).getTime() - Date.now()) / 86400000)) : null;
                                        return (
                                            <React.Fragment key={p.id}>
                                                <tr onClick={() => toggleProjectExpand(p)} className="hover:bg-white/[0.02] cursor-pointer group transition-colors">
                                                    <td className="px-5 py-3.5 whitespace-nowrap">
                                                        <span className="text-xs text-orange-400 font-bold">{parseBidDate(p.bid_date)}</span>
                                                    </td>
                                                    <td className="px-5 py-3.5">
                                                        <div className="flex flex-col gap-1.5">
                                                            <p className="font-bold text-white text-sm group-hover:text-orange-400 transition-colors truncate max-w-[300px]">{p.project}</p>
                                                            <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold w-fit transition-colors ${expandedProjectIds.has(p.id) ? 'bg-orange-500/20 border border-orange-500/30 text-orange-400' : 'bg-white/5 border border-white/10 text-neutral-400 group-hover:bg-white/10'}`}>
                                                                <Building2 className="w-3 h-3" /> {expandedProjectIds.has(p.id) ? 'Collapse Contractors' : 'Expand Contractors'}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3.5">
                                                        <span className="text-xs text-neutral-400 flex items-center gap-1"><MapPin className="w-3 h-3" />{[p.city, p.state].filter(Boolean).join(', ')}</span>
                                                    </td>
                                                    <td className="px-4 py-3.5">
                                                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${getStatusChip(p.status)}`}>{p.status || '—'}</span>
                                                    </td>
                                                    <td className="px-4 py-3.5">
                                                        <span className="text-xs text-neutral-400 truncate block max-w-[180px]">{p.building_use || p.construction_type || '—'}</span>
                                                    </td>
                                                    <td className="px-4 py-3.5">
                                                        {Number(p.contractor_count) > 0 ? (
                                                            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/25">
                                                                {Number(p.contractor_count).toLocaleString()}
                                                            </span>
                                                        ) : (
                                                            <span className="text-xs text-neutral-600">0</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3.5">
                                                        {daysLeft !== null && (
                                                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${daysLeft <= 3 ? 'bg-red-500/15 text-red-400 border-red-500/25'
                                                                : daysLeft <= 7 ? 'bg-amber-500/15 text-amber-400 border-amber-500/25'
                                                                    : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
                                                                }`}>{daysLeft}d</span>
                                                        )}
                                                    </td>
                                                </tr>
                                                {/* Nested Accordion for Companies */}
                                                {expandedProjectIds.has(p.id) && (
                                                    <tr className="bg-[#0a0a0a] border-b border-white/5">
                                                        <td colSpan={7} className="px-2 py-4 sm:px-10 sm:py-6">
                                                            <div className="bg-[#070707] border border-orange-500/20 rounded-xl p-5 shadow-inner">
                                                                <div className="flex items-center justify-between mb-4">
                                                                    <h4 className="font-bold text-white text-sm flex items-center gap-2">
                                                                        <HardHat className="w-4 h-4 text-orange-400" />
                                                                        Bidding/Local Contractors
                                                                        {projectCompaniesMap[p.id] && <span className="text-orange-400 text-xs ml-1">{projectCompaniesMap[p.id].items.length} of {projectCompaniesMap[p.id].total} Loaded</span>}
                                                                    </h4>
                                                                    <button onClick={(e) => { e.stopPropagation(); downloadProjectCsv(p); }}
                                                                        className="flex items-center gap-1.5 text-xs font-bold text-neutral-400 hover:text-white px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
                                                                        <Download className="w-3.5 h-3.5" /> Download CSV
                                                                    </button>
                                                                </div>
                                                                {!projectCompaniesMap[p.id] || (projectCompaniesMap[p.id].loading && projectCompaniesMap[p.id].items.length === 0) ? (
                                                                    <div className="flex items-center gap-2 text-neutral-500 text-sm"><div className="w-4 h-4 border-2 border-orange-500/30 border-t-orange-400 rounded-full animate-spin" /> Loading contractors...</div>
                                                                ) : projectCompaniesMap[p.id].total === 0 ? (
                                                                    <p className="text-neutral-500 text-sm">No companies found in this area</p>
                                                                ) : (
                                                                    <>
                                                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[600px] overflow-y-auto custom-scrollbar">
                                                                        {projectCompaniesMap[p.id].items.map((c: any, idx: number) => (
                                                                            <div key={`${c.planhub_id || c.id}-${idx}`} className="bg-white/[0.02] border border-white/5 rounded-xl p-4 hover:border-orange-500/20 transition-all">
                                                                                <div className="flex items-start justify-between mb-2">
                                                                                    <p className="font-bold text-white text-sm truncate max-w-[200px]">{c.company_name}</p>
                                                                                    {c.industry_type && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 whitespace-nowrap ml-2">{c.industry_type}</span>}
                                                                                </div>
                                                                                {c.contact_name && <p className="text-xs text-purple-400 font-medium mb-1">👤 {c.contact_name}</p>}
                                                                                {c.address && <p className="text-xs text-neutral-500 flex items-center gap-1 mb-1"><MapPin className="w-3 h-3" />{c.address}</p>}
                                                                                {(c.city || c.state) && <p className="text-xs text-neutral-500 flex items-center gap-1 mb-1"><MapPin className="w-3 h-3" />{[c.city, c.state].filter(Boolean).join(', ')}</p>}
                                                                                {c.email && <a href={`mailto:${c.email}`} className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 mb-1 transition-colors"><Mail className="w-3 h-3" />{c.email}</a>}
                                                                                {c.phone && <p className="text-xs text-emerald-400 flex items-center gap-1 mb-1"><Phone className="w-3 h-3" />{c.phone}</p>}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                    {projectCompaniesMap[p.id].items.length < projectCompaniesMap[p.id].total && (
                                                                        <button onClick={(e) => { e.stopPropagation(); loadInlineProjectCompanies(p, Math.ceil(projectCompaniesMap[p.id].items.length / INLINE_PAGE_SIZE)); }}
                                                                            disabled={projectCompaniesMap[p.id].loading}
                                                                            className="mt-3 w-full flex items-center justify-center gap-2 text-xs font-bold text-orange-400 hover:text-orange-300 px-4 py-2.5 rounded-lg bg-orange-500/5 border border-orange-500/20 hover:bg-orange-500/10 transition-all disabled:opacity-50">
                                                                            {projectCompaniesMap[p.id].loading ? (
                                                                                <><div className="w-3 h-3 border-2 border-orange-500/30 border-t-orange-400 rounded-full animate-spin" /> Loading more...</>
                                                                            ) : (
                                                                                <>Load More ({projectCompaniesMap[p.id].total - projectCompaniesMap[p.id].items.length} remaining)</>
                                                                            )}
                                                                        </button>
                                                                    )}
                                                                    </>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        )
                                    })}
                                </tbody>
                            </table>
                            {Math.ceil(upcomingTotal / PAGE_SIZE) > 1 && (
                                <div className="px-5 py-3 border-t border-white/5 flex items-center justify-between">
                                    <span className="text-xs text-neutral-500">Showing {upcomingPage * PAGE_SIZE + 1}–{Math.min((upcomingPage + 1) * PAGE_SIZE, upcomingTotal)} of {upcomingTotal.toLocaleString()}</span>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => setUpcomingPage(p => Math.max(0, p - 1))} disabled={upcomingPage === 0}
                                            className="p-1.5 rounded-lg bg-white/5 text-neutral-400 hover:text-white disabled:opacity-30 transition-all"><ChevronLeft className="w-4 h-4" /></button>
                                        <span className="text-xs font-bold text-neutral-300 px-2">{upcomingPage + 1} / {Math.ceil(upcomingTotal / PAGE_SIZE)}</span>
                                        <button onClick={() => setUpcomingPage(p => p + 1)} disabled={(upcomingPage + 1) * PAGE_SIZE >= upcomingTotal}
                                            className="p-1.5 rounded-lg bg-white/5 text-neutral-400 hover:text-white disabled:opacity-30 transition-all"><ChevronRight className="w-4 h-4" /></button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )
            }

            {/* ════════════════ LEAD FEED TAB ════════════════ */}
            {
                tab === 'leads' && (
                    <LeadFeedTab
                        leads={leads}
                        leadSearch={leadSearch}
                        setLeadSearch={setLeadSearch}
                        leadPage={leadPage}
                        setLeadPage={setLeadPage}
                        leadTotal={leadTotal}
                        leadLoading={leadLoading}
                        leadStateFilter={leadStateFilter}
                        setLeadStateFilter={setLeadStateFilter}
                        leadExporting={leadExporting}
                        setLeadExporting={setLeadExporting}
                        allStates={allStates}
                        stateName={stateName}
                        parseBidDate={parseBidDate}
                        supabase={supabase}
                        setLeads={setLeads}
                        setLeadTotal={setLeadTotal}
                        setLeadLoading={setLeadLoading}
                        PAGE_SIZE={PAGE_SIZE}
                        setSelectedCompany={setSelectedCompany}
                        leadPageSize={leadPageSize}
                        setLeadPageSize={setLeadPageSize}
                    />
                )
            }

            {/* Company → Projects Modal */}
            {
                selectedCompany && (
                    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedCompany(null)}>
                        <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                            <div className="p-6 border-b border-white/5 flex items-center justify-between">
                                <div>
                                    <h3 className="text-xl font-black text-white">{selectedCompany.company_name}</h3>
                                    <p className="text-sm text-neutral-400 mt-1">{[selectedCompany.city, selectedCompany.state].filter(Boolean).join(', ')}</p>
                                </div>
                                <button onClick={() => setSelectedCompany(null)} className="p-2 rounded-lg hover:bg-white/5"><X className="w-5 h-5 text-neutral-400" /></button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    {selectedCompany.email && <div><p className="text-neutral-500 text-xs font-bold mb-1">Email</p><p className="text-white font-medium">{selectedCompany.email}</p></div>}
                                    {selectedCompany.phone && <div><p className="text-neutral-500 text-xs font-bold mb-1">Phone</p><p className="text-white font-medium">{selectedCompany.phone}</p></div>}
                                    {selectedCompany.website && <div><p className="text-neutral-500 text-xs font-bold mb-1">Website</p><a href={selectedCompany.website} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1">{selectedCompany.website} <ExternalLink className="w-3 h-3" /></a></div>}
                                    {selectedCompany.industry_type && <div><p className="text-neutral-500 text-xs font-bold mb-1">Type</p><p className="text-white font-medium">{selectedCompany.industry_type}</p></div>}
                                </div>

                                <div className="pt-4 border-t border-white/5">
                                    <h4 className="font-bold text-white text-sm flex items-center gap-2 mb-3">
                                        <FolderOpen className="w-4 h-4 text-indigo-400" /> Projects in Area
                                    </h4>
                                    {companyProjects.length === 0 ? (
                                        <p className="text-neutral-500 text-sm">No projects found in this area</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {companyProjects.map(p => (
                                                <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                                                    <FolderOpen className="w-4 h-4 text-indigo-400 shrink-0" />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm text-white font-medium truncate">{p.project}</p>
                                                        <p className="text-xs text-neutral-500">{[p.city, p.state].filter(Boolean).join(', ')}</p>
                                                    </div>
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusChip(p.status)}`}>{p.status}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}

// ══════════════════════════════════════════════
// LEAD FEED TAB COMPONENT
// ══════════════════════════════════════════════
function LeadFeedTab({ leads, leadSearch, setLeadSearch, leadPage, setLeadPage, leadTotal, leadLoading,
    leadStateFilter, setLeadStateFilter, leadExporting, setLeadExporting, allStates, stateName, parseBidDate, setSelectedCompany,
    supabase, setLeads, setLeadTotal, setLeadLoading, PAGE_SIZE, leadPageSize, setLeadPageSize }: any) {

    const [feedStates, setFeedStates] = useState<string[]>([]);
    const [feedProjectCities, setFeedProjectCities] = useState<string[]>([]);
    const [feedContractorTypes, setFeedContractorTypes] = useState<string[]>([]);
    const [feedContractorCities, setFeedContractorCities] = useState<string[]>([]);
    const [feedContractorStates, setFeedContractorStates] = useState<string[]>([]);
    const [leadDays, setLeadDays] = useState<string>('all');
    const [feedLeadSources, setFeedLeadSources] = useState<string[]>([]);
    const [filterLeadSource, setFilterLeadSource] = useState('all');
    const [filterProjectCity, setFilterProjectCity] = useState('all');
    const [filterContractorType, setFilterContractorType] = useState('all');
    const [filterContractorCity, setFilterContractorCity] = useState('all');
    const [filterContractorState, setFilterContractorState] = useState('all');
    const [expandedLead, setExpandedLead] = useState<{ id: number; type: 'company' | 'project'; key: string } | null>(null);
    const [relatedData, setRelatedData] = useState<any[]>([]);
    const [relatedLoading, setRelatedLoading] = useState(false);

    const expandCompany = async (lead: any) => {
        const key = `c-${lead.company_planhub_id}`;
        if (expandedLead?.key === key) { setExpandedLead(null); return; }
        setExpandedLead({ id: lead.lead_id, type: 'company', key });
        setRelatedLoading(true);
        const { data } = await supabase.from('lead_feed')
            .select('project_name,project_id,project_state,bid_date,project_status,contact_name')
            .eq('company_planhub_id', lead.company_planhub_id)
            .order('scraped_at', { ascending: false })
            .limit(50);
        setRelatedData(data || []);
        setRelatedLoading(false);
    };

    const expandProject = async (lead: any) => {
        const key = `p-${lead.project_planhub_id}`;
        if (expandedLead?.key === key) { setExpandedLead(null); return; }
        setExpandedLead({ id: lead.lead_id, type: 'project', key });
        setRelatedLoading(true);
        const { data } = await supabase.from('lead_feed')
            .select('company_name,company_planhub_id,contact_name,email,phone,website,industry_type')
            .eq('project_planhub_id', lead.project_planhub_id)
            .order('company_name')
            .limit(100);
        setRelatedData(data || []);
        setRelatedLoading(false);
    };

    // Apply ALL filters to a query
    const applyLeadFilters = (query: any) => {
        if (leadSearch.trim()) query = query.or(`project_name.ilike.%${leadSearch}%,company_name.ilike.%${leadSearch}%,contact_name.ilike.%${leadSearch}%,email.ilike.%${leadSearch}%`);
        if (leadStateFilter !== 'all') {
            const fullName = STATE_NAMES[leadStateFilter];
            query = query.or(`project_state.eq.${leadStateFilter},project_state.eq."${fullName}",company_state.eq.${leadStateFilter},company_state.eq."${fullName}"`);
        }
        if (filterLeadSource !== 'all') query = query.eq('lead_source', filterLeadSource);
        if (filterProjectCity !== 'all') query = query.eq('project_city', filterProjectCity);
        if (filterContractorType !== 'all') query = query.eq('industry_type', filterContractorType);
        if (filterContractorCity !== 'all') query = query.eq('company_city', filterContractorCity);
        if (filterContractorState !== 'all') query = query.eq('company_state', filterContractorState);
        if (leadDays !== 'all') {
            const cutoff = new Date(Date.now() - parseInt(leadDays) * 86400000).toISOString();
            query = query.gte('scraped_at', cutoff);
        }
        return query;
    };

    const fetchLeads = useCallback(async () => {
        setLeadLoading(true);
        try {
            let query = supabase.from('lead_feed').select('*', { count: 'exact' });
            query = applyLeadFilters(query);
            const { data, count } = await query
                .order('scraped_at', { ascending: false })
                .range(leadPage * PAGE_SIZE, (leadPage + 1) * PAGE_SIZE - 1);
            if (data) setLeads(data);
            if (count !== null) setLeadTotal(count);
        } catch (err) { console.error(err); }
        finally { setLeadLoading(false); }
    }, [leadSearch, leadPage, leadStateFilter, leadDays, filterProjectCity, filterContractorType, filterContractorCity, filterContractorState, PAGE_SIZE]);

    useEffect(() => { fetchLeads(); }, [fetchLeads]);

    // Load distinct filter options on mount
    useEffect(() => {
        const loadOpts = async (col: string, limit = 10000) => {
            const { data } = await supabase.from('lead_feed').select(col).limit(limit);
            if (!data) return [];
            const seen = new Set<string>();
            const vals: string[] = [];
            data.forEach((r: any) => { const v = r[col]; if (v && !seen.has(v)) { seen.add(v); vals.push(v); } });
            return vals;
        };
        (async () => {
            // Fetch multiple samples to ensure we get states that might be sparse
            const [pStates, cStates, pCities, cTypes, cCities, lSources] = await Promise.all([
                loadOpts('project_state', 15000),
                loadOpts('company_state', 15000),
                loadOpts('project_city', 5000),
                loadOpts('industry_type', 5000),
                loadOpts('company_city', 5000),
                loadOpts('lead_source', 5000),
            ]);

            // Combine project and company states to get all states where something is happening
            const allStates = Array.from(new Set([...pStates, ...cStates]))
                .filter(s => { const m = stateName(s); return m !== s || s.length > 2; })
                .sort((a, b) => stateName(a).localeCompare(stateName(b)));

            setFeedStates(allStates);
            setFeedLeadSources(lSources.sort());
            setFeedProjectCities(pCities.sort());
            setFeedContractorTypes(cTypes.sort());
            setFeedContractorCities(cCities.sort());

            // For the dedicated contractor state filter, use refined cStates
            setFeedContractorStates(cStates.filter(s => { const m = stateName(s); return m !== s || s.length > 2; }).sort((a, b) => stateName(a).localeCompare(stateName(b))));
        })();
    }, []);

    const exportLeadCSV = async () => {
        setLeadExporting(true);
        try {
            const allRows: any[] = [];
            let offset = 0;
            while (offset < 100000) {
                let query = supabase.from('lead_feed').select('*');
                query = applyLeadFilters(query);
                const { data } = await query.order('scraped_at', { ascending: false }).range(offset, offset + 999);
                if (!data || data.length === 0) break;
                allRows.push(...data);
                if (data.length < 1000) break;
                offset += 1000;
            }
            if (allRows.length === 0) return;

            const headers = ['Scraped At', 'Lead Source', 'Project Name', 'Bid Date', 'Project City', 'Project State', 'Status', 'Company Name', 'Contact Name', 'Email', 'Phone', 'Contractor Type', 'Contractor City', 'Contractor State', 'Website'];
            const escape = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
            const csvRows = [headers.join(',')];
            allRows.forEach(r => {
                csvRows.push([
                    escape(r.scraped_at ? new Date(r.scraped_at).toLocaleDateString() : ''), escape(r.lead_source), escape(r.project_name), escape(parseBidDate(r.bid_date)), escape(r.project_city),
                    escape(stateName(r.project_state)), escape(r.project_status), escape(r.company_name),
                    escape(r.contact_name), escape(r.email), escape(r.phone),
                    escape(r.industry_type), escape(r.company_city), escape(stateName(r.company_state)), escape(r.website)
                ].join(','));
            });

            const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `scout_lead_feed_${new Date().toISOString().slice(0, 10)}.csv`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) { console.error('Export error:', err); }
        finally { setLeadExporting(false); }
    };

    const hasActiveFilters = filterLeadSource !== 'all' || leadStateFilter !== 'all' || filterProjectCity !== 'all' || filterContractorType !== 'all' || filterContractorCity !== 'all' || filterContractorState !== 'all' || leadDays !== 'all' || leadSearch.trim() !== '';
    const clearAllLeadFilters = () => {
        setFilterLeadSource('all'); setLeadStateFilter('all'); setFilterProjectCity('all'); setFilterContractorType('all');
        setFilterContractorCity('all'); setFilterContractorState('all'); setLeadDays('all');
        setLeadSearch(''); setLeadPage(0);
    };

    const totalPages = Math.ceil(leadTotal / PAGE_SIZE);

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h2 className="text-xl font-black text-white flex items-center gap-2">
                        <HardHat className="w-5 h-5 text-orange-400" />
                        Lead Feed
                        <span className="text-sm font-bold text-neutral-500 ml-2">{leadTotal.toLocaleString()} enriched leads</span>
                    </h2>
                    <p className="text-xs text-neutral-500 mt-1">Fully enriched project↔company pairs — every row has email, phone, contact name, and company name</p>
                </div>
                <div className="flex items-center gap-2">
                    {hasActiveFilters && (
                        <button onClick={clearAllLeadFilters}
                            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/20 transition-all">
                            <X className="w-3.5 h-3.5" /> Clear Filters
                        </button>
                    )}
                    <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/10">
                        <SlidersHorizontal className="w-3.5 h-3.5 text-neutral-500" />
                        <select value={leadPageSize} onChange={e => { setLeadPageSize(Number(e.target.value)); setLeadPage(0); }}
                            className="bg-transparent text-white text-xs font-bold focus:outline-none cursor-pointer appearance-none pr-2">
                            {[25, 50, 100, 250, 500].map(n => <option key={n} value={n} className="bg-[#0a0a0a] text-white">{n} rows</option>)}
                        </select>
                    </div>
                    <button onClick={exportLeadCSV} disabled={leadExporting}
                        className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500/30 transition-all shadow-lg shadow-emerald-900/20 disabled:opacity-50">
                        <Download className="w-4 h-4" />{leadExporting ? 'Exporting...' : 'Download CSV'}
                    </button>
                </div>
            </div>

            {/* Prominent State & Search */}
            <div className="flex flex-col md:flex-row gap-3">
                <div className="w-full md:w-80 shrink-0">
                    <div className="relative h-full">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-400" />
                        <select value={leadStateFilter} onChange={e => { setLeadStateFilter(e.target.value); setLeadPage(0); }}
                            className="w-full h-full pl-12 pr-10 py-3.5 bg-indigo-500/10 border-2 border-indigo-500/30 rounded-2xl text-indigo-300 text-base font-black focus:outline-none focus:border-indigo-500/60 appearance-none cursor-pointer hover:bg-indigo-500/20 transition-all shadow-[0_0_15px_rgba(99,102,241,0.15)]">
                            <option value="all" className="bg-[#0a0a0a] text-white">All Project States</option>
                            {feedStates.map(s => <option key={s} value={s} className="bg-[#0a0a0a] text-white">{stateName(s)}</option>)}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-400 text-xs font-bold">▼</div>
                    </div>
                </div>
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                    <input value={leadSearch} onChange={e => { setLeadSearch(e.target.value); setLeadPage(0); }}
                        placeholder="Search projects, companies, contacts, emails..."
                        className="w-full h-full pl-12 pr-4 py-3.5 bg-white/[0.03] border-2 border-white/10 rounded-2xl text-white text-base font-medium focus:outline-none focus:border-indigo-500/40 placeholder:text-neutral-600 transition-colors" />
                </div>
            </div>

            {/* Age Dial Filter */}
            <div className="bg-[#070707] p-6 rounded-2xl border border-white/5 border-t-white/10 shadow-lg mt-2 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-transparent to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
                    <div>
                        <label className="text-base font-black text-white flex items-center gap-2">
                            <HardHat className="w-5 h-5 text-orange-400" /> Maximum Lead Age
                        </label>
                        <p className="text-xs font-medium text-neutral-500 mt-1">Filter out leads strictly older than this cutoff relative to ingestion time.</p>
                    </div>

                    <div className={`flex items-center gap-2 px-5 py-2 rounded-xl border-2 transition-colors ${leadDays === 'all' ? 'bg-indigo-500/10 border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.1)]' : 'bg-orange-500/10 border-orange-500/30 shadow-[0_0_15px_rgba(249,115,22,0.15)]'}`}>
                        <span className={`text-xl font-black ${leadDays === 'all' ? 'text-indigo-400' : 'text-orange-400'}`}>
                            {leadDays === 'all' ? 'All Time' : `≤ ${leadDays} Day${leadDays === '1' ? '' : 's'}`}
                        </span>
                    </div>
                </div>

                <div className="relative z-10">
                    <input
                        type="range"
                        min="1" max="90"
                        value={leadDays === 'all' ? 90 : leadDays}
                        onChange={e => {
                            const val = e.target.value;
                            if (val === "90") { setLeadDays('all'); } else { setLeadDays(val); }
                            setLeadPage(0);
                        }}
                        className={`w-full h-3 rounded-xl appearance-none cursor-pointer outline-none transition-colors ${leadDays === 'all' ? 'bg-indigo-500/20 accent-indigo-500 hover:accent-indigo-400' : 'bg-orange-500/20 accent-orange-500 hover:accent-orange-400'}`}
                    />
                    <div className="flex justify-between text-[11px] text-neutral-500 font-bold mt-3 px-1 uppercase tracking-wider">
                        <span className={leadDays !== 'all' && Number(leadDays) <= 1 ? "text-orange-400" : ""}>1 Day</span>
                        <span className={leadDays !== 'all' && Number(leadDays) > 1 && Number(leadDays) <= 30 ? "text-orange-400" : ""}>30 Days</span>
                        <span className={leadDays !== 'all' && Number(leadDays) > 30 && Number(leadDays) <= 60 ? "text-orange-400" : ""}>60 Days</span>
                        <span className={leadDays === 'all' ? "text-indigo-400" : ""}>All Time (90+)</span>
                    </div>
                </div>
            </div>

            {/* Advanced Filters Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1 block">Lead Source</label>
                    <select value={filterLeadSource} onChange={e => { setFilterLeadSource(e.target.value); setLeadPage(0); }}
                        className="w-full px-3 py-2 bg-white/[0.03] border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500 cursor-pointer appearance-none">
                        <option value="all" className="bg-[#0a0a0a]">All Sources</option>
                        {feedLeadSources.map(s => <option key={s} value={s} className="bg-[#0a0a0a]">{s.toUpperCase()}</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1 block">Project City</label>
                    <select value={filterProjectCity} onChange={e => { setFilterProjectCity(e.target.value); setLeadPage(0); }}
                        className="w-full px-3 py-2.5 bg-white/[0.02] border border-white/5 rounded-xl text-white text-xs font-medium focus:outline-none focus:border-indigo-500/40 appearance-none cursor-pointer hover:bg-white/[0.04] transition-colors">
                        <option value="all" className="bg-[#0a0a0a] text-white">All Project Cities</option>
                        {feedProjectCities.map(c => <option key={c} value={c} className="bg-[#0a0a0a] text-white">{c}</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1 block">Contractor Type</label>
                    <select value={filterContractorType} onChange={e => { setFilterContractorType(e.target.value); setLeadPage(0); }}
                        className="w-full px-3 py-2.5 bg-white/[0.02] border border-white/5 rounded-xl text-white text-xs font-medium focus:outline-none focus:border-indigo-500/40 appearance-none cursor-pointer hover:bg-white/[0.04] transition-colors">
                        <option value="all" className="bg-[#0a0a0a] text-white">All Types</option>
                        {feedContractorTypes.map(t => <option key={t} value={t} className="bg-[#0a0a0a] text-white">{t}</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1 block">Contractor City</label>
                    <select value={filterContractorCity} onChange={e => { setFilterContractorCity(e.target.value); setLeadPage(0); }}
                        className="w-full px-3 py-2.5 bg-white/[0.02] border border-white/5 rounded-xl text-white text-xs font-medium focus:outline-none focus:border-indigo-500/40 appearance-none cursor-pointer hover:bg-white/[0.04] transition-colors">
                        <option value="all" className="bg-[#0a0a0a] text-white">All Cities</option>
                        {feedContractorCities.map(c => <option key={c} value={c} className="bg-[#0a0a0a] text-white">{c}</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1 block">Contractor State</label>
                    <select value={filterContractorState} onChange={e => { setFilterContractorState(e.target.value); setLeadPage(0); }}
                        className="w-full px-3 py-2.5 bg-white/[0.02] border border-white/5 rounded-xl text-white text-xs font-medium focus:outline-none focus:border-indigo-500/40 appearance-none cursor-pointer hover:bg-white/[0.04] transition-colors">
                        <option value="all" className="bg-[#0a0a0a] text-white">All States</option>
                        {feedContractorStates.map(s => <option key={s} value={s} className="bg-[#0a0a0a] text-white">{stateName(s)}</option>)}
                    </select>
                </div>
            </div>

            {/* Active Filter Badges */}
            {hasActiveFilters && (
                <div className="flex gap-2 flex-wrap">
                    {leadStateFilter !== 'all' && <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center gap-1">Location: {stateName(leadStateFilter)} <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => setLeadStateFilter('all')} /></span>}
                    {filterProjectCity !== 'all' && <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center gap-1">City: {filterProjectCity} <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => setFilterProjectCity('all')} /></span>}
                    {filterContractorType !== 'all' && <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center gap-1">Type: {filterContractorType} <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => setFilterContractorType('all')} /></span>}
                    {filterContractorCity !== 'all' && <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center gap-1">Contractor: {filterContractorCity} <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => setFilterContractorCity('all')} /></span>}
                    {filterContractorState !== 'all' && <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center gap-1">Contractor State: {stateName(filterContractorState)} <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => setFilterContractorState('all')} /></span>}
                    {leadDays !== 'all' && <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center gap-1">Last {leadDays} day{parseInt(leadDays) > 1 ? 's' : ''} <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => setLeadDays('all')} /></span>}
                </div>
            )}

            {/* Table */}
            <div className="bg-[#070707]/90 border border-white/5 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-white/[0.03] border-b border-white/5">
                                <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-neutral-500">#</th>
                                <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-neutral-500">Discovered</th>
                                <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-neutral-500">Project Name</th>
                                <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-neutral-500">Bid Date</th>
                                <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-neutral-500">Project City</th>
                                <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-neutral-500">Project State</th>
                                <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-neutral-500">Company</th>
                                <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-neutral-500">Contact</th>
                                <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-neutral-500">Email</th>
                                <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-neutral-500">Phone</th>
                                <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-neutral-500">Type</th>
                                <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-neutral-500">Contractor City</th>
                                <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-neutral-500">Contractor State</th>
                                <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-neutral-500">Website</th>
                            </tr>
                        </thead>
                        <tbody>
                            {leadLoading ? (
                                Array.from({ length: 10 }).map((_, i) => (
                                    <tr key={i} className="border-b border-white/[0.03]">
                                        {Array.from({ length: 14 }).map((_, j) => (
                                            <td key={j} className="px-4 py-3"><div className="h-4 bg-white/5 rounded animate-pulse" /></td>
                                        ))}
                                    </tr>
                                ))
                            ) : leads.length === 0 ? (
                                <tr><td colSpan={14} className="px-4 py-12 text-center text-neutral-500 font-medium">No leads found</td></tr>
                            ) : (
                                leads.map((lead: any, i: number) => {
                                    const safeUrl = lead.website ? (lead.website.startsWith('http') ? lead.website : `https://${lead.website}`) : '';
                                    let hostname = '';
                                    try { hostname = safeUrl ? new URL(safeUrl).hostname.replace('www.', '') : ''; } catch { hostname = lead.website || ''; }
                                    const isCompanyExpanded = expandedLead?.key === `c-${lead.company_planhub_id}`;
                                    const isProjectExpanded = expandedLead?.key === `p-${lead.project_planhub_id}`;
                                    const isExpanded = isCompanyExpanded || isProjectExpanded;
                                    return (
                                        <React.Fragment key={lead.lead_id || i}>
                                            <tr className={`border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors ${isExpanded ? 'bg-white/[0.03]' : ''}`}>
                                                <td className="px-4 py-3 text-neutral-600 text-xs font-mono">{leadPage * PAGE_SIZE + i + 1}</td>
                                                <td className="px-4 py-3 text-neutral-400 text-xs whitespace-nowrap">{lead.scraped_at ? new Date(lead.scraped_at).toLocaleDateString() : '—'}</td>
                                                <td className="px-4 py-3 max-w-[280px]">
                                                    <button onClick={() => expandProject(lead)}
                                                        className={`text-left font-medium truncate hover:underline transition-colors cursor-pointer ${isProjectExpanded ? 'text-cyan-300' : 'text-white hover:text-cyan-300'}`}>
                                                        {lead.project_name}
                                                    </button>
                                                </td>
                                                <td className="px-4 py-3 text-neutral-400 text-xs whitespace-nowrap">{parseBidDate(lead.bid_date)}</td>
                                                <td className="px-4 py-3 text-neutral-400 text-xs whitespace-nowrap">{lead.project_city || '—'}</td>
                                                <td className="px-4 py-3 text-neutral-400 text-xs whitespace-nowrap">{stateName(lead.project_state)}</td>
                                                <td className="px-4 py-3 max-w-[200px]">
                                                    <button onClick={() => {
                                                        expandCompany(lead);
                                                        setSelectedCompany({
                                                            company_name: lead.company_name,
                                                            email: lead.email,
                                                            phone: lead.phone,
                                                            website: lead.website,
                                                            city: lead.company_city,
                                                            state: lead.company_state,
                                                            industry_type: lead.industry_type,
                                                            address: lead.company_address,
                                                            planhub_id: lead.company_planhub_id,
                                                        });
                                                    }}
                                                        className={`text-left font-medium truncate hover:underline transition-colors cursor-pointer ${isCompanyExpanded ? 'text-amber-300' : 'text-orange-300 hover:text-amber-300'}`}>
                                                        {lead.company_name}
                                                    </button>
                                                </td>
                                                <td className="px-4 py-3 text-indigo-300 font-medium whitespace-nowrap">{lead.contact_name}</td>
                                                <td className="px-4 py-3">
                                                    <a href={`mailto:${lead.email}`} className="text-emerald-400 hover:text-emerald-300 hover:underline text-xs transition-colors">{lead.email}</a>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <a href={`tel:${lead.phone}`} className="text-purple-300 hover:text-purple-200 hover:underline text-xs whitespace-nowrap transition-colors">{lead.phone}</a>
                                                </td>
                                                <td className="px-4 py-3 text-neutral-400 text-xs whitespace-nowrap">{lead.industry_type || '—'}</td>
                                                <td className="px-4 py-3 text-neutral-400 text-xs whitespace-nowrap">{lead.company_city || '—'}</td>
                                                <td className="px-4 py-3 text-neutral-400 text-xs whitespace-nowrap">{stateName(lead.company_state) || '—'}</td>
                                                <td className="px-4 py-3">
                                                    {safeUrl ? (
                                                        <a href={safeUrl} target="_blank" rel="noopener noreferrer"
                                                            className="text-blue-400 hover:text-blue-300 hover:underline text-xs flex items-center gap-1 transition-colors">
                                                            <Globe className="w-3 h-3 shrink-0" />{hostname}
                                                        </a>
                                                    ) : <span className="text-neutral-600 text-xs">—</span>}
                                                </td>
                                            </tr>
                                            {/* Expansion Panel */}
                                            {isExpanded && (
                                                <tr>
                                                    <td colSpan={14} className="p-0">
                                                        <div className={`mx-4 my-2 rounded-xl border p-4 ${isCompanyExpanded ? 'bg-amber-500/[0.03] border-amber-500/20' : 'bg-cyan-500/[0.03] border-cyan-500/20'}`}>
                                                            <h4 className={`text-xs font-black uppercase tracking-widest mb-3 flex items-center gap-2 ${isCompanyExpanded ? 'text-amber-400' : 'text-cyan-400'}`}>
                                                                {isCompanyExpanded ? (
                                                                    <><Building2 className="w-3.5 h-3.5" /> {lead.company_name} — appears on {relatedData.length} project{relatedData.length !== 1 ? 's' : ''}</>
                                                                ) : (
                                                                    <><FolderOpen className="w-3.5 h-3.5" /> {lead.project_name} — {relatedData.length} compan{relatedData.length !== 1 ? 'ies' : 'y'}</>
                                                                )}
                                                            </h4>
                                                            {relatedLoading ? (
                                                                <div className="flex gap-2 items-center text-neutral-500 text-xs"><div className="w-3 h-3 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" /> Loading...</div>
                                                            ) : isCompanyExpanded ? (
                                                                <div className="grid gap-1.5 max-h-[300px] overflow-y-auto">
                                                                    {relatedData.map((r: any, j: number) => (
                                                                        <div key={j} className="flex items-center gap-4 px-3 py-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors text-xs">
                                                                            <span className="text-white font-medium flex-1 truncate">{r.project_name}</span>
                                                                            <span className="text-indigo-300 shrink-0">{r.contact_name}</span>
                                                                            <span className="text-neutral-500 shrink-0">{stateName(r.project_state)}</span>
                                                                            <span className="text-neutral-500 shrink-0">{parseBidDate(r.bid_date)}</span>
                                                                            {r.project_status && <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold border border-white/10 text-neutral-400 bg-white/5">{r.project_status}</span>}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <div className="grid gap-1.5 max-h-[300px] overflow-y-auto">
                                                                    {relatedData.map((r: any, j: number) => {
                                                                        const rUrl = r.website ? (r.website.startsWith('http') ? r.website : `https://${r.website}`) : '';
                                                                        return (
                                                                            <div key={j} className="flex items-center gap-4 px-3 py-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors text-xs">
                                                                                <span className="text-orange-300 font-medium w-[180px] truncate shrink-0">{r.company_name}</span>
                                                                                <span className="text-indigo-300 w-[120px] truncate shrink-0">{r.contact_name}</span>
                                                                                <a href={`mailto:${r.email}`} className="text-emerald-400 hover:underline w-[180px] truncate shrink-0">{r.email}</a>
                                                                                <a href={`tel:${r.phone}`} className="text-purple-300 hover:underline w-[100px] shrink-0">{r.phone}</a>
                                                                                {rUrl ? <a href={rUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline flex items-center gap-1"><Globe className="w-3 h-3" />{r.website}</a> : null}
                                                                                {r.industry_type && <span className="text-neutral-500 px-2 py-0.5 rounded-full bg-white/5 text-[10px]">{r.industry_type}</span>}
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
                        <span className="text-xs text-neutral-500 font-medium">
                            Showing {leadPage * PAGE_SIZE + 1}–{Math.min((leadPage + 1) * PAGE_SIZE, leadTotal)} of {leadTotal.toLocaleString()}
                        </span>
                        <div className="flex gap-1">
                            <button onClick={() => setLeadPage(Math.max(0, leadPage - 1))} disabled={leadPage === 0}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold border border-white/10 text-neutral-400 hover:text-white disabled:opacity-30 transition-all">
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="px-3 py-1.5 text-xs font-bold text-neutral-400">{leadPage + 1} / {totalPages}</span>
                            <button onClick={() => setLeadPage(Math.min(totalPages - 1, leadPage + 1))} disabled={leadPage >= totalPages - 1}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold border border-white/10 text-neutral-400 hover:text-white disabled:opacity-30 transition-all">
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
