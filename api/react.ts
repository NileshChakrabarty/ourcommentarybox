// POST /api/react — ball-anchored lines for simulated friends, batched per look-ahead window (F-FRIENDS).
// Personas are looked up server-side by friendId (client cannot inject persona text).
// v1.3: every line is {display, speech} in the requested language (ADR-0013).
import { handler, preflight, json, readJson, ApiError } from './_lib/http';
import { ReactReq, parse } from './_lib/schemas';
import { generateJSON } from './_lib/gemini';
import { reactSystem } from './_lib/prompts';
import { cleanPair, type LinePair } from './_lib/safety';
import { FRIENDS } from '../src/content/gang';

export const POST = handler('react', async (req) => {
  const body = parse(ReactReq, await readJson(req, 24_000));
  const friends = Object.fromEntries(FRIENDS.map((f) => [f.id, { name: f.name, persona: f.persona, style: f.style, team: f.loyalty.teamId }]));
  for (const b of body.beats) if (!friends[b.friendId]) throw new ApiError('BAD_REQUEST', 'Unknown friend');
  const input = { matchState: body.matchState, user: { name: body.userName, team: body.userTeam }, friends, beats: body.beats, cards: body.cards };
  const perLine = body.language === 'hi' ? 170 : 90; // Hinglish lines carry a Devanagari copy
  const { data, model } = await generateJSON({
    system: reactSystem(body.language), user: JSON.stringify(input), temperature: 0.95,
    maxTokens: perLine * body.beats.length + perLine * 2 * body.cards.length + 120, timeoutMs: 12_000, hedgeMs: 6_000,
  }, (x) => {
    const rawL = (x as { lines?: Record<string, unknown> })?.lines ?? {};
    const rawC = (x as { cards?: Record<string, unknown> })?.cards ?? {};
    const lines: Record<string, LinePair> = {};
    for (const b of body.beats) { const l = cleanPair(rawL[b.id], 18, body.language); if (l) lines[b.id] = l; }
    const cards: Record<string, LinePair[]> = {};
    for (const c of body.cards) {
      const arr = Array.isArray(rawC[c.id]) ? (rawC[c.id] as unknown[]).map((l) => cleanPair(l, 15, body.language)).filter((l): l is LinePair => !!l) : [];
      if (arr.length) cards[c.id] = arr.slice(0, 3);
    }
    if (!Object.keys(lines).length && !Object.keys(cards).length) throw new ApiError('UPSTREAM_ERROR', 'No safe lines');
    return { lines, cards };
  });
  return json({ ...data, language: body.language, source: 'live', model });
});

export const OPTIONS = preflight;
