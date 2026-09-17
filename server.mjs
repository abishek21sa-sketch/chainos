import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(readFileSync(join(root, 'data', 'fixture.json'), 'utf8'));
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || '0.0.0.0';
const allowedOrigin = process.env.CHAINOS_ALLOWED_ORIGIN || '*';

function sendJson(response, status, payload) {
  response.writeHead(status, {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8'
  });
  response.end(JSON.stringify(payload));
}

const server = createServer((request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
  if (request.method === 'OPTIONS') return sendJson(response, 204, {});
  if (request.method !== 'GET') return sendJson(response, 405, { error: 'Method not allowed' });
  if (url.pathname === '/api/health') return sendJson(response, 200, { status: 'ok', service: 'chainos-api' });
  if (url.pathname === '/api/fixture') return sendJson(response, 200, fixture);
  return sendJson(response, 404, { error: 'Not found' });
});

server.listen(port, host, () => {
  console.log(`ChainOS API listening on ${host}:${port}`);
});
