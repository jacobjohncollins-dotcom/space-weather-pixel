// Pure mapping functions from raw feed values to status tiers (see Plan.md §8).
// No dependency on the NOAA fetch layer (src/data/noaa.ts) — these operate on
// plain numbers so they can be unit tested and reused by the polling hook
// once it lands.

export type KpTier = 'calm' | 'unsettled' | 'storm' | 'severe'
export type FlareTier = 'quiet' | 'small' | 'strong' | 'extreme'
export type WindTier = 'slow' | 'moderate' | 'fast'
export type BzTier = 'shielded' | 'ripple' | 'crack'

export function kpTier(kp: number): KpTier {
  if (kp >= 7) return 'severe'
  if (kp >= 5) return 'storm'
  if (kp >= 3) return 'unsettled'
  return 'calm'
}

// maxClass is NOAA's flare class string, e.g. "A1.0", "M2.3", "X1.0".
export function flareTier(maxClass: string): FlareTier {
  const letter = maxClass.trim().charAt(0).toUpperCase()
  switch (letter) {
    case 'X':
      return 'extreme'
    case 'M':
      return 'strong'
    case 'C':
      return 'small'
    default:
      return 'quiet' // A, B, or unrecognized
  }
}

export function windTier(speedKmS: number): WindTier {
  if (speedKmS > 600) return 'fast'
  if (speedKmS >= 400) return 'moderate'
  return 'slow'
}

export function bzTier(bz: number): BzTier {
  if (bz <= -10) return 'crack'
  if (bz < 0) return 'ripple'
  return 'shielded'
}
