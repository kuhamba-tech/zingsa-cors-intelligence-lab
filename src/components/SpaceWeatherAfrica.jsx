import React, { useEffect, useState } from 'react';
import { Activity, MapPin, Radio, Satellite, Sun, Zap } from 'lucide-react';
import { AFRICAN_REGIONS, AFRICAN_SATELLITES_AT_RISK, AFRICAN_MONITORING_CENTRES } from '../data/africaSpaceWeatherData.js';
import AfricaIonosphereMap from './AfricaIonosphereMap.jsx';
import { fetchAfricaSpaceWeather, fetchLiveKp, fetchSolarActivity, getDemoSolarActivity } from '../services/spaceWeatherApi.js';
import '../styles/space-weather.css';

const ZIMBABWE_TZ_LABEL = 'CAT (UTC+2)';

function formatZimbabweTime(date) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Harare',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

function formatZimbabweDateTime(date) {
  return `${new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Harare',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)} ${ZIMBABWE_TZ_LABEL}`;
}

function getKpStatus(kp) {
  if (kp < 2) return { label: 'Quiet', level: 0, color: '#22c55e', glow: 'rgba(34,197,94,0.45)', bg: 'rgba(34,197,94,0.1)' };
  if (kp < 4) return { label: 'Unsettled', level: 1, color: '#22d3ee', glow: 'rgba(34,211,238,0.45)', bg: 'rgba(34,211,238,0.1)' };
  if (kp < 5) return { label: 'Active', level: 2, color: '#EF9F27', glow: 'rgba(239,159,39,0.45)', bg: 'rgba(239,159,39,0.1)' };
  if (kp < 6) return { label: 'Minor Storm', level: 3, color: '#f97316', glow: 'rgba(249,115,22,0.45)', bg: 'rgba(249,115,22,0.1)' };
  if (kp < 7) return { label: 'Moderate Storm', level: 4, color: '#ef4444', glow: 'rgba(239,68,68,0.45)', bg: 'rgba(239,68,68,0.1)' };
  return { label: 'Major Storm', level: 5, color: '#dc2626', glow: 'rgba(220,38,38,0.55)', bg: 'rgba(220,38,38,0.12)' };
}

function getImpacts(kp) {
  const s = kp < 2 ? 'low' : kp < 4 ? 'low' : kp < 5 ? 'medium' : 'high';
  return [
    { icon: '📡', sector: 'GNSS & Positioning', impact: kp < 2 ? 'Nominal accuracy. CORS networks operating optimally across Africa.' : kp < 4 ? 'Minor errors possible near the Equatorial Ionization Anomaly belt across equatorial Africa.' : kp < 5 ? 'Significant GNSS degradation across Central, East, and West Africa. CORS and RTK users should verify fixes.' : 'Severe GNSS disruptions continent-wide. Position errors >10m.', severity: s },
    { icon: '📐', sector: 'Surveying', impact: kp < 2 ? 'Cadastral and construction surveys within spec. Static GNSS and CORS baselines stable.' : kp < 4 ? 'Minor baseline drift possible on long lines near the geomagnetic equator.' : kp < 5 ? 'RTK and static surveys degraded in equatorial Africa.' : 'Survey-grade GNSS unreliable continent-wide.', severity: kp < 5 ? (kp < 4 ? 'low' : 'medium') : 'high' },
    { icon: '🗺️', sector: 'Precision Mapping', impact: kp < 2 ? 'Drone and mobile mapping missions nominal.' : kp < 4 ? 'Post-sunset scintillation may affect low-latitude drone RTK.' : kp < 5 ? 'GCP and PPK/RTK solutions at risk over equatorial belts.' : 'Precision mapping halted recommended across affected regions.', severity: kp < 5 ? (kp < 4 ? 'low' : 'medium') : 'high' },
    { icon: '✈️', sector: 'Aviation Navigation', impact: kp < 2 ? 'Standard conditions. No ionospheric impact on African flight routes.' : kp < 4 ? 'Minor accuracy reduction on equatorial routes.' : kp < 5 ? 'GNSS approaches degraded across African airspace.' : 'GNSS unreliable for precision approaches.', severity: s },
    { icon: '📻', sector: 'HF Radio Communications', impact: kp < 2 ? 'Excellent propagation across Africa.' : kp < 4 ? 'Occasional fading on trans-equatorial HF paths.' : kp < 5 ? 'HF disruptions across Central and East Africa.' : 'Near-total HF blackout across Africa.', severity: s },
    { icon: '🛰️', sector: 'Satellite Operations', impact: kp < 2 ? 'All African satellites operating nominally.' : kp < 4 ? 'Minor signal scintillation on equatorial links.' : kp < 5 ? 'Increased atmospheric drag in LEO. African EO satellites may require orbit corrections.' : 'Major drag increase. Communication blackouts possible.', severity: s },
    { icon: '⚡', sector: 'Power Infrastructure', impact: kp < 2 ? 'No induced currents detected. Power grids operating normally.' : kp < 4 ? 'Weak GIC signals in long transmission lines. South African grid monitoring active.' : kp < 5 ? 'Moderate geomagnetically induced currents in Southern African power networks.' : 'Strong GIC risk threatening transformer damage.', severity: s },
    { icon: '🌍', sector: 'Earth Observation', impact: kp < 2 ? 'Clear atmospheric conditions for EO satellites. Optimal data quality.' : kp < 4 ? 'Minor ionospheric distortion affecting radar and optical EO data.' : kp < 5 ? 'Ionospheric disturbances degrading SAR and optical imagery over equatorial Africa.' : 'Severe scintillation disrupting all EO operations.', severity: s },
  ];
}

