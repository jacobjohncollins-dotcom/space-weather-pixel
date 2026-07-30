// Polls all NOAA feeds on an interval and maps the latest reading of each
// to a status tier (Plan.md §8). No external polling library — the feed set
// is small and fixed, so a plain interval + useEffect keeps the dependency
// surface minimal.

import { useEffect, useRef, useState } from 'react'
import {
  fetchAlerts,
  fetchEnlilAnimation,
  fetchOvationAurora,
  fetchPlanetaryKIndex,
  fetchSolarRegions,
  fetchSolarWindMag,
  fetchSolarWindPlasma,
  fetchXrayFlares,
  fetchXrayFlux,
} from './noaa.ts'
import { bzTier, flareTier, kpTier, windTier } from './thresholds.ts'
import type { BzTier, FlareTier, KpTier, WindTier } from './thresholds.ts'
import type {
  EnlilFrame,
  OvationAurora,
  SolarRegion,
  SpaceWeatherAlert,
  XrayFluxReading,
} from './types.ts'
import type { KpHistoryPoint } from '../scene/sparkline.ts'

export const POLL_INTERVAL_MS = 60_000

// NOAA's planetary-k-index feed reports one entry per 3 hours, so 8 entries
// covers the last 24h for the trend sparkline (Chunk 13, Plan.md §10).
const KP_HISTORY_POINTS = 8

interface Slice<T> {
  data: T | null
  error: string | null
}

export interface SpaceWeatherState {
  loading: boolean
  kp: Slice<{ value: number; tier: KpTier }>
  kpHistory: Slice<KpHistoryPoint[]>
  wind: Slice<{ speedKmS: number; tier: WindTier }>
  bz: Slice<{ nT: number; tier: BzTier }>
  flare: Slice<{ maxClass: string; tier: FlareTier }>
  xrayFlux: Slice<XrayFluxReading>
  solarRegions: Slice<SolarRegion[]>
  ovationAurora: Slice<OvationAurora>
  alerts: Slice<SpaceWeatherAlert[]>
  enlil: Slice<EnlilFrame>
}

const initialState: SpaceWeatherState = {
  loading: true,
  kp: { data: null, error: null },
  kpHistory: { data: null, error: null },
  wind: { data: null, error: null },
  bz: { data: null, error: null },
  flare: { data: null, error: null },
  xrayFlux: { data: null, error: null },
  solarRegions: { data: null, error: null },
  ovationAurora: { data: null, error: null },
  alerts: { data: null, error: null },
  enlil: { data: null, error: null },
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

// Single fetch shared by the `kp` and `kpHistory` slices, rather than each
// hitting the same NOAA endpoint separately.
async function loadKpAndHistory(): Promise<{
  kp: SpaceWeatherState['kp']
  kpHistory: SpaceWeatherState['kpHistory']
}> {
  try {
    const readings = await fetchPlanetaryKIndex()
    const latest = readings.at(-1)
    if (!latest) throw new Error('no Kp readings returned')
    const history = readings.slice(-KP_HISTORY_POINTS).map((r) => ({
      timeTag: r.timeTag,
      value: r.kp,
      tier: kpTier(r.kp),
    }))
    return {
      kp: { data: { value: latest.kp, tier: kpTier(latest.kp) }, error: null },
      kpHistory: { data: history, error: null },
    }
  } catch (err) {
    const message = errorMessage(err)
    return {
      kp: { data: null, error: message },
      kpHistory: { data: null, error: message },
    }
  }
}

async function loadWind(): Promise<SpaceWeatherState['wind']> {
  try {
    const readings = await fetchSolarWindPlasma()
    const latest = [...readings].reverse().find((r) => r.speed !== null)
    if (!latest || latest.speed === null)
      throw new Error('no solar wind speed readings returned')
    return {
      data: { speedKmS: latest.speed, tier: windTier(latest.speed) },
      error: null,
    }
  } catch (err) {
    return { data: null, error: errorMessage(err) }
  }
}

async function loadBz(): Promise<SpaceWeatherState['bz']> {
  try {
    const readings = await fetchSolarWindMag()
    const latest = [...readings].reverse().find((r) => r.bz !== null)
    if (!latest || latest.bz === null)
      throw new Error('no Bz readings returned')
    return { data: { nT: latest.bz, tier: bzTier(latest.bz) }, error: null }
  } catch (err) {
    return { data: null, error: errorMessage(err) }
  }
}

async function loadFlare(): Promise<SpaceWeatherState['flare']> {
  try {
    const flares = await fetchXrayFlares()
    const latest = flares.at(-1)
    if (!latest) throw new Error('no flare events returned')
    return {
      data: { maxClass: latest.maxClass, tier: flareTier(latest.maxClass) },
      error: null,
    }
  } catch (err) {
    return { data: null, error: errorMessage(err) }
  }
}

async function loadXrayFlux(): Promise<SpaceWeatherState['xrayFlux']> {
  try {
    const readings = await fetchXrayFlux()
    const latest = readings.at(-1)
    if (!latest) throw new Error('no x-ray flux readings returned')
    return { data: latest, error: null }
  } catch (err) {
    return { data: null, error: errorMessage(err) }
  }
}

async function loadSolarRegions(): Promise<SpaceWeatherState['solarRegions']> {
  try {
    return { data: await fetchSolarRegions(), error: null }
  } catch (err) {
    return { data: null, error: errorMessage(err) }
  }
}

async function loadOvationAurora(): Promise<
  SpaceWeatherState['ovationAurora']
> {
  try {
    return { data: await fetchOvationAurora(), error: null }
  } catch (err) {
    return { data: null, error: errorMessage(err) }
  }
}

async function loadAlerts(): Promise<SpaceWeatherState['alerts']> {
  try {
    return { data: await fetchAlerts(), error: null }
  } catch (err) {
    return { data: null, error: errorMessage(err) }
  }
}

async function loadEnlil(): Promise<SpaceWeatherState['enlil']> {
  try {
    const frames = await fetchEnlilAnimation()
    const latest = frames.at(-1)
    if (!latest) throw new Error('no ENLIL frames returned')
    return { data: latest, error: null }
  } catch (err) {
    return { data: null, error: errorMessage(err) }
  }
}

export function useSpaceWeather(
  intervalMs: number = POLL_INTERVAL_MS,
): SpaceWeatherState {
  const [state, setState] = useState<SpaceWeatherState>(initialState)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true

    async function poll() {
      const [
        kpAndHistory,
        wind,
        bz,
        flare,
        xrayFlux,
        solarRegions,
        ovationAurora,
        alerts,
        enlil,
      ] = await Promise.all([
        loadKpAndHistory(),
        loadWind(),
        loadBz(),
        loadFlare(),
        loadXrayFlux(),
        loadSolarRegions(),
        loadOvationAurora(),
        loadAlerts(),
        loadEnlil(),
      ])
      if (!mounted.current) return
      setState({
        loading: false,
        kp: kpAndHistory.kp,
        kpHistory: kpAndHistory.kpHistory,
        wind,
        bz,
        flare,
        xrayFlux,
        solarRegions,
        ovationAurora,
        alerts,
        enlil,
      })
    }

    poll()
    const id = setInterval(poll, intervalMs)
    return () => {
      mounted.current = false
      clearInterval(id)
    }
  }, [intervalMs])

  return state
}
