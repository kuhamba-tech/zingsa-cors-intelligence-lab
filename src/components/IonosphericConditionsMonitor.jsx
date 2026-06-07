import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, RefreshCw, Waves } from 'lucide-react';
import { getIonosphereStatus } from '../services/corsApi.js';
import { IONOSPHERE_MONITOR_STATIONS } from '../utils/corsNetworkData.js';
import '../styles/ionospheric-conditions.css';

const FALLBACK_STATIONS = IONOSPHERE_MONITOR_STATIONS.map((ref, i) => ({
  id: ref.id.replace(/_$/, ''),
  name: ref.name,
  vtec: 16 + i * 2,
  s4: 0.18 + i * 0.08,
  delay: 6 + i,
  error: 2 + i * 0.3,
  rtk: i === 2 ? 'FLOAT' : 'FIXED',
  ppp: i === 2 ? 'Delayed' : 'Normal',
  quality: i === 2 ? 'MODERATE' : 'LOW',
}));

// ── GNSS signal performance per frequency ──
const GNSS_PERFORMANCE = [
  { name: 'GPS',     color: '#22c55e', l1: 'LOW', l2: 'LOW',      l5: 'LOW' },
  { name: 'Galileo', color: '#22d3ee', l1: 'LOW', l2: 'LOW',      l5: 'LOW' },
  { name: 'BeiDou',  color: '#f97316', l1: 'LOW', l2: 'MODERATE', l5: 'LOW' },
  { name: 'GLONASS', color: '#a855f7', l1: 'LOW', l2: 'LOW',      l5: null  },
];

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

