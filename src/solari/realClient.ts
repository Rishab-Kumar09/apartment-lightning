import type { SolariAdapter, SolariBrowserSession, SolariProfile } from "./client.ts"

// Thin wrapper around the real @solarisdk/browser SDK, matching the shape
// confirmed from the cookbook (see solari/client.ts doc comment). Not
// exercised until SOLARI_API_KEY is set — see src/config.ts useMockSolari.
export class RealSolariAdapter implements SolariAdapter {
  readonly isMock = false
  private client: any

  constructor(apiKey: string) {
    // Dynamic import so this file has no hard dependency until it's actually
    // used — keeps `npm install` and typecheck working before the SDK
    // package is added in Phase 5.
    this.clientReady = import("@solarisdk/browser").then(({ Solari }: any) => {
      this.client = new Solari({ apiKey })
    })
  }

  private clientReady: Promise<void>

  async launch(opts?: { profileId?: string; recording?: boolean }): Promise<SolariBrowserSession> {
    await this.clientReady
    const browser = await this.client.launch(opts)
    return {
      id: browser.id,
      newPage: () => browser.newPage(),
      close: () => browser.close(),
    }
  }

  profiles = {
    list: async (): Promise<SolariProfile[]> => {
      await this.clientReady
      return this.client.profiles.list()
    },
    create: async (opts: { name: string }): Promise<SolariProfile> => {
      await this.clientReady
      return this.client.profiles.create(opts)
    },
    save: async (profileId: string, state: unknown) => {
      await this.clientReady
      return this.client.profiles.save(profileId, state)
    },
  }

  sessions = {
    // Upload happens async after session release — first poll often 404s.
    // Retry with backoff per the cookbook's documented behavior.
    downloadReplay: async (sessionId: string): Promise<Uint8Array | null> => {
      await this.clientReady
      for (let attempt = 1; attempt <= 10; attempt++) {
        await new Promise((r) => setTimeout(r, 3000))
        try {
          return await this.client.sessions.download_replay(sessionId)
        } catch (err: any) {
          if (err?.status !== 404) throw err
        }
      }
      return null
    },
  }

  async close() {
    await this.clientReady
    await this.client.close()
  }
}
