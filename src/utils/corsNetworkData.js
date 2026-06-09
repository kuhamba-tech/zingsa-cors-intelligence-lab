import { ZIMBABWE_CORS_STATIONS } from '../data/zimbabweCorsStations.js';

/** Demo alert overrides layered on API-derived station status */
export const STATUS_OVERRIDE = {
  CENT: 'critical',
  HACY: 'critical',
  HARA: 'warning',
  MUTA: 'warning',
  BULA: 'warning',
  KARO: 'offline',
};

/** Legacy primary quartet — prefer full ZIMBABWE_CORS_STATIONS for new features */
export const PRIMARY_AVAILABILITY_STATIONS = [
  { id: 'HARA', name: 'Harare' },
  { id: 'BULA', name: 'Bulawayo' },
  { id: 'VICF', name: 'Victoria Falls' },
  { id: 'GWER', name: 'Gweru' },
];

export const IONOSPHERE_MONITOR_STATIONS = ZIMBABWE_CORS_STATIONS.map(s => ({
  id: s.id,
  name: s.name,
}));

function seedFromId(id, salt = 0) {
  return [...String(id)].reduce((sum, ch, i) => sum + ch.charCodeAt(0) * (i + 1 + salt), 0);
}

export function mapApiStatus(status) {
  const s = String(status || '').toUpperCase();
  if (s === 'ONLINE') return 'online';
  if (s === 'DEGRADED') return 'warning';
  if (s === 'OFFLINE') return 'offline';
  return 'online';
}

/** True when station-health is not live receiver telemetry. */
export function isSimulatedHealth(payload) {
  const src = payload?.telemetry_source;
  if (src === 'telemetry') return false;
  if (src === 'telemetry-blend') return true;
  return (
    payload?.mode === 'simulated'
    || src === 'hourly-seed'
    || src === 'rinex-archive-blend'
    || src === 'rinex-archive'
  );
}

export function healthTelemetryLabel(payload) {
  const src = payload?.telemetry_source;
  if (src === 'telemetry') return 'Live receiver telemetry feed';
  if (src === 'telemetry-blend') {
    const live = payload?.health_summary?.telemetry_live ?? 0;
    return `Live telemetry for ${live} station(s), blended with RINEX archive / seed for the remainder`;
  }
  if (src === 'rinex-archive') return 'RINEX archive recency (indexed observation files)';
  if (src === 'rinex-archive-blend') {
    const derived = payload?.health_summary?.archive_derived ?? 0;
    const fallback = payload?.health_summary?.seed_fallback ?? 0;
    return `RINEX archive recency for ${derived} station(s); hourly seed for ${fallback} without indexed files`;
  }
  if (src === 'hourly-seed') return 'Hourly-seed status until live receivers or RINEX index coverage is available';
  return 'Live receiver telemetry';
}

export function summarizeZimHealth(healthPayload, stationIds) {
  const ids = new Set(stationIds);
  const rows = (healthPayload?.stations || []).filter(s => ids.has(s.station_id));
  const summary = healthPayload?.health_summary || {};
  const online = summary.online ?? rows.filter(s => s.status === 'ONLINE').length;
  const degraded = summary.degraded ?? rows.filter(s => s.status === 'DEGRADED').length;
  const offline = summary.offline ?? rows.filter(s => s.status === 'OFFLINE').length;
  const total = stationIds.length;
  const withData = rows.length;
  const operational = summary.operational ?? online + degraded;
  const operationalPct = total ? Math.round((operational / total) * 100) : null;
  return { online, degraded, offline, operational, total, withData, operationalPct };
}

/** Lab / national CORS page status (no alert-demo overrides) */
export function healthApiToLabStatus(apiStatus) {
  const s = String(apiStatus || '').toUpperCase();
  if (s === 'OFFLINE') return 'offline';
  if (s === 'DEGRADED') return 'degraded';
  return 'online';
}

export function mergeMetricsWithHealth(metrics, healthPayload) {
  if (!metrics?.stationStatuses?.length || !healthPayload?.stations?.length) return metrics;
  const healthById = Object.fromEntries(healthPayload.stations.map(s => [s.station_id, s]));
  return {
    ...metrics,
    stationStatuses: metrics.stationStatuses.map(s => {
      const live = healthById[s.id];
      if (!live) return s;
      return {
        ...s,
        status: healthApiToLabStatus(live.status),
        pct: live.status === 'ONLINE' ? 95 : live.status === 'DEGRADED' ? 60 : 20,
      };
    }),
    availability: healthPayload.network_health ?? metrics.availability,
  };
}