function llToCanvas(lat, lon, W, H) {
  return [
    (lon - MAP_LON_MIN) / (MAP_LON_MAX - MAP_LON_MIN) * W,
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
  // Equatorial ionization anomaly: peak ~5°N, broad east-west band
  const mainPeak = 78 * Math.exp(-Math.pow(lat - 5, 2) / 220)
                     * Math.exp(-Math.pow(lon - 5, 2) / 3200);
  // Wide baseline driven purely by latitude
  const baseline = 22 * Math.exp(-Math.pow(lat - 5, 2) / 600);
  return Math.min(80, Math.max(0, mainPeak + baseline));
}

const MAP_LAYERS = ['VTEC', 'ROTI', 'Scintillation', 'GNSS Delay'];
const CONSTELLATIONS = ['GPS', 'Galileo', 'BeiDou', 'GLONASS'];

function TecMap() {
  const [layer,  setLayer]  = useState('VTEC');
  const [consts, setConsts] = useState({ GPS: true, Galileo: true, BeiDou: true, GLONASS: true });
  const canvasRef = useRef(null);

  const toggle = name => setConsts(c => ({ ...c, [name]: !c[name] }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;

    // 1. Dark background
    ctx.fillStyle = '#020c1a';
    ctx.fillRect(0, 0, W, H);

    // 2. TEC heatmap via ImageData (fast batch)
    const img  = ctx.createImageData(W, H);
    const data = img.data;
    for (let py = 0; py < H; py++) {
      for (let px = 0; px < W; px++) {
        const lat = MAP_LAT_MAX - (py / H) * (MAP_LAT_MAX - MAP_LAT_MIN);
        const lon = MAP_LON_MIN + (px / W) * (MAP_LON_MAX - MAP_LON_MIN);
        const [r, g, b] = tecToRGB(getTECValue(lat, lon));
        const i = (py * W + px) * 4;
        data[i] = r; data[i+1] = g; data[i+2] = b; data[i+3] = 230;
      }
    }
    ctx.putImageData(img, 0, 0);

    // 3. Lat/lon grid lines (dashed, subtle)
    ctx.setLineDash([2, 5]);
    ctx.lineWidth = 0.6;
    [20, 0, -20].forEach(lat => {
      const [, y] = llToCanvas(lat, 0, W, H);
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y);
      ctx.strokeStyle = lat === 0 ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.13)';
      ctx.stroke();
    });
    [0, 20, 40].forEach(lon => {
      const [x] = llToCanvas(0, lon, W, H);
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H);
      ctx.strokeStyle = 'rgba(255,255,255,0.13)';
      ctx.stroke();
    });
    ctx.setLineDash([]);

    // 4. Africa continent outline
    ctx.beginPath();
    AFRICA_OUTLINE.forEach(([lat, lon], idx) => {
      const [x, y] = llToCanvas(lat, lon, W, H);
      if (idx === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth   = 1.4;
    ctx.stroke();

    // 5. Lat/lon text labels drawn on canvas
    ctx.font      = 'bold 9px Inter,sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.textAlign = 'right';
    [{ lat:20,label:'20°N'},{lat:0,label:'0°'},{lat:-20,label:'20°S'},{lat:-40,label:'40°S'}].forEach(({ lat, label }) => {
      const [, y] = llToCanvas(lat, MAP_LON_MIN, W, H);
      ctx.fillText(label, W - 4, y + 3);
    });
    ctx.textAlign = 'center';
    [{ lon:-20,label:'20°W'},{lon:0,label:'0°'},{lon:20,label:'20°E'},{lon:40,label:'40°E'},{lon:60,label:'60°E'}].forEach(({ lon, label }) => {
      const [x] = llToCanvas(MAP_LAT_MIN, lon, W, H);
      ctx.fillText(label, x, H - 3);
    });
  }, [layer]);

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

      {/* Canvas map */}
      <div className="icm2-tec-map">
        {/* Colorbar */}
        <div className="icm2-tec-colorbar">
          <div className="icm2-colorbar-labels top"><span>TECU</span></div>
          <div className="icm2-colorbar-gradient" />
          <div className="icm2-colorbar-labels">
            <span>80</span><span>60</span><span>40</span><span>20</span><span>0</span>
          </div>
        </div>

        {/* Heatmap canvas */}
        <canvas
          ref={canvasRef}
          width={520}
          height={480}
          className="icm2-tec-canvas"
        />

        {/* Bottom legend */}
        <div className="icm2-tec-legend">
          {[
            { label: 'Low (0-10)',       color: '#003acc' },
            { label: 'Moderate (10-30)', color: '#00cc88' },
            { label: 'High (30-60)',     color: '#ffcc00' },
            { label: 'Very High (>60)',  color: '#ff2200' },
          ].map(item => (
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
  const [status, setStatus]   = useState(demoData);
  const [loading, setLoading] = useState(true);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const json = await getIonosphereStatus({ station: 'HARA' });
      setStatus({ ...demoData(), ...json, mode: json.mode || 'live' });
    } catch {
      setStatus(demoData());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
    const id = setInterval(loadStatus, 10 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const corsStations = status.stations?.length ? status.stations : FALLBACK_STATIONS;
  const stationPos = status.positions || STATION_POS;
  const primaryStation = status.station || 'HARA';
  const primaryName = corsStations.find(s => s.id === primaryStation)?.name || 'Harare';

  const tecTrend   = useMemo(() => Array.from({ length: 25 }, (_, i) => 11 + Math.sin(i / 3) * 5 + Math.max(0, 9 - Math.abs(i - 13)) * 1.7), []);
  const scintTrend = useMemo(() => Array.from({ length: 25 }, (_, i) => 0.18 + Math.max(0, 8 - Math.abs(i - 15)) * 0.075 + Math.sin(i) * 0.035), []);
  const delayTrend = useMemo(() => tecTrend.map(v => v * 0.43), [tecTrend]);
  const phaseTrend = useMemo(() => scintTrend.map(v => v * 1.15), [scintTrend]);

  const FORECAST_ROWS = [
    { label: 'TEC Level',        colors: ['LOW','LOW','MODERATE','LOW'],      texts: ['Low','Low','Mod','Low'] },
    { label: 'S4 Scintillation', colors: ['LOW','LOW','MODERATE','HIGH'],     texts: ['Low','Low','Mod','High'] },
    { label: 'RTK Status',       colors: ['LOW','LOW','LOW','MODERATE'],      texts: ['OK', 'OK', 'OK','WARN'] },
    { label: 'GNSS Impact',      colors: ['LOW','LOW','MODERATE','LOW'],      texts: ['Low','Low','Mod','Low'] },
  ];

  return (
    <div className="icm2-root">
      <div className="icm2-main">

        {/* ── Header ── */}
        <header className="icm2-header">
          <div className="icm2-header-title">
            <h1>IONOSPHERIC CONDITIONS MONITOR</h1>
            <p>Real-time monitoring of ionospheric disturbances, GNSS signal propagation, and positioning accuracy across CORS networks.</p>
          </div>
          <div className="icm2-header-right">
            <span className="icm2-live-badge">
              <i className="icm2-live-dot" />
              {status.mode === 'live' ? 'Live Monitoring' : 'Operational Data Stream'}
            </span>
            <div className="icm2-sources">
              <span>Data Sources:</span>
              {['IGS', 'CODE', 'NOAA SWPC', 'Local CORS'].map(s => (
                <span key={s} className="icm2-source-chip">{s}</span>
              ))}
            </div>
            <span className="icm2-timestamp">{utcTime(status.updated_utc)}</span>
            <button
              type="button"
              className="icm2-refresh-btn"
              onClick={loadStatus}
              disabled={loading}
              title="Refresh"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </header>

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
                  <div className="icm2-kv"><span>Condition</span><strong style={{ color: '#22c55e' }}>Quiet</strong></div>
                  <div className="icm2-kv"><span>TEC Activity</span><strong style={{ color: '#eab308' }}>Moderate</strong></div>
                  <div className="icm2-kv"><span>GNSS Impact</span><strong style={{ color: '#22c55e' }}>Low</strong></div>
                  <div className="icm2-kv"><span>RTK Reliability</span><strong style={{ color: '#22c55e' }}>Normal</strong></div>
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
                <span className="icm2-badge mod">Moderate</span>
              </div>
            </article>

            {/* 4 — Ionospheric Delay */}
            <article className="icm2-card">
              <div className="icm2-card-title">IONOSPHERIC DELAY</div>
              <div className="icm2-kv-stack">
                <div className="icm2-kv"><span>Zenith Delay (L1)</span><strong>{status.ionospheric_delay_l1_ns.toFixed(1)} <small>ns</small></strong></div>
                <div className="icm2-kv"><span>Range Error</span><strong>{status.range_error_m.toFixed(1)} <small>m</small></strong></div>
                <div className="icm2-kv"><span>Correction</span><strong style={{ color: '#22c55e' }}>Available</strong></div>
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
                <div className="icm2-kv"><span>Storm Risk</span><strong style={{ color: '#22c55e' }}>Low</strong></div>
              </div>
            </article>
          </div>

          {/* ── Mid Grid: Map + Charts ── */}
          <div className="icm2-mid-grid">

            <article className="icm2-panel icm2-map-col">
              <div className="icm2-panel-hdr">
                <span className="icm2-card-title">AFRICA IONOSPHERIC TEC MAP</span>
              </div>
              <TecMap />
            </article>

            <div className="icm2-charts-col">

              <article className="icm2-panel">
                <div className="icm2-panel-hdr">
                  <span className="icm2-card-title">VERTICAL TEC TREND (VTEC)</span>
                </div>
                <div className="icm2-chart-yaxis-wrap">
                  <div className="icm2-chart-yaxis"><span>40</span><span>30</span><span>20</span><span>10</span><span>0</span></div>
                  <TrendChart values={tecTrend} color="#a855f7" height={110} />
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
                <TrendChart values={scintTrend} color="#22c55e" height={100} multiScint />
                <p className="icm2-chart-note">Station: {primaryStation} ({primaryName})</p>
              </article>

              <article className="icm2-panel">
                <div className="icm2-panel-hdr">
                  <span className="icm2-card-title">IONOSPHERIC DELAY OVER TIME (L1)</span>
                </div>
                <div className="icm2-chart-yaxis-wrap">
                  <div className="icm2-chart-yaxis sm"><span>15</span><span>10</span><span>5</span><span>0</span></div>
                  <TrendChart values={delayTrend} color="#22d3ee" height={100} />
                </div>
                <p className="icm2-chart-note">Station: {primaryStation} ({primaryName})</p>
              </article>

              <article className="icm2-panel">
                <div className="icm2-panel-hdr">
                  <span className="icm2-card-title">PHASE SCINTILLATION (σφ)</span>
                </div>
                <TrendChart values={phaseTrend} color="#f97316" height={100} />
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
                <span className="icm2-eia-dot" />
                <div>
                  <div className="icm2-sub-label">Current Status</div>
                  <div style={{ color: '#f97316', fontSize: '1.15rem', fontWeight: 900, letterSpacing: '0.05em' }}>ACTIVE</div>
                </div>
              </div>
              <div className="icm2-kv-stack" style={{ marginTop: 12 }}>
                <div className="icm2-kv"><span>Peak Region</span><strong>±15° Magnetic Latitude</strong></div>
                <div className="icm2-kv"><span>Risk Window</span><strong style={{ color: '#f97316' }}>18:00 – 23:00 UTC</strong></div>
                <div className="icm2-kv"><span>Crest Location</span><strong>~15°N / ~15°S</strong></div>
                <div className="icm2-kv"><span>Zimbabwe Effect</span><strong style={{ color: '#eab308' }}>Moderate</strong></div>
              </div>
              <div className="icm2-eia-impact">
                <Waves size={11} />
                GNSS Scintillation Possible — RTK users monitor fixes
              </div>
            </article>

            {/* ROTI Monitor */}
            <article className="icm2-panel">
              <div className="icm2-card-title icm2-panel-mb">RATE OF TEC INDEX (ROTI)</div>
              <div className="icm2-big-value" style={{ color: '#22c55e', fontSize: '2.1rem' }}>0.18</div>
              <div className="icm2-big-unit" style={{ marginBottom: 12 }}>TECU / min</div>
              <div className="icm2-kv-stack">
                <div className="icm2-kv"><span>Activity</span><strong style={{ color: '#22c55e' }}>LOW</strong></div>
                <div className="icm2-kv"><span>Disturbance</span><strong>None detected</strong></div>
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
                  <strong style={{ color: '#22c55e', fontSize: '1.1rem' }}>98.5%</strong>
                </div>
                <div className="icm2-kv"><span>Avg Correction Age</span><strong>1.2 sec</strong></div>
                <div className="icm2-kv"><span>PPP Convergence</span><strong style={{ color: '#22c55e' }}>Normal</strong></div>
              </div>
              <div className="icm2-accuracy-grid">
                <div className="icm2-accuracy-item">
                  <span>Horizontal</span>
                  <strong>8 mm</strong>
                </div>
                <div className="icm2-accuracy-item">
                  <span>Vertical</span>
                  <strong>15 mm</strong>
                </div>
                <div className="icm2-accuracy-item">
                  <span>Baseline RMS</span>
                  <strong>2.1 mm</strong>
                </div>
              </div>
              <div className="icm2-kv" style={{ marginTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10 }}>
                <span>Network Status</span>
                <strong style={{ color: '#22c55e' }}>All CORS Online</strong>
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
                  {GNSS_PERFORMANCE.map(row => (
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
              <div className="icm2-card-title icm2-panel-mb">CORS NETWORK EFFECT</div>
              <table className="icm2-table">
                <thead>
                  <tr>
                    <th>Station</th><th>VTEC (TECU)</th><th>S4</th><th>RTK</th><th>Error</th>
                  </tr>
                </thead>
                <tbody>
                  {corsStations.map(s => (
                    <tr key={s.id}>
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
            </article>

            {/* Ionospheric Alerts */}
            <article className="icm2-panel">
              <div className="icm2-card-title icm2-panel-mb">IONOSPHERIC ALERTS</div>
              <div className="icm2-alert-card">
                <div className="icm2-alert-hdr">
                  <AlertTriangle size={15} />
                  <span>Equatorial Scintillation</span>
                  <span className="icm2-badge mod" style={{ marginLeft: 'auto' }}>MODERATE</span>
                </div>
                <div className="icm2-kv-stack" style={{ marginTop: 10, marginBottom: 10 }}>
                  <div className="icm2-kv"><span>Region</span><strong>Southern Africa</strong></div>
                  <div className="icm2-kv"><span>Time</span><strong>18:00 – 23:00 UTC</strong></div>
                </div>
                <div className="icm2-effects-title">Possible Effects</div>
                <ul className="icm2-effects-list">
                  <li>RTK initialization delay</li>
                  <li>Increased positioning errors</li>
                  <li>Signal fading and loss of lock</li>
                </ul>
              </div>
            </article>

            {/* 24h Forecast */}
            <article className="icm2-panel">
              <div className="icm2-panel-hdr" style={{ flexWrap: 'wrap', gap: 6 }}>
                <span className="icm2-card-title">IONOSPHERE FORECAST</span>
                <span className="icm2-sub-label" style={{ marginLeft: 'auto' }}>Next Update: 13:00 UTC</span>
              </div>
              <table className="icm2-table icm2-forecast-table">
                <thead>
                  <tr>
                    <th>Metric</th>
                    {['Now', '+6h', '+12h', '+24h'].map(l => <th key={l} style={{ textAlign: 'center' }}>{l}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {FORECAST_ROWS.map(row => (
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

        </div>
      </div>
    </div>
  );
}
