/** GET /api/ntrip/stream-health — always live from NTRIP caster */
import { fetchCasterData } from './_live.mjs';

export default async function handler(_req, res) {
  let live = null, liveErr = null;
  try { live = await fetchCasterData(); } catch (e) { liveErr = e; }
  const now = Date.now();

  if (liveErr) {
    return res.status(503).json({
      streams: [],
      summary: { total: 0, online: 0, offline: 0, avgLatencyMs: null, avgHealthScore: null, networkAvail: 0 },
      mode: 'offline',
      error: liveErr.message,
    });
  }

  if (!live) {
    return res.status(503).json({
      streams: [],
      summary: { total: 0, online: 0, offline: 0, avgLatencyMs: null, avgHealthScore: null, networkAvail: 0 },
      mode: 'not-configured',
      error: 'NTRIP credentials not configured',
    });
  }

  if (live.unauthorized) {
    return res.status(401).json({
      streams: [],
      summary: { total: 0, online: 0, offline: 0, avgLatencyMs: null, avgHealthScore: null, networkAvail: 0 },
      mode: 'auth-error',
      error: 'Authentication failed',
    });
  }

  if (!live.online) {
    return res.status(503).json({
      streams: [],
      summary: { total: 0, online: 0, offline: 0, avgLatencyMs: null, avgHealthScore: null, networkAvail: 0 },
      mode: 'offline',
    });
  }

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
  res.json({
    streams,
    summary: {
      total,
      online:         total,
      offline:        0,
      avgLatencyMs:   null,
      avgHealthScore: null,
      networkAvail:   total > 0 ? 100 : 0,
    },
    mode: 'live',
    fetchedAt: live.fetchedAt,
  });
}
