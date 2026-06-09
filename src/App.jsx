import React, { Component, Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { BarChart3, CloudSun, Radio, AlertTriangle, Waves, Telescope } from 'lucide-react';
import { OPERATIONAL_LINK_TARGETS } from './components/OperationalServicesNav.jsx';
import { OpsHealthProvider, useOpsHealth } from './context/OpsHealthContext.jsx';

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

function navigateToPage(navigate, id, path) {
  navigate(path || OPERATIONAL_LINK_TARGETS[id] || PAGES.find(p => p.id === id)?.path || '/');
}

function mainNavTarget(id, path, alertsPath) {
  if (id === 'dashboard') return '/';
  if (id === 'alerts') return alertsPath;
  return OPERATIONAL_LINK_TARGETS[id] || path;
}

function PageLoader() {
  return (
    <div style={{ padding: 48, textAlign: 'center', color: '#94a3b8' }}>
      Loading ZINGSA operations view…
    </div>
  );
}

class PageErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidUpdate(prevProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    const { error } = this.state;
    if (error) {
      return (
        <div style={{ padding: 48, maxWidth: 560, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ color: '#f8fafc', marginBottom: 12 }}>This page failed to load</h2>
          <p style={{ color: '#94a3b8', lineHeight: 1.6, marginBottom: 20 }}>
            {error.message || 'An unexpected error stopped this view from rendering.'}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 18px',
              borderRadius: 10,
              border: '1px solid rgba(167,139,250,0.4)',
              background: 'rgba(167,139,250,0.12)',
              color: '#e9d5ff',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Reload page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppShell() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { badgeCount, alertsPath } = useOpsHealth();
  const active = PAGES.find(p => (p.path === '/' ? pathname === '/' : pathname.startsWith(p.path)))?.id
    || 'dashboard';

  return (
    <div style={{ minHeight: '100vh', background: '#03071f' }}>
      <nav style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderBottom: '1px solid rgba(127,119,221,0.18)', background: 'rgba(0,0,0,0.4)', flexWrap: 'nowrap', overflowX: 'auto' }}>
        <button
          type="button"
          onClick={() => navigate('/')}
          title="Zimbabwe National Geospatial and Space Agency"
          style={{
            width: 54,
            height: 54,
            background: 'radial-gradient(circle at 50% 44%, rgba(37, 99, 235, 0.28), rgba(3, 7, 31, 0.04) 68%)',
            border: '1px solid rgba(34, 211, 238, 0.2)',
            borderRadius: 10,
            padding: 4,
            marginRight: 8,
            flexShrink: 0,
            cursor: 'pointer',
            display: 'grid',
            placeItems: 'center',
          }}
        >
          <img
            src="/zingsa-logo-official.png"
            alt="ZINGSA — Zimbabwe National Geospatial and Space Agency"
            style={{ width: 46, height: 46, objectFit: 'contain', display: 'block' }}
          />
        </button>
        {PAGES.map(({ id, path, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => navigate(mainNavTarget(id, path, alertsPath))}
            title={id === 'alerts' && badgeCount > 0 ? `${badgeCount} station or alert item(s) need review` : undefined}
            style={{
              position: 'relative',
              display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap',
              padding: '7px 11px', borderRadius: 9, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700,
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
            {id === 'alerts' && badgeCount > 0 && (
              <span
                aria-label={`${badgeCount} attention items`}
                style={{
                  marginLeft: 2,
                  minWidth: 18,
                  height: 18,
                  padding: '0 5px',
                  borderRadius: 9,
                  background: '#ef4444',
                  color: '#fff',
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  lineHeight: '18px',
                  textAlign: 'center',
                }}
              >
                {badgeCount > 9 ? '9+' : badgeCount}
              </span>
            )}
          </button>
        ))}
      </nav>

      <PageErrorBoundary resetKey={pathname}>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route
              path="/"
              element={
                <DashboardPage
                  onNavigate={(id, path) => navigateToPage(navigate, id, path || (id === 'alerts' ? alertsPath : undefined))}
                />
              }
            />
            <Route path="/cors" element={<AfricanCORSIntelligenceLabPage />} />
            <Route path="/weather" element={<SpaceWeatherAfrica />} />
            <Route path="/ionosphere" element={<IonosphericConditionsMonitor />} />
            <Route path="/alerts" element={<CorsAlertSystemPage />} />
            <Route path="/observatory" element={<ObservatoryHubPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </PageErrorBoundary>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <OpsHealthProvider>
        <AppShell />
      </OpsHealthProvider>
    </BrowserRouter>
  );
}
