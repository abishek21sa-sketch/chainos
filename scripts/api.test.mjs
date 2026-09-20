import assert from 'node:assert/strict';
import { createApiServer } from '../server.mjs';

export async function runApiTests() {
  const allowedOrigin = 'https://chainos.vercel.app';
  const server = createApiServer({ allowedOrigin });
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
    assert.deepEqual(await healthResponse.json(), { status: 'ok', service: 'chainos-api' });

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
  } finally {
    server.closeAllConnections();
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }

  console.log('ChainOS API contract tests passed: health, fixture, summary, CORS, preflight, and error responses.');
}
