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

export const PRIMARY_AVAILABILITY_STATIONS = [
  { id: 'HARA', name: 'Harare' },
  { id: 'BULA', name: 'Bulawayo' },
  { id: 'VICF', name: 'Victoria Falls' },
  { id: 'GWER', name: 'Gweru' },
];

export const IONOSPHERE_MONITOR_STATIONS = PRIMARY_AVAILABILITY_STATIONS;

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

export function resolveStationStatus(stationId, baseStatus) {
  return STATUS_OVERRIDE[stationId] ?? baseStatus;
}

export function buildMapStations(healthPayload) {
  const healthById = Object.fromEntries(
    (healthPayload?.stations || []).map(s => [s.station_id, s]),
  );

  return ZIMBABWE_CORS_STATIONS.map(st => {
    const api = healthById[st.id];
    const base = api ? mapApiStatus(api.status) : (st.status === 'degraded' ? 'warning' : st.status);
    return {
      ...st,
      status: resolveStationStatus(st.id, base),
      lastUpdate: api?.last_update || null,
      dataGapHrs: api?.data_gap_hrs ?? null,
      coordShiftMm: api?.coord_shift_mm ?? null,
    };
  });
}

export function buildStationTableData(mapStations) {
  return mapStations.map((st, i) => {
    const seed = seedFromId(st.id, i);
    const gnssQuality = st.status === 'critical'
      ? 28 + (seed % 18)
      : st.status === 'warning'
        ? 60 + (seed % 18)
        : st.status === 'offline'
          ? 0
          : 82 + (seed % 14);

    return {
      ...st,
      lastData: st.status === 'offline'
        ? '--:--:--'
        : st.lastUpdate
          ? new Date(st.lastUpdate).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
          : `0${8 + (i % 2)}:${String(30 + (i * 7 % 29)).padStart(2, '0')}:${String(i * 13 % 59).padStart(2, '0')}`,
      gnssQuality,
      satellites: st.status === 'offline' ? 0 : 8 + (seed % 9),
      latency: st.status === 'critical' || st.status === 'offline' ? null : 35 + seed % 120,
      rinexToday: st.status === 'offline' ? 0 : 22 + (seed % 3),
      uptime: st.status === 'offline'
        ? 0
        : st.status === 'critical'
          ? 72 + (seed % 14)
          : st.status === 'warning'
            ? 88 + (seed % 8)
            : 97 + (seed % 3),
    };
  });
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

export function buildAlertsFromStations(mapStations, { includeResolved = true } = {}) {
  const now = new Date();
  const fmt = d => d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const alerts = [];
  let id = 1;

  mapStations.forEach(st => {
    if (!['critical', 'warning', 'offline'].includes(st.status)) return;
    const templates = ALERT_TEMPLATES[st.status] || ALERT_TEMPLATES.warning;
    const tpl = templates[seedFromId(st.id) % templates.length];
    const minsAgo = 3 + (seedFromId(st.id, 7) % 45);
    alerts.push({
      id: id++,
      level: st.status === 'critical' ? 'CRITICAL' : st.status === 'offline' ? 'CRITICAL' : 'WARNING',
      station: st.id.replace(/_$/, ''),
      problem: tpl.problem,
      time: fmt(new Date(now.getTime() - minsAgo * 60000)),
      duration: `${minsAgo} min`,
      status: 'active',
      action: tpl.action,
    });
  });

  if (includeResolved) {
    const resolved = [
      { station: 'LUPA', level: 'INFO', problem: 'Scheduled maintenance', mins: 55 },
      { station: 'BEIT', level: 'INFO', problem: 'RINEX upload delayed', mins: 28 },
      { station: 'CHIM', level: 'CRITICAL', problem: 'Power interruption', mins: 224 },
      { station: 'ZINH', level: 'INFO', problem: 'Firmware update complete', mins: 2 },
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
  return PRIMARY_AVAILABILITY_STATIONS.map(ref => {
    const st = stationTableData.find(s => s.id === ref.id);
    const base = st?.uptime ?? 98;
    const monthly = Array.from({ length: 12 }, (_, m) => {
      const seed = seedFromId(ref.id, m);
      return Math.min(100, Math.max(90, Math.round(base - 2 + (seed % 5))));
    });
    return {
      station: ref.id.replace(/_$/, ''),
      name: ref.name,
      availability: base,
      monthly,
      status: st?.status === 'warning' ? 'warning' : st?.status === 'critical' || st?.status === 'offline' ? 'critical' : 'online',
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
