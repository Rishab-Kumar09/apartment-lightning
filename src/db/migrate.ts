import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { db } from "./client.ts"

const here = path.dirname(fileURLToPath(import.meta.url))

export function migrate(): void {
  const schema = fs.readFileSync(path.join(here, "schema.sql"), "utf8")
  db.exec(schema)
}
