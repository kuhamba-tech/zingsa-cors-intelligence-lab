/** GET /api/ntrip/stream-health — live when NTRIP_HOST is set, demo otherwise */
import { fetchCasterData } from './_live.mjs';

// Official 24-station Zimbabwe CORS catalogue (22 online, 2 degraded, 0 offline)
const DEMO_STATIONS = [
  { id: 'ZINH', status: 'online'   },
  { id: 'LUPA', status: 'online'   },
  { id: 'MUTA', status: 'online'   },
  { id: 'BULA', status: 'online'   },
  { id: 'GWER', status: 'online'   },
  { id: 'HACY', status: 'degraded' },
  { id: 'MASV', status: 'online'   },
  { id: 'HARA', status: 'online'   },
  { id: 'CENT', status: 'online'   },
  { id: 'KARO', status: 'online'   },
  { id: 'KWEK', status: 'online'   },
  { id: 'GOKW', status: 'online'   },
  { id: 'GSU_', status: 'online'   },
  { id: 'CHIR', status: 'online'   },
  { id: 'CHIM', status: 'online'   },
  { id: 'CHIV', status: 'online'   },
  { id: 'KARI', status: 'online'   },
  { id: 'MUTO', status: 'online'   },
  { id: 'TSHO', status: 'online'   },
  { id: 'VICF', status: 'online'   },
  { id: 'GUTU', status: 'online'   },
  { id: 'MATA', status: 'degraded' },
  { id: 'BEIT', status: 'online'   },
  { id: 'BING', status: 'online'   },
];

function jitter(base, amp) { return base + Math.round((Math.random() * 2 - 1) * amp); }

function demoStreams(now) {
  return DEMO_STATIONS.map((s, i) => {
    const degraded = s.status === 'degraded';
    // All stations are connected (online or degraded); 0 offline
    const connected = true;
    const health = degraded ? 42 + Math.round(Math.random() * 8) : Math.max(72, 98 - i);
    return {
      mountpoint:       `${s.id}_RTCM3`,
      connected,
      lastDataTime:     now - jitter(800, 300),
      correctionAgeSec: degraded ? +(2.4 + Math.random()).toFixed(2) : +(Math.random() * 1.2).toFixed(2),
      latencyMs:        degraded ? jitter(640, 180) : jitter(260, 120),
      bytesTotal:       1_200_000 + i * 48_000,
      bytesPerSec:      degraded ? jitter(620, 150) : jitter(1400, 180),
      packetRate:       1,
      uptimeSec:        3600 * (2 + i % 10),
      healthScore:      health,
      typeCounts:       { 1005: 3600, 1077: 3600, 1087: 1800, 1097: 1800, 1127: 900 },
      availability:     degraded ? +(78 + Math.random() * 6).toFixed(1) : +(95 + Math.random() * 4.5).toFixed(1),
      timestamp:        now,
    };
  });
}

export default async function handler(_req, res) {
  let live = null, liveErr = null;
  try { live = await fetchCasterData(); } catch (e) { liveErr = e; }
  const now = Date.now();

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

  if (live !== null && (live.unauthorized || !live.online)) {
    return res.json({
      streams: [],
      summary: { total: 0, online: 0, offline: 0, avgLatencyMs: null, avgHealthScore: null, networkAvail: 0 },
      mode: live.unauthorized ? 'auth-error' : 'offline',
    });
  }

  const streams = demoStreams(now);
  const online = streams.filter(s => s.connected);
  res.json({
    streams,
    summary: {
      total:          streams.length,
      online:         online.length,
      offline:        streams.length - online.length,
      avgLatencyMs:   Math.round(online.reduce((a, s) => a + s.latencyMs, 0) / online.length),
      avgHealthScore: Math.round(online.reduce((a, s) => a + s.healthScore, 0) / online.length),
      networkAvail:   +((online.length / streams.length) * 100).toFixed(1),
    },
    mode: 'demo',
  });
}
