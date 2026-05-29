CREATE TABLE IF NOT EXISTS counter_events (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  event_type TEXT NOT NULL CHECK (event_type IN ('visit', 'play')),
  country_code TEXT NOT NULL DEFAULT 'XX',
  mode TEXT CHECK (mode IS NULL OR mode IN ('over')),
  outcome TEXT CHECK (outcome IS NULL OR outcome IN ('win', 'draw')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_counter_events_event_type
  ON counter_events (event_type);

CREATE INDEX IF NOT EXISTS idx_counter_events_country_code
  ON counter_events (country_code);

CREATE INDEX IF NOT EXISTS idx_counter_events_created_at
  ON counter_events (created_at);

CREATE INDEX IF NOT EXISTS idx_counter_events_event_created
  ON counter_events (event_type, created_at);

CREATE INDEX IF NOT EXISTS idx_counter_events_event_country
  ON counter_events (event_type, country_code);
