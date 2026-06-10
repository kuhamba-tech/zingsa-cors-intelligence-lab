import React, { useCallback, useEffect, useState } from 'react';
import { getNtripUptime } from '../services/ntripApi.js';

const PERIODS = [
  { id: '24h', label: '24 Hours' },
  { id: '7d',  label: '7 Days'   },
  { id: '30d', label: '30 Days'  },
];

function uptimeColor(pct) {
  if (pct === null || pct === undefined) return '#4b5563';
  if (pct >= 99)  return '#22c55e';
  if (pct >= 95)  return '#84cc16';
  if (pct >= 90)  return '#eab308';
  if (pct >= 75)  return '#f97316';
  return '#ef4444';
}

function statusDot(status) {
  const c = status === 'online' ? '#22c55e' : status === 'offline' ? '#ef4444' : '#4b5563';
  return <span style={{ display:'inline-block', width:8, height:8, borderRadius:'50%', background:c, marginRight:5, flexShrink:0 }} />;
}

function timeAgo(ts) {
  if (!ts) return '—';
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60)   return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

function fmtTs(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('en-GB', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
}

// ── Uptime bar for a single station ─────────────────────────────
function StationUptimeRow({ st }) {
  const pct   = st.uptimePct;
  const color = uptimeColor(pct);
  const label = pct !== null ? `${pct}%` : 'N/A';

  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 0', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ width:44, fontWeight:800, fontSize:'0.72rem', color:'#e2e8f0', flexShrink:0 }}>
        {statusDot(st.currentStatus)}{st.stationId}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <div style={{ flex:1, height:10, background:'rgba(255,255,255,0.08)', borderRadius:5, overflow:'hidden' }}>
            <div style={{ width:`${pct ?? 0}%`, height:'100%', background:color, borderRadius:5, transition:'width 0.4s' }} />
          </div>
          <span style={{ width:38, textAlign:'right', fontWeight:800, fontSize:'0.72rem', color, flexShrink:0 }}>{label}</span>
        </div>
        {st.downtimeHuman && st.downtimeHuman !== '0s' && (
          <div style={{ fontSize:'0.6rem', color:'#94a3b8', marginTop:2 }}>
            {st.eventCount} event{st.eventCount !== 1 ? 's' : ''} · {st.downtimeHuman} down
          </div>
        )}
      </div>
      <div style={{ width:80, fontSize:'0.6rem', color:'#64748b', textAlign:'right', flexShrink:0 }}>
        {st.since ? timeAgo(st.since) : '—'}
      </div>
    </div>
  );
}

// ── Event log row ────────────────────────────────────────────────
function EventRow({ ev }) {
  const isDown = ev.event === 'DOWN';
  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 52px 52px 1fr', gap:8, padding:'6px 0', borderBottom:'1px solid rgba(255,255,255,0.05)', fontSize:'0.68rem', alignItems:'center' }}>
      <span style={{ color:'#94a3b8' }}>{fmtTs(ev.ts)}</span>
      <span style={{ fontWeight:800, color:'#e2e8f0' }}>{ev.stationId}</span>
      <span style={{
        fontWeight:800,
        color:      isDown ? '#ef4444' : '#22c55e',
        background: isDown ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)',
        borderRadius:4, padding:'2px 6px', textAlign:'center',
      }}>
        {isDown ? '▼ DOWN' : '▲ UP'}
      </span>
      <span style={{ color:'#64748b' }}>{ev.stationName}</span>
    </div>
  );
}

