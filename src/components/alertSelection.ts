// Pure alert-picking logic, kept out of AlertBanner.tsx (Chunk 11) so that
// file only exports the component — same split as scene/effects.ts vs.
// scene/Scene.tsx.

import type { SpaceWeatherAlert } from '../data/types.ts'

// NOAA's alerts feed is not guaranteed to arrive in issue order, so pick the
// most recently issued entry explicitly rather than assuming `.at(-1)`.
export function latestAlert(
  alerts: SpaceWeatherAlert[] | null,
): SpaceWeatherAlert | null {
  if (!alerts || alerts.length === 0) return null
  return [...alerts].sort((a, b) =>
    b.issueDatetime.localeCompare(a.issueDatetime),
  )[0]
}
