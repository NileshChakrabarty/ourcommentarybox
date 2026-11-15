// POST /api/lines — tease / comeback / brag lines for the user's moment card (F-B, F-B2, F-CALLS). v1.3: {display, speech}.
import { handler, preflight, json, readJson, ApiError } from './_lib/http';
import { LinesReq, parse } from './_lib/schemas';
import { generateJSON } from './_lib/gemini';
import { linesSystem } from './_lib/prompts';
import { cleanPair, type LinePair } from './_lib/safety';

export const POST = handler('lines', async (req) => {
  const body = parse(LinesReq, await readJson(req));
  const { data, model } = await generateJSON({ system: linesSystem(body.language), user: JSON.stringify(body), temperature: 0.95, maxTokens: body.language === 'hi' ? 420 : 220, timeoutMs: 8_000 },
    (x) => {
      const raw = (x as { lines?: unknown[] })?.lines;
      const lines = Array.isArray(raw) ? raw.map((l) => cleanPair(l, 15, body.language)).filter((l): l is LinePair => !!l) : [];
      if (!lines.length) throw new ApiError('UPSTREAM_ERROR', 'No safe lines');
      return lines.slice(0, 3);
    });
  return json({ lines: data, language: body.language, source: 'live', model });
});

export const OPTIONS = preflight;
