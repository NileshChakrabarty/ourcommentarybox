// Build-time SAFETY NET (spec §12.2): the same prompts as the live path, run once and committed as static files.
// Used only when a live call is late or fails. Output: public/data/precomputed.json, public/audio/friends/*.mp3,
// docs/precomputed-review.md (for the owner's review).
// v1.3 (ADR-0013/0014): both banter languages (Hinglish voiced in hi-IN, English in en-IN), keyed `${lang}:${id}`.
// Scope: every line in the first minutes after joining (the evaluator journey), plus every moment line in the chase.
// Run: npm run precompute            (fills in anything missing)
//      npm run precompute -- --fresh (regenerates everything)
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, unlinkSync } from 'node:fs';
import { buildPlan } from '../../src/core/plan';
import { Timeline } from '../../src/core/timeline';
import { cardKind, cardTargetFor } from '../../src/core/moments/rules';
import { FRIENDS, SELF_ID, DEFAULT_SELF_LOYALTY, speakerFor } from '../../src/content/gang';
import type { LiveConfig, Match, Member, Moment, Line } from '../../src/core/types';
import { stateLine, joinTime, type Beat } from '../../src/core/friends/director';
import { POST as react } from '../../api/react';
import { tts, type Lang } from '../../api/_lib/sarvam';

const match: Match = JSON.parse(readFileSync('public/data/match.json', 'utf8'));
const tl = new Timeline(JSON.parse(readFileSync('public/data/timeline.json', 'utf8')));
const live: LiveConfig = JSON.parse(readFileSync('public/data/live.json', 'utf8'));
const me: Member = { id: SELF_ID, name: 'You', isSelf: true, isSimulated: false, colour: '', persona: '', style: '', loyalty: DEFAULT_SELF_LOYALTY };
const members = [me, ...FRIENDS];
const plan = buildPlan(match, members, SELF_ID, tl, live);
const t0 = joinTime(tl, live);
const when = (b: Beat) => b.atTime ?? tl.timeOf(b.seq);
const inScope = (b: Beat) => when(b) - t0 <= live.pacing.warmSec || !!b.momentId;
const P = new Map(match.players.map((p) => [p.id, p]));
const byId = new Map(members.map((m) => [m.id, m]));
const snapText = (seq: number) => stateLine(match, plan.snaps[Math.max(0, seq)]);
const person = (id?: string) => { if (!id) return undefined; const m = byId.get(id)!; return { name: m.isSelf ? 'you' : m.name, team: m.loyalty.teamId, hero: P.get(m.loyalty.heroId ?? '')?.name, isUser: m.isSelf || undefined }; };
const cardTarget = (m: Moment, kind: ReturnType<typeof cardKind>) =>
  cardTargetFor(m, kind, SELF_ID, plan.beats.filter((b) => b.seq === m.ballSeq && b.atTime === undefined), plan.moments, FRIENDS[0].id);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const beats = plan.beats.filter(inScope);
const cards = plan.cards;
type Out = { beats: Record<string, { text: string; audio?: string }>; cards: Record<string, string[]> };
const FRESH = process.argv.includes('--fresh');
const out: Out = !FRESH && existsSync('public/data/precomputed.json') ? JSON.parse(readFileSync('public/data/precomputed.json', 'utf8')) : { beats: {}, cards: {} };
const LANGS: Lang[] = ['hi', 'en'];
const wanted = new Set(LANGS.flatMap((l) => beats.map((b) => `${l}:${b.id}`)));
// drop entries no longer in the plan, from the old format, or whose audio file is missing
for (const [k, v] of Object.entries(out.beats)) if (!wanted.has(k) || (v.audio && !existsSync(`public${v.audio}`))) delete out.beats[k];
for (const k of Object.keys(out.cards)) if (!/^(hi|en):/.test(k)) delete out.cards[k];
mkdirSync('public/audio/friends', { recursive: true });

