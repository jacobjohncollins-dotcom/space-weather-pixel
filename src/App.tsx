import { AlertBanner } from './components/AlertBanner.tsx'
import { Hud } from './components/Hud.tsx'
import { SoundToggle } from './components/SoundToggle.tsx'
import { Scene } from './scene/Scene.tsx'
import { useSpaceWeather } from './data/useSpaceWeather.ts'
import { overallSeverity, SEVERITY_LABELS } from './scene/severity.ts'
import type { SceneTiers } from './scene/draw.ts'

const DEFAULT_TIERS: SceneTiers = {
  kp: 'calm',
  flare: 'quiet',
  wind: 'slow',
  bz: 'shielded',
}

function App() {
  const state = useSpaceWeather()

  const tiers: SceneTiers = {
    kp: state.kp.data?.tier ?? DEFAULT_TIERS.kp,
    flare: state.flare.data?.tier ?? DEFAULT_TIERS.flare,
    wind: state.wind.data?.tier ?? DEFAULT_TIERS.wind,
    bz: state.bz.data?.tier ?? DEFAULT_TIERS.bz,
  }

  const statusLabel = state.loading
    ? 'Acquiring signal…'
    : SEVERITY_LABELS[overallSeverity(tiers)]

  return (
    <div className="flex min-h-svh flex-col items-center gap-4 bg-slate-950 p-4 text-slate-100">
      <div className="flex w-full max-w-5xl justify-end">
        <SoundToggle />
      </div>

      <header className="w-full max-w-5xl text-center">
        <h1 className="font-mono text-lg uppercase tracking-[0.3em] text-slate-200">
          Space Weather Pixel Dashboard
        </h1>
        <p className="mt-1 font-mono text-xs uppercase tracking-widest text-cyan-400">
          {statusLabel}
        </p>
      </header>

      <AlertBanner alerts={state.alerts.data} />

      <div className="flex w-full max-w-5xl flex-col items-center gap-4 lg:flex-row lg:items-start lg:justify-center">
        <Scene tiers={tiers} />
        <Hud state={state} />
      </div>
    </div>
  )
}

export default App
