// Builds data/matches/<id>/timeline.json (+ public copy) from:
//   1. manual tags already in timeline.json (src:"tag", from /dev/tag) — always win
//   2. scorebug-observations.json (machine-read broadcast scorebug, see the note in that file)
//   3. linear interpolation for every other ball (tagged:false)
// Run: npm run timeline
import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'node:fs';
import type { Match } from '../../src/core/types';
import { interpolate, type RawEntry } from '../../src/core/timeline';

const DIR = 'data/matches/eng-ind-2022-odi2';
const match: Match = JSON.parse(readFileSync('public/data/match.json', 'utf8'));
const obs: { t: number; inn: 1 | 2; overs: string; score: string; kind: 'first' | 'snapshot' }[] =
  JSON.parse(readFileSync(`${DIR}/scorebug-observations.json`, 'utf8')).obs;
const prev: RawEntry[] = existsSync(`${DIR}/timeline.json`) ? JSON.parse(readFileSync(`${DIR}/timeline.json`, 'utf8')) : [];
const manual = new Map(prev.filter((e) => e.tagged && e.src === 'tag').map((e) => [e.ballSeq, e.videoTime!]));

/** Result visible ≈3 s before the scorebug's first update; a one-off snapshot is ~half a ball late on average. */
const LEAD = { first: 3, snapshot: 15 } as const;
const scorebug = new Map<number, number>();
let unresolved = 0;
for (const o of obs) {
  const [ov, b] = o.overs.split('.').map(Number);
  const legal = ov * 6 + (b || 0);
  const [runs, wkts] = o.score.split('-').map(Number);
  const d = match.balls.filter((x) => x.innings === o.inn && x.legalBallsAfter === legal && x.scoreAfter.runs === runs && x.scoreAfter.wickets === wkts).at(-1);
  if (!d) { unresolved++; console.warn(`no delivery for inn ${o.inn} ${o.overs} ${o.score} @${o.t}s`); continue; }
  scorebug.set(d.seq, o.t - LEAD[o.kind]);
}

const raw: RawEntry[] = match.balls.map((b) => {
  const lbl = b.label.split('.').map(Number);
  const tag = manual.get(b.seq), sb = scorebug.get(b.seq);
  if (tag !== undefined) return { ballSeq: b.seq, innings: b.innings, over: b.over, ball: lbl[1], videoTime: tag, tagged: true, src: 'tag' };
  if (sb !== undefined) return { ballSeq: b.seq, innings: b.innings, over: b.over, ball: lbl[1], videoTime: sb, tagged: true, src: 'scorebug' };
  return { ballSeq: b.seq, innings: b.innings, over: b.over, ball: lbl[1], tagged: false };
});
const tl = interpolate(raw);
writeFileSync(`${DIR}/timeline.json`, JSON.stringify(tl, null, 0).replace(/\},\{/g, '},\n{'));
copyFileSync(`${DIR}/timeline.json`, 'public/data/timeline.json');
copyFileSync(`${DIR}/chapters.json`, 'public/data/chapters.json');
const n = (s: string) => tl.filter((e) => e.src === s).length;
console.log(`timeline: ${tl.length} balls — ${n('tag')} manual tags, ${n('scorebug')} scorebug anchors, ${n('interp')} interpolated; ${unresolved} unresolved observations`);
