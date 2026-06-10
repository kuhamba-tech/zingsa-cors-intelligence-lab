/** GET /api/ntrip/stations — live when NTRIP_HOST is set, demo otherwise */
import { fetchCasterData } from './_live.mjs';

// Official 24-station Zimbabwe CORS catalogue — mirrors zimbabweCorsStations.js
const DEMO_STATIONS = [
  { id:'ZINH', name:'ZINGSA HQ',       lat:-17.784831, lon:31.050633, height:1491.2, satSys:'G/R/E/C', status:'online'   },
  { id:'LUPA', name:'Lupane',           lat:-18.946969, lon:27.760742, height:1058.4, satSys:'G/R/E/C', status:'online'   },
  { id:'MUTA', name:'Mutare',           lat:-18.978298, lon:32.677223, height:1112.7, satSys:'G/R',     status:'online'   },
  { id:'BULA', name:'Bulawayo',         lat:-20.165313, lon:28.641143, height:1344.1, satSys:'G/R',     status:'online'   },
  { id:'GWER', name:'Gweru',            lat:-19.511952, lon:29.840540, height:1424.3, satSys:'G/R',     status:'online'   },
  { id:'HACY', name:'Harare Central',   lat:-17.825166, lon:31.033511, height:1483.6, satSys:'G/R',     status:'degraded' },
  { id:'MASV', name:'Masvingo',         lat:-20.087758, lon:30.831493, height:1089.5, satSys:'G/R',     status:'online'   },
  { id:'HARA', name:'Harare',           lat:-17.781409, lon:31.048562, height:1487.8, satSys:'G/R',     status:'online'   },
  { id:'CENT', name:'Centenary',        lat:-16.731441, lon:31.118830, height:1143.2, satSys:'G/R/E/C', status:'online'   },
  { id:'KARO', name:'Karoi',            lat:-16.818966, lon:29.683646, height:1219.6, satSys:'G/R/E/C', status:'online'   },
  { id:'KWEK', name:'Kwekwe',           lat:-18.934503, lon:29.803925, height:1389.0, satSys:'G/R/E/C', status:'online'   },
  { id:'GOKW', name:'Gokwe',            lat:-18.212485, lon:28.932072, height:1226.8, satSys:'G/R/E/C', status:'online'   },
  { id:'GSU_', name:'GSU',              lat:-20.436025, lon:29.274815, height:1268.4, satSys:'G/R/E/C', status:'online'   },
  { id:'CHIR', name:'Chiredzi',         lat:-21.045129, lon:31.668645, height: 421.3, satSys:'G/R/E/C', status:'online'   },
  { id:'CHIM', name:'Chimanimani',      lat:-19.802664, lon:32.870451, height: 768.9, satSys:'G/R/E/C', status:'online'   },
  { id:'CHIV', name:'Chivhu',           lat:-19.017959, lon:30.895289, height:1198.7, satSys:'G/R/E/C', status:'online'   },
  { id:'KARI', name:'Kariba',           lat:-16.519462, lon:28.790362, height: 519.2, satSys:'G/R/E/C', status:'online'   },
  { id:'MUTO', name:'Mutoko',           lat:-17.404525, lon:32.219569, height:1087.3, satSys:'G',       status:'online'   },
  { id:'TSHO', name:'Tsholotsho',       lat:-19.770472, lon:27.760891, height:1072.1, satSys:'G/R/E/C', status:'online'   },
  { id:'VICF', name:'Victoria Falls',   lat:-17.926737, lon:25.840540, height: 988.6, satSys:'G/R/E/C', status:'online'   },
  { id:'GUTU', name:'Gutu',             lat:-19.646095, lon:31.147089, height:1067.4, satSys:'G/R/E/C', status:'online'   },
  { id:'MATA', name:'Mataga',           lat:-20.845278, lon:30.193333, height: 931.2, satSys:'G',       status:'degraded' },
  { id:'BEIT', name:'Beitbridge',       lat:-22.210183, lon:29.995249, height: 572.8, satSys:'G/R/E/C', status:'online'   },
  { id:'BING', name:'Binga',            lat:-17.625093, lon:27.338172, height: 612.5, satSys:'G/R/E/C', status:'online'   },
];

function satSysToConstellations(satSys) {
  return satSys.split('/').map(c =>
    c === 'G' ? 'GPS' : c === 'R' ? 'GLONASS' : c === 'E' ? 'Galileo' : 'BeiDou'
  );
}

function liveStations(streams) {
  return streams.map(s => {
    const id = s.mountpoint.replace(/_.*/, '');
    const constellations = (s.navSystem || '').split('+').filter(Boolean);
    return {
      stationId:     id,
      stationName:   s.identifier || id,
      lat:           s.lat,
      lon:           s.lon,
      height:        null,
      receiverModel: 'Unknown',
      antennaModel:  'Unknown',
      constellations,
      health:        'unknown',
      mountpoint:    s.mountpoint,
      network:       s.network || 'ZimCORS/ZINGSA',
      country:       s.country || 'ZWE',
    };
  });
}

export default async function handler(_req, res) {
  let live = null;
  try { live = await fetchCasterData(); } catch { /* caster unreachable — fall through to demo */ }

  if (live && !live.unauthorized && live.streams?.length > 0) {
    const stations = liveStations(live.streams);
    return res.json({ stations, total: stations.length, mode: 'live', fetchedAt: live.fetchedAt });
  }

  const mode = live?.unauthorized ? 'auth-error' : live?.online === false ? 'offline' : 'demo';
  const stations = DEMO_STATIONS.map(s => ({
    stationId:     s.id,
    stationName:   s.name,
    lat:           s.lat,
    lon:           s.lon,
    height:        s.height,
    receiverModel: 'Leica GR50',
    antennaModel:  'LEIAR25 LEIT',
    constellations: satSysToConstellations(s.satSys),
    health:        s.status === 'online' ? 'healthy' : s.status,
    mountpoint:    `${s.id}_RTCM3`,
    network:       'ZimCORS/ZINGSA',
    country:       'ZWE',
  }));
  res.json({ stations, total: stations.length, mode });
}
