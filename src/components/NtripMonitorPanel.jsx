import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Activity, Radio, Server, Wifi, AlertTriangle, RefreshCw } from 'lucide-react';
import {
  getNtripStatus, getNtripMountpoints, getNtripStreamHealth, getNtripAlerts,
  subscribeNtripLive, healthColor, healthLabel, severityColor,
} from '../services/ntripApi.js';
import '../styles/ntrip-monitor.css';

// Common RTCM3 message type labels (browser-safe subset)
const RTCM_LABELS = {
  1001: 'GPS L1',         1002: 'GPS L1 Full',
  1003: 'GPS L1/L2',      1004: 'GPS L1/L2 Full',
  1005: 'Station Ref',    1006: 'Station Ref+H',
  1007: 'Ant Descriptor', 1008: 'Ant S/N',
  1019: 'GPS Eph',        1020: 'GLONASS Eph',
  1033: 'Rcvr/Ant Desc',  1042: 'BDS Eph',
  1045: 'Galileo F/NAV',  1046: 'Galileo I/NAV',
  1071: 'GPS MSM1',  1072: 'GPS MSM2',  1073: 'GPS MSM3',
  1074: 'GPS MSM4',  1075: 'GPS MSM5',  1076: 'GPS MSM6',  1077: 'GPS MSM7',
  1081: 'GLO MSM1',  1082: 'GLO MSM2',  1083: 'GLO MSM3',
  1084: 'GLO MSM4',  1085: 'GLO MSM5',  1086: 'GLO MSM6',  1087: 'GLO MSM7',
  1091: 'GAL MSM1',  1092: 'GAL MSM2',  1093: 'GAL MSM3',
  1094: 'GAL MSM4',  1095: 'GAL MSM5',  1096: 'GAL MSM6',  1097: 'GAL MSM7',
  1121: 'BDS MSM1',  1122: 'BDS MSM2',  1123: 'BDS MSM3',
  1124: 'BDS MSM4',  1125: 'BDS MSM5',  1126: 'BDS MSM6',  1127: 'BDS MSM7',
};

const INTERVALS = [
  { label: '1s',  ms: 1_000 },
  { label: '5s',  ms: 5_000 },
  { label: '30s', ms: 30_000 },
];

function ago(ts) {
  if (!ts) return '—';
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60)   return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  return `${Math.round(s / 3600)}h ago`;
}

function fmt(n, unit = '') {
  if (n === null || n === undefined) return '—';
  return `${Number(n).toLocaleString()}${unit}`;
}

// ── KPI card ──────────────────────────────────────────────────
function KpiCard({ label, value, note, color }) {
  return (
    <div className="ntrip-kpi-card">
      <div className="ntrip-kpi-label">{label}</div>
      <div className="ntrip-kpi-value" style={{ color: color || '#f8fafc' }}>{value}</div>
      {note && <div className="ntrip-kpi-note">{note}</div>}
    </div>
  );
}

// ── Health bar ────────────────────────────────────────────────
function HealthBar({ score }) {
  const color = healthColor(score);
  return (
    <div className="ntrip-health-bar">
      <div className="ntrip-health-bar-track">
        <div className="ntrip-health-bar-fill" style={{ width: `${score}%`, background: color }} />
      </div>
      <span className="ntrip-health-bar-label" style={{ color }}>{score}</span>
    </div>
  );
}

// ── Status pill ───────────────────────────────────────────────
function StatusPill({ score, connected }) {
  const cls = !connected || score === 0 ? 'offline' : score >= 80 ? 'online' : 'degraded';
  return (
    <span className={`ntrip-status-pill ${cls}`}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
      {cls.charAt(0).toUpperCase() + cls.slice(1)}
    </span>
  );
}

// ── Alerts strip ──────────────────────────────────────────────
function AlertsStrip({ alerts }) {
  if (!alerts.length) return null;
  return (
    <div className="ntrip-alerts-strip">
      <div className="ntrip-section-title" style={{ marginBottom: 8 }}>
        <AlertTriangle size={12} style={{ verticalAlign: 'middle', marginRight: 6 }} />
        Active alerts ({alerts.filter(a => !a.resolved).length})
      </div>
      {alerts.filter(a => !a.resolved).slice(0, 5).map(a => (
        <div key={a.id} className="ntrip-alert-row">
          <span className="ntrip-alert-dot" style={{ background: severityColor(a.severity) }} />
          <span style={{ color: severityColor(a.severity), fontWeight: 800, fontSize: '0.68rem', minWidth: 70 }}>
            {a.severity.toUpperCase()}
          </span>
          <span style={{ color: '#cbd5e1', flex: 1 }}>{a.message}</span>
          <span className="ntrip-alert-time">{ago(a.timestamp)}</span>
        </div>
      ))}
    </div>
  );
}

