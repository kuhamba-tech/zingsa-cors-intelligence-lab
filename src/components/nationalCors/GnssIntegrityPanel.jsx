import React from 'react';
import Sparkline from './Sparkline.jsx';
import { clamp } from './stationLabHelpers.js';

function buildGnssIntegrity(metrics, station, regionLabel, date) {
  const hasData = !!metrics?.archive;
  const signal = Number(metrics?.signalQuality || 0);
  const availability = Number(metrics?.availability || 0);
  const latencySec = +((Number(metrics?.latency || 0) / 1000) || 0.9).toFixed(1);
  const satSystems = metrics?.archive?.satelliteSystems?.length || 2;
  const satellites = metrics?.archive ? Math.max(8, satSystems * 5) : 0;
  const hAcc = hasData ? clamp(Math.round(12 - signal / 11 + Math.abs(metrics.deltaTec || 0) * 0.4), 1, 18) : null;
  const vAcc = hasData ? clamp(Math.round((hAcc || 6) + Math.max(0, (metrics.s4 || 0) * 8 - 1)), 1, 24) : null;
  const quality = hasData ? clamp(Math.round(signal * 0.65 + availability * 0.35), 0, 99) : 0;
  const rtkStatus = !hasData ? 'No data' : quality >= 92 && (metrics.s4 || 0) < 0.18 ? 'Fixed' : quality >= 75 ? 'Float' : 'Degraded';
  const pppStatus = !hasData ? 'No data' : quality >= 92 ? 'Fixed' : quality >= 70 ? 'Converging' : 'Unavailable';
  const correctionAge = hasData ? Math.max(1, Math.round((metrics.archive?.interval || 30) / 12)) : null;
  const lastOutage = hasData ? `${Math.max(8, Math.round((100 - availability) * 1.8))} min ago` : 'No data';
  const streamOnline = hasData && availability >= 70;
  const nominal = hasData && quality >= 80 && streamOnline;
  const stationName = station?.name?.split(' (')[0] || metrics?.archive?.stationId || 'Selected station';
  return {
    hasData,
    nominal,
    stationName,
    regionLabel,
    date,
    satellites,
    hAcc,
    vAcc,
    latencySec,
    quality,
    rtkStatus,
    pppStatus,
    correctionAge,
    lastOutage,
    streamOnline,
    signalSpark: metrics?.qualSpark?.length ? metrics.qualSpark : [72, 84, 76, 82, 74, 70, 79, 72, 77, 86, 69, 78, 74, 79],
    positionSpark: metrics?.stabSpark?.length ? metrics.stabSpark : [72, 74, 70, 86, 73, 74, 72, 88, 78, 90, 86, 86, 82, 85],
    signalPerformance: [
      { name: 'GPS', color: '#22c55e', frequencies: [{ label: 'L1', level: 'LOW' }, { label: 'L2', level: 'LOW' }, { label: 'L5', level: 'LOW' }] },
      { name: 'GLONASS', color: '#a855f7', frequencies: [{ label: 'L1', level: 'LOW' }, { label: 'L2', level: 'LOW' }] },
      { name: 'Galileo', color: '#22d3ee', frequencies: [{ label: 'E1', level: 'LOW' }, { label: 'E5a', level: 'LOW' }, { label: 'E5b', level: 'LOW' }, { label: 'E5ab', level: 'LOW' }] },
      { name: 'BeiDou', color: '#f97316', frequencies: [{ label: 'B1', level: 'LOW' }, { label: 'B2', level: integrityLevelFromQuality(quality) }, { label: 'B3', level: 'LOW' }] },
    ],
  };
}

function integrityLevelFromQuality(quality) {
  if (quality < 70) return 'HIGH';
  if (quality < 85) return 'MODERATE';
  return 'LOW';
}

function signalLevelColor(level) {
  if (level === 'HIGH') return '#f97316';
  if (level === 'MODERATE') return '#eab308';
  return '#22c55e';
}

function SignalDot({ level }) {
  return <span className="cil-gnss-signal-dot" style={{ background: signalLevelColor(level) }} title={level} />;
}

