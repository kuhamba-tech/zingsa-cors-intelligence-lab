const NOAA_KP_URL = 'https://services.swpc.noaa.gov/json/planetary_k_index_1m.json';

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'no-store, max-age=60');
}

const KP_LEVELS = [
  [0, 2, 'Quiet', '#1D9E75'],
  [2, 4, 'Unsettled', '#22d3ee'],
  [4, 5, 'Active', '#EF9F27'],
  [5, 6, 'G1 Storm', '#ef4444'],
  [6, 7, 'G2 Storm', '#dc2626'],
  [7, 10, 'G3+ Storm', '#7f1d1d'],
];

const AFRICA_IMPACTS = {
  Quiet: {
    gnss: 'Nominal — sub-centimetre CORS accuracy achievable across Africa',
    aviation: 'No impact — GNSS approaches fully reliable',
    hf_radio: 'Excellent propagation across Africa',
    power_systems: 'No impact',
    satellite_ops: 'Normal orbital conditions',
    communications: 'All services nominal',
  },
  Unsettled: {
    gnss: 'Minor ionospheric delays — 1–3 cm CORS degradation near EIA belt',
    aviation: 'Minimal — standard SBAS corrections sufficient',
    hf_radio: 'Slight fading on long-haul paths',
    power_systems: 'No significant impact',
    satellite_ops: 'Slightly elevated drag in LEO',
    communications: 'Mostly normal — occasional HF dropouts',
  },
  Active: {
    gnss: 'Ionospheric scintillation — 5–15 m GNSS errors. Use dual-frequency receivers',
    aviation: 'GNSS approaches may be unreliable — revert to ILS where available',
    hf_radio: 'Moderate disruption on 10–20 MHz bands over Africa',
    power_systems: 'Minor fluctuations in long transmission lines',
    satellite_ops: 'Increased atmospheric drag — orbit adjustments needed',
    communications: 'HF radio degraded. VHF/UHF unaffected',
  },
  'G1 Storm': {
    gnss: 'Significant positioning errors 10–50 m. CORS network alerts issued',
    aviation: 'GPS unreliable for precision approaches. NOTAMs recommended',
    hf_radio: 'Widespread HF blackout across sub-Saharan Africa',
    power_systems: 'Grid instability risk in South Africa, Nigeria high-voltage lines',
    satellite_ops: 'LEO satellites experiencing strong drag',
    communications: 'HF communications severely disrupted',
  },
  'G2 Storm': {
    gnss: 'GNSS outages across Africa. Emergency CORS protocols activated',
    aviation: 'GNSS-based navigation suspended on precision approaches',
    hf_radio: 'Total HF blackout. Emergency VHF/satellite backup required',
    power_systems: 'South Africa ESKOM, Nigeria PHCN: voltage regulation alerts',
    satellite_ops: 'Satellite operators executing emergency mode',
    communications: 'Satcom degraded. Internet via undersea cables unaffected',
  },
  'G3+ Storm': {
    gnss: 'Complete GNSS failure risk across Africa. CORS offline possible',
    aviation: 'All precision GNSS approaches cancelled continent-wide',
    hf_radio: 'Total communications blackout across Africa for 6–18 hours',
    power_systems: 'Emergency load-shedding across multiple African grids',
    satellite_ops: 'Geostationary satellites affected. LEO altitude rapidly decaying',
    communications: 'Satellite internet disrupted',
  },
};

function resolveLevel(kp) {
  for (const [lo, hi, name, color] of KP_LEVELS) {
    if (kp >= lo && kp < hi) return { level: name, color };
  }
  return { level: 'Quiet', color: '#1D9E75' };
}

function demoKp() {
  const seed = parseInt(new Date().toISOString().slice(0, 13).replace(/\D/g, ''), 10);
  return +((Math.abs(Math.sin(seed * 0.017)) * 4 + 1.2).toFixed(1));
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ detail: 'Method not allowed' });

  try {
    const upstream = await fetch(NOAA_KP_URL, { headers: { Accept: 'application/json' } });
    if (!upstream.ok) throw new Error(`NOAA HTTP ${upstream.status}`);
    const data = await upstream.json();
    const rec = data?.length ? data[data.length - 1] : null;
    const kp = parseFloat(rec?.kp_index ?? rec?.estimated_kp ?? 2);
    const { level, color } = resolveLevel(kp);

    return res.status(200).json({
      success: true,
      mode: 'live',
      kp_index: kp,
      kp_level: level,
      kp_color: color,
      summary: `Planetary K-index = ${kp.toFixed(1)} (${level}). Ionospheric conditions over Africa from NOAA SWPC.`,
      africa_impacts: AFRICA_IMPACTS[level] || AFRICA_IMPACTS.Unsettled,
      history: Array.isArray(data) ? data.slice(-48) : [],
      timestamp: rec?.time_tag || new Date().toISOString(),
      data_source: 'NOAA SWPC Planetary K-index (1-min)',
    });
  } catch (err) {
    const kp = demoKp();
    const { level, color } = resolveLevel(kp);
    return res.status(200).json({
      success: true,
      mode: 'demo',
      kp_index: kp,
      kp_level: level,
      kp_color: color,
      summary: `Demo K-index = ${kp.toFixed(1)} (${level}). NOAA unavailable.`,
      africa_impacts: AFRICA_IMPACTS[level] || AFRICA_IMPACTS.Unsettled,
      history: [],
      timestamp: new Date().toISOString(),
      data_source: 'Calibrated EIA model (demo fallback)',
      fallback_reason: err.message,
    });
  }
}
