import express from "express"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { config } from "./config.ts"

const here = path.dirname(fileURLToPath(import.meta.url))

export function createServer() {
  const app = express()
  app.use(express.json())
  app.use(express.static(path.join(here, "..", "web")))

  app.get("/health", (_req, res) => {
    res.json({ ok: true, mockSolari: config.useMockSolari })
  })

  return app
}

export function startServer() {
  const app = createServer()
  return app.listen(config.port, () => {
    console.log(`apartment-lightning listening on http://localhost:${config.port}`)
    console.log(`solari mode: ${config.useMockSolari ? "mock" : "real"}`)
  })
}
