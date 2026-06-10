/**
 * GET /api/ntrip/history?mountpoint=<name>
 * Live-only: per-stream history requires the persistent NTRIP monitoring
 * service (server/ntrip-service.mjs). The stateless serverless runtime has
 * no stored samples, so it returns an empty series rather than demo data.
 */
export default function handler(req, res) {
  const mountpoint = req.query?.mountpoint || 'UNKNOWN';
  res.json({
    mountpoint,
    history: [],
    mode: 'unavailable',
    note: 'Stream history requires the persistent NTRIP monitoring service.',
  });
}
