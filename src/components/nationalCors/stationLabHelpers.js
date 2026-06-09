export function stationColor(status, pct) {
  if (status === 'offline') return '#ef4444';
  if (status === 'degraded' || pct < 70) return '#EF9F27';
  return '#1D9E75';
}

export function satelliteSystemLabel(satSys) {
  const labels = { G: 'GPS', R: 'GLONASS', E: 'Galileo', C: 'BeiDou', J: 'QZSS' };
  return String(satSys || 'G/R')
    .split('/')
    .filter(Boolean)
    .map(code => labels[code] || code)
    .join(' ');
}

export function receiverLabel(station) {
  if (['GWER', 'BULA'].includes(station.id)) return 'TRIMBLE NETR9';
  if (station.id === 'MUTO') return '';
  return station.satSys?.includes('E') || station.satSys?.includes('C') ? 'LEICA GR50' : '';
}

export function statusLabel(status) {
  if (status === 'online') return 'OK';
  if (status === 'warning' || status === 'degraded') return '!';
  return 'X';
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
