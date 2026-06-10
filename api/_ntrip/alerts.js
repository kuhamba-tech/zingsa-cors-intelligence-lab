/** GET /api/ntrip/alerts — live caster-level alerts when NTRIP_HOST is set, demo otherwise */
import { fetchCasterData } from './_live.mjs';

// Demo alerts reference the two degraded stations in the official 24-station catalogue
const BASE_DEMO = [
  { id:'a1', type:'STREAM_DEGRADED',  severity:'warning',  mountpoint:'HACY_RTCM3', message:'Stream health on HACY_RTCM3 (Harare Central) is degraded (score: 44/100). Elevated correction age detected.', resolved: false },
  { id:'a2', type:'STREAM_DEGRADED',  severity:'warning',  mountpoint:'MATA_RTCM3', message:'Stream health on MATA_RTCM3 (Mataga) is degraded (score: 46/100). High latency on single-constellation receiver.',   resolved: false },
  { id:'a3', type:'HIGH_LATENCY',     severity:'warning',  mountpoint:'HACY_RTCM3', message:'High correction latency on HACY_RTCM3: 640ms (threshold: 500ms).',                                                    resolved: false },
  { id:'a4', type:'NO_RTCM_DATA',     severity:'warning',  mountpoint:'MATA_RTCM3', message:'No RTCM data from MATA_RTCM3 for 45s — single-GPS receiver, check signal environment.',                               resolved: true  },
];

export default async function handler(req, res) {
  let live = null, liveErr = null;
  try { live = await fetchCasterData(); } catch (e) { liveErr = e; }
  const now = Date.now();
  const activeOnly = req.query?.active !== 'false';

  if (liveErr) {
    const alert = {
      id: 'caster-offline',
      type: 'CASTER_OFFLINE',
      severity: 'critical',
      mountpoint: null,
      message: `NTRIP caster unreachable: ${liveErr.message}`,
      timestamp: now,
      resolved: false,
    };
    return res.json({ alerts: [alert], total: 1, mode: 'live' });
  }

  if (live !== null) {
    const alerts = [];

    if (live.unauthorized) {
      alerts.push({
        id: 'auth-failure',
        type: 'AUTH_FAILURE',
        severity: 'critical',
        mountpoint: null,
        message: 'NTRIP caster authentication failed — check NTRIP_USERNAME and NTRIP_PASSWORD.',
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

    const filtered = activeOnly ? alerts.filter(a => !a.resolved) : alerts;
    return res.json({ alerts: filtered, total: filtered.length, mode: 'live' });
  }

  const demo = BASE_DEMO.map((a, i) => ({ ...a, timestamp: now - (i + 1) * 900_000 }));
  const filtered = activeOnly ? demo.filter(a => !a.resolved) : demo;
  res.json({ alerts: filtered, total: filtered.length, mode: 'demo' });
}
