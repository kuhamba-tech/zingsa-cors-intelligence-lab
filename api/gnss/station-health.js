import { zimbabweStationsForApi } from '../../src/data/zimbabweCorsStations.js';
import { loadHealthWithTelemetry } from '../../lib/corsStationHealth.js';

const OTHER_STATIONS = [
  { station_id: 'HRAO', name: 'Hartebeesthoek RAO', country: 'South Africa', lat: -25.89, lon: 27.68, network: 'TrigNet/IGS' },
  { station_id: 'NRB1', name: 'Nairobi IGS', country: 'Kenya', lat: -1.22, lon: 36.89, network: 'IGS/AFREF' },
  { station_id: 'KIGA', name: 'Kigali CORS', country: 'Rwanda', lat: -1.96, lon: 30.1, network: 'AFREF' },
];

const STATIONS = [...zimbabweStationsForApi(), ...OTHER_STATIONS];

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'no-store');
}

function operationalCount(stations) {
  return stations.filter(s => s.status === 'ONLINE' || s.status === 'DEGRADED').length;
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ detail: 'Method not allowed' });

  const country = req.query?.country;
  const filtered = country
    ? STATIONS.filter(s => s.country.toLowerCase() === String(country).toLowerCase())
    : STATIONS;
  const selected = filtered.length ? filtered : STATIONS;
  const now = new Date();

  const health = await loadHealthWithTelemetry(selected, { now });
  const online = health.stations.filter(s => s.status === 'ONLINE').length;
  const degraded = health.stations.filter(s => s.status === 'DEGRADED').length;
  const operational = operationalCount(health.stations);

  return res.status(200).json({
    success: true,
    mode: health.mode,
    telemetry_source: health.telemetry_source,
    provider: 'ZINGSA CORS Intelligence Lab',
    stations: health.stations,
    network_health: Number(((operational / health.stations.length) * 100).toFixed(1)),
    alerts: [],
    analysis_date: now.toISOString(),
    index_updated_at: health.indexUpdatedAt,
    telemetry_fetch_error: health.telemetry_fetch_error || null,
    health_summary: {
      online,
      degraded,
      offline: health.stations.length - online - degraded,
      operational,
      archive_derived: health.archiveDerived,
      seed_fallback: health.seedFallback,
      telemetry_live: health.telemetry_live ?? health.health_summary?.telemetry_live ?? 0,
    },
  });
}
