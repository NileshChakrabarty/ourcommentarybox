// POST /api/catchup — "while you were away" summary (F-CATCH).
import { handler, preflight, json, readJson, ApiError } from './_lib/http';
import { CatchupReq, parse } from './_lib/schemas';
import { generateJSON } from './_lib/gemini';
import { catchupSystem } from './_lib/prompts';
import { isSafe, wordCount } from './_lib/safety';

export const POST = handler('catchup', async (req) => {
  const body = parse(CatchupReq, await readJson(req, 24_000));
  const { data, model } = await generateJSON({
    system: catchupSystem(body.language).replace('{maxWords}', String(body.maxWords)), user: JSON.stringify(body), temperature: 0.4, maxTokens: 200, timeoutMs: 6_000,
  }, (x) => {
    const sum = String((x as { summary?: unknown })?.summary ?? '').trim();
    if (!sum || wordCount(sum) > body.maxWords + 10 || !isSafe(sum) || /[\u0900-\u097F]/.test(sum)) throw new ApiError('UPSTREAM_ERROR', 'Bad summary');
    return sum;
  });
  return json({ summary: data, language: body.language, source: 'live', model });
});

export const OPTIONS = preflight;
