// Typed fetch wrappers for the NOAA SWPC feeds listed in Plan.md §3.
//
// NOAA serves two raw shapes:
//  - "table" feeds: a header row of column names followed by string rows,
//    e.g. [["time_tag","Kp",...], ["2024-01-01 00:00:00","2.67",...], ...]
//  - "object list" feeds: a plain array of JSON objects.
//
// Each `parse*` function converts the raw wire shape into the typed records
// in ./types.ts and is exported separately so it can be unit tested against
// fixture JSON without a network call.

import type {
  KIndexReading,
  SolarWindPlasmaReading,
  SolarWindMagReading,
  XrayFluxReading,
  XrayFlareEvent,
  SolarRegion,
  OvationAurora,
  SpaceWeatherAlert,
  EnlilFrame,
} from './types.ts'

export const NOAA_BASE_URL = 'https://services.swpc.noaa.gov'

// solarWindPlasma/solarWindMag originally pointed at
// products/solar-wind/plasma-7-day.json and mag-7-day.json per Plan.md §3 —
// those don't exist on the live server (404). The working real-time
// equivalents are the combined DSCOVR/ACE "rtsw" feeds below.
const FEED_PATHS = {
  planetaryKIndex: '/products/noaa-planetary-k-index.json',
  solarWindPlasma: '/json/rtsw/rtsw_wind_1m.json',
  solarWindMag: '/json/rtsw/rtsw_mag_1m.json',
  xrayFlux: '/json/goes/primary/xrays-6-hour.json',
  xrayFlares: '/json/goes/primary/xray-flares-latest.json',
  solarRegions: '/json/solar_regions.json',
  ovationAurora: '/json/ovation_aurora_latest.json',
  alerts: '/products/alerts.json',
  enlilAnimation: '/products/animations/enlil.json',
} as const

async function fetchJson(path: string): Promise<unknown> {
  const response = await fetch(`${NOAA_BASE_URL}${path}`)
  if (!response.ok) {
    throw new Error(`NOAA feed ${path} responded with ${response.status}`)
  }
  return response.json()
}

interface RawKIndexEntry {
  time_tag: string
  Kp: number
  a_running: number
  station_count: number
}

export function parsePlanetaryKIndex(raw: unknown): KIndexReading[] {
  return ((raw ?? []) as RawKIndexEntry[]).map((entry) => ({
    timeTag: entry.time_tag,
    kp: entry.Kp,
    aRunning: entry.a_running,
    stationCount: entry.station_count,
  }))
}

// NOAA's real-time solar wind feeds (json/rtsw/*) report one entry per
// timestamp per source satellite (e.g. SOLAR1, ACE); only the entry NOAA
// flags `active: true` is operationally in use, so non-active entries are
// dropped here rather than left for callers to filter.
interface RawSolarWindPlasmaEntry {
  time_tag: string
  active: boolean
  proton_density: number | null
  proton_speed: number | null
  proton_temperature: number | null
}

export function parseSolarWindPlasma(raw: unknown): SolarWindPlasmaReading[] {
  return ((raw ?? []) as RawSolarWindPlasmaEntry[])
    .filter((entry) => entry.active)
    .map((entry) => ({
      timeTag: entry.time_tag,
      density: entry.proton_density,
      speed: entry.proton_speed,
      temperature: entry.proton_temperature,
    }))
}

interface RawSolarWindMagEntry {
  time_tag: string
  active: boolean
  bx_gsm: number | null
  by_gsm: number | null
  bz_gsm: number | null
  phi_gsm: number | null
  theta_gsm: number | null
  bt: number | null
}

export function parseSolarWindMag(raw: unknown): SolarWindMagReading[] {
  return ((raw ?? []) as RawSolarWindMagEntry[])
    .filter((entry) => entry.active)
    .map((entry) => ({
      timeTag: entry.time_tag,
      bx: entry.bx_gsm,
      by: entry.by_gsm,
      bz: entry.bz_gsm,
      lon: entry.phi_gsm,
      lat: entry.theta_gsm,
      bt: entry.bt,
    }))
}