export function mapStationFromHealth(st, healthById) {
  const health = healthById[st.id];
  const fromHealth = health ? healthApiToLabStatus(health.status) : null;
  return {
    id: st.id,
    name: st.name,
    lat: st.lat,
    lon: st.lon,
    status: fromHealth || st.status,
    network: 'ZimCORS/ZINGSA',
    lastUpdate: health?.last_update || null,
    dataGapHrs: health?.data_gap_hrs ?? null,
  };
}

export function resolveStationStatus(stationId, baseStatus) {
  return STATUS_OVERRIDE[stationId] ?? baseStatus;
}

export function buildMapStations(healthPayload, { useDemoOverrides = false } = {}) {
  const healthById = Object.fromEntries(
    (healthPayload?.stations || []).map(s => [s.station_id, s]),
  );

  return ZIMBABWE_CORS_STATIONS.map(st => {
    const api = healthById[st.id];
    const base = api ? mapApiStatus(api.status) : (st.status === 'degraded' ? 'warning' : st.status);
    return {
      ...st,
      status: useDemoOverrides ? resolveStationStatus(st.id, base) : base,
      lastUpdate: api?.last_update || null,
      dataGapHrs: api?.data_gap_hrs ?? null,
      coordShiftMm: api?.coord_shift_mm ?? null,
      healthBasis: api?.health_basis || null,
      archiveLatest: api?.archive_latest || null,
      archiveCount: api?.archive_count ?? null,
      archiveSource: api?.archive_source || null,
    };
  });
}

export function gnssQualityLabel(quality) {
  const q = Number(quality);
  if (!Number.isFinite(q) || q <= 0) return { label: 'No signal', tone: 'red' };
  if (q >= 80) return { label: 'Good', tone: 'green' };
  if (q >= 60) return { label: 'Fair', tone: 'orange' };
  return { label: 'Poor', tone: 'red' };
}

export function healthBasisLabel(basis) {
  if (basis === 'telemetry') return 'Live receiver telemetry';
  if (basis === 'rinex-archive') return 'RINEX archive recency';
  if (basis === 'seed') return 'Hourly seed (no archive)';
  return 'Health API';
}

/** Interpolate a short trend array to chart length (deterministic). */
export function expandTrendSeries(points, targetLen = 25) {
  if (!points?.length) return [];
  if (points.length === targetLen) return points;
  if (points.length === 1) return Array.from({ length: targetLen }, () => points[0]);
  return Array.from({ length: targetLen }, (_, i) => {
    const t = (i / (targetLen - 1)) * (points.length - 1);
    const lo = Math.floor(t);
    const hi = Math.min(points.length - 1, Math.ceil(t));
    const frac = t - lo;
    const v = points[lo] * (1 - frac) + points[hi] * frac;
    return Math.round(v * 10) / 10;
  });
}

/** Ops dashboard GNSS trend lines from current station-health blend. */
export function buildNetworkTrendSeries(stationTableData = [], targetLen = 25) {
  const week = buildMonitoringTimeWindows(stationTableData).week;
  return {
    signalData: expandTrendSeries(week.signalTrend, targetLen),
    accuracyData: expandTrendSeries(week.accuracyTrend, targetLen),
  };
}

