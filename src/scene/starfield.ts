// Procedural deep-night-sky background: a tier-tinted gradient wash, a few
// soft nebula glow blobs, and a dense multi-layer starfield. Replaces the
// old tiled 16x16 sky sprite, which repeated so densely at scene size that
// its handful of deterministic star pixels read as visible diagonal dashes
// rather than a sky. Everything here is a plain canvas draw (gradients,
// fillRect, shadowBlur), not a sprite, so it can be as dense and varied as
// the canvas is wide without an atlas frame per star.

import type { KpTier } from '../data/thresholds.ts'

interface Rect {
  x: number
  y: number
  w: number
  h: number
}

type RGB = readonly [number, number, number]

interface TierPalette {
  top: RGB
  bottom: RGB
  nebulae: readonly RGB[]
}

// Deeper, richer version of the old flat sky-tier backgrounds (which were
// roughly [10,12,40] / [20,14,55] / [45,12,60] / [70,14,30]): a top-to-
// bottom gradient for atmospheric depth, plus accent hues for the nebula
// glow blobs.
const TIER_PALETTE: Record<KpTier, TierPalette> = {
  calm: {
    top: [4, 5, 16],
    bottom: [14, 18, 46],
    nebulae: [
      [45, 65, 130],
      [70, 45, 120],
      [30, 95, 120],
    ],
  },
  unsettled: {
    top: [8, 5, 22],
    bottom: [42, 22, 62],
    nebulae: [
      [90, 45, 150],
      [45, 85, 160],
      [120, 45, 130],
    ],
  },
  storm: {
    top: [16, 4, 24],
    bottom: [78, 18, 64],
    nebulae: [
      [150, 35, 130],
      [95, 25, 150],
      [170, 65, 105],
    ],
  },
  severe: {
    top: [24, 4, 10],
    bottom: [120, 28, 22],
    nebulae: [
      [190, 55, 45],
      [150, 25, 65],
      [210, 100, 45],
    ],
  },
}

interface Star {
  x: number
  y: number
  size: number
  baseAlpha: number
  twinkleSpeed: number
  twinklePhase: number
  hero: boolean
}

interface Nebula {
  // fractions of rect width/height, not absolute — stable across resizes
  // relative to the scene, only regenerated when the canvas size changes.
  fx: number
  fy: number
  fr: number
}

interface Starfield {
  width: number
  height: number
  stars: Star[]
  nebulae: Nebula[]
}

const DUST_COUNT = 90
const MID_COUNT = 45
const HERO_COUNT = 9

// Deterministic PRNG seeded from canvas size, so the star layout is stable
// frame-to-frame (regenerated only on resize) without threading extra state
// through Scene.tsx's render loop — computeLayout() already works the same
// way, as a pure function of width/height.
function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function generate(width: number, height: number): Starfield {
  const rand = mulberry32(Math.round(width * 2654435761) ^ Math.round(height))
  const stars: Star[] = []

  for (let i = 0; i < DUST_COUNT + MID_COUNT + HERO_COUNT; i++) {
    const hero = i >= DUST_COUNT + MID_COUNT
    const mid = !hero && i >= DUST_COUNT
    stars.push({
      x: rand() * width,
      y: rand() * height,
      size: hero ? 2 : mid ? 1.5 : 1,
      baseAlpha: hero ? 0.85 : mid ? 0.55 : 0.3 + rand() * 0.25,
      twinkleSpeed: 0.0006 + rand() * 0.0016,
      twinklePhase: rand() * Math.PI * 2,
      hero,
    })
  }

  const nebulae: Nebula[] = Array.from({ length: 3 }, () => ({
    fx: 0.12 + rand() * 0.76,
    fy: 0.06 + rand() * 0.55,
    fr: 0.3 + rand() * 0.22,
  }))

  return { width, height, stars, nebulae }
}

let cache: Starfield | null = null

function getStarfield(width: number, height: number): Starfield {
  if (!cache || cache.width !== width || cache.height !== height) {
    cache = generate(width, height)
  }
  return cache
}

