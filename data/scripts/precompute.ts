// Build-time SAFETY NET (spec §12.2): the same prompts as the live path, run once and committed as static files.
// Used only when a live call is late or fails. Output: public/data/precomputed.json, public/audio/friends/*.mp3,
// docs/precomputed-review.md (for the owner's review).
// Run: npm run precompute            (fills in anything missing)
//      npm run precompute -- --fresh (regenerates everything)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { buildPlan } from '../../src/core/plan';
import { cardKind, cardTargetFor } from '../../src/core/moments/rules';
import { FRIENDS, SELF_ID, DEFAULT_SELF_LOYALTY } from '../../src/content/gang';
import type { ChapterFile, Match, Member, Moment } from '../../src/core/types';
import { stateLine, type Beat } from '../../src/core/friends/director';
import { POST as react } from '../../api/react';
import { tts } from '../../api/_lib/sarvam';

const match: Match = JSON.parse(readFileSync('public/data/match.json', 'utf8'));
const me: Member = { id: SELF_ID, name: 'You', isSelf: true, isSimulated: false, colour: '', persona: '', style: '', loyalty: DEFAULT_SELF_LOYALTY };
const members = [me, ...FRIENDS];
const chapters = (JSON.parse(readFileSync('public/data/chapters.json', 'utf8')) as ChapterFile).chapters;
const plan = buildPlan(match, members, SELF_ID, chapters);
// The demo journey covers India's chase from the first chapter to the last: precompute that span only.
const SPAN = { from: Math.min(...chapters.map((c) => c.startBallSeq)) - 1, to: Math.max(...chapters.map((c) => c.endBallSeq)) };
const inSpan = (seq: number) => seq >= SPAN.from && seq <= SPAN.to;
const P = new Map(match.players.map((p) => [p.id, p]));
const byId = new Map(members.map((m) => [m.id, m]));
const snapText = (seq: number) => stateLine(match, plan.snaps[Math.max(0, seq)]);
const person = (id?: string) => { if (!id) return undefined; const m = byId.get(id)!; return { name: m.isSelf ? 'you' : m.name, team: m.loyalty.teamId, hero: P.get(m.loyalty.heroId ?? '')?.name, isUser: m.isSelf || undefined }; };
const cardTarget = (m: Moment, kind: ReturnType<typeof cardKind>) =>
  cardTargetFor(m, kind, SELF_ID, plan.beats.filter((b) => b.seq === m.ballSeq), plan.moments, FRIENDS[0].id);
const beatFact = (b: Beat) => b.fact;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function beatsAll() { return plan.beats.filter((b) => inSpan(b.seq)); } // default loyalties (ids embed seq+friend+intent)
const cards = plan.cards.filter((m) => inSpan(m.ballSeq));
type Out = { beats: Record<string, { text: string; audio?: string }>; cards: Record<string, string[]> };
const FRESH = process.argv.includes('--fresh');
const out: Out = !FRESH && existsSync('public/data/precomputed.json') ? JSON.parse(readFileSync('public/data/precomputed.json', 'utf8')) : { beats: {}, cards: {} };
// drop entries whose audio file is missing or that no longer exist in the plan
for (const [k, v] of Object.entries(out.beats)) if (!beatsAll().some((b) => b.id === k) || (v.audio && !existsSync(`public${v.audio}`))) delete out.beats[k];
mkdirSync('public/audio/friends', { recursive: true });

const beats = beatsAll();
const todoB = beats.filter((b) => !out.beats[b.id]);
const todoC = cards.filter((m) => !out.cards[`${m.id}|${cardKind(m, SELF_ID)}`]);
console.log(`to generate: ${todoB.length} friend lines, ${todoC.length} cards`);
const groups: { beats: Beat[]; cards: Moment[] }[] = [];
for (let i = 0; i < Math.max(todoB.length / 6, todoC.length / 3); i++) groups.push({ beats: todoB.slice(i * 6, i * 6 + 6), cards: todoC.slice(i * 3, i * 3 + 3) });

for (const [gi, g] of groups.entries()) {
  if (!g.beats.length && !g.cards.length) continue;
  const body = {
    matchState: snapText((g.beats[0]?.seq ?? g.cards[0].ballSeq) - 1), userName: 'you', userTeam: me.loyalty.teamId,
    beats: g.beats.map((b) => ({ id: b.id, friendId: b.friendId, intent: b.intent, fact: beatFact(b), target: person(b.targetId), ballText: match.balls[b.seq].text })),
    cards: g.cards.map((m) => { const kind = cardKind(m, SELF_ID); const pl = m.playerId ? P.get(m.playerId) : undefined;
      return { id: m.id, kind, headline: m.headline, fact: m.fact, player: pl ? { name: pl.name, story: pl.story } : undefined, target: person(cardTarget(m, kind)), matchState: snapText(m.ballSeq) }; }),
  };
  let res: Response | undefined;
  for (let attempt = 0; attempt < 4; attempt++) {
    res = await react(new Request('http://local/api/react', { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } }));
    if (res.ok) break;
    console.log(`group ${gi}: HTTP ${res.status}, retrying in 20s`); await sleep(20_000);
  }
  if (!res?.ok) { console.log(`group ${gi}: FAILED`); continue; }
  const data = await res.json() as { lines: Record<string, string>; cards: Record<string, string[]>; model: string };
  for (const m of g.cards) if (data.cards[m.id]) out.cards[`${m.id}|${cardKind(m, SELF_ID)}`] = data.cards[m.id];
  for (const b of g.beats) {
    const text = data.lines[b.id]; if (!text) continue;
    const file = `${b.id}.mp3`;
    try {
      const mp3 = await tts(text, byId.get(b.friendId)!.speaker!, 15_000);
      writeFileSync(`public/audio/friends/${file}`, mp3);
      out.beats[b.id] = { text, audio: `/audio/friends/${file}` };
    } catch { out.beats[b.id] = { text }; }
  }
  console.log(`group ${gi}: ${Object.keys(data.lines).length} friend lines, ${Object.keys(data.cards).length} cards (${data.model})`);
  await sleep(13_000); // stay under the free-tier 5 requests/minute so the main Flash model is used
}

writeFileSync('public/data/precomputed.json', JSON.stringify(out, null, 1));
const lab = (seq: number) => `${match.balls[seq].innings === 1 ? match.battingFirst : match.chasing} ${match.balls[seq].label}`;
const md = ['# Precomputed safety-net lines (owner review)', '', 'Generated by `npm run precompute` with the same prompts as the live path. Used ONLY if a live AI call is late or fails.', '',
  '## Friend lines', '', '| Ball | Friend | Intent | Line |', '|---|---|---|---|',
  ...beats.filter((b) => out.beats[b.id]).map((b) => `| ${lab(b.seq)} | ${byId.get(b.friendId)!.name} | ${b.intent} | ${out.beats[b.id].text.replace(/\|/g, '/')} |`),
  '', '## Moment-card lines (for the user)', '',
  ...cards.filter((m) => out.cards[`${m.id}|${cardKind(m, SELF_ID)}`]).flatMap((m) => [`**${lab(m.ballSeq)} — ${m.headline}** (${cardKind(m, SELF_ID)})`, ...out.cards[`${m.id}|${cardKind(m, SELF_ID)}`].map((l) => `- ${l}`), '']),
];
writeFileSync('docs/precomputed-review.md', md.join('\n'));
console.log(`done: ${Object.keys(out.beats).length}/${beats.length} beats, ${Object.keys(out.cards).length}/${cards.length} cards`);
