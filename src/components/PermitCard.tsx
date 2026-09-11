import React from 'react';
import { DemolitionPermit } from '../types';
import {
  formatCurrency,
  formatDate,
  formatDaysAgo,
  getPermitLinks,
} from '../services/accelaService';
import {
  ExternalLink,
  MapPin,
  Calendar,
  Building,
  Compass,
  Maximize2,
  Camera,
  FileText,
} from 'lucide-react';
import { StreetView360Thumbnail } from './StreetView360Thumbnail';

interface PermitCardProps {
  permit: DemolitionPermit;
  onSelect: (permit: DemolitionPermit) => void;
}

export const PermitCard: React.FC<PermitCardProps> = ({ permit, onSelect }) => {
  const { attributes, geometry } = permit;
  const links = getPermitLinks(permit);

  const isWreck = attributes.CLASS?.toLowerCase().includes('wreck');

  return (
    <div
      id={`permit-card-${attributes.OBJECTID}`}
      className="group bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 flex flex-col"
    >
      {/* Interactive StreetView 360 Thumbnail Container */}
      <StreetView360Thumbnail
        permit={permit}
        className="h-44"
        onExpand={() => onSelect(permit)}
        interactive={true}
        defaultAutoRotate={false}
      />

      {/* Card Content Body */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        {/* Address & Neighborhood */}
        <div>
          <div className="flex items-start justify-between gap-2">
            <h2
              onClick={() => onSelect(permit)}
              className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors cursor-pointer line-clamp-1"
              title={attributes.ADDRESS}
            >
              {attributes.ADDRESS}
            </h2>
          </div>

          <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
            <span className="flex items-center gap-1 text-slate-300">
              <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
              <span className="truncate">
                {attributes.NEIGHBORHOOD || 'Denver Metro'}
              </span>
            </span>
            <span>&bull;</span>
            <span className="font-mono text-slate-400 truncate text-[11px]">
              {attributes.PERMIT_NUM}
            </span>
          </div>
        </div>

        {/* Valuation & Date */}
        <div className="bg-slate-800/50 rounded-lg p-2.5 grid grid-cols-2 gap-2 text-xs border border-slate-800">
          <div>
            <span className="text-[10px] text-slate-400 block font-medium">
              Valuation
            </span>
            <span className="font-semibold text-emerald-400">
              {formatCurrency(attributes.VALUATION)}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-medium">
              Issued Date
            </span>
            <div className="flex items-center gap-1 text-slate-200">
              <Calendar className="w-3 h-3 text-slate-400" />
              <span className="truncate">{formatDate(attributes.DATE_ISSUED)}</span>
            </div>
          </div>
        </div>

        {/* Contractor Information */}
        <div className="text-xs text-slate-300">
          <span className="text-[10px] text-slate-400 block font-medium">
            Contractor
          </span>
          <span className="font-medium text-slate-200 truncate block">
            {attributes.CONTRACTOR_NAME || 'Owner / Not Listed'}
          </span>
        </div>

        {/* External Links Section (Clickable links that use NEW TAB for address on maps) */}
        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            {/* OpenStreetMap FOSS Link */}
            <a
              href={links.osm}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition text-[11px]"
              title="Open address in OpenStreetMap in new tab"
            >
              <Compass className="w-3 h-3 text-emerald-400" />
              <span>OSM</span>
              <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
            </a>

            {/* Mapillary Street View FOSS Link */}
            <a
              href={links.mapillaryStreetView}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition text-[11px]"
              title="Open FOSS Mapillary Street View in new tab"
            >
              <Camera className="w-3 h-3 text-amber-400" />
              <span>Mapillary</span>
              <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
            </a>

            {/* Accela Citizen Access Portal Link */}
            <a
              href={links.accelaCitizenAccess}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition text-[11px]"
              title="Open official Accela e-Permit in new tab"
            >
              <FileText className="w-3 h-3 text-blue-400" />
              <span>Accela</span>
              <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
            </a>
          </div>

          {/* Detailed Modal Trigger */}
          <button
            onClick={() => onSelect(permit)}
            className="text-amber-400 hover:text-amber-300 text-xs font-semibold inline-flex items-center gap-1 hover:underline cursor-pointer"
          >
            <span>Details</span>
            <Maximize2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