function getGlobalImpacts(kp) {
  const s = kp < 2 ? 'low' : kp < 4 ? 'low' : kp < 5 ? 'medium' : 'high';
  return [
    { icon: 'NA', sector: 'North America', impact: kp < 2 ? 'GNSS, aviation, and grid operations nominal across the United States, Canada, and Mexico.' : kp < 4 ? 'Northern Canada and Alaska may see auroral HF effects; mid-latitude GNSS remains stable.' : kp < 5 ? 'Northern power grids and aviation routes should monitor HF and GNSS reliability.' : 'High-latitude grids, aviation, and satellite links face elevated storm risk.', severity: s },
    { icon: 'EU', sector: 'Europe', impact: kp < 2 ? 'European GNSS and aviation operations remain nominal.' : kp < 4 ? 'Scandinavia and northern Europe may see weak auroral HF disruption.' : kp < 5 ? 'Northern Europe should monitor GNSS integrity and power-grid GIC exposure.' : 'Auroral-zone operations face degraded HF, GNSS, and grid reliability.', severity: s },
    { icon: 'AP', sector: 'Asia-Pacific', impact: kp < 2 ? 'Asia-Pacific satellite, aviation, and GNSS services are stable.' : kp < 4 ? 'Minor GNSS scintillation possible across low-latitude and island corridors.' : kp < 5 ? 'Equatorial Asia and Pacific routes may see GNSS and HF degradation.' : 'Satellite links, aviation routes, and GNSS positioning require active monitoring.', severity: s },
    { icon: 'AF', sector: 'Africa & Equatorial Belt', impact: kp < 2 ? 'African CORS and equatorial GNSS services remain quiet.' : kp < 4 ? 'Equatorial ionospheric scintillation may affect CORS, RTK, and drone mapping.' : kp < 5 ? 'Central, East, and West Africa should verify GNSS fixes and CORS corrections.' : 'Severe scintillation can disrupt precision positioning and HF links.', severity: s },
    { icon: 'SA', sector: 'South America', impact: kp < 2 ? 'South American GNSS and satellite operations are nominal.' : kp < 4 ? 'Brazil and equatorial corridors may see minor evening scintillation.' : kp < 5 ? 'Low-latitude GNSS and aviation users should monitor ionospheric corrections.' : 'Equatorial scintillation and HF disruption risk increases sharply.', severity: s },
    { icon: 'POL', sector: 'Polar Regions', impact: kp < 2 ? 'Polar aviation and research communications are quiet.' : kp < 4 ? 'Auroral radio effects possible near Arctic and Antarctic routes.' : kp < 5 ? 'Polar HF radio and satellite links may degrade during active intervals.' : 'Polar routes face the highest HF blackout and satellite communication risk.', severity: s },
  ];
}

function getAlerts(kp, scope = 'africa') {
  const now = new Date();
  const t = (m) => { const d = new Date(now.getTime() - m * 60000); return `${formatZimbabweTime(d)} ${ZIMBABWE_TZ_LABEL}`; };
  if (scope === 'world') {
    if (kp < 2) return [
      { msg: 'Planetary Kp is quiet - global geomagnetic conditions are nominal', color: '#22c55e', time: t(0) },
      { msg: 'GNSS positioning stable across major world regions', color: '#22c55e', time: t(18) },
      { msg: 'Satellite communications and aviation navigation operating normally', color: '#22c55e', time: t(35) },
    ];
    const globalList = [];
    if (kp >= 2) globalList.push({ msg: 'Unsettled geomagnetic activity - polar HF radio watch in effect', color: '#22d3ee', time: t(4) });
    if (kp >= 3) globalList.push({ msg: 'GNSS accuracy watch for equatorial and auroral regions', color: '#EF9F27', time: t(9) });
    if (kp >= 4) globalList.push({ msg: 'Aviation and satellite operators should monitor high-latitude routes', color: '#f97316', time: t(14) });
    if (kp >= 5) globalList.push({ msg: 'Global geomagnetic storm - satellite drag and HF disruption risk elevated', color: '#ef4444', time: t(3) });
    if (kp >= 6) globalList.push({ msg: 'Severe storm watch - power-grid GIC risk in northern regions', color: '#dc2626', time: t(1) });
    return globalList;
  }
  if (kp < 2) return [
    { msg: 'All systems nominal — quiet geomagnetic conditions over Africa', color: '#22c55e', time: t(0) },
    { msg: 'GNSS positioning accuracy optimal across the continent', color: '#22c55e', time: t(18) },
    { msg: 'Satellite communications operating at full capacity', color: '#22c55e', time: t(35) },
  ];
  const list = [];
  if (kp >= 2) list.push({ msg: 'Equatorial Ionization Anomaly active over Central Africa', color: '#22d3ee', time: t(4) });
  if (kp >= 3) list.push({ msg: 'GNSS accuracy degradation detected across equatorial Africa', color: '#EF9F27', time: t(9) });
  if (kp >= 4) list.push({ msg: 'HF radio disruptions reported across the Sahel and East Africa', color: '#f97316', time: t(14) });
  if (kp >= 5) list.push({ msg: 'Solar particle flux elevated — increased satellite drag risk', color: '#ef4444', time: t(3) });
  if (kp >= 6) list.push({ msg: 'Geomagnetic storm — power grid risk across Southern Africa', color: '#dc2626', time: t(1) });
  return list;
}

const SEV_COLOR = { low: '#22c55e', medium: '#EF9F27', high: '#ef4444' };
const cardShell = { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(34,211,238,0.14)', borderRadius: 16, padding: 20 };

function KpTrendChart({ history, status }) {
  const points = (history || []).slice(-48);
  if (points.length < 4) return null;
  const vals = points.map(p => parseFloat(p.kp_index ?? p.estimated_kp) || 0);
  const w = 280; const h = 56;
  const path = vals.map((v, i) => `${i === 0 ? 'M' : 'L'}${((i / (vals.length - 1)) * w).toFixed(1)},${(h - (v / 9) * h).toFixed(1)}`).join(' ');
  return (
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ fontSize: '0.58rem', color: '#6b7280', marginBottom: 6, fontWeight: 700 }}>Kp trend (last ~48 min)</div>
      <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ maxWidth: w, height: h, display: 'block' }}>
        <path d={path} fill="none" stroke={status.color} strokeWidth={2} strokeLinecap="round" />
      </svg>
    </div>
  );
}

