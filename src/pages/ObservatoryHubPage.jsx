import React, { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Clock, Globe2, Moon, Star } from 'lucide-react';
import OperationalServicesNav from '../components/OperationalServicesNav.jsx';
import StellariumWebMap from '../components/StellariumWebMap.jsx';
import TelescopeSimulator from '../components/TelescopeSimulator.jsx';
import NightSkyViewer from '../components/NightSkyViewer.jsx';
import { getStellariumContext } from '../services/stellariumApi.js';
import '../styles/observatory-hub.css';

const OBS = {
  name:      'ZINGSA Mazowe Observatory',
  city:      'Harare, Zimbabwe',
  lat:       -17.83,
  lon:        31.05,
  altitude:  1480,
  timezone:  'CAT (UTC+2)',
};

function nowUTCDateTime() {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false, timeZone: 'UTC',
  }).format(new Date()) + ' UTC';
}

function nowUTCTime() {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  }).format(new Date());
}

function nowUTCDate() {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date());
}

function nowLocalTime() {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'Africa/Harare',
  }).format(new Date());
}

function nowLocalDate() {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'Africa/Harare',
  }).format(new Date());
}

export default function ObservatoryHubPage() {
  const { search } = useLocation();
  const [utc, setUtc] = useState(nowUTCDateTime);
  const [utcTime, setUtcTime] = useState(nowUTCTime);
  const [utcDate, setUtcDate] = useState(nowUTCDate);
  const [localTime, setLocalTime] = useState(nowLocalTime);
  const [localDate, setLocalDate] = useState(nowLocalDate);
  const [astronomy, setAstronomy] = useState(null);

  const loadAstronomy = useCallback(async () => {
    try {
      const data = await getStellariumContext({
        lat: OBS.lat,
        lon: OBS.lon,
        timezone: 'Africa/Harare',
      });
      setAstronomy(data?.astronomy || null);
    } catch {
      setAstronomy(null);
    }
  }, []);

  useEffect(() => {
    loadAstronomy();
    const skyId = setInterval(loadAstronomy, 5 * 60 * 1000);
    return () => clearInterval(skyId);
  }, [loadAstronomy]);

  useEffect(() => {
    const id = setInterval(() => {
      setUtc(nowUTCDateTime());
      setUtcTime(nowUTCTime());
      setUtcDate(nowUTCDate());
      setLocalTime(nowLocalTime());
      setLocalDate(nowLocalDate());
    }, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const tool = new URLSearchParams(search).get('tool');
    if (tool !== 'stellarium-telescope') return;

    window.requestAnimationFrame(() => {
      document.getElementById('stellarium-telescope')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
  }, [search]);

  const skyState = astronomy?.sky_state || 'night';
  const skyLabel = astronomy?.sky_state_label || 'Night Sky';
  const moonLabel = astronomy?.moon_phase_label;

  return (
    <div className="obs-root">
      <header className="obs-header">
        <div className="obs-header-left">
          <div className="obs-header-icon"><Star size={20} /></div>
          <div>
            <div className="obs-kicker">ZINGSA Space Science Operations</div>
            <h1 className="obs-title">Observatory Hub</h1>
            <p className="obs-subtitle">Monitoring the Skies. Understanding Our Planet.</p>
          </div>
        </div>
        <div className="obs-header-meta">
          <div className="obs-site-pill">
            <Globe2 size={15} />
            <div>
              <span>Observatory Site</span>
              <strong>{Math.abs(OBS.lat)}S {OBS.lon}E · {OBS.altitude}m</strong>
            </div>
          </div>
          <div className="obs-clock-card" aria-label="Zimbabwe local observatory time">
            <div>
              <span>CAT Local Time</span>
              <strong>{localTime}</strong>
              <small>{localDate}</small>
            </div>
            <div className="obs-clock-icon">
              <Clock size={24} />
            </div>
          </div>
          <div className="obs-clock-card obs-clock-card--utc" aria-label="UTC observatory time">
            <div>
              <span>UTC Time</span>
              <strong>{utcTime}</strong>
              <small>{utcDate}</small>
            </div>
            <div className="obs-clock-icon">
              <Clock size={24} />
            </div>
          </div>
          <div className="obs-meta-item">
            <Globe2 size={12} />
            <span>{Math.abs(OBS.lat)}°S {OBS.lon}°E · {OBS.altitude}m</span>
          </div>
          <div className="obs-meta-item">
            <Clock size={12} />
            <span>{utc}</span>
          </div>
          <div className={`obs-night-badge obs-night-badge--${skyState}`} title={astronomy?.source === 'fallback' ? 'Open-Meteo unavailable — hour-based estimate' : 'Open-Meteo sunrise/sunset at Mazowe'}>
            <span className="obs-night-dot" />
            {skyLabel}
          </div>
          {moonLabel && (
            <div className="obs-moon-badge" title={astronomy?.moon_illumination_pct != null ? `${astronomy.moon_illumination_pct}% illuminated` : undefined}>
              <Moon size={12} />
              {moonLabel}
            </div>
          )}
        </div>
      </header>

      <OperationalServicesNav variant="purple" />

      <div className="obs-content" id="stellarium-telescope">
        <StellariumWebMap defaultLat={OBS.lat} defaultLon={OBS.lon} />
        <TelescopeSimulator defaultLat={OBS.lat} defaultLon={OBS.lon} />
        <NightSkyViewer defaultLat={OBS.lat} defaultLon={OBS.lon} defaultCity={OBS.city} />
      </div>
    </div>
  );
}
