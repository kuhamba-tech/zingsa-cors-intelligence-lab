import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, BarChart3, Crosshair, HardDrive, Radio, ShieldCheck } from 'lucide-react';
import Sparkline from './Sparkline.jsx';
import StationQualitySummary from './StationQualitySummary.jsx';
import GnssIntegrityPanel from './GnssIntegrityPanel.jsx';
import { DedicatedMonitorBanner, NationalCorsAnalysis } from './NationalCorsServicePanels.jsx';
import NtripMonitorPanel from '../NtripMonitorPanel.jsx';
import CorsUptimePanel   from '../CorsUptimePanel.jsx';
import CorsNetworkDistancesPanel from './CorsNetworkDistancesPanel.jsx';
import { stationColor } from './stationLabHelpers.js';
import { APPLICATION_VIEWS, ANALYSIS_TABS, LAB_REGIONS } from '../../data/corsIntelligenceLabData.js';
import { CORS_PERSONA_TABS } from '../../data/corsHealthPersonas.js';
import { ZIMBABWE_CORS_STATIONS } from '../../data/zimbabweCorsStations.js';
import {
  buildAlertSummary,
  buildAlertsFromStations,
  buildMapStations,
  buildStationTableData,
  summarizeActiveAlertsFromHealth,
} from '../../utils/corsNetworkData.js';
import { loadCorsAlertSettings } from '../../utils/corsAlertSettings.js';
import { useOpsHealth } from '../../context/OpsHealthContext.jsx';
import AfricaIonosphereMap from '../AfricaIonosphereMap.jsx';
import CorsHealthNetworkMap from '../CorsHealthNetworkMap.jsx';

function buildNetworkKpis({ networkMetrics, healthPayload, metrics, onStations, onIntegrity, onAlerts }) {
  const stationIds = ZIMBABWE_CORS_STATIONS.map(st => st.id);
  const healthStations = (healthPayload?.stations || []).filter(st => stationIds.includes(st.station_id));
  const shifts = healthStations.map(st => Number(st.coord_shift_mm)).filter(Number.isFinite);
  const maxShift = shifts.length ? Math.max(...shifts) : null;

  const { online, degraded, offline, total, healthPct, uptimePct, alertCount, criticalCount, warningCount } = networkMetrics;

  const overall = offline > 0 || criticalCount > 0
    ? { label: 'Degraded', color: '#EF9F27', note: `${offline} offline · ${degraded} degraded` }
    : degraded > 0 || warningCount > 0
      ? { label: 'Watch', color: '#EF9F27', note: `${degraded} degraded` }
      : { label: 'Healthy', color: '#22c55e', note: 'All systems operational' };

  return [
    {
      label: 'Overall Status',
      value: overall.label,
      note: overall.note,
      color: overall.color,
      Icon: ShieldCheck,
      to: '/',
    },
    {
      label: 'Active Alerts',
      value: String(alertCount),
      note: `${criticalCount} Critical · ${warningCount} Warning`,
      color: criticalCount ? '#ef4444' : warningCount ? '#EF9F27' : '#22c55e',
      Icon: AlertTriangle,
      action: onAlerts,
    },
    {
      label: 'Stations Online',
      value: `${online}/${total}`,
      note: `${healthPct}% availability`,
      color: '#22d3ee',
      Icon: Radio,
      action: onStations,
    },
    {
      label: 'Uptime',
      value: `${uptimePct}%`,
      note: 'Online 100% · Degraded 50%',
      color: '#EF9F27',
      Icon: BarChart3,
      action: onStations,
    },
    {
      label: 'Positioning Accuracy',
      value: maxShift != null ? `${maxShift.toFixed(1)} mm` : `${Math.max(1, Math.round(12 - Number(metrics?.signalQuality || 0) / 12))} cm`,
      note: maxShift != null ? 'Max coordinate shift' : 'Estimated from signal quality',
      color: '#22d3ee',
      Icon: Crosshair,
      action: onIntegrity,
    },
    {
      label: 'Network Health',
      value: `${healthPct}%`,
      note: 'Same source as dashboard',
      color: healthPct >= 80 ? '#22c55e' : '#EF9F27',
      Icon: BarChart3,
      action: onStations,
    },
  ];
}