export default function CorsUptimePanel() {
  const [period,  setPeriod]  = useState('7d');
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [tab,     setTab]     = useState('bars'); // 'bars' | 'events'

  const load = useCallback(async (p) => {
    setLoading(true);
    setError(null);
    try {
      const d = await getNtripUptime(p);
      setData(d);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(period); }, [period, load]);

  const handlePeriod = (p) => { setPeriod(p); };

  const S = { // shared styles
    panel:   { background:'rgba(8,14,32,0.95)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:12, padding:20, color:'#e2e8f0' },
    header:  { fontSize:'0.62rem', fontWeight:800, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 },
    kpiCard: { background:'rgba(0,0,0,0.3)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:8, padding:'12px 16px', textAlign:'center' },
  };

  if (!data && loading) return (
    <div style={{ padding:40, textAlign:'center', color:'#64748b', fontSize:'0.8rem' }}>
      Loading uptime data…
    </div>
  );

  if (error) return (
    <div style={{ padding:24, color:'#ef4444', fontSize:'0.8rem' }}>
      Failed to load: {error}
    </div>
  );

  // KV not set up yet
  if (data && !data.available) return (
    <div style={{ ...S.panel, maxWidth:640, margin:'24px auto' }}>
      <div style={{ fontSize:'0.9rem', fontWeight:800, color:'#f59e0b', marginBottom:12 }}>
        Uptime Logging Not Yet Active
      </div>
      <p style={{ fontSize:'0.78rem', color:'#94a3b8', lineHeight:1.7, margin:'0 0 16px' }}>
        To enable station uptime logging and historical performance analysis, create a KV (Redis) store in your Vercel dashboard and link it to this project.
      </p>
      <ol style={{ fontSize:'0.78rem', color:'#cbd5e1', lineHeight:2, paddingLeft:20 }}>
        <li>Go to <strong style={{ color:'#22d3ee' }}>vercel.com → your project → Storage</strong></li>
        <li>Click <strong>Create Database → KV (Redis)</strong></li>
        <li>Click <strong>Connect</strong> to link it to this project</li>
        <li>Redeploy — logging starts automatically on the next status poll</li>
      </ol>
      <p style={{ fontSize:'0.7rem', color:'#64748b', marginTop:12 }}>
        The free KV tier (256 MB, 10 000 commands/day) is more than enough for the full 24-station Zimbabwe CORS network.
      </p>
    </div>
  );

  if (!data) return null;

  const { stations = [], events = [], summary } = data;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

      {/* Header + controls */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ fontSize:'1rem', fontWeight:900, color:'#e2e8f0' }}>CORS Network Uptime Log</div>
          <div style={{ fontSize:'0.68rem', color:'#64748b', marginTop:2 }}>
            Station UP / DOWN events from the NTRIP caster sourcetable
          </div>
        </div>
        <div style={{ display:'flex', gap:6, alignItems:'center' }}>
          {PERIODS.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => handlePeriod(p.id)}
              style={{
                padding:'5px 12px', borderRadius:6, fontSize:'0.7rem', fontWeight:800, cursor:'pointer',
                background: period === p.id ? 'rgba(34,211,238,0.18)' : 'rgba(0,0,0,0.3)',
                border: `1px solid ${period === p.id ? 'rgba(34,211,238,0.5)' : 'rgba(255,255,255,0.1)'}`,
                color: period === p.id ? '#22d3ee' : '#94a3b8',
              }}
            >
              {p.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => load(period)}
            disabled={loading}
            style={{ padding:'5px 10px', borderRadius:6, fontSize:'0.7rem', fontWeight:800, cursor:'pointer', background:'rgba(0,0,0,0.3)', border:'1px solid rgba(255,255,255,0.1)', color:'#94a3b8' }}
          >
            {loading ? '⟳' : '↻'}
          </button>
        </div>
      </div>

      {/* KPI summary strip */}
      {summary && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))', gap:10 }}>
          {[
            { label:'Avg Network Uptime', value: summary.avgUptimePct != null ? `${summary.avgUptimePct}%` : '—', color: uptimeColor(summary.avgUptimePct) },
            { label:'DOWN Events',        value: summary.downEvents ?? 0,  color:'#ef4444' },
            { label:'UP Events',          value: summary.upEvents ?? 0,    color:'#22c55e' },
            { label:'Worst Station',      value: summary.worstStation ? `${summary.worstStation.id} ${summary.worstStation.uptimePct}%` : '—', color:'#f97316' },
          ].map(kpi => (
            <div key={kpi.label} style={S.kpiCard}>
              <div style={S.header}>{kpi.label}</div>
              <div style={{ fontSize:'1.1rem', fontWeight:900, color:kpi.color }}>{kpi.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Sub-tab: Uptime Bars | Event Log */}
      <div style={{ display:'flex', gap:6, borderBottom:'1px solid rgba(255,255,255,0.08)', paddingBottom:0 }}>
        {[['bars','Uptime Bars'],['events','Event Log']].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            style={{
              padding:'6px 14px', background:'transparent', border:'none', cursor:'pointer',
              fontSize:'0.72rem', fontWeight:800,
              color:      tab === id ? '#22d3ee' : '#64748b',
              borderBottom: tab === id ? '2px solid #22d3ee' : '2px solid transparent',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Uptime bars */}
      {tab === 'bars' && (
        <div style={{ ...S.panel, padding:'12px 16px' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 24px' }}>
            {stations.map(st => <StationUptimeRow key={st.stationId} st={st} />)}
          </div>
          {stations.length === 0 && (
            <div style={{ padding:'20px 0', color:'#64748b', fontSize:'0.78rem', textAlign:'center' }}>
              No uptime data yet — data accumulates as the NTRIP caster is polled.
            </div>
          )}
        </div>
      )}

      {/* Event log */}
      {tab === 'events' && (
        <div style={{ ...S.panel, padding:'12px 16px' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 52px 52px 1fr', gap:8, padding:'4px 0 8px', borderBottom:'1px solid rgba(255,255,255,0.1)', fontSize:'0.6rem', fontWeight:800, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.05em' }}>
            <span>Time</span><span>Station</span><span>Event</span><span>Name</span>
          </div>
          {events.length > 0
            ? events.map(ev => <EventRow key={ev.id} ev={ev} />)
            : (
              <div style={{ padding:'20px 0', color:'#64748b', fontSize:'0.78rem', textAlign:'center' }}>
                No UP/DOWN events recorded in this period — network has been stable.
              </div>
            )
          }
        </div>
      )}

      {/* Legend */}
      <div style={{ display:'flex', gap:16, flexWrap:'wrap', fontSize:'0.62rem', color:'#64748b' }}>
        {[['#22c55e','≥ 99%'],['#84cc16','≥ 95%'],['#eab308','≥ 90%'],['#f97316','≥ 75%'],['#ef4444','< 75%']].map(([c,l]) => (
          <span key={l} style={{ display:'flex', alignItems:'center', gap:4 }}>
            <span style={{ width:10, height:10, borderRadius:2, background:c, flexShrink:0 }} />{l}
          </span>
        ))}
      </div>
    </div>
  );
}
