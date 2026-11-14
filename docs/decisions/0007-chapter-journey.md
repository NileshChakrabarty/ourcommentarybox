# ADR-0007: A chapter-based 5-minute journey on a real-time video

**Problem.** A full ODI broadcast runs about 35–45 s per ball. Five real minutes is about 8 balls, and Rohit's dismissal
alone is followed by a 3-minute DRS review. The v1.1 journey relied on compressing time, which a real video can't do.

**Decision.**
- **Chapters** (`data/matches/eng-ind-2022-odi2/chapters.json`) carry title, blurb, start/end ball, optional `nudgeSeq` and
  `callbackSeq`. Blurbs never reveal what happens next. The boundaries are placeholders for the owner to confirm.
  1. *Topley's opening burst*: 2.1–2.4 (Rohit lbw b Topley). The gang nudges you to step away at 2.4.
  2. *India's top order wobbles*: 10.1–11.2. The call-back is at 11.1, the ball before Kohli's dismissal.
  3. *The final wicket*: 38.4–38.5 (Prasidh c Buttler b Topley, Topley's sixth).
- **Each chapter starts 12 s before its first ball**, so the scene-setting line lands first. Most chapter balls get a
  `chatter` line, so there is no dead air (the audit's C3).
- **Step away = demo time-skip.** After 1.4 s the video seeks to 6 s before the next call-back ball. The away panel says
  so honestly ("Demo time-skip…"). Skipped lines become "Missed" items with no autoplay, and the catch-up names every
  wicket you missed (Dhawan, Pant). If there is no call-back ahead, the gang calls you back on the next wicket.
- **Up next.** 20 s after a chapter's last ball, the dock offers the next chapter with a 10 s countdown. You can jump now
  or keep watching.
- **Gang Calls** are offered when a chapter opens on a new over. A call is **won the moment its event happens** (no
  waiting out a DRS review) and lost when the over ends without it. Friends call by persona: optimist Dev backs a six,
  pessimist Sunny calls a wicket, contrarian Ritu flips each over.
- **R6 (close chase) never fires** in this match (India lost by 100). Call-backs come from chapters instead. R6 stays in
  code for other matches.
- **"Finish and see the wrap"** in the app bar lets a reviewer end at any time.

**Measured.** See `docs/review/RESULT.md`: the real-embed walk from start to wrap.
