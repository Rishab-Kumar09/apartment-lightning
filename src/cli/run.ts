import { migrate } from "../db/migrate.ts"
import { startServer } from "../server.ts"
import { startFixtureSite } from "../seed/fixtureSite/server.ts"
import { triggerSeedListing, resetSeedFixture } from "../seed/seedTrigger.ts"
import { runPollCycle, startPolling } from "../watchers/registry.ts"
import { getFixtureSource } from "../sources.ts"
import { getLatestSearch, insertSearch } from "../db/repositories/searches.ts"
import { closeSolari } from "../solari/client.ts"
import type { SearchCriteria } from "../preferences/types.ts"

const args = new Set(process.argv.slice(2))

const DEMO_QUERY = "Find me 1-bedroom apartments under $1,600 within 30 minutes of downtown Austin. I need parking and allow cats."

// Hardcoded fallback so --seed works with zero API keys configured. Once a
// chat UI query comes in through the (Phase 3) /searches endpoint, it goes
// through the real parser instead.
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

function ensureDemoSearch() {
  const existing = getLatestSearch()
  if (existing) return existing
  return insertSearch(DEMO_QUERY, DEMO_CRITERIA)
}

async function main() {
  migrate()
  startServer()
  startFixtureSite()

  const fixtureSource = getFixtureSource()

  if (args.has("--seed")) {
    if (args.has("--reset")) resetSeedFixture()
    ensureDemoSearch()
    const listing = triggerSeedListing()
    console.log(`seeded listing #${listing.id} — running one poll cycle...`)
    await runPollCycle(fixtureSource)
    console.log("poll cycle complete — check data/app.db `applications` table for the result.")
  }

  startPolling([fixtureSource])
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})

async function shutdown() {
  await closeSolari()
  process.exit(0)
}
process.on("SIGINT", shutdown)
process.on("SIGTERM", shutdown)
