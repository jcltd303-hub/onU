import React from 'react';
import { DemolitionPermit, FilterOptions } from '../types';
import { formatCurrency, formatDate, getOsmTileUrl, getPermitLinks } from '../services/accelaService';
import { ExternalLink, Compass, Camera, Maximize2, Download, ArrowUpDown, ArrowDown, ArrowUp } from 'lucide-react';

interface TableViewProps {
  permits: DemolitionPermit[];
  onSelectPermit: (permit: DemolitionPermit) => void;
  sortBy?: FilterOptions['sortBy'];
  onSortChange?: (sortBy: FilterOptions['sortBy']) => void;
}

export const TableView: React.FC<TableViewProps> = ({
  permits,
  onSelectPermit,
  sortBy = 'valDesc',
  onSortChange,
}) => {
  const exportToCSV = () => {
    const headers = [
      'PERMIT_NUM',
      'ADDRESS',
      'NEIGHBORHOOD',
      'VALUATION',
      'CONTRACTOR_NAME',
      'CLASS',
      'DATE_ISSUED',
      'DATE_RECEIVED',
      'SCHEDNUM',
      'LATITUDE',
      'LONGITUDE',
    ];

    const rows = permits.map((p) => [
      `"${p.attributes.PERMIT_NUM || ''}"`,
      `"${p.attributes.ADDRESS || ''}"`,
      `"${p.attributes.NEIGHBORHOOD || ''}"`,
      p.attributes.VALUATION || 0,
      `"${(p.attributes.CONTRACTOR_NAME || '').replace(/"/g, '""')}"`,
      `"${p.attributes.CLASS || ''}"`,
      `"${p.attributes.DATE_ISSUED ? new Date(p.attributes.DATE_ISSUED).toISOString().split('T')[0] : ''}"`,
      `"${p.attributes.DATE_RECEIVED ? new Date(p.attributes.DATE_RECEIVED).toISOString().split('T')[0] : ''}"`,
      `"${p.attributes.SCHEDNUM || ''}"`,
      p.geometry?.y || '',
      p.geometry?.x || '',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `denver_demolition_permits_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm flex flex-col">
      {/* Table Header Controls */}
      <div className="p-3 border-b border-slate-800 flex items-center justify-between gap-4">
        <span className="text-xs text-slate-400 font-medium">
          Showing {permits.length} demolition permit records
        </span>
        <button
          onClick={exportToCSV}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition cursor-pointer"
          title="Export records to CSV"
        >
          <Download className="w-3.5 h-3.5 text-amber-400" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950/80 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800">
            <tr>
              <th className="p-3">Thumb</th>
              <th className="p-3">Permit Number</th>
              <th className="p-3">
                <button
                  type="button"
                  onClick={() => onSortChange && onSortChange('address')}
                  className={`flex items-center gap-1 font-semibold uppercase hover:text-amber-400 transition cursor-pointer ${
                    sortBy === 'address' ? 'text-amber-400' : ''
                  }`}
                  title="Sort by Address"
                >
                  <span>Address</span>
                  {sortBy === 'address' ? (
                    <ArrowDown className="w-3 h-3 text-amber-400" />
                  ) : (
                    <ArrowUpDown className="w-3 h-3 opacity-40" />
                  )}
                </button>
              </th>
              <th className="p-3">Neighborhood</th>
              <th className="p-3">
                <button
                  type="button"
                  onClick={() =>
                    onSortChange &&
                    onSortChange(sortBy === 'valDesc' ? 'valAsc' : 'valDesc')
                  }
                  className={`flex items-center gap-1 font-semibold uppercase hover:text-amber-400 transition cursor-pointer ${
                    sortBy === 'valDesc' || sortBy === 'valAsc'
                      ? 'text-amber-400 font-bold'
                      : ''
                  }`}
                  title="Sort by Valuation"
                >
                  <span>Valuation</span>
                  {sortBy === 'valDesc' ? (
                    <ArrowDown className="w-3.5 h-3.5 text-amber-400" />
                  ) : sortBy === 'valAsc' ? (
                    <ArrowUp className="w-3.5 h-3.5 text-amber-400" />
                  ) : (
                    <ArrowUpDown className="w-3 h-3 opacity-40" />
                  )}
                </button>
              </th>
              <th className="p-3">Contractor</th>
              <th className="p-3">
                <button
                  type="button"
                  onClick={() =>
                    onSortChange &&
                    onSortChange(sortBy === 'dateDesc' ? 'dateAsc' : 'dateDesc')
                  }
                  className={`flex items-center gap-1 font-semibold uppercase hover:text-amber-400 transition cursor-pointer ${
                    sortBy === 'dateDesc' || sortBy === 'dateAsc'
                      ? 'text-amber-400 font-bold'
                      : ''
                  }`}
                  title="Sort by Date Issued"
                >
                  <span>Issued Date</span>
                  {sortBy === 'dateDesc' ? (
                    <ArrowDown className="w-3.5 h-3.5 text-amber-400" />
                  ) : sortBy === 'dateAsc' ? (
                    <ArrowUp className="w-3.5 h-3.5 text-amber-400" />
                  ) : (
                    <ArrowUpDown className="w-3 h-3 opacity-40" />
                  )}
                </button>
              </th>
              <th className="p-3">Class</th>
              <th className="p-3 text-right">Maps (New Tab)</th>
              <th className="p-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {permits.map((permit) => {
              const lat = permit.geometry?.y;
              const lon = permit.geometry?.x;
              const thumbUrl = lat && lon ? getOsmTileUrl(lat, lon, 18) : '';
              const links = getPermitLinks(permit);

              return (
                <tr
                  key={permit.attributes.OBJECTID}
                  className="hover:bg-slate-800/50 transition-colors"
                >
                  {/* Thumbnail */}
                  <td className="p-3">
                    <div
                      onClick={() => onSelectPermit(permit)}
                      className="w-12 h-10 rounded-md bg-slate-950 overflow-hidden border border-slate-700 cursor-pointer relative group/tbl-thumb"
                      title="Click thumbnail to view details"
                    >
                      {thumbUrl && (
                        <img
                          src={thumbUrl}
                          alt="thumbnail"
                          loading="lazy"
                          className="w-full h-full object-cover group-hover/tbl-thumb:scale-110 transition-transform"
                        />
                      )}
                      <div className="absolute inset-0 bg-black/30 group-hover/tbl-thumb:bg-black/0 transition-colors" />
                    </div>
                  </td>

                  {/* Permit Number */}
                  <td className="p-3 font-mono font-bold text-amber-400">
                    {permit.attributes.PERMIT_NUM}
                  </td>

                  {/* Address */}
                  <td className="p-3 font-medium text-white max-w-[200px] truncate">
                    <button
                      onClick={() => onSelectPermit(permit)}
                      className="hover:text-amber-400 hover:underline text-left truncate cursor-pointer"
                    >
                      {permit.attributes.ADDRESS}
                    </button>
                  </td>

                  {/* Neighborhood */}
                  <td className="p-3 text-slate-300">
                    {permit.attributes.NEIGHBORHOOD || 'Denver Metro'}
                  </td>

                  {/* Valuation */}
                  <td className="p-3 font-semibold text-emerald-400">
                    {formatCurrency(permit.attributes.VALUATION)}
                  </td>

                  {/* Contractor */}
                  <td className="p-3 text-slate-300 max-w-[180px] truncate">
                    {permit.attributes.CONTRACTOR_NAME || 'Owner / Not Listed'}
                  </td>

                  {/* Issued Date */}
                  <td className="p-3 text-slate-400 whitespace-nowrap">
                    {formatDate(permit.attributes.DATE_ISSUED)}
                  </td>

                  {/* Class */}
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 border border-slate-700 font-medium">
                      {permit.attributes.CLASS || 'Demo'}
                    </span>
                  </td>

                  {/* Clickable links that use new tab */}
                  <td className="p-3 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <a
                        href={links.osm}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                        title="Open in OpenStreetMap in new tab"
                      >
                        <Compass className="w-3.5 h-3.5 text-emerald-400" />
                      </a>
                      <a
                        href={links.mapillaryStreetView}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                        title="Open in Mapillary Street View in new tab"
                      >
                        <Camera className="w-3.5 h-3.5 text-amber-400" />
                      </a>
                      <a
                        href={links.googleMaps}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                        title="Open in Google Maps in new tab"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                      </a>
                    </div>
                  </td>

                  {/* Action */}
                  <td className="p-3 text-center">
                    <button
                      onClick={() => onSelectPermit(permit)}
                      className="px-2.5 py-1 rounded-md bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[11px] font-semibold transition cursor-pointer"
                    >
                      Details
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
