import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { API_ROUTES } from './lib/corsApiConfig.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function loadHandler(relPath) {
  const abs = join(__dirname, relPath);
  const mod = await import(pathToFileURL(abs).href);
  return mod.default;
}

export function mockApiPlugin() {
  return {
    name: 'zingsa-mock-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split('?')[0];
        const handlerPath = API_ROUTES[url];
        if (!handlerPath) return next();

        try {
          const handler = await loadHandler(handlerPath);
          const query = Object.fromEntries(new URL(req.url, 'http://localhost').searchParams);
          let body = {};
          if (req.method === 'POST') {
            const chunks = [];
            for await (const chunk of req) chunks.push(chunk);
            const raw = Buffer.concat(chunks).toString();
            if (raw) body = JSON.parse(raw);
          }

          const mockRes = {
            statusCode: 200,
            headers: {},
            setHeader(k, v) { this.headers[k] = v; },
            status(code) { this.statusCode = code; return this; },
            json(data) {
              res.statusCode = this.statusCode;
              Object.entries(this.headers).forEach(([k, v]) => res.setHeader(k, v));
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(data));
            },
            end() {
              res.statusCode = this.statusCode;
              Object.entries(this.headers).forEach(([k, v]) => res.setHeader(k, v));
              res.end();
            },
          };

          await handler(
            { method: req.method, query, body },
            mockRes,
          );
        } catch (err) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ detail: err.message }));
        }
      });
    },
  };
}
