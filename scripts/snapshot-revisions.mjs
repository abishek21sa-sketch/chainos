import { createDatabasePool } from '../db/pool.mjs';
import { createSnapshotStore, migrateSnapshotSchema, workspaceKeyFromName } from '../db/postgres-store.mjs';
import { readFileSync } from 'node:fs';

const fixture = JSON.parse(readFileSync(new URL('../data/fixture.json', import.meta.url), 'utf8'));
const workspaceKey = process.env.CHAINOS_WORKSPACE_KEY || workspaceKeyFromName(fixture.workspace);
const pool = createDatabasePool();
const store = createSnapshotStore(pool, workspaceKey);
const [command, revisionArg] = process.argv.slice(2);
try {
  await migrateSnapshotSchema(pool);
  if (command === 'list') {
    const revisions = await store.history(50);
    if (!revisions.length) console.log('No workspace snapshots found.');
    else revisions.forEach((entry) => console.log(`r${entry.revision}\t${entry.updated_at}\t${entry.source}`));
  } else if (command === 'restore') {
    if (!revisionArg) throw new Error('Usage: npm run db:restore -- <revision>');
    const previous = await store.readRevision(revisionArg);
    if (!previous) throw new Error(`Revision ${revisionArg} was not found for ${workspaceKey}.`);
    const restored = await store.write(previous, `restore:${revisionArg}`);
    console.log(`Restored revision ${revisionArg} as new revision ${restored.revision}.`);
  } else {
    throw new Error('Usage: npm run db:history | npm run db:restore -- <revision>');
  }
} finally {
  await store.close();
}
