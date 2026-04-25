import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { URL } from 'node:url';
import legoGeminiHandler from '../api/lego-gemini';
import dbHealthHandler from '../api/debug/db-health';
import generationLogsHandler from '../api/debug/generation-logs';

type LocalRequest = {
  method?: string;
  headers?: http.IncomingHttpHeaders;
  query?: Record<string, string>;
  body?: unknown;
};

type LocalResponse = {
  status: (code: number) => LocalResponse;
  json: (payload: unknown) => void;
  send: (payload: unknown) => void;
};

type Handler = (req: LocalRequest, res: LocalResponse) => Promise<void> | void;

const PORT = Number.parseInt(process.env.LOCAL_API_PORT ?? '3001', 10);
const projectRoot = path.resolve(import.meta.dirname, '..');

function loadLocalEnv() {
  const envPath = path.join(projectRoot, '.env.local');

  if (!fs.existsSync(envPath)) {
    return;
  }

  const content = fs.readFileSync(envPath, 'utf8');

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadLocalEnv();

const routes = new Map<string, Handler>([
  ['/api/lego-gemini', legoGeminiHandler as Handler],
  ['/api/debug/db-health', dbHealthHandler as Handler],
  ['/api/debug/generation-logs', generationLogsHandler as Handler],
]);

function parseBody(raw: string) {
  if (!raw.trim()) {
    return undefined;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function createResponse(res: http.ServerResponse): LocalResponse {
  let statusCode = 200;

  return {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(payload: unknown) {
      res.writeHead(statusCode, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(payload));
    },
    send(payload: unknown) {
      if (typeof payload === 'object' && payload !== null) {
        this.json(payload);
        return;
      }

      res.writeHead(statusCode, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(String(payload ?? ''));
    },
  };
}

function getQuery(url: URL) {
  return Object.fromEntries(url.searchParams.entries());
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  const handler = routes.get(url.pathname);

  if (!handler) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: `No local route for ${url.pathname}` }));
    return;
  }

  const chunks: Buffer[] = [];
  req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));

  req.on('end', async () => {
    const localReq: LocalRequest = {
      method: req.method,
      headers: req.headers,
      query: getQuery(url),
      body: parseBody(Buffer.concat(chunks).toString('utf8')),
    };

    const localRes = createResponse(res);

    try {
      await handler(localReq, localRes);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown local API error.';
      localRes.status(500).json({
        success: false,
        error: message,
      });
    }
  });
});

server.listen(PORT, () => {
  console.log(`Local API server running on http://localhost:${PORT}`);
});
