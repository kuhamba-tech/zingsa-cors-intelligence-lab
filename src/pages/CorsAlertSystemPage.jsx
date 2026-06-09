import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import OperationalServicesNav from '../components/OperationalServicesNav.jsx';
import {
  buildAvailableReportSnapshots,
  buildMonitoringTimeWindows,
  buildReportPayload,
  buildStationPriorityList,
  downloadJsonReport,
  formatDataGap,
  gnssQualityLabel,
  healthBasisLabel,
  healthTelemetryLabel,
  isSimulatedHealth,
} from '../utils/corsNetworkData.js';
import { saveCorsAlertSettings } from '../utils/corsAlertSettings.js';
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Wifi, Radio, AlertTriangle, Activity, Clock,
  Bell, Settings, BarChart3, FileText, Layers,
  ChevronRight, Satellite, Search, Download, Database,
  RefreshCw, CheckCircle, XCircle, Filter, Eye,
  ToggleLeft, ToggleRight, Save, Mail, Phone, MessageCircle,
  Volume2, VolumeX, ClipboardList,
} from 'lucide-react';
import { ZIMBABWE_CORS_STATIONS } from '../data/zimbabweCorsStations.js';
import { AFRICA_TILE_LAYERS, africaMapTileLayerProps } from '../components/africaMapConfig.js';
import { CorsAlertDataProvider, useCorsAlertData } from '../context/CorsAlertDataContext.jsx';
import DataCentreView from '../components/DataCentreView.jsx';
import '../styles/cors-alert-system.css';

const ZIMBABWE_MAP_CENTER = [-19.0, 29.6];
const ZIMBABWE_MAP_BOUNDS = [[-24.2, 22.8], [-13.8, 36.2]];

const NAV_TABS = [
  { id: 'dashboard', label: 'Ops Overview', icon: BarChart3 },
  { id: 'stations',  label: 'Stations',   icon: Radio },
  { id: 'monitoring', label: 'Monitoring', icon: Activity },
  { id: 'alerts',    label: 'Alerts',     icon: AlertTriangle },
  { id: 'analysis',  label: 'Analysis',   icon: Eye },
  { id: 'reports',   label: 'Reports',    icon: FileText },
  { id: 'data-centre', label: 'Data Centre', icon: Database },
  { id: 'logs',      label: 'Logs',       icon: Layers },
  { id: 'settings',  label: 'Settings',   icon: Settings },
];

const VALID_TAB_IDS = new Set(NAV_TABS.map(tab => tab.id));

function resolveAlertTab(tab) {
  return VALID_TAB_IDS.has(tab) ? tab : 'dashboard';
}

function resolveTabFromSearchParams(searchParams) {
  const tab = searchParams.get('tab');
  if (tab) return resolveAlertTab(tab);
  if (searchParams.get('station')) return 'stations';
  return 'dashboard';
}

function StationMapPopup({ stationId, mapStations, stationTableData, onClose }) {
  const st = mapStations.find(s => s.id === stationId);
  const row = stationTableData.find(s => s.id === stationId);
  if (!st) return null;

  const gnss = gnssQualityLabel(row?.gnssQuality);
  const code = String(stationId).replace(/_$/, '');
  const rows = [
    ['Location', st.name.split(' (')[0], null],
    ['Last Update', row?.lastData || (st.lastUpdate
      ? new Date(st.lastUpdate).toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })
      : '—'), null],
    ['Health Basis', healthBasisLabel(st.healthBasis), null],
    ['Data Gap', st.dataGapHrs != null ? formatDataGap(st.dataGapHrs) : '—', null],
    ['GNSS Signal', gnss.label, gnss.tone],
    ['Archives', st.archiveCount ? `${st.archiveCount} indexed · latest ${st.archiveLatest || '—'}` : 'No RINEX index', null],
    ['Coord Shift', st.coordShiftMm != null ? `${Number(st.coordShiftMm).toFixed(1)} mm` : '—', null],
    ['Latency', row?.latency != null ? `${row.latency}ms` : '—', null],
  ];

  return (
    <div className="cas-station-popup" style={{ top: 20, left: '50%', transform: 'translateX(-50%)' }}>
      <div className="cas-popup-header">
        <strong>{st.id}</strong>
        <span className={`cas-popup-badge ${st.status}`}>{st.status.toUpperCase()}</span>
        <button type="button" className="cas-popup-close" onClick={onClose} aria-label="Close">×</button>
      </div>
      <div className="cas-popup-body">
        {rows.map(([key, val, cls]) => (
          <div key={key} className="cas-popup-row">
            <span>{key}</span>
            <span className={cls || ''}>{val}</span>
          </div>
        ))}
      </div>
      <div className="cas-popup-footer">
        <Link to={`/cors?station=${code}&app=cors-health`} className="cas-popup-link">
          National CORS <ChevronRight size={11} />
        </Link>
        <Link to={`/ionosphere?station=${code}`} className="cas-popup-link">
          Ionosphere <ChevronRight size={11} />
        </Link>
      </div>
    </div>
  );
}

