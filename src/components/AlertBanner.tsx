// Storm alert banner (Chunk 11, Plan.md §9a), fed by NOAA's alerts.json via
// useSpaceWeather()'s existing `alerts` slice. Rendered as a normal DOM
// banner above the scene (not embedded in the pixel landscape like the
// ENLIL/sources panels) since it's a time-critical notice, not ambient
// status — it needs to interrupt, not blend in.

import { useState } from 'react'
import { latestAlert } from './alertSelection.ts'
import type { SpaceWeatherAlert } from '../data/types.ts'

export function AlertBanner({
  alerts,
}: {
  alerts: SpaceWeatherAlert[] | null
}) {
  const [dismissedId, setDismissedId] = useState<string | null>(null)
  const alert = latestAlert(alerts)

  if (!alert || alert.productId === dismissedId) return null

  const headline = alert.message.split('\n')[0]

  return (
    <div
      role="alert"
      className="flex w-full max-w-5xl items-start justify-between gap-3 border-2 border-amber-500 bg-amber-950/80 px-3 py-2 font-mono text-sm text-amber-100 shadow-[4px_4px_0_0_rgba(0,0,0,0.5)]"
    >
      <div>
        <span className="mr-2 uppercase tracking-widest text-amber-400">
          Space Weather Alert
        </span>
        {headline}
      </div>
      <button
        type="button"
        onClick={() => setDismissedId(alert.productId)}
        aria-label="Dismiss alert"
        className="shrink-0 font-bold text-amber-300 hover:text-amber-100"
      >
        ×
      </button>
    </div>
  )
}
