/** RINEX 4-char receiver codes → ZINGSA station IDs (from TEC MATLAB catalogue) */

export const RINEX_PREFIX_TO_STATION = {
  zinh: 'ZINH',
  cent: 'CENT',
  chim: 'CHIM',
  chir: 'CHIR',
  gokw: 'GOKW',
  gsu_: 'GSU_',
  gsu: 'GSU_',
  lupa: 'LUPA',
  kwek: 'KWEK',
  karo: 'KARO',
  bula: 'BULA',
  gwer: 'GWER',
  hara: 'HARA',
  muta: 'MUTA',
  masv: 'MASV',
  kari: 'KARI',
  beit: 'BEIT',
  bing: 'BING',
  harg: 'HARA',
  tsho: 'TSHO',
  muto: 'MUTO',
  chiv: 'CHIV',
  gutu: 'GUTU',
  vicf: 'VICF',
};

export const STATION_TO_RINEX_PREFIX = Object.fromEntries(
  Object.entries(RINEX_PREFIX_TO_STATION).map(([prefix, id]) => [id, prefix]),
);

/** Folder names under TEC ANALYSIS → primary station ID */
export const FOLDER_TO_STATION = {
  chimanimani: 'CHIM',
  harare: 'ZINH',
  karoi: 'KARO',
  gwanda: 'GSU_',
};

export function rinexPrefixForStation(stationId) {
  const id = String(stationId || '').toUpperCase().replace(/_$/, '');
  if (stationId === 'GSU_') return 'gsu_';
  return STATION_TO_RINEX_PREFIX[stationId] || STATION_TO_RINEX_PREFIX[id] || id.toLowerCase().slice(0, 4);
}

export function stationIdFromRinexPrefix(prefix) {
  const key = String(prefix || '').toLowerCase();
  return RINEX_PREFIX_TO_STATION[key] || key.toUpperCase();
}

/** Parse `chim0920.rnx.zip` or `gsu_0920.rnx.zip` → { prefix, doy, session } */
export function parseRinexArchiveName(filename) {
  const base = String(filename).split(/[/\\]/).pop().replace(/\.rnx\.zip$/i, '').replace(/\.zip$/i, '');
  const match = base.match(/^([a-z][a-z0-9_]{2,3})(\d{3})(\d)$/i);
  if (!match) return null;
  const [, prefix, doy, session] = match;
  const normalized = prefix.toLowerCase().replace(/_$/, '') === 'gsu' ? 'gsu_' : prefix.toLowerCase();
  return {
    prefix: normalized,
    doy: parseInt(doy, 10),
    session: parseInt(session, 10),
    stationId: stationIdFromRinexPrefix(normalized),
    archiveName: `${base}.rnx.zip`,
  };
}

