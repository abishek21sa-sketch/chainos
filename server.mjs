import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const root = dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(readFileSync(join(root, 'data', 'fixture.json'), 'utf8'));
function summarizeFixture(data) {
  const asOf = data.asOf ? new Date(data.asOf) : null;
  const planningDate = asOf && !Number.isNaN(asOf.getTime()) ? asOf.toISOString().slice(0, 10) : null;
  const signalCollections = ['suppliers', 'purchaseOrders', 'shipments', 'shortages', 'constraints', 'plannerActions'];
  const signalCount = Number(data.signalsEvaluated) || signalCollections.reduce((total, key) => total + (Array.isArray(data[key]) ? data[key].length : 0), 0);
  const lateShipments = (data.shipments || []).filter((shipment) => shipment.status === 'late').length;
  const exposureHours = (data.shortages || []).reduce((total, shortage) => total + (Number(shortage.affectedHours) || 0), 0);
  const coverSamples = (data.inventoryPositions || []).map((position) => {
    const demand = (data.demandSignals || []).find((signal) => signal.plantId === position.plantId && signal.partId === position.partId);
    if (!demand || !Number.isFinite(Number(demand.quantity))) return null;
    const [start, end] = String(demand.period || '').split('/').map((value) => new Date(value));
    const periodDays = start && end && !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) ? Math.max(1, Math.round((end - start) / 86400000) + 1) : 1;
    const dailyDemand = Number(demand.quantity) / periodDays;
    const available = Number(position.onHand) - Number(position.allocated || 0);
    return dailyDemand > 0 ? available / dailyDemand : null;
  }).filter((value) => Number.isFinite(value));
  const networkCoverDays = Number(data.networkCoverDays) || (coverSamples.length ? coverSamples.reduce((total, value) => total + value, 0) / coverSamples.length : null);
  return {
    workspace: data.workspace || 'Planning workspace',
    asOf: data.asOf || null,
    counts: {
      parts: data.parts?.length || 0,
      suppliers: data.suppliers?.length || 0,
      purchaseOrders: data.purchaseOrders?.length || 0,
      shipments: data.shipments?.length || 0,
      plants: data.plants?.length || 0,
      shortages: data.shortages?.length || 0,
      constraints: data.constraints?.length || 0
    },
    metrics: {
      signalCount,
      shipmentsToday: (data.shipments || []).filter((shipment) => shipment.eta?.slice(0, 10) === planningDate).length,
      openCommitments: (data.purchaseOrders || []).filter((order) => !['closed', 'received', 'cancelled'].includes(order.status)).length,
      exposureHours: Number(exposureHours.toFixed(1)),
      lateShipments,
      networkCoverDays: Number.isFinite(networkCoverDays) ? Number(networkCoverDays.toFixed(1)) : null
    },
    queue: { all: (data.shortages || []).length + lateShipments, critical: (data.shortages || []).length, inbound: lateShipments }
  };
}

function sendJson(response, status, payload, allowedOrigin) {
  response.writeHead(status, {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8'
  });
  response.end(JSON.stringify(payload));
}

export function createApiServer({ data = fixture, allowedOrigin = process.env.CHAINOS_ALLOWED_ORIGIN || '*' } = {}) {
  const summary = summarizeFixture(data);
  return createServer((request, response) => {
    const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
    if (request.method === 'OPTIONS') return sendJson(response, 204, {}, allowedOrigin);
    if (request.method !== 'GET') return sendJson(response, 405, { error: 'Method not allowed' }, allowedOrigin);
    if (url.pathname === '/api/health') return sendJson(response, 200, { status: 'ok', service: 'chainos-api' }, allowedOrigin);
    if (url.pathname === '/api/fixture') return sendJson(response, 200, data, allowedOrigin);
    if (url.pathname === '/api/summary') return sendJson(response, 200, summary, allowedOrigin);
    return sendJson(response, 404, { error: 'Not found' }, allowedOrigin);
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const port = Number(process.env.PORT || 4173);
  const host = process.env.HOST || '0.0.0.0';
  createApiServer().listen(port, host, () => {
    console.log(`ChainOS API listening on ${host}:${port}`);
  });
}