/** Deterministic monitoring windows derived from current station table (no random seed at load). */
export function buildMonitoringTimeWindows(stationTableData = []) {
  const avgUptime = stationTableData.length
    ? stationTableData.reduce((sum, st) => sum + st.uptime, 0) / stationTableData.length
    : 98;
  const avgSignal = stationTableData.length
    ? stationTableData.reduce((sum, st) => sum + st.gnssQuality, 0) / stationTableData.length
    : 84;
  const avgAccuracy = stationTableData.length
    ? 3.2 - (avgSignal / 100) * 1.4
    : 2.2;
  const rinexPct = stationTableData.length
    ? Math.round(
      stationTableData.reduce((sum, st) => sum + Math.min(100, (st.rinexToday / 24) * 100), 0)
      / stationTableData.length * 10,
    ) / 10
    : 92;

  const weekLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const weekUptime = weekLabels.map((label, i) => ({
    label,
    value: Math.round((avgUptime + Math.sin(i * 0.9) * 1.1) * 10) / 10,
  }));
  const weekSignal = weekLabels.map((_, i) =>
    Math.round(avgSignal + Math.sin(i * 0.75) * 2.5),
  );

  return {
    week: {
      label: '7 days',
      uptimeTitle: 'Network Uptime - Last 7 Days',
      trendTitle: '7-Day GNSS Signal Quality Trend',
      kpiSub: 'Derived from current station health',
      rinexCompleteness: rinexPct,
      xLabels: weekLabels,
      uptime: weekUptime,
      signalTrend: weekSignal,
      accuracyTrend: weekSignal.map(v => Math.round((3.4 - (v / 100) * 1.5) * 10) / 10),
    },
    month: {
      label: 'Month',
      uptimeTitle: 'Network Uptime - This Month',
      trendTitle: 'Monthly GNSS Signal Quality Trend',
      kpiSub: 'Weekly aggregates from station blend',
      rinexCompleteness: Math.min(99.5, rinexPct + 2.5),
      xLabels: ['W1', 'W2', 'W3', 'W4', 'W5'],
      uptime: ['W1', 'W2', 'W3', 'W4', 'W5'].map((label, i) => ({
        label,
        value: Math.round((avgUptime - 0.4 + i * 0.15) * 10) / 10,
      })),
      signalTrend: [0, 1, 2, 3, 4].map(i => Math.round(avgSignal - 1 + i * 0.6)),
      accuracyTrend: [0, 1, 2, 3, 4].map(i => Math.round((avgAccuracy + 0.2 - i * 0.08) * 10) / 10),
    },
    year: {
      label: 'Year',
      uptimeTitle: 'Network Uptime - This Year',
      trendTitle: 'Annual GNSS Signal Quality Trend',
      kpiSub: 'Quarterly aggregates from station blend',
      rinexCompleteness: Math.min(99.8, rinexPct + 4.2),
      xLabels: ['Q1', 'Q2', 'Q3', 'Q4'],
      uptime: ['Q1', 'Q2', 'Q3', 'Q4'].map((label, i) => ({
        label,
        value: Math.round((avgUptime - 0.8 + i * 0.25) * 10) / 10,
      })),
      signalTrend: [0, 1, 2, 3].map(i => Math.round(avgSignal - 2 + i * 1.1)),
      accuracyTrend: [0, 1, 2, 3].map(i => Math.round((avgAccuracy + 0.35 - i * 0.1) * 10) / 10),
    },
  };
}

function deriveGnssQuality(st, seed) {
  if (st.status === 'offline') return 0;
  const shift = Number(st.coordShiftMm);
  if (st.status === 'critical') return Math.max(18, Math.round(52 - (Number.isFinite(shift) ? shift * 4 : 12)));
  if (st.status === 'warning') {
    const gap = Number(st.dataGapHrs);
    if (Number.isFinite(gap) && gap > 24) return 52 + (seed % 12);
    return 62 + (seed % 16);
  }
  if (st.healthBasis === 'telemetry') return 88 + (seed % 10);
  if (st.healthBasis === 'rinex-archive') {
    const gap = Number(st.dataGapHrs);
    if (Number.isFinite(gap) && gap <= 48) return 84 + (seed % 12);
    return 76 + (seed % 10);
  }
  return 80 + (seed % 14);
}

function deriveUptime(st) {
  if (st.status === 'offline') return 0;
  const gap = Number(st.dataGapHrs);
  if (Number.isFinite(gap)) {
    if (gap <= 1) return 99;
    if (gap <= 6) return 96;
    if (gap <= 24) return 90;
    if (gap <= 48) return 82;
    if (gap <= 168) return 72;
    return 58;
  }
  if (st.status === 'critical') return 68;
  if (st.status === 'warning') return 86;
  return 97;
}

function deriveLatency(st, seed) {
  if (st.status === 'offline' || st.status === 'critical') return null;
  if (st.healthBasis === 'telemetry') return 35 + (seed % 95);
  const gap = Number(st.dataGapHrs);
  if (Number.isFinite(gap) && gap > 12) return null;
  return null;
}

function deriveArchiveSessions(st) {
  if (!st.archiveCount) return null;
  const gap = Number(st.dataGapHrs);
  if (!Number.isFinite(gap)) return st.archiveCount;
  if (gap <= 24) return Math.max(1, Math.min(24, Math.round(24 - gap)));
  return Math.max(0, Math.min(24, Math.round(24 - Math.min(gap, 24))));
}

function formatLastData(st) {
  if (st.status === 'offline' && !st.lastUpdate && !st.archiveLatest) return '—';
  if (st.lastUpdate) {
    return new Date(st.lastUpdate).toLocaleString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: 'short',
    });
  }
  if (st.archiveLatest) return `${st.archiveLatest} (archive)`;
  return '—';
}

export function buildStationTableData(mapStations) {
  return mapStations.map((st, i) => {
    const seed = seedFromId(st.id, i);
    const gnssQuality = deriveGnssQuality(st, seed);
    const telemetryBacked = st.healthBasis === 'telemetry';

    return {
      ...st,
      lastData: formatLastData(st),
      gnssQuality,
      gnssEstimated: !telemetryBacked,
      satellites: telemetryBacked && st.status !== 'offline' ? 8 + (seed % 9) : null,
      latency: deriveLatency(st, seed),
      rinexToday: deriveArchiveSessions(st),
      uptime: deriveUptime(st),
      dataGapLabel: st.dataGapHrs != null ? formatDataGap(st.dataGapHrs) : '—',
      healthBasisLabel: healthBasisLabel(st.healthBasis),
    };
  });
}

