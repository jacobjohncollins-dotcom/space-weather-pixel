// Solar wind streak particle layer (Chunk 7, Plan.md §9a). Pure canvas
// particles, no sprites — a field of short horizontal streaks drifting
// leftward whose count/speed/opacity scale with the wind tier.

import type { WindTier } from '../data/thresholds.ts'

export interface WindParticle {
  x: number
  y: number
  len: number
  speed: number
}

export interface WindField {
  tier: WindTier
  particles: WindParticle[]
}

interface WindConfig {
  count: number
  speedMin: number
  speedMax: number
  length: number
  alpha: number
  lineWidth: number
}

// Cyan, rather than the sky sprite's white dash motif, so the wind layer
// reads as its own current instead of blending into the background texture.
const WIND_COLOR = '125, 211, 252'

const WIND_CONFIG: Record<WindTier, WindConfig> = {
  slow: { count: 8, speedMin: 25, speedMax: 50, length: 14, alpha: 0.3, lineWidth: 1 },
  moderate: {
    count: 18,
    speedMin: 90,
    speedMax: 150,
    length: 22,
    alpha: 0.45,
    lineWidth: 1.5,
  },
  fast: {
    count: 32,
    speedMin: 220,
    speedMax: 340,
    length: 32,
    alpha: 0.65,
    lineWidth: 2,
  },
}

// Streaks stay in a mid-sky band, clear of the sun and earth, so they read
// as a distinct stream rather than uniform noise across the whole sky.
const BAND_TOP_FRACTION = 0.08
const BAND_HEIGHT_FRACTION = 0.42

function randomParticle(
  config: WindConfig,
  width: number,
  height: number,
): WindParticle {
  return {
    x: Math.random() * width,
    y: height * BAND_TOP_FRACTION + Math.random() * height * BAND_HEIGHT_FRACTION,
    len: config.length * (0.6 + Math.random() * 0.6),
    speed: config.speedMin + Math.random() * (config.speedMax - config.speedMin),
  }
}

export function createWindField(
  tier: WindTier,
  width: number,
  height: number,
): WindField {
  const config = WIND_CONFIG[tier]
  return {
    tier,
    particles: Array.from({ length: config.count }, () =>
      randomParticle(config, width, height),
    ),
  }
}

export function stepWindField(
  field: WindField,
  dtSeconds: number,
  width: number,
  height: number,
): void {
  const config = WIND_CONFIG[field.tier]
  for (const p of field.particles) {
    p.x -= p.speed * dtSeconds
    if (p.x + p.len < 0) {
      const respawn = randomParticle(config, width, height)
      p.x = width + respawn.len
      p.y = respawn.y
      p.len = respawn.len
      p.speed = respawn.speed
    }
  }
}

export function drawWindField(
  ctx: CanvasRenderingContext2D,
  field: WindField,
): void {
  const config = WIND_CONFIG[field.tier]
  ctx.save()
  ctx.strokeStyle = `rgba(${WIND_COLOR}, ${config.alpha})`
  ctx.lineWidth = config.lineWidth
  for (const p of field.particles) {
    ctx.beginPath()
    ctx.moveTo(p.x, p.y)
    ctx.lineTo(p.x + p.len, p.y)
    ctx.stroke()
  }
  ctx.restore()
}
