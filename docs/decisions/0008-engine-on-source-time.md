# ADR-0008: The engine runs on source time (no clock holds)

**Decision.** `RoomEngine` polls the `MatchSource` every 250 ms. A pure `BallTracker` turns time into events:
- `reveal(seq)`: normal play.
- `skip(from, to)`: a forward jump of more than 2 balls.
- `rewind(to)`: the playhead moves back.
- `position`: for the UI only.

The spoiler high-water mark (`maxRevealed`) means nothing is ever re-delivered after a rewind.

**Removed.**
- `ReplayClock`, `pacing.ts`, and the per-beat 3.5 s clock hold. A video can't wait for Gemini.
- The 45 s call-back hold and the 4× away speed. They are replaced by the time-skip (ADR-0007).

**AI timing.**
- The look-ahead is **240 s of video** (it was 60 s). It is urgent when a beat is less than 75 s away. Chapter jumps and
  the away skip prefetch their destination immediately.
- At reveal, a line still in flight gets at most 1.2 s. Otherwise the precomputed line is used, then the template.
- The audit measured `/api/react` at 4.4 s average and 11.6 s max. At about 40 s per ball, a 4-minute look-ahead covers that
  comfortably.

**Fallback swap.** `attach()` can swap sources mid-room while keeping the tracker, so a YouTube failure never
re-delivers anything.
