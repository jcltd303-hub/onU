import React, { useEffect, useRef, useState } from 'react';
import { DemolitionPermit } from '../types';
import {
  formatCurrency,
  formatDate,
  formatDaysAgo,
  getOsmTileUrl,
  getPermitLinks,
} from '../services/accelaService';
import L from 'leaflet';
import {
  Layers,
  Flame,
  Camera,
  Maximize2,
  ExternalLink,
  Sparkles,
  Sliders,
  Eye,
  EyeOff,
  MapPin,
} from 'lucide-react';

// Setup leaflet.heat for browser runtime
if (typeof window !== 'undefined' && !(window as unknown as { L: typeof L }).L) {
  (window as unknown as { L: typeof L }).L = L;
}
import 'leaflet.heat';

interface MapViewProps {
  permits: DemolitionPermit[];
  onSelectPermit: (permit: DemolitionPermit) => void;
}

/**
 * Calculates permit age in days relative to current time
 */
function getPermitAgeDays(dateIssued: number | null): number {
  if (!dateIssued) return 90;
  const now = Date.now();
  const diffMs = Math.max(0, now - dateIssued);
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Get color corresponding to permit age
 */
function getAgeColor(ageDays: number): {
  hex: string;
  label: string;
  badgeBg: string;
  badgeText: string;
} {
  if (ageDays <= 14) {
    return {
      hex: '#ef4444', // Hot red/coral
      label: 'Fresh (< 14d)',
      badgeBg: 'bg-rose-500/20 border-rose-500/40',
      badgeText: 'text-rose-400',
    };
  }
  if (ageDays <= 30) {
    return {
      hex: '#f97316', // Orange
      label: '15 – 30d',
      badgeBg: 'bg-orange-500/20 border-orange-500/40',
      badgeText: 'text-orange-400',
    };
  }
  if (ageDays <= 60) {
    return {
      hex: '#eab308', // Amber / Gold
      label: '31 – 60d',
      badgeBg: 'bg-amber-500/20 border-amber-500/40',
      badgeText: 'text-amber-400',
    };
  }
  return {
    hex: '#3b82f6', // Blue / Cool
    label: '61 – 90d+',
    badgeBg: 'bg-blue-500/20 border-blue-500/40',
    badgeText: 'text-blue-400',
  };
}

export const MapView: React.FC<MapViewProps> = ({ permits, onSelectPermit }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const heatLayerRef = useRef<L.Layer | null>(null);
  const ageHalosLayerRef = useRef<L.LayerGroup | null>(null);

  // Layer Visibility & Configuration States
  const [showThumbnails, setShowThumbnails] = useState(true);
  const [scaleByAge, setScaleByAge] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showAgeHalos, setShowAgeHalos] = useState(false);
  const [mapStyle, setMapStyle] = useState<'voyager' | 'dark' | 'osm'>('voyager');
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (leafletMapRef.current) {
      leafletMapRef.current.remove();
      leafletMapRef.current = null;
    }

    // Centered over Denver
    const map = L.map(mapContainerRef.current, {
      center: [39.7392, -104.9903],
      zoom: 12,
      zoomControl: true,
    });

    const tileUrl =
      mapStyle === 'dark'
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : mapStyle === 'osm'
        ? 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
        : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

    const tileLayer = L.tileLayer(tileUrl, {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">CARTO</a>',
    }).addTo(map);

    tileLayerRef.current = tileLayer;

    // Layer groups for markers, heatmap, and halos
    const markersGroup = L.layerGroup().addTo(map);
    const halosGroup = L.layerGroup().addTo(map);
    markersLayerRef.current = markersGroup;
    ageHalosLayerRef.current = halosGroup;

    leafletMapRef.current = map;

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [mapStyle]);

  // Update Age Heatmap Layer
  useEffect(() => {
    const map = leafletMapRef.current;
    if (!map) return;

    // Remove existing heatmap layer if any
    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current);
      heatLayerRef.current = null;
    }

    if (!showHeatmap || permits.length === 0) return;

    // Construct heat data points with age intensity
    // Newer permits have high intensity (up to 1.0), older permits have lower intensity
    const heatPoints: [number, number, number][] = [];

    permits.forEach((permit) => {
      const lat = permit.geometry?.y;
      const lon = permit.geometry?.x;
      if (!lat || !lon) return;

      const ageDays = getPermitAgeDays(permit.attributes.DATE_ISSUED);
      // Intensity: 1.0 (fresh) down to 0.25 (90 days old)
      const intensity = Math.max(0.2, 1 - (Math.min(ageDays, 90) / 90) * 0.8);
      heatPoints.push([lat, lon, intensity]);
    });

    try {
      // Create colored heatmap by age with custom gradient
      // Blue/cyan for older permits, yellow/orange for mid-age, hot red/coral for freshest permits
      const heat = (L as unknown as { heatLayer: (latlngs: [number, number, number][], options: Record<string, unknown>) => L.Layer }).heatLayer(
        heatPoints,
        {
          radius: 28,
          blur: 20,
          maxZoom: 15,
          max: 1.0,
          minOpacity: 0.35,
          gradient: {
            0.15: '#3b82f6', // Blue (60 - 90d+)
            0.35: '#06b6d4', // Cyan
            0.55: '#eab308', // Amber / Gold (30 - 60d)
            0.75: '#f97316', // Orange (15 - 30d)
            1.0: '#ef4444',  // Hot Crimson (0 - 14d freshest)
          },
        }
      );

      heat.addTo(map);
      heatLayerRef.current = heat;
    } catch (err) {
      console.warn('Leaflet heatLayer error:', err);
    }
  }, [permits, showHeatmap]);

  // Update Age Halos & Markers (Thumbnails scaled by age)
  useEffect(() => {
    const map = leafletMapRef.current;
    const markersGroup = markersLayerRef.current;
    const halosGroup = ageHalosLayerRef.current;
    if (!map || !markersGroup || !halosGroup) return;

    markersGroup.clearLayers();
    halosGroup.clearLayers();

    const bounds = L.latLngBounds([]);

    permits.forEach((permit) => {
      const lat = permit.geometry?.y;
      const lon = permit.geometry?.x;
      if (!lat || !lon) return;

      bounds.extend([lat, lon]);

      const ageDays = getPermitAgeDays(permit.attributes.DATE_ISSUED);
      const ageColorInfo = getAgeColor(ageDays);

      // --- 1. AGE-BASED THUMBNAIL SIZING CALCULATION ---
      // Fresh (<14d): ~46px (large, prominent)
      // Mid (15-45d): ~32px
      // Older (>45d): ~20px (compact)
      const scale = scaleByAge
        ? Math.max(0.42, 1 - (Math.min(ageDays, 90) / 90) * 0.58)
        : 0.75;

      const markerSize = Math.round(48 * scale);
      const thumbUrl = getOsmTileUrl(lat, lon, 18);
      const isFresh = ageDays <= 14;

      // Optional luminous halo around the permit
      if (showAgeHalos) {
        const haloRadius = Math.max(15, Math.round(35 * scale));
        const circle = L.circle([lat, lon], {
          radius: haloRadius,
          color: ageColorInfo.hex,
          fillColor: ageColorInfo.hex,
          fillOpacity: 0.22,
          weight: 1.5,
        });
        halosGroup.addLayer(circle);
      }

      if (showThumbnails) {
        // Thumbnail Marker scaled by age
        const markerHtml = `
          <div style="
            position: relative;
            width: ${markerSize}px;
            height: ${markerSize}px;
            cursor: pointer;
            transition: transform 0.2s ease;
          " class="group-map-thumb">
            ${
              isFresh
                ? `<span style="
                    position: absolute;
                    inset: -4px;
                    border-radius: 9999px;
                    background-color: ${ageColorInfo.hex};
                    opacity: 0.4;
                    animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
                   "></span>`
                : ''
            }
            <div style="
              width: 100%;
              height: 100%;
              border-radius: ${scale < 0.6 ? '50%' : '8px'};
              overflow: hidden;
              border: ${isFresh ? '3px' : '2px'} solid ${ageColorInfo.hex};
              box-shadow: 0 4px 10px rgba(0,0,0,0.5);
              background-color: #0f172a;
              position: relative;
            ">
              <img
                src="${thumbUrl}"
                alt=""
                style="width: 100%; height: 100%; object-fit: cover; filter: contrast(1.1);"
                onerror="this.style.display='none'"
              />
              ${
                markerSize >= 32
                  ? `<div style="
                      position: absolute;
                      bottom: 0;
                      left: 0;
                      right: 0;
                      background: rgba(0,0,0,0.75);
                      color: #fff;
                      font-size: 8px;
                      font-family: monospace;
                      text-align: center;
                      padding: 1px 0;
                      white-space: nowrap;
                      overflow: hidden;
                    ">
                      360° &bull; ${ageDays}d
                    </div>`
                  : ''
              }
            </div>
            ${
              isFresh && markerSize >= 38
                ? `<span style="
                    position: absolute;
                    top: -6px;
                    right: -6px;
                    background: #ef4444;
                    color: white;
                    font-size: 8px;
                    font-weight: 800;
                    padding: 1px 4px;
                    border-radius: 4px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.4);
                  ">360° NEW</span>`
                : ''
            }
          </div>
        `;

        const customMarkerIcon = L.divIcon({
          className: 'custom-scaled-thumbnail-marker',
          html: markerHtml,
          iconSize: [markerSize, markerSize],
          iconAnchor: [markerSize / 2, markerSize / 2],
        });

        const marker = L.marker([lat, lon], {
          icon: customMarkerIcon,
          zIndexOffset: isFresh ? 1000 : Math.round((90 - ageDays) * 10),
        });

        // Popup with details
        const links = getPermitLinks(permit);
        const popupContent = document.createElement('div');
        popupContent.className = 'p-1 font-sans text-slate-800';
        popupContent.style.width = '240px';

        popupContent.innerHTML = `
          <div style="border-radius: 8px; overflow: hidden; margin-bottom: 8px; height: 105px; background: #1e293b; position: relative;">
            <img src="${thumbUrl}" alt="${permit.attributes.ADDRESS}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.style.display='none'" />
            <div style="position: absolute; top: 4px; left: 4px; background: #ea580c; color: #fff; font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 4px; display: flex; align-items: center; gap: 4px;">
              <span>360° Street View</span>
            </div>
            <div style="position: absolute; bottom: 4px; left: 4px; background: rgba(0,0,0,0.75); color: #fff; font-size: 8px; padding: 2px 5px; border-radius: 3px;">
              ${ageDays}d ago &bull; Scale: ${Math.round(scale * 100)}%
            </div>
          </div>
          <div style="font-weight: bold; font-size: 13px; color: #0f172a; margin-bottom: 2px; line-height: 1.2;">
            ${permit.attributes.ADDRESS}
          </div>
          <div style="font-size: 11px; color: #64748b; margin-bottom: 6px;">
            ${permit.attributes.NEIGHBORHOOD || 'Denver'} &bull; ${permit.attributes.PERMIT_NUM}
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 8px; background: #f1f5f9; padding: 4px 6px; border-radius: 4px;">
            <span><strong>Val:</strong> ${formatCurrency(permit.attributes.VALUATION)}</span>
            <span><strong>Date:</strong> ${formatDate(permit.attributes.DATE_ISSUED)}</span>
          </div>
          <div style="display: flex; gap: 4px; margin-bottom: 6px;">
            <a href="${links.googleStreetView}" target="_blank" rel="noopener noreferrer" style="
              flex: 1;
              text-align: center;
              padding: 4px;
              background: #2563eb;
              color: white;
              text-decoration: none;
              border-radius: 4px;
              font-size: 10px;
              font-weight: 600;
            ">
              Google 360° &UpperRightArrow;
            </a>
            <a href="${links.mapillaryStreetView}" target="_blank" rel="noopener noreferrer" style="
              flex: 1;
              text-align: center;
              padding: 4px;
              background: #d97706;
              color: white;
              text-decoration: none;
              border-radius: 4px;
              font-size: 10px;
              font-weight: 600;
            ">
              Mapillary 360° &UpperRightArrow;
            </a>
          </div>
          <button id="map-thumb-popup-btn-${permit.attributes.OBJECTID}" style="
            width: 100%;
            padding: 6px;
            background: #0f172a;
            color: #ffffff;
            border: 1px solid #334155;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 600;
            cursor: pointer;
          ">
            Open 360° Panorama & Details
          </button>
        `;

        marker.bindPopup(popupContent);

        marker.on('popupopen', () => {
          const btn = document.getElementById(
            `map-thumb-popup-btn-${permit.attributes.OBJECTID}`
          );
          if (btn) {
            btn.onclick = () => onSelectPermit(permit);
          }
        });

        markersGroup.addLayer(marker);
      }
    });

    // Fit bounds on initial load or count change
    if (permits.length > 0 && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [permits, showThumbnails, scaleByAge, showAgeHalos, onSelectPermit]);

  return (
    <div className="relative w-full h-[680px] bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-md flex flex-col">
      {/* Top Map Layer Control Bar */}
      <div className="p-3 bg-slate-900/95 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 z-20 text-xs text-slate-200 backdrop-blur-sm">
        {/* Layer Toggles */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Age Scaled Thumbnails Toggle */}
          <button
            id="btn-toggle-thumbnails"
            onClick={() => setShowThumbnails(!showThumbnails)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-medium transition cursor-pointer ${
              showThumbnails
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
            }`}
            title="Toggle street view thumbnails on map"
          >
            <Camera className="w-3.5 h-3.5 text-amber-400" />
            <span>Thumbnails</span>
            {showThumbnails ? <Eye className="w-3 h-3 ml-0.5" /> : <EyeOff className="w-3 h-3 ml-0.5" />}
          </button>

          {/* Scale by Age Toggle */}
          <button
            id="btn-toggle-scale-age"
            onClick={() => setScaleByAge(!scaleByAge)}
            disabled={!showThumbnails}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-medium transition cursor-pointer disabled:opacity-40 ${
              scaleByAge
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
            }`}
            title="Scale thumbnail sizes: newest permits are largest"
          >
            <Sliders className="w-3.5 h-3.5 text-rose-400" />
            <span>Scale by Age ({scaleByAge ? 'Newest=Largest' : 'Fixed'})</span>
          </button>

          {/* Colored Heatmap by Age Toggle */}
          <button
            id="btn-toggle-heatmap"
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-medium transition cursor-pointer ${
              showHeatmap
                ? 'bg-gradient-to-r from-blue-500/20 via-amber-500/20 to-rose-500/20 text-white border-amber-500/40 font-semibold'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
            }`}
            title="Toggle colored heatmap layer by permit age"
          >
            <Flame className={`w-3.5 h-3.5 ${showHeatmap ? 'text-rose-400' : 'text-slate-400'}`} />
            <span>Age Heatmap Layer</span>
            {showHeatmap && <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />}
          </button>

          {/* Age Halos Toggle */}
          <button
            id="btn-toggle-halos"
            onClick={() => setShowAgeHalos(!showAgeHalos)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border font-medium transition cursor-pointer ${
              showAgeHalos
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
            }`}
            title="Toggle radial age halos around locations"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Age Halos</span>
          </button>
        </div>

        {/* Map Base Tile Style Selector */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-slate-400 hidden sm:inline">Base:</span>
          <select
            value={mapStyle}
            onChange={(e) => setMapStyle(e.target.value as 'voyager' | 'dark' | 'osm')}
            className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-md px-2 py-1 focus:outline-none focus:border-amber-500"
          >
            <option value="voyager">CARTO Voyager (Light)</option>
            <option value="dark">CARTO Dark Matter (Night)</option>
            <option value="osm">Standard OpenStreetMap</option>
          </select>
        </div>
      </div>

      {/* Map Canvas Container */}
      <div className="relative flex-1 w-full h-full">
        <div ref={mapContainerRef} className="w-full h-full z-10" />

        {/* Floating Combined Legends: Age-Scaled Thumbnails + Colored Heatmap */}
        <div className="absolute bottom-4 left-4 z-20 flex flex-col sm:flex-row gap-2.5 pointer-events-auto max-w-full sm:max-w-xl">
          {/* Age Size Scaling Legend */}
          {showThumbnails && scaleByAge && (
            <div className="bg-slate-900/95 border border-slate-800 backdrop-blur-md p-3 rounded-xl text-xs text-slate-200 shadow-xl space-y-1.5">
              <p className="font-bold text-white text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-amber-400" />
                <span>Thumbnail Size by Age</span>
              </p>

              <div className="flex items-center gap-2 pt-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-7 h-7 rounded-md border-2 border-rose-500 bg-slate-800 flex items-center justify-center text-[9px] font-bold text-rose-400">
                    48px
                  </span>
                  <span className="text-[11px] text-slate-300">&lt; 14 days (Fresh)</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-md border-2 border-amber-500 bg-slate-800 flex items-center justify-center text-[8px] font-bold text-amber-400">
                    32px
                  </span>
                  <span className="text-[11px] text-slate-300">15 – 45 days</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded-full border border-blue-400 bg-slate-800 flex items-center justify-center text-[7px] text-blue-400">
                    &bull;
                  </span>
                  <span className="text-[11px] text-slate-400">46 – 90+ days</span>
                </div>
              </div>
            </div>
          )}

          {/* Colored Heatmap Legend */}
          {showHeatmap && (
            <div className="bg-slate-900/95 border border-slate-800 backdrop-blur-md p-3 rounded-xl text-xs text-slate-200 shadow-xl space-y-2">
              <p className="font-bold text-white text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-rose-400" />
                <span>Age Heatmap Gradient</span>
              </p>

              {/* Gradient Bar */}
              <div className="w-48 h-3 rounded-full bg-gradient-to-r from-blue-500 via-amber-400 to-rose-500 border border-slate-700 shadow-inner" />

              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span className="text-blue-400 font-medium">60 – 90d (Older)</span>
                <span className="text-amber-300 font-medium">30d</span>
                <span className="text-rose-400 font-bold">0 – 14d (Newest)</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
