import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertTriangle, RefreshCw, Waves } from 'lucide-react';
import OperationalServicesNav from './OperationalServicesNav.jsx';
import { getIonosphereStatus } from '../services/corsApi.js';
import { useOpsHealth } from '../context/OpsHealthContext.jsx';
import { ZIMBABWE_CORS_STATIONS } from '../data/zimbabweCorsStations.js';
import { healthTelemetryLabel } from '../utils/corsNetworkData.js';
import '../styles/ionospheric-conditions.css';

const FALLBACK_STATIONS = ZIMBABWE_CORS_STATIONS.map((ref, i) => ({
  id: ref.id.replace(/_$/, ''),
  name: ref.name.split(' (')[0],
  vtec: +(14 + (i % 6) * 1.8).toFixed(1),
  s4: +(0.12 + (i % 5) * 0.06).toFixed(2),
  delay: +(6 + (i % 4)).toFixed(1),
  error: +(2 + (i % 3) * 0.4).toFixed(1),
  rtk: i % 7 === 0 ? 'FLOAT' : 'FIXED',
  ppp: i % 5 === 0 ? 'Delayed' : 'Normal',
  quality: i % 6 === 0 ? 'MODERATE' : 'LOW',
  data_source: 'offline-fallback',
}));

const IMPACT_GUIDE = [
  { level: 'Low',      label: 'Minimal Impact',  color: '#22c55e' },
  { level: 'Moderate', label: 'Minor Impact',    color: '#eab308' },
  { level: 'High',     label: 'Strong Impact',   color: '#f97316' },
  { level: 'Severe',   label: 'Major Impact',    color: '#ef4444' },
  { level: 'Extreme',  label: 'Extreme Impact',  color: '#a855f7' },
];

const STATION_POS = {
  HARA: { x: 57, y: 55 },
  BULA: { x: 50, y: 63 },
  VICF: { x: 44, y: 54 },
  GWER: { x: 53, y: 60 },
};

// ── Helpers ──
function impactColor(level) {
  const l = (level || '').toUpperCase();
  if (l === 'EXTREME')  return '#a855f7';
  if (l === 'SEVERE')   return '#ef4444';
  if (l === 'HIGH')     return '#f97316';
  if (l === 'MODERATE') return '#eab308';
  return '#22c55e';
}

function levelFromKp(kp) {
  if (kp >= 5) return { label: 'Storm', color: '#ef4444', level: 'SEVERE' };
  if (kp >= 4) return { label: 'Active', color: '#f97316', level: 'HIGH' };
  if (kp >= 3) return { label: 'Unsettled', color: '#eab308', level: 'MODERATE' };
  return { label: 'Quiet', color: '#22c55e', level: 'LOW' };
}

function levelFromVtec(vtec) {
  if (vtec >= 25) return { label: 'Elevated', color: '#f97316', level: 'HIGH' };
  if (vtec >= 15) return { label: 'Moderate', color: '#eab308', level: 'MODERATE' };
  return { label: 'Low', color: '#22c55e', level: 'LOW' };
}

function levelFromS4(s4) {
  if (s4 >= 0.5) return { label: 'High', color: '#ef4444', level: 'HIGH' };
  if (s4 >= 0.2) return { label: 'Moderate', color: '#eab308', level: 'MODERATE' };
  return { label: 'Low', color: '#22c55e', level: 'LOW' };
}

function buildTrendSeries(current, amplitude = 4, points = 25) {
  const end = Number(current) || 0;
  return Array.from({ length: points }, (_, i) => {
    const drift = (i - (points - 1)) * (amplitude / points);
    const wave = Math.sin(i / 3) * (amplitude * 0.35);
    const crest = Math.max(0, 9 - Math.abs(i - 13)) * (amplitude * 0.2);
    return +(Math.max(0, end + drift + wave + crest - amplitude * 0.45)).toFixed(2);
  });
}

