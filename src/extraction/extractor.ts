import type { RawListing } from "../watchers/types.ts"

export interface ListingData {
  price: number | null
  beds: number | null
  baths: number | null
  distanceMinutes: number | null
  amenities: string[]
  petsAllowed: boolean | null
  hasOnlineApplication: boolean
  applyUrl: string | null
  addressText: string | null
}

const PRICE_RE = /\$?([\d,]+)/

// Normalizes whatever an adapter returned into a canonical shape. Adapters
// that already return clean structured fields (like the fixture adapter)
// pass straight through; adapters scraping real markup rely on this to make
// sense of messier text fields.
export function extractListing(raw: RawListing): ListingData {
  const price = raw.price ?? parsePrice(raw.priceText)
  return {
    price,
    beds: raw.beds ?? null,
    baths: raw.baths ?? null,
    distanceMinutes: raw.distanceMinutes ?? null,
    amenities: raw.amenities ?? [],
    petsAllowed: raw.petsAllowed ?? null,
    hasOnlineApplication: Boolean(raw.applyUrl),
    applyUrl: raw.applyUrl ?? null,
    addressText: raw.addressText ?? null,
  }
}

function parsePrice(text: string | undefined): number | null {
  if (!text) return null
  const m = PRICE_RE.exec(text)
  if (!m || !m[1]) return null
  return Number(m[1].replace(/,/g, ""))
}
