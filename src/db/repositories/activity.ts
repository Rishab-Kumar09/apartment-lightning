import { db } from "../client.ts"

// Clears everything a demo run accumulates (seen listings, scored listings,
// applications) while leaving searches and the applicant profile intact --
// those represent setup the human already did and shouldn't need repeating
// between takes. Used by POST /dev/reset for rehearsable demo recording.
export function clearActivity(): void {
  db.exec(`DELETE FROM applications; DELETE FROM listings; DELETE FROM seen_listings;`)
}