interface RawXrayFluxEntry {
  time_tag: string
  satellite: number
  flux: number
  energy: string
}

export function parseXrayFlux(raw: unknown): XrayFluxReading[] {
  return ((raw ?? []) as RawXrayFluxEntry[]).map((entry) => ({
    timeTag: entry.time_tag,
    satellite: entry.satellite,
    fluxWatts: entry.flux,
    energyBand: entry.energy,
  }))
}

interface RawXrayFlareEntry {
  flr_id: string
  begin_time: string
  max_time: string
  end_time: string | null
  max_class: string
  satellite: number
}

export function parseXrayFlares(raw: unknown): XrayFlareEvent[] {
  return ((raw ?? []) as RawXrayFlareEntry[]).map((entry) => ({
    flareId: entry.flr_id,
    beginTime: entry.begin_time,
    maxTime: entry.max_time,
    endTime: entry.end_time,
    maxClass: entry.max_class,
    satellite: entry.satellite,
  }))
}

interface RawSolarRegionEntry {
  region: number
  latitude: number | null
  longitude: number | null
  area: number | null
  spot_class: string | null
  number_spots: number | null
}

export function parseSolarRegions(raw: unknown): SolarRegion[] {
  return ((raw ?? []) as RawSolarRegionEntry[]).map((entry) => ({
    region: entry.region,
    latitude: entry.latitude,
    longitude: entry.longitude,
    area: entry.area,
    spotClass: entry.spot_class,
    numberSpots: entry.number_spots,
  }))
}

interface RawOvationAurora {
  'Observation Time': string
  'Forecast Time': string
  coordinates: [number, number, number][]
}

export function parseOvationAurora(raw: unknown): OvationAurora {
  const entry = raw as RawOvationAurora
  return {
    observationTime: entry['Observation Time'],
    forecastTime: entry['Forecast Time'],
    coordinates: entry.coordinates,
  }
}

interface RawAlertEntry {
  product_id: string
  issue_datetime: string
  message: string
}

export function parseAlerts(raw: unknown): SpaceWeatherAlert[] {
  return ((raw ?? []) as RawAlertEntry[]).map((entry) => ({
    productId: entry.product_id,
    issueDatetime: entry.issue_datetime,
    message: entry.message,
  }))
}

interface RawEnlilFrame {
  time: string
  url: string
}

export function parseEnlilAnimation(raw: unknown): EnlilFrame[] {
  return ((raw ?? []) as RawEnlilFrame[]).map((entry) => ({
    time: entry.time,
    imageUrl: entry.url,
  }))
}

export async function fetchPlanetaryKIndex(): Promise<KIndexReading[]> {
  return parsePlanetaryKIndex(await fetchJson(FEED_PATHS.planetaryKIndex))
}

export async function fetchSolarWindPlasma(): Promise<
  SolarWindPlasmaReading[]
> {
  return parseSolarWindPlasma(await fetchJson(FEED_PATHS.solarWindPlasma))
}

export async function fetchSolarWindMag(): Promise<SolarWindMagReading[]> {
  return parseSolarWindMag(await fetchJson(FEED_PATHS.solarWindMag))
}

export async function fetchXrayFlux(): Promise<XrayFluxReading[]> {
  return parseXrayFlux(await fetchJson(FEED_PATHS.xrayFlux))
}

export async function fetchXrayFlares(): Promise<XrayFlareEvent[]> {
  return parseXrayFlares(await fetchJson(FEED_PATHS.xrayFlares))
}

export async function fetchSolarRegions(): Promise<SolarRegion[]> {
  return parseSolarRegions(await fetchJson(FEED_PATHS.solarRegions))
}

export async function fetchOvationAurora(): Promise<OvationAurora> {
  return parseOvationAurora(await fetchJson(FEED_PATHS.ovationAurora))
}

export async function fetchAlerts(): Promise<SpaceWeatherAlert[]> {
  return parseAlerts(await fetchJson(FEED_PATHS.alerts))
}

export async function fetchEnlilAnimation(): Promise<EnlilFrame[]> {
  return parseEnlilAnimation(await fetchJson(FEED_PATHS.enlilAnimation))
}