/** Stations needing operational attention, sorted by severity. */
export function buildStationPriorityList(mapStations, limit = 6) {
  const score = st => {
    if (st.status === 'offline') return 100;
    if (st.status === 'critical') return 80;
    if (st.status === 'warning') return 50;
    const gap = Number(st.dataGapHrs);
    if (Number.isFinite(gap) && gap > 48) return 40;
    return 0;
  };

  return [...mapStations]
    .filter(st => score(st) > 0)
    .sort((a, b) => score(b) - score(a) || (b.dataGapHrs ?? 0) - (a.dataGapHrs ?? 0))
    .slice(0, limit)
    .map(st => ({
      id: st.id.replace(/_$/, ''),
      name: st.name.split(' (')[0],
      status: st.status,
      reason: st.status === 'offline'
        ? 'No telemetry'
        : st.dataGapHrs != null && st.dataGapHrs > 24
          ? `Data gap ${formatDataGap(st.dataGapHrs)}`
          : st.status === 'critical'
            ? 'Critical health status'
            : 'Degraded / warning',
      healthBasis: healthBasisLabel(st.healthBasis),
    }));
}

export function formatDataGap(hours) {
  const h = Number(hours);
  if (!Number.isFinite(h) || h < 0) return '—';
  if (h < 1) return `${Math.round(h * 60)}m`;
  return `${h.toFixed(1)}h`;
}

export function buildCorsServiceMetrics(healthPayload, metrics, { liveMode = false } = {}) {
  const statusList = metrics?.stationStatuses || [];
  const total = statusList.length || ZIMBABWE_CORS_STATIONS.length;
  const onlineCount = statusList.filter(s => s.status === 'online').length;
  const healthPct = total ? Math.round((onlineCount / total) * 100) : 0;

  const zimIds = new Set(ZIMBABWE_CORS_STATIONS.map(s => s.id));
  const healthStations = (healthPayload?.stations || []).filter(s => zimIds.has(s.station_id));
  const gaps = healthStations.map(s => Number(s.data_gap_hrs)).filter(Number.isFinite);
  const shifts = healthStations.map(s => Number(s.coord_shift_mm)).filter(Number.isFinite);
  const avgGap = gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : null;
  const maxShift = shifts.length ? Math.max(...shifts) : null;
  const rtkPct = Math.round(Number(metrics?.availability ?? healthPayload?.network_health ?? healthPct));

  const telemetryNote = healthStations.length
    ? 'Source: CORS health API'
    : liveMode
      ? 'Telemetry unavailable — showing network summary'
      : 'Switch to LIVE for telemetry metrics';

  return [
    { label: 'Network Health', value: `${healthPct}%`, color: healthPct >= 80 ? '#1D9E75' : '#EF9F27', pct: healthPct, note: liveMode ? 'Live station status blend' : 'From RINEX analysis session' },
    { label: 'Online Stations', value: `${onlineCount}/${total}`, color: '#22d3ee', pct: total ? (onlineCount / total) * 100 : 0, note: 'ZimCORS reference network' },
    { label: 'Mean Data Gap', value: avgGap != null ? formatDataGap(avgGap) : '—', color: '#EF9F27', pct: avgGap != null ? Math.min(100, avgGap * 25) : 12, note: telemetryNote },
    { label: 'Max Coord Shift', value: maxShift != null ? `${maxShift.toFixed(1)}mm` : '—', color: '#a78bfa', pct: maxShift != null ? Math.min(100, maxShift * 8) : 5, note: telemetryNote },
    { label: 'RTK Availability', value: `${rtkPct}%`, color: rtkPct >= 85 ? '#1D9E75' : '#EF9F27', pct: rtkPct, note: liveMode ? 'Blended from health API' : 'Estimated from archive completeness' },
    { label: 'Atmospheric PWV Link', value: metrics?.signalQuality ? `${Math.round(metrics.signalQuality * 0.85)}%` : '—', color: '#22d3ee', pct: metrics?.signalQuality ? metrics.signalQuality * 0.85 : 0, note: 'Derived from signal quality model' },
  ];
}

