// Generates placeholder pixel-art sprites for Chunk 5 (see Plan.md §9a).
// These are AI-generated placeholders per the resolved open question in
// Plan.md §10 — intended to be swapped for hand-drawn/commissioned art
// later without changing the atlas contract in src/scene/atlas.ts.
//
// Each frame is a LOGICAL x LOGICAL pixel-art grid, scaled up by SCALE into
// a CELL x CELL cell on a fixed COLUMNS x ROWS sprite sheet. Run with:
//   node scripts/generate-sprites.mjs

import { PNG } from 'pngjs'
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '..', 'public', 'sprites')

const LOGICAL = 16
const SCALE = 2
const CELL = LOGICAL * SCALE
const COLUMNS = 4
const ROWS = 5
const SHEET_W = CELL * COLUMNS
const SHEET_H = CELL * ROWS

/** @typedef {[number, number, number, number]} RGBA */

function hex(r, g, b, a = 255) {
  return [r, g, b, a]
}

function dist(x, y, cx, cy) {
  return Math.hypot(x - cx, y - cy)
}

// --- per-frame logical-pixel drawers -------------------------------------
// Each drawer returns a LOGICAL x LOGICAL grid of RGBA (or null for
// transparent) pixels.

function makeGrid(fill = null) {
  return Array.from({ length: LOGICAL }, () => Array(LOGICAL).fill(fill))
}

function drawSun(coreColor, rayColor, rayLength, flareSize) {
  const g = makeGrid()
  const cx = LOGICAL / 2 - 0.5
  const cy = LOGICAL / 2 - 0.5
  const radius = 4
  for (let y = 0; y < LOGICAL; y++) {
    for (let x = 0; x < LOGICAL; x++) {
      const d = dist(x, y, cx, cy)
      if (d <= radius) {
        g[y][x] = coreColor
      } else if (d <= radius + rayLength) {
        // rays along the 4 diagonals + cardinal directions
        const angle = (Math.atan2(y - cy, x - cx) * 180) / Math.PI
        const onRay = Math.abs(Math.round(angle / 45) * 45 - angle) < 12
        if (onRay) g[y][x] = rayColor
      }
    }
  }
  if (flareSize > 0) {
    // a bright flare bump on the upper-right limb
    const fx = cx + radius * 0.7
    const fy = cy - radius * 0.7
    for (let y = 0; y < LOGICAL; y++) {
      for (let x = 0; x < LOGICAL; x++) {
        if (dist(x, y, fx, fy) <= flareSize) g[y][x] = hex(255, 255, 255)
      }
    }
  }
  return g
}

function drawEarth() {
  const g = makeGrid()
  const cx = LOGICAL / 2 - 0.5
  const cy = LOGICAL / 2 - 0.5
  const radius = 6
  for (let y = 0; y < LOGICAL; y++) {
    for (let x = 0; x < LOGICAL; x++) {
      const d = dist(x, y, cx, cy)
      if (d > radius) continue
      // simple continent speckle via a fixed pseudo-random threshold
      const land = ((x * 7 + y * 13) % 5 === 0) && d < radius - 1
      g[y][x] = land ? hex(74, 124, 61) : hex(46, 92, 158)
    }
  }
  return g
}

function drawAurora(intensity) {
  const g = makeGrid(hex(8, 10, 24))
  const bands =
    intensity === 'faint'
      ? [hex(40, 120, 90, 140)]
      : intensity === 'moderate'
        ? [hex(50, 200, 140), hex(60, 140, 220, 160)]
        : [hex(80, 255, 170), hex(90, 160, 255), hex(220, 100, 220, 200)]
  bands.forEach((color, bandIndex) => {
    for (let x = 0; x < LOGICAL; x++) {
      const wave =
        LOGICAL / 2 + Math.sin(x / 2.2 + bandIndex * 1.7) * (2 + bandIndex)
      const y = Math.round(wave)
      for (let t = -bandIndex; t <= bandIndex; t++) {
        const yy = y + t
        if (yy >= 0 && yy < LOGICAL) g[yy][x] = color
      }
    }
  })
  return g
}

