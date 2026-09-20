import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';

function makeElement(id) {
  return {
    id,
    disabled: false,
    value: '',
    textContent: '',
    innerHTML: '',
    children: [],
    listeners: new Map(),
    addEventListener(type, callback) { this.listeners.set(type, callback); },
    append(child) { this.children.push(child); }
  };
}

function makeStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    values,
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); }
  };
}

function createHarness({
  apiUrl = '',
  healthResponse = { ok: true, status: 200, body: { status: 'ok' } },
  reloadSource = 'ChainOS API',
  withPopover = true
} = {}) {
  const ids = ['sync-popover', 'api-base-url', 'api-connection-status', 'api-connect-button', 'api-disconnect-button'];
  const elements = Object.fromEntries(ids.map((id) => [id, makeElement(id)]));
  const localStorage = makeStorage(apiUrl ? { 'chainos-api-url': apiUrl } : {});
  const sessionStorage = makeStorage({ 'chainos-imported-fixture': '{"workspace":"Imported"}' });
  const calls = [];
  const window = {
    chainosFixtureSource: 'Bundled fixture',
    chainosFixture: { workspace: 'Northstar Mobility' },
    location: { reload() { window.reloaded = true; } },
    async chainosReloadFixture() { window.chainosFixtureSource = reloadSource; }
  };
  const sandbox = {
    document: {
      getElementById(id) { return withPopover || id !== 'sync-popover' ? elements[id] || null : null; },
      createElement() { return makeElement('section'); },
      querySelector() { return null; }
    },
    localStorage,
    sessionStorage,
    window,
    URL,
    fetch: async (url, options) => {
      calls.push({ url, options });
      return { ok: healthResponse.ok, status: healthResponse.status, async json() { return healthResponse.body; } };
    }
  };
  const source = readFileSync(join(process.cwd(), 'api-connection.js'), 'utf8');
  vm.runInNewContext(source, sandbox, { filename: 'api-connection.js' });
  return { elements, localStorage, sessionStorage, window, calls };
}

async function click(element) {
  const handler = element.listeners.get('click');
  assert.equal(typeof handler, 'function', `${element.id} should have a click handler`);
  await handler();
}

export async function runApiConnectionTests() {
  const invalid = createHarness();
  invalid.elements['api-base-url'].value = 'http://example.com';
  await click(invalid.elements['api-connect-button']);
  assert.match(invalid.elements['api-connection-status'].textContent, /HTTPS service origin/);
  assert.equal(invalid.calls.length, 0, 'insecure non-local URLs must be rejected before any request');

  const malformed = createHarness();
  malformed.elements['api-base-url'].value = 'not a URL';
  await click(malformed.elements['api-connect-button']);
  assert.match(malformed.elements['api-connection-status'].textContent, /valid API base URL/);
  assert.equal(malformed.calls.length, 0);

  const failedHealth = createHarness({ healthResponse: { ok: false, status: 503, body: { status: 'error' } } });
  failedHealth.elements['api-base-url'].value = 'https://api.example.com';
  await click(failedHealth.elements['api-connect-button']);
  assert.equal(failedHealth.elements['api-connection-status'].textContent, 'Health check returned 503.');
  assert.equal(failedHealth.localStorage.getItem('chainos-api-url'), null, 'failed health checks must not save a connection');
  assert.equal(failedHealth.elements['api-connect-button'].disabled, false, 'connect button must be re-enabled after failure');

  const connected = createHarness();
  connected.elements['api-base-url'].value = 'https://api.example.com/';
  await click(connected.elements['api-connect-button']);
  assert.equal(connected.calls[0].url, 'https://api.example.com/api/health');
  assert.equal(connected.localStorage.getItem('chainos-api-url'), 'https://api.example.com');
  assert.equal(connected.sessionStorage.getItem('chainos-imported-fixture'), null, 'connecting should clear a conflicting session import');
  assert.equal(connected.elements['api-connection-status'].textContent, 'Connected · Northstar Mobility.');
  assert.equal(connected.elements['api-connect-button'].disabled, false);

  const fallback = createHarness({ reloadSource: 'Bundled fixture' });
  fallback.elements['api-base-url'].value = 'https://api.example.com';
  await click(fallback.elements['api-connect-button']);
  assert.match(fallback.elements['api-connection-status'].textContent, /bundled fixture fallback/);

  await click(connected.elements['api-disconnect-button']);
  assert.equal(connected.localStorage.getItem('chainos-api-url'), null);
  assert.equal(connected.sessionStorage.getItem('chainos-imported-fixture'), null);
  assert.equal(connected.window.reloaded, true);

  console.log('ChainOS API connection tests passed: URL safety, health checks, connection persistence, fallback, and disconnect.');
}
