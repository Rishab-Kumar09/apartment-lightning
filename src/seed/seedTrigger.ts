import { seedFixtureListing, resetFixture, type FixtureListingInput } from "./fixtureSite/server.ts"

// The demo default: matches the example prompt ("1-bedroom under $1,600,
// 30 min from downtown Austin, parking, cats OK") closely enough to be
// accepted by the default demo search criteria in cli/run.ts.
const DEFAULT_DEMO_LISTING: FixtureListingInput = {
  price: 1495,
  beds: 1,
  baths: 1,
  addressText: "212 Rainey St, Austin, TX",
  distanceMinutes: 12,
  amenities: ["parking", "in-unit laundry"],
  petsAllowed: true,
}

export function triggerSeedListing(overrides: Partial<FixtureListingInput> = {}) {
  return seedFixtureListing({ ...DEFAULT_DEMO_LISTING, ...overrides })
}

export function resetSeedFixture() {
  resetFixture()
}