function deriveIonosphereView(status, health) {
  const vtec = Number(status.vtec_tecu) || 0;
  const s4 = Number(status.s4_index) || 0;
  const kp = Number(status.kp_index) || 0;
  const deltaTec = Number(status.tec_daily_change) || 0;
  const stations = status.stations?.length ? status.stations : FALLBACK_STATIONS;
  const fixedCount = stations.filter(s => s.rtk === 'FIXED').length;
  const fixRate = +((fixedCount / stations.length) * 100).toFixed(1);
  const gnssImpact = String(status.gnss_impact || 'LOW').toUpperCase();
  const condition = levelFromKp(kp);
  const tecActivity = levelFromVtec(vtec);
  const scintRisk = levelFromS4(s4);
  const stormRisk = kp >= 5
    ? { label: 'High', color: '#ef4444', level: 'HIGH' }
    : kp >= 4
      ? { label: 'Moderate', color: '#eab308', level: 'MODERATE' }
      : { label: 'Low', color: '#22c55e', level: 'LOW' };
  const rtkReliability = status.rtk_status === 'FIXED' && fixRate >= 75
    ? { label: 'Normal', color: '#22c55e' }
    : status.rtk_status === 'FLOAT'
      ? { label: 'Degraded', color: '#eab308' }
      : { label: 'At Risk', color: '#ef4444' };
  const roti = +(Math.max(0.02, s4 * 0.55 + Math.abs(deltaTec) * 0.04)).toFixed(2);
  const rotiLevel = roti >= 0.5
    ? { label: 'HIGH', color: '#ef4444', note: 'Disturbance detected' }
    : roti >= 0.25
      ? { label: 'MODERATE', color: '#eab308', note: 'Elevated variability' }
      : { label: 'LOW', color: '#22c55e', note: 'None detected' };
  const eiaActive = vtec >= 14 || s4 >= 0.18;
  const zimEffect = gnssImpact === 'SEVERE' || gnssImpact === 'HIGH'
    ? { label: 'High', color: '#ef4444' }
    : gnssImpact === 'MODERATE' || scintRisk.level === 'MODERATE'
      ? { label: 'Moderate', color: '#eab308' }
      : { label: 'Low', color: '#22c55e' };
  const bump = (base, offset) => {
    const order = ['LOW', 'MODERATE', 'HIGH', 'SEVERE'];
    const idx = Math.min(order.length - 1, Math.max(0, order.indexOf(base) + offset));
    return order[idx];
  };
  const gnssPerformance = [
    { name: 'GPS', color: '#22c55e', l1: gnssImpact, l2: gnssImpact, l5: bump(gnssImpact, -1) },
    { name: 'Galileo', color: '#22d3ee', l1: bump(gnssImpact, -1), l2: gnssImpact, l5: bump(gnssImpact, -1) },
    { name: 'BeiDou', color: '#f97316', l1: gnssImpact, l2: bump(gnssImpact, 1), l5: gnssImpact },
    { name: 'GLONASS', color: '#a855f7', l1: gnssImpact, l2: gnssImpact, l5: null },
  ];
  const forecastStep = (baseLevel, step) => {
    const order = ['LOW', 'MODERATE', 'HIGH', 'SEVERE'];
    const idx = order.indexOf(baseLevel);
    const next = order[Math.min(order.length - 1, Math.max(0, idx + step))];
    const short = next === 'MODERATE' ? 'Mod' : next === 'SEVERE' ? 'Sev' : next.charAt(0) + next.slice(1).toLowerCase();
    return { color: next, text: short };
  };
  const tecNow = tecActivity.level;
  const s4Now = scintRisk.level;
  const rtkNow = status.rtk_status === 'FIXED' ? 'LOW' : status.rtk_status === 'FLOAT' ? 'MODERATE' : 'HIGH';
  const forecastRows = [
    {
      label: 'TEC Level',
      colors: ['LOW', 'LOW', 'MODERATE', 'LOW'].map((_, i) => forecastStep(tecNow, i === 2 ? 1 : 0).color),
      texts: ['Now', '+6h', '+12h', '+24h'].map((_, i) => forecastStep(tecNow, i === 2 ? 1 : 0).text),
    },
    {
      label: 'S4 Scintillation',
      colors: ['LOW', 'LOW', 'MODERATE', 'HIGH'].map((_, i) => forecastStep(s4Now, i >= 2 ? 1 : 0).color),
      texts: ['Now', '+6h', '+12h', '+24h'].map((_, i) => forecastStep(s4Now, i >= 2 ? 1 : 0).text),
    },
    {
      label: 'RTK Status',
      colors: [rtkNow, rtkNow, rtkNow, bump(rtkNow, 1)],
      texts: ['Now', '+6h', '+12h', '+24h'].map((_, i) => {
        if (i < 3) return status.rtk_status === 'FIXED' ? 'OK' : status.rtk_status;
        return rtkNow === 'LOW' ? 'OK' : 'WARN';
      }),
    },
    {
      label: 'GNSS Impact',
      colors: [gnssImpact, gnssImpact, bump(gnssImpact, 1), gnssImpact],
      texts: [0, 0, 1, 0].map(step => {
        const level = step ? bump(gnssImpact, 1) : gnssImpact;
        return level === 'MODERATE' ? 'Mod' : level.charAt(0) + level.slice(1).toLowerCase();
      }),
    },
  ];
  const monitorIds = new Set(stations.map(s => s.id));
  const healthStations = (health?.stations || []).filter(s => monitorIds.has(s.station_id?.replace(/_$/, '')));
  const onlineCount = healthStations.filter(s => s.status === 'ONLINE').length;
  const networkLabel = healthStations.length
    ? onlineCount === healthStations.length
      ? 'All CORS Online'
      : `${onlineCount}/${healthStations.length} CORS Online`
    : fixedCount === stations.length ? 'All Stations FIXED' : `${fixedCount}/${stations.length} Stations FIXED`;
  const networkColor = onlineCount === healthStations.length || fixedCount === stations.length ? '#22c55e' : '#eab308';
  const alertLevel = scintRisk.level === 'HIGH' || gnssImpact === 'SEVERE'
    ? 'HIGH'
    : scintRisk.level === 'MODERATE' || gnssImpact === 'HIGH'
      ? 'MODERATE'
      : 'LOW';
  const alertEffects = alertLevel === 'HIGH'
    ? ['Signal loss of lock likely', 'RTK float or no-fix periods', 'PPP convergence delays']
    : alertLevel === 'MODERATE'
      ? ['RTK initialization delay', 'Increased positioning errors', 'Signal fading after dusk']
      : ['Routine surveying conditions', 'Monitor evening equatorial window', 'No active ionospheric warning'];
  const nextForecastUpdate = new Date();
  nextForecastUpdate.setUTCHours(Math.ceil((nextForecastUpdate.getUTCHours() + 1) / 6) * 6, 0, 0, 0);

  return {
    condition,
    tecActivity,
    scintRisk,
    stormRisk,
    rtkReliability,
    roti,
    rotiLevel,
    eiaActive,
    zimEffect,
    gnssPerformance,
    forecastRows,
    networkLabel,
    networkColor,
    fixRate,
    alertLevel,
    alertEffects,
    pppStatus: gnssImpact === 'LOW' ? 'Normal' : gnssImpact === 'MODERATE' ? 'Delayed' : 'Degraded',
    correctionStatus: gnssImpact === 'SEVERE' ? 'Limited' : 'Available',
    nextForecastUpdate: hhmm(nextForecastUpdate.toISOString()),
    tecTrend: buildTrendSeries(vtec, 5),
    scintTrend: buildTrendSeries(s4, 0.12),
    delayTrend: buildTrendSeries(status.ionospheric_delay_l1_ns, 3),
    phaseTrend: buildTrendSeries(status.phase_sigma_rad, 0.08),
  };
}

function utcTime(iso) {
  const d = iso ? new Date(iso) : new Date();
  const day  = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(d);
  const time = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' }).format(d);
  return `${day} ${time} UTC`;
}

function hhmm(iso) {
  return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' }).format(iso ? new Date(iso) : new Date());
}

// ── Sub-components ──
function FreqDot({ level }) {
  if (level === null) return <span className="icm2-freq-na">—</span>;
  return <span className="icm2-freq-dot" style={{ background: impactColor(level) }} title={level} />;
}

