import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BookOpen, Calendar, Camera, Clock, Eye, Globe2, Moon, RefreshCw, Satellite, Settings, Star, Telescope, Zap } from 'lucide-react';
import '../styles/observatory-hub.css';

// ── Observatory location ──────────────────────────────────────────────────────
const OBS = {
  name:      'ZINGSA Mazowe Observatory',
  city:      'Harare, Zimbabwe',
  lat:       -17.83,
  lon:        31.05,
  altitude:  1480,
  timezone:  'CAT (UTC+2)',
};

// ── Mock data ─────────────────────────────────────────────────────────────────
const TONIGHT_TARGETS = [
  { id: 1, name: 'Large Magellanic Cloud', alt: 'LMC',       type: 'Galaxy',    const: 'Dorado',     ra: '05h 23m', dec: '-69°45\'', mag: 0.9,  alt_deg: 61, transit: '22:14', seeing: 5, size: '10.7°' },
  { id: 2, name: 'Omega Centauri',         alt: 'NGC 5139',  type: 'Glob. Clus',const: 'Centaurus',  ra: '13h 26m', dec: '-47°29\'', mag: 3.9,  alt_deg: 56, transit: '00:44', seeing: 5, size: '36\'' },
  { id: 3, name: 'Small Magellanic Cloud', alt: 'SMC',       type: 'Galaxy',    const: 'Tucana',     ra: '00h 53m', dec: '-72°48\'', mag: 2.7,  alt_deg: 44, transit: '20:10', seeing: 4, size: '5.3°' },
  { id: 4, name: '47 Tucanae',             alt: 'NGC 104',   type: 'Glob. Clus',const: 'Tucana',     ra: '00h 24m', dec: '-72°05\'', mag: 4.0,  alt_deg: 44, transit: '19:46', seeing: 5, size: '31\'' },
  { id: 5, name: 'Centaurus A',            alt: 'NGC 5128',  type: 'Galaxy',    const: 'Centaurus',  ra: '13h 25m', dec: '-43°01\'', mag: 7.2,  alt_deg: 52, transit: '00:42', seeing: 4, size: '18\'' },
  { id: 6, name: 'Eta Carinae Nebula',     alt: 'NGC 3372',  type: 'Nebula',    const: 'Carina',     ra: '10h 43m', dec: '-59°52\'', mag: 6.5,  alt_deg: 38, transit: '21:58', seeing: 5, size: '120\'' },
  { id: 7, name: 'Jewel Box',              alt: 'NGC 4755',  type: 'Open Clus', const: 'Crux',       ra: '12h 53m', dec: '-60°20\'', mag: 4.2,  alt_deg: 36, transit: '23:50', seeing: 4, size: '10\'' },
  { id: 8, name: 'Southern Pleiades',      alt: 'IC 2602',   type: 'Open Clus', const: 'Carina',     ra: '10h 43m', dec: '-64°24\'', mag: 1.9,  alt_deg: 34, transit: '21:58', seeing: 3, size: '50\'' },
  { id: 9, name: 'Tarantula Nebula',       alt: 'NGC 2070',  type: 'Nebula',    const: 'Dorado',     ra: '05h 38m', dec: '-69°05\'', mag: 8.0,  alt_deg: 60, transit: '22:21', seeing: 4, size: '40\'' },
  { id: 10, name: 'Carina Nebula',         alt: 'NGC 3372',  type: 'Nebula',    const: 'Carina',     ra: '10h 44m', dec: '-59°53\'', mag: 6.5,  alt_deg: 37, transit: '22:00', seeing: 4, size: '120\'' },
  { id: 11, name: 'Fornax Cluster',        alt: 'Abell S373',type: 'Gal. Grp',  const: 'Fornax',     ra: '03h 38m', dec: '-35°27\'', mag: 9.0,  alt_deg: 30, transit: '20:53', seeing: 3, size: '2°' },
  { id: 12, name: 'Sculptor Galaxy',       alt: 'NGC 253',   type: 'Galaxy',    const: 'Sculptor',   ra: '00h 47m', dec: '-25°17\'', mag: 8.0,  alt_deg: 48, transit: '20:07', seeing: 4, size: '25\'' },
];

