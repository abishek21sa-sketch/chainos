import { createDatabasePool } from '../db/pool.mjs';
import { migrateSnapshotSchema } from '../db/postgres-store.mjs';

const pool = createDatabasePool();
try {
  await migrateSnapshotSchema(pool);
  console.log('ChainOS PostgreSQL schema is ready.');
} finally {
  await pool.end();
}
