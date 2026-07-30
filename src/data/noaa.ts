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
//
// The browser no longer fetches NOAA directly: `services.swpc.noaa.gov`
// started returning an AWS WAF JS challenge (HTTP 202, empty body) to
// cross-origin fetch() calls rather than the real feed, which a page load
// under a different origin can't solve. Instead, a scheduled GitHub Action
// (scripts/fetch-noaa-snapshot.mjs, server-side, unaffected by the browser
// CORS/WAF interaction) fetches each feed and republishes it as a
// same-origin static file under `public/data/`, rebuilt every ~15 minutes.
// `feed-manifest.json`'s `remote` paths are what that script fetches from
// NOAA_BASE_URL; `local` is what the browser fetches from here instead.

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
import feedManifest from './feed-manifest.json'

export const NOAA_BASE_URL = 'https://services.swpc.noaa.gov'

// Root-absolute static assets (like this data snapshot, or the sprite sheet
// in scene/atlas.ts) have to be joined with BASE_URL by hand under the
// GitHub Pages subpath build — Vite's base-rewriting only touches imports
// and bundled asset references, not runtime-constructed URLs.
const DATA_BASE_URL = `${import.meta.env.BASE_URL.replace(/\/$/, '')}/data`

async function fetchJson(key: keyof typeof feedManifest): Promise<unknown> {
  const local = feedManifest[key].local
  const response = await fetch(`${DATA_BASE_URL}/${local}`)
  if (!response.ok) {
    throw new Error(`data snapshot ${local} responded with ${response.status}`)
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
  return parsePlanetaryKIndex(await fetchJson('planetaryKIndex'))
}

export async function fetchSolarWindPlasma(): Promise<
  SolarWindPlasmaReading[]
> {
  return parseSolarWindPlasma(await fetchJson('solarWindPlasma'))
}

export async function fetchSolarWindMag(): Promise<SolarWindMagReading[]> {
  return parseSolarWindMag(await fetchJson('solarWindMag'))
}

export async function fetchXrayFlux(): Promise<XrayFluxReading[]> {
  return parseXrayFlux(await fetchJson('xrayFlux'))
}

export async function fetchXrayFlares(): Promise<XrayFlareEvent[]> {
  return parseXrayFlares(await fetchJson('xrayFlares'))
}

export async function fetchSolarRegions(): Promise<SolarRegion[]> {
  return parseSolarRegions(await fetchJson('solarRegions'))
}

export async function fetchOvationAurora(): Promise<OvationAurora> {
  return parseOvationAurora(await fetchJson('ovationAurora'))
}

export async function fetchAlerts(): Promise<SpaceWeatherAlert[]> {
  return parseAlerts(await fetchJson('alerts'))
}

export async function fetchEnlilAnimation(): Promise<EnlilFrame[]> {
  return parseEnlilAnimation(await fetchJson('enlilAnimation'))
}
