const DEFAULT_OBS = {
  name: 'ZINGSA Mazowe Observatory',
  city: 'Harare, Zimbabwe',
  lat: -17.83,
  lon: 31.05,
  altitude: 1480,
  timezone: 'Africa/Harare',
};

const BRIGHT_STARS = [
  { name: 'Sirius', mag: -1.46, ra: 6.752, dec: -16.716 },
  { name: 'Canopus', mag: -0.74, ra: 6.399, dec: -52.696 },
  { name: 'Rigel', mag: 0.13, ra: 5.242, dec: -8.202 },
  { name: 'Betelgeuse', mag: 0.42, ra: 5.919, dec: 7.407 },
  { name: 'Achernar', mag: 0.45, ra: 1.628, dec: -57.237 },
  { name: 'Hadar', mag: 0.61, ra: 14.063, dec: -60.373 },
  { name: 'Acrux', mag: 0.76, ra: 12.443, dec: -63.099 },
  { name: 'Alpha Cen', mag: -0.27, ra: 14.66, dec: -60.834 },
  { name: 'Aldebaran', mag: 0.85, ra: 4.599, dec: 16.509 },
  { name: 'Spica', mag: 0.97, ra: 13.42, dec: -11.161 },
  { name: 'Antares', mag: 1.06, ra: 16.49, dec: -26.432 },
  { name: 'Pollux', mag: 1.14, ra: 7.755, dec: 28.026 },
  { name: 'Fomalhaut', mag: 1.16, ra: 22.961, dec: -29.622 },
  { name: 'Mimosa', mag: 1.25, ra: 12.795, dec: -59.689 },
  { name: 'Regulus', mag: 1.35, ra: 10.139, dec: 11.967 },
  { name: 'Adhara', mag: 1.50, ra: 6.977, dec: -28.972 },
  { name: 'Shaula', mag: 1.62, ra: 17.56, dec: -37.104 },
  { name: 'Alnilam', mag: 1.69, ra: 5.603, dec: -1.202 },
  { name: 'Alnitak', mag: 1.77, ra: 5.679, dec: -1.943 },
  { name: 'Mintaka', mag: 2.23, ra: 5.533, dec: -0.299 },
  { name: 'Denebola', mag: 2.14, ra: 11.818, dec: 14.572 },
  { name: 'Gacrux', mag: 1.63, ra: 12.519, dec: -57.113 },
  { name: 'Peacock', mag: 1.94, ra: 20.427, dec: -56.735 },
  { name: 'Alnair', mag: 1.73, ra: 22.137, dec: -46.961 },
  { name: 'Mirfak', mag: 1.79, ra: 3.405, dec: 49.861 },
  { name: 'Dubhe', mag: 1.81, ra: 11.062, dec: 61.751 },
  { name: 'Wezen', mag: 1.83, ra: 7.139, dec: -26.393 },
  { name: 'Avior', mag: 1.86, ra: 8.375, dec: -59.509 },
  { name: 'Alkaid', mag: 1.85, ra: 13.792, dec: 49.313 },
  { name: 'Menkent', mag: 2.06, ra: 14.111, dec: -36.37 },
];

const AFRICA_TEACHING = [
  'Southern African skies offer a clear view of the Milky Way core and Magellanic Clouds.',
  'Crux (Southern Cross) and Centaurus guide observers to the south celestial pole.',
  'Canopus and Sirius dominate winter evenings over Zimbabwe and the wider region.',
  'Dark-sky sites in rural Africa reveal globular clusters visible to the naked eye.',
];

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store, max-age=120');
}

