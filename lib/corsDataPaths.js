import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { resolveConfiguredSources, DATA_SOURCES } from './corsApiConfig.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const PROJECT_ROOT = resolve(__dirname, '..');

export const EXTRACT_ROOT = join(PROJECT_ROOT, 'data', 'cors-extracted');
export const INDEX_PATH = join(PROJECT_ROOT, 'data', 'cors-index.json');

export { DATA_SOURCES };

export function resolveDataSources(extraPaths = [], sourceId) {
  const candidates = resolveConfiguredSources({ sourceId, extraPaths });
  const seen = new Set();
  const resolved = [];
  for (const p of candidates) {
    if (!p || seen.has(p)) continue;
    seen.add(p);
    const abs = resolve(p);
    if (existsSync(abs)) resolved.push(abs);
  }
  return resolved;
}

export function extractDirForArchive(archive) {
  const source = archive.sourceId || 'unknown';
  if (archive.sourceId === 'gnss-apps') {
    return join(EXTRACT_ROOT, source, archive.stationId, archive.date, archive.sessionKey || '0');
  }
  return join(EXTRACT_ROOT, source, archive.stationId, String(archive.year), String(archive.doy));
}
