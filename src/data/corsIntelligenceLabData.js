/** ZINGSA CORS Intelligence Lab — regions, stations, IP metrics */

import { zimbabweStationsForLab } from './zimbabweCorsStations.js';

export const LAB_REGIONS = [
  { id: 'zimbabwe', label: 'Zimbabwe', code: 'ZW', mapRegion: 'southern', lat: -19.0, lng: 30.0 },
  { id: 'south-africa', label: 'South Africa', code: 'ZA', mapRegion: 'southern', lat: -25.7, lng: 28.2 },
  { id: 'kenya', label: 'Kenya', code: 'KE', mapRegion: 'east', lat: -1.3, lng: 36.8 },
  { id: 'rwanda', label: 'Rwanda', code: 'RW', mapRegion: 'equatorial', lat: -1.9, lng: 30.1 },
  { id: 'nigeria', label: 'Nigeria', code: 'NG', mapRegion: 'west', lat: 9.1, lng: 7.5 },
  { id: 'ghana', label: 'Ghana', code: 'GH', mapRegion: 'west', lat: 7.9, lng: -1.0 },
  { id: 'ethiopia', label: 'Ethiopia', code: 'ET', mapRegion: 'east', lat: 9.0, lng: 38.7 },
  { id: 'tunisia', label: 'Tunisia', code: 'TN', mapRegion: 'north', lat: 36.8, lng: 10.2 },
  { id: 'madagascar', label: 'Madagascar', code: 'MG', mapRegion: 'equatorial', lat: -18.9, lng: 47.5 },
  { id: 'morocco', label: 'Morocco', code: 'MA', mapRegion: 'north', lat: 33.9, lng: -6.8 },
];

export const LAB_STATIONS = {
  zimbabwe: zimbabweStationsForLab(),
  'south-africa': [
    { id: 'HRAO', name: 'Station-Hartebeesthoek', status: 'online' },
    { id: 'CPTN', name: 'Station-CapeTown', status: 'online' },
  ],
  kenya: [
    { id: 'NRB1', name: 'Station-Nairobi', status: 'online' },
    { id: 'MOMB', name: 'Station-Mombasa', status: 'online' },
  ],
  rwanda: [
    { id: 'KIGA', name: 'Station-Kigali', status: 'online' },
    { id: 'NYAG', name: 'Station-Nyagatare', status: 'online' },
  ],
  nigeria: [
    { id: 'LAGO', name: 'Station-Lagos', status: 'online' },
    { id: 'ABUJ', name: 'Station-Abuja', status: 'online' },
  ],
  ghana: [
    { id: 'ACCR', name: 'Station-Accra', status: 'online' },
    { id: 'KUMA', name: 'Station-Kumasi', status: 'online' },
  ],
  ethiopia: [
    { id: 'ADIS', name: 'Station-AddisAbaba', status: 'online' },
    { id: 'DIRD', name: 'Station-DireDawa', status: 'online' },
  ],
  tunisia: [
    { id: 'TUNI', name: 'Station-Tunis', status: 'online' },
    { id: 'PUNT', name: 'Station-Puntius', status: 'online' },
  ],
  madagascar: [
    { id: 'ANTA', name: 'Station-Antananarivo', status: 'offline' },
    { id: 'TOAM', name: 'Station-Toamasina', status: 'offline' },
    { id: 'MAHA', name: 'Station-Mahajanga', status: 'offline' },
  ],
  morocco: [
    { id: 'CASA', name: 'Station-Casablanca', status: 'online' },
    { id: 'RABA', name: 'Station-Rabat', status: 'online' },
  ],
};

export const ANALYSIS_TABS = [
  { id: 'monitoring', label: 'Region Monitoring' },
  { id: 'emergency', label: 'Emergency Response' },
  { id: 'crop-marine', label: 'Crop & Marine Security' },
];

export const ANALYSIS_METHODS = [
  { id: 'location', tab: 'monitoring', icon: '📍', title: 'Location-based analysis', desc: 'CORS and ionospheric analysis for a specific African region or ZINGSA station corridor.' },
  { id: 'emergency', tab: 'emergency', icon: '🚨', title: 'Emergency Response', desc: 'Rapid GNSS integrity and space weather assessment for floods, fires, and disaster zones.' },
  { id: 'crop-marine', tab: 'crop-marine', icon: '🌾', title: 'Crop & Marine Security', desc: 'Precision agriculture and maritime positioning risk from ionospheric perturbations.' },
  { id: 'monitoring', tab: 'monitoring', icon: '📡', title: 'Monitoring & Analysis', desc: 'Real-time CORS health, TEC, scintillation, and ionospheric perturbation (IP) index.' },
];

