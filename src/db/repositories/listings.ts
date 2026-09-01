import crypto from "node:crypto"
import { db } from "../client.ts"
import type { RawListing } from "../../watchers/types.ts"
import type { ListingData } from "../../extraction/extractor.ts"

export function hasSeenListing(externalId: string): boolean {
  const row = db.prepare(`SELECT 1 FROM seen_listings WHERE id = ?`).get(externalId)
  return Boolean(row)
}

export function markSeen(raw: RawListing): void {
  db.prepare(
    `INSERT INTO seen_listings (id, source_adapter, source_url, first_seen_at, raw_json)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(raw.externalId, raw.sourceAdapter, raw.sourceUrl, new Date().toISOString(), JSON.stringify(raw))
}

export interface InsertListingInput extends ListingData {
  seenListingId: string
  searchId: string
  score: number
  accepted: boolean
  reasons: string[]
}

export function insertListing(input: InsertListingInput): string {
  const id = crypto.randomUUID()
  db.prepare(
    `INSERT INTO listings
      (id, seen_listing_id, search_id, price, beds, baths, distance_minutes, amenities_json,
       has_online_application, apply_url, score, accepted, reasons_json, detected_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.seenListingId,
    input.searchId,
    input.price,
    input.beds,
    input.baths,
    input.distanceMinutes,
    JSON.stringify(input.amenities),
    input.hasOnlineApplication ? 1 : 0,
    input.applyUrl,
    input.score,
    input.accepted ? 1 : 0,
    JSON.stringify(input.reasons),
    new Date().toISOString(),
  )
  return id
}
