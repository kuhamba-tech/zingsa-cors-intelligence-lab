/**
 * ZINGSA CORS API — single configuration for routes and data sources.
 * mock-api.mjs imports API_ROUTES from here.
 */

export const API_ROUTES = {
  '/api/gnss/station-health': './api/gnss/station-health.js',
  '/api/gnss/telemetry-sample': './api/gnss/telemetry-sample.js',
  '/api/space-weather/africa': './api/space-weather/africa.js',
  '/api/ionosphere/status': './api/ionosphere/status.js',
  '/api/astronomy/stellarium': './api/astronomy/stellarium.js',
  '/api/astronomy/telescope': './api/astronomy/telescope.js',
  '/api/astronomy/night-sky': './api/astronomy/night-sky.js',
  '/api/cors/catalog': './api/cors/catalog.js',
  '/api/cors/ingest': './api/cors/ingest.js',
  '/api/cors/analyze': './api/cors/analyze.js',
  // NTRIP monitoring (demo mode — remove entries to proxy to live server/ntrip-service.mjs)
  '/api/ntrip/status':       './api/ntrip/status.js',
  '/api/ntrip/mountpoints':  './api/ntrip/mountpoints.js',
  '/api/ntrip/stations':     './api/ntrip/stations.js',
  '/api/ntrip/stream-health':'./api/ntrip/stream-health.js',
  '/api/ntrip/alerts':       './api/ntrip/alerts.js',
  '/api/ntrip/history':      './api/ntrip/history.js',
};

export const GNSS_APPS_ROOT =
  'C:\\Users\\Tapiwa\\Documents\\Timothy\\ZINGSA\\Space Science\\CORS Data\\GNSS-Data\\APPS';

export const GNSS_SPIDER_ROOT = `${GNSS_APPS_ROOT}\\Spider`;

export const DATA_SOURCES = [
  {
    id: 'gnss-apps',
    label: 'Leica Spider GNSS Data (CORS Data/APPS)',
    path: GNSS_SPIDER_ROOT,
    type: 'spider',
    priority: 1,
    description: 'ZINGSA CORS network RINEX archives from Leica Spider (2025+)',
  },
  {
    id: 'tec-analysis',
    label: 'TEC Analysis RINEX Archives',
    path: 'C:\\Users\\Tapiwa\\Documents\\Timothy\\ZINGSA\\Space Science\\TEC ANAlYSIS',
    type: 'tec-doy',
    priority: 2,
    description: 'Historical TEC analysis RINEX zips (2024 DOY naming)',
  },
];

export function getSourceById(sourceId) {
  return DATA_SOURCES.find(s => s.id === sourceId) || null;
}

export function resolveConfiguredSources({ sourceId, extraPaths = [] } = {}) {
  const env = process.env.ZINGSA_CORS_DATA_ROOT;
  if (sourceId) {
    const src = getSourceById(sourceId);
    return src ? [src.path] : [];
  }

  const fromEnv = env ? env.split(';').map(p => p.trim()).filter(Boolean) : [];
  const paths = [...fromEnv, ...extraPaths];

  for (const src of [...DATA_SOURCES].sort((a, b) => a.priority - b.priority)) {
    paths.push(src.path);
  }

  return [...new Set(paths)];
}
