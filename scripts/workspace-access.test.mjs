import assert from 'node:assert/strict';
import { createWorkspaceMembershipStore, migrateWorkspaceAccessSchema } from '../db/workspace-access-store.mjs';

export async function runWorkspaceAccessTests() {
  const calls = [];
  const pool = {
    async query(sql, values = []) {
      calls.push({ sql, values });
      if (sql.includes('SELECT role')) return { rows: [{ role: 'planner' }] };
      return { rows: [] };
    }
  };
  await migrateWorkspaceAccessSchema(pool);
  assert.match(calls[0].sql, /REFERENCES auth\.users\(id\)/);
  assert.match(calls[0].sql, /ENABLE ROW LEVEL SECURITY/);
  assert.match(calls[0].sql, /REVOKE ALL/);

  const memberships = createWorkspaceMembershipStore(pool, 'northstar-mobility');
  assert.equal(await memberships.getRole('9a7b651c-83d1-4ef5-91e8-2a54de8fb05d'), 'planner');
  assert.deepEqual(calls.at(-1).values, ['northstar-mobility', '9a7b651c-83d1-4ef5-91e8-2a54de8fb05d']);
  const countBeforeInvalid = calls.length;
  assert.equal(await memberships.getRole('not-a-uuid'), null);
  assert.equal(calls.length, countBeforeInvalid, 'invalid identity values should not reach SQL');
  assert.throws(() => createWorkspaceMembershipStore(pool, '../unsafe'), /Invalid workspace key/);
  console.log('ChainOS workspace access tests passed: membership schema, role lookup, and input validation.');
}
