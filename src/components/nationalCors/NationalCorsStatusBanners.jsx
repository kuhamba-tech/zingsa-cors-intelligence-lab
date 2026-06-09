import React from 'react';
import { healthTelemetryLabel, isSimulatedHealth } from '../../utils/corsNetworkData.js';

export default function NationalCorsStatusBanners({
  liveMode,
  healthPayload,
  ntripStatus,
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
      {liveMode && ntripStatus?.mode === 'live' && (
        <div className="cil-alert-bar" style={{ background: ntripStatus.online ? 'rgba(29,158,117,0.08)' : 'rgba(239,68,68,0.08)', borderColor: ntripStatus.online ? 'rgba(29,158,117,0.35)' : 'rgba(239,68,68,0.35)', color: ntripStatus.online ? '#6ee7b7' : '#fca5a5' }}>
          <strong style={{ color: ntripStatus.online ? '#34d399' : '#f87171', whiteSpace: 'nowrap' }}>
            🛰 NTRIP Caster:
          </strong>
          <span>
            {ntripStatus.online
              ? `Online · ${ntripStatus.totalMountpoints} active stream${ntripStatus.totalMountpoints !== 1 ? 's' : ''} · ${ntripStatus.host}:${ntripStatus.port}`
              : ntripStatus.unauthorized
                ? `Authentication failed · check NTRIP_USERNAME / NTRIP_PASSWORD`
                : `Offline · ${ntripStatus.host}:${ntripStatus.port}`}
          </span>
        </div>
      )}

      {liveMode && healthPayload && !isSimulatedHealth(healthPayload) && (
        <div className="cil-alert-bar" style={{ background: 'rgba(29,158,117,0.08)', borderColor: 'rgba(29,158,117,0.35)', color: '#6ee7b7' }}>
          <strong style={{ color: '#34d399' }}>Live blend:</strong>
          <span>
            {healthTelemetryLabel(healthPayload)} via <strong>GET /api/gnss/station-health</strong>.
            {healthPayload.analysis_date && <> Health API updated {new Date(healthPayload.analysis_date).toLocaleString('en-GB')}.</>}
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
