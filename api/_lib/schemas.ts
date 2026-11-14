// Request schemas for the AI proxy (Zod). Strings are length-capped; enums are strict.
import { z } from 'zod';
import { ApiError } from './http';

const s = (max = 200) => z.string().trim().max(max);
export const Person = z.object({ name: s(40), team: s(20).optional(), hero: s(60).optional(), isUser: z.boolean().optional() });

export const LinesReq = z.object({
  kind: z.enum(['tease', 'comeback', 'brag']),
  moment: z.object({ ruleId: s(4), headline: s(), fact: s(), ballText: s().optional() }),
  player: z.object({ name: s(60), story: s(160).optional() }).optional(),
  speaker: Person,
  target: Person.optional(),
  matchState: s(),
  language: z.literal('en-IN').default('en-IN'),
});
export type LinesReq = z.infer<typeof LinesReq>;

export const Intent = z.enum(['lament', 'tease', 'gloat', 'brag', 'hype', 'nudge_away', 'callback', 'final', 'call_brag', 'call_lose']);
export const ReactReq = z.object({
  beats: z.array(z.object({
    id: s(60), friendId: s(20), intent: Intent, fact: s(300),
    target: Person.optional(), ballText: s().optional(),
  })).max(10),
  cards: z.array(z.object({
    id: s(80), kind: z.enum(['tease', 'comeback', 'brag']), headline: s(), fact: s(300),
    player: z.object({ name: s(60), story: s(160).optional() }).optional(), target: Person.optional(), matchState: s().optional(),
  })).max(4).default([]),
  matchState: s(),
  userName: s(40).default('you'),
  userTeam: s(20).optional(),
}).refine((r) => r.beats.length + r.cards.length > 0, 'empty');
export type ReactReq = z.infer<typeof ReactReq>;

export const ReplyReq = z.object({ friendId: s(20), userSaid: s(200).min(1), matchState: s(), context: s(200).optional() });
export const SpeakReq = z.object({ text: s(300).min(1), speaker: s(60) });
export const CatchupReq = z.object({
  events: z.array(z.object({ seq: z.number().int(), text: s(160) })).max(60),
  said: z.array(z.object({ who: s(40), text: s(200) })).max(40),
  self: s(40).default('You'),
  maxWords: z.number().int().min(20).max(80).default(60),
});
export const WrapReq = z.object({
  match: s(), result: s(),
  stats: z.object({ mostRoasted: s(40).optional(), counts: z.record(z.number()).optional() }).passthrough(),
  moments: z.array(z.object({ seq: z.number().int(), text: s(160) })).max(30),
  highlights: z.array(z.object({ itemId: s(80), who: s(40), text: s(200), seq: z.number().int() })).max(50),
});

export function parse<S extends z.ZodTypeAny>(schema: S, body: unknown): z.infer<S> {
  const r = schema.safeParse(body);
  if (!r.success) throw new ApiError('BAD_REQUEST', `Invalid request: ${r.error.issues.slice(0, 2).map((i) => i.path.join('.')).join(', ')}`);
  return r.data;
}
