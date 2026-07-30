// Retro "status window" HUD (Plan.md §7 / Chunk 4). Renders the live
// numeric readouts + tier labels from useSpaceWeather() with per-feed
// loading/error handling, so one slow/broken NOAA feed never blanks the
// whole panel.

import type { ReactNode } from 'react'
import type { SpaceWeatherState } from '../data/useSpaceWeather.ts'

type Slice<T> = { data: T | null; error: string | null }

const TIER_LABELS: Record<string, string> = {
  calm: 'Calm',
  unsettled: 'Unsettled',
  storm: 'Storm',
  severe: 'Severe',
  quiet: 'Quiet',
  small: 'Small',
  strong: 'Strong',
  extreme: 'Extreme',
  slow: 'Slow',
  moderate: 'Moderate',
  fast: 'Fast',
  shielded: 'Shielded',
  ripple: 'Ripple',
  crack: 'Crack',
}

function tierLabel(tier: string): string {
  return TIER_LABELS[tier] ?? tier
}

// The pixel-art Scene canvas carries the primary visual, so it has no DOM
// text of its own (Chunk 11, Plan.md §9a) — this sentence mirrors the same
// numbers in a visually-hidden `aria-live` region so screen reader users are
// notified whenever a poll changes them, not just sighted users watching the
// visible Hud panel below.
function srSummary(state: SpaceWeatherState): string {
  const parts: string[] = []
  if (state.kp.data) {
    parts.push(
      `Kp index ${state.kp.data.value.toFixed(2)}, ${tierLabel(state.kp.data.tier)}`,
    )
  }
  if (state.wind.data) {
    parts.push(
      `Solar wind ${Math.round(state.wind.data.speedKmS)} kilometers per second, ${tierLabel(state.wind.data.tier)}`,
    )
  }
  if (state.bz.data) {
    parts.push(
      `Bz ${state.bz.data.nT.toFixed(1)} nanotesla, ${tierLabel(state.bz.data.tier)}`,
    )
  }
  if (state.flare.data) {
    parts.push(
      `Flare class ${state.flare.data.maxClass}, ${tierLabel(state.flare.data.tier)}`,
    )
  }
  return parts.length > 0 ? `${parts.join('. ')}.` : 'Acquiring space weather data.'
}

function Readout({
  label,
  loading,
  slice,
  render,
}: {
  label: string
  loading: boolean
  slice: Slice<unknown>
  render: (data: NonNullable<unknown>) => { value: string; tier?: string }
}) {
  let content: ReactNode

  if (slice.error) {
    content = <span className="text-rose-400">error</span>
  } else if (loading && !slice.data) {
    content = <span className="text-slate-500">…</span>
  } else if (!slice.data) {
    content = <span className="text-slate-500">n/a</span>
  } else {
    const { value, tier } = render(slice.data)
    content = (
      <>
        <span className="text-slate-100">{value}</span>
        {tier ? (
          <span className="ml-2 text-sm uppercase tracking-wider text-cyan-400">
            {tierLabel(tier)}
          </span>
        ) : null}
      </>
    )
  }

  return (
    <div className="flex items-baseline justify-between border-b border-slate-800 py-1.5 last:border-b-0">
      <span className="text-sm uppercase tracking-widest text-slate-500">
        {label}
      </span>
      <span className="font-mono text-base">{content}</span>
    </div>
  )
}

export function Hud({ state }: { state: SpaceWeatherState }) {
  return (
    <div className="w-full max-w-xs border-2 border-slate-700 bg-slate-900/90 p-3 font-mono shadow-[4px_4px_0_0_rgba(0,0,0,0.5)]">
      <p className="sr-only" aria-live="polite">
        {srSummary(state)}
      </p>
      <div className="mb-2 text-sm uppercase tracking-[0.2em] text-slate-400">
        Space Weather Status
      </div>

      <Readout
        label="Kp Index"
        loading={state.loading}
        slice={state.kp}
        render={(d) => {
          const kp = d as { value: number; tier: string }
          return { value: kp.value.toFixed(2), tier: kp.tier }
        }}
      />
      <Readout
        label="Solar Wind"
        loading={state.loading}
        slice={state.wind}
        render={(d) => {
          const wind = d as { speedKmS: number; tier: string }
          return { value: `${Math.round(wind.speedKmS)} km/s`, tier: wind.tier }
        }}
      />
      <Readout
        label="Bz"
        loading={state.loading}
        slice={state.bz}
        render={(d) => {
          const bz = d as { nT: number; tier: string }
          return { value: `${bz.nT.toFixed(1)} nT`, tier: bz.tier }
        }}
      />
      <Readout
        label="Flare Class"
        loading={state.loading}
        slice={state.flare}
        render={(d) => {
          const flare = d as { maxClass: string; tier: string }
          return { value: flare.maxClass, tier: flare.tier }
        }}
      />
    </div>
  )
}
