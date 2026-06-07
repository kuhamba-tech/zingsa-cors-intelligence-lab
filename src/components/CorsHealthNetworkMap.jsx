import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { AFRICA_TILE_LAYERS, africaMapTileLayerProps } from './africaMapConfig.js';

const MAP_LAYER_ORDER = ['hybrid', 'satellite', 'street'];

function MapTileLayer({ mapStyle }) {
  const map = useMap();
  const tileProps = africaMapTileLayerProps(mapStyle);

  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 150);
    return () => clearTimeout(t);
  }, [map, mapStyle]);

  return <TileLayer key={mapStyle} {...tileProps} />;
}

function stationMarkerColor(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'offline') return '#ef4444';
  if (s === 'degraded') return '#EF9F27';
  return '#1D9E75';
}

function statusLabel(status) {
  const s = String(status || 'online').toLowerCase();
  if (s === 'offline') return 'OFFLINE';
  if (s === 'degraded') return 'DEGRADED';
  return 'ONLINE';
}

function MapFocus({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 0.8 });
  }, [map, center, zoom]);
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

export default function CorsHealthNetworkMap({
  stations = [],
  country = 'Zimbabwe',
  regionLabel = '',
  riskLevel = 'LOW',
  riskColor = '#1D9E75',
  mapTitle = 'CORS station network',
}) {
  const [mapStyle, setMapStyle] = useState('hybrid');

  const center = useMemo(() => {
    if (!stations.length) return [-19.0, 29.1];
    const lat = stations.reduce((s, st) => s + st.lat, 0) / stations.length;
    const lon = stations.reduce((s, st) => s + st.lon, 0) / stations.length;
    return [lat, lon];
  }, [stations]);

  const zoom = country === 'Zimbabwe' ? 6 : 5;

  const activeLayers = [
    'AFREF Reference Frame',
    'IGS GNSS Stations',
    'National CORS Telemetry',
    'EarthScope GNSS',
    'NTRIP Corrections',
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 380, background: 'linear-gradient(180deg,rgba(8,14,32,0.95),rgba(4,8,20,0.98))' }}>
      <div style={{ position: 'relative', flex: 1, minHeight: 320 }}>
        <MapContainer
          key={`cors-map-${mapStyle}`}
          center={center}
          zoom={zoom}
          style={{ height: '100%', width: '100%', minHeight: 320, background: '#0a1628' }}
          scrollWheelZoom
        >
          <MapTileLayer mapStyle={mapStyle} />
          <MapFocus center={center} zoom={zoom} />
          <MapResizeFix />
          {stations.map(st => (
            <CircleMarker
              key={st.id}
              center={[st.lat, st.lon]}
              radius={10}
              pathOptions={{
                color: stationMarkerColor(st.status),
                fillColor: stationMarkerColor(st.status),
                fillOpacity: 0.88,
                weight: 2.5,
              }}
            >
              <Tooltip>
                <strong>{st.id} — {st.name}</strong>
                <div>Status: {statusLabel(st.status)}</div>
                {st.network && <div>Network: {st.network}</div>}
                <div>{st.lat.toFixed(4)}°, {st.lon.toFixed(4)}°</div>
              </Tooltip>
            </CircleMarker>
          ))}
        </MapContainer>

        <div style={{ position: 'absolute', top: 12, left: 14, zIndex: 500, maxWidth: '58%', pointerEvents: 'none' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 900, color: '#22d3ee', marginBottom: 2, textShadow: '0 1px 8px rgba(0,0,0,0.85)' }}>
            Map: {country}
          </div>
          <div style={{ fontSize: '0.64rem', color: '#dbeafe', textShadow: '0 1px 8px rgba(0,0,0,0.85)' }}>{mapTitle}</div>
        </div>

        <div style={{ position: 'absolute', bottom: 12, left: 12, zIndex: 500, background: 'rgba(3,7,31,0.85)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '7px 10px', backdropFilter: 'blur(8px)' }}>
          <div style={{ fontSize: '0.6rem', fontWeight: 800, color: '#94a3b8', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Station Status</div>
          {[['ONLINE', '#1D9E75'], ['DEGRADED', '#EF9F27'], ['OFFLINE', '#ef4444']].map(([label, color]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
              <span style={{ fontSize: '0.65rem', color: '#cbd5e1' }}>{label}</span>
            </div>
          ))}
        </div>

        <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 500, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', background: 'rgba(3,7,31,0.82)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 9, padding: 4, gap: 4 }}>
            {MAP_LAYER_ORDER.map(key => {
              const layer = AFRICA_TILE_LAYERS[key];
              if (!layer) return null;
              return (
              <button
                key={key}
                type="button"
                onClick={() => setMapStyle(key)}
                style={{
                  background: mapStyle === key ? 'rgba(34,211,238,0.18)' : 'transparent',
                  border: mapStyle === key ? '1px solid rgba(34,211,238,0.45)' : '1px solid transparent',
                  borderRadius: 7, padding: '5px 9px', color: mapStyle === key ? '#e0f2fe' : '#94a3b8',
                  fontSize: '0.64rem', fontWeight: 800, cursor: 'pointer',
                }}
              >
                {layer.short}
              </button>
              );
            })}
          </div>
          <div style={{ background: `${riskColor}1e`, border: `1px solid ${riskColor}45`, borderRadius: 8, padding: '7px 11px', textAlign: 'center', backdropFilter: 'blur(8px)' }}>
            <div style={{ fontSize: '0.58rem', color: '#dbeafe', marginBottom: 2 }}>RISK LEVEL</div>
            <div style={{ fontSize: '0.82rem', fontWeight: 900, color: riskColor }}>{riskLevel}</div>
          </div>
        </div>
      </div>

      <div style={{ padding: '12px 14px 14px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ fontSize: '0.62rem', color: '#94a3b8', marginBottom: 7 }}>Active layers:</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {activeLayers.map(s => (
            <span
              key={s}
              style={{
                background: 'rgba(34,211,238,0.13)', border: '1px solid rgba(34,211,238,0.24)',
                borderRadius: 4, padding: '1px 7px', fontSize: '0.58rem', color: '#dbeafe',
              }}
            >
              {s}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
