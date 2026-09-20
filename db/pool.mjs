import pg from 'pg';

export function createDatabasePool(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) throw new Error('DATABASE_URL is required for PostgreSQL operations.');
  return new pg.Pool({
    connectionString,
    max: Number(process.env.PG_POOL_MAX) || 5,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000
  });
}
