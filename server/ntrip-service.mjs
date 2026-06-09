/**
 * ZINGSA NTRIP Monitoring Service
 * ────────────────────────────────
 * Runs on port 3001 (configurable via NTRIP_SERVICE_PORT).
 * Provides:
 *   REST  GET /api/ntrip/status|mountpoints|stations|stream-health|alerts
 *   WS    /ws/ntrip/live  — push updates every NTRIP_PUSH_INTERVAL_MS
 *
 * SECURITY: credentials never leave this process.
 * MONITORING ONLY: no corrections are forwarded to rovers.
 *
 * Start:  node server/ntrip-service.mjs
 */

import http        from 'node:http';
import { WebSocketServer } from 'ws';
import { store }   from './store/index.mjs';
import { NtripCasterClient } from './ntrip/client.mjs';
import { evaluateMountpoint, alertCasterDown, clearCasterDown, alertAuthFailed } from './alerts/engine.mjs';

// ── Config from environment ────────────────────────────────────
const HOST     = process.env.NTRIP_HOST     || '';
const PORT     = parseInt(process.env.NTRIP_PORT || '2101');
const USER     = process.env.NTRIP_USERNAME  || '';
const PASS     = process.env.NTRIP_PASSWORD  || '';
const USE_TLS  = process.env.NTRIP_TLS === 'true';
const SVC_PORT = parseInt(process.env.NTRIP_SERVICE_PORT || '3001');
const PUSH_MS  = parseInt(process.env.NTRIP_PUSH_INTERVAL_MS || '5000');
const MAX_CONN = parseInt(process.env.NTRIP_MAX_CONNECTIONS || '10');

if (!HOST || !USER || !PASS) {
  console.error('[NTRIP] ERROR: NTRIP_HOST, NTRIP_USERNAME, NTRIP_PASSWORD must be set in .env');
  process.exit(1);
}

// ── NTRIP client ───────────────────────────────────────────────
const client = new NtripCasterClient({ host: HOST, port: PORT, username: USER, password: PASS, useTls: USE_TLS });

// ── Wire client events → store + alerts ───────────────────────
client.on('stream-stats', (mountpoint, stats) => {
  store.updateStreamStatus(mountpoint, stats);
  evaluateMountpoint(mountpoint, stats);
  broadcast({ type: 'stream_stats', mountpoint, stats });
});

client.on('stream-error', (mountpoint, err) => {
  const isAuth = /auth|401|403|forbidden/i.test(err.message);
  if (isAuth) alertAuthFailed(HOST);
  store.updateStreamStatus(mountpoint, {
    mountpoint, connected: false, latencyMs: null,
    bytesPerSec: 0, healthScore: 0, correctionAgeSec: null,
    error: err.message, timestamp: Date.now(),
  });
  evaluateMountpoint(mountpoint, { connected: false, correctionAgeSec: null, latencyMs: null, healthScore: 0 });
  broadcast({ type: 'stream_error', mountpoint, error: err.message });
});

client.on('stream-close', (mountpoint) => {
  broadcast({ type: 'stream_close', mountpoint });
});

// ── Bootstrap: fetch sourcetable, then start monitors ─────────
async function bootstrap() {
  console.log(`[NTRIP] Connecting to caster ${HOST}:${PORT} …`);
  store.setCasterInfo({ host: HOST, port: PORT, name: 'ZINGSACORS', online: false });

  try {
    const table = await client.fetchSourcetable();
    clearCasterDown(HOST);
    store.setCasterInfo({ online: true, version: table.casters[0]?.version });
    store.setMountpoints(table.streams);

    console.log(`[NTRIP] Sourcetable OK — ${table.streams.length} mountpoints found`);
    broadcast({ type: 'caster_online', mountpoints: table.streams.length });

    // Seed station records from sourcetable geometry
    for (const s of table.streams) {
      store.upsertStation(s.mountpoint.replace(/_.*$/, ''), {
        stationName:    s.identifier,
        lat:            s.lat,
        lon:            s.lon,
        format:         s.format,
        constellations: s.constellations,
        network:        s.network,
        country:        s.country,
      });
    }

    // Connect to up to MAX_CONN mountpoints for monitoring
    const targets = table.streams.slice(0, MAX_CONN).map(s => s.mountpoint);
    console.log(`[NTRIP] Starting monitors for ${targets.length} mountpoints …`);
    for (const mp of targets) client.startMonitor(mp, PUSH_MS);

  } catch (err) {
    alertCasterDown(HOST);
    store.setCasterInfo({ online: false });
    console.error('[NTRIP] Caster unreachable:', err.message);
    // Retry after 60 s
    setTimeout(bootstrap, 60_000);
  }
}

// ── REST API ───────────────────────────────────────────────────
function json(res, data, status = 200) {
  res.writeHead(status, {
    'Content-Type':                'application/json',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(JSON.stringify(data));
}

const ROUTES = {
  'GET /api/ntrip/status':       () => store.getCasterStatus(),
  'GET /api/ntrip/mountpoints':  () => store.getMountpoints(),
  'GET /api/ntrip/stations':     () => store.getStations(),
  'GET /api/ntrip/stream-health':() => store.getStreamHealth(),
  'GET /api/ntrip/alerts':       () => store.getAlerts({ activeOnly: false, limit: 100 }),
};

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET' });
    return res.end();
  }

  const key     = `${req.method} ${req.url?.split('?')[0]}`;
  const handler = ROUTES[key];
  if (handler) return json(res, handler());

  // GET /api/ntrip/history/:mountpoint
  if (req.method === 'GET' && req.url?.startsWith('/api/ntrip/history/')) {
    const mp = decodeURIComponent(req.url.slice('/api/ntrip/history/'.length));
    return json(res, store.getStreamHistory(mp));
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

// ── WebSocket ──────────────────────────────────────────────────
const wss = new WebSocketServer({ server, path: '/ws/ntrip/live' });
const wsClients = new Set();

wss.on('connection', (ws) => {
  wsClients.add(ws);
  // Send current state immediately on connect
  ws.send(JSON.stringify({ type: 'init', status: store.getCasterStatus(), mountpoints: store.getMountpoints() }));
  ws.on('close', () => wsClients.delete(ws));
  ws.on('error', () => wsClients.delete(ws));
});

function broadcast(msg) {
  const payload = JSON.stringify(msg);
  for (const ws of wsClients) {
    if (ws.readyState === 1 /* OPEN */) ws.send(payload);
  }
}

// Push full status snapshot every PUSH_MS to all WS clients
setInterval(() => {
  if (!wsClients.size) return;
  broadcast({
    type:         'status_snapshot',
    timestamp:    Date.now(),
    caster:       store.getCasterStatus(),
    streamHealth: store.getStreamHealth(),
    alerts:       store.getAlerts({ activeOnly: true, limit: 20 }),
  });
}, PUSH_MS);

// ── Start ──────────────────────────────────────────────────────
server.listen(SVC_PORT, () => {
  console.log(`[NTRIP] Service running on http://localhost:${SVC_PORT}`);
  console.log(`[NTRIP] WebSocket ready at ws://localhost:${SVC_PORT}/ws/ntrip/live`);
  bootstrap();
});

process.on('SIGTERM', () => { client.stopAll(); server.close(); });
process.on('SIGINT',  () => { client.stopAll(); server.close(); process.exit(0); });