const EQUIPMENT = [
  { id: 'T1', name: '16" Cassegrain',   aperture: '406mm', focal: 'f/8',  mount: 'Fork EQ',   camera: 'ASI2600MM', status: 'ONLINE',       session: 'NGC 5139',      operator: 'Dr. Mutasa' },
  { id: 'T2', name: '12" Dobsonian',    aperture: '305mm', focal: 'f/4.7',mount: 'Alt-Az',    camera: 'ASI294MC',  status: 'ONLINE',       session: 'Visual obs.',   operator: 'T. Chikomo' },
  { id: 'T3', name: '8" Refractor',     aperture: '200mm', focal: 'f/10', mount: 'GEM EQ6',   camera: 'ASI178MM',  status: 'MAINTENANCE',  session: 'Collimation',   operator: '—' },
  { id: 'T4', name: 'Radio Array 1.4GHz',aperture:'4×1m',  focal: '—',    mount: 'Fixed South',camera:'SDR+LNA',   status: 'ONLINE',       session: 'Pulsar monitor', operator: 'Auto' },
  { id: 'T5', name: 'All-Sky Camera',   aperture: '180°',  focal: 'f/2',  mount: 'Fixed roof', camera: 'ASI120MM', status: 'ONLINE',       session: 'Sky monitor',   operator: 'Auto' },
];

const OBS_LOG = [
  { id: 1, date: '2026-06-06', start: '19:45', end: '23:30', observer: 'Dr. T. Mutasa',   target: 'Omega Centauri',        telescope: 'T1', type: 'Imaging',  frames: 120, notes: 'Excellent seeing. Full LRGB set acquired.' },
  { id: 2, date: '2026-06-06', start: '20:10', end: '22:00', observer: 'T. Chikomo',      target: 'Large Magellanic Cloud', telescope: 'T2', type: 'Visual',   frames: 0,   notes: 'Outstanding naked-eye visibility. Star clusters noted.' },
  { id: 3, date: '2026-06-05', start: '20:30', end: '01:15', observer: 'N. Maposa',       target: 'Centaurus A',            telescope: 'T1', type: 'Spectroscopy', frames: 45, notes: 'AGN emission lines captured. H-alpha prominent.' },
  { id: 4, date: '2026-06-04', start: '18:55', end: '23:00', observer: 'Dr. R. Chivhinge', target: 'Jewel Box Cluster',    telescope: 'T2', type: 'Imaging',  frames: 80,  notes: 'Colour mosaic. Good transparency.' },
  { id: 5, date: '2026-06-03', start: '19:20', end: '00:45', observer: 'T. Chikomo',      target: 'SMC — HII Regions',     telescope: 'T1', type: 'Narrowband', frames: 200, notes: 'H-alpha + OIII exposures. Slight wind shake at 00:00.' },
];

const ZIMSAT_PASSES = [
  { aos: '19:14', los: '19:22', max_el: 67, dir: 'SSW→NNE', vis: 'Visible',  mag: 3.2, duration: '8 min' },
  { aos: '20:51', los: '20:57', max_el: 24, dir: 'W→NE',    vis: 'Visible',  mag: 4.8, duration: '6 min' },
  { aos: '22:29', los: '22:33', max_el: 11, dir: 'NW→NE',   vis: 'Twilight', mag: 5.5, duration: '4 min' },
  { aos: '07:03', los: '07:11', max_el: 78, dir: 'NNW→SSE', vis: 'Daylight', mag: '—', duration: '8 min' },
  { aos: '08:41', los: '08:48', max_el: 36, dir: 'N→SE',    vis: 'Daylight', mag: '—', duration: '7 min' },
];

const PLANETS_TONIGHT = [
  { name: 'Venus',   icon: '♀', rise: '07:22', set: '19:45', transit: '13:34', alt: '—',   vis: 'Eve' },
  { name: 'Mars',    icon: '♂', rise: '15:01', set: '02:38', transit: '20:50', alt: '62°',  vis: 'Night' },
  { name: 'Jupiter', icon: '♃', rise: '16:44', set: '04:21', transit: '22:33', alt: '71°',  vis: 'Night' },
  { name: 'Saturn',  icon: '♄', rise: '14:12', set: '01:58', transit: '20:05', alt: '58°',  vis: 'Night' },
  { name: 'Mercury', icon: '☿', rise: '05:44', set: '18:00', transit: '11:52', alt: '—',   vis: 'Dawn' },
];

const OBJECT_TYPES = ['All', 'Galaxy', 'Glob. Clus', 'Open Clus', 'Nebula', 'Gal. Grp'];

// ── Small helpers ─────────────────────────────────────────────────────────────
function nowUTC() {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false, timeZone: 'UTC',
  }).format(new Date()) + ' UTC';
}

function seeingStars(n) {
  return Array.from({ length: 5 }, (_, i) => (
    <span key={i} className="obs-star" style={{ color: i < n ? '#f59e0b' : '#1e293b' }}>★</span>
  ));
}

