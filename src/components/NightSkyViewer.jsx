import React, { useCallback, useEffect, useState } from 'react';
import { Calendar, LocateFixed, Moon, Sparkles, Star } from 'lucide-react';
import {
  formatTimeDisplay,
  generateSkyChart,
  getNightSkyConfig,
  parseTimeInput,
} from '../services/nightSkyApi.js';

const DEFAULT_LAT = -17.83;
const DEFAULT_LON = 31.05;
const DEFAULT_CITY = 'Harare, Zimbabwe';

export default function NightSkyViewer({
  defaultLat = DEFAULT_LAT,
  defaultLon = DEFAULT_LON,
  defaultCity = DEFAULT_CITY,
}) {
  const [config, setConfig] = useState(null);
  const [lat, setLat] = useState(defaultLat);
  const [lon, setLon] = useState(defaultLon);
  const [city, setCity] = useState(defaultCity);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('20:00');
  const [chart, setChart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(null);

  const loadConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getNightSkyConfig({ lat: defaultLat, lon: defaultLon, city: defaultCity });
      setConfig(data);
      setDate(data.defaults?.date || '');
      setTime(data.defaults?.time || '20:00');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [defaultLat, defaultLon, defaultCity]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const runGenerate = useCallback(async (nextLat = lat, nextLon = lon, nextCity = city) => {
    if (!date) return;
    setGenerating(true);
    setError(null);
    try {
      const result = await generateSkyChart({
        date,
        time: parseTimeInput(time),
        lat: nextLat,
        lon: nextLon,
        city: nextCity,
      });
      setChart(result.chart);
      setStatus(result.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  }, [date, time, lat, lon, city]);

  useEffect(() => {
    if (config && date && !chart) {
      runGenerate(defaultLat, defaultLon, defaultCity);
    }
  }, [config, date, chart, runGenerate, defaultLat, defaultLon, defaultCity]);

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setStatus('Geolocation is not supported in this browser.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const nextLat = +pos.coords.latitude.toFixed(4);
        const nextLon = +pos.coords.longitude.toFixed(4);
        setLat(nextLat);
        setLon(nextLon);
        setCity(`Your location (${nextLat}, ${nextLon})`);
        setLocating(false);
        setStatus('Location updated — generate the chart to refresh.');
      },
      () => {
        setLocating(false);
        setStatus('Could not read location. Using observatory coordinates.');
      },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  };

  const [timeH, timeM] = time.split(':').map(Number);
  const timeDisplay = Number.isFinite(timeH) ? formatTimeDisplay(timeH, timeM || 0) : '08:00 PM';

  return (
    <section className="obs-nightsky-section">
      <div className="obs-nightsky-head">
        <div>
          <div className="obs-nightsky-ready">
            <Star size={12} />
            {config?.status || (loading ? 'Loading…' : 'AstronomyAPI Ready')}
          </div>
          <h2 className="obs-nightsky-title">Night Sky Viewer</h2>
          <p className="obs-nightsky-sub">
            Generate night sky charts and teach what is visible from Africa.
          </p>
        </div>
        <code className="obs-nightsky-api">GET /api/astronomy/night-sky</code>
      </div>

      {error && <div className="obs-nightsky-note obs-nightsky-note--error">{error}</div>}
      {status && !error && <div className="obs-nightsky-note">{status}</div>}

      <div className="obs-nightsky-layout">
        <div className="obs-nightsky-controls">
          <label className="obs-nightsky-field">
            <span><Calendar size={12} /> Date</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>

          <label className="obs-nightsky-field">
            <span><Moon size={12} /> Time</span>
            <div className="obs-nightsky-time-wrap">
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
              <span className="obs-nightsky-time-display">{timeDisplay}</span>
            </div>
          </label>

          <div className="obs-nightsky-actions">
            <button type="button" onClick={useMyLocation} disabled={locating}>
              <LocateFixed size={14} />
              {locating ? 'Locating…' : 'Use Location'}
            </button>
            <button type="button" onClick={() => runGenerate()} disabled={generating || !date}>
              <Sparkles size={14} />
              {generating ? 'Generating…' : 'Generate Sky Chart'}
            </button>
          </div>

          {chart?.teaching_notes && (
            <ul className="obs-nightsky-teaching">
              {chart.teaching_notes.map((note, i) => (
                <li key={i}>{note}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="obs-nightsky-chart-panel">
          <div className="obs-nightsky-chart" aria-label="Night sky chart">
            <svg viewBox="0 0 100 100" className="obs-nightsky-svg" role="img">
              <defs>
                <radialGradient id="obsSkyGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#1e3a5f" stopOpacity="0.9" />
                  <stop offset="70%" stopColor="#0f172a" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="#020617" />
                </radialGradient>
                <radialGradient id="obsMilkyWay" cx="50%" cy="55%" r="40%">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
                </radialGradient>
              </defs>
              <circle cx="50" cy="50" r="48" fill="url(#obsSkyGlow)" />
              <circle
                cx={chart?.milky_way?.x ?? 52}
                cy={chart?.milky_way?.y ?? 58}
                r="22"
                fill="url(#obsMilkyWay)"
                opacity={chart?.milky_way?.opacity ?? 0.3}
              />
              <circle
                cx="50"
                cy="50"
                r="48"
                fill="none"
                stroke="#22c55e"
                strokeWidth="0.35"
                opacity="0.85"
              />
              {(chart?.cardinals || []).map(c => (
                <text
                  key={c.label}
                  x={c.x}
                  y={c.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="obs-nightsky-cardinal"
                >
                  {c.label}
                </text>
              ))}
              {(chart?.stars || []).map(star => (
                <g key={star.name}>
                  <circle
                    cx={star.x}
                    cy={star.y}
                    r={star.size * 0.22}
                    fill="#f8fafc"
                    opacity={Math.max(0.45, 1 - star.magnitude * 0.08)}
                  />
                </g>
              ))}
            </svg>
            <div className="obs-nightsky-chart-label">
              {chart?.location?.city || city}
            </div>
            {chart && (
              <div className="obs-nightsky-chart-meta">
                {chart.visible_count} stars · {chart.date_display} · {timeDisplay}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