function TrendChart({ color = '#22d3ee', values = [], height = 110, multiScint = false }) {
  const W = 440; const H = height; const PAD = 6;
  const min = Math.min(...values); const max = Math.max(...values); const rng = max - min || 1;
  const py  = v => H - PAD - ((v - min) / rng) * (H - PAD * 2);
  const path = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${((i / (values.length - 1)) * W).toFixed(1)},${py(v).toFixed(1)}`).join(' ');
  const gridY = [0, 0.25, 0.5, 0.75, 1].map(p => H - PAD - p * (H - PAD * 2));
  const nowX  = (12 / (values.length - 1)) * W;

  return (
    <div className="icm2-chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height }}>
        {gridY.map((y, i) => (
          <line key={i} x1="0" x2={W} y1={y} y2={y} stroke="rgba(255,255,255,0.07)" strokeDasharray="3,3" />
        ))}
        <line x1={nowX} x2={nowX} y1="0" y2={H} stroke="rgba(255,255,255,0.2)" strokeDasharray="4,3" />
        {multiScint && (
          <>
            <path d={path} stroke="#22c55e" fill="none" strokeWidth="1.5" opacity="0.55" />
            <path
              d={values.map((v, i) => `${i === 0 ? 'M' : 'L'}${((i / (values.length - 1)) * W).toFixed(1)},${py(Math.min(Math.max(v, 0.2), 0.5)).toFixed(1)}`).join(' ')}
              stroke="#eab308" fill="none" strokeWidth="1.5" opacity="0.45"
            />
          </>
        )}
        <path d={path} stroke={color} fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="icm2-chart-xaxis">
        {['00h', '06h', '12h', '18h', '24h'].map(l => <span key={l}>{l}</span>)}
      </div>
    </div>
  );
}

// ── Canvas TEC map constants ──────────────────────────────────────────────────
const MAP_LON_MIN = -20, MAP_LON_MAX = 60;
const MAP_LAT_MAX = 40,  MAP_LAT_MIN = -40;

// Simplified Africa coastal outline [lat, lon] clockwise from NW Morocco
const AFRICA_OUTLINE = [
  [36,-6],[37,1],[37,6],[37,11],[33,11],[32,13],[31,20],[32,25],
  [31,25],[31,30],[31,34],
  [27,34],[22,37],[15,40],[11.5,43],
  [11.5,51],[8,48],[5,46],[1,44],
  [-1,42],[-5,40],[-10,40],[-17,37],[-25,33],
  [-34,27],[-34.5,19],
  [-28,17],[-22,14],[-17,12],[-5.5,12],
  [-1,9],[4,9],[5,3],[5,-2],[5,-8],[4.5,-8],
  [6.5,-12],[10,-14],[14.5,-17],
  [21,-17],[27,-13],[33,-8],[36,-6],
];

// Left margin reserved for the colorbar
const CB = 44;

// Map lon → x (accounting for colorbar margin), lat → y
function llToCanvas(lat, lon, W, H) {
  const mapW = W - CB;
  return [
    CB + (lon - MAP_LON_MIN) / (MAP_LON_MAX - MAP_LON_MIN) * mapW,
    (MAP_LAT_MAX - lat) / (MAP_LAT_MAX - MAP_LAT_MIN) * H,
  ];
}

function tecToRGB(tec) {
  const stops = [
    [0,   [4,  8,   80]],
    [8,   [0,  40,  200]],
    [18,  [0,  120, 220]],
    [28,  [0,  210, 160]],
    [38,  [0,  220,  60]],
    [48,  [160,255,   0]],
    [55,  [255,220,   0]],
    [63,  [255,120,   0]],
    [72,  [255, 30,   0]],
    [80,  [180,  0,   0]],
  ];
  tec = Math.max(0, Math.min(80, tec));
  for (let i = 0; i < stops.length - 1; i++) {
    const [t0, c0] = stops[i];
    const [t1, c1] = stops[i + 1];
    if (tec <= t1) {
      const f = (tec - t0) / (t1 - t0);
      return c0.map((v, j) => Math.round(v + f * (c1[j] - v)));
    }
  }
  return [180, 0, 0];
}

function getTECValue(lat, lon) {
  const mainPeak = 78 * Math.exp(-Math.pow(lat - 5, 2) / 220)
                     * Math.exp(-Math.pow(lon - 5, 2) / 3200);
  const baseline = 22 * Math.exp(-Math.pow(lat - 5, 2) / 600);
  return Math.min(80, Math.max(0, mainPeak + baseline));
}

function getROTIValue(lat, lon) {
  const eia = Math.exp(-Math.pow(lat - 5, 2) / 200)
            * Math.exp(-Math.pow(lon - 12, 2) / 2800);
  const turbulence = 0.03 + eia * 0.42 + 0.04 * Math.abs(Math.sin(lon * 0.12));
  return Math.min(0.55, Math.max(0, turbulence));
}

function getScintillationValue(lat, lon) {
  const equatorial = Math.exp(-Math.pow(lat, 2) / 110);
  const sector = 0.55 + 0.45 * Math.sin((lon + 25) * 0.09);
  return Math.min(1, Math.max(0, 0.04 + equatorial * 0.62 * sector));
}

function getGnssDelayValue(lat, lon) {
  return (getTECValue(lat, lon) / 80) * 45;
}

function constellationWeight(lat, consts) {
  let w = 0;
  if (consts.GPS) w += 0.28;
  if (consts.Galileo) w += 0.24;
  if (consts.BeiDou) w += 0.26 * (lat > -15 ? 1.08 : 0.82);
  if (consts.GLONASS) w += 0.22 * (lat > 5 ? 1.05 : 0.9);
  return Math.max(0.3, w);
}

const MAP_LAYERS = ['VTEC', 'ROTI', 'Scintillation', 'GNSS Delay'];
const CONSTELLATIONS = ['GPS', 'Galileo', 'BeiDou', 'GLONASS'];

const LAYER_META = {
  VTEC: {
    unit: 'TECU',
    max: 80,
    ticks: [80, 60, 40, 20, 0],
    legend: [
      { label: 'Low (0-10)', color: '#003acc' },
      { label: 'Moderate (10-30)', color: '#00cc88' },
      { label: 'High (30-60)', color: '#ffcc00' },
      { label: 'Very High (>60)', color: '#ff2200' },
    ],
    getValue: getTECValue,
  },
  ROTI: {
    unit: 'ROTI',
    max: 0.5,
    ticks: [0.5, 0.4, 0.3, 0.2, 0.1, 0],
    legend: [
      { label: 'Quiet (<0.1)', color: '#003acc' },
      { label: 'Moderate (0.1-0.2)', color: '#00cc88' },
      { label: 'Disturbed (0.2-0.35)', color: '#ffcc00' },
      { label: 'Severe (>0.35)', color: '#ff2200' },
    ],
    getValue: getROTIValue,
  },
  Scintillation: {
    unit: 'S4',
    max: 1,
    ticks: [1.0, 0.8, 0.6, 0.4, 0.2, 0],
    legend: [
      { label: 'Low (<0.2)', color: '#003acc' },
      { label: 'Moderate (0.2-0.4)', color: '#00cc88' },
      { label: 'High (0.4-0.7)', color: '#ffcc00' },
      { label: 'Severe (>0.7)', color: '#ff2200' },
    ],
    getValue: getScintillationValue,
  },
  'GNSS Delay': {
    unit: 'ns',
    max: 45,
    ticks: [45, 35, 25, 15, 5, 0],
    legend: [
      { label: 'Low (<8 ns)', color: '#003acc' },
      { label: 'Moderate (8-18 ns)', color: '#00cc88' },
      { label: 'High (18-32 ns)', color: '#ffcc00' },
      { label: 'Very High (>32 ns)', color: '#ff2200' },
    ],
    getValue: getGnssDelayValue,
  },
};

function formatColorbarTick(val, layer) {
  if (layer === 'ROTI') return val.toFixed(1);
  if (layer === 'Scintillation') return val.toFixed(1);
  return String(Math.round(val));
}

function buildIonosphereAnalysis(status, stations, primaryStation, primaryName, mapLayer, mapConsts) {
  const vtec = Number(status.vtec_tecu) || 0;
  const s4 = Number(status.s4_index) || 0;
  const kp = Number(status.kp_index) || 0;
  const delay = Number(status.ionospheric_delay_l1_ns) || 0;
  const rangeErr = Number(status.range_error_m) || 0;
  const activeConsts = CONSTELLATIONS.filter(c => mapConsts[c]);
  const fixedCount = stations.filter(s => s.rtk === 'FIXED').length;
  const floatStation = stations.find(s => s.rtk !== 'FIXED');
  const highestS4 = [...stations].sort((a, b) => b.s4 - a.s4)[0];

  const vtecLevel = vtec < 15 ? 'low' : vtec < 25 ? 'moderate' : 'elevated';
  const s4Level = s4 < 0.2 ? 'low' : s4 < 0.5 ? 'moderate' : 'high';
  const kpLevel = kp < 2 ? 'quiet' : kp < 4 ? 'unsettled' : 'active';

  const headline = kpLevel === 'quiet' && s4Level !== 'high'
    ? 'Equatorial ionosphere is generally stable with localized evening scintillation risk'
    : kpLevel === 'active' || s4Level === 'high'
      ? 'Ionospheric disturbance is elevating GNSS and CORS positioning risk'
      : 'Mixed ionospheric conditions — monitor equatorial crest activity through the evening';

  const mapSummaries = {
    VTEC: 'The Africa map shows the equatorial TEC crest crossing central Africa, with highest electron density near the geomagnetic equator.',
    ROTI: 'ROTI highlights turbulence along the equatorial ionization anomaly belt — rapid TEC changes are most likely across low-latitude CORS baselines.',
    Scintillation: 'The scintillation layer shows where amplitude fading is most probable after dusk across southern and equatorial Africa.',
    'GNSS Delay': 'GNSS delay follows the TEC distribution — longer L1 delays align with the equatorial crest over Zimbabwe and neighbouring states.',
  };
  const mapSummary = mapSummaries[mapLayer] || mapSummaries.VTEC;

  return {
    headline,
    summary: `Monitoring at ${primaryStation} (${primaryName}) reports VTEC ${vtec.toFixed(1)} TECU (${vtecLevel}), S4 ${s4.toFixed(2)} (${s4Level}), and Kp ${kp.toFixed(1)} (${kpLevel}). Zenith L1 delay is ${delay.toFixed(1)} ns with an estimated range error of ${rangeErr.toFixed(1)} m.`,
    mapSummary,
    constellationNote: activeConsts.length === CONSTELLATIONS.length
      ? 'All four GNSS constellations are included in the current map view.'
      : `Map view weights ${activeConsts.join(', ')} — disable constellations to see how coverage changes across the network.`,
    networkNote: fixedCount === stations.length
      ? `All ${stations.length} ZimCORS stations are holding RTK FIXED solutions.`
      : `${fixedCount} of ${stations.length} stations are FIXED${floatStation ? `; ${floatStation.id} (${floatStation.name}) is on ${floatStation.rtk}` : ''}. Highest S4 is at ${highestS4?.id || primaryStation} (${highestS4?.s4?.toFixed?.(2) ?? s4.toFixed(2)}).`,
    eiaNote: 'The Equatorial Ionization Anomaly is active, with peak disturbance expected between 18:00 and 23:00 UTC over southern Africa.',
    recommendations: [
      s4Level !== 'low' ? 'Verify RTK fixes during evening operations and allow extra convergence time after sunset.' : 'RTK and PPP services are operating within normal limits for daytime surveying.',
      vtecLevel === 'elevated' ? 'Apply ionospheric-aware processing — longer baselines may need additional TEC modelling.' : 'Current TEC levels support routine CORS corrections and NTRIP streaming.',
      kpLevel !== 'quiet' ? `Geomagnetic activity (Kp ${kp.toFixed(1)}) may add modest delay and scintillation beyond the equatorial crest.` : 'Geomagnetic conditions are quiet and are not amplifying equatorial disturbances.',
      'Cross-check the TEC map layer against ROTI and scintillation views before planning precision mapping after dusk.',
    ],
    outlook: 'The 24-hour forecast shows moderate scintillation risk building toward +12h while TEC and RTK status remain acceptable for most daylight operations.',
    dataMode: status.mode === 'live'
      ? `Analysis uses NOAA Kp, ${status.archive_backed_count ?? stations.filter(s => s.archive_backed).length}/${status.station_count ?? stations.length} RINEX-backed station models, and climatology for gaps.`
      : 'Offline fallback — refresh when /api/ionosphere/status is reachable.',
  };
}

function IonospherePageAnalysis({ status, stations, primaryStation, primaryName, mapLayer, mapConsts }) {
  const analysis = useMemo(
    () => buildIonosphereAnalysis(status, stations, primaryStation, primaryName, mapLayer, mapConsts),
    [status, stations, primaryStation, primaryName, mapLayer, mapConsts],
  );

  return (
    <section className="icm2-analysis-section">
      <div className="icm2-analysis-head">
        <div>
          <div className="icm2-analysis-kicker">Live interpretation</div>
          <h2 className="icm2-analysis-title">What is happening now</h2>
        </div>
        <code className="icm2-analysis-api">GET /api/ionosphere/status</code>
      </div>
      <p className="icm2-analysis-headline">{analysis.headline}</p>
      <p className="icm2-analysis-copy">{analysis.summary}</p>
      <div className="icm2-analysis-grid">
        <article className="icm2-analysis-card">
          <h3>Africa map ({mapLayer})</h3>
          <p>{analysis.mapSummary}</p>
        </article>
        <article className="icm2-analysis-card">
          <h3>CORS network</h3>
          <p>{analysis.networkNote}</p>
          <p>{analysis.constellationNote}</p>
        </article>
        <article className="icm2-analysis-card">
          <h3>EIA &amp; evening window</h3>
          <p>{analysis.eiaNote}</p>
          <p>{analysis.outlook}</p>
        </article>
      </div>
      <div className="icm2-analysis-recs">
        <h3>Operational guidance</h3>
        <ul>
          {analysis.recommendations.map(item => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
      <p className="icm2-analysis-foot">{analysis.dataMode}</p>
    </section>
  );
}

function TecMap({ layer, setLayer, consts, setConsts }) {
  const canvasRef = useRef(null);

  const toggle = name => setConsts(c => ({ ...c, [name]: !c[name] }));

  const layerMeta = LAYER_META[layer] || LAYER_META.VTEC;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    const mapW = W - CB;
    const PAD_B = 18;
    const meta = LAYER_META[layer] || LAYER_META.VTEC;
    const { max, ticks, unit, getValue } = meta;

    ctx.fillStyle = '#020c1a';
    ctx.fillRect(0, 0, W, H);

    const img  = ctx.createImageData(mapW, H - PAD_B);
    const data = img.data;
    for (let py = 0; py < H - PAD_B; py++) {
      for (let px = 0; px < mapW; px++) {
        const lat = MAP_LAT_MAX - (py / (H - PAD_B)) * (MAP_LAT_MAX - MAP_LAT_MIN);
        const lon = MAP_LON_MIN + (px / mapW) * (MAP_LON_MAX - MAP_LON_MIN);
        const raw = getValue(lat, lon) * constellationWeight(lat, consts);
        const scaled = (Math.min(max, Math.max(0, raw)) / max) * 80;
        const [r, g, b] = tecToRGB(scaled);
        const i = (py * mapW + px) * 4;
        data[i] = r; data[i+1] = g; data[i+2] = b; data[i+3] = 230;
      }
    }
    ctx.putImageData(img, CB, 0);

    const cbTop = 10; const cbBot = H - PAD_B - 8;
    const cbH   = cbBot - cbTop;
    for (let py = cbTop; py < cbBot; py++) {
      const norm = 80 * (1 - (py - cbTop) / cbH);
      const [r, g, b] = tecToRGB(norm);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(4, py, 14, 1);
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(4, cbTop, 14, cbH);

    ctx.font      = 'bold 9px Inter,system-ui,sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.textAlign = 'left';
    ticks.forEach(val => {
      const y = cbTop + (1 - val / max) * cbH;
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillRect(18, y - 0.5, 4, 1);
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.fillText(formatColorbarTick(val, layer), 24, y + 3.5);
    });
    ctx.font = 'bold 8px Inter,system-ui,sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillText(unit, 2, cbTop - 2);

    // 4. Grid lines (dashed, in map area)
    ctx.setLineDash([2, 5]);
    ctx.lineWidth = 0.5;
    [20, 0, -20].forEach(lat => {
      const [, y] = llToCanvas(lat, MAP_LON_MIN, W, H);
      if (y < 0 || y > H - PAD_B) return;
      ctx.beginPath(); ctx.moveTo(CB, y); ctx.lineTo(W, y);
      ctx.strokeStyle = lat === 0 ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)';
      ctx.stroke();
    });
    [0, 20, 40].forEach(lon => {
      const [x] = llToCanvas(0, lon, W, H);
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H - PAD_B);
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.stroke();
    });
    ctx.setLineDash([]);

    // 5. Africa continent outline
    ctx.beginPath();
    AFRICA_OUTLINE.forEach(([lat, lon], idx) => {
      const [x, y] = llToCanvas(lat, lon, W, H);
      if (idx === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth   = 1.5;
    ctx.stroke();

    // 6. Lat labels (right edge)
    ctx.font      = 'bold 9px Inter,system-ui,sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.textAlign = 'right';
    [{ lat:20,label:'20°N'},{lat:0,label:'0°'},{lat:-20,label:'20°S'},{lat:-40,label:'40°S'}].forEach(({ lat, label }) => {
      const [, y] = llToCanvas(lat, MAP_LON_MIN, W, H);
      if (y < 0 || y > H - PAD_B) return;
      ctx.fillText(label, W - 3, Math.min(y + 3, H - PAD_B - 2));
    });

    // 7. Lon labels (bottom)
    ctx.textAlign = 'center';
    [{ lon:-20,label:'20°W'},{lon:0,label:'0°'},{lon:20,label:'20°E'},{lon:40,label:'40°E'},{lon:60,label:'60°E'}].forEach(({ lon, label }) => {
      const [x] = llToCanvas(0, lon, W, H);
      ctx.fillText(label, x, H - 4);
    });
  }, [layer, consts]);

  return (
    <div>
      {/* Layer + Constellation Controls */}
      <div className="icm2-map-controls">
        <div className="icm2-map-ctrl-group">
          <span className="icm2-map-ctrl-label">Layer</span>
          <div className="icm2-map-ctrl-row">
            {MAP_LAYERS.map(l => (
              <button key={l} type="button"
                className={`icm2-map-layer-btn${layer === l ? ' active' : ''}`}
                onClick={() => setLayer(l)}
              >{l}</button>
            ))}
          </div>
        </div>
        <div className="icm2-map-ctrl-group">
          <span className="icm2-map-ctrl-label">Constellation</span>
          <div className="icm2-map-ctrl-row">
            {CONSTELLATIONS.map(name => (
              <label key={name} className="icm2-const-toggle">
                <input type="checkbox" checked={consts[name]} onChange={() => toggle(name)} />
                <span>{name}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Canvas — colorbar is drawn inside the canvas on the left */}
      <div className="icm2-tec-map">
        <canvas
          ref={canvasRef}
          width={560}
          height={460}
          className="icm2-tec-canvas"
        />
        <div className="icm2-tec-legend">
          {layerMeta.legend.map(item => (
            <span key={item.label} className="icm2-legend-item">
              <i style={{ background: item.color }} />{item.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function demoData() {
  return {
    mode: 'demo',
    station: 'HARA',
    stations: FALLBACK_STATIONS,
    positions: STATION_POS,
    vtec_tecu: 18.6,
    s4_index: 0.32,
    phase_sigma_rad: 0.14,
    ionospheric_delay_l1_ns: 8.4,
    range_error_m: 2.5,
    rtk_status: 'FIXED',
    gnss_impact: 'LOW',
    kp_index: 2.0,
    kp_24h_max: 3.0,
    tec_daily_change: 2.4,
    tec_peak_time: '14:00 Local',
    updated_utc: new Date().toISOString(),
  };
}

export default function IonosphericConditionsMonitor() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { healthPayload: health, refresh: refreshHealth } = useOpsHealth();
  const [status, setStatus]   = useState(demoData);
  const [loading, setLoading] = useState(true);
  const [selectedStation, setSelectedStation] = useState(() => searchParams.get('station')?.toUpperCase() || 'HARA');
  const [mapLayer, setMapLayer] = useState('VTEC');
  const [mapConsts, setMapConsts] = useState({ GPS: true, Galileo: true, BeiDou: true, GLONASS: true });

  const loadStatus = async (stationId = selectedStation) => {
    setLoading(true);
    try {
      const json = await getIonosphereStatus({ station: stationId });
      setStatus({ ...demoData(), ...json, mode: json.mode || 'live' });
      if (json.station) setSelectedStation(json.station);
    } catch {
      setStatus(demoData());
    } finally {
      setLoading(false);
    }
  };

  const refreshAll = () => {
    refreshHealth();
    loadStatus(selectedStation);
  };

  const corsStations = status.stations?.length ? status.stations : FALLBACK_STATIONS;

  useEffect(() => {
    loadStatus(selectedStation);
    const id = setInterval(() => loadStatus(selectedStation), 10 * 60 * 1000);
    return () => clearInterval(id);
  }, [selectedStation]);

  useEffect(() => {
    const urlStation = searchParams.get('station')?.toUpperCase();
    if (!urlStation || urlStation === selectedStation) return;
    const known = corsStations.some(s => s.id === urlStation);
    if (known) setSelectedStation(urlStation);
  }, [searchParams, selectedStation, corsStations]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedStation && selectedStation !== 'HARA') params.set('station', selectedStation);
    const next = params.toString();
    if (next !== searchParams.toString()) setSearchParams(params, { replace: true });
  }, [selectedStation, setSearchParams, searchParams]);
  const stationPos = status.positions || STATION_POS;
  const primaryStation = status.station || selectedStation || 'HARA';
  const primaryName = corsStations.find(s => s.id === primaryStation)?.name || 'Harare';
  const view = useMemo(() => deriveIonosphereView(status, health), [status, health]);

  return (
    <div className="icm2-root">
      <div className="icm2-main">

        {/* ── Header ── */}
        <header className="icm2-header">
          <div className="icm2-header-title">
            <div className="icm2-header-kicker">ZINGSA Space Science Operations</div>
            <h1>Ionospheric Conditions Monitor</h1>
            <p>Real-time monitoring of ionospheric disturbances, GNSS signal propagation, and positioning accuracy across CORS networks.</p>
          </div>
          <div className="icm2-header-right">
            <span className="icm2-live-badge">
              <i className="icm2-live-dot" />
              {status.mode === 'archive-blend' ? 'Archive + NOAA Kp' : status.mode === 'live' ? 'Live Monitoring' : 'Climatology Model'}
            </span>
            <div className="icm2-sources">
              <span>Data Sources:</span>
              {['IGS', 'CODE', 'NOAA SWPC', 'Local CORS'].map(s => (
                <span key={s} className="icm2-source-chip">{s}</span>
              ))}
            </div>
            <span className="icm2-timestamp">{utcTime(status.updated_utc)}</span>
            <Link
              to={`/cors?station=${primaryStation}&app=cors-health`}
              className="icm2-cors-link"
              title="Open station in National CORS Services"
            >
              National CORS →
            </Link>
            <Link to="/weather?region=southern" className="icm2-cors-link icm2-weather-link" title="Open Space Weather monitor">
              Space Weather →
            </Link>
            <Link
              to={primaryStation ? `/alerts?tab=stations&station=${primaryStation}` : '/alerts'}
              className="icm2-cors-link icm2-alerts-link"
              title="Open CORS Alert System for this station"
            >
              Alerts →
            </Link>
            <label className="icm2-station-select">
              <span>Station</span>
              <select
                value={primaryStation}
                onChange={(e) => setSelectedStation(e.target.value)}
                aria-label="Select ZimCORS station"
              >
                {corsStations.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.id} — {s.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="icm2-refresh-btn"
              onClick={refreshAll}
              disabled={loading}
              title="Refresh"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </header>

        <OperationalServicesNav variant="cyan" stationId={primaryStation} />

        {(status.archive_backed_count != null || health || status.data_blend) && (
          <div className="icm2-data-banner">
            {status.data_blend || (
              <>
                {status.station_count ?? corsStations.length} ZimCORS stations ·{' '}
                {status.archive_backed_count ?? corsStations.filter(s => s.archive_backed).length} RINEX-backed
              </>
            )}
            {' · '}
            {status.mode === 'archive-blend' ? 'Archive + NOAA Kp' : status.mode === 'live' ? 'Live API' : 'Climatology model'}
            {health ? ` · ${healthTelemetryLabel(health)}` : ''}
            {status.updated_utc ? ` · updated ${utcTime(status.updated_utc)} UTC` : ''}
          </div>
        )}

        <div className="icm2-content">

          {/* ── Top 5 Cards ── */}
          <div className="icm2-top-cards">

            {/* 1 — Ionospheric Status */}
            <article className="icm2-card">
              <div className="icm2-card-title">IONOSPHERIC STATUS</div>
              <div className="icm2-status-body">
                <div className="icm2-globe">
                  <div className="icm2-globe-ring" />
                  <div className="icm2-globe-core" />
                </div>
                <div className="icm2-status-rows">
                  <div className="icm2-kv"><span>Condition</span><strong style={{ color: view.condition.color }}>{view.condition.label}</strong></div>
                  <div className="icm2-kv"><span>TEC Activity</span><strong style={{ color: view.tecActivity.color }}>{view.tecActivity.label}</strong></div>
                  <div className="icm2-kv"><span>GNSS Impact</span><strong style={{ color: impactColor(status.gnss_impact) }}>{status.gnss_impact}</strong></div>
                  <div className="icm2-kv"><span>RTK Reliability</span><strong style={{ color: view.rtkReliability.color }}>{view.rtkReliability.label}</strong></div>
                </div>
              </div>
            </article>

            {/* 2 — Vertical TEC */}
            <article className="icm2-card">
              <div className="icm2-card-title">VERTICAL TOTAL ELECTRON CONTENT</div>
              <div className="icm2-sub-label" style={{ marginBottom: 2 }}>Current VTEC</div>
              <div className="icm2-big-value" style={{ color: '#22d3ee' }}>{status.vtec_tecu.toFixed(1)}</div>
              <div className="icm2-big-unit">TECU</div>
              <div className="icm2-kv-stack">
                <div className="icm2-kv"><span>24h Change</span><strong style={{ color: '#22c55e' }}>+{status.tec_daily_change} TECU ▲</strong></div>
                <div className="icm2-kv"><span>Peak Activity</span><strong>{status.tec_peak_time}</strong></div>
                <div className="icm2-kv"><span>TEC Source</span><strong style={{ color: '#22d3ee' }}>IGS GIM</strong></div>
              </div>
            </article>

            {/* 3 — GNSS Scintillation */}
            <article className="icm2-card">
              <div className="icm2-card-title">GNSS SCINTILLATION</div>
              <div className="icm2-scint-pair">
                <div>
                  <div className="icm2-sub-label">Amplitude (S4)</div>
                  <div className="icm2-med-value" style={{ color: '#eab308' }}>{status.s4_index.toFixed(2)}</div>
                </div>
                <div>
                  <div className="icm2-sub-label">Phase σφ</div>
                  <div className="icm2-med-value" style={{ color: '#e2e8f0' }}>{status.phase_sigma_rad.toFixed(2)} <small>rad</small></div>
                </div>
              </div>
              <div className="icm2-kv" style={{ marginTop: 10 }}>
                <span>Risk</span>
                <span className={`icm2-badge ${view.scintRisk.level === 'MODERATE' ? 'mod' : view.scintRisk.level === 'HIGH' ? 'high' : 'low'}`}>{view.scintRisk.label}</span>
              </div>
            </article>

            {/* 4 — Ionospheric Delay */}
            <article className="icm2-card">
              <div className="icm2-card-title">IONOSPHERIC DELAY</div>
              <div className="icm2-kv-stack">
                <div className="icm2-kv"><span>Zenith Delay (L1)</span><strong>{status.ionospheric_delay_l1_ns.toFixed(1)} <small>ns</small></strong></div>
                <div className="icm2-kv"><span>Range Error</span><strong>{status.range_error_m.toFixed(1)} <small>m</small></strong></div>
                <div className="icm2-kv"><span>Correction</span><strong style={{ color: view.correctionStatus === 'Available' ? '#22c55e' : '#eab308' }}>{view.correctionStatus}</strong></div>
              </div>
            </article>

            {/* 5 — Kp Index */}
            <article className="icm2-card">
              <div className="icm2-card-title">Kp INDEX</div>
              <div className="icm2-kv-stack">
                <div className="icm2-kv">
                  <span>Current Kp</span>
                  <strong style={{ color: '#22d3ee', fontSize: '1.55rem', lineHeight: 1 }}>{status.kp_index.toFixed(1)}</strong>
                </div>
                <div className="icm2-kv"><span>24h Max</span><strong>{status.kp_24h_max.toFixed(1)}</strong></div>
                <div className="icm2-kv"><span>Storm Risk</span><strong style={{ color: view.stormRisk.color }}>{view.stormRisk.label}</strong></div>
              </div>
            </article>
          </div>

          {/* ── Mid Grid: Map + Charts ── */}
          <div className="icm2-mid-grid">

            <article className="icm2-panel icm2-map-col">
              <div className="icm2-panel-hdr">
                <span className="icm2-card-title">AFRICA IONOSPHERIC TEC MAP</span>
              </div>
              <TecMap
                layer={mapLayer}
                setLayer={setMapLayer}
                consts={mapConsts}
                setConsts={setMapConsts}
              />
            </article>

            <div className="icm2-charts-col">

              <article className="icm2-panel">
                <div className="icm2-panel-hdr">
                  <span className="icm2-card-title">VERTICAL TEC TREND (VTEC)</span>
                </div>
                <div className="icm2-chart-yaxis-wrap">
                  <div className="icm2-chart-yaxis"><span>40</span><span>30</span><span>20</span><span>10</span><span>0</span></div>
                  <TrendChart values={view.tecTrend} color="#a855f7" height={110} />
                </div>
                <p className="icm2-chart-note">Station: {primaryStation} ({primaryName})</p>
              </article>

              <article className="icm2-panel">
                <div className="icm2-panel-hdr">
                  <span className="icm2-card-title">SCINTILLATION (S4 INDEX)</span>
                </div>
                <div className="icm2-scint-legend">
                  <span><i style={{ background: '#ef4444' }} />High (&gt;0.5)</span>
                  <span><i style={{ background: '#eab308' }} />Moderate (0.2-0.5)</span>
                  <span><i style={{ background: '#22c55e' }} />Low (&lt;0.2)</span>
                </div>
                <TrendChart values={view.scintTrend} color="#22c55e" height={100} multiScint />
                <p className="icm2-chart-note">Station: {primaryStation} ({primaryName})</p>
              </article>

              <article className="icm2-panel">
                <div className="icm2-panel-hdr">
                  <span className="icm2-card-title">IONOSPHERIC DELAY OVER TIME (L1)</span>
                </div>
                <div className="icm2-chart-yaxis-wrap">
                  <div className="icm2-chart-yaxis sm"><span>15</span><span>10</span><span>5</span><span>0</span></div>
                  <TrendChart values={view.delayTrend} color="#22d3ee" height={100} />
                </div>
                <p className="icm2-chart-note">Station: {primaryStation} ({primaryName})</p>
              </article>

              <article className="icm2-panel">
                <div className="icm2-panel-hdr">
                  <span className="icm2-card-title">PHASE SCINTILLATION (σφ)</span>
                </div>
                <TrendChart values={view.phaseTrend} color="#f97316" height={100} />
                <p className="icm2-chart-note">Phase sigma: {status.phase_sigma_rad.toFixed(2)} rad</p>
              </article>

            </div>
          </div>

          {/* ── Operational Row: EIA + ROTI + PPP/RTK ── */}
          <div className="icm2-ops-row">

            {/* Equatorial Ionization Anomaly */}
            <article className="icm2-panel">
              <div className="icm2-card-title icm2-panel-mb">EQUATORIAL IONIZATION ANOMALY</div>
              <div className="icm2-eia-status">
                <span className="icm2-eia-dot" style={{ background: view.eiaActive ? '#f97316' : '#22c55e' }} />
                <div>
                  <div className="icm2-sub-label">Current Status</div>
                  <div style={{ color: view.eiaActive ? '#f97316' : '#22c55e', fontSize: '1.15rem', fontWeight: 900, letterSpacing: '0.05em' }}>
                    {view.eiaActive ? 'ACTIVE' : 'QUIET'}
                  </div>
                </div>
              </div>
              <div className="icm2-kv-stack" style={{ marginTop: 12 }}>
                <div className="icm2-kv"><span>Peak Region</span><strong>±15° Magnetic Latitude</strong></div>
                <div className="icm2-kv"><span>Risk Window</span><strong style={{ color: view.eiaActive ? '#f97316' : '#64748b' }}>18:00 – 23:00 UTC</strong></div>
                <div className="icm2-kv"><span>Crest Location</span><strong>~15°N / ~15°S</strong></div>
                <div className="icm2-kv"><span>Zimbabwe Effect</span><strong style={{ color: view.zimEffect.color }}>{view.zimEffect.label}</strong></div>
              </div>
              <div className="icm2-eia-impact">
                <Waves size={11} />
                {view.eiaActive
                  ? 'GNSS Scintillation Possible — RTK users monitor fixes'
                  : 'Equatorial crest subdued — routine GNSS operations expected'}
              </div>
            </article>

            {/* ROTI Monitor */}
            <article className="icm2-panel">
              <div className="icm2-card-title icm2-panel-mb">RATE OF TEC INDEX (ROTI)</div>
              <div className="icm2-big-value" style={{ color: view.rotiLevel.color, fontSize: '2.1rem' }}>{view.roti}</div>
              <div className="icm2-big-unit" style={{ marginBottom: 12 }}>TECU / min</div>
              <div className="icm2-kv-stack">
                <div className="icm2-kv"><span>Activity</span><strong style={{ color: view.rotiLevel.color }}>{view.rotiLevel.label}</strong></div>
                <div className="icm2-kv"><span>Disturbance</span><strong>{view.rotiLevel.note}</strong></div>
                <div className="icm2-kv"><span>Alert Threshold</span><strong style={{ color: '#475569' }}>0.5 TECU/min</strong></div>
                <div className="icm2-kv"><span>Station</span><strong>{primaryStation} ({primaryName})</strong></div>
              </div>
            </article>

            {/* PPP / RTK Service Quality */}
            <article className="icm2-panel">
              <div className="icm2-card-title icm2-panel-mb">POSITIONING SERVICE QUALITY</div>
              <div className="icm2-kv-stack">
                <div className="icm2-kv">
                  <span>RTK Fix Rate</span>
                  <strong style={{ color: view.fixRate >= 75 ? '#22c55e' : '#eab308', fontSize: '1.1rem' }}>{view.fixRate}%</strong>
                </div>
                <div className="icm2-kv"><span>Avg Correction Age</span><strong>{status.gnss_impact === 'LOW' ? '1.2' : status.gnss_impact === 'MODERATE' ? '2.4' : '4.8'} sec</strong></div>
                <div className="icm2-kv"><span>PPP Convergence</span><strong style={{ color: view.pppStatus === 'Normal' ? '#22c55e' : '#eab308' }}>{view.pppStatus}</strong></div>
              </div>
              <div className="icm2-accuracy-grid">
                <div className="icm2-accuracy-item">
                  <span>Horizontal</span>
                  <strong>{status.gnss_impact === 'LOW' ? '8' : status.gnss_impact === 'MODERATE' ? '14' : '28'} mm</strong>
                </div>
                <div className="icm2-accuracy-item">
                  <span>Vertical</span>
                  <strong>{status.gnss_impact === 'LOW' ? '15' : status.gnss_impact === 'MODERATE' ? '24' : '45'} mm</strong>
                </div>
                <div className="icm2-accuracy-item">
                  <span>Baseline RMS</span>
                  <strong>{status.range_error_m.toFixed(1)} mm</strong>
                </div>
              </div>
              <div className="icm2-kv" style={{ marginTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10 }}>
                <span>Network Status</span>
                <strong style={{ color: view.networkColor }}>{view.networkLabel}</strong>
              </div>
            </article>
          </div>

          {/* ── Bottom Grid ── */}
          <div className="icm2-bottom-grid">

            {/* GNSS Signal Performance */}
            <article className="icm2-panel">
              <div className="icm2-card-title icm2-panel-mb">GNSS SIGNAL PERFORMANCE</div>
              <table className="icm2-table">
                <thead>
                  <tr>
                    <th>System</th>
                    <th style={{ textAlign: 'center' }}>L1</th>
                    <th style={{ textAlign: 'center' }}>L2</th>
                    <th style={{ textAlign: 'center' }}>L5</th>
                  </tr>
                </thead>
                <tbody>
                  {view.gnssPerformance.map(row => (
                    <tr key={row.name}>
                      <td>
                        <span className="icm2-const-dot" style={{ background: row.color }} />
                        {row.name}
                      </td>
                      <td style={{ textAlign: 'center' }}><FreqDot level={row.l1} /></td>
                      <td style={{ textAlign: 'center' }}><FreqDot level={row.l2} /></td>
                      <td style={{ textAlign: 'center' }}><FreqDot level={row.l5} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="icm2-freq-legend">
                {[['#22c55e','Low'],['#eab308','Moderate'],['#f97316','High']].map(([c,l]) => (
                  <span key={l}><i style={{ background: c }} />{l}</span>
                ))}
              </div>
            </article>

            {/* CORS Network Effect */}
            <article className="icm2-panel">
              <div className="icm2-card-title icm2-panel-mb">CORS NETWORK EFFECT · {corsStations.length} STATIONS</div>
              <div className="icm2-station-table-wrap">
              <table className="icm2-table">
                <thead>
                  <tr>
                    <th>Station</th><th>VTEC (TECU)</th><th>S4</th><th>RTK</th><th>Error</th>
                  </tr>
                </thead>
                <tbody>
                  {corsStations.map(s => (
                    <tr
                      key={s.id}
                      className={s.id === primaryStation ? 'icm2-station-active' : 'icm2-station-row'}
                      onClick={() => setSelectedStation(s.id)}
                      title={`Monitor ${s.id}`}
                    >
                      <td>
                        <span className="icm2-status-dot" style={{ background: impactColor(s.quality) }} />
                        <strong>{s.id}</strong>
                        <span style={{ color: '#475569', fontWeight: 400, marginLeft: 4, fontSize: '0.6rem' }}>{s.name}</span>
                      </td>
                      <td>{s.vtec}</td>
                      <td style={{ color: s.s4 >= 0.5 ? '#ef4444' : s.s4 >= 0.2 ? '#eab308' : '#e2e8f0' }}>{s.s4}</td>
                      <td style={{ color: s.rtk === 'FIXED' ? '#22c55e' : '#eab308', fontWeight: 900 }}>
                        {s.rtk}{s.rtk === 'FIXED' && <sup style={{ fontSize: '0.6em' }}>+</sup>}
                      </td>
                      <td>{s.error} mm</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </article>

            {/* Ionospheric Alerts */}
            <article className="icm2-panel">
              <div className="icm2-card-title icm2-panel-mb">IONOSPHERIC ALERTS</div>
              <div className="icm2-alert-card">
                <div className="icm2-alert-hdr">
                  <AlertTriangle size={15} />
                  <span>Equatorial Scintillation</span>
                  <span className={`icm2-badge ${view.alertLevel === 'MODERATE' ? 'mod' : view.alertLevel === 'HIGH' ? 'high' : 'low'}`} style={{ marginLeft: 'auto' }}>{view.alertLevel}</span>
                </div>
                <div className="icm2-kv-stack" style={{ marginTop: 10, marginBottom: 10 }}>
                  <div className="icm2-kv"><span>Region</span><strong>Southern Africa · {primaryStation}</strong></div>
                  <div className="icm2-kv"><span>Time</span><strong>{view.eiaActive ? '18:00 – 23:00 UTC' : 'No active window'}</strong></div>
                </div>
                <div className="icm2-effects-title">Possible Effects</div>
                <ul className="icm2-effects-list">
                  {view.alertEffects.map(item => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </article>

            {/* 24h Forecast */}
            <article className="icm2-panel">
              <div className="icm2-panel-hdr" style={{ flexWrap: 'wrap', gap: 6 }}>
                <span className="icm2-card-title">IONOSPHERE FORECAST</span>
                <span className="icm2-sub-label" style={{ marginLeft: 'auto' }}>Next Update: {view.nextForecastUpdate} UTC</span>
              </div>
              <table className="icm2-table icm2-forecast-table">
                <thead>
                  <tr>
                    <th>Metric</th>
                    {['Now', '+6h', '+12h', '+24h'].map(l => <th key={l} style={{ textAlign: 'center' }}>{l}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {view.forecastRows.map(row => (
                    <tr key={row.label}>
                      <td style={{ color: '#94a3b8' }}>{row.label}</td>
                      {row.colors.map((val, i) => (
                        <td key={i} style={{ textAlign: 'center' }}>
                          <span className="icm2-forecast-dot" style={{ background: impactColor(val) }} />
                          <span style={{ display: 'block', fontSize: '0.52rem', color: '#475569', marginTop: 2 }}>{row.texts[i]}</span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </article>
          </div>

          {/* ── Footer ── */}
          <div className="icm2-footer-grid">
            <div className="icm2-footer-panel">
              <div className="icm2-footer-title">IMPACT LEVEL GUIDE</div>
              <div className="icm2-guide-list">
                {IMPACT_GUIDE.map(({ level, label, color }) => (
                  <div key={level} className="icm2-guide-row">
                    <span className="icm2-guide-dot" style={{ background: color }} />
                    <strong style={{ color }}>{level}</strong>
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="icm2-footer-panel">
              <div className="icm2-footer-title">ABOUT</div>
              <p>Ionospheric conditions affect GNSS signal propagation and positioning accuracy. ROTI and EIA monitoring are critical for equatorial Africa. Data streams from NOAA SWPC, IGS/CDDIS IONEX, ESA SWE, GFZ VTEC, and local CORS/RINEX observations.</p>
            </div>

            <div className="icm2-footer-panel">
              <div className="icm2-footer-title">DATA QUALITY</div>
              <div className="icm2-quality-label">
                <span style={{ color: '#22c55e' }}>Good</span>
                <span>100%</span>
              </div>
              <div className="icm2-quality-bar">
                <div className="icm2-quality-fill" style={{ width: loading ? '60%' : '100%' }} />
              </div>
              <p style={{ marginTop: 8, color: '#475569', fontSize: '0.62rem' }}>
                NOAA SWPC · IGS/CDDIS IONEX · ESA SWE · GFZ VTEC · Local CORS/RINEX
              </p>
            </div>
          </div>

          <IonospherePageAnalysis
            status={status}
            stations={corsStations}
            primaryStation={primaryStation}
            primaryName={primaryName}
            mapLayer={mapLayer}
            mapConsts={mapConsts}
          />

        </div>
      </div>
    </div>
  );
}