function StatusBadge({ status }) {
  const map = {
    ONLINE:      { bg: 'rgba(34,197,94,0.12)',   color: '#22c55e', border: 'rgba(34,197,94,0.35)' },
    MAINTENANCE: { bg: 'rgba(234,179,8,0.12)',   color: '#fbbf24', border: 'rgba(234,179,8,0.35)' },
    OFFLINE:     { bg: 'rgba(239,68,68,0.12)',   color: '#ef4444', border: 'rgba(239,68,68,0.35)' },
  };
  const s = map[status] || map.OFFLINE;
  return (
    <span className="obs-status-badge" style={{ background: s.bg, color: s.color, borderColor: s.border }}>
      {status}
    </span>
  );
}

// ── Sky map (polar SVG plot) ──────────────────────────────────────────────────
function SkyMap({ targets }) {
  const CX = 160; const CY = 160; const R = 145;
  const toXY = (alt, az) => {
    const r = R * (1 - alt / 90);
    const th = (az - 90) * Math.PI / 180;
    return [CX + r * Math.cos(th), CY + r * Math.sin(th)];
  };
  const DIRS = [['N',0],['NE',45],['E',90],['SE',135],['S',180],['SW',225],['W',270],['NW',315]];

  const mockAz = [220, 300, 195, 190, 280, 245, 260, 250, 215, 248, 175, 180];

  return (
    <svg viewBox="0 0 320 320" className="obs-sky-svg">
      {/* Altitude circles */}
      {[90,60,30,0].map((alt, i) => (
        <circle key={i} cx={CX} cy={CY} r={R*(1-alt/90)} fill="none"
          stroke="rgba(34,211,238,0.1)" strokeDasharray={alt===0?'4,4':'none'} strokeWidth="1" />
      ))}
      {/* Alt labels */}
      <text x={CX+4} y={CY - R*(1-30/90)-3} fill="rgba(34,211,238,0.4)" fontSize="8">30°</text>
      <text x={CX+4} y={CY - R*(1-60/90)-3} fill="rgba(34,211,238,0.4)" fontSize="8">60°</text>
      {/* Cardinal directions */}
      {DIRS.map(([d,az]) => {
        const [x,y] = toXY(2, az);
        return <text key={d} x={x} y={y} fill="rgba(148,163,184,0.7)" fontSize="9"
          fontWeight="800" textAnchor="middle" dominantBaseline="central">{d}</text>;
      })}
      {/* Milky Way band */}
      <ellipse cx={CX} cy={CY+10} rx={70} ry={130} fill="none"
        stroke="rgba(168,162,158,0.08)" strokeWidth="24" transform={`rotate(-25,${CX},${CY})`} />
      {/* Object dots */}
      {targets.map((t, i) => {
        const az = mockAz[i] || 200;
        const [x, y] = toXY(t.alt_deg, az);
        const col = t.type === 'Galaxy' ? '#a78bfa' : t.type.includes('Clus') ? '#22d3ee' : '#f59e0b';
        const r   = Math.max(3, 7 - t.mag * 0.5);
        return (
          <g key={t.id}>
            <circle cx={x} cy={y} r={r+2} fill={col} opacity="0.12" />
            <circle cx={x} cy={y} r={r}   fill={col} opacity="0.85" />
            <text x={x} y={y-r-3} fill={col} fontSize="6.5" fontWeight="800"
              textAnchor="middle" opacity="0.8">{t.alt}</text>
          </g>
        );
      })}
      {/* Horizon zenith marker */}
      <circle cx={CX} cy={CY} r={3} fill="#22d3ee" opacity="0.7" />
      <text x={CX+5} y={CY-4} fill="rgba(34,211,238,0.5)" fontSize="7">Zenith</text>
    </svg>
  );
}

