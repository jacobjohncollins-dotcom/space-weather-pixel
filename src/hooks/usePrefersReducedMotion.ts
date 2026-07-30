// Chunk 11 (Plan.md §9a): tracks the OS-level `prefers-reduced-motion`
// setting live, so Scene.tsx can stop its requestAnimationFrame loop
// immediately if the user toggles the setting mid-session, not just on load.

import { useEffect, useState } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

export function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(
    () => window.matchMedia(QUERY).matches,
  )

  useEffect(() => {
    const mql = window.matchMedia(QUERY)
    const onChange = () => setPrefersReducedMotion(mql.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return prefersReducedMotion
}
