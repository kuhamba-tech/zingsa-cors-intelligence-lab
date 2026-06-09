/**
 * ZINGSA CORS API — single configuration for routes and data sources.
 * mock-api.mjs imports API_ROUTES from here.
 */

export const API_ROUTES = {
  '/api/gnss/station-health': './api/_gnss/station-health.js',
  '/api/gnss/telemetry-sample': './api/_gnss/telemetry-sample.js',
  '/api/space-weather/africa': './api/_space-weather/africa.js',
  '/api/ionosphere/status': './api/_ionosphere/status.js',
  '/api/astronomy/stellarium': './api/_astronomy/stellarium.js',
  '/api/astronomy/telescope': './api/_astronomy/telescope.js',
  '/api/astronomy/night-sky': './api/_astronomy/night-sky.js',
  '/api/cors/catalog': './api/_cors/catalog.js',
  '/api/cors/ingest': './api/_cors/ingest.js',
  '/api/cors/analyze': './api/_cors/analyze.js',
  // NTRIP monitoring (demo mode — remove entries to proxy to live server/ntrip-service.mjs)
  '/api/ntrip/status':       './api/_ntrip/status.js',
  '/api/ntrip/mountpoints':  './api/_ntrip/mountpoints.js',
  '/api/ntrip/stations':     './api/_ntrip/stations.js',
  '/api/ntrip/stream-health':'./api/_ntrip/stream-health.js',
  '/api/ntrip/alerts':       './api/_ntrip/alerts.js',
  '/api/ntrip/history':      './api/_ntrip/history.js',
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