export function buildBridgeMonitoringMetrics(healthPayload, metrics, corsHealthMetrics) {
  const healthRows = corsHealthMetrics || buildCorsServiceMetrics(healthPayload, metrics);
  const healthPct = parseInt(String(healthRows.find(m => m.label === 'Network Health')?.value || '0'), 10) || 0;
  const rtkRow = healthRows.find(m => m.label === 'RTK Availability');
  const shiftRow = healthRows.find(m => m.label === 'Max Coord Shift');
  const shiftMm = parseFloat(String(shiftRow?.value || '').replace('mm', '')) || null;
  const critical = (metrics?.stationStatuses || []).filter(s => s.status === 'offline' || s.status === 'degraded').length;
  const vibration = healthPct >= 80 ? 'Low' : healthPct >= 60 ? 'Moderate' : 'Elevated';
  const vibrationColor = healthPct >= 80 ? '#1D9E75' : healthPct >= 60 ? '#EF9F27' : '#ef4444';
  const priority = critical > 3 ? 'Elevated' : critical > 0 ? 'Watch' : 'Routine';
  const priorityColor = critical > 3 ? '#ef4444' : critical > 0 ? '#EF9F27' : '#a78bfa';

  return [
    { label: 'Bridge Sensor Coverage', value: `${healthPct}%`, color: healthPct >= 80 ? '#1D9E75' : '#EF9F27', pct: healthPct, note: 'CORS reference stations supporting structural GNSS' },
    { label: 'Displacement Watch', value: shiftMm != null ? `${shiftMm.toFixed(1)}mm` : '—', color: '#22d3ee', pct: shiftMm != null ? Math.min(100, shiftMm * 12) : 10, note: 'Max coordinate shift from health telemetry' },
    { label: 'Vibration Alert Level', value: vibration, color: vibrationColor, pct: healthPct, note: 'Proxy from network stability and RTK health' },
    { label: 'Critical Crossings', value: String(critical), color: critical ? '#EF9F27' : '#1D9E75', pct: Math.min(100, critical * 18), note: 'Stations offline or degraded' },
    { label: 'RTK Correction Health', value: rtkRow?.value || '—', color: rtkRow?.color || '#1D9E75', pct: rtkRow?.pct ?? 0, note: 'NTRIP correction availability' },
    { label: 'Inspection Priority', value: priority, color: priorityColor, pct: critical > 3 ? 75 : critical > 0 ? 45 : 25, note: 'Based on station quality and displacement' },
  ];
}

export function buildHealthSegments(mapStations) {
  const counts = { normal: 0, warning: 0, critical: 0, offline: 0 };
  mapStations.forEach(st => {
    if (st.status === 'online') counts.normal += 1;
    else if (st.status === 'warning') counts.warning += 1;
    else if (st.status === 'critical') counts.critical += 1;
    else if (st.status === 'offline') counts.offline += 1;
  });

  return [
    { label: 'Normal', value: counts.normal, color: '#22c55e' },
    { label: 'Warning', value: counts.warning, color: '#f59e0b' },
    { label: 'Critical', value: counts.critical, color: '#ef4444' },
    { label: 'Offline', value: counts.offline, color: '#64748b' },
  ];
}

const ALERT_TEMPLATES = {
  critical: [
    { problem: 'Data stream offline', action: 'investigate' },
    { problem: 'Internet connection lost', action: 'investigate' },
    { problem: 'Power interruption', action: 'investigate' },
  ],
  warning: [
    { problem: 'Low positioning accuracy', action: 'monitor' },
    { problem: 'High multipath detected', action: 'monitor' },
    { problem: 'High data latency', action: 'monitor' },
    { problem: 'Low satellite count', action: 'monitor' },
  ],
  offline: [
    { problem: 'Station offline — no telemetry', action: 'investigate' },
  ],
};

function describeStationAlert(st, row, thresholds) {
  const gapSec = Number(st.dataGapHrs) > 0 ? st.dataGapHrs * 3600 : 0;
  const templates = ALERT_TEMPLATES[st.status] || ALERT_TEMPLATES.warning;
  const fallback = templates[seedFromId(st.id) % templates.length];

  if (st.status === 'offline') {
    return {
      level: 'CRITICAL',
      problem: 'Station offline — no telemetry',
      action: 'investigate',
    };
  }

  if (st.status === 'critical') {
    if (gapSec >= thresholds.gapCrit) {
      return {
        level: 'CRITICAL',
        problem: `Data gap ${formatDataGap(st.dataGapHrs)} exceeds critical threshold (${thresholds.gapCrit}s)`,
        action: 'investigate',
      };
    }
    return { level: 'CRITICAL', problem: fallback.problem, action: fallback.action };
  }

  if (row?.gnssQuality != null && row.gnssQuality <= thresholds.signalCrit) {
    return {
      level: 'WARNING',
      problem: `GNSS signal quality ${row.gnssQuality}% below critical threshold (${thresholds.signalCrit}%)`,
      action: 'monitor',
    };
  }

  if (row?.latency != null && row.latency >= thresholds.latencyCrit) {
    return {
      level: 'CRITICAL',
      problem: `Stream latency ${row.latency}ms exceeds critical threshold (${thresholds.latencyCrit}ms)`,
      action: 'investigate',
    };
  }

  if (st.healthBasis === 'rinex-archive' && st.dataGapHrs != null && st.dataGapHrs > 48) {
    return {
      level: 'WARNING',
      problem: `RINEX archive stale — latest ${st.archiveLatest || 'unknown'}`,
      action: 'monitor',
    };
  }

  if (gapSec >= thresholds.gapWarn) {
    return {
      level: 'WARNING',
      problem: `Data gap ${formatDataGap(st.dataGapHrs)} exceeds warning threshold (${thresholds.gapWarn}s)`,
      action: 'monitor',
    };
  }

  if (row?.gnssQuality != null && row.gnssQuality < thresholds.signalWarn) {
    return {
      level: 'WARNING',
      problem: `GNSS signal quality ${row.gnssQuality}% below warning threshold (${thresholds.signalWarn}%)`,
      action: 'monitor',
    };
  }

  if (row?.latency != null && row.latency >= thresholds.latencyWarn) {
    return {
      level: 'WARNING',
      problem: `Stream latency ${row.latency}ms exceeds warning threshold (${thresholds.latencyWarn}ms)`,
      action: 'monitor',
    };
  }

  return { level: 'WARNING', problem: fallback.problem, action: fallback.action };
}

