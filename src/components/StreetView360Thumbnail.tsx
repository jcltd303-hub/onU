import React, { useState, useRef, useEffect, useCallback } from 'react';
import { DemolitionPermit } from '../types';
import {
  getOsmTileUrl,
  getCartoTileUrl,
  getPermitLinks,
  getGoogleStreetViewEmbedUrl,
} from '../services/accelaService';
import {
  Camera,
  Compass,
  Play,
  Pause,
  Maximize2,
  ExternalLink,
  RotateCcw,
  Sparkles,
  Key,
  Globe,
} from 'lucide-react';

interface StreetView360ThumbnailProps {
  permit: DemolitionPermit;
  className?: string;
  onExpand?: () => void;
  interactive?: boolean;
  defaultAutoRotate?: boolean;
}

/**
 * Returns cardinal compass direction label from degree (0 - 360)
 */
function getCardinalDirection(deg: number): string {
  const directions = [
    'N',
    'NNE',
    'NE',
    'ENE',
    'E',
    'ESE',
    'SE',
    'SSE',
    'S',
    'SSW',
    'SW',
    'WSW',
    'W',
    'WNW',
    'NW',
    'NNW',
  ];
  const idx = Math.round(((deg % 360) / 22.5)) % 16;
  return directions[idx];
}

