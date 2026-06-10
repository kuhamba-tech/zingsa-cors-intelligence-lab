/**
 * Lightweight Upstash / Vercel-KV REST client.
 * Uses fetch (Node 18+) — no npm package needed.
 * Set KV_REST_API_URL and KV_REST_API_TOKEN in Vercel env vars
 * (they are auto-injected when you link a KV store in the Vercel dashboard).
 */

const KV_URL   = () => (process.env.KV_REST_API_URL   || '').replace(/\/$/, '');
const KV_TOKEN = () =>  process.env.KV_REST_API_TOKEN || '';

export function kvAvailable() {
  return Boolean(KV_URL() && KV_TOKEN());
}

async function command(...args) {
  const url   = KV_URL();
  const token = KV_TOKEN();
  if (!url || !token) return null;

  const res = await fetch(url, {
    method:  'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify(args),
  });
  if (!res.ok) throw new Error(`KV HTTP ${res.status}`);
  const { result, error } = await res.json();
  if (error) throw new Error(`KV error: ${error}`);
  return result;
}

/** Get a JSON value by key. Returns null if missing or KV not configured. */
export async function kvGet(key) {
  const raw = await command('GET', key);
  if (raw === null || raw === undefined) return null;
  try { return JSON.parse(raw); } catch { return raw; }
}

/** Set a JSON value. exSeconds is optional TTL. */
export async function kvSet(key, value, exSeconds) {
  const serialised = JSON.stringify(value);
  if (exSeconds) return command('SET', key, serialised, 'EX', String(exSeconds));
  return command('SET', key, serialised);
}
