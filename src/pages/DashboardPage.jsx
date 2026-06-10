import React, { useCallback, useEffect, useState } from 'react';
import { BarChart3, CloudSun, Database, Radio, RefreshCw, ShieldCheck, Telescope, Waves } from 'lucide-react';
import { fetchAfricaSpaceWeather, fetchLiveKp, getDemoSpaceWeather } from '../services/spaceWeatherApi.js';
import OperationalServicesNav, { OPERATIONAL_LINK_TARGETS } from '../components/OperationalServicesNav.jsx';
import { useOpsHealth } from '../context/OpsHealthContext.jsx';
import { healthTelemetryLabel, isSimulatedHealth } from '../utils/corsNetworkData.js';

const dashboardLinks = [
  {
    id: 'alerts',
    title: 'CORS Alert Dashboard',
    eyebrow: 'Mission overview',
    desc: 'Real-time CORS network map, active alerts, GNSS signal quality, and system health at a glance.',
    icon: BarChart3,
    color: '#a78bfa',
  },
  {
    id: 'cors',
    title: 'National CORS Services',
    eyebrow: 'Station analysis',
    desc: 'ZimCORS network status, NTRIP access, station map, integrity panels, and live or RINEX-based analysis.',
    icon: Radio,
    color: '#ff8c00',
  },
  {
    id: 'weather',
    title: 'Space Weather',
    eyebrow: 'National, Africa and Global',
    desc: 'National, Africa and Global space weather risk, ionospheric impacts, sector alerts, and monitoring centers.',
    icon: CloudSun,
    color: '#22d3ee',
  },
  {
    id: 'ionosphere',
    title: 'Ionospheric Conditions',
    eyebrow: 'GNSS propagation',
    desc: 'Monitor TEC, scintillation S4, RTK status, and positioning impact across ZimCORS stations.',
    icon: Waves,
    color: '#22d3ee',
  },
  {
    id: 'observatory',
    title: 'Astronomy Observatory',
    eyebrow: 'Observatory',
    desc: 'Stellarium sky map, telescope simulator, and night sky viewer for observatory operations.',
    icon: Telescope,
    color: '#a78bfa',
  },
  {
    id: 'tec',
    title: 'TEC App',
    eyebrow: 'TEC analysis',
    desc: 'Local-made application for Total Electron Content measurement in Zimbabwe.',
    icon: Database,
    color: '#22d3ee',
    path: '/ionosphere?tab=tec',
  },
];

function kpLabel(kp) {
  if (kp < 2) return 'Quiet';
  if (kp < 4) return 'Unsettled';
  if (kp < 5) return 'Active';
  return 'Storm watch';
}

