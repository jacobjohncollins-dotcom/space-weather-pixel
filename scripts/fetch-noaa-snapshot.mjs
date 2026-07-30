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

// NOAA's enlil.json is really an animation reel (~169 frames spanning
// several days at roughly hourly cadence) — EnlilPanel plays the most
// recent ENLIL_FRAME_COUNT of them as a looping sequence rather than a
// single static image. Downloading all 169 on every ~15-minute snapshot
// would be wasteful bandwidth for a loop that only needs to cover roughly
// the last day.
const ENLIL_FRAME_COUNT = 18

async function refreshEnlilImage(frames) {
  const recent = frames.slice(-ENLIL_FRAME_COUNT)
  if (recent.length === 0) return frames

  const mirrored = []
  for (const [i, frame] of recent.entries()) {
    if (!frame.url) continue
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
    mirrored.push({ time: frame.url, url: `/data/${localImageName}` })
  }
  return mirrored
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
