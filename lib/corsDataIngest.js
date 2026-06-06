import {
  existsSync, mkdirSync, readFileSync, writeFileSync,
  readdirSync, statSync,
} from 'node:fs';
import { join, dirname } from 'node:path';
import { createRequire } from 'node:module';
import {
  parseRinexArchiveName, rinexPrefixForStation,
  parseSpiderArchivePath, spiderSessionFromTime, isStandardZipFile,
  parseRinexObsFilename,
} from './corsStationCodes.js';
import {
  EXTRACT_ROOT, INDEX_PATH, resolveDataSources, extractDirForArchive,
} from './corsDataPaths.js';
import { getSourceById } from './corsApiConfig.js';
import { parseRinexObsHeader, estimateObsEpochs, rinexDateFromHeader } from './corsRinexParser.js';

const require = createRequire(import.meta.url);
const AdmZip = require('adm-zip');

function ensureDir(path) {
  if (!existsSync(path)) mkdirSync(path, { recursive: true });
}

export function loadIndex() {
  if (!existsSync(INDEX_PATH)) {
    return { version: 2, updatedAt: null, archives: [], sources: [] };
  }
  try {
    return JSON.parse(readFileSync(INDEX_PATH, 'utf8'));
  } catch {
    return { version: 2, updatedAt: null, archives: [], sources: [] };
  }
}

export function saveIndex(index) {
  ensureDir(dirname(INDEX_PATH));
  index.version = 2;
  index.updatedAt = new Date().toISOString();
  writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2), 'utf8');
}

function detectSourceId(rootPath) {
  const norm = String(rootPath).replace(/\\/g, '/').toLowerCase();
  if (norm.includes('/cors data/gnss-data/apps') || norm.includes('/spider')) return 'gnss-apps';
  if (norm.includes('tec anal')) return 'tec-analysis';
  return 'unknown';
}

const SPIDER_SKIP_DIRS = new Set(['temp', 'sql_db_backup', 'realtime processing', 'loggingserver']);

function walkZipFiles(root, maxSizeMb = 500) {
  const results = [];
  if (!existsSync(root)) return results;

  function walk(dir) {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      const full = join(dir, ent.name);
      if (ent.isDirectory()) {
        if (!SPIDER_SKIP_DIRS.has(ent.name.toLowerCase())) walk(full);
        continue;
      }
      const lower = ent.name.toLowerCase();
      if (!lower.endsWith('.zip') && !lower.endsWith('.rnx.zip')) continue;
      const stat = statSync(full);
      if (stat.size > maxSizeMb * 1024 * 1024) continue;
      results.push({ path: full, size: stat.size, name: ent.name });
    }
  }

  walk(root);
  return results;
}

function buildArchiveRecord(file, rootPath) {
  const sourceId = detectSourceId(rootPath) || detectSourceId(file.path);
  const head = readFileSync(file.path).slice(0, 4);

  if (sourceId === 'gnss-apps' || String(file.path).toLowerCase().includes('spider')) {
    const spider = parseSpiderArchivePath(file.path);
    if (!spider) return null;
    const zipType = isStandardZipFile(head) ? 'zip' : 'leica-spider';
    const obsMeta = zipType === 'zip' ? readObsMetadataFromZip(file.path) : null;
    const rinexDate = obsMeta?.date;
    if (!rinexDate) return null;
    return {
      ...spider,
      id: `gnss-apps-${spider.stationId}-${rinexDate || 'unknown'}-${spider.sessionKey}`,
      date: rinexDate,
      year: obsMeta?.year || spider.year,
      doy: obsMeta?.doy || spider.doy,
      format: zipType,
      archivePath: file.path,
      sizeBytes: file.size,
      extracted: false,
      extractPath: null,
      rinexFile: obsMeta?.rinexFile || null,
      header: obsMeta?.header || null,
      dateSource: obsMeta?.dateSource,
    };
  }

  const meta = parseRinexArchiveName(file.name);
  if (!meta) return null;
  const obsMeta = isStandardZipFile(head) ? readObsMetadataFromZip(file.path) : null;
  const date = obsMeta?.date;
  if (!date) return null;
  return {
    id: `tec-analysis-${obsMeta.stationId || meta.stationId}-${date}-${obsMeta.sessionKey || meta.session}`,
    sourceId: 'tec-analysis',
    format: isStandardZipFile(head) ? 'zip' : 'unknown',
    stationId: obsMeta.stationId || meta.stationId,
    rinexPrefix: obsMeta.prefix || meta.prefix,
    doy: obsMeta.doy || meta.doy,
    session: obsMeta.session ?? meta.session,
    sessionKey: String(obsMeta.sessionKey ?? meta.session),
    date,
    year: obsMeta.year,
    archivePath: file.path,
    archiveName: file.name,
    sizeBytes: file.size,
    extracted: false,
    extractPath: null,
    rinexFile: obsMeta.rinexFile,
    header: obsMeta.header,
    dateSource: obsMeta.dateSource,
  };
}

