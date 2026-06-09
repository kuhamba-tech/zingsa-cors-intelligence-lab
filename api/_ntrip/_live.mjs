/**
 * Serverless-safe NTRIP caster probe.
 * Makes a single TCP connection, fetches the sourcetable, then disconnects.
 * No persistent state — safe for Vercel / any stateless runtime.
 */
import net from 'node:net';

const TIMEOUT_MS = 8_000;

function basicAuth(user, pass) {
  return Buffer.from(`${user}:${pass}`).toString('base64');
}

function buildRequest(host, port, user, pass) {
  return (
    `GET / HTTP/1.0\r\n` +
    `Host: ${host}:${port}\r\n` +
    `Ntrip-Version: Ntrip/2.0\r\n` +
    `User-Agent: NTRIP ZINGSAMonitor/1.0\r\n` +
    `Authorization: Basic ${basicAuth(user, pass)}\r\n` +
    `\r\n`
  );
}

function parseSourcetable(raw, host, port) {
  const streams = [];
  for (const line of raw.split('\n')) {
    const t = line.trim();
    if (!t.startsWith('STR;')) continue;
    const p = t.split(';');
    streams.push({
      mountpoint:  p[1]  || '',
      identifier:  p[2]  || '',
      format:      p[3]  || '',
      formatDetail:p[4]  || '',
      carrier:     p[5]  || '',
      navSystem:   p[7]  || '',
      country:     p[8]  || '',
      lat:         parseFloat(p[9])  || 0,
      lon:         parseFloat(p[10]) || 0,
      nmea:        p[11] === '1',
    });
  }

  // Check HTTP status — 401 means caster rejected credentials
  const statusLine = raw.split('\n')[0] || '';
  const unauthorized = statusLine.includes('401');

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
 * Returns null if credentials are missing or connection fails.
 */
export async function fetchCasterData() {
  const host = process.env.NTRIP_HOST;
  const port = parseInt(process.env.NTRIP_PORT || '2101', 10);
  const user = process.env.NTRIP_USERNAME;
  const pass = process.env.NTRIP_PASSWORD;

  if (!host || !user || !pass) return null;

  return new Promise((resolve) => {
    let settled = false;
    let buf = '';

    const done = (val) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { sock.destroy(); } catch { /* ignore */ }
      resolve(val);
    };

    const timer = setTimeout(() => done(null), TIMEOUT_MS);

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

    sock.on('timeout', () => done(null));
    sock.on('error',   () => done(null));
    sock.on('close',   () => {
      if (!settled) done(buf.length > 0 ? parseSourcetable(buf, host, port) : null);
    });
  });
}
