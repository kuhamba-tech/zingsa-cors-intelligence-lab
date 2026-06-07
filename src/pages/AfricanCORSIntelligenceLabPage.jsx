import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User, Radio, Satellite } from 'lucide-react';
import '../styles/cors-intelligence-lab.css';
import {
  LAB_REGIONS, ANALYSIS_TABS, ANALYSIS_METHODS, PORTAL_LINKS,
  getStationsForRegion, getLiveErrorForRegion,
  generateDemoIPMetrics, buildLiveIPMetrics,
} from '../data/corsIntelligenceLabData.js';
import { fetchLiveKp, getDemoSpaceWeather } from '../services/spaceWeatherApi.js';
import { getCorsStationHealth, getCorsDemoAnalysis, getCorsCatalog } from '../services/corsApi.js';
import AfricaIonosphereMap from '../components/AfricaIonosphereMap.jsx';
import CorsHealthNetworkMap from '../components/CorsHealthNetworkMap.jsx';
import { ZIMBABWE_CORS_STATIONS } from '../data/zimbabweCorsStations.js';
import { CORS_PERSONA_TABS, buildCorsHealthSummaries, corsHealthRisk } from '../data/corsHealthPersonas.js';

function Sparkline({ data, color, height = 28 }) {
  if (!data?.length) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const W = 100;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg className="cil-sparkline" viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.85" />
    </svg>
  );
}

function stationColor(status, pct) {
  if (status === 'offline') return '#ef4444';
  if (status === 'degraded' || pct < 70) return '#EF9F27';
  return '#1D9E75';
}

const QUALITY_STATUS_BY_STATION = {
  CHIM: 'offline',
  CHIR: 'warning',
  GSU_: 'offline',
  GOKW: 'offline',
  KWEK: 'warning',
  KARO: 'offline',
  CENT: 'online',
  HARA: 'offline',
  MASV: 'offline',
  ZINH: 'online',
  GWER: 'offline',
  MUTA: 'offline',
  LUPA: 'online',
  BEIT: 'offline',
  BING: 'offline',
  BULA: 'offline',
  GUTU: 'online',
  VICF: 'warning',
  TSHO: 'online',
};

function satelliteSystemLabel(satSys) {
  const labels = { G: 'GPS', R: 'GLONASS', E: 'Galileo', C: 'BeiDou', J: 'QZSS' };
  return String(satSys || 'G/R')
    .split('/')
    .filter(Boolean)
    .map(code => labels[code] || code)
    .join(' ');
}

function receiverLabel(station) {
  if (['GWER', 'BULA'].includes(station.id)) return 'TRIMBLE NETR9';
  if (station.id === 'MUTO') return '';
  return station.satSys?.includes('E') || station.satSys?.includes('C') ? 'LEICA GR50' : '';
}

function statusLabel(status) {
  if (status === 'online') return 'OK';
  if (status === 'warning' || status === 'degraded') return '!';
  return 'X';
}

