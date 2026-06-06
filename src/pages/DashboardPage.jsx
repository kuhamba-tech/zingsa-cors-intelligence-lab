import React from 'react';
import { Activity, BarChart3, CloudSun, Radio, Satellite, ShieldCheck } from 'lucide-react';

const statusCards = [
  { label: 'Network Focus', value: 'CORS', note: 'Zimbabwe station health and integrity', color: '#ff8c00', icon: Radio },
  { label: 'Space Weather', value: 'Africa', note: 'Kp, TEC, scintillation and alerts', color: '#22d3ee', icon: CloudSun },
  { label: 'Operational View', value: 'Live + Demo', note: 'RINEX archive and telemetry modes', color: '#1D9E75', icon: Activity },
];

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
    title: 'CORS Intelligence Lab',
    eyebrow: 'Station analysis',
    desc: 'Open the lab for regional station selection, integrity trends, GNSS quality, and network analysis.',
    icon: Radio,
    color: '#ff8c00',
  },
  {
    id: 'weather',
    title: 'Space Weather',
    eyebrow: 'Africa alerts',
    desc: 'Review African space weather risk, ionospheric impacts, sector alerts, and monitoring centers.',
    icon: CloudSun,
    color: '#22d3ee',
  },
];

export default function DashboardPage({ onNavigate }) {
  return (
    <main className="dashboard-page">
      <section className="dashboard-hero">
        <div className="dashboard-hero-copy">
          <div className="dashboard-kicker">
            <Satellite size={16} />
            ZINGSA Space Science Operations
          </div>
          <h1>CORS Intelligence Dashboard</h1>
          <p>
            A single operational entry point for the dashboard, CORS Intelligence Lab,
            and Space Weather monitoring over Africa.
          </p>
        </div>
        <div className="dashboard-hero-status" aria-label="Dashboard status">
          <ShieldCheck size={22} />
          <div>
            <span>System View</span>
            <strong>Ready</strong>
          </div>
        </div>
      </section>

      <section className="dashboard-status-grid" aria-label="Operational status">
        {statusCards.map(({ label, value, note, color, icon: Icon }) => (
          <article key={label} className="dashboard-status-card" style={{ '--accent': color }}>
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
        {dashboardLinks.map(({ id, title, eyebrow, desc, icon: Icon, color }) => (
          <article key={id} className="dashboard-link-card" style={{ '--accent': color }}>
            <div className="dashboard-link-head">
              <div className="dashboard-link-icon"><Icon size={22} /></div>
              <span>{eyebrow}</span>
            </div>
            <h2>{title}</h2>
            <p>{desc}</p>
            <button type="button" onClick={() => onNavigate?.(id)}>
              {`Open ${title}`}
            </button>
          </article>
        ))}
      </section>
    </main>
  );
}