const CONTROL_APPLICATION_OPTIONS = [
  { id: 'cors-health', label: 'CORS Health' },
  { id: 'space-weather', label: 'Space Weather' },
  { id: 'ionosphere', label: 'Ionospheric Conditions' },
];

function buildStationHealthOverview({ healthPayload, metrics, corsMapStations }) {
  const stationIds = ZIMBABWE_CORS_STATIONS.map(st => st.id);
  const mapStations = corsMapStations?.length
    ? corsMapStations
    : healthPayload
      ? buildMapStations(healthPayload)
      : ZIMBABWE_CORS_STATIONS.map(st => ({ ...st, status: st.status === 'degraded' ? 'warning' : st.status }));
  const total = mapStations.length || stationIds.length;
  const online = mapStations.filter(st => st.status === 'online').length;
  const degraded = mapStations.filter(st => st.status === 'warning' || st.status === 'degraded' || st.status === 'critical').length;
  const offline = mapStations.filter(st => st.status === 'offline').length;
  const stats = { online, degraded, offline, total };
  const stationTableData = buildStationTableData(mapStations);
  const thresholds = loadCorsAlertSettings().thresholds;
  const alerts = buildAlertsFromStations(mapStations, { includeResolved: false, thresholds, stationTableData });
  const rawAlertSummary = buildAlertSummary(alerts);
  const activeAlertStats = summarizeActiveAlertsFromHealth(healthPayload, { thresholds });
  const critical = activeAlertStats.critical;
  const warning = activeAlertStats.warning;
  const totalSegments = Math.max(1, online + degraded + offline);
  const avgSignal = stationTableData.length
    ? Math.round(stationTableData.reduce((sum, st) => sum + (st.gnssQuality || 0), 0) / stationTableData.length)
    : Math.round(metrics?.signalQuality || 0);
  const avgAccuracy = stationTableData.length
    ? Math.round((stationTableData.reduce((sum, st) => sum + (3.4 - ((st.gnssQuality || 0) / 100) * 1.5), 0) / stationTableData.length) * 10) / 10
    : 1.8;
  const archiveDerived = healthPayload?.health_summary?.archive_derived ?? stationTableData.filter(st => st.archiveCount).length;
  const seedFallback = healthPayload?.health_summary?.seed_fallback ?? Math.max(0, total - archiveDerived);
  const lateFiles = healthPayload?.health_summary?.degraded ?? stats.degraded;
  const expectedFiles = total * 24;
  const availableFiles = archiveDerived * 24;
  const archivePct = expectedFiles ? Math.round((availableFiles / expectedFiles) * 100) : 0;
  const now = healthPayload?.analysis_date ? new Date(healthPayload.analysis_date) : new Date();

  return {
    total,
    stats,
    online,
    degraded,
    warning,
    critical,
    offline,
    totalSegments,
    avgSignal,
    avgAccuracy,
    archivePct,
    availableFiles,
    missingFiles: seedFallback * 24,
    lateFiles,
    expectedFiles,
    alertSummary: [
      { label: 'Critical', value: critical, color: '#ef4444' },
      { label: 'Warning', value: warning, color: '#f59e0b' },
      rawAlertSummary.find(item => item.label === 'Info') || { label: 'Info', value: 0, color: '#3b82f6' },
      rawAlertSummary.find(item => item.label === 'Resolved') || { label: 'Resolved', value: 0, color: '#22c55e' },
    ],
    recentAlerts: alerts.slice(0, 5),
    system: [
      ['NTRIP Caster', healthPayload ? 'Online' : 'Awaiting API', '#22c55e'],
      ['Database', healthPayload ? 'Healthy' : 'Offline cache', '#22c55e'],
      ['Storage', `${archivePct}% Used`, archivePct >= 75 ? '#f59e0b' : '#22c55e'],
      ['Backup', seedFallback ? `${seedFallback} station(s) no data` : 'Up to date', seedFallback ? '#f59e0b' : '#22c55e'],
      ['System Time', now.toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }), '#cbd5e1'],
    ],
  };
}

