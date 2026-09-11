import React, { useState } from 'react';
import {
  X,
  Database,
  RefreshCw,
  Download,
  ExternalLink,
  Code,
  CheckCircle,
  Terminal,
  Globe,
  Share2,
} from 'lucide-react';
import {
  DENVER_ACCELA_ENDPOINT,
  ACCELA_CITIZEN_ACCESS_URL,
  scrapeDenverDemolitionPermits,
} from '../services/accelaService';
import { DemolitionPermit } from '../types';

interface ScraperModalProps {
  onClose: () => void;
  onScrapeSuccess: (permits: DemolitionPermit[], source: 'live' | 'cache') => void;
  currentPermits: DemolitionPermit[];
}

export const ScraperModal: React.FC<ScraperModalProps> = ({
  onClose,
  onScrapeSuccess,
  currentPermits,
}) => {
  const [scrapeDays, setScrapeDays] = useState(90);
  const [isScraping, setIsScraping] = useState(false);
  const [logs, setLogs] = useState<string[]>([
    'Accela Scraper Engine Initialized.',
    `Connected to endpoint: ${DENVER_ACCELA_ENDPOINT}`,
    `Loaded snapshot: ${currentPermits.length} demolition permits (last 90 days).`,
    'Ready for live scrape execution.',
  ]);

  const addLog = (msg: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const handleRunScrape = async () => {
    setIsScraping(true);
    addLog(`Initiating live Accela query for past ${scrapeDays} days...`);

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - scrapeDays);
    const dateStr = targetDate.toISOString().split('T')[0];
    addLog(`WHERE clause: DATE_ISSUED >= DATE '${dateStr}'`);

    try {
      const result = await scrapeDenverDemolitionPermits(scrapeDays);
      addLog(`Query completed! Source: ${result.source.toUpperCase()}`);
      addLog(`Retrieved ${result.permits.length} permits from Denver Accela feed.`);
      onScrapeSuccess(result.permits, result.source);
    } catch (err) {
      addLog(`Error during scrape: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsScraping(false);
    }
  };

  const exportGeoJSON = () => {
    const geojson = {
      type: 'FeatureCollection',
      features: currentPermits.map((p) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [p.geometry?.x || 0, p.geometry?.y || 0],
        },
        properties: p.attributes,
      })),
    };

    const blob = new Blob([JSON.stringify(geojson, null, 2)], {
      type: 'application/geo+json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `denver_demolition_permits_${scrapeDays}d.geojson`;
    link.click();
    URL.revokeObjectURL(url);
    addLog('Exported GeoJSON file successfully.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between gap-4 bg-slate-900/90 sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">
                Denver Accela API & Scraper Studio
              </h2>
              <p className="text-xs text-slate-400">
                Direct integration with City of Denver Accela Civic Platform & Open Data
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs">
          {/* Query Controls */}
          <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/80 space-y-3">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
              <span>Live Query Execution</span>
            </h3>

            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Time Window
                </label>
                <select
                  value={scrapeDays}
                  onChange={(e) => setScrapeDays(Number(e.target.value))}
                  className="bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-amber-500"
                >
                  <option value={30}>Last 30 Days</option>
                  <option value={60}>Last 60 Days</option>
                  <option value={90}>Last 90 Days (Recommended)</option>
                  <option value={180}>Last 180 Days</option>
                  <option value={365}>Last 365 Days</option>
                </select>
              </div>

              <div className="flex items-end gap-2 pt-4 sm:pt-0">
                <button
                  onClick={handleRunScrape}
                  disabled={isScraping}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold shadow-md transition disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isScraping ? 'animate-spin' : ''}`} />
                  <span>{isScraping ? 'Querying Accela...' : 'Execute Live Scrape'}</span>
                </button>

                <button
                  onClick={exportGeoJSON}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-amber-400" />
                  <span>Export GeoJSON</span>
                </button>
              </div>
            </div>
          </div>

          {/* Scraper Terminal Output */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                <Terminal className="w-3.5 h-3.5 text-amber-400" />
                <span>Scraper Execution Log</span>
              </span>
              <button
                onClick={() => setLogs(['Logs cleared.'])}
                className="text-[10px] text-slate-500 hover:text-slate-300"
              >
                Clear
              </button>
            </div>
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl font-mono text-[11px] text-emerald-400 h-36 overflow-y-auto space-y-1">
              {logs.map((log, idx) => (
                <div key={idx} className="leading-relaxed">
                  {log}
                </div>
              ))}
            </div>
          </div>

          {/* GitHub Hosting & API Information */}
          <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Share2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Hostable on GitHub (Static Architecture)</span>
            </h3>
            <p className="text-slate-400 leading-relaxed">
              This application is 100% static and client-side ready for hosting on <strong>GitHub Pages</strong>, Cloud Run, Vercel, or Netlify. The Denver Accela endpoint provides full CORS headers (<code className="text-amber-300 bg-slate-900 px-1 py-0.5 rounded">access-control-allow-origin: *</code>), allowing direct browser querying without requiring backend proxy servers.
            </p>

            <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 text-[11px] space-y-1">
              <div className="flex items-center justify-between text-slate-300">
                <span className="font-semibold text-white">Denver Accela Endpoint:</span>
                <a
                  href={DENVER_ACCELA_ENDPOINT}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-400 hover:underline flex items-center gap-1"
                >
                  <span>FeatureServer/318</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="text-slate-400 font-mono break-all text-[10px]">
                {DENVER_ACCELA_ENDPOINT}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition cursor-pointer"
          >
            Close Studio
          </button>
        </div>
      </div>
    </div>
  );
};
