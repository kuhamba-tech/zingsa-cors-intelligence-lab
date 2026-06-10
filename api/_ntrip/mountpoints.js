/** GET /api/ntrip/mountpoints — always live from NTRIP caster */
import { fetchCasterData } from './_live.mjs';

const now = () => Date.now();

function liveMountpoints(streams) {
  return streams.map(s => ({
    mountpoint:    s.mountpoint,
    identifier:    s.identifier || s.mountpoint,
    format:        s.format || 'RTCM 3.x',
    formatDetails: s.formatDetail || '',
    constellations: (s.navSystem || '').split('+').filter(Boolean),
    country: s.country || 'ZWE',
    lat: s.lat,
    lon: s.lon,
    network: s.network || 'ZimCORS/ZINGSA',
    stationId: s.mountpoint.replace(/_.*/, ''),
    status: {
      connected: true,
      healthScore: null,
      latencyMs: null,
      bytesPerSec: null,
      correctionAgeSec: null,
      bytesTotal: null,
      uptimeSec: null,
      typeCounts: {},
      timestamp: now(),
    },
    station: {
      stationId:   s.mountpoint.replace(/_.*/, ''),
      stationName: s.identifier || s.mountpoint,
      lat: s.lat,
      lon: s.lon,
      receiverModel: 'Unknown',
      antennaModel:  'Unknown',
      constellations: (s.navSystem || '').split('+').filter(Boolean),
      health: 'unknown',
    },
  }));
}

export default async function handler(_req, res) {
  let live = null, liveErr = null;
  try { live = await fetchCasterData(); } catch (e) { liveErr = e; }

  if (liveErr) {
    return res.status(503).json({ mountpoints: [], total: 0, mode: 'offline', error: liveErr.message });
  }

  if (!live) {
    return res.status(503).json({ mountpoints: [], total: 0, mode: 'not-configured', error: 'NTRIP credentials not configured' });
  }

  if (live.unauthorized) {
    return res.status(401).json({ mountpoints: [], total: 0, mode: 'auth-error', error: 'Authentication failed' });
  }

  const mps = liveMountpoints(live.streams);
  res.json({ mountpoints: mps, total: mps.length, mode: 'live', fetchedAt: live.fetchedAt });
}
