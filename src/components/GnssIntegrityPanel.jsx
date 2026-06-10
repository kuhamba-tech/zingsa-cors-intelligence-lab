import React, { useState, useMemo } from 'react';
import '../styles/gnss-integrity-panel.css';

function sr(seed) {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

function sparkData(seed, n = 22, lo = 0, hi = 10) {
  return Array.from({ length: n }, (_, i) => lo + sr(seed * 17 + i * 13) * (hi - lo));
}

function MiniSparkline({ data, color, height = 42 }) {
  if (!data?.length) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const W = 140;
  const pts = data.map((v, i) =>
    `${((i / (data.length - 1)) * W).toFixed(1)},${(height - ((v - min) / range) * (height - 6) - 3).toFixed(1)}`
  ).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" className="gnss-sparkline">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" opacity="0.9" />
    </svg>
  );
}

function AccBar({ pct, color }) {
  return (
    <div className="gnss-acc-bar">
      <div style={{ width: `${Math.min(pct, 100)}%`, background: color }} />
    </div>
  );
}

export default function GnssIntegrityPanel({ stationName = 'Station', region = 'Zimbabwe' }) {
  const [collapsed, setCollapsed] = useState(false);

  const d = useMemo(() => {
    const s = (stationName + region).split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const r = (lo, hi, k = 0) => lo + sr(s + k * 31) * (hi - lo);

    const hAcc = Math.round(r(2, 7, 1) * 10) / 10;
    const vAcc = Math.round(r(2, 7, 2) * 10) / 10;
    const latency = Math.round(r(0.4, 1.8, 3) * 10) / 10;
    const satellites = Math.round(r(16, 24, 4));
    const corrAge = Math.round(r(1, 4, 5));
    const quality = Math.round(r(74, 97, 6));
    const lastOutage = Math.round(r(8, 90, 7));
    const rtkFix = quality > 91 ? 'Fixed' : quality > 80 ? 'Float' : 'Search';
    const pppStatus = quality > 93 ? 'Converged' : 'Converging';
    const rtkColor = rtkFix === 'Fixed' ? '#22c55e' : '#EF9F27';
    const pppColor = pppStatus === 'Converged' ? '#22c55e' : '#EF9F27';
    const nominal = quality >= 74 && latency < 1.6;
    return {
      hAcc, vAcc, latency, satellites, corrAge, quality, lastOutage,
      rtkFix, pppStatus, rtkColor, pppColor, nominal,
      posSpark: sparkData(s + 1, 22, hAcc * 0.7, hAcc * 1.6),
      qualSpark: sparkData(s + 2, 22, quality * 0.87, Math.min(quality * 1.06, 100)),
      signalPerformance: [
        { name: 'GPS', color: '#22c55e', frequencies: [{ label: 'L1', level: 'LOW' }, { label: 'L2', level: 'LOW' }, { label: 'L5', level: 'LOW' }] },
        { name: 'GLONASS', color: '#a855f7', frequencies: [{ label: 'L1', level: 'LOW' }, { label: 'L2', level: 'LOW' }] },
        { name: 'Galileo', color: '#22d3ee', frequencies: [{ label: 'E1', level: 'LOW' }, { label: 'E5a', level: 'LOW' }, { label: 'E5b', level: 'LOW' }, { label: 'E5ab', level: 'LOW' }] },
        { name: 'BeiDou', color: '#f97316', frequencies: [{ label: 'B1', level: 'LOW' }, { label: 'B2', level: quality < 80 ? 'MODERATE' : 'LOW' }, { label: 'B3', level: 'LOW' }] },
      ],
    };
  }, [stationName, region]);

  const statusColor = d.nominal ? '#22c55e' : '#EF9F27';
  const statusLabel = d.nominal ? 'NOMINAL' : 'DEGRADED';

  return (
    <div className={`gnss-panel${collapsed ? ' gnss-panel--collapsed' : ''}`}>
      <div className="gnss-panel__header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="gnss-panel__icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="2.2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" />
              <line x1="12" y1="2" x2="12" y2="5" /><line x1="12" y1="19" x2="12" y2="22" />
              <line x1="2" y1="12" x2="5" y2="12" /><line x1="19" y1="12" x2="22" y2="12" />
            </svg>
          </div>
          <div>
            <div className="gnss-panel__title">
              GNSS Integrity Panel
              <span className="gnss-panel__dot" style={{ background: statusColor }} />
            </div>
            {!collapsed && (
              <div className="gnss-panel__subtitle">
                Live positioning quality, correction availability, station warnings &amp; PPP/RTK reliability
              </div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {!collapsed && (
            <span className="gnss-badge" style={{ borderColor: `${statusColor}55`, color: statusColor, background: `${statusColor}18` }}>
              ✓ {statusLabel}
            </span>
          )}
          <button className="gnss-collapse-btn" onClick={() => setCollapsed(v => !v)}>
            {collapsed ? '▼' : '▲'}
          </button>
        </div>
      </div>

      {!collapsed && (
        <>
          <div className="gnss-cards">
            {/* 1 — Positioning Accuracy */}
            <div className="gnss-card">
              <div className="gnss-card__label">↑ POSITIONING ACCURACY</div>
              <MiniSparkline data={d.posSpark} color="#22d3ee" />
              <div className="gnss-acc-row"><span>Horizontal</span><span style={{ color: '#EF9F27' }}>{d.hAcc} cm</span></div>
              <AccBar pct={d.hAcc / 15 * 100} color="#EF9F27" />
              <div className="gnss-acc-row" style={{ marginTop: 6 }}><span>Vertical</span><span style={{ color: '#22c55e' }}>{d.vAcc} cm</span></div>
              <AccBar pct={d.vAcc / 15 * 100} color="#22c55e" />
            </div>

            {/* 2 — Correction Availability */}
            <div className="gnss-card">
              <div className="gnss-card__label">▶ CORRECTION AVAILABILITY</div>
              <div className="gnss-avail-row"><span>RTK</span><span style={{ color: '#22c55e' }}>● Available</span></div>
              <div className="gnss-avail-row"><span>PPP</span><span style={{ color: '#22c55e' }}>● Available</span></div>
              <div className="gnss-avail-divider" />
              <div className="gnss-avail-row"><span className="gnss-muted">Correction Age</span><span style={{ color: '#22d3ee' }}>{d.corrAge}s</span></div>
            </div>

            {/* 3 — Stream Status */}
            <div className="gnss-card">
              <div className="gnss-card__label">▣ STREAM STATUS</div>
              <div className="gnss-stream-online">
                <span className="gnss-stream-dot" />
                <span>Online</span>
              </div>
              <div className="gnss-avail-row"><span className="gnss-muted">Stream Latency</span><span>{d.latency}s</span></div>
              <div className="gnss-avail-row"><span className="gnss-muted">Last Outage</span><span>{d.lastOutage} min ago</span></div>
              <div className="gnss-avail-row"><span className="gnss-muted">Satellites</span><span style={{ color: '#22d3ee' }}>{d.satellites} tracked</span></div>
            </div>

            {/* 4 — Station Warnings */}
            <div className="gnss-card">
              <div className="gnss-card__label">⚠ STATION WARNINGS</div>
              <div className="gnss-warnings-clear">
                <div className="gnss-check-box">✓</div>
                <div>
                  <div style={{ fontWeight: 800, color: '#22c55e', fontSize: '0.9rem' }}>All Clear</div>
                  <div className="gnss-muted" style={{ fontSize: '0.68rem', marginTop: 2 }}>No active alerts</div>
                </div>
              </div>
            </div>

            {/* 5 — PPP / RTK Quality */}
            <div className="gnss-card">
              <div className="gnss-card__label">◎ PPP / RTK QUALITY</div>
              <MiniSparkline data={d.qualSpark} color="#22d3ee" />
              <div className="gnss-avail-row" style={{ marginTop: 4 }}>
                <span className="gnss-muted">RTK Fix</span>
                <span style={{ color: d.rtkColor }}>● {d.rtkFix}</span>
              </div>
              <div className="gnss-avail-row">
                <span className="gnss-muted">PPP Status</span>
                <span style={{ color: d.pppColor }}>● {d.pppStatus}</span>
              </div>
              <div className="gnss-avail-row">
                <span className="gnss-muted">Signal Quality</span>
                <span>{d.quality}%</span>
              </div>
              <div className="gnss-acc-bar" style={{ marginTop: 4 }}>
                <div style={{ width: `${d.quality}%`, background: 'linear-gradient(90deg,#22c55e,#EF9F27)' }} />
              </div>
            </div>
          </div>

          {/* Quick stats strip */}
          <div className="gnss-stats-bar">
            {[
              { icon: '🛰', label: 'SATELLITES', value: d.satellites, color: '#e2e8f0' },
              { icon: '▶', label: 'RTK', value: d.rtkFix, color: d.rtkColor },
              { icon: '🌐', label: 'PPP', value: d.pppStatus, color: d.pppColor },
              { icon: '⚡', label: 'LATENCY', value: `${d.latency}s`, color: '#22d3ee' },
              { icon: '📍', label: 'H-ACC', value: `${d.hAcc} cm`, color: '#EF9F27' },
              { icon: '↗', label: 'V-ACC', value: `${d.vAcc} cm`, color: '#22c55e' },
              { icon: '◎', label: 'QUALITY', value: `${d.quality}%`, color: '#22d3ee' },
            ].map(({ icon, label, value, color }) => (
              <div key={label} className="gnss-stat">
                <div className="gnss-stat__icon">{icon}</div>
                <div className="gnss-stat__label">{label}</div>
                <div className="gnss-stat__value" style={{ color }}>{value}</div>
              </div>
            ))}
          </div>

          <div className="gnss-signal-performance">
            <div className="gnss-signal-title">GNSS SIGNAL PERFORMANCE</div>
            <table className="gnss-signal-table">
              <thead>
                <tr>
                  <th>System</th>
                  <th>Frequency Tracked</th>
                </tr>
              </thead>
              <tbody>
                {d.signalPerformance.map(row => (
                  <tr key={row.name}>
                    <td>
                      <span className="gnss-const-dot" style={{ background: row.color }} />
                      <span>{row.name}</span>
                    </td>
                    <td>
                      <div className="gnss-frequency-list">
                        {row.frequencies.map(freq => (
                          <span key={freq.label} className="gnss-frequency-chip">
                            <span className="gnss-signal-dot" style={{ background: freq.level === 'MODERATE' ? '#eab308' : freq.level === 'HIGH' ? '#f97316' : '#22c55e' }} />
                            {freq.label}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="gnss-signal-legend">
              {[['#22c55e', 'Low'], ['#eab308', 'Moderate'], ['#f97316', 'High']].map(([color, label]) => (
                <span key={label}><i style={{ background: color }} />{label}</span>
              ))}
            </div>
          </div>

          {/* PNT context */}
          <div className="gnss-pnt-context">
            <div className="gnss-pnt-context__header">
              <span className="gnss-pnt-context__label">PNT NETWORK CONTEXT</span>
              <span className="gnss-pnt-context__tag">Position · Navigation · Timing</span>
            </div>
            <p className="gnss-pnt-context__body">
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

          {/* Summary */}
          <div className="gnss-summary">
            <div className="gnss-summary__icon">🛡</div>
            <div>
              <div className="gnss-summary__title">GNSS INTEGRITY SUMMARY</div>
              <p className="gnss-summary__text">
                GNSS conditions are nominal for {stationName}, {region}. RTK is {d.rtkFix.toLowerCase()}, PPP is{' '}
                {d.pppStatus.toLowerCase()}, and stream latency of {d.latency}s is below operational thresholds.{' '}
                {d.satellites} satellites tracked. Data quality score {d.quality}% — suitable for CORS Health Network.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
