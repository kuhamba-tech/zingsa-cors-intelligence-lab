import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, Marker, Polyline, Rectangle, TileLayer, Tooltip, useMap } from 'react-leaflet';
import { AFRICA_MAP_BOUNDS, AFRICA_TILE_LAYERS, africaCityIcon, africaMapTileLayerProps } from './africaMapConfig.js';
import 'leaflet/dist/leaflet.css';

const MAP_CITIES = [
  [30.0444, 31.2357, 'Cairo', 'north'],
  [6.5244, 3.3792, 'Lagos', 'west'],
  [-1.2921, 36.8219, 'Nairobi', 'east'],
  [-26.2041, 28.0473, 'Johannesburg', 'southern'],
  [5.6037, -0.187, 'Accra', 'west'],
  [9.032, 38.7469, 'Addis Ababa', 'east'],
  [-4.4419, 15.2663, 'Kinshasa', 'equatorial'],
  [-6.7924, 39.2083, 'Dar es Salaam', 'east'],
  [12.6392, -8.0029, 'Bamako', 'sahel'],
  [15.5007, 32.5599, 'Khartoum', 'north'],
  [-17.8252, 31.0335, 'Harare', 'southern'],
  [-22.5609, 17.0658, 'Windhoek', 'southern'],
];

const REGION_VIEW = {
  pan: { center: [3, 20], zoom: 3 },
  equatorial: { center: [0, 18], zoom: 4 },
  east: { center: [2, 38], zoom: 4 },
  west: { center: [8, -2], zoom: 4 },
  southern: { center: [-22, 24], zoom: 4 },
  north: { center: [26, 22], zoom: 4 },
  sahel: { center: [14, 8], zoom: 4 },
};

function activityLabel(kp) {
  if (kp < 2) return { text: 'Quiet — low GPS impact', color: '#22c55e' };
  if (kp < 4) return { text: 'Unsettled — watch equatorial GPS', color: '#22d3ee' };
  if (kp < 5) return { text: 'Active — HF & GNSS degraded', color: '#EF9F27' };
  return { text: 'Storm — major African impacts', color: '#ef4444' };
}

function RegionFocus({ regionId }) {
  const map = useMap();
  useEffect(() => {
    const view = REGION_VIEW[regionId] || REGION_VIEW.pan;
    map.flyTo(view.center, view.zoom, { duration: 0.85 });
  }, [map, regionId]);
  return null;
}

function MapResizeFix() {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 120);
    return () => clearTimeout(t);
  }, [map]);
  return null;
}

export default function AfricaIonosphereMap({ kp, status, regionId, regionSummary }) {
  const [tileMode, setTileMode] = useState('hybrid');
  const cities = useMemo(
    () => (regionId === 'pan' ? MAP_CITIES : MAP_CITIES.filter(([, , , r]) => r === regionId)),
    [regionId],
  );
  const activity = activityLabel(kp);
  const accent = status?.color || '#22d3ee';
  const eiaOpacity = Math.min(0.22 + kp * 0.05, 0.5);
  const view = REGION_VIEW[regionId] || REGION_VIEW.pan;
  const tileProps = africaMapTileLayerProps(tileMode);

  return (
    <div className="sw-africa-map-card" style={{ background: 'linear-gradient(180deg,rgba(8,14,32,0.95),rgba(4,8,20,0.98))', border: '1px solid rgba(34,211,238,0.25)', borderRadius: 16, padding: 18, width: '100%', minWidth: 0 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
        <div style={{ flex: '1 1 200px' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#22d3ee' }}>Africa ionosphere map</div>
          <p style={{ margin: '6px 0 0', fontSize: '0.76rem', color: '#94a3b8', lineHeight: 1.5 }}>{regionSummary}</p>
        </div>
        <div style={{ flexShrink: 0, background: 'rgba(8,12,36,0.95)', border: `1px solid ${accent}55`, borderRadius: 10, padding: '8px 14px', textAlign: 'center', minWidth: 88 }}>
          <div style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: 700 }}>LIVE Kp</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: accent, fontFamily: 'monospace', lineHeight: 1.1 }}>{kp.toFixed(1)}</div>
          <div style={{ fontSize: '0.65rem', color: accent, fontWeight: 700 }}>{status.label}</div>
        </div>
      </div>

      <div className="sw-ionosphere-map-shell">
        <MapContainer key={tileMode} center={view.center} zoom={view.zoom} minZoom={2} maxZoom={12} maxBounds={AFRICA_MAP_BOUNDS} maxBoundsViscosity={0.85} scrollWheelZoom style={{ height: '100%', width: '100%' }} attributionControl={false}>
          <TileLayer key={tileMode} {...tileProps} />
          <RegionFocus regionId={regionId} />
          <MapResizeFix />
          <Rectangle bounds={[[-18, -18], [18, 52]]} pathOptions={{ color: '#22d3ee', weight: 2, fillColor: '#22d3ee', fillOpacity: eiaOpacity, dashArray: '6 4' }}>
            <Tooltip direction="top" className="sw-map-tooltip">EIA zone — highest GPS error belt across equatorial Africa</Tooltip>
          </Rectangle>
          <Polyline positions={[[0, -20], [0, 55]]} pathOptions={{ color: '#22d3ee', weight: 2, opacity: 0.85 }} />
          {kp >= 4 && (
            <Rectangle bounds={[[-12, 5], [12, 42]]} pathOptions={{ color: accent, weight: 1.5, fillColor: accent, fillOpacity: 0.08, dashArray: '8 6' }} />
          )}
          {cities.map(([lat, lng, label]) => (
            <Marker key={label} position={[lat, lng]} icon={africaCityIcon(label)} zIndexOffset={500}>
              <Tooltip direction="top" offset={[0, -6]} opacity={0.95} className="sw-map-tooltip"><strong>{label}</strong><br />Monitored hub · Kp {kp.toFixed(1)}</Tooltip>
            </Marker>
          ))}
        </MapContainer>
        <div className="sw-ionosphere-map-tiles">
          {Object.entries(AFRICA_TILE_LAYERS).map(([key, layer]) => (
            <button key={key} type="button" className={`sw-ionosphere-tile-btn${tileMode === key ? ' active' : ''}`} onClick={() => setTileMode(key)} title={layer.label}>{layer.short}</button>
          ))}
        </div>
        <div className="sw-ionosphere-map-status" style={{ color: activity.color, borderColor: `${activity.color}55` }}>{activity.text}</div>
      </div>

      <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 10 }}>
        {[['#22d3ee', 'EIA belt overlay', 'Cyan band on the map'], ['#fbbf24', 'Cities monitored', regionId === 'pan' ? '12 hubs' : 'This region'], [accent, 'Storm level', `Kp ${kp.toFixed(1)} · ${status.label}`]].map(([color, label, sub]) => (
          <div key={label} style={{ padding: '8px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
            <div style={{ color: '#e2e8f0', fontWeight: 700, fontSize: '0.74rem' }}>{label}</div>
            <div style={{ color: '#64748b', fontSize: '0.65rem', marginTop: 2 }}>{sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
