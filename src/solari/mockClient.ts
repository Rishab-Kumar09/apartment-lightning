import { chromium, type Browser } from "playwright"
import crypto from "node:crypto"
import type { SolariAdapter, SolariBrowserSession, SolariProfile, LaunchOpts } from "./client.ts"

// Mocks the Solari CLOUD SERVICE only (profile persistence, session
// recording/replay). newPage() still returns a real, locally-launched
// Playwright page — so fill/detect logic against the fixture site is
// genuinely exercised end to end, not stubbed out.
class MockSession implements SolariBrowserSession {
  constructor(
    public id: string,
    private browser: Browser,
  ) {}

  async newPage() {
    const context = this.browser.contexts()[0] ?? (await this.browser.newContext())
    return context.newPage()
  }

  async close() {
    await this.browser.close()
  }
}

export class MockSolariAdapter implements SolariAdapter {
  readonly isMock = true
  private profileList = new Map<string, SolariProfile>()
  private profileStates = new Map<string, unknown>()

  async launch(opts?: LaunchOpts): Promise<SolariBrowserSession> {
    const browser = await chromium.launch({ headless: true })
    const state = opts?.profileId ? this.profileStates.get(opts.profileId) : undefined
    // Pre-create a context with saved storage state, if any, so the session
    // "starts already logged in" the same way a real Solari profile would.
    await browser.newContext(state ? { storageState: state as any } : undefined)
    return new MockSession(crypto.randomUUID(), browser)
  }

  profiles = {
    list: async (): Promise<SolariProfile[]> => [...this.profileList.values()],
    create: async (opts: { name: string }): Promise<SolariProfile> => {
      const profile = { id: crypto.randomUUID(), name: opts.name }
      this.profileList.set(profile.id, profile)
      return profile
    },
    save: async (profileId: string, state: unknown) => {
      this.profileStates.set(profileId, state)
      return { version: (this.profileStates.get(profileId) ? 1 : 0) + 1, sizeBytes: JSON.stringify(state).length }
    },
  }

  sessions = {
    downloadReplay: async (_sessionId: string): Promise<Uint8Array | null> => {
      // No real recording in mock mode — callers should treat null as
      // "no replay available" rather than an error.
      return null
    },
  }

  async close() {
    // Nothing to release — each launch() owns and closes its own browser.
  }
}
