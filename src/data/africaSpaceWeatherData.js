/** African-focused space weather data: regions, monitoring centres, and satellites. */

export const AFRICAN_REGIONS = [
  {
    id: 'world',
    label: 'Whole World',
    flag: 'Global',
    summary: 'Global geomagnetic and ionospheric conditions from NOAA SWPC.',
    eiaNote: 'Global space weather affects GNSS, satellites, aviation, HF radio, power grids, and Earth observation services across all regions.',
  },
  {
    id: 'pan',
    label: 'All Africa',
    flag: 'AF',
    summary: 'Continent-wide geomagnetic and ionospheric conditions.',
    eiaNote: 'Africa spans equatorial, low-latitude, and mid-latitude ionospheric regions. The Equatorial Ionization Anomaly (EIA) and post-sunset scintillation can affect GNSS most strongly near equatorial Africa.',
  },
  {
    id: 'equatorial',
    label: 'Equatorial Belt',
    flag: 'EIA',
    summary: 'DRC, Uganda, Kenya, Nigeria, Ghana, and Cameroon: elevated scintillation risk.',
    eiaNote: 'EIA crests and small-scale plasma irregularities can increase TEC gradients, scintillation, and GNSS positioning errors. Effects depend on local time, season, solar activity, receiver type, and correction service.',
  },
  {
    id: 'east',
    label: 'East Africa',
    flag: 'EA',
    summary: 'Kenya, Ethiopia, Tanzania, Rwanda, and Somalia corridor.',
    eiaNote: 'East African low-latitude GNSS users should monitor TEC and scintillation during disturbed space-weather periods, especially after local sunset.',
  },
  {
    id: 'west',
    label: 'West Africa',
    flag: 'WA',
    summary: 'Nigeria, Senegal, Cote d Ivoire, Mali, and Burkina Faso.',
    eiaNote: 'West Africa includes low-latitude regions where evening ionospheric scintillation can affect GNSS, satellite links, and precision positioning.',
  },
  {
    id: 'southern',
    label: 'Southern Africa',
    flag: 'SA',
    summary: 'South Africa, Zimbabwe, Botswana, Zambia, and Mozambique.',
    eiaNote: 'Southern Africa is generally south of the main equatorial anomaly crests, but geomagnetic storms can still affect GNSS accuracy, HF radio, satellite operations, and power-grid monitoring.',
  },
  {
    id: 'north',
    label: 'North Africa',
    flag: 'NA',
    summary: 'Egypt, Morocco, Algeria, Tunisia, and Libya.',
    eiaNote: 'North Africa is mainly a mid-latitude region. During stronger geomagnetic storms, aviation, HF radio, GNSS integrity, and satellite operations should be monitored.',
  },
  {
    id: 'sahel',
    label: 'Sahel',
    flag: 'SH',
    summary: 'Mali, Niger, Chad, and Sudan: wide-area operations with sparse ground infrastructure.',
    eiaNote: 'The Sahel relies heavily on GNSS, satellite communications, and HF/VHF links in remote areas; disturbed ionospheric conditions can reduce reliability and should be monitored.',
  },
];

export const AFRICAN_MONITORING_CENTRES = [
  {
    name: 'SANSA Space Weather Centre',
    country: 'South Africa',
    flag: 'ZA',
    role: 'Operational space-weather forecasting centre serving African and international users.',
    url: 'https://spaceweather.sansa.org.za/',
    color: '#22c55e',
  },
  {
    name: 'Zimbabwe National Geospatial Agency',
    country: 'Zimbabwe',
    flag: 'ZW',
    role: 'National geospatial and CORS operations where space weather can affect surveying, positioning, and agriculture.',
    url: 'https://www.zngeospatial.space/',
    color: '#f59e0b',
  },
  {
    name: 'NIGCOMSAT / NASRDA',
    country: 'Nigeria',
    flag: 'NG',
    role: 'National satellite and space agencies monitoring satellite services and space-weather impacts.',
    url: 'https://www.nigcomsat.gov.ng/',
    color: '#EF9F27',
  },
  {
    name: 'NARSS',
    country: 'Egypt',
    flag: 'EG',
    role: 'Earth observation and space-science activities relevant to GNSS and ionospheric studies.',
    url: 'https://narss.sci.eg/',
    color: '#60a5fa',
  },
  {
    name: 'AFREF / African CORS Networks',
    country: 'Pan-African',
    flag: 'AF',
    role: 'Continuous GNSS observations support reference frames and can help monitor TEC and ionospheric effects.',
    url: null,
    color: '#7F77DD',
  },
];

export const AFRICAN_SATELLITES_AT_RISK = [
  {
    name: 'ZIMSAT-1',
    country: 'ZW Zimbabwe',
    orbit: 'LEO',
    risk: 'Low Earth orbit spacecraft can experience drag changes during geomagnetic storms and communication effects during disturbed ionospheric conditions.',
  },
  {
    name: 'NIGERIASAT-2',
    country: 'NG Nigeria',
    orbit: 'LEO',
    risk: 'Earth observation tasking and downlinks can be affected by storm-time drag, radiation environment, and communication conditions.',
  },
  {
    name: 'EgyptSat-A',
    country: 'EG Egypt',
    orbit: 'LEO',
    risk: 'LEO operations should monitor geomagnetic storms for drag and orbit-prediction impacts.',
  },
  {
    name: 'NIGCOMSAT-1R',
    country: 'NG Nigeria',
    orbit: 'GEO',
    risk: 'GEO satellite links should monitor space-weather effects alongside weather-related propagation risks.',
  },
  {
    name: 'Meteosat',
    country: 'Africa coverage',
    orbit: 'GEO',
    risk: 'Weather satellite continuity supports forecasting across Africa; operators monitor solar and geomagnetic conditions.',
  },
  {
    name: 'BOTSAT-1',
    country: 'BW Botswana',
    orbit: 'LEO',
    risk: 'New LEO missions should monitor geomagnetic storms for drag and communication conditions.',
  },
];
