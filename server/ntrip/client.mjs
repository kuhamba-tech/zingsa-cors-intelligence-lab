/**
 * NTRIP TCP/TLS Client
 * Connects to an NTRIP caster, fetches sourcetable, and monitors mountpoints.
 * READ-ONLY monitoring — does not relay corrections to any rover.
 */

import net  from 'node:net';
import tls  from 'node:tls';
import { EventEmitter } from 'node:events';
import { parseSourcetable } from './sourcetable.mjs';
import { scanFrames, summarizeFrames, RTCM_TYPES } from './rtcm.mjs';

const USER_AGENT = 'NTRIP ZINGSAMonitor/1.0';

/** Build Basic-auth header value */
function basicAuth(user, pass) {
  return 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64');
}

/** Open a raw TCP or TLS socket to host:port */
function openSocket(host, port, useTls) {
  return new Promise((resolve, reject) => {
    const timeout = 10_000;
    const sock = useTls
      ? tls.connect({ host, port, rejectUnauthorized: false })
      : net.connect({ host, port });

    const timer = setTimeout(() => { sock.destroy(); reject(new Error('Connection timeout')); }, timeout);
    sock.once('connect',  () => { clearTimeout(timer); resolve(sock); });
    sock.once('secureConnect', () => { clearTimeout(timer); resolve(sock); }); // TLS
    sock.once('error',   (e)  => { clearTimeout(timer); reject(e); });
  });
}

/** Collect data from socket until a condition is met or timeout */
function collectUntil(sock, predicate, timeoutMs = 15_000) {
  return new Promise((resolve, reject) => {
    let buf = Buffer.alloc(0);
    const timer = setTimeout(() => resolve(buf), timeoutMs);

    const onData = (chunk) => {
      buf = Buffer.concat([buf, chunk]);
      if (predicate(buf)) { clearTimeout(timer); sock.removeListener('data', onData); resolve(buf); }
    };
    sock.on('data', onData);
    sock.once('error', (e) => { clearTimeout(timer); reject(e); });
    sock.once('close', ()  => { clearTimeout(timer); resolve(buf); });
  });
}

/**
 * NtripCasterClient — manages caster connection + per-mountpoint monitors.
 * Emits: 'sourcetable', 'stream-data', 'stream-stats', 'stream-error', 'stream-close'
 */
export class NtripCasterClient extends EventEmitter {
  constructor({ host, port, username, password, useTls = false }) {
    super();
    this.host     = host;
    this.port     = parseInt(port) || 2101;
    this.username = username;
    this.password = password;
    this.useTls   = useTls;
    this._monitors = new Map(); // mountpoint → { socket, stats }
  }

  /** Fetch the caster sourcetable. Returns parsed sourcetable object. */
  async fetchSourcetable() {
    const sock = await openSocket(this.host, this.port, this.useTls);
    const req  = [
      `GET / HTTP/1.0`,
      `Host: ${this.host}:${this.port}`,
      `User-Agent: ${USER_AGENT}`,
      `Authorization: ${basicAuth(this.username, this.password)}`,
      `Connection: close`,
      `\r\n`,
    ].join('\r\n');

    sock.write(req);

    const raw = await collectUntil(
      sock,
      (b) => b.toString('latin1').includes('ENDSOURCETABLE'),
      20_000,
    );
    sock.destroy();
    return parseSourcetable(raw.toString('latin1'));
  }

  /**
   * Start monitoring a single mountpoint (read-only stream analysis).
   * Stats are emitted every `intervalMs` ms.
   */
  startMonitor(mountpoint, intervalMs = 5000) {
    if (this._monitors.has(mountpoint)) return; // already monitoring

    const state = {
      socket:       null,
      connected:    false,
      startTime:    Date.now(),
      lastDataTime: null,
      bytesTotal:   0,
      bytesWindow:  0,
      windowStart:  Date.now(),
      frames:       [],
      typeCounts:   {},
      constellations: new Set(),
      latencies:    [],
      intervalId:   null,
    };

    this._monitors.set(mountpoint, state);
    this._connect(mountpoint, state, intervalMs);
  }

