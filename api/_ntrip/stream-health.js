/** Mock: GET /api/ntrip/stream-health */
const MOUNTPOINTS = [
  'HARA_RTCM3','BULA_RTCM3','MUTA_RTCM3','GWER_RTCM3','MARA_RTCM3','KWEK_RTCM3',
  'CHIT_RTCM3','MSVG_RTCM3','KADO_RTCM3','BIND_RTCM3','CENT_RTCM3','CHIR_RTCM3',
];
const OFFLINE = new Set(['KADO_RTCM3', 'CENT_RTCM3']);

function jitter(base, amp) { return base + Math.round((Math.random() * 2 - 1) * amp); }

export default function handler(_req, res) {
  const now = Date.now();
  const streams = MOUNTPOINTS.map((mp, i) => {
    const online = !OFFLINE.has(mp);
    return {
      mountpoint:       mp,
      connected:        online,
      lastDataTime:     online ? now - jitter(800, 300) : null,
      correctionAgeSec: online ? +(Math.random() * 1.5).toFixed(2) : null,
      latencyMs:        online ? jitter(300, 150) : null,
      bytesTotal:       online ? 1_200_000 + i * 42000 : 0,
      bytesPerSec:      online ? jitter(1400, 200) : 0,
      packetRate:       online ? jitter(1, 0) : 0,
      uptimeSec:        online ? 3600 * (1 + i % 8) : 0,
      healthScore:      online ? Math.max(50, 100 - i * 4) : 0,
      typeCounts:       online ? { 1005: 3600, 1077: 3600, 1087: 1800, 1097: 1800, 1127: 900 } : {},
      availability:     online ? +(95 + Math.random() * 4.5).toFixed(1) : 0,
      timestamp:        now,
    };
  });

  // Network-wide summary
  const online     = streams.filter(s => s.connected);
  const avgLatency = online.length
    ? Math.round(online.reduce((a, s) => a + s.latencyMs, 0) / online.length)
    : null;
  const avgHealth  = online.length
    ? Math.round(online.reduce((a, s) => a + s.healthScore, 0) / online.length)
    : 0;

  res.json({
    streams,
    summary: {
      total:           MOUNTPOINTS.length,
      online:          online.length,
      offline:         MOUNTPOINTS.length - online.length,
      avgLatencyMs:    avgLatency,
      avgHealthScore:  avgHealth,
      networkAvail:    +((online.length / MOUNTPOINTS.length) * 100).toFixed(1),
    },
    mode: 'demo',
  });
}
