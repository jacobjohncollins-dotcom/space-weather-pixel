// Static scene compositor (Chunk 6, Plan.md §9a). Draws the sky/sun/earth/
// aurora sprite frames for the current tier state onto a canvas, no
// animation — a state change just swaps which frame is drawn.

import { getFrame } from './atlas.ts'
import type { FrameName } from './atlas.ts'
import type { FlareTier, KpTier, WindTier } from '../data/thresholds.ts'

export interface SceneTiers {
  kp: KpTier
  flare: FlareTier
  wind: WindTier
}

export function skyFrame(kp: KpTier): FrameName {
  switch (kp) {
    case 'calm':
      return 'sky-quiet'
    case 'unsettled':
      return 'sky-active'
    case 'storm':
      return 'sky-storm'
    case 'severe':
      return 'sky-severe'
  }
}

export function sunFrame(flare: FlareTier): FrameName {
  switch (flare) {
    case 'quiet':
      return 'sun-calm'
    case 'small':
      return 'sun-active'
    case 'strong':
      return 'sun-flare-minor'
    case 'extreme':
      return 'sun-flare-major'
  }
}

// Aurora only becomes visible once geomagnetic activity picks up.
export function auroraFrame(kp: KpTier): FrameName | null {
  switch (kp) {
    case 'calm':
      return null
    case 'unsettled':
      return 'aurora-faint'
    case 'storm':
      return 'aurora-moderate'
    case 'severe':
      return 'aurora-strong'
  }
}

interface Rect {
  x: number
  y: number
  w: number
  h: number
}

interface Layout {
  sky: Rect
  skyTile: number
  sun: Rect
  earth: Rect
  aurora: Rect
  auroraTile: number
}

// All positions/sizes are fractions of the canvas size so the layout holds
// up across canvas dimensions/resolutions (Chunk 6 done-check). The sky and
// aurora sprites are small streak/wave motifs (see public/sprites/sheet.png)
// meant to repeat as a texture, not stretch as a single blown-up image, so
// their frames are tiled rather than scaled to fill their rect.
export function computeLayout(width: number, height: number): Layout {
  const sunSize = width * 0.22
  const earthSize = width * 0.5

  return {
    sky: { x: 0, y: 0, w: width, h: height },
    skyTile: width / 14,
    sun: {
      x: width * 0.72,
      y: height * 0.08,
      w: sunSize,
      h: sunSize,
    },
    earth: {
      x: width / 2 - earthSize / 2,
      y: height - earthSize * 0.75,
      w: earthSize,
      h: earthSize,
    },
    aurora: {
      x: width / 2 - earthSize * 0.7,
      y: height - earthSize * 0.95,
      w: earthSize * 1.4,
      h: earthSize * 0.3,
    },
    auroraTile: width / 20,
  }
}

function drawFrame(
  ctx: CanvasRenderingContext2D,
  sheet: CanvasImageSource,
  name: FrameName,
  rect: Rect,
): void {
  const frame = getFrame(name)
  ctx.drawImage(
    sheet,
    frame.x,
    frame.y,
    frame.w,
    frame.h,
    rect.x,
    rect.y,
    rect.w,
    rect.h,
  )
}

// Repeats a frame across a rect at `tileSize`, clipped to the rect bounds,
// so a small motif reads as a texture instead of one stretched blow-up.
function tileFrame(
  ctx: CanvasRenderingContext2D,
  sheet: CanvasImageSource,
  name: FrameName,
  rect: Rect,
  tileSize: number,
): void {
  const frame = getFrame(name)
  ctx.save()
  ctx.beginPath()
  ctx.rect(rect.x, rect.y, rect.w, rect.h)
  ctx.clip()

  for (let y = rect.y; y < rect.y + rect.h; y += tileSize) {
    for (let x = rect.x; x < rect.x + rect.w; x += tileSize) {
      ctx.drawImage(
        sheet,
        frame.x,
        frame.y,
        frame.w,
        frame.h,
        x,
        y,
        tileSize,
        tileSize,
      )
    }
  }

  ctx.restore()
}

// Scales a rect around its own center — used for the sun's idle "breathing"
// pulse so it grows/shrinks in place rather than drifting.
function pulseRect(rect: Rect, scale: number): Rect {
  const cx = rect.x + rect.w / 2
  const cy = rect.y + rect.h / 2
  const w = rect.w * scale
  const h = rect.h * scale
  return { x: cx - w / 2, y: cy - h / 2, w, h }
}

// `elapsedMs` drives the idle breathing/twinkle animation (Chunk 7): a slow
// sinusoidal pulse on the sun's scale and the aurora's opacity. Passing 0
// (the default) reproduces the static Chunk 6 render.
export function drawScene(
  ctx: CanvasRenderingContext2D,
  sheet: CanvasImageSource,
  width: number,
  height: number,
  tiers: SceneTiers,
  elapsedMs = 0,
): void {
  ctx.imageSmoothingEnabled = false
  ctx.clearRect(0, 0, width, height)

  const layout = computeLayout(width, height)
  tileFrame(ctx, sheet, skyFrame(tiers.kp), layout.sky, layout.skyTile)

  const sunPulse = 1 + 0.025 * Math.sin(elapsedMs / 900)
  drawFrame(ctx, sheet, sunFrame(tiers.flare), pulseRect(layout.sun, sunPulse))
  drawFrame(ctx, sheet, 'earth', layout.earth)

  const aurora = auroraFrame(tiers.kp)
  if (aurora) {
    ctx.save()
    ctx.globalAlpha = 0.75 + 0.25 * Math.sin(elapsedMs / 620)
    tileFrame(ctx, sheet, aurora, layout.aurora, layout.auroraTile)
    ctx.restore()
  }
}
