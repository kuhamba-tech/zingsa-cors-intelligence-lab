import React, { useEffect, useState } from 'react';
import { MapPin, Satellite, Sun } from 'lucide-react';
import { AFRICAN_REGIONS, AFRICAN_SATELLITES_AT_RISK, AFRICAN_MONITORING_CENTRES } from '../data/africaSpaceWeatherData.js';
import AfricaIonosphereMap from './AfricaIonosphereMap.jsx';
import { fetchAfricaSpaceWeather, fetchLiveKp } from '../services/spaceWeatherApi.js';
import '../styles/space-weather.css';

function getKpStatus(kp) {
  if (kp < 2) return { label: 'Quiet', level: 0, color: '#22c55e', glow: 'rgba(34,197,94,0.45)', bg: 'rgba(34,197,94,0.1)' };
  if (kp < 4) return { label: 'Unsettled', level: 1, color: '#22d3ee', glow: 'rgba(34,211,238,0.45)', bg: 'rgba(34,211,238,0.1)' };
  if (kp < 5) return { label: 'Active', level: 2, color: '#EF9F27', glow: 'rgba(239,159,39,0.45)', bg: 'rgba(239,159,39,0.1)' };
  if (kp < 6) return { label: 'Minor Storm', level: 3, color: '#f97316', glow: 'rgba(249,115,22,0.45)', bg: 'rgba(249,115,22,0.1)' };
  if (kp < 7) return { label: 'Moderate Storm', level: 4, color: '#ef4444', glow: 'rgba(239,68,68,0.45)', bg: 'rgba(239,68,68,0.1)' };
  return { label: 'Major Storm', level: 5, color: '#dc2626', glow: 'rgba(220,38,38,0.55)', bg: 'rgba(220,38,38,0.12)' };
}

function getImpacts(kp) {
  const s = kp < 2 ? 'low' : kp < 4 ? 'low' : kp < 5 ? 'medium' : 'high';
  return [
    { icon: '📡', sector: 'GNSS & Positioning', impact: kp < 2 ? 'Nominal accuracy. CORS networks operating optimally across Africa.' : kp < 4 ? 'Minor errors possible near the Equatorial Ionization Anomaly belt across equatorial Africa.' : kp < 5 ? 'Significant GNSS degradation across Central, East, and West Africa. CORS and RTK users should verify fixes.' : 'Severe GNSS disruptions continent-wide. Position errors >10m.', severity: s },
    { icon: '📐', sector: 'Surveying', impact: kp < 2 ? 'Cadastral and construction surveys within spec. Static GNSS and CORS baselines stable.' : kp < 4 ? 'Minor baseline drift possible on long lines near the geomagnetic equator.' : kp < 5 ? 'RTK and static surveys degraded in equatorial Africa.' : 'Survey-grade GNSS unreliable continent-wide.', severity: kp < 5 ? (kp < 4 ? 'low' : 'medium') : 'high' },
    { icon: '🗺️', sector: 'Precision Mapping', impact: kp < 2 ? 'Drone and mobile mapping missions nominal.' : kp < 4 ? 'Post-sunset scintillation may affect low-latitude drone RTK.' : kp < 5 ? 'GCP and PPK/RTK solutions at risk over equatorial belts.' : 'Precision mapping halted recommended across affected regions.', severity: kp < 5 ? (kp < 4 ? 'low' : 'medium') : 'high' },
    { icon: '✈️', sector: 'Aviation Navigation', impact: kp < 2 ? 'Standard conditions. No ionospheric impact on African flight routes.' : kp < 4 ? 'Minor accuracy reduction on equatorial routes.' : kp < 5 ? 'GNSS approaches degraded across African airspace.' : 'GNSS unreliable for precision approaches.', severity: s },
    { icon: '📻', sector: 'HF Radio Communications', impact: kp < 2 ? 'Excellent propagation across Africa.' : kp < 4 ? 'Occasional fading on trans-equatorial HF paths.' : kp < 5 ? 'HF disruptions across Central and East Africa.' : 'Near-total HF blackout across Africa.', severity: s },
    { icon: '🛰️', sector: 'Satellite Operations', impact: kp < 2 ? 'All African satellites operating nominally.' : kp < 4 ? 'Minor signal scintillation on equatorial links.' : kp < 5 ? 'Increased atmospheric drag in LEO. African EO satellites may require orbit corrections.' : 'Major drag increase. Communication blackouts possible.', severity: s },
    { icon: '⚡', sector: 'Power Infrastructure', impact: kp < 2 ? 'No induced currents detected. Power grids operating normally.' : kp < 4 ? 'Weak GIC signals in long transmission lines. South African grid monitoring active.' : kp < 5 ? 'Moderate geomagnetically induced currents in Southern African power networks.' : 'Strong GIC risk threatening transformer damage.', severity: s },
    { icon: '🌍', sector: 'Earth Observation', impact: kp < 2 ? 'Clear atmospheric conditions for EO satellites. Optimal data quality.' : kp < 4 ? 'Minor ionospheric distortion affecting radar and optical EO data.' : kp < 5 ? 'Ionospheric disturbances degrading SAR and optical imagery over equatorial Africa.' : 'Severe scintillation disrupting all EO operations.', severity: s },
  ];
}

