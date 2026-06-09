const NOAA_KP_URL = 'https://services.swpc.noaa.gov/json/planetary_k_index_1m.json';
const NOAA_XRAY_1D_URL = 'https://services.swpc.noaa.gov/json/goes/primary/xrays-1-day.json';
const NOAA_PLASMA_1D_URL = 'https://services.swpc.noaa.gov/products/solar-wind/plasma-1-day.json';
const NOAA_MAG_1D_URL = 'https://services.swpc.noaa.gov/products/solar-wind/mag-1-day.json';
const NOAA_ALERTS_URL = 'https://services.swpc.noaa.gov/products/alerts.json';
const NASA_DONKI_BASE_URL = 'https://api.nasa.gov/DONKI';
const NASA_API_KEY = import.meta.env?.VITE_NASA_API_KEY || 'DEMO_KEY';
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

function latestArrayRow(rows) {
  return Array.isArray(rows) && rows.length ? rows[rows.length - 1] : null;
}

function latestObjectRow(rows) {
  return Array.isArray(rows) && rows.length ? rows[rows.length - 1] : null;
}

function xrayClass(flux) {
  const value = Number(flux) || 0;
  if (value >= 1e-4) return `X${(value / 1e-4).toFixed(1)}`;
  if (value >= 1e-5) return `M${(value / 1e-5).toFixed(1)}`;
  if (value >= 1e-6) return `C${(value / 1e-6).toFixed(1)}`;
  if (value >= 1e-7) return `B${(value / 1e-7).toFixed(1)}`;
  return `A${Math.max(value / 1e-8, 0.1).toFixed(1)}`;
}

function activityLevel(flareClass, alertCount) {
  const letter = flareClass?.[0] || 'A';
  if (letter === 'X') return { label: 'Extreme', color: '#a855f7', gnss: 'Severe radio/GNSS watch' };
  if (letter === 'M') return { label: 'High', color: '#f97316', gnss: 'HF radio and GNSS watch' };
  if (letter === 'C' || alertCount > 0) return { label: 'Moderate', color: '#eab308', gnss: 'Minor GNSS impact possible' };
  return { label: 'Low', color: '#22c55e', gnss: 'Minimal impact' };
}

function parseTableProduct(rows) {
  if (!Array.isArray(rows) || rows.length < 2) return { header: [], data: [] };
  const header = rows[0];
  return { header, data: rows.slice(1) };
}

function valueFromTable(row, header, key) {
  const index = header.findIndex(h => String(h).toLowerCase().includes(key));
  return index >= 0 ? row?.[index] : undefined;
}

function isoDate(daysAgo = 0) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

function donkiUrl(product) {
  const params = new URLSearchParams({
    startDate: isoDate(6),
    endDate: isoDate(0),
    api_key: NASA_API_KEY,
  });
  return `${NASA_DONKI_BASE_URL}/${product}?${params.toString()}`;
}

export async function fetchSolarActivity() {
  const [xrays, plasmaRows, magRows, alerts, flares, cmes, storms] = await Promise.all([
    fetchJson(NOAA_XRAY_1D_URL),
    fetchJson(NOAA_PLASMA_1D_URL),
    fetchJson(NOAA_MAG_1D_URL),
    fetchJson(NOAA_ALERTS_URL),
    fetchJson(donkiUrl('FLR')).catch(() => []),
    fetchJson(donkiUrl('CME')).catch(() => []),
    fetchJson(donkiUrl('GST')).catch(() => []),
  ]);

  const xrayLatest = latestObjectRow(xrays);
  const flux = Number(xrayLatest?.flux) || 0;
  const flareClass = xrayClass(flux);
  const xraySeries = Array.isArray(xrays)
    ? xrays.filter(row => row?.energy === '0.1-0.8nm').slice(-36).map(row => Number(row.flux) || 0)
    : [];

  const plasma = parseTableProduct(plasmaRows);
  const plasmaLatest = latestArrayRow(plasma.data);
  const speed = Number(valueFromTable(plasmaLatest, plasma.header, 'speed')) || 0;
  const density = Number(valueFromTable(plasmaLatest, plasma.header, 'density')) || 0;
  const temperature = Number(valueFromTable(plasmaLatest, plasma.header, 'temperature')) || 0;

  const mag = parseTableProduct(magRows);
  const magLatest = latestArrayRow(mag.data);
  const bt = Number(valueFromTable(magLatest, mag.header, 'bt')) || 0;
  const bz = Number(valueFromTable(magLatest, mag.header, 'bz')) || 0;

  const alertList = Array.isArray(alerts) ? alerts.slice(-5).reverse() : [];
  const level = activityLevel(flareClass, alertList.length);

  return {
    mode: 'live',
    updated: xrayLatest?.time_tag || new Date().toISOString(),
    flareClass,
    flux,
    xraySeries,
    solarWind: { speed, density, temperature, bt, bz },
    alerts: alertList,
    donki: {
      flares: Array.isArray(flares) ? flares : [],
      cmes: Array.isArray(cmes) ? cmes : [],
      storms: Array.isArray(storms) ? storms : [],
      dateRange: { start: isoDate(6), end: isoDate(0) },
    },
    level,
  };
}

