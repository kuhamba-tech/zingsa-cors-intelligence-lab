import React, { useState } from 'react';
import { Database, Download, RefreshCw, FileText } from 'lucide-react';
import { ingestCorsData } from '../services/corsApi.js';
import { useCorsAlertData } from '../context/CorsAlertDataContext.jsx';

export default function DataCentreView() {
  const { catalog, loading, refresh, error } = useCorsAlertData();
  const [ingesting, setIngesting] = useState(false);
  const [ingestMsg, setIngestMsg] = useState(null);

  const handleIngest = async () => {
    setIngesting(true);
    setIngestMsg(null);
    try {
      const result = await ingestCorsData({ limit: 10, extract: false });
      setIngestMsg(`Indexed ${result.indexed ?? result.processed ?? 0} archives.`);
      await refresh();
    } catch (err) {
      setIngestMsg(err.message);
    } finally {
      setIngesting(false);
    }
  };

  const archives = catalog?.archives?.slice(0, 12) || [];

  return (
    <div>
      <div className="cas-tab-header">
        <div>
          <h2 className="cas-tab-title">Data Centre</h2>
          <p className="cas-tab-subtitle">RINEX catalogue, archive readiness, and GNSS data services</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="cas-btn-secondary" onClick={refresh} disabled={loading}>
            <RefreshCw size={13} /> Refresh
          </button>
          <button type="button" className="cas-btn-primary" onClick={handleIngest} disabled={ingesting}>
            <Database size={13} /> {ingesting ? 'Scanning…' : 'Scan Archives'}
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
            <div className="cas-stat-note">TEC Analysis RINEX source</div>
          </div>
        </div>
        <div className="cas-stat-card">
          <div className="cas-stat-left">
            <div className="cas-stat-label">Stations in Index</div>
            <div className="cas-stat-value green">{catalog?.stationCount ?? '—'}</div>
            <div className="cas-stat-note">ZimCORS network coverage</div>
          </div>
        </div>
        <div className="cas-stat-card">
          <div className="cas-stat-left">
            <div className="cas-stat-label">Date Range</div>
            <div className="cas-stat-value" style={{ fontSize: '1rem' }}>
              {catalog?.dateRange ? `${catalog.dateRange.from} → ${catalog.dateRange.to}` : '—'}
            </div>
            <div className="cas-stat-note">From RINEX observation headers</div>
          </div>
        </div>
      </div>

      <div className="cas-card">
        <div className="cas-card-header">
          <span className="cas-card-title">Recent RINEX Archives</span>
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
            {archives.length ? archives.map(a => (
              <tr key={a.id}>
                <td><span className="cas-station-id">{a.stationId}</span></td>
                <td className="cas-text-mono">{a.date || '—'}</td>
                <td className="cas-text-muted">{a.rinexFile || a.archiveName}</td>
                <td className="cas-text-muted">{a.sourceId || 'tec-analysis'}</td>
                <td className="cas-text-mono">{a.sizeBytes ? `${(a.sizeBytes / 1024 / 1024).toFixed(1)} MB` : '—'}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan={5} className="cas-text-muted">No archives indexed. Run Scan Archives or npm run cors:scan-gnss.</td>
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
              <Icon size={16} />
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
