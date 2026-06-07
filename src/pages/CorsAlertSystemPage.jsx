import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Wifi, Radio, AlertTriangle, Activity, Clock,
  Bell, Settings, BarChart3, FileText, Layers,
  ChevronRight, Satellite, Search, Download, Database,
  RefreshCw, CheckCircle, XCircle, Filter, Eye,
  ToggleLeft, ToggleRight, Save, Mail, Phone, MessageCircle,
} from 'lucide-react';
import { ZIMBABWE_CORS_STATIONS } from '../data/zimbabweCorsStations.js';
import { AFRICA_TILE_LAYERS, africaMapTileLayerProps } from '../components/africaMapConfig.js';
import '../styles/cors-alert-system.css';

/* Shared mock data */
const STATUS_OVERRIDE = {
  CENT: 'critical', HACY: 'critical',
  HARA: 'warning',  MUTA: 'warning', BULA: 'warning',
  KARO: 'offline',
};

const MAP_STATIONS = ZIMBABWE_CORS_STATIONS.map(st => ({
  ...st,
  status: STATUS_OVERRIDE[st.id] ?? (st.status === 'degraded' ? 'warning' : st.status),
}));
const ZIMBABWE_MAP_CENTER = [-19.0, 29.6];
const ZIMBABWE_MAP_BOUNDS = [[-24.2, 22.8], [-13.8, 36.2]];

const ACTIVE_ALERTS = [
  { id: 1, level: 'CRITICAL', station: 'CENT', problem: 'Data stream offline',      time: '09:35', duration: '21 min',  status: 'active',   action: 'investigate' },
  { id: 2, level: 'WARNING',  station: 'HARA', problem: 'Low positioning accuracy', time: '09:42', duration: '14 min',  status: 'active',   action: 'monitor' },
  { id: 3, level: 'WARNING',  station: 'MUTA', problem: 'High multipath detected',  time: '09:50', duration: '6 min',   status: 'active',   action: 'monitor' },
  { id: 4, level: 'CRITICAL', station: 'HACY', problem: 'Internet connection lost', time: '09:51', duration: '5 min',   status: 'active',   action: 'investigate' },
  { id: 5, level: 'WARNING',  station: 'BULA', problem: 'High data latency',        time: '09:53', duration: '3 min',   status: 'active',   action: 'monitor' },
  { id: 6, level: 'INFO',     station: 'LUPA', problem: 'Scheduled maintenance',    time: '08:00', duration: '55 min',  status: 'resolved', action: 'view' },
  { id: 7, level: 'WARNING',  station: 'GWER', problem: 'Low satellite count',      time: '07:45', duration: '1h 11m',  status: 'resolved', action: 'view' },
  { id: 8, level: 'INFO',     station: 'BEIT', problem: 'RINEX upload delayed',     time: '07:30', duration: '28 min',  status: 'resolved', action: 'view' },
  { id: 9, level: 'CRITICAL', station: 'CHIM', problem: 'Power interruption',       time: '06:12', duration: '3h 44m',  status: 'resolved', action: 'view' },
  { id:10, level: 'INFO',     station: 'ZINH', problem: 'Firmware update complete', time: '05:00', duration: '2 min',   status: 'resolved', action: 'view' },
];

const NOTIFICATIONS = [
  { id: 1, station: 'CENT', msg: 'Data stream has been offline for more than 20 minutes.', time: '09:35', severity: 'critical' },
  { id: 2, station: 'MUTA', msg: 'High multipath detected. Check surroundings.',           time: '09:50', severity: 'warning' },
  { id: 3, station: 'BULA', msg: 'RINEX file upload successful.',                           time: '09:52', severity: 'info' },
];

const HEALTH = [
  { label: 'Normal',   value: 17, color: '#22c55e' },
  { label: 'Warning',  value:  4, color: '#f59e0b' },
  { label: 'Critical', value:  2, color: '#ef4444' },
  { label: 'Offline',  value:  1, color: '#64748b' },
];
const HEALTH_TOTAL = HEALTH.reduce((s, h) => s + h.value, 0);

const NAV_TABS = [
  { id: 'dashboard', label: 'Dashboard',  icon: BarChart3 },
  { id: 'stations',  label: 'Stations',   icon: Radio },
  { id: 'monitoring', label: 'Monitoring', icon: Activity },
  { id: 'alerts',    label: 'Alerts',     icon: AlertTriangle },
  { id: 'analysis',  label: 'Analysis',   icon: Eye },
  { id: 'reports',   label: 'Reports',    icon: FileText },
  { id: 'data-centre', label: 'Data Centre', icon: Database },
  { id: 'logs',      label: 'Logs',       icon: Layers },
  { id: 'settings',  label: 'Settings',   icon: Settings },
];

const STATION_POPUP_DETAILS = {
  CENT: { location: 'Centenary', lastData: '09:35:42', gnss: 'Poor',   gnssColor: 'red',   power: 'OK', internet: 'Offline', internetColor: 'red',   latency: '--' },
  HACY: { location: 'Harare',    lastData: '09:51:07', gnss: 'Fair',   gnssColor: 'orange',power: 'OK', internet: 'Offline', internetColor: 'red',   latency: '--' },
  HARA: { location: 'Harare',    lastData: '09:41:55', gnss: 'Fair',   gnssColor: 'orange',power: 'OK', internet: 'Online',  internetColor: 'green', latency: '145ms' },
  MUTA: { location: 'Mutare',    lastData: '09:49:33', gnss: 'Fair',   gnssColor: 'orange',power: 'OK', internet: 'Online',  internetColor: 'green', latency: '88ms' },
  BULA: { location: 'Bulawayo',  lastData: '09:52:10', gnss: 'Good',   gnssColor: 'green', power: 'OK', internet: 'Online',  internetColor: 'green', latency: '620ms' },
};

/* Station table extended data */
const STATION_TABLE_DATA = MAP_STATIONS.map((st, i) => ({
  ...st,
  lastData: st.status === 'offline' ? '--:--:--'
    : `0${8 + (i % 2)}:${String(30 + (i * 7 % 29)).padStart(2,'0')}:${String(i * 13 % 59).padStart(2,'0')}`,
  gnssQuality: st.status === 'critical' ? 28 + (i % 18)
    : st.status === 'warning' ? 60 + (i % 18)
    : 82 + (i % 14),
  satellites:  st.status === 'offline' ? 0 : 8 + (i % 9),
  latency:     st.status === 'critical' || st.status === 'offline' ? null : 35 + i * 18,
  rinexToday:  st.status === 'offline' ? 0 : 22 + (i % 3),
  uptime:      st.status === 'offline' ? 0
    : st.status === 'critical' ? 72 + (i % 14)
    : st.status === 'warning'  ? 88 + (i % 8)
    : 97 + (i % 3),
}));

/* Chart helpers */
function genSeries(base, amp, n = 25) {
  return Array.from({ length: n }, (_, i) =>
    Math.round((base + Math.sin(i * 0.6) * amp + (Math.random() - 0.5) * amp * 0.5) * 10) / 10
  );
}

const SIGNAL_DATA   = genSeries(78, 8);
const ACCURACY_DATA = genSeries(1.8, 0.4);
const ALERT_BARS = [
  { label: 'Critical', value: 3,  color: '#ef4444' },
  { label: 'Warning',  value: 4,  color: '#f59e0b' },
  { label: 'Resolved', value: 12, color: '#22c55e' },
  { label: 'Info',     value: 5,  color: '#3b82f6' },
];

