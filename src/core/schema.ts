// Runtime validation of the match asset (FR-001).
import { z } from 'zod';
import type { Match } from './types';

const Ball = z.object({
  seq: z.number().int().nonnegative(), innings: z.union([z.literal(1), z.literal(2)]), over: z.number().int().min(0).max(49),
  legalInOver: z.number().int().min(0).max(6), label: z.string(),
  batterId: z.string(), nonStrikerId: z.string(), bowlerId: z.string(),
  runsBat: z.number().int().min(0).max(7), extras: z.number().int().min(0), extraType: z.enum(['wd', 'nb', 'b', 'lb']).optional(),
  wicket: z.object({ playerOutId: z.string(), kind: z.string() }).optional(),
  scoreAfter: z.object({ runs: z.number().int(), wickets: z.number().int().min(0).max(10) }),
  legalBallsAfter: z.number().int(), text: z.string().max(120),
});
export const MatchSchema = z.object({
  id: z.string(), title: z.string(), shortTitle: z.string(), overs: z.number().int().positive(), winner: z.string().optional(),
  video: z.object({ provider: z.literal('youtube'), id: z.string(), title: z.string(), owner: z.string(), url: z.string() }).optional(), date: z.string(), venue: z.string(), result: z.string(),
  battingFirst: z.string(), chasing: z.string(), target: z.number().int(),
  source: z.object({ name: z.string(), licence: z.string(), url: z.string(), note: z.string() }),
  teams: z.array(z.object({ id: z.string(), name: z.string(), short: z.string(), colour: z.string() })).length(2),
  players: z.array(z.object({ id: z.string(), teamId: z.string(), name: z.string(), short: z.string(), role: z.enum(['bat', 'bowl', 'all', 'wk']), story: z.string().max(120) })).min(22),
  balls: z.array(Ball).min(1),
}).refine((m) => m.balls.every((b, i) => b.seq === i), 'balls must be in seq order');

export function parseMatch(x: unknown): Match { return MatchSchema.parse(x) as Match; }

const ChapterSchema = z.object({
  id: z.string(), title: z.string().max(60), blurb: z.string().max(120),
  startBallSeq: z.number().int().nonnegative(), endBallSeq: z.number().int().nonnegative(),
  nudgeSeq: z.number().int().optional(), callbackSeq: z.number().int().optional(),
}).refine((c) => c.endBallSeq >= c.startBallSeq, 'chapter end before start');
export const ChapterFileSchema = z.object({ journeyStart: z.string(), chapters: z.array(ChapterSchema).min(1) });
export const TimelineSchema = z.array(z.object({
  ballSeq: z.number().int().nonnegative(), innings: z.union([z.literal(1), z.literal(2)]), over: z.number().int(), ball: z.number().int(),
  videoTime: z.number().nonnegative(), tagged: z.boolean(), src: z.enum(['tag', 'scorebug', 'interp']).optional(),
})).refine((t) => t.every((e, i) => e.ballSeq === i), 'timeline must have one entry per ball in seq order');