export function dateToDoy(isoDate) {
  const d = new Date(`${isoDate}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  const start = new Date(Date.UTC(d.getUTCFullYear(), 0, 0));
  return Math.floor((d - start) / 86400000);
}

export function doyToIsoDate(year, doy) {
  const d = new Date(Date.UTC(year, 0, 1));
  d.setUTCDate(doy);
  return d.toISOString().slice(0, 10);
}

export function normalizeRinexYear(twoDigitYear) {
  const yy = Number(twoDigitYear);
  if (!Number.isInteger(yy)) return null;
  return yy >= 80 ? 1900 + yy : 2000 + yy;
}

/** Parse RINEX obs file names like `zinh0920.24o` or `gsu_0920.22O`. */
export function parseRinexObsFilename(filename) {
  const base = String(filename || '').split(/[/\\]/).pop();
  const shortName = base.match(/^([a-z][a-z0-9_]{2,3})(\d{3})([0-9a-x])\.(\d{2})[oOdD]$/i);
  if (shortName) {
    const [, prefix, doy, session, yy] = shortName;
    const normalized = prefix.toLowerCase().replace(/_$/, '') === 'gsu' ? 'gsu_' : prefix.toLowerCase();
    const year = normalizeRinexYear(yy);
    return {
      prefix: normalized,
      stationId: stationIdFromRinexPrefix(normalized),
      doy: parseInt(doy, 10),
      session: /^[0-9]$/.test(session) ? parseInt(session, 10) : session.toLowerCase(),
      sessionKey: session.toLowerCase(),
      year,
      date: year ? doyToIsoDate(year, parseInt(doy, 10)) : null,
    };
  }

  const longName = base.match(/_(\d{4})(\d{3})(\d{2})(\d{2})_/);
  if (longName) {
    const [, year, doy] = longName;
    return {
      year: parseInt(year, 10),
      doy: parseInt(doy, 10),
      date: doyToIsoDate(parseInt(year, 10), parseInt(doy, 10)),
    };
  }

  return null;
}

/** Leica Spider: `Spider/2025_05_06/BEIT/beit126a15.rnx.zip` or `Spider/MDB/2024_08_05/ZINH/...` */
export function parseSpiderArchivePath(filePath) {
  const normalized = String(filePath).replace(/\\/g, '/');
  const parts = normalized.split('/');
  const spiderIdx = parts.findIndex(p => p.toLowerCase() === 'spider');
  if (spiderIdx < 0) return null;

  const dateIdx = parts.findIndex((p, i) => i > spiderIdx && /^\d{4}_\d{2}_\d{2}$/.test(p));
  if (dateIdx < 0) return null;

  const dateFolder = parts[dateIdx];
  const stationFolder = (parts[dateIdx + 1] || '').toUpperCase();
  if (!/^[A-Z][A-Z0-9_]{2,3}$/.test(stationFolder)) return null;

  const filename = parts[parts.length - 1] || '';
  const base = filename.replace(/\.rnx\.zip$/i, '').replace(/\.zip$/i, '');

  const dateMatch = dateFolder.match(/^(\d{4})_(\d{2})_(\d{2})$/);
  const date = dateMatch ? `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}` : null;
  const year = dateMatch ? parseInt(dateMatch[1], 10) : null;

  const nameMatch = base.match(/^([a-z][a-z0-9_]{3})(\d+)([a-z])(\d{2})$/i);
  const prefix = nameMatch ? nameMatch[1].toLowerCase() : base.slice(0, 4).toLowerCase();
  const gpsWeek = nameMatch ? parseInt(nameMatch[2], 10) : null;
  const sessionBlock = nameMatch ? nameMatch[3].toLowerCase() : 'a';
  const sessionMinute = nameMatch ? parseInt(nameMatch[4], 10) : 0;
  const sessionKey = `${sessionBlock}${String(sessionMinute).padStart(2, '0')}`;

  const FOLDER_STATION = { VIC_: 'VICF', HARG: 'HARA', GSU: 'GSU_' };
  const stationId = FOLDER_STATION[stationFolder] || stationFolder || stationIdFromRinexPrefix(prefix);
  const doy = date ? dateToDoy(date) : null;

  return {
    sourceId: 'gnss-apps',
    format: 'leica-spider',
    prefix,
    stationId,
    date,
    year,
    doy,
    gpsWeek,
    sessionBlock,
    sessionMinute,
    sessionKey,
    session: sessionMinute,
    archiveName: filename,
    id: `gnss-apps-${stationId}-${date || 'unknown'}-${sessionKey}`,
  };
}

/** Map HH:MM to nearest Spider 15-min session slot */
export function spiderSessionFromTime(timeStr) {
  const [h, m] = String(timeStr || '00:00').split(':').map(Number);
  const totalMin = (h || 0) * 60 + (m || 0);
  const blockIndex = Math.floor(totalMin / 360) % 4;
  const blockLetter = String.fromCharCode(97 + blockIndex);
  const minInBlock = totalMin % 360;
  const slot = [0, 15, 30, 45].reduce((best, s) =>
    Math.abs(s - minInBlock) < Math.abs(best - minInBlock) ? s : best, 0);
  return { sessionBlock: blockLetter, sessionMinute: slot, sessionKey: `${blockLetter}${String(slot).padStart(2, '0')}` };
}

export function isStandardZipFile(buffer) {
  return buffer && buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b;
}
