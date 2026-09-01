import type { SolariAdapter, SolariProfile } from "./client.ts"

// Reuse the profile across runs; create it the first time only. Mirrors the
// pattern from the Solari cookbook's browser-profiles-ts example.
export async function ensureProfile(solari: SolariAdapter, name: string): Promise<SolariProfile> {
  const existing = (await solari.profiles.list()).find((p) => p.name === name)
  if (existing) return existing
  return solari.profiles.create({ name })
}