  async _connect(mountpoint, state, intervalMs) {
    try {
      const sock = await openSocket(this.host, this.port, this.useTls);
      state.socket    = sock;
      state.connected = true;
      state.startTime = Date.now();

      const req = [
        `GET /${mountpoint} HTTP/1.0`,
        `Host: ${this.host}:${this.port}`,
        `User-Agent: ${USER_AGENT}`,
        `Authorization: ${basicAuth(this.username, this.password)}`,
        `Ntrip-Version: Ntrip/2.0`,
        `Connection: keep-alive`,
        `\r\n`,
      ].join('\r\n');

      sock.write(req);

      // Skip HTTP response header (look for double CRLF)
      let headerDone = false;
      let headerBuf  = '';

      sock.on('data', (chunk) => {
        const now = Date.now();
        state.lastDataTime = now;
        state.bytesTotal  += chunk.length;
        state.bytesWindow += chunk.length;

        if (!headerDone) {
          headerBuf += chunk.toString('latin1');
          const idx = headerBuf.indexOf('\r\n\r\n');
          if (idx !== -1) {
            headerDone = true;
            // Check for auth failure
            if (/401|403|ERROR|FORBIDDEN/i.test(headerBuf.slice(0, idx))) {
              this.emit('stream-error', mountpoint, new Error('Authentication failed'));
              sock.destroy();
              return;
            }
            // Process any data bytes after the headers
            const afterHeader = Buffer.from(headerBuf.slice(idx + 4), 'latin1');
            if (afterHeader.length > 0) this._processRtcm(mountpoint, state, afterHeader, now);
          }
          return;
        }

        this._processRtcm(mountpoint, state, chunk, now);
        this.emit('stream-data', mountpoint, chunk);
      });

      sock.once('error', (e) => {
        state.connected = false;
        this.emit('stream-error', mountpoint, e);
        this._scheduleReconnect(mountpoint, state, intervalMs);
      });

      sock.once('close', () => {
        state.connected = false;
        this.emit('stream-close', mountpoint);
        this._scheduleReconnect(mountpoint, state, intervalMs);
      });

      // Start stats emission interval
      state.intervalId = setInterval(() => this._emitStats(mountpoint, state), intervalMs);

    } catch (err) {
      state.connected = false;
      this.emit('stream-error', mountpoint, err);
      this._scheduleReconnect(mountpoint, state, intervalMs);
    }
  }

  _processRtcm(mountpoint, state, chunk, now) {
    const frames = scanFrames(chunk);
    for (const f of frames) {
      state.typeCounts[f.type] = (state.typeCounts[f.type] || 0) + 1;
    }
    if (frames.length > 0) {
      state.latencies.push(now - (state.lastDataTime || now));
      if (state.latencies.length > 100) state.latencies.shift();
    }
  }

  _emitStats(mountpoint, state) {
    const now      = Date.now();
    const elapsed  = (now - state.windowStart) / 1000;
    const bps      = elapsed > 0 ? Math.round(state.bytesWindow / elapsed) : 0;
    const uptimeSec = (now - state.startTime) / 1000;
    const ageSec   = state.lastDataTime ? (now - state.lastDataTime) / 1000 : null;
    const avgLat   = state.latencies.length
      ? Math.round(state.latencies.reduce((a, b) => a + b, 0) / state.latencies.length)
      : null;

    const constellations = new Set();
    for (const t of Object.keys(state.typeCounts).map(Number)) {
      const info = RTCM_TYPES[t] || {};
      if (info.constellation) constellations.add(info.constellation);
    }

    const stats = {
      mountpoint,
      connected:       state.connected,
      lastDataTime:    state.lastDataTime,
      correctionAgeSec: ageSec,
      latencyMs:       avgLat,
      bytesTotal:      state.bytesTotal,
      bytesPerSec:     bps,
      uptimeSec:       Math.round(uptimeSec),
      typeCounts:      { ...state.typeCounts },
      healthScore:     this._healthScore(state, ageSec, avgLat),
      timestamp:       now,
    };

    // Reset window counters
    state.bytesWindow  = 0;
    state.windowStart  = now;

    this.emit('stream-stats', mountpoint, stats);
  }

  _healthScore(state, ageSec, latencyMs) {
    if (!state.connected) return 0;
    let score = 100;
    if (ageSec > 60)    score -= 50;
    else if (ageSec > 10) score -= 25;
    if (latencyMs > 5000) score -= 30;
    else if (latencyMs > 2000) score -= 15;
    if (state.bytesTotal < 100) score -= 20;
    return Math.max(0, score);
  }

  _scheduleReconnect(mountpoint, state, intervalMs) {
    if (state.intervalId) { clearInterval(state.intervalId); state.intervalId = null; }
    setTimeout(() => {
      if (this._monitors.has(mountpoint)) {
        this._connect(mountpoint, state, intervalMs);
      }
    }, 15_000); // reconnect after 15 s
  }

  stopMonitor(mountpoint) {
    const state = this._monitors.get(mountpoint);
    if (!state) return;
    if (state.intervalId) clearInterval(state.intervalId);
    state.socket?.destroy();
    this._monitors.delete(mountpoint);
  }

  stopAll() {
    for (const mp of this._monitors.keys()) this.stopMonitor(mp);
  }
}
