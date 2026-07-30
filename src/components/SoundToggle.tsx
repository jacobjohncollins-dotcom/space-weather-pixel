// Muted-by-default SFX opt-in (Chunk 12, Plan.md §9a). This click is the
// user gesture that lets `soundEngine` create its AudioContext — browsers
// refuse to start audio before one, so there is no other place in the app
// that may call `setEnabled(true)`.

import { useState } from 'react'
import { soundEngine } from '../scene/sound.ts'

export function SoundToggle({ className = '' }: { className?: string }) {
  const [enabled, setEnabled] = useState(soundEngine.isEnabled())

  return (
    <button
      type="button"
      onClick={() => {
        const next = !enabled
        soundEngine.setEnabled(next)
        setEnabled(next)
      }}
      aria-pressed={enabled}
      aria-label={enabled ? 'Mute sound effects' : 'Enable sound effects'}
      className={`border-2 border-slate-700 bg-slate-900/90 px-2.5 py-1.5 font-mono text-sm text-slate-300 hover:text-cyan-300 ${className}`}
    >
      {enabled ? '🔊 sfx on' : '🔇 sfx off'}
    </button>
  )
}
