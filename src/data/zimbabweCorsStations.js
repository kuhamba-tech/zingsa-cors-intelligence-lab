/** ZINGSA / ZimCORS network — official site catalogue */

export const ZIMBABWE_CORS_STATIONS = [
  { id: 'ZINH', name: 'ZINGSA HQ',       siteName: 'ZINGSA_HQ',    lat: -17.784831, lon: 31.050633, height: 1491.2, refStat:  0, satSys: 'G/R/E/C', status: 'online'   },
  { id: 'LUPA', name: 'Lupane',           siteName: 'LUPANE',        lat: -18.946969, lon: 27.760742, height: 1058.4, refStat:  1, satSys: 'G/R/E/C', status: 'online'   },
  { id: 'MUTA', name: 'Mutare',           siteName: 'MUTARE',        lat: -18.978298, lon: 32.677223, height: 1112.7, refStat:  2, satSys: 'G/R',     status: 'online'   },
  { id: 'BULA', name: 'Bulawayo',         siteName: 'BULAWAYO',      lat: -20.165313, lon: 28.641143, height: 1344.1, refStat:  3, satSys: 'G/R',     status: 'online'   },
  { id: 'GWER', name: 'Gweru',            siteName: 'GWERU',         lat: -19.511952, lon: 29.840540, height: 1424.3, refStat:  4, satSys: 'G/R',     status: 'online'   },
  { id: 'HACY', name: 'Harare Central',   siteName: 'xHARARE_C',    lat: -17.825166, lon: 31.033511, height: 1483.6, refStat:  5, satSys: 'G/R',     status: 'degraded' },
  { id: 'MASV', name: 'Masvingo',         siteName: 'MASVINGO',      lat: -20.087758, lon: 30.831493, height: 1089.5, refStat:  6, satSys: 'G/R',     status: 'online'   },
  { id: 'HARA', name: 'Harare',           siteName: 'HARARE',        lat: -17.781409, lon: 31.048562, height: 1487.8, refStat:  7, satSys: 'G/R',     status: 'online'   },
  { id: 'CENT', name: 'Centenary',        siteName: 'CENTENARY',     lat: -16.731441, lon: 31.118830, height: 1143.2, refStat:  8, satSys: 'G/R/E/C', status: 'online'   },
  { id: 'KARO', name: 'Karoi',            siteName: 'KAROI',         lat: -16.818966, lon: 29.683646, height: 1219.6, refStat:  9, satSys: 'G/R/E/C', status: 'online'   },
  { id: 'KWEK', name: 'Kwekwe',           siteName: 'KWEKWE',        lat: -18.934503, lon: 29.803925, height: 1389.0, refStat: 10, satSys: 'G/R/E/C', status: 'online'   },
  { id: 'GOKW', name: 'Gokwe',            siteName: 'GOKWE',         lat: -18.212485, lon: 28.932072, height: 1226.8, refStat: 11, satSys: 'G/R/E/C', status: 'online'   },
  { id: 'GSU_', name: 'GSU',              siteName: 'GSU',           lat: -20.436025, lon: 29.274815, height: 1268.4, refStat: 12, satSys: 'G/R/E/C', status: 'online'   },
  { id: 'CHIR', name: 'Chiredzi',         siteName: 'CHIREDZI',      lat: -21.045129, lon: 31.668645, height:  421.3, refStat: 13, satSys: 'G/R/E/C', status: 'online'   },
  { id: 'CHIM', name: 'Chimanimani',      siteName: 'CHIMANIMANI',   lat: -19.802664, lon: 32.870451, height:  768.9, refStat: 14, satSys: 'G/R/E/C', status: 'online'   },
  { id: 'CHIV', name: 'Chivhu',           siteName: 'CHIVHU',        lat: -19.017959, lon: 30.895289, height: 1198.7, refStat: 15, satSys: 'G/R/E/C', status: 'online'   },
  { id: 'KARI', name: 'Kariba',           siteName: 'KARIBA',        lat: -16.519462, lon: 28.790362, height:  519.2, refStat: 16, satSys: 'G/R/E/C', status: 'online'   },
  { id: 'MUTO', name: 'Mutoko',           siteName: 'MUTOKO',        lat: -17.404525, lon: 32.219569, height: 1087.3, refStat: 18, satSys: 'G',       status: 'online'   },
  { id: 'TSHO', name: 'Tsholotsho',       siteName: 'TSHOLOTSHO',    lat: -19.770472, lon: 27.760891, height: 1072.1, refStat: 19, satSys: 'G/R/E/C', status: 'online'   },
  { id: 'VICF', name: 'Victoria Falls',   siteName: 'VICFALLS',      lat: -17.926737, lon: 25.840540, height:  988.6, refStat: 20, satSys: 'G/R/E/C', status: 'online'   },
  { id: 'GUTU', name: 'Gutu',             siteName: 'GUTU',          lat: -19.646095, lon: 31.147089, height: 1067.4, refStat: 21, satSys: 'G/R/E/C', status: 'online'   },
  { id: 'MATA', name: 'Mataga',           siteName: 'xMATAGA',       lat: -20.845278, lon: 30.193333, height:  931.2, refStat: 22, satSys: 'G',       status: 'degraded' },
  { id: 'BEIT', name: 'Beitbridge',       siteName: 'BEITBRIDGE',    lat: -22.210183, lon: 29.995249, height:  572.8, refStat: 23, satSys: 'G/R/E/C', status: 'online'   },
  { id: 'BING', name: 'Binga',            siteName: 'BINGA',         lat: -17.625093, lon: 27.338172, height:  612.5, refStat: 24, satSys: 'G/R/E/C', status: 'online'   },
];

/** Dropdown label: "Harare (HARA)" */
export function stationDisplayName(station) {
  return `${station.name} (${station.id.replace(/_$/, '')})`;
}

export function zimbabweStationsForLab() {
  return ZIMBABWE_CORS_STATIONS.map(s => ({
    id: s.id,
    name: stationDisplayName(s),
    status: s.status,
    siteName: s.siteName,
    lat: s.lat,
    lon: s.lon,
  }));
}

export function zimbabweStationsForApi() {
  return ZIMBABWE_CORS_STATIONS.map(s => ({
    station_id: s.id,
    name: `${s.siteName} CORS`,
    country: 'Zimbabwe',
    lat: s.lat,
    lon: s.lon,
    network: 'ZimCORS/ZINGSA',
    ref_stat: s.refStat,
    sat_sys: s.satSys,
  }));
}
