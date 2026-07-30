import { describe, expect, it } from 'vitest'
import { computeSparklineBars, trendDirection } from './sparkline.ts'
import type { KpHistoryPoint } from './sparkline.ts'

const RECT = { x: 100, y: 50, w: 80, h: 40 }

function point(value: number): KpHistoryPoint {
  return { timeTag: '2026-01-01T00:00:00Z', value, tier: 'calm' }
}

describe('computeSparklineBars', () => {
  it('returns no bars for empty history', () => {
    expect(computeSparklineBars([], RECT)).toEqual([])
  })

  it('produces one bar per history point, evenly spanning the rect width', () => {
    const bars = computeSparklineBars([point(1), point(2), point(3)], RECT)
    expect(bars).toHaveLength(3)
    const expectedBarW = RECT.w / 3
    expect(bars[0].rect.x).toBeCloseTo(RECT.x)
    expect(bars[1].rect.x).toBeCloseTo(RECT.x + expectedBarW)
    expect(bars[2].rect.x).toBeCloseTo(RECT.x + 2 * expectedBarW)
  })

  it('scales bar height with the Kp value, capped at the rect height', () => {
    const bars = computeSparklineBars([point(9), point(4.5)], RECT)
    expect(bars[0].rect.h).toBeCloseTo(RECT.h)
    expect(bars[1].rect.h).toBeCloseTo(RECT.h / 2)
    expect(bars[1].rect.h).toBeLessThan(bars[0].rect.h)
  })

  it('floors a 0 reading to a visible sliver instead of a zero-height bar', () => {
    const bars = computeSparklineBars([point(0)], RECT)
    expect(bars[0].rect.h).toBeGreaterThan(0)
  })

  it('bars sit flush with the bottom of the rect regardless of height', () => {
    const bars = computeSparklineBars([point(2)], RECT)
    expect(bars[0].rect.y + bars[0].rect.h).toBeCloseTo(RECT.y + RECT.h)
  })
})

describe('trendDirection', () => {
  it('is null with fewer than 2 points', () => {
    expect(trendDirection([])).toBeNull()
    expect(trendDirection([point(3)])).toBeNull()
  })

  it('detects a clear rise from first to last point', () => {
    expect(trendDirection([point(1), point(2), point(4)])).toBe('rising')
  })

  it('detects a clear fall from first to last point', () => {
    expect(trendDirection([point(6), point(2)])).toBe('falling')
  })

  it('calls a small delta steady rather than rising/falling', () => {
    expect(trendDirection([point(3), point(3.2)])).toBe('steady')
  })
})
