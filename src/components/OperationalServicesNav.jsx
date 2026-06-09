import React, { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import '../styles/operational-services-nav.css';

export const OPERATIONAL_LINK_TARGETS = {
  dashboard: '/',
  cors: '/cors?app=cors-health',
  weather: '/weather?region=southern',
  ionosphere: '/ionosphere',
  alerts: '/alerts',
  dataCentre: '/alerts?tab=data-centre',
  observatory: '/observatory',
};

function activeKeyFromPath(pathname, search = '') {
  if (pathname.startsWith('/cors')) return 'cors';
  if (pathname.startsWith('/alerts')) {
    if (new URLSearchParams(search).get('tab') === 'data-centre') return 'dataCentre';
    return 'alerts';
  }
  if (pathname.startsWith('/weather')) return 'weather';
  if (pathname.startsWith('/ionosphere')) return 'ionosphere';
  if (pathname.startsWith('/observatory')) return 'observatory';
  if (pathname === '/') return 'dashboard';
  return null;
}

export function buildOperationalLinks({ stationId } = {}) {
  const station = stationId ? String(stationId).replace(/_$/, '') : null;
  return [
    { key: 'dashboard', to: OPERATIONAL_LINK_TARGETS.dashboard, label: 'Dashboard' },
    {
      key: 'cors',
      to: station ? `/cors?station=${station}&app=cors-health` : OPERATIONAL_LINK_TARGETS.cors,
      label: 'National CORS',
    },
    { key: 'weather', to: OPERATIONAL_LINK_TARGETS.weather, label: 'Space Weather' },
    {
      key: 'ionosphere',
      to: station ? `/ionosphere?station=${station}` : OPERATIONAL_LINK_TARGETS.ionosphere,
      label: 'Ionosphere',
    },
    {
      key: 'alerts',
      to: station ? `/alerts?tab=stations&station=${station}` : OPERATIONAL_LINK_TARGETS.alerts,
      label: 'CORS Alerts',
    },
    { key: 'dataCentre', to: OPERATIONAL_LINK_TARGETS.dataCentre, label: 'Data Centre' },
    { key: 'observatory', to: OPERATIONAL_LINK_TARGETS.observatory, label: 'Astronomy' },
  ];
}

export default function OperationalServicesNav({
  variant = 'cyan',
  stationId,
  extraLinks = [],
  className = '',
  hideCurrent = true,
}) {
  const { pathname, search } = useLocation();
  const current = activeKeyFromPath(pathname, search);

  const links = useMemo(() => {
    const base = buildOperationalLinks({ stationId });
    if (!hideCurrent || !current) return base;
    return base.filter(item => item.key !== current);
  }, [stationId, hideCurrent, current]);

  return (
    <nav
      className={`ops-nav ops-nav--${variant}${className ? ` ${className}` : ''}`}
      aria-label="Related ZINGSA operations"
    >
      {links.map(item => (
        <Link key={item.key} to={item.to} className="ops-nav-link">
          {item.label}
        </Link>
      ))}
      {extraLinks.map(item => (
        <Link key={item.to} to={item.to} className="ops-nav-link ops-nav-link--extra">
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
