const NOAA_KP_URL = 'https://services.swpc.noaa.gov/json/planetary_k_index_1m.json';
const TIMEOUT_MS = 15000;

function kpLevel(kp) {
  if (kp < 2) return { level: 'Quiet', color: '#1D9E75' };
  if (kp < 4) return { level: 'Unsettled', color: '#22d3ee' };
  if (kp < 5) return { level: 'Active', color: '#EF9F27' };
  if (kp < 6) return { level: 'G1 Storm', color: '#ef4444' };
  return { level: 'G2+ Storm', color: '#dc2626' };
}

async function fetchJson(path) {
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

/** Fetch from ZINGSA /api/space-weather/africa (proxies NOAA + Africa impacts) */
export async function fetchAfricaSpaceWeather() {
  return fetchJson('/api/space-weather/africa');
}

/** Direct NOAA Kp fetch */
export async function fetchLiveKp() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(NOAA_KP_URL, { signal: controller.signal });
    if (!res.ok) throw new Error(`NOAA HTTP ${res.status}`);
    const data = await res.json();
    const rec = data?.length ? data[data.length - 1] : null;
    const kp = parseFloat(rec?.kp_index ?? rec?.estimated_kp ?? 2);
    const { level, color } = kpLevel(kp);
    return {
      success: true,
      mode: 'live',
      kp_index: kp,
      kp_level: level,
      kp_color: color,
      history: Array.isArray(data) ? data : [],
      timestamp: rec?.time_tag || new Date().toISOString(),
      data_source: 'NOAA SWPC Planetary K-index (1-min)',
    };
  } finally {
    clearTimeout(timer);
  }
}

export function getDemoSpaceWeather() {
  const seed = parseInt(new Date().toISOString().slice(0, 13).replace(/\D/g, ''), 10);
  const kp = +((Math.abs(Math.sin(seed * 0.017)) * 4 + 1.2).toFixed(1));
  const { level, color } = kpLevel(kp);
  return {
    success: true,
    mode: 'demo',
    kp_index: kp,
    kp_level: level,
    kp_color: color,
    history: [],
    timestamp: new Date().toISOString(),
    data_source: 'Calibrated Kp + regional EIA model (demo)',
  };
}
