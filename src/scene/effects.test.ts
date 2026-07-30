import { describe, expect, it } from 'vitest'
import {
  createEffectsState,
  stepFlarePop,
  transitionProgress,
  updateEffects,
} from './effects'

describe('updateEffects + transitionProgress (crossfade timing)', () => {
  it('reports progress 1 (no fade) when nothing has changed', () => {
    const state = createEffectsState('calm', 'quiet')
    expect(transitionProgress(state.sky, 500)).toBe(1)
    expect(transitionProgress(state.sun, 500)).toBe(1)
  })

  it('arms a crossfade from the prior kp when kp changes', () => {
    const state = createEffectsState('calm', 'quiet')
    updateEffects(state, 'storm', 'quiet', 1000)
    expect(state.sky.prevValue).toBe('calm')
    expect(transitionProgress(state.sky, 1000)).toBe(0)
    expect(transitionProgress(state.sky, 1000 + 700)).toBe(1)
    expect(transitionProgress(state.sky, 1000 + 350)).toBeCloseTo(0.5)
  })

  it('does not re-arm a crossfade on a no-op update', () => {
    const state = createEffectsState('calm', 'quiet')
    updateEffects(state, 'storm', 'quiet', 1000)
    updateEffects(state, 'storm', 'quiet', 1500)
    // still measured from the original 1000ms change, not re-armed at 1500
    expect(transitionProgress(state.sky, 1000 + 700)).toBe(1)
  })
})

describe('stepFlarePop (one-shot flare shake/pop)', () => {
  it('does nothing when no M/X tier has been entered', () => {
    const state = createEffectsState('calm', 'quiet')
    updateEffects(state, 'calm', 'small', 100)
    expect(stepFlarePop(state, 100)).toEqual({ shakeX: 0, shakeY: 0, scaleBoost: 0 })
  })

  it('arms and decays a pop on quiet/small -> strong/extreme', () => {
    const state = createEffectsState('calm', 'quiet')
    updateEffects(state, 'calm', 'strong', 0)
    const early = stepFlarePop(state, 10)
    expect(early.scaleBoost).toBeGreaterThan(0)
    const later = stepFlarePop(state, 300)
    expect(later.scaleBoost).toBeGreaterThan(0)
    expect(later.scaleBoost).toBeLessThan(early.scaleBoost)
  })

  it('runs its course once and does not loop', () => {
    const state = createEffectsState('calm', 'quiet')
    updateEffects(state, 'calm', 'extreme', 0)
    expect(stepFlarePop(state, 649).scaleBoost).toBeGreaterThan(0)
    expect(stepFlarePop(state, 650)).toEqual({ shakeX: 0, shakeY: 0, scaleBoost: 0 })
    expect(state.flarePopStart).toBeNull()
    // popped state stays cleared even on later frames, since nothing re-armed it
    expect(stepFlarePop(state, 2000)).toEqual({ shakeX: 0, shakeY: 0, scaleBoost: 0 })
  })

  it('does not re-pop when staying within the M/X range', () => {
    const state = createEffectsState('calm', 'quiet')
    updateEffects(state, 'calm', 'strong', 0)
    // burns the pop out
    stepFlarePop(state, 700)
    expect(state.flarePopStart).toBeNull()
    // strong -> extreme is still "in burst", should not re-arm the pop
    updateEffects(state, 'calm', 'extreme', 1000)
    expect(state.flarePopStart).toBeNull()
  })
})
