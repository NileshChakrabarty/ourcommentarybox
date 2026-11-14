// Cricsheet JSON (data/matches/<id>/cricsheet-*.json) → public/data/match.json
// Facts only (runs, extras, wickets, batter, bowler). Ball text is original, generated from templates.
import { readFileSync, writeFileSync } from 'node:fs';
import { PLAYER_META, MATCH_META } from '../matches/eng-ind-2022-odi2/meta';
import type { Ball, Match, Player, ExtraType } from '../../src/core/types';

const raw = JSON.parse(readFileSync(MATCH_META.cricsheet, 'utf8'));
const info = raw.info;

const TEAM = MATCH_META.teams;
type TeamName = string;

const pid = (n: string) => n.toLowerCase().replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '');
const players: Player[] = [];
for (const [team, list] of Object.entries(info.players) as [TeamName, string[]][]) {
  for (const n of list) {
    const meta = PLAYER_META[n];
    if (!meta) throw new Error(`No PLAYER_META for ${n}`);
    if (meta.story.length > 120) throw new Error(`Story too long for ${n}`);
    players.push({ id: pid(n), teamId: TEAM[team].id, ...meta });
  }
}
const short = (n: string) => PLAYER_META[n].short;

// Deterministic variety without randomness: pick template by seq.
const pick = <T,>(arr: T[], i: number) => arr[i % arr.length];
function ballText(d: any, seq: number): string {
  // FACTS ONLY: who, off whom, how many, dismissal kind (+ catcher if recorded). No shot direction or invented detail.
  const b = short(d.batter), w = short(d.bowler);
  const e = d.extras ?? {};
  if (d.wickets?.length) {
    const x = d.wickets[0];
    const out = short(x.player_out);
    const k = x.kind as string;
    const fielder = x.fielders?.[0]?.name;
    const by = fielder && PLAYER_META[fielder] ? PLAYER_META[fielder].short : undefined;
    if (k === 'caught and bowled') return `OUT! ${out} caught and bowled by ${w}.`;
    if (k === 'caught') return `OUT! ${out} caught${by ? ` by ${by}` : ''}, bowled ${w}.`;
    if (k === 'bowled') return `OUT! ${out} bowled by ${w}.`;
    if (k === 'lbw') return `OUT! ${out} lbw to ${w}.`;
    if (k === 'run out') return `RUN OUT! ${out} is run out.`;
    return `OUT! ${out}, ${k}, off ${w}.`;
  }
  if (e.wides) return `Wide from ${w}.`;
  if (e.noballs) return `No-ball from ${w}.${d.runs.batter ? ` ${b} scores ${d.runs.batter} off it.` : ''}`;
  const r = d.runs.batter;
  if (r === 6) return `SIX! ${b} hits ${w} for six.`;
  if (r === 4) return `FOUR! ${b} hits ${w} for four.`;
  if (e.legbyes || e.byes) return `${d.runs.total} ${e.legbyes ? 'leg-bye' : 'bye'}${d.runs.total > 1 ? 's' : ''}.`;
  if (r === 0) return pick([`Dot ball from ${w}.`, `No run. ${w} to ${b}.`], seq);
  if (r === 1) return `${b} takes a single.`;
  if (r === 2) return `${b} takes two.`;
  return `${b} takes ${r}.`;
}

const balls: Ball[] = [];
let seq = 0;
raw.innings.forEach((inn: any, ii: number) => {
  let runs = 0, wkts = 0, legal = 0;
  for (const o of inn.overs) {
    let legalInOver = 0;
    for (const d of o.deliveries) {
      const e = d.extras ?? {};
      const isLegal = !e.wides && !e.noballs;
      if (isLegal) { legal++; legalInOver++; }
      runs += d.runs.total;
      if (d.wickets) wkts += d.wickets.length;
      const extraType: ExtraType | undefined = e.wides ? 'wd' : e.noballs ? 'nb' : e.legbyes ? 'lb' : e.byes ? 'b' : undefined;
      balls.push({
        seq, innings: (ii + 1) as 1 | 2, over: o.over, legalInOver,
        label: `${o.over}.${legalInOver}`,
        batterId: pid(d.batter), nonStrikerId: pid(d.non_striker), bowlerId: pid(d.bowler),
        runsBat: d.runs.batter, extras: d.runs.extras, extraType,
        wicket: d.wickets ? { playerOutId: pid(d.wickets[0].player_out), kind: d.wickets[0].kind } : undefined,
        scoreAfter: { runs, wickets: wkts },
        legalBallsAfter: legal,
        text: ballText(d, seq),
      });
      seq++;
    }
  }
});

const first = TEAM[raw.innings[0].team as TeamName];
const second = TEAM[raw.innings[1].team as TeamName];
const firstTotal = balls.filter((b) => b.innings === 1).at(-1)!.scoreAfter.runs;
const by = info.outcome.by as { runs?: number; wickets?: number };
const match: Match = {
  id: MATCH_META.id,
  title: MATCH_META.title,
  shortTitle: MATCH_META.shortTitle,
  overs: MATCH_META.overs,
  date: info.dates[0],
  venue: info.venue,
  result: `${TEAM[info.outcome.winner as TeamName].name} won by ${by.runs ? `${by.runs} runs` : `${by.wickets} wickets`}`,
  winner: TEAM[info.outcome.winner as TeamName].id,
  battingFirst: first.id, chasing: second.id, target: firstTotal + 1,
  source: {
    name: 'Cricsheet', licence: 'Open Data Commons Attribution License (ODC-By)', url: 'https://cricsheet.org/',
    note: 'Ball-by-ball facts from Cricsheet. Ball descriptions are original text, not broadcast commentary.',
  },
  teams: [first, second].map((t) => ({ ...t })),
  video: MATCH_META.video,
  players, balls,
};
writeFileSync('public/data/match.json', JSON.stringify(match));
console.log(`match.json: ${balls.length} deliveries, ${players.length} players, target ${match.target}, result: ${match.result}`);