// ── Moon phase display ────────────────────────────────────────────────────────
function MoonPhaseIcon({ pct }) {
  const id = `moon-clip-${Math.round(pct)}`;
  const illuminatedLeft = pct <= 50;
  const shadowX = illuminatedLeft ? 50 - pct * 2 : (pct - 50) * 2 - 50;
  return (
    <svg viewBox="0 0 60 60" width="52" height="52" className="obs-moon-svg">
      <circle cx="30" cy="30" r="28" fill="#1e293b" />
      <clipPath id={id}><circle cx="30" cy="30" r="28" /></clipPath>
      <ellipse cx={30 + (pct < 50 ? -shadowX * 0.6 : shadowX * 0.6)} cy="30"
        rx={Math.abs(50 - pct) * 0.56} ry="28"
        fill={pct < 50 ? '#334155' : '#f8fafc'} clipPath={`url(#${id})`} opacity="0.95"
      />
      <circle cx="30" cy="30" r="28" fill="none" stroke="rgba(248,250,252,0.2)" strokeWidth="1" />
    </svg>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Main component
// ══════════════════════════════════════════════════════════════════════════════
export default function ObservatoryHubPage() {
  const [utc, setUtc]             = useState(nowUTC);
  const [tab, setTab]             = useState('targets');
  const [typeFilter, setTypeFilter] = useState('All');
  const [search, setSearch]       = useState('');
  const [sortKey, setSortKey]     = useState('alt_deg');
  const [sortDir, setSortDir]     = useState(-1);
  const [loading, setLoading]     = useState(false);

  useEffect(() => {
    const id = setInterval(() => setUtc(nowUTC()), 1000);
    return () => clearInterval(id);
  }, []);

  const moonPct    = 23;   // waxing crescent demo
  const moonPhase  = 'Waxing Crescent';
  const moonRise   = '09:14';
  const moonSet    = '21:47';

  const filteredTargets = useMemo(() => {
    let list = TONIGHT_TARGETS;
    if (typeFilter !== 'All') list = list.filter(t => t.type === typeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(t => t.name.toLowerCase().includes(q) || t.alt.toLowerCase().includes(q) || t.const.toLowerCase().includes(q));
    }
    list = [...list].sort((a, b) => sortDir * (a[sortKey] > b[sortKey] ? 1 : -1));
    return list;
  }, [typeFilter, search, sortKey, sortDir]);

  const onSort = key => {
    if (key === sortKey) setSortDir(d => -d);
    else { setSortKey(key); setSortDir(-1); }
  };

  const TABS = [
    { id: 'targets',    label: "Tonight's Targets", icon: Star },
    { id: 'catalog',    label: 'Deep Sky Catalog',   icon: BookOpen },
    { id: 'solar',      label: 'Solar System',       icon: Globe2 },
    { id: 'log',        label: 'Observation Log',    icon: Calendar },
    { id: 'equipment',  label: 'Equipment',           icon: Telescope },
    { id: 'zimsat',     label: 'ZIMSAT-1 Passes',    icon: Satellite },
  ];

  return (
    <div className="obs-root">

      {/* ── Header ── */}
      <header className="obs-header">
        <div className="obs-header-left">
          <div className="obs-header-icon"><Star size={20} /></div>
          <div>
            <h1 className="obs-title">OBSERVATORY HUB</h1>
            <p className="obs-subtitle">{OBS.name} · {OBS.city}</p>
          </div>
        </div>
        <div className="obs-header-meta">
          <div className="obs-meta-item">
            <Globe2 size={12} />
            <span>{Math.abs(OBS.lat)}°S {OBS.lon}°E · {OBS.altitude}m</span>
          </div>
          <div className="obs-meta-item">
            <Clock size={12} />
            <span>{utc}</span>
          </div>
          <div className="obs-night-badge">
            <span className="obs-night-dot" />
            Astronomical Night
          </div>
        </div>
      </header>

      <div className="obs-content">

        {/* ── Top 5 Cards ── */}
        <div className="obs-top-cards">

          {/* Sky Conditions */}
          <article className="obs-card">
            <div className="obs-card-title"><Eye size={11} /> SKY CONDITIONS</div>
            <div className="obs-cond-grid">
              <div className="obs-cond-item">
                <span>Seeing</span>
                <div className="obs-stars">{seeingStars(4)}</div>
                <strong style={{ color: '#22c55e' }}>Good (4/5)</strong>
              </div>
              <div className="obs-cond-item">
                <span>Transparency</span>
                <div className="obs-stars">{seeingStars(5)}</div>
                <strong style={{ color: '#22c55e' }}>Excellent</strong>
              </div>
            </div>
            <div className="obs-kv-stack" style={{ marginTop: 8 }}>
              <div className="obs-kv"><span>SQM</span><strong>21.5 mag/arcsec²</strong></div>
              <div className="obs-kv"><span>Humidity</span><strong>34%</strong></div>
              <div className="obs-kv"><span>Wind</span><strong style={{ color: '#22c55e' }}>3 km/h — Calm</strong></div>
            </div>
          </article>

          {/* Moon */}
          <article className="obs-card">
            <div className="obs-card-title"><Moon size={11} /> MOON PHASE</div>
            <div className="obs-moon-row">
              <MoonPhaseIcon pct={moonPct} />
              <div>
                <div className="obs-moon-phase">{moonPhase}</div>
                <div className="obs-moon-illum">{moonPct}% illuminated</div>
              </div>
            </div>
            <div className="obs-kv-stack" style={{ marginTop: 10 }}>
              <div className="obs-kv"><span>Rises</span><strong>{moonRise} UTC</strong></div>
              <div className="obs-kv"><span>Sets</span><strong>{moonSet} UTC</strong></div>
              <div className="obs-kv"><span>Impact</span><strong style={{ color: '#22c55e' }}>Low — Dark sky window</strong></div>
            </div>
          </article>

          {/* Darkness Window */}
          <article className="obs-card">
            <div className="obs-card-title"><Star size={11} /> DARKNESS WINDOW</div>
            <div className="obs-kv-stack">
              <div className="obs-kv"><span>Civil Twilight End</span><strong>18:41 UTC</strong></div>
              <div className="obs-kv"><span>Nautical Twilight End</span><strong>19:10 UTC</strong></div>
              <div className="obs-kv"><span>Astro. Twilight End</span><strong>19:41 UTC</strong></div>
              <div className="obs-kv"><span>Astro. Twilight Start</span><strong>04:53 UTC</strong></div>
            </div>
            <div className="obs-dark-bar">
              <div className="obs-dark-fill" />
            </div>
            <div className="obs-dark-label">
              <span style={{ color: '#22c55e' }}>Dark window: 9h 12m</span>
            </div>
          </article>

          {/* Optimal Targets */}
          <article className="obs-card">
            <div className="obs-card-title"><BookOpen size={11} /> TONIGHT'S OBJECTS</div>
            <div className="obs-big-value" style={{ color: '#a78bfa' }}>
              {TONIGHT_TARGETS.length}
            </div>
            <div className="obs-big-unit">optimal targets</div>
            <div className="obs-kv-stack" style={{ marginTop: 8 }}>
              <div className="obs-kv"><span>Galaxies</span><strong style={{ color: '#a78bfa' }}>4</strong></div>
              <div className="obs-kv"><span>Globular Clusters</span><strong style={{ color: '#22d3ee' }}>2</strong></div>
              <div className="obs-kv"><span>Nebulae</span><strong style={{ color: '#f59e0b' }}>3</strong></div>
              <div className="obs-kv"><span>Open Clusters</span><strong style={{ color: '#22c55e' }}>2</strong></div>
            </div>
          </article>

          {/* Observatory Status */}
          <article className="obs-card">
            <div className="obs-card-title"><Settings size={11} /> OBSERVATORY STATUS</div>
            <div className="obs-kv-stack">
              <div className="obs-kv"><span>Facility</span><strong style={{ color: '#22c55e' }}>OPERATIONAL</strong></div>
              <div className="obs-kv"><span>Telescopes Online</span><strong>3 / 4</strong></div>
              <div className="obs-kv"><span>Active Sessions</span><strong style={{ color: '#22d3ee' }}>2</strong></div>
              <div className="obs-kv"><span>Last Calibration</span><strong>2026-06-06</strong></div>
              <div className="obs-kv"><span>Network</span><strong style={{ color: '#22c55e' }}>Connected</strong></div>
            </div>
          </article>
        </div>

        {/* ── Mid: Sky Map + Priority Targets ── */}
        {false && (
        <div className="obs-mid-grid">

          {/* Sky map */}
          <article className="obs-panel obs-skymap-panel">
            <div className="obs-panel-hdr">
              <span className="obs-card-title">TONIGHT'S SKY — HARARE (17.8°S)</span>
              <span className="obs-panel-sub">06 Jun 2026 · 21:00 CAT</span>
            </div>
            <div className="obs-skymap-wrap">
              <SkyMap targets={TONIGHT_TARGETS} />
              <div className="obs-skymap-legend">
                {[['#a78bfa','Galaxy'],['#22d3ee','Cluster'],['#f59e0b','Nebula']].map(([c,l]) => (
                  <span key={l}><i style={{ background: c }} />{l}</span>
                ))}
              </div>
            </div>
          </article>

          {/* Planet positions */}
          <article className="obs-panel">
            <div className="obs-panel-hdr">
              <span className="obs-card-title">PLANETARY POSITIONS TONIGHT</span>
            </div>
            <table className="obs-table">
              <thead>
                <tr>
                  <th>Planet</th><th>Rise</th><th>Transit</th><th>Set</th><th>Max Alt</th><th>Visibility</th>
                </tr>
              </thead>
              <tbody>
                {PLANETS_TONIGHT.map(p => (
                  <tr key={p.name}>
                    <td>
                      <span className="obs-planet-icon">{p.icon}</span>
                      <strong>{p.name}</strong>
                    </td>
                    <td>{p.rise}</td>
                    <td style={{ color: '#22d3ee' }}>{p.transit}</td>
                    <td>{p.set}</td>
                    <td>{p.alt}</td>
                    <td>
                      <span className="obs-vis-badge" style={{
                        color: p.vis === 'Night' ? '#22c55e' : p.vis === 'Eve' ? '#f59e0b' : '#64748b'
                      }}>{p.vis}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* APOD-style astronomy tip */}
            <div className="obs-tip-box">
              <div className="obs-tip-title"><Zap size={11} /> SOUTHERN HEMISPHERE ADVANTAGE</div>
              <p>Zimbabwe's latitude (18°S) gives excellent views of Magellanic Clouds, Omega Centauri, and the Galactic Centre. The Milky Way is directly overhead from June–August.</p>
            </div>
          </article>
        </div>
        )}

        {/* ── Tab Navigation ── */}
        <div className="obs-tabs-bar">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button"
              className={`obs-tab-btn${tab === id ? ' active' : ''}`}
              onClick={() => setTab(id)}
            >
              <Icon size={13} />{label}
            </button>
          ))}
        </div>

        {/* ══ TAB: Tonight's Targets ══ */}
        {tab === 'targets' && (
          <article className="obs-panel">
            <div className="obs-table-toolbar">
              <input
                type="text"
                className="obs-search"
                placeholder="Search object…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <div className="obs-filter-chips">
                {OBJECT_TYPES.map(t => (
                  <button key={t} type="button"
                    className={`obs-chip${typeFilter === t ? ' active' : ''}`}
                    onClick={() => setTypeFilter(t)}
                  >{t}</button>
                ))}
              </div>
            </div>
            <table className="obs-table obs-sortable-table">
              <thead>
                <tr>
                  {[
                    ['name',    'Object'],
                    ['type',    'Type'],
                    ['const',   'Constellation'],
                    ['ra',      'RA'],
                    ['dec',     'Dec'],
                    ['mag',     'Mag'],
                    ['alt_deg', 'Altitude'],
                    ['transit', 'Transit'],
                    ['size',    'Size'],
                    ['seeing',  'Seeing'],
                  ].map(([key, label]) => (
                    <th key={key} onClick={() => onSort(key)} className="obs-th-sortable">
                      {label}
                      {sortKey === key && <span className="obs-sort-arrow">{sortDir > 0 ? '↑' : '↓'}</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredTargets.map(t => {
                  const typeColor = t.type === 'Galaxy' ? '#a78bfa' : t.type.includes('Clus') ? '#22d3ee' : '#f59e0b';
                  return (
                    <tr key={t.id}>
                      <td>
                        <div style={{ fontWeight: 900, color: '#f8fafc' }}>{t.name}</div>
                        <div style={{ color: '#475569', fontSize: '0.6rem' }}>{t.alt}</div>
                      </td>
                      <td><span className="obs-type-dot" style={{ background: typeColor }} /><span style={{ color: typeColor }}>{t.type}</span></td>
                      <td style={{ color: '#94a3b8' }}>{t.const}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.66rem' }}>{t.ra}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.66rem' }}>{t.dec}</td>
                      <td>{t.mag}</td>
                      <td>
                        <span style={{ color: t.alt_deg > 45 ? '#22c55e' : t.alt_deg > 25 ? '#eab308' : '#ef4444', fontWeight: 900 }}>
                          {t.alt_deg}°
                        </span>
                      </td>
                      <td style={{ color: '#22d3ee' }}>{t.transit}</td>
                      <td style={{ color: '#64748b' }}>{t.size}</td>
                      <td><div className="obs-stars-sm">{seeingStars(t.seeing)}</div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </article>
        )}

        {/* ══ TAB: Deep Sky Catalog ══ */}
        {tab === 'catalog' && (
          <article className="obs-panel">
            <div className="obs-panel-hdr">
              <span className="obs-card-title">SOUTHERN HEMISPHERE DEEP SKY CATALOG</span>
              <span className="obs-panel-sub">Best objects from 17°S latitude</span>
            </div>
            <div className="obs-catalog-grid">
              {TONIGHT_TARGETS.map(t => {
                const typeColor = t.type === 'Galaxy' ? '#a78bfa' : t.type.includes('Clus') ? '#22d3ee' : '#f59e0b';
                return (
                  <div key={t.id} className="obs-catalog-card" style={{ borderColor: `${typeColor}28` }}>
                    <div className="obs-catalog-hdr" style={{ color: typeColor }}>
                      <span className="obs-type-dot" style={{ background: typeColor }} />
                      {t.type}
                    </div>
                    <div className="obs-catalog-name">{t.name}</div>
                    <div className="obs-catalog-alt">{t.alt}</div>
                    <div className="obs-catalog-kv">
                      <span>Constellation</span><strong>{t.const}</strong>
                    </div>
                    <div className="obs-catalog-kv">
                      <span>Magnitude</span><strong>{t.mag}</strong>
                    </div>
                    <div className="obs-catalog-kv">
                      <span>Size</span><strong>{t.size}</strong>
                    </div>
                    <div className="obs-catalog-kv">
                      <span>Tonight Alt</span>
                      <strong style={{ color: t.alt_deg > 45 ? '#22c55e' : '#eab308' }}>{t.alt_deg}°</strong>
                    </div>
                    <div className="obs-catalog-seeing">{seeingStars(t.seeing)}</div>
                  </div>
                );
              })}
            </div>
          </article>
        )}

        {/* ══ TAB: Solar System ══ */}
        {tab === 'solar' && (
          <div className="obs-solar-grid">
            <article className="obs-panel">
              <div className="obs-panel-hdr">
                <span className="obs-card-title">PLANETS — TONIGHT</span>
              </div>
              <div className="obs-planet-cards">
                {PLANETS_TONIGHT.map(p => (
                  <div key={p.name} className="obs-planet-card">
                    <div className="obs-planet-symbol">{p.icon}</div>
                    <div className="obs-planet-name">{p.name}</div>
                    <div className="obs-kv-stack">
                      <div className="obs-kv"><span>Rise</span><strong>{p.rise}</strong></div>
                      <div className="obs-kv"><span>Transit</span><strong style={{ color: '#22d3ee' }}>{p.transit}</strong></div>
                      <div className="obs-kv"><span>Set</span><strong>{p.set}</strong></div>
                      <div className="obs-kv"><span>Max Alt</span><strong style={{ color: '#a78bfa' }}>{p.alt || 'Below'}</strong></div>
                    </div>
                  </div>
                ))}
              </div>
            </article>
            <article className="obs-panel">
              <div className="obs-panel-hdr">
                <span className="obs-card-title">SUN — 06 JUN 2026</span>
              </div>
              <div className="obs-kv-stack">
                <div className="obs-kv"><span>Sunrise</span><strong>06:03 UTC</strong></div>
                <div className="obs-kv"><span>Solar Noon</span><strong>11:47 UTC</strong></div>
                <div className="obs-kv"><span>Sunset</span><strong>17:30 UTC</strong></div>
                <div className="obs-kv"><span>Day Length</span><strong>11h 27m</strong></div>
                <div className="obs-kv"><span>Declination</span><strong>+22°47'</strong></div>
                <div className="obs-kv"><span>Solar Noon Altitude</span><strong>85.0°</strong></div>
              </div>
              <div className="obs-tip-box" style={{ marginTop: 12 }}>
                <div className="obs-tip-title"><AlertTriangle size={11} /> SOLAR MONITORING NOTE</div>
                <p>Solar X-ray activity: C-class flare probability 25%. For active region monitoring, see Space Weather tab.</p>
              </div>
            </article>
          </div>
        )}

        {/* ══ TAB: Observation Log ══ */}
        {tab === 'log' && (
          <article className="obs-panel">
            <div className="obs-panel-hdr">
              <span className="obs-card-title">OBSERVATION LOG</span>
              <span className="obs-panel-sub">{OBS_LOG.length} sessions recorded</span>
              <button type="button" className="obs-action-btn" style={{ marginLeft: 'auto' }}>
                <Camera size={12} /> New Entry
              </button>
            </div>
            <table className="obs-table">
              <thead>
                <tr>
                  <th>Date</th><th>Observer</th><th>Target</th><th>Telescope</th>
                  <th>Type</th><th>Start</th><th>End</th><th>Frames</th><th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {OBS_LOG.map(s => (
                  <tr key={s.id}>
                    <td style={{ color: '#22d3ee', fontWeight: 900 }}>{s.date}</td>
                    <td>{s.observer}</td>
                    <td><strong style={{ color: '#f8fafc' }}>{s.target}</strong></td>
                    <td style={{ color: '#a78bfa' }}>{s.telescope}</td>
                    <td>{s.type}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.66rem' }}>{s.start}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.66rem' }}>{s.end}</td>
                    <td style={{ color: s.frames > 0 ? '#22c55e' : '#475569', fontWeight: 900 }}>
                      {s.frames > 0 ? s.frames : '—'}
                    </td>
                    <td style={{ color: '#64748b', maxWidth: 260, fontSize: '0.6rem' }}>{s.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </article>
        )}

        {/* ══ TAB: Equipment ══ */}
        {tab === 'equipment' && (
          <div className="obs-equipment-grid">
            {EQUIPMENT.map(eq => (
              <article key={eq.id} className={`obs-panel obs-equip-card${eq.status === 'ONLINE' ? ' obs-equip-online' : eq.status === 'MAINTENANCE' ? ' obs-equip-maint' : ''}`}>
                <div className="obs-equip-hdr">
                  <div>
                    <div className="obs-equip-id">{eq.id}</div>
                    <div className="obs-equip-name">{eq.name}</div>
                  </div>
                  <StatusBadge status={eq.status} />
                </div>
                <div className="obs-kv-stack" style={{ marginTop: 12 }}>
                  <div className="obs-kv"><span>Aperture</span><strong>{eq.aperture}</strong></div>
                  <div className="obs-kv"><span>Focal Ratio</span><strong>{eq.focal}</strong></div>
                  <div className="obs-kv"><span>Mount</span><strong>{eq.mount}</strong></div>
                  <div className="obs-kv"><span>Camera/Detector</span><strong style={{ color: '#a78bfa' }}>{eq.camera}</strong></div>
                  <div className="obs-kv"><span>Current Session</span><strong style={{ color: '#22c55e' }}>{eq.session}</strong></div>
                  <div className="obs-kv"><span>Operator</span><strong>{eq.operator}</strong></div>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* ══ TAB: ZIMSAT-1 Passes ══ */}
        {tab === 'zimsat' && (
          <div className="obs-zimsat-grid">
            <article className="obs-panel">
              <div className="obs-panel-hdr">
                <span className="obs-card-title">ZIMSAT-1 PASS PREDICTIONS</span>
                <span className="obs-panel-sub">06 Jun 2026 · Harare (17.8°S, 31.1°E)</span>
              </div>
              <table className="obs-table">
                <thead>
                  <tr>
                    <th>AOS (UTC)</th><th>LOS (UTC)</th><th>Duration</th>
                    <th>Max Elevation</th><th>Direction</th><th>Visibility</th><th>Mag</th>
                  </tr>
                </thead>
                <tbody>
                  {ZIMSAT_PASSES.map((p, i) => (
                    <tr key={i} style={{ opacity: p.vis === 'Daylight' ? 0.5 : 1 }}>
                      <td style={{ color: '#22d3ee', fontWeight: 900, fontFamily: 'monospace' }}>{p.aos}</td>
                      <td style={{ fontFamily: 'monospace' }}>{p.los}</td>
                      <td>{p.duration}</td>
                      <td style={{ color: p.max_el > 45 ? '#22c55e' : '#eab308', fontWeight: 900 }}>{p.max_el}°</td>
                      <td style={{ color: '#94a3b8' }}>{p.dir}</td>
                      <td>
                        <span style={{
                          color: p.vis === 'Visible' ? '#22c55e' : p.vis === 'Twilight' ? '#eab308' : '#475569',
                          fontWeight: 900,
                        }}>{p.vis}</span>
                      </td>
                      <td>{typeof p.mag === 'number' ? p.mag.toFixed(1) : p.mag}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </article>

            <article className="obs-panel">
              <div className="obs-card-title obs-panel-mb">ZIMSAT-1 ORBIT DATA</div>
              <div className="obs-kv-stack">
                <div className="obs-kv"><span>NORAD ID</span><strong style={{ color: '#22d3ee' }}>52756</strong></div>
                <div className="obs-kv"><span>Orbit Type</span><strong>Low Earth Orbit (LEO)</strong></div>
                <div className="obs-kv"><span>Altitude</span><strong>544 km</strong></div>
                <div className="obs-kv"><span>Inclination</span><strong>97.6°</strong></div>
                <div className="obs-kv"><span>Period</span><strong>95.5 min</strong></div>
                <div className="obs-kv"><span>Daily Passes</span><strong>~14 per day</strong></div>
                <div className="obs-kv"><span>Mission</span><strong>Earth Observation</strong></div>
                <div className="obs-kv"><span>Status</span><strong style={{ color: '#22c55e' }}>Operational</strong></div>
              </div>
              <div className="obs-tip-box" style={{ marginTop: 14 }}>
                <div className="obs-tip-title"><Satellite size={11} /> TLE SOURCE</div>
                <p>Pass predictions use Two-Line Element sets from CelesTrak. Update TLEs weekly for best accuracy. At 544 km, timing accuracy is ±5 seconds for fresh TLEs.</p>
              </div>
            </article>
          </div>
        )}

      </div>
    </div>
  );
}
