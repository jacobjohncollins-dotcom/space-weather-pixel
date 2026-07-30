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

const FEED_PATHS = {
  planetaryKIndex: '/products/noaa-planetary-k-index.json',
  solarWindPlasma: '/products/solar-wind/plasma-7-day.json',
  solarWindMag: '/products/solar-wind/mag-7-day.json',
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

function toNumberOrNull(value: string | undefined): number | null {
  if (value === undefined || value === null || value === 'null') return null
  const parsed = Number(value)
  return Number.isNaN(parsed) ? null : parsed
}

/** Rows of a NOAA "table" feed: [header, ...dataRows]. */
type TableFeed = [string[], ...string[][]] | string[][]

function tableRows(raw: unknown): string[][] {
  if (!Array.isArray(raw) || raw.length === 0) return []
  const [, ...rows] = raw as TableFeed
  return rows
}

export function parsePlanetaryKIndex(raw: unknown): KIndexReading[] {
  return tableRows(raw).map((row) => ({
    timeTag: row[0],
    kp: Number(row[1]),
    aRunning: Number(row[2]),
    stationCount: Number(row[3]),
  }))
}

export function parseSolarWindPlasma(raw: unknown): SolarWindPlasmaReading[] {
  return tableRows(raw).map((row) => ({
    timeTag: row[0],
    density: toNumberOrNull(row[1]),
    speed: toNumberOrNull(row[2]),
    temperature: toNumberOrNull(row[3]),
  }))
}

export function parseSolarWindMag(raw: unknown): SolarWindMagReading[] {
  return tableRows(raw).map((row) => ({
    timeTag: row[0],
    bx: toNumberOrNull(row[1]),
    by: toNumberOrNull(row[2]),
    bz: toNumberOrNull(row[3]),
    lon: toNumberOrNull(row[4]),
    lat: toNumberOrNull(row[5]),
    bt: toNumberOrNull(row[6]),
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
