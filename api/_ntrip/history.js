/** Mock: GET /api/ntrip/history?mountpoint=<name> */
function jitter(base, amp) { return base + Math.round((Math.random() * 2 - 1) * amp); }

export default function handler(req, res) {
  const mountpoint = req.query?.mountpoint || 'UNKNOWN';
  const now = Date.now();
  const points = Array.from({ length: 60 }, (_, i) => ({
    timestamp: now - (59 - i) * 60_000,
    latencyMs: jitter(350, 100),
    bytesPerSec: jitter(1400, 200),
    healthScore: Math.max(50, jitter(88, 15)),
    connected: true,
  }));
  res.json({ mountpoint, history: points, mode: 'demo' });
}