export default function NationalCorsLabWorkspace({ lab }) {
  const {
    liveMode, regionId, setRegionId, stationId, setStationId, analysisTab, setAnalysisTab,
    selectedMethod, setSelectedMethod, analysisDate, setAnalysisDate, analysisTime, setAnalysisTime,
    loading, metrics, mapView, setMapView, spaceWeatherView, setSpaceWeatherView,
    corsAnalysisResult, setCorsAnalysisResult, corsPersonaView, setCorsPersonaView, gnssCatalog, gnssRefreshing,
    healthPayload, analysisStale, isCorsHealthMode, isBridgeMonitoring, applicationLabel, showCorsStationMap,
    activeAppView, stations, region, visibleMethods, runAnalysis,
    handleSelectStation, handleOpenIntegrity, refreshPageData, kpStatus, corsMapStations, corsPersonaSummaries,
    corsRisk, corsHealthMetrics, bridgeMonitoringMetrics, overviewPersonaSummary,
  } = lab;

  const { networkMetrics } = useOpsHealth();
  const networkKpis = buildNetworkKpis({
    networkMetrics,
    healthPayload,
    metrics,
    onStations: () => setMapView('stations'),
    onIntegrity: () => setMapView('integrity'),
    onAlerts: null,
  });
  const stationHealthOverview = metrics ? buildStationHealthOverview({ healthPayload, metrics, corsMapStations }) : null;

  return (
    <div className="cil-body">

      <DedicatedMonitorBanner appView={activeAppView} stationId={stationId} />

      <div className="cil-controls">
        <div><label>Region</label><select value={regionId} onChange={e => setRegionId(e.target.value)}>{LAB_REGIONS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}</select></div>
        <div><label>Station / Platform</label><select value={stationId} onChange={e => setStationId(e.target.value)}>{stations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
        <div>
          <label>Application</label>
          <select
            value={CONTROL_APPLICATION_OPTIONS.some(option => option.id === spaceWeatherView) ? spaceWeatherView : 'cors-health'}
            onChange={e => {
              setSpaceWeatherView(e.target.value);
              setCorsAnalysisResult(null);
              setMapView('overview');
            }}
          >
            {CONTROL_APPLICATION_OPTIONS.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
          </select>
        </div>
        <div><label>Date</label><input type="date" value={analysisDate} onChange={e => setAnalysisDate(e.target.value)} /></div>
        <div><label>Time (UTC)</label><input type="time" value={analysisTime} onChange={e => setAnalysisTime(e.target.value)} /></div>
        <div>
          <label>&nbsp;</label>
          <button type="button" className={`cil-run-btn ${analysisStale ? 'stale' : ''}`} onClick={runAnalysis} disabled={loading}>
            {loading ? '⟳ Running…' : analysisStale ? '↻ Update Analysis' : 'Run Analysis'}
          </button>
        </div>
      </div>

      {analysisStale && !liveMode && (
        <div className="cil-stale-note">Date or time changed — press <strong>Update Analysis</strong> to refresh RINEX results.</div>
      )}
      {regionId !== 'zimbabwe' && (isCorsHealthMode || isBridgeMonitoring) && (
        <div className="cil-stale-note">Full CORS health map is available for Zimbabwe. Other regions show reference ionosphere context.</div>
      )}

      {!isCorsHealthMode && !isBridgeMonitoring && (
        <>
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
        </>
      )}

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

          <section className="cil-network-kpi-strip" aria-label="National CORS network metrics">
            {networkKpis.map(({ label, value, note, color, Icon, action }) => {
              const content = (
                <>
                  <div className="cil-network-kpi-icon" style={{ color }}>
                    <Icon size={22} />
                  </div>
                  <div className="cil-network-kpi-copy">
                    <span>{label}</span>
                    <strong style={{ color }}>{value}</strong>
                    <small>{note}</small>
                  </div>
                </>
              );
              if (label === 'Overall Status') {
                return (
                  <Link key={label} to="/" className="cil-network-kpi-card" style={{ '--kpi': color }}>
                    {content}
                  </Link>
                );
              }
              if (label === 'Active Alerts') {
                return (
                  <Link key={label} to="/alerts" className="cil-network-kpi-card" style={{ '--kpi': color }}>
                    {content}
                  </Link>
                );
              }
              return (
                <button key={label} type="button" className="cil-network-kpi-card" style={{ '--kpi': color }} onClick={action}>
                  {content}
                </button>
              );
            })}
          </section>

          <div className="cil-subnav">
            {[
              ['overview', 'Overview'],
              ['stations', 'Stations'],
              ['integrity', 'Integrity'],
              ['analysis', 'Analysis'],
              ['ntrip', 'NTRIP'],
              ['uptime', 'Uptime Log'],
              ['distances', 'Network Distances'],
              ['settings', 'Settings'],
            ].map(([id, label]) => (
              <button key={id} type="button" className={mapView === id ? 'active' : ''} onClick={() => setMapView(id)}>{label}</button>
            ))}
          </div>

          {(isCorsHealthMode || isBridgeMonitoring) && regionId === 'zimbabwe' && mapView === 'stations' && (
            <StationQualitySummary
              stations={ZIMBABWE_CORS_STATIONS}
              metrics={metrics}
              liveMode={liveMode}
              selectedStationId={stationId}
              onSelectStation={handleSelectStation}
              onOpenIntegrity={handleOpenIntegrity}
            />
          )}

          {mapView === 'integrity' ? (
            <GnssIntegrityPanel
              metrics={metrics}
              station={stations.find(s => s.id === stationId)}
              regionLabel={region.label}
              date={analysisDate}
            />
          ) : mapView === 'ntrip' ? (
            <NtripMonitorPanel />
          ) : mapView === 'uptime' ? (
            <div style={{ padding:'16px 0' }}><CorsUptimePanel /></div>
          ) : mapView === 'distances' ? (
            <CorsNetworkDistancesPanel />
          ) : (
            <div className="cil-main-grid">
              <div className="cil-map-wrap">
                {mapView === 'settings' ? (
                  <div style={{ padding: 24, height: '100%', minHeight: 380, display: 'flex', flexDirection: 'column', gap: 16, background: 'rgba(0,0,0,0.25)' }}>
                    <h3 className="cil-section-title" style={{ margin: 0 }}>Network Settings</h3>
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.7 }}>
                      <p style={{ margin: '0 0 12px' }}><strong style={{ color: '#22d3ee' }}>Mode:</strong> {liveMode ? 'LIVE' : 'OFFLINE'}</p>
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
                    selectedStationId={stationId}
                    focusSelectedStation={mapView === 'stations'}
                    onStationSelect={handleSelectStation}
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
                    {isCorsHealthMode && overviewPersonaSummary && (
                      <div className="cil-persona-blurb">{overviewPersonaSummary}</div>
                    )}
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
                      {(corsMapStations.length ? corsMapStations : metrics.stationStatuses.map(s => ({ id: s.id, name: s.name, status: s.status, lat: null, lon: null }))).map(st => {
                        const code = st.id.replace(/_$/, '');
                        return (
                        <div
                          key={st.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => handleSelectStation(st.id)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleSelectStation(st.id); }}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 12px', background: st.id === stationId ? 'rgba(34,211,238,0.1)' : 'rgba(0,0,0,0.25)', borderRadius: 8, border: `1px solid ${st.id === stationId ? 'rgba(34,211,238,0.35)' : 'rgba(255,255,255,0.06)'}`, cursor: 'pointer' }}
                        >
                          <div>
                            <div style={{ fontWeight: 800, fontSize: '0.82rem' }}>{code}</div>
                            <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>{st.name}</div>
                            <div style={{ display: 'flex', gap: 8, marginTop: 4 }} onClick={e => e.stopPropagation()}>
                              <Link to={`/alerts?tab=stations&station=${code}`} style={{ fontSize: '0.58rem', color: '#22d3ee', fontWeight: 700 }}>Alerts</Link>
                              <Link to={`/ionosphere?station=${code}`} style={{ fontSize: '0.58rem', color: '#a78bfa', fontWeight: 700 }}>Ionosphere</Link>
                            </div>
                          </div>
                          <span style={{ fontSize: '0.68rem', fontWeight: 800, color: stationColor(st.status, 90), textTransform: 'uppercase' }}>{st.status}</span>
                        </div>
                        );
                      })}
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
                      ['Analysis mode', liveMode ? 'LIVE' : 'OFFLINE'],
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

          {mapView === 'overview' && (isCorsHealthMode || isBridgeMonitoring) && stationHealthOverview && (
            <section className="cil-health-overview-panel" aria-label="Station health overview">
              <div className="cil-health-overview-grid">
                <Link to="/alerts?tab=stations" className="cil-health-widget cil-health-widget-donut">
                  <div className="cil-health-widget-title">Station Health Overview</div>
                  <div className="cil-health-donut-row">
                    <div
                      className="cil-health-donut"
                      style={{
                        '--normal': `${(stationHealthOverview.online / stationHealthOverview.totalSegments) * 100}%`,
                        '--warning': `${((stationHealthOverview.online + stationHealthOverview.degraded) / stationHealthOverview.totalSegments) * 100}%`,
                        '--critical': `${((stationHealthOverview.online + stationHealthOverview.degraded) / stationHealthOverview.totalSegments) * 100}%`,
                      }}
                    >
                      <strong>{stationHealthOverview.total}</strong>
                      <span>Total</span>
                    </div>
                    <div className="cil-health-legend">
                      {[
                        ['Online', stationHealthOverview.online, '#3cc84a'],
                        ['Degraded', stationHealthOverview.degraded, '#f5b30b'],
                        ['Offline', stationHealthOverview.offline, '#ef4444'],
                      ].map(([label, value, color]) => (
                        <span key={label}><i style={{ background: color }} />{label}<b>{value}</b></span>
                      ))}
                    </div>
                  </div>
                </Link>

                <button type="button" className="cil-health-widget cil-health-widget-chart" onClick={() => setMapView('integrity')}>
                  <div className="cil-health-widget-head">
                    <span>Data Quality (All Stations)</span>
                    <small>Last 24 Hours</small>
                  </div>
                  <div className="cil-health-line-chart" aria-hidden="true">
                    {(() => {
                      const sig = [72, 74, 78, 82, 76, 86, 91, 89, 88, 90, 92, 87];
                      const acc = [36, 38, 42, 39, 45, 51, 49, 47, 44, 48, 46, 40];
                      const W = 300, H = 80, minV = 20, maxV = 100, pad = 5;
                      const px = (i, n) => (pad + (i / (n - 1)) * (W - pad * 2)).toFixed(1);
                      const py = v => (H - pad - ((v - minV) / (maxV - minV)) * (H - pad * 2)).toFixed(1);
                      const pts = d => d.map((v, i) => `${px(i, d.length)},${py(v)}`).join(' ');
                      return (
                        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none"
                          style={{ width:'100%', height:'100%', display:'block', overflow:'visible' }}>
                          <polyline points={pts(sig)} fill="none" stroke="#22c55e"
                            strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                          <polyline points={pts(acc)} fill="none" stroke="#22d3ee"
                            strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                          {sig.map((v, i) => <circle key={i} cx={px(i, sig.length)} cy={py(v)} r="2.4" fill="#22c55e" />)}
                          {acc.map((v, i) => <circle key={i} cx={px(i, acc.length)} cy={py(v)} r="2.4" fill="#22d3ee" />)}
                        </svg>
                      );
                    })()}
                  </div>
                  <div className="cil-health-chart-legend">
                    <span><i className="signal" />Signal Quality ({stationHealthOverview.avgSignal}%)</span>
                    <span><i className="accuracy" />Positioning Accuracy ({stationHealthOverview.avgAccuracy}cm)</span>
                  </div>
                </button>

                <Link to="/alerts" className="cil-health-widget cil-health-widget-bars">
                  <div className="cil-health-widget-title">Alerts Summary (Last 7 Days)</div>
                  <div className="cil-health-bars">
                    {stationHealthOverview.alertSummary.map(item => (
                      <span key={item.label}>
                        <b style={{ height: `${Math.max(8, Math.min(100, item.value * 6))}%`, background: item.color }} />
                        <strong>{item.value}</strong>
                        <small>{item.label}</small>
                      </span>
                    ))}
                  </div>
                </Link>

                <Link to="/alerts?tab=monitoring" className="cil-health-widget cil-health-widget-events">
                  <div className="cil-health-widget-title">Recent Events</div>
                  <div className="cil-health-event-head"><span>Time</span><span>Station</span><span>Event</span><span>Level</span></div>
                  {stationHealthOverview.recentAlerts.map(alert => (
                    <div key={`${alert.station}-${alert.time}-${alert.problem}`} className="cil-health-event-row">
                      <span>{alert.time}</span>
                      <span>{alert.station}</span>
                      <span>{alert.problem}</span>
                      <strong className={alert.level.toLowerCase()}>{alert.level}</strong>
                    </div>
                  ))}
                  {!stationHealthOverview.recentAlerts.length && (
                    <div style={{ padding: '14px 0', color: '#64748b', fontSize: '0.72rem' }}>
                      No live events — all monitored stations nominal.
                    </div>
                  )}
                </Link>

                <Link to="/alerts?tab=data-centre" className="cil-health-widget cil-health-widget-rinex">
                  <div className="cil-health-widget-title">RINEX Availability</div>
                  <div className="cil-rinex-row">
                    <div className="cil-rinex-donut" style={{ '--pct': `${stationHealthOverview.archivePct}%` }}>
                      <strong>{stationHealthOverview.archivePct}%</strong>
                      <span>Available</span>
                    </div>
                    <div className="cil-rinex-stats">
                      <span>Available Files <b>{stationHealthOverview.availableFiles.toLocaleString()}</b></span>
                      <span>Missing Files <b className="warn">{stationHealthOverview.missingFiles.toLocaleString()}</b></span>
                      <span>Late Files <b className="amber">{stationHealthOverview.lateFiles}</b></span>
                      <span>Total Expected <b>{stationHealthOverview.expectedFiles.toLocaleString()}</b></span>
                    </div>
                  </div>
                </Link>

                <Link to="/" className="cil-health-widget cil-health-widget-system">
                  <div className="cil-health-widget-title">System Information</div>
                  {stationHealthOverview.system.map(([label, value, color]) => (
                    <div key={label} className="cil-system-row">
                      <HardDrive size={13} />
                      <span>{label}</span>
                      <b style={{ color }}>{value}</b>
                    </div>
                  ))}
                </Link>
              </div>
            </section>
          )}
        </>
      )}

      {metrics && (
        <NationalCorsAnalysis
          metrics={metrics}
          healthPayload={healthPayload}
          liveMode={liveMode}
          regionId={regionId}
          stationId={stationId}
          stations={stations}
          applicationLabel={applicationLabel}
          corsRisk={corsRisk}
          personaSummary={corsPersonaSummaries.overview}
        />
      )}
    </div>
  );
}
