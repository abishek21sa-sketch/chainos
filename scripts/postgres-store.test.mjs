import assert from 'node:assert/strict';
import { createSnapshotStore, migrateSnapshotSchema, workspaceKeyFromName } from '../db/postgres-store.mjs';

export async function runPostgresStoreTests() {
  const calls = [];
  const pool = {
    async query(sql, values = []) {
      calls.push({ sql, values });
      if (sql.includes('SELECT payload')) return { rows: [{ payload: { workspace: 'Stored' } }] };
      if (sql.includes('SELECT revision, source, updated_at')) return { rows: [{ revision: '3', source: 'seed', updated_at: '2026-09-19T00:00:00Z' }] };
      if (sql.includes('INSERT INTO chainos_workspace_snapshots')) return { rows: [{ revision: 4, updated_at: '2026-09-20T00:00:00Z' }] };
      return { rows: [] };
    },
    async end() { calls.push({ sql: 'END', values: [] }); }
  };

  assert.equal(workspaceKeyFromName('Northstar Mobility'), 'northstar-mobility');
  assert.throws(() => createSnapshotStore(pool, '../unsafe'), /Invalid workspace key/);
  await migrateSnapshotSchema(pool);
  assert.match(calls[0].sql, /CREATE TABLE IF NOT EXISTS chainos_workspace_snapshots/);

  const store = createSnapshotStore(pool, 'northstar-mobility');
  assert.deepEqual(await store.read(), { workspace: 'Stored' });
  assert.deepEqual(await store.history(500), [{ revision: 3, source: 'seed', updated_at: '2026-09-19T00:00:00Z' }]);
  assert.equal(calls.at(-1).values[1], 100, 'history reads should cap their query size');
  assert.deepEqual(await store.readRevision(3), { workspace: 'Stored' });
  await assert.rejects(store.readRevision(-1), /positive integer/);
  await assert.rejects(store.write([]), /must be a JSON object/);
  const written = await store.write({ workspace: 'Northstar Mobility' }, 'test-seed');
  assert.equal(written.revision, 4);
  assert.match(calls.at(-1).sql, /ON CONFLICT \(workspace_key\) DO UPDATE/);
  assert.match(calls.at(-1).sql, /revision = chainos_workspace_snapshots\.revision \+ 1/);
  assert.match(calls.at(-1).sql, /INSERT INTO chainos_workspace_snapshot_history/);
  assert.equal(calls.at(-1).values[0], 'northstar-mobility');
  assert.deepEqual(JSON.parse(calls.at(-1).values[1]), { workspace: 'Northstar Mobility' });
  await store.close();
  assert.equal(calls.at(-1).sql, 'END');

  console.log('ChainOS PostgreSQL store tests passed: workspace keys, schema migration, reads, versioned upserts, and validation.');
}
