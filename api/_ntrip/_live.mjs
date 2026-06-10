/**
 * Serverless-safe NTRIP caster probe.
 * Makes a single TCP connection, fetches the sourcetable, then disconnects.
 * No persistent state — safe for Vercel / any stateless runtime.
 */
import net from 'node:net';

const TIMEOUT_MS = 10_000;

function basicAuth(user, pass) {
  return Buffer.from(`${user}:${pass}`).toString('base64');
}

function buildRequest(host, port, user, pass) {
  // HTTP/1.0 + NTRIP/2.0 headers — compatible with both NTRIP/1.0 and 2.0 casters.
  // Connection: close ensures the server sends the full sourcetable and closes.
  return [
    `GET / HTTP/1.0`,
    `Host: ${host}:${port}`,
    `Ntrip-Version: Ntrip/2.0`,
    `User-Agent: NTRIP ZINGSAMonitor/1.0`,
    `Authorization: Basic ${basicAuth(user, pass)}`,
    `Connection: close`,
    ``,
    ``,
  ].join('\r\n');
}

function parseSourcetable(raw, host, port) {
  const streams = [];
  for (const line of raw.split('\n')) {
    const t = line.trim();
    if (!t.startsWith('STR;')) continue;
    const p = t.split(';');
    streams.push({
      mountpoint:   p[1]  || '',
      identifier:   p[2]  || '',
      format:       p[3]  || '',
      formatDetail: p[4]  || '',
      carrier:      p[5]  || '',
      navSystem:    p[7]  || '',
      country:      p[8]  || '',
      lat:          parseFloat(p[9])  || 0,
      lon:          parseFloat(p[10]) || 0,
      nmea:         p[11] === '1',
      network:      p[18] || '',
    });
  }

  const statusLine = raw.split('\n')[0] || '';
  const unauthorized = /401/.test(statusLine);

  return {
    online:            !unauthorized,
    unauthorized,
    host,
    port,
    name:              'ZINGSACORS',
    totalMountpoints:  streams.length,
    activeMountpoints: streams.length,
    streams,
    fetchedAt:         Date.now(),
  };
}

/**
 * Connects to the NTRIP caster using env vars and returns sourcetable data.
 * Returns null only when credentials are missing (env not set).
 * Throws on connection/parse errors so callers can distinguish "no config"
 * from "connection failed".
 */
export async function fetchCasterData() {
  // Strip BOM (U+FEFF) and whitespace that Vercel env var editors can silently inject
  const host = (process.env.NTRIP_HOST || '').replace(/^﻿/, '').trim();
  const port = parseInt((process.env.NTRIP_PORT || '2101').trim(), 10);
  const user = (process.env.NTRIP_USERNAME || '').trim();
  const pass = (process.env.NTRIP_PASSWORD || '').trim();

  if (!host || !user || !pass) return null;

  return new Promise((resolve, reject) => {
    let settled = false;
    let buf = '';

    const done = (val) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { sock.destroy(); } catch { /* ignore */ }
      resolve(val);
    };

    const fail = (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { sock.destroy(); } catch { /* ignore */ }
      reject(err);
    };

    const timer = setTimeout(
      () => fail(new Error(`NTRIP caster ${host}:${port} timed out after ${TIMEOUT_MS}ms`)),
      TIMEOUT_MS,
    );

    const sock = net.connect({ host, port });
    sock.setTimeout(TIMEOUT_MS);

    sock.on('connect', () => {
      sock.write(buildRequest(host, port, user, pass));
    });

    sock.on('data', (chunk) => {
      buf += chunk.toString('latin1');
      if (buf.includes('ENDSOURCETABLE') || buf.includes('401')) {
        done(parseSourcetable(buf, host, port));
      }
    });

    sock.on('timeout', () => fail(new Error(`NTRIP socket timeout to ${host}:${port}`)));
    sock.on('error',   (err) => fail(new Error(`NTRIP connect error: ${err.message}`)));
    sock.on('close',   () => {
      if (!settled) {
        // Server closed connection — parse whatever we have
        if (buf.length > 0) done(parseSourcetable(buf, host, port));
        else fail(new Error(`NTRIP caster ${host}:${port} closed connection without data`));
      }
    });
  });
}
