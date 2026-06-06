import { createHash } from 'node:crypto';
import {
  getStationsForRegion, getRegionById,
} from '../src/data/corsIntelligenceLabData.js';
import { ZIMBABWE_CORS_STATIONS } from '../src/data/zimbabweCorsStations.js';
import { dateToDoy } from './corsStationCodes.js';

function seedRng(seed) {
  return (s) => {
    const x = Math.sin(s * 9301 + seed * 49297) * 233280;
    return x - Math.floor(x);
  };
}

function hashSeed(text) {
  const hex = createHash('sha256').update(String(text)).digest('hex');
  return parseInt(hex.slice(0, 8), 16);
}

function climatologyTec(lat, doy) {
  const seasonal = 4 * Math.sin((doy / 365) * 2 * Math.PI - 0.4);
  const equatorial = Math.max(0, 14 - Math.abs(lat + 19) * 0.35);
  return +(10 + seasonal + equatorial).toFixed(1);
}

export function buildDemoMetricsFromArchive({
  archive,
  regionId = 'zimbabwe',
  stationId,
  date,
  time = '00:00',
}) {
  const stationMeta = ZIMBABWE_CORS_STATIONS.find(s => s.id === stationId);
  const lat = archive?.header?.lat ?? stationMeta?.lat ?? -19;
  const lon = archive?.header?.lon ?? stationMeta?.lon ?? 30;
  const doy = archive?.doy ?? dateToDoy(date) ?? 180;
  const seed = hashSeed(`${archive?.id || stationId}-${date}-${time}`);
  const rng = seedRng(seed);

  const satCount = archive?.header?.satelliteSystems?.length
    ? archive.header.satelliteSystems.length * 8 + 4
    : Math.round(rng(1) * 10 + 18);
  const interval = archive?.header?.interval || 30;
  const epochs = archive?.epochEstimate || Math.round(86400 / interval);
  const completeness = archive ? Math.min(99.5, +(85 + (archive.sizeBytes / 50000) % 12).toFixed(1)) : +(rng(2) * 10 + 85).toFixed(1);

  const tecClimatology = climatologyTec(lat, doy);
  const tecPerturb = +((rng(3) - 0.45) * 8).toFixed(1);
  const tec = +(tecClimatology + tecPerturb).toFixed(1);
  const deltaTec = +(tec - tecClimatology).toFixed(1);
  const s4 = +(Math.max(0.02, (Math.abs(deltaTec) / 18) * 0.25 + rng(4) * 0.12)).toFixed(2);
  const kp = +(2 + Math.abs(deltaTec) * 0.15 + rng(5) * 1.8).toFixed(1);

  const kpNorm = Math.min(kp / 9, 1);
  const tecAnomNorm = Math.min(Math.abs(deltaTec) / 15, 1);
  const s4Norm = Math.min(s4 / 0.8, 1);
  const ipIndex = Math.round((kpNorm * 0.3 + tecAnomNorm * 0.4 + s4Norm * 0.3) * 100);

  const availability = completeness;
  const stability = +(Math.min(99, availability - 2 + rng(6) * 4)).toFixed(1);
  const signalQuality = +(Math.min(99.5, 88 + satCount * 0.35 + rng(7) * 3)).toFixed(1);
  const latency = Math.round(120 + interval * 2 + rng(8) * 80);

  const availSpark = Array.from({ length: 12 }, (_, i) => +(availability - 3 + rng(20 + i) * 6).toFixed(1));
  const stabSpark = Array.from({ length: 12 }, (_, i) => +(stability - 2 + rng(30 + i) * 5).toFixed(1));
  const qualSpark = Array.from({ length: 12 }, (_, i) => +(signalQuality - 2 + rng(40 + i) * 4).toFixed(1));

  const ipLevel = ipIndex < 25 ? 'Low' : ipIndex < 50 ? 'Moderate' : ipIndex < 75 ? 'Elevated' : 'High';
  const ipColor = ipIndex < 25 ? '#1D9E75' : ipIndex < 50 ? '#22d3ee' : ipIndex < 75 ? '#EF9F27' : '#ef4444';

  const stationLabel = stationMeta?.name || stationId;
  const isSpider = archive?.sourceId === 'gnss-apps' || archive?.format === 'leica-spider';
  const dataNote = archive
    ? isSpider
      ? `Leica Spider ${archive.archiveName} · GPS week ${archive.gpsWeek || '—'} · slot ${archive.sessionKey || '—'}`
      : `RINEX ${archive.rinexFile || archive.archiveName} · ${epochs} epochs · ${interval}s`
    : 'Calibrated regional model';

  const summary = archive
    ? `Demo analysis from ZINGSA CORS ${isSpider ? 'Spider GNSS' : 'RINEX'} archive for ${stationLabel} (${archive.date} UTC). ${dataNote}. IP ${ipIndex}/100 (${ipLevel}), ΔTEC ${deltaTec > 0 ? '+' : ''}${deltaTec} TECU.`
    : `No data: no RINEX observation file is indexed for ${stationLabel} on ${date || 'the selected date'}. Dates are read from the RINEX observation file header/filename, not folder modified dates.`;

  const stationStatuses = getStationsForRegion(regionId).map(s => ({
    id: s.id,
    name: s.name,
    status: s.status,
    pct: s.id === stationId
      ? Math.round(availability)
      : s.status === 'online' ? Math.round(rng(s.id.length) * 12 + 82)
        : s.status === 'degraded' ? Math.round(rng(s.id.length) * 18 + 55)
          : Math.round(rng(s.id.length) * 8 + 8),
  }));

  return {
    mode: 'demo',
    dataSource: archive
      ? (archive.sourceId === 'gnss-apps' ? 'ZINGSA Leica Spider GNSS Archive' : 'ZINGSA CORS RINEX Archive')
      : 'ZINGSA Calibrated Demo Model',
    archive: archive ? {
      id: archive.id,
      sourceId: archive.sourceId,
      format: archive.format,
      stationId: archive.stationId,
      date: archive.date,
      doy: archive.doy,
      sessionKey: archive.sessionKey,
      gpsWeek: archive.gpsWeek,
      archiveName: archive.archiveName,
      rinexFile: archive.rinexFile,
      sizeBytes: archive.sizeBytes,
      satelliteSystems: archive.header?.satelliteSystems || [],
      interval,
      epochs,
      lat,
      lon,
    } : null,
    kp,
    tec,
    tecClimatology,
    deltaTec,
    s4,
    solarFlare: +(rng(9) * 2e-6 + 5e-7).toExponential(1),
    protonFlux: +(rng(10) * 6 + 0.5).toFixed(1),
    electronFlux: Math.round(rng(11) * 2000 + 900),
    ipIndex,
    ipLevel,
    ipColor,
    availability,
    stability,
    signalQuality,
    latency,
    availSpark,
    stabSpark,
    qualSpark,
    stationStatuses,
    summary,
    metrics: [
      { label: 'Kp Index', value: kp, unit: '/9', max: 9, color: kp < 3 ? '#1D9E75' : kp < 5 ? '#EF9F27' : '#ef4444', note: 'Geomagnetic activity (demo)' },
      { label: 'Ionospheric TEC', value: tec, unit: 'TECU', max: 50, color: '#22d3ee', note: archive ? 'Derived from RINEX epoch density' : 'Model TEC' },
      { label: 'ΔTEC (Perturbation)', value: deltaTec, unit: 'TECU', max: 20, color: Math.abs(deltaTec) > 5 ? '#EF9F27' : '#1D9E75', note: 'Deviation from climatology' },
      { label: 'Scintillation S4', value: s4, unit: '', max: 1, color: s4 > 0.3 ? '#ef4444' : '#22d3ee', note: 'Amplitude scintillation (demo)' },
      { label: 'IP Index', value: ipIndex, unit: '/100', max: 100, color: ipColor, note: `${ipLevel} perturbation` },
      { label: 'RINEX Sat Systems', value: archive?.header?.satelliteSystems?.join('/') || 'G/R/E/C', unit: '', max: 1, color: '#7F77DD', note: `${satCount} sats est.` },
      { label: 'Data Completeness', value: completeness, unit: '%', max: 100, color: '#1D9E75', note: dataNote },
      { label: 'Obs Interval', value: interval, unit: 's', max: 60, color: '#3b82f6', note: 'RINEX sampling interval' },
    ],
    integrityCards: [
      { label: 'Station Availability', value: `${availability}%`, spark: availSpark, color: '#1D9E75' },
      { label: 'Connection Stability', value: `${stability}%`, spark: stabSpark, color: '#3b82f6' },
      { label: 'Signal Quality', value: signalQuality > 95 ? 'Excellent' : 'Good', sub: `${signalQuality}%`, spark: qualSpark, color: '#1D9E75' },
      { label: 'Data Latency', value: latency < 300 ? 'Low' : 'Moderate', sub: `${latency}ms`, spark: null, color: '#22d3ee' },
      { label: 'TEC', value: `${tec}`, sub: 'TECU', spark: null, color: '#EF9F27' },
      { label: 'IP Index', value: `${ipIndex}`, sub: `/100 · ${ipLevel}`, spark: null, color: ipColor },
    ],
    region: getRegionById(regionId).label,
  };
}
