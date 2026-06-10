/** GET /api/ntrip/alerts — always live from NTRIP caster */
import { fetchCasterData } from './_live.mjs';

export default async function handler(req, res) {
  let live = null, liveErr = null;
  try { live = await fetchCasterData(); } catch (e) { liveErr = e; }
  const now = Date.now();
  const activeOnly = req.query?.active !== 'false';

  if (liveErr) {
    const alerts = [{
      id: 'caster-offline',
      type: 'CASTER_OFFLINE',
      severity: 'critical',
      mountpoint: null,
      message: `NTRIP caster unreachable: ${liveErr.message}`,
      timestamp: now,
      resolved: false,
    }];
    return res.status(503).json({ alerts, total: alerts.length, mode: 'offline' });
  }

  if (!live) {
    const alerts = [{
      id: 'not-configured',
      type: 'NOT_CONFIGURED',
      severity: 'critical',
      mountpoint: null,
      message: 'NTRIP credentials not configured — set NTRIP_HOST, NTRIP_PORT, NTRIP_USERNAME, NTRIP_PASSWORD in Vercel environment variables.',
      timestamp: now,
      resolved: false,
    }];
    return res.status(503).json({ alerts, total: alerts.length, mode: 'not-configured' });
  }

  const alerts = [];

  if (live.unauthorized) {
    alerts.push({
      id: 'auth-failure',
      type: 'AUTH_FAILURE',
      severity: 'critical',
      mountpoint: null,
      message: 'NTRIP caster authentication failed — check NTRIP_USERNAME and NTRIP_PASSWORD in Vercel env vars.',
      timestamp: now,
      resolved: false,
    });
  } else if (!live.online) {
    alerts.push({
      id: 'caster-offline',
      type: 'CASTER_OFFLINE',
      severity: 'critical',
      mountpoint: null,
      message: `NTRIP caster ${live.host}:${live.port} is unreachable.`,
      timestamp: now,
      resolved: false,
    });
  }
  // Caster online — per-stream health alerts require persistent monitoring (not available in serverless)

  const filtered = activeOnly ? alerts.filter(a => !a.resolved) : alerts;
  res.json({ alerts: filtered, total: filtered.length, mode: 'live' });
}
