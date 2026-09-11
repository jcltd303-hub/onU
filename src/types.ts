export interface DemolitionPermitAttributes {
  OBJECTID: number;
  DATE_ISSUED: number | null; // epoch ms
  PERMIT_NUM: string;
  ADDRESS: string;
  LOCATION: string | null;
  CLASS: string;
  UNITS: string | null;
  VALUATION: number | null;
  PERMIT_FEE: number | null;
  CONTRACTOR_NAME: string | null;
  FINAL_DATE: number | null;
  CANCEL: number | null;
  DATE_RECEIVED: number | null;
  BID_AUTHNAME: string | null;
  LOG_NUM: string | null;
  EXEMPT: string | null;
  CO_REQUIRED: string | null;
  DATE_CO_ISSUED: string | null;
  ADDRESS_NUMBER: number | null;
  ADDRESS_STREETDIR: string | null;
  ADDRESS_STREETNAME: string | null;
  ADDRESS_STREETTYPE: string | null;
  ADDRESS_UNITTYPE: string | null;
  ADDRESS_UNIT: string | null;
  GLOBALID: string;
  SCHEDNUM: string | null;
  STAT_CODE_3: string | null;
  STAT_CODE_2: string | null;
  STAT_CODE_1: string | null;
  NEIGHBORHOOD: string | null;
}

export interface Geometry {
  x: number; // longitude (e.g. -105.0)
  y: number; // latitude (e.g. 39.7)
}

export interface DemolitionPermit {
  attributes: DemolitionPermitAttributes;
  geometry: Geometry;
}

export interface FilterOptions {
  searchQuery: string;
  daysRange: number; // 30, 60, 90, 180, 365, or 0 for all
  neighborhood: string;
  contractor: string;
  demolitionClass: string;
  minValuation: number;
  sortBy: 'dateDesc' | 'dateAsc' | 'valDesc' | 'valAsc' | 'address';
}

export interface ScrapeProgress {
  isScraping: boolean;
  lastScrapedAt: Date | null;
  source: 'live' | 'cache' | 'offline';
  totalFound: number;
  error: string | null;
}

export interface StreetViewProvider {
  id: 'mapillary' | 'panoramax' | 'osm' | 'google';
  name: string;
  isFoss: boolean;
  url: string;
  description: string;
}