export const PORTAL_LINKS = [
  { label: 'ZINGSA', url: 'https://zingsa.org.zw/' },
  { label: 'SANSA Space Weather', url: 'https://spaceweather.sansa.org.za/' },
  { label: 'NOAA Space Weather', url: 'https://www.swpc.noaa.gov/' },
  { label: 'GNSS Data (CDDIS)', url: 'https://cddis.nasa.gov/' },
  { label: 'AFREF Network', url: 'https://www.afrefdata.org/' },
];

function seedRng(seed) {
  return (s) => Math.abs(Math.sin(s * 9301 + seed * 49297) * 23567) % 1;
}

export function getRegionById(id) {
  return LAB_REGIONS.find(r => r.id === id) || LAB_REGIONS[0];
}

export function getStationsForRegion(regionId) {
  return LAB_STATIONS[regionId] || [];
}

export function getLiveErrorForRegion(regionId, liveMode) {
  if (!liveMode) return null;
  if (regionId === 'madagascar') {
    return {
      type: 'LIVE ERROR',
      message: 'Data streams from the CORS network in the selected region of Madagascar (MG) are currently unavailable. CORS stations affected: Antananarivo, Toamasina, Mahajanga.',
    };
  }
  return null;
}

export function generateDemoIPMetrics(regionId, stationId) {
  const seed = [...(regionId + stationId)].reduce((a, c, i) => a + c.charCodeAt(0) * (i + 1), 0);
  const rng = seedRng(seed);

  const kp = +(rng(1) * 4 + 1.5).toFixed(1);
  const tec = +(rng(2) * 18 + 8).toFixed(1);
  const tecClimatology = +(rng(3) * 6 + 10).toFixed(1);
  const deltaTec = +(tec - tecClimatology).toFixed(1);
  const s4 = +(rng(4) * 0.35 + 0.05).toFixed(2);
  const solarFlare = +(rng(5) * 2e-6 + 5e-7).toExponential(1);
  const protonFlux = +(rng(6) * 8 + 0.5).toFixed(1);
  const electronFlux = Math.round(rng(7) * 2500 + 800);

  const kpNorm = Math.min(kp / 9, 1);
  const tecAnomNorm = Math.min(Math.abs(deltaTec) / 15, 1);
  const s4Norm = Math.min(s4 / 0.8, 1);
  const ipIndex = Math.round((kpNorm * 0.35 + tecAnomNorm * 0.35 + s4Norm * 0.3) * 100);

  const availability = +(rng(8) * 12 + 80).toFixed(1);
  const stability = +(rng(9) * 10 + 88).toFixed(1);
  const signalQuality = +(rng(10) * 8 + 92).toFixed(1);
  const latency = Math.round(rng(11) * 180 + 120);

  const availSpark = Array.from({ length: 12 }, (_, i) => +(rng(20 + i) * 8 + availability - 4).toFixed(1));
  const stabSpark = Array.from({ length: 12 }, (_, i) => +(rng(30 + i) * 6 + stability - 3).toFixed(1));
  const qualSpark = Array.from({ length: 12 }, (_, i) => +(rng(40 + i) * 5 + signalQuality - 2).toFixed(1));

  const stationStatuses = getStationsForRegion(regionId).map(s => ({
    id: s.id,
    name: s.name,
    status: s.status,
    pct: s.status === 'online' ? Math.round(rng(s.id.length) * 15 + 82)
      : s.status === 'degraded' ? Math.round(rng(s.id.length) * 20 + 55)
        : Math.round(rng(s.id.length) * 10 + 5),
  }));

  const ipLevel = ipIndex < 25 ? 'Low' : ipIndex < 50 ? 'Moderate' : ipIndex < 75 ? 'Elevated' : 'High';
  const ipColor = ipIndex < 25 ? '#1D9E75' : ipIndex < 50 ? '#22d3ee' : ipIndex < 75 ? '#EF9F27' : '#ef4444';

  const stationLabel = String(stationId).replace(/Station-/, '').split(' (')[0];
  const summary = ipIndex < 30
    ? `CORS integrity is stable for ${stationLabel}. Ionospheric perturbation index is low (${ipIndex}/100). Minor signal quality variations may occur around local dusk.`
    : ipIndex < 60
      ? `CORS integrity satisfactory with moderate IP ${ipIndex}/100. ΔTEC ${deltaTec > 0 ? '+' : ''}${deltaTec} TECU. Monitor S4=${s4} during evening hours.`
      : `Elevated IP ${ipIndex}/100 over ${getRegionById(regionId).label}. Verify RTK fixes. ΔTEC=${deltaTec > 0 ? '+' : ''}${deltaTec} TECU, Kp=${kp}/9.`;

  return {
    mode: 'demo', kp, tec, tecClimatology, deltaTec, s4, solarFlare, protonFlux, electronFlux,
    ipIndex, ipLevel, ipColor, availability, stability, signalQuality, latency,
    availSpark, stabSpark, qualSpark, stationStatuses, summary,
    metrics: [
      { label: 'Kp Index', value: kp, unit: '/9', max: 9, color: kp < 3 ? '#1D9E75' : kp < 5 ? '#EF9F27' : '#ef4444', note: 'Geomagnetic activity' },
      { label: 'Ionospheric TEC', value: tec, unit: 'TECU', max: 50, color: '#22d3ee', note: 'Total electron content' },
      { label: 'ΔTEC (Perturbation)', value: deltaTec, unit: 'TECU', max: 20, color: Math.abs(deltaTec) > 5 ? '#EF9F27' : '#1D9E75', note: 'Deviation from climatology' },
      { label: 'Scintillation S4', value: s4, unit: '', max: 1, color: s4 > 0.3 ? '#ef4444' : '#22d3ee', note: 'Amplitude scintillation' },
      { label: 'IP Index', value: ipIndex, unit: '/100', max: 100, color: ipColor, note: `${ipLevel} perturbation` },
      { label: 'Solar Flare Flux', value: solarFlare, unit: 'W/m²', max: 1e-5, color: '#EF9F27', note: 'GOES X-ray flux' },
      { label: 'Proton Flux', value: protonFlux, unit: 'pfu', max: 100, color: '#7F77DD', note: '≥10 MeV protons' },
      { label: 'Electron Flux', value: electronFlux, unit: 'pfu', max: 5000, color: '#3b82f6', note: '≥2 MeV electrons' },
    ],
    integrityCards: [
      { label: 'Station Availability', value: `${availability}%`, spark: availSpark, color: '#1D9E75' },
      { label: 'Connection Stability', value: `${stability}%`, spark: stabSpark, color: '#3b82f6' },
      { label: 'Signal Quality', value: signalQuality > 95 ? 'Excellent' : 'Good', sub: `${signalQuality}%`, spark: qualSpark, color: '#1D9E75' },
      { label: 'Data Latency', value: latency < 300 ? 'Low' : 'Moderate', sub: `${latency}ms`, spark: null, color: '#22d3ee' },
      { label: 'TEC', value: `${tec}`, sub: 'TECU', spark: null, color: '#EF9F27' },
      { label: 'IP Index', value: `${ipIndex}`, sub: `/100 · ${ipLevel}`, spark: null, color: ipColor },
    ],
  };
}

