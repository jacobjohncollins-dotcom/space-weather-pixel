import { describe, expect, it, vi } from 'vitest'
import { createSoundEngine } from './sound.ts'

function fakeContextFactory() {
  const oscillator = {
    type: 'sine' as OscillatorType,
    frequency: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() },
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  }
  const gain = {
    gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    connect: vi.fn(),
  }
  const ctx = {
    currentTime: 0,
    destination: {},
    createOscillator: vi.fn(() => oscillator),
    createGain: vi.fn(() => gain),
  }
  const factory = vi.fn(() => ctx)
  return { factory, ctx, oscillator, gain }
}

describe('createSoundEngine', () => {
  it('starts muted and never creates an AudioContext until enabled', () => {
    const { factory } = fakeContextFactory()
    const engine = createSoundEngine(factory)

    expect(engine.isEnabled()).toBe(false)
    engine.playFlarePop()
    engine.playStormAlert()

    expect(factory).not.toHaveBeenCalled()
  })

  it('plays a tone once enabled', () => {
    const { factory, oscillator } = fakeContextFactory()
    const engine = createSoundEngine(factory)

    engine.setEnabled(true)
    engine.playFlarePop()

    expect(factory).toHaveBeenCalledTimes(1)
    expect(oscillator.start).toHaveBeenCalledTimes(1)
    expect(oscillator.stop).toHaveBeenCalledTimes(1)
  })

  it('reuses the same context across multiple plays instead of recreating it', () => {
    const { factory } = fakeContextFactory()
    const engine = createSoundEngine(factory)

    engine.setEnabled(true)
    engine.playFlarePop()
    engine.playStormAlert()

    expect(factory).toHaveBeenCalledTimes(1)
  })

  it('stops playing once disabled again', () => {
    const { factory, oscillator } = fakeContextFactory()
    const engine = createSoundEngine(factory)

    engine.setEnabled(true)
    engine.setEnabled(false)
    engine.playFlarePop()

    expect(oscillator.start).not.toHaveBeenCalled()
  })

  it('gives the flare pop and storm alert distinct pitch envelopes', () => {
    const { factory, oscillator } = fakeContextFactory()
    const engine = createSoundEngine(factory)
    engine.setEnabled(true)

    engine.playFlarePop()
    const flareCall = oscillator.frequency.setValueAtTime.mock.calls[0]

    engine.playStormAlert()
    const alertCall = oscillator.frequency.setValueAtTime.mock.calls[1]

    expect(flareCall[0]).not.toBe(alertCall[0])
  })
})
