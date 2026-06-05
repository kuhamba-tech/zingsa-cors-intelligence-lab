const TIMEOUT_MS = 20000;

async function request(path) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(path, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function getCorsStationHealth({ country } = {}) {
  const query = country ? `?country=${encodeURIComponent(country)}` : '';
  return request(`/api/gnss/station-health${query}`);
}