function formatUtcShort(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.toISOString().slice(0, 10)} ${d.toISOString().slice(11, 16)}`;
}

/** NASA DONKI CME rows for the enhanced CME table. */
export function buildDonkiCmeRows(cmes = []) {
  return (cmes || []).slice(0, 8).map((cme) => {
    const analysis = cme.cmeAnalyses?.find(a => a.isMostAccurate) || cme.cmeAnalyses?.[0];
    const halfAngle = Number(analysis?.halfAngle);
    const halo = halfAngle >= 360 ? 'Yes' : halfAngle >= 120 ? 'Partial' : 'No';
    const linked = Array.isArray(cme.linkedEvents) && cme.linkedEvents.length > 0;
    return {
      date: formatUtcShort(cme.startTime),
      speed: analysis?.speed ? Math.round(Number(analysis.speed)) : '—',
      width: Number.isFinite(halfAngle) ? `${halfAngle}°` : '—',
      halo,
      impact: linked ? 'Possible' : halfAngle >= 120 ? 'Possible' : 'Unlikely',
      id: cme.activityID || cme.catalog || 'CME',
    };
  });
}

/** Active regions inferred from DONKI flare source locations. */
export function buildDonkiActiveRegions(flares = []) {
  const map = new Map();
  for (const flare of flares || []) {
    const id = flare.activeRegionNum
      ? `AR ${flare.activeRegionNum}`
      : flare.sourceLocation
        ? `AR ${flare.sourceLocation}`
        : flare.flrID;
    if (!id) continue;
    const letter = String(flare.classType || 'A')[0];
    const cls = letter === 'X' || letter === 'M' ? 'Beta-Gamma' : letter === 'C' ? 'Beta' : 'Alpha';
    const mag = letter === 'X' || letter === 'M' ? 'BGD' : letter === 'C' ? 'B' : 'A';
    const current = map.get(id) || { id, cls, mag, spots: 0, latest: flare.classType };
    current.spots += 1;
    if (flare.classType && String(flare.classType)[0] >= String(current.latest || 'A')[0]) {
      current.latest = flare.classType;
    }
    map.set(id, current);
  }
  return [...map.values()].slice(0, 6);
}

/** Radio burst proxy rows from recent flares (NOAA does not expose a simple burst table in-app). */
export function buildDonkiRadioBursts(flares = []) {
  return (flares || []).slice(0, 6).map((flare) => {
    const letter = String(flare.classType || 'A')[0];
    return {
      time: formatUtcShort(flare.beginTime || flare.peakTime),
      type: letter === 'M' || letter === 'X' ? 'Type II' : 'Type III',
      freq: letter === 'X' ? '410 MHz' : letter === 'M' ? '245 MHz' : '150 MHz',
      intensity: letter === 'X' ? 'Strong' : letter === 'M' ? 'Moderate' : 'Weak',
      loc: flare.sourceLocation || '—',
    };
  });
}

export function getDemoSolarActivity() {
  const hour = new Date().getUTCHours();
  const base = 1.2e-6 + Math.abs(Math.sin(hour * 0.7)) * 2.8e-6;
  const xraySeries = Array.from({ length: 36 }, (_, i) => base * (0.75 + Math.abs(Math.sin((hour + i) * 0.34)) * 0.55));
  const flareClass = xrayClass(Math.max(...xraySeries));
  const level = activityLevel(flareClass, 1);
  return {
    mode: 'demo',
    updated: new Date().toISOString(),
    flareClass,
    flux: Math.max(...xraySeries),
    xraySeries,
    solarWind: { speed: 486, density: 7.4, temperature: 112000, bt: 8.2, bz: -2.4 },
    alerts: [{ product_id: 'DEMO', message: 'No severe NOAA SWPC alert active. Solar activity under routine watch.' }],
    donki: {
      flares: [{ flrID: 'DEMO-FLR', classType: flareClass, beginTime: new Date().toISOString(), sourceLocation: 'N12W30' }],
      cmes: [{ activityID: 'DEMO-CME', startTime: new Date().toISOString(), note: 'No Earth-directed CME in demo model.' }],
      storms: [],
      dateRange: { start: isoDate(6), end: isoDate(0) },
    },
    level,
  };
}
