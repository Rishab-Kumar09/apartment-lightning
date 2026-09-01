-- One row per parsed user request (a "watch" session).
CREATE TABLE IF NOT EXISTS searches (
  id TEXT PRIMARY KEY,
  raw_query TEXT NOT NULL,
  criteria_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active', -- active | paused
  created_at TEXT NOT NULL
);

-- Dedupe/diff anchor for the poller: one row per listing ever seen per source.
CREATE TABLE IF NOT EXISTS seen_listings (
  id TEXT PRIMARY KEY, -- adapter-namespaced, e.g. "fixture:complex-x:12345"
  source_adapter TEXT NOT NULL,
  source_url TEXT NOT NULL,
  first_seen_at TEXT NOT NULL,
  raw_json TEXT
);

-- Extracted + scored data, one row per (seen_listing, search) pairing.
CREATE TABLE IF NOT EXISTS listings (
  id TEXT PRIMARY KEY,
  seen_listing_id TEXT NOT NULL REFERENCES seen_listings(id),
  search_id TEXT NOT NULL REFERENCES searches(id),
  price INTEGER,
  beds INTEGER,
  baths REAL,
  distance_minutes INTEGER,
  amenities_json TEXT,
  has_online_application INTEGER NOT NULL DEFAULT 0,
  apply_url TEXT,
  score REAL,
  accepted INTEGER NOT NULL,
  reasons_json TEXT,
  detected_at TEXT NOT NULL
);

-- SAFE fields only. No SSN / income-document / paystub columns exist here —
-- this is a schema-level guarantee, not just application-logic discipline.
-- Sensitive values are collected just-in-time at approval and never reach
-- this table (see src/application/fieldPolicy.ts).
CREATE TABLE IF NOT EXISTS applicant_profile (
  id TEXT PRIMARY KEY,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  current_address TEXT,
  employer TEXT,
  monthly_income_range TEXT, -- coarse bucket only, e.g. "4000-5000", never exact paystub data
  desired_move_in_date TEXT,
  solari_profile_id TEXT,
  updated_at TEXT NOT NULL
);

-- One row per prepared/submitted application attempt.
CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY,
  listing_id TEXT NOT NULL REFERENCES listings(id),
  status TEXT NOT NULL, -- prepared | awaiting_human | submitted | failed
  missing_fields_json TEXT, -- field names/labels only, never values
  screenshot_path TEXT,
  solari_session_id TEXT,
  prepared_at TEXT,
  submitted_at TEXT,
  error TEXT
);