function StationQualitySummary({ stations, metrics }) {
  const statusMap = Object.fromEntries((metrics?.stationStatuses || []).map(s => [s.id, s.status]));
  const rows = stations.map((station, index) => {
    const id = station.id.replace(/_$/, '');
    const qualityStatus = QUALITY_STATUS_BY_STATION[station.id] || statusMap[station.id] || station.status || 'online';
    return {
      siteName: `X-pos_${String(index + 1).padStart(2, '0')}_${station.siteName}_${id}`,
      siteCode: id,
      satelliteSystem: satelliteSystemLabel(station.satSys),
      receiver: receiverLabel(station),
      status: qualityStatus,
    };
  });

  return (
    <section className="cil-quality-summary" aria-label="Station Quality Summary">
      <div className="cil-quality-head">
        <div>
          <div className="cil-quality-breadcrumb">Home / CORS quality</div>
          <h3 className="cil-section-title">Station Quality Summary</h3>
        </div>
        <a href="#cors-site-map" className="cil-quality-link">Site Map</a>
      </div>
      <div className="cil-quality-table-wrap">
        <table className="cil-quality-table">
          <thead>
            <tr>
              {['Site Name', 'Site Code', 'Satellite System', 'Receiver', 'Quality Plots', 'File Summary', 'File Availability', 'Current Status*'].map(label => (
                <th key={label}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.siteCode}>
                <td>{row.siteName}</td>
                <td>{row.siteCode}</td>
                <td>{row.satelliteSystem}</td>
                <td>{row.receiver}</td>
                <td><a href={`#quality-${row.siteCode}`}>{row.siteCode}</a></td>
                <td><a href={`#summary-${row.siteCode}`}>{row.siteCode}</a></td>
                <td><a href={`#availability-${row.siteCode}`}>{row.siteCode}</a></td>
                <td>
                  <span className={`cil-quality-status ${row.status}`}>
                    {statusLabel(row.status)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function buildGnssIntegrity(metrics, station, regionLabel, date) {
  const hasData = !!metrics?.archive;
  const signal = Number(metrics?.signalQuality || 0);
  const availability = Number(metrics?.availability || 0);
  const latencySec = +((Number(metrics?.latency || 0) / 1000) || 0.9).toFixed(1);
  const satSystems = metrics?.archive?.satelliteSystems?.length || 2;
  const satellites = metrics?.archive ? Math.max(8, satSystems * 5) : 0;
  const hAcc = hasData ? clamp(Math.round(12 - signal / 11 + Math.abs(metrics.deltaTec || 0) * 0.4), 1, 18) : null;
  const vAcc = hasData ? clamp(Math.round((hAcc || 6) + Math.max(0, (metrics.s4 || 0) * 8 - 1)), 1, 24) : null;
  const quality = hasData ? clamp(Math.round(signal * 0.65 + availability * 0.35), 0, 99) : 0;
  const rtkStatus = !hasData ? 'No data' : quality >= 92 && (metrics.s4 || 0) < 0.18 ? 'Fixed' : quality >= 75 ? 'Float' : 'Degraded';
  const pppStatus = !hasData ? 'No data' : quality >= 92 ? 'Fixed' : quality >= 70 ? 'Converging' : 'Unavailable';
  const correctionAge = hasData ? Math.max(1, Math.round((metrics.archive?.interval || 30) / 12)) : null;
  const lastOutage = hasData ? `${Math.max(8, Math.round((100 - availability) * 1.8))} min ago` : 'No data';
  const streamOnline = hasData && availability >= 70;
  const nominal = hasData && quality >= 80 && streamOnline;
  const stationName = station?.name?.split(' (')[0] || metrics?.archive?.stationId || 'Selected station';

  return {
    hasData,
    nominal,
    stationName,
    regionLabel,
    date,
    satellites,
    hAcc,
    vAcc,
    latencySec,
    quality,
    rtkStatus,
    pppStatus,
    correctionAge,
    lastOutage,
    streamOnline,
    signalSpark: metrics?.qualSpark?.length ? metrics.qualSpark : [72, 84, 76, 82, 74, 70, 79, 72, 77, 86, 69, 78, 74, 79],
    positionSpark: metrics?.stabSpark?.length ? metrics.stabSpark : [72, 74, 70, 86, 73, 74, 72, 88, 78, 90, 86, 86, 82, 85],
  };
}

function GnssIntegrityPanel({ metrics, station, regionLabel, date }) {
  const integrity = buildGnssIntegrity(metrics, station, regionLabel, date);
  const statusTone = integrity.nominal ? 'nominal' : integrity.hasData ? 'watch' : 'nodata';
  const summary = integrity.hasData
    ? `GNSS conditions are ${integrity.nominal ? 'nominal' : 'under watch'} for ${integrity.stationName}, ${integrity.regionLabel}. RTK is ${integrity.rtkStatus.toLowerCase()}, PPP is ${integrity.pppStatus.toLowerCase()}, and stream latency of ${integrity.latencySec} s is routed from the selected CORS/RINEX analysis. ${integrity.satellites} satellites tracked. Data quality score ${integrity.quality}%${integrity.nominal ? ' — suitable for CORS Health Network.' : ' — review before precision operations.'}`
    : `No data: no RINEX observation file is available for ${integrity.stationName} on ${date}. Select a date inside the indexed RINEX range or refresh the RINEX catalogue.`;

  return (
    <section className="cil-gnss-panel" aria-label="GNSS Integrity Panel">
      <div className="cil-gnss-head">
        <div className="cil-gnss-title-group">
          <div className="cil-gnss-icon">🛰</div>
          <div>
            <h3>GNSS Integrity Panel <span className={`cil-gnss-dot ${statusTone}`} /></h3>
            <p>Live positioning quality, correction availability, station warnings &amp; PPP/RTK reliability</p>
          </div>
        </div>
        <span className={`cil-gnss-badge ${statusTone}`}>{integrity.nominal ? '✓ NOMINAL' : integrity.hasData ? '△ WATCH' : 'NO DATA'}</span>
      </div>

      <div className="cil-gnss-grid">
        <article className="cil-gnss-card accent-cyan">
          <div className="cil-gnss-card-title">📍 Positioning Accuracy</div>
          <Sparkline data={integrity.positionSpark} color="#22d3ee" height={36} />
          <div className="cil-gnss-measure"><span>Horizontal</span><strong>{integrity.hAcc ?? '—'}{integrity.hAcc ? ' cm' : ''}</strong></div>
          <div className="cil-gnss-bar"><span style={{ width: `${integrity.hAcc ? clamp(100 - integrity.hAcc * 6, 15, 88) : 0}%`, background: '#f59e0b' }} /></div>
          <div className="cil-gnss-measure"><span>Vertical</span><strong>{integrity.vAcc ?? '—'}{integrity.vAcc ? ' cm' : ''}</strong></div>
          <div className="cil-gnss-bar"><span style={{ width: `${integrity.vAcc ? clamp(100 - integrity.vAcc * 5, 15, 88) : 0}%`, background: '#10b981' }} /></div>
        </article>

        <article className="cil-gnss-card accent-violet">
          <div className="cil-gnss-card-title">📡 Correction Availability</div>
          <div className="cil-gnss-row"><span>RTK</span><strong className={integrity.hasData ? 'ok' : 'muted'}>{integrity.hasData ? 'Available' : 'No data'}</strong></div>
          <div className="cil-gnss-row"><span>PPP</span><strong className={integrity.hasData ? 'ok' : 'muted'}>{integrity.hasData ? 'Available' : 'No data'}</strong></div>
          <div className="cil-gnss-divider" />
          <div className="cil-gnss-row"><span>Correction Age</span><strong className="warn">{integrity.correctionAge ? `${integrity.correctionAge} s` : '—'}</strong></div>
        </article>

        <article className="cil-gnss-card accent-green">
          <div className="cil-gnss-card-title">▣ Stream Status</div>
          <div className="cil-gnss-status-line"><span className={integrity.streamOnline ? 'pulse online' : 'pulse offline'} />{integrity.streamOnline ? 'Online' : 'No data'}</div>
          <div className="cil-gnss-row"><span>Stream Latency</span><strong>{integrity.hasData ? `${integrity.latencySec} s` : '—'}</strong></div>
          <div className="cil-gnss-row"><span>Last Outage</span><strong className="muted">{integrity.lastOutage}</strong></div>
          <div className="cil-gnss-row"><span>Satellites</span><strong className="ok">{integrity.satellites ? `${integrity.satellites} tracked` : '—'}</strong></div>
        </article>

        <article className="cil-gnss-card accent-warning">
          <div className="cil-gnss-card-title">⚠ Station Warnings</div>
          <div className={`cil-gnss-check ${integrity.nominal ? 'clear' : 'warn'}`}>{integrity.nominal ? '✓' : '!'}</div>
          <div className="cil-gnss-warning-copy">
            <strong>{integrity.nominal ? 'All Clear' : integrity.hasData ? 'Review Required' : 'No RINEX Data'}</strong>
            <span>{integrity.nominal ? 'No active alerts' : integrity.hasData ? 'Integrity values outside nominal range' : 'No matching observation file'}</span>
          </div>
        </article>

        <article className="cil-gnss-card accent-orange">
          <div className="cil-gnss-card-title">🎯 PPP / RTK Quality</div>
          <Sparkline data={integrity.signalSpark} color="#10b981" height={36} />
          <div className="cil-gnss-row"><span>RTK Fix</span><strong className={integrity.rtkStatus === 'Fixed' ? 'ok' : 'warn'}>{integrity.rtkStatus}</strong></div>
          <div className="cil-gnss-row"><span>PPP Status</span><strong className={integrity.pppStatus === 'Fixed' ? 'ok' : 'warn'}>{integrity.pppStatus}</strong></div>
          <div className="cil-gnss-row"><span>Signal Quality</span><strong className="warn">{integrity.quality}%</strong></div>
          <div className="cil-gnss-bar"><span style={{ width: `${integrity.quality}%`, background: 'linear-gradient(90deg,#10b981,#f59e0b)' }} /></div>
        </article>
      </div>

      <div className="cil-gnss-kpis">
        {[
          ['🛰', 'Satellites', integrity.satellites || '—', 'cyan'],
          ['📡', 'RTK', integrity.rtkStatus, 'orange'],
          ['🌐', 'PPP', integrity.pppStatus, 'orange'],
          ['⚡', 'Latency', integrity.hasData ? `${integrity.latencySec} s` : '—', 'cyan'],
          ['📍', 'H-Acc', integrity.hAcc ? `${integrity.hAcc} cm` : '—', 'orange'],
          ['📏', 'V-Acc', integrity.vAcc ? `${integrity.vAcc} cm` : '—', 'green'],
          ['🎯', 'Quality', `${integrity.quality}%`, 'orange'],
        ].map(([icon, label, value, tone]) => (
          <div key={label} className={`cil-gnss-kpi ${tone}`}>
            <span>{icon}</span>
            <div><small>{label}</small><strong>{value}</strong></div>
          </div>
        ))}
      </div>

      <div className="cil-gnss-summary">
        <div className="cil-gnss-icon small">🤖</div>
        <div>
          <strong>GNSS Integrity Summary</strong>
          <p>{summary}</p>
        </div>
      </div>
    </section>
  );
}

export default function AfricanCORSIntelligenceLabPage({ onNavigate }) {
  const [liveMode, setLiveMode] = useState(false);
  const [regionId, setRegionId] = useState('zimbabwe');
  const [stationId, setStationId] = useState('ZINH');
  const [analysisTab, setAnalysisTab] = useState('monitoring');
  const [selectedMethod, setSelectedMethod] = useState('monitoring');
  const [analysisDate, setAnalysisDate] = useState('2024-04-01');
  const [analysisTime, setAnalysisTime] = useState('03:37');
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState(null);
  const [apiError, setApiError] = useState(null);
  const [mapView, setMapView] = useState('overview');
  const [spaceWeatherView, setSpaceWeatherView] = useState('cors-health');
  const [corsAnalysisResult, setCorsAnalysisResult] = useState(null);
  const [corsPersonaView, setCorsPersonaView] = useState('overview');
  const [gnssCatalog, setGnssCatalog] = useState(null);
  const [gnssRefreshing, setGnssRefreshing] = useState(false);

  const isCorsHealthMode = spaceWeatherView === 'cors-health';
  const isBridgeMonitoring = spaceWeatherView === 'bridge-monitoring';
  const applicationLabel = {
    ionosphere: 'Ionospheric IP',
    'space-weather': 'Space Weather',
    'cors-health': 'CORS Health',
    'bridge-monitoring': 'Bridge Monitoring',
    'tec-analysis': 'TEC Analysis',
  }[spaceWeatherView] || spaceWeatherView;
  const showCorsStationMap = (isCorsHealthMode || isBridgeMonitoring) && regionId === 'zimbabwe' && mapView !== 'settings';

  const stations = useMemo(() => getStationsForRegion(regionId), [regionId]);
  const region = useMemo(() => LAB_REGIONS.find(r => r.id === regionId) || LAB_REGIONS[0], [regionId]);
  const liveError = getLiveErrorForRegion(regionId, liveMode);
  const visibleMethods = ANALYSIS_METHODS.filter(m => m.tab === analysisTab);

  useEffect(() => {
    const list = getStationsForRegion(regionId);
    if (list.length && !list.find(s => s.id === stationId)) setStationId(list[0].id);
  }, [regionId, stationId]);

  const runAnalysis = useCallback(async () => {
    setLoading(true);
    setApiError(null);
    const station = stations.find(s => s.id === stationId);
    try {
      if (liveMode) {
        if (regionId === 'madagascar') throw new Error('Madagascar CORS streams unavailable');
        const [noaa, health] = await Promise.all([
          fetchLiveKp().catch(() => getDemoSpaceWeather()),
          getCorsStationHealth({ country: region.label }).catch(() => null),
        ]);
        setMetrics(buildLiveIPMetrics(noaa, health, regionId, station?.name || stationId));
      } else {
        const demo = await getCorsDemoAnalysis({
          station: stationId,
          region: regionId,
          date: analysisDate,
          time: analysisTime,
          source: 'tec-analysis',
        });
        setMetrics(demo.metrics || generateDemoIPMetrics(regionId, station?.name || stationId));
        if (!demo.hasArchive && demo.message) setApiError(demo.message);
      }
    } catch (err) {
      setApiError(err.message);
      setMetrics(generateDemoIPMetrics(regionId, station?.name || stationId));
    } finally {
      setLoading(false);
    }
  }, [liveMode, regionId, stationId, stations, region.label, analysisDate, analysisTime]);

  const refreshGnssCatalog = useCallback(async () => {
    setGnssRefreshing(true);
    try {
      const catalog = await getCorsCatalog({ source: 'tec-analysis', refresh: true });
      setGnssCatalog(catalog);
      return catalog;
    } catch {
      setGnssCatalog(null);
      return null;
    } finally {
      setGnssRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!liveMode) refreshGnssCatalog();
  }, [liveMode, refreshGnssCatalog]);

  useEffect(() => { runAnalysis(); }, [liveMode, regionId, stationId, runAnalysis]);

  const refreshPageData = useCallback(async () => {
    if (!liveMode) await refreshGnssCatalog();
    await runAnalysis();
  }, [liveMode, refreshGnssCatalog, runAnalysis]);

  const kpStatus = metrics ? { label: metrics.ipLevel, color: metrics.ipColor } : { label: 'Loading', color: '#22d3ee' };

  const corsMapStations = useMemo(() => {
    if (regionId !== 'zimbabwe') return [];
    const statusMap = Object.fromEntries((metrics?.stationStatuses || []).map(s => [s.id, s.status]));
    return ZIMBABWE_CORS_STATIONS.map(st => ({
      id: st.id,
      name: st.name,
      lat: st.lat,
      lon: st.lon,
      status: statusMap[st.id] || st.status,
      network: 'ZimCORS/ZINGSA',
    }));
  }, [regionId, metrics]);

  const corsPersonaSummaries = useMemo(() => {
    const station = stations.find(s => s.id === stationId);
    const stationName = station?.name?.split(' (')[0] || stationId;
    const onlineCount = metrics?.stationStatuses?.filter(s => s.status === 'online').length ?? 0;
    const total = metrics?.stationStatuses?.length || 1;
    const healthPct = Math.round((onlineCount / total) * 100);
    return buildCorsHealthSummaries({ stationName, region: region.label, onlineCount, totalStations: total, healthPct });
  }, [stations, stationId, region.label, metrics]);

  const corsRisk = useMemo(() => corsHealthRisk(metrics), [metrics]);

  const corsHealthMetrics = useMemo(() => {
    if (!metrics) return null;
    const onlineCount = metrics.stationStatuses?.filter(s => s.status === 'online').length ?? 0;
    const total = metrics.stationStatuses?.length || 1;
    const healthPct = Math.round((onlineCount / total) * 100);
    return [
      { label: 'Network Health',       value: `${healthPct}%`, color: '#1D9E75', pct: healthPct,            note: 'Source: GNSS CORS' },
      { label: 'Online Stations',       value: onlineCount,     color: '#22d3ee', pct: (onlineCount/total)*100, note: 'Source: AFREF/IGS' },
      { label: 'Mean Data Gap',         value: '1h',            color: '#EF9F27', pct: 15,                   note: 'Source: Receiver Telemetry' },
      { label: 'Max Coord Shift',       value: '1mm',           color: '#a78bfa', pct: 5,                    note: 'Source: GNSS Time Series' },
      { label: 'RTK Availability',      value: '98%',           color: '#1D9E75', pct: 98,                   note: 'Source: NTRIP' },
      { label: 'Atmospheric PWV Link',  value: '81%',           color: '#22d3ee', pct: 81,                   note: 'Source: GNSS Met' },
    ];
  }, [metrics]);

  const bridgeMonitoringMetrics = useMemo(() => {
    if (!metrics) return null;
    const onlineCount = metrics.stationStatuses?.filter(s => s.status === 'online').length ?? 0;
    const total = metrics.stationStatuses?.length || 1;
    const healthPct = Math.round((onlineCount / total) * 100);
    return [
      { label: 'Bridge Sensor Coverage', value: `${healthPct}%`, color: '#1D9E75', pct: healthPct, note: 'Source: CORS reference stations' },
      { label: 'Displacement Watch', value: '1.8mm', color: '#22d3ee', pct: 18, note: 'Daily GNSS movement threshold' },
      { label: 'Vibration Alert Level', value: 'Low', color: '#1D9E75', pct: 24, note: 'RTK/PPP structural monitoring' },
      { label: 'Critical Crossings', value: '0', color: '#EF9F27', pct: 5, note: 'No bridge sites above alert threshold' },
      { label: 'RTK Correction Health', value: '98%', color: '#1D9E75', pct: 98, note: 'NTRIP correction availability' },
      { label: 'Inspection Priority', value: 'Routine', color: '#a78bfa', pct: 35, note: 'Based on station quality and displacement' },
    ];
  }, [metrics]);

  return (
    <div className="cil-page">
      <header className="cil-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Radio size={22} color="#ff8c00" />
          <div>
            <div className="cil-header-title">ZINGSA Space Science</div>
            <div style={{ fontSize: '0.68rem', color: '#6b7280', marginTop: 2 }}>Zimbabwe National Geospatial Agency-CORS Services</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {onNavigate && (
            <button type="button" onClick={() => onNavigate('weather')} style={{ background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.35)', borderRadius: 8, padding: '6px 14px', color: '#22d3ee', fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer' }}>
              Space Weather →
            </button>
          )}
          <div className="cil-mode-toggle">
            <button type="button" className={`cil-mode-btn ${!liveMode ? 'active-demo' : ''}`} onClick={() => { setLiveMode(false); setApiError(null); }}>🟡 DEMO</button>
            <button type="button" className={`cil-mode-btn ${liveMode ? 'active-live' : ''}`} onClick={() => { setLiveMode(true); setApiError(null); }}>🔴 LIVE</button>
          </div>
          <span className={`cil-live-badge ${liveMode ? '' : 'demo'}`}><span className="cil-live-dot" />{liveMode ? 'LIVE' : 'DEMO'}</span>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', display: 'grid', placeItems: 'center' }}>
            <User size={18} color="#94a3b8" />
          </div>
        </div>
      </header>

      <div className="cil-breadcrumb">
        Select region or application <span>›</span> See analysis
      </div>

      {liveError && (
        <div className="cil-alert-bar"><strong>{liveError.type}:</strong><span>{liveError.message}</span></div>
      )}
      {!liveMode && gnssCatalog && (
        <div className="cil-alert-bar" style={{ background: 'rgba(34,211,238,0.06)', borderColor: 'rgba(34,211,238,0.28)', color: '#a5f3fc' }}>
          <strong style={{ color: '#22d3ee' }}>📡 GNSS Data:</strong>
          <span>
            {gnssRefreshing ? 'Refreshing TEC Analysis RINEX archive…' : (
              <>{gnssCatalog.archiveCount} archives · {gnssCatalog.stationCount} stations
                {gnssCatalog.dateRange && <> · {gnssCatalog.dateRange.from} → {gnssCatalog.dateRange.to}</>}
                {' '}· source: TEC Analysis RINEX</>
            )}
          </span>
          <button
            type="button"
            onClick={refreshPageData}
            disabled={loading || gnssRefreshing}
            style={{ marginLeft: 'auto', background: 'rgba(34,211,238,0.15)', border: '1px solid rgba(34,211,238,0.4)', borderRadius: 6, padding: '4px 12px', color: '#22d3ee', fontWeight: 700, fontSize: '0.7rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            {gnssRefreshing ? '⟳ Scanning…' : '↻ Refresh RINEX'}
          </button>
        </div>
      )}
      {apiError && !liveError && (
        <div className="cil-alert-bar" style={{ background: 'rgba(249,115,22,0.08)', borderColor: 'rgba(249,115,22,0.3)', color: '#fdba74' }}>
          <strong>⚠ API:</strong><span>{apiError}</span>
        </div>
      )}
      {corsAnalysisResult && (
        <div className="cil-alert-bar" style={{ background: 'rgba(29,158,117,0.08)', borderColor: 'rgba(29,158,117,0.35)', color: '#6ee7b7', alignItems: 'center' }}>
          <strong style={{ color: '#34d399', whiteSpace: 'nowrap' }}>✓ Network Check:</strong>
          <span style={{ flex: 1 }}>{corsAnalysisResult}</span>
          <button type="button" onClick={() => setCorsAnalysisResult(null)} style={{ background: 'none', border: 'none', color: '#6ee7b7', cursor: 'pointer', fontSize: '1.1rem', lineHeight: 1, padding: '0 4px', marginLeft: 8 }}>×</button>
        </div>
      )}

      <div className="cil-body">
        <div className="cil-controls">
          <div><label>Region</label><select value={regionId} onChange={e => setRegionId(e.target.value)}>{LAB_REGIONS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}</select></div>
          <div><label>Station / Platform</label><select value={stationId} onChange={e => setStationId(e.target.value)}>{stations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
          <div><label>Applications</label><select value={spaceWeatherView} onChange={e => { setSpaceWeatherView(e.target.value); setCorsAnalysisResult(null); setMapView('overview'); }}><option value="ionosphere">Ionospheric IP</option><option value="space-weather">Space Weather</option><option value="cors-health">CORS Health</option><option value="bridge-monitoring">Bridge Monitoring</option><option value="tec-analysis">TEC Analysis</option></select></div>
          <div><label>Date</label><input type="date" value={analysisDate} onChange={e => setAnalysisDate(e.target.value)} /></div>
          <div><label>Time (UTC)</label><input type="time" value={analysisTime} onChange={e => setAnalysisTime(e.target.value)} /></div>
          <div><label>&nbsp;</label><button type="button" className="cil-run-btn" onClick={runAnalysis} disabled={loading}>{loading ? '⟳ Running…' : 'Run Analysis'}</button></div>
        </div>

        <h3 className="cil-section-title">Select Analysis Method</h3>
        <div className="cil-tabs">
          {ANALYSIS_TABS.map(tab => (
            <button key={tab.id} type="button" className={`cil-tab ${analysisTab === tab.id ? 'active' : ''}`} onClick={() => setAnalysisTab(tab.id)}>{tab.label}</button>
          ))}
        </div>
        <div className="cil-method-grid">
          {visibleMethods.map(method => (
            <div key={method.id} className={`cil-method-card ${selectedMethod === method.id ? 'selected' : ''}`} onClick={() => setSelectedMethod(method.id)} role="button" tabIndex={0}>
              <div className="icon">{method.icon}</div>
              <h4>{method.title}</h4>
              <p>{method.desc}</p>
            </div>
          ))}
        </div>

        {metrics && (
          <>
            {!isCorsHealthMode && !isBridgeMonitoring && mapView !== 'analysis' && (
              <section className="cil-integrity-section">
                <h3 className="cil-section-title">CORS Integrity Trend</h3>
                <div className="cil-integrity-cards">
                  {metrics.integrityCards.map(card => (
                    <div key={card.label} className="cil-integrity-card">
                      <div className="label">{card.label}</div>
                      <div className="value" style={{ color: card.color }}>{card.value}</div>
                      {card.sub && <div className="sub">{card.sub}</div>}
                      {card.spark && <Sparkline data={card.spark} color={card.color} />}
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>CORS Integrity &amp; Status</div>
                <div className="cil-station-bar">
                  {metrics.stationStatuses.map(seg => (
                    <div key={seg.id} className="cil-station-seg" style={{ background: stationColor(seg.status, seg.pct), flex: seg.pct }} title={`${seg.name}: ${seg.status}`}>
                      {seg.id.replace(/_$/, '')}
                    </div>
                  ))}
                </div>
                <div className="cil-summary">{metrics.summary}</div>
              </section>
            )}

            <div className="cil-subnav">
              {['Overview', 'Stations', 'Integrity', 'Analysis', 'Settings'].map(v => (
                <button key={v} type="button" className={mapView === v.toLowerCase() ? 'active' : ''} onClick={() => setMapView(v.toLowerCase())}>{v}</button>
              ))}
            </div>

            {(isCorsHealthMode || isBridgeMonitoring) && regionId === 'zimbabwe' && mapView !== 'integrity' && (
              <StationQualitySummary stations={ZIMBABWE_CORS_STATIONS} metrics={metrics} />
            )}

            {mapView === 'integrity' ? (
              <GnssIntegrityPanel
                metrics={metrics}
                station={stations.find(s => s.id === stationId)}
                regionLabel={region.label}
                date={analysisDate}
              />
            ) : (
            <div className="cil-main-grid">
              <div className="cil-map-wrap">
                {mapView === 'settings' ? (
                  <div style={{ padding: 24, height: '100%', minHeight: 380, display: 'flex', flexDirection: 'column', gap: 16, background: 'rgba(0,0,0,0.25)' }}>
                    <h3 className="cil-section-title" style={{ margin: 0 }}>Network Settings</h3>
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.7 }}>
                      <p style={{ margin: '0 0 12px' }}><strong style={{ color: '#22d3ee' }}>Mode:</strong> {liveMode ? 'LIVE' : 'DEMO'}</p>
                      <p style={{ margin: '0 0 12px' }}><strong style={{ color: '#22d3ee' }}>Region:</strong> {region.label}</p>
                      <p style={{ margin: '0 0 12px' }}><strong style={{ color: '#22d3ee' }}>GNSS source:</strong> TEC Analysis RINEX archive</p>
                      {gnssCatalog && (
                        <p style={{ margin: 0 }}><strong style={{ color: '#22d3ee' }}>Indexed archives:</strong> {gnssCatalog.archiveCount} · {gnssCatalog.stationCount} stations</p>
                      )}
                    </div>
                    <div style={{ fontSize: '0.62rem', color: '#94a3b8', marginTop: 8 }}>Active layers:</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {['AFREF Reference Frame', 'IGS GNSS Stations', 'National CORS Telemetry', 'EarthScope GNSS', 'NTRIP Corrections'].map(layer => (
                        <span key={layer} style={{ background: 'rgba(34,211,238,0.13)', border: '1px solid rgba(34,211,238,0.24)', borderRadius: 4, padding: '4px 10px', fontSize: '0.65rem', color: '#dbeafe' }}>{layer}</span>
                      ))}
                    </div>
                  </div>
                ) : showCorsStationMap ? (
                  <CorsHealthNetworkMap
                    stations={corsMapStations}
                    country={region.label}
                    regionLabel={stations.find(s => s.id === stationId)?.name?.split(' (')[0] || stationId}
                    riskLevel={corsRisk.level}
                    riskColor={corsRisk.color}
                    mapTitle={
                      mapView === 'stations'
                        ? `Station network · ${corsMapStations.filter(s => s.status === 'online').length} online`
                        : `ZimCORS network · ${corsMapStations.length} stations · ${corsRisk.level} risk`
                    }
                  />
                ) : (
                  <AfricaIonosphereMap kp={metrics.kp} status={kpStatus} regionId={region.mapRegion} regionSummary={`${region.label} · IP ${metrics.ipIndex}/100`} />
                )}
              </div>

              <div className="cil-metrics-panel">
                {mapView === 'overview' && (isCorsHealthMode || isBridgeMonitoring) && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <h3 className="cil-section-title" style={{ margin: 0 }}>{isBridgeMonitoring ? 'Bridge Monitoring - Metrics Dashboard' : 'CORS Health Network - Metrics Dashboard'}</h3>
                    </div>
                    {(isBridgeMonitoring ? bridgeMonitoringMetrics : corsHealthMetrics)?.map(m => (
                      <div key={m.label} className="cil-metric-row">
                        <div className="row-head"><span className="row-label">{m.label}</span><span className="row-value" style={{ color: m.color }}>{m.value}</span></div>
                        <div className="cil-metric-bar"><div className="cil-metric-bar-fill" style={{ width: `${m.pct}%`, background: `linear-gradient(90deg,${m.color}88,${m.color})` }} /></div>
                        {m.note && <div className="row-note">{m.note}</div>}
                      </div>
                    ))}
                  </>
                )}

                {mapView === 'stations' && (
                  <>
                    <h3 className="cil-section-title" style={{ marginBottom: 16 }}>CORS Station Network</h3>
                    <div style={{ maxHeight: 420, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {(corsMapStations.length ? corsMapStations : metrics.stationStatuses.map(s => ({ id: s.id, name: s.name, status: s.status, lat: null, lon: null }))).map(st => (
                        <div key={st.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 12px', background: 'rgba(0,0,0,0.25)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' }}>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: '0.82rem' }}>{st.id.replace(/_$/, '')}</div>
                            <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>{st.name}</div>
                          </div>
                          <span style={{ fontSize: '0.68rem', fontWeight: 800, color: stationColor(st.status, 90), textTransform: 'uppercase' }}>{st.status}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {mapView === 'analysis' && (
                  <>
                    <h3 className="cil-section-title" style={{ marginBottom: 16 }}>{isBridgeMonitoring ? 'Bridge Monitoring Analysis' : isCorsHealthMode ? 'CORS Network Analysis' : 'Ionospheric Perturbation (IP) Analysis'}</h3>
                    {isCorsHealthMode && (
                      <div style={{ marginBottom: 14 }}>
                        <div className="cil-subnav" style={{ marginBottom: 10 }}>
                          {CORS_PERSONA_TABS.map(tab => (
                            <button
                              key={tab.id}
                              type="button"
                              className={corsPersonaView === tab.id ? 'active' : ''}
                              onClick={() => { setCorsPersonaView(tab.id); setCorsAnalysisResult(corsPersonaSummaries[tab.id]); }}
                            >
                              {tab.label}
                            </button>
                          ))}
                        </div>
                        {corsAnalysisResult && <div className="cil-summary" style={{ marginBottom: 12 }}>{corsAnalysisResult}</div>}
                      </div>
                    )}
                    <div className="cil-integrity-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: 10, marginBottom: 16 }}>
                      {metrics.integrityCards.map(card => (
                        <div key={card.label} className="cil-integrity-card">
                          <div className="label">{card.label}</div>
                          <div className="value" style={{ color: card.color }}>{card.value}</div>
                          {card.sub && <div className="sub">{card.sub}</div>}
                        </div>
                      ))}
                    </div>
                    {(isBridgeMonitoring ? bridgeMonitoringMetrics : isCorsHealthMode ? corsHealthMetrics : metrics.metrics).map(m => {
                      const numVal = typeof m.value === 'number' ? m.value : parseFloat(m.value);
                      const pct = m.pct ?? (m.max ? Math.min(100, (Math.abs(numVal) / m.max) * 100) : 50);
                      return (
                        <div key={m.label} className="cil-metric-row">
                          <div className="row-head"><span className="row-label">{m.label}</span><span className="row-value" style={{ color: m.color }}>{m.value}{m.unit ? ` ${m.unit}` : ''}</span></div>
                          <div className="cil-metric-bar"><div className="cil-metric-bar-fill" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${m.color}88, ${m.color})` }} /></div>
                          {m.note && <div className="row-note">{m.note}</div>}
                        </div>
                      );
                    })}
                  </>
                )}

                {mapView === 'settings' && (
                  <>
                    <h3 className="cil-section-title" style={{ marginBottom: 16 }}>Dashboard Settings</h3>
                    {[
                      ['Analysis mode', liveMode ? 'LIVE' : 'DEMO'],
                      ['Application', applicationLabel],
                      ['Selected station', stationId],
                      ['Analysis date', analysisDate],
                      ['GNSS data root', 'TEC Analysis RINEX archive'],
                    ].map(([label, value]) => (
                      <div key={label} className="cil-metric-row">
                        <div className="row-head"><span className="row-label">{label}</span><span className="row-value" style={{ color: '#22d3ee' }}>{value}</span></div>
                      </div>
                    ))}
                    <button type="button" onClick={refreshPageData} disabled={loading || gnssRefreshing} style={{ marginTop: 12, width: '100%', background: 'rgba(34,211,238,0.12)', border: '1px solid rgba(34,211,238,0.35)', borderRadius: 8, padding: '10px', color: '#22d3ee', fontWeight: 700, cursor: 'pointer' }}>
                      {gnssRefreshing ? '⟳ Refreshing RINEX index…' : '↻ Refresh RINEX Data Index'}
                    </button>
                  </>
                )}

                {mapView === 'overview' && !isCorsHealthMode && !isBridgeMonitoring && (
                  <>
                    <h3 className="cil-section-title" style={{ marginBottom: 16 }}>{applicationLabel} - Ionospheric Perturbation (IP) Analysis</h3>
                    <div style={{ fontSize: '0.65rem', color: '#6b7280', marginBottom: 14, padding: '6px 10px', background: 'rgba(0,0,0,0.2)', borderRadius: 6 }}>
                      Mode: <strong style={{ color: liveMode ? '#ef4444' : '#eab308' }}>{metrics.mode?.toUpperCase()}</strong>
                      {metrics.dataSource && <> · {metrics.dataSource}</>}
                      {metrics.archive?.archiveName && <> · <span style={{ color: '#a5b4fc' }}>{metrics.archive.archiveName}</span></>}
                    </div>
                    {metrics.metrics.map(m => {
                      const numVal = typeof m.value === 'number' ? m.value : parseFloat(m.value);
                      const pct = m.max ? Math.min(100, (Math.abs(numVal) / m.max) * 100) : 50;
                      return (
                        <div key={m.label} className="cil-metric-row">
                          <div className="row-head"><span className="row-label">{m.label}</span><span className="row-value" style={{ color: m.color }}>{m.value}{m.unit ? ` ${m.unit}` : ''}</span></div>
                          <div className="cil-metric-bar"><div className="cil-metric-bar-fill" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${m.color}88, ${m.color})` }} /></div>
                          {m.note && <div className="row-note">{m.note}</div>}
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            </div>
            )}
          </>
        )}

        <section className="cil-embedded-lab">
          <h3 className="cil-section-title"><Satellite size={18} style={{ verticalAlign: 'middle', marginRight: 8 }} />About ZINGSA CORS Network</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
            {[
              ['📡', 'Centimetre Accuracy', 'CORS corrections reduce GNSS error from metres to centimetres for surveys, drones, and infrastructure monitoring across Zimbabwe.'],
              ['⚡', 'Ionospheric Monitoring', 'Real-time TEC, scintillation S4, and IP index track equatorial ionospheric perturbations affecting African GNSS users.'],
              ['🌍', 'AFREF Integration', 'ZINGSA stations contribute to the African Reference Frame — enabling cross-border geospatial consistency.'],
              ['🔴', 'Demo & Live Modes', 'DEMO analyses real ZINGSA RINEX archives (run npm run cors:ingest). LIVE connects to NOAA SWPC Kp and CORS health APIs.'],
            ].map(([icon, title, desc]) => (
              <div key={title} style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(127,119,221,0.18)', borderRadius: 12, padding: 16 }}>
                <div style={{ fontSize: '1.4rem', marginBottom: 8 }}>{icon}</div>
                <div style={{ fontWeight: 800, fontSize: '0.85rem', marginBottom: 6 }}>{title}</div>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8', lineHeight: 1.6 }}>{desc}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <footer className="cil-footer">
        {PORTAL_LINKS.map(link => (
          <a key={link.label} href={link.url} target="_blank" rel="noopener noreferrer">{link.label}</a>
        ))}
      </footer>
    </div>
  );
}
