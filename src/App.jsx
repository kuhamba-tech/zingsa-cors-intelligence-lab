import React, { useState } from 'react';
import { BarChart3, CloudSun, Radio, AlertTriangle, Waves, Telescope } from 'lucide-react';
import DashboardPage from './pages/DashboardPage.jsx';
import AfricanCORSIntelligenceLabPage from './pages/AfricanCORSIntelligenceLabPage.jsx';
import SpaceWeatherAfrica from './components/SpaceWeatherAfrica.jsx';
import CorsAlertSystemPage from './pages/CorsAlertSystemPage.jsx';
import IonosphericConditionsMonitor from './components/IonosphericConditionsMonitor.jsx';
import ObservatoryHubPage from './pages/ObservatoryHubPage.jsx';

const PAGES = [
  { id: 'dashboard',   label: 'Dashboard',               icon: BarChart3 },
  { id: 'cors',        label: 'National CORS Services',   icon: Radio },
  { id: 'alerts',      label: 'CORS Alert System',        icon: AlertTriangle },
  { id: 'weather',     label: 'Space Weather',            icon: CloudSun },
  { id: 'ionosphere',  label: 'Ionospheric Conditions',   icon: Waves },
  { id: 'observatory', label: 'Astronomy',                icon: Telescope },
];

export default function App() {
  const [page, setPage] = useState('alerts');

  return (
    <div style={{ minHeight: '100vh', background: '#03071f' }}>
      <nav style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px', borderBottom: '1px solid rgba(127,119,221,0.18)', background: 'rgba(0,0,0,0.4)', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => setPage('dashboard')}
          title="Zimbabwe National Geospatial and Space Agency"
          style={{ background: 'none', border: 'none', padding: 0, marginRight: 12, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
        >
          <img
            src="/zingsa-logo.png"
            alt="ZINGSA — Zimbabwe National Geospatial and Space Agency"
            style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', display: 'block' }}
          />
        </button>
        {PAGES.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setPage(id)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 10, cursor: 'pointer', fontSize: '1rem', fontWeight: 700,
              background: page === id ? (
                id === 'weather'     ? 'rgba(34,211,238,0.12)' :
                id === 'ionosphere'  ? 'rgba(34,211,238,0.12)' :
                id === 'dashboard'   ? 'rgba(167,139,250,0.12)' :
                id === 'alerts'      ? 'rgba(239,68,68,0.12)' :
                id === 'observatory' ? 'rgba(167,139,250,0.12)' :
                'rgba(255,140,0,0.12)'
              ) : 'transparent',
              border: `1px solid ${page === id ? (
                id === 'weather'     ? 'rgba(34,211,238,0.4)' :
                id === 'ionosphere'  ? 'rgba(34,211,238,0.4)' :
                id === 'dashboard'   ? 'rgba(167,139,250,0.4)' :
                id === 'alerts'      ? 'rgba(239,68,68,0.4)' :
                id === 'observatory' ? 'rgba(167,139,250,0.4)' :
                'rgba(255,140,0,0.4)'
              ) : 'rgba(255,255,255,0.08)'}`,
              color: page === id ? (
                id === 'weather'     ? '#22d3ee' :
                id === 'ionosphere'  ? '#22d3ee' :
                id === 'dashboard'   ? '#a78bfa' :
                id === 'alerts'      ? '#ef4444' :
                id === 'observatory' ? '#a78bfa' :
                '#ff8c00'
              ) : '#94a3b8',
            }}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </nav>

      {page === 'dashboard'   && <DashboardPage onNavigate={setPage} />}
      {page === 'cors'        && <AfricanCORSIntelligenceLabPage onNavigate={setPage} />}
      {page === 'weather'     && <SpaceWeatherAfrica />}
      {page === 'ionosphere'  && <IonosphericConditionsMonitor />}
      {page === 'alerts'      && <CorsAlertSystemPage />}
      {page === 'observatory' && <ObservatoryHubPage />}
    </div>
  );
}