function getAlerts(kp) {
  const now = new Date();
  const t = (m) => { const d = new Date(now.getTime() - m * 60000); return d.toUTCString().slice(17, 22) + ' UTC'; };
  if (kp < 2) return [
    { msg: 'All systems nominal — quiet geomagnetic conditions over Africa', color: '#22c55e', time: t(0) },
    { msg: 'GNSS positioning accuracy optimal across the continent', color: '#22c55e', time: t(18) },
    { msg: 'Satellite communications operating at full capacity', color: '#22c55e', time: t(35) },
  ];
  const list = [];
  if (kp >= 2) list.push({ msg: 'Equatorial Ionization Anomaly active over Central Africa', color: '#22d3ee', time: t(4) });
  if (kp >= 3) list.push({ msg: 'GNSS accuracy degradation detected across equatorial Africa', color: '#EF9F27', time: t(9) });
  if (kp >= 4) list.push({ msg: 'HF radio disruptions reported across the Sahel and East Africa', color: '#f97316', time: t(14) });
  if (kp >= 5) list.push({ msg: 'Solar particle flux elevated — increased satellite drag risk', color: '#ef4444', time: t(3) });
  if (kp >= 6) list.push({ msg: 'Geomagnetic storm — power grid risk across Southern Africa', color: '#dc2626', time: t(1) });
  return list;
}

const SEV_COLOR = { low: '#22c55e', medium: '#EF9F27', high: '#ef4444' };
const cardShell = { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(34,211,238,0.14)', borderRadius: 16, padding: 20 };

function KpTrendChart({ history, status }) {
  const points = (history || []).slice(-48);
  if (points.length < 4) return null;
  const vals = points.map(p => parseFloat(p.kp_index ?? p.estimated_kp) || 0);
  const w = 280; const h = 56;
  const path = vals.map((v, i) => `${i === 0 ? 'M' : 'L'}${((i / (vals.length - 1)) * w).toFixed(1)},${(h - (v / 9) * h).toFixed(1)}`).join(' ');
  return (
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ fontSize: '0.58rem', color: '#6b7280', marginBottom: 6, fontWeight: 700 }}>Kp trend (last ~48 min)</div>
      <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ maxWidth: w, height: h, display: 'block' }}>
        <path d={path} fill="none" stroke={status.color} strokeWidth={2} strokeLinecap="round" />
      </svg>
    </div>
  );
}

