import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Brain, Expand, LocateFixed, Moon, Sparkles, Telescope } from 'lucide-react';
import { buildStellariumEmbedUrl, getStellariumContext } from '../services/stellariumApi.js';

const DEFAULT_LAT = -17.83;
const DEFAULT_LON = 31.05;

export default function StellariumWebMap({ defaultLat = DEFAULT_LAT, defaultLon = DEFAULT_LON }) {
  const shellRef = useRef(null);
  const [lat, setLat] = useState(defaultLat);
  const [lon, setLon] = useState(defaultLon);
  const [embedUrl, setEmbedUrl] = useState(() => buildStellariumEmbedUrl({ lat: defaultLat, lon: defaultLon }));
  const [context, setContext] = useState(null);
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [geoNote, setGeoNote] = useState(null);

  const loadContext = useCallback(async (nextLat, nextLon) => {
    setLoading(true);
    try {
      const data = await getStellariumContext({ lat: nextLat, lon: nextLon, timezone: 'Africa/Harare' });
      setContext(data);
      setEmbedUrl(data.stellarium?.embed_url || buildStellariumEmbedUrl({ lat: nextLat, lon: nextLon }));
    } catch {
      setEmbedUrl(buildStellariumEmbedUrl({ lat: nextLat, lon: nextLon }));
      setContext(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadContext(lat, lon);
  }, [lat, lon, loadContext]);

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setGeoNote('Geolocation is not supported in this browser.');
      return;
    }
    setLocating(true);
    setGeoNote(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const nextLat = +pos.coords.latitude.toFixed(4);
        const nextLon = +pos.coords.longitude.toFixed(4);
        setLat(nextLat);
        setLon(nextLon);
        setGeoNote(`Using your location: ${nextLat}, ${nextLon}`);
        setLocating(false);
      },
      () => {
        setGeoNote('Could not read your location. Using observatory coordinates.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  };

  const enterFullscreen = async () => {
    const el = shellRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await el.requestFullscreen();
    } catch {
      /* ignore */
    }
  };

  const moon = context?.astronomy;
  const planets = context?.planets_tonight || [];

  return (
    <section className="obs-stellarium-section">
      <div className="obs-stellarium-head">
        <div>
          <div className="obs-stellarium-kicker">
            <Sparkles size={14} />
            Stellarium Web Sky Map
          </div>
          <h2 className="obs-stellarium-title">Live Sky Map</h2>
          <p className="obs-stellarium-sub">
            Explore the sky in real time with constellation and planet labels.
          </p>
        </div>
        <div className="obs-stellarium-actions">
          <button type="button" className="obs-stellarium-btn" onClick={useMyLocation} disabled={locating}>
            <LocateFixed size={14} />
            {locating ? 'Locating…' : 'Use Location'}
          </button>
          <button type="button" className="obs-stellarium-btn" onClick={enterFullscreen}>
            <Expand size={14} />
            Fullscreen
          </button>
        </div>
      </div>

      {geoNote && <div className="obs-stellarium-note">{geoNote}</div>}

      <div className="obs-stellarium-shell" ref={shellRef}>
        <iframe
          key={embedUrl}
          title="Stellarium Web live sky map"
          src={embedUrl}
          className="obs-stellarium-frame"
          loading="lazy"
          allow="fullscreen"
          referrerPolicy="no-referrer-when-downgrade"
        />
        <div className="obs-stellarium-overlay">
          <span>{context?.location?.city || 'Harare, Zimbabwe'}</span>
          <span>{Math.abs(lat).toFixed(2)}°{lat < 0 ? 'S' : 'N'} · {Math.abs(lon).toFixed(2)}°{lon < 0 ? 'W' : 'E'}</span>
          {loading && <span>Loading astronomy API…</span>}
        </div>
      </div>

      <div className="obs-stellarium-cards">
        <article className="obs-stellarium-card">
          <div className="obs-stellarium-card-head">
            <Telescope size={16} />
            <strong>Tonight&apos;s Visible Planets</strong>
          </div>
          <ul className="obs-stellarium-list">
            {planets.map(p => (
              <li key={p.name}>
                <span className="obs-planet-symbol">{p.symbol}</span>
                <div>
                  <strong>{p.name}</strong>
                  <span>{p.visibility} · {p.note}</span>
                </div>
              </li>
            ))}
          </ul>
        </article>

        <article className="obs-stellarium-card">
          <div className="obs-stellarium-card-head">
            <Moon size={16} />
            <strong>Current Moon Phase</strong>
          </div>
          <div className="obs-stellarium-moon">
            <div className="obs-stellarium-moon-phase">{moon?.moon_phase_label || '—'}</div>
            <div className="obs-stellarium-moon-meta">
              <span>Illumination: {moon?.moon_illumination_pct ?? '—'}%</span>
              <span>Rise: {moon?.moonrise || '—'}</span>
              <span>Set: {moon?.moonset || '—'}</span>
              <span className="obs-stellarium-source">{moon?.source || 'Open-Meteo Astronomy API'}</span>
            </div>
          </div>
        </article>

        <article className="obs-stellarium-card">
          <div className="obs-stellarium-card-head">
            <Brain size={16} />
            <strong>Stellarium Web</strong>
          </div>
          <p className="obs-stellarium-card-copy">
            Search objects, toggle constellation lines, and switch observation modes inside the embedded sky map.
          </p>
          <a
            className="obs-stellarium-link"
            href={embedUrl}
            target="_blank"
            rel="noreferrer"
          >
            Open in Stellarium Web →
          </a>
          {context?.stellarium?.embed_url && (
            <code className="obs-stellarium-api">GET /api/astronomy/stellarium</code>
          )}
        </article>
      </div>
    </section>
  );
}
