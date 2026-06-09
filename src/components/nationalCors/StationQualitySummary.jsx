import React from 'react';
import { Link } from 'react-router-dom';
import { stationDisplayName } from '../../data/zimbabweCorsStations.js';
import { receiverLabel, satelliteSystemLabel, statusLabel } from './stationLabHelpers.js';

export default function StationQualitySummary({
  stations,
  metrics,
  liveMode,
  selectedStationId,
  onSelectStation,
  onOpenIntegrity,
}) {
  const statusMap = Object.fromEntries((metrics?.stationStatuses || []).map(s => [s.id, s.status]));
  const rows = stations.map(station => {
    const id = station.id.replace(/_$/, '');
    const qualityStatus = statusMap[station.id] || station.status || 'online';
    return {
      displayName: stationDisplayName(station),
      siteCode: id,
      stationId: station.id,
      satelliteSystem: satelliteSystemLabel(station.satSys),
      receiver: receiverLabel(station) || '—',
      status: qualityStatus,
    };
  });

  return (
    <section className="cil-quality-summary" id="cors-site-map" aria-label="Station Quality Summary">
      <div className="cil-quality-head">
        <div>
          <div className="cil-quality-breadcrumb">ZimCORS / Station network</div>
          <h3 className="cil-section-title">Station Quality Summary</h3>
        </div>
        <span className="cil-quality-mode">{liveMode ? 'Live API status' : 'Offline / RINEX session'}</span>
      </div>
      <div className="cil-quality-cards">
        {rows.map(row => (
          <article
            key={row.siteCode}
            className={`cil-quality-card ${row.stationId === selectedStationId ? 'active' : ''}`}
            onClick={() => onSelectStation?.(row.stationId)}
          >
            <div className="cil-quality-card-top">
              <strong>{row.displayName}</strong>
              <span className={`cil-quality-status ${row.status}`}>{statusLabel(row.status)}</span>
            </div>
            <div className="cil-quality-card-meta">
              <span>{row.satelliteSystem}</span>
              <span>{row.receiver}</span>
            </div>
            <div className="cil-quality-actions">
              <button type="button" onClick={(e) => { e.stopPropagation(); onSelectStation?.(row.stationId); }}>Map</button>
              <button type="button" onClick={(e) => { e.stopPropagation(); onOpenIntegrity?.(row.stationId); }}>Integrity</button>
              <Link to={`/alerts?tab=stations&station=${row.siteCode}`} className="cil-quality-link" onClick={e => e.stopPropagation()}>Alerts</Link>
              <Link to={`/ionosphere?station=${row.siteCode}`} className="cil-quality-link" onClick={e => e.stopPropagation()}>Ionosphere</Link>
            </div>
          </article>
        ))}
      </div>
      <div className="cil-quality-table-wrap">
        <table className="cil-quality-table">
          <thead>
            <tr>
              {['Station', 'Code', 'GNSS', 'Receiver', 'Status', 'Actions'].map(label => (
                <th key={label}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr
                key={row.siteCode}
                className={row.stationId === selectedStationId ? 'cil-quality-row-active' : 'cil-quality-row'}
                onClick={() => onSelectStation?.(row.stationId)}
              >
                <td>{row.displayName}</td>
                <td>{row.siteCode}</td>
                <td>{row.satelliteSystem}</td>
                <td>{row.receiver}</td>
                <td>
                  <span className={`cil-quality-status ${row.status}`}>
                    {statusLabel(row.status)}
                  </span>
                </td>
                <td className="cil-quality-actions">
                  <button type="button" onClick={(e) => { e.stopPropagation(); onSelectStation?.(row.stationId); }}>Map</button>
                  <button type="button" onClick={(e) => { e.stopPropagation(); onOpenIntegrity?.(row.stationId); }}>Integrity</button>
                  <Link to={`/alerts?tab=stations&station=${row.siteCode}`} className="cil-quality-link" onClick={e => e.stopPropagation()}>Alerts</Link>
                  <Link to={`/ionosphere?station=${row.siteCode}`} className="cil-quality-link" onClick={e => e.stopPropagation()}>Ionosphere</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
