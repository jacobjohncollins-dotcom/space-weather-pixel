import { Hud } from './components/Hud.tsx'
import { Scene } from './scene/Scene.tsx'
import { useSpaceWeather } from './data/useSpaceWeather.ts'
import type { SceneTiers } from './scene/draw.ts'

const DEFAULT_TIERS: SceneTiers = {
  kp: 'calm',
  flare: 'quiet',
  wind: 'slow',
  bz: 'shielded',
}

// Ranks each tier onto a shared 0-3 severity scale so the banner can report
// a single "worst of all feeds" status rather than picking one feed to
// represent the rest.
const SEVERITY_RANK: Record<string, number> = {
  calm: 0,
  quiet: 0,
  slow: 0,
  shielded: 0,
  unsettled: 1,
  small: 1,
  moderate: 1,
  ripple: 1,
  storm: 2,
  strong: 2,
  fast: 2,
  crack: 2,
  severe: 3,
  extreme: 3,
}

const STATUS_LABELS = ['Calm', 'Unsettled', 'Active Storm', 'Severe Storm']

function App() {
  const state = useSpaceWeather()

  const tiers: SceneTiers = {
    kp: state.kp.data?.tier ?? DEFAULT_TIERS.kp,
    flare: state.flare.data?.tier ?? DEFAULT_TIERS.flare,
    wind: state.wind.data?.tier ?? DEFAULT_TIERS.wind,
    bz: state.bz.data?.tier ?? DEFAULT_TIERS.bz,
  }

  const severity = Math.max(
    SEVERITY_RANK[tiers.kp],
    SEVERITY_RANK[tiers.flare],
    SEVERITY_RANK[tiers.wind],
    SEVERITY_RANK[tiers.bz],
  )
  const statusLabel = state.loading
    ? 'Acquiring signal…'
    : STATUS_LABELS[severity]

  return (
    <div className="flex min-h-svh flex-col items-center gap-4 bg-slate-950 p-4 text-slate-100">
      <header className="w-full max-w-5xl text-center">
        <h1 className="font-mono text-lg uppercase tracking-[0.3em] text-slate-200">
          Space Weather Pixel Dashboard
        </h1>
        <p className="mt-1 font-mono text-xs uppercase tracking-widest text-cyan-400">
          {statusLabel}
        </p>
      </header>

      <div className="flex w-full max-w-5xl flex-col items-center gap-4 lg:flex-row lg:items-start lg:justify-center">
        <Scene tiers={tiers} />
        <Hud state={state} />
      </div>
    </div>
  )
}

export default App
