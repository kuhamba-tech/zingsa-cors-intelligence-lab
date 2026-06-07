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
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(`Telescope API timed out after ${Math.round(timeout / 1000)} seconds`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export async function getTelescopeCatalog({ lat, lon } = {}) {
  const params = new URLSearchParams();
  if (lat != null) params.set('lat', String(lat));
  if (lon != null) params.set('lon', String(lon));
  const q = params.toString();
  return request(`/api/astronomy/telescope${q ? `?${q}` : ''}`);
}

export async function telescopeAction({ action, objectId, azimuth, altitude, zoom }) {
  return request('/api/astronomy/telescope', {
    method: 'POST',
    body: { action, objectId, azimuth, altitude, zoom },
  });
}

export function computeLocalPointing(object, azimuth, altitude, zoom) {
  if (!object) return { aligned: false, inFov: false, offsetAz: 0, offsetAlt: 0 };
  const offsetAz = azimuth - object.azimuth;
  const offsetAlt = altitude - object.altitude;
  const distance = Math.sqrt(offsetAz ** 2 + offsetAlt ** 2);
  const tolerance = Math.max(1.5, 8 - (zoom || 50) * 0.06);
  return {
    aligned: distance <= tolerance,
    inFov: distance <= tolerance * 2.5,
    offsetAz,
    offsetAlt,
    tolerance,
  };
}
