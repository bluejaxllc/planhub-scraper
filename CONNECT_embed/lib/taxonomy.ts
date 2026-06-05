/**
 * Scout Intelligence Dashboard — Sector Taxonomy
 * ================================================
 * Single source of truth for all sectors, sub-niches, and trade mappings.
 * Used by: sidebar, middleware, admin panel, scraper categorization.
 */

export type SectorId =
    | 'electrical'
    | 'oil_gas'
    | 'construction'
    | 'telecom'
    | 'mechanical'
    | 'finishes'
    | 'fire_safety'
    | 'sitework'
    | 'specialty'
    | 'leads'
    | 'recruiting';

export interface SubNiche {
    id: string;
    label: string;
    /** PlanHub trade names that map to this sub-niche */
    tradeMatches: string[];
}

export interface SectorConfig {
    id: SectorId;
    label: string;
    shortLabel: string;
    icon: string;           // Lucide icon name
    color: {
        bg: string;
        border: string;
        text: string;
        gradient: string;
    };
    description: string;
    subNiches: SubNiche[];
}

export const SECTORS: SectorConfig[] = [
    // ── ELECTRICAL ───────────────────────────────────────────────
    {
        id: 'electrical',
        label: 'Electrical',
        shortLabel: 'Elec',
        icon: 'Zap',
        color: {
            bg: 'bg-yellow-500/10',
            border: 'border-yellow-500/20',
            text: 'text-yellow-400',
            gradient: 'from-yellow-600 to-amber-600',
        },
        description: 'Electricians, wiring, lighting, power systems, and renewable energy',
        subNiches: [
            {
                id: 'wiring',
                label: 'Wiring & Installation',
                tradeMatches: ['Electrical Wiring / Installation', 'Electrical Wiring/Installation'],
            },
            {
                id: 'lighting',
                label: 'Lighting & Fixtures',
                tradeMatches: ['Lighting / Fixture / Fan Installation', 'Lighting/Fixture/Fan Installation'],
            },
            {
                id: 'power_systems',
                label: 'Power Systems',
                tradeMatches: ['Electrical Power', 'Electrical Distribution'],
            },
            {
                id: 'generators',
                label: 'Generators & Backup Power',
                tradeMatches: ['Generator Installation', 'Generator Repair', 'Emergency Power'],
            },
            {
                id: 'low_voltage',
                label: 'Low Voltage & Cabling',
                tradeMatches: ['Cable / Telephone Wiring', 'Audio / Visual Wiring', 'Low Voltage'],
            },
            {
                id: 'security_systems',
                label: 'Security & Access Control',
                tradeMatches: ['Security Systems', 'Door Hardware and Access Controls', 'Electronic Security'],
            },
            {
                id: 'solar',
                label: 'Solar & Renewable',
                tradeMatches: ['Solar Panels', 'Solar Installation', 'Renewable Energy'],
            },
            {
                id: 'controls',
                label: 'Controls & Automation',
                tradeMatches: ['Building Automation', 'Electrical Controls', 'Instrumentation'],
            },
        ],
    },

    // ── OIL & GAS ────────────────────────────────────────────────
    {
        id: 'oil_gas',
        label: 'Oil & Gas',
        shortLabel: 'O&G',
        icon: 'Fuel',
        color: {
            bg: 'bg-amber-600/10',
            border: 'border-amber-600/20',
            text: 'text-amber-500',
            gradient: 'from-amber-700 to-orange-700',
        },
        description: 'Petroleum, pipeline, refinery, drilling, and midstream operations',
        subNiches: [
            { id: 'drilling', label: 'Drilling & Well Services', tradeMatches: [] },
            { id: 'pipeline', label: 'Pipeline Construction', tradeMatches: [] },
            { id: 'refinery', label: 'Refinery & Processing', tradeMatches: [] },
            { id: 'midstream', label: 'Midstream / Transport', tradeMatches: [] },
            { id: 'upstream', label: 'Upstream Exploration', tradeMatches: [] },
            { id: 'offshore', label: 'Offshore Operations', tradeMatches: [] },
            { id: 'field_services', label: 'Field Services & Maintenance', tradeMatches: [] },
            { id: 'environmental', label: 'Environmental & Remediation', tradeMatches: [] },
        ],
    },

    // ── CONSTRUCTION ─────────────────────────────────────────────
    {
        id: 'construction',
        label: 'Construction',
        shortLabel: 'Const',
        icon: 'HardHat',
        color: {
            bg: 'bg-orange-500/10',
            border: 'border-orange-500/20',
            text: 'text-orange-400',
            gradient: 'from-orange-600 to-red-600',
        },
        description: 'General contractors, concrete, steel, framing, and structural work',
        subNiches: [
            {
                id: 'general_contractor',
                label: 'General Contractor',
                tradeMatches: ['General Contractor'],
            },
            {
                id: 'concrete',
                label: 'Concrete',
                tradeMatches: [
                    'Concrete Cast-In-Place (Slabs)', 'Concrete Footers and Stem Walls',
                    'Concrete Walls (CMU)', 'Decorative Concrete', 'Polished Concrete',
                    'Concrete Cutting', 'Precast Concrete',
                ],
            },
            {
                id: 'structural_steel',
                label: 'Structural Steel',
                tradeMatches: [
                    'Structural Steel Erection', 'Steel Deck', 'Metal Fabrications',
                    'Metal Stairs and Ladders', 'Miscellaneous Metals',
                ],
            },
            {
                id: 'framing',
                label: 'Framing & Carpentry',
                tradeMatches: [
                    'Rough Carpentry and Wood Framing', 'Light Gauge Metal Framing',
                    'Finish Carpentry', 'Millwork',
                ],
            },
            {
                id: 'masonry',
                label: 'Masonry',
                tradeMatches: ['Brick and Stone', 'Brick and Stone Flooring', 'Masonry'],
            },
            {
                id: 'project_management',
                label: 'Project Management',
                tradeMatches: ['Project Manager', 'Construction Manager', 'Superintendent'],
            },
            {
                id: 'estimating',
                label: 'Estimating',
                tradeMatches: ['Estimator', 'Quantity Surveyor'],
            },
        ],
    },

    // ── TELECOM ──────────────────────────────────────────────────
    {
        id: 'telecom',
        label: 'Telecom & IT',
        shortLabel: 'Telecom',
        icon: 'Radio',
        color: {
            bg: 'bg-blue-500/10',
            border: 'border-blue-500/20',
            text: 'text-blue-400',
            gradient: 'from-blue-600 to-indigo-600',
        },
        description: 'Tower techs, fiber optics, networking, data centers, and IT infrastructure',
        subNiches: [
            { id: 'tower', label: 'Tower Technicians', tradeMatches: [] },
            { id: 'fiber', label: 'Fiber Optic Installation', tradeMatches: [] },
            { id: 'networking', label: 'Networking & Infrastructure', tradeMatches: [] },
            { id: 'data_center', label: 'Data Center Construction', tradeMatches: [] },
            { id: 'rf_engineering', label: 'RF Engineering', tradeMatches: [] },
            { id: 'wireless', label: 'Wireless / 5G Deployment', tradeMatches: [] },
            { id: 'isp', label: 'ISP & Broadband', tradeMatches: [] },
            { id: 'it_project_mgmt', label: 'IT Project Management', tradeMatches: [] },
            { id: 'telecom_sales', label: 'Telecom Sales', tradeMatches: [] },
        ],
    },

    // ── MECHANICAL ───────────────────────────────────────────────
    {
        id: 'mechanical',
        label: 'Mechanical',
        shortLabel: 'Mech',
        icon: 'Wrench',
        color: {
            bg: 'bg-teal-500/10',
            border: 'border-teal-500/20',
            text: 'text-teal-400',
            gradient: 'from-teal-600 to-cyan-600',
        },
        description: 'HVAC, plumbing, boilers, refrigeration, and piping',
        subNiches: [
            {
                id: 'hvac_install',
                label: 'HVAC Installation',
                tradeMatches: ['HVAC Installation', 'Duct Work and Vents'],
            },
            {
                id: 'hvac_service',
                label: 'HVAC Service & Repair',
                tradeMatches: ['HVAC Repair/Service', 'Testing, Adjusting & Balancing'],
            },
            {
                id: 'plumbing',
                label: 'Plumbing',
                tradeMatches: [
                    'Plumbing Installation', 'Plumbing Fixtures and Equipment',
                    'Plumbing Repair/Service', 'Water Heater Installation', 'Drain Cleaning',
                ],
            },
            {
                id: 'heat_pumps',
                label: 'Heat Pumps & Furnaces',
                tradeMatches: ['Heat Pumps', 'Furnace Repair/Replacement'],
            },
            {
                id: 'boilers',
                label: 'Boilers & Steam',
                tradeMatches: ['Boilers & Radiators'],
            },
            {
                id: 'refrigeration',
                label: 'Refrigeration',
                tradeMatches: ['Refrigeration and Equipment'],
            },
            {
                id: 'piping',
                label: 'Piping & Process',
                tradeMatches: ['Process Piping', 'Medical Gas', 'Industrial Piping'],
            },
        ],
    },

    // ── FINISHES ─────────────────────────────────────────────────
    {
        id: 'finishes',
        label: 'Finishes',
        shortLabel: 'Fin',
        icon: 'Paintbrush',
        color: {
            bg: 'bg-pink-500/10',
            border: 'border-pink-500/20',
            text: 'text-pink-400',
            gradient: 'from-pink-600 to-rose-600',
        },
        description: 'Painting, flooring, drywall, tile, ceiling, and interior finishing',
        subNiches: [
            {
                id: 'painting',
                label: 'Painting',
                tradeMatches: ['Painting'],
            },
            {
                id: 'drywall',
                label: 'Drywall & Plaster',
                tradeMatches: ['Drywall Installation', 'Finish and Textured Drywall', 'Plastering'],
            },
            {
                id: 'tile',
                label: 'Tile & Stone',
                tradeMatches: ['Tile Flooring', 'Brick and Stone Flooring'],
            },
            {
                id: 'flooring',
                label: 'Flooring',
                tradeMatches: [
                    'Vinyl and VCT Flooring', 'Carpet', 'Laminate Flooring',
                    'Hardwood Flooring', 'Epoxy/Resinous Flooring',
                ],
            },
            {
                id: 'ceilings',
                label: 'Ceilings & Acoustics',
                tradeMatches: ['Acoustical Ceiling and Wall Panels'],
            },
            {
                id: 'wall_coverings',
                label: 'Wall Coverings',
                tradeMatches: ['Wall Paper', 'FRP - Wall Panels', 'Caulking'],
            },
            {
                id: 'countertops',
                label: 'Countertops & Millwork',
                tradeMatches: ['Countertops', 'Casework', 'Cabinets'],
            },
        ],
    },

    // ── FIRE & SAFETY ────────────────────────────────────────────
    {
        id: 'fire_safety',
        label: 'Fire & Safety',
        shortLabel: 'Fire',
        icon: 'Flame',
        color: {
            bg: 'bg-red-500/10',
            border: 'border-red-500/20',
            text: 'text-red-400',
            gradient: 'from-red-600 to-orange-600',
        },
        description: 'Fire alarms, sprinklers, suppression systems, and life safety',
        subNiches: [
            {
                id: 'fire_alarm',
                label: 'Fire Alarms',
                tradeMatches: ['Firealarms', 'Fire Alarms'],
            },
            {
                id: 'sprinklers',
                label: 'Sprinkler Systems',
                tradeMatches: ['Interior Sprinklers'],
            },
            {
                id: 'firestopping',
                label: 'Firestopping',
                tradeMatches: ['Firestopping'],
            },
            {
                id: 'suppression',
                label: 'Fire Suppression',
                tradeMatches: ['Fire Suppression'],
            },
            {
                id: 'life_safety',
                label: 'Life Safety & Code',
                tradeMatches: ['Life Safety', 'Code Compliance'],
            },
        ],
    },

    // ── SITEWORK ─────────────────────────────────────────────────
    {
        id: 'sitework',
        label: 'Sitework',
        shortLabel: 'Site',
        icon: 'Tractor',
        color: {
            bg: 'bg-lime-500/10',
            border: 'border-lime-500/20',
            text: 'text-lime-400',
            gradient: 'from-lime-600 to-green-600',
        },
        description: 'Excavation, grading, paving, demolition, and utilities',
        subNiches: [
            {
                id: 'excavation',
                label: 'Excavation & Earthwork',
                tradeMatches: ['Site Work / Excavation', 'Grading and Fill'],
            },
            {
                id: 'paving',
                label: 'Paving & Flatwork',
                tradeMatches: ['Asphalt Paving', 'Sidewalks', 'Curb and Gutter', 'Line Striping'],
            },
            {
                id: 'demolition',
                label: 'Demolition',
                tradeMatches: ['Exterior Demolition', 'Interior Demolition'],
            },
            {
                id: 'utilities',
                label: 'Underground Utilities',
                tradeMatches: ['Underground Utilities'],
            },
            {
                id: 'retaining',
                label: 'Retaining Walls & Hardscape',
                tradeMatches: ['Retaining Walls'],
            },
            {
                id: 'landscaping',
                label: 'Landscaping & Irrigation',
                tradeMatches: ['Tree Removal', 'Landscaping', 'Irrigation'],
            },
        ],
    },

    // ── SPECIALTY ────────────────────────────────────────────────
    {
        id: 'specialty',
        label: 'Specialty',
        shortLabel: 'Spec',
        icon: 'Cog',
        color: {
            bg: 'bg-violet-500/10',
            border: 'border-violet-500/20',
            text: 'text-violet-400',
            gradient: 'from-violet-600 to-purple-600',
        },
        description: 'Roofing, glazing, doors/windows, insulation, and envelope',
        subNiches: [
            {
                id: 'roofing',
                label: 'Roofing',
                tradeMatches: ['Metal Roofing', 'Flat Roof', 'Shingle Roof', 'Built-Up Roofing'],
            },
            {
                id: 'glazing',
                label: 'Glazing & Storefronts',
                tradeMatches: [
                    'Glazing and Storefronts', 'Curtain Walls', 'Glass and Mirrors',
                    'Shower Doors',
                ],
            },
            {
                id: 'doors_windows',
                label: 'Doors & Windows',
                tradeMatches: ['Exterior Doors', 'Interior Doors', 'Windows', 'Sliding Doors'],
            },
            {
                id: 'insulation',
                label: 'Insulation & Waterproofing',
                tradeMatches: ['Thermal Insulation', 'Waterproofing', 'Dampproofing'],
            },
            {
                id: 'handrails',
                label: 'Railings & Metalwork',
                tradeMatches: ['Handrails and Railings', 'Ornamental Metals'],
            },
            {
                id: 'signage',
                label: 'Signage',
                tradeMatches: ['Signage', 'Channel Letters'],
            },
        ],
    },

    // ── LEADS ────────────────────────────────────────────────────
    {
        id: 'leads',
        label: 'Leads',
        shortLabel: 'Leads',
        icon: 'FileText',
        color: {
            bg: 'bg-emerald-500/10',
            border: 'border-emerald-500/20',
            text: 'text-emerald-400',
            gradient: 'from-emerald-600 to-green-600',
        },
        description: 'Cross-sector lead feed — bid opportunities and project leads',
        subNiches: [
            { id: 'bid_invites', label: 'Bid Invitations', tradeMatches: [] },
            { id: 'plan_rooms', label: 'Plan Rooms', tradeMatches: [] },
            { id: 'public_bids', label: 'Public Bids', tradeMatches: [] },
            { id: 'private_bids', label: 'Private / Negotiated', tradeMatches: [] },
        ],
    },

    // ── RECRUITING ──────────────────────────────────────────────
    {
        id: 'recruiting',
        label: 'Recruiting',
        shortLabel: 'Recruit',
        icon: 'Users',
        color: {
            bg: 'bg-violet-500/10',
            border: 'border-violet-500/20',
            text: 'text-violet-400',
            gradient: 'from-violet-600 to-indigo-600',
        },
        description: 'Talent acquisition pipeline — profiles across all recruiting sectors',
        subNiches: [
            { id: 'oil_gas', label: 'Oil & Gas Talents', tradeMatches: [] },
            { id: 'telecom', label: 'Telecom & IT Talents', tradeMatches: [] },
            { id: 'construction', label: 'Construction Talents', tradeMatches: [] },
            { id: 'energy', label: 'Energy Talents', tradeMatches: [] },
        ],
    },
];

