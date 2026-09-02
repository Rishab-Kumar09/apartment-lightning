import { Solari } from "@solarisdk/browser"
import type { SolariAdapter, SolariBrowserSession, SolariProfile, LaunchOpts } from "./client.ts"

// Thin wrapper around the real @solarisdk/browser SDK. Not exercised until
// SOLARI_API_KEY is set — see src/config.ts useMockSolari.
export class RealSolariAdapter implements SolariAdapter {
  readonly isMock = false
  private client: Solari

  constructor(apiKey: string) {
    this.client = new Solari({ apiKey })
  }

  async launch(opts?: LaunchOpts): Promise<SolariBrowserSession> {
    const session = await this.client.launch(opts)
    return {
      id: session.id,
      newPage: () => session.newPage(),
      close: () => session.close(),
    }
  }

  profiles = {
    list: (): Promise<SolariProfile[]> => this.client.profiles.list(),
    create: (opts: { name: string }): Promise<SolariProfile> => this.client.profiles.create(opts),
    save: (profileId: string, state: unknown) =>
      this.client.profiles.save(profileId, state as Parameters<Solari["profiles"]["save"]>[1]),
  }

  sessions = {
    // getReplayUrl is available ~1-3s after releaseAndWait per the SDK's own
    // docs — retry with backoff rather than treating an early 404 as final.
    downloadReplay: async (sessionId: string): Promise<Uint8Array | null> => {
      for (let attempt = 1; attempt <= 10; attempt++) {
        await new Promise((r) => setTimeout(r, 3000))
        try {
          return await this.client.sessions.downloadReplay(sessionId)
        } catch (err: any) {
          if (err?.status !== 404) throw err
        }
      }
      return null
    },
  }

  async close() {
    await this.client.close()
  }
}
