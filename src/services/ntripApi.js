/**
 * Frontend NTRIP monitoring API client.
 * Fetches from /api/ntrip/* (mock in dev, live service in prod).
 * Never exposes caster credentials — results only.
 */

const BASE = '/api/ntrip';
const DEFAULT_TIMEOUT = 12_000;

async function fetchJson(path, timeout = DEFAULT_TIMEOUT) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(BASE + path, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/** GET /api/ntrip/status — caster + network health summary */
export async function getNtripStatus() {
  return fetchJson('/status');
}

/** GET /api/ntrip/mountpoints — full mountpoint list with inline station & status */
export async function getNtripMountpoints() {
  const data = await fetchJson('/mountpoints');
  return data.mountpoints ?? data;
}

/** GET /api/ntrip/stations — station metadata + health */
export async function getNtripStations() {
  const data = await fetchJson('/stations');
  return data.stations ?? data;
}

/** GET /api/ntrip/stream-health — per-stream and network-wide health */
export async function getNtripStreamHealth() {
  return fetchJson('/stream-health');
}

/** GET /api/ntrip/alerts[?active=false] */
export async function getNtripAlerts(activeOnly = true) {
  const data = await fetchJson(`/alerts${activeOnly ? '' : '?active=false'}`);
  return data.alerts ?? data;
}

/** GET /api/ntrip/history?mountpoint=<name> */
export async function getStreamHistory(mountpoint) {
  return fetchJson(`/history?mountpoint=${encodeURIComponent(mountpoint)}`);
}

/** GET /api/ntrip/uptime?period=7d|30d|24h — station uptime % and event log */
export async function getNtripUptime(period = '7d') {
  return fetchJson(`/uptime?period=${period}`, 20_000);
}

// ── WebSocket live feed ────────────────────────────────────────

const WS_URL = (() => {
  // In production the NTRIP service runs on port 3001; in dev Vite proxies it.
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  const host  = location.host;
  return `${proto}://${host}/ws/ntrip/live`;
})();

/**
 * Subscribe to live NTRIP updates.
 * @param {object} handlers - { onStatus, onStreamStats, onAlert, onError, onOpen, onClose }
 * @returns {function} unsubscribe
 */
export function subscribeNtripLive(handlers = {}) {
  let ws;
  let reconnectTimer = null;
  let stopped = false;

  function connect() {
    try {
      ws = new WebSocket(WS_URL);
    } catch {
      handlers.onError?.('WebSocket not supported');
      return;
    }

    ws.onopen = () => { handlers.onOpen?.(); };

    ws.onmessage = ({ data }) => {
      try {
        const msg = JSON.parse(data);
        switch (msg.type) {
          case 'init':
          case 'status_snapshot':
            handlers.onStatus?.(msg);
            break;
          case 'stream_stats':
            handlers.onStreamStats?.(msg.mountpoint, msg.stats);
            break;
          case 'caster_online':
            handlers.onStatus?.({ type: 'caster_online', ...msg });
            break;
          case 'stream_error':
          case 'stream_close':
            handlers.onStreamStats?.(msg.mountpoint, { connected: false, error: msg.error });
            break;
          default:
            break;
        }
      } catch { /* malformed message */ }
    };

    ws.onerror = () => { handlers.onError?.('WebSocket error'); };

    ws.onclose = () => {
      handlers.onClose?.();
      if (!stopped) reconnectTimer = setTimeout(connect, 10_000);
    };
  }

  connect();

  return function unsubscribe() {
    stopped = true;
    clearTimeout(reconnectTimer);
    ws?.close();
  };
}

// ── Health colour helpers ─────────────────────────────────────

export function healthColor(score) {
  if (score >= 80) return '#22c55e';
  if (score >= 50) return '#f59e0b';
  if (score >   0) return '#ef4444';
  return '#64748b';
}

export function healthLabel(score) {
  if (score >= 80) return 'Healthy';
  if (score >= 50) return 'Degraded';
  if (score >   0) return 'Critical';
  return 'Offline';
}

export function severityColor(sev) {
  if (sev === 'critical') return '#ef4444';
  if (sev === 'warning')  return '#f59e0b';
  return '#22d3ee';
}
