/** GET /api/ntrip/stations — always live from NTRIP caster, no demo fallback */
import { fetchCasterData } from './_live.mjs';
import { ZIMBABWE_CORS_STATIONS } from '../../src/data/zimbabweCorsStations.js';

const CATALOGUE = Object.fromEntries(
  ZIMBABWE_CORS_STATIONS.map(s => [s.id.toUpperCase(), s])
);

function liveStations(streams) {
  return streams.map(s => {
    const id = s.mountpoint.replace(/_.*/, '').toUpperCase();
    const cat = CATALOGUE[id] || {};
    const constellations = (s.navSystem || '').split('+').filter(Boolean);
    return {
      stationId:     id,
      stationName:   cat.siteName || s.identifier || id,
      lat:           cat.lat  ?? s.lat,
      lon:           cat.lon  ?? s.lon,
      height:        cat.height ?? null,
      receiverModel: cat.receiver || 'Unknown',
      antennaModel:  cat.antenna  || 'Unknown',
      constellations,
      health:        'unknown',
      mountpoint:    s.mountpoint,
      network:       s.network || 'ZimCORS/ZINGSA',
      country:       s.country || 'ZWE',
    };
  });
}

export default async function handler(_req, res) {
  let live = null, liveErr = null;
  try { live = await fetchCasterData(); } catch (e) { liveErr = e; }

  if (liveErr) {
    return res.status(503).json({ stations: [], total: 0, mode: 'offline', error: liveErr.message });
  }

  if (!live) {
    return res.status(503).json({ stations: [], total: 0, mode: 'not-configured', error: 'NTRIP credentials not configured' });
  }

  if (live.unauthorized) {
    return res.status(401).json({ stations: [], total: 0, mode: 'auth-error', error: 'Authentication failed' });
  }

  const stations = liveStations(live.streams || []);
  res.json({ stations, total: stations.length, mode: 'live', fetchedAt: live.fetchedAt });
}