const AVAILABILITY_MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/* Reports */
const REPORT_TYPES = [
  { id:'rinex',    title:'RINEX Data Report',       desc:'Daily file availability, gaps and quality metrics',   icon: FileText,  color:'#3b82f6' },
  { id:'health',   title:'Network Health Report',   desc:'Station uptime, latency and connectivity summary',    icon: Activity,  color:'#22c55e' },
  { id:'signal',   title:'GNSS Signal Quality',     desc:'C/N0 ratios, multipath and satellite tracking stats', icon: Radio,     color:'#a78bfa' },
  { id:'alerts',   title:'Alert History Report',    desc:'Full incident log with resolution times and trends',  icon: AlertTriangle, color:'#f59e0b' },
  { id:'uptime',   title:'Station Uptime Summary',  desc:'Monthly uptime percentages per station',             icon: CheckCircle,   color:'#22d3ee' },
  { id:'rinexarch','title':'RINEX Archive Integrity','desc':'MD5 checksums and completeness verification',      icon: Layers,    color:'#f97316' },
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
  const { stationTableData, refresh, loading, healthPayload } = useCorsAlertData();
  const [searchParams] = useSearchParams();
  const highlightStation = searchParams.get('station')?.replace(/_$/, '') || null;
  const highlightRef = useRef(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch]  = useState('');

  useEffect(() => {
    if (highlightStation && highlightRef.current) {
      highlightRef.current.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }, [highlightStation, filter, search]);

  const counts = {
    all:      stationTableData.length,
    online:   stationTableData.filter(s => s.status === 'online').length,
    warning:  stationTableData.filter(s => s.status === 'warning').length,
    critical: stationTableData.filter(s => s.status === 'critical').length,
    offline:  stationTableData.filter(s => s.status === 'offline').length,
  };

  const filtered = stationTableData.filter(st => {
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
          <p className="cas-tab-subtitle">
            CORS Station live receiver telemetry
          </p>
        </div>
        <button type="button" className="cas-btn-primary" onClick={refresh} disabled={loading}><RefreshCw size={13} /> Refresh</button>
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
              <th>Status</th>
              <th>Health Basis</th>
              <th>Last Data</th>
              <th>Data Gap</th>
              <th>GNSS Quality</th>
              <th>Archives</th>
              <th>Uptime</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(st => {
              const code = st.id.replace(/_$/, '');
              return (
              <tr
                key={st.id}
                ref={highlightStation === code ? highlightRef : null}
                className={highlightStation === code ? 'cas-row-highlight' : ''}
              >
                <td><span className="cas-station-id">{code}</span></td>
                <td className="cas-text-muted">{st.name}</td>
                <td><StatusBadge status={st.status} /></td>
                <td className="cas-text-muted" style={{ fontSize: '0.68rem' }}>{st.healthBasisLabel}</td>
                <td className="cas-text-mono">{st.lastData}</td>
                <td className="cas-text-mono">{st.dataGapLabel}</td>
                <td>
                  <div className="cas-quality-bar" title={st.gnssEstimated ? 'Estimated from health status / archive recency' : 'Live telemetry'}>
                    <div className="cas-quality-fill"
                      style={{
                        width: `${st.gnssQuality}%`,
                        background: st.gnssQuality > 80 ? '#22c55e' : st.gnssQuality > 60 ? '#f59e0b' : '#ef4444',
                      }} />
                    <span>{st.gnssQuality}%{st.gnssEstimated ? '*' : ''}</span>
                  </div>
                </td>
                <td className="cas-text-center">
                  {st.archiveCount ? `${st.archiveCount} · ${st.archiveLatest || '—'}` : '—'}
                </td>
                <td>
                  <span style={{ color: st.uptime >= 95 ? '#22c55e' : st.uptime >= 80 ? '#f59e0b' : '#ef4444', fontWeight: 700, fontSize: '0.72rem' }}>
                    {st.uptime > 0 ? `${st.uptime}%` : '—'}
                  </span>
                </td>
                <td className="cas-action-cell">
                  <Link to={`/cors?station=${code}&app=cors-health`} className="cas-action-btn monitor">CORS</Link>
                  <Link to={`/ionosphere?station=${code}`} className="cas-action-btn monitor">IONO</Link>
                </td>
              </tr>
            );})}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="cas-empty">No stations match the current filter.</div>
        )}
        <p className="cas-table-footnote">* GNSS quality estimated from health status and archive recency when live receiver telemetry is unavailable.</p>
      </div>
    </div>
  );
}

