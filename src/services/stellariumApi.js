const DEFAULT_TIMEOUT_MS = 15000;

async function request(path, { timeout = DEFAULT_TIMEOUT_MS } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort('Request timed out'), timeout);
  try {
    const res = await fetch(path, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(`Astronomy API timed out after ${Math.round(timeout / 1000)} seconds`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export function buildStellariumEmbedUrl({ lat, lon }) {
  const params = new URLSearchParams({ lat: String(lat), lng: String(lon) });
  return `https://stellarium-web.org/?${params.toString()}`;
}

export async function getStellariumContext({ lat, lon, timezone } = {}) {
  const params = new URLSearchParams();
  if (lat != null) params.set('lat', String(lat));
  if (lon != null) params.set('lon', String(lon));
  if (timezone) params.set('timezone', timezone);
  const q = params.toString();
  return request(`/api/astronomy/stellarium${q ? `?${q}` : ''}`);
}