function KpCard({ kp, status, loading, error, updated, history, apiMode }) {
  const barPct = Math.min((kp / 9) * 100, 100);
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${status.color}35`, borderRadius: 16, padding: 22 }}>
      <div style={{ fontSize: '0.63rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#6b7280', marginBottom: 14 }}>
        Global Kp Index · {apiMode === 'live' ? 'NOAA SWPC' : 'Demo model'}
      </div>
      {loading ? <div style={{ padding: '40px 0', textAlign: 'center', color: '#a0a8c0' }}>Fetching data…</div>
        : error ? <div style={{ padding: '40px 0', textAlign: 'center', color: '#ef4444' }}>API unavailable</div>
        : (<>
          <div style={{ textAlign: 'center', margin: '10px 0 14px', position: 'relative' }}>
            <div style={{ fontSize: '5rem', fontWeight: 900, color: status.color, lineHeight: 1, fontFamily: 'monospace' }}>{kp.toFixed(1)}</div>
            <div style={{ fontSize: '0.68rem', color: '#6b7280' }}>Planetary Kp Index</div>
          </div>
          <div style={{ textAlign: 'center', marginBottom: 18 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: status.bg, border: `1px solid ${status.color}50`, borderRadius: 20, padding: '5px 16px', fontSize: '0.8rem', fontWeight: 800, color: status.color }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: status.color, animation: 'swPulse 1.5s infinite' }} />
              {status.label}
            </span>
          </div>
          <div style={{ height: 7, borderRadius: 4, background: 'rgba(255,255,255,0.07)', overflow: 'hidden', marginBottom: 8 }}>
            <div style={{ height: '100%', width: `${barPct}%`, background: 'linear-gradient(to right,#22c55e,#22d3ee,#EF9F27,#f97316,#ef4444)', borderRadius: 4, transition: 'width 1.2s' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.58rem', color: '#374151' }}>{[0,1,2,3,4,5,6,7,8,9].map(n => <span key={n}>{n}</span>)}</div>
          {updated && <div style={{ fontSize: '0.6rem', color: '#374151', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 10, marginTop: 12 }}>Updated {formatZimbabweTime(updated)} {ZIMBABWE_TZ_LABEL} - auto-refresh 60s</div>}
          <KpTrendChart history={history} status={status} />
        </>)}
    </div>
  );
}

function SolarSparkline({ values, color = '#22d3ee' }) {
  const points = (values || []).filter(v => Number.isFinite(v));
  if (points.length < 2) return <div style={{ color: '#64748b', fontSize: '0.74rem' }}>Awaiting GOES X-ray flux data</div>;
  const w = 320;
  const h = 76;
  const logs = points.map(v => Math.log10(Math.max(v, 1e-9)));
  const min = Math.min(...logs);
  const max = Math.max(...logs);
  const range = max - min || 1;
  const path = logs.map((v, i) => `${i === 0 ? 'M' : 'L'}${((i / (logs.length - 1)) * w).toFixed(1)},${(h - ((v - min) / range) * h).toFixed(1)}`).join(' ');
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ height: 96, display: 'block' }}>
      {[0, 1, 2].map(i => <line key={i} x1="0" x2={w} y1={(i / 2) * h} y2={(i / 2) * h} stroke="rgba(255,255,255,0.06)" />)}
      <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

// ── Enhanced Solar Monitor data ──
const ACTIVE_REGIONS_DEMO = [
  { id: 'AR 3681', cls: 'Beta-Gamma', mag: 'BGD', spots: 42 },
  { id: 'AR 3683', cls: 'Beta-Gamma', mag: 'BGD', spots: 31 },
  { id: 'AR 3680', cls: 'Beta',       mag: 'B',   spots: 18 },
  { id: 'AR 3679', cls: 'Alpha',      mag: 'A',   spots: 12 },
  { id: 'AR 3678', cls: 'Beta',       mag: 'B',   spots:  9 },
];
const AR_POSITIONS = [
  { x: 36, y: 31 }, { x: 57, y: 26 }, { x: 44, y: 50 }, { x: 63, y: 47 }, { x: 51, y: 65 },
];
const RADIO_BURSTS_DEMO = [
  { time: '24 May 11:42', type: 'Type II',  freq: '150 MHz', intensity: 'Strong',   loc: 'N20W32' },
  { time: '24 May 10:21', type: 'Type III', freq: '245 MHz', intensity: 'Moderate', loc: 'S14E45' },
  { time: '24 May 08:15', type: 'Type III', freq: '410 MHz', intensity: 'Weak',     loc: 'N18W12' },
  { time: '24 May 07:33', type: 'Type II',  freq: '200 MHz', intensity: 'Moderate', loc: 'N20W32' },
  { time: '24 May 06:05', type: 'Type III', freq: '610 MHz', intensity: 'Weak',     loc: 'S16E20' },
];
const CME_TABLE_DEMO = [
  { date: '24 May 10:15', speed: 890, width: '68°', halo: 'Yes',     impact: 'Possible' },
  { date: '24 May 02:48', speed: 620, width: '38°', halo: 'No',      impact: 'Unlikely' },
  { date: '23 May 21:36', speed: 510, width: '25°', halo: 'No',      impact: 'Unlikely' },
  { date: '23 May 14:12', speed: 710, width: '54°', halo: 'Partial', impact: 'Possible' },
  { date: '23 May 03:05', speed: 480, width: '32°', halo: 'No',      impact: 'Unlikely' },
];

function intensityColor(v) {
  if (v === 'Strong') return '#ef4444';
  if (v === 'Moderate') return '#eab308';
  return '#64748b';
}

function XRayFluxChart({ values }) {
  const [range, setRange] = useState('24H');
  const W = 360; const H = 82;
  const pts = (values || []).filter(v => Number.isFinite(v));
  const MIN_LOG = -9; const MAX_LOG = -3; const RNG = MAX_LOG - MIN_LOG;

  const BANDS = [
    { color: '#ef4444', shift: 0,   label: '0.1 – 0.8 nm' },
    { color: '#f97316', shift: 0.8, label: '0.05 – 0.4 nm' },
    { color: '#eab308', shift: 1.6, label: '0.025 – 0.05 nm' },
    { color: '#22c55e', shift: 2.4, label: '0.012 – 0.025 nm' },
  ];

  const makePath = (arr, shift) => {
    const logs = arr.map(v => Math.min(Math.log10(Math.max(v, 1e-9)) + shift, MAX_LOG));
    return logs.map((v, i) => {
      const x = (i / (logs.length - 1)) * W;
      const y = Math.max(0, H - ((v - MIN_LOG) / RNG) * H);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  };

  const xLabels = range === '7D'
    ? ['18 May','19 May','20 May','21 May','22 May','23 May','24 May']
    : range === '6H'
    ? ['08:00','09:00','10:00','11:00','12:00','13:00','14:00 UTC']
    : ['12:00','16:00','20:00','24 May','04:00','08:00','12:00 UTC'];

  return (
    <div>
      <div className="sw-enh-time-btns">
        {['6H','24H','7D'].map(r => (
          <button key={r} type="button" className={`sw-enh-time-btn${range === r ? ' active' : ''}`} onClick={() => setRange(r)}>{r}</button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        <div className="sw-enh-y-axis">
          {['10⁻³','10⁻⁴','10⁻⁵','10⁻⁶','10⁻⁷'].map(l => <span key={l}>{l}</span>)}
        </div>
        <div style={{ flex: 1 }}>
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H, display: 'block' }}>
            {[0,1,2,3,4].map(i => <line key={i} x1="0" x2={W} y1={(i/4)*H} y2={(i/4)*H} stroke="rgba(255,255,255,0.07)" />)}
            {pts.length > 1 && BANDS.map(b => (
              <path key={b.color} d={makePath(pts, b.shift)} fill="none" stroke={b.color} strokeWidth="1.5" strokeLinecap="round" />
            ))}
            {pts.length < 2 && <text x={W/2} y={H/2} textAnchor="middle" fill="#475569" fontSize="11">Awaiting GOES data</text>}
          </svg>
          <div className="sw-enh-x-labels">{xLabels.map((l,i) => <span key={i}>{l}</span>)}</div>
        </div>
      </div>
      <div className="sw-enh-legend">
        {BANDS.map(b => <span key={b.color}><i style={{ background: b.color }} />{b.label}</span>)}
      </div>
    </div>
  );
}

function ActiveRegionsSun({ regions }) {
  return (
    <div className="sw-enh-sun-wrap">
      <div className="sw-enh-sun">
        {regions.slice(0, AR_POSITIONS.length).map((r, i) => {
          const pos = AR_POSITIONS[i];
          return (
            <div key={r.id} className="sw-enh-ar-marker" style={{ left: `${pos.x}%`, top: `${pos.y}%` }}>
              <div className="sw-enh-ar-circle" />
              <span className="sw-enh-ar-label">{r.id}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EuvChart() {
  const W = 340; const H = 72;
  const pts = Array.from({ length: 42 }, (_, i) =>
    0.55 + Math.sin(i / 5) * 0.32 + Math.max(0, Math.sin(i / 2.5) * 0.22) + (i > 30 ? (i - 30) * 0.04 : 0)
  );
  const min = Math.min(...pts); const max = Math.max(...pts); const rng = max - min || 1;
  const path = pts.map((v, i) => `${i === 0 ? 'M' : 'L'}${((i / (pts.length - 1)) * W).toFixed(1)},${(H - ((v - min) / rng) * H).toFixed(1)}`).join(' ');
  const days = ['18 May','19 May','20 May','21 May','22 May','23 May','24 May'];
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H, display: 'block' }}>
        <defs>
          <linearGradient id="euvGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0,1,2].map(i => <line key={i} x1="0" x2={W} y1={(i/2)*H} y2={(i/2)*H} stroke="rgba(255,255,255,0.07)" />)}
        <path d={`${path} L${W},${H} L0,${H} Z`} fill="url(#euvGrad)" />
        <path d={path} fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <div className="sw-enh-x-labels">{days.map(d => <span key={d}>{d}</span>)}</div>
    </div>
  );
}

function SolarCycleChart() {
  const W = 340; const H = 80;
  const pts = Array.from({ length: 73 }, (_, i) => {
    const t = i / 72;
    return Math.max(0, 190 * Math.sin(Math.PI * t * 1.08) * (0.65 + t * 0.35) + Math.sin(i * 0.9) * 12);
  });
  const max = Math.max(...pts);
  const path = pts.map((v, i) => `${i === 0 ? 'M' : 'L'}${((i / (pts.length - 1)) * W).toFixed(1)},${(H - (v / max) * H).toFixed(1)}`).join(' ');
  const years = ['2020','2021','2022','2023','2024','2025','2026'];
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H, display: 'block' }}>
        <defs>
          <linearGradient id="scGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0,1,2].map(i => <line key={i} x1="0" x2={W} y1={(i/2)*H} y2={(i/2)*H} stroke="rgba(255,255,255,0.07)" />)}
        <path d={`${path} L${W},${H} L0,${H} Z`} fill="url(#scGrad)" />
        <path d={path} fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" />
        {/* Y-axis labels */}
        <text x="4" y="14" fill="rgba(255,255,255,0.25)" fontSize="9">300</text>
        <text x="4" y={H/2+4} fill="rgba(255,255,255,0.25)" fontSize="9">100</text>
        <text x="4" y={H-4} fill="rgba(255,255,255,0.25)" fontSize="9">0</text>
      </svg>
      <div className="sw-enh-x-labels">{years.map(y => <span key={y}>{y}</span>)}</div>
    </div>
  );
}

function SolarActivityMonitor() {
  const [solar, setSolar] = useState(() => getDemoSolarActivity());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const data = await fetchSolarActivity();
        if (alive) setSolar(data);
      } catch {
        if (alive) setSolar(getDemoSolarActivity());
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    const id = setInterval(load, 10 * 60 * 1000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const level = solar.level;
  const wind = solar.solarWind || {};
  const updated = solar.updated ? new Date(solar.updated) : null;
  const flareValue = solar.flareClass || 'A0.0';
  const latestAlert = solar.alerts?.[0];
  const donki = solar.donki || { flares: [], cmes: [], storms: [], dateRange: {} };
  const latestFlare = donki.flares?.[0];
  const latestCme = donki.cmes?.[0];
  const latestStorm = donki.storms?.[0];
  const impacts = [
    ['GNSS / CORS', level.gnss],
    ['HF Radio', level.label === 'Low' ? 'Nominal' : 'Monitor outages'],
    ['Satellites', wind.speed > 600 ? 'Drag watch' : 'Routine operations'],
    ['Power Grids', wind.bz < -5 ? 'GIC watch' : 'Minimal GIC risk'],
  ];

  return (
    <section className="sw-solar-monitor">
      <div className="sw-solar-head">
        <div>
          <div className="sw-solar-kicker"><Sun size={16} /> Solar Activity Monitor</div>
          <h3>Real-time solar conditions for GNSS, satellites and CORS networks</h3>
        </div>
        <div className="sw-solar-meta">
          <span style={{ color: level.color }}><span className="sw-solar-live-dot" style={{ background: level.color }} />{solar.mode === 'live' ? 'Live Data' : 'Demo fallback'}</span>
          <span>NOAA SWPC</span>
          <span>{updated ? formatZimbabweDateTime(updated) : 'Updating...'}</span>
        </div>
      </div>

      <div className="sw-solar-grid">
        <article className="sw-solar-card sw-solar-summary">
          <div className="sw-solar-card-title">Solar Activity Summary</div>
          <div className="sw-solar-orb" style={{ '--solar': level.color }} />
          <div className="sw-solar-summary-copy">
            <span>Solar Activity</span>
            <strong style={{ color: level.color }}>{level.label}</strong>
            <span>Current Flare</span>
            <strong>{flareValue}</strong>
            <span>SWPC Alerts</span>
            <strong>{solar.alerts?.length || 0}</strong>
          </div>
        </article>

        <article className="sw-solar-card">
          <div className="sw-solar-card-title">Solar Flare (GOES X-ray)</div>
          <div className="sw-solar-flare" style={{ color: level.color }}>{flareValue}</div>
          <p>Peak class from GOES primary X-ray flux. C-class and above can affect HF radio and GNSS users.</p>
          <div className="sw-solar-scale">
            {['A', 'B', 'C', 'M', 'X'].map(cls => <span key={cls} className={flareValue.startsWith(cls) ? 'active' : ''}>{cls}-Class</span>)}
          </div>
        </article>

        <article className="sw-solar-card sw-solar-wide">
          <div className="sw-solar-card-title">GOES X-ray Flux - Last Day</div>
          <SolarSparkline values={solar.xraySeries} color={level.color} />
        </article>

        <article className="sw-solar-card">
          <div className="sw-solar-card-title">Solar Wind</div>
          <div className="sw-solar-metric"><span>Speed</span><strong>{Math.round(wind.speed || 0)} km/s</strong></div>
          <div className="sw-solar-metric"><span>Density</span><strong>{(wind.density || 0).toFixed(1)} p/cm3</strong></div>
          <div className="sw-solar-metric"><span>Proton Temp.</span><strong>{Math.round(wind.temperature || 0).toLocaleString()} K</strong></div>
          <div className="sw-solar-metric"><span>IMF Bz</span><strong style={{ color: wind.bz < 0 ? '#f97316' : '#22c55e' }}>{(wind.bz || 0).toFixed(1)} nT</strong></div>
          <div className="sw-solar-metric"><span>IMF Bt</span><strong>{(wind.bt || 0).toFixed(1)} nT</strong></div>
        </article>

        <article className="sw-solar-card">
          <div className="sw-solar-card-title">Alerts / Watches / Warnings</div>
          <p>{latestAlert?.message || latestAlert?.product_id || 'No current NOAA SWPC alert message available.'}</p>
          <div className="sw-solar-source">Source: NOAA SWPC alerts.json</div>
        </article>

        <article className="sw-solar-card">
          <div className="sw-solar-card-title">Solar Flares</div>
          <div className="sw-solar-flare-count">{donki.flares?.length || 0}</div>
          <p>{latestFlare ? `${latestFlare.classType || 'Unclassified'} flare from ${latestFlare.sourceLocation || 'unknown region'}` : 'No flare events in the selected 7-day window.'}</p>
          <div className="sw-solar-source">FLR: {donki.dateRange?.start} to {donki.dateRange?.end}</div>
        </article>

        <article className="sw-solar-card">
          <div className="sw-solar-card-title">CORONAL MASS EJECTIONS</div>
          <div className="sw-solar-flare-count">{donki.cmes?.length || 0}</div>
          <p>{latestCme ? `${latestCme.activityID || 'CME event'} detected ${latestCme.startTime ? formatZimbabweDateTime(new Date(latestCme.startTime)) : 'recently'}` : 'No CME events in the selected 7-day window.'}</p>
          <div className="sw-solar-source">CME event history</div>
        </article>

        <article className="sw-solar-card">
          <div className="sw-solar-card-title">Geomagnetic Storms</div>
          <div className="sw-solar-flare-count">{donki.storms?.length || 0}</div>
          <p>{latestStorm ? `${latestStorm.gstID || 'GST event'} recorded ${latestStorm.startTime ? formatZimbabweDateTime(new Date(latestStorm.startTime)) : 'recently'}` : 'No geomagnetic storm events in the selected 7-day window.'}</p>
          <div className="sw-solar-source">GST event history</div>
        </article>

        <article className="sw-solar-card sw-solar-wide">
          <div className="sw-solar-card-title">Impact on GNSS & CORS Networks</div>
          <div className="sw-solar-impact-grid">
            {impacts.map(([label, value], index) => {
              const Icon = [Satellite, Radio, Activity, Zap][index];
              return (
                <div key={label} className="sw-solar-impact">
                  <Icon size={15} color={level.color} />
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              );
            })}
          </div>
        </article>
      </div>

      {/* ── Enhanced 2-row panel grid ── */}
      <div className="sw-enh-grid">

        {/* Row 1 — X-Ray Flux */}
        <article className="sw-enh-panel">
          <div className="sw-enh-panel-title">Solar X-Ray Flux (GOES-16)</div>
          <XRayFluxChart values={solar.xraySeries} />
        </article>

        {/* Row 1 — Active Regions */}
        <article className="sw-enh-panel">
          <div className="sw-enh-panel-title">Active Regions</div>
          <div className="sw-enh-ar-layout">
            <ActiveRegionsSun regions={ACTIVE_REGIONS_DEMO} />
            <div>
              <table className="sw-enh-table">
                <thead>
                  <tr><th>Region</th><th>Class</th><th>Mag.Type</th><th>Spots</th></tr>
                </thead>
                <tbody>
                  {ACTIVE_REGIONS_DEMO.map(r => (
                    <tr key={r.id}>
                      <td>{r.id}</td><td>{r.cls}</td><td>{r.mag}</td><td>{r.spots}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <a href="#" className="sw-enh-view-all">View All Regions →</a>
            </div>
          </div>
        </article>

        {/* Row 1 — CME Table */}
        <article className="sw-enh-panel">
          <div className="sw-enh-panel-title">Coronal Mass Ejections (CME)</div>
          <table className="sw-enh-table">
            <thead>
              <tr><th>Date (UTC)</th><th>Speed (km/s)</th><th>Width</th><th>Halo</th><th>Impact</th></tr>
            </thead>
            <tbody>
              {CME_TABLE_DEMO.map((c, i) => (
                <tr key={i}>
                  <td>{c.date}</td>
                  <td>{c.speed}</td>
                  <td>{c.width}</td>
                  <td style={{ color: c.halo === 'Yes' ? '#22c55e' : c.halo === 'Partial' ? '#eab308' : '#94a3b8' }}>{c.halo}</td>
                  <td style={{ color: c.impact === 'Possible' ? '#22c55e' : '#94a3b8', fontWeight: 900 }}>{c.impact}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <a href="#" className="sw-enh-view-all">View All CMEs →</a>
        </article>

        {/* Row 2 — EUV Irradiance */}
        <article className="sw-enh-panel">
          <div className="sw-enh-panel-hdr">
            <span className="sw-enh-panel-title">Solar EUV Irradiance (EVE)</span>
            <select className="sw-enh-select">
              <option>Ly-α  0.1 – 7.0 nm</option>
              <option>0.1 – 50 nm</option>
            </select>
          </div>
          <div style={{ color: '#475569', fontSize: '0.56rem', fontWeight: 700, marginBottom: 4 }}>mW/m²</div>
          <EuvChart />
        </article>

        {/* Row 2 — Radio Bursts */}
        <article className="sw-enh-panel">
          <div className="sw-enh-panel-title">Solar Radio Bursts (Last 24H)</div>
          <table className="sw-enh-table">
            <thead>
              <tr><th>Time (UTC)</th><th>Type</th><th>Frequency</th><th>Intensity</th><th>Location</th></tr>
            </thead>
            <tbody>
              {RADIO_BURSTS_DEMO.map((b, i) => (
                <tr key={i}>
                  <td>{b.time}</td>
                  <td>{b.type}</td>
                  <td>{b.freq}</td>
                  <td style={{ color: intensityColor(b.intensity), fontWeight: 900 }}>{b.intensity}</td>
                  <td>{b.loc}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <a href="#" className="sw-enh-view-all">View All Radio Bursts →</a>
        </article>

        {/* Row 2 — Solar Cycle Progress */}
        <article className="sw-enh-panel">
          <div className="sw-enh-panel-title">Solar Cycle Progress</div>
          <div className="sw-enh-cycle-header">
            <div>
              <div className="sw-enh-sub-label">Solar Cycle</div>
              <div className="sw-enh-cycle-num">25</div>
            </div>
            <div>
              <div className="sw-enh-sub-label">Cycle Progress</div>
              <div className="sw-enh-cycle-pct">65%</div>
              <div className="sw-enh-cycle-bar"><div className="sw-enh-cycle-fill" style={{ width: '65%' }} /></div>
            </div>
          </div>
          <div className="sw-enh-sub-label" style={{ margin: '8px 0 2px' }}>Estimated Peak</div>
          <div style={{ color: '#94a3b8', fontSize: '0.7rem', fontWeight: 700, marginBottom: 8 }}>Jul 2025 – Oct 2025</div>
          <SolarCycleChart />
        </article>

      </div>

      {loading && <div className="sw-solar-loading">Refreshing NOAA SWPC solar feeds...</div>}
    </section>
  );
}

function AlertsPanel({ alerts, regionId }) {
  const region = AFRICAN_REGIONS.find(r => r.id === regionId);
  const isWorld = regionId === 'world';
  const primary = alerts[0] || { msg: 'No active alerts', color: '#22c55e', time: `--:-- ${ZIMBABWE_TZ_LABEL}` };
  const secondary = alerts.slice(1);
  const allQuiet = alerts.every(a => a.color === '#22c55e');
  return (
    <div style={{ background: 'linear-gradient(135deg,rgba(15,23,42,0.86),rgba(8,12,36,0.94))', border: '1px solid rgba(34,211,238,0.16)', borderRadius: 16, padding: 16, minHeight: 300 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: allQuiet ? '#22c55e' : '#EF9F27', animation: 'swPulse 1.5s infinite' }} />
        <div style={{ fontSize: '0.63rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#8b95ad' }}>{isWorld ? 'Global Space Weather Alerts' : 'Africa Space Weather Alerts'}</div>
        <span style={{ marginLeft: 'auto', fontSize: '0.58rem', fontWeight: 800, color: '#22d3ee', background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.22)', borderRadius: 999, padding: '4px 10px' }}>LIVE FEED</span>
      </div>
      <div className="sw-alert-layout" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 176px', gap: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 12, padding: '14px 16px', background: `${primary.color}10`, border: `1px solid ${primary.color}36`, borderRadius: 12 }}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: primary.color, flexShrink: 0, marginTop: 5 }} />
            <div>
              <div style={{ fontSize: '0.58rem', color: primary.color, fontWeight: 800, textTransform: 'uppercase', marginBottom: 5 }}>Current condition</div>
              <p style={{ margin: 0, fontSize: '0.86rem', color: '#f0f6ff', lineHeight: 1.45 }}>{primary.msg}</p>
              <span style={{ fontSize: '0.6rem', color: '#667085', fontFamily: 'monospace', marginTop: 8, display: 'block' }}>{primary.time}</span>
            </div>
          </div>
          <div className="sw-alert-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 10 }}>
            {secondary.map((a, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, padding: '11px 12px', background: 'rgba(15,23,42,0.58)', border: `1px solid ${a.color}28`, borderRadius: 11 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: a.color, flexShrink: 0, marginTop: 5 }} />
                <div><p style={{ margin: 0, fontSize: '0.74rem', color: '#d1d5db', lineHeight: 1.45 }}>{a.msg}</p><span style={{ fontSize: '0.58rem', color: '#4b5563', fontFamily: 'monospace' }}>{a.time}</span></div>
              </div>
            ))}
          </div>
        </div>
        <div className="sw-alert-rail" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[['Status', allQuiet ? 'Stable operations' : 'Watch conditions', allQuiet ? '#22c55e' : '#EF9F27'], ['Coverage', region?.label || 'Pan-African', '#22d3ee'], [isWorld ? 'Global source' : 'African hub', isWorld ? 'NOAA SWPC global network' : 'SANSA + ZINGSA CORS', '#22c55e'], ['Source', 'NOAA SWPC + API', '#7F77DD']].map(([label, value, color]) => (
            <div key={label} style={{ background: `${color}0d`, border: `1px solid ${color}26`, borderRadius: 11, padding: '10px 11px' }}>
              <div style={{ fontSize: '0.56rem', color: '#697386', fontWeight: 800, textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
              <strong style={{ color, fontSize: '0.78rem' }}>{value}</strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ImpactPanel({ impacts, status, title = 'Africa Impact Analysis' }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(127,119,221,0.18)', borderRadius: 16, padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ fontSize: '0.63rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#6b7280' }}>{title}</div>
        <span style={{ marginLeft: 'auto', fontSize: '0.68rem', color: status.color, fontWeight: 700, background: status.bg, padding: '3px 12px', borderRadius: 20, border: `1px solid ${status.color}40` }}>{status.label} Conditions</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(250px,1fr))', gap: 10 }}>
        {impacts.map((item, i) => (
          <div key={i} style={{ background: 'rgba(255,255,255,0.025)', border: `1px solid ${SEV_COLOR[item.severity]}25`, borderRadius: 12, padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
              <strong style={{ fontSize: '0.8rem', color: '#e2e8f0', flex: 1 }}>{item.sector}</strong>
              <span style={{ fontSize: '0.58rem', fontWeight: 700, color: SEV_COLOR[item.severity], background: `${SEV_COLOR[item.severity]}18`, padding: '2px 7px', borderRadius: 8, textTransform: 'uppercase' }}>{item.severity}</span>
            </div>
            <p style={{ margin: 0, fontSize: '0.74rem', color: '#a0a8c0', lineHeight: 1.55 }}>{item.impact}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function RegionSelector({ regionId, onChange }) {
  const isWorld = regionId === 'world';
  return (
    <div style={{ ...cardShell, marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}><MapPin size={14} color="#22d3ee" /><span style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#22d3ee' }}>{isWorld ? 'Global region focus' : 'African region focus'}</span></div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {AFRICAN_REGIONS.map(r => (
          <button key={r.id} type="button" onClick={() => onChange(r.id)} style={{ padding: '8px 14px', borderRadius: 999, cursor: 'pointer', fontSize: '0.74rem', fontWeight: 700, background: regionId === r.id ? 'rgba(34,211,238,0.14)' : 'rgba(0,0,0,0.25)', border: `1px solid ${regionId === r.id ? 'rgba(34,211,238,0.45)' : 'rgba(255,255,255,0.08)'}`, color: regionId === r.id ? '#22d3ee' : '#94a3b8' }}>{r.flag} {r.label}</button>
        ))}
      </div>
      <p style={{ margin: '12px 0 0', fontSize: '0.76rem', color: '#a0a8c0', lineHeight: 1.55 }}>{AFRICAN_REGIONS.find(r => r.id === regionId)?.eiaNote}</p>
    </div>
  );
}

function EiaExplainerCard({ regionId }) {
  const region = AFRICAN_REGIONS.find(r => r.id === regionId) || AFRICAN_REGIONS[0];
  return (
    <div style={{ ...cardShell, borderColor: 'rgba(34,211,238,0.22)', background: 'linear-gradient(135deg,rgba(34,211,238,0.06),rgba(8,12,36,0.5))' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}><Sun size={16} color="#EF9F27" /><strong style={{ color: '#e2e8f0', fontSize: '0.88rem' }}>Equatorial Ionization Anomaly (EIA)</strong></div>
      <p style={{ margin: '0 0 10px', fontSize: '0.78rem', color: '#cbd5e1', lineHeight: 1.6 }}>Solar UV ionizes the atmosphere. Over the geomagnetic equator (through Central Africa), plasma piles up into two dense <strong>crests</strong> north and south of the equator. This is why GPS in Kinshasa, Lagos, and Nairobi behaves worse than in Johannesburg or Cairo during the same Kp level.</p>
      <p style={{ margin: 0, fontSize: '0.74rem', color: '#94a3b8', lineHeight: 1.55 }}>{region.eiaNote}</p>
    </div>
  );
}

function MonitoringCentresPanel() {
  return (
    <div style={{ ...cardShell, marginBottom: 16 }}>
      <div style={{ fontSize: '0.63rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#6b7280', marginBottom: 14 }}>African monitoring centres</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 10 }}>
        {AFRICAN_MONITORING_CENTRES.map(c => (
          <div key={c.name} style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.025)', border: `1px solid ${c.color}28`, borderRadius: 12 }}>
            <strong style={{ fontSize: '0.78rem', color: '#e2e8f0' }}>{c.flag} {c.name}</strong>
            <p style={{ margin: '6px 0 0', fontSize: '0.72rem', color: '#94a3b8', lineHeight: 1.5 }}>{c.role}</p>
            {c.url && <a href={c.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.68rem', color: c.color, marginTop: 6, display: 'inline-block' }}>Visit →</a>}
          </div>
        ))}
      </div>
    </div>
  );
}

function SatellitesAtRiskPanel({ kp }) {
  const elevated = kp >= 4;
  return (
    <div style={{ ...cardShell, borderColor: 'rgba(239,159,39,0.2)', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}><Satellite size={14} color="#EF9F27" /><span style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#EF9F27' }}>African satellites &amp; missions</span>{elevated && <span style={{ marginLeft: 'auto', fontSize: '0.62rem', fontWeight: 800, color: '#ef4444', background: 'rgba(239,68,68,0.12)', padding: '3px 8px', borderRadius: 8 }}>Elevated risk</span>}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 8 }}>
        {AFRICAN_SATELLITES_AT_RISK.map(s => (
          <div key={s.name} style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.025)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)' }}>
            <strong style={{ fontSize: '0.78rem', color: '#e2e8f0' }}>{s.name}</strong>
            <span style={{ display: 'block', fontSize: '0.65rem', color: '#64748b', margin: '2px 0 6px' }}>{s.country} · {s.orbit}</span>
            <p style={{ margin: 0, fontSize: '0.7rem', color: elevated ? '#fca5a5' : '#94a3b8', lineHeight: 1.45 }}>{s.risk}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SpaceWeatherAfrica() {
  const [kp, setKp] = useState(1.0);
  const [kpHistory, setKpHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [updated, setUpdated] = useState(null);
  const [regionId, setRegionId] = useState('pan');
  const [apiMode, setApiMode] = useState('demo');

  const fetchKp = async () => {
    try {
      let data;
      try {
        data = await fetchAfricaSpaceWeather();
      } catch {
        data = await fetchLiveKp();
      }
      setKp(parseFloat(data.kp_index) || 1);
      setKpHistory(data.history || []);
      setApiMode(data.mode || 'live');
      setUpdated(new Date());
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKp();
    const id = setInterval(fetchKp, 60000);
    return () => clearInterval(id);
  }, []);

  const status = getKpStatus(kp);
  const regionMeta = AFRICAN_REGIONS.find(r => r.id === regionId) || AFRICAN_REGIONS[0];
  const isWorld = regionId === 'world';
  const impacts = isWorld ? getGlobalImpacts(kp) : getImpacts(kp);
  const alerts = getAlerts(kp, isWorld ? 'world' : 'africa');

  return (
    <div className="sw-page" style={{ padding: '24px', paddingBottom: 56, maxWidth: 1400, margin: '0 auto' }}>
      <style>{`@keyframes swPulse{0%,100%{opacity:1}50%{opacity:0.35}}`}</style>

      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.15em', color: '#22d3ee', textTransform: 'uppercase', background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.25)', borderRadius: 20, padding: '4px 14px', marginBottom: 12 }}>
          ZINGSA · LIVE IONOSPHERIC MONITOR
        </span>
        <h2 style={{ margin: '0 0 10px', fontSize: '1.65rem', fontWeight: 900, color: '#e2e8f0' }}>Space Weather <span style={{ color: '#22d3ee' }}>{isWorld ? 'Worldwide' : 'Over Africa'}</span></h2>
        <p style={{ margin: '0 auto', maxWidth: 640, fontSize: '0.85rem', color: '#a0a8c0', lineHeight: 1.7 }}>
          Real-time geomagnetic conditions from NOAA SWPC via <code style={{ color: '#22d3ee' }}>/api/space-weather/africa</code>, interpreted for {isWorld ? 'global' : 'African'} GNSS, satellites, aviation, power grids, and CORS networks.
        </p>
        <div style={{ display: 'none' }}>
          {['🇿🇦 SANSA', '🇳🇬 NASRDA', '🇿🇼 ZINGSA', '🇪🇬 NARSS', '🌍 African CORS'].map(tag => (
            <span key={tag} style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 999, padding: '4px 12px' }}>{tag}</span>
          ))}
        </div>
      </div>

      <RegionSelector regionId={regionId} onChange={setRegionId} />
      <SolarActivityMonitor />

      <div className="sw-top-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(260px,288px) minmax(0,1fr)', gap: 16, marginBottom: 16 }}>
        <KpCard kp={kp} status={status} loading={loading} error={error} updated={updated} history={kpHistory} apiMode={apiMode} />
        <AlertsPanel alerts={alerts} regionId={regionId} />
      </div>

      <div style={{ marginBottom: 16 }}>
        <AfricaIonosphereMap kp={kp} status={status} regionId={regionId} regionSummary={regionMeta.summary} />
      </div>

      <div style={{ marginBottom: 16 }}><EiaExplainerCard regionId={regionId} /></div>
      <ImpactPanel impacts={impacts} status={status} title={isWorld ? 'Global Impact Analysis' : 'Africa Impact Analysis'} />

      {/* ── Footer: GNSS impact + Activity levels ── */}
      <div className="sw-footer-bar">
        <div className="sw-footer-section">
          <div className="sw-footer-title">Impact on GNSS &amp; CORS Networks</div>
          <div className="sw-footer-impacts">
            {[
              { icon: Satellite, label: 'R1 RTK Accuracy',     value: status.level > 1 ? 'Moderate Impact' : 'Nominal',       color: status.level > 1 ? '#f97316' : '#22c55e' },
              { icon: Activity,  label: 'PPP Convergence',      value: status.level > 1 ? 'Slightly Slower' : 'Normal',        color: status.level > 1 ? '#f97316' : '#22c55e' },
              { icon: Waves,     label: 'Ionospheric Delay',    value: status.level > 1 ? 'Increased' : 'Nominal',             color: status.level > 1 ? '#f97316' : '#22c55e' },
              { icon: Zap,       label: 'Signal Scintillation', value: status.level > 2 ? 'Possible' : 'Low',                 color: status.level > 2 ? '#f97316' : '#22c55e' },
              { icon: Radio,     label: 'HF Communication',     value: status.level > 2 ? 'Degraded' : 'Excellent',           color: status.level > 2 ? '#ef4444' : '#22c55e' },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="sw-footer-impact-item">
                <Icon size={15} style={{ color, flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div className="sw-footer-impact-label">{label}</div>
                  <div className="sw-footer-impact-value" style={{ color }}>{value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="sw-footer-divider" />
        <div className="sw-footer-section">
          <div className="sw-footer-title">Solar Activity Levels</div>
          <div className="sw-footer-levels">
            {[
              { color: '#22c55e', label: 'Low',      sub: 'Minimal Impact' },
              { color: '#eab308', label: 'Moderate', sub: 'Minor Impact' },
              { color: '#f97316', label: 'High',     sub: 'Strong Impact' },
              { color: '#ef4444', label: 'Severe',   sub: 'Major Impact' },
              { color: '#a855f7', label: 'Extreme',  sub: 'Extreme Impact' },
            ].map(({ color, label, sub }) => (
              <div key={label} className="sw-footer-level-item">
                <span className="sw-footer-level-dot" style={{ background: color }} />
                <div>
                  <div style={{ color, fontSize: '0.68rem', fontWeight: 800 }}>{label}</div>
                  <div style={{ color: '#64748b', fontSize: '0.58rem' }}>{sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
