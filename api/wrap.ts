// POST /api/wrap — end-of-match gang wrap captions + reel picks (F-WRAP). Ids validated against the request.
import { handler, json, readJson, ApiError } from './_lib/http';
import { WrapReq, parse } from './_lib/schemas';
import { generateJSON } from './_lib/gemini';
import { WRAP_SYSTEM } from './_lib/prompts';
import { cleanLine } from './_lib/safety';

export const POST = handler('wrap', async (req) => {
  const body = parse(WrapReq, await readJson(req, 32_000));
  const ids = new Set(body.highlights.map((h) => h.itemId));
  const seqs = new Set(body.moments.map((m) => m.seq));
  const { data, model } = await generateJSON({
    system: WRAP_SYSTEM, user: JSON.stringify(body), temperature: 0.8, maxTokens: 400, timeoutMs: 9_000,
    model: process.env.GEMINI_MODEL_WRAP?.trim() || undefined,
  }, (x: any) => {
    const title = cleanLine(x?.title, 10);
    const roastId = ids.has(x?.roastOfTheNight?.itemId) ? x.roastOfTheNight.itemId : undefined;
    const roastTitle = cleanLine(x?.roastOfTheNight?.title, 8);
    const high = seqs.has(x?.high?.seq) ? { seq: x.high.seq as number, caption: cleanLine(x.high.caption, 14) } : undefined;
    const low = seqs.has(x?.low?.seq) ? { seq: x.low.seq as number, caption: cleanLine(x.low.caption, 14) } : undefined;
    const reel = Array.isArray(x?.reel) ? (x.reel as unknown[]).filter((i): i is string => typeof i === 'string' && ids.has(i)).slice(0, 5) : [];
    if (!title) throw new ApiError('UPSTREAM_ERROR', 'Bad wrap');
    return {
      title,
      roastOfTheNight: roastId && roastTitle ? { itemId: roastId, title: roastTitle } : undefined,
      high: high?.caption ? high : undefined, low: low?.caption ? low : undefined, reel,
    };
  });
  return json({ ...data, source: 'live', model });
});