// ── Sparkline ─────────────────────────────────────────────────
function Sparkline({ data, color = '#22d3ee' }) {
  if (!data.length) return <div className="ntrip-sparkline" />;
  const max = Math.max(...data, 1);
  return (
    <div className="ntrip-sparkline">
      {data.map((v, i) => (
        <div key={i} className="ntrip-sparkline-bar"
          style={{ height: `${Math.max(4, Math.round((v / max) * 50))}px`, background: color }} />
      ))}
    </div>
  );
}

// ── RTCM message grid ─────────────────────────────────────────
function RtcmGrid({ typeCounts }) {
  const entries = Object.entries(typeCounts || {})
    .map(([t, c]) => ({ type: parseInt(t), count: c, label: RTCM_LABELS[parseInt(t)] || 'Unknown' }))
    .sort((a, b) => a.type - b.type);
  if (!entries.length) return <div style={{ color: '#64748b', fontSize: '0.78rem' }}>No RTCM data yet</div>;
  return (
    <div className="ntrip-rtcm-grid">
      {entries.slice(0, 12).map(({ type, count, label }) => (
        <div key={type} className="ntrip-rtcm-chip">
          <div className="ntrip-rtcm-chip-type">{type}</div>
          <div className="ntrip-rtcm-chip-label">{label}</div>
          <div className="ntrip-rtcm-chip-count">{fmt(count)} pkts</div>
        </div>
      ))}
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────
export default function NtripMonitorPanel() {
  const [status,      setStatus]      = useState(null);
  const [mountpoints, setMountpoints] = useState([]);
  const [streamHealth, setStreamHealth] = useState({ streams: [], summary: {} });
  const [alerts,      setAlerts]      = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [intervalMs,  setIntervalMs]  = useState(5_000);
  const [wsLive,      setWsLive]      = useState(false);
  const [selectedMp,  setSelectedMp]  = useState(null);
  const [latHistory,  setLatHistory]  = useState(Array(20).fill(0));
  const [bpsHistory,  setBpsHistory]  = useState(Array(20).fill(0));
  const unsubRef  = useRef(null);
  const pollTimer = useRef(null);

  const load = useCallback(async () => {
    try {
      const [s, mps, sh, als] = await Promise.all([
        getNtripStatus(), getNtripMountpoints(), getNtripStreamHealth(), getNtripAlerts(false),
      ]);
      setStatus(s);
      setMountpoints(mps);
      setStreamHealth(sh);
      setAlerts(als);
    } catch { /* keep stale data */ }
    finally { setLoading(false); }
  }, []);

  // REST polling
  useEffect(() => {
    load();
    pollTimer.current = setInterval(load, intervalMs);
    return () => clearInterval(pollTimer.current);
  }, [load, intervalMs]);

  // WebSocket live updates
  useEffect(() => {
    unsubRef.current = subscribeNtripLive({
      onOpen:  () => setWsLive(true),
      onClose: () => setWsLive(false),
      onError: () => setWsLive(false),
      onStatus: (msg) => {
        if (msg.caster) setStatus(msg.caster);
        if (msg.streamHealth) {
          setStreamHealth(prev => ({ ...prev, streams: msg.streamHealth }));
          // update sparklines
          const avg = msg.streamHealth.reduce((a, s) => a + (s.latencyMs || 0), 0) / (msg.streamHealth.length || 1);
          const bps = msg.streamHealth.reduce((a, s) => a + (s.bytesPerSec || 0), 0);
          setLatHistory(h => [...h.slice(1), Math.round(avg)]);
          setBpsHistory(h => [...h.slice(1), Math.round(bps / 1000)]);
        }
        if (msg.alerts) setAlerts(msg.alerts);
      },
      onStreamStats: (mp, stats) => {
        setStreamHealth(prev => {
          const streams = prev.streams.map(s => s.mountpoint === mp ? { ...s, ...stats } : s);
          return { ...prev, streams };
        });
      },
    });
    return () => unsubRef.current?.();
  }, []);

  // ── Summary values ────────────────────────────────────────
  const totalMp   = status?.totalMountpoints  ?? mountpoints.length;
  const activeMp  = status?.activeMountpoints ?? mountpoints.filter(m => m.status?.connected).length;
  const offlineMp = totalMp - activeMp;
  const avgLat    = status?.averageLatencyMs ?? streamHealth.summary?.avgLatencyMs;
  const avail     = streamHealth.summary?.networkAvail;
  const healthSummary = status?.networkHealth ?? 'unknown';

  const healthColorMap = { healthy: '#22c55e', degraded: '#f59e0b', warning: '#f97316', critical: '#ef4444', unknown: '#64748b' };
  const activeAlerts   = alerts.filter(a => !a.resolved);

  // Aggregate RTCM types across all streams
  const allRtcm = (streamHealth.streams || []).reduce((acc, s) => {
    for (const [t, c] of Object.entries(s.typeCounts || {})) {
      acc[t] = (acc[t] || 0) + c;
    }
    return acc;
  }, {});

  const selectedStream = selectedMp
    ? streamHealth.streams?.find(s => s.mountpoint === selectedMp)
    : null;

  if (loading) {
    return (
      <div className="ntrip-root">
        <div style={{ padding: '80px 24px', textAlign: 'center', color: '#64748b' }}>
          <Radio size={32} style={{ marginBottom: 12, opacity: 0.4 }} />
          <div>Loading NTRIP monitoring data…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="ntrip-root">
      {/* ── Header ── */}
      <header className="ntrip-header">
        <div>
          <div className="ntrip-header-kicker">
            <Radio size={14} /> ZINGSA Space Science Operations
          </div>
          <h1 className="ntrip-header-title">NTRIP Stream Monitor</h1>
          <p className="ntrip-header-subtitle">
            Live monitoring of ZINGSACORS NTRIP caster, mountpoints, and RTCM correction streams.
            Read-only — corrections are not redistributed.
          </p>
        </div>
        <div className={`ntrip-caster-badge ${status?.online ? '' : 'offline'}`}>
          <span className="ntrip-caster-dot" />
          <div>
            <span>{status?.online ? 'Caster Online' : 'Caster Offline'}</span><br />
            <strong>{status?.name || 'ZINGSACORS'}</strong>
          </div>
        </div>
      </header>

      <div className="ntrip-body">

        {/* ── Controls ── */}
        <div className="ntrip-interval-row">
          <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700 }}>REFRESH</span>
          {INTERVALS.map(({ label, ms }) => (
            <button key={ms} className={`ntrip-interval-btn ${intervalMs === ms ? 'active' : ''}`}
              onClick={() => setIntervalMs(ms)}>{label}</button>
          ))}
          <button className="ntrip-interval-btn" onClick={load} title="Refresh now"
            style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <RefreshCw size={11} /> Now
          </button>
          {wsLive && (
            <span className="ntrip-live-badge">
              <span className="ntrip-live-dot" /> WebSocket live
            </span>
          )}
        </div>

        {/* ── Active alerts ── */}
        {activeAlerts.length > 0 && <AlertsStrip alerts={activeAlerts} />}

        {/* ── KPI row ── */}
        <div className="ntrip-kpi-row">
          <KpiCard label="Caster"         value={status?.online ? 'Online' : 'Offline'} color={status?.online ? '#22c55e' : '#ef4444'} note={`Port ${status?.port ?? 2101}`} />
          <KpiCard label="Total Stations" value={totalMp}  note="Mountpoints" />
          <KpiCard label="Online"         value={activeMp} color="#22c55e"  note="Active streams" />
          <KpiCard label="Offline"        value={offlineMp} color={offlineMp > 0 ? '#ef4444' : '#22c55e'} note="Inactive" />
          <KpiCard label="Network Health" value={healthSummary.charAt(0).toUpperCase() + healthSummary.slice(1)} color={healthColorMap[healthSummary]} note={avail != null ? `${avail}% avail.` : ''} />
          <KpiCard label="Avg Latency"    value={avgLat != null ? `${avgLat}ms` : '—'} color={avgLat > 2000 ? '#f59e0b' : '#22d3ee'} note="Correction delay" />
          <KpiCard label="Active Alerts"  value={activeAlerts.length} color={activeAlerts.length > 0 ? '#ef4444' : '#22c55e'} note={`${alerts.length} total`} />
          <KpiCard label="RTCM Types"     value={Object.keys(allRtcm).length} note="Detected" color="#a78bfa" />
        </div>

        {/* ── Charts ── */}
        <div className="ntrip-charts-row">
          <div className="ntrip-chart-card">
            <div className="ntrip-chart-title">
              <Activity size={11} style={{ verticalAlign: 'middle', marginRight: 5 }} />
              Network latency trend (ms)
            </div>
            <Sparkline data={latHistory} color="#22d3ee" />
          </div>
          <div className="ntrip-chart-card">
            <div className="ntrip-chart-title">
              <Wifi size={11} style={{ verticalAlign: 'middle', marginRight: 5 }} />
              Total data rate (kb/s)
            </div>
            <Sparkline data={bpsHistory} color="#a78bfa" />
          </div>
        </div>

        {/* ── Mountpoint table ── */}
        <div className="ntrip-section-title">
          <Server size={11} style={{ verticalAlign: 'middle', marginRight: 6 }} />
          Mountpoints / CORS Stations ({mountpoints.length})
        </div>
        <div className="ntrip-table-wrap">
          <table className="ntrip-table">
            <thead>
              <tr>
                <th>Mountpoint</th>
                <th>Station</th>
                <th>Status</th>
                <th>Health</th>
                <th>Latency</th>
                <th>Data Rate</th>
                <th>Correction Age</th>
                <th>Constellations</th>
                <th>Format</th>
                <th>Last Data</th>
              </tr>
            </thead>
            <tbody>
              {mountpoints.map(mp => {
                const st  = mp.status;
                const col = healthColor(st?.healthScore ?? 0);
                return (
                  <tr key={mp.mountpoint}
                    style={{ cursor: 'pointer', background: selectedMp === mp.mountpoint ? 'rgba(34,211,238,0.06)' : '' }}
                    onClick={() => setSelectedMp(mp.mountpoint === selectedMp ? null : mp.mountpoint)}>
                    <td style={{ fontWeight: 700, color: '#f8fafc', fontFamily: 'monospace' }}>{mp.mountpoint}</td>
                    <td style={{ color: '#cbd5e1' }}>{mp.station?.stationName || mp.identifier}</td>
                    <td><StatusPill score={st?.healthScore ?? 0} connected={st?.connected} /></td>
                    <td style={{ minWidth: 110 }}><HealthBar score={st?.healthScore ?? 0} /></td>
                    <td style={{ color: st?.latencyMs > 2000 ? '#f59e0b' : '#22d3ee' }}>
                      {st?.latencyMs != null ? `${st.latencyMs}ms` : '—'}
                    </td>
                    <td style={{ color: '#94a3b8' }}>
                      {st?.bytesPerSec ? `${(st.bytesPerSec / 1000).toFixed(1)} KB/s` : '—'}
                    </td>
                    <td style={{ color: st?.correctionAgeSec > 10 ? '#f59e0b' : '#94a3b8' }}>
                      {st?.correctionAgeSec != null ? `${st.correctionAgeSec.toFixed(1)}s` : '—'}
                    </td>
                    <td>
                      <div className="ntrip-const-chips">
                        {(mp.constellations || []).map(c => (
                          <span key={c} className="ntrip-const-chip">{c.slice(0, 3)}</span>
                        ))}
                      </div>
                    </td>
                    <td style={{ color: '#64748b', fontSize: '0.68rem' }}>{mp.format}</td>
                    <td style={{ color: '#64748b', fontSize: '0.68rem' }}>{ago(st?.lastDataTime)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ── Selected mountpoint detail ── */}
        {selectedStream && (
          <div style={{ background: 'rgba(34,211,238,0.04)', border: '1px solid rgba(34,211,238,0.18)', borderRadius: 12, padding: 16, marginBottom: 20 }}>
            <div className="ntrip-section-title" style={{ marginBottom: 12 }}>
              RTCM stream detail — {selectedMp}
            </div>
            <RtcmGrid typeCounts={selectedStream.typeCounts} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 8, marginTop: 12 }}>
              {[
                ['Total bytes',   fmt(selectedStream.bytesTotal) + ' B'],
                ['Uptime',        fmt(Math.round((selectedStream.uptimeSec||0)/60)) + ' min'],
                ['Availability',  fmt(selectedStream.availability) + '%'],
                ['Packet rate',   fmt(selectedStream.packetRate) + ' Hz'],
              ].map(([l, v]) => (
                <div key={l} style={{ background: 'rgba(0,0,0,0.25)', borderRadius: 8, padding: '8px 12px' }}>
                  <div style={{ fontSize: '0.58rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{l}</div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#e2e8f0', marginTop: 2 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Network-wide RTCM types ── */}
        <div className="ntrip-section-title">RTCM message types detected across network</div>
        <RtcmGrid typeCounts={allRtcm} />

      </div>
    </div>
  );
}