function parseDateTime(dateStr, timeStr) {
  let year;
  let month;
  let day;

  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    [year, month, day] = dateStr.split('-').map(Number);
  } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    [month, day, year] = dateStr.split('/').map(Number);
  } else {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) throw new Error('Invalid date format');
    year = d.getFullYear();
    month = d.getMonth() + 1;
    day = d.getDate();
  }

  const tm = String(timeStr || '20:00').trim().match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (!tm) throw new Error('Invalid time format — use HH:MM or HH:MM AM/PM');
  let hour = Number(tm[1]);
  const minute = Number(tm[2]);
  const ampm = tm[3]?.toUpperCase();
  if (ampm === 'PM' && hour < 12) hour += 12;
  if (ampm === 'AM' && hour === 12) hour = 0;

  return { year, month, day, hour, minute };
}

function toJulianDate({ year, month, day, hour, minute }) {
  let y = year;
  let m = month;
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  const jd =
    Math.floor(365.25 * (y + 4716)) +
    Math.floor(30.6001 * (m + 1)) +
    day +
    B -
    1524.5;
  return jd + (hour + minute / 60) / 24;
}

function gmstDegrees(jd) {
  const T = (jd - 2451545.0) / 36525.0;
  let gmst =
    280.46061837 +
    360.98564736629 * (jd - 2451545.0) +
    0.000387933 * T * T -
    (T * T * T) / 38710000;
  return ((gmst % 360) + 360) % 360;
}

function raDecToAltAz(raHours, decDeg, latDeg, lonDeg, jd) {
  const lst = (gmstDegrees(jd) + lonDeg + 360) % 360;
  const ha = ((lst - raHours * 15 + 360) % 360);
  const haRad = (ha * Math.PI) / 180;
  const decRad = (decDeg * Math.PI) / 180;
  const latRad = (latDeg * Math.PI) / 180;

  const sinAlt =
    Math.sin(decRad) * Math.sin(latRad) +
    Math.cos(decRad) * Math.cos(latRad) * Math.cos(haRad);
  const alt = (Math.asin(Math.max(-1, Math.min(1, sinAlt))) * 180) / Math.PI;

  const cosAzNum = Math.sin(decRad) - Math.sin(latRad) * sinAlt;
  const cosAzDen = Math.cos(latRad) * Math.cos((alt * Math.PI) / 180);
  let az = 0;
  if (Math.abs(cosAzDen) > 1e-8) {
    az = (Math.acos(Math.max(-1, Math.min(1, cosAzNum / cosAzDen))) * 180) / Math.PI;
    if (Math.sin(haRad) > 0) az = 360 - az;
  }

  return { alt: +alt.toFixed(2), az: +az.toFixed(2) };
}

function projectToChart(alt, az) {
  if (alt <= 0) return null;
  const r = (90 - alt) / 90;
  const azRad = (az * Math.PI) / 180;
  return {
    x: +(50 + r * 44 * Math.sin(azRad)).toFixed(2),
    y: +(50 - r * 44 * Math.cos(azRad)).toFixed(2),
    radius_pct: +(r * 100).toFixed(1),
  };
}

function starSize(mag) {
  return Math.max(1.2, Math.min(5.5, 5.8 - mag * 1.1));
}

