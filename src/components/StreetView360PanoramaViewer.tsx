import React, { useState, useRef, useEffect, useCallback } from 'react';
import { DemolitionPermit } from '../types';
import {
  getOsmTileUrl,
  getCartoTileUrl,
  getPermitLinks,
} from '../services/accelaService';
import {
  Compass,
  RotateCw,
  Play,
  Pause,
  ExternalLink,
  Camera,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Navigation,
} from 'lucide-react';

interface StreetView360PanoramaViewerProps {
  permit: DemolitionPermit;
}

export const StreetView360PanoramaViewer: React.FC<StreetView360PanoramaViewerProps> = ({
  permit,
}) => {
  const { attributes, geometry } = permit;
  const lat = geometry?.y;
  const lon = geometry?.x;

  const [heading, setHeading] = useState(0); // 0 - 360
  const [pitch, setPitch] = useState(0); // -25 to +25
  const [fov, setFov] = useState(80); // 50 to 110 (Field of View zoom)
  const [isAutoRotating, setIsAutoRotating] = useState(true);
  const [isDragging, setIsDragging] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; y: number; initialHeading: number; initialPitch: number }>({
    x: 0,
    y: 0,
    initialHeading: 0,
    initialPitch: 0,
  });

  const links = getPermitLinks(permit);

  // Preload tiles from North, East, South, West bearings around parcel
  const tilesRef = useRef<HTMLImageElement[]>([]);

  useEffect(() => {
    if (!lat || !lon) return;

    const bearings = [0, 90, 180, 270];
    const loadedImages: HTMLImageElement[] = [];

    bearings.forEach((b) => {
      const rad = (b * Math.PI) / 180;
      const offLat = lat + Math.cos(rad) * 0.00018;
      const offLon = lon + Math.sin(rad) * 0.00018;
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = getOsmTileUrl(offLat, offLon, 18);
      img.onload = () => {
        // Redraw canvas
      };
      loadedImages.push(img);
    });

    tilesRef.current = loadedImages;
  }, [lat, lon]);

  // Auto-rotate effect
  useEffect(() => {
    if (!isAutoRotating || isDragging) return;
    const interval = setInterval(() => {
      setHeading((prev) => (prev + 0.5) % 360);
    }, 30);
    return () => clearInterval(interval);
  }, [isAutoRotating, isDragging]);

  // Draw 360 Panorama to Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Sky gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, height / 2 + pitch * 3);
    skyGrad.addColorStop(0, '#0f172a');
    skyGrad.addColorStop(0.5, '#1e293b');
    skyGrad.addColorStop(1, '#334155');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, height / 2 + pitch * 3);

    // Ground / Road gradient
    const groundGrad = ctx.createLinearGradient(0, height / 2 + pitch * 3, 0, height);
    groundGrad.addColorStop(0, '#1e293b');
    groundGrad.addColorStop(0.3, '#090d16');
    groundGrad.addColorStop(1, '#020617');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, height / 2 + pitch * 3, width, height / 2 - pitch * 3);

    // Road markings & perspective grid
    const horizonY = height / 2 + pitch * 3;
    ctx.strokeStyle = 'rgba(217, 119, 6, 0.4)';
    ctx.lineWidth = 2;

    // Draw panoramic imagery bands across the 360 degree space
    const tileWidth = width * (fov / 60);
    const normalizedOffset = ((heading % 360) / 360) * tileWidth;

    tilesRef.current.forEach((img, i) => {
      if (!img.complete || img.naturalWidth === 0) return;
      const angleSector = (i * 90) % 360;
      const relativeAngle = ((angleSector - heading + 540) % 360) - 180;
      const xPos = width / 2 + (relativeAngle / (fov / 2)) * (width / 2) - tileWidth / 4;

      if (xPos > -tileWidth && xPos < width + tileWidth) {
        ctx.save();
        ctx.globalAlpha = Math.max(0.2, 1 - Math.abs(relativeAngle) / 120);
        ctx.drawImage(
          img,
          xPos,
          horizonY - (height * 0.45) / 2,
          tileWidth / 2,
          height * 0.45
        );
        ctx.restore();
      }
    });

    // Central crosshair & orientation guidelines
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.7)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    // Center reticle
    ctx.beginPath();
    ctx.arc(width / 2, horizonY, 24, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(width / 2 - 32, horizonY);
    ctx.lineTo(width / 2 + 32, horizonY);
    ctx.moveTo(width / 2, horizonY - 32);
    ctx.lineTo(width / 2, horizonY + 32);
    ctx.stroke();
    ctx.setLineDash([]);
  }, [heading, pitch, fov]);

  // Drag interaction
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setIsAutoRotating(false);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      initialHeading: heading,
      initialPitch: pitch,
    };
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - dragStartRef.current.x;
      const deltaY = e.clientY - dragStartRef.current.y;

      const newHeading = (dragStartRef.current.initialHeading - deltaX * 0.5 + 3600) % 360;
      const newPitch = Math.max(-25, Math.min(25, dragStartRef.current.initialPitch + deltaY * 0.25));

      setHeading(newHeading);
      setPitch(newPitch);
    },
    [isDragging]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div className="w-full h-full flex flex-col bg-slate-950 relative overflow-hidden select-none">
      {/* 360 Canvas Viewport */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        className="relative flex-1 w-full h-full cursor-grab active:cursor-grabbing"
      >
        <canvas
          ref={canvasRef}
          width={800}
          height={400}
          className="w-full h-full object-cover"
        />

        {/* 360 Degree Compass Bar (Top) */}
        <div className="absolute top-3 left-4 right-4 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-950/80 border border-slate-800 backdrop-blur-md text-xs font-mono text-amber-300">
            <Compass className="w-4 h-4 text-amber-400 animate-spin-slow" />
            <span>Heading: {Math.round(heading)}°</span>
            <span className="text-slate-400 font-sans">
              ({heading < 45 || heading >= 315 ? 'North Frontage' : heading < 135 ? 'East View' : heading < 225 ? 'South Rear' : 'West View'})
            </span>
          </div>

          <div className="px-3 py-1 rounded-lg bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center gap-1.5 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
            <span>360° STREET VIEW PANORAMA</span>
          </div>
        </div>

        {/* Cardinal Quick Angle Selectors */}
        <div className="absolute bottom-16 left-4 flex items-center gap-1.5 z-10">
          <button
            onClick={() => {
              setHeading(0);
              setIsAutoRotating(false);
            }}
            className="px-2.5 py-1 rounded-md bg-slate-900/90 hover:bg-amber-500 hover:text-slate-950 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer"
          >
            North (0°)
          </button>
          <button
            onClick={() => {
              setHeading(90);
              setIsAutoRotating(false);
            }}
            className="px-2.5 py-1 rounded-md bg-slate-900/90 hover:bg-amber-500 hover:text-slate-950 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer"
          >
            East (90°)
          </button>
          <button
            onClick={() => {
              setHeading(180);
              setIsAutoRotating(false);
            }}
            className="px-2.5 py-1 rounded-md bg-slate-900/90 hover:bg-amber-500 hover:text-slate-950 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer"
          >
            South (180°)
          </button>
          <button
            onClick={() => {
              setHeading(270);
              setIsAutoRotating(false);
            }}
            className="px-2.5 py-1 rounded-md bg-slate-900/90 hover:bg-amber-500 hover:text-slate-950 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer"
          >
            West (270°)
          </button>
        </div>

        {/* Bottom Control Bar */}
        <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAutoRotating(!isAutoRotating)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-md transition cursor-pointer"
            >
              {isAutoRotating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isAutoRotating ? 'Pause 360°' : 'Auto 360° Pan'}</span>
            </button>

            <button
              onClick={() => {
                setHeading(0);
                setPitch(0);
                setFov(80);
              }}
              className="p-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-700 transition cursor-pointer"
              title="Reset orientation to North"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Direct Launch Buttons for 360° in Google & Mapillary */}
          <div className="flex items-center gap-2">
            <a
              href={links.googleStreetView}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium shadow-md transition cursor-pointer"
            >
              <span>Google Street View 360°</span>
              <ExternalLink className="w-3 h-3" />
            </a>

            <a
              href={links.mapillaryStreetView}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium shadow-md transition cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Mapillary 360° (FOSS)</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