// Ground-level dish antenna prop (Chunk 9) — the console the ENLIL/sources
// readouts are anchored to in the scene, so those readouts render as part
// of the landscape instead of a separate floating widget (Plan.md §5).
function drawDish() {
  const g = makeGrid()
  const metal = hex(120, 130, 150)
  const metalDark = hex(70, 78, 96)
  const glow = hex(90, 220, 210)

  // stand
  for (let y = 10; y < 15; y++) {
    g[y][7] = metalDark
    g[y][8] = metalDark
  }
  g[14][6] = metalDark
  g[14][9] = metalDark

  // dish bowl (arc opening upward)
  const cx = 7.5
  const cy = 8
  const r = 5
  for (let x = 0; x < LOGICAL; x++) {
    for (let y = 0; y < LOGICAL; y++) {
      const d = dist(x, y, cx, cy)
      if (d >= r - 1 && d <= r && y <= cy) {
        g[y][x] = metal
      }
    }
  }
  // dish rim highlight
  g[cy - r][Math.round(cx)] = hex(200, 210, 225)

  // signal light on the mast
  g[9][7] = glow
  g[9][8] = glow

  return g
}

// Companion mascot (Chunk 12) — a small floating drone whose body color and
// eye/mouth shape shift with the overall "worst of all feeds" severity
// (src/scene/severity.ts), so it reads as a quick emotional summary of the
// scene without adding any new text.
function drawMascot(mood) {
  const g = makeGrid()
  const bodyColor = {
    calm: hex(120, 210, 170),
    unsettled: hex(230, 205, 90),
    storm: hex(235, 145, 70),
    severe: hex(235, 80, 80),
  }[mood]
  const dark = hex(30, 34, 40)
  const antennaGlow = mood === 'severe' ? hex(255, 100, 100) : hex(210, 220, 235)
  const cx = 7.5
  const cy = 8.5
  const r = 5

  for (let y = 0; y < LOGICAL; y++) {
    for (let x = 0; x < LOGICAL; x++) {
      if (dist(x, y, cx, cy) <= r) g[y][x] = bodyColor
    }
  }

  // antenna
  g[2][7] = dark
  g[1][7] = antennaGlow

  // eyes + mouth per mood
  if (mood === 'calm') {
    g[7][5] = dark
    g[7][10] = dark
    g[10][6] = dark
    g[11][7] = dark
    g[11][8] = dark
    g[10][9] = dark
  } else if (mood === 'unsettled') {
    g[6][5] = dark
    g[7][5] = dark
    g[6][10] = dark
    g[7][10] = dark
    g[11][6] = dark
    g[11][7] = dark
    g[11][8] = dark
    g[11][9] = dark
  } else if (mood === 'storm') {
    g[6][5] = dark
    g[7][5] = dark
    g[6][10] = dark
    g[7][10] = dark
    g[10][7] = dark
    g[11][6] = dark
    g[11][9] = dark
    g[12][7] = dark
    g[12][8] = dark
  } else {
    // severe: X eyes, open worried mouth
    g[6][4] = dark
    g[7][5] = dark
    g[6][6] = dark
    g[6][9] = dark
    g[7][10] = dark
    g[6][11] = dark
    g[10][6] = dark
    g[10][9] = dark
    g[11][6] = dark
    g[11][9] = dark
    g[12][7] = dark
    g[12][8] = dark
  }

  return g
}