function formatDateInput(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDisplayDate(isoDate) {
  const [y, m, d] = isoDate.split('-');
  return `${m}/${d}/${y}`;
}

function buildChart({ date, time, lat, lon, city }) {
  const dt = parseDateTime(date, time);
  const jd = toJulianDate(dt);

  const stars = BRIGHT_STARS.map(star => {
    const { alt, az } = raDecToAltAz(star.ra, star.dec, lat, lon, jd);
    const pos = projectToChart(alt, az);
    if (!pos) return null;
    return {
      name: star.name,
      magnitude: star.mag,
      altitude: alt,
      azimuth: az,
      x: pos.x,
      y: pos.y,
      size: +starSize(star.mag).toFixed(1),
    };
  }).filter(Boolean);

  const visible = stars.filter(s => s.altitude > 10);
  const cardinal = [
    { label: 'N', az: 0 },
    { label: 'E', az: 90 },
    { label: 'S', az: 180 },
    { label: 'W', az: 270 },
  ].map(c => {
    const pos = projectToChart(1, c.az);
    return { ...c, x: pos.x, y: pos.y };
  });

  const hour = dt.hour + dt.minute / 60;
  const isNight = hour >= 18 || hour <= 5;
  const teaching = [
    AFRICA_TEACHING[Math.abs(Math.floor(jd)) % AFRICA_TEACHING.length],
    `${visible.length} bright stars above 10° altitude from ${city || 'your location'}.`,
    isNight
      ? 'Evening chart — ideal for planning constellation tours across southern Africa.'
      : 'Daylight chart — stars shown as they would appear after astronomical twilight.',
  ];

  return {
    date: formatDateInput(new Date(dt.year, dt.month - 1, dt.day)),
    date_display: formatDisplayDate(formatDateInput(new Date(dt.year, dt.month - 1, dt.day))),
    time: time || '20:00',
    julian_date: +jd.toFixed(5),
    location: { lat, lon, city: city || DEFAULT_OBS.city },
    projection: 'zenith-centered (alt-az)',
    stars,
    cardinals: cardinal,
    visible_count: visible.length,
    is_night: isNight,
    milky_way: { x: 52, y: 58, opacity: 0.35 },
    teaching_notes: teaching,
    provider: 'ZINGSA Night Sky API (local ephemeris)',
  };
}

async function fetchMoonPhase(lat, lon, date) {
  try {
    const params = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lon),
      daily: 'moon_phase',
      timezone: DEFAULT_OBS.timezone,
      start_date: date,
      end_date: date,
    });
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const phase = json?.daily?.moon_phase?.[0];
    return phase != null ? +Number(phase).toFixed(3) : null;
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const lat = req.query?.lat != null ? Number(req.query.lat) : DEFAULT_OBS.lat;
  const lon = req.query?.lon != null ? Number(req.query.lon) : DEFAULT_OBS.lon;
  const city = req.query?.city || DEFAULT_OBS.city;

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return res.status(400).json({ detail: 'Invalid lat/lon' });
  }

  if (req.method === 'GET') {
    const today = formatDateInput();
    return res.status(200).json({
      success: true,
      mode: 'local-ephemeris',
      status: 'Local ephemeris ready',
      provider: 'ZINGSA Night Sky Viewer API',
      location: { ...DEFAULT_OBS, lat, lon, city },
      defaults: {
        date: today,
        date_display: formatDisplayDate(today),
        time: '20:00',
        time_display: '08:00 PM',
      },
      features: ['Bright-star chart', 'Southern hemisphere focus', 'Africa teaching notes'],
      endpoints: {
        config: 'GET /api/astronomy/night-sky',
        generate: 'POST /api/astronomy/night-sky { date, time, lat, lon, city }',
      },
      external: {
        astronomy_api: Boolean(process.env.ASTRONOMY_API_ID && process.env.ASTRONOMY_API_SECRET),
        note: 'Set ASTRONOMY_API_ID and ASTRONOMY_API_SECRET for optional AstronomyAPI.com integration.',
      },
      updated_utc: new Date().toISOString(),
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ detail: 'Method not allowed' });
  }

  const body = req.body || {};
  const date = body.date || formatDateInput();
  const time = body.time || '20:00';
  const reqLat = body.lat != null ? Number(body.lat) : lat;
  const reqLon = body.lon != null ? Number(body.lon) : lon;
  const reqCity = body.city || city;

  try {
    const chart = buildChart({
      date,
      time,
      lat: reqLat,
      lon: reqLon,
      city: reqCity,
    });
    const moonPhase = await fetchMoonPhase(reqLat, reqLon, chart.date);
    return res.status(200).json({
      success: true,
      action: 'generate',
      chart: {
        ...chart,
        moon_phase: moonPhase,
      },
      message: `Sky chart generated for ${reqCity} on ${chart.date_display} at ${time}.`,
    });
  } catch (err) {
    return res.status(400).json({ detail: err.message });
  }
}
