// Static scene compositor (Chunk 6, Plan.md §9a). Draws the sky/sun/earth/
// aurora sprite frames for the current tier state onto a canvas, no
// animation — a state change just swaps which frame is drawn.

import { getFrame } from './atlas.ts'
import type { FrameName } from './atlas.ts'
import {
  drawMagnetosphereEffect,
  stepFlarePop,
  transitionProgress,
} from './effects.ts'
import type { EffectsState } from './effects.ts'
import { overallSeverity } from './severity.ts'
import { computeSparklineBars } from './sparkline.ts'
import type { KpHistoryPoint } from './sparkline.ts'
import type { BzTier, FlareTier, KpTier, WindTier } from '../data/thresholds.ts'

export interface SceneTiers {
  kp: KpTier
  flare: FlareTier
  wind: WindTier
  bz: BzTier
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

const MASCOT_FRAMES: FrameName[] = [
  'mascot-calm',
  'mascot-unsettled',
  'mascot-storm',
  'mascot-severe',
]

export function mascotFrame(tiers: SceneTiers): FrameName {
  return MASCOT_FRAMES[overallSeverity(tiers)]
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
  dish: Rect
  mascot: Rect
  kpTrend: Rect
}

// Ground position of the radar-dish prop, as fractions of canvas width/
// height. `src/components/EnlilPanel.tsx` and `SourcesPanel.tsx` reuse
// these same fractions (as CSS percentages) to anchor their readouts to
// this prop in the landscape, so the ENLIL/sources UI reads as console
// panels built into the scene rather than a separate floating widget
// (Plan.md §5, Chunk 9).
export const DISH_RECT_FRACTIONS = { x: 0.03, y: 0.62, w: 0.16, h: 0.16 }

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
    dish: {
      x: width * DISH_RECT_FRACTIONS.x,
      y: height * DISH_RECT_FRACTIONS.y,
      w: width * DISH_RECT_FRACTIONS.w,
      h: height * DISH_RECT_FRACTIONS.h,
    },
    // Top-left sky, clear of the sun (top-right), the dish/ENLIL readout
    // (bottom-left), and the sources signpost (bottom-right).
    mascot: {
      x: width * 0.06,
      y: height * 0.08,
      w: width * 0.12,
      h: width * 0.12,
    },
    // Open sky between the mascot and the sun, above the aurora band (which
    // starts around 0.24) — a small "instrument screen" readout floating in
    // the scene rather than a separate chart widget (Chunk 13, Plan.md §10).
    kpTrend: {
      x: width * 0.3,
      y: height * 0.06,
      w: width * 0.34,
      h: height * 0.14,
    },
  }
}

// Small pixel-art bar-chart "instrument screen" showing the last 24h of Kp
// readings (Chunk 13). Drawn with plain canvas rects rather than sprite
// frames since the bar count is data-driven, not a fixed frame.
function drawKpTrend(
  ctx: CanvasRenderingContext2D,
  rect: Rect,
  history: KpHistoryPoint[],
): void {
  if (history.length === 0) return

  ctx.save()
  ctx.fillStyle = 'rgba(2, 6, 23, 0.85)'
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h)
  ctx.strokeStyle = 'rgba(71, 85, 105, 0.9)'
  ctx.lineWidth = 1
  ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.w - 1, rect.h - 1)

  const inset = 2
  const barRect: Rect = {
    x: rect.x + inset,
    y: rect.y + inset,
    w: rect.w - inset * 2,
    h: rect.h - inset * 2,
  }
  for (const bar of computeSparklineBars(history, barRect)) {
    ctx.fillStyle = bar.color
    ctx.fillRect(bar.rect.x, bar.rect.y, bar.rect.w, bar.rect.h)
  }
  ctx.restore()
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

function drawFrameAlpha(
  ctx: CanvasRenderingContext2D,
  sheet: CanvasImageSource,
  name: FrameName,
  rect: Rect,
  alpha: number,
): void {
  if (alpha <= 0) return
  if (alpha >= 1) {
    drawFrame(ctx, sheet, name, rect)
    return
  }
  ctx.save()
  ctx.globalAlpha = alpha
  drawFrame(ctx, sheet, name, rect)
  ctx.restore()
}

