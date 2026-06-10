/**
 * ZGIIS — Zimbabwe GNSS Ionosphere Intelligence System
 * React implementation of the TEC Analysis Platform dashboard.
 * Mirrors the Python/Streamlit ZGIIS app data, charts, and station registry.
 */
import React, { useMemo, useState } from 'react';
import { useOpsHealth } from '../context/OpsHealthContext.jsx';

// ── Station registry (mirrors zgiis/cors/stations.py) ────────────────────────
const ZGIIS_STATIONS = [
  { code: 'HARA', name: 'Harare',      lat: -17.8252, lon: 31.0335, vtec: 22.4, status: 'online',   constellations: ['GPS', 'GLONASS', 'Galileo'] },
  { code: 'BULA', name: 'Bulawayo',    lat: -20.1600, lon: 28.5800, vtec: 20.1, status: 'online',   constellations: ['GPS', 'GLONASS'] },
  { code: 'GWER', name: 'Gweru',       lat: -19.4500, lon: 29.8200, vtec: 21.3, status: 'online',   constellations: ['GPS'] },
  { code: 'KWEK', name: 'Kwekwe',      lat: -18.9250, lon: 29.8200, vtec: 21.8, status: 'online',   constellations: ['GPS', 'Galileo'] },
  { code: 'MUTA', name: 'Mutare',      lat: -18.9700, lon: 32.6500, vtec: 23.1, status: 'online',   constellations: ['GPS', 'GLONASS'] },
  { code: 'CHIM', name: 'Chimanimani', lat: -19.7900, lon: 32.8600, vtec: 0.0,  status: 'degraded', constellations: ['GPS'] },
  { code: 'CHIR', name: 'Chiredzi',    lat: -21.0400, lon: 31.6700, vtec: 19.6, status: 'online',   constellations: ['GPS'] },
  { code: 'GOKW', name: 'Gokwe',       lat: -18.2200, lon: 28.9300, vtec: 21.0, status: 'online',   constellations: ['GPS', 'GLONASS'] },
  { code: 'KARO', name: 'Karoi',       lat: -16.8000, lon: 29.6800, vtec: 23.8, status: 'online',   constellations: ['GPS'] },
  { code: 'CENT', name: 'Centenary',   lat: -16.7300, lon: 31.1200, vtec: 24.2, status: 'online',   constellations: ['GPS', 'Galileo'] },
  { code: 'LUPA', name: 'Lupane',      lat: -18.9300, lon: 27.8100, vtec: 0.0,  status: 'offline',  constellations: ['GPS'] },
  { code: 'GSU',  name: 'Gwanda',      lat: -20.9400, lon: 29.0000, vtec: 19.2, status: 'online',   constellations: ['GPS'] },
  { code: 'ZINH', name: 'ZINH',        lat: -17.7500, lon: 31.0000, vtec: 22.7, status: 'online',   constellations: ['GPS', 'GLONASS', 'Galileo', 'BeiDou'] },
];

const STATUS_COLOR = { online: '#00ff88', degraded: '#ff8c00', offline: '#ff4444' };
const GNSS_COLORS  = { GPS: '#22d3ee', GLONASS: '#a855f7', Galileo: '#00ff88', BeiDou: '#f97316' };

// ── ZGIIS platform modules (from Home.py nav_card) ──────────────────────────
const MODULES = [
  { icon: '📡', title: 'Live Dashboard',   desc: 'Station map · VTEC · network status',       accent: 'cyan' },
  { icon: '⚙️', title: 'RINEX Processing', desc: 'CMN/RINEX loader · elevation mask · IPP',   accent: 'orange' },
  { icon: '📈', title: 'TEC Time Series',  desc: 'Daily · monthly · yearly VTEC trends',      accent: 'green' },
  { icon: '🛸', title: 'PRN Explorer',     desc: 'Per-satellite TEC · sky plots · quality',   accent: 'purple' },
  { icon: '🗺️', title: 'TEC Heat Map',    desc: 'Interpolated VTEC grid over Zimbabwe',       accent: 'green' },
  { icon: '☀️', title: 'Space Weather',   desc: 'Kp · F10.7 · storm alerts · GNSS risk',     accent: 'orange' },
  { icon: '🔬', title: 'Research Centre',  desc: 'Anomaly · storm analysis · solar cycle',    accent: 'cyan' },
  { icon: '🤖', title: 'AI Assistant',     desc: 'Claude-powered TEC expert Q&A',             accent: 'purple' },
];

