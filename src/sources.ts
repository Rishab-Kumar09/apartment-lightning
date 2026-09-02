import { config } from "./config.ts"
import { fixtureAdapter } from "./watchers/adapters/fixture.ts"
import type { SourceConfig } from "./watchers/types.ts"

export function getFixtureSource(): SourceConfig {
  return {
    adapter: fixtureAdapter,
    targetUrl: `http://localhost:${config.fixtureSitePort}/listings`,
    pollIntervalMs: 5000,
  }
}
