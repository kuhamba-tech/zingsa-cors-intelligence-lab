#!/usr/bin/env node
/**
 * Unzip and index ZINGSA CORS RINEX archives for demo-mode analysis.
 *
 * Usage:
 *   npm run cors:scan-gnss          # Index Leica Spider GNSS-Data/APPS
 *   npm run cors:ingest-gnss        # Ingest GNSS-Data/APPS archives
 *   npm run cors:ingest -- --station BEIT --source gnss-apps --limit 10
 */

import { ingestArchives, scanArchives, saveIndex, loadIndex } from '../lib/corsDataIngest.js';
import { resolveDataSources } from '../lib/corsDataPaths.js';
import { getSourceById } from '../lib/corsApiConfig.js';

function parseArgs(argv) {
  const opts = {
    station: null,
    sourceId: null,
    limit: 30,
    extract: true,
    scanOnly: false,
    maxSizeMb: 500,
    sources: [],
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--station' || arg === '-s') opts.station = argv[++i]?.toUpperCase();
    else if (arg === '--limit' || arg === '-n') opts.limit = Number(argv[++i]);
    else if (arg === '--source') {
      const val = argv[++i];
      if (val === 'gnss-apps' || val === 'tec-analysis') opts.sourceId = val;
      else opts.sources.push(val);
    }
    else if (arg === '--max-size-mb') opts.maxSizeMb = Number(argv[++i]);
    else if (arg === '--scan-only') { opts.scanOnly = true; opts.extract = false; }
    else if (arg === '--no-extract') opts.extract = false;
    else if (arg === '--help' || arg === '-h') opts.help = true;
  }
  return opts;
}

const opts = parseArgs(process.argv.slice(2));

if (opts.help) {
  console.log(`
ZINGSA CORS Data Ingest
  npm run cors:scan-gnss
  npm run cors:ingest-gnss -- --station BEIT --limit 20

Options:
  --station, -s     Station ID (BEIT, MUTA, CHIM, ZINH, …)
  --source          gnss-apps | tec-analysis | custom folder path
  --limit, -n       Max archives to process (default 30)
  --max-size-mb     Skip zips larger than this (default 500)
  --scan-only       Build index without extracting
  --no-extract      Index metadata only
`);
  process.exit(0);
}

const sources = opts.sources.length
  ? opts.sources
  : resolveDataSources([], opts.sourceId);

const sourceLabel = opts.sourceId
  ? getSourceById(opts.sourceId)?.label || opts.sourceId
  : 'all configured sources';

console.log(`Data source: ${sourceLabel}`);
console.log('Folders:');
sources.forEach(s => console.log(`  • ${s}`));

if (opts.scanOnly) {
  const scan = scanArchives({ sources, sourceId: opts.sourceId, maxSizeMb: opts.maxSizeMb });
  const index = loadIndex();
  const scannedSources = new Set(scan.archives.map(a => a.sourceId).filter(Boolean));
  const byId = new Map(
    (index.archives || [])
      .filter(a => !scannedSources.has(a.sourceId) && !(opts.sourceId && !a.sourceId))
      .map(a => [a.id, a]),
  );
  for (const a of scan.archives) {
    const prev = byId.get(a.id) || {};
    byId.set(a.id, { ...prev, ...a, extracted: prev.extracted && prev.format === a.format });
  }
  index.sources = [...new Set([...(index.sources || []), ...scan.sources])];
  index.archives = [...byId.values()];
  saveIndex(index);
  console.log(`\nIndexed ${scan.archives.length} archives from scan (${index.archives.length} total in index).`);
  const stations = [...new Set(scan.archives.map(a => a.stationId))];
  const bySrc = {};
  scan.archives.forEach(a => { bySrc[a.sourceId] = (bySrc[a.sourceId] || 0) + 1; });
  console.log(`By source: ${JSON.stringify(bySrc)}`);
  console.log(`Stations: ${stations.join(', ')}`);
  process.exit(0);
}

console.log(`\nIngesting up to ${opts.limit} archives${opts.station ? ` for ${opts.station}` : ''}…`);
const result = ingestArchives({
  sources,
  sourceId: opts.sourceId,
  stationId: opts.station,
  limit: opts.limit,
  extract: opts.extract,
  maxSizeMb: opts.maxSizeMb,
});

console.log(`\nScanned: ${result.scanned}`);
console.log(`Processed: ${result.processed}`);
console.log(`Succeeded: ${result.succeeded}`);
if (opts.sourceId === 'gnss-apps') {
  console.log('Note: Leica Spider .rnx.zip files are indexed for metadata demo (proprietary format).');
}
if (result.failed.length) {
  console.log('Failed:');
  result.failed.forEach(f => console.log(`  ✗ ${f.archive?.archiveName}: ${f.error}`));
}
console.log(`\nIndex saved — ${result.index.archives.length} total archives.`);
