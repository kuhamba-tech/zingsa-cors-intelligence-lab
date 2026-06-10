import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadIndex } from './corsIndex.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TELEMETRY_SAMPLE_PATH = join(__dirname, '../data/zimcors-telemetry-sample.json');

const SOURCE_PRIORITY = { 'gnss-apps': 0, 'tec-analysis': 1, unknown: 2 };

function hoursSince(dateStr, now = new Date()) {
  if (!dateStr) return Number.POSITIVE_INFINITY;
  const end = new Date(`${dateStr}T23:59:59Z`);
  if (Number.isNaN(end.getTime())) return Number.POSITIVE_INFINITY;
  return Math.max(0, (now.getTime() - end.getTime()) / 3600000);
}

function statusFromArchive({ ageHrs, sourceId, hasArchive }) {
  if (!hasArchive) return null;
  if (sourceId === 'gnss-apps') {
    if (ageHrs <= 48) return 'ONLINE';
    return 'DEGRADED';
  }
  // Historical RINEX — observation files indexed, but not a live correction stream
  return 'DEGRADED';
}

function buildArchiveMap(archives = []) {
  const map = new Map();
  for (const archive of archives) {
    const id = String(archive.stationId || '').toUpperCase();
    if (!id) continue;
    const current = map.get(id);
    const priority = SOURCE_PRIORITY[archive.sourceId] ?? SOURCE_PRIORITY.unknown;
    const date = archive.date || null;
    if (!current) {
      map.set(id, {
        stationId: id,
        latestDate: date,
        sourceId: archive.sourceId || 'unknown',
        sourcePriority: priority,
        archiveCount: 1,
      });
      continue;
    }
    current.archiveCount += 1;
    const betterSource = priority < current.sourcePriority;
    const newerDate = date && (!current.latestDate || date > current.latestDate);
    if (betterSource || (priority === current.sourcePriority && newerDate)) {
      current.latestDate = date || current.latestDate;
      current.sourceId = archive.sourceId || current.sourceId;
      current.sourcePriority = priority;
    } else if (newerDate) {
      current.latestDate = date;
    }
  }
  return map;
}

/**
 * Build station health rows from catalogue stations and optional RINEX index.
 * Live-only policy: archive recency when available; stations without any
 * data source are reported honestly as OFFLINE / no-data (never simulated).
 */
export function buildStationHealthRows(stations, { now = new Date(), archives } = {}) {
  const archiveMap = buildArchiveMap(archives);
  let archiveDerived = 0;
  let seedFallback = 0;

  const rows = stations.map((station) => {
    const stationId = String(station.station_id || station.id || '').toUpperCase();
    const archive = archiveMap.get(stationId);
    const ageHrs = hoursSince(archive?.latestDate, now);
    const archiveStatus = statusFromArchive({
      ageHrs,
      sourceId: archive?.sourceId,
      hasArchive: Boolean(archive),
    });

    if (archiveStatus) {
      archiveDerived += 1;
      const gap = Number.isFinite(ageHrs) ? Math.round(ageHrs * 10) / 10 : null;
      return {
        ...station,
        status: archiveStatus,
        last_update: archive.latestDate
          ? new Date(`${archive.latestDate}T12:00:00Z`).toISOString()
          : now.toISOString(),
        data_gap_hrs: gap,
        coord_shift_mm: archiveStatus === 'ONLINE' ? 0.8 : archiveStatus === 'DEGRADED' ? 2.4 : 5.2,
        health_basis: 'rinex-archive',
        archive_latest: archive.latestDate,
        archive_count: archive.archiveCount,
        archive_source: archive.sourceId,
      };
    }

    seedFallback += 1;
    return {
      ...station,
      status: 'OFFLINE',
      data_gap_hrs: null,
      coord_shift_mm: null,
      health_basis: 'no-data',
      last_update: null,
      archive_latest: null,
      archive_count: 0,
      archive_source: null,
    };
  });

  const telemetry_source = archiveDerived && seedFallback
    ? 'rinex-archive-blend'
    : archiveDerived
      ? 'rinex-archive'
      : 'no-data';

  const mode = telemetry_source === 'no-data' ? 'no-data' : 'blended';

  return {
    stations: rows,
    telemetry_source,
    mode,
    archiveDerived,
    seedFallback,
    indexUpdatedAt: null,
  };
}