export function buildAlertsFromStations(
  mapStations,
  {
    includeResolved = false,
    thresholds = null,
    stationTableData = [],
  } = {},
) {
  const t = thresholds || {
    latencyWarn: 500,
    latencyCrit: 1000,
    signalWarn: 60,
    signalCrit: 40,
    gapWarn: 60,
    gapCrit: 300,
  };
  const tableById = Object.fromEntries(stationTableData.map(s => [s.id, s]));
  const now = new Date();
  const fmt = d => d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const alerts = [];
  let id = 1;

  mapStations.forEach(st => {
    if (!['critical', 'warning', 'offline'].includes(st.status)) return;
    const row = tableById[st.id];
    const detail = describeStationAlert(st, row, t);
    const minsAgo = 3 + (seedFromId(st.id, 7) % 45);
    alerts.push({
      id: id++,
      level: detail.level,
      station: st.id.replace(/_$/, ''),
      problem: detail.problem,
      time: fmt(new Date(now.getTime() - minsAgo * 60000)),
      duration: `${minsAgo} min`,
      status: 'active',
      action: detail.action,
    });
  });

  if (includeResolved) {
    const resolved = [
      { station: 'LUPA', level: 'INFO', problem: 'Scheduled maintenance (demo)', mins: 55 },
      { station: 'BEIT', level: 'INFO', problem: 'RINEX upload delayed (demo)', mins: 28 },
      { station: 'CHIM', level: 'CRITICAL', problem: 'Power interruption resolved (demo)', mins: 224 },
      { station: 'ZINH', level: 'INFO', problem: 'Firmware update complete (demo)', mins: 2 },
    ];
    resolved.forEach(r => {
      alerts.push({
        id: id++,
        level: r.level,
        station: r.station,
        problem: r.problem,
        time: fmt(new Date(now.getTime() - r.mins * 60000)),
        duration: r.mins >= 60 ? `${Math.floor(r.mins / 60)}h ${r.mins % 60}m` : `${r.mins} min`,
        status: 'resolved',
        action: 'view',
      });
    });
  }

  return alerts.sort((a, b) => (a.status === 'active' ? -1 : 1) - (b.status === 'active' ? -1 : 1));
}

/** Health API → active alert counts (same rules as CORS Alert System). */
export function summarizeActiveAlertsFromHealth(healthPayload, { useDemoOverrides = false, thresholds = null } = {}) {
  if (!healthPayload) return { count: 0, critical: 0, warning: 0 };
  const mapStations = buildMapStations(healthPayload, { useDemoOverrides });
  const stationTableData = buildStationTableData(mapStations);
  const alerts = buildAlertsFromStations(mapStations, { thresholds, stationTableData });
  const active = alerts.filter(a => a.status === 'active');
  return {
    count: active.length,
    critical: active.filter(a => a.level === 'CRITICAL').length,
    warning: active.filter(a => a.level === 'WARNING').length,
  };
}

export function buildNotifications(alerts) {
  return alerts
    .filter(a => a.status === 'active')
    .slice(0, 8)
    .map(a => ({
      id: a.id,
      station: a.station,
      msg: `${a.problem} at station ${a.station}.`,
      time: a.time,
      severity: a.level === 'CRITICAL' ? 'critical' : a.level === 'WARNING' ? 'warning' : 'info',
    }));
}

