import React from 'react';
import { Radio, RefreshCw } from 'lucide-react';

export default function NationalCorsPageHeader({
  liveMode,
  setLiveMode,
  setApiError,
  refreshPageData,
  loading,
  gnssRefreshing,
}) {
  return (
    <header className="cil-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <Radio size={22} color="#ff8c00" />
        <div>
          <div className="cil-header-title">National CORS Services</div>
          <div style={{ fontSize: '0.68rem', color: '#6b7280', marginTop: 2 }}>ZINGSA · Zimbabwe National Geospatial Agency · ZimCORS</div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div className="cil-mode-toggle">
          <button type="button" className={`cil-mode-btn ${!liveMode ? 'active-demo' : ''}`} onClick={() => { setLiveMode(false); setApiError(null); }}>🟡 DEMO</button>
          <button type="button" className={`cil-mode-btn ${liveMode ? 'active-live' : ''}`} onClick={() => { setLiveMode(true); setApiError(null); }}>🔴 LIVE</button>
        </div>
        <span className={`cil-live-badge ${liveMode ? '' : 'demo'}`}><span className="cil-live-dot" />{liveMode ? 'LIVE' : 'DEMO'}</span>
        <button
          type="button"
          className="cil-refresh-btn"
          onClick={refreshPageData}
          disabled={loading || gnssRefreshing}
          title="Refresh network data"
        >
          <RefreshCw size={16} className={loading || gnssRefreshing ? 'cil-spin' : ''} />
        </button>
      </div>
    </header>
  );
}
