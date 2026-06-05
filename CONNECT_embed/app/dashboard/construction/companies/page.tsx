"use client";

import React from 'react';
import ConstructionCompaniesTable from '@/components/ConstructionCompaniesTable';
import { HardHat } from 'lucide-react';

export default function ConstructionCompaniesPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                    <HardHat className="w-8 h-8 text-orange-400" />
                    Construction Companies
                </h1>
                <p className="text-neutral-400 font-medium mt-2">Browse PlanHub construction company database</p>
            </div>
            <ConstructionCompaniesTable />
        </div>
    );
}
