import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Database, Download, FileText, RefreshCw } from 'lucide-react';
import { ingestCorsData } from '../services/corsApi.js';
import { useCorsAlertData } from '../context/CorsAlertDataContext.jsx';
import { ZIMBABWE_CORS_STATIONS } from '../data/zimbabweCorsStations.js';
import { buildReportPayload, downloadJsonReport, healthTelemetryLabel } from '../utils/corsNetworkData.js';

const SOURCE_LABELS = {
  'gnss-apps': 'Leica Spider (GNSS-Data/APPS)',
  'tec-analysis': 'TEC Analysis RINEX',
};

function formatSourceCounts(sourceCounts = {}) {
  return Object.entries(sourceCounts)
    .map(([id, count]) => `${SOURCE_LABELS[id] || id}: ${count}`)
    .join(' · ');
}

export default function DataCentreView() {
  const { catalog, healthPayload, loading, refresh, error } = useCorsAlertData();
  const [sourceFilter, setSourceFilter] = useState('all');
  const [ingesting, setIngesting] = useState(false);
  const [ingestMsg, setIngestMsg] = useState(null);

  const runScan = async (source) => {
    setIngesting(true);
    setIngestMsg(null);
    try {
      const result = await ingestCorsData({ source, limit: 30, extract: false });
      setIngestMsg(result.message || `Indexed ${result.succeeded ?? 0} archives from ${SOURCE_LABELS[source] || source}.`);
      await refresh();
    } catch (err) {
      setIngestMsg(err.message);
    } finally {
      setIngesting(false);
    }
  };

  const indexedByStation = useMemo(() => {
    const map = new Map();
    for (const archive of catalog?.archives || []) {
      const id = archive.stationId;
      if (!id) continue;
      const current = map.get(id) || { count: 0, latest: null, sources: new Set() };
      current.count += 1;
      if (archive.sourceId) current.sources.add(archive.sourceId);
      if (archive.date && (!current.latest || archive.date > current.latest)) current.latest = archive.date;
      map.set(id, current);
    }
    return map;
  }, [catalog]);

  const coverage = useMemo(() => {
    return ZIMBABWE_CORS_STATIONS.map(station => {
      const meta = indexedByStation.get(station.id);
      return {
        id: station.id,
        name: station.name.split(' (')[0],
        indexed: Boolean(meta),
        archiveCount: meta?.count || 0,
        latest: meta?.latest || null,
        sources: meta ? [...meta.sources] : [],
      };
    });
  }, [indexedByStation]);

  const indexedCount = coverage.filter(s => s.indexed).length;
  const filteredArchives = useMemo(() => {
    const list = catalog?.archives || [];
    if (sourceFilter === 'all') return list;
    return list.filter(a => a.sourceId === sourceFilter);
  }, [catalog, sourceFilter]);

  const displayArchives = filteredArchives.slice(0, 20);
  const healthSummary = healthPayload?.health_summary;

  return (
    <div>
      <div className="cas-tab-header">
        <div>
          <h2 className="cas-tab-title">Data Centre</h2>
          <p className="cas-tab-subtitle">RINEX catalogue, archive coverage, and GNSS data services</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="cas-btn-secondary"
            onClick={() => {
              const payload = buildReportPayload('rinex', { catalog, healthPayload });
              downloadJsonReport(`zingsa-rinex-catalog-${new Date().toISOString().slice(0, 10)}.json`, payload);
            }}
            disabled={!catalog?.archives?.length}
            title="Download RINEX catalogue snapshot (JSON)"
          >
            <Download size={13} /> Export JSON
          </button>
          <button type="button" className="cas-btn-secondary" onClick={refresh} disabled={loading}>
            <RefreshCw size={13} /> Refresh
          </button>
          <button type="button" className="cas-btn-secondary" onClick={() => runScan('tec-analysis')} disabled={ingesting}>
            <Database size={13} /> {ingesting ? 'Scanning…' : 'Scan TEC'}
          </button>
          <button type="button" className="cas-btn-primary" onClick={() => runScan('gnss-apps')} disabled={ingesting}>
            <Database size={13} /> {ingesting ? 'Scanning…' : 'Scan Spider'}
          </button>
        </div>
      </div>

      {error && (
        <div className="cas-info-banner" style={{ marginBottom: 16, borderColor: 'rgba(239,68,68,0.35)', color: '#fca5a5' }}>
          API: {error}
        </div>
      )}
      {ingestMsg && (
        <div className="cas-info-banner" style={{ marginBottom: 16 }}>
          {ingestMsg}
        </div>
      )}

      <div className="cas-stats-row" style={{ marginBottom: 20 }}>
        <div className="cas-stat-card">
          <div className="cas-stat-left">
            <div className="cas-stat-label">Indexed Archives</div>
            <div className="cas-stat-value blue">{catalog?.archiveCount ?? '—'}</div>
            <div className="cas-stat-note">{catalog?.sourceCounts ? formatSourceCounts(catalog.sourceCounts) : 'All configured sources'}</div>
          </div>
        </div>
        <div className="cas-stat-card">
          <div className="cas-stat-left">
            <div className="cas-stat-label">ZimCORS Coverage</div>
            <div className="cas-stat-value green">{indexedCount}/{ZIMBABWE_CORS_STATIONS.length}</div>
            <div className="cas-stat-note">Stations with at least one indexed archive</div>
          </div>
        </div>
        <div className="cas-stat-card">
          <div className="cas-stat-left">
            <div className="cas-stat-label">Health API Blend</div>
            <div className="cas-stat-value" style={{ fontSize: '1rem' }}>
              {healthSummary ? `${healthSummary.operational ?? '—'}/${ZIMBABWE_CORS_STATIONS.length}` : '—'}
            </div>
            <div className="cas-stat-note">
              {healthPayload ? (
                <>
                  {healthTelemetryLabel(healthPayload)}
                  {healthPayload.analysis_date && (
                    <> · health API {new Date(healthPayload.analysis_date).toLocaleString('en-GB')}</>
                  )}
                </>
              ) : 'Operational stations from /api/gnss/station-health'}
            </div>
          </div>
        </div>
        <div className="cas-stat-card">
          <div className="cas-stat-left">
            <div className="cas-stat-label">Date Range</div>
            <div className="cas-stat-value" style={{ fontSize: '1rem' }}>
              {catalog?.dateRange ? `${catalog.dateRange.from} → ${catalog.dateRange.to}` : '—'}
            </div>
            <div className="cas-stat-note">
              {catalog?.updatedAt ? `Index updated ${new Date(catalog.updatedAt).toLocaleString('en-GB')}` : 'From RINEX headers'}
            </div>
          </div>
        </div>
      </div>

      <div className="cas-card" style={{ marginBottom: 16 }}>
        <div className="cas-card-header">
          <span className="cas-card-title">Station Archive Coverage</span>
          <span className="cas-text-muted">{indexedCount} indexed · {ZIMBABWE_CORS_STATIONS.length - indexedCount} awaiting data</span>
        </div>
        <div className="cas-coverage-grid">
          {coverage.map(station => {
            const code = station.id.replace(/_$/, '');
            const title = station.indexed
              ? `${station.archiveCount} archives · latest ${station.latest}`
              : 'No indexed RINEX for this station';
            return (
              <Link
                key={station.id}
                to={`/cors?station=${code}&app=cors-health`}
                className={`cas-coverage-chip ${station.indexed ? 'indexed' : 'missing'}`}
                title={title}
              >
                <strong>{code}</strong>
                <span>{station.indexed ? `${station.archiveCount} files` : 'No index'}</span>
                {station.indexed && station.latest && <small>Latest {station.latest}</small>}
              </Link>
            );
          })}
        </div>
        <p className="cas-coverage-foot">
          Coverage drives <code>GET /api/gnss/station-health</code> archive-derived status.
          Open <Link to="/cors?app=cors-health">National CORS Services</Link> for the network map and NTRIP access.
        </p>
      </div>

      <div className="cas-card">
        <div className="cas-card-header">
          <span className="cas-card-title">Recent RINEX Archives</span>
          <div className="cas-source-tabs">
            {[
              ['all', 'All'],
              ['gnss-apps', 'Spider'],
              ['tec-analysis', 'TEC'],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={sourceFilter === id ? 'active' : ''}
                onClick={() => setSourceFilter(id)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <table className="cas-data-table">
          <thead>
            <tr>
              <th>Station</th>
              <th>Date</th>
              <th>File</th>
              <th>Source</th>
              <th>Size</th>
            </tr>
          </thead>
          <tbody>
            {displayArchives.length ? displayArchives.map(a => (
              <tr key={a.id}>
                <td><span className="cas-station-id">{a.stationId}</span></td>
                <td className="cas-text-mono">{a.date || '—'}</td>
                <td className="cas-text-muted">{a.rinexFile || a.archiveName}</td>
                <td className="cas-text-muted">{SOURCE_LABELS[a.sourceId] || a.sourceId || '—'}</td>
                <td className="cas-text-mono">{a.sizeBytes ? `${(a.sizeBytes / 1024 / 1024).toFixed(1)} MB` : '—'}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan={5} className="cas-text-muted">
                  No archives for this filter. Run <strong>Scan Spider</strong> or <strong>Scan TEC</strong>, or use <code>npm run cors:scan-gnss</code>.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="cas-card" style={{ marginTop: 16 }}>
        <div className="cas-card-header">
          <span className="cas-card-title">Data Services</span>
        </div>
        <div className="cas-recommendation-grid">
          {[
            { icon: FileText, title: 'RINEX 3.04', desc: 'Daily observation files from ZimCORS receivers' },
            { icon: Database, title: 'NTRIP Streams', desc: 'Real-time correction streams for RTK/PPP users' },
            { icon: Download, title: 'Archive Export', desc: 'Bulk download for TEC and deformation studies' },
          ].map(({ icon: Icon, title, desc }) => (
            <article key={title} className="cas-recommendation-card">
              <span><Icon size={14} /></span>
              <div>
                <strong>{title}</strong>
                <p>{desc}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
