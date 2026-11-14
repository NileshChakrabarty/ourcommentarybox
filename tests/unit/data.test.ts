// §17.5 data test: converted match.json reproduces the official scorecard.
import { describe, it, expect } from 'vitest';
import { match } from './helpers';
import { buildSnapshots } from '../../src/core/replay/scoreboard';

const snaps = buildSnapshots(match);
const last = (inn: 1 | 2) => snaps[match.balls.filter((b) => b.innings === inn).at(-1)!.seq];

describe('match data: 5th T20I NZ v IND, Hamilton, 2026-11-01', () => {
  it('has the right fixture and result', () => {
    expect(match.date).toBe('2026-11-01');
    expect(match.venue).toContain('Hamilton');
    expect(match.result).toBe('New Zealand won by 7 wickets');
    expect(match.target).toBe(192);
  });
  it('innings totals: IND 191/8 (20), NZ 195/3 (18)', () => {
    expect([last(1).runs, last(1).wickets, last(1).overs]).toEqual([191, 8, '20.0']);
    expect([last(2).runs, last(2).wickets, last(2).overs]).toEqual([195, 3, '18.0']);
  });
  it('top scorers match public reports', () => {
    const bat = (inn: 1 | 2, id: string) => { const b = last(inn).batters[id]; return [b.runs, b.balls]; };
    expect(bat(1, 'ishan-kishan')).toEqual([61, 32]);
    expect(bat(2, 'tl-seifert')).toEqual([93, 50]);
    expect(bat(2, 'gd-phillips')).toEqual([65, 38]);
    expect(last(2).batters['gd-phillips'].out).toBe(false);
  });
  it('Milne took 4 wickets; every wicket is recorded', () => {
    expect(last(1).bowlers['af-milne'].wickets).toBe(4);
    expect(match.balls.filter((b) => b.wicket).length).toBe(11);
  });
  it('ball text is factual and never longer than 120 chars', () => {
    for (const b of match.balls) expect(b.text.length).toBeLessThanOrEqual(120);
    expect(match.balls.find((b) => b.runsBat === 6)!.text).toMatch(/^SIX! \w+ hits \w+ for six\.$/);
  });
});
