import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const schemaPath = join(dirname(fileURLToPath(import.meta.url)), '001_workspace_snapshots.sql');

export function workspaceKeyFromName(name) {
  const key = String(name || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 63);
  if (!key) throw new Error('Workspace name must produce a non-empty key.');
  return key;
}

export async function migrateSnapshotSchema(pool) {
  const schema = readFileSync(schemaPath, 'utf8');
  await pool.query(schema);
}

export function createSnapshotStore(pool, workspaceKey) {
  if (!/^[a-z0-9][a-z0-9-]{0,62}$/.test(workspaceKey)) throw new Error('Invalid workspace key.');
  return {
    async ping() {
      await pool.query('SELECT 1');
      return true;
    },
    async read() {
      const result = await pool.query('SELECT payload FROM chainos_workspace_snapshots WHERE workspace_key = $1', [workspaceKey]);
      return result.rows[0]?.payload || null;
    },
    async history(limit = 10) {
      const safeLimit = Math.min(100, Math.max(1, Number.isInteger(Number(limit)) ? Number(limit) : 10));
      const result = await pool.query(
        'SELECT revision, source, updated_at FROM chainos_workspace_snapshot_history WHERE workspace_key = $1 ORDER BY revision DESC LIMIT $2',
        [workspaceKey, safeLimit]
      );
      return result.rows.map((row) => ({ ...row, revision: Number(row.revision) }));
    },
    async readRevision(revision) {
      const safeRevision = Number(revision);
      if (!Number.isSafeInteger(safeRevision) || safeRevision < 1) throw new Error('Revision must be a positive integer.');
      const result = await pool.query(
        'SELECT payload FROM chainos_workspace_snapshot_history WHERE workspace_key = $1 AND revision = $2',
        [workspaceKey, safeRevision]
      );
      return result.rows[0]?.payload || null;
    },
    async write(payload, source = 'fixture') {
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('Workspace snapshot must be a JSON object.');
      const result = await pool.query(
        `WITH saved AS (
           INSERT INTO chainos_workspace_snapshots (workspace_key, payload, source)
           VALUES ($1, $2::jsonb, $3)
           ON CONFLICT (workspace_key) DO UPDATE
           SET payload = EXCLUDED.payload,
               source = EXCLUDED.source,
               revision = chainos_workspace_snapshots.revision + 1,
               updated_at = NOW()
           RETURNING workspace_key, payload, source, revision, updated_at
         ), archived AS (
           INSERT INTO chainos_workspace_snapshot_history (workspace_key, revision, payload, source, updated_at)
           SELECT workspace_key, revision, payload, source, updated_at FROM saved
           RETURNING revision, updated_at
         )
         SELECT revision, updated_at FROM archived`,
        [workspaceKey, JSON.stringify(payload), String(source).slice(0, 120)]
      );
      return result.rows[0];
    },
    async close() {
      await pool.end();
    }
  };
}
