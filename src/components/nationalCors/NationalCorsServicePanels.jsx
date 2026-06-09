import React from 'react';
import { Link } from 'react-router-dom';
import { ZIMCORS_SERVICE } from '../../data/corsIntelligenceLabData.js';
import { ZIMBABWE_CORS_STATIONS } from '../../data/zimbabweCorsStations.js';
import { healthTelemetryLabel, isSimulatedHealth, summarizeZimHealth } from '../../utils/corsNetworkData.js';
import { OPERATIONAL_LINK_TARGETS } from '../OperationalServicesNav.jsx';

export function DedicatedMonitorBanner({ appView, stationId }) {
  if (!appView?.fullPage) return null;
  const code = stationId ? String(stationId).replace(/_$/, '') : null;
  const to = appView.fullPage === 'ionosphere' && code
    ? `/ionosphere?station=${code}`
    : OPERATIONAL_LINK_TARGETS[appView.fullPage] || `/${appView.fullPage}`;
  return (
    <div className="cil-fullpage-banner">
      <span>
        This tab shows a <strong>{appView.label}</strong> summary inside National CORS Services.
        Open the dedicated monitor for full maps, alerts, and trend charts.
      </span>
      <Link to={to} className="cil-fullpage-banner-link">
        Open {appView.label} monitor →
      </Link>
    </div>
  );
}

export function NationalServiceHero({
  regionId, metrics, healthPayload, liveMode, loading, copyShareLink, shareCopied,
}) {
  if (regionId !== 'zimbabwe' || !metrics) return null;
  const zimIds = ZIMBABWE_CORS_STATIONS.map(s => s.id);
  const healthStats = summarizeZimHealth(healthPayload, zimIds);
  const total = healthStats.total;
  const statusList = metrics.stationStatuses || [];
  const onlineCount = healthPayload ? healthStats.online : statusList.filter(s => s.status === 'online').length;
  const healthPct = total ? Math.round((onlineCount / total) * 100) : 0;
  const updated = healthPayload?.analysis_date
    ? `${new Date(healthPayload.analysis_date).toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short', timeZone: 'UTC' })} UTC`
    : '—';

  return (
    <section className="cil-national-hero" aria-label="ZimCORS national service overview">
      <div className="cil-national-hero-main">
        <div className="cil-national-kicker">Zimbabwe National CORS Service</div>
        <h2 className="cil-national-title">CORS Network Operations</h2>
        <p className="cil-national-copy">
          {total} reference stations across Zimbabwe · {onlineCount} reporting online · Network health {healthPct}%
          {metrics.ipLevel && <> · Ionospheric perturbation <strong style={{ color: metrics.ipColor }}>{metrics.ipLevel}</strong></>}
        </p>
        <div className="cil-national-chips">
          <span className={`cil-national-chip ${liveMode ? 'live' : 'demo'}`}>{liveMode ? 'Live monitoring' : 'Offline / RINEX analysis'}</span>
          <span className="cil-national-chip">AFREF · IGS · NTRIP</span>
          <span className="cil-national-chip muted">Updated {updated}</span>
        </div>
      </div>
    </section>
  );
}

