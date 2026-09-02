// Runs the AppFolio adapter against real, live property-management sites,
// as proof the extraction/scoring logic works against real markup -- kept
// deliberately separate from the demo server.
//
// SAFETY BOUNDARY: this script detects, extracts, and scores real listings,
// and logs what it finds, but it NEVER calls the fill flow against a real
// site. Opening and filling a real company's live application form with
// synthetic identity data isn't something this project does just to prove a
// point, even though fillFlow itself never submits. Fill+submit only ever
// happens against the local fixture site (via the demo server's UI), where
// there's a real human in the loop and nothing sensitive gets touched.
//
// Usage: tsx --env-file=.env scripts/watch-live.ts <appfolio-listings-url> [more urls...]

import { migrate } from "../src/db/migrate.ts"
import { getSolari } from "../src/solari/client.ts"
import { appfolioAdapter } from "../src/watchers/adapters/appfolio.ts"
import { extractListing } from "../src/extraction/extractor.ts"
import { scoreListing } from "../src/extraction/scorer.ts"
import { hasSeenListing, markSeen, insertListing } from "../src/db/repositories/listings.ts"
import { listActiveSearches, insertSearch, getLatestSearch } from "../src/db/repositories/searches.ts"
import type { SearchCriteria } from "../src/preferences/types.ts"

const urls = process.argv.slice(2)
if (urls.length === 0) {
  console.error("usage: tsx --env-file=.env scripts/watch-live.ts <appfolio-listings-url> [more urls...]")
  process.exit(1)
}

const DEMO_CRITERIA: SearchCriteria = {
  beds: 1,
  maxPrice: 1600,
  city: "Austin",
  referencePoint: "downtown Austin",
  radiusMinutes: 30,
  mustHaveAmenities: ["parking"],
  petsAllowed: true,
  notes: null,
}

migrate()
if (!getLatestSearch()) {
  insertSearch("live-watch default criteria", DEMO_CRITERIA)
}

async function pollOnce(targetUrl: string) {
  const solari = await getSolari()
  const raw = await appfolioAdapter.listNewListings({ solari, targetUrl })
  const searches = listActiveSearches()
  let newCount = 0

  for (const listing of raw) {
    if (hasSeenListing(listing.externalId)) continue
    newCount++
    markSeen(listing)
    const extracted = extractListing(listing)

    for (const search of searches) {
      const { accepted, reasons, score } = scoreListing(extracted, search.criteria)
      insertListing({ ...extracted, seenListingId: listing.externalId, searchId: search.id, score, accepted, reasons })
      const summary = `$${extracted.price ?? "?"}/mo, ${extracted.beds ?? "?"}bd, "${extracted.addressText ?? "?"}"`
      if (accepted) {
        console.log(`[${new Date().toISOString()}] MATCH — ${summary} — applyUrl: ${extracted.applyUrl ?? "none"}`)
      } else {
        console.log(`[${new Date().toISOString()}] skip — ${summary} — ${reasons.join("; ")}`)
      }
    }
  }
  console.log(`[${new Date().toISOString()}] polled ${targetUrl}: ${raw.length} listing(s), ${newCount} new`)
}

async function main() {
  console.log(`watching ${urls.length} live AppFolio source(s), polling every 5 minutes. Ctrl+C to stop.`)
  for (const url of urls) {
    await pollOnce(url).catch((err) => console.error(`poll failed for ${url}:`, err))
  }
  setInterval(() => {
    for (const url of urls) {
      pollOnce(url).catch((err) => console.error(`poll failed for ${url}:`, err))
    }
  }, 5 * 60_000)
}

main()
