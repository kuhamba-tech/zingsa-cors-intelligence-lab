import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Polyline, Marker, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { AFRICA_TILE_LAYERS, africaMapTileLayerProps } from '../africaMapConfig.js';
import {
  DISTANCE_META,
  DISTANCE_REFERENCE_STATION,
  DISTANCE_STATIONS,
  distanceLinkRows,
} from '../../data/corsNetworkDistances.js';

const MAP_LAYER_ORDER = ['hybrid', 'satellite', 'street'];
const DEFAULT_VIEW = { center: [-18.95, 30.1], zoom: 6 };
const PAGE_SIZE = 16;

function MapTileLayer({ mapStyle }) {
  const map = useMap();
  const tileProps = africaMapTileLayerProps(mapStyle);

  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 150);
    return () => clearTimeout(t);
  }, [map, mapStyle]);

  return <TileLayer key={mapStyle} {...tileProps} />;
}

function MapResizeFix() {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 120);
    return () => clearTimeout(t);
  }, [map]);
  return null;
}

/** Frame the whole network on mount, like the reference layout. */
function FitNetworkBounds() {
  const map = useMap();
  useEffect(() => {
    const bounds = L.latLngBounds(DISTANCE_STATIONS.map(st => [st.lat, st.lon]));
    const t = setTimeout(() => {
      map.invalidateSize();
      map.fitBounds(bounds, { padding: [34, 34] });
    }, 140);
    return () => clearTimeout(t);
  }, [map]);
  return null;
}