function buildNationalCorsAnalysis({
  metrics, healthPayload, liveMode, regionId, stationId, stations, applicationLabel, corsRisk, personaSummary,
}) {
  const station = stations.find(s => s.id === stationId);
  const stationName = station?.name?.split(' (')[0] || stationId;
  const statusList = metrics?.stationStatuses || [];
  const onlineCount = statusList.filter(s => s.status === 'online').length;
  const total = statusList.length || ZIMBABWE_CORS_STATIONS.length;
  const healthPct = total ? Math.round((onlineCount / total) * 100) : 0;
  const offline = statusList.filter(s => s.status === 'offline');
  const degraded = statusList.filter(s => s.status === 'degraded' || s.status === 'warning');

  const headline = corsRisk.level === 'HIGH'
    ? 'National CORS network needs attention — multiple stations are offline or degraded'
    : corsRisk.level === 'MODERATE'
      ? 'Mixed network conditions — verify RTK before precision surveying'
      : 'ZimCORS network is operating within normal service limits';

  return {
    headline,
    summary: `${applicationLabel} for ${stationName} (${regionId === 'zimbabwe' ? 'Zimbabwe' : regionId}): ${onlineCount}/${total} stations online (${healthPct}% health). IP index ${metrics?.ipIndex ?? '—'}/100 (${metrics?.ipLevel || '—'}). ${liveMode ? 'Live NOAA Kp and health API feeds are active.' : 'Offline mode is analysing indexed RINEX archives for the selected session.'}`,
    mapNote: regionId === 'zimbabwe'
      ? 'The map shows all ZimCORS reference stations. Click a marker or table row to monitor a site and open integrity details.'
      : 'This region shows reference ionosphere context. Full ZimCORS health mapping is available for Zimbabwe.',
    networkNote: offline.length
      ? `Offline: ${offline.map(s => s.id.replace(/_$/, '')).join(', ')}.${degraded.length ? ` Degraded: ${degraded.map(s => s.id.replace(/_$/, '')).join(', ')}.` : ''}`
      : degraded.length
        ? `All stations reachable; degraded: ${degraded.map(s => s.id.replace(/_$/, '')).join(', ')}.`
        : 'All monitored stations are reporting acceptable status.',
    serviceNote: `NTRIP corrections are available via ${ZIMCORS_SERVICE.caster}:${ZIMCORS_SERVICE.port} using mountpoint ${ZIMCORS_SERVICE.mountpointPattern.replace('{STATION}', String(stationId).replace(/_$/, ''))}. Datum: ${ZIMCORS_SERVICE.datum}.`,
    recommendations: [
      healthPct < 70 ? 'Review offline stations in the Alert System before deploying field RTK crews.' : 'Network health supports routine RTK and PPP operations for most daylight work.',
      (metrics?.ipIndex ?? 0) >= 50 ? 'Ionospheric perturbation is elevated — cross-check the Ionospheric Conditions Monitor before evening surveys.' : 'Ionospheric conditions are not amplifying positioning risk beyond normal equatorial limits.',
      liveMode ? 'Continue live monitoring through the CORS health API and publish status to field teams via NTRIP.' : 'Switch to LIVE mode for operational station telemetry, or refresh RINEX for archive-based analysis.',
      personaSummary || 'Use persona views under Analysis for surveyor, student, and policy guidance.',
    ],
    dataMode: liveMode
      ? isSimulatedHealth(healthPayload)
        ? `LIVE mode · ${healthTelemetryLabel(healthPayload)} · ${healthPayload?.analysis_date ? new Date(healthPayload.analysis_date).toISOString().slice(11, 16) : '—'} UTC`
        : `Live blend · health updated ${healthPayload?.analysis_date ? new Date(healthPayload.analysis_date).toISOString().slice(11, 16) : '—'} UTC`
      : 'Offline / RINEX archive session — connect LIVE APIs for operational decisions',
  };
}

export function NationalCorsAnalysis({
  metrics, healthPayload, liveMode, regionId, stationId, stations, applicationLabel, corsRisk, personaSummary,
}) {
  if (!metrics) return null;
  const analysis = buildNationalCorsAnalysis({
    metrics, healthPayload, liveMode, regionId, stationId, stations, applicationLabel, corsRisk, personaSummary,
  });

  return (
    <section className="cil-analysis-section">
      <div className="cil-analysis-head">
        <div>
          <div className="cil-analysis-kicker">Live interpretation</div>
          <h2 className="cil-analysis-title">What is happening on this page</h2>
        </div>
        <code className="cil-analysis-api">GET /api/gnss/station-health</code>
      </div>
      <p className="cil-analysis-headline">{analysis.headline}</p>
      <p className="cil-analysis-copy">{analysis.summary}</p>
      <div className="cil-analysis-grid">
        <article className="cil-analysis-card">
          <h3>Network map</h3>
          <p>{analysis.mapNote}</p>
        </article>
        <article className="cil-analysis-card">
          <h3>Station status</h3>
          <p>{analysis.networkNote}</p>
        </article>
      </div>
      <div className="cil-analysis-recs">
        <h3>Operational guidance</h3>
        <ul>
          {analysis.recommendations.map(item => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
      <p className="cil-analysis-foot">{analysis.dataMode}</p>
    </section>
  );
}
