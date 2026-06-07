const DEFAULT_TIMEOUT_MS = 15000;

async function request(path, { method = 'GET', body, timeout = DEFAULT_TIMEOUT_MS } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort('Request timed out'), timeout);
  try {
    const init = { method, signal: controller.signal };
    if (body != null) {
      init.headers = { 'Content-Type': 'application/json' };
      init.body = JSON.stringify(body);
    }
    const res = await fetch(path, init);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `HTTP ${res.status}`);
    }
    return res.json();
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(`Night sky API timed out after ${Math.round(timeout / 1000)} seconds`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export async function getNightSkyConfig({ lat, lon, city } = {}) {
  const params = new URLSearchParams();
  if (lat != null) params.set('lat', String(lat));
  if (lon != null) params.set('lon', String(lon));
  if (city) params.set('city', city);
  const q = params.toString();
  return request(`/api/astronomy/night-sky${q ? `?${q}` : ''}`);
}

export async function generateSkyChart({ date, time, lat, lon, city }) {
  return request('/api/astronomy/night-sky', {
    method: 'POST',
    body: { date, time, lat, lon, city },
  });
}

export function toApiDate(isoDate) {
  return isoDate;
}

export function toApiTime(hours, minutes) {
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function parseTimeInput(value) {
  const match = String(value).trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return '20:00';
  const h = Math.min(23, Math.max(0, Number(match[1])));
  const m = Math.min(59, Math.max(0, Number(match[2])));
  return toApiTime(h, m);
}

export function formatTimeDisplay(hours, minutes) {
  const h24 = hours;
  const ampm = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 || 12;
  return `${String(h12).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${ampm}`;
}
