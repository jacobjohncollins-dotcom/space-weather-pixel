// Canvas scene renderer (Chunk 6, Plan.md §9a). Composites the static
// sky/sun/earth/aurora sprite layers for the current tier state. In dev
// builds, when no `tiers` prop is supplied, a small control panel lets you
// step through tier states manually to check the sprite swap and layout
// at different canvas sizes.

import { useEffect, useRef, useState } from 'react'
import { SPRITE_SHEET_URL } from './atlas.ts'
import { drawScene } from './draw.ts'
import type { SceneTiers } from './draw.ts'
import { createEffectsState, updateEffects } from './effects.ts'
import type { EffectsState } from './effects.ts'
import { createWindField, drawWindField, stepWindField } from './wind.ts'
import type { WindField } from './wind.ts'
import { createSkyEventsState, drawSkyEvents, stepSkyEvents } from './skyEvents.ts'
import type { SkyEventsState } from './skyEvents.ts'
import type { BzTier, FlareTier, KpTier, WindTier } from '../data/thresholds.ts'
import { EnlilPanel } from '../components/EnlilPanel.tsx'
import { SourcesPanel } from '../components/SourcesPanel.tsx'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion.ts'
import { soundEngine } from './sound.ts'
import { trendDirection } from './sparkline.ts'
import type { KpHistoryPoint } from './sparkline.ts'

const KP_LABELS: Record<KpTier, string> = {
  calm: 'calm',
  unsettled: 'unsettled aurora activity',
  storm: 'storm-level aurora activity',
  severe: 'severe aurora activity',
}
const FLARE_LABELS: Record<FlareTier, string> = {
  quiet: 'quiet sun',
  small: 'minor flare activity',
  strong: 'a strong flare',
  extreme: 'an extreme flare',
}
const BZ_LABELS: Record<BzTier, string> = {
  shielded: 'a shielded magnetosphere',
  ripple: 'a rippling magnetosphere',
  crack: 'a cracked magnetosphere',
}

// Text alternative for the canvas (Chunk 11, Plan.md §9a) — the scene is
// otherwise a purely decorative-looking canvas with no DOM text of its own,
// so screen reader users need a sentence describing what it currently shows.
const TREND_LABELS = {
  rising: 'Kp trend rising over the last 24 hours.',
  falling: 'Kp trend falling over the last 24 hours.',
  steady: 'Kp trend steady over the last 24 hours.',
}

function sceneAriaLabel(
  tiers: SceneTiers,
  kpHistory: KpHistoryPoint[],
): string {
  const base = `Pixel-art space weather scene: ${KP_LABELS[tiers.kp]}, ${FLARE_LABELS[tiers.flare]}, ${BZ_LABELS[tiers.bz]}.`
  const trend = trendDirection(kpHistory)
  return trend ? `${base} ${TREND_LABELS[trend]}` : base
}

const KP_TIERS: KpTier[] = ['calm', 'unsettled', 'storm', 'severe']
const FLARE_TIERS: FlareTier[] = ['quiet', 'small', 'strong', 'extreme']
const WIND_TIERS: WindTier[] = ['slow', 'moderate', 'fast']
const BZ_TIERS: BzTier[] = ['shielded', 'ripple', 'crack']

const DEFAULT_TIERS: SceneTiers = { kp: 'calm', flare: 'quiet', wind: 'slow', bz: 'shielded' }
// Stable reference so the default-prop case doesn't create a new array every
// render, which would otherwise re-trigger the canvas effect's dependency
// array on every render even when nothing actually changed.
const EMPTY_KP_HISTORY: KpHistoryPoint[] = []

export interface SceneProps {
  tiers?: SceneTiers
  kpHistory?: KpHistoryPoint[]
}

