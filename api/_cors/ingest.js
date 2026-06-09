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

  return res.status(202).json({
    success: true,
    mode: 'index-only',
    provider: 'ZINGSA CORS Data API',
    configuredSources: DATA_SOURCES,
    message: 'Production ingestion is disabled on Vercel to keep deployments small. Run npm run cors:ingest locally, then commit data/cors-index.json.',
  });
}