export function buildLiveIPMetrics(noaaData, stationHealth, regionId, stationId) {
  const demo = generateDemoIPMetrics(regionId, stationId);
  const kp = noaaData?.kp_index ?? demo.kp;
  const deltaTec = demo.deltaTec;
  const s4 = demo.s4;

  const kpNorm = Math.min(kp / 9, 1);
  const tecAnomNorm = Math.min(Math.abs(deltaTec) / 15, 1);
  const s4Norm = Math.min(s4 / 0.8, 1);
  const ipIndex = Math.round((kpNorm * 0.4 + tecAnomNorm * 0.3 + s4Norm * 0.3) * 100);
  const ipLevel = ipIndex < 25 ? 'Low' : ipIndex < 50 ? 'Moderate' : ipIndex < 75 ? 'Elevated' : 'High';
  const ipColor = ipIndex < 25 ? '#1D9E75' : ipIndex < 50 ? '#22d3ee' : ipIndex < 75 ? '#EF9F27' : '#ef4444';

  const health = stationHealth?.network_health ?? demo.availability;
  const stations = stationHealth?.stations || [];

  const stationStatuses = getStationsForRegion(regionId).map(s => {
    const live = stations.find(st => st.station_id === s.id);
    return {
      id: s.id,
      name: s.name,
      status: live?.status === 'OFFLINE' ? 'offline' : live?.status === 'DEGRADED' ? 'degraded' : s.status,
      pct: live ? (live.status === 'ONLINE' ? 95 : live.status === 'DEGRADED' ? 60 : 20) : (s.status === 'online' ? 90 : 20),
    };
  });

  return {
    ...demo, mode: 'live', kp, ipIndex, ipLevel, ipColor, availability: health, stationStatuses,
    dataSource: noaaData?.data_source || 'NOAA SWPC',
    summary: `Live: Kp=${kp.toFixed(1)} (${noaaData?.kp_level || 'current'}). IP ${ipIndex}/100 (${ipLevel}). CORS health ${health}%.`,
    metrics: demo.metrics.map(m => {
      if (m.label === 'Kp Index') return { ...m, value: kp, color: kp < 3 ? '#1D9E75' : kp < 5 ? '#EF9F27' : '#ef4444' };
      if (m.label === 'IP Index') return { ...m, value: ipIndex, color: ipColor, note: `${ipLevel} perturbation (live)` };
      return m;
    }),
    integrityCards: demo.integrityCards.map(c => {
      if (c.label === 'Station Availability') return { ...c, value: `${health}%` };
      if (c.label === 'IP Index') return { ...c, value: `${ipIndex}`, sub: `/100 · ${ipLevel}`, color: ipColor };
      return c;
    }),
  };
}
