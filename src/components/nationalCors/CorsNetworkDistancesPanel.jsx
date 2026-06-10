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
import { analyseNetworkRtk } from '../../data/corsNetworkAnalysis.js';

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

// ── RTK / NRTK Analysis Panel ────────────────────────────────────
function NetworkRtkAnalysis() {
  const a = useMemo(() => analyseNetworkRtk(), []);
  const maxBucketCount = Math.max(...a.buckets.map(b => b.count));

  const caseCardClass = verdict =>
    `cil-dist-an-verdict ${verdict === 'none' ? 'red' : verdict === 'partial' ? 'amber' : 'green'}`;

  const ntrkVerdict = a.clusterCandidates.length > 0 ? 'full'
    : a.partialCandidates.length > 0              ? 'partial'
    : 'none';

  return (
    <div className="cil-dist-analysis">

      {/* ── Header ── */}
      <div className="cil-dist-an-head">
        <div>
          <span className="cil-dist-an-title">RTK / NRTK Network Feasibility Analysis</span>
          <span className="cil-dist-an-sub">{a.stationCount}-station ZimCORS geometry · {a.totalRealPairs} unique baselines</span>
        </div>
      </div>

      {/* ── KPI strip ── */}
      <div className="cil-dist-an-kpis">
        {[
          { label: 'Avg Nearest-Neighbour', value: `${a.avgNearestKm} km`,
            color: a.avgNearestKm > 80 ? '#ef4444' : a.avgNearestKm > 50 ? '#eab308' : '#22c55e' },
          { label: 'Min Nearest-Neighbour', value: `${a.minNearestKm?.toFixed(1)} km`, color: '#22c55e' },
          { label: 'NRTK-Range Pairs (50–80 km)', value: a.ntrkRangePairs.length, color: '#22d3ee' },
          { label: 'Viable NRTK Clusters', value: a.clusterCandidates.length,
            color: a.clusterCandidates.length > 0 ? '#22c55e' : '#ef4444' },
        ].map(kpi => (
          <div key={kpi.label} className="cil-dist-an-kpi">
            <small>{kpi.label}</small>
            <strong style={{ color: kpi.color }}>{kpi.value}</strong>
          </div>
        ))}
      </div>

      {/* ── Distance distribution ── */}
      <div className="cil-dist-an-dist">
        <div className="cil-dist-an-dist-title">Baseline Distance Distribution — {a.totalRealPairs} pairs</div>
        <div className="cil-dist-an-dist-bars">
          {a.buckets.map(b => {
            const pct = maxBucketCount > 0 ? (b.count / maxBucketCount) * 100 : 0;
            const color = b.lo < 30 ? '#22c55e' : b.lo < 50 ? '#84cc16' : b.lo < 80 ? '#22d3ee' : b.lo < 150 ? '#eab308' : '#ef4444';
            return (
              <div key={b.label} className="cil-dist-an-dist-row">
                <span className="cil-dist-an-dist-label">{b.label}</span>
                <div className="cil-dist-an-dist-track">
                  <div className="cil-dist-an-dist-fill" style={{ width: `${pct}%`, background: color }} />
                </div>
                <span className="cil-dist-an-dist-count" style={{ color }}>
                  {b.count} <span className="muted">({b.note})</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Case 1: Single RTK ── */}
      <div className="cil-dist-an-cases">
        <div className="cil-dist-an-case">
          <div className="cil-dist-an-case-head">
            <span className="cil-dist-an-case-badge">CASE 1</span>
            <span className="cil-dist-an-case-title">Single-Baseline RTK</span>
          </div>
          <p className="cil-dist-an-body">
            Effective within <strong>30 km</strong> of the nearest CORS under nominal ionospheric
            conditions. During adverse ionospheric periods the reliable range contracts to{' '}
            <strong>10–20 km</strong>. Accuracy follows the standard formula:
          </p>
          <div className="cil-dist-an-formula">
            <div><span>Horizontal (rms)</span><strong>8 mm + 1 ppm</strong></div>
            <div><span>Vertical (rms)</span><strong>15 mm + 1 ppm</strong></div>
          </div>
          <div className="cil-dist-an-acc-row">
            <div className="cil-dist-an-acc-box">
              <small>At mean nearest-neighbour spacing ({a.avgNearestKm} km)</small>
              <strong style={{ color: '#ef4444' }}>H ≈ {a.hAccAtMean} mm &nbsp;·&nbsp; V ≈ {a.vAccAtMean} mm</strong>
            </div>
            <div className="cil-dist-an-acc-box">
              <small>At optimal 30 km baseline</small>
              <strong style={{ color: '#22c55e' }}>H ≈ 38 mm &nbsp;·&nbsp; V ≈ 45 mm</strong>
            </div>
          </div>

          {a.rtkOptimalPairs.length > 0 ? (
            <div className="cil-dist-an-chips">
              <small className="cil-dist-an-chips-label">Pairs within RTK-optimal range (≤ 30 km)</small>
              {a.rtkOptimalPairs.map(p => (
                <span key={p.from.id + p.to.id} className="cil-dist-an-chip green">
                  {p.from.name} ↔ {p.to.name} &nbsp; {p.km.toFixed(1)} km
                </span>
              ))}
            </div>
          ) : (
            <div className={caseCardClass('none')}>
              ✗ No inter-CORS baselines ≤ 30 km — single RTK between network stations is impractical.
              Rovers must be positioned within 30 km of an individual CORS for this accuracy class.
            </div>
          )}
        </div>

        {/* ── Case 2: NRTK ── */}
        <div className="cil-dist-an-case">
          <div className="cil-dist-an-case-head">
            <span className="cil-dist-an-case-badge cyan">CASE 2</span>
            <span className="cil-dist-an-case-title">Network RTK (NRTK)</span>
          </div>
          <p className="cil-dist-an-body">
            NRTK requires a <strong>cluster of ≥ 4 CORS</strong> with inter-station spacing of{' '}
            <strong>50–80 km</strong>. Rovers anywhere inside the cluster area achieve the same
            1–2 cm accuracy as single RTK regardless of their distance to any individual station.
            Spacing above 80 km degrades the atmospheric error model and pushes performance toward
            PPK/static solutions, especially during periods of high ionospheric activity (11-year solar cycle peak).
          </p>

          {a.ntrkRangePairs_sorted.length > 0 && (
            <div className="cil-dist-an-chips">
              <small className="cil-dist-an-chips-label">Baselines within NRTK optimal spacing (50–80 km)</small>
              {a.ntrkRangePairs_sorted.map(p => (
                <span key={p.from.id + p.to.id} className="cil-dist-an-chip cyan">
                  {p.from.name} ↔ {p.to.name} &nbsp; {p.km.toFixed(1)} km
                </span>
              ))}
            </div>
          )}

          <div className={caseCardClass(ntrkVerdict)}>
            {a.clusterCandidates.length > 0
              ? `✓ Cluster candidate(s): ${a.clusterCandidates.map(s => s.name).join(', ')}`
              : a.partialCandidates.length > 0
              ? `△ Partial candidates only (1–2 NRTK neighbours): ${a.partialCandidates.map(s => s.name).join(', ')} — a 4-station cluster cannot yet be formed`
              : '✗ No station has ≥ 3 neighbours within 50–80 km — no viable NRTK cluster possible with current geometry'
            }
          </div>

          <p className="cil-dist-an-body muted">
            With a mean nearest-neighbour spacing of <strong>{a.avgNearestKm} km</strong>{' '}
            (range {a.minNearestKm?.toFixed(0)}–{a.maxNearestKm} km), ZimCORS baselines are
            predominantly 80–430 km — far exceeding the 50–80 km cluster threshold.
            The most isolated station is <strong>{a.worstStation?.name ?? '—'}</strong> at{' '}
            <strong>{a.maxNearestKm} km</strong> from its nearest neighbour.
            Network densification with additional stations in the gaps identified above is
            required to enable a consistent NRTK cluster solution.
          </p>
        </div>
      </div>

      {/* ── Recommendation table ── */}
      <div className="cil-dist-an-rec">
        <div className="cil-dist-an-rec-title">Recommended Positioning Modes — ZimCORS Network</div>
        <div className="cil-dist-an-rec-table">
          <div className="cil-dist-an-rec-row header">
            <span>Mode</span><span>Rover–CORS Range</span><span>Status</span><span>Notes</span>
          </div>
          {[
            { mode: 'Single RTK',       range: '≤ 30 km',    status: 'Limited',         color: '#eab308', note: 'Viable near individual CORS; ionosphere-dependent. Follow 30 km rule.' },
            { mode: 'Network RTK',      range: '40–60 km',   status: 'Not yet viable',  color: '#ef4444', note: 'Network geometry requires densification; no full 4-station cluster exists.' },
            { mode: 'PPK (RINEX)',       range: '< 150 km',   status: 'Recommended',     color: '#22c55e', note: 'Post-process with X-Pos / RTKLIB using CORS RINEX. 1–3 cm on short baselines.' },
            { mode: 'Long-Baseline PPK', range: '100–150 km', status: 'GCP required',    color: '#22d3ee', note: 'Log ≥ 3 h at 1 Hz on unknown point; compute position back-office, then use as GCP.' },
            { mode: 'PPP',              range: 'Any',         status: 'Suitable',        color: '#818cf8', note: 'Best for remote areas or baselines > 150 km. Converge time ~20–30 min.' },
          ].map(r => (
            <div key={r.mode} className="cil-dist-an-rec-row">
              <span style={{ color: r.color, fontWeight: 800 }}>{r.mode}</span>
              <span>{r.range}</span>
              <span style={{ color: r.color }}>{r.status}</span>
              <span className="muted">{r.note}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
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

      <NetworkRtkAnalysis />
    </section>
  );
}