export function loadHealthFromIndex(stations, options = {}) {
  const index = loadIndex();
  const result = buildStationHealthRows(stations, {
    ...options,
    archives: index.archives || [],
  });
  return { ...result, indexUpdatedAt: index.updatedAt || null };
}

function normalizeExternalStatus(status) {
  const s = String(status || '').toUpperCase();
  if (s === 'ONLINE' || s === 'OK') return 'ONLINE';
  if (s === 'DEGRADED' || s === 'WARNING') return 'DEGRADED';
  if (s === 'OFFLINE' || s === 'DOWN') return 'OFFLINE';
  return null;
}

export function mergeExternalTelemetry(base, external) {
  const extRows = external?.stations || external?.data?.stations || [];
  if (!extRows.length) return base;

  const extById = Object.fromEntries(
    extRows.map(row => [String(row.station_id || row.id || '').toUpperCase(), row]),
  );

  let telemetryCount = 0;
  const stations = base.stations.map(row => {
    const ext = extById[row.station_id];
    if (!ext) return row;
    const status = normalizeExternalStatus(ext.status) || row.status;
    telemetryCount += 1;
    return {
      ...row,
      status,
      last_update: ext.last_update || ext.lastUpdate || row.last_update,
      data_gap_hrs: ext.data_gap_hrs ?? ext.dataGapHrs ?? row.data_gap_hrs,
      coord_shift_mm: ext.coord_shift_mm ?? ext.coordShiftMm ?? row.coord_shift_mm,
      health_basis: 'telemetry',
      archive_latest: row.archive_latest,
      archive_count: row.archive_count,
      archive_source: row.archive_source,
    };
  });

  if (!telemetryCount) return base;

  const archiveOnly = stations.filter(s => s.health_basis !== 'telemetry').length;
  let telemetry_source = 'telemetry';
  let mode = 'live';
  if (archiveOnly > 0 && telemetryCount < stations.length) {
    telemetry_source = 'telemetry-blend';
    mode = 'blended';
  }

  return {
    ...base,
    stations,
    telemetry_source,
    mode,
    telemetry_live: telemetryCount,
    health_summary: {
      ...(base.health_summary || {}),
      telemetry_live: telemetryCount,
      archive_derived: base.archiveDerived,
      seed_fallback: base.seedFallback,
    },
  };
}

function loadTelemetrySample() {
  try {
    return JSON.parse(readFileSync(TELEMETRY_SAMPLE_PATH, 'utf8'));
  } catch {
    return null;
  }
}

export async function loadHealthWithTelemetry(stations, options = {}) {
  const base = loadHealthFromIndex(stations, options);
  const url = process.env.ZINGSA_HEALTH_TELEMETRY_URL;
  const useSample = process.env.ZINGSA_HEALTH_TELEMETRY_SAMPLE === '1';

  if (!url && !useSample) return base;

  try {
    let external;
    if (url) {
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(Number(process.env.ZINGSA_HEALTH_TELEMETRY_TIMEOUT_MS) || 8000),
      });
      if (!res.ok) throw new Error(`Telemetry HTTP ${res.status}`);
      external = await res.json();
    } else {
      external = loadTelemetrySample();
      if (!external?.stations?.length) throw new Error('Telemetry sample file missing or empty');
    }
    return mergeExternalTelemetry(base, external);
  } catch (err) {
    return {
      ...base,
      telemetry_fetch_error: err.message || 'Telemetry fetch failed',
    };
  }
}