export default function DashboardPage({ onNavigate }) {
  const {
    healthPayload,
    networkMetrics,
    loading: healthLoading,
    refresh: refreshHealth,
    stationIssues,
    alertCount,
    alertsPath,
  } = useOpsHealth();

  const [kp, setKp] = useState(null);
  const [kpMode, setKpMode] = useState('demo');
  const [kpUpdated, setKpUpdated] = useState(null);
  const [kpLoading, setKpLoading] = useState(true);

  const refreshKp = useCallback(async () => {
    setKpLoading(true);
    try {
      let space;
      try {
        space = await fetchAfricaSpaceWeather();
      } catch {
        space = await fetchLiveKp();
      }
      setKp(Number(space?.kp_index) || 2);
      setKpMode(space?.mode || 'live');
      setKpUpdated(space?.timestamp ? new Date(space.timestamp) : null);
    } catch {
      const demo = getDemoSpaceWeather();
      setKp(demo.kp_index);
      setKpMode('demo');
      setKpUpdated(demo.timestamp ? new Date(demo.timestamp) : null);
    } finally {
      setKpLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshKp();
    const id = setInterval(refreshKp, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [refreshKp]);

  const loading = healthLoading || kpLoading;
  const healthUnavailable = !healthLoading && !healthPayload;
  const totalStations = networkMetrics.total;
  const healthPct = healthPayload ? networkMetrics.healthPct : null;
  const archiveDerived = healthPayload?.health_summary?.archive_derived;
  const hasStationIssues = stationIssues > 0;
  const hasActiveAlerts = alertCount > 0;

  const openPage = (id, path) => {
    onNavigate?.(id, path || OPERATIONAL_LINK_TARGETS[id]);
  };

  const openAlertsHub = () => {
    if (!healthLoading && healthPayload && (hasStationIssues || hasActiveAlerts)) {
      onNavigate?.('alerts', alertsPath);
    } else {
      openPage('alerts');
    }
  };

  const loadSnapshot = () => Promise.all([refreshHealth(), refreshKp()]);
  const onlinePct = healthPayload ? networkMetrics.healthPct : null;

  const statusCards = [
    {
      label: 'ZimCORS Network',
      value: healthUnavailable ? 'Unavailable' : loading ? '…' : `${networkMetrics.online}/${totalStations} online`,
      note: healthUnavailable
        ? 'Station-health API did not respond — open National CORS or retry refresh'
        : healthPayload
          ? `Network health ${onlinePct ?? '—'}% · ${networkMetrics.degraded} degraded · ${networkMetrics.offline} offline · ${healthTelemetryLabel(healthPayload)}`
          : 'Zimbabwe station health and integrity',
      color: onlinePct == null ? '#22d3ee' : onlinePct >= 80 ? '#1D9E75' : '#EF9F27',
      icon: Radio,
      action: () => openPage('cors'),
    },
    {
      label: 'RINEX Archive Index',
      value: loading ? '…' : archiveDerived != null ? `${archiveDerived}/${totalStations} indexed` : '—',
      note: healthPayload?.index_updated_at
        ? `Index updated ${new Date(healthPayload.index_updated_at).toLocaleString('en-GB')}`
        : 'Spider + TEC archives drive archive-derived health',
      color: '#a78bfa',
      icon: Database,
      action: () => onNavigate?.('alerts', OPERATIONAL_LINK_TARGETS.dataCentre),
    },
    {
      label: 'Space Weather',
      value: loading ? '…' : kp != null ? `Kp ${kp.toFixed(1)} · ${kpLabel(kp)}` : 'National, Africa and Global',
      note: kpMode === 'live'
        ? `NOAA SWPC live Kp${kpUpdated ? ` · ${kpUpdated.toLocaleString('en-GB')}` : ''}${kp != null && kp >= 4 ? ' · elevated — review ionosphere impacts' : ''}`
        : 'Demo Kp model — open Space Weather for NOAA feeds',
      color: '#22d3ee',
      icon: CloudSun,
      action: () => openPage('weather', kp != null && kp >= 4 ? '/weather?region=southern' : OPERATIONAL_LINK_TARGETS.weather),
    },
    {
      label: 'Data Centre',
      value: 'Data Centre',
      note: 'RINEX catalogue, archive coverage, and GNSS data services',
      color: '#22d3ee',
      icon: Database,
      action: () => onNavigate?.('alerts', OPERATIONAL_LINK_TARGETS.dataCentre),
    },
  ];

  const openHeroStatus = () => {
    if (!healthLoading && healthPayload && (hasStationIssues || hasActiveAlerts)) {
      openAlertsHub();
    } else {
      openPage('cors');
    }
  };

  return (
    <main className="dashboard-page">
      <section className="dashboard-hero">
        <div className="dashboard-hero-copy">
          <h1>National CORS Operations Dashboard</h1>
          <p>
            Monitoring Zimbabwe&apos;s continuously operating reference stations,
            GNSS data services, and positioning infrastructure.
          </p>
        </div>
        <div className="dashboard-hero-logo" aria-label="ZINGSA logo">
          <div className="dashboard-hero-logo-disc">
            <img src="/zingsa-logo-official.png" alt="ZINGSA" />
          </div>
        </div>
        <div className="dashboard-hero-actions">
          <button type="button" className="dashboard-refresh-btn" onClick={loadSnapshot} disabled={loading} title="Refresh live snapshot">
            <RefreshCw size={16} className={loading ? 'dashboard-spin' : ''} />
          </button>
          <button
            type="button"
            className="dashboard-hero-status dashboard-hero-status--clickable"
            aria-label="Dashboard status — open station health"
            onClick={openHeroStatus}
          >
            <ShieldCheck size={22} />
            <div>
              <span>System View</span>
              <strong>
                {loading
                  ? 'Updating…'
                  : healthUnavailable
                    ? 'Health API unavailable'
                    : networkMetrics.offline > 0
                      ? `${networkMetrics.offline} station${networkMetrics.offline === 1 ? '' : 's'} offline`
                      : hasActiveAlerts
                        ? `${networkMetrics.alertCount} active alert${networkMetrics.alertCount === 1 ? '' : 's'}`
                        : healthPct >= 70
                          ? 'Operational'
                          : 'Review'}
              </strong>
              {!loading && healthPayload && (hasStationIssues || hasActiveAlerts) && (
                <small style={{ display: 'block', color: '#94a3b8', fontSize: '0.72rem', marginTop: 4 }}>
                  {networkMetrics.online} online · {networkMetrics.degraded} degraded
                  {hasActiveAlerts ? ` · ${networkMetrics.criticalCount} critical · ${networkMetrics.warningCount} warning` : ''}
                  {kpMode === 'live' ? ` · Kp ${kp?.toFixed(1)} live` : ''}
                </small>
              )}
            </div>
          </button>
        </div>
      </section>

      <OperationalServicesNav variant="cyan" className="ops-nav--inline dashboard-ops-nav" />

      {healthPayload && isSimulatedHealth(healthPayload) && (
        <div className="dashboard-data-banner" role="status">
          <strong>Archive-backed network health</strong>
          <span>{healthTelemetryLabel(healthPayload)}</span>
        </div>
      )}

      <section className="dashboard-status-grid" aria-label="Operational status">
        {statusCards.map(({ label, value, note, color, icon: Icon, action }) => (
          <article
            key={label}
            className={`dashboard-status-card${action ? ' dashboard-status-card--clickable' : ''}`}
            style={{ '--accent': color }}
            onClick={action}
            onKeyDown={action ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); action(); } } : undefined}
            role={action ? 'button' : undefined}
            tabIndex={action ? 0 : undefined}
          >
            <div className="dashboard-card-icon"><Icon size={18} /></div>
            <div>
              <span>{label}</span>
              <strong>{value}</strong>
              <p>{note}</p>
            </div>
          </article>
        ))}
      </section>

      <section className="dashboard-link-grid" aria-label="Dashboard navigation">
        {dashboardLinks.map(({ id, title, eyebrow, desc, icon: Icon, color, path }) => {
          const linkDesc = id === 'alerts' && !healthLoading && (hasActiveAlerts || hasStationIssues)
            ? `${desc} ${
              hasActiveAlerts
                ? `${networkMetrics.alertCount} active alert${networkMetrics.alertCount === 1 ? '' : 's'}`
                : `${stationIssues} station${stationIssues === 1 ? '' : 's'} need review`
            }.`
            : desc;
          const linkPath = id === 'alerts' && (hasActiveAlerts || hasStationIssues)
            ? alertsPath
            : id === 'cors' && networkMetrics.offline > 0
              ? '/cors?app=cors-health'
              : path;
          return (
          <article key={id} className="dashboard-link-card" style={{ '--accent': color }}>
            <div className="dashboard-link-head">
              <div className="dashboard-link-icon"><Icon size={22} /></div>
              <span>{eyebrow}</span>
            </div>
            <h2>{title}</h2>
            <p>{linkDesc}</p>
            <button type="button" onClick={() => openPage(id, linkPath)}>
              {`Open ${title}`}
            </button>
          </article>
          );
        })}
      </section>
    </main>
  );
}
