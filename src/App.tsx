import { Hud } from './components/Hud.tsx'
import { Scene } from './scene/Scene.tsx'

function App() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-slate-950 p-4 text-slate-100">
      <Scene />
      <Hud />
    </div>
  )
}

export default App
