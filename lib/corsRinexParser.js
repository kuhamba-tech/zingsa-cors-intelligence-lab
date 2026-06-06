/** Lightweight RINEX observation header parse for demo metrics */

export function parseRinexObsHeader(text) {
  const lines = String(text).split(/\r?\n/).slice(0, 120);
  const result = {
    markerName: null,
    interval: 30,
    timeOfFirstObs: null,
    timeOfLastObs: null,
    obsTypes: 0,
    satelliteSystems: [],
    rinexVersion: null,
    lat: null,
    lon: null,
    height: null,
  };

  for (const line of lines) {
    if (line.includes('RINEX VERSION')) {
      result.rinexVersion = parseFloat(line.slice(0, 9)) || null;
    }
    if (line.includes('MARKER NAME')) {
      result.markerName = line.slice(0, 60).trim();
    }
    if (line.includes('INTERVAL')) {
      result.interval = parseFloat(line.slice(0, 10)) || result.interval;
    }
    if (line.includes('TIME OF FIRST OBS')) {
      result.timeOfFirstObs = line.slice(0, 60).trim();
    }
    if (line.includes('TIME OF LAST OBS')) {
      result.timeOfLastObs = line.slice(0, 60).trim();
    }
    if (line.includes('SYS / # / OBS TYPES')) {
      const sys = line.trim().charAt(0);
      if (sys && !result.satelliteSystems.includes(sys)) result.satelliteSystems.push(sys);
      const n = parseInt(line.slice(3, 6), 10);
      if (!Number.isNaN(n)) result.obsTypes += n;
    }
    if (line.includes('APPROX POSITION XYZ')) {
      const parts = line.slice(0, 42).trim().split(/\s+/).map(Number);
      if (parts.length >= 3) {
        const [x, y, z] = parts;
        const lon = Math.atan2(y, x) * (180 / Math.PI);
        const lat = Math.atan2(z, Math.sqrt(x * x + y * y)) * (180 / Math.PI);
        result.lat = +lat.toFixed(6);
        result.lon = +lon.toFixed(6);
        result.height = +Math.sqrt(x * x + y * y + z * z).toFixed(2);
      }
    }
    if (line.includes('END OF HEADER')) break;
  }

  return result;
}

export function isoDateFromRinexTime(value) {
  const parts = String(value || '').trim().split(/\s+/);
  if (parts.length < 3) return null;
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  if (year < 1980 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.toISOString().slice(0, 10);
}

export function rinexDateFromHeader(header) {
  return isoDateFromRinexTime(header?.timeOfFirstObs);
}

export function estimateObsEpochs(fileSizeBytes, intervalSec = 30) {
  const headerBytes = 2048;
  const bytesPerEpoch = Math.max(200, intervalSec * 12);
  return Math.max(1, Math.floor((fileSizeBytes - headerBytes) / bytesPerEpoch));
}
