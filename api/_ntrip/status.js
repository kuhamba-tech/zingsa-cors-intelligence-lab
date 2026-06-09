/** GET /api/ntrip/status — live when NTRIP_HOST env var is set, demo otherwise */
import { fetchCasterData } from './_live.mjs';

const DEMO = {
  online: true,
  name: 'ZINGSACORS',
  host: 'demo',
  port: 2101,
  totalMountpoints: 12,
  activeMountpoints: 10,
  averageLatencyMs: 342,
  networkHealth: 'healthy',
  mode: 'demo',
};

export default async function handler(_req, res) {
  const live = await fetchCasterData().catch(() => null);

  if (live) {
    const health = live.unauthorized        ? 'auth-error'
                 : !live.online             ? 'offline'
                 : live.totalMountpoints === 0 ? 'unknown'
                 : 'healthy';

    return res.json({
      online:            live.online,
      unauthorized:      live.unauthorized || false,
      name:              live.name,
      host:              live.host,
      port:              live.port,
      totalMountpoints:  live.totalMountpoints,
      activeMountpoints: live.activeMountpoints,
      averageLatencyMs:  null,
      networkHealth:     health,
      mode:              'live',
      fetchedAt:         live.fetchedAt,
    });
  }

  res.json(DEMO);
}
