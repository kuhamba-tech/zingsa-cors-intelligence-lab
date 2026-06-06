import { ingestArchives } from '../../lib/corsDataIngest.js';
import { resolveDataSources } from '../../lib/corsDataPaths.js';
import { DATA_SOURCES } from '../../lib/corsApiConfig.js';

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Cache-Control', 'no-store');
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ detail: 'Method not allowed' });

  const body = req.body || {};
  const stationId = body.station || req.query?.station;
  const sourceId = body.source || req.query?.source || 'gnss-apps';
  const limit = Number(body.limit ?? req.query?.limit ?? 30);
  const extract = body.extract !== false;
  const maxSizeMb = Number(body.maxSizeMb ?? req.query?.maxSizeMb ?? 500);
  const sources = body.sources?.length ? body.sources : resolveDataSources([], sourceId);

  try {
    const result = ingestArchives({
      sources,
      sourceId,
      stationId,
      limit,
      extract,
      maxSizeMb,
    });

    const sourceLabel = DATA_SOURCES.find(s => s.id === sourceId)?.label || sourceId;

    return res.status(200).json({
      success: true,
      mode: 'demo',
      sourceId,
      sourceLabel,
      message: `Indexed ${result.succeeded}/${result.processed} archives from ${sourceLabel}.`,
      note: sourceId === 'gnss-apps'
        ? 'Leica Spider .rnx.zip files use a proprietary format — archives are indexed for metadata demo analysis.'
        : null,
      sources: result.sources,
      scanned: result.scanned,
      processed: result.processed,
      succeeded: result.succeeded,
      failed: result.failed,
      index: {
        archiveCount: result.index.archives.length,
        updatedAt: result.index.updatedAt,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, detail: err.message });
  }
}
