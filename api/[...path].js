/**
 * Single Vercel serverless function for all /api/* routes.
 * Subdirectories prefixed with _ are excluded from Vercel function deployment.
 */
import gnssHealth     from './_gnss/station-health.js';
import gnusTelem      from './_gnss/telemetry-sample.js';
import swAfrica       from './_space-weather/africa.js';
import ionoStatus     from './_ionosphere/status.js';
import astroStellar   from './_astronomy/stellarium.js';
import astroScope     from './_astronomy/telescope.js';
import astroNight     from './_astronomy/night-sky.js';
import corsCatalog    from './_cors/catalog.js';
import corsIngest     from './_cors/ingest.js';
import corsAnalyze    from './_cors/analyze.js';
import ntripStatus    from './_ntrip/status.js';
import ntripMounts    from './_ntrip/mountpoints.js';
import ntripStations  from './_ntrip/stations.js';
import ntripHealth    from './_ntrip/stream-health.js';
import ntripAlerts    from './_ntrip/alerts.js';
import ntripHistory   from './_ntrip/history.js';
import ntripUptime    from './_ntrip/uptime.js';

const ROUTES = {
  'gnss/station-health':    gnssHealth,
  'gnss/telemetry-sample':  gnusTelem,
  'space-weather/africa':   swAfrica,
  'ionosphere/status':      ionoStatus,
  'astronomy/stellarium':   astroStellar,
  'astronomy/telescope':    astroScope,
  'astronomy/night-sky':    astroNight,
  'cors/catalog':           corsCatalog,
  'cors/ingest':            corsIngest,
  'cors/analyze':           corsAnalyze,
  'ntrip/status':           ntripStatus,
  'ntrip/mountpoints':      ntripMounts,
  'ntrip/stations':         ntripStations,
  'ntrip/stream-health':    ntripHealth,
  'ntrip/alerts':           ntripAlerts,
  'ntrip/history':          ntripHistory,
  'ntrip/uptime':           ntripUptime,
};

export default function handler(req, res) {
  const segments = Array.isArray(req.query.path) ? req.query.path : [req.query.path];
  const key = segments.join('/');
  const fn = ROUTES[key];
  if (!fn) {
    res.status(404).json({ error: `Unknown API route: /api/${key}` });
    return;
  }
  return fn(req, res);
}
