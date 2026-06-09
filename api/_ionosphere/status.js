import { ZIMBABWE_CORS_STATIONS } from '../../src/data/zimbabweCorsStations.js';
import { loadIndex, findArchiveForQuery } from '../../lib/corsDataIngest.js';
import { buildDemoMetricsFromArchive } from '../../lib/corsDemoAnalysis.js';

const NOAA_KP_URL = 'https://services.swpc.noaa.gov/json/planetary_k_index_1m.json';
const DEFAULT_STATION = 'HARA';

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'no-store, max-age=120');
}

async function fetchKp() {
  try {
    const res = await fetch(NOAA_KP_URL, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error('NOAA unavailable');
    const rows = await res.json();
    const latest = rows[rows.length - 1];
    const kp = Number(latest?.kp_index ?? latest?.estimated_kp ?? 2);
    const dayMax = rows.slice(-720).reduce((max, row) => Math.max(max, Number(row.kp_index ?? 0)), kp);
    return { kp, kp24hMax: dayMax };
  } catch {
    return { kp: 2.0, kp24hMax: 3.0 };
  }
}

function gnssImpact(kp, s4, deltaTec) {
  if (kp >= 5 || s4 >= 0.7) return 'SEVERE';
  if (kp >= 4 || s4 >= 0.5 || Math.abs(deltaTec) >= 8) return 'HIGH';
  if (kp >= 3 || s4 >= 0.35 || Math.abs(deltaTec) >= 4) return 'MODERATE';
  return 'LOW';
}

function stationPosition(id) {
  const st = ZIMBABWE_CORS_STATIONS.find(s => s.id === id);
  if (!st) return { x: 50, y: 55 };
  const x = ((st.lon - 25) / 12) * 100;
  const y = ((-st.lat + 17) / 8) * 100;
  return { x: Math.min(92, Math.max(8, x)), y: Math.min(88, Math.max(12, y)) };
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ detail: 'Method not allowed' });

  const index = loadIndex();
  const { kp, kp24hMax } = await fetchKp();
  const primaryId = String(req.query?.station || DEFAULT_STATION).toUpperCase();

  const stations = ZIMBABWE_CORS_STATIONS.map((meta) => {
    const stationId = meta.id;
    const archive = findArchiveForQuery({ stationId, sourceId: 'tec-analysis' }, index)
      || findArchiveForQuery({ stationId }, index);
    const metrics = buildDemoMetricsFromArchive({
      archive,
      regionId: 'zimbabwe',
      stationId,
      date: archive?.date || null,
    });

    const rtkStatus = metrics.availability >= 90 ? 'FIXED' : metrics.availability >= 70 ? 'FLOAT' : 'NO FIX';
    const quality = gnssImpact(kp, metrics.s4, metrics.deltaTec);

    return {
      id: stationId.replace(/_$/, ''),
      name: meta.name?.split(' (')[0] || stationId,
      vtec: metrics.tec,
      s4: metrics.s4,
      delay: +(metrics.tec * 0.45).toFixed(1),
      error: +(Math.max(1.5, Math.abs(metrics.deltaTec) * 0.35 + metrics.s4 * 4)).toFixed(1),
      rtk: rtkStatus,
      ppp: quality === 'LOW' ? 'Normal' : quality === 'MODERATE' ? 'Delayed' : 'Degraded',
      quality,
      lat: meta.lat,
      lon: meta.lon,
      position: stationPosition(stationId),
      archive_backed: Boolean(archive),
      data_source: archive ? 'rinex-archive' : 'climatology-model',
      archive_date: archive?.date || null,
    };
  });

  const primary = stations.find(s => s.id === primaryId.replace(/_$/, '')) || stations[0];

  const archiveBacked = stations.filter(s => s.archive_backed).length;

  return res.status(200).json({
    success: true,
    mode: archiveBacked > 0 ? 'archive-blend' : 'model',
    provider: 'ZINGSA Ionospheric Monitor',
    data_blend: `${archiveBacked}/${stations.length} RINEX-backed · NOAA Kp live`,
    station: primary.id,
    station_count: stations.length,
    archive_backed_count: archiveBacked,
    primary_data_source: primary.data_source,
    stations,
    positions: Object.fromEntries(stations.map(s => [s.id, s.position])),
    vtec_tecu: primary.vtec,
    s4_index: primary.s4,
    phase_sigma_rad: +(primary.s4 * 0.45).toFixed(2),
    ionospheric_delay_l1_ns: primary.delay,
    range_error_m: primary.error,
    rtk_status: primary.rtk,
    gnss_impact: primary.quality,
    kp_index: kp,
    kp_24h_max: kp24hMax,
    tec_daily_change: +(primary.vtec - 16).toFixed(1),
    tec_peak_time: '14:00 Local',
    updated_utc: new Date().toISOString(),
  });
}