/* TAB: ALERTS */
function AlertsView() {
  const { alerts, refresh, loading } = useCorsAlertData();
  const [searchParams] = useSearchParams();
  const [filter, setFilter] = useState('all');
  const highlightStation = searchParams.get('station')?.replace(/_$/, '') || null;
  const highlightRef = useRef(null);

  useEffect(() => {
    if (highlightStation && highlightRef.current) {
      highlightRef.current.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }, [highlightStation, filter]);

  const counts = {
    all:      alerts.length,
    critical: alerts.filter(a => a.level === 'CRITICAL').length,
    warning:  alerts.filter(a => a.level === 'WARNING').length,
    resolved: alerts.filter(a => a.status === 'resolved').length,
    info:     alerts.filter(a => a.level === 'INFO').length,
  };

  const filtered = alerts.filter(a => {
    if (filter === 'all')      return true;
    if (filter === 'resolved') return a.status === 'resolved';
    return a.level === filter.toUpperCase();
  });

  const SUMMARY = [
    { label: 'Active Critical', value: alerts.filter(a=>a.level==='CRITICAL'&&a.status==='active').length, color:'#ef4444', bg:'rgba(239,68,68,0.1)' },
    { label: 'Active Warning',  value: alerts.filter(a=>a.level==='WARNING'&&a.status==='active').length,  color:'#f59e0b', bg:'rgba(245,158,11,0.1)' },
    { label: 'Resolved Today',  value: alerts.filter(a=>a.status==='resolved').length,                     color:'#22c55e', bg:'rgba(34,197,94,0.1)'  },
    { label: 'Total Today',     value: alerts.length,                                                      color:'#60a5fa', bg:'rgba(96,165,250,0.1)' },
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
          <p className="cas-tab-subtitle">Active alerts from station-health thresholds · enable Demo scenarios for training history</p>
        </div>
        <button type="button" className="cas-btn-primary" onClick={refresh} disabled={loading}><RefreshCw size={13} /> Refresh</button>
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
              <tr
                key={a.id}
                ref={highlightStation === a.station ? highlightRef : null}
                className={highlightStation === a.station ? 'cas-row-highlight' : ''}
              >
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
                <td className="cas-action-cell">
                  {a.action === 'investigate' && (
                    <Link to={`/cors?station=${a.station}&app=cors-health`} className="cas-action-btn investigate">CORS</Link>
                  )}
                  {a.action === 'monitor' && (
                    <Link to={`/ionosphere?station=${a.station}`} className="cas-action-btn monitor">IONO</Link>
                  )}
                  <Link to={`/alerts?tab=stations&station=${a.station}`} className="cas-action-btn view">
                    <Eye size={11} /> Station
                  </Link>
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
  const { alerts, mapStations, stationTableData, healthPayload, catalog, networkMetrics } = useCorsAlertData();
  const activeAlerts   = alerts.filter(a => a.status === 'active');
  const criticalAlerts = activeAlerts.filter(a => a.level === 'CRITICAL').length;
  const warningAlerts  = activeAlerts.filter(a => a.level === 'WARNING').length;
  const onlineStations  = networkMetrics.online;
  const degradedStations = networkMetrics.degraded;
  const networkHealth  = networkMetrics.healthPct;
  const networkUptime  = networkMetrics.uptimePct;
  const avgSignal = stationTableData.length ? Math.round(stationTableData.reduce((sum, st) => sum + st.gnssQuality, 0) / stationTableData.length) : 0;
  const priorityStations = React.useMemo(() => buildStationPriorityList(mapStations, 6), [mapStations]);
  const archiveDerived = healthPayload?.health_summary?.archive_derived ?? 0;

  const insightCards = [
    {
      tone: 'cyan',
      title: 'What The Data Shows',
      icon: 'DATA',
      text: `ZimCORS is at ${networkHealth}% network health (${onlineStations} online, ${degradedStations} degraded of ${networkMetrics.total}). ${criticalAlerts} critical and ${warningAlerts} warning alerts are active. ${archiveDerived} stations have RINEX-derived health; source: ${healthPayload ? healthTelemetryLabel(healthPayload) : 'health API'}.`,
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
    priorityStations.length
      ? `Prioritize field checks at ${priorityStations.slice(0, 3).map(s => s.id).join(', ')} — ${priorityStations[0].reason}.`
      : 'All stations are within nominal thresholds — continue routine monitoring.',
    criticalAlerts
      ? `Resolve ${criticalAlerts} critical alert(s) before precision RTK campaigns.`
      : 'No critical outages — NTRIP streams suitable for routine survey work.',
    catalog?.archiveCount
      ? `RINEX index holds ${catalog.archiveCount} archives — run Scan Spider/TEC in Data Centre for missing stations.`
      : 'Index RINEX archives via Data Centre to improve archive-derived health coverage.',
    'Publish station-health and NTRIP status to surveyors via enabled notification channels in Settings.',
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
          ['Average signal quality', `${avgSignal}%*`],
          ['Network uptime (weighted)', `${networkUptime}%`],
          ['Active alerts', activeAlerts.length],
        ].map(([label, value]) => (
          <div key={label} className="cas-analysis-metric">
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </section>

      {priorityStations.length > 0 && (
        <section className="cas-analysis-panel" style={{ marginTop: 16 }}>
          <div className="cas-analysis-title">Stations Requiring Attention</div>
          <div className="cas-card">
            <table className="cas-data-table">
              <thead>
                <tr><th>Station</th><th>Status</th><th>Issue</th><th>Health basis</th><th>Action</th></tr>
              </thead>
              <tbody>
                {priorityStations.map(st => (
                  <tr key={st.id}>
                    <td><span className="cas-station-id">{st.id}</span> <span className="cas-text-muted">{st.name}</span></td>
                    <td><StatusBadge status={st.status} /></td>
                    <td className="cas-text-muted">{st.reason}</td>
                    <td className="cas-text-muted" style={{ fontSize: '0.68rem' }}>{st.healthBasis}</td>
                    <td className="cas-action-cell">
                      <Link to={`/cors?station=${st.id}&app=cors-health`} className="cas-action-btn monitor">CORS</Link>
                      <Link to={`/ionosphere?station=${st.id}`} className="cas-action-btn monitor">IONO</Link>
                      <Link to={`/alerts?tab=stations&station=${st.id}`} className="cas-action-btn monitor">Alerts</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function ReportsView() {
  const {
    healthPayload,
    catalog,
    alerts,
    stationTableData,
    mapStations,
    avgUptime,
    avgSignalQuality,
    loading,
    refresh,
  } = useCorsAlertData();
  const [generating, setGenerating] = useState(null);

  const reportCtx = React.useMemo(() => ({
    healthPayload,
    catalog,
    alerts,
    stationTableData,
    mapStations,
    avgUptime,
    avgSignalQuality,
  }), [healthPayload, catalog, alerts, stationTableData, mapStations, avgUptime, avgSignalQuality]);

  const snapshots = React.useMemo(
    () => buildAvailableReportSnapshots(reportCtx),
    [reportCtx],
  );

  function handleGenerate(id) {
    setGenerating(id);
    const payload = buildReportPayload(id, reportCtx);
    downloadJsonReport(`zingsa-cors-${id}-${new Date().toISOString().slice(0, 10)}.json`, payload);
    setTimeout(() => setGenerating(null), 800);
  }

  function handleDownload(snapshot) {
    downloadJsonReport(`zingsa-cors-${snapshot.type}-${new Date().toISOString().slice(0, 10)}.json`, snapshot.payload);
  }

  return (
    <div>
      <div className="cas-tab-header">
        <div>
          <h2 className="cas-tab-title">Reports</h2>
          <p className="cas-tab-subtitle">Export JSON snapshots from live health API, alerts, and RINEX catalogue data</p>
        </div>
        <button type="button" className="cas-btn-secondary" onClick={refresh} disabled={loading}>
          <RefreshCw size={13} /> Refresh data
        </button>
      </div>

      <div className="cas-info-banner" style={{ marginBottom: 16 }}>
        Reports are generated from current API state — not pre-recorded files. PDF scheduling can be added when a report service is available.
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
                disabled={loading}
                style={{ borderColor: r.color, color: r.color }}>
                {generating === r.id ? <><RefreshCw size={12} /> Exporting…</> : 'Export JSON'}
              </button>
            </div>
          );
        })}
      </div>

      <div className="cas-section-label" style={{ marginTop: 24 }}>Current Snapshots</div>
      <div className="cas-card">
        <table className="cas-data-table">
          <thead>
            <tr><th>Report Name</th><th>Type</th><th>Size</th><th>Generated</th><th>Action</th></tr>
          </thead>
          <tbody>
            {snapshots.map(r => (
              <tr key={r.id}>
                <td><span className="cas-station-id" style={{ color: '#e2e8f0', fontSize: '0.73rem' }}>{r.name}</span></td>
                <td><span className="cas-text-muted" style={{ textTransform:'capitalize' }}>{r.type}</span></td>
                <td className="cas-text-mono">{r.size}</td>
                <td className="cas-text-muted">{r.date}</td>
                <td>
                  <button type="button" className="cas-action-btn monitor" onClick={() => handleDownload(r)}>
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
  const { stationTableData } = useCorsAlertData();
  const [timeWindow, setTimeWindow] = useState('week');
  const monitoringWindows = React.useMemo(
    () => buildMonitoringTimeWindows(stationTableData),
    [stationTableData],
  );
  const activeWindow = monitoringWindows[timeWindow];
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
  const signalByStation = stationTableData.slice(0, 8).map(st => ({
    label: st.id,
    value: Math.min(99, st.gnssQuality + rangeSignalLift),
    color: st.gnssQuality + rangeSignalLift > 80 ? '#22c55e' : st.gnssQuality + rangeSignalLift > 60 ? '#f59e0b' : '#ef4444',
  }));

  const KPI = [
    { label: 'Avg Network Uptime', value: `${avgUptime}%`,  sub: activeWindow.kpiSub,  color: '#22c55e' },
    { label: 'Avg Signal Quality', value: `${avgSignal}%`,  sub: activeWindow.kpiSub, color: '#3b82f6' },
    { label: 'RINEX Completeness', value: `${activeWindow.rinexCompleteness}%`, sub: activeWindow.kpiSub, color: '#a78bfa' },
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
            {Object.entries(monitoringWindows).map(([key, option]) => (
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

/* ALARM SOUND — browser Web Audio API beeps tied to active alert severity */
function useAlarmSound(activeAlerts, soundEnabled) {
  const [muted, setMuted] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const intervalRef = useRef(null);
  const prevCritRef = useRef(0);

  const critCount = activeAlerts.filter(a => a.level === 'CRITICAL').length;
  const highestSeverity = !soundEnabled ? null
    : critCount > 0 ? 'critical'
    : activeAlerts.some(a => a.level === 'WARNING') ? 'warning'
    : null;

  useEffect(() => {
    if (critCount > prevCritRef.current) setAcknowledged(false);
    prevCritRef.current = critCount;
  }, [critCount]);

  useEffect(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    if (!soundEnabled || muted || acknowledged || !highestSeverity) return undefined;

    function playBeep(freq, dur) {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        const ctx = new AC();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.22, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
        osc.start();
        osc.stop(ctx.currentTime + dur);
        setTimeout(() => { try { ctx.close(); } catch { /* ignore */ } }, (dur + 0.2) * 1000);
      } catch { /* AudioContext unavailable */ }
    }

    if (highestSeverity === 'critical') {
      playBeep(880, 0.12);
      intervalRef.current = setInterval(() => playBeep(880, 0.12), 700);
    } else {
      playBeep(440, 0.28);
      intervalRef.current = setInterval(() => playBeep(440, 0.28), 4000);
    }
    return () => { if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; } };
  }, [soundEnabled, muted, acknowledged, highestSeverity]);

  return { muted, setMuted, acknowledged, setAcknowledged, highestSeverity };
}

/* TAB: LOGS */
function LogsView() {
  const { systemLogs, refresh, loading, healthPayload } = useCorsAlertData();
  const [levelFilter, setLevelFilter] = useState('all');
  const [catFilter, setCatFilter] = useState('all');
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    if (!autoRefresh) return undefined;
    const id = setInterval(refresh, 60000);
    return () => clearInterval(id);
  }, [autoRefresh, refresh]);

  const filtered = systemLogs.filter(l => {
    const lvlOk = levelFilter === 'all' || l.level.toLowerCase() === levelFilter;
    const catOk = catFilter === 'all' || l.category === catFilter;
    return lvlOk && catOk;
  });

  const LOG_COLORS = { ERROR:'#ef4444', WARNING:'#f59e0b', INFO:'#60a5fa' };
  const CAT_COLORS = {
    'System':     '#8b5cf6',
    'NTRIP':      '#06b6d4',
    'Station':    '#22c55e',
    'Alert':      '#ef4444',
    'Data Centre':'#f59e0b',
  };
  const CATEGORIES = ['System', 'NTRIP', 'Station', 'Alert', 'Data Centre'];

  return (
    <div>
      <div className="cas-tab-header">
        <div>
          <h2 className="cas-tab-title">Event Log</h2>
          <p className="cas-tab-subtitle">
            Permanent record of all NTRIP, station, alert, and system events
            {healthPayload ? ` · ${healthTelemetryLabel(healthPayload)}` : ''}
          </p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <button type="button" className="cas-toggle-btn" onClick={() => setAutoRefresh(v => !v)}>
            {autoRefresh ? <ToggleRight size={18} color="#22c55e" /> : <ToggleLeft size={18} color="#64748b" />}
            <span style={{ color: autoRefresh ? '#22c55e' : '#64748b', fontSize:'0.72rem', fontWeight:600 }}>
              Auto-refresh
            </span>
          </button>
          <button type="button" className="cas-btn-primary" onClick={refresh} disabled={loading}>
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      <div className="cas-filter-bar" style={{ flexWrap:'wrap', gap:8 }}>
        <div className="cas-filter-tabs">
          {[['all','All',systemLogs.length],
            ['error','Error',systemLogs.filter(l=>l.level==='ERROR').length],
            ['warning','Warning',systemLogs.filter(l=>l.level==='WARNING').length],
            ['info','Info',systemLogs.filter(l=>l.level==='INFO').length],
          ].map(([key,label,count]) => (
            <button key={key} type="button"
              className={`cas-filter-tab${levelFilter===key?' active':''}`}
              onClick={() => setLevelFilter(key)}>
              {label}<span className="cas-filter-count">{count}</span>
            </button>
          ))}
        </div>
        <div className="cas-filter-tabs" style={{ marginLeft:'auto' }}>
          {[['all','All Cat.'], ...CATEGORIES.map(c => [c, c])].map(([key,label]) => (
            <button key={key} type="button"
              className={`cas-filter-tab${catFilter===key?' active':''}`}
              onClick={() => setCatFilter(key)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="cas-card">
        <table className="cas-data-table cas-log-table">
          <thead>
            <tr>
              <th>Event ID</th>
              <th>Timestamp</th>
              <th>Severity</th>
              <th>Category</th>
              <th>Station</th>
              <th>System Message</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length ? filtered.map(entry => (
              <tr key={entry.id}>
                <td className="cas-text-mono" style={{ color:'#475569', fontSize:'0.63rem', whiteSpace:'nowrap' }}>
                  {entry.eventId || `EVT-${entry.id}`}
                </td>
                <td className="cas-text-mono" style={{ color:'#64748b', whiteSpace:'nowrap' }}>{entry.ts}</td>
                <td>
                  <span className="cas-log-level" style={{
                    color: LOG_COLORS[entry.level],
                    background: `${LOG_COLORS[entry.level]}18`,
                    border: `1px solid ${LOG_COLORS[entry.level]}30`,
                  }}>
                    {entry.level}
                  </span>
                </td>
                <td>
                  <span className="cas-event-category" style={{
                    color: CAT_COLORS[entry.category] || '#94a3b8',
                    background: `${CAT_COLORS[entry.category] || '#94a3b8'}18`,
                    border: `1px solid ${CAT_COLORS[entry.category] || '#94a3b8'}30`,
                  }}>
                    {entry.category || 'System'}
                  </span>
                </td>
                <td>
                  {entry.station
                    ? <span className="cas-station-id" style={{ fontSize:'0.7rem' }}>{entry.station}</span>
                    : <span style={{ color:'#475569' }}>—</span>
                  }
                </td>
                <td style={{ color:'#94a3b8', fontSize:'0.71rem' }}>{entry.msg}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan={6} className="cas-text-muted">No events for this filter. Refresh after health API loads.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* TAB: SETTINGS */
function SettingsView() {
  const {
    mapStations,
    healthPayload,
    catalog,
    demoAlertScenarios,
    alertSettings,
    updateAlertSettings,
  } = useCorsAlertData();
  const { thresholds, notifications } = alertSettings;
  const [saved, setSaved] = useState(false);

  function setThresholds(next) {
    updateAlertSettings({ thresholds: typeof next === 'function' ? next(thresholds) : next });
  }

  function setNotifications(next) {
    updateAlertSettings({ notifications: typeof next === 'function' ? next(notifications) : next });
  }

  function handleSave() {
    saveCorsAlertSettings(alertSettings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const indexUpdated = catalog?.updatedAt || healthPayload?.index_updated_at;
  const telemetryNote = healthPayload ? healthTelemetryLabel(healthPayload) : 'Awaiting health API';

  return (
    <div>
      <div className="cas-tab-header">
        <div>
          <h2 className="cas-tab-title">Settings</h2>
          <p className="cas-tab-subtitle">Alert thresholds apply to live alert generation · saved in this browser</p>
        </div>
        <button type="button" className="cas-btn-primary" onClick={handleSave}
          style={saved ? { background:'rgba(34,197,94,0.2)', borderColor:'#22c55e', color:'#22c55e' } : {}}>
          {saved ? <><CheckCircle size={13} /> Saved!</> : <><Save size={13} /> Save Changes</>}
        </button>
      </div>

      <div className="cas-info-banner" style={{ marginBottom: 16 }}>
        WhatsApp, Email, and SMS channels are preferences only until outbound services are configured. Alarm sounds and event logging are active in this browser.
        {demoAlertScenarios ? ' Demo scenarios are on — resolved alert history is scripted for training.' : ' Live mode — alerts are derived from station-health API only.'}
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
              { key:'whatsapp', label:'WhatsApp Alerts', icon: MessageCircle, desc:'Send critical/warning alerts via WhatsApp' },
              { key:'email',    label:'Email Alerts',    icon: Mail,          desc:'Send critical/warning alerts via email' },
              { key:'sms',      label:'SMS Alerts',      icon: Phone,         desc:'Send critical alerts via SMS' },
              { key:'sound',    label:'Alarm Sounds',    icon: Volume2,       desc:'Play critical/warning alarm tones in the dashboard' },
              { key:'eventlog', label:'Event Log Entry', icon: ClipboardList, desc:'Record every alert and system event to the permanent event log' },
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
              ['System', 'ZINGSA CORS Alert System'],
              ['Network', 'ZimCORS — Zimbabwe National CORS'],
              ['Stations', `${mapStations.length} registered`],
              ['Health source', telemetryNote],
              ['RINEX index', indexUpdated ? new Date(indexUpdated).toLocaleString('en-GB') : 'Not indexed'],
              ['Data format', 'RINEX 3.04 / RTCM 3.2 MSM'],
              ['Time zone', 'UTC+2 (CAT)'],
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
function CorsAlertSystemPage() {
  const {
    mapStations,
    stationTableData,
    activeAlerts,
    alerts,
    notifications,
    networkStatus,
    networkMetrics,
    healthSegments,
    healthTotal,
    gnssAvailability,
    alertSummary,
    avgUptime,
    signalData,
    accuracyData,
    loading,
    error,
    refresh,
    healthPayload,
    selectedStationId,
    setSelectedStationId,
    showNotifications,
    setShowNotifications,
    demoAlertScenarios,
    setDemoAlertScenarios,
    alertSettings,
  } = useCorsAlertData();

  const soundEnabled = alertSettings.notifications.sound;
  const { muted, setMuted, acknowledged, setAcknowledged, highestSeverity } =
    useAlarmSound(activeAlerts, soundEnabled);

  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => resolveTabFromSearchParams(searchParams));
  const selectedStation = selectedStationId;

  const changeTab = useCallback((id) => {
    setActiveTab(id);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (id === 'dashboard') next.delete('tab');
      else next.set('tab', id);
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const openAlertForStation = useCallback((station) => {
    const code = station ? String(station).replace(/_$/, '') : null;
    if (!code) return;
    setSelectedStationId(code);
    setActiveTab('alerts');
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('tab', 'alerts');
      next.set('station', code);
      return next;
    }, { replace: true });
    setShowNotifications(false);
  }, [setSelectedStationId, setSearchParams, setShowNotifications]);

  useEffect(() => {
    const resolved = resolveTabFromSearchParams(searchParams);
    if (resolved !== activeTab) setActiveTab(resolved);
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectStation = useCallback((id) => {
    const code = id ? String(id).replace(/_$/, '') : null;
    setSelectedStationId(code);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (code) next.set('station', code);
      else next.delete('station');
      return next;
    }, { replace: true });
  }, [setSelectedStationId, setSearchParams]);

  const urlStation = searchParams.get('station')?.replace(/_$/, '') || null;

  useEffect(() => {
    if (urlStation !== selectedStationId) setSelectedStationId(urlStation);
  }, [urlStation, selectedStationId, setSelectedStationId]);

  useEffect(() => {
    const current = searchParams.get('station') || null;
    const next = selectedStationId || null;
    if (current === next) return;
    setSearchParams(prev => {
      const params = new URLSearchParams(prev);
      if (next) params.set('station', next);
      else params.delete('station');
      return params;
    }, { replace: true });
  }, [selectedStationId, searchParams, setSearchParams]);

  const setSelectedStation = selectStation;
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

  const onlineCount    = networkMetrics.online;
  const degradedCount  = networkMetrics.degraded;
  const onlinePct      = networkMetrics.healthPct;
  const statusToneClass = networkStatus.tone === 'green' ? 'green' : networkStatus.tone === 'red' ? 'red' : 'orange';
  const corsMapTileProps = africaMapTileLayerProps(corsMapTileMode);
  const healthUpdatedAt = healthPayload?.analysis_date ? new Date(healthPayload.analysis_date) : null;

  return (
    <div className="cas-page">
      <div className="cas-top-actions">
        <button
          type="button"
          className="cas-btn-secondary cas-refresh-top"
          onClick={refresh}
          disabled={loading}
          title="Refresh station-health and catalog"
        >
          <RefreshCw size={13} className={loading ? 'dashboard-spin' : ''} /> Refresh
        </button>
      </div>

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
              onClick={() => changeTab(id)}>
              <Icon size={13} />{label}
            </button>
          ))}
        </div>

        <div className="cas-nav-right">
          <button
            type="button"
            className={`cas-scenario-toggle ${demoAlertScenarios ? 'active' : ''}`}
            onClick={() => setDemoAlertScenarios(v => !v)}
            title="Toggle scripted alert scenarios for training demos"
          >
            {demoAlertScenarios ? 'Demo scenarios on' : 'Live API status'}
          </button>
          <div style={{ position: 'relative' }}>
            <button type="button" className="cas-bell-btn" onClick={() => setShowNotifications(v => !v)}>
              <Bell size={18} />
              <span className="cas-badge">{activeAlerts.length}</span>
            </button>
            {showNotifications && (
              <div className="cas-notif-panel">
                <div className="cas-notif-head">Active Notifications</div>
                {notifications.length ? notifications.map(n => (
                  <button key={n.id} type="button" className={`cas-notif-item ${n.severity}`} onClick={() => openAlertForStation(n.station)} title={`Open Alert Management for ${n.station}`}>
                    <strong>{n.station}</strong>
                    <span>{n.msg}</span>
                    <small>{n.time}</small>
                  </button>
                )) : <div className="cas-notif-empty">No active notifications</div>}
              </div>
            )}
          </div>
        </div>
      </nav>

      {false && (
        <div className={`cas-live-banner${isSimulatedHealth(healthPayload) ? ' simulated' : ''}`}>
          {isSimulatedHealth(healthPayload) ? (
            <>
              {healthTelemetryLabel(healthPayload)} via <strong>GET /api/gnss/station-health</strong>.
              Enable <strong>Demo scenarios</strong> for scripted training alerts.
            </>
          ) : (
            <>
              Station status and alerts use live <strong>GET /api/gnss/station-health</strong> data.
              Enable <strong>Demo scenarios</strong> for scripted training alerts.
            </>
          )}
        </div>
      )}

      {/* Alarm banner — shows when sound is active and unacknowledged */}
      {soundEnabled && highestSeverity && !acknowledged && (
        <div className={`cas-alarm-banner ${highestSeverity}${muted ? ' muted' : ''}`}>
          {muted
            ? <VolumeX size={14} style={{ flexShrink:0 }} />
            : <Volume2 size={14} className="cas-alarm-pulse" style={{ flexShrink:0 }} />
          }
          <span className="cas-alarm-label">
            {highestSeverity === 'critical' ? 'CRITICAL ALARM' : 'WARNING ALARM'}
            &nbsp;—&nbsp;
            {activeAlerts.filter(a => a.level === highestSeverity.toUpperCase()).length} active alert(s)
            {muted ? ' · Muted' : ''}
          </span>
          <div style={{ display:'flex', gap:6, marginLeft:'auto', flexShrink:0 }}>
            <button type="button" className="cas-alarm-btn"
              onClick={() => setMuted(v => !v)}
              title={muted ? 'Unmute alarm' : 'Mute alarm sound'}>
              {muted ? <><Volume2 size={12} /> Unmute</> : <><VolumeX size={12} /> Mute</>}
            </button>
            <button type="button" className="cas-alarm-btn ack"
              onClick={() => setAcknowledged(true)}
              title="Acknowledge — silences sound, keeps alert visible">
              <CheckCircle size={12} /> Acknowledge
            </button>
          </div>
        </div>
      )}

      {/* Body */}
      <div className="cas-body">

        {/* Dashboard tab */}
        {activeTab === 'dashboard' && (
          <>
            {error && (
              <div className="cas-info-banner" style={{ marginBottom: 16, borderColor: 'rgba(249,115,22,0.35)', color: '#fdba74' }}>
                Using cached demo overlays — API: {error}
              </div>
            )}
            {/* Stats row */}
            <div className="cas-stats-row">
              <div className="cas-stat-card">
                <div className="cas-stat-left">
                  <div className="cas-stat-label">Network Status</div>
                  <div className={`cas-stat-value ${statusToneClass}`}>{networkStatus.label}</div>
                  <div className="cas-stat-note">{networkStatus.note}</div>
                </div>
                <div className="cas-stat-icon" style={{ background:'rgba(34,197,94,0.12)', color:'#22c55e' }}>
                  <Wifi size={22} />
                </div>
              </div>

              <div className="cas-stat-card">
                <div className="cas-stat-left">
                  <div className="cas-stat-label">Stations Online</div>
                  <div className="cas-stat-value blue">
                    {onlineCount} <span style={{ fontSize:'0.9rem', color:'#475569' }}>/ {networkMetrics.total}</span>
                  </div>
                  <div className="cas-stat-note">{onlinePct}% online · {degradedCount} degraded</div>
                </div>
                <div className="cas-stat-icon" style={{ background:'rgba(96,165,250,0.12)', color:'#60a5fa' }}>
                  <Radio size={22} />
                </div>
              </div>

              <div className="cas-stat-card">
                <div className="cas-stat-left">
                  <div className="cas-stat-label">Active Alerts</div>
                  <div className="cas-stat-value orange">{activeAlerts.length}</div>
                  <div className="cas-stat-note">
                    <span className="cas-stat-dot" style={{ background:'#ef4444' }} /> {activeAlerts.filter(a => a.level === 'CRITICAL').length} Critical&nbsp;&nbsp;
                    <span className="cas-stat-dot" style={{ background:'#f59e0b' }} /> {activeAlerts.filter(a => a.level === 'WARNING').length} Warning
                  </div>
                </div>
                <div className="cas-stat-icon" style={{ background:'rgba(245,158,11,0.12)', color:'#f59e0b' }}>
                  <AlertTriangle size={22} />
                </div>
              </div>

              <div className="cas-stat-card">
                <div className="cas-stat-left">
                  <div className="cas-stat-label">Today&apos;s Uptime</div>
                  <div className="cas-stat-value green">{avgUptime}%</div>
                  <div className="cas-stat-note">Target: &gt;=98%</div>
                </div>
                <div className="cas-stat-icon" style={{ background:'rgba(34,197,94,0.12)', color:'#22c55e' }}>
                  <Activity size={22} />
                </div>
              </div>

              <div className="cas-stat-card">
                <div className="cas-stat-left">
                  <div className="cas-stat-label">Health API Updated</div>
                  <div className="cas-stat-value" style={{ fontSize:'1.15rem' }}>
                    {healthUpdatedAt ? fmtTime(healthUpdatedAt) : loading ? '…' : fmtTime(now)}
                  </div>
                  <div className="cas-stat-note">
                    {healthUpdatedAt
                      ? healthUpdatedAt.toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' })
                      : healthPayload ? 'Awaiting timestamp' : 'Polling station-health'}
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
                  <p className="cas-gnss-subtitle">
                    Monthly uptime model for all {gnssAvailability.length} ZimCORS stations · current month from health-derived uptime
                  </p>
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
                    {gnssAvailability.map(row => (
                      <div key={row.station} className="cas-availability-row">
                        <Link to={`/cors?station=${row.station}&app=cors-health`} className="cas-availability-station">
                          <strong>{row.station}</strong>
                          <span>{row.name}</span>
                        </Link>
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
                    {gnssAvailability.map(row => (
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
                    {mapStations.map(st => {
                      const code = st.id.replace(/_$/, '');
                      const isSelected = code === (selectedStation || '').replace(/_$/, '');
                      return (
                      <CircleMarker key={st.id} center={[st.lat, st.lon]} radius={isSelected ? 11 : 8}
                        pathOptions={{
                          color: isSelected ? '#22d3ee' : markerColor(st.status),
                          fillColor: markerColor(st.status),
                          fillOpacity: isSelected ? 1 : 0.9,
                          weight: isSelected ? 3 : 2,
                        }}
                        eventHandlers={{ click: () => setSelectedStation(isSelected ? null : st.id) }}>
                        <Tooltip>
                          <strong>{st.id} - {st.name}</strong>
                          <div>Status: {st.status.toUpperCase()}</div>
                          <div>{st.lat.toFixed(4)} deg, {st.lon.toFixed(4)} deg</div>
                        </Tooltip>
                      </CircleMarker>
                    );})}
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

                  {selectedStation && (
                    <StationMapPopup
                      stationId={selectedStation}
                      mapStations={mapStations}
                      stationTableData={stationTableData}
                      onClose={() => setSelectedStation(null)}
                    />
                  )}
                </div>
              </div>

              <div className="cas-card">
                <div className="cas-card-header">
                  <span className="cas-card-title">Active Alerts</span>
                  <button type="button" className="cas-view-all"
                    onClick={() => changeTab('alerts')}>View All</button>
                </div>
                <div className="cas-alerts-wrap">
                  <table className="cas-alerts-table">
                    <thead>
                      <tr><th>Level</th><th>Station</th><th>Problem</th><th>Time</th><th>Action</th></tr>
                    </thead>
                    <tbody>
                      {activeAlerts.map(alert => (
                        <tr key={alert.id}>
                          <td><span className={`cas-level-badge ${alert.level.toLowerCase()}`}>{alert.level}</span></td>
                          <td><span className="cas-station-id">{alert.station}</span></td>
                          <td><span className="cas-problem-text">{alert.problem}</span></td>
                          <td><span className="cas-time-text">{alert.time}</span></td>
                          <td className="cas-action-cell">
                            {alert.action === 'investigate' && (
                              <Link to={`/cors?station=${alert.station}&app=cors-health`} className="cas-action-btn investigate">CORS</Link>
                            )}
                            {alert.action === 'monitor' && (
                              <Link to={`/ionosphere?station=${alert.station}`} className="cas-action-btn monitor">IONO</Link>
                            )}
                            <Link to={`/alerts?tab=stations&station=${alert.station}`} className="cas-action-btn view">Station</Link>
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
                    <DonutChart segments={healthSegments} total={healthTotal} size={130} strokeWidth={22} />
                    <div className="cas-donut-label">
                      <strong>{healthTotal}</strong><span>Total</span>
                    </div>
                  </div>
                  <div className="cas-donut-legend">
                    {healthSegments.map(h => (
                      <div key={h.label} className="cas-donut-legend-row">
                        <div className="cas-donut-legend-left">
                          <div className="cas-donut-legend-dot" style={{ background:h.color }} />
                          <span className="cas-donut-legend-label">{h.label}</span>
                        </div>
                        <div className="cas-donut-legend-right">
                          <div className="cas-donut-legend-count">{h.value}</div>
                          <div className="cas-donut-legend-pct">({Math.round((h.value/healthTotal)*100)}%)</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="cas-card">
                <div className="cas-card-header">
                  <span className="cas-card-title">GNSS Signal Quality (All Stations)</span>
                  <span className="cas-text-muted" style={{ fontSize: '0.72rem' }}>
                    7-day model from health-derived station blend · not live time-series
                  </span>
                </div>
                <div className="cas-linechart-body">
                  <div className="cas-chart-svg-wrap">
                    <MultiLineChart width={600} height={90}
                      series={[{ data:signalData, color:'#22c55e' }, { data:accuracyData, color:'#3b82f6' }]} />
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
                    <BarChart bars={alertSummary} width={220} height={110} />
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
                  {notifications.map(n => (
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
        {activeTab === 'data-centre' && <DataCentreView />}
        {activeTab === 'logs'      && <LogsView />}
        {activeTab === 'settings'  && <SettingsView />}

      </div>
    </div>
  );
}

export default function CorsAlertSystemPageWrapper() {
  return (
    <CorsAlertDataProvider>
      <CorsAlertSystemPage />
    </CorsAlertDataProvider>
  );
}