function tileFrameAlpha(
  ctx: CanvasRenderingContext2D,
  sheet: CanvasImageSource,
  name: FrameName,
  rect: Rect,
  tileSize: number,
  alpha: number,
): void {
  if (alpha <= 0) return
  if (alpha >= 1) {
    tileFrame(ctx, sheet, name, rect, tileSize)
    return
  }
  ctx.save()
  ctx.globalAlpha = alpha
  tileFrame(ctx, sheet, name, rect, tileSize)
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
//
// `effects`, when supplied (Chunk 8), crossfades the sky/sun/aurora frames
// across tier changes instead of hard-cutting between them, layers in the
// one-shot flare shake/pop, and draws the Bz-driven magnetosphere effect
// around earth. Omitting it (as in the Chunk 6/7 static/idle renders and
// their tests) reproduces the old hard-cut behavior.
export function drawScene(
  ctx: CanvasRenderingContext2D,
  sheet: CanvasImageSource,
  width: number,
  height: number,
  tiers: SceneTiers,
  elapsedMs = 0,
  effects?: EffectsState,
  kpHistory: KpHistoryPoint[] = [],
): void {
  ctx.imageSmoothingEnabled = false
  ctx.clearRect(0, 0, width, height)

  const layout = computeLayout(width, height)

  const skyProgress = effects ? transitionProgress(effects.sky, elapsedMs) : 1
  if (skyProgress < 1) {
    tileFrame(ctx, sheet, skyFrame(effects!.sky.prevValue), layout.sky, layout.skyTile)
  }
  tileFrameAlpha(ctx, sheet, skyFrame(tiers.kp), layout.sky, layout.skyTile, skyProgress)

  const sunProgress = effects ? transitionProgress(effects.sun, elapsedMs) : 1
  const sunPulse = 1 + 0.025 * Math.sin(elapsedMs / 900)
  const flarePop = effects ? stepFlarePop(effects, elapsedMs) : { shakeX: 0, shakeY: 0, scaleBoost: 0 }
  const sunRect = pulseRect(layout.sun, sunPulse + flarePop.scaleBoost)
  const shakenSunRect: Rect = {
    ...sunRect,
    x: sunRect.x + flarePop.shakeX,
    y: sunRect.y + flarePop.shakeY,
  }
  if (sunProgress < 1) {
    drawFrame(ctx, sheet, sunFrame(effects!.sun.prevValue), shakenSunRect)
  }
  drawFrameAlpha(ctx, sheet, sunFrame(tiers.flare), shakenSunRect, sunProgress)

  drawFrame(ctx, sheet, 'earth', layout.earth)
  drawMagnetosphereEffect(ctx, layout.earth, tiers.bz, elapsedMs)

  drawFrame(ctx, sheet, 'radar-dish', layout.dish)

  // Idle bob, same idea as the sun's breathing pulse (Chunk 7) — a bit of
  // motion so the mascot reads as alive rather than a static sticker.
  const mascotBob = Math.sin(elapsedMs / 700) * layout.mascot.h * 0.06
  drawFrame(ctx, sheet, mascotFrame(tiers), {
    ...layout.mascot,
    y: layout.mascot.y + mascotBob,
  })

  drawKpTrend(ctx, layout.kpTrend, kpHistory)

  const auroraProgress = effects ? transitionProgress(effects.aurora, elapsedMs) : 1
  const twinkle = 0.75 + 0.25 * Math.sin(elapsedMs / 620)
  const prevAurora = effects && auroraProgress < 1 ? auroraFrame(effects.aurora.prevValue) : null
  const currAurora = auroraFrame(tiers.kp)
  if (prevAurora) {
    tileFrameAlpha(ctx, sheet, prevAurora, layout.aurora, layout.auroraTile, (1 - auroraProgress) * twinkle)
  }
  if (currAurora) {
    tileFrameAlpha(ctx, sheet, currAurora, layout.aurora, layout.auroraTile, auroraProgress * twinkle)
  }
}
