import React from 'react';
import { FilterOptions } from '../types';
import { Search, LayoutGrid, Map as MapIcon, Table, SlidersHorizontal, X } from 'lucide-react';

interface FilterBarProps {
  filters: FilterOptions;
  onChange: (filters: FilterOptions) => void;
  neighborhoods: string[];
  classes: string[];
  viewMode: 'grid' | 'map' | 'table';
  onViewModeChange: (mode: 'grid' | 'map' | 'table') => void;
  resultCount: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onChange,
  neighborhoods,
  classes,
  viewMode,
  onViewModeChange,
  resultCount,
}) => {
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...filters, searchQuery: e.target.value });
  };

  const clearSearch = () => {
    onChange({ ...filters, searchQuery: '' });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm space-y-3">
      {/* Top row: Search input + View switcher */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Field */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="input-search-permits"
            type="text"
            value={filters.searchQuery}
            onChange={handleSearchChange}
            placeholder="Search by address, permit number (2026-DEMO...), contractor, or neighborhood..."
            className="w-full pl-9 pr-8 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition"
          />
          {filters.searchQuery && (
            <button
              onClick={clearSearch}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-lg border border-slate-700 self-start sm:self-auto shrink-0">
          <button
            id="btn-view-cards"
            onClick={() => onViewModeChange('grid')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${
              viewMode === 'grid'
                ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
            }`}
            title="Grid cards with street view thumbnails"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Thumbnails</span>
          </button>
          <button
            id="btn-view-map"
            onClick={() => onViewModeChange('map')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${
              viewMode === 'map'
                ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
            }`}
            title="Interactive FOSS OpenStreetMap"
          >
            <MapIcon className="w-3.5 h-3.5" />
            <span>FOSS Map</span>
          </button>
          <button
            id="btn-view-table"
            onClick={() => onViewModeChange('table')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${
              viewMode === 'table'
                ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
            }`}
            title="Tabular permit data view"
          >
            <Table className="w-3.5 h-3.5" />
            <span>Table</span>
          </button>
        </div>
      </div>

      {/* Filter Selectors */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2.5 pt-1 border-t border-slate-800/80">
        {/* Timeframe Selector */}
        <div>
          <label className="block text-[11px] font-medium text-slate-400 mb-1">
            Timeframe
          </label>
          <select
            id="select-timeframe"
            value={filters.daysRange}
            onChange={(e) =>
              onChange({ ...filters, daysRange: Number(e.target.value) })
            }
            className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-amber-500"
          >
            <option value={30}>Last 30 Days</option>
            <option value={60}>Last 60 Days</option>
            <option value={90}>Last 90 Days (Default)</option>
            <option value={180}>Last 180 Days</option>
            <option value={365}>Last 1 Year</option>
            <option value={0}>All Records</option>
          </select>
        </div>

        {/* Neighborhood Filter */}
        <div>
          <label className="block text-[11px] font-medium text-slate-400 mb-1">
            Neighborhood ({neighborhoods.length})
          </label>
          <select
            id="select-neighborhood"
            value={filters.neighborhood}
            onChange={(e) =>
              onChange({ ...filters, neighborhood: e.target.value })
            }
            className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-amber-500"
          >
            <option value="">All Neighborhoods</option>
            {neighborhoods.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>

        {/* Demolition Class Filter */}
        <div>
          <label className="block text-[11px] font-medium text-slate-400 mb-1">
            Permit Class
          </label>
          <select
            id="select-demo-class"
            value={filters.demolitionClass}
            onChange={(e) =>
              onChange({ ...filters, demolitionClass: e.target.value })
            }
            className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-amber-500"
          >
            <option value="">All Classes</option>
            {classes.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Sort By */}
        <div>
          <label className="block text-[11px] font-medium text-slate-400 mb-1">
            Sort Order
          </label>
          <select
            id="select-sort-by"
            value={filters.sortBy}
            onChange={(e) =>
              onChange({
                ...filters,
                sortBy: e.target.value as FilterOptions['sortBy'],
              })
            }
            className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-amber-500"
          >
            <option value="valDesc">Demolition Valuation (Highest First)</option>
            <option value="valAsc">Demolition Valuation (Lowest First)</option>
            <option value="dateDesc">Newest Issued</option>
            <option value="dateAsc">Oldest Issued</option>
            <option value="address">Address (A-Z)</option>
          </select>
        </div>

        {/* Clear Filters Button & Counter */}
        <div className="col-span-2 sm:col-span-4 lg:col-span-1 flex items-end justify-between lg:justify-end gap-2">
          {(filters.searchQuery ||
            filters.neighborhood ||
            filters.demolitionClass ||
            filters.daysRange !== 90 ||
            filters.sortBy !== 'valDesc') && (
            <button
              onClick={() =>
                onChange({
                  searchQuery: '',
                  daysRange: 90,
                  neighborhood: '',
                  contractor: '',
                  demolitionClass: '',
                  minValuation: 0,
                  sortBy: 'valDesc',
                })
              }
              className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 py-1 px-2 rounded hover:bg-slate-800 transition cursor-pointer"
            >
              Reset Filters
            </button>
          )}
          <span className="text-xs text-slate-400 py-1">
            {resultCount} {resultCount === 1 ? 'permit' : 'permits'} found
          </span>
        </div>
      </div>
    </div>
  );
};
