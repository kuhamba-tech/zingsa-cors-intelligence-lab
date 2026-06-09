import { loadIndex, findArchiveForQuery } from '../../lib/corsIndex.js';
import { buildDemoMetricsFromArchive } from '../../lib/corsDemoAnalysis.js';

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'no-store');
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ detail: 'Method not allowed' });

  const stationId = String(req.query?.station || 'ZINH').toUpperCase();
  const regionId = req.query?.region || 'zimbabwe';
  const date = req.query?.date || null;
  const time = req.query?.time || '00:00';
  const sourceId = req.query?.source || null;
  const session = req.query?.session != null ? Number(req.query.session) : 0;
  const index = loadIndex();

  let archive = findArchiveForQuery({ stationId, date, time, session, sourceId }, index);

  if (!archive) {
    const metrics = buildDemoMetricsFromArchive({
      archive: null,
      regionId,
      stationId,
      date,
      time,
    });
    return res.status(200).json({
      success: true,
      mode: 'demo',
      hasArchive: false,
      message: `No data: no RINEX observation file is indexed for ${stationId}${date ? ` on ${date}` : ''}. Dates are read from the RINEX observation header/filename, not folder modified dates.`,
      metrics,
    });
  }

  const metrics = buildDemoMetricsFromArchive({
    archive,
    regionId,
    stationId,
    date: date || archive.date,
    time,
  });

  return res.status(200).json({
    success: true,
    mode: 'demo',
    hasArchive: true,
    archive: {
      id: archive.id,
      sourceId: archive.sourceId,
      format: archive.format,
      stationId: archive.stationId,
      date: archive.date,
      dateSource: archive.dateSource,
      sessionKey: archive.sessionKey,
      archiveName: archive.archiveName,
      rinexFile: archive.rinexFile,
      extracted: archive.extracted,
      extractNote: archive.extractNote,
    },
    metrics,
  });
}
