/** GET /api/ntrip/status — always live from NTRIP caster */
import { fetchCasterData } from './_live.mjs';

export default async function handler(_req, res) {
  let live = null, liveErr = null;
  try { live = await fetchCasterData(); } catch (e) { liveErr = e; }

  if (liveErr) {
    return res.status(503).json({
      online: false,
      error: liveErr.message,
      mode: 'offline',
    });
  }

  if (!live) {
    return res.status(503).json({
      online: false,
      error: 'NTRIP credentials not configured (NTRIP_HOST / NTRIP_USERNAME / NTRIP_PASSWORD missing)',
      mode: 'not-configured',
    });
  }

  if (live.unauthorized) {
    return res.status(401).json({
      online: false,
      unauthorized: true,
      error: 'NTRIP caster authentication failed — check NTRIP_USERNAME and NTRIP_PASSWORD in Vercel env vars',
      mode: 'auth-error',
    });
  }

  res.json({
    online:            live.online,
    name:              live.name,
    host:              live.host,
    port:              live.port,
    totalMountpoints:  live.totalMountpoints,
    activeMountpoints: live.activeMountpoints,
    averageLatencyMs:  null,
    networkHealth:     live.totalMountpoints > 0 ? 'healthy' : 'unknown',
    mode:              'live',
    fetchedAt:         live.fetchedAt,
  });
}
