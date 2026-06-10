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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Radio size={22} color="#ff8c00" />
          <div className="cil-header-title">National CORS Services</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="cil-mode-toggle">
            <button
              type="button"
              className={`cil-mode-btn ${!liveMode ? 'active-demo' : ''}${!liveMode && loading ? ' connecting' : ''}`}
              onClick={() => { setLiveMode(false); setApiError(null); }}
            >
              {!liveMode && loading ? '⟳ RINEX' : '📁 RINEX'}
            </button>
            <button
              type="button"
              className={`cil-mode-btn ${liveMode ? 'active-live' : ''}${liveMode && loading ? ' connecting' : ''}`}
              onClick={() => { setLiveMode(true); setApiError(null); }}
            >
              {liveMode && loading ? '⟳ CONNECTING…' : '🔴 LIVE'}
            </button>
          </div>
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
      </div>
    </header>
  );
}
