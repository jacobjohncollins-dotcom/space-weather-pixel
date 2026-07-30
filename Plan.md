# Plan: Space Weather Pixel Dashboard

## 1. Concept

A single-page web app that shows real-time space weather conditions through
quirky, animated pixel art — a fun, glanceable "vibe check" for the sun and
magnetosphere — backed by real NOAA/NASA data, with clear links out to the
authoritative sources (WSA-ENLIL model, NOAA SWPC) for anyone who wants the
full scientific detail.

**Inspiration**

- [spaceweather.live — WSA-Enlil page](https://www.spaceweather.live/en/solar-activity/wsa-enlil.html) —
  layout/UX reference for how to present CME arrival timing, solar wind
  speed/density, and Kp forecast in one glance.
- [spaceweather.gov/models](https://www.spaceweather.gov/models) — NOAA's
  full model catalog; source of truth for what "official" products to link to.
- Pixel-art aesthetic: retro 16/32-bit sprite style (think classic SNES/GBA
  weather or Tamagotchi-style creatures) applied to solar wind, aurora,
  flares, and geomagnetic storms.

## 2. Goals

- Real-time (or near-real-time, ~1–5 min refresh) visualization of key space
  weather indices using charming pixel-art scenes, not raw charts.
- One-click access to the official NOAA SWPC and ENLIL pages for verification
  / deeper dives.
- Fast, static-hostable, no backend database required — pull live JSON
  directly from public NOAA feeds client-side or via a thin edge proxy.
- Fun enough to check daily like a weather app; accurate enough to be a
  legitimate first-glance space weather tool.

## 3. Data Sources (all free, public, real-time)

NOAA SWPC publishes machine-readable JSON feeds at
`https://services.swpc.noaa.gov/` — this is the primary data backbone.

| Metric                                       | Feed                                                                                                | Pixel-art use                                                             |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Planetary K-index (Kp)                       | `products/noaa-planetary-k-index.json`                                                              | Aurora oval creature mood / storm intensity meter                         |
| Solar wind plasma (speed, density)           | `products/solar-wind/plasma-7-day.json`                                                             | Animated "wind" streaks blowing across scene                              |
| Solar wind magnetic field (Bz, Bt)           | `products/solar-wind/mag-7-day.json`                                                                | Sky color shifts (southward Bz = more aurora-likely = greener/redder sky) |
| GOES X-ray flux (flare class)                | `json/goes/primary/xrays-6-hour.json`                                                               | Sun sprite flares/pulses (A/B/C/M/X class → visual intensity + shake)     |
| GOES X-ray flare events                      | `json/goes/primary/xray-flares-latest.json`                                                         | Flare "pop" animation + toast notification                                |
| Sunspot number / region data                 | `json/solar-regions.json`                                                                           | Sunspot dots on sun sprite                                                |
| Aurora 30-min forecast (OVATION)             | `json/ovation_aurora_latest.json`                                                                   | Mini pixel-art globe with aurora oval overlay                             |
| Geomagnetic storm alerts                     | `products/alerts.json`                                                                              | Banner / storm cloud sprite triggers                                      |
| WSA-Enlil CME simulation (images/animations) | `https://services.swpc.noaa.gov/products/animations/enlil.json` (latest frame) + link to full model | Small looping thumbnail + "View full ENLIL model" link out                |

All feeds are CORS-friendly JSON; no API key required. This means the app
can be a static frontend (no server needed) for MVP, with an optional light
edge function later if we want to cache/rate-limit.

## 4. Official Links to Surface

Prominent "Go Deeper" panel/footer with:

- WSA-Enlil model — https://www.spaceweather.live/en/solar-activity/wsa-enlil.html
  and NOAA's own Enlil product page (from spaceweather.gov/models)
- NOAA SWPC home — https://www.spaceweather.gov
- NOAA SWPC model catalog — https://www.spaceweather.gov/models
- NOAA aurora dashboard — https://www.swpc.noaa.gov/products/aurora-30-minute-forecast

## 5. Pixel Art Scene Design

A single main "scene" canvas (e.g. 256×144 or 320×180 base resolution,
scaled up crisply with `image-rendering: pixelated`), composited from
layered sprites so each data stream can animate independently:

1. **Background layer** — day/night sky gradient in pixel bands; shifts hue
   based on geomagnetic storm level (calm blue → stormy purple/green).
2. **Sun sprite** — center or corner; idle animation, "angry" flare pop
   animation scaled to X-ray flare class, sunspot pixels appear/disappear
   based on active region count.
3. **Solar wind layer** — particle/streak animation blowing left-to-right;
   speed and density of streaks driven by real plasma speed/density values.
4. **Earth + magnetosphere layer** — small pixel Earth with a bow-shock
   outline that visibly compresses/ripples when Bz goes strongly southward
   or a storm alert fires.
5. **Aurora layer** — pixel aurora ribbon over the Earth sprite, intensity
   and color banding tied to Kp index and OVATION forecast.
6. **UI/HUD layer** — retro "status window" (game-like dialog box) showing
   current numeric readouts (Kp, wind speed, Bz, flare class) so the app
   stays legible even for people who just want the numbers.

Optional stretch: a small mascot/companion sprite (e.g. a pixel astronaut or
satellite) whose expression changes with conditions — calm, alert, "duck and
cover" during a strong storm.

**Data visuals as scene elements**: Kp/wind/Bz/flare readouts aren't a
separate chart widget — they're animated pixel-art graphs and a radar-style
aurora/storm dial, drawn in the same limited palette and pixel grid as the
sky/landscape, and physically placed within the scene (e.g. a pixel-art
"instrument panel" built into the landscape, a radar dish sprite on the
horizon, a scrolling pixel graph along the ground line) rather than floating
in a separate UI panel. Keep the plain numeric HUD (Chunk 4) as the
accessible/non-decorative fallback per Chunk 11, but the primary visual
experience should read as one cohesive pixel-art night-sky scene.

## 6. Tech Stack (proposed)

- **Frontend**: React + TypeScript + Vite (fast, simple static build).
- **Rendering**: HTML5 Canvas (or PixiJS if we want sprite batching/easy
  animation) for the pixel scene; regular DOM/CSS for HUD, links, layout.
- **Data fetching**: `fetch` on an interval (e.g. every 60s) directly against
  `services.swpc.noaa.gov` JSON endpoints; SWR/React Query for caching +
  polling + stale-while-revalidate.
- **Styling**: Tailwind for layout chrome; hand-authored pixel sprites as
  sprite sheets (PNG, nearest-neighbor scaling) — art created in Aseprite or
  similar, exported as sprite sheets.
- **Hosting**: static host (Vercel/Netlify/Cloudflare Pages) — no backend
  needed for MVP since NOAA feeds are public and CORS-enabled.
- **Testing**: Vitest for data-mapping logic (e.g. "Kp 6 → storm tier 2"
  thresholds), Playwright smoke test for the page loading and scene
  rendering.

## 7. Page Layout (MVP)

```
┌─────────────────────────────────────────────┐
│  Title / current overall status banner       │
├───────────────────────────┬───────────────────┤
│                           │  HUD readouts     │
│      Pixel art scene      │  (Kp, wind, Bz,   │
│      (canvas)             │  flare class)     │
│                           │                   │
├───────────────────────────┴───────────────────┤
│  Mini ENLIL loop thumbnail + "Official Sources"│
│  links (spaceweather.live ENLIL, NOAA SWPC,    │
│  NOAA models page)                             │
└─────────────────────────────────────────────┘
```

Responsive: scene + HUD stack vertically on mobile.

## 8. Data → Visual Mapping (initial thresholds, to refine)

- **Kp index**: 0–2 calm (blue sky, no aurora) · 3–4 unsettled (faint aurora
  ribbon) · 5–6 minor/moderate storm (visible green aurora, HUD flashes
  amber) · 7+ severe storm (red/purple sky, aurora full width, alert banner).
- **X-ray flare class**: A/B quiet sun · C small flare pop · M sun shakes +
  toast notification · X sun shakes hard, screen flash, toast + banner.
- **Solar wind speed**: <400 km/s slow streaks · 400–600 moderate ·
  > 600 km/s fast, dense streak animation.
- **Bz**: northward (+) = magnetosphere shield sprite solid/calm; southward
  (−), especially < −10nT = shield ripples/cracks, aurora more likely.

## 9. Build Phases

1. **Phase 0 — Scaffold**: Vite+React+TS app, Tailwind, deploy pipeline,
   fetch one NOAA feed (Kp) and render raw numbers. Confirm CORS works
   client-side.
2. **Phase 1 — HUD only**: Wire up all data feeds into the HUD panel with
   polling, loading/error states, and threshold-based status labels (no art
   yet). This locks in the data layer before art work starts.
3. **Phase 2 — Static pixel scene**: Hand-drawn sprite sheet for sun, earth,
   sky, aurora at a few discrete states; swap sprite based on current
   thresholds (no animation yet, just state-driven sprite swapping).
4. **Phase 3 — Animation**: Add idle animations, particle/streak wind layer,
   flare pop/shake effects, smooth transitions between states.
5. **Phase 4 — Official links & ENLIL thumbnail**: Pull latest ENLIL frame/
   animation, add "Go Deeper" panel with outbound links.
6. **Phase 5 — Polish**: Mobile responsiveness, accessibility (numeric HUD
   as the non-decorative source of truth, alt text, reduced-motion mode),
   sound effects (optional, muted by default), storm alert push/toast.

## 9a. Chunked Work Breakdown (each chunk sized to fit in a single

    <80k-token agent session — one focused deliverable, small file surface)

Each chunk below lists: scope, files it touches, and a "done" check so it
can be handed to an agent (or picked up cold) independently. Chunks are
ordered by dependency — do them roughly in order within a phase, phases in
order.

**Chunk 1 — Project scaffold**

- Scope: `npm create vite@latest` (React+TS), install Tailwind, ESLint/
  Prettier config, basic folder structure (`src/data`, `src/components`,
  `src/scene`), empty deploy config (Vercel/Netlify).
- Files: whole new repo skeleton (small, generated mostly by tooling).
- Done: `npm run dev` shows a blank styled page; `npm run build` succeeds;
  pushed to a git repo with a working deploy preview.

**Chunk 2 — NOAA data client + types**

- Scope: `src/data/noaa.ts` — typed fetch wrappers for each feed in the
  table in §3 (Kp, plasma, mag, xrays, xray-flares, solar-regions, ovation,
  alerts, enlil animation). Hand-written TS interfaces per feed shape (no
  codegen needed — feeds are small/stable).
- Files: `src/data/noaa.ts`, `src/data/types.ts`.
- Done: unit test (Vitest) hits real endpoints (or fixture JSON) and
  confirms parsed shape for each feed.

**Chunk 3 — Polling hook + threshold logic**

- Scope: `useSpaceWeather()` React Query/SWR hook that polls all feeds on
  an interval, plus pure functions mapping raw values → status tiers per
  §8 (Kp tier, flare tier, wind tier, Bz tier).
- Files: `src/data/useSpaceWeather.ts`, `src/data/thresholds.ts` (+ tests).
- Done: thresholds.ts has unit tests covering every tier boundary; hook
  demoed by logging state to console in a throwaway `<pre>` dump.

**Chunk 4 — HUD panel (Phase 1 complete)**

- Scope: retro "status window" component rendering live numeric readouts
  - tier labels from Chunk 3, with loading/error states.
- Files: `src/components/Hud.tsx` + styles.
- Done: HUD visibly updates on a real deploy using live NOAA data; no
  crashes on a feed timing out.

**Chunk 5 — Sprite asset pipeline**

- Scope: decide art source (hand-drawn/commissioned/AI placeholder per
  open question), produce first sprite sheet: sun (3–4 flare states),
  earth, sky bands (4 storm levels), aurora ribbon (3 intensity states).
  Export as PNG sprite sheets with a small JSON atlas (or fixed-grid
  convention).
- Files: `public/sprites/*.png`, `src/scene/atlas.ts`.
- Done: sprite sheet files committed; a static test page shows each frame
  cropped correctly via the atlas coordinates.

**Chunk 6 — Static scene renderer (Phase 2 complete)**

- Scope: Canvas component that takes current tier state and draws the
  matching static sprite frames layered (sky → sun → earth → aurora), no
  animation — state-driven swap only. `image-rendering: pixelated` scaling.
- Files: `src/scene/Scene.tsx`, `src/scene/draw.ts`.
- Done: changing mock tier state (via a dev-only control) visibly swaps
  the correct sprites; works at 2–3 canvas sizes/resolutions.

**Chunk 7 — Wind + idle animation (Phase 3, part A)**

- Scope: particle/streak layer for solar wind driven by speed/density
  tier; idle breathing/twinkle animation loop for sun/aurora using
  requestAnimationFrame.
- Files: `src/scene/wind.ts`, updates to `Scene.tsx`.
- Done: wind streak density/speed visibly changes across the 3 wind tiers;
  animation runs smoothly (~60fps) without leaking rAF loops on unmount.

**Chunk 8 — Flare + storm reaction effects (Phase 3, part B)**

- Scope: flare "pop"/shake animation triggered by flare tier changes,
  magnetosphere ripple/crack effect on strong negative Bz, smooth CSS/
  canvas transitions between tier states (avoid hard pop/cuts).
- Files: `src/scene/effects.ts`, updates to `Scene.tsx`.
- Done: forcing an M/X flare tier in dev mode visibly triggers the
  shake/pop once (not looping); transitions between calm↔storm are
  smoothed, not instant jumps.

**Chunk 9 — ENLIL thumbnail + "Go Deeper" links (Phase 4)**

- Scope: fetch/display the latest ENLIL animation frame (or embed NOAA's
  hosted loop if hot-linkable), plus a links panel to spaceweather.live
  ENLIL page, NOAA SWPC home, and NOAA models page.
- Files: `src/components/EnlilPanel.tsx`, `src/components/SourcesPanel.tsx`.
- Done: panel renders on deploy with a real current ENLIL image and
  working outbound links (opened in new tab).

**Chunk 10 — Layout assembly + responsiveness**

- Scope: assemble Scene + HUD + EnlilPanel + SourcesPanel into the full
  page layout from §7, mobile stacking breakpoint.
- Files: `src/App.tsx`, top-level layout CSS.
- Done: page looks correct at desktop (1440px) and mobile (390px) widths;
  no overflow/clipping.

**Chunk 11 — Accessibility + reduced motion + alerts (Phase 5)**

- Scope: `prefers-reduced-motion` handling (freeze animation, keep state
  swaps), alt text / aria-live region mirroring HUD numbers, storm alert
  toast/banner wired to NOAA `alerts.json`.
- Files: updates across `Scene.tsx`, `Hud.tsx`, new `src/components/
AlertBanner.tsx`.
- Done: axe/Lighthouse accessibility check passes on the deployed page;
  toggling OS reduced-motion setting visibly stops animation.

**Chunk 12 — Optional sound + mascot polish**

- Scope: optional muted-by-default SFX on flare pop/storm alert, optional
  mascot sprite with expression states.
- Files: `src/scene/sound.ts`, mascot sprite additions.
- Done: sound stays muted until explicit user opt-in (autoplay policies
  respected); mascot expression changes with storm tier.

Each chunk above is intentionally small (one component/module + tests),
so a fresh agent session can read this plan section, do the chunk, and
verify "done" without needing the full conversation history.

## 10. Open Questions

- ~~Pixel art: hand-drawn by you, commissioned, or AI-generated placeholder
  first then replaced?~~ **Resolved 2026-07-30**: simple pixel-art themes and
  landscapes (night sky + ground scene). Data readouts (graphs, radars) are
  rendered in the same pixel aesthetic and embedded directly into the scene
  as part of the landscape/sky, rather than as a separate plain HUD panel —
  see note in §5. Affects Chunk 5 (sprite pipeline should include pixel
  graph/radar sprite states, not just sun/earth/sky/aurora) and Chunk 6
  (scene renderer needs to composite data-driven graph/radar elements
  alongside the environmental sprites). Chunk 4's current HUD
  (`src/components/Hud.tsx`) is plain text-in-a-box and will likely need
  revisiting in Phase 2/3 to match this direction, or be kept as an
  accessible/numeric fallback alongside the pixel graphs (see Chunk 11
  accessibility requirement for a non-decorative numeric source of truth).
- Do we want historical/trend view (e.g. last 24h sparkline) or strictly
  "right now" snapshot for MVP?
- Any interest in push/browser notifications for storm alerts, or keep it
  purely a page you check?
- Any preference on canvas library (raw Canvas API vs. PixiJS) — raw canvas
  is lighter for a small scene, PixiJS pays off if the sprite count grows.