function KpCard({ kp, status, loading, error, updated, history, apiMode }) {
  const barPct = Math.min((kp / 9) * 100, 100);
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${status.color}35`, borderRadius: 16, padding: 22 }}>
      <div style={{ fontSize: '0.63rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#6b7280', marginBottom: 14 }}>
        Live Kp Index · {apiMode === 'live' ? 'NOAA SWPC' : 'Demo model'}
      </div>
      {loading ? <div style={{ padding: '40px 0', textAlign: 'center', color: '#a0a8c0' }}>Fetching data…</div>
        : error ? <div style={{ padding: '40px 0', textAlign: 'center', color: '#ef4444' }}>API unavailable</div>
        : (<>
          <div style={{ textAlign: 'center', margin: '10px 0 14px', position: 'relative' }}>
            <div style={{ fontSize: '5rem', fontWeight: 900, color: status.color, lineHeight: 1, fontFamily: 'monospace' }}>{kp.toFixed(1)}</div>
            <div style={{ fontSize: '0.68rem', color: '#6b7280' }}>Planetary Kp Index</div>
          </div>
          <div style={{ textAlign: 'center', marginBottom: 18 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: status.bg, border: `1px solid ${status.color}50`, borderRadius: 20, padding: '5px 16px', fontSize: '0.8rem', fontWeight: 800, color: status.color }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: status.color, animation: 'swPulse 1.5s infinite' }} />
              {status.label}
            </span>
          </div>
          <div style={{ height: 7, borderRadius: 4, background: 'rgba(255,255,255,0.07)', overflow: 'hidden', marginBottom: 8 }}>
            <div style={{ height: '100%', width: `${barPct}%`, background: 'linear-gradient(to right,#22c55e,#22d3ee,#EF9F27,#f97316,#ef4444)', borderRadius: 4, transition: 'width 1.2s' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.58rem', color: '#374151' }}>{[0,1,2,3,4,5,6,7,8,9].map(n => <span key={n}>{n}</span>)}</div>
          {updated && <div style={{ fontSize: '0.6rem', color: '#374151', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 10, marginTop: 12 }}>Updated {updated.toUTCString().slice(17, 22)} UTC · auto-refresh 60s</div>}
          <KpTrendChart history={history} status={status} />
        </>)}
    </div>
  );
}

function AlertsPanel({ alerts, regionId }) {
  const region = AFRICAN_REGIONS.find(r => r.id === regionId);
  const primary = alerts[0] || { msg: 'No active alerts', color: '#22c55e', time: '--:-- UTC' };
  const secondary = alerts.slice(1);
  const allQuiet = alerts.every(a => a.color === '#22c55e');
  return (
    <div style={{ background: 'linear-gradient(135deg,rgba(15,23,42,0.86),rgba(8,12,36,0.94))', border: '1px solid rgba(34,211,238,0.16)', borderRadius: 16, padding: 16, minHeight: 300 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: allQuiet ? '#22c55e' : '#EF9F27', animation: 'swPulse 1.5s infinite' }} />
        <div style={{ fontSize: '0.63rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#8b95ad' }}>Africa Space Weather Alerts</div>
        <span style={{ marginLeft: 'auto', fontSize: '0.58rem', fontWeight: 800, color: '#22d3ee', background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.22)', borderRadius: 999, padding: '4px 10px' }}>LIVE FEED</span>
      </div>
      <div className="sw-alert-layout" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 176px', gap: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 12, padding: '14px 16px', background: `${primary.color}10`, border: `1px solid ${primary.color}36`, borderRadius: 12 }}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: primary.color, flexShrink: 0, marginTop: 5 }} />
            <div>
              <div style={{ fontSize: '0.58rem', color: primary.color, fontWeight: 800, textTransform: 'uppercase', marginBottom: 5 }}>Current condition</div>
              <p style={{ margin: 0, fontSize: '0.86rem', color: '#f0f6ff', lineHeight: 1.45 }}>{primary.msg}</p>
              <span style={{ fontSize: '0.6rem', color: '#667085', fontFamily: 'monospace', marginTop: 8, display: 'block' }}>{primary.time}</span>
            </div>
          </div>
          <div className="sw-alert-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 10 }}>
            {secondary.map((a, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, padding: '11px 12px', background: 'rgba(15,23,42,0.58)', border: `1px solid ${a.color}28`, borderRadius: 11 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: a.color, flexShrink: 0, marginTop: 5 }} />
                <div><p style={{ margin: 0, fontSize: '0.74rem', color: '#d1d5db', lineHeight: 1.45 }}>{a.msg}</p><span style={{ fontSize: '0.58rem', color: '#4b5563', fontFamily: 'monospace' }}>{a.time}</span></div>
              </div>
            ))}
          </div>
        </div>
        <div className="sw-alert-rail" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[['Status', allQuiet ? 'Stable operations' : 'Watch conditions', allQuiet ? '#22c55e' : '#EF9F27'], ['Coverage', region?.label || 'Pan-African', '#22d3ee'], ['African hub', 'SANSA + ZINGSA CORS', '#22c55e'], ['Source', 'NOAA SWPC + API', '#7F77DD']].map(([label, value, color]) => (
            <div key={label} style={{ background: `${color}0d`, border: `1px solid ${color}26`, borderRadius: 11, padding: '10px 11px' }}>
              <div style={{ fontSize: '0.56rem', color: '#697386', fontWeight: 800, textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
              <strong style={{ color, fontSize: '0.78rem' }}>{value}</strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ImpactPanel({ impacts, status }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(127,119,221,0.18)', borderRadius: 16, padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ fontSize: '0.63rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#6b7280' }}>Africa Impact Analysis</div>
        <span style={{ marginLeft: 'auto', fontSize: '0.68rem', color: status.color, fontWeight: 700, background: status.bg, padding: '3px 12px', borderRadius: 20, border: `1px solid ${status.color}40` }}>{status.label} Conditions</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(250px,1fr))', gap: 10 }}>
        {impacts.map((item, i) => (
          <div key={i} style={{ background: 'rgba(255,255,255,0.025)', border: `1px solid ${SEV_COLOR[item.severity]}25`, borderRadius: 12, padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
              <strong style={{ fontSize: '0.8rem', color: '#e2e8f0', flex: 1 }}>{item.sector}</strong>
              <span style={{ fontSize: '0.58rem', fontWeight: 700, color: SEV_COLOR[item.severity], background: `${SEV_COLOR[item.severity]}18`, padding: '2px 7px', borderRadius: 8, textTransform: 'uppercase' }}>{item.severity}</span>
            </div>
            <p style={{ margin: 0, fontSize: '0.74rem', color: '#a0a8c0', lineHeight: 1.55 }}>{item.impact}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function RegionSelector({ regionId, onChange }) {
  return (
    <div style={{ ...cardShell, marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}><MapPin size={14} color="#22d3ee" /><span style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#22d3ee' }}>African region focus</span></div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {AFRICAN_REGIONS.map(r => (
          <button key={r.id} type="button" onClick={() => onChange(r.id)} style={{ padding: '8px 14px', borderRadius: 999, cursor: 'pointer', fontSize: '0.74rem', fontWeight: 700, background: regionId === r.id ? 'rgba(34,211,238,0.14)' : 'rgba(0,0,0,0.25)', border: `1px solid ${regionId === r.id ? 'rgba(34,211,238,0.45)' : 'rgba(255,255,255,0.08)'}`, color: regionId === r.id ? '#22d3ee' : '#94a3b8' }}>{r.flag} {r.label}</button>
        ))}
      </div>
      <p style={{ margin: '12px 0 0', fontSize: '0.76rem', color: '#a0a8c0', lineHeight: 1.55 }}>{AFRICAN_REGIONS.find(r => r.id === regionId)?.eiaNote}</p>
    </div>
  );
}

function EiaExplainerCard({ regionId }) {
  const region = AFRICAN_REGIONS.find(r => r.id === regionId) || AFRICAN_REGIONS[0];
  return (
    <div style={{ ...cardShell, borderColor: 'rgba(34,211,238,0.22)', background: 'linear-gradient(135deg,rgba(34,211,238,0.06),rgba(8,12,36,0.5))' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}><Sun size={16} color="#EF9F27" /><strong style={{ color: '#e2e8f0', fontSize: '0.88rem' }}>Equatorial Ionization Anomaly (EIA)</strong></div>
      <p style={{ margin: '0 0 10px', fontSize: '0.78rem', color: '#cbd5e1', lineHeight: 1.6 }}>Solar UV ionizes the atmosphere. Over the geomagnetic equator (through Central Africa), plasma piles up into two dense <strong>crests</strong> north and south of the equator. This is why GPS in Kinshasa, Lagos, and Nairobi behaves worse than in Johannesburg or Cairo during the same Kp level.</p>
      <p style={{ margin: 0, fontSize: '0.74rem', color: '#94a3b8', lineHeight: 1.55 }}>{region.eiaNote}</p>
    </div>
  );
}

function MonitoringCentresPanel() {
  return (
    <div style={{ ...cardShell, marginBottom: 16 }}>
      <div style={{ fontSize: '0.63rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#6b7280', marginBottom: 14 }}>African monitoring centres</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 10 }}>
        {AFRICAN_MONITORING_CENTRES.map(c => (
          <div key={c.name} style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.025)', border: `1px solid ${c.color}28`, borderRadius: 12 }}>
            <strong style={{ fontSize: '0.78rem', color: '#e2e8f0' }}>{c.flag} {c.name}</strong>
            <p style={{ margin: '6px 0 0', fontSize: '0.72rem', color: '#94a3b8', lineHeight: 1.5 }}>{c.role}</p>
            {c.url && <a href={c.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.68rem', color: c.color, marginTop: 6, display: 'inline-block' }}>Visit →</a>}
          </div>
        ))}
      </div>
    </div>
  );
}

function SatellitesAtRiskPanel({ kp }) {
  const elevated = kp >= 4;
  return (
    <div style={{ ...cardShell, borderColor: 'rgba(239,159,39,0.2)', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}><Satellite size={14} color="#EF9F27" /><span style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#EF9F27' }}>African satellites &amp; missions</span>{elevated && <span style={{ marginLeft: 'auto', fontSize: '0.62rem', fontWeight: 800, color: '#ef4444', background: 'rgba(239,68,68,0.12)', padding: '3px 8px', borderRadius: 8 }}>Elevated risk</span>}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 8 }}>
        {AFRICAN_SATELLITES_AT_RISK.map(s => (
          <div key={s.name} style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.025)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)' }}>
            <strong style={{ fontSize: '0.78rem', color: '#e2e8f0' }}>{s.name}</strong>
            <span style={{ display: 'block', fontSize: '0.65rem', color: '#64748b', margin: '2px 0 6px' }}>{s.country} · {s.orbit}</span>
            <p style={{ margin: 0, fontSize: '0.7rem', color: elevated ? '#fca5a5' : '#94a3b8', lineHeight: 1.45 }}>{s.risk}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SpaceWeatherAfrica() {
  const [kp, setKp] = useState(1.0);
  const [kpHistory, setKpHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [updated, setUpdated] = useState(null);
  const [regionId, setRegionId] = useState('pan');
  const [apiMode, setApiMode] = useState('demo');

  const fetchKp = async () => {
    try {
      let data;
      try {
        data = await fetchAfricaSpaceWeather();
      } catch {
        data = await fetchLiveKp();
      }
      setKp(parseFloat(data.kp_index) || 1);
      setKpHistory(data.history || []);
      setApiMode(data.mode || 'live');
      setUpdated(new Date());
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKp();
    const id = setInterval(fetchKp, 60000);
    return () => clearInterval(id);
  }, []);

  const status = getKpStatus(kp);
  const impacts = getImpacts(kp);
  const alerts = getAlerts(kp);
  const regionMeta = AFRICAN_REGIONS.find(r => r.id === regionId) || AFRICAN_REGIONS[0];

  return (
    <div className="sw-page" style={{ padding: '24px', paddingBottom: 56, maxWidth: 1400, margin: '0 auto' }}>
      <style>{`@keyframes swPulse{0%,100%{opacity:1}50%{opacity:0.35}}`}</style>

      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.15em', color: '#22d3ee', textTransform: 'uppercase', background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.25)', borderRadius: 20, padding: '4px 14px', marginBottom: 12 }}>
          ZINGSA · LIVE IONOSPHERIC MONITOR
        </span>
        <h2 style={{ margin: '0 0 10px', fontSize: '1.65rem', fontWeight: 900, color: '#e2e8f0' }}>Space Weather <span style={{ color: '#22d3ee' }}>Over Africa</span></h2>
        <p style={{ margin: '0 auto', maxWidth: 640, fontSize: '0.85rem', color: '#a0a8c0', lineHeight: 1.7 }}>
          Real-time geomagnetic conditions from NOAA SWPC via <code style={{ color: '#22d3ee' }}>/api/space-weather/africa</code>, interpreted for African GNSS, satellites, aviation, power grids, and CORS networks.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 14 }}>
          {['🇿🇦 SANSA', '🇳🇬 NASRDA', '🇿🇼 ZINGSA', '🇪🇬 NARSS', '🌍 African CORS'].map(tag => (
            <span key={tag} style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 999, padding: '4px 12px' }}>{tag}</span>
          ))}
        </div>
      </div>

      <RegionSelector regionId={regionId} onChange={setRegionId} />

      <div className="sw-top-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(260px,288px) minmax(0,1fr)', gap: 16, marginBottom: 16 }}>
        <KpCard kp={kp} status={status} loading={loading} error={error} updated={updated} history={kpHistory} apiMode={apiMode} />
        <AlertsPanel alerts={alerts} regionId={regionId} />
      </div>

      <div style={{ marginBottom: 16 }}>
        <AfricaIonosphereMap kp={kp} status={status} regionId={regionId} regionSummary={regionMeta.summary} />
      </div>

      <div style={{ marginBottom: 16 }}><EiaExplainerCard regionId={regionId} /></div>
      <MonitoringCentresPanel />
      <div style={{ marginBottom: 16 }}><SatellitesAtRiskPanel kp={kp} /></div>
      <ImpactPanel impacts={impacts} status={status} />
    </div>
  );
}
