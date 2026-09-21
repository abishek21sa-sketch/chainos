import assert from 'node:assert/strict';
import { createApiServer, createSupabaseAuthVerifier } from '../server.mjs';

export async function runApiTests() {
  const allowedOrigin = 'https://chainos.vercel.app';
  let persistedSnapshot = null;
  let databaseAvailable = true;
  let protectedServer = null;
  let lockedServer = null;
  const snapshotStore = {
    async ping() { if (!databaseAvailable) throw new Error('database unavailable'); return true; },
    async read() { if (!databaseAvailable) throw new Error('database unavailable'); return persistedSnapshot; }
  };
  const server = createApiServer({ allowedOrigin, snapshotStore, enforceMembership: false, logger: { error() {} } });
  server.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    const healthResponse = await fetch(`${baseUrl}/api/health`);
    assert.equal(healthResponse.status, 200, 'health route should succeed');
    assert.equal(healthResponse.headers.get('access-control-allow-origin'), allowedOrigin, 'CORS should use configured origin');
    assert.deepEqual(await healthResponse.json(), { status: 'ok', service: 'chainos-api', dataSource: 'postgres', authEnabled: false, accessControlEnabled: false });

    const authConfigResponse = await fetch(`${baseUrl}/api/auth/config`);
    assert.deepEqual(await authConfigResponse.json(), { enabled: false, supabaseUrl: null, anonKey: null, workspaceKey: null, accessControlEnabled: false });

    const fixtureResponse = await fetch(`${baseUrl}/api/fixture`);
    const fixture = await fixtureResponse.json();
    assert.equal(fixtureResponse.status, 200, 'fixture route should succeed');
    assert.equal(fixture.suppliers.length, 3, 'fixture route should return supplier data');
    assert.equal(fixture.purchaseOrders.length, 2, 'fixture route should return PO data');

    const summaryResponse = await fetch(`${baseUrl}/api/summary`);
    const summary = await summaryResponse.json();
    assert.equal(summaryResponse.status, 200, 'summary route should succeed');
    assert.equal(summary.workspace, fixture.workspace);
    assert.equal(summary.counts.suppliers, 3);
    assert.equal(summary.metrics.exposureHours, 18.4);
    assert.equal(summary.metrics.lateShipments, 1);
    assert.equal(summary.queue.all, 2);

    const optionsResponse = await fetch(`${baseUrl}/api/fixture`, { method: 'OPTIONS' });
    assert.equal(optionsResponse.status, 204, 'preflight should return no content');
    assert.equal(optionsResponse.headers.get('access-control-allow-methods'), 'GET, OPTIONS');

    const methodResponse = await fetch(`${baseUrl}/api/fixture`, { method: 'POST' });
    assert.equal(methodResponse.status, 405, 'unsupported methods should be rejected');
    assert.deepEqual(await methodResponse.json(), { error: 'Method not allowed' });

    const missingResponse = await fetch(`${baseUrl}/api/missing`);
    assert.equal(missingResponse.status, 404, 'unknown routes should return not found');
    assert.deepEqual(await missingResponse.json(), { error: 'Not found' });

    persistedSnapshot = { workspace: 'Persisted Workspace', suppliers: [{ id: 'SUP-1', name: 'Stored Supplier' }], purchaseOrders: [], shipments: [], plants: [], parts: [], shortages: [], constraints: [], plannerActions: [] };
    const persistedResponse = await fetch(`${baseUrl}/api/fixture`);
    assert.equal((await persistedResponse.json()).workspace, 'Persisted Workspace', 'API should prefer a stored snapshot over the bundled fixture');
    const persistedSummaryResponse = await fetch(`${baseUrl}/api/summary`);
    assert.equal((await persistedSummaryResponse.json()).counts.suppliers, 1, 'summary should be computed from the stored snapshot');

    const verifier = createSupabaseAuthVerifier({
      supabaseUrl: 'https://project.supabase.co',
      anonKey: 'public-anon-key',
      fetchImpl: async (url, options) => {
        assert.equal(url, 'https://project.supabase.co/auth/v1/user');
        assert.equal(options.headers.apikey, 'public-anon-key');
        assert.equal(options.headers.Authorization, 'Bearer valid-token');
        return { ok: true, status: 200, async json() { return { id: 'member-1', email: 'planner@example.com' }; } };
      }
    });
    assert.deepEqual(await verifier('valid-token'), { id: 'member-1', email: 'planner@example.com' });
    assert.equal(await verifier(''), null, 'empty access tokens should not be sent to Supabase');
    assert.throws(() => createSupabaseAuthVerifier({ supabaseUrl: 'http://example.com', anonKey: 'key' }), /HTTPS/);

    protectedServer = createApiServer({
      allowedOrigin,
      snapshotStore,
      authVerifier: async (token) => token === 'member-token' ? { id: 'member-1', email: 'planner@example.com' } : token === 'outsider-token' ? { id: 'outsider-1', email: 'outsider@example.com' } : null,
      membershipStore: { async getRole(userId) { return userId === 'member-1' ? 'planner' : null; } },
      supabaseConfig: { url: 'https://project.supabase.co', anonKey: 'public-anon-key', workspaceKey: 'northstar-mobility' },
      logger: { error() {} }
    });
    protectedServer.listen(0, '127.0.0.1');
    await new Promise((resolve, reject) => {
      protectedServer.once('listening', resolve);
      protectedServer.once('error', reject);
    });
    const protectedBaseUrl = `http://127.0.0.1:${protectedServer.address().port}`;
    const protectedConfig = await (await fetch(`${protectedBaseUrl}/api/auth/config`)).json();
    assert.equal(protectedConfig.enabled, true);
    assert.equal(protectedConfig.anonKey, 'public-anon-key');
    assert.equal(protectedConfig.accessControlEnabled, true);
    const anonymousRead = await fetch(`${protectedBaseUrl}/api/fixture`);
    assert.equal(anonymousRead.status, 401, 'private snapshots should require a verified session');
    const nonmemberRead = await fetch(`${protectedBaseUrl}/api/fixture`, { headers: { Authorization: 'Bearer outsider-token' } });
    assert.equal(nonmemberRead.status, 403, 'authenticated users without workspace membership must be denied');
    const memberRead = await fetch(`${protectedBaseUrl}/api/fixture`, { headers: { Authorization: 'Bearer member-token' } });
    assert.equal(memberRead.status, 200, 'workspace members should read the snapshot');
    assert.equal((await memberRead.json()).workspace, 'Persisted Workspace');
    const ownIdentity = await fetch(`${protectedBaseUrl}/api/auth/me`, { headers: { Authorization: 'Bearer member-token' } });
    assert.equal((await ownIdentity.json()).role, 'planner');
    assert.equal((await fetch(`${protectedBaseUrl}/api/fixture`, { headers: { Authorization: 'Bearer invalid-token' } })).status, 401);

    lockedServer = createApiServer({ allowedOrigin, snapshotStore, logger: { error() {} } });
    lockedServer.listen(0, '127.0.0.1');
    await new Promise((resolve, reject) => {
      lockedServer.once('listening', resolve);
      lockedServer.once('error', reject);
    });
    const lockedResponse = await fetch(`http://127.0.0.1:${lockedServer.address().port}/api/fixture`);
    assert.equal(lockedResponse.status, 503, 'a Postgres workspace without Supabase configuration must fail closed');

    databaseAvailable = false;
    const unhealthyResponse = await fetch(`${baseUrl}/api/health`);
    assert.equal(unhealthyResponse.status, 503, 'health should fail when configured persistence is unavailable');
    const unavailableResponse = await fetch(`${baseUrl}/api/fixture`);
    assert.equal(unavailableResponse.status, 503, 'data routes should not silently mask a configured database failure');
    assert.deepEqual(await unavailableResponse.json(), { error: 'Data store unavailable' });
  } finally {
    server.closeAllConnections();
    protectedServer?.closeAllConnections();
    lockedServer?.closeAllConnections();
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    if (protectedServer) await new Promise((resolve, reject) => protectedServer.close((error) => error ? reject(error) : resolve()));
    if (lockedServer) await new Promise((resolve, reject) => lockedServer.close((error) => error ? reject(error) : resolve()));
  }

  console.log('ChainOS API contract tests passed: health, demo and protected reads, verified membership, summary, CORS, preflight, and error responses.');
}
