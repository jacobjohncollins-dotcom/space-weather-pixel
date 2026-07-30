// Flare pop, magnetosphere ripple/crack, and tier-change crossfade timing
// (Chunk 8, Plan.md §9a). Kept independent of draw.ts (imports only tier
// types) so draw.ts can import this module without a cycle.

import type { BzTier, FlareTier, KpTier } from '../data/thresholds.ts'

const FLARE_POP_MS = 650
const TRANSITION_MS = 700

function isFlareBurst(tier: FlareTier): boolean {
  return tier === 'strong' || tier === 'extreme'
}

interface TransitionState<T> {
  prevValue: T
  changedAt: number
}

export interface EffectsState {
  prevKp: KpTier
  prevFlare: FlareTier
  sky: TransitionState<KpTier>
  aurora: TransitionState<KpTier>
  sun: TransitionState<FlareTier>
  flarePopStart: number | null
}

export function createEffectsState(kp: KpTier, flare: FlareTier): EffectsState {
  return {
    prevKp: kp,
    prevFlare: flare,
    sky: { prevValue: kp, changedAt: -Infinity },
    aurora: { prevValue: kp, changedAt: -Infinity },
    sun: { prevValue: flare, changedAt: -Infinity },
    flarePopStart: null,
  }
}

// Call once per frame, before drawing, with the *current* tiers. Detects
// changes since the previous call and arms the relevant crossfade/pop
// timers; mutates `state` in place.
export function updateEffects(
  state: EffectsState,
  kp: KpTier,
  flare: FlareTier,
  elapsedMs: number,
): void {
  if (kp !== state.prevKp) {
    state.sky = { prevValue: state.prevKp, changedAt: elapsedMs }
    state.aurora = { prevValue: state.prevKp, changedAt: elapsedMs }
    state.prevKp = kp
  }
  if (flare !== state.prevFlare) {
    state.sun = { prevValue: state.prevFlare, changedAt: elapsedMs }
    // Only arm the pop when *entering* an M/X tier, not on every change
    // (e.g. extreme -> strong stays a burst state but shouldn't re-pop).
    if (isFlareBurst(flare) && !isFlareBurst(state.prevFlare)) {
      state.flarePopStart = elapsedMs
    }
    state.prevFlare = flare
  }
}

// 0 = still fully on prevValue, 1 = fully transitioned to the current value.
export function transitionProgress(
  t: TransitionState<unknown>,
  elapsedMs: number,
): number {
  return Math.min(1, Math.max(0, (elapsedMs - t.changedAt) / TRANSITION_MS))
}

export interface FlarePop {
  shakeX: number
  shakeY: number
  scaleBoost: number
}

const NO_POP: FlarePop = { shakeX: 0, shakeY: 0, scaleBoost: 0 }

// One-shot decaying shake + scale burst. Clears `flarePopStart` once it has
// run its course so it never loops on its own — it only re-arms via
// `updateEffects` on the next quiet -> M/X transition.
export function stepFlarePop(state: EffectsState, elapsedMs: number): FlarePop {
  if (state.flarePopStart === null) return NO_POP
  const t = elapsedMs - state.flarePopStart
  if (t >= FLARE_POP_MS) {
    state.flarePopStart = null
    return NO_POP
  }
  const decay = 1 - t / FLARE_POP_MS
  return {
    shakeX: Math.sin(t / 28) * 4 * decay,
    shakeY: Math.sin(t / 28 + 1.3) * 2.5 * decay,
    scaleBoost: 0.18 * decay,
  }
}

const BZ_CRACK_COLOR = '248, 113, 113' // red-400
const BZ_RIPPLE_COLOR = '96, 165, 250' // blue-400

interface Rect {
  x: number
  y: number
  w: number
  h: number
}

// Continuous (not one-shot) effect around earth: a soft pulsing ring while
// Bz has gone negative ("ripple"), plus jagged crack lines breaking through
// the ring once Bz is strongly negative ("crack").
export function drawMagnetosphereEffect(
  ctx: CanvasRenderingContext2D,
  earth: Rect,
  bz: BzTier,
  elapsedMs: number,
): void {
  if (bz === 'shielded') return

  const cx = earth.x + earth.w / 2
  const cy = earth.y + earth.h / 2
  const baseR = earth.w * 0.62
  const ringPeriodMs = bz === 'crack' ? 900 : 1600
  const ringPhase = (elapsedMs % ringPeriodMs) / ringPeriodMs

  ctx.save()
  ctx.strokeStyle = `rgba(${BZ_RIPPLE_COLOR}, ${0.5 * (1 - ringPhase)})`
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(cx, cy, baseR + ringPhase * earth.w * 0.28, 0, Math.PI * 2)
  ctx.stroke()

  if (bz === 'crack') {
    ctx.strokeStyle = `rgba(${BZ_CRACK_COLOR}, 0.8)`
    ctx.lineWidth = 1.5
    const crackCount = 5
    for (let i = 0; i < crackCount; i++) {
      const angle = (i / crackCount) * Math.PI * 2 + elapsedMs / 4000
      drawCrackLine(ctx, cx, cy, baseR, angle, earth.w * 0.18)
    }
  }
  ctx.restore()
}

function drawCrackLine(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  angle: number,
  length: number,
): void {
  const segments = 3
  let x = cx + Math.cos(angle) * r
  let y = cy + Math.sin(angle) * r
  ctx.beginPath()
  ctx.moveTo(x, y)
  for (let i = 1; i <= segments; i++) {
    const segLen = length / segments
    const jitter = Math.sin(angle * 7 + i * 13) * 0.5 * segLen
    x += Math.cos(angle) * segLen + Math.cos(angle + Math.PI / 2) * jitter
    y += Math.sin(angle) * segLen + Math.sin(angle + Math.PI / 2) * jitter
    ctx.lineTo(x, y)
  }
  ctx.stroke()
}