/* 7-day uptime trend */
const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const UPTIME_7D = DAYS.map(d => ({ day: d, value: 96 + Math.random() * 3.5 }));
const MONITORING_TIME_WINDOWS = {
  week: {
    label: '7 days',
    uptimeTitle: 'Network Uptime - Last 7 Days',
    trendTitle: '7-Day GNSS Signal Quality Trend',
    kpiSub: 'Last 7 days',
    xLabels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    uptime: UPTIME_7D.map(d => ({ label: d.day, value: Math.round(d.value * 10) / 10 })),
    signalTrend: [82, 84, 83, 81, 85, 84, 86],
    accuracyTrend: [2.4, 2.2, 2.3, 2.5, 2.1, 2.2, 2.0],
  },
  month: {
    label: 'Month',
    uptimeTitle: 'Network Uptime - This Month',
    trendTitle: 'Monthly GNSS Signal Quality Trend',
    kpiSub: 'This month',
    xLabels: ['W1', 'W2', 'W3', 'W4', 'W5'],
    uptime: [
      { label: 'W1', value: 98.2 },
      { label: 'W2', value: 97.9 },
      { label: 'W3', value: 99.1 },
      { label: 'W4', value: 98.6 },
      { label: 'W5', value: 98.9 },
    ],
    signalTrend: [80, 82, 84, 83, 85],
    accuracyTrend: [2.7, 2.5, 2.3, 2.4, 2.2],
  },
  year: {
    label: 'Year',
    uptimeTitle: 'Network Uptime - 2026',
    trendTitle: 'Yearly GNSS Signal Quality Trend',
    kpiSub: '2026 average',
    xLabels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    uptime: [
      { label: 'Jan', value: 98.5 },
      { label: 'Feb', value: 98.1 },
      { label: 'Mar', value: 97.8 },
      { label: 'Apr', value: 98.7 },
      { label: 'May', value: 98.3 },
      { label: 'Jun', value: 99.0 },
      { label: 'Jul', value: 98.8 },
      { label: 'Aug', value: 99.1 },
      { label: 'Sep', value: 98.6 },
      { label: 'Oct', value: 98.4 },
      { label: 'Nov', value: 98.9 },
      { label: 'Dec', value: 99.2 },
    ],
    signalTrend: [78, 79, 81, 80, 82, 83, 82, 84, 85, 84, 86, 87],
    accuracyTrend: [3.0, 2.9, 2.7, 2.8, 2.5, 2.4, 2.5, 2.3, 2.2, 2.3, 2.1, 2.0],
  },
};
const AVAILABILITY_MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const GNSS_AVAILABILITY = [
  { station: 'HRE1', name: 'Harare', availability: 99.3, monthly: [99, 100, 99, 99, 100, 99, 99, 100, 99, 99, 100, 99] },
  { station: 'BYO1', name: 'Bulawayo', availability: 97.8, monthly: [98, 98, 96, 98, 99, 98, 98, 97, 98, 98, 99, 98] },
  { station: 'VFA1', name: 'Victoria Falls', availability: 99.1, monthly: [99, 99, 100, 99, 99, 99, 98, 99, 100, 99, 99, 99] },
  { station: 'GWE1', name: 'Gweru', availability: 98.4, monthly: [99, 98, 98, 99, 96, 99, 98, 99, 99, 98, 99, 99] },
];

/* Logs */
const LOG_ENTRIES = [
  { id:1,  ts:'09:56:01', level:'INFO',    src:'SYSTEM', msg:'Heartbeat check passed - all polling threads active.' },
  { id:2,  ts:'09:55:47', level:'ERROR',   src:'CENT',   msg:'TCP socket closed unexpectedly. Reconnect attempt 3/5.' },
  { id:3,  ts:'09:54:12', level:'WARNING', src:'MUTA',   msg:'C/N0 dropped below 38 dB-Hz on L2 frequency.' },
  { id:4,  ts:'09:53:08', level:'INFO',    src:'BULA',   msg:'RINEX 3.04 file BUL_20250520_0950.obs queued for upload.' },
  { id:5,  ts:'09:52:44', level:'ERROR',   src:'HACY',   msg:'NTP sync failed. Last sync was 48 min ago.' },
  { id:6,  ts:'09:51:30', level:'INFO',    src:'ZINH',   msg:'Epoch data received: 30-second interval, 14 SVs.' },
  { id:7,  ts:'09:50:55', level:'WARNING', src:'HARA',   msg:'Multipath indicator exceeded threshold (MP1 = 0.82 m).' },
  { id:8,  ts:'09:49:18', level:'INFO',    src:'LUPA',   msg:'Stream reconnected successfully after scheduled restart.' },
  { id:9,  ts:'09:47:03', level:'INFO',    src:'SYSTEM', msg:'Alert engine processed 24 new data frames.' },
  { id:10, ts:'09:45:22', level:'WARNING', src:'KWEK',   msg:'Data gap detected: 120-second outage on RTCM stream.' },
  { id:11, ts:'09:44:01', level:'INFO',    src:'BEIT',   msg:'Daily RINEX archive synced to remote storage.' },
  { id:12, ts:'09:42:30', level:'ERROR',   src:'CENT',   msg:'Connection attempt failed: host unreachable (timeout 30s).' },
];

/* Reports */
const REPORT_TYPES = [
  { id:'rinex',    title:'RINEX Data Report',       desc:'Daily file availability, gaps and quality metrics',   icon: FileText,  color:'#3b82f6' },
  { id:'health',   title:'Network Health Report',   desc:'Station uptime, latency and connectivity summary',    icon: Activity,  color:'#22c55e' },
  { id:'signal',   title:'GNSS Signal Quality',     desc:'C/N0 ratios, multipath and satellite tracking stats', icon: Radio,     color:'#a78bfa' },
  { id:'alerts',   title:'Alert History Report',    desc:'Full incident log with resolution times and trends',  icon: AlertTriangle, color:'#f59e0b' },
  { id:'uptime',   title:'Station Uptime Summary',  desc:'Monthly uptime percentages per station',             icon: CheckCircle,   color:'#22d3ee' },
  { id:'rinexarch','title':'RINEX Archive Integrity','desc':'MD5 checksums and completeness verification',      icon: Layers,    color:'#f97316' },
];

const RECENT_REPORTS = [
  { id:1, name:'Network Health - 19 May 2025',  type:'health',  size:'1.2 MB', date:'19 May 09:00', status:'ready' },
  { id:2, name:'RINEX Availability - 19 May',   type:'rinex',   size:'840 KB', date:'19 May 00:05', status:'ready' },
  { id:3, name:'GNSS Signal Quality - Week 20', type:'signal',  size:'3.4 MB', date:'18 May 23:59', status:'ready' },
  { id:4, name:'Alert History - May 2025',       type:'alerts',  size:'560 KB', date:'18 May 08:00', status:'ready' },
  { id:5, name:'Station Uptime - April 2025',    type:'uptime',  size:'220 KB', date:'01 May 00:01', status:'ready' },
];

/* Shared chart components */
function DonutChart({ segments, total, size = 130, strokeWidth = 22 }) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const tot = total || segments.reduce((s, seg) => s + seg.value, 0) || 1;
  let cumLen = 0;
  return (
    <svg width={size} height={size} style={{ display: 'block', transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} />
      {segments.map((seg, i) => {
        const arcLen = (seg.value / tot) * circ;
        const dashOff = -cumLen;
        cumLen += arcLen;
        return (
          <circle key={i} cx={size/2} cy={size/2} r={r}
            fill="none" stroke={seg.color} strokeWidth={strokeWidth}
            strokeDasharray={`${arcLen} ${circ}`} strokeDashoffset={dashOff} />
        );
      })}
    </svg>
  );
}

