/** Mock: GET /api/ntrip/alerts */
const now = Date.now();

const DEMO_ALERTS = [
  { id:'a1', type:'MOUNTPOINT_OFFLINE',  severity:'critical', mountpoint:'KADO_RTCM3', message:'Mountpoint KADO_RTCM3 is offline. No data for 3600s.',   timestamp: now - 3_600_000, resolved: false },
  { id:'a2', type:'MOUNTPOINT_OFFLINE',  severity:'critical', mountpoint:'CENT_RTCM3', message:'Mountpoint CENT_RTCM3 is offline. No data for 7200s.',   timestamp: now - 7_200_000, resolved: false },
  { id:'a3', type:'STREAM_DEGRADED',     severity:'warning',  mountpoint:'MSVG_RTCM3', message:'Stream health on MSVG_RTCM3 is degraded (score: 55/100).', timestamp: now - 1_800_000, resolved: false },
  { id:'a4', type:'HIGH_LATENCY',        severity:'warning',  mountpoint:'KWEK_RTCM3', message:'High correction latency on KWEK_RTCM3: 6200ms.',           timestamp: now - 900_000,  resolved: false },
  { id:'a5', type:'NO_RTCM_DATA',        severity:'warning',  mountpoint:'GWER_RTCM3', message:'No RTCM data from GWER_RTCM3 for 45s.',                   timestamp: now - 450_000,  resolved: true  },
  { id:'a6', type:'MOUNTPOINT_OFFLINE',  severity:'critical', mountpoint:'CHIR_RTCM3', message:'Mountpoint CHIR_RTCM3 went offline.',                      timestamp: now - 86_400_000,resolved: true  },
];

export default function handler(req, res) {
  const activeOnly = req.query?.active !== 'false';
  const alerts = activeOnly ? DEMO_ALERTS.filter(a => !a.resolved) : DEMO_ALERTS;
  res.json({ alerts, total: alerts.length, mode: 'demo' });
}
