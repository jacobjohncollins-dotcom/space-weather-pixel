import { describe, expect, it } from 'vitest'
import { overallSeverity } from './severity.ts'

const CALM = { kp: 'calm', flare: 'quiet', wind: 'slow', bz: 'shielded' } as const

describe('overallSeverity', () => {
  it('is 0 when every feed is calm', () => {
    expect(overallSeverity(CALM)).toBe(0)
  })

  it('takes the max across feeds, not just kp', () => {
    expect(overallSeverity({ ...CALM, flare: 'extreme' })).toBe(3)
  })

  it('ranks a single elevated feed at its own severity, not the group max', () => {
    expect(overallSeverity({ ...CALM, wind: 'moderate' })).toBe(1)
  })

  it('is 3 (severe) when kp alone is severe', () => {
    expect(overallSeverity({ ...CALM, kp: 'severe' })).toBe(3)
  })
})
