# ADR-0003: R6 adaptation, scripted beats and pacing for this match

**R6.** The spec's R6 ("last 2 overs of a chase and required ≤ 2× balls left") never fires in this match: New Zealand won
with 12 balls to spare. R6 is now "first ball in the chase where need ≤ 24 and balls left ≤ 30, OR the original condition";
it fires once, at 15.2 (24 off 28). FR-018 explicitly allows a "scripted high-severity moment" for the call-back.

**Nudge.** Real gangs say "go grab chai, I'll call you". At the end of chase over 14 a friend nudges the user to step away,
and the Step-away button pulses. While away the replay runs 4× faster, so the call-back arrives in seconds.
The clock holds on the call-back until the user returns, so they come back for Seifert's wicket at 15.3.

**Gang Calls** are offered before 3 overs chosen from data: IND over 10, NZ over 9, NZ over 17. Friends call by allegiance.

**Pacing.** 236 deliveries are compressed to ~3.6 min: severity-3 balls 8.5 s, key balls 6 s, the ball before a key ball 1.6 s,
the rest share the remaining budget (chase balls get 1.8× the time of first-innings balls). The clock also holds up to
3.5 s on a ball while its friends' lines are being generated, so voices never arrive late.

**Ball text** is generated from facts only ("SIX! Kishan hits Santner for six."). No shot direction or fielding detail is invented.
