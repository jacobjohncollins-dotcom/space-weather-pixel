import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import {
  parsePlanetaryKIndex,
  parseSolarWindPlasma,
  parseSolarWindMag,
  parseXrayFlux,
  parseXrayFlares,
  parseSolarRegions,
  parseOvationAurora,
  parseAlerts,
  parseEnlilAnimation,
  fetchPlanetaryKIndex,
  fetchSolarWindPlasma,
  fetchSolarWindMag,
  fetchXrayFlux,
  fetchXrayFlares,
  fetchSolarRegions,
  fetchOvationAurora,
  fetchAlerts,
  fetchEnlilAnimation,
} from './noaa.ts'

import kIndexFixture from './__fixtures__/planetary-k-index.json'
import plasmaFixture from './__fixtures__/solar-wind-speed.json'
import magFixture from './__fixtures__/solar-wind-mag-field.json'
import xrayFluxFixture from './__fixtures__/xrays-6-hour.json'
import xrayFlaresFixture from './__fixtures__/xray-flares-latest.json'
import solarRegionsFixture from './__fixtures__/solar-regions.json'
import ovationFixture from './__fixtures__/ovation-aurora-latest.json'
import alertsFixture from './__fixtures__/alerts.json'
import enlilFixture from './__fixtures__/enlil.json'

describe('parse functions', () => {
  it('parses planetary K-index entries', () => {
    const readings = parsePlanetaryKIndex(kIndexFixture)
    expect(readings).toHaveLength(3)
    expect(readings[0]).toEqual({
      timeTag: '2024-05-10T00:00:00',
      kp: 2.67,
      aRunning: 7,
      stationCount: 6,
    })
    expect(readings[2].kp).toBe(8)
  })

  it('parses solar wind plasma entries, keeping only the active source', () => {
    const readings = parseSolarWindPlasma(plasmaFixture)
    expect(readings).toHaveLength(2)
    expect(readings[0]).toEqual({
      timeTag: '2024-05-10T00:00:00',
      density: 3.51,
      speed: 412.3,
      temperature: 94500,
    })
    expect(readings[1]).toEqual({
      timeTag: '2024-05-10T00:01:00',
      density: null,
      speed: null,
      temperature: null,
    })
  })

  it('parses solar wind mag entries, keeping only the active source', () => {
    const readings = parseSolarWindMag(magFixture)
    expect(readings).toHaveLength(2)
    expect(readings[0]).toEqual({
      timeTag: '2024-05-10T00:00:00',
      bx: 1.2,
      by: -3.4,
      bz: -12.6,
      lon: 290.1,
      lat: -15.2,
      bt: 13.5,
    })
    expect(readings[1].bz).toBeNull()
  })

  it('parses GOES X-ray flux entries', () => {
    const readings = parseXrayFlux(xrayFluxFixture)
    expect(readings).toHaveLength(2)
    expect(readings[1]).toEqual({
      timeTag: '2024-05-10T00:01:00Z',
      satellite: 16,
      fluxWatts: 4.5e-6,
      energyBand: '0.1-0.8nm',
    })
  })

  it('parses X-ray flare events', () => {
    const flares = parseXrayFlares(xrayFlaresFixture)
    expect(flares).toEqual([
      {
        flareId: '16-2024-05-10-001',
        beginTime: '2024-05-10T00:12:00Z',
        maxTime: '2024-05-10T00:34:00Z',
        endTime: '2024-05-10T00:51:00Z',
        maxClass: 'M3.2',
        satellite: 16,
      },
    ])
  })

  it('parses solar region entries', () => {
    const regions = parseSolarRegions(solarRegionsFixture)
    expect(regions).toEqual([
      {
        region: 13664,
        latitude: 8,
        longitude: -45,
        area: 1500,
        spotClass: 'Fkc',
        numberSpots: 42,
      },
    ])
  })

  it('parses OVATION aurora forecast', () => {
    const aurora = parseOvationAurora(ovationFixture)
    expect(aurora.observationTime).toBe('2024-05-10T00:00:00Z')
    expect(aurora.forecastTime).toBe('2024-05-10T00:30:00Z')
    expect(aurora.coordinates).toEqual([
      [0, 65, 10],
      [10, 66, 25],
    ])
  })

  it('parses alert entries', () => {
    const alerts = parseAlerts(alertsFixture)
    expect(alerts).toHaveLength(1)
    expect(alerts[0].productId).toBe('20240510_0001')
    expect(alerts[0].message).toContain('Geomagnetic K-index')
  })

  it('parses ENLIL animation frames', () => {
    const frames = parseEnlilAnimation(enlilFixture)
    expect(frames).toEqual([
      {
        time: '2024-05-10T00:00:00Z',
        imageUrl: '/products/animations/enlil/latest/enlil_001.jpg',
      },
      {
        time: '2024-05-10T00:30:00Z',
        imageUrl: '/products/animations/enlil/latest/enlil_002.jpg',
      },
    ])
  })

  it('returns an empty array for an empty feed', () => {
    expect(parsePlanetaryKIndex([])).toEqual([])
  })
})

describe('fetch wrappers', () => {
  const fixtures: Record<string, unknown> = {
    '/data/planetary-k-index.json': kIndexFixture,
    '/data/solar-wind-plasma.json': plasmaFixture,
    '/data/solar-wind-mag.json': magFixture,
    '/data/xray-flux.json': xrayFluxFixture,
    '/data/xray-flares.json': xrayFlaresFixture,
    '/data/solar-regions.json': solarRegionsFixture,
    '/data/ovation-aurora.json': ovationFixture,
    '/data/alerts.json': alertsFixture,
    '/data/enlil-animation.json': enlilFixture,
  }

  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL) => {
        const path = input.toString()
        const body = fixtures[path]
        if (body === undefined) {
          return new Response(null, { status: 404 })
        }
        return new Response(JSON.stringify(body), { status: 200 })
      }),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('fetches and parses each feed from the correct URL', async () => {
    expect((await fetchPlanetaryKIndex())[0].kp).toBe(2.67)
    expect((await fetchSolarWindPlasma())[0].speed).toBe(412.3)
    expect((await fetchSolarWindMag())[0].bz).toBe(-12.6)
    expect((await fetchXrayFlux())[0].satellite).toBe(16)
    expect((await fetchXrayFlares())[0].maxClass).toBe('M3.2')
    expect((await fetchSolarRegions())[0].region).toBe(13664)
    expect((await fetchOvationAurora()).coordinates).toHaveLength(2)
    expect((await fetchAlerts())[0].productId).toBe('20240510_0001')
    expect((await fetchEnlilAnimation())[0].imageUrl).toContain('enlil_001.jpg')
  })

  it('throws when a feed responds with a non-OK status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(null, { status: 503 })),
    )
    await expect(fetchPlanetaryKIndex()).rejects.toThrow(/503/)
  })
})
