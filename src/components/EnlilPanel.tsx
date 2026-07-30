// ENLIL model readout (Chunk 9, Plan.md §9a / §5). Docked directly over the
// scene canvas, wired up to the `radar-dish` ground prop drawn in
// `src/scene/draw.ts` via the shared `DISH_RECT_FRACTIONS` — visually it
// reads as the dish's own screen/readout rather than a separate floating
// panel, per the resolved art-direction note in Plan.md §5/§10.

import { DISH_RECT_FRACTIONS } from '../scene/draw.ts'
import { NOAA_BASE_URL } from '../data/noaa.ts'
import { useSpaceWeather } from '../data/useSpaceWeather.ts'

const PANEL_FRACTIONS = {
  x: DISH_RECT_FRACTIONS.x,
  y: DISH_RECT_FRACTIONS.y - 0.24,
  w: DISH_RECT_FRACTIONS.w + 0.2,
  h: 0.24,
}

export function EnlilPanel() {
  const state = useSpaceWeather()
  const { data, error } = state.enlil

  return (
    <div
      className="absolute flex flex-col border-2 border-slate-700 bg-slate-950/90 p-1 font-mono shadow-[3px_3px_0_0_rgba(0,0,0,0.5)]"
      style={{
        left: `${PANEL_FRACTIONS.x * 100}%`,
        top: `${PANEL_FRACTIONS.y * 100}%`,
        width: `${PANEL_FRACTIONS.w * 100}%`,
        height: `${PANEL_FRACTIONS.h * 100}%`,
      }}
    >
      <div className="mb-1 shrink-0 text-[0.5rem] uppercase tracking-[0.15em] text-cyan-400">
        Enlil Model Feed
      </div>
      <div className="relative min-h-0 flex-1 overflow-hidden bg-slate-900">
        {error ? (
          <div className="flex h-full items-center justify-center p-1 text-center text-[0.5rem] text-rose-400">
            signal lost
          </div>
        ) : data ? (
          <img
            src={`${NOAA_BASE_URL}${data.imageUrl}`}
            alt="Latest WSA-Enlil solar wind model frame"
            className="h-full w-full object-cover"
            style={{ imageRendering: 'pixelated' }}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[0.5rem] text-slate-500">
            acquiring…
          </div>
        )}
      </div>
    </div>
  )
}
