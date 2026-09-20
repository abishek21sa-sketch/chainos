import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { createDatabasePool } from '../db/pool.mjs';
import { createSnapshotStore, workspaceKeyFromName } from '../db/postgres-store.mjs';
import { assertValidSnapshot } from '../db/validate-snapshot.mjs';

const outputPath = process.argv[2];
if (!outputPath) throw new Error('Usage: npm run db:export -- path/to/backup.json');

const fixture = JSON.parse(readFileSync(new URL('../data/fixture.json', import.meta.url), 'utf8'));
const workspaceKey = process.env.CHAINOS_WORKSPACE_KEY || workspaceKeyFromName(fixture.workspace);
const pool = createDatabasePool();
const store = createSnapshotStore(pool, workspaceKey);
try {
  const snapshot = await store.read();
  if (!snapshot) throw new Error(`No saved snapshot found for ${workspaceKey}.`);
  assertValidSnapshot(snapshot);
  const absolutePath = resolve(outputPath);
  writeFileSync(absolutePath, `${JSON.stringify(snapshot, null, 2)}\n`, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
  console.log(`Exported ${snapshot.workspace} snapshot to ${absolutePath}.`);
} finally {
  await store.close();
}
