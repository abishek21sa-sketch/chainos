import { createDatabasePool } from '../db/pool.mjs';
import { createWorkspaceMembershipStore } from '../db/workspace-access-store.mjs';

const [authUserId, requestedRole = 'planner'] = process.argv.slice(2);
const workspaceKey = process.env.CHAINOS_WORKSPACE_KEY || '';
const role = requestedRole.toLowerCase();
if (!workspaceKey) throw new Error('Set CHAINOS_WORKSPACE_KEY before granting membership.');
if (!authUserId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(authUserId)) {
  throw new Error('Usage: npm run db:grant-member -- <Supabase-auth-user-UUID> [owner|planner|viewer]');
}
if (!['owner', 'planner', 'viewer'].includes(role)) throw new Error('Role must be owner, planner, or viewer.');

const pool = createDatabasePool();
try {
  const membershipStore = createWorkspaceMembershipStore(pool, workspaceKey);
  await pool.query(
    `INSERT INTO chainos_workspace_memberships (workspace_key, auth_user_id, role)
     VALUES ($1, $2, $3)
     ON CONFLICT (workspace_key, auth_user_id) DO UPDATE SET role = EXCLUDED.role`,
    [workspaceKey, authUserId, role]
  );
  if (await membershipStore.getRole(authUserId) !== role) throw new Error('Membership write could not be verified.');
  console.log(`Granted ${role} access to ${workspaceKey}.`);
} finally {
  await pool.end();
}
