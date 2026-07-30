// Parsed shapes for each NOAA SWPC feed used by the app (see Plan.md §3).
// NOAA's own JSON is inconsistent between feeds: some are "header row +
// string rows" tables, others are arrays of objects. Each interface below
// describes the *parsed* record shape this app works with; parsing from
// NOAA's raw wire format happens in noaa.ts.

export interface KIndexReading {
  timeTag: string
  kp: number
  aRunning: number
  stationCount: number
}

// The 7-day multi-field table feeds originally assumed in Plan.md §3
// (products/solar-wind/plasma-7-day.json, mag-7-day.json) don't exist on the
// live NOAA server. The real-time equivalents are the combined DSCOVR/ACE
// "rtsw" object-list feeds (json/rtsw/rtsw_wind_1m.json, rtsw_mag_1m.json),
// which report one entry per source satellite per timestamp (only the
// `active: true` entry is in operational use).
export interface SolarWindPlasmaReading {
  timeTag: string
  density: number | null
  speed: number | null
  temperature: number | null
}

export interface SolarWindMagReading {
  timeTag: string
  bx: number | null
  by: number | null
  bz: number | null
  lon: number | null
  lat: number | null
  bt: number | null
}

export interface XrayFluxReading {
  timeTag: string
  satellite: number
  fluxWatts: number
  energyBand: string
}

export interface XrayFlareEvent {
  flareId: string
  beginTime: string
  maxTime: string
  endTime: string | null
  maxClass: string
  satellite: number
}

export interface SolarRegion {
  region: number
  latitude: number | null
  longitude: number | null
  area: number | null
  spotClass: string | null
  numberSpots: number | null
}

export interface OvationAurora {
  observationTime: string
  forecastTime: string
  // [longitude, latitude, aurora probability 0-100]
  coordinates: [number, number, number][]
}

export interface SpaceWeatherAlert {
  productId: string
  issueDatetime: string
  message: string
}

export interface EnlilFrame {
  time: string
  imageUrl: string
}
