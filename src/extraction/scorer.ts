import type { ListingData } from "./extractor.ts"
import type { SearchCriteria } from "../preferences/types.ts"

export interface ScoreResult {
  score: number
  accepted: boolean
  reasons: string[]
}

// Pure function: hard filters reject outright, soft factors (distance) rank
// what's left. No side effects, easy to unit test.
export function scoreListing(listing: ListingData, criteria: SearchCriteria): ScoreResult {
  const reasons: string[] = []

  if (criteria.maxPrice != null && listing.price != null && listing.price > criteria.maxPrice) {
    reasons.push(`price $${listing.price} exceeds max $${criteria.maxPrice}`)
  }
  if (criteria.beds != null && listing.beds != null && listing.beds !== criteria.beds) {
    reasons.push(`${listing.beds} bed(s) doesn't match requested ${criteria.beds}`)
  }
  if (
    criteria.radiusMinutes != null &&
    listing.distanceMinutes != null &&
    listing.distanceMinutes > criteria.radiusMinutes
  ) {
    reasons.push(`${listing.distanceMinutes} min away exceeds ${criteria.radiusMinutes} min radius`)
  }
  if (criteria.petsAllowed === true && listing.petsAllowed === false) {
    reasons.push("pets not allowed")
  }
  const amenitiesLower = listing.amenities.map((a) => a.toLowerCase())
  for (const required of criteria.mustHaveAmenities) {
    if (!amenitiesLower.some((a) => a.includes(required.toLowerCase()))) {
      reasons.push(`missing required amenity "${required}"`)
    }
  }

  const accepted = reasons.length === 0

  // Soft score: closer + cheaper is better, only meaningful among accepted listings.
  let score = 0
  if (accepted) {
    score = 100
    if (criteria.radiusMinutes && listing.distanceMinutes != null) {
      score -= (listing.distanceMinutes / criteria.radiusMinutes) * 20
    }
    if (criteria.maxPrice && listing.price != null) {
      score -= (listing.price / criteria.maxPrice) * 20
    }
  }

  return { score, accepted, reasons }
}
