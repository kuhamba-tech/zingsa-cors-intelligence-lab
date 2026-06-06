export const CORS_PERSONA_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'farmer', label: 'Surveyor' },
  { id: 'student', label: 'Student' },
  { id: 'policy', label: 'Policy' },
];

export function buildCorsHealthSummaries({ stationName, region, onlineCount, totalStations, healthPct }) {
  const base = `CORS station network check for ${stationName}, ${region}: reference stations are operational and suitable for positioning, deformation monitoring, and GNSS atmospheric sensing.`;
  return {
    overview: base,
    farmer: `Surveying teams around ${stationName} can rely on ZimCORS - ${onlineCount}/${totalStations} stations online (${healthPct}% network health). RTK corrections support cadastral surveys, control checks, engineering set-out, and centimetre-level field mapping.`,
    student: `GNSS learning lab: ${stationName} in ${region} connects to ${onlineCount} active CORS sites. Students can download RINEX, study ionospheric TEC, and practice RTK surveying with centimetre-level reference data.`,
    policy: `Policy brief - ${region} CORS network at ${healthPct}% health with ${onlineCount} online stations. Recommend sustaining NTRIP services, AFREF integration, and cross-ministry access for disaster response and national geospatial infrastructure.`,
  };
}

export function corsHealthRisk(metrics) {
  if (!metrics) return { level: 'LOW', color: '#1D9E75' };
  const online = metrics.stationStatuses?.filter(s => s.status === 'online').length ?? 0;
  const total = metrics.stationStatuses?.length || 1;
  const pct = (online / total) * 100;
  if (pct >= 80) return { level: 'LOW', color: '#1D9E75' };
  if (pct >= 60) return { level: 'MODERATE', color: '#EF9F27' };
  return { level: 'HIGH', color: '#ef4444' };
}
