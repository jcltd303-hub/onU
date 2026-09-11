import React from 'react';
import { DemolitionPermit } from '../types';
import { formatCurrency } from '../services/accelaService';
import { Building2, DollarSign, MapPin, Wrench } from 'lucide-react';

interface MetricsBarProps {
  permits: DemolitionPermit[];
  totalAvailable: number;
}

export const MetricsBar: React.FC<MetricsBarProps> = ({ permits, totalAvailable }) => {
  const totalValuation = permits.reduce(
    (sum, p) => sum + (p.attributes.VALUATION || 0),
    0
  );

  const avgValuation = permits.length > 0 ? totalValuation / permits.length : 0;

  const neighborhoods = new Set(
    permits
      .map((p) => p.attributes.NEIGHBORHOOD)
      .filter((n): n is string => Boolean(n && n.trim()))
  );

  // Calculate top contractor
  const contractorCounts: Record<string, number> = {};
  permits.forEach((p) => {
    const c = p.attributes.CONTRACTOR_NAME;
    if (c && c.trim()) {
      contractorCounts[c] = (contractorCounts[c] || 0) + 1;
    }
  });

  const topContractorEntry = Object.entries(contractorCounts).sort(
    (a, b) => b[1] - a[1]
  )[0];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {/* Total Permits */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
          <Building2 className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-slate-400 font-medium truncate">Demolition Permits</p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-white tracking-tight">
              {permits.length}
            </span>
            {permits.length !== totalAvailable && (
              <span className="text-xs text-slate-500">of {totalAvailable}</span>
            )}
          </div>
        </div>
      </div>

      {/* Total Valuation */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
          <DollarSign className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-slate-400 font-medium truncate">Total Valuation</p>
          <p className="text-xl font-bold text-white tracking-tight truncate">
            {formatCurrency(totalValuation)}
          </p>
        </div>
      </div>

      {/* Neighborhoods */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
          <MapPin className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-slate-400 font-medium truncate">Neighborhoods</p>
          <p className="text-xl font-bold text-white tracking-tight">
            {neighborhoods.size} <span className="text-xs font-normal text-slate-400">areas</span>
          </p>
        </div>
      </div>

      {/* Top Contractor */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
          <Wrench className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-slate-400 font-medium truncate">Top Contractor</p>
          <p className="text-sm font-semibold text-white tracking-tight truncate">
            {topContractorEntry ? topContractorEntry[0] : 'None listed'}
          </p>
          {topContractorEntry && (
            <p className="text-xs text-slate-400">
              {topContractorEntry[1]} permits ({Math.round((topContractorEntry[1] / permits.length) * 100)}%)
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
