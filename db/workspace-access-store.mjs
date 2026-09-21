import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const schemaPath = join(dirname(fileURLToPath(import.meta.url)), '002_workspace_access.sql');

export async function migrateWorkspaceAccessSchema(pool) {
  await pool.query(readFileSync(schemaPath, 'utf8'));
}

export function createWorkspaceMembershipStore(pool, workspaceKey) {
  if (!/^[a-z0-9][a-z0-9-]{0,62}$/.test(workspaceKey)) throw new Error('Invalid workspace key.');
  return {
    async getRole(authUserId) {
      if (typeof authUserId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(authUserId)) return null;
      const result = await pool.query(
        'SELECT role FROM chainos_workspace_memberships WHERE workspace_key = $1 AND auth_user_id = $2',
        [workspaceKey, authUserId]
      );
      return result.rows[0]?.role || null;
    }
  };
}
