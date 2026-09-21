CREATE TABLE IF NOT EXISTS chainos_workspace_memberships (
  workspace_key TEXT NOT NULL REFERENCES chainos_workspace_snapshots(workspace_key) ON DELETE CASCADE,
  auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'planner', 'viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (workspace_key, auth_user_id)
);

ALTER TABLE chainos_workspace_memberships ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE chainos_workspace_memberships FROM anon, authenticated;
