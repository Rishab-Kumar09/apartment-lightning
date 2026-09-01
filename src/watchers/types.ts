import type { SolariAdapter } from "../solari/client.ts"

// What an adapter hands back for a listing it found. Deliberately loose/text-y
// for real sites (markup varies); the fixture adapter can return already-clean
// values since it controls its own synthetic data.
export interface RawListing {
  externalId: string // adapter-namespaced unique id, e.g. "fixture:12345"
  sourceAdapter: string
  sourceUrl: string
  title?: string
  price?: number
  priceText?: string
  beds?: number
  baths?: number
  addressText?: string
  distanceMinutes?: number
  amenities?: string[]
  petsAllowed?: boolean
  applyUrl?: string
  raw?: unknown
}

export interface SiteAdapter {
  name: string
  listNewListings(ctx: { solari: SolariAdapter; targetUrl: string }): Promise<RawListing[]>
}

export interface SourceConfig {
  adapter: SiteAdapter
  targetUrl: string
  pollIntervalMs: number
}