function distanceLabelIcon(km) {
  return L.divIcon({
    className: '',
    html: `<span class="cil-dist-km">${km.toFixed(1)} km</span>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

function stationLabelIcon(name, isReference) {
  return L.divIcon({
    className: '',
    html: `<span class="cil-dist-station-label${isReference ? ' ref' : ''}">${name}</span>`,
    iconSize: [0, 0],
    iconAnchor: [-8, 8],
  });
}

function downloadCsv(rows) {
  const header = 'From Station,To Station,Distance (km),Source';
  const lines = rows.map(r => `${r.from.name},${r.to.name},${r.km.toFixed(1)},${r.measured ? 'SpiderQC measured' : 'Computed'}`);
  const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'zimcors-network-distances.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export default function CorsNetworkDistancesPanel() {
  const [mapStyle, setMapStyle] = useState('hybrid');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const links = useMemo(() => distanceLinkRows(), []);

  // Mean nearest-neighbour distance — standard CORS network density metric.
  const avgSpacingKm = useMemo(() => {
    const nearest = new Map();
    links.forEach(l => {
      nearest.set(l.from.id, Math.min(nearest.get(l.from.id) ?? Infinity, l.km));
      nearest.set(l.to.id, Math.min(nearest.get(l.to.id) ?? Infinity, l.km));
    });
    const values = [...nearest.values()];
    if (!values.length) return null;
    return Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 10) / 10;
  }, [links]);

  const filteredLinks = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return links;
    return links.filter(r =>
      r.from.name.toLowerCase().includes(q)
      || r.to.name.toLowerCase().includes(q)
      || r.from.id.toLowerCase().includes(q)
      || r.to.id.toLowerCase().includes(q));
  }, [links, search]);

  const pageCount = Math.max(1, Math.ceil(filteredLinks.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageRows = filteredLinks.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <section className="cil-dist-section" aria-label="CORS network distances">
      <div className="cil-dist-grid">
        <div className="cil-dist-map-wrap">
          <MapContainer
            center={DEFAULT_VIEW.center}
            zoom={DEFAULT_VIEW.zoom}
            style={{ height: '100%', width: '100%', background: '#0a1628' }}
            scrollWheelZoom
          >
            <MapTileLayer mapStyle={mapStyle} />
            <MapResizeFix />
            <FitNetworkBounds />

            {links.map(link => {
              const positions = [[link.from.lat, link.from.lon], [link.to.lat, link.to.lon]];
              const mid = [
                (link.from.lat + link.to.lat) / 2,
                (link.from.lon + link.to.lon) / 2,
              ];
              return (
                <React.Fragment key={link.id}>
                  <Polyline
                    positions={positions}
                    pathOptions={{ color: '#e2e8f0', weight: 1.4, opacity: 0.85 }}
                  >
                    <Tooltip sticky>
                      {link.from.name} ↔ {link.to.name} — <strong>{link.km.toFixed(1)} km</strong>
                    </Tooltip>
                  </Polyline>
                  <Marker position={mid} icon={distanceLabelIcon(link.km)} interactive={false} />
                </React.Fragment>
              );
            })}

            {DISTANCE_STATIONS.map(st => {
              const isRef = st.id === DISTANCE_REFERENCE_STATION;
              return (
                <React.Fragment key={st.id}>
                  <CircleMarker
                    center={[st.lat, st.lon]}
                    radius={isRef ? 8 : 5.5}
                    pathOptions={{
                      color: isRef ? '#22d3ee' : '#16a34a',
                      fillColor: isRef ? '#0ea5e9' : '#22c55e',
                      fillOpacity: 1,
                      weight: isRef ? 3 : 2,
                    }}
                  >
                    <Tooltip>
                      <strong>{st.name}</strong> ({st.id})<br />
                      {st.lat.toFixed(4)}°, {st.lon.toFixed(4)}°
                      {isRef ? <><br />Reference station</> : null}
                    </Tooltip>
                  </CircleMarker>
                  <Marker position={[st.lat, st.lon]} icon={stationLabelIcon(st.name, isRef)} interactive={false} />
                </React.Fragment>
              );
            })}
          </MapContainer>

          <div className="cil-dist-map-title">
            CORS Network Distances - Zimbabwe
            <span title="Measured baseline spacing between CORS (SpiderQC TIN)"> ⓘ</span>
          </div>

          <div className="cil-dist-style-toggle">
            {MAP_LAYER_ORDER.map(key => {
              const layer = AFRICA_TILE_LAYERS[key];
              if (!layer) return null;
              return (
                <button
                  key={key}
                  type="button"
                  className={mapStyle === key ? 'active' : ''}
                  onClick={() => setMapStyle(key)}
                >
                  {layer.short}
                </button>
              );
            })}
          </div>

          <div className="cil-dist-legend">
            <div className="cil-dist-legend-title">Legend</div>
            <div><span className="dot cors" /> CORS Station</div>
            <div><span className="dot ref" /> Reference Station (HARARE)</div>
          </div>
        </div>

        <aside className="cil-dist-table-panel">
          <div className="cil-dist-table-head">
            <h4>Measured Distances</h4>
            <button
              type="button"
              title="Download CSV"
              onClick={() => downloadCsv(filteredLinks)}
            >
              ⤓
            </button>
          </div>
          <input
            type="search"
            placeholder="Search stations…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
          <div className="cil-dist-table-scroll">
            <table>
              <thead>
                <tr>
                  <th>From Station</th>
                  <th>To Station</th>
                  <th>Distance (km)</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map(r => (
                  <tr key={r.id}>
                    <td>{r.from.name}</td>
                    <td>{r.to.name}</td>
                    <td title={r.measured ? 'SpiderQC measured' : 'Computed from coordinates'}>
                      {r.km.toFixed(1)}{r.measured ? ' ◆' : ''}
                    </td>
                  </tr>
                ))}
                {!pageRows.length && (
                  <tr><td colSpan={3} style={{ textAlign: 'center', color: '#64748b' }}>No matching links</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div style={{ fontSize: '0.58rem', color: '#64748b' }}>◆ SpiderQC measured · others computed from station coordinates</div>
          <div className="cil-dist-pager">
            {Array.from({ length: pageCount }, (_, i) => i + 1).map(n => (
              <button
                key={n}
                type="button"
                className={n === safePage ? 'active' : ''}
                onClick={() => setPage(n)}
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              disabled={safePage >= pageCount}
              onClick={() => setPage(safePage + 1)}
            >
              Next
            </button>
          </div>
        </aside>
      </div>

      <div className="cil-dist-footer">
        <div><small>Total Stations</small><strong>{DISTANCE_STATIONS.length}</strong></div>
        <div><small>Total Links</small><strong>{links.length}</strong></div>
        <div><small>Avg Station Spacing</small><strong style={{ color: '#22c55e' }}>{avgSpacingKm != null ? `${avgSpacingKm} km` : '—'}</strong></div>
        <div><small>Last Updated</small><strong>{DISTANCE_META.generatedAt}</strong></div>
      </div>
    </section>
  );
}
