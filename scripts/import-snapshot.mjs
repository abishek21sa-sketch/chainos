import { readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { assertValidSnapshot } from '../db/validate-snapshot.mjs';
import { createDatabasePool } from '../db/pool.mjs';
import { createSnapshotStore, migrateSnapshotSchema, workspaceKeyFromName } from '../db/postgres-store.mjs';

const inputPath = process.argv[2];
if (!inputPath) throw new Error('Usage: npm run db:import -- path/to/snapshot.json');
const resolvedPath = resolve(inputPath);
let snapshot;
try {
  snapshot = JSON.parse(readFileSync(resolvedPath, 'utf8'));
} catch (error) {
  throw new Error(`Could not read a valid JSON snapshot: ${error.message}`);
}
assertValidSnapshot(snapshot);

const pool = createDatabasePool();
const workspaceKey = process.env.CHAINOS_WORKSPACE_KEY || workspaceKeyFromName(snapshot.workspace);
const store = createSnapshotStore(pool, workspaceKey);
try {
  await migrateSnapshotSchema(pool);
  const result = await store.write(snapshot, `import:${basename(resolvedPath)}`);
  console.log(`Imported ${snapshot.workspace} at revision ${result.revision}.`);
} finally {
  await store.close();
}
