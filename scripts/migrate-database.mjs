import { createDatabasePool } from '../db/pool.mjs';
import { migrateSnapshotSchema } from '../db/postgres-store.mjs';
import { migrateWorkspaceAccessSchema } from '../db/workspace-access-store.mjs';

const pool = createDatabasePool();
try {
  await migrateSnapshotSchema(pool);
  await migrateWorkspaceAccessSchema(pool);
  console.log('ChainOS PostgreSQL snapshot and workspace-access schemas are ready.');
} finally {
  await pool.end();
}
