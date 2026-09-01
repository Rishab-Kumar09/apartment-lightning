import path from "node:path"

function truthy(v: string | undefined): boolean {
  return v === "1" || v?.toLowerCase() === "true"
}

export const config = {
  port: Number(process.env.PORT ?? 3000),
  fixtureSitePort: Number(process.env.FIXTURE_SITE_PORT ?? 4000),
  dbPath: path.resolve(process.env.DB_PATH ?? "./data/app.db"),
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
  solariApiKey: process.env.SOLARI_API_KEY ?? "",
  // Mock mode is the default: it only turns off once a real key is present
  // AND the caller hasn't forced it back on with MOCK_SOLARI=1.
  useMockSolari: truthy(process.env.MOCK_SOLARI) || !process.env.SOLARI_API_KEY,
}

export type Config = typeof config
