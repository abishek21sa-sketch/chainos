import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { createDatabasePool } from './db/pool.mjs';
import { createSnapshotStore, migrateSnapshotSchema, workspaceKeyFromName } from './db/postgres-store.mjs';

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
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8'
  });
  response.end(JSON.stringify(payload));
}

export function createSupabaseAuthVerifier({ supabaseUrl, anonKey, fetchImpl = fetch }) {
  if (!supabaseUrl || !anonKey) throw new Error('Supabase URL and anon/publishable key are required.');
  const parsedUrl = new URL(supabaseUrl);
  const localDevelopment = ['localhost', '127.0.0.1'].includes(parsedUrl.hostname);
  if (parsedUrl.protocol !== 'https:' && !(localDevelopment && parsedUrl.protocol === 'http:')) {
    throw new Error('SUPABASE_URL must use HTTPS (HTTP is allowed only for localhost).');
  }
  const baseUrl = parsedUrl.origin;

  return async function verifySupabaseAccessToken(accessToken) {
    if (typeof accessToken !== 'string' || !accessToken || accessToken.length > 8192) return null;
    let response;
    try {
      response = await fetchImpl(`${baseUrl}/auth/v1/user`, {
        headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(5000)
      });
    } catch {
      const error = new Error('Supabase Auth is temporarily unavailable.');
      error.statusCode = 503;
      throw error;
    }
    if (response.status === 401 || response.status === 403) return null;
    if (!response.ok) {
      const error = new Error('Supabase Auth could not verify the session.');
      error.statusCode = 503;
      throw error;
    }
    const user = await response.json();
    return typeof user?.id === 'string' ? { id: user.id, email: typeof user.email === 'string' ? user.email : null } : null;
  };
}