// ── Helpers (mirrors fetch_indices.py classification) ────────────────────────
function classifyKp(kp) {
  if (kp >= 8) return { condition: 'Extreme Storm (G5)', risk: 'Critical',  color: '#cc00ff' };
  if (kp >= 7) return { condition: 'Severe Storm (G4)',  risk: 'Critical',  color: '#cc00ff' };
  if (kp >= 6) return { condition: 'Strong Storm (G3)',  risk: 'High',      color: '#ff4444' };
  if (kp >= 5) return { condition: 'Minor Storm (G1)',   risk: 'Moderate',  color: '#ff8c00' };
  if (kp >= 4) return { condition: 'Active',             risk: 'Moderate',  color: '#ff8c00' };
  if (kp >= 3) return { condition: 'Unsettled',          risk: 'Low',       color: '#22d3ee' };
  return           { condition: 'Quiet',             risk: 'Low',       color: '#00ff88' };
}

function getWarnings(kp) {
  const msgs = [];
  if (kp >= 5) msgs.push('GNSS accuracy degradation expected — ionospheric disturbance active.');
  if (kp >= 6) msgs.push('Possible RTK instability at equatorial and mid-latitude stations.');
  if (kp >= 7) msgs.push('Aviation positioning may be affected — verify GNSS integrity.');
  if (kp >= 8) msgs.push('CRITICAL: Severe geomagnetic storm in progress. GNSS navigation unreliable.');
  if (!msgs.length) msgs.push('Conditions nominal — no significant ionospheric disturbance detected.');
  return msgs;
}

// GOP-style 24h VTEC diurnal profile (mirrors summarize_24h_profile logic)
// Peak near 12 UT (≈ 14:00 local for Zimbabwe), evening secondary EIA bump ~19-21 UT
function diurnalProfile(baseVtec) {
  return Array.from({ length: 24 }, (_, h) => {
    const amp    = baseVtec * 0.45;
    const trough = baseVtec * 0.55;
    const peak   = Math.exp(-Math.pow(h - 12, 2) / 20) * amp;
    const evening = h >= 18 && h <= 22 ? Math.exp(-Math.pow(h - 20, 2) / 3) * amp * 0.28 : 0;
    return Math.max(0, +(trough + peak + evening).toFixed(1));
  });
}

// Storm intensity classification (mirrors add_storm_intensity_index)
function stormClass(kp, vtec) {
  if (kp >= 6 || vtec >= 35)  return 'Strong Storm';
  if (kp >= 5 || vtec >= 28)  return 'Minor Storm';
  if (kp >= 4 || vtec >= 24)  return 'Active';
  if (kp >= 3)                return 'Unsettled';
  return 'Quiet';
}