function drawSky(stormLevel) {
  const palettes = {
    quiet: { bg: hex(10, 12, 40), star: hex(220, 220, 255), density: 10 },
    active: { bg: hex(20, 14, 55), star: hex(230, 220, 255), density: 16 },
    storm: { bg: hex(45, 12, 60), star: hex(255, 210, 240), density: 22 },
    severe: { bg: hex(70, 14, 30), star: hex(255, 200, 160), density: 30 },
  }
  const { bg, star, density } = palettes[stormLevel]
  const g = makeGrid(bg)
  for (let i = 0; i < density; i++) {
    // deterministic pseudo-random star placement so output is stable
    const x = (i * 37 + stormLevel.length * 5) % LOGICAL
    const y = (i * 53 + stormLevel.length * 11) % LOGICAL
    g[y][x] = star
  }
  return g
}

// --- sheet layout ----------------------------------------------------------

const FRAMES = [
  { name: 'sun-calm', row: 0, col: 0, grid: drawSun(hex(255, 214, 90), hex(255, 214, 90, 150), 1, 0) },
  { name: 'sun-active', row: 0, col: 1, grid: drawSun(hex(255, 178, 60), hex(255, 178, 60, 170), 2, 0) },
  { name: 'sun-flare-minor', row: 0, col: 2, grid: drawSun(hex(255, 140, 40), hex(255, 140, 40, 190), 2, 1.5) },
  { name: 'sun-flare-major', row: 0, col: 3, grid: drawSun(hex(255, 90, 40), hex(255, 200, 90, 210), 3, 2.5) },

  { name: 'earth', row: 1, col: 0, grid: drawEarth() },
  { name: 'aurora-faint', row: 1, col: 1, grid: drawAurora('faint') },
  { name: 'aurora-moderate', row: 1, col: 2, grid: drawAurora('moderate') },
  { name: 'aurora-strong', row: 1, col: 3, grid: drawAurora('strong') },

  { name: 'sky-quiet', row: 2, col: 0, grid: drawSky('quiet') },
  { name: 'sky-active', row: 2, col: 1, grid: drawSky('active') },
  { name: 'sky-storm', row: 2, col: 2, grid: drawSky('storm') },
  { name: 'sky-severe', row: 2, col: 3, grid: drawSky('severe') },

  { name: 'radar-dish', row: 3, col: 0, grid: drawDish() },

  { name: 'mascot-calm', row: 4, col: 0, grid: drawMascot('calm') },
  { name: 'mascot-unsettled', row: 4, col: 1, grid: drawMascot('unsettled') },
  { name: 'mascot-storm', row: 4, col: 2, grid: drawMascot('storm') },
  { name: 'mascot-severe', row: 4, col: 3, grid: drawMascot('severe') },
]

const png = new PNG({ width: SHEET_W, height: SHEET_H })

for (const frame of FRAMES) {
  const originX = frame.col * CELL
  const originY = frame.row * CELL
  for (let ly = 0; ly < LOGICAL; ly++) {
    for (let lx = 0; lx < LOGICAL; lx++) {
      const px = frame.grid[ly][lx]
      if (!px) continue
      const [r, g, b, a] = px.length === 4 ? px : [...px, 255]
      for (let sy = 0; sy < SCALE; sy++) {
        for (let sx = 0; sx < SCALE; sx++) {
          const x = originX + lx * SCALE + sx
          const y = originY + ly * SCALE + sy
          const idx = (SHEET_W * y + x) << 2
          png.data[idx] = r
          png.data[idx + 1] = g
          png.data[idx + 2] = b
          png.data[idx + 3] = a
        }
      }
    }
  }
}

mkdirSync(outDir, { recursive: true })
const sheetPath = join(outDir, 'sheet.png')
writeFileSync(sheetPath, PNG.sync.write(png))

const atlas = {
  sheet: '/sprites/sheet.png',
  cellSize: CELL,
  frames: Object.fromEntries(
    FRAMES.map((f) => [
      f.name,
      { x: f.col * CELL, y: f.row * CELL, w: CELL, h: CELL },
    ]),
  ),
}
writeFileSync(join(outDir, 'atlas.json'), JSON.stringify(atlas, null, 2) + '\n')

console.log(`Wrote ${sheetPath} (${SHEET_W}x${SHEET_H}) and atlas.json with ${FRAMES.length} frames.`)