for (const lang of LANGS) {
  const todoB = beats.filter((b) => !out.beats[`${lang}:${b.id}`]);
  const todoC = cards.filter((m) => !out.cards[`${lang}:${m.id}|${cardKind(m, SELF_ID)}`]);
  console.log(`[${lang}] to generate: ${todoB.length} friend lines, ${todoC.length} cards`);
  const groups: { beats: Beat[]; cards: Moment[] }[] = [];
  for (let i = 0; i < Math.max(todoB.length / 6, todoC.length / 3); i++) groups.push({ beats: todoB.slice(i * 6, i * 6 + 6), cards: todoC.slice(i * 3, i * 3 + 3) });
  for (const [gi, g] of groups.entries()) {
    if (!g.beats.length && !g.cards.length) continue;
    const body = {
      matchState: snapText((g.beats[0]?.seq ?? g.cards[0].ballSeq) - 1), userName: 'you', userTeam: me.loyalty.teamId, language: lang,
      beats: g.beats.map((b) => ({ id: b.id, friendId: b.friendId, intent: b.intent, fact: b.fact, target: person(b.targetId), ballText: match.balls[b.seq].text })),
      cards: g.cards.map((m) => { const kind = cardKind(m, SELF_ID); const pl = m.playerId ? P.get(m.playerId) : undefined;
        return { id: m.id, kind, headline: m.headline, fact: m.fact, player: pl ? { name: pl.name, story: pl.story } : undefined, target: person(cardTarget(m, kind)), matchState: snapText(m.ballSeq) }; }),
    };
    let res: Response | undefined;
    for (let attempt = 0; attempt < 4; attempt++) {
      res = await react(new Request('http://local/api/react', { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } }));
      if (res.ok) break;
      console.log(`[${lang}] group ${gi}: HTTP ${res.status}, retrying in 20s`); await sleep(20_000);
    }
    if (!res?.ok) { console.log(`[${lang}] group ${gi}: FAILED`); continue; }
    const data = await res.json() as { lines: Record<string, Line>; cards: Record<string, Line[]>; model: string };
    for (const m of g.cards) if (data.cards[m.id]) out.cards[`${lang}:${m.id}|${cardKind(m, SELF_ID)}`] = data.cards[m.id].map((l) => l.display);
    for (const b of g.beats) {
      const line = data.lines[b.id]; if (!line) continue;
      const file = `${lang}-${b.id.replace(/@/g, '-at-')}.mp3`;
      try {
        const mp3 = await tts(line.speech, speakerFor(byId.get(b.friendId)!, lang), lang, 15_000);
        writeFileSync(`public/audio/friends/${file}`, mp3);
        out.beats[`${lang}:${b.id}`] = { text: line.display, audio: `/audio/friends/${file}` };
      } catch { out.beats[`${lang}:${b.id}`] = { text: line.display }; }
    }
    console.log(`[${lang}] group ${gi}: ${Object.keys(data.lines).length} friend lines, ${Object.keys(data.cards).length} cards (${data.model})`);
    await sleep(13_000); // stay under the free-tier 5 requests/minute so the main Flash model is used
  }
}

// remove audio files nothing points at any more (older plans, older naming)
const used = new Set(Object.values(out.beats).map((v) => v.audio?.split('/').pop()).filter(Boolean));
for (const f of readdirSync('public/audio/friends')) if (f.endsWith('.mp3') && !used.has(f)) unlinkSync(`public/audio/friends/${f}`);

writeFileSync('public/data/precomputed.json', JSON.stringify(out, null, 1));
const lab = (b: Beat) => `${match.balls[b.seq].label}${b.atTime !== undefined ? ` (+${Math.round(b.atTime - t0)} s)` : ''}`;
const md = ['# Precomputed safety-net lines (owner review)', '',
  'Generated by `npm run precompute` with the same prompts as the live path, in both banter languages. Used ONLY if a live AI call is late or fails.',
  'Scope: every line in the first minutes after joining, plus every moment line in the chase. Times in brackets are seconds after joining.', '',
  ...LANGS.flatMap((lang) => [`## ${lang === 'hi' ? 'Hinglish' : 'English'}: friend lines`, '', '| Ball | Friend | Intent | Line |', '|---|---|---|---|',
    ...beats.filter((b) => out.beats[`${lang}:${b.id}`]).map((b) => `| ${lab(b)} | ${byId.get(b.friendId)!.name} | ${b.intent} | ${out.beats[`${lang}:${b.id}`].text.replace(/\|/g, '/')} |`),
    '', `## ${lang === 'hi' ? 'Hinglish' : 'English'}: card lines (for the user)`, '',
    ...cards.filter((m) => out.cards[`${lang}:${m.id}|${cardKind(m, SELF_ID)}`]).flatMap((m) => [`**${match.balls[m.ballSeq].label} — ${m.headline}** (${cardKind(m, SELF_ID)})`, ...out.cards[`${lang}:${m.id}|${cardKind(m, SELF_ID)}`].map((l) => `- ${l}`), '']),
  ]),
];
writeFileSync('docs/precomputed-review.md', md.join('\n'));
const n = (lang: Lang) => Object.keys(out.beats).filter((k) => k.startsWith(`${lang}:`)).length;
console.log(`done: hi ${n('hi')}/${beats.length}, en ${n('en')}/${beats.length} beats; ${Object.keys(out.cards).length}/${cards.length * 2} cards`);
