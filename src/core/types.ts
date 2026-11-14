// Pure domain types. No React, no DOM.
export type ID = string;

export interface Team { id: ID; name: string; short: string; colour: string }
export interface Player {
  id: ID; teamId: ID; name: string; short: string;
  role: 'bat' | 'bowl' | 'all' | 'wk';
  story: string; // ≤120 chars, curated, used in prompts
}
export type ExtraType = 'wd' | 'nb' | 'b' | 'lb';
export interface Ball {
  seq: number;            // unique, 0-based across the match
  innings: 1 | 2;
  over: number;           // 0-based over index
  legalInOver: number;    // legal balls bowled in this over after this delivery (0..6)
  label: string;          // "15.3" style (completed overs . legal balls); wides show same label
  batterId: ID; nonStrikerId: ID; bowlerId: ID;
  runsBat: number; extras: number; extraType?: ExtraType;
  wicket?: { playerOutId: ID; kind: string };
  scoreAfter: { runs: number; wickets: number };
  legalBallsAfter: number; // legal balls in this innings after this delivery
  text: string;            // original short ball text (facts only)
}
export interface MatchVideo { provider: 'youtube'; id: string; title: string; owner: string; url: string }
export interface Match {
  id: ID; title: string; shortTitle: string; date: string; venue: string; result: string;
  overs: number;          // scheduled overs per innings (50 for an ODI)
  winner?: ID;            // team id of the winner
  video?: MatchVideo;
  battingFirst: ID; chasing: ID; target: number;
  source: { name: string; licence: string; url: string; note: string };
  teams: Team[]; players: Player[]; balls: Ball[];
}

export interface Loyalty { teamId: ID; heroId?: ID; villainId?: ID }
export interface Member {
  id: ID; name: string; isSelf: boolean; isSimulated: boolean;
  colour: string; persona: string; style: string; speaker?: string;
  loyalty: Loyalty;
}

export type RuleId = 'R1' | 'R2' | 'R3' | 'R4' | 'R5' | 'R6' | 'R7';
export interface Moment {
  id: ID; ruleId: RuleId; ballSeq: number;
  playerId?: ID;
  /** member whose loyalty triggered it (hero/villain owner) */
  ownerId?: ID;
  /** who gets teased (R1/R3/R4) — same as owner for those rules */
  victimId?: ID;
  severity: 1 | 2 | 3;
  headline: string;
  /** short factual description for prompts */
  fact: string;
}

export type ItemKind = 'clip' | 'text' | 'reaction' | 'skip';
export interface FeedItem {
  id: ID; memberId: ID; kind: ItemKind;
  anchorSeq: number; sentAt: number;
  text?: string;          // text, or transcript of a clip
  transcriptStatus?: 'pending' | 'ok' | 'failed';
  emoji?: string;
  audioKey?: string;      // key into audio cache / IndexedDB
  durationMs?: number;
  source?: 'live' | 'precomputed' | 'template' | 'user';
  momentId?: ID;
  /** if this item replies to something */
  replyTo?: ID;
  /** member this item teases/addresses (for wrap stats) */
  targetId?: ID;
  /** delivered while the user was away (not auto-played, Q-12) */
  unheard?: boolean;
  intent?: string;
}

export type CallType = 'wicket' | 'six';
export interface GangCall {
  id: ID; memberId: ID; type: CallType;
  innings: 1 | 2; over: number; // the over the call is for
  status: 'open' | 'won' | 'lost';
}

/** A demo chapter ("Jump to moment"). Ball seqs index match.balls. */
export interface Chapter {
  id: ID; title: string; blurb: string;
  startBallSeq: number; endBallSeq: number;
  /** gang suggests stepping away after this ball */
  nudgeSeq?: number;
  /** if you stepped away before this ball, the gang calls you back on it */
  callbackSeq?: number;
}
export interface ChapterFile { journeyStart: ID; chapters: Chapter[] }
