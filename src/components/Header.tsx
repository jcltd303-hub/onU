import React from 'react';
import { HardHat, RefreshCw, ExternalLink, Database, Globe, Download } from 'lucide-react';
import { ScrapeProgress } from '../types';

interface HeaderProps {
  progress: ScrapeProgress;
  onRefresh: () => void;
  onOpenScraper: () => void;
  totalPermits: number;
}

export const Header: React.FC<HeaderProps> = ({
  progress,
  onRefresh,
  onOpenScraper,
  totalPermits,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Title & Icon */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <HardHat className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white truncate">
                Denver Demolition Permits
              </h1>
              <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Accela API
              </span>
              <span className="hidden lg:inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                GitHub Ready
              </span>
            </div>
            <p className="text-xs text-slate-400 truncate">
              Last 90 days issued &bull; Accela Civic Platform sync &bull; FOSS maps & street view
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Live Data Status */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                progress.isScraping
                  ? 'bg-amber-400 animate-ping'
                  : progress.source === 'live'
                  ? 'bg-emerald-400'
                  : 'bg-blue-400'
              }`}
            />
            <span className="text-slate-300">
              {progress.isScraping
                ? 'Scraping Accela...'
                : progress.source === 'live'
                ? 'Accela Live Sync'
                : 'Accela Cache (157 Records)'}
            </span>
          </div>

          {/* Scraper / Query Studio */}
          <button
            id="btn-open-scraper"
            onClick={onOpenScraper}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
            title="Open Accela API query & scraper studio"
          >
            <Database className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">Accela Scraper</span>
          </button>

          {/* Refresh / Scrape Now */}
          <button
            id="btn-refresh-data"
            onClick={onRefresh}
            disabled={progress.isScraping}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-amber-600 hover:bg-amber-500 text-white transition disabled:opacity-50 cursor-pointer shadow-sm"
            title="Scrape latest permits from Accela API"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${progress.isScraping ? 'animate-spin' : ''}`}
            />
            <span className="hidden sm:inline">
              {progress.isScraping ? 'Fetching...' : 'Refresh'}
            </span>
          </button>

          {/* Official Accela Link */}
          <a
            id="link-accela-portal"
            href="https://aca-prod.accela.com/DENVER/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 p-1.5 text-xs font-medium rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
            title="Open Denver Accela Citizen Access portal in new tab"
          >
            <Globe className="w-4 h-4" />
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </header>
  );
};