export function scanArchives({ sources, sourceId, maxSizeMb = 500 } = {}) {
  const roots = sources?.length ? sources : resolveDataSources([], sourceId);
  const archives = [];
  const seen = new Set();

  for (const root of roots) {
    for (const file of walkZipFiles(root, maxSizeMb)) {
      if (seen.has(file.path)) continue;
      seen.add(file.path);
      const record = buildArchiveRecord(file, root);
      if (record) archives.push(record);
    }
  }

  archives.sort((a, b) =>
    (a.date || '').localeCompare(b.date || '') ||
    (a.sessionKey || '').localeCompare(b.sessionKey || ''),
  );
  return { sources: roots, archives };
}

export function unzipArchive(archivePath, destDir) {
  const head = readFileSync(archivePath).slice(0, 4);
  if (!isStandardZipFile(head)) {
    return {
      extracted: [],
      obsFile: null,
      format: 'leica-spider',
      error: 'Leica Spider proprietary archive — use metadata-only demo analysis or export via Spider software',
    };
  }

  ensureDir(destDir);
  const zip = new AdmZip(archivePath);
  const entries = zip.getEntries().filter(e => !e.isDirectory);
  const extracted = [];

  for (const entry of entries) {
    const outPath = join(destDir, entry.entryName);
    ensureDir(dirname(outPath));
    zip.extractEntryTo(entry, destDir, false, true);
    extracted.push({
      name: entry.entryName,
      path: outPath,
      size: entry.header.size,
    });
  }

  const obs = extracted.find(f => /\.(2\d[oO]|[oO])$/i.test(f.name) && !/\.gz$/i.test(f.name));
  return { extracted, obsFile: obs || null, format: 'zip' };
}

function readObsMetadataFromZip(archivePath) {
  const head = readFileSync(archivePath).slice(0, 4);
  if (!isStandardZipFile(head)) return null;
  const zip = new AdmZip(archivePath);
  const obsEntry = zip.getEntries().find(e =>
    !e.isDirectory && /\.(2\d[oO]|[oO])$/i.test(e.entryName) && !/\.gz$/i.test(e.entryName),
  );
  if (!obsEntry) return null;
  const text = obsEntry.getData().toString('utf8', 0, Math.min(obsEntry.header.size, 16384));
  const header = parseRinexObsHeader(text);
  const filenameMeta = parseRinexObsFilename(obsEntry.entryName);
  const headerDate = rinexDateFromHeader(header);
  return {
    ...filenameMeta,
    rinexFile: obsEntry.entryName,
    header,
    date: headerDate || filenameMeta?.date || null,
    dateSource: headerDate ? 'rinex-header' : (filenameMeta?.date ? 'rinex-filename' : null),
  };
}

function enrichArchiveMetadata(record, extract) {
  if (record.format === 'leica-spider') {
    record.header = {
      markerName: record.stationId,
      interval: 15,
      satelliteSystems: ['G', 'R', 'E', 'C'],
    };
    record.epochEstimate = Math.max(60, Math.floor(record.sizeBytes / 800));
    return record;
  }

  if (extract) return record;

  const obsMeta = readObsMetadataFromZip(record.archivePath);
  if (obsMeta?.header) {
    record.header = obsMeta.header;
    record.date = obsMeta.date || record.date;
    record.year = obsMeta.year || record.year;
    record.doy = obsMeta.doy || record.doy;
    record.rinexFile = obsMeta.rinexFile || record.rinexFile;
    record.dateSource = obsMeta.dateSource || record.dateSource;
    record.epochEstimate = estimateObsEpochs(record.sizeBytes * 3, record.header.interval);
  }
  return record;
}

