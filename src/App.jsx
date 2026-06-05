import React, { useState } from 'react';
import { CloudSun, Radio } from 'lucide-react';
import AfricanCORSIntelligenceLabPage from './pages/AfricanCORSIntelligenceLabPage.jsx';
import SpaceWeatherAfrica from './components/SpaceWeatherAfrica.jsx';

const PAGES = [
  { id: 'cors', label: 'CORS Intelligence Lab', icon: Radio },
  { id: 'weather', label: 'Space Weather Over Africa', icon: CloudSun },
];

export default function App() {
  const [page, setPage] = useState('cors');

  return (
    <div style={{ minHeight: '100vh', background: '#03071f' }}>
      <nav style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px', borderBottom: '1px solid rgba(127,119,221,0.18)', background: 'rgba(0,0,0,0.4)', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => setPage('cors')}
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
              padding: '8px 16px', borderRadius: 10, cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700,
              background: page === id ? (id === 'weather' ? 'rgba(34,211,238,0.12)' : 'rgba(255,140,0,0.12)') : 'transparent',
              border: `1px solid ${page === id ? (id === 'weather' ? 'rgba(34,211,238,0.4)' : 'rgba(255,140,0,0.4)') : 'rgba(255,255,255,0.08)'}`,
              color: page === id ? (id === 'weather' ? '#22d3ee' : '#ff8c00') : '#94a3b8',
            }}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </nav>

      {page === 'cors' && <AfricanCORSIntelligenceLabPage onNavigate={setPage} />}
      {page === 'weather' && <SpaceWeatherAfrica />}
    </div>
  );
}
