import React, { useEffect, useState, useRef } from 'react';
import { DemolitionPermit } from '../types';
import {
  formatCurrency,
  formatDate,
  formatDaysAgo,
  getPermitLinks,
  fetchAddressPermitHistory,
} from '../services/accelaService';
import {
  X,
  ExternalLink,
  MapPin,
  Calendar,
  DollarSign,
  Building,
  Wrench,
  CheckCircle2,
  Clock,
  Copy,
  Check,
  Compass,
  Camera,
  Layers,
  FileCode,
  Shield,
  FileText,
  History,
  AlertTriangle,
  RotateCw,
} from 'lucide-react';
import L from 'leaflet';
import { StreetView360PanoramaViewer } from './StreetView360PanoramaViewer';

interface PermitDetailModalProps {
  permit: DemolitionPermit;
  onClose: () => void;
}

export const PermitDetailModal: React.FC<PermitDetailModalProps> = ({
  permit,
  onClose,
}) => {
  const { attributes, geometry } = permit;
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);

  const [activeTab, setActiveTab] = useState<'map' | 'streetview' | 'history' | 'raw'>('map');
  const [historyPermits, setHistoryPermits] = useState<DemolitionPermit[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [copiedCoords, setCopiedCoords] = useState(false);
  const [copiedPermit, setCopiedPermit] = useState(false);

  const lat = geometry?.y;
  const lon = geometry?.x;
  const links = getPermitLinks(permit);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Fetch permit history for this address / parcel
  useEffect(() => {
    let isMounted = true;
    setIsLoadingHistory(true);
    fetchAddressPermitHistory(attributes.ADDRESS, attributes.SCHEDNUM).then((history) => {
      if (isMounted) {
        setHistoryPermits(history);
        setIsLoadingHistory(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [attributes.ADDRESS, attributes.SCHEDNUM]);

  // Initialize Leaflet FOSS Map
  useEffect(() => {
    if (activeTab !== 'map' || !mapContainerRef.current || !lat || !lon) return;

    // Cleanup previous map if exists
    if (leafletMapRef.current) {
      leafletMapRef.current.remove();
      leafletMapRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      center: [lat, lon],
      zoom: 18,
      zoomControl: true,
    });

    // FOSS OpenStreetMap Tile Layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
    }).addTo(map);

    // Custom pulse marker for the parcel
    const customIcon = L.divIcon({
      className: 'custom-leaflet-marker',
      html: `
        <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2">
          <span class="w-8 h-8 rounded-full bg-rose-500/30 border-2 border-rose-500 animate-ping absolute"></span>
          <span class="w-6 h-6 rounded-full bg-rose-600 border-2 border-white shadow-md flex items-center justify-center text-white text-[10px] font-bold">
            D
          </span>
        </div>
      `,
      iconSize: [24, 24],
    });

    const marker = L.marker([lat, lon], { icon: customIcon }).addTo(map);
    marker.bindPopup(`
      <div style="font-family: sans-serif; font-size: 12px;">
        <strong style="display:block; margin-bottom: 2px;">${attributes.ADDRESS}</strong>
        <span style="color: #666;">Permit: ${attributes.PERMIT_NUM}</span><br/>
        <span style="color: #d97706; font-weight: bold;">Valuation: ${formatCurrency(attributes.VALUATION)}</span>
      </div>
    `);

    // Add circle around demolition zone
    L.circle([lat, lon], {
      color: '#f43f5e',
      fillColor: '#f43f5e',
      fillOpacity: 0.15,
      radius: 35,
    }).addTo(map);

    leafletMapRef.current = map;

    // Invalidate size after modal render
    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [activeTab, lat, lon, attributes.ADDRESS, attributes.PERMIT_NUM, attributes.VALUATION]);

  const copyToClipboard = (text: string, type: 'coords' | 'permit') => {
    navigator.clipboard.writeText(text);
    if (type === 'coords') {
      setCopiedCoords(true);
      setTimeout(() => setCopiedCoords(false), 2000);
    } else {
      setCopiedPermit(true);
      setTimeout(() => setCopiedPermit(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      {/* Modal Card */}
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Modal Top Header */}
        <div className="p-4 sm:p-6 border-b border-slate-800 bg-slate-900/90 flex items-start justify-between gap-4 sticky top-0 z-20">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                {attributes.CLASS || 'Demolition Permit'}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                {attributes.PERMIT_NUM}
              </span>
              {attributes.CO_REQUIRED && (
                <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  CO: {attributes.CO_REQUIRED}
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {attributes.ADDRESS}
            </h2>

            <p className="text-xs sm:text-sm text-slate-400 flex items-center gap-2 mt-1">
              <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{attributes.NEIGHBORHOOD || 'Denver, CO'}</span>
              <span>&bull;</span>
              <span>Issued: {formatDate(attributes.DATE_ISSUED)} ({formatDaysAgo(attributes.DATE_ISSUED)})</span>
            </p>
          </div>

          <button
            id="btn-close-modal"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer shrink-0"
            title="Close dialog (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body with Scrollable Area */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* Street View / Map Interactive Viewer Section */}
          <div className="space-y-3">
            {/* View Selector Tabs */}
            <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('map')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                    activeTab === 'map'
                      ? 'bg-amber-500 text-slate-950 font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>FOSS OpenStreetMap (Parcel Zoom)</span>
                </button>
                <button
                  onClick={() => setActiveTab('streetview')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                    activeTab === 'streetview'
                      ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-slate-950 font-bold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>360° Street View & Pano</span>
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                    activeTab === 'history'
                      ? 'bg-amber-500 text-slate-950 font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Permit History ({historyPermits.length})</span>
                </button>
                <button
                  onClick={() => setActiveTab('raw')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                    activeTab === 'raw'
                      ? 'bg-amber-500 text-slate-950 font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5" />
                  <span>Accela Raw JSON</span>
                </button>
              </div>

              {/* Coordinates badge with copy */}
              {lat && lon && (
                <button
                  onClick={() =>
                    copyToClipboard(`${lat.toFixed(6)}, ${lon.toFixed(6)}`, 'coords')
                  }
                  className="flex items-center gap-1 text-[11px] font-mono text-slate-400 hover:text-amber-400 transition"
                  title="Copy lat/lon coordinates"
                >
                  {copiedCoords ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  <span>{lat.toFixed(5)}°, {lon.toFixed(5)}°</span>
                </button>
              )}
            </div>

            {/* Viewer Display Window */}
            <div className="relative rounded-xl border border-slate-800 overflow-hidden bg-slate-950 h-80 sm:h-96">
              {activeTab === 'map' && (
                <div ref={mapContainerRef} className="w-full h-full z-10" />
              )}

              {activeTab === 'streetview' && (
                <StreetView360PanoramaViewer permit={permit} />
              )}

              {activeTab === 'history' && (
                <div className="w-full h-full overflow-y-auto p-4 space-y-3 bg-slate-900/90">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Permit Archive for Address & Parcel
                  </h3>
                  {isLoadingHistory ? (
                    <p className="text-xs text-slate-400">Loading permit history from Accela database...</p>
                  ) : historyPermits.length === 0 ? (
                    <p className="text-xs text-slate-400">No prior permits recorded for this parcel.</p>
                  ) : (
                    historyPermits.map((hist, idx) => (
                      <div
                        key={hist.attributes.OBJECTID || idx}
                        className="p-3 rounded-lg bg-slate-800/80 border border-slate-700 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-amber-400">
                              {hist.attributes.PERMIT_NUM}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-slate-700 text-[10px] text-slate-300">
                              {hist.attributes.CLASS || 'Demo'}
                            </span>
                          </div>
                          <p className="text-slate-300 mt-1">
                            Contractor: {hist.attributes.CONTRACTOR_NAME || 'Owner'}
                          </p>
                        </div>
                        <div className="text-right sm:text-right">
                          <p className="font-semibold text-emerald-400">
                            {formatCurrency(hist.attributes.VALUATION)}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            Issued: {formatDate(hist.attributes.DATE_ISSUED)}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'raw' && (
                <div className="w-full h-full overflow-y-auto p-4 bg-slate-950 font-mono text-[11px] text-emerald-400">
                  <pre>{JSON.stringify(permit, null, 2)}</pre>
                </div>
              )}
            </div>

            {/* Clickable Links Banner (ALL NEW TAB) */}
            <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2.5">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-amber-400" />
                <span>Map & Street View Links (Opens in New Tab):</span>
              </span>

              <div className="flex flex-wrap items-center gap-2">
                {/* OpenStreetMap Link */}
                <a
                  href={links.osm}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 border border-emerald-500/30 text-xs font-medium transition cursor-pointer"
                  title="Open location in OpenStreetMap (FOSS)"
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>OpenStreetMap</span>
                  <ExternalLink className="w-3 h-3 ml-0.5" />
                </a>

                {/* Mapillary Street View Link */}
                <a
                  href={links.mapillaryStreetView}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30 text-xs font-medium transition cursor-pointer"
                  title="Open Mapillary Street View (FOSS)"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Mapillary FOSS</span>
                  <ExternalLink className="w-3 h-3 ml-0.5" />
                </a>

                {/* Google Maps Link */}
                <a
                  href={links.googleMaps}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 border border-blue-500/30 text-xs font-medium transition cursor-pointer"
                  title="Open Google Maps address search"
                >
                  <span>Google Maps</span>
                  <ExternalLink className="w-3 h-3 ml-0.5" />
                </a>

                {/* Denver Accela Citizen Access Link */}
                <a
                  href={links.accelaCitizenAccess}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 border border-purple-500/30 text-xs font-medium transition cursor-pointer"
                  title="Open Denver Accela ePermit record"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Accela Portal</span>
                  <ExternalLink className="w-3 h-3 ml-0.5" />
                </a>

                {/* Denver Property Assessor Link */}
                <a
                  href={links.denverAssessor}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600 text-xs font-medium transition cursor-pointer"
                  title="Open Denver Assessor real property search"
                >
                  <Building className="w-3.5 h-3.5" />
                  <span>Assessor</span>
                  <ExternalLink className="w-3 h-3 ml-0.5" />
                </a>
              </div>
            </div>
          </div>

          {/* Property Data Grid */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Property & Permitting Data
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              {/* Schedule / Parcel Number */}
              <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[11px]">Denver Parcel ID / SCHEDNUM</span>
                <span className="font-mono font-bold text-white text-sm">
                  {attributes.SCHEDNUM || 'Not assigned'}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  Official Assessor Property Schedule
                </span>
              </div>

              {/* Declared Valuation */}
              <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[11px]">Declared Demolition Valuation</span>
                <span className="font-bold text-emerald-400 text-sm">
                  {formatCurrency(attributes.VALUATION)}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  Fee Paid: {formatCurrency(attributes.PERMIT_FEE)}
                </span>
              </div>

              {/* Contractor Information */}
              <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[11px]">Contractor</span>
                <span className="font-semibold text-white text-sm truncate block">
                  {attributes.CONTRACTOR_NAME || 'Owner / Not Listed'}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  Auth Name: {attributes.BID_AUTHNAME || 'Standard'}
                </span>
              </div>

              {/* Demolition Class */}
              <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[11px]">Permit Classification</span>
                <span className="font-semibold text-amber-400 text-sm">
                  {attributes.CLASS || '6-Wreck'}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  Units affected: {attributes.UNITS || 'Single structure'}
                </span>
              </div>

              {/* Certificate of Occupancy */}
              <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[11px]">Certificate of Occupancy (CO)</span>
                <span className="font-semibold text-white text-sm">
                  {attributes.CO_REQUIRED || 'Not Required'}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  CO Date: {attributes.DATE_CO_ISSUED || 'None'}
                </span>
              </div>

              {/* Neighborhood */}
              <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[11px]">Denver Neighborhood</span>
                <span className="font-semibold text-white text-sm">
                  {attributes.NEIGHBORHOOD || 'Denver Metro'}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  Stat Code: {attributes.STAT_CODE_1 || 'General'}
                </span>
              </div>
            </div>
          </div>

          {/* Timeline & Processing Milestones */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Permit Lifecycle Milestones
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              {/* Application Received */}
              <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-800 flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                <div>
                  <span className="text-slate-400 block text-[11px]">Application Received</span>
                  <span className="font-medium text-slate-200">
                    {formatDate(attributes.DATE_RECEIVED)}
                  </span>
                </div>
              </div>

              {/* Permit Issued */}
              <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-800 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                <div>
                  <span className="text-slate-400 block text-[11px]">Permit Issued</span>
                  <span className="font-medium text-slate-200">
                    {formatDate(attributes.DATE_ISSUED)}
                  </span>
                </div>
              </div>

              {/* Final / Status */}
              <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-800 flex items-start gap-2.5">
                <Calendar className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
                <div>
                  <span className="text-slate-400 block text-[11px]">Final Date / Status</span>
                  <span className="font-medium text-slate-200">
                    {attributes.FINAL_DATE ? formatDate(attributes.FINAL_DATE) : 'Active / In Progress'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Denver Community Planning and Development &bull; Accela Platform</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs border border-slate-700 transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
