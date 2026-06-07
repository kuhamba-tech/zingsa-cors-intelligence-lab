const DEFAULT_OBS = {
  name: 'ZINGSA Mazowe Observatory',
  city: 'Harare, Zimbabwe',
  lat: -17.83,
  lon: 31.05,
  altitude: 1480,
  timezone: 'Africa/Harare',
};

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'no-store, max-age=300');
}

function buildEmbedUrl({ lat, lon }) {
  const params = new URLSearchParams({
    lat: String(lat),
    lng: String(lon),
  });
  return `https://stellarium-web.org/?${params.toString()}`;
}

function moonPhaseLabel(fraction) {
  const p = Number(fraction);
  if (p < 0.03 || p > 0.97) return 'New Moon';
  if (p < 0.22) return 'Waxing Crescent';
  if (p < 0.28) return 'First Quarter';
  if (p < 0.47) return 'Waxing Gibbous';
  if (p < 0.53) return 'Full Moon';
  if (p < 0.72) return 'Waning Gibbous';
  if (p < 0.78) return 'Last Quarter';
  return 'Waning Crescent';
}

function visiblePlanetsTonight() {
  return [
    { name: 'Venus', symbol: '♀', visibility: 'Evening', search: 'Venus', note: 'Bright evening object after sunset' },
    { name: 'Mars', symbol: '♂', visibility: 'Night', search: 'Mars', note: 'Visible mid to late evening' },
    { name: 'Jupiter', symbol: '♃', visibility: 'Night', search: 'Jupiter', note: 'Dominant gas giant in the evening sky' },
    { name: 'Saturn', symbol: '♄', visibility: 'Night', search: 'Saturn', note: 'Visible with steady atmospheric seeing' },
  ];
}

async function fetchAstronomy(lat, lon, timezone) {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    daily: 'moonrise,moonset,moon_phase',
    timezone,
    forecast_days: '1',
  });
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, {
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`);
  const json = await res.json();
  const phase = json?.daily?.moon_phase?.[0];
  return {
    moonrise: json?.daily?.moonrise?.[0] || null,
    moonset: json?.daily?.moonset?.[0] || null,
    moon_phase: phase != null ? Number(phase) : null,
    moon_phase_label: phase != null ? moonPhaseLabel(phase) : null,
    moon_illumination_pct: phase != null ? Math.round(Math.abs(phase - 0.5) * 200) : null,
    source: 'Open-Meteo Forecast API',
  };
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ detail: 'Method not allowed' });

  const lat = req.query?.lat != null ? Number(req.query.lat) : DEFAULT_OBS.lat;
  const lon = req.query?.lon != null ? Number(req.query.lon) : DEFAULT_OBS.lon;
  const timezone = req.query?.timezone || DEFAULT_OBS.timezone;

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return res.status(400).json({ detail: 'Invalid lat/lon' });
  }

  let astronomy = null;
  let astronomyError = null;
  try {
    astronomy = await fetchAstronomy(lat, lon, timezone);
  } catch (err) {
    astronomyError = err.message;
    astronomy = {
      moonrise: null,
      moonset: null,
      moon_phase: 0.23,
      moon_phase_label: 'Waxing Crescent',
      moon_illumination_pct: 23,
      source: 'fallback',
    };
  }

  const planets = visiblePlanetsTonight().map(p => ({
    ...p,
    stellarium_search_url: `${buildEmbedUrl({ lat, lon })}#`,
  }));

  return res.status(200).json({
    success: true,
    provider: 'Stellarium Web + ZINGSA Astronomy API',
    mode: astronomyError ? 'partial' : 'live',
    location: {
      ...DEFAULT_OBS,
      lat,
      lon,
      timezone,
    },
    stellarium: {
      embed_url: buildEmbedUrl({ lat, lon }),
      base_url: 'https://stellarium-web.org/',
      location_params: { lat, lng: lon },
      docs: 'https://github.com/Stellarium/stellarium-web-engine',
      note: 'Set observer location via ?lat=&lng= URL parameters. Full interactive sky map runs inside Stellarium Web.',
    },
    astronomy,
    astronomy_error: astronomyError,
    planets_tonight: planets,
    quick_links: [
      { label: "Tonight's Visible Planets", action: 'planets' },
      { label: 'Current Moon Phase', action: 'moon' },
      { label: 'Ask Stellar AI', url: 'https://stellarium-web.org/', external: true },
    ],
    updated_utc: new Date().toISOString(),
  });
}
