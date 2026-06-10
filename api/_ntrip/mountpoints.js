/** GET /api/ntrip/mountpoints — live sourcetable when NTRIP_HOST is set, demo otherwise */
import { fetchCasterData } from './_live.mjs';

// Mirrors the official 24-station Zimbabwe CORS catalogue in zimbabweCorsStations.js
const DEMO_STATIONS = [
  { id: 'ZINH', name: 'ZINGSA HQ',     lat: -17.784831, lon: 31.050633, satSys: 'G+R+E+C', status: 'online'   },
  { id: 'LUPA', name: 'Lupane',         lat: -18.946969, lon: 27.760742, satSys: 'G+R+E+C', status: 'online'   },
  { id: 'MUTA', name: 'Mutare',         lat: -18.978298, lon: 32.677223, satSys: 'G+R',     status: 'online'   },
  { id: 'BULA', name: 'Bulawayo',       lat: -20.165313, lon: 28.641143, satSys: 'G+R',     status: 'online'   },
  { id: 'GWER', name: 'Gweru',          lat: -19.511952, lon: 29.840540, satSys: 'G+R',     status: 'online'   },
  { id: 'HACY', name: 'Harare Central', lat: -17.825166, lon: 31.033511, satSys: 'G+R',     status: 'degraded' },
  { id: 'MASV', name: 'Masvingo',       lat: -20.087758, lon: 30.831493, satSys: 'G+R',     status: 'online'   },
  { id: 'HARA', name: 'Harare',         lat: -17.781409, lon: 31.048562, satSys: 'G+R',     status: 'online'   },
  { id: 'CENT', name: 'Centenary',      lat: -16.731441, lon: 31.118830, satSys: 'G+R+E+C', status: 'online'   },
  { id: 'KARO', name: 'Karoi',          lat: -16.818966, lon: 29.683646, satSys: 'G+R+E+C', status: 'online'   },
  { id: 'KWEK', name: 'Kwekwe',         lat: -18.934503, lon: 29.803925, satSys: 'G+R+E+C', status: 'online'   },
  { id: 'GOKW', name: 'Gokwe',          lat: -18.212485, lon: 28.932072, satSys: 'G+R+E+C', status: 'online'   },
  { id: 'GSU_', name: 'GSU',            lat: -20.436025, lon: 29.274815, satSys: 'G+R+E+C', status: 'online'   },
  { id: 'CHIR', name: 'Chiredzi',       lat: -21.045129, lon: 31.668645, satSys: 'G+R+E+C', status: 'online'   },
  { id: 'CHIM', name: 'Chimanimani',    lat: -19.802664, lon: 32.870451, satSys: 'G+R+E+C', status: 'online'   },
  { id: 'CHIV', name: 'Chivhu',         lat: -19.017959, lon: 30.895289, satSys: 'G+R+E+C', status: 'online'   },
  { id: 'KARI', name: 'Kariba',         lat: -16.519462, lon: 28.790362, satSys: 'G+R+E+C', status: 'online'   },
  { id: 'MUTO', name: 'Mutoko',         lat: -17.404525, lon: 32.219569, satSys: 'G',       status: 'online'   },
  { id: 'TSHO', name: 'Tsholotsho',     lat: -19.770472, lon: 27.760891, satSys: 'G+R+E+C', status: 'online'   },
  { id: 'VICF', name: 'Victoria Falls', lat: -17.926737, lon: 25.840540, satSys: 'G+R+E+C', status: 'online'   },
  { id: 'GUTU', name: 'Gutu',           lat: -19.646095, lon: 31.147089, satSys: 'G+R+E+C', status: 'online'   },
  { id: 'MATA', name: 'Mataga',         lat: -20.845278, lon: 30.193333, satSys: 'G',       status: 'degraded' },
  { id: 'BEIT', name: 'Beitbridge',     lat: -22.210183, lon: 29.995249, satSys: 'G+R+E+C', status: 'online'   },
  { id: 'BING', name: 'Binga',          lat: -17.625093, lon: 27.338172, satSys: 'G+R+E+C', status: 'online'   },
];

const now = () => Date.now();

function demoMountpoints() {
  return DEMO_STATIONS.map((s, i) => {
    const online = s.status === 'online';
    const degraded = s.status === 'degraded';
    const active = online || degraded;
    const constellations = s.satSys.split('+').map(c =>
      c === 'G' ? 'GPS' : c === 'R' ? 'GLONASS' : c === 'E' ? 'Galileo' : 'BeiDou'
    );
    return {
      mountpoint:    `${s.id}_RTCM3`,
      identifier:    s.name,
      format:        i % 3 === 0 ? 'RTCM 3.3' : 'RTCM 3.2',
      formatDetails: '1005(1),1077(1),1087(1),1097(1),1127(1)',
      constellations,
      country: 'ZWE', lat: s.lat, lon: s.lon,
      network: 'ZimCORS/ZINGSA',
      stationId: s.id.replace(/_$/, ''),
      status: {
        connected:        active,
        healthScore:      online ? Math.max(72, 98 - i * 1) : degraded ? 45 : 0,
        latencyMs:        active ? 180 + Math.round(Math.sin(i * 1.4) * 100 + 100) : null,
        bytesPerSec:      active ? 1100 + i * 60 : 0,
        correctionAgeSec: active ? +(0.7 + i * 0.08).toFixed(2) : null,
        bytesTotal:       active ? 1_400_000 + i * 55_000 : 0,
        uptimeSec:        active ? 3600 * (2 + i % 10) : 0,
        typeCounts:       active ? { 1005: 3600, 1077: 3600, 1087: 3600, 1097: 1800, 1127: 900 } : {},
        timestamp:        now(),
      },
      station: {
        stationId:    s.id.replace(/_$/, ''),
        stationName:  s.name,
        lat: s.lat, lon: s.lon,
        receiverModel:  'Leica GR50',
        antennaModel:   'LEIAR25 LEIT',
        constellations,
        health: online ? 'healthy' : degraded ? 'degraded' : 'offline',
      },
    };
  });
}

function liveMountpoints(streams) {
  return streams.map(s => ({
    mountpoint:    s.mountpoint,
    identifier:    s.identifier || s.mountpoint,
    format:        s.format || 'RTCM 3.x',
    formatDetails: s.formatDetail || '',
    constellations: (s.navSystem || '').split('+').filter(Boolean),
    country: s.country || 'ZWE', lat: s.lat, lon: s.lon,
    network: 'ZimCORS/ZINGSA',
    stationId: s.mountpoint.replace(/_.*/, ''),
    status: {
      connected: true, healthScore: null,
      latencyMs: null, bytesPerSec: null,
      correctionAgeSec: null, bytesTotal: null,
      uptimeSec: null, typeCounts: {}, timestamp: now(),
    },
    station: {
      stationId:   s.mountpoint.replace(/_.*/, ''),
      stationName: s.identifier || s.mountpoint,
      lat: s.lat, lon: s.lon,
      receiverModel: 'Unknown', antennaModel: 'Unknown',
      constellations: (s.navSystem || '').split('+').filter(Boolean),
      health: 'unknown',
    },
  }));
}

export default async function handler(_req, res) {
  const live = await fetchCasterData().catch(() => null);

  if (live && !live.unauthorized && live.streams?.length > 0) {
    const mps = liveMountpoints(live.streams);
    return res.json({ mountpoints: mps, total: mps.length, mode: 'live', fetchedAt: live.fetchedAt });
  }

  const mps = demoMountpoints();
  res.json({ mountpoints: mps, total: mps.length, mode: live?.unauthorized ? 'auth-error' : 'demo' });
}
