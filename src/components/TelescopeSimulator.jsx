import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Brain,
  Crosshair,
  Eye,
  ArrowRight,
  Search,
  Telescope,
} from 'lucide-react';
import {
  computeLocalPointing,
  getTelescopeCatalog,
  telescopeAction,
} from '../services/telescopeApi.js';

const DEFAULT_LAT = -17.83;
const DEFAULT_LON = 31.05;

function starPositions(seed) {
  const stars = [];
  let s = seed;
  for (let i = 0; i < 18; i += 1) {
    s = (s * 9301 + 49297) % 233280;
    const x = 8 + (s % 8400) / 100;
    s = (s * 9301 + 49297) % 233280;
    const y = 8 + (s % 7600) / 100;
    s = (s * 9301 + 49297) % 233280;
    const size = 1 + (s % 3);
    stars.push({ x, y, size });
  }
  return stars;
}

export default function TelescopeSimulator({ defaultLat = DEFAULT_LAT, defaultLon = DEFAULT_LON }) {
  const [catalog, setCatalog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [objectId, setObjectId] = useState('');
  const [azimuth, setAzimuth] = useState(0);
  const [altitude, setAltitude] = useState(0);
  const [zoom, setZoom] = useState(50);
  const [tracking, setTracking] = useState(false);
  const [status, setStatus] = useState(null);
  const [aiExplanation, setAiExplanation] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [busy, setBusy] = useState(null);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getTelescopeCatalog({ lat: defaultLat, lon: defaultLon });
      setCatalog(data);
      const first = data.objects?.[0];
      if (first) {
        setObjectId(first.id);
        setAzimuth(data.telescope?.default_azimuth ?? first.azimuth);
        setAltitude(data.telescope?.default_altitude ?? first.altitude);
        setZoom(data.telescope?.default_zoom ?? first.zoom);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [defaultLat, defaultLon]);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  const selected = useMemo(
    () => catalog?.objects?.find(o => o.id === objectId) || catalog?.objects?.[0] || null,
    [catalog, objectId],
  );

  const pointing = useMemo(
    () => computeLocalPointing(selected, azimuth, altitude, zoom),
    [selected, azimuth, altitude, zoom],
  );

  const stars = useMemo(() => starPositions(selected?.id?.length || 7), [selected?.id]);

  const objectStyle = useMemo(() => {
    if (!selected || !pointing.inFov) {
      return { opacity: 0, transform: 'translate(-50%, -50%) scale(0.4)' };
    }
    const pxPerDeg = 4.2 * (zoom / 50);
    const left = 50 + pointing.offsetAz * pxPerDeg;
    const top = 50 - pointing.offsetAlt * pxPerDeg;
    const scale = pointing.aligned ? 0.55 + zoom / 180 : 0.25 + zoom / 260;
    const opacity = pointing.aligned ? 1 : 0.45 + Math.max(0, 1 - Math.abs(pointing.offsetAz + pointing.offsetAlt) / 20);
    return {
      left: `${Math.max(4, Math.min(96, left))}%`,
      top: `${Math.max(4, Math.min(96, top))}%`,
      opacity,
      transform: `translate(-50%, -50%) scale(${scale})`,
    };
  }, [selected, pointing, zoom]);

  const runAction = async (action) => {
    if (!selected) return;
    setBusy(action);
    setStatus(null);
    try {
      const result = await telescopeAction({
        action,
        objectId: selected.id,
        azimuth,
        altitude,
        zoom,
      });

      if (action === 'point' && result.slew_target) {
        setAzimuth(result.slew_target.azimuth);
        setAltitude(result.slew_target.altitude);
        setZoom(result.slew_target.zoom);
        setTracking(false);
      }

      if (action === 'track') {
        setTracking(Boolean(result.tracking_active));
      }

      if (action === 'explain') {
        setAiExplanation(result.explanation);
        setShowDetails(true);
      }

      if (action === 'details') {
        setShowDetails(true);
      }

      setStatus(result.message || 'Action completed.');
    } catch (err) {
      setStatus(err.message);
    } finally {
      setBusy(null);
    }
  };

  useEffect(() => {
    if (!tracking || !selected) return undefined;
    const id = window.setInterval(() => {
      setAzimuth(selected.azimuth);
      setAltitude(selected.altitude);
    }, 1200);
    return () => window.clearInterval(id);
  }, [tracking, selected]);

  const onObjectChange = (id) => {
    setObjectId(id);
    const obj = catalog?.objects?.find(o => o.id === id);
    if (obj) {
      setAzimuth(obj.azimuth);
      setAltitude(obj.altitude);
      setZoom(obj.zoom);
    }
    setTracking(false);
    setAiExplanation(null);
    setShowDetails(false);
    setStatus(null);
  };

  return (
    <section className="obs-telescope-section">
      <div className="obs-telescope-head">
        <div>
          <div className="obs-telescope-kicker">
            <Telescope size={14} />
            Telescope Simulator
          </div>
          <h2 className="obs-telescope-title">Remote Control Simulation</h2>
          <p className="obs-telescope-sub">
            Practice telescope pointing, object tracking and observation planning.
          </p>
        </div>
        <div className="obs-telescope-meta">
          {catalog?.mode === 'simulated' && (
            <span className="obs-telescope-mode-badge" title={catalog.catalog_note}>
              Simulated · {catalog.catalog_count ?? catalog.objects?.length ?? 0} objects
            </span>
          )}
          <code className="obs-telescope-api">GET /api/astronomy/telescope</code>
        </div>
      </div>

      {error && <div className="obs-telescope-note obs-telescope-note--error">{error}</div>}
      {loading && !catalog && <div className="obs-telescope-note">Loading telescope API…</div>}

      <div className="obs-telescope-layout">
        <div className="obs-telescope-viewport-wrap">
          <div className="obs-telescope-viewport" aria-label="Simulated telescope view">
            <div className="obs-telescope-vignette" />
            {stars.map((star, i) => (
              <span
                key={i}
                className="obs-telescope-star"
                style={{ left: `${star.x}%`, top: `${star.y}%`, width: star.size, height: star.size }}
              />
            ))}
            {selected && (
              <div
                className={`obs-telescope-object${pointing.aligned ? ' is-aligned' : ''}`}
                style={{
                  ...objectStyle,
                  '--glow': selected.glow || '#38bdf8',
                }}
              />
            )}
            <div className="obs-telescope-reticle" aria-hidden="true">
              <Crosshair size={42} strokeWidth={1.2} />
            </div>
            <div className="obs-telescope-view-label">
              {selected?.name || 'No object selected'}
            </div>
            {tracking && <div className="obs-telescope-track-badge">Tracking</div>}
          </div>
        </div>

        <div className="obs-telescope-controls">
          <label className="obs-telescope-field">
            <span>Sky object</span>
            <select
              value={objectId}
              onChange={(e) => onObjectChange(e.target.value)}
              disabled={!catalog?.objects?.length}
            >
              {(catalog?.objects || []).map(obj => (
                <option key={obj.id} value={obj.id}>{obj.name}</option>
              ))}
            </select>
          </label>

          <label className="obs-telescope-field">
            <span>Azimuth · {Math.round(azimuth)}°</span>
            <input
              type="range"
              min="0"
              max="360"
              value={azimuth}
              onChange={(e) => { setAzimuth(Number(e.target.value)); setTracking(false); }}
            />
          </label>

          <label className="obs-telescope-field">
            <span>Altitude · {Math.round(altitude)}°</span>
            <input
              type="range"
              min="0"
              max="90"
              value={altitude}
              onChange={(e) => { setAltitude(Number(e.target.value)); setTracking(false); }}
            />
          </label>

          <label className="obs-telescope-field">
            <span>Zoom · {Math.round(zoom)}%</span>
            <input
              type="range"
              min="20"
              max="100"
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
            />
          </label>

          <div className="obs-telescope-actions">
            <button type="button" onClick={() => runAction('point')} disabled={!!busy}>
              <ArrowRight size={14} />
              {busy === 'point' ? 'Slewing…' : 'Point Telescope'}
            </button>
            <button type="button" onClick={() => runAction('track')} disabled={!!busy}>
              <Search size={14} />
              {busy === 'track' ? 'Locking…' : 'Track Object'}
            </button>
            <button type="button" onClick={() => runAction('details')} disabled={!!busy}>
              <Eye size={14} />
              View Details
            </button>
            <button type="button" onClick={() => runAction('explain')} disabled={!!busy}>
              <Brain size={14} />
              {busy === 'explain' ? 'Thinking…' : 'Explain with AI'}
            </button>
          </div>

          <div className="obs-telescope-info">
            <div className="obs-telescope-info-row">
              <span>Name</span>
              <strong>{selected?.name || '—'}</strong>
            </div>
            <div className="obs-telescope-info-row">
              <span>Distance</span>
              <strong>{selected?.distance || '—'}</strong>
            </div>
            <div className="obs-telescope-info-row">
              <span>Constellation</span>
              <strong>{selected?.constellation || '—'}</strong>
            </div>
            <div className="obs-telescope-info-row">
              <span>Visibility</span>
              <strong>{selected?.visibility || '—'}</strong>
            </div>
            {showDetails && selected?.catalog && (
              <>
                <div className="obs-telescope-info-row">
                  <span>Catalog</span>
                  <strong>{selected.catalog}</strong>
                </div>
                <div className="obs-telescope-info-row">
                  <span>Type</span>
                  <strong>{selected.type || '—'}</strong>
                </div>
              </>
            )}
            {aiExplanation && (
              <p className="obs-telescope-ai">{aiExplanation}</p>
            )}
            <p className="obs-telescope-hint">
              {status || catalog?.instructions || 'Select an object and point the simulated telescope.'}
              {catalog?.catalog_note && !status && (
                <span className="obs-telescope-sim-note"> {catalog.catalog_note}</span>
              )}
            </p>
            {pointing.aligned && (
              <p className="obs-telescope-aligned">Object centred on crosshair</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