function MultiLineChart({ series, width = 300, height = 80 }) {
  const all = series.flatMap(s => s.data);
  if (!all.length) return null;
  const min = Math.min(...all), max = Math.max(...all), range = max - min || 1;
  const p = { l: 30, r: 6, t: 4, b: 4 };
  const W = width - p.l - p.r, H = height - p.t - p.b;
  const pts = data =>
    data.map((v, i) =>
      `${p.l + (i / (data.length - 1)) * W},${p.t + H - ((v - min) / range) * H}`
    ).join(' ');
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      {[0,1,2].map(i => {
        const y = p.t + (i / 2) * H;
        return <line key={i} x1={p.l} y1={y} x2={width - p.r} y2={y}
          stroke="rgba(255,255,255,0.05)" strokeWidth="1" />;
      })}
      {series.map((s, i) => (
        <polyline key={i} points={pts(s.data)}
          fill="none" stroke={s.color} strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </svg>
  );
}

function BarChart({ bars, width = 200, height = 90 }) {
  const maxVal = Math.max(...bars.map(b => b.value)) || 1;
  const barW = Math.floor((width - (bars.length - 1) * 8) / bars.length);
  const chartH = height - 24;
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
      {bars.map((bar, i) => {
        const x = i * (barW + 8);
        const bh = Math.max(4, (bar.value / maxVal) * chartH);
        const y = chartH - bh;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={bh} fill={bar.color} rx="3" opacity="0.9" />
            <text x={x + barW/2} y={y-3} textAnchor="middle" fontSize="9" fill="#f1f5f9" fontWeight="700">{bar.value}</text>
            <text x={x + barW/2} y={height-2} textAnchor="middle" fontSize="8" fill="#64748b">{bar.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

function markerColor(status) {
  if (status === 'critical') return '#ef4444';
  if (status === 'warning' || status === 'degraded') return '#f59e0b';
  if (status === 'offline') return '#64748b';
  return '#22c55e';
}

function StatusBadge({ status }) {
  const cfg = {
    online:   { label: 'Online',   cls: 'cas-badge-green'  },
    warning:  { label: 'Warning',  cls: 'cas-badge-orange' },
    critical: { label: 'Critical', cls: 'cas-badge-red'    },
    offline:  { label: 'Offline',  cls: 'cas-badge-gray'   },
  };
  const { label, cls } = cfg[status] || cfg.offline;
  return <span className={`cas-status-badge ${cls}`}>{label}</span>;
}

/* TAB: STATIONS */
function StationsView() {
  const [filter, setFilter] = useState('all');
  const [search, setSearch]  = useState('');

  const counts = {
    all:      STATION_TABLE_DATA.length,
    online:   STATION_TABLE_DATA.filter(s => s.status === 'online').length,
    warning:  STATION_TABLE_DATA.filter(s => s.status === 'warning').length,
    critical: STATION_TABLE_DATA.filter(s => s.status === 'critical').length,
    offline:  STATION_TABLE_DATA.filter(s => s.status === 'offline').length,
  };

  const filtered = STATION_TABLE_DATA.filter(st => {
    if (filter !== 'all' && st.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!st.id.toLowerCase().includes(q) && !st.name.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const FILTERS = [
    { key: 'all',      label: 'All Stations', color: '#94a3b8' },
    { key: 'online',   label: 'Online',       color: '#22c55e' },
    { key: 'warning',  label: 'Warning',      color: '#f59e0b' },
    { key: 'critical', label: 'Critical',     color: '#ef4444' },
    { key: 'offline',  label: 'Offline',      color: '#64748b' },
  ];

  return (
    <div>
      <div className="cas-tab-header">
        <div>
          <h2 className="cas-tab-title">CORS Stations</h2>
          <p className="cas-tab-subtitle">All {STATION_TABLE_DATA.length} stations in the ZimCORS network</p>
        </div>
        <button type="button" className="cas-btn-primary"><RefreshCw size={13} /> Refresh</button>
      </div>

      <div className="cas-filter-bar">
        <div className="cas-filter-tabs">
          {FILTERS.map(f => (
            <button key={f.key} type="button"
              className={`cas-filter-tab${filter === f.key ? ' active' : ''}`}
              style={filter === f.key ? { '--fc': f.color } : {}}
              onClick={() => setFilter(f.key)}>
              {f.label}
              <span className="cas-filter-count">{counts[f.key]}</span>
            </button>
          ))}
        </div>
        <div className="cas-search-box">
          <Search size={13} />
          <input
            type="text"
            placeholder="Search by ID or name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="cas-card">
        <table className="cas-data-table">
          <thead>
            <tr>
              <th>Station ID</th>
              <th>Name</th>
              <th>Coordinates</th>
              <th>Status</th>
              <th>Last Data</th>
              <th>GNSS Quality</th>
              <th>Satellites</th>
              <th>Latency</th>
              <th>RINEX Today</th>
              <th>Uptime</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(st => (
              <tr key={st.id}>
                <td><span className="cas-station-id">{st.id}</span></td>
                <td className="cas-text-muted">{st.name}</td>
                <td className="cas-text-mono">{st.lat.toFixed(3)} deg, {st.lon.toFixed(3)} deg</td>
                <td><StatusBadge status={st.status} /></td>
                <td className="cas-text-mono">{st.lastData}</td>
                <td>
                  <div className="cas-quality-bar">
                    <div className="cas-quality-fill"
                      style={{
                        width: `${st.gnssQuality}%`,
                        background: st.gnssQuality > 80 ? '#22c55e' : st.gnssQuality > 60 ? '#f59e0b' : '#ef4444',
                      }} />
                    <span>{st.gnssQuality}%</span>
                  </div>
                </td>
                <td className="cas-text-center">{st.satellites || '-'}</td>
                <td className="cas-text-mono">{st.latency ? `${st.latency} ms` : '-'}</td>
                <td className="cas-text-center">{st.rinexToday > 0 ? `${st.rinexToday}/24` : '-'}</td>
                <td>
                  <span style={{ color: st.uptime >= 95 ? '#22c55e' : st.uptime >= 80 ? '#f59e0b' : '#ef4444', fontWeight: 700, fontSize: '0.72rem' }}>
                    {st.uptime > 0 ? `${st.uptime}%` : '-'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="cas-empty">No stations match the current filter.</div>
        )}
      </div>
    </div>
  );
}

/* TAB: ALERTS */
function AlertsView() {
  const [filter, setFilter] = useState('all');

  const counts = {
    all:      ACTIVE_ALERTS.length,
    critical: ACTIVE_ALERTS.filter(a => a.level === 'CRITICAL').length,
    warning:  ACTIVE_ALERTS.filter(a => a.level === 'WARNING').length,
    resolved: ACTIVE_ALERTS.filter(a => a.status === 'resolved').length,
    info:     ACTIVE_ALERTS.filter(a => a.level === 'INFO').length,
  };

  const filtered = ACTIVE_ALERTS.filter(a => {
    if (filter === 'all')      return true;
    if (filter === 'resolved') return a.status === 'resolved';
    return a.level === filter.toUpperCase();
  });

  const SUMMARY = [
    { label: 'Active Critical', value: ACTIVE_ALERTS.filter(a=>a.level==='CRITICAL'&&a.status==='active').length, color:'#ef4444', bg:'rgba(239,68,68,0.1)' },
    { label: 'Active Warning',  value: ACTIVE_ALERTS.filter(a=>a.level==='WARNING'&&a.status==='active').length,  color:'#f59e0b', bg:'rgba(245,158,11,0.1)' },
    { label: 'Resolved Today',  value: ACTIVE_ALERTS.filter(a=>a.status==='resolved').length,                     color:'#22c55e', bg:'rgba(34,197,94,0.1)'  },
    { label: 'Total Today',     value: ACTIVE_ALERTS.length,                                                      color:'#60a5fa', bg:'rgba(96,165,250,0.1)' },
  ];

  const ALERT_FILTERS = [
    { key:'all',      label:'All',      count: counts.all },
    { key:'critical', label:'Critical', count: counts.critical },
    { key:'warning',  label:'Warning',  count: counts.warning },
    { key:'resolved', label:'Resolved', count: counts.resolved },
    { key:'info',     label:'Info',     count: counts.info },
  ];

  return (
    <div>
      <div className="cas-tab-header">
        <div>
          <h2 className="cas-tab-title">Alert Management</h2>
          <p className="cas-tab-subtitle">Active and historical alerts for today</p>
        </div>
        <button type="button" className="cas-btn-primary"><RefreshCw size={13} /> Refresh</button>
      </div>

      <div className="cas-summary-cards">
        {SUMMARY.map(s => (
          <div key={s.label} className="cas-summary-card" style={{ borderColor: s.color, background: s.bg }}>
            <div className="cas-summary-value" style={{ color: s.color }}>{s.value}</div>
            <div className="cas-summary-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="cas-filter-bar">
        <div className="cas-filter-tabs">
          {ALERT_FILTERS.map(f => (
            <button key={f.key} type="button"
              className={`cas-filter-tab${filter === f.key ? ' active' : ''}`}
              onClick={() => setFilter(f.key)}>
              {f.label}
              <span className="cas-filter-count">{f.count}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="cas-card">
        <table className="cas-data-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Level</th>
              <th>Station</th>
              <th>Problem</th>
              <th>Duration</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(a => (
              <tr key={a.id}>
                <td className="cas-text-mono">{a.time}</td>
                <td><span className={`cas-level-badge ${a.level.toLowerCase()}`}>{a.level}</span></td>
                <td><span className="cas-station-id">{a.station}</span></td>
                <td className="cas-text-muted">{a.problem}</td>
                <td className="cas-text-mono">{a.duration}</td>
                <td>
                  {a.status === 'active'
                    ? <span className="cas-status-active">Active</span>
                    : <span className="cas-status-resolved"><CheckCircle size={11} /> Resolved</span>}
                </td>
                <td>
                  {a.action !== 'view'
                    ? <button type="button" className={`cas-action-btn ${a.action}`}>
                        {a.action === 'investigate' ? 'Investigate' : 'Monitor'}
                      </button>
                    : <button type="button" className="cas-action-btn view"><Eye size={11} /> View</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* TAB: ANALYSIS */
function AnalysisView() {
  const activeAlerts = ACTIVE_ALERTS.filter(a => a.status === 'active');
  const criticalAlerts = activeAlerts.filter(a => a.level === 'CRITICAL').length;
  const warningAlerts = activeAlerts.filter(a => a.level === 'WARNING').length;
  const onlineCount = MAP_STATIONS.filter(s => s.status === 'online').length;
  const networkHealth = Math.round((onlineCount / MAP_STATIONS.length) * 100);
  const avgSignal = Math.round(STATION_TABLE_DATA.reduce((sum, st) => sum + st.gnssQuality, 0) / STATION_TABLE_DATA.length);
  const avgUptime = (STATION_TABLE_DATA.reduce((sum, st) => sum + st.uptime, 0) / STATION_TABLE_DATA.length).toFixed(1);

  const insightCards = [
    {
      tone: 'cyan',
      title: 'What The Data Shows',
      icon: 'DATA',
      text: `The ZimCORS network is operating at ${networkHealth}% health with ${onlineCount}/${MAP_STATIONS.length} stations online. Current alert load includes ${criticalAlerts} critical and ${warningAlerts} warning events.`,
    },
    {
      tone: 'orange',
      title: 'Why It Matters',
      icon: 'WHY',
      text: 'Stable CORS telemetry protects centimetre-level positioning for survey work, construction control, drone mapping, disaster response, and national geospatial services.',
    },
    {
      tone: 'red',
      title: 'Risks Detected',
      icon: 'RISK',
      text: 'Offline streams, low signal quality, and high latency can reduce RTK reliability. Stations with persistent gaps should be investigated before precision field campaigns.',
    },
    {
      tone: 'green',
      title: 'Recommended Action',
      icon: 'ACTION',
      text: 'Prioritize critical stations, verify receiver power and internet links, confirm NTRIP mountpoints, and notify field teams through enabled alert channels.',
    },
    {
      tone: 'violet',
      title: 'How CORS/GNSS Contributes',
      icon: 'GNSS',
      text: 'CORS station telemetry confirms reference-frame stability, correction availability, RINEX completeness, and network readiness for downstream applications.',
    },
  ];

  const recommendations = [
    'Dispatch technical checks for critical stations with offline streams or missing receiver telemetry.',
    'Publish current NTRIP and station-health status to surveyors, engineers, and emergency-response teams.',
    'Use WhatsApp, email, and webhook alerts for critical outages so operations teams receive rapid notifications.',
    'Archive daily RINEX files and station metadata for deformation monitoring, quality audits, and long-term analysis.',
  ];

  return (
    <div>
      <div className="cas-tab-header">
        <div>
          <h2 className="cas-tab-title">Analysis</h2>
          <p className="cas-tab-subtitle">Operational interpretation of CORS station health, alerts and GNSS readiness</p>
        </div>
      </div>

      <section className="cas-analysis-panel">
        <div className="cas-analysis-title">Analysis Explanation - Zimbabwe CORS Alert Network</div>
        <div className="cas-analysis-grid">
          {insightCards.map(card => (
            <article key={card.title} className={`cas-analysis-card ${card.tone}`}>
              <h3>{card.icon} {card.title}</h3>
              <p>{card.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="cas-analysis-panel">
        <div className="cas-analysis-title">Policy &amp; Action Recommendations</div>
        <div className="cas-recommendation-grid">
          {recommendations.map((text, index) => (
            <article key={text} className="cas-recommendation-card">
              <span>{index + 1}</span>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="cas-analysis-metrics">
        {[
          ['Network health', `${networkHealth}%`],
          ['Average signal quality', `${avgSignal}%`],
          ['Average uptime', `${avgUptime}%`],
          ['Active alerts', activeAlerts.length],
        ].map(([label, value]) => (
          <div key={label} className="cas-analysis-metric">
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </section>
    </div>
  );
}

function ReportsView() {
  const [generating, setGenerating] = useState(null);

  function handleGenerate(id) {
    setGenerating(id);
    setTimeout(() => setGenerating(null), 2000);
  }

  return (
    <div>
      <div className="cas-tab-header">
        <div>
          <h2 className="cas-tab-title">Reports</h2>
          <p className="cas-tab-subtitle">Generate and download CORS network reports</p>
        </div>
      </div>

      <div className="cas-section-label">Available Report Types</div>
      <div className="cas-reports-grid">
        {REPORT_TYPES.map(r => {
          const Icon = r.icon;
          return (
            <div key={r.id} className="cas-report-card" style={{ '--rc': r.color }}>
              <div className="cas-report-icon" style={{ background: `${r.color}1a`, color: r.color }}>
                <Icon size={20} />
              </div>
              <div className="cas-report-info">
                <div className="cas-report-title">{r.title}</div>
                <div className="cas-report-desc">{r.desc}</div>
              </div>
              <button type="button" className="cas-report-gen-btn"
                onClick={() => handleGenerate(r.id)}
                style={{ borderColor: r.color, color: r.color }}>
                {generating === r.id ? <><RefreshCw size={12} /> Generating...</> : 'Generate'}
              </button>
            </div>
          );
        })}
      </div>

      <div className="cas-section-label" style={{ marginTop: 24 }}>Recent Reports</div>
      <div className="cas-card">
        <table className="cas-data-table">
          <thead>
            <tr><th>Report Name</th><th>Type</th><th>Size</th><th>Generated</th><th>Action</th></tr>
          </thead>
          <tbody>
            {RECENT_REPORTS.map(r => (
              <tr key={r.id}>
                <td><span className="cas-station-id" style={{ color: '#e2e8f0', fontSize: '0.73rem' }}>{r.name}</span></td>
                <td><span className="cas-text-muted" style={{ textTransform:'capitalize' }}>{r.type}</span></td>
                <td className="cas-text-mono">{r.size}</td>
                <td className="cas-text-muted">{r.date}</td>
                <td>
                  <button type="button" className="cas-action-btn monitor">
                    <Download size={11} /> Download
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* TAB: MONITORING / DATA CENTRE */
function AnalyticsView({
  title = 'Monitoring',
  subtitle = 'Network performance metrics and trends',
}) {
  const [timeWindow, setTimeWindow] = useState('week');
  const activeWindow = MONITORING_TIME_WINDOWS[timeWindow];
  const avgUptime = (
    activeWindow.uptime.reduce((sum, item) => sum + item.value, 0) / activeWindow.uptime.length
  ).toFixed(1);
  const avgSignal = (
    activeWindow.signalTrend.reduce((sum, item) => sum + item, 0) / activeWindow.signalTrend.length
  ).toFixed(1);
  const avgAccuracy = (
    activeWindow.accuracyTrend.reduce((sum, item) => sum + item, 0) / activeWindow.accuracyTrend.length
  ).toFixed(1);

  const uptimeBars = activeWindow.uptime.map(d => ({
    label: d.label,
    value: d.value,
    color: d.value >= 99 ? '#22c55e' : d.value >= 97 ? '#f59e0b' : '#ef4444',
  }));

  const rangeSignalLift = { week: 0, month: 2, year: 4 }[timeWindow];
  const signalByStation = STATION_TABLE_DATA.slice(0, 8).map(st => ({
    label: st.id,
    value: Math.min(99, st.gnssQuality + rangeSignalLift),
    color: st.gnssQuality + rangeSignalLift > 80 ? '#22c55e' : st.gnssQuality + rangeSignalLift > 60 ? '#f59e0b' : '#ef4444',
  }));

  const KPI = [
    { label: 'Avg Network Uptime', value: `${avgUptime}%`,  sub: activeWindow.kpiSub,  color: '#22c55e' },
    { label: 'Avg Signal Quality', value: `${avgSignal}%`,  sub: activeWindow.kpiSub, color: '#3b82f6' },
    { label: 'RINEX Completeness', value: timeWindow === 'year' ? '96.4%' : timeWindow === 'month' ? '94.8%' : '92.0%',  sub: activeWindow.kpiSub, color: '#a78bfa' },
    { label: 'Mean Accuracy',      value: `${avgAccuracy} cm`, sub: activeWindow.kpiSub,  color: '#22d3ee' },
  ];

  return (
    <div>
      <div className="cas-tab-header">
        <div>
          <h2 className="cas-tab-title">{title}</h2>
          <p className="cas-tab-subtitle">{subtitle}</p>
        </div>
        <label className="cas-time-window-control">
          <span>Time window</span>
          <select value={timeWindow} onChange={event => setTimeWindow(event.target.value)}>
            {Object.entries(MONITORING_TIME_WINDOWS).map(([key, option]) => (
              <option key={key} value={key}>{option.label}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="cas-kpi-row">
        {KPI.map(k => (
          <div key={k.label} className="cas-kpi-card" style={{ '--kc': k.color }}>
            <div className="cas-kpi-value" style={{ color: k.color }}>{k.value}</div>
            <div className="cas-kpi-label">{k.label}</div>
            <div className="cas-kpi-sub">{k.sub}</div>
          </div>
        ))}
      </div>

      <div className="cas-analytics-grid">
        <div className="cas-card">
          <div className="cas-card-header">
            <span className="cas-card-title">{activeWindow.uptimeTitle}</span>
          </div>
          <div className="cas-barchart-body" style={{ height: 180 }}>
            <div className="cas-bar-svg-wrap">
              <BarChart bars={uptimeBars} width={500} height={155} />
            </div>
          </div>
        </div>

        <div className="cas-card">
          <div className="cas-card-header">
            <span className="cas-card-title">GNSS Signal Quality by Station</span>
          </div>
          <div className="cas-barchart-body" style={{ height: 180 }}>
            <div className="cas-bar-svg-wrap">
              <BarChart bars={signalByStation} width={500} height={155} />
            </div>
          </div>
        </div>

        <div className="cas-card" style={{ gridColumn: '1 / -1' }}>
          <div className="cas-card-header">
            <span className="cas-card-title">{activeWindow.trendTitle}</span>
          </div>
          <div className="cas-linechart-body" style={{ height: 180 }}>
            <div className="cas-chart-svg-wrap">
              <MultiLineChart width={900} height={120}
                series={[
                  { data: activeWindow.signalTrend,   color: '#22c55e' },
                  { data: activeWindow.accuracyTrend, color: '#3b82f6' },
                ]} />
            </div>
            <div className="cas-x-labels">
              {activeWindow.xLabels.map(t => (
                <span key={t}>{t}</span>
              ))}
            </div>
            <div className="cas-chart-legend">
              <div className="cas-chart-legend-item">
                <div className="cas-chart-legend-line" style={{ background: '#22c55e' }} /> Avg Signal Quality (%)
              </div>
              <div className="cas-chart-legend-item">
                <div className="cas-chart-legend-line" style={{ background: '#3b82f6' }} /> Positioning Accuracy (cm)
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* TAB: LOGS */
function LogsView() {
  const [filter, setFilter] = useState('all');
  const [autoRefresh, setAutoRefresh] = useState(false);

  const filtered = LOG_ENTRIES.filter(l =>
    filter === 'all' ? true : l.level.toLowerCase() === filter
  );

  const LOG_COLORS = { ERROR:'#ef4444', WARNING:'#f59e0b', INFO:'#60a5fa' };

  return (
    <div>
      <div className="cas-tab-header">
        <div>
          <h2 className="cas-tab-title">System Logs</h2>
          <p className="cas-tab-subtitle">Real-time event log from all stations and services</p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <button type="button" className="cas-toggle-btn" onClick={() => setAutoRefresh(v => !v)}>
            {autoRefresh ? <ToggleRight size={18} color="#22c55e" /> : <ToggleLeft size={18} color="#64748b" />}
            <span style={{ color: autoRefresh ? '#22c55e' : '#64748b', fontSize:'0.72rem', fontWeight:600 }}>
              Auto-refresh
            </span>
          </button>
          <button type="button" className="cas-btn-primary"><RefreshCw size={13} /> Refresh</button>
        </div>
      </div>

      <div className="cas-filter-bar">
        <div className="cas-filter-tabs">
          {[['all','All',LOG_ENTRIES.length],
            ['error','Error',LOG_ENTRIES.filter(l=>l.level==='ERROR').length],
            ['warning','Warning',LOG_ENTRIES.filter(l=>l.level==='WARNING').length],
            ['info','Info',LOG_ENTRIES.filter(l=>l.level==='INFO').length]
          ].map(([key,label,count]) => (
            <button key={key} type="button"
              className={`cas-filter-tab${filter===key?' active':''}`}
              onClick={() => setFilter(key)}>
              {label}<span className="cas-filter-count">{count}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="cas-card">
        <table className="cas-data-table cas-log-table">
          <thead>
            <tr><th>Timestamp</th><th>Level</th><th>Source</th><th>Message</th></tr>
          </thead>
          <tbody>
            {filtered.map(entry => (
              <tr key={entry.id}>
                <td className="cas-text-mono" style={{ color:'#64748b' }}>{entry.ts}</td>
                <td>
                  <span className="cas-log-level" style={{
                    color: LOG_COLORS[entry.level],
                    background: `${LOG_COLORS[entry.level]}18`,
                    border: `1px solid ${LOG_COLORS[entry.level]}30`,
                  }}>
                    {entry.level}
                  </span>
                </td>
                <td><span className="cas-station-id" style={{ fontSize:'0.7rem' }}>{entry.src}</span></td>
                <td style={{ color:'#94a3b8', fontSize:'0.71rem' }}>{entry.msg}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* TAB: SETTINGS */
function SettingsView() {
  const [thresholds, setThresholds] = useState({
    latencyWarn: 500, latencyCrit: 1000,
    signalWarn: 60,   signalCrit: 40,
    gapWarn: 60,      gapCrit: 300,
  });
  const [notifications, setNotifications] = useState({
    email: true, sms: false, whatsapp: true, webhook: true,
  });
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div>
      <div className="cas-tab-header">
        <div>
          <h2 className="cas-tab-title">Settings</h2>
          <p className="cas-tab-subtitle">Configure alert thresholds, notifications and network parameters</p>
        </div>
        <button type="button" className="cas-btn-primary" onClick={handleSave}
          style={saved ? { background:'rgba(34,197,94,0.2)', borderColor:'#22c55e', color:'#22c55e' } : {}}>
          {saved ? <><CheckCircle size={13} /> Saved!</> : <><Save size={13} /> Save Changes</>}
        </button>
      </div>

      <div className="cas-settings-grid">

        {/* Alert Thresholds */}
        <div className="cas-card">
          <div className="cas-card-header">
            <span className="cas-card-title">Alert Thresholds</span>
          </div>
          <div className="cas-settings-body">
            {[
              { label:'Data Gap Warning (sec)',   key:'gapWarn',      max:600 },
              { label:'Data Gap Critical (sec)',  key:'gapCrit',      max:600 },
              { label:'Latency Warning (ms)',     key:'latencyWarn',  max:2000 },
              { label:'Latency Critical (ms)',    key:'latencyCrit',  max:2000 },
              { label:'Signal Quality Warn (%)',  key:'signalWarn',   max:100 },
              { label:'Signal Quality Crit (%)',  key:'signalCrit',   max:100 },
            ].map(({ label, key, max }) => (
              <div key={key} className="cas-setting-row">
                <label className="cas-setting-label">{label}</label>
                <div className="cas-setting-input-group">
                  <input type="range" min={0} max={max}
                    value={thresholds[key]}
                    onChange={e => setThresholds(t => ({ ...t, [key]: +e.target.value }))} />
                  <span className="cas-setting-value">{thresholds[key]}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Notifications */}
        <div className="cas-card">
          <div className="cas-card-header">
            <span className="cas-card-title">Notification Channels</span>
          </div>
          <div className="cas-settings-body">
            {[
              { key:'email',   label:'Email Alerts',   icon: Mail,  desc:'Send critical/warning alerts via email' },
              { key:'sms',     label:'SMS Alerts',     icon: Phone, desc:'Send critical alerts via SMS' },
              { key:'whatsapp', label:'WhatsApp Alerts', icon: MessageCircle, desc:'Send critical/warning alerts via WhatsApp' },
              { key:'webhook', label:'Webhook / API',  icon: Radio, desc:'POST alerts to external endpoint' },
            ].map(({ key, label, icon: Icon, desc }) => (
              <div key={key} className="cas-notif-toggle-row">
                <div className="cas-notif-toggle-left">
                  <div className="cas-notif-toggle-icon"><Icon size={15} /></div>
                  <div>
                    <div className="cas-notif-toggle-label">{label}</div>
                    <div className="cas-notif-toggle-desc">{desc}</div>
                  </div>
                </div>
                <button type="button" className="cas-toggle-btn"
                  onClick={() => setNotifications(n => ({ ...n, [key]: !n[key] }))}>
                  {notifications[key]
                    ? <ToggleRight size={26} color="#22c55e" />
                    : <ToggleLeft  size={26} color="#475569" />}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* System Info */}
        <div className="cas-card">
          <div className="cas-card-header">
            <span className="cas-card-title">System Information</span>
          </div>
          <div className="cas-settings-body">
            {[
              ['System',      'ZINGSA CORS Alert System v2.1.0'],
              ['Network',     'ZimCORS - Zimbabwe National CORS'],
              ['Stations',    `${MAP_STATIONS.length} registered`],
              ['Data Format', 'RINEX 3.04 / RTCM 3.3'],
              ['Time Zone',   'UTC +2 (CAT)'],
              ['Last Restart','20 May 2025 06:00:00'],
            ].map(([label, value]) => (
              <div key={label} className="cas-info-row">
                <span className="cas-info-label">{label}</span>
                <span className="cas-info-value">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* Main page */
export default function CorsAlertSystemPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedStation, setSelectedStation] = useState(null);
  const [corsMapTileMode, setCorsMapTileMode] = useState('hybrid');
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const fmtTime = useCallback(d =>
    d.toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit', second:'2-digit' }), []);

  const fmtDate = useCallback(d =>
    d.toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long', year:'numeric' }), []);

  const onlineCount = MAP_STATIONS.filter(s => s.status === 'online').length;
  const onlinePct   = Math.round((onlineCount / MAP_STATIONS.length) * 100);
  const corsMapTileProps = africaMapTileLayerProps(corsMapTileMode);

  return (
    <div className="cas-page">

      {/* Navigation */}
      <nav className="cas-nav">
        <div className="cas-nav-brand">
          <div className="cas-nav-logo"><Satellite size={18} color="#fff" /></div>
          <div className="cas-nav-title">
            <strong>ZINGSA NCORS</strong>
            <span>National CORS Infrastructure Services</span>
          </div>
        </div>

        <div className="cas-nav-tabs">
          {NAV_TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button"
              className={`cas-nav-tab${activeTab === id ? ' active' : ''}`}
              onClick={() => setActiveTab(id)}>
              <Icon size={13} />{label}
            </button>
          ))}
        </div>

        <div className="cas-nav-right">
          <button type="button" className="cas-bell-btn">
            <Bell size={18} />
            <span className="cas-badge">7</span>
          </button>
        </div>
      </nav>

      {/* Body */}
      <div className="cas-body">

        {/* Dashboard tab */}
        {activeTab === 'dashboard' && (
          <>
            {/* Stats row */}
            <div className="cas-stats-row">
              <div className="cas-stat-card">
                <div className="cas-stat-left">
                  <div className="cas-stat-label">Network Status</div>
                  <div className="cas-stat-value green">ONLINE</div>
                  <div className="cas-stat-note">All systems operational</div>
                </div>
                <div className="cas-stat-icon" style={{ background:'rgba(34,197,94,0.12)', color:'#22c55e' }}>
                  <Wifi size={22} />
                </div>
              </div>

              <div className="cas-stat-card">
                <div className="cas-stat-left">
                  <div className="cas-stat-label">Active Stations</div>
                  <div className="cas-stat-value blue">
                    {onlineCount} <span style={{ fontSize:'0.9rem', color:'#475569' }}>/ {MAP_STATIONS.length}</span>
                  </div>
                  <div className="cas-stat-note">{onlinePct}% Online</div>
                </div>
                <div className="cas-stat-icon" style={{ background:'rgba(96,165,250,0.12)', color:'#60a5fa' }}>
                  <Radio size={22} />
                </div>
              </div>

              <div className="cas-stat-card">
                <div className="cas-stat-left">
                  <div className="cas-stat-label">Active Alerts</div>
                  <div className="cas-stat-value orange">7</div>
                  <div className="cas-stat-note">
                    <span className="cas-stat-dot" style={{ background:'#ef4444' }} /> 3 Critical&nbsp;&nbsp;
                    <span className="cas-stat-dot" style={{ background:'#f59e0b' }} /> 4 Warning
                  </div>
                </div>
                <div className="cas-stat-icon" style={{ background:'rgba(245,158,11,0.12)', color:'#f59e0b' }}>
                  <AlertTriangle size={22} />
                </div>
              </div>

              <div className="cas-stat-card">
                <div className="cas-stat-left">
                  <div className="cas-stat-label">Today&apos;s Uptime</div>
                  <div className="cas-stat-value green">99.2%</div>
                  <div className="cas-stat-note">Target: &gt;=98%</div>
                </div>
                <div className="cas-stat-icon" style={{ background:'rgba(34,197,94,0.12)', color:'#22c55e' }}>
                  <Activity size={22} />
                </div>
              </div>

              <div className="cas-stat-card">
                <div className="cas-stat-left">
                  <div className="cas-stat-label">Last Data Received</div>
                  <div className="cas-stat-value" style={{ fontSize:'1.15rem' }}>{fmtTime(now)}</div>
                  <div className="cas-stat-note">
                    {now.toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' })}
                  </div>
                </div>
                <div className="cas-stat-icon" style={{ background:'rgba(96,165,250,0.12)', color:'#60a5fa' }}>
                  <Clock size={22} />
                </div>
              </div>
            </div>

            <section className="cas-gnss-intel">
              <div className="cas-card-header">
                <div>
                  <span className="cas-card-title">NCORS Network Monitor</span>
                  <p className="cas-gnss-subtitle">Real-Time GNSS Station Availability &amp; Service Status</p>
                </div>
                <span className="cas-gnss-pill">NCORS Monitoring</span>
              </div>
              <div className="cas-gnss-body">
                <div className="cas-availability-panel">
                  <div className="cas-availability-head">
                    <div>
                      <div className="cas-gnss-monitor-title">2026 Station Availability</div>
                      <p>IGS-style monthly uptime heatmap by CORS station</p>
                    </div>
                    <div className="cas-months">
                      {AVAILABILITY_MONTHS.map(month => <span key={month}>{month}</span>)}
                    </div>
                  </div>
                  <div className="cas-availability-legend" aria-label="Station availability color key">
                    <strong>Color key</strong>
                    <span><i className="excellent" />Excellent: 99-100%</span>
                    <span><i className="good" />Good: 97-98.9%</span>
                    <span><i className="watch" />Watch: below 97%</span>
                  </div>

                  <div className="cas-availability-list">
                    {GNSS_AVAILABILITY.map(row => (
                      <div key={row.station} className="cas-availability-row">
                        <div className="cas-availability-station">
                          <strong>{row.station}</strong>
                          <span>{row.name}</span>
                        </div>
                        <div className="cas-availability-months">
                          {row.monthly.map((value, index) => (
                            <span
                              key={`${row.station}-${AVAILABILITY_MONTHS[index]}`}
                              className={value >= 99 ? 'excellent' : value >= 97 ? 'good' : 'watch'}
                              title={`${AVAILABILITY_MONTHS[index]} ${value}%`}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="cas-year-average">
                    <div className="cas-year-average-title">Year Average</div>
                    {GNSS_AVAILABILITY.map(row => (
                      <div key={`${row.station}-avg`} className="cas-year-average-row">
                        <strong>{row.station}</strong>
                        <div className="cas-availability-bar" aria-label={`${row.station} yearly average ${row.availability}%`}>
                          <span style={{ width: `${row.availability}%` }} />
                        </div>
                        <span>{row.availability.toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Map + Alerts grid */}
            <div className="cas-main-grid">
              <div className="cas-card">
                <div className="cas-card-header">
                  <span className="cas-card-title">CORS Network Map</span>
                </div>
                <div className="cas-map-wrap">
                  <MapContainer key={`cors-alert-map-${corsMapTileMode}`} center={ZIMBABWE_MAP_CENTER} zoom={6}
                    minZoom={5}
                    maxZoom={12}
                    maxBounds={ZIMBABWE_MAP_BOUNDS}
                    maxBoundsViscosity={0.85}
                    style={{ height:'100%', width:'100%', background:'#0a1628' }}
                    scrollWheelZoom
                    attributionControl={false}>
                    <TileLayer key={corsMapTileMode} {...corsMapTileProps} />
                    {MAP_STATIONS.map(st => (
                      <CircleMarker key={st.id} center={[st.lat, st.lon]} radius={8}
                        pathOptions={{ color: markerColor(st.status), fillColor: markerColor(st.status), fillOpacity:0.9, weight:2 }}
                        eventHandlers={{ click: () => setSelectedStation(st.id === selectedStation ? null : st.id) }}>
                        <Tooltip>
                          <strong>{st.id} - {st.name}</strong>
                          <div>Status: {st.status.toUpperCase()}</div>
                          <div>{st.lat.toFixed(4)} deg, {st.lon.toFixed(4)} deg</div>
                        </Tooltip>
                      </CircleMarker>
                    ))}
                  </MapContainer>

                  <div className="cas-map-legend">
                    <div className="cas-map-legend-title">Station Status</div>
                    {[['Normal','#22c55e'],['Warning','#f59e0b'],['Critical','#ef4444'],['Offline','#64748b']].map(([lbl,col]) => (
                      <div key={lbl} className="cas-map-legend-row">
                        <div className="cas-map-legend-dot" style={{ background:col }} />
                        <span>{lbl}</span>
                      </div>
                    ))}
                  </div>

                  <div className="cas-map-tile-switcher">
                    {Object.entries(AFRICA_TILE_LAYERS).map(([key, layer]) => (
                      <button
                        key={key}
                        type="button"
                        className={`cas-map-tile-btn${corsMapTileMode === key ? ' active' : ''}`}
                        onClick={() => setCorsMapTileMode(key)}
                        title={layer.label}
                      >
                        {layer.short}
                      </button>
                    ))}
                  </div>

                  {selectedStation && STATION_POPUP_DETAILS[selectedStation] && (() => {
                    const st  = MAP_STATIONS.find(s => s.id === selectedStation);
                    const det = STATION_POPUP_DETAILS[selectedStation];
                    return (
                      <div className="cas-station-popup" style={{ top:20, left:'50%', transform:'translateX(-50%)' }}>
                        <div className="cas-popup-header">
                          <strong>{st.id}</strong>
                          <span className={`cas-popup-badge ${st.status}`}>{st.status.toUpperCase()}</span>
                        </div>
                        <div className="cas-popup-body">
                          {[
                            ['Location',    det.location,  null],
                            ['Last Data',   det.lastData,  null],
                            ['GNSS Signal', det.gnss,      det.gnssColor],
                            ['Power',       det.power,     det.power==='OK'?'green':'red'],
                            ['Internet',    det.internet,  det.internetColor],
                            ['Latency',     det.latency,   null],
                          ].map(([key, val, cls]) => (
                            <div key={key} className="cas-popup-row">
                              <span>{key}</span>
                              <span className={cls||''}>{val}</span>
                            </div>
                          ))}
                        </div>
                        <div className="cas-popup-footer">
                          <button type="button" className="cas-popup-link">
                            View Details <ChevronRight size={11} />
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div className="cas-card">
                <div className="cas-card-header">
                  <span className="cas-card-title">Active Alerts</span>
                  <button type="button" className="cas-view-all"
                    onClick={() => setActiveTab('alerts')}>View All</button>
                </div>
                <div className="cas-alerts-wrap">
                  <table className="cas-alerts-table">
                    <thead>
                      <tr><th>Level</th><th>Station</th><th>Problem</th><th>Time</th><th>Action</th></tr>
                    </thead>
                    <tbody>
                      {ACTIVE_ALERTS.filter(a=>a.status==='active').map(alert => (
                        <tr key={alert.id}>
                          <td><span className={`cas-level-badge ${alert.level.toLowerCase()}`}>{alert.level}</span></td>
                          <td><span className="cas-station-id">{alert.station}</span></td>
                          <td><span className="cas-problem-text">{alert.problem}</span></td>
                          <td><span className="cas-time-text">{alert.time}</span></td>
                          <td>
                            <button type="button" className={`cas-action-btn ${alert.action}`}>
                              {alert.action === 'investigate' ? 'Investigate' : 'Monitor'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Charts row */}
            <div className="cas-charts-row">
              <div className="cas-card">
                <div className="cas-card-header">
                  <span className="cas-card-title">Station Health Overview</span>
                </div>
                <div className="cas-donut-body">
                  <div className="cas-donut-center">
                    <DonutChart segments={HEALTH} total={HEALTH_TOTAL} size={130} strokeWidth={22} />
                    <div className="cas-donut-label">
                      <strong>{HEALTH_TOTAL}</strong><span>Total</span>
                    </div>
                  </div>
                  <div className="cas-donut-legend">
                    {HEALTH.map(h => (
                      <div key={h.label} className="cas-donut-legend-row">
                        <div className="cas-donut-legend-left">
                          <div className="cas-donut-legend-dot" style={{ background:h.color }} />
                          <span className="cas-donut-legend-label">{h.label}</span>
                        </div>
                        <div className="cas-donut-legend-right">
                          <div className="cas-donut-legend-count">{h.value}</div>
                          <div className="cas-donut-legend-pct">({Math.round((h.value/HEALTH_TOTAL)*100)}%)</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="cas-card">
                <div className="cas-card-header">
                  <span className="cas-card-title">GNSS Signal Quality (All Stations)</span>
                </div>
                <div className="cas-linechart-body">
                  <div className="cas-chart-svg-wrap">
                    <MultiLineChart width={600} height={90}
                      series={[{ data:SIGNAL_DATA, color:'#22c55e' }, { data:ACCURACY_DATA, color:'#3b82f6' }]} />
                  </div>
                  <div className="cas-x-labels">
                    {['00:00','04:00','08:00','12:00','16:00','20:00','24:00'].map(t=><span key={t}>{t}</span>)}
                  </div>
                  <div className="cas-chart-legend">
                    <div className="cas-chart-legend-item"><div className="cas-chart-legend-line" style={{ background:'#22c55e' }} /> Average Signal Quality</div>
                    <div className="cas-chart-legend-item"><div className="cas-chart-legend-line" style={{ background:'#3b82f6' }} /> Average Positioning Accuracy (cm)</div>
                  </div>
                </div>
              </div>

              <div className="cas-card">
                <div className="cas-card-header">
                  <span className="cas-card-title">Alert Summary (Today)</span>
                </div>
                <div className="cas-barchart-body">
                  <div className="cas-bar-svg-wrap">
                    <BarChart bars={ALERT_BARS} width={220} height={110} />
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom row */}
            <div className="cas-bottom-row">
              <div className="cas-card">
                <div className="cas-card-header">
                  <span className="cas-card-title">Recent System Notifications</span>
                </div>
                <div className="cas-notif-list">
                  {NOTIFICATIONS.map(n => (
                    <div key={n.id} className="cas-notif-row">
                      <div className="cas-notif-dot" style={{
                        background: n.severity==='critical'?'#ef4444':n.severity==='warning'?'#f59e0b':'#3b82f6'
                      }} />
                      <div className="cas-notif-content">
                        <div className="cas-notif-station">{n.station}</div>
                        <div className="cas-notif-msg">{n.msg}</div>
                      </div>
                      <div className="cas-notif-meta">
                        <span className="cas-notif-time">{n.time}</span>
                        <span className={`cas-notif-sev ${n.severity}`}>
                          {n.severity.charAt(0).toUpperCase()+n.severity.slice(1)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="cas-card">
                <div className="cas-card-header">
                  <span className="cas-card-title">RINEX Availability (Today)</span>
                </div>
                <div className="cas-rinex-body">
                  <div className="cas-rinex-donut">
                    <DonutChart
                      segments={[{ value:92, color:'#22c55e' }, { value:8, color:'#ef4444' }]}
                      total={100} size={100} strokeWidth={18} />
                    <div className="cas-rinex-label"><strong>92%</strong><span>Available</span></div>
                  </div>
                  <div className="cas-rinex-stats">
                    {[['Available Files','1,242','green'],['Missing Files','108','red'],['Total Expected','1,350','white']].map(([label,val,cls]) => (
                      <div key={label} className="cas-rinex-stat-row">
                        <span>{label}</span><strong className={cls}>{val}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="cas-card">
                <div className="cas-card-header">
                  <span className="cas-card-title">System Time</span>
                </div>
                <div className="cas-clock-body">
                  <div className="cas-clock-icon"><Clock size={24} color="#3b82f6" /></div>
                  <div className="cas-clock-time">{fmtTime(now)}</div>
                  <div className="cas-clock-date">{fmtDate(now)}</div>
                  <div className="cas-clock-tz">UTC +2</div>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'stations'  && <StationsView />}
        {activeTab === 'alerts'    && <AlertsView />}
        {activeTab === 'analysis'  && <AnalysisView />}
        {activeTab === 'reports'   && <ReportsView />}
        {activeTab === 'monitoring' && <AnalyticsView />}
        {activeTab === 'data-centre' && (
          <AnalyticsView
            title="Data Centre"
            subtitle="RINEX completeness, archive readiness, uptime reports, and GNSS data services"
          />
        )}
        {activeTab === 'logs'      && <LogsView />}
        {activeTab === 'settings'  && <SettingsView />}

      </div>
    </div>
  );
}
