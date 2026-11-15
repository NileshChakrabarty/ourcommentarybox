// Chrome extension build (ADR-0017): `npm run build:extension` → extension/dist (load it unpacked).
// The side panel reuses the app's panel module; the match data and the prepared voices are bundled, AI calls go to
// ACB_API_BASE (our deployed Vercel endpoints; default http://localhost:5173 for local testing). No keys are bundled.
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { cpSync, mkdirSync } from 'node:fs';

const API_BASE = (process.env.ACB_API_BASE ?? 'http://localhost:5173').replace(/\/$/, '');

/** Bundle the match data and the prepared friend voices (the safety net works offline from the API). */
function bundleData(): Plugin {
  return {
    name: 'acb-extension-data',
    closeBundle() {
      mkdirSync('extension/dist/data', { recursive: true });
      for (const f of ['match.json', 'timeline.json', 'live.json', 'precomputed.json']) cpSync(`public/data/${f}`, `extension/dist/data/${f}`);
      cpSync('public/audio/friends', 'extension/dist/audio/friends', { recursive: true });
    },
  };
}

export default defineConfig({
  root: 'extension',
  base: './',
  publicDir: 'public',
  plugins: [react(), bundleData()],
  define: { 'import.meta.env.VITE_API_BASE': JSON.stringify(API_BASE) },
  build: { outDir: 'dist', emptyOutDir: true, rollupOptions: { input: 'extension/sidepanel.html' } },
});
