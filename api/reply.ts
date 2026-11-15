// POST /api/reply — a simulated friend replies live to what the user said (F-FRIENDS, F-B2). v1.3: {display, speech}.
import { handler, preflight, json, readJson, ApiError } from './_lib/http';
import { ReplyReq, parse } from './_lib/schemas';
import { generateJSON } from './_lib/gemini';
import { replySystem } from './_lib/prompts';
import { cleanPair } from './_lib/safety';
import { FRIENDS } from '../src/content/gang';

export const POST = handler('reply', async (req) => {
  const body = parse(ReplyReq, await readJson(req));
  const f = FRIENDS.find((x) => x.id === body.friendId);
  if (!f) throw new ApiError('BAD_REQUEST', 'Unknown friend');
  const input = { you_are: { name: f.name, persona: f.persona, style: f.style, team: f.loyalty.teamId }, matchState: body.matchState, context: body.context, userSaid: body.userSaid };
  const { data, model } = await generateJSON({ system: replySystem(body.language), user: JSON.stringify(input), temperature: 0.95, maxTokens: body.language === 'hi' ? 200 : 100, timeoutMs: 6_000 },
    (x) => { const l = cleanPair((x as { line?: unknown })?.line, 20, body.language); if (!l) throw new ApiError('UPSTREAM_ERROR', 'No safe line'); return l; });
  return json({ line: data, language: body.language, source: 'live', model });
});

export const OPTIONS = preflight;
