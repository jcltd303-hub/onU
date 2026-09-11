import { DemolitionPermit } from '../types';
import initialPermitsData from '../data/initial_permits.json';

// Official City and County of Denver Accela sync FeatureServer endpoint (layer 318 = DEV_DEMOLITIONPERMIT_P)
export const DENVER_ACCELA_ENDPOINT =
  'https://services1.arcgis.com/zdB7qR0BtYrg0Xpl/arcgis/rest/services/ODC_DEV_DEMOLITIONPERMIT_P/FeatureServer/318';

export const ACCELA_CITIZEN_ACCESS_URL =
  'https://aca-prod.accela.com/DENVER/Cap/GlobalSearchResults.aspx?QueryText=';

export const DENVER_ASSESSOR_URL =
  'https://www.denvergov.org/property/';

/**
 * Calculates OSM tile X, Y coordinate for a given lat/lon at a specific zoom level
 */
export function getTileCoordinates(lat: number, lon: number, zoom: number = 18) {
  const x = Math.floor(((lon + 180) / 360) * Math.pow(2, zoom));
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) *
      Math.pow(2, zoom)
  );
  return { x, y, zoom };
}

/**
 * Generates OpenStreetMap tile URL (FOSS)
 */
export function getOsmTileUrl(lat: number, lon: number, zoom: number = 18): string {
  const { x, y } = getTileCoordinates(lat, lon, zoom);
  // Using openstreetmap tile servers with subdomains
  const subdomains = ['a', 'b', 'c'];
  const s = subdomains[Math.abs(x + y) % subdomains.length];
  return `https://${s}.tile.openstreetmap.org/${zoom}/${x}/${y}.png`;
}

/**
 * Generates CartoDB Positron high-resolution FOSS tile URL
 */
export function getCartoTileUrl(lat: number, lon: number, zoom: number = 18): string {
  const { x, y } = getTileCoordinates(lat, lon, zoom);
  return `https://basemaps.cartocdn.com/rastertiles/voyager/${zoom}/${x}/${y}.png`;
}

/**
 * Returns map and street view external links for a permit
 */
export function getPermitLinks(permit: DemolitionPermit) {
  const lat = permit.geometry?.y;
  const lon = permit.geometry?.x;
  const address = permit.attributes.ADDRESS || 'Denver, CO';
  const permitNum = permit.attributes.PERMIT_NUM;
  const schednum = permit.attributes.SCHEDNUM;

  const encodedAddress = encodeURIComponent(`${address}, Denver, CO`);

  return {
    osm: lat && lon
      ? `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=18/${lat}/${lon}`
      : `https://www.openstreetmap.org/search?query=${encodedAddress}`,
    
    mapillaryStreetView: lat && lon
      ? `https://www.mapillary.com/app/?lat=${lat}&lng=${lon}&z=17`
      : `https://www.mapillary.com/app/?lat=39.7392&lng=-104.9903&z=14`,
      
    panoramaxStreetView: lat && lon
      ? `https://panoramax.openstreetmap.fr/#focus=map&map=17/${lat}/${lon}`
      : `https://panoramax.openstreetmap.fr/`,

    googleStreetView: lat && lon
      ? `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lon}`
      : `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`,

    googleMaps: lat && lon
      ? `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`
      : `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`,

    accelaCitizenAccess: permitNum
      ? `${ACCELA_CITIZEN_ACCESS_URL}${encodeURIComponent(permitNum)}`
      : 'https://aca-prod.accela.com/DENVER/Cap/CapHome.aspx?module=Development',

    denverAssessor: schednum
      ? `${DENVER_ASSESSOR_URL}`
      : DENVER_ASSESSOR_URL,
  };
}

/**
 * Generates Google Maps Embed API Street View URL
 * Complies with Google Maps Platform standards and solution attribution
 */
export function getGoogleStreetViewEmbedUrl(
  lat: number,
  lon: number,
  apiKey: string,
  heading: number = 0,
  pitch: number = 0,
  fov: number = 90
): string {
  return `https://www.google.com/maps/embed/v1/streetview?key=${encodeURIComponent(
    apiKey.trim()
  )}&solution_id=gmp_mcp_codeassist_v1_aistudio&location=${lat},${lon}&heading=${Math.round(
    heading
  )}&pitch=${Math.round(pitch)}&fov=${fov}`;
}

/**
 * Scrapes or queries Denver Accela Demolition permits
 */
export async function scrapeDenverDemolitionPermits(days: number = 90): Promise<{
  permits: DemolitionPermit[];
  source: 'live' | 'cache';
}> {
  try {
    let whereClause = '1=1';

    if (days > 0) {
      // Calculate starting date (days ago from current date)
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - days);
      const yyyy = targetDate.getFullYear();
      const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
      const dd = String(targetDate.getDate()).padStart(2, '0');
      whereClause = `DATE_ISSUED >= DATE '${yyyy}-${mm}-${dd}'`;
    }

    const queryUrl = `${DENVER_ACCELA_ENDPOINT}/query?where=${encodeURIComponent(
      whereClause
    )}&outFields=*&orderByFields=DATE_ISSUED+DESC&resultRecordCount=1000&outSR=4326&f=json`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(queryUrl, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.features && Array.isArray(data.features) && data.features.length > 0) {
      return {
        permits: data.features as DemolitionPermit[],
        source: 'live',
      };
    }

    // If query succeeded but features array was empty, fallback to bundled data
    return {
      permits: initialPermitsData as DemolitionPermit[],
      source: 'cache',
    };
  } catch (err) {
    console.warn('Accela live fetch fallback triggered:', err);
    return {
      permits: initialPermitsData as DemolitionPermit[],
      source: 'cache',
    };
  }
}

/**
 * Queries permit history for a specific address or parcel from the Denver API
 */
export async function fetchAddressPermitHistory(
  address: string,
  schednum?: string | null
): Promise<DemolitionPermit[]> {
  try {
    let where = `ADDRESS = '${address.replace(/'/g, "''")}'`;
    if (schednum && schednum.trim()) {
      where = `SCHEDNUM = '${schednum.trim()}' OR ${where}`;
    }

    const queryUrl = `${DENVER_ACCELA_ENDPOINT}/query?where=${encodeURIComponent(
      where
    )}&outFields=*&orderByFields=DATE_ISSUED+DESC&resultRecordCount=50&outSR=4326&f=json`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(queryUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.features && Array.isArray(data.features)) {
        return data.features as DemolitionPermit[];
      }
    }
  } catch (e) {
    console.warn('Address history query error:', e);
  }

  // Fallback: search in initial permits snapshot
  const initial = initialPermitsData as DemolitionPermit[];
  const normalizedAddr = address.trim().toLowerCase();
  return initial.filter((p) => {
    const pAddr = (p.attributes.ADDRESS || '').trim().toLowerCase();
    const pSched = p.attributes.SCHEDNUM;
    if (schednum && pSched && pSched === schednum) return true;
    return pAddr.includes(normalizedAddr) || normalizedAddr.includes(pAddr);
  });
}

/**
 * Format currency
 */
export function formatCurrency(amount?: number | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '$0';
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format epoch timestamp to date string
 */
export function formatDate(timestamp?: number | null): string {
  if (!timestamp) return 'Pending / Unknown';
  const d = new Date(timestamp);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Relative time from timestamp
 */
export function formatDaysAgo(timestamp?: number | null): string {
  if (!timestamp) return '';
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'Today';
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 30) return `${diffDays} days ago`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths === 1) return '1 month ago';
  return `${diffMonths} months ago`;
}