function rgba([r, g, b]: RGB, a: number): string {
  return `rgba(${r}, ${g}, ${b}, ${a})`
}

function fillGradientLayer(
  ctx: CanvasRenderingContext2D,
  rect: Rect,
  palette: TierPalette,
  alpha: number,
): void {
  if (alpha <= 0) return
  ctx.save()
  ctx.globalAlpha = alpha
  const grad = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.h)
  grad.addColorStop(0, rgba(palette.top, 1))
  grad.addColorStop(1, rgba(palette.bottom, 1))
  ctx.fillStyle = grad
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h)
  ctx.restore()
}

function fillNebulaLayer(
  ctx: CanvasRenderingContext2D,
  rect: Rect,
  sf: Starfield,
  palette: TierPalette,
  alpha: number,
): void {
  if (alpha <= 0) return
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.globalCompositeOperation = 'lighter'
  sf.nebulae.forEach((n, i) => {
    const color = palette.nebulae[i % palette.nebulae.length]
    const cx = rect.x + n.fx * rect.w
    const cy = rect.y + n.fy * rect.h
    const r = n.fr * Math.max(rect.w, rect.h)
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
    grad.addColorStop(0, rgba(color, 0.22))
    grad.addColorStop(1, rgba(color, 0))
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.fill()
  })
  ctx.restore()
}

function drawStars(
  ctx: CanvasRenderingContext2D,
  rect: Rect,
  sf: Starfield,
  elapsedMs: number,
): void {
  ctx.save()
  for (const s of sf.stars) {
    const twinkle = 0.5 + 0.5 * Math.sin(elapsedMs * s.twinkleSpeed + s.twinklePhase)
    const alpha = s.baseAlpha * (s.hero ? 0.55 + 0.45 * twinkle : 0.65 + 0.35 * twinkle)
    const px = Math.round(rect.x + s.x)
    const py = Math.round(rect.y + s.y)

    if (s.hero) {
      // Small pixel-art sparkle cross plus a soft glow halo — the one place
      // this scene reaches past crisp pixels into a real blur, since a tiny
      // handful of bright "hero" stars carry the glow, not the whole field.
      ctx.save()
      ctx.globalAlpha = alpha
      ctx.shadowColor = 'rgba(255, 255, 255, 0.9)'
      ctx.shadowBlur = 5
      ctx.fillStyle = '#fff'
      ctx.fillRect(px, py, s.size, s.size)
      ctx.shadowBlur = 0
      ctx.globalAlpha = alpha * 0.45
      ctx.fillRect(px - 3, py, 2, 1)
      ctx.fillRect(px + s.size + 1, py, 2, 1)
      ctx.fillRect(px, py - 3, 1, 2)
      ctx.fillRect(px, py + s.size + 1, 1, 2)
      ctx.restore()
    } else {
      ctx.globalAlpha = alpha
      ctx.fillStyle = '#fff'
      ctx.fillRect(px, py, s.size, s.size)
    }
  }
  ctx.restore()
}

// `prevKp`/`progress` mirror the crossfade timing draw.ts already runs for
// the sun/aurora sprite frames (Chunk 8's EffectsState) — reused here so the
// gradient+nebula tint blends across a tier change too instead of cutting.
export function drawNightSky(
  ctx: CanvasRenderingContext2D,
  rect: Rect,
  kp: KpTier,
  prevKp: KpTier,
  progress: number,
  elapsedMs: number,
): void {
  const sf = getStarfield(rect.w, rect.h)

  if (progress < 1) {
    const prevPalette = TIER_PALETTE[prevKp]
    fillGradientLayer(ctx, rect, prevPalette, 1)
    fillNebulaLayer(ctx, rect, sf, prevPalette, 1)
  }
  const palette = TIER_PALETTE[kp]
  fillGradientLayer(ctx, rect, palette, progress < 1 ? progress : 1)
  fillNebulaLayer(ctx, rect, sf, palette, progress < 1 ? progress : 1)

  drawStars(ctx, rect, sf, elapsedMs)
}
