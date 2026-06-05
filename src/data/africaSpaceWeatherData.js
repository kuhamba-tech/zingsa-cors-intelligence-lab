/** African-focused space weather — regions, monitoring centres, satellites */

export const AFRICAN_REGIONS = [
  { id: 'pan', label: 'All Africa', flag: '🌍', summary: 'Continent-wide geomagnetic and ionospheric conditions.', eiaNote: 'The Equatorial Ionization Anomaly (EIA) twin crests sit over Central and East Africa — the highest GNSS error belt on Earth.' },
  { id: 'equatorial', label: 'Equatorial Belt', flag: '〰️', summary: 'DRC · Uganda · Kenya · Nigeria · Ghana · Cameroon — strongest scintillation risk.', eiaNote: 'EIA crests cause GPS errors of 5–15 m without correction. Precision farming and drone surveys most affected.' },
  { id: 'east', label: 'East Africa', flag: '🌅', summary: 'Kenya · Ethiopia · Tanzania · Rwanda · Somalia corridor.', eiaNote: 'HF blackouts on trans-equatorial paths to Europe. Rift Valley CORS networks monitor TEC daily.' },
  { id: 'west', label: 'West Africa', flag: '🌊', summary: 'Nigeria · Senegal · Côte d\'Ivoire · Mali · Burkina Faso.', eiaNote: 'NIGCOMSAT and regional telecom backhaul sensitive to scintillation during evening hours.' },
  { id: 'southern', label: 'Southern Africa', flag: '⭐', summary: 'South Africa · Zimbabwe · Botswana · Zambia · Mozambique.', eiaNote: 'SANSA Space Weather Centre issues operational forecasts. Eskom grid monitors geomagnetically induced currents.' },
  { id: 'north', label: 'North Africa', flag: '☀️', summary: 'Egypt · Morocco · Algeria · Tunisia · Libya.', eiaNote: 'Cairo and Mediterranean aviation routes affected during moderate storms. NARSS and ALCOMSAT operations monitored.' },
  { id: 'sahel', label: 'Sahel', flag: '🏜️', summary: 'Mali · Niger · Chad · Sudan — sparse ground infrastructure, satellite-dependent.', eiaNote: 'HF is critical for humanitarian comms; storms can silence emergency nets for hours.' },
];

export const AFRICAN_MONITORING_CENTRES = [
  { name: 'SANSA Space Weather Centre', country: 'South Africa', flag: '🇿🇦', role: 'Africa\'s first operational space weather forecasting centre.', url: 'https://spaceweather.sansa.org.za/', color: '#22c55e' },
  { name: 'Zimbabwe National Geospatial Agency', country: 'Zimbabwe', flag: '🇿🇼', role: 'ZIMSAT operations and national CORS — space weather affects surveying and agriculture.', url: 'https://www.zngeospatial.space/', color: '#f59e0b' },
  { name: 'NIGCOMSAT / NASRDA', country: 'Nigeria', flag: '🇳🇬', role: 'National satellite operator tracking link quality during ionospheric storms.', url: 'https://www.nigcomsat.gov.ng/', color: '#EF9F27' },
  { name: 'NARSS (Egypt)', country: 'Egypt', flag: '🇪🇬', role: 'Earth observation and ionospheric studies for Nile Delta GNSS users.', url: 'https://narss.sci.eg/', color: '#60a5fa' },
  { name: 'African CORS / AFREF Networks', country: 'Pan-African', flag: '🌍', role: 'Continuous GNSS observations reveal TEC and scintillation.', url: null, color: '#7F77DD' },
];

export const AFRICAN_SATELLITES_AT_RISK = [
  { name: 'ZIMSAT-1', country: '🇿🇼 Zimbabwe', orbit: 'LEO', risk: 'UHF/VHF downlink scintillation during equatorial evening passes.' },
  { name: 'NIGERIASAT-2', country: '🇳🇬 Nigeria', orbit: 'LEO', risk: 'EO imaging schedules disrupted when TEC spikes over West Africa.' },
  { name: 'EgyptSat-A', country: '🇪🇬 Egypt', orbit: 'LEO', risk: 'Ground station in Cairo sees elevated atmospheric drag after major storms.' },
  { name: 'NIGCOMSAT-1R', country: '🇳🇬 Nigeria', orbit: 'GEO', risk: 'Ka/Ku-band rain fade plus ionospheric scintillation on feeder links.' },
  { name: 'Meteosat (EUMETSAT)', country: '🌍 Africa coverage', orbit: 'GEO', risk: 'Critical for African weather forecasting continuity.' },
  { name: 'BOTSAT-1', country: '🇧🇼 Botswana', orbit: 'LEO', risk: 'National EO asset — operators learn space weather during commissioning.' },
];
