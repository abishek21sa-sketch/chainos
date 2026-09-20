import { readFileSync } from 'node:fs';
import { createDatabasePool } from '../db/pool.mjs';
import { createSnapshotStore, migrateSnapshotSchema, workspaceKeyFromName } from '../db/postgres-store.mjs';

const fixture = JSON.parse(readFileSync(new URL('../data/fixture.json', import.meta.url), 'utf8'));
const pool = createDatabasePool();
const store = createSnapshotStore(pool, process.env.CHAINOS_WORKSPACE_KEY || workspaceKeyFromName(fixture.workspace));
try {
  await migrateSnapshotSchema(pool);
  const result = await store.write(fixture, 'seed-fixture');
  console.log(`Seeded ${fixture.workspace} at revision ${result.revision}.`);
} finally {
  await store.close();
}
