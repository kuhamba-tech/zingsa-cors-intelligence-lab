/** GET /api/ntrip/stations — always live from NTRIP caster, no demo fallback */
import { fetchCasterData } from './_live.mjs';

function liveStations(streams) {
  return streams.map(s => {
    const id = s.mountpoint.replace(/_.*/, '');
    const constellations = (s.navSystem || '').split('+').filter(Boolean);
    return {
      stationId:     id,
      stationName:   s.identifier || id,
      lat:           s.lat,
      lon:           s.lon,
      height:        null,
      receiverModel: 'Unknown',
      antennaModel:  'Unknown',
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
