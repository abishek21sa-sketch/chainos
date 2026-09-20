import assert from 'node:assert/strict';
import { createApiServer } from '../server.mjs';

export async function runApiTests() {
  const allowedOrigin = 'https://chainos.vercel.app';
  let persistedSnapshot = null;
  let databaseAvailable = true;
  const snapshotStore = {
    async ping() { if (!databaseAvailable) throw new Error('database unavailable'); return true; },
    async read() { if (!databaseAvailable) throw new Error('database unavailable'); return persistedSnapshot; }
  };
  const server = createApiServer({ allowedOrigin, snapshotStore, logger: { error() {} } });
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
    assert.deepEqual(await healthResponse.json(), { status: 'ok', service: 'chainos-api', dataSource: 'postgres' });

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

    databaseAvailable = false;
    const unhealthyResponse = await fetch(`${baseUrl}/api/health`);
    assert.equal(unhealthyResponse.status, 503, 'health should fail when configured persistence is unavailable');
    const unavailableResponse = await fetch(`${baseUrl}/api/fixture`);
    assert.equal(unavailableResponse.status, 503, 'data routes should not silently mask a configured database failure');
    assert.deepEqual(await unavailableResponse.json(), { error: 'Data store unavailable' });
  } finally {
    server.closeAllConnections();
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }

  console.log('ChainOS API contract tests passed: health, fixture, summary, persistence selection, CORS, preflight, and error responses.');
}
