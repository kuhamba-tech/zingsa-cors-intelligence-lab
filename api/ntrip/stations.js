/** Mock: GET /api/ntrip/stations */
const STATIONS = [
  { id:'HARA',lat:-17.83,lon:31.05,name:'Harare',      receiver:'Leica GR50',antenna:'LEIAR25 LEIT',constellations:['GPS','GLONASS','Galileo','BeiDou'],health:'healthy' },
  { id:'BULA',lat:-20.15,lon:28.58,name:'Bulawayo',    receiver:'Leica GR50',antenna:'LEIAR25 LEIT',constellations:['GPS','GLONASS','Galileo','BeiDou'],health:'healthy' },
  { id:'MUTA',lat:-18.97,lon:32.65,name:'Mutare',      receiver:'Leica GR50',antenna:'LEIAR25 LEIT',constellations:['GPS','GLONASS','Galileo','BeiDou'],health:'healthy' },
  { id:'GWER',lat:-19.45,lon:29.82,name:'Gweru',       receiver:'Leica GR50',antenna:'LEIAR25 LEIT',constellations:['GPS','GLONASS','Galileo'],         health:'degraded'},
  { id:'MARA',lat:-18.19,lon:31.55,name:'Marondera',   receiver:'Leica GR30',antenna:'LEIAR20 LEIT',constellations:['GPS','GLONASS','Galileo'],         health:'healthy' },
  { id:'KWEK',lat:-18.93,lon:29.81,name:'Kwekwe',      receiver:'Trimble NetR9',antenna:'TRM59900.00',constellations:['GPS','GLONASS'],                 health:'degraded'},
  { id:'CHIT',lat:-18.00,lon:31.08,name:'Chitungwiza', receiver:'Leica GR50',antenna:'LEIAR25 LEIT',constellations:['GPS','GLONASS','Galileo','BeiDou'],health:'healthy' },
  { id:'MSVG',lat:-20.07,lon:30.83,name:'Masvingo',    receiver:'Leica GR25',antenna:'LEIAR10 LEIT',constellations:['GPS','GLONASS'],                   health:'degraded'},
  { id:'KADO',lat:-18.34,lon:29.90,name:'Kadoma',      receiver:'Leica GR50',antenna:'LEIAR25 LEIT',constellations:['GPS','GLONASS','Galileo','BeiDou'],health:'offline' },
  { id:'BIND',lat:-17.30,lon:31.33,name:'Bindura',     receiver:'Leica GR30',antenna:'LEIAR20 LEIT',constellations:['GPS','GLONASS','Galileo'],         health:'healthy' },
  { id:'CENT',lat:-16.74,lon:31.13,name:'Centenary',   receiver:'Leica GR50',antenna:'LEIAR25 LEIT',constellations:['GPS','GLONASS','Galileo','BeiDou'],health:'offline' },
  { id:'CHIR',lat:-20.20,lon:32.63,name:'Chipinge',    receiver:'Leica GR30',antenna:'LEIAR20 LEIT',constellations:['GPS','GLONASS','Galileo'],         health:'degraded'},
];

export default function handler(_req, res) {
  res.json({
    stations: STATIONS.map(s => ({
      stationId:      s.id,
      stationName:    s.name,
      lat:            s.lat,
      lon:            s.lon,
      height:         1400 + Math.abs(s.lat) * 10,
      receiverModel:  s.receiver,
      antennaModel:   s.antenna,
      constellations: s.constellations,
      health:         s.health,
      mountpoint:     `${s.id}_RTCM3`,
      network:        'ZINGSA',
      country:        'ZWE',
    })),
    total: STATIONS.length,
    mode:  'demo',
  });
}
