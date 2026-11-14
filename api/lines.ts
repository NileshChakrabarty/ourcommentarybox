// POST /api/lines — tease / comeback / brag lines for the user's moment card (F-B, F-B2, F-CALLS).
import { handler, json, readJson } from './_lib/http';
import { LinesReq, parse } from './_lib/schemas';
import { generateJSON } from './_lib/gemini';
import { LINES_SYSTEM } from './_lib/prompts';
import { cleanLine } from './_lib/safety';
import { ApiError } from './_lib/http';

export const POST = handler('lines', async (req) => {
  const body = parse(LinesReq, await readJson(req));
  const { data, model } = await generateJSON({ system: LINES_SYSTEM, user: JSON.stringify(body), temperature: 0.95, maxTokens: 200, timeoutMs: 8_000 },
    (x) => {
      const raw = (x as { lines?: unknown[] })?.lines;
      const lines = Array.isArray(raw) ? raw.map((l) => cleanLine(l, 15)).filter((l): l is string => !!l) : [];
      if (!lines.length) throw new ApiError('UPSTREAM_ERROR', 'No safe lines');
      return lines.slice(0, 3);
    });
  return json({ lines: data, source: 'live', model });
});
