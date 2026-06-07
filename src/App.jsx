import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { BarChart3, CloudSun, Radio, AlertTriangle, Waves, Telescope } from 'lucide-react';

const DashboardPage = lazy(() => import('./pages/DashboardPage.jsx'));
const AfricanCORSIntelligenceLabPage = lazy(() => import('./pages/AfricanCORSIntelligenceLabPage.jsx'));
const SpaceWeatherAfrica = lazy(() => import('./components/SpaceWeatherAfrica.jsx'));
const CorsAlertSystemPage = lazy(() => import('./pages/CorsAlertSystemPage.jsx'));
const IonosphericConditionsMonitor = lazy(() => import('./components/IonosphericConditionsMonitor.jsx'));
const ObservatoryHubPage = lazy(() => import('./pages/ObservatoryHubPage.jsx'));

const PAGES = [
  { id: 'dashboard',   path: '/',            label: 'Dashboard',              icon: BarChart3 },
  { id: 'cors',        path: '/cors',        label: 'National CORS Services', icon: Radio },
  { id: 'alerts',      path: '/alerts',      label: 'CORS Alert System',      icon: AlertTriangle },
  { id: 'weather',     path: '/weather',     label: 'Space Weather',          icon: CloudSun },
  { id: 'ionosphere',  path: '/ionosphere',  label: 'Ionospheric Conditions', icon: Waves },
  { id: 'observatory', path: '/observatory', label: 'Astronomy',              icon: Telescope },
];

function PageLoader() {
  return (
    <div style={{ padding: 48, textAlign: 'center', color: '#94a3b8' }}>
      Loading ZINGSA operations view…
    </div>
  );
}

function AppShell() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const active = PAGES.find(p => p.path === pathname)?.id
    || (pathname.startsWith('/cors') ? 'cors' : 'dashboard');

  return (
    <div style={{ minHeight: '100vh', background: '#03071f' }}>
      <nav style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px', borderBottom: '1px solid rgba(127,119,221,0.18)', background: 'rgba(0,0,0,0.4)', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => navigate('/')}
          title="Zimbabwe National Geospatial and Space Agency"
          style={{ background: 'none', border: 'none', padding: 0, marginRight: 12, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
        >
          <img
            src="/zingsa-logo.png"
            alt="ZINGSA — Zimbabwe National Geospatial and Space Agency"
            style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', display: 'block' }}
          />
        </button>
        {PAGES.map(({ id, path, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => navigate(path)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 10, cursor: 'pointer', fontSize: '1rem', fontWeight: 700,
              background: active === id ? (
                id === 'weather' || id === 'ionosphere' ? 'rgba(34,211,238,0.12)' :
                id === 'dashboard' || id === 'observatory' ? 'rgba(167,139,250,0.12)' :
                id === 'alerts' ? 'rgba(239,68,68,0.12)' :
                'rgba(255,140,0,0.12)'
              ) : 'transparent',
              border: `1px solid ${active === id ? (
                id === 'weather' || id === 'ionosphere' ? 'rgba(34,211,238,0.4)' :
                id === 'dashboard' || id === 'observatory' ? 'rgba(167,139,250,0.4)' :
                id === 'alerts' ? 'rgba(239,68,68,0.4)' :
                'rgba(255,140,0,0.4)'
              ) : 'rgba(255,255,255,0.08)'}`,
              color: active === id ? (
                id === 'weather' || id === 'ionosphere' ? '#22d3ee' :
                id === 'dashboard' || id === 'observatory' ? '#a78bfa' :
                id === 'alerts' ? '#ef4444' :
                '#ff8c00'
              ) : '#94a3b8',
            }}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </nav>

      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<DashboardPage onNavigate={id => navigate(PAGES.find(p => p.id === id)?.path || '/')} />} />
          <Route path="/cors" element={<AfricanCORSIntelligenceLabPage onNavigate={id => navigate(PAGES.find(p => p.id === id)?.path || '/')} />} />
          <Route path="/weather" element={<SpaceWeatherAfrica />} />
          <Route path="/ionosphere" element={<IonosphericConditionsMonitor />} />
          <Route path="/alerts" element={<CorsAlertSystemPage />} />
          <Route path="/observatory" element={<ObservatoryHubPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}