export const StreetView360Thumbnail: React.FC<StreetView360ThumbnailProps> = ({
  permit,
  className = 'h-48',
  onExpand,
  interactive = true,
  defaultAutoRotate = false,
}) => {
  const { attributes, geometry } = permit;
  const lat = geometry?.y;
  const lon = geometry?.x;

  const [heading, setHeading] = useState(45); // 0 - 360 deg
  const [pitch, setPitch] = useState(0); // -15 to +15 deg
  const [isDragging, setIsDragging] = useState(false);
  const [isAutoRotating, setIsAutoRotating] = useState(defaultAutoRotate);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [activeMode, setActiveMode] = useState<'360_pano' | 'google_360' | 'map'>('360_pano');
  const [showKeyInput, setShowKeyInput] = useState(false);

  // Retrieve Google Maps API key from env or localStorage
  const [apiKey, setApiKey] = useState<string>(() => {
    return (
      (typeof window !== 'undefined' && localStorage.getItem('gmp_api_key')) ||
      (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) ||
      ''
    );
  });
  const [tempKey, setTempKey] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; y: number; initialHeading: number; initialPitch: number }>({
    x: 0,
    y: 0,
    initialHeading: 45,
    initialPitch: 0,
  });

  const links = getPermitLinks(permit);

  // High-zoom street/parcel tile
  const primaryTileUrl = lat && lon ? getOsmTileUrl(lat, lon, 18) : '';
  const cartoTileUrl = lat && lon ? getCartoTileUrl(lat, lon, 18) : '';

  // Calculate multi-angle offsets around property coordinates
  const angleRad = (heading * Math.PI) / 180;
  const offsetLat = (lat || 39.7392) + Math.cos(angleRad) * 0.00015;
  const offsetLon = (lon || -104.9903) + Math.sin(angleRad) * 0.00015;
  const perspectiveTileUrl = getOsmTileUrl(offsetLat, offsetLon, 18);

  // Auto-rotation loop
  useEffect(() => {
    if (!isAutoRotating || isDragging || activeMode !== '360_pano') return;

    const interval = setInterval(() => {
      setHeading((prev) => (prev + 0.75) % 360);
    }, 40);

    return () => clearInterval(interval);
  }, [isAutoRotating, isDragging, activeMode]);

  // Mouse & Touch Drag Handlers for 360-degree rotation
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!interactive || activeMode !== '360_pano') return;
    setIsDragging(true);
    setIsAutoRotating(false);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      initialHeading: heading,
      initialPitch: pitch,
    };
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!interactive || activeMode !== '360_pano' || e.touches.length === 0) return;
    setIsDragging(true);
    setIsAutoRotating(false);
    dragStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      initialHeading: heading,
      initialPitch: pitch,
    };
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - dragStartRef.current.x;
      const deltaY = e.clientY - dragStartRef.current.y;

      const newHeading = (dragStartRef.current.initialHeading - deltaX * 0.6 + 3600) % 360;
      const newPitch = Math.max(-18, Math.min(18, dragStartRef.current.initialPitch + deltaY * 0.2));

      setHeading(newHeading);
      setPitch(newPitch);
    },
    [isDragging]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isDragging || e.touches.length === 0) return;
      const deltaX = e.touches[0].clientX - dragStartRef.current.x;
      const deltaY = e.touches[0].clientY - dragStartRef.current.y;

      const newHeading = (dragStartRef.current.initialHeading - deltaX * 0.6 + 3600) % 360;
      const newPitch = Math.max(-18, Math.min(18, dragStartRef.current.initialPitch + deltaY * 0.2));

      setHeading(newHeading);
      setPitch(newPitch);
    },
    [isDragging]
  );

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleDragEnd);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleDragEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleDragEnd);
    };
  }, [isDragging, handleMouseMove, handleTouchMove, handleDragEnd]);

  const handleSaveKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window !== 'undefined') {
      localStorage.setItem('gmp_api_key', tempKey.trim());
    }
    setApiKey(tempKey.trim());
    setShowKeyInput(false);
  };

  // Normalized panorama offset percentage for cylindrical horizontal background shifting
  const panoOffsetPercent = ((heading % 360) / 360) * 100;
  const cardinal = getCardinalDirection(heading);

  const googleEmbedUrl =
    lat && lon && apiKey
      ? getGoogleStreetViewEmbedUrl(lat, lon, apiKey, heading, pitch, 90)
      : '';

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      className={`relative w-full ${className} bg-slate-950 overflow-hidden select-none group/pano ${
        activeMode === '360_pano' ? 'cursor-grab active:cursor-grabbing' : ''
      }`}
      title={
        activeMode === '360_pano'
          ? 'Click and drag horizontally to rotate 360° around this property'
          : 'Street view thumbnail'
      }
    >
      {/* 1. Interactive 360° Panorama Mode */}
      {activeMode === '360_pano' && (
        <div className="absolute inset-0 overflow-hidden">
          {/* Panoramic Cylinder Wrap Container */}
          <div
            className="absolute -inset-x-24 -inset-y-12 transition-transform ease-out"
            style={{
              transform: `perspective(600px) rotateX(${pitch}deg) rotateY(${Math.sin(angleRad) * 4}deg) scale(1.15)`,
            }}
          >
            <div
              className="w-[200%] h-full flex"
              style={{
                transform: `translateX(-${panoOffsetPercent / 2}%)`,
                transition: isDragging ? 'none' : 'transform 0.1s linear',
              }}
            >
              <div className="w-1/2 h-full relative">
                <img
                  src={primaryTileUrl}
                  alt={attributes.ADDRESS}
                  className="w-full h-full object-cover filter contrast-110 brightness-95"
                  onLoad={() => setImageLoaded(true)}
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-sky-950/40" />
              </div>
              <div className="w-1/2 h-full relative">
                <img
                  src={perspectiveTileUrl || primaryTileUrl}
                  alt={attributes.ADDRESS}
                  className="w-full h-full object-cover filter contrast-110 brightness-95"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-sky-950/40" />
              </div>
            </div>
          </div>

          {/* Panoramic Horizon & Street Grid Guide Overlay */}
          <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-2">
            {/* 360 Degree Compass Ruler Tape (Top) */}
            <div className="w-full h-5 bg-slate-950/70 backdrop-blur-sm rounded-md border border-slate-700/60 overflow-hidden relative flex items-center justify-center">
              <div
                className="flex items-center gap-6 font-mono text-[9px] text-slate-400 absolute"
                style={{
                  transform: `translateX(${-((heading / 360) * 300) + 150}px)`,
                  transition: isDragging ? 'none' : 'transform 0.1s linear',
                }}
              >
                <span className="font-bold text-amber-400">N (0°)</span>
                <span>NE (45°)</span>
                <span className="font-bold text-emerald-400">E (90°)</span>
                <span>SE (135°)</span>
                <span className="font-bold text-blue-400">S (180°)</span>
                <span>SW (225°)</span>
                <span className="font-bold text-rose-400">W (270°)</span>
                <span>NW (315°)</span>
                <span className="font-bold text-amber-400">N (360°)</span>
              </div>
              <div className="w-1.5 h-3 bg-rose-500 rounded-full z-10 shadow-sm" />
            </div>

            {/* Central 360 Reticle */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative flex items-center justify-center">
                <span className="w-8 h-8 rounded-full border border-amber-400/60 border-dashed animate-spin-slow" />
                <span className="w-3 h-3 rounded-full bg-amber-500/80 border border-white shadow-md" />
                {!isDragging && (
                  <span className="absolute -bottom-6 px-2 py-0.5 rounded-full bg-slate-950/90 text-amber-300 text-[9px] font-sans whitespace-nowrap border border-amber-500/40 shadow-sm backdrop-blur-sm opacity-90 group-hover/pano:opacity-100 transition-opacity">
                    Drag &harr; to rotate 360°
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Google Maps Street View 360 Mode */}
      {activeMode === 'google_360' && (
        <div className="absolute inset-0 w-full h-full bg-slate-950">
          {apiKey ? (
            /* Live Google Maps Embed API Street View 360 */
            <iframe
              title={`Google Street View 360 for ${attributes.ADDRESS}`}
              src={googleEmbedUrl}
              className="w-full h-full border-0"
              loading="lazy"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          ) : (
            /* Direct Google Maps 360 Launcher & API Key Helper */
            <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-slate-900/95 relative">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 border border-blue-400/40 flex items-center justify-center text-blue-400 mb-2">
                <Globe className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-bold text-white mb-1">
                Google Maps Street View 360°
              </h4>
              <p className="text-[11px] text-slate-400 max-w-[240px] mb-3">
                Launch the exact 360° Street View panorama for {attributes.ADDRESS}:
              </p>

              <div className="flex flex-col gap-1.5 w-full max-w-[200px]">
                <a
                  href={links.googleStreetView}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition cursor-pointer"
                >
                  <span>Open in Google 360°</span>
                  <ExternalLink className="w-3 h-3" />
                </a>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowKeyInput(true);
                  }}
                  className="flex items-center justify-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] border border-slate-700 transition cursor-pointer"
                >
                  <Key className="w-2.5 h-2.5 text-amber-400" />
                  <span>Embed Inline (Key)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. 2D Parcel Ortho Map Mode */}
      {activeMode === 'map' && (
        <div className="w-full h-full relative">
          <img
            src={cartoTileUrl || primaryTileUrl}
            alt={attributes.ADDRESS}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-slate-950/20" />
        </div>
      )}

      {/* API Key Modal Overlay */}
      {showKeyInput && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute inset-0 z-30 bg-slate-950/95 p-3 flex flex-col justify-center items-center text-center"
        >
          <h4 className="text-xs font-bold text-white mb-1">Google Maps Platform Key</h4>
          <p className="text-[10px] text-slate-400 mb-2">
            Paste your Maps API key or Demo Key to enable inline Google 360° embeds:
          </p>
          <form onSubmit={handleSaveKey} className="w-full max-w-[230px] space-y-2">
            <input
              type="text"
              value={tempKey}
              onChange={(e) => setTempKey(e.target.value)}
              placeholder="Paste AI Studio or GMP Key..."
              className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-white placeholder:text-slate-500 font-mono focus:border-blue-500 focus:outline-none"
            />
            <div className="flex gap-2 justify-center">
              <button
                type="submit"
                className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold cursor-pointer"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setShowKeyInput(false)}
                className="px-3 py-1 bg-slate-800 text-slate-400 hover:text-white rounded text-xs cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Top Controls Overlay */}
      <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-auto z-10">
        {/* 360° Mode Indicator & Heading */}
        <div className="flex items-center gap-1.5">
          <div
            className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-white text-[10px] font-bold shadow-md border backdrop-blur-sm ${
              activeMode === 'google_360'
                ? 'bg-blue-600 border-blue-400/40'
                : 'bg-gradient-to-r from-amber-600 to-rose-600 border-amber-400/40'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
            <span>{activeMode === 'google_360' ? 'GOOGLE 360°' : '360° STREET VIEW'}</span>
          </div>

          {activeMode === '360_pano' && (
            <span className="px-1.5 py-0.5 rounded bg-slate-950/85 text-amber-300 text-[10px] font-mono border border-slate-700 backdrop-blur-sm">
              {Math.round(heading)}° {cardinal}
            </span>
          )}
        </div>

        {/* Mode Switchers: 360 Pano | Google 360 | 2D Map */}
        <div className="flex items-center gap-1 bg-slate-950/85 p-0.5 rounded-lg border border-slate-800 backdrop-blur-sm">
          {activeMode === '360_pano' && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsAutoRotating(!isAutoRotating);
              }}
              className={`p-1 rounded text-[10px] transition cursor-pointer ${
                isAutoRotating
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
              title={isAutoRotating ? 'Pause 360° auto-rotation' : 'Play 360° auto-rotation'}
            >
              {isAutoRotating ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            </button>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActiveMode('360_pano');
            }}
            className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition cursor-pointer ${
              activeMode === '360_pano'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Interactive 360° Street View Panorama"
          >
            360° Pano
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActiveMode('google_360');
            }}
            className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition cursor-pointer ${
              activeMode === 'google_360'
                ? 'bg-blue-600 text-white font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Google Maps Street View 360° mode"
          >
            Google 360°
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActiveMode('map');
            }}
            className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition cursor-pointer ${
              activeMode === 'map'
                ? 'bg-slate-700 text-white font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
            title="2D Parcel Map Orthophoto"
          >
            2D Map
          </button>
        </div>
      </div>

      {/* Bottom Floating Quick Actions: Open 360° External & Expand */}
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between pointer-events-auto z-10 text-[10px]">
        {/* Quick Launch Direct Google 360 / Mapillary 360 */}
        <div className="flex items-center gap-1">
          <a
            href={links.googleStreetView}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-blue-600/90 hover:bg-blue-500 text-white font-medium border border-blue-400/40 shadow-sm transition cursor-pointer backdrop-blur-sm"
            title="Open interactive Google Maps Street View 360° in new tab"
          >
            <span>Google 360°</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </a>

          <a
            href={links.mapillaryStreetView}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-950/85 hover:bg-amber-600 text-slate-200 hover:text-white border border-slate-700 transition cursor-pointer backdrop-blur-sm"
            title="Open FOSS Mapillary 360° Street View in new tab"
          >
            <span>Mapillary 360°</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>

        {/* Expand Details Trigger */}
        {onExpand && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onExpand();
            }}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold shadow-sm transition cursor-pointer"
            title="Expand into full detailed viewer and permit history"
          >
            <Maximize2 className="w-3 h-3" />
            <span>Expand</span>
          </button>
        )}
      </div>

      {/* Rotating Compass Indicator in bottom right corner (in 360_pano mode) */}
      {activeMode === '360_pano' && (
        <div
          className="absolute bottom-2 right-2 w-7 h-7 rounded-full bg-slate-950/90 border border-slate-700 flex items-center justify-center pointer-events-none transition-transform shadow-md hidden sm:flex"
          style={{
            transform: `rotate(${heading}deg)`,
          }}
        >
          <div className="w-0.5 h-4 bg-gradient-to-b from-rose-500 to-slate-400 rounded-full" />
        </div>
      )}
    </div>
  );
};