// ── Component ────────────────────────────────────────────────────────────────
export default function TecAppPanel({ status }) {
  const { healthPayload } = useOpsHealth();
  const [stationFilter, setStationFilter] = useState('all');
  const [chartMode, setChartMode] = useState('vtec'); // 'vtec' | 'diurnal'

  const kp   = Number(status?.kp_index)   || 2.3;
  const vtec = Number(status?.vtec_tecu)  || 22.4;
  const s4   = Number(status?.s4_index)   || 0.18;
  const f107 = 142.5;
  const kpInfo   = classifyKp(kp);
  const warnings = getWarnings(kp);
  const storm    = stormClass(kp, vtec);

  // Merge demo registry with live healthPayload
  const stations = useMemo(() => {
    const byId = Object.fromEntries(
      (healthPayload?.stations || []).map(s => [s.station_id?.replace(/_$/, '').toUpperCase(), s])
    );
    return ZGIIS_STATIONS.map(s => {
      const h = byId[s.code];
      const liveStatus = h
        ? h.status === 'ONLINE' ? 'online' : h.status === 'DEGRADED' ? 'degraded' : 'offline'
        : s.status;
      return { ...s, status: liveStatus };
    });
  }, [healthPayload]);

  const onlineCount   = stations.filter(s => s.status === 'online').length;
  const stationsWithTec = stations.filter(s => s.vtec > 0);
  const meanVtec = +(stationsWithTec.reduce((a, s) => a + s.vtec, 0) / Math.max(1, stationsWithTec.length)).toFixed(1);
  const maxVtec  = Math.max(...stationsWithTec.map(s => s.vtec), 0);

  const visible = stationFilter === 'online'  ? stations.filter(s => s.status === 'online')
                : stationFilter === 'offline' ? stations.filter(s => s.status !== 'online')
                : stations;

  // Constellation coverage
  const constMap = { GPS: 0, GLONASS: 0, Galileo: 0, BeiDou: 0 };
  stations.forEach(s => s.constellations.forEach(c => { if (c in constMap) constMap[c]++; }));

  // VTEC bar chart data
  const barData = stationsWithTec;
  const barMax  = Math.max(...barData.map(s => s.vtec), 30);

  // 24h diurnal profile
  const profile = diurnalProfile(vtec);
  const PROF_W = 400, PROF_H = 110, PAD = 8;
  const profMin = Math.min(...profile);
  const profMax_ = Math.max(...profile);
  const profRng = profMax_ - profMin || 1;
  const profY = v => PROF_H - PAD - ((v - profMin) / profRng) * (PROF_H - PAD * 2);
  const profPath = profile.map((v, i) =>
    `${i === 0 ? 'M' : 'L'}${(PAD + (i / 23) * (PROF_W - PAD * 2)).toFixed(1)},${profY(v).toFixed(1)}`
  ).join(' ');

  return (
    <div className="tec-app-root">

      {/* ── Hero header ── */}
      <div className="tec-app-header">
        <div>
          <div className="tec-app-kicker">🛰️ ZGIIS — Zimbabwe GNSS Ionosphere Intelligence System</div>
          <h2 className="tec-app-title">TEC Analysis Platform</h2>
          <p className="tec-app-sub">
            Real-time VTEC monitoring · RINEX/CMN dual-frequency processing · Storm detection · AI-assisted interpretation
          </p>
        </div>
        <div className="tec-app-version-badge">
          <span className="tec-live-dot" style={{ background: kpInfo.color }} />
          ZGIIS v1.0 · ZINGSA Space Science © 2026
        </div>
      </div>

      {/* ── Space weather strip (mirrors Home.py metric columns) ── */}
      <div className="tec-sw-strip">
        {[
          { label: 'Kp Index',        value: kp.toFixed(1),          color: kpInfo.color },
          { label: 'Condition',       value: kpInfo.condition,        color: kpInfo.color },
          { label: 'F10.7 (sfu)',     value: f107.toFixed(1),         color: '#22d3ee' },
          { label: 'GNSS Risk',       value: kpInfo.risk,             color: kpInfo.risk === 'Low' ? '#00ff88' : kpInfo.risk === 'Moderate' ? '#ff8c00' : '#ff4444' },
          { label: 'Network VTEC',    value: `${vtec.toFixed(1)} TECU`, color: '#22d3ee' },
          { label: 'S4 Scintillation',value: s4.toFixed(2),           color: s4 >= 0.5 ? '#ff4444' : s4 >= 0.2 ? '#ff8c00' : '#00ff88' },
          { label: 'Storm Class',     value: storm,                   color: kpInfo.color },
          { label: 'Stations Online', value: `${onlineCount}/${stations.length}`, color: onlineCount >= 10 ? '#00ff88' : '#ff8c00' },
        ].map(({ label, value, color }) => (
          <div key={label} className="tec-sw-card">
            <div className="tec-sw-label">{label}</div>
            <div className="tec-sw-value" style={{ color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* ── Warning messages (mirrors get_warning_messages) ── */}
      {warnings.map((msg, i) => (
        <div key={i} className={`tec-msg-box ${kp >= 8 ? 'critical' : kp >= 5 ? 'warn' : 'ok'}`}>
          {kp >= 8 ? '🚨' : kp >= 5 ? '⚠️' : 'ℹ️'} {msg}
        </div>
      ))}

      {/* ── Chart row ── */}
      <div className="tec-main-grid">

        {/* VTEC bar chart / diurnal toggle (mirrors 1_Dashboard.py + 3_Time_Series.py) */}
        <div className="tec-panel">
          <div className="tec-panel-header">
            <div className="tec-panel-title">
              {chartMode === 'vtec' ? 'Current VTEC Across Network' : '24h Diurnal VTEC Profile (GOP-Style)'}
            </div>
            <div className="tec-chart-tabs">
              <button type="button" className={chartMode === 'vtec' ? 'active' : ''} onClick={() => setChartMode('vtec')}>VTEC Network</button>
              <button type="button" className={chartMode === 'diurnal' ? 'active' : ''} onClick={() => setChartMode('diurnal')}>24h Profile</button>
            </div>
          </div>

          {chartMode === 'vtec' ? (
            <>
              <svg
                viewBox={`0 0 ${barData.length * 44} 170`}
                preserveAspectRatio="xMidYMid meet"
                style={{ width: '100%', height: 170, display: 'block', overflow: 'visible' }}
              >
                {barData.map((s, i) => {
                  const bh    = Math.max(6, (s.vtec / barMax) * 130);
                  const bx    = i * 44 + 6;
                  const by    = 145 - bh;
                  const color = s.vtec < 20 ? '#00ff88' : s.vtec < 27 ? '#ff8c00' : '#ff4444';
                  return (
                    <g key={s.code}>
                      <rect x={bx} y={by} width={32} height={bh} fill={color} rx="4" opacity="0.88" />
                      <text x={bx + 16} y={by - 5} textAnchor="middle" fill={color} fontSize="8.5" fontWeight="700">{s.vtec.toFixed(1)}</text>
                      <text x={bx + 16} y="162" textAnchor="middle" fill="#6888aa" fontSize="7.5">{s.code}</text>
                    </g>
                  );
                })}
              </svg>
              <div className="tec-chart-note">VTEC (TECU) · elevation mask ≥25° · IPP shell 350 km</div>
            </>
          ) : (
            <>
              <svg viewBox={`0 0 ${PROF_W} ${PROF_H}`} preserveAspectRatio="none" style={{ width: '100%', height: PROF_H }}>
                {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
                  <line key={i} x1={PAD} x2={PROF_W - PAD} y1={profY(profMin + p * profRng)} y2={profY(profMin + p * profRng)} stroke="rgba(255,255,255,0.07)" strokeDasharray="3,3" />
                ))}
                <defs>
                  <linearGradient id="tecGrad" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#00d4ff" stopOpacity="0.28" />
                    <stop offset="100%" stopColor="#00d4ff" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {/* Evening EIA risk band */}
                <rect
                  x={PAD + (18 / 23) * (PROF_W - PAD * 2)} y={PAD}
                  width={(4 / 23) * (PROF_W - PAD * 2)} height={PROF_H - PAD * 2}
                  fill="rgba(255,140,0,0.1)" rx="2"
                />
                <path
                  d={`${profPath} L${(PAD + (23 / 23) * (PROF_W - PAD * 2)).toFixed(1)},${PROF_H} L${PAD},${PROF_H} Z`}
                  fill="url(#tecGrad)"
                />
                <path d={profPath} stroke="#00d4ff" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div className="tec-chart-xaxis">
                {['00h', '04h', '08h', '12h', '16h', '20h', '24h'].map(h => <span key={h}>{h}</span>)}
              </div>
              <div className="tec-chart-note">
                Mean {meanVtec} TECU · Max {maxVtec.toFixed(1)} TECU · Orange band = evening EIA risk window (18–22 UT)
              </div>
            </>
          )}
        </div>

        {/* TEC processing parameters (mirrors 2_Processing.py config) */}
        <div className="tec-panel">
          <div className="tec-panel-title">TEC Processing Parameters</div>
          <div className="tec-params-grid">
            {[
              ['Elevation Mask',     '≥ 25°',         '#22d3ee'],
              ['IPP Shell Height',   '350 km',         '#22d3ee'],
              ['File Formats',       'RINEX 3.04 · CMN', '#94a3b8'],
              ['STEC Formula',       'STEC = k·(P2–P1)', '#a855f7'],
              ['VTEC Conversion',    'VTEC = STEC / M(E)', '#a855f7'],
              ['Mapping Function',   'Single-shell model', '#94a3b8'],
              ['Dual-freq constant', 'f1=1575.42 MHz L1', '#94a3b8'],
              ['GPS L2',             'f2=1227.60 MHz L2',  '#94a3b8'],
              ['Storm threshold',    'Kp ≥ 5 or VTEC >P90', '#ff8c00'],
              ['Kp source',          'NOAA SWPC (15 min)', '#22c55e'],
              ['Archive output',     'daily/monthly/yearly CSV', '#94a3b8'],
              ['PDF reports',        'ZGIIS PDF generator', '#22d3ee'],
            ].map(([k, v, c]) => (
              <div key={k} className="tec-param-row">
                <span className="tec-param-key">{k}</span>
                <span className="tec-param-val" style={{ color: c }}>{v}</span>
              </div>
            ))}
          </div>
          <div className="tec-chart-note" style={{ marginTop: 10 }}>
            STEC → VTEC: M(E) = 1/√(1−(Rₑ·cos(E)/(Rₑ+h))²) · Rₑ=6371 km
          </div>
        </div>
      </div>

      {/* ── TEC stats strip ── */}
      <div className="tec-stats-row">
        {[
          { label: 'Network Mean VTEC', value: `${meanVtec} TECU`,         color: '#00d4ff' },
          { label: 'Network Max VTEC',  value: `${maxVtec.toFixed(1)} TECU`, color: kpInfo.color },
          { label: 'Storm Class',       value: storm,                       color: kpInfo.color },
          { label: 'Stations Reporting',value: `${stationsWithTec.length}/${stations.length}`, color: '#94a3b8' },
          { label: 'Archive Sources',   value: 'RINEX 3.04 · CMN',          color: '#94a3b8' },
          { label: 'Last Kp Update',    value: 'NOAA SWPC live',             color: '#22c55e' },
        ].map(({ label, value, color }) => (
          <div key={label} className="tec-stat-card">
            <div className="tec-stat-label">{label}</div>
            <div className="tec-stat-value" style={{ color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* ── Station grid (mirrors Home.py station status overview) ── */}
      <div className="tec-section-head">
        <span className="tec-panel-title" style={{ margin: 0 }}>Zimbabwe CORS Network — Station Status</span>
        <div className="tec-filter-tabs">
          {[['all', 'All'], ['online', 'Online'], ['offline', 'Issues']].map(([v, l]) => (
            <button key={v} type="button" className={stationFilter === v ? 'active' : ''} onClick={() => setStationFilter(v)}>{l}</button>
          ))}
        </div>
      </div>
      <div className="tec-station-grid">
        {visible.map(s => {
          const sc = STATUS_COLOR[s.status] || '#888';
          return (
            <div key={s.code} className="tec-station-card" style={{ borderLeftColor: sc }}>
              <div className="tec-station-head">
                <span className="tec-station-code">{s.code}</span>
                <span className="tec-station-badge" style={{ background: `${sc}22`, color: sc, borderColor: sc }}>
                  {s.status.toUpperCase()}
                </span>
              </div>
              <div className="tec-station-name">{s.name}</div>
              <div className="tec-station-coords">{s.lat.toFixed(4)}°, {s.lon.toFixed(4)}°</div>
              <div className="tec-station-vtec" style={{ color: s.vtec > 0 ? '#00d4ff' : '#334455' }}>
                {s.vtec > 0 ? `${s.vtec.toFixed(1)} TECU` : '— TECU'}
              </div>
              <div className="tec-station-consts">
                {s.constellations.map(c => (
                  <span key={c} style={{ color: GNSS_COLORS[c] || '#94a3b8', fontSize: '0.6rem', fontWeight: 700 }}>{c}</span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Bottom row: constellation coverage + module cards ── */}
      <div className="tec-main-grid" style={{ marginTop: 20 }}>

        {/* Constellation coverage (mirrors 1_Dashboard.py pie chart) */}
        <div className="tec-panel">
          <div className="tec-panel-title">Constellation Coverage</div>
          <div className="tec-const-grid">
            {Object.entries(constMap).map(([name, count]) => {
              const pct = Math.round((count / stations.length) * 100);
              return (
                <div key={name} className="tec-const-row">
                  <span style={{ color: GNSS_COLORS[name], fontWeight: 800, minWidth: 72, fontSize: '0.78rem' }}>{name}</span>
                  <div className="tec-const-bar-bg">
                    <div className="tec-const-bar-fill" style={{ width: `${pct}%`, background: GNSS_COLORS[name] }} />
                  </div>
                  <span className="tec-const-stat">{count}/{stations.length} ({pct}%)</span>
                </div>
              );
            })}
          </div>
          <div className="tec-chart-note" style={{ marginTop: 14 }}>
            BeiDou coverage is strongest at low latitudes (lat &gt; −15°).
            GLONASS has slightly better performance above +5° latitude.
          </div>
        </div>

        {/* ZGIIS module cards (mirrors Home.py nav_card) */}
        <div className="tec-panel">
          <div className="tec-panel-title">ZGIIS Platform Modules</div>
          <div className="tec-module-grid">
            {MODULES.map(({ icon, title, desc, accent }) => (
              <div key={title} className={`tec-module-card tec-module-${accent}`}>
                <span className="tec-module-icon">{icon}</span>
                <div>
                  <div className="tec-module-title">{title}</div>
                  <div className="tec-module-desc">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="tec-app-footer">
        <span>ZGIIS v1.0 · Zimbabwe GNSS Ionosphere Intelligence System</span>
        <span>ZINGSA Space Science Operations · Data: NOAA SWPC · RINEX/CMN Archives · IGS GIM</span>
      </div>
    </div>
  );
}
