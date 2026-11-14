/// <reference types="vitest" />
import { defineConfig, loadEnv, type Plugin, type ViteDevServer } from 'vite';
import react from '@vitejs/plugin-react';
import type { IncomingMessage, ServerResponse } from 'node:http';

/**
 * Dev-only: serve /api/<name> by loading api/<name>.ts (Vercel Web-signature handlers:
 * `export async function POST(req: Request): Promise<Response>`). Same code runs on Vercel.
 * Secrets stay in the Node process; nothing here is bundled for the client.
 */
function devApi(): Plugin {
  return {
    name: 'fun-banter-dev-api',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next) => {
        const url = new URL(req.url ?? '/', 'http://localhost');
        const m = url.pathname.match(/^\/api\/([a-z-]+)$/);
        if (!m) return next();
        try {
          const mod = await server.ssrLoadModule(`/api/${m[1]}.ts`);
          const method = (req.method ?? 'GET').toUpperCase();
          const fn = mod[method];
          if (typeof fn !== 'function') { res.statusCode = 405; return res.end(); }
          const chunks: Buffer[] = [];
          for await (const c of req) chunks.push(c as Buffer);
          const headers = new Headers();
          for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v);
          headers.set('x-forwarded-for', req.socket.remoteAddress ?? '127.0.0.1');
          const request = new Request(url, {
            method, headers,
            body: method === 'GET' || method === 'HEAD' ? undefined : Buffer.concat(chunks),
          });
          const response: Response = await fn(request);
          res.statusCode = response.status;
          response.headers.forEach((v, k) => res.setHeader(k, v));
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch (e) {
          console.error('[dev-api]', m[1], (e as Error).message);
          res.statusCode = 500; res.end();
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // Load ALL env vars into the dev server process only (never exposed to client: no VITE_ prefix used).
  const env = loadEnv(mode, process.cwd(), '');
  for (const [k, v] of Object.entries(env)) if (!(k in process.env)) process.env[k] = v;
  return {
    plugins: [react(), devApi()],
    server: { port: 5173 },
    test: {
      environment: 'jsdom',
      include: ['tests/unit/**/*.test.ts', 'tests/unit/**/*.test.tsx', 'tests/ai-eval/**/*.test.ts'],
    },
  };
});
