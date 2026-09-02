import { config } from "../config.ts"

// The only browser surface this codebase actually uses. Deliberately a
// minimal structural interface rather than importing Playwright's `Page`
// type directly: the mock client hands back a real `playwright` Page while
// the real Solari client hands back a `patchright-core` Page (a Playwright
// fork) — the two packages' Page types are structurally near-identical at
// runtime but not nominally assignable to each other in TS. Depending on
// this narrow slice keeps both satisfying the interface without a cast.
export interface LocatorLike {
  all(): Promise<LocatorLike[]>
  first(): LocatorLike
  getAttribute(name: string): Promise<string | null>
  innerText(): Promise<string>
  fill(value: string): Promise<void>
  click(): Promise<void>
}

export interface PageLike {
  goto(url: string): Promise<unknown>
  locator(selector: string): LocatorLike
  screenshot(opts: { path: string }): Promise<unknown>
  context(): { storageState(): Promise<unknown> }
}

// The seam between this codebase and Solari's cloud service. Real vs mock is
// selected once here; every other module only ever imports this interface.
export interface SolariBrowserSession {
  id: string
  newPage(): Promise<PageLike>
  close(): Promise<void>
}

export interface SolariProfile {
  id: string
  name: string
}

export interface LaunchOpts {
  profileId?: string
  recording?: boolean
  // Real-site adapters (Phase 6) opt into these; the mock client ignores
  // them since there's no real bot detection to defeat against a local
  // fixture site.
  stealth?: boolean
  captcha?: boolean
  proxy?: string
}

export interface SolariAdapter {
  readonly isMock: boolean
  launch(opts?: LaunchOpts): Promise<SolariBrowserSession>
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
