// Optional SFX for flare pops and storm alerts (Chunk 12, Plan.md §9a).
// Muted by default and stays that way until the user explicitly opts in via
// `setEnabled(true)` — browsers block audio until a user gesture, and the
// opt-in toggle click *is* that gesture, so the AudioContext is only ever
// created inside that call chain and never on page load.

interface ToneOscillator {
  type: OscillatorType
  frequency: { setValueAtTime(v: number, t: number): void; linearRampToValueAtTime(v: number, t: number): void }
  connect(node: ToneGain): void
  start(t: number): void
  stop(t: number): void
}

interface ToneGain {
  gain: { setValueAtTime(v: number, t: number): void; exponentialRampToValueAtTime(v: number, t: number): void }
  connect(destination: unknown): void
}

interface ToneAudioContext {
  currentTime: number
  destination: unknown
  createOscillator(): ToneOscillator
  createGain(): ToneGain
}

export interface SoundEngine {
  isEnabled(): boolean
  setEnabled(enabled: boolean): void
  playFlarePop(): void
  playStormAlert(): void
}

function defaultContextFactory(): ToneAudioContext | null {
  if (typeof AudioContext === 'undefined') return null
  return new AudioContext() as unknown as ToneAudioContext
}

export function createSoundEngine(
  createContext: () => ToneAudioContext | null = defaultContextFactory,
): SoundEngine {
  let enabled = false
  let ctx: ToneAudioContext | null = null

  function ensureContext(): ToneAudioContext | null {
    if (!enabled) return null
    if (!ctx) ctx = createContext()
    return ctx
  }

  function beep(freqStart: number, freqEnd: number, durationSec: number, gainPeak: number): void {
    const audioCtx = ensureContext()
    if (!audioCtx) return

    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    const now = audioCtx.currentTime

    osc.type = 'square'
    osc.frequency.setValueAtTime(freqStart, now)
    osc.frequency.linearRampToValueAtTime(freqEnd, now + durationSec)

    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(gainPeak, now + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec)

    osc.connect(gain)
    gain.connect(audioCtx.destination)
    osc.start(now)
    osc.stop(now + durationSec)
  }

  return {
    isEnabled: () => enabled,
    setEnabled(next) {
      enabled = next
      if (enabled) ensureContext()
    },
    // Short falling chime — mirrors the visual flare "pop" (Chunk 8).
    playFlarePop() {
      beep(880, 220, 0.35, 0.12)
    },
    // Longer rising chime — deliberately distinct from the flare pop so the
    // two are distinguishable by ear.
    playStormAlert() {
      beep(440, 660, 0.5, 0.1)
    },
  }
}

export const soundEngine = createSoundEngine()