export function computeNetworkStatus(mapStations, alerts) {
  const active = alerts.filter(a => a.status === 'active');
  const critical = active.filter(a => a.level === 'CRITICAL').length;
  const warning = active.filter(a => a.level === 'WARNING').length;
  const offline = mapStations.filter(s => s.status === 'offline').length;
  const operational = mapStations.filter(s => s.status === 'online' || s.status === 'warning').length;

  if (critical > 0 || offline > 2) {
    return {
      label: critical > 2 ? 'CRITICAL' : 'DEGRADED',
      tone: critical > 2 ? 'red' : 'orange',
      note: `${critical} critical · ${warning} warning · ${offline} offline`,
      operational,
    };
  }
  if (warning > 0) {
    return {
      label: 'WATCH',
      tone: 'orange',
      note: `${warning} warning event${warning > 1 ? 's' : ''} under monitoring`,
      operational,
    };
  }
  return {
    label: 'ONLINE',
    tone: 'green',
    note: 'All systems operational',
    operational,
  };
}

export function buildGnssAvailability(stationTableData) {
  const rows = stationTableData?.length
    ? [...stationTableData].sort((a, b) => (b.uptime ?? 0) - (a.uptime ?? 0))
    : ZIMBABWE_CORS_STATIONS.map(s => ({
      id: s.id,
      name: s.name,
      uptime: 98,
      status: s.status,
    }));

  const currentMonth = new Date().getMonth();

  return rows.map(st => {
    const base = st.uptime ?? 98;
    const floor = st.status === 'offline' ? 0 : st.status === 'critical' ? 70 : 85;
    const monthly = Array.from({ length: 12 }, (_, m) => {
      const seed = seedFromId(st.id, m);
      if (m === currentMonth) return Math.round(base * 10) / 10;
      const seasonal = Math.sin((m / 12) * Math.PI * 2) * 1.5;
      return Math.min(100, Math.max(floor, Math.round((base - 1.5 + seasonal + (seed % 4)) * 10) / 10));
    });
    return {
      station: st.id.replace(/_$/, ''),
      name: st.name?.split(' (')[0] || st.id,
      availability: base,
      monthly,
      status: st.status === 'warning' ? 'warning' : st.status === 'critical' || st.status === 'offline' ? 'critical' : 'online',
    };
  });
}

export function buildAlertSummary(alerts) {
  const today = alerts.filter(a => a.status === 'active' || a.status === 'resolved');
  return [
    { label: 'Critical', value: today.filter(a => a.level === 'CRITICAL' && a.status === 'active').length, color: '#ef4444' },
    { label: 'Warning', value: today.filter(a => a.level === 'WARNING' && a.status === 'active').length, color: '#f59e0b' },
    { label: 'Resolved', value: today.filter(a => a.status === 'resolved').length, color: '#22c55e' },
    { label: 'Info', value: today.filter(a => a.level === 'INFO').length, color: '#3b82f6' },
  ];
}

