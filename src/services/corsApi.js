const DEFAULT_TIMEOUT_MS = 20000;
const CORS_DATA_TIMEOUT_MS = 120000;

async function request(path, { timeout = DEFAULT_TIMEOUT_MS } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort('Request timed out'), timeout);
  try {
    const res = await fetch(path, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(`API request timed out after ${Math.round(timeout / 1000)} seconds`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export async function getCorsStationHealth({ country } = {}) {
  const query = country ? `?country=${encodeURIComponent(country)}` : '';
  return request(`/api/gnss/station-health${query}`);
}

export async function getCorsCatalog({ station, source, refresh } = {}) {
  const params = new URLSearchParams();
  if (station) params.set('station', station);
  if (source) params.set('source', source);
  if (refresh) params.set('refresh', '1');
  const q = params.toString();
  return request(`/api/cors/catalog${q ? `?${q}` : ''}`, { timeout: CORS_DATA_TIMEOUT_MS });
}

export async function ingestCorsData({ station, limit = 20, extract = true } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120000);
  try {
    const res = await fetch('/api/cors/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ station, limit, extract }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function getIonosphereStatus({ station } = {}) {
  const params = new URLSearchParams();
  if (station) params.set('station', station);
  const q = params.toString();
  return request(`/api/ionosphere/status${q ? `?${q}` : ''}`);
}

export async function getCorsDemoAnalysis({ station, region, date, time, source } = {}) {
  const params = new URLSearchParams();
  if (station) params.set('station', station);
  if (region) params.set('region', region);
  if (date) params.set('date', date);
  if (time) params.set('time', time);
  if (source) params.set('source', source);
  params.set('extract', 'false');
  return request(`/api/cors/analyze?${params.toString()}`, { timeout: CORS_DATA_TIMEOUT_MS });
}
