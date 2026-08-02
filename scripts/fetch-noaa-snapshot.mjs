// Fetches each NOAA SWPC feed server-side and republishes it as same-origin
// static JSON under public/data/, so the deployed site never calls NOAA
// directly from the browser. NOAA started returning an AWS WAF JS challenge
// (HTTP 202, empty body) to cross-origin fetch() calls instead of real feed
// data — a challenge a browser can't solve for a request to another origin —
// but a plain server-side request from this Action isn't affected.
//
// Run before `npm run build` (Vite copies public/ into dist/ at build time)
// via the scheduled "Refresh NOAA data" workflow. Each feed is best-effort:
// a single feed failing (still-challenged, network hiccup, bad JSON) logs a
// warning and leaves that one file untouched rather than failing the whole
// snapshot, so a bad run doesn't wipe out otherwise-good cached data.

import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, extname } from 'node:path'
import feedManifest from '../src/data/feed-manifest.json' with { type: 'json' }

const __dirname = dirname(fileURLToPath(import.meta.url))
const NOAA_BASE_URL = 'https://services.swpc.noaa.gov'
const outDir = join(__dirname, '..', 'public', 'data')

mkdirSync(outDir, { recursive: true })

async function fetchFeed(remote) {
  const response = await fetch(`${NOAA_BASE_URL}${remote}`)
  if (!response.ok) {
    throw new Error(`${remote} responded with ${response.status}`)
  }
  return response.json()
}

// NOAA's enlil.json is really an animation reel (the full history it
// returns, ~169 frames spanning several days at roughly hourly cadence) —
// EnlilPanel plays the whole thing as a looping sequence rather than a
// single static image. Downloaded with bounded concurrency so mirroring
// ~169 images doesn't make the snapshot step run 169 round-trips serially.
const ENLIL_FETCH_CONCURRENCY = 12

async function mapWithConcurrency(items, limit, fn) {
  const results = new Array(items.length)
  let next = 0
  async function worker() {
    while (next < items.length) {
      const i = next++
      results[i] = await fn(items[i], i)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

async function refreshEnlilImage(frames) {
  if (frames.length === 0) return frames

  const mirrored = await mapWithConcurrency(frames, ENLIL_FETCH_CONCURRENCY, async (frame, i) => {
    if (!frame.url) return null
    const ext = extname(frame.url) || '.jpg'
    const localImageName = `enlil-frame-${i}${ext}`
    const imageResponse = await fetch(`${NOAA_BASE_URL}${frame.url}`)
    if (!imageResponse.ok) {
      throw new Error(`ENLIL image ${frame.url} responded with ${imageResponse.status}`)
    }
    const bytes = Buffer.from(await imageResponse.arrayBuffer())
    writeFileSync(join(outDir, localImageName), bytes)
    // Real NOAA frames only have `url`, no `time` field (unlike the fixture
    // this app's types were modeled on) — stash the original NOAA filename
    // as `time` instead, both satisfying parseEnlilAnimation's expected
    // shape and giving each frame a real per-snapshot cache-busting value.
    return { time: frame.url, url: `/data/${localImageName}` }
  })
  return mirrored.filter((frame) => frame !== null)
}

async function main() {
  let failures = 0

  for (const [key, { remote, local }] of Object.entries(feedManifest)) {
    try {
      let data = await fetchFeed(remote)
      if (key === 'enlilAnimation') {
        data = await refreshEnlilImage(data)
      }
      writeFileSync(join(outDir, local), JSON.stringify(data))
      console.log(`ok   ${key} -> ${local}`)
    } catch (err) {
      failures += 1
      console.warn(`skip ${key}: ${err.message}`)
    }
  }

  if (failures === Object.keys(feedManifest).length) {
    console.error('every feed failed — leaving public/data/ as it was')
    process.exitCode = 1
  }
}

await main()
