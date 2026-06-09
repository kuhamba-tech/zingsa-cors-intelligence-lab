import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rinexPrefixForStation, spiderSessionFromTime } from './corsStationCodes.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const PROJECT_ROOT = resolve(__dirname, '..');
export const INDEX_PATH = join(PROJECT_ROOT, 'data', 'cors-index.json');

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