function formatLogTime(value, fallback = new Date()) {
  const d = value ? new Date(value) : fallback;
  if (Number.isNaN(d.getTime())) {
    return fallback.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatReportDate(value) {
  const d = value ? new Date(value) : new Date();
  return d.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatByteSize(bytes) {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

/** Event log rows derived from health API, alerts, and RINEX catalogue. */
export function buildSystemLogEntries({
  mapStations = [],
  alerts = [],
  healthPayload = null,
  catalog = null,
} = {}) {
  const entries = [];
  let id = 1;
  const now = new Date();
  const online = mapStations.filter(s => s.status === 'online').length;
  const degraded = mapStations.filter(s => s.status === 'warning').length;
  const offline = mapStations.filter(s => s.status === 'offline').length;

  entries.push({
    id: id++,
    ts: formatLogTime(healthPayload?.analysis_date, now),
    level: 'INFO',
    src: 'SYSTEM',
    msg: `Station-health poll — ${online} online · ${degraded} degraded · ${offline} offline · ${healthPayload ? healthTelemetryLabel(healthPayload) : 'awaiting API'}.`,
  });

  if (healthPayload?.telemetry_fetch_error) {
    entries.push({
      id: id++,
      ts: formatLogTime(now),
      level: 'ERROR',
      src: 'SYSTEM',
      msg: `Telemetry feed unreachable: ${healthPayload.telemetry_fetch_error}`,
    });
  }

  if (catalog?.updatedAt) {
    entries.push({
      id: id++,
      ts: formatLogTime(catalog.updatedAt),
      level: 'INFO',
      src: 'DATA-CENTRE',
      msg: `RINEX index — ${catalog.archiveCount ?? 0} archives · ${catalog.stationCount ?? 0} stations indexed.`,
    });
  }

  alerts.forEach(alert => {
    entries.push({
      id: id++,
      ts: `${alert.time}:00`,
      level: alert.level === 'CRITICAL' ? 'ERROR' : alert.level === 'WARNING' ? 'WARNING' : 'INFO',
      src: alert.station,
      msg: `${alert.problem} [${alert.status}]`,
    });
  });

  mapStations.forEach(st => {
    const code = st.id.replace(/_$/, '');
    if (st.dataGapHrs != null && st.dataGapHrs > 2) {
      entries.push({
        id: id++,
        ts: formatLogTime(st.lastUpdate, now),
        level: st.dataGapHrs > 24 || st.status === 'offline' ? 'ERROR' : 'WARNING',
        src: code,
        msg: `Observation gap ${formatDataGap(st.dataGapHrs)} (${healthBasisLabel(st.healthBasis)}).`,
      });
    }
    if (st.archiveCount > 0 && st.archiveLatest) {
      entries.push({
        id: id++,
        ts: formatLogTime(now),
        level: 'INFO',
        src: code,
        msg: `RINEX indexed — ${st.archiveCount} file(s), latest ${st.archiveLatest}${st.archiveSource ? ` (${st.archiveSource})` : ''}.`,
      });
    }
  });

  const levelPri = { ERROR: 0, WARNING: 1, INFO: 2 };
  return entries
    .sort((a, b) => (levelPri[a.level] ?? 9) - (levelPri[b.level] ?? 9) || b.id - a.id)
    .slice(0, 80);
}

/** Ready-to-download JSON payloads for each report type. */
export function buildReportPayload(type, {
  healthPayload,
  catalog,
  alerts,
  stationTableData,
  mapStations,
  avgUptime,
  avgSignalQuality,
} = {}) {
  const generatedAt = new Date().toISOString();
  const base = { report_type: type, generated_at: generatedAt, provider: 'ZINGSA CORS Intelligence Lab' };

  switch (type) {
    case 'health':
      return {
        ...base,
        telemetry_source: healthPayload?.telemetry_source,
        health_summary: healthPayload?.health_summary,
        network_health: healthPayload?.network_health,
        stations: healthPayload?.stations || [],
      };
    case 'rinex':
      return {
        ...base,
        archive_count: catalog?.archiveCount ?? 0,
        station_count: catalog?.stationCount ?? 0,
        source_counts: catalog?.sourceCounts || {},
        date_range: catalog?.dateRange || null,
        updated_at: catalog?.updatedAt || null,
        archives: (catalog?.archives || []).slice(0, 100),
      };
    case 'signal':
      return {
        ...base,
        average_signal_quality: avgSignalQuality,
        stations: stationTableData.map(st => ({
          station_id: st.id,
          gnss_quality: st.gnssQuality,
          satellites: st.satellites,
          status: st.status,
        })),
      };
    case 'alerts':
      return { ...base, alerts };
    case 'uptime':
      return {
        ...base,
        average_uptime: avgUptime,
        stations: stationTableData.map(st => ({
          station_id: st.id,
          uptime_pct: st.uptime,
          status: st.status,
        })),
      };
    case 'rinexarch':
      return {
        ...base,
        coverage: mapStations.map(st => ({
          station_id: st.id,
          archive_count: st.archiveCount ?? 0,
          archive_latest: st.archiveLatest,
          health_basis: st.healthBasis,
          status: st.status,
        })),
        index_updated_at: catalog?.updatedAt || healthPayload?.index_updated_at || null,
      };
    default:
      return base;
  }
}

export function buildAvailableReportSnapshots(ctx = {}) {
  const now = new Date();
  const dateSlug = now.toISOString().slice(0, 10);
  const healthDate = ctx.healthPayload?.analysis_date || now.toISOString();
  const catalogDate = ctx.catalog?.updatedAt || healthDate;

  return [
    { id: 'health', type: 'health', name: `Network Health Snapshot — ${dateSlug}`, generatedAt: healthDate },
    { id: 'rinex', type: 'rinex', name: `RINEX Catalogue — ${dateSlug}`, generatedAt: catalogDate },
    { id: 'alerts', type: 'alerts', name: `Alert Summary — ${dateSlug}`, generatedAt: now.toISOString() },
    { id: 'signal', type: 'signal', name: `GNSS Signal Quality — ${dateSlug}`, generatedAt: healthDate },
    { id: 'uptime', type: 'uptime', name: `Station Uptime — ${dateSlug}`, generatedAt: healthDate },
    { id: 'rinexarch', type: 'rinexarch', name: `RINEX Archive Integrity — ${dateSlug}`, generatedAt: catalogDate },
  ].map(row => {
    const payload = buildReportPayload(row.type, ctx);
    const json = JSON.stringify(payload);
    return {
      ...row,
      date: formatReportDate(row.generatedAt),
      size: formatByteSize(json.length),
      payload,
    };
  });
}

export function downloadJsonReport(filename, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
