/**
 * NTRIP Sourcetable Parser
 * Parses the caster sourcetable response into structured STR/NET/CAS records.
 * Spec: RTCM NTRIP Version 1 & 2 (BNC sourcetable format)
 */

// STR record field positions per NTRIP spec
const STR_FIELDS = [
  'mountpoint', 'identifier', 'format', 'formatDetails', 'carrier',
  'navSystem', 'network', 'country', 'lat', 'lon', 'nmea', 'solution',
  'generator', 'comprEncryp', 'authentication', 'fee', 'bitrate', 'misc',
];

const NET_FIELDS = [
  'identifier', 'operator', 'authentication', 'fee', 'webNet',
  'webStream', 'regStream', 'misc',
];

const CAS_FIELDS = [
  'host', 'port', 'identifier', 'operator', 'nmea', 'country',
  'lat', 'lon', 'fallbackHost', 'fallbackPort', 'misc',
];

/** Parse a single semicolon-delimited sourcetable line */
function parseLine(line) {
  const parts = line.split(';');
  const type = parts[0]?.trim().toUpperCase();

  if (type === 'STR') {
    const rec = { type: 'STR' };
    STR_FIELDS.forEach((f, i) => { rec[f] = (parts[i + 1] ?? '').trim(); });
    rec.lat  = parseFloat(rec.lat)  || 0;
    rec.lon  = parseFloat(rec.lon)  || 0;
    rec.port = parseInt(parts[2]) || 0;
    rec.constellations = detectConstellations(rec.navSystem, rec.formatDetails);
    rec.rtcmMessages   = parseFormatDetails(rec.formatDetails);
    return rec;
  }

  if (type === 'NET') {
    const rec = { type: 'NET' };
    NET_FIELDS.forEach((f, i) => { rec[f] = (parts[i + 1] ?? '').trim(); });
    return rec;
  }

  if (type === 'CAS') {
    const rec = { type: 'CAS' };
    CAS_FIELDS.forEach((f, i) => { rec[f] = (parts[i + 1] ?? '').trim(); });
    rec.lat  = parseFloat(rec.lat)  || 0;
    rec.lon  = parseFloat(rec.lon)  || 0;
    rec.port = parseInt(rec.port)  || 2101;
    return rec;
  }

  return null;
}

/** Detect GNSS constellations from navSystem string and format details */
function detectConstellations(navSystem, formatDetails) {
  const s = `${navSystem} ${formatDetails}`.toUpperCase();
  const consts = [];
  if (/GPS|G\b/.test(s))     consts.push('GPS');
  if (/GLO|GLONASS|R\b/.test(s)) consts.push('GLONASS');
  if (/GAL|GALILEO|E\b/.test(s)) consts.push('Galileo');
  if (/BDS|BEIDOU|C\b/.test(s))  consts.push('BeiDou');
  if (/QZSS|J\b/.test(s))    consts.push('QZSS');
  if (/SBAS|S\b/.test(s))    consts.push('SBAS');
  // Detect from MSM message ranges
  if (/107[1-7]/.test(s)) consts.includes('GPS')     || consts.push('GPS');
  if (/108[1-7]/.test(s)) consts.includes('GLONASS') || consts.push('GLONASS');
  if (/109[1-7]/.test(s)) consts.includes('Galileo') || consts.push('Galileo');
  if (/112[1-7]/.test(s)) consts.includes('BeiDou')  || consts.push('BeiDou');
  return [...new Set(consts)];
}

/** Parse format-details like "1005(1),1077(1),1087(1),1097(1),1127(1)" */
function parseFormatDetails(details) {
  if (!details) return [];
  return [...details.matchAll(/(\d{4})(?:\((\d+)\))?/g)].map(m => ({
    type: parseInt(m[1]),
    rate: m[2] ? parseInt(m[2]) : null,
  }));
}

/** Parse a complete sourcetable HTTP response body */
export function parseSourcetable(raw) {
  const lines  = raw.replace(/\r/g, '').split('\n');
  const result = { casters: [], networks: [], streams: [] };
  let inTable  = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed === 'ENDSOURCETABLE') break;

    // Skip HTTP headers until we hit sourcetable content
    if (!inTable) {
      if (trimmed.startsWith('SOURCETABLE') || trimmed.startsWith('STR;') ||
          trimmed.startsWith('NET;') || trimmed.startsWith('CAS;')) {
        inTable = true;
      }
      if (!trimmed.startsWith('STR;') && !trimmed.startsWith('NET;') && !trimmed.startsWith('CAS;')) {
        continue;
      }
    }

    const rec = parseLine(trimmed);
    if (!rec) continue;
    if (rec.type === 'STR') result.streams.push(rec);
    if (rec.type === 'NET') result.networks.push(rec);
    if (rec.type === 'CAS') result.casters.push(rec);
  }

  return result;
}
