/**
 * ZINGSA / ZimCORS network — official site catalogue
 * Coordinates and heights sourced from Leica Spider (corszingsa.csv).
 * DMS converted to decimal degrees: sign*(deg + min/60 + sec/3600).
 * HACY has placeholder coords in Spider (17°00'S 30°00'E) — keeping
 * best-estimate coords until the station is fully commissioned.
 */

export const ZIMBABWE_CORS_STATIONS = [
  // id      name               siteName         lat           lon          height    refStat  satSys      status     receiver              antenna
  { id:'ZINH', name:'ZINGSA HQ',       siteName:'ZINGSA_HQ',    lat:-17.784831, lon: 31.050634, height:1514.9404, refStat: 0, satSys:'G/R/E/C', status:'online',   receiver:'LEICA GR50',    antenna:'LEIAR10 NONE'  },
  { id:'LUPA', name:'Lupane',           siteName:'LUPANE',        lat:-18.946969, lon: 27.760742, height: 986.2676, refStat: 1, satSys:'G/R/E/C', status:'online',   receiver:'LEICA GR50',    antenna:'LEIAR10 NONE'  },
  { id:'MUTA', name:'Mutare',           siteName:'MUTARE',        lat:-18.978298, lon: 32.677224, height:1113.0200, refStat: 2, satSys:'G/R',     status:'online',   receiver:'TRIMBLE NETR9', antenna:'ADVNULLANTENNA'},
  { id:'BULA', name:'Bulawayo',         siteName:'BULAWAYO',      lat:-20.165313, lon: 28.641143, height:1392.4000, refStat: 3, satSys:'G/R',     status:'online',   receiver:'TRIMBLE NETR9', antenna:'ADVNULLANTENNA'},
  { id:'GWER', name:'Gweru',            siteName:'GWERU',         lat:-19.511952, lon: 29.840540, height:1438.8300, refStat: 4, satSys:'G/R',     status:'online',   receiver:'TRIMBLE NETR9', antenna:'ADVNULLANTENNA'},
  { id:'HACY', name:'Harare Central',   siteName:'xHARARE_CITY', lat:-17.825166, lon: 31.033511, height:   0.0000, refStat: 5, satSys:'G/R',     status:'degraded', receiver:'TRIMBLE NETR9', antenna:'ADVNULLANTENNA'},
  { id:'MASV', name:'Masvingo',         siteName:'MASVINGO',      lat:-20.087758, lon: 30.831493, height:1096.5400, refStat: 6, satSys:'G/R',     status:'online',   receiver:'TRIMBLE NETR9', antenna:'ADVNULLANTENNA'},
  { id:'HARA', name:'Harare',           siteName:'HARARE',        lat:-17.781409, lon: 31.048562, height:1525.7100, refStat: 7, satSys:'G/R',     status:'online',   receiver:'TRIMBLE NETR9', antenna:'ADVNULLANTENNA'},
  { id:'CENT', name:'Centenary',        siteName:'CENTENARY',     lat:-16.731441, lon: 31.118830, height:1222.0549, refStat: 8, satSys:'G/R/E/C', status:'online',   receiver:'LEICA GR50',    antenna:'LEIAR10 NONE'  },
  { id:'KARO', name:'Karoi',            siteName:'KAROI',         lat:-16.818966, lon: 29.683645, height:1286.5621, refStat: 9, satSys:'G/R/E/C', status:'online',   receiver:'LEICA GR50',    antenna:'LEIAR10 NONE'  },
  { id:'KWEK', name:'Kwekwe',           siteName:'KWEKWE',        lat:-18.934502, lon: 29.803925, height:1231.4777, refStat:10, satSys:'G/R/E/C', status:'online',   receiver:'LEICA GR50',    antenna:'LEIAR10 NONE'  },
  { id:'GOKW', name:'Gokwe',            siteName:'GOKWE',         lat:-18.212484, lon: 28.932072, height:1292.7306, refStat:11, satSys:'G/R/E/C', status:'online',   receiver:'LEICA GR50',    antenna:'LEIAR10 NONE'  },
  { id:'GSU_', name:'GSU',              siteName:'GSU',           lat:-20.436025, lon: 29.274815, height:1212.7989, refStat:12, satSys:'G/R/E/C', status:'online',   receiver:'LEICA GR50',    antenna:'LEIAR10 NONE'  },
  { id:'CHIR', name:'Chiredzi',         siteName:'CHIREDZI',      lat:-21.045129, lon: 31.668645, height: 434.6533, refStat:13, satSys:'G/R/E/C', status:'online',   receiver:'LEICA GR50',    antenna:'LEIAR10 NONE'  },
  { id:'CHIM', name:'Chimanimani',      siteName:'CHIMANIMANI',   lat:-19.802664, lon: 32.870451, height:1539.1271, refStat:14, satSys:'G/R/E/C', status:'online',   receiver:'LEICA GR50',    antenna:'LEIAR20 LEIM'  },
  { id:'CHIV', name:'Chivhu',           siteName:'CHIVHU',        lat:-19.017959, lon: 30.895290, height:1466.4191, refStat:15, satSys:'G/R/E/C', status:'online',   receiver:'LEICA GR50',    antenna:'LEIAR10 NONE'  },
  { id:'KARI', name:'Kariba',           siteName:'KARIBA',        lat:-16.519462, lon: 28.790362, height: 753.4219, refStat:16, satSys:'G/R/E/C', status:'online',   receiver:'LEICA GR50',    antenna:'LEIAR10 NONE'  },
  { id:'MUTO', name:'Mutoko',           siteName:'MUTOKO',        lat:-17.404526, lon: 32.219569, height:1265.3981, refStat:18, satSys:'G',       status:'online',   receiver:'',              antenna:'LEIAR10 NONE'  },
  { id:'TSHO', name:'Tsholotsho',       siteName:'TSHOLOTSHO',    lat:-19.770472, lon: 27.760892, height:1107.5636, refStat:19, satSys:'G/R/E/C', status:'online',   receiver:'LEICA GR50',    antenna:'LEIAR10 NONE'  },
  { id:'VICF', name:'Victoria Falls',   siteName:'VICFALLS',      lat:-17.926737, lon: 25.840540, height: 922.5889, refStat:20, satSys:'G/R/E/C', status:'online',   receiver:'LEICA GR50',    antenna:'LEIAR10 NONE'  },
  { id:'GUTU', name:'Gutu',             siteName:'GUTU',          lat:-19.646095, lon: 31.147089, height:1396.6381, refStat:21, satSys:'G/R/E/C', status:'online',   receiver:'LEICA GR50',    antenna:'LEIAR10 NONE'  },
  { id:'MATA', name:'Mataga',           siteName:'xMATAGA',       lat:-20.845278, lon: 30.193333, height:1000.0000, refStat:22, satSys:'G',       status:'degraded', receiver:'',              antenna:'LEIAR10 NONE'  },
  { id:'BEIT', name:'Beitbridge',       siteName:'BEITBRIDGE',    lat:-22.210183, lon: 29.995249, height: 486.8955, refStat:23, satSys:'G/R/E/C', status:'online',   receiver:'LEICA GR50',    antenna:'LEIAR20 LEIM'  },
  { id:'BING', name:'Binga',            siteName:'BINGA',         lat:-17.625093, lon: 27.338172, height: 632.9443, refStat:24, satSys:'G/R/E/C', status:'online',   receiver:'LEICA GR50',    antenna:'LEIAR10 NONE'  },
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
    station_id:     s.id,
    name:           `${s.siteName} CORS`,
    country:        'Zimbabwe',
    lat:            s.lat,
    lon:            s.lon,
    network:        'ZimCORS/ZINGSA',
    ref_stat:       s.refStat,
    sat_sys:        s.satSys,
    catalog_status: s.status, // fallback when no RINEX archive or telemetry is available
  }));
}
