import React, { useEffect, useState } from 'react';
import { Clock, Eye, Globe2, Moon, Settings, Star } from 'lucide-react';
import StellariumWebMap from '../components/StellariumWebMap.jsx';
import TelescopeSimulator from '../components/TelescopeSimulator.jsx';
import NightSkyViewer from '../components/NightSkyViewer.jsx';
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

export default function ObservatoryHubPage() {
  const [utc, setUtc] = useState(nowUTC);

  useEffect(() => {
    const id = setInterval(() => setUtc(nowUTC()), 1000);
    return () => clearInterval(id);
  }, []);

  const moonPct    = 23;
  const moonPhase  = 'Waxing Crescent';
  const moonRise   = '09:14';
  const moonSet    = '21:47';

  return (
    <div className="obs-root">

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

        <StellariumWebMap defaultLat={OBS.lat} defaultLon={OBS.lon} />

        <TelescopeSimulator defaultLat={OBS.lat} defaultLon={OBS.lon} />

        <NightSkyViewer defaultLat={OBS.lat} defaultLon={OBS.lon} defaultCity={OBS.city} />

        <div className="obs-top-cards">

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

          <article className="obs-card">
            <div className="obs-card-title"><Star size={11} /> TONIGHT&apos;S OBJECTS</div>
            <div className="obs-big-value" style={{ color: '#a78bfa' }}>12</div>
            <div className="obs-big-unit">optimal targets</div>
            <div className="obs-kv-stack" style={{ marginTop: 8 }}>
              <div className="obs-kv"><span>Galaxies</span><strong style={{ color: '#a78bfa' }}>4</strong></div>
              <div className="obs-kv"><span>Globular Clusters</span><strong style={{ color: '#22d3ee' }}>2</strong></div>
              <div className="obs-kv"><span>Nebulae</span><strong style={{ color: '#f59e0b' }}>3</strong></div>
              <div className="obs-kv"><span>Open Clusters</span><strong style={{ color: '#22c55e' }}>2</strong></div>
            </div>
          </article>

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

      </div>
    </div>
  );
}
