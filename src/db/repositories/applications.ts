import crypto from "node:crypto"
import { db } from "../client.ts"

export interface InsertApplicationInput {
  listingId: string
  status: "prepared" | "awaiting_human" | "submitted" | "failed"
  missingFields: string[]
  screenshotPath: string | null
  solariSessionId: string | null
}

export function insertApplication(input: InsertApplicationInput): string {
  const id = crypto.randomUUID()
  db.prepare(
    `INSERT INTO applications
      (id, listing_id, status, missing_fields_json, screenshot_path, solari_session_id, prepared_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.listingId,
    input.status,
    JSON.stringify(input.missingFields),
    input.screenshotPath,
    input.solariSessionId,
    new Date().toISOString(),
  )
  return id
}

export function markSubmitted(applicationId: string): void {
  db.prepare(`UPDATE applications SET status = 'submitted', submitted_at = ? WHERE id = ?`).run(
    new Date().toISOString(),
    applicationId,
  )
}

export function markFailed(applicationId: string, error: string): void {
  db.prepare(`UPDATE applications SET status = 'failed', error = ? WHERE id = ?`).run(error, applicationId)
}

export function getApplication(applicationId: string): any {
  return db.prepare(`SELECT * FROM applications WHERE id = ?`).get(applicationId)
}
