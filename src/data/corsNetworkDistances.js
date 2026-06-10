/**
 * ZimCORS network spacing (TIN) — baseline distances between the official
 * 24 ZimCORS stations. Pairs measured by SpiderQC ("Accuracy for ZIGSA"
 * network spacing graph) use the measured value; remaining neighbour
 * baselines are computed from station coordinates (WGS84 haversine).
 */
import { ZIMBABWE_CORS_STATIONS } from './zimbabweCorsStations.js';

export const DISTANCE_REFERENCE_STATION = 'HARA';

export const DISTANCE_STATIONS = ZIMBABWE_CORS_STATIONS.map(s => ({
  id: s.id,
  name: s.name,
  lat: s.lat,
  lon: s.lon,
}));

/** SpiderQC-measured baselines (km) — keyed "A|B" with IDs sorted. */
const MEASURED_KM = {
  'KARI|KARO': 95.7,
  'GOKW|KARI': 188.4,
  'GOKW|KARO': 174.7,
  'HARA|KARO': 179.7,
  'GOKW|LUPA': 147.0,
  'GOKW|GWER': 172.4,
  'GWER|LUPA': 217.9,
  'BULA|LUPA': 165.1,
  'BULA|GWER': 144.9,
  'BULA|MASV': 229.2,
  'GWER|MASV': 121.8,
  'HARA|MASV': 256.3,
  'HARA|MUTA': 247.2,
  'MASV|MUTA': 229.4,
  'BEIT|MASV': 249.8,
  'BEIT|LUPA': 430.5,
  'BEIT|BULA': 265.5,
};

export const DISTANCE_META = {
  source: 'ZINGSACORS · SpiderQC TIN + computed baselines',
  generatedAt: '09 Jun 2025 14:35:22',
};

const EARTH_RADIUS_KM = 6371.0088;

function haversineKm(a, b) {
  const rad = d => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

function pairKey(idA, idB) {
  return [idA, idB].sort().join('|');
}

const stationById = Object.fromEntries(DISTANCE_STATIONS.map(s => [s.id, s]));

export function distanceStation(id) {
  return stationById[id] || null;
}

/**
 * Build the TIN-style link set: every SpiderQC-measured pair, plus each
 * station's 3 nearest neighbours so all 24 CORS are connected.
 */
function buildLinks() {
  const NEAREST = 3;
  const keys = new Set(Object.keys(MEASURED_KM));

  for (const st of DISTANCE_STATIONS) {
    const nearest = DISTANCE_STATIONS
      .filter(o => o.id !== st.id)
      .map(o => ({ id: o.id, km: haversineKm(st, o) }))
      .sort((a, b) => a.km - b.km)
      .slice(0, NEAREST);
    for (const n of nearest) keys.add(pairKey(st.id, n.id));
  }

  return [...keys]
    .map(key => {
      const [fromId, toId] = key.split('|');
      const from = stationById[fromId];
      const to = stationById[toId];
      if (!from || !to) return null;
      const km = MEASURED_KM[key] ?? Math.round(haversineKm(from, to) * 10) / 10;
      return { id: key, from, to, km, measured: key in MEASURED_KM };
    })
    .filter(Boolean)
    .sort((a, b) => a.from.name.localeCompare(b.from.name) || a.to.name.localeCompare(b.to.name));
}

const LINKS = buildLinks();

/** Resolved link rows: { id, from, to, km, measured } with full station objects. */
export function distanceLinkRows() {
  return LINKS;
}
