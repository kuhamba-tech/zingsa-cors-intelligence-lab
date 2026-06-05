import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User, Radio, Satellite } from 'lucide-react';
import '../styles/cors-intelligence-lab.css';
import {
  LAB_REGIONS, ANALYSIS_TABS, ANALYSIS_METHODS, PORTAL_LINKS,
  getStationsForRegion, getLiveErrorForRegion,
  generateDemoIPMetrics, buildLiveIPMetrics,
} from '../data/corsIntelligenceLabData.js';
import { fetchLiveKp, getDemoSpaceWeather } from '../services/spaceWeatherApi.js';
import { getCorsStationHealth } from '../services/corsApi.js';
import AfricaIonosphereMap from '../components/AfricaIonosphereMap.jsx';

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

export default function AfricanCORSIntelligenceLabPage({ onNavigate }) {
  const [liveMode, setLiveMode] = useState(false);
  const [regionId, setRegionId] = useState('zimbabwe');
  const [stationId, setStationId] = useState('ZINH');
  const [analysisTab, setAnalysisTab] = useState('monitoring');
  const [selectedMethod, setSelectedMethod] = useState('monitoring');
  const [analysisDate, setAnalysisDate] = useState(new Date().toISOString().slice(0, 10));
  const [analysisTime, setAnalysisTime] = useState('03:37');
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState(null);
  const [apiError, setApiError] = useState(null);
  const [mapView, setMapView] = useState('overview');

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
        await new Promise(r => setTimeout(r, 500));
        setMetrics(generateDemoIPMetrics(regionId, station?.name || stationId));
      }
    } catch (err) {
      setApiError(err.message);
      setMetrics(generateDemoIPMetrics(regionId, station?.name || stationId));
    } finally {
      setLoading(false);
    }
  }, [liveMode, regionId, stationId, stations, region.label]);

  useEffect(() => { runAnalysis(); }, [liveMode, regionId, stationId]);

  const kpStatus = metrics ? { label: metrics.ipLevel, color: metrics.ipColor } : { label: 'Loading', color: '#22d3ee' };

  return (
    <div className="cil-page">
      <header className="cil-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Radio size={22} color="#ff8c00" />
          <div>
            <div className="cil-header-title">ZINGSA Space Science</div>
            <div style={{ fontSize: '0.68rem', color: '#6b7280', marginTop: 2 }}>Zimbabwe National Geospatial &amp; Space Agency · Ionospheric Perturbations · CORS Network</div>
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
        Select region or application <span>›</span> See analysis <span>›</span> View satellite track and ionospheric perturbations (IP)
      </div>

      {liveError && (
        <div className="cil-alert-bar"><strong>{liveError.type}:</strong><span>{liveError.message}</span></div>
      )}
      {apiError && !liveError && (
        <div className="cil-alert-bar" style={{ background: 'rgba(249,115,22,0.08)', borderColor: 'rgba(249,115,22,0.3)', color: '#fdba74' }}>
          <strong>⚠ API:</strong><span>{apiError} — showing calibrated demo data.</span>
        </div>
      )}

      <div className="cil-body">
        <div className="cil-controls">
          <div><label>Region</label><select value={regionId} onChange={e => setRegionId(e.target.value)}>{LAB_REGIONS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}</select></div>
          <div><label>Station / Platform</label><select value={stationId} onChange={e => setStationId(e.target.value)}>{stations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
          <div><label>Space Weather</label><select defaultValue="ionosphere"><option value="ionosphere">Ionospheric IP</option><option value="space-weather">Space Weather</option><option value="cors-health">CORS Health</option></select></div>
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

            <div className="cil-subnav">
              {['Overview', 'Stations', 'Analysis', 'Settings'].map(v => (
                <button key={v} type="button" className={mapView === v.toLowerCase() ? 'active' : ''} onClick={() => setMapView(v.toLowerCase())}>{v}</button>
              ))}
            </div>

            <div className="cil-main-grid">
              <div className="cil-map-wrap">
                <AfricaIonosphereMap kp={metrics.kp} status={kpStatus} regionId={region.mapRegion} regionSummary={`${region.label} · IP ${metrics.ipIndex}/100`} />
              </div>
              <div className="cil-metrics-panel">
                <h3 className="cil-section-title" style={{ marginBottom: 16 }}>Space Weather — Ionospheric Perturbation (IP) Analysis</h3>
                <div style={{ fontSize: '0.65rem', color: '#6b7280', marginBottom: 14, padding: '6px 10px', background: 'rgba(0,0,0,0.2)', borderRadius: 6 }}>
                  Mode: <strong style={{ color: liveMode ? '#ef4444' : '#eab308' }}>{metrics.mode?.toUpperCase()}</strong>
                  {metrics.dataSource && <> · {metrics.dataSource}</>}
                </div>
                {metrics.metrics.map(m => {
                  const numVal = typeof m.value === 'number' ? m.value : parseFloat(m.value);
                  const pct = m.max ? Math.min(100, (Math.abs(numVal) / m.max) * 100) : 50;
                  return (
                    <div key={m.label} className="cil-metric-row">
                      <div className="row-head">
                        <span className="row-label">{m.label}</span>
                        <span className="row-value" style={{ color: m.color }}>{m.value}{m.unit ? ` ${m.unit}` : ''}</span>
                      </div>
                      <div className="cil-metric-bar"><div className="cil-metric-bar-fill" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${m.color}88, ${m.color})` }} /></div>
                      {m.note && <div className="row-note">{m.note}</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        <section className="cil-embedded-lab">
          <h3 className="cil-section-title"><Satellite size={18} style={{ verticalAlign: 'middle', marginRight: 8 }} />About ZINGSA CORS Network</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
            {[
              ['📡', 'Centimetre Accuracy', 'CORS corrections reduce GNSS error from metres to centimetres for surveys, drones, and infrastructure monitoring across Zimbabwe.'],
              ['⚡', 'Ionospheric Monitoring', 'Real-time TEC, scintillation S4, and IP index track equatorial ionospheric perturbations affecting African GNSS users.'],
              ['🌍', 'AFREF Integration', 'ZINGSA stations contribute to the African Reference Frame — enabling cross-border geospatial consistency.'],
              ['🔴', 'Demo & Live Modes', 'DEMO uses calibrated regional models. LIVE connects to NOAA SWPC Kp and CORS station health APIs.'],
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
