import { loadIndex, scanArchives, saveIndex } from '../../lib/corsDataIngest.js';
import { DATA_SOURCES } from '../../lib/corsApiConfig.js';

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'no-store');
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ detail: 'Method not allowed' });

  const stationId = req.query?.station;
  const sourceId = req.query?.source || null;
  const refresh = req.query?.refresh === '1' || req.query?.refresh === 'true';

  let index = loadIndex();
  if (refresh) {
    const scan = scanArchives({ sourceId });
    const byId = new Map((index.archives || []).map(a => [a.id, a]));
    for (const a of scan.archives) {
      if (!byId.has(a.id)) byId.set(a.id, { ...a, extracted: false });
    }
    index = {
      ...index,
      sources: scan.sources,
      archives: [...byId.values()],
      updatedAt: new Date().toISOString(),
    };
    saveIndex(index);
  }

  if (!index.archives?.length) {
    const scan = scanArchives({ sourceId });
    index.archives = scan.archives;
    index.sources = scan.sources;
    saveIndex(index);
  }

  let archives = index.archives || [];
  if (sourceId) archives = archives.filter(a => a.sourceId === sourceId);
  if (stationId) archives = archives.filter(a => a.stationId === String(stationId).toUpperCase());

  const stations = [...new Set(archives.map(a => a.stationId))].sort();
  const dates = [...new Set(archives.map(a => a.date).filter(Boolean))].sort();
  const bySource = {};
  for (const a of archives) {
    bySource[a.sourceId] = (bySource[a.sourceId] || 0) + 1;
  }

  return res.status(200).json({
    success: true,
    mode: 'demo',
    provider: 'ZINGSA CORS Data API',
    configuredSources: DATA_SOURCES,
    sources: index.sources || [],
    sourceCounts: bySource,
    stationCount: stations.length,
    archiveCount: archives.length,
    stations,
    dateRange: dates.length ? { from: dates[0], to: dates[dates.length - 1] } : null,
    archives: archives.map(a => ({
      id: a.id,
      sourceId: a.sourceId,
      format: a.format,
      stationId: a.stationId,
      date: a.date,
      dateSource: a.dateSource,
      doy: a.doy,
      session: a.session,
      sessionKey: a.sessionKey,
      archiveName: a.archiveName,
      sizeBytes: a.sizeBytes,
      extracted: !!a.extracted,
    })),
    updatedAt: index.updatedAt,
  });
}
