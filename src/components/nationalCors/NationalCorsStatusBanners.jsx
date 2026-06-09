import React from 'react';
import { healthTelemetryLabel, isSimulatedHealth } from '../../utils/corsNetworkData.js';

export default function NationalCorsStatusBanners({
  liveMode,
  healthPayload,
  liveError,
  gnssCatalog,
  gnssRefreshing,
  apiError,
  corsAnalysisResult,
  setCorsAnalysisResult,
  refreshPageData,
  loading,
}) {
  return (
    <>
      {liveMode && healthPayload && !isSimulatedHealth(healthPayload) && (
        <div className="cil-alert-bar" style={{ background: 'rgba(29,158,117,0.08)', borderColor: 'rgba(29,158,117,0.35)', color: '#6ee7b7' }}>
          <strong style={{ color: '#34d399' }}>Live blend:</strong>
          <span>
            {healthTelemetryLabel(healthPayload)} via <strong>GET /api/gnss/station-health</strong>.
            {healthPayload.analysis_date && <> Health API updated {new Date(healthPayload.analysis_date).toLocaleString('en-GB')}.</>}
          </span>
        </div>
      )}

      {liveMode && isSimulatedHealth(healthPayload) && (
        <div className="cil-alert-bar" style={{ background: 'rgba(234,179,8,0.08)', borderColor: 'rgba(234,179,8,0.35)', color: '#fde68a' }}>
          <strong style={{ color: '#eab308' }}>Telemetry note:</strong>
          <span>
            {healthTelemetryLabel(healthPayload)} via <strong>GET /api/gnss/station-health</strong>.
            {healthPayload?.index_updated_at && <> RINEX index updated {new Date(healthPayload.index_updated_at).toLocaleString('en-GB')}.</>}
            {healthPayload?.telemetry_fetch_error && <> Telemetry URL unreachable: {healthPayload.telemetry_fetch_error}.</>}
            {' '}Run <code>npm run cors:scan-gnss</code> after adding Spider archives to refresh coverage.
          </span>
        </div>
      )}

      {liveError && (
        <div className="cil-alert-bar"><strong>{liveError.type}:</strong><span>{liveError.message}</span></div>
      )}

      {!liveMode && gnssCatalog && (
        <div className="cil-alert-bar" style={{ background: 'rgba(34,211,238,0.06)', borderColor: 'rgba(34,211,238,0.28)', color: '#a5f3fc' }}>
          <strong style={{ color: '#22d3ee' }}>📡 GNSS Data:</strong>
          <span>
            {gnssRefreshing ? 'Refreshing TEC Analysis RINEX archive…' : (
              <>{gnssCatalog.archiveCount} archives · {gnssCatalog.stationCount} stations
                {gnssCatalog.dateRange && <> · {gnssCatalog.dateRange.from} → {gnssCatalog.dateRange.to}</>}
                {' '}· source: TEC Analysis RINEX</>
            )}
          </span>
          <button
            type="button"
            onClick={refreshPageData}
            disabled={loading || gnssRefreshing}
            style={{ marginLeft: 'auto', background: 'rgba(34,211,238,0.15)', border: '1px solid rgba(34,211,238,0.4)', borderRadius: 6, padding: '4px 12px', color: '#22d3ee', fontWeight: 700, fontSize: '0.7rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            {gnssRefreshing ? '⟳ Scanning…' : '↻ Refresh RINEX'}
          </button>
        </div>
      )}

      {apiError && !liveError && (
        <div className="cil-alert-bar" style={{ background: 'rgba(249,115,22,0.08)', borderColor: 'rgba(249,115,22,0.3)', color: '#fdba74' }}>
          <strong>⚠ API:</strong><span>{apiError}</span>
        </div>
      )}

      {corsAnalysisResult && (
        <div className="cil-alert-bar" style={{ background: 'rgba(29,158,117,0.08)', borderColor: 'rgba(29,158,117,0.35)', color: '#6ee7b7', alignItems: 'center' }}>
          <strong style={{ color: '#34d399', whiteSpace: 'nowrap' }}>✓ Network Check:</strong>
          <span style={{ flex: 1 }}>{corsAnalysisResult}</span>
          <button type="button" onClick={() => setCorsAnalysisResult(null)} style={{ background: 'none', border: 'none', color: '#6ee7b7', cursor: 'pointer', fontSize: '1.1rem', lineHeight: 1, padding: '0 4px', marginLeft: 8 }}>×</button>
        </div>
      )}
    </>
  );
}
