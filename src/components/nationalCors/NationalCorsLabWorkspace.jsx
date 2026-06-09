import React from 'react';
import { Link } from 'react-router-dom';
import Sparkline from './Sparkline.jsx';
import StationQualitySummary from './StationQualitySummary.jsx';
import GnssIntegrityPanel from './GnssIntegrityPanel.jsx';
import { DedicatedMonitorBanner, NationalCorsAnalysis } from './NationalCorsServicePanels.jsx';
import { stationColor } from './stationLabHelpers.js';
import { APPLICATION_VIEWS, ANALYSIS_TABS, LAB_REGIONS } from '../../data/corsIntelligenceLabData.js';
import { CORS_PERSONA_TABS } from '../../data/corsHealthPersonas.js';
import { ZIMBABWE_CORS_STATIONS } from '../../data/zimbabweCorsStations.js';
import AfricaIonosphereMap from '../AfricaIonosphereMap.jsx';
import CorsHealthNetworkMap from '../CorsHealthNetworkMap.jsx';

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

  return (
    <div className="cil-body">
      <div className="cil-app-tabs" role="tablist" aria-label="Application views">
        {APPLICATION_VIEWS.map(view => (
          <button
            key={view.id}
            type="button"
            role="tab"
            aria-selected={spaceWeatherView === view.id}
            className={`cil-app-tab ${spaceWeatherView === view.id ? 'active' : ''}`}
            onClick={() => {
              setSpaceWeatherView(view.id);
              setCorsAnalysisResult(null);
              setMapView('overview');
            }}
          >
            <span className="cil-app-tab-label">{view.label}</span>
            <span className="cil-app-tab-desc">{view.desc}</span>
          </button>
        ))}
      </div>

      <DedicatedMonitorBanner appView={activeAppView} stationId={stationId} />

      <div className="cil-controls">
        <div><label>Region</label><select value={regionId} onChange={e => setRegionId(e.target.value)}>{LAB_REGIONS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}</select></div>
        <div><label>Station / Platform</label><select value={stationId} onChange={e => setStationId(e.target.value)}>{stations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
        {!liveMode && (
          <>
            <div><label>Date</label><input type="date" value={analysisDate} onChange={e => setAnalysisDate(e.target.value)} /></div>
            <div><label>Time (UTC)</label><input type="time" value={analysisTime} onChange={e => setAnalysisTime(e.target.value)} /></div>
            <div>
              <label>&nbsp;</label>
              <button type="button" className={`cil-run-btn ${analysisStale ? 'stale' : ''}`} onClick={runAnalysis} disabled={loading}>
                {loading ? '⟳ Running…' : analysisStale ? '↻ Update Analysis' : 'Run Analysis'}
              </button>
            </div>
          </>
        )}
        {liveMode && (
          <div className="cil-live-controls-note">
            <label>Live session</label>
            <p>Health API and NOAA Kp refresh automatically every 10 minutes. Use the header refresh button for an immediate update.</p>
          </div>
        )}
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

          <div className="cil-subnav">
            {['Overview', 'Stations', 'Integrity', 'Analysis', 'Settings'].map(v => (
              <button key={v} type="button" className={mapView === v.toLowerCase() ? 'active' : ''} onClick={() => setMapView(v.toLowerCase())}>{v}</button>
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
