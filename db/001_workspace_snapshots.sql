CREATE TABLE IF NOT EXISTS chainos_workspace_snapshots (
  workspace_key TEXT PRIMARY KEY,
  payload JSONB NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  source TEXT NOT NULL DEFAULT 'fixture',
  revision BIGINT NOT NULL DEFAULT 1 CHECK (revision > 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS chainos_workspace_snapshots_updated_at_idx
  ON chainos_workspace_snapshots (updated_at DESC);

CREATE TABLE IF NOT EXISTS chainos_workspace_snapshot_history (
  workspace_key TEXT NOT NULL REFERENCES chainos_workspace_snapshots (workspace_key),
  revision BIGINT NOT NULL CHECK (revision > 0),
  payload JSONB NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  source TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (workspace_key, revision)
);

INSERT INTO chainos_workspace_snapshot_history (workspace_key, revision, payload, source, updated_at)
SELECT workspace_key, revision, payload, source, updated_at
FROM chainos_workspace_snapshots
ON CONFLICT (workspace_key, revision) DO NOTHING;