export function Scene({ tiers, kpHistory = EMPTY_KP_HISTORY }: SceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sheetRef = useRef<HTMLImageElement | null>(null)
  const [sheetLoaded, setSheetLoaded] = useState(false)
  const [devTiers, setDevTiers] = useState<SceneTiers>(DEFAULT_TIERS)
  const activeTiers = tiers ?? devTiers
  const prefersReducedMotion = usePrefersReducedMotion()
  // Persists across re-runs of the effect below (unlike a plain variable),
  // so a tier change can still be diffed against what was showing a moment
  // ago even though that effect fully remounts on every `activeTiers` change.
  const prevTiersRef = useRef<SceneTiers>(activeTiers)

  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      sheetRef.current = img
      setSheetLoaded(true)
    }
    img.src = SPRITE_SHEET_URL
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !sheetLoaded || !sheetRef.current) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const sheet = sheetRef.current

    let width = 0
    let height = 0

    // `prefers-reduced-motion` (Chunk 11): freeze the idle wind/pulse/twinkle
    // animation and the crossfade transition entirely, but still let a tier
    // change swap which sprite is shown — draw a single static hard-cut
    // frame per tier change instead of running the rAF loop below.
    if (prefersReducedMotion) {
      function resizeStatic() {
        if (!canvas) return
        const dpr = window.devicePixelRatio || 1
        width = canvas.clientWidth
        height = canvas.clientHeight
        canvas.width = Math.round(width * dpr)
        canvas.height = Math.round(height * dpr)
        ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
        drawScene(ctx!, sheet, width, height, activeTiers, 0, undefined, kpHistory)
      }

      resizeStatic()
      const staticObserver = new ResizeObserver(resizeStatic)
      staticObserver.observe(canvas)
      prevTiersRef.current = activeTiers
      return () => staticObserver.disconnect()
    }

    let windField: WindField | null = null
    const skyEvents: SkyEventsState = createSkyEventsState()

    // Arm crossfade/pop timers against whatever was showing before this
    // effect run (a fresh mount, or the last committed tier state).
    const effectsState: EffectsState = createEffectsState(
      prevTiersRef.current.kp,
      prevTiersRef.current.flare,
    )
    updateEffects(effectsState, activeTiers.kp, activeTiers.flare, 0)
    prevTiersRef.current = activeTiers

    // A pop is armed only on a quiet -> strong/extreme transition (see
    // effects.ts), so this fires exactly once per flare, matching the
    // one-shot visual shake/pop rather than looping with it.
    if (effectsState.flarePopStart !== null) {
      soundEngine.playFlarePop()
    }

    function resize() {
      if (!canvas) return
      const dpr = window.devicePixelRatio || 1
      width = canvas.clientWidth
      height = canvas.clientHeight
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
      windField = createWindField(activeTiers.wind, width, height)
    }

    resize()

    const startTime = performance.now()
    let lastTime = startTime
    let rafId = requestAnimationFrame(frame)

    function frame(time: number) {
      const dtSeconds = (time - lastTime) / 1000
      lastTime = time

      if (windField) {
        const elapsedMs = time - startTime
        stepWindField(windField, dtSeconds, width, height)
        stepSkyEvents(skyEvents, elapsedMs, dtSeconds, width, height)
        drawScene(ctx!, sheet, width, height, activeTiers, elapsedMs, effectsState, kpHistory)
        drawWindField(ctx!, windField)
        drawSkyEvents(ctx!, skyEvents, width)
      }

      rafId = requestAnimationFrame(frame)
    }

    const observer = new ResizeObserver(resize)
    observer.observe(canvas)

    return () => {
      cancelAnimationFrame(rafId)
      observer.disconnect()
    }
  }, [sheetLoaded, activeTiers, prefersReducedMotion, kpHistory])

  return (
    <div className="flex w-full max-w-2xl flex-col items-center gap-2">
      <div className="relative aspect-[16/10] w-full">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={sceneAriaLabel(activeTiers, kpHistory)}
          className="h-full w-full border-2 border-slate-700 bg-slate-950"
          style={{ imageRendering: 'pixelated' }}
        />
        <EnlilPanel />
        <SourcesPanel />
      </div>
      {import.meta.env.DEV && tiers === undefined && (
        <SceneDevControls tiers={devTiers} onChange={setDevTiers} />
      )}
    </div>
  )
}

function SceneDevControls({
  tiers,
  onChange,
}: {
  tiers: SceneTiers
  onChange: (tiers: SceneTiers) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 font-mono text-xs text-slate-400">
      <label className="flex items-center gap-1">
        kp:
        <select
          className="border border-slate-700 bg-slate-900 px-1 py-0.5 text-slate-200"
          value={tiers.kp}
          onChange={(e) =>
            onChange({ ...tiers, kp: e.target.value as KpTier })
          }
        >
          {KP_TIERS.map((tier) => (
            <option key={tier} value={tier}>
              {tier}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-1">
        flare:
        <select
          className="border border-slate-700 bg-slate-900 px-1 py-0.5 text-slate-200"
          value={tiers.flare}
          onChange={(e) =>
            onChange({ ...tiers, flare: e.target.value as FlareTier })
          }
        >
          {FLARE_TIERS.map((tier) => (
            <option key={tier} value={tier}>
              {tier}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-1">
        wind:
        <select
          className="border border-slate-700 bg-slate-900 px-1 py-0.5 text-slate-200"
          value={tiers.wind}
          onChange={(e) =>
            onChange({ ...tiers, wind: e.target.value as WindTier })
          }
        >
          {WIND_TIERS.map((tier) => (
            <option key={tier} value={tier}>
              {tier}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-1">
        bz:
        <select
          className="border border-slate-700 bg-slate-900 px-1 py-0.5 text-slate-200"
          value={tiers.bz}
          onChange={(e) =>
            onChange({ ...tiers, bz: e.target.value as BzTier })
          }
        >
          {BZ_TIERS.map((tier) => (
            <option key={tier} value={tier}>
              {tier}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
