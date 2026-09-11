/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { DemolitionPermit, FilterOptions, ScrapeProgress } from './types';
import initialPermitsData from './data/initial_permits.json';
import { scrapeDenverDemolitionPermits } from './services/accelaService';
import { Header } from './components/Header';
import { MetricsBar } from './components/MetricsBar';
import { FilterBar } from './components/FilterBar';
import { PermitCard } from './components/PermitCard';
import { MapView } from './components/MapView';
import { TableView } from './components/TableView';
import { PermitDetailModal } from './components/PermitDetailModal';
import { ScraperModal } from './components/ScraperModal';
import { AlertCircle, RefreshCw, ChevronLeft, ChevronRight, Layers, Camera, MapPin } from 'lucide-react';

export default function App() {
  const [allPermits, setAllPermits] = useState<DemolitionPermit[]>(
    initialPermitsData as DemolitionPermit[]
  );

  const [scrapeProgress, setScrapeProgress] = useState<ScrapeProgress>({
    isScraping: false,
    lastScrapedAt: new Date(),
    source: 'live',
    totalFound: (initialPermitsData as DemolitionPermit[]).length,
    error: null,
  });

  const [filters, setFilters] = useState<FilterOptions>({
    searchQuery: '',
    daysRange: 90,
    neighborhood: '',
    contractor: '',
    demolitionClass: '',
    minValuation: 0,
    sortBy: 'valDesc',
  });

  const [viewMode, setViewMode] = useState<'grid' | 'map' | 'table'>('grid');
  const [selectedPermit, setSelectedPermit] = useState<DemolitionPermit | null>(null);
  const [isScraperModalOpen, setIsScraperModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 24;

  // Background check / refresh from live Accela on mount
  const runScrape = useCallback(async (days = 90) => {
    setScrapeProgress((prev) => ({ ...prev, isScraping: true, error: null }));
    try {
      const { permits, source } = await scrapeDenverDemolitionPermits(days);
      setAllPermits(permits);
      setScrapeProgress({
        isScraping: false,
        lastScrapedAt: new Date(),
        source,
        totalFound: permits.length,
        error: null,
      });
    } catch (err) {
      setScrapeProgress((prev) => ({
        ...prev,
        isScraping: false,
        error: err instanceof Error ? err.message : 'Scrape failed',
      }));
    }
  }, []);

  useEffect(() => {
    // Attempt live fetch on launch
    runScrape(filters.daysRange);
  }, [runScrape, filters.daysRange]);

  // Extract distinct neighborhoods for filter
  const neighborhoods = useMemo(() => {
    const set = new Set<string>();
    allPermits.forEach((p) => {
      const n = p.attributes.NEIGHBORHOOD;
      if (n && n.trim()) set.add(n.trim());
    });
    return Array.from(set).sort();
  }, [allPermits]);

  // Extract distinct demolition classes
  const classes = useMemo(() => {
    const set = new Set<string>();
    allPermits.forEach((p) => {
      const c = p.attributes.CLASS;
      if (c && c.trim()) set.add(c.trim());
    });
    return Array.from(set).sort();
  }, [allPermits]);

  // Apply filters and sorting
  const filteredPermits = useMemo(() => {
    const now = Date.now();
    const maxAgeMs = filters.daysRange > 0 ? filters.daysRange * 24 * 60 * 60 * 1000 : null;

    return allPermits
      .filter((permit) => {
        const { attributes } = permit;

        // Days range filter
        if (maxAgeMs !== null && attributes.DATE_ISSUED) {
          const age = now - attributes.DATE_ISSUED;
          if (age > maxAgeMs) return false;
        }

        // Neighborhood filter
        if (filters.neighborhood && attributes.NEIGHBORHOOD !== filters.neighborhood) {
          return false;
        }

        // Class filter
        if (filters.demolitionClass && attributes.CLASS !== filters.demolitionClass) {
          return false;
        }

        // Search Query filter
        if (filters.searchQuery.trim()) {
          const q = filters.searchQuery.trim().toLowerCase();
          const matchAddr = (attributes.ADDRESS || '').toLowerCase().includes(q);
          const matchPermit = (attributes.PERMIT_NUM || '').toLowerCase().includes(q);
          const matchContractor = (attributes.CONTRACTOR_NAME || '').toLowerCase().includes(q);
          const matchNeigh = (attributes.NEIGHBORHOOD || '').toLowerCase().includes(q);
          const matchSched = (attributes.SCHEDNUM || '').toLowerCase().includes(q);

          if (!matchAddr && !matchPermit && !matchContractor && !matchNeigh && !matchSched) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        switch (filters.sortBy) {
          case 'dateDesc':
            return (b.attributes.DATE_ISSUED || 0) - (a.attributes.DATE_ISSUED || 0);
          case 'dateAsc':
            return (a.attributes.DATE_ISSUED || 0) - (b.attributes.DATE_ISSUED || 0);
          case 'valDesc':
            return (b.attributes.VALUATION || 0) - (a.attributes.VALUATION || 0);
          case 'valAsc':
            return (a.attributes.VALUATION || 0) - (b.attributes.VALUATION || 0);
          case 'address':
            return (a.attributes.ADDRESS || '').localeCompare(b.attributes.ADDRESS || '');
          default:
            return 0;
        }
      });
  }, [allPermits, filters]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  // Pagination for grid view
  const totalPages = Math.max(1, Math.ceil(filteredPermits.length / pageSize));
  const paginatedPermits = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPermits.slice(start, start + pageSize);
  }, [filteredPermits, currentPage, pageSize]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Top Header */}
      <Header
        progress={scrapeProgress}
        onRefresh={() => runScrape(filters.daysRange)}
        onOpenScraper={() => setIsScraperModalOpen(true)}
        totalPermits={allPermits.length}
      />

      {/* Main Content Dashboard */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Scrape error banner if any */}
        {scrapeProgress.error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>Live query notice: {scrapeProgress.error}. Displaying local cached Accela dataset.</span>
            </div>
            <button
              onClick={() => runScrape(filters.daysRange)}
              className="text-amber-400 hover:underline font-medium"
            >
              Retry
            </button>
          </div>
        )}

        {/* Statistical Summary Metrics */}
        <MetricsBar
          permits={filteredPermits}
          totalAvailable={allPermits.length}
        />

        {/* Filter Controls & View Switcher */}
        <FilterBar
          filters={filters}
          onChange={setFilters}
          neighborhoods={neighborhoods}
          classes={classes}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          resultCount={filteredPermits.length}
        />

        {/* Content Views */}
        {filteredPermits.length === 0 ? (
          <div className="p-12 text-center bg-slate-900/60 border border-slate-800 rounded-2xl">
            <Camera className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-white mb-1">
              No demolition permits match your criteria
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mb-4">
              Try adjusting your search query, selecting a wider timeframe, or clearing neighborhood filters.
            </p>
            <button
              onClick={() =>
                setFilters({
                  searchQuery: '',
                  daysRange: 90,
                  neighborhood: '',
                  contractor: '',
                  demolitionClass: '',
                  minValuation: 0,
                  sortBy: 'dateDesc',
                })
              }
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
            >
              Reset All Filters
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="space-y-6">
            {/* Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {paginatedPermits.map((permit) => (
                <PermitCard
                  key={permit.attributes.OBJECTID}
                  permit={permit}
                  onSelect={(p) => setSelectedPermit(p)}
                />
              ))}
            </div>

            {/* Pagination Bar */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-800/80 pt-4 text-xs text-slate-400">
                <span>
                  Showing {(currentPage - 1) * pageSize + 1} to{' '}
                  {Math.min(currentPage * pageSize, filteredPermits.length)} of{' '}
                  {filteredPermits.length} permits
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 transition"
                    title="Previous page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <span className="px-3 py-1 rounded bg-slate-900 border border-slate-800 font-mono text-slate-300">
                    Page {currentPage} of {totalPages}
                  </span>

                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 transition"
                    title="Next page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : viewMode === 'map' ? (
          <MapView
            permits={filteredPermits}
            onSelectPermit={(p) => setSelectedPermit(p)}
          />
        ) : (
          <TableView
            permits={filteredPermits}
            onSelectPermit={(p) => setSelectedPermit(p)}
            sortBy={filters.sortBy}
            onSortChange={(newSort) =>
              setFilters((prev) => ({ ...prev, sortBy: newSort }))
            }
          />
        )}
      </main>

      {/* Detailed Modal on Thumbnail / Card Click */}
      {selectedPermit && (
        <PermitDetailModal
          permit={selectedPermit}
          onClose={() => setSelectedPermit(null)}
        />
      )}

      {/* Accela Scraper Studio Modal */}
      {isScraperModalOpen && (
        <ScraperModal
          onClose={() => setIsScraperModalOpen(false)}
          onScrapeSuccess={(newPermits, source) => {
            setAllPermits(newPermits);
            setScrapeProgress({
              isScraping: false,
              lastScrapedAt: new Date(),
              source,
              totalFound: newPermits.length,
              error: null,
            });
            setIsScraperModalOpen(false);
          }}
          currentPermits={filteredPermits}
        />
      )}

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-800/80 text-slate-500 py-6 text-xs text-center">
        <div className="max-w-7xl mx-auto px-4 space-y-1">
          <p>
            Data synced from City and County of Denver Community Planning & Development Accela Civic Platform.
          </p>
          <p className="text-[11px] text-slate-600">
            FOSS Street View & Maps powered by OpenStreetMap, Mapillary, and CARTO. Hostable on GitHub Pages.
          </p>
        </div>
      </footer>
    </div>
  );
}
