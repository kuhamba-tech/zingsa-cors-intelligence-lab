/** GET /api/ntrip/alerts — live caster-level alerts when NTRIP_HOST is set, demo otherwise */
import { fetchCasterData } from './_live.mjs';

const BASE_DEMO = [
  { id:'a1', type:'MOUNTPOINT_OFFLINE',  severity:'critical', mountpoint:'KADO_RTCM3', message:'Mountpoint KADO_RTCM3 is offline. No data for 3600s.',     resolved: false },
  { id:'a2', type:'MOUNTPOINT_OFFLINE',  severity:'critical', mountpoint:'CENT_RTCM3', message:'Mountpoint CENT_RTCM3 is offline. No data for 7200s.',     resolved: false },
  { id:'a3', type:'STREAM_DEGRADED',     severity:'warning',  mountpoint:'MSVG_RTCM3', message:'Stream health on MSVG_RTCM3 is degraded (score: 55/100).', resolved: false },
  { id:'a4', type:'HIGH_LATENCY',        severity:'warning',  mountpoint:'KWEK_RTCM3', message:'High correction latency on KWEK_RTCM3: 6200ms.',           resolved: false },
  { id:'a5', type:'NO_RTCM_DATA',        severity:'warning',  mountpoint:'GWER_RTCM3', message:'No RTCM data from GWER_RTCM3 for 45s.',                   resolved: true  },
];

export default async function handler(req, res) {
  let live = null, liveErr = null;
  try { live = await fetchCasterData(); } catch (e) { liveErr = e; }
  const now = Date.now();
  const activeOnly = req.query?.active !== 'false';

  // liveErr means env vars are set but the caster is unreachable
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
        message: `NTRIP caster authentication failed — check NTRIP_USERNAME and NTRIP_PASSWORD.`,
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
    // Caster online — no caster-level alerts (per-stream alerts require persistent monitoring)

    const filtered = activeOnly ? alerts.filter(a => !a.resolved) : alerts;
    return res.json({ alerts: filtered, total: filtered.length, mode: 'live' });
  }

  // No env vars — demo fallback
  const demo = BASE_DEMO.map((a, i) => ({ ...a, timestamp: now - (i + 1) * 900_000 }));
  const filtered = activeOnly ? demo.filter(a => !a.resolved) : demo;
  res.json({ alerts: filtered, total: filtered.length, mode: 'demo' });
}
