# Chunk Progress Tracker

Tracks the chunked work breakdown in [Plan.md §9a](Plan.md#9a-chunked-work-breakdown-each-chunk-sized-to-fit-in-a-single).
Any AI agent (or human) picking up work here should update this file as part
of finishing a chunk — this is the review system: a chunk isn't "reviewed"
just because the author says it's done.

## How to use this

1. **Before starting**, check this table for the next chunk that is not yet
   `Done`/`Reviewed`, and check nothing else is already `In progress` on it
   (multiple sessions may share this repo — check `git status` / untracked
   files, not just this table, since it can lag).
2. **When you finish implementing a chunk**, set its status to `Done`, fill
   in `Implemented by` (agent/session identifier + date) and a one-line note
   on what you built and how you verified it against the "Done" check in
   Plan.md §9a.
3. **Reviewing**: a chunk should only move from `Done` to `Reviewed` after a
   *different* session (a fresh agent, or the same agent in a later,
   independent pass — not just re-reading its own work) re-checks the "Done"
   criteria from scratch: reruns tests, rebuilds, and/or actually looks at
   the running app. Record what you checked in `Notes`. If review finds a
   problem, set status back to `In progress` and note why.
4. Never mark `Reviewed` for your own `Done` entry in the same sitting —
   the point is an independent check.

## Status legend

`Not started` · `In progress` · `Done` (implemented, unverified by a second
pass) · `Reviewed` (independently verified against the Plan.md done-check)

| # | Chunk | Status | Implemented by | Reviewed by | Notes |
|---|-------|--------|-----------------|-------------|-------|
| 1 | Project scaffold | Done | claude, 2026-07-30 | | Vite+React+TS+Tailwind scaffold committed (`3c5b5f4`); `npm run dev`/`build` both succeed. |
| 2 | NOAA data client + types | Done | claude, 2026-07-30 | | `src/data/noaa.ts` + `types.ts`; Vitest fixtures for all 9 feeds, all passing. Committed (`e8d9952`); solar wind plasma/mag + K-index feeds later corrected to match NOAA's actual live schema (`6f25894`). |
| 3 | Polling hook + threshold logic | Done | claude, 2026-07-30 | | `src/data/thresholds.ts` (unit tested) + `src/data/useSpaceWeather.ts` polling hook; demoed via throwaway `<pre>` dump in App.tsx. Committed. |
| 4 | HUD panel (Phase 1 complete) | Done | claude, 2026-07-30 | | `src/components/Hud.tsx` wired into `App.tsx`, replacing the Chunk 3 debug dump; per-feed loading/error handling so one failing feed doesn't blank the panel. Verified via headless browser (see chromium-cli/playwright screenshot) with live NOAA data. Committed. |
| 5 | Sprite asset pipeline | Done | claude, 2026-07-30 | | AI-generated placeholder pixel art (per resolved open question in Plan.md §10): `scripts/generate-sprites.mjs` procedurally draws a 12-frame sheet (4 sun states, earth, 3 aurora intensities, 4 sky/storm bands) to `public/sprites/sheet.png` + `atlas.json`; `src/scene/atlas.ts` gives typed frame lookups. Verified via `public/sprite-test.html`, screenshotted with Playwright — each frame crops cleanly from the sheet at its atlas coordinates. |
| 6 | Static scene renderer (Phase 2 complete) | Done | claude, 2026-07-30 | | `src/scene/draw.ts` (tier→frame mapping + layered compositor) + `src/scene/Scene.tsx` (canvas component with dev-only kp/flare selects for mock tier state, ResizeObserver-driven redraw). Sky/aurora frames are tiled rather than stretched since they're small streak/wave motifs, not full-frame backgrounds. Verified via Playwright screenshots at 1400px and 480px widths, calm and severe/extreme tier states — sprites swap correctly, layout holds up. |
| 7 | Wind + idle animation (Phase 3A) | Done | claude, 2026-07-30 | | `src/scene/wind.ts` (procedural streak particle field, no sprites — count/speed/opacity scale per `WindTier`) + `Scene.tsx` rewritten from a single static render into a `requestAnimationFrame` loop that steps the wind field and passes elapsed time into `draw.ts`'s `drawScene` for a sun breathing-scale pulse and aurora alpha twinkle. Also touched `draw.ts` (added `wind: WindTier` to `SceneTiers` and an `elapsedMs` param) beyond the chunk's listed files — needed as the shared home for tier state and idle-pulse math; kept minimal. Verified: `tsc --noEmit`, `npm run build`, and `npm test` all pass; Playwright against `npm run dev` confirmed the canvas mutates frame-to-frame (rAF running, ~30 rAF callbacks in 500ms ≈ 60fps) and screenshotted slow vs. fast wind tiers — streak count/opacity visibly differ (fast tier clearly denser/brighter). Initial streak color/weight blended into the sky sprite's existing diagonal dash texture, so switched to a cyan tint confined to a mid-sky band for legibility. Cleanup path calls `cancelAnimationFrame`/`observer.disconnect()` on unmount (code-reviewed; no in-app route exists yet to exercise a live unmount, since Chunk 10 hasn't assembled the full page). |
| 8 | Flare + storm reaction effects (Phase 3B) | Done | claude, 2026-07-30 | | `src/scene/effects.ts` (new): `EffectsState` tracks the previous kp/flare tier plus per-layer transition timers, driving (1) a one-shot decaying shake+scale "pop" armed only when flare tier crosses into strong/extreme (M/X) from below, so it plays once and doesn't loop, and (2) a continuous pulsing ring / jagged crack overlay around earth keyed off `BzTier` (ripple = soft ring, crack = ring + red crack lines). `draw.ts` `SceneTiers` gained a `bz: BzTier` field; `drawScene` now takes an optional `EffectsState` and crossfades the sky/sun/aurora frames over 700ms via alpha-blended prev/current draws instead of hard-cutting on tier change, and calls `drawMagnetosphereEffect`. `Scene.tsx` creates/updates the `EffectsState` each time its render effect (re)mounts, diffing against a `prevTiersRef` that survives across those remounts so a tier change is still detected as a transition rather than an instant jump; added a `bz` dev-mode tier select. Verified: `src/scene/effects.test.ts` (10 new unit tests covering transition-progress arithmetic and flare-pop arm/decay/no-relooping) + `tsc --noEmit` + `npm run build` all pass; Playwright against `npm run dev` confirmed (a) forcing flare quiet→strong triggers a canvas-changing pop that settles within ~1s and doesn't reappear on subsequent frames, (b) forcing kp calm→storm shows a genuinely blended mid-transition frame (both sky motifs visibly overlapping) rather than an instant cut, and (c) bz=crack renders the ring/crack overlay around earth. |
| 9 | ENLIL thumbnail + "Go Deeper" links (Phase 4) | Not started | | | |
| 10 | Layout assembly + responsiveness | Not started | | | |
| 11 | Accessibility + reduced motion + alerts (Phase 5) | Not started | | | |
| 12 | Optional sound + mascot polish | Not started | | | |
