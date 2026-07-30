import { useSpaceWeather } from './data/useSpaceWeather.ts'

// Throwaway dump of useSpaceWeather() state for manual verification.
// Replaced by the real HUD panel in Chunk 4 (Plan.md §9a).
function App() {
  const spaceWeather = useSpaceWeather()

  return (
    <div className="min-h-svh bg-slate-950 p-6 text-slate-100">
      <pre className="font-mono text-xs whitespace-pre-wrap text-slate-400">
        {JSON.stringify(spaceWeather, null, 2)}
      </pre>
    </div>
  )
}

export default App
