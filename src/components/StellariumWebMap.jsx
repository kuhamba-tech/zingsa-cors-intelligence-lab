import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Expand, LocateFixed, Sparkles } from 'lucide-react';
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
          {context?.astronomy?.sky_state_label && (
            <span>{context.astronomy.sky_state_label}{context.astronomy.moon_phase_label ? ` · ${context.astronomy.moon_phase_label}` : ''}</span>
          )}
          {loading && <span>Loading astronomy API…</span>}
        </div>
      </div>
    </section>
  );
}