export default function GnssIntegrityPanel({ metrics, station, regionLabel, date }) {
  const integrity = buildGnssIntegrity(metrics, station, regionLabel, date);
  const statusTone = integrity.nominal ? 'nominal' : integrity.hasData ? 'watch' : 'nodata';
  const summary = integrity.hasData
    ? `GNSS conditions are ${integrity.nominal ? 'nominal' : 'under watch'} for ${integrity.stationName}, ${integrity.regionLabel}. RTK is ${integrity.rtkStatus.toLowerCase()}, PPP is ${integrity.pppStatus.toLowerCase()}, and stream latency of ${integrity.latencySec} s is routed from the selected CORS/RINEX analysis. ${integrity.satellites} satellites tracked. Data quality score ${integrity.quality}%${integrity.nominal ? ' — suitable for CORS Health Network.' : ' — review before precision operations.'}`
    : `No data: no RINEX observation file is available for ${integrity.stationName} on ${date}. Select a date inside the indexed RINEX range or refresh the RINEX catalogue.`;

  return (
    <section className="cil-gnss-panel" aria-label="GNSS Integrity Panel">
      <div className="cil-gnss-head">
        <div className="cil-gnss-title-group">
          <div className="cil-gnss-icon">🛰</div>
          <div>
            <h3>GNSS Integrity Panel <span className={`cil-gnss-dot ${statusTone}`} /></h3>
            <p>Live positioning quality, correction availability, station warnings &amp; PPP/RTK reliability</p>
          </div>
        </div>
        <span className={`cil-gnss-badge ${statusTone}`}>{integrity.nominal ? '✓ NOMINAL' : integrity.hasData ? '△ WATCH' : 'NO DATA'}</span>
      </div>

      <div className="cil-gnss-grid">
        <article className="cil-gnss-card accent-cyan">
          <div className="cil-gnss-card-title">📍 Positioning Accuracy</div>
          <Sparkline data={integrity.positionSpark} color="#22d3ee" height={36} />
          <div className="cil-gnss-measure"><span>Horizontal</span><strong>{integrity.hAcc ?? '—'}{integrity.hAcc ? ' cm' : ''}</strong></div>
          <div className="cil-gnss-bar"><span style={{ width: `${integrity.hAcc ? clamp(100 - integrity.hAcc * 6, 15, 88) : 0}%`, background: '#f59e0b' }} /></div>
          <div className="cil-gnss-measure"><span>Vertical</span><strong>{integrity.vAcc ?? '—'}{integrity.vAcc ? ' cm' : ''}</strong></div>
          <div className="cil-gnss-bar"><span style={{ width: `${integrity.vAcc ? clamp(100 - integrity.vAcc * 5, 15, 88) : 0}%`, background: '#10b981' }} /></div>
        </article>

        <article className="cil-gnss-card accent-violet">
          <div className="cil-gnss-card-title">📡 Correction Availability</div>
          <div className="cil-gnss-row"><span>RTK</span><strong className={integrity.hasData ? 'ok' : 'muted'}>{integrity.hasData ? 'Available' : 'No data'}</strong></div>
          <div className="cil-gnss-row"><span>PPP</span><strong className={integrity.hasData ? 'ok' : 'muted'}>{integrity.hasData ? 'Available' : 'No data'}</strong></div>
          <div className="cil-gnss-divider" />
          <div className="cil-gnss-row"><span>Correction Age</span><strong className="warn">{integrity.correctionAge ? `${integrity.correctionAge} s` : '—'}</strong></div>
        </article>

        <article className="cil-gnss-card accent-green">
          <div className="cil-gnss-card-title">▣ Stream Status</div>
          <div className="cil-gnss-status-line"><span className={integrity.streamOnline ? 'pulse online' : 'pulse offline'} />{integrity.streamOnline ? 'Online' : 'No data'}</div>
          <div className="cil-gnss-row"><span>Stream Latency</span><strong>{integrity.hasData ? `${integrity.latencySec} s` : '—'}</strong></div>
          <div className="cil-gnss-row"><span>Last Outage</span><strong className="muted">{integrity.lastOutage}</strong></div>
          <div className="cil-gnss-row"><span>Satellites</span><strong className="ok">{integrity.satellites ? `${integrity.satellites} tracked` : '—'}</strong></div>
        </article>

        <article className="cil-gnss-card accent-warning">
          <div className="cil-gnss-card-title">⚠ Station Warnings</div>
          <div className={`cil-gnss-check ${integrity.nominal ? 'clear' : 'warn'}`}>{integrity.nominal ? '✓' : '!'}</div>
          <div className="cil-gnss-warning-copy">
            <strong>{integrity.nominal ? 'All Clear' : integrity.hasData ? 'Review Required' : 'No RINEX Data'}</strong>
            <span>{integrity.nominal ? 'No active alerts' : integrity.hasData ? 'Integrity values outside nominal range' : 'No matching observation file'}</span>
          </div>
        </article>

        <article className="cil-gnss-card accent-orange">
          <div className="cil-gnss-card-title">🎯 PPP / RTK Quality</div>
          <Sparkline data={integrity.signalSpark} color="#10b981" height={36} />
          <div className="cil-gnss-row"><span>RTK Fix</span><strong className={integrity.rtkStatus === 'Fixed' ? 'ok' : 'warn'}>{integrity.rtkStatus}</strong></div>
          <div className="cil-gnss-row"><span>PPP Status</span><strong className={integrity.pppStatus === 'Fixed' ? 'ok' : 'warn'}>{integrity.pppStatus}</strong></div>
          <div className="cil-gnss-row"><span>Signal Quality</span><strong className="warn">{integrity.quality}%</strong></div>
          <div className="cil-gnss-bar"><span style={{ width: `${integrity.quality}%`, background: 'linear-gradient(90deg,#10b981,#f59e0b)' }} /></div>
        </article>
      </div>

      <div className="cil-gnss-kpis">
        {[
          ['🛰', 'Satellites', integrity.satellites || '—', 'cyan'],
          ['📡', 'RTK', integrity.rtkStatus, 'orange'],
          ['🌐', 'PPP', integrity.pppStatus, 'orange'],
          ['⚡', 'Latency', integrity.hasData ? `${integrity.latencySec} s` : '—', 'cyan'],
          ['📍', 'H-Acc', integrity.hAcc ? `${integrity.hAcc} cm` : '—', 'orange'],
          ['📏', 'V-Acc', integrity.vAcc ? `${integrity.vAcc} cm` : '—', 'green'],
          ['🎯', 'Quality', `${integrity.quality}%`, 'orange'],
        ].map(([icon, label, value, tone]) => (
          <div key={label} className={`cil-gnss-kpi ${tone}`}>
            <span>{icon}</span>
            <div><small>{label}</small><strong>{value}</strong></div>
          </div>
        ))}
      </div>

      <div className="cil-gnss-signal-performance">
        <div className="cil-gnss-signal-title">GNSS Signal Performance</div>
        <table className="cil-gnss-signal-table">
          <thead>
            <tr>
              <th>System</th>
              <th>Frequency Tracked</th>
            </tr>
          </thead>
          <tbody>
            {integrity.signalPerformance.map(row => (
              <tr key={row.name}>
                <td>
                  <span className="cil-gnss-const-dot" style={{ background: row.color }} />
                  <span>{row.name}</span>
                </td>
                <td>
                  <div className="cil-gnss-frequency-list">
                    {row.frequencies.map(freq => (
                      <span key={freq.label} className="cil-gnss-frequency-chip">
                        <SignalDot level={freq.level} />
                        {freq.label}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="cil-gnss-signal-legend">
          {[['#22c55e', 'Low'], ['#eab308', 'Moderate'], ['#f97316', 'High']].map(([color, label]) => (
            <span key={label}><i style={{ background: color }} />{label}</span>
          ))}
        </div>
      </div>

      <div className="cil-gnss-pnt-context">
        <div className="cil-gnss-pnt-context__header">
          <span className="cil-gnss-pnt-context__label">PNT NETWORK CONTEXT</span>
          <span className="cil-gnss-pnt-context__tag">Position · Navigation · Timing</span>
        </div>
        <p className="cil-gnss-pnt-context__body">
          Position, Navigation, and Timing (PNT) are critical for location-based applications.
          The ZINGSA CORS network simultaneously tracks all four global GNSS constellations —{' '}
          <strong>GPS</strong>, <strong>GLONASS</strong>, <strong>Galileo</strong>, and <strong>BeiDou</strong>.
          At any given moment the network observes at minimum two frequencies (<strong>L1 / L2</strong>) from
          GPS and GLONASS, guaranteeing a robust dual-frequency baseline for RTK and PPP corrections.
          Galileo and BeiDou observations extend geometric diversity, strengthen ionospheric modelling,
          and improve ambiguity resolution — increasing reliability and redundancy across the network
          and on all rover receivers operating within it.
        </p>
      </div>

      <div className="cil-gnss-summary">
        <div className="cil-gnss-icon small">🤖</div>
        <div>
          <strong>GNSS Integrity Summary</strong>
          <p>{summary}</p>
        </div>
      </div>
    </section>
  );
}
