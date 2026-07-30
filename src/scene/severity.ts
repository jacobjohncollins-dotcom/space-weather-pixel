// Shared "worst of all feeds" severity ranking (Chunk 12, Plan.md §9a).
// Extracted from App.tsx's original inline SEVERITY_RANK table so the
// overall-status banner and the scene mascot's expression (which should
// match the same headline status) can't drift out of sync.

import type { BzTier, FlareTier, KpTier, WindTier } from '../data/thresholds.ts'

export type Severity = 0 | 1 | 2 | 3

export const SEVERITY_LABELS = [
  'Calm',
  'Unsettled',
  'Active Storm',
  'Severe Storm',
] as const

interface OverallTiers {
  kp: KpTier
  flare: FlareTier
  wind: WindTier
  bz: BzTier
}

const SEVERITY_RANK: Record<string, Severity> = {
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

export function overallSeverity(tiers: OverallTiers): Severity {
  return Math.max(
    SEVERITY_RANK[tiers.kp],
    SEVERITY_RANK[tiers.flare],
    SEVERITY_RANK[tiers.wind],
    SEVERITY_RANK[tiers.bz],
  ) as Severity
}
