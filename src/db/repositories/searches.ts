import crypto from "node:crypto"
import { db } from "../client.ts"
import type { SearchCriteria } from "../../preferences/types.ts"

export interface SearchRow {
  id: string
  rawQuery: string
  criteria: SearchCriteria
  status: string
  createdAt: string
}

function rowToSearch(row: any): SearchRow {
  return {
    id: row.id,
    rawQuery: row.raw_query,
    criteria: JSON.parse(row.criteria_json),
    status: row.status,
    createdAt: row.created_at,
  }
}

export function insertSearch(rawQuery: string, criteria: SearchCriteria): SearchRow {
  const id = crypto.randomUUID()
  const createdAt = new Date().toISOString()
  db.prepare(
    `INSERT INTO searches (id, raw_query, criteria_json, status, created_at) VALUES (?, ?, ?, 'active', ?)`,
  ).run(id, rawQuery, JSON.stringify(criteria), createdAt)
  return { id, rawQuery, criteria, status: "active", createdAt }
}

export function listActiveSearches(): SearchRow[] {
  const rows = db.prepare(`SELECT * FROM searches WHERE status = 'active'`).all()
  return rows.map(rowToSearch)
}

export function getLatestSearch(): SearchRow | null {
  const row = db.prepare(`SELECT * FROM searches ORDER BY created_at DESC LIMIT 1`).get()
  return row ? rowToSearch(row) : null
}
