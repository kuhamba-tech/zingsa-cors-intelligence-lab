import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Radio, RefreshCw } from 'lucide-react';

const HEADER_NAV = [
  { label: 'Dashboard',    to: '/' },
  { label: 'dji_m300_rtk_setup', to: '/cors' },
  { label: 'trimble_r12i_setup', to: '/ionosphere' },
  { label: 'rinex_data_guide', to: '/alerts' },
];

export default function NationalCorsPageHeader({
  liveMode,
  setLiveMode,
  setApiError,
  refreshPageData,
  loading,
  gnssRefreshing,
}) {
  const { pathname, search } = useLocation();
  const isActive = (to) => {
    const [path, qs] = to.split('?');
    if (qs) {
      const tab = new URLSearchParams(qs).get('tab');
      return pathname.startsWith(path) && new URLSearchParams(search).get('tab') === tab;
    }
    return path === '/' ? pathname === '/' : pathname.startsWith(path) && !new URLSearchParams(search).get('tab');
  };

  return (
    <header className="cil-header" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 12 }}>
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
              {!liveMode && loading ? '⟳ OFFLINE' : '🟡 OFFLINE'}
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

      <nav className="cil-header-subnav" aria-label="Service navigation">
        {HEADER_NAV.map(({ label, to }) => {
          const active = isActive(to);
          return active ? (
            <span key={to} className="cil-header-subnav-btn active" aria-current="page">{label}</span>
          ) : (
            <Link key={to} to={to} className="cil-header-subnav-btn">{label}</Link>
          );
        })}
      </nav>
    </header>
  );
}
