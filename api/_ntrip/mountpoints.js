/** Mock: GET /api/ntrip/mountpoints */
const now = () => Date.now();

const STATIONS = [
  { id: 'HARA', name: 'Harare',    lat: -17.83, lon: 31.05, country: 'ZWE', health: 95 },
  { id: 'BULA', name: 'Bulawayo',  lat: -20.15, lon: 28.58, country: 'ZWE', health: 88 },
  { id: 'MUTA', name: 'Mutare',    lat: -18.97, lon: 32.65, country: 'ZWE', health: 91 },
  { id: 'GWER', name: 'Gweru',     lat: -19.45, lon: 29.82, country: 'ZWE', health: 78 },
  { id: 'MARA', name: 'Marondera', lat: -18.19, lon: 31.55, country: 'ZWE', health: 85 },
  { id: 'KWEK', name: 'Kwekwe',    lat: -18.93, lon: 29.81, country: 'ZWE', health: 62 },
  { id: 'CHIT', name: 'Chitungwiza',lat:-18.00,lon: 31.08, country: 'ZWE', health: 90 },
  { id: 'MSVG', name: 'Masvingo',  lat: -20.07, lon: 30.83, country: 'ZWE', health: 55 },
  { id: 'KADO', name: 'Kadoma',    lat: -18.34, lon: 29.90, country: 'ZWE', health: 0  },
  { id: 'BIND', name: 'Bindura',   lat: -17.30, lon: 31.33, country: 'ZWE', health: 82 },
  { id: 'CENT', name: 'Centenary', lat: -16.74, lon: 31.13, country: 'ZWE', health: 0  },
  { id: 'CHIR', name: 'Chipinge',  lat: -20.20, lon: 32.63, country: 'ZWE', health: 71 },
];

const CONSTELLATIONS = ['GPS', 'GLONASS', 'Galileo', 'BeiDou'];
const FORMATS = ['RTCM 3.2', 'RTCM 3.3'];

export default function handler(_req, res) {
  const mps = STATIONS.map((s, i) => {
    const online  = s.health > 0;
    const latency = online ? 150 + Math.round(Math.sin(i * 1.3) * 120 + 150) : null;
    return {
      mountpoint:     `${s.id}_RTCM3`,
      identifier:     s.name,
      format:         FORMATS[i % FORMATS.length],
      formatDetails:  '1005(1),1077(1),1087(1),1097(1),1127(1)',
      constellations: online ? CONSTELLATIONS.slice(0, 2 + (i % 3)) : [],
      country:        s.country,
      lat:            s.lat,
      lon:            s.lon,
      network:        'ZINGSA',
      stationId:      s.id,
      status: {
        connected:        online,
        healthScore:      s.health,
        latencyMs:        latency,
        bytesPerSec:      online ? 1200 + i * 80 : 0,
        correctionAgeSec: online ? 0.8 + i * 0.1 : null,
        bytesTotal:       online ? 1_200_000 + i * 50000 : 0,
        uptimeSec:        online ? 3600 * (1 + i % 8) : 0,
        typeCounts:       online ? { 1005: 3600, 1077: 3600, 1087: 3600, 1097: 3600, 1127: 3600 } : {},
        timestamp:        now(),
      },
      station: {
        stationId:      s.id,
        stationName:    s.name,
        lat:            s.lat,
        lon:            s.lon,
        receiverModel:  'Leica GR50',
        antennaModel:   'LEIAR25 LEIT',
        constellations: CONSTELLATIONS,
        health:         s.health >= 80 ? 'healthy' : s.health > 0 ? 'degraded' : 'offline',
      },
    };
  });

  res.json({ mountpoints: mps, total: mps.length, mode: 'demo' });
}