// ── Helpers ──────────────────────────────────────────────────────

/** Flat list of all sector IDs */
export const ALL_SECTOR_IDS: SectorId[] = SECTORS.map(s => s.id);

/** Map sector ID → config for O(1) lookup */
export const SECTOR_MAP: Record<SectorId, SectorConfig> =
    Object.fromEntries(SECTORS.map(s => [s.id, s])) as Record<SectorId, SectorConfig>;

/** Given a list of PlanHub trade names, return which sectors they belong to */
export function categorizeTrades(trades: string[]): SectorId[] {
    const matched = new Set<SectorId>();
    for (const trade of trades) {
        const lower = trade.toLowerCase();
        for (const sector of SECTORS) {
            for (const niche of sector.subNiches) {
                if (niche.tradeMatches.some(m => m.toLowerCase() === lower)) {
                    matched.add(sector.id);
                }
            }
        }
    }
    return Array.from(matched);
}

/** Get all sub-niches for a sector */
export function getSubNiches(sectorId: SectorId): SubNiche[] {
    return SECTOR_MAP[sectorId]?.subNiches || [];
}

/** Get display color classes for a sector */
export function getSectorColor(sectorId: SectorId) {
    return SECTOR_MAP[sectorId]?.color || {
        bg: 'bg-white/5',
        border: 'border-white/10',
        text: 'text-neutral-400',
        gradient: 'from-neutral-600 to-neutral-600',
    };
}
