// §17.5 data test: converted match.json reproduces the official scorecard
// (England v India, 2nd ODI, Lord's, 14 July 2022 — Cricsheet 1276908).
import { describe, it, expect } from 'vitest';
import { match } from './helpers';
import { buildSnapshots } from '../../src/core/replay/scoreboard';

const snaps = buildSnapshots(match);
const last = (inn: 1 | 2) => snaps[match.balls.filter((b) => b.innings === inn).at(-1)!.seq];
const fig = (inn: 1 | 2, id: string) => { const b = last(inn).bowlers[id]; return `${Math.floor(b.legal / 6)}.${b.legal % 6}-${b.runs}-${b.wickets}`; };

describe("match data: England v India, 2nd ODI, Lord's, 2022-07-14", () => {
  it('has the right fixture and result', () => {
    expect(match.date).toBe('2022-07-14');
    expect(match.venue).toContain("Lord's");
    expect(match.overs).toBe(50);
    expect(match.result).toBe('England won by 100 runs');
    expect(match.battingFirst).toBe('ENG');
    expect(match.target).toBe(247);
    expect(match.video?.id).toBe('UnRMj4ZC12o');
  });
  it('innings totals: ENG 246 all out (49), IND 146 all out (38.5)', () => {
    expect([last(1).runs, last(1).wickets, last(1).overs]).toEqual([246, 10, '49.0']);
    expect([last(2).runs, last(2).wickets, last(2).overs]).toEqual([146, 10, '38.5']);
  });
  it('Topley took 6 for 24 in 9.5 overs; Chahal 4 for 47', () => {
    expect(fig(2, 'rjw-topley')).toBe('9.5-24-6');
    expect(fig(1, 'ys-chahal')).toBe('10.0-47-4');
  });
  it('India top-order wickets fall where the scorecard says', () => {
    const w = match.balls.filter((b) => b.innings === 2 && b.wicket).map((b) => `${b.label} ${b.wicket!.playerOutId} ${b.scoreAfter.runs}-${b.scoreAfter.wickets}`);
    expect(w.slice(0, 4)).toEqual(['2.4 rg-sharma 4-1', '8.5 s-dhawan 27-2', '10.2 rr-pant 29-3', '11.2 v-kohli 31-4']);
    expect(w.at(-1)).toBe('38.5 m-prasidh-krishna 146-10');
    expect(match.balls.filter((b) => b.wicket).length).toBe(20);
  });
  it('Rohit and Pant out for 0, Kohli for 16', () => {
    const r = (id: string) => last(2).batters[id].runs;
    expect([r('rg-sharma'), r('rr-pant'), r('v-kohli')]).toEqual([0, 0, 16]);
  });
  it('ball text is factual and never longer than 120 chars', () => {
    for (const b of match.balls) expect(b.text.length).toBeLessThanOrEqual(120);
    expect(match.balls.find((b) => b.runsBat === 6)!.text).toMatch(/^SIX! \w+ hits \w+ for six\.$/);
  });
});
