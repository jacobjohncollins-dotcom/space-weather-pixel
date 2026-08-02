// ENLIL model viewer. Originally docked as a small overlay over the scene
// canvas (Chunk 9, Plan.md §9a/§5) so it read as the radar dish's own
// readout screen — legible at desktop size, but the same fixed panel
// fraction shrank to near-unreadable on phone widths. Promoted to its own
// full-width featured section instead (still the same pixel-console
// styling, just given real room to breathe), and upgraded from a single
// static frame to a real animation: NOAA's enlil.json is an animation reel
// of the full history it returns (~169 frames), and
// scripts/fetch-noaa-snapshot.mjs mirrors every frame, which this component
// cycles through.

import { useEffect, useState } from 'react'
import type { EnlilFrame } from '../data/types.ts'

// ~169 frames at 90ms is a ~15s loop — fast enough to read as a real
// time-lapse of the model rather than a slow slideshow.
const FRAME_INTERVAL_MS = 90

function frameSrc(frame: EnlilFrame): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  return `${base}${frame.imageUrl}?t=${encodeURIComponent(frame.time)}`
}

export function EnlilPanel({
  frames,
  error,
}: {
  frames: EnlilFrame[] | null
  error: string | null
}) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (!frames || frames.length === 0) return
    // Warm the browser cache for every frame up front so the loop plays
    // smoothly from the first pass instead of stalling on each frame's
    // first-ever load.
    for (const frame of frames) {
      const img = new Image()
      img.src = frameSrc(frame)
    }
  }, [frames])

  useEffect(() => {
    setIndex(0)
    if (!frames || frames.length < 2) return
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % frames.length)
    }, FRAME_INTERVAL_MS)
    return () => clearInterval(id)
  }, [frames])

  const current = frames?.[index] ?? null

  return (
    <section className="w-full max-w-2xl border-2 border-slate-700 bg-slate-900/60 font-mono shadow-[4px_4px_0_0_rgba(0,0,0,0.5)]">
      <div className="flex items-center justify-between border-b-2 border-slate-700 bg-slate-950/80 px-3 py-2">
        <span className="text-sm uppercase tracking-[0.2em] text-cyan-400">
          WSA-Enlil Solar Wind Model
        </span>
        {frames && frames.length > 1 && (
          <span className="text-xs text-slate-500">
            frame {index + 1}/{frames.length}
          </span>
        )}
      </div>
      <div className="relative aspect-[8/5] w-full overflow-hidden bg-slate-950">
        {error ? (
          <div className="flex h-full items-center justify-center text-sm text-rose-400">
            signal lost
          </div>
        ) : current ? (
          <img
            src={frameSrc(current)}
            alt="WSA-Enlil solar wind model animation frame"
            className="h-full w-full object-contain"
            style={{ imageRendering: 'pixelated' }}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">
            acquiring…
          </div>
        )}
      </div>
    </section>
  )
}
