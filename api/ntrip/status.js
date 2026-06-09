/** Mock: GET /api/ntrip/status — caster health summary */
export default function handler(_req, res) {
  res.json({
    host:              'ZINGSACORS',
    port:              2101,
    name:              'ZINGSACORS',
    online:            true,
    lastChecked:       Date.now(),
    lastOnline:        Date.now() - 3000,
    totalMountpoints:  24,
    activeMountpoints: 20,
    networkHealth:     'healthy',      // healthy | degraded | warning | critical
    averageLatencyMs:  312,
    version:           'Ntrip/2.0',
    software:          'Leica Spider v7',
    mode:              'demo',
  });
}