export function createApiServer({
  data = fixture,
  allowedOrigin = process.env.CHAINOS_ALLOWED_ORIGIN || '*',
  snapshotStore = null,
  membershipStore = null,
  authVerifier = null,
  supabaseConfig = null,
  enforceMembership = Boolean(snapshotStore),
  logger = console
} = {}) {
  const authEnabled = Boolean(supabaseConfig?.url && supabaseConfig?.anonKey && authVerifier);

  async function authenticate(request, response) {
    if (!authVerifier) {
      sendJson(response, 503, { error: 'Supabase Auth is not configured.' }, allowedOrigin);
      return null;
    }
    const authorization = request.headers.authorization || '';
    const match = /^Bearer\s+(.+)$/i.exec(authorization);
    if (!match || match[1].length > 8192) {
      sendJson(response, 401, { error: 'A valid Supabase session is required.' }, allowedOrigin);
      return null;
    }
    try {
      const user = await authVerifier(match[1]);
      if (!user?.id) {
        sendJson(response, 401, { error: 'A valid Supabase session is required.' }, allowedOrigin);
        return null;
      }
      return user;
    } catch (error) {
      sendJson(response, error.statusCode || 503, { error: error.statusCode === 503 ? error.message : 'Authentication service unavailable.' }, allowedOrigin);
      return null;
    }
  }

  async function requireWorkspaceMember(request, response) {
    if (!enforceMembership) return true;
    const user = await authenticate(request, response);
    if (!user) return false;
    if (!membershipStore) {
      sendJson(response, 503, { error: 'Workspace access control is not ready.' }, allowedOrigin);
      return false;
    }
    try {
      const role = await membershipStore.getRole(user.id);
      if (!role) {
        sendJson(response, 403, { error: 'Your account does not have access to this workspace.' }, allowedOrigin);
        return false;
      }
      return true;
    } catch {
      sendJson(response, 503, { error: 'Workspace access could not be checked.' }, allowedOrigin);
      return false;
    }
  }

  return createServer(async (request, response) => {
    const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
    if (request.method === 'OPTIONS') return sendJson(response, 204, {}, allowedOrigin);
    if (request.method !== 'GET') return sendJson(response, 405, { error: 'Method not allowed' }, allowedOrigin);
    if (url.pathname === '/api/health') {
      try {
        if (snapshotStore) await snapshotStore.ping();
        return sendJson(response, 200, { status: 'ok', service: 'chainos-api', dataSource: snapshotStore ? 'postgres' : 'fixture', authEnabled, accessControlEnabled: enforceMembership }, allowedOrigin);
      } catch {
        return sendJson(response, 503, { status: 'error', service: 'chainos-api', dataSource: 'postgres' }, allowedOrigin);
      }
    }
    if (url.pathname === '/api/auth/config') {
      return sendJson(response, 200, {
        enabled: authEnabled,
        supabaseUrl: authEnabled ? supabaseConfig.url : null,
        anonKey: authEnabled ? supabaseConfig.anonKey : null,
        workspaceKey: supabaseConfig?.workspaceKey || null,
        accessControlEnabled: enforceMembership
      }, allowedOrigin);
    }
    if (url.pathname === '/api/auth/me') {
      const user = await authenticate(request, response);
      if (!user) return;
      try {
        const role = membershipStore ? await membershipStore.getRole(user.id) : null;
        return sendJson(response, 200, { user, role, accessControlEnabled: enforceMembership }, allowedOrigin);
      } catch {
        return sendJson(response, 503, { error: 'Workspace access could not be checked.' }, allowedOrigin);
      }
    }
    if (url.pathname === '/api/fixture' || url.pathname === '/api/summary') {
      if (!await requireWorkspaceMember(request, response)) return;
      try {
        const currentData = snapshotStore ? (await snapshotStore.read()) || data : data;
        const payload = url.pathname === '/api/fixture' ? currentData : summarizeFixture(currentData);
        return sendJson(response, 200, payload, allowedOrigin);
      } catch (error) {
        logger.error('ChainOS data store request failed:', error.message);
        return sendJson(response, 503, { error: 'Data store unavailable' }, allowedOrigin);
      }
    }
    return sendJson(response, 404, { error: 'Not found' }, allowedOrigin);
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const port = Number(process.env.PORT || 4173);
  const host = process.env.HOST || '0.0.0.0';
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseAnonKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || '';
  if (Boolean(supabaseUrl) !== Boolean(supabaseAnonKey)) {
    console.error('ChainOS API startup failed: configure both SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY (legacy SUPABASE_ANON_KEY is also accepted).');
    process.exitCode = 1;
  }
  if (process.exitCode) process.exit();
  let snapshotStore = null;
  let membershipStore = null;
  try {
    if (process.env.DATABASE_URL) {
      const pool = createDatabasePool();
      snapshotStore = createSnapshotStore(pool, process.env.CHAINOS_WORKSPACE_KEY || workspaceKeyFromName(fixture.workspace));
      await migrateSnapshotSchema(pool);
      if (!await snapshotStore.read()) await snapshotStore.write(fixture, 'bootstrap-fixture');
      const { createWorkspaceMembershipStore, migrateWorkspaceAccessSchema } = await import('./db/workspace-access-store.mjs');
      const workspaceKey = process.env.CHAINOS_WORKSPACE_KEY || workspaceKeyFromName(fixture.workspace);
      await migrateWorkspaceAccessSchema(pool);
      membershipStore = createWorkspaceMembershipStore(pool, workspaceKey);
    }
    const supabaseConfig = supabaseUrl && supabaseAnonKey ? {
      url: supabaseUrl,
      anonKey: supabaseAnonKey,
      workspaceKey: process.env.CHAINOS_WORKSPACE_KEY || workspaceKeyFromName(fixture.workspace)
    } : null;
    const authVerifier = supabaseConfig ? createSupabaseAuthVerifier({ supabaseUrl: supabaseConfig.url, anonKey: supabaseConfig.anonKey }) : null;
    if (snapshotStore && !authVerifier) console.warn('Persisted workspace reads are locked until Supabase Auth is configured.');
    const server = createApiServer({ snapshotStore, membershipStore, authVerifier, supabaseConfig });
    server.listen(port, host, () => console.log(`ChainOS API listening on ${host}:${port} (${snapshotStore ? 'postgres' : 'fixture'} data)`));
    const shutdown = async () => {
      await new Promise((resolveShutdown, rejectShutdown) => server.close((error) => error ? rejectShutdown(error) : resolveShutdown()));
      await snapshotStore?.close();
    };
    process.once('SIGTERM', () => { void shutdown(); });
    process.once('SIGINT', () => { void shutdown(); });
  } catch (error) {
    console.error(`ChainOS API startup failed: ${error.message}`);
    await snapshotStore?.close();
    process.exitCode = 1;
  }
}