export function ingestArchives({
  sources,
  sourceId,
  stationId,
  limit = 50,
  extract = true,
  maxSizeMb = 500,
  refreshIndex = true,
} = {}) {
  const scan = scanArchives({ sources, sourceId, maxSizeMb });
  let targets = scan.archives;

  if (stationId) {
    const prefix = rinexPrefixForStation(stationId);
    targets = targets.filter(a =>
      a.stationId === stationId || a.rinexPrefix === prefix.toLowerCase(),
    );
  }

  if (limit > 0) targets = targets.slice(0, limit);

  const index = refreshIndex ? loadIndex() : { version: 2, archives: [], sources: [] };
  index.sources = scan.sources;
  index.sourceMeta = sourceId ? getSourceById(sourceId) : null;

  const results = [];
  for (const archive of targets) {
    let record = { ...archive };
    try {
      enrichArchiveMetadata(record, false);

      if (extract && record.format === 'zip') {
        const dest = extractDirForArchive(record);
        const { extracted, obsFile, error } = unzipArchive(record.archivePath, dest);
        if (obsFile) {
          record.extracted = true;
          record.extractPath = dest;
          record.extractedFiles = extracted.map(f => f.name);
          record.rinexFile = obsFile.name;

          if (existsSync(obsFile.path)) {
            const headerText = readFileSync(obsFile.path, 'utf8').slice(0, 16384);
            record.header = parseRinexObsHeader(headerText);
            record.epochEstimate = estimateObsEpochs(
              statSync(obsFile.path).size,
              record.header?.interval || 30,
            );
          }
        } else if (error) {
          record.extractNote = error;
        }
      } else if (record.format === 'leica-spider') {
        record.extracted = false;
        record.extractNote = 'Leica Spider archive indexed for metadata demo (standard unzip not supported)';
      }

      record.ingestedAt = new Date().toISOString();
      results.push({ ok: true, archive: record });
    } catch (err) {
      results.push({ ok: false, archive: record, error: err.message });
    }
  }

  const byId = new Map((index.archives || []).map(a => [a.id, a]));
  for (const r of results) {
    if (r.ok) byId.set(r.archive.id, r.archive);
  }
  for (const a of scan.archives) {
    if (!byId.has(a.id)) byId.set(a.id, a);
  }
  index.archives = [...byId.values()].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  saveIndex(index);

  return {
    sources: scan.sources,
    sourceId: sourceId || 'all',
    scanned: scan.archives.length,
    processed: results.length,
    succeeded: results.filter(r => r.ok).length,
    failed: results.filter(r => !r.ok),
    results,
    index,
  };
}

export function findArchiveForQuery(
  { stationId, date, time, session = 0, sourceId },
  index = loadIndex(),
) {
  const prefix = rinexPrefixForStation(stationId);
  const spiderSlot = time ? spiderSessionFromTime(time) : null;

  let pool = index.archives || [];
  if (sourceId) {
    pool = pool.filter(a => a.sourceId === sourceId);
  }
  if (stationId) {
    pool = pool.filter(a => a.stationId === stationId || a.rinexPrefix === prefix.toLowerCase());
  }

  if (date) {
    const byDate = pool.filter(a => a.date === date);
    if (byDate.length) pool = byDate;
    else return null;
  }

  if (spiderSlot && pool.some(a => a.sourceId === 'gnss-apps')) {
    const exact = pool.find(a => a.sessionKey === spiderSlot.sessionKey);
    if (exact) return exact;
    const gnss = pool.filter(a => a.sourceId === 'gnss-apps');
    if (gnss.length) {
      return gnss.reduce((best, a) => {
        if (!best) return a;
        const score = Math.abs((a.sessionMinute || 0) - spiderSlot.sessionMinute);
        const bestScore = Math.abs((best.sessionMinute || 0) - spiderSlot.sessionMinute);
        return score < bestScore ? a : best;
      }, null);
    }
  }

  if (session != null && pool.length > 1) {
    const bySession = pool.filter(a => a.session === session);
    if (bySession.length) pool = bySession;
  }

  if (!pool.length) return null;
  if (date) return pool[0];

  const gnss = pool.filter(a => a.sourceId === 'gnss-apps');
  if (gnss.length) return gnss[gnss.length - 1];
  return pool[pool.length - 1];
}

function resolveArchiveFormat(archive) {
  if (archive.format) return archive.format;
  if (!existsSync(archive.archivePath)) return 'unknown';
  const head = readFileSync(archive.archivePath).slice(0, 4);
  return isStandardZipFile(head) ? 'zip' : 'leica-spider';
}

export function ensureArchiveExtracted(archive, index) {
  const format = resolveArchiveFormat(archive);
  archive = { ...archive, format };

  if (format === 'leica-spider') {
    return enrichArchiveMetadata(archive, false);
  }

  if (archive.extracted && archive.extractPath && archive.rinexFile) {
    const obsPath = join(archive.extractPath, archive.rinexFile);
    if (existsSync(obsPath)) return { ...archive, obsPath };
  }

  const dest = extractDirForArchive(archive);
  const { obsFile, error, format: zipFormat } = unzipArchive(archive.archivePath, dest);
  if (zipFormat === 'leica-spider') {
    return enrichArchiveMetadata({ ...archive, extractNote: error }, false);
  }

  const updated = {
    ...archive,
    extracted: !!obsFile,
    extractPath: dest,
    rinexFile: obsFile?.name || archive.rinexFile,
  };

  if (obsFile && existsSync(obsFile.path)) {
    const headerText = readFileSync(obsFile.path, 'utf8').slice(0, 16384);
    updated.header = parseRinexObsHeader(headerText);
    updated.epochEstimate = estimateObsEpochs(statSync(obsFile.path).size, updated.header?.interval || 30);
    updated.obsPath = obsFile.path;
  }

  const idx = index || loadIndex();
  const pos = idx.archives.findIndex(a => a.id === archive.id);
  if (pos >= 0) {
    idx.archives[pos] = updated;
    saveIndex(idx);
  }

  return updated;
}
