// Pure geometry/logic for the Kp trend sparkline (Chunk 13, Plan.md §10 open
// question — "historical/trend view"). Kept independent of draw.ts (only
// imports the tier type) and canvas-free so it's unit testable; draw.ts owns
// the actual ctx.fillRect calls.

import type { KpTier } from '../data/thresholds.ts'

export interface KpHistoryPoint {
  timeTag: string
  value: number
  tier: KpTier
}

interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export interface SparklineBar {
  rect: Rect
  color: string
}

// Matches the mascot's mood palette (scripts/generate-sprites.mjs) so the
// trend graph's color language stays consistent with the rest of the scene.
const TIER_COLOR: Record<KpTier, string> = {
  calm: 'rgb(120, 210, 170)',
  unsettled: 'rgb(230, 205, 90)',
  storm: 'rgb(235, 145, 70)',
  severe: 'rgb(235, 80, 80)',
}

// NOAA's planetary Kp index is reported on a 0-9 scale.
const KP_MAX = 9
// A 0 reading would otherwise draw a zero-height (invisible) bar, which
// reads as "no data" rather than "calm" — floor it to a thin sliver.
const MIN_BAR_HEIGHT_FRACTION = 0.06

export function computeSparklineBars(
  history: KpHistoryPoint[],
  rect: Rect,
): SparklineBar[] {
  if (history.length === 0) return []
  const barW = rect.w / history.length
  return history.map((point, i) => {
    const heightFraction = Math.max(
      point.value / KP_MAX,
      MIN_BAR_HEIGHT_FRACTION,
    )
    const h = rect.h * Math.min(1, heightFraction)
    return {
      rect: {
        x: rect.x + i * barW,
        y: rect.y + rect.h - h,
        w: Math.max(1, barW - 1),
        h,
      },
      color: TIER_COLOR[point.tier],
    }
  })
}

export type TrendDirection = 'rising' | 'falling' | 'steady'

// Compares the oldest and newest points in the window to give a one-word
// qualitative summary for the scene's aria-label (Chunk 11's accessibility
// requirement extends to this new visual, same as everything else in the
// canvas).
export function trendDirection(
  history: KpHistoryPoint[],
): TrendDirection | null {
  if (history.length < 2) return null
  const delta = history[history.length - 1].value - history[0].value
  if (delta > 0.5) return 'rising'
  if (delta < -0.5) return 'falling'
  return 'steady'
}
