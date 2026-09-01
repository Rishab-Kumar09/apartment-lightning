import type { Page, BrowserContext } from "playwright"
import { config } from "../config.ts"

// The seam between this codebase and Solari's cloud service. Real vs mock is
// selected once here; every other module only ever imports this interface.
export interface SolariBrowserSession {
  id: string
  newPage(): Promise<Page>
  close(): Promise<void>
}

export interface SolariProfile {
  id: string
  name: string
}

export interface SolariAdapter {
  readonly isMock: boolean
  launch(opts?: { profileId?: string; recording?: boolean }): Promise<SolariBrowserSession>
  profiles: {
    list(): Promise<SolariProfile[]>
    create(opts: { name: string }): Promise<SolariProfile>
    save(profileId: string, state: unknown): Promise<{ version: number; sizeBytes: number }>
  }
  sessions: {
    downloadReplay(sessionId: string): Promise<Uint8Array | null>
  }
  close(): Promise<void>
}

// Only exported for type reuse in mock/real implementations.
export type { BrowserContext }

let cached: SolariAdapter | null = null

export async function getSolari(): Promise<SolariAdapter> {
  if (cached) return cached
  let instance: SolariAdapter
  if (config.useMockSolari) {
    const { MockSolariAdapter } = await import("./mockClient.ts")
    instance = new MockSolariAdapter()
  } else {
    const { RealSolariAdapter } = await import("./realClient.ts")
    instance = new RealSolariAdapter(config.solariApiKey)
  }
  cached = instance
  return instance
}

// Call once on process shutdown — not per fill/submit flow. The real client
// keeps a loopback proxy server open per the cookbook; releasing it mid-run
// would break subsequent launches.
export async function closeSolari(): Promise<void> {
  if (cached) {
    await cached.close()
    cached = null
  }
}
