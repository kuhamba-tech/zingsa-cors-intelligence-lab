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

function localMinutesFromIso(iso) {
  if (!iso) return null;
  const match = String(iso).match(/T(\d{2}):(\d{2})/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function nowLocalMinutes(timezone) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const hour = Number(parts.find(p => p.type === 'hour')?.value || 0);
  const minute = Number(parts.find(p => p.type === 'minute')?.value || 0);
  return hour * 60 + minute;
}

function computeSkyState(sunrise, sunset, timezone) {
  const now = nowLocalMinutes(timezone);
  const rise = localMinutesFromIso(sunrise);
  const set = localMinutesFromIso(sunset);
  if (rise == null || set == null) {
    const hour = now / 60;
    return hour >= 18 || hour <= 5 ? 'night' : 'day';
  }
  const twilightBefore = rise - 30;
  const twilightAfter = set + 30;
  if (now >= twilightBefore && now < rise) return 'twilight';
  if (now >= rise && now < set) return 'day';
  if (now >= set && now < twilightAfter) return 'twilight';
  return 'night';
}

function skyStateLabel(state) {
  if (state === 'day') return 'Daylight';
  if (state === 'twilight') return 'Civil Twilight';
  return 'Night Sky';
}

async function fetchAstronomy(lat, lon, timezone) {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    daily: 'sunrise,sunset,moonrise,moonset,moon_phase',
    timezone,
    forecast_days: '1',
  });
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, {
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`);
  const json = await res.json();
  const phase = json?.daily?.moon_phase?.[0];
  const sunrise = json?.daily?.sunrise?.[0] || null;
  const sunset = json?.daily?.sunset?.[0] || null;
  const skyState = computeSkyState(sunrise, sunset, timezone);
  return {
    sunrise,
    sunset,
    moonrise: json?.daily?.moonrise?.[0] || null,
    moonset: json?.daily?.moonset?.[0] || null,
    moon_phase: phase != null ? Number(phase) : null,
    moon_phase_label: phase != null ? moonPhaseLabel(phase) : null,
    moon_illumination_pct: phase != null ? Math.round(Math.abs(phase - 0.5) * 200) : null,
    sky_state: skyState,
    sky_state_label: skyStateLabel(skyState),
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
    const hour = nowLocalMinutes(timezone) / 60;
    const skyState = hour >= 18 || hour <= 5 ? 'night' : 'day';
    astronomy = {
      sunrise: null,
      sunset: null,
      moonrise: null,
      moonset: null,
      moon_phase: 0.23,
      moon_phase_label: 'Waxing Crescent',
      moon_illumination_pct: 23,
      sky_state: skyState,
      sky_state_label: skyStateLabel(skyState),
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
