/** GET /api/ntrip/stream-health — live when NTRIP_HOST is set, demo otherwise */
import { fetchCasterData } from './_live.mjs';

const DEMO_MOUNTPOINTS = [
  'HARA_RTCM3','BULA_RTCM3','MUTA_RTCM3','GWER_RTCM3','MARA_RTCM3','KWEK_RTCM3',
  'CHIT_RTCM3','MSVG_RTCM3','KADO_RTCM3','BIND_RTCM3','CENT_RTCM3','CHIR_RTCM3',
];
const DEMO_OFFLINE = new Set(['KADO_RTCM3', 'CENT_RTCM3']);

function jitter(base, amp) { return base + Math.round((Math.random() * 2 - 1) * amp); }

function demoStreams(now) {
  return DEMO_MOUNTPOINTS.map((mp, i) => {
    const online = !DEMO_OFFLINE.has(mp);
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
}

export default async function handler(_req, res) {
  let live = null, liveErr = null;
  try { live = await fetchCasterData(); } catch (e) { liveErr = e; }
  const now = Date.now();

  // Env vars set but caster unreachable
  if (liveErr) {
    return res.json({
      streams: [],
      summary: { total: 0, online: 0, offline: 0, avgLatencyMs: null, avgHealthScore: null, networkAvail: 0 },
      mode: 'offline',
      error: liveErr.message,
    });
  }

  if (live && !live.unauthorized && live.streams?.length > 0) {
    const streams = live.streams.map(s => ({
      mountpoint:       s.mountpoint,
      connected:        true,
      lastDataTime:     now,
      correctionAgeSec: null,
      latencyMs:        null,
      bytesTotal:       null,
      bytesPerSec:      null,
      packetRate:       null,
      uptimeSec:        null,
      // No persistent monitoring in serverless — score unknown, not zero
      healthScore:      null,
      typeCounts:       {},
      availability:     null,
      timestamp:        now,
    }));

    const total = streams.length;
    return res.json({
      streams,
      summary: {
        total,
        online:         total,
        offline:        0,
        avgLatencyMs:   null,
        avgHealthScore: null,
        networkAvail:   100,
      },
      mode: 'live',
    });
  }

  // Caster offline or auth error — show offline summary with real error state
  if (live !== null && (live.unauthorized || !live.online)) {
    return res.json({
      streams: [],
      summary: { total: 0, online: 0, offline: 0, avgLatencyMs: null, avgHealthScore: null, networkAvail: 0 },
      mode: live.unauthorized ? 'auth-error' : 'offline',
    });
  }

  // No env vars or connection failure — demo fallback
  const streams = demoStreams(now);
  const online = streams.filter(s => s.connected);
  res.json({
    streams,
    summary: {
      total:          streams.length,
      online:         online.length,
      offline:        streams.length - online.length,
      avgLatencyMs:   online.length ? Math.round(online.reduce((a, s) => a + s.latencyMs, 0) / online.length) : null,
      avgHealthScore: online.length ? Math.round(online.reduce((a, s) => a + s.healthScore, 0) / online.length) : 0,
      networkAvail:   +((online.length / streams.length) * 100).toFixed(1),
    },
    mode: 'demo',
  });
}
