\# PROJECT MASTER SPECIFICATION  
\#\# Apna Commentary Box  
\#\#\#\# The best commentary is your friends.  
\#\#\# Voice-first gang commentary that floats above any live sports stream

\| Field \| Value \|  
\|---\|---\|  
\| Document version \| 1.3 (v1.3 change request + amendment of 2026-11-16 applied — see §1.1 \#15–\#22; earlier: owner decisions of 2026-11-13, renames of 2026-11-15) \|  
\| Date \| 2026-11-13 \|  
\| Source \| Consolidated from the full product-discovery conversation between the project owner and Claude \|  
\| Context \| Submission for the Dream11 Forward Deployed Engineer Intern assignment ("Build one AI-powered artifact that solves a real problem fans face during a live sports match") \|  
\| Status \| Concept, name, match, language, AI providers and scope finalized. Remaining open items are minor or verification tasks (see §22). Ready for build. \|

\---

\#\# How to read this document

Every decision carries one status label:

\| Label \| Meaning \|  
\|---\|---\|  
\| \*\*CONFIRMED\*\* \| The project owner explicitly stated or chose this. Do not change without asking. \|  
\| \*\*PROPOSED\*\* \| Recommended during discussion and presented to the owner without objection, or a technical recommendation made in this document. Default to it, but it may change. \|  
\| \*\*ASSUMPTION\*\* \| Not discussed; a reasonable default adopted so work can proceed. Must be validated. \|  
\| \*\*UNRESOLVED\*\* \| An open decision that needs the owner's input (all collected in §22). \|  
\| \*\*FUTURE SCOPE\*\* \| Explicitly deferred. Do not build in the current release. \|

Important: \*\*no technology stack was discussed in the conversation.\*\* Every technology named in §8–§11 and §18–§19 is \*\*PROPOSED\*\* unless stated otherwise.

\---

\#\# Table of contents

1\. \[Executive overview\](\#1-executive-overview)  
2\. \[Problem definition and product context\](\#2-problem-definition-and-product-context)  
3\. \[Target users and personas\](\#3-target-users-and-personas)  
4\. \[Product scope and feature specification\](\#4-product-scope-and-feature-specification)  
5\. \[User journeys and system workflows\](\#5-user-journeys-and-system-workflows)  
6\. \[Functional requirements\](\#6-functional-requirements)  
7\. \[Non-functional requirements\](\#7-non-functional-requirements)  
8\. \[Technical architecture and system design\](\#8-technical-architecture-and-system-design)  
9\. \[Technology stack\](\#9-technology-stack)  
10\. \[Database and data modelling\](\#10-database-and-data-modelling)  
11\. \[API specification\](\#11-api-specification)  
12\. \[AI and intelligent systems\](\#12-ai-and-intelligent-systems)  
13\. \[Frontend and UI/UX specification\](\#13-frontend-and-uiux-specification)  
14\. \[Security and privacy\](\#14-security-and-privacy)  
15\. \[Integrations and external dependencies\](\#15-integrations-and-external-dependencies)  
16\. \[Error handling and edge cases\](\#16-error-handling-and-edge-cases)  
17\. \[Testing strategy\](\#17-testing-strategy)  
18\. \[Deployment and infrastructure\](\#18-deployment-and-infrastructure)  
19\. \[Project directory and codebase structure\](\#19-project-directory-and-codebase-structure)  
20\. \[Implementation roadmap\](\#20-implementation-roadmap)  
21\. \[Task breakdown\](\#21-task-breakdown)  
22\. \[Assumptions, open questions and unresolved decisions\](\#22-assumptions-open-questions-and-unresolved-decisions)  
23\. \[Final agentic coding instructions\](\#23-final-agentic-coding-instructions)  
24\. \[Appendix A — Assignment deliverables\](\#appendix-a--assignment-deliverables)  
25\. \[Appendix B — Decision history\](\#appendix-b--decision-history)

\---

\#\# 1\. Executive overview

\| Item \| Description \| Status \|  
\|---\|---\|---\|  
\| \*\*Project name\*\* \| \*\*Apna Commentary Box\*\* (short form in the UI: \*\*Apna Box\*\*; slug: \`apnacommentarybox\`; tagline: \"The best commentary is your friends.\"). Renamed from Fun-Banter to Our Commentary Box, then to Apna Commentary Box, on 2026-11-15 (§1.1 \#13, \#14). ("Match Room" remains the name of the per-match session concept inside the product.) \| CONFIRMED \|  
\| \*\*One-line description\*\* \| Your gang's own voice commentary, synced to the ball, floating above any live sports stream. \| PROPOSED \|  
\| \*\*Vision\*\* \| Friends watching a match from different places should feel like they watched together — the banter, the teasing, the shared adrenaline — without leaving the stream. \| CONFIRMED (owner's words: "a sense of belonging to my friends, without too much friction") \|  
\| \*\*Problem\*\* \| Watching a big match apart from your friends loses the best part: teasing each other when a friend's favourite player fails, laughing together, shared emotion. Today that requires leaving the stream for WhatsApp, the moment passes while typing, and a good joke is hard to produce on the spot. \| CONFIRMED \|  
\| \*\*Solution\*\* \| A layer that sits above the streaming site. Each match opens a \*room\* for the gang. Friends send short voice clips pinned to the ball. AI spots the moments that matter to \*this\* gang and hands each person a line to say. If you step away, the gang calls you back for big moments and a catch-up is waiting. After the match, the room becomes a memory. \| CONFIRMED (concept) / PROPOSED (mechanics) \|  
\| \*\*Core value proposition\*\* \| (1) Never leave the stream. (2) Voice instead of typing. (3) AI writes the tease so you are never stuck for words. (4) Messages arrive in sync with \*your\* stream, so friends never spoil it. (5) Every match becomes a shared memory. \| PROPOSED, built from CONFIRMED pain points \|  
\| \*\*Target audience\*\* \| Groups of friends who follow cricket (especially big tournaments such as the World Cup or IPL) and watch the same match from different locations. \| CONFIRMED \|  
\| \*\*Objectives\*\* \| (a) Submit a working, well-designed demo link plus a ≤200-word note to Dream11 within the deadline. (b) Validate the product hypothesis (§2.6). \| CONFIRMED (a) / PROPOSED (b) \|  
\| \*\*Current stage\*\* \| Product concept defined. No code written. Key inputs (match, name, extension decision) pending. \| — \|  
\| \*\*Long-term vision\*\* \| A real browser extension over any streaming site; later an Android overlay and a lighter iOS version (Dynamic Island / notifications); automatic sync by audio fingerprinting; real multiplayer rooms for actual friend groups, potentially seeded from Dream11's existing private-contest friend groups. \| FUTURE SCOPE \|

\#\#\# 1.1 Decision update — v1.1 (2026-11-13) — supersedes anything below that conflicts

\| \# \| Decision \| Status \|  
\|---\|---\|---\|  
\| 1 \| \*\*Name:\*\* ~~Fun-Banter~~ — superseded by \#13, then \#14 (Apna Commentary Box) \| CONFIRMED (superseded) \|  
\| 2 \| \*\*Match to replay:\*\* \*\*5th T20I, New Zealand v India, 1 November 2026, Hamilton.\*\* New Zealand won by 7 wickets chasing, completing the chase with about two overs to spare; Tim Seifert and Glenn Phillips shared an 86-run partnership. India won the five-match series 3–2. (Facts from public reports; the build must confirm every detail against the full scorecard.) \| CONFIRMED (match) / verify (details) \|  
\| 3 \| \*\*Banter language:\*\* English \| CONFIRMED \|  
\| 4 \| \*\*Friend voices:\*\* AI voices \| CONFIRMED \|  
\| 5 \| \*\*Simulated friends are created by the build\*\* (names, personalities, loyalties, lines). The owner does not supply gang content; the owner reviews the result. \| CONFIRMED \|  
\| 6 \| \*\*AI must happen live while the reviewer uses the demo\*\* ("this should happen live right when the reviewer checks it"). Precomputed lines remain only as a safety net. \| CONFIRMED \|  
\| 7 \| \*\*Stream area:\*\* stylised, animated scoreboard/broadcast view built from ball-by-ball data. No real footage. \| CONFIRMED \|  
\| 8 \| \*\*"Not adopt 3" \= spoiler-protection mode (idea \#3).\*\* Excluded. Catch-up and gang wrap (piece C) stay. Conflict D-1 resolved. \| CONFIRMED \|  
\| 9 \| \*\*Gang Calls:\*\* IN \| CONFIRMED \|  
\| 10 \| \*\*Chrome extension:\*\* only after the demo link is done \| CONFIRMED \|  
\| 11 \| \*\*AI providers:\*\* \*\*Google Gemini\*\* for all text generation; \*\*Sarvam AI\*\* for text-to-speech (Bulbul) and speech-to-text (Saaras). Anthropic is no longer used. \| CONFIRMED \|  
\| 12 \| Owner provides: \`GEMINI\_API\_KEY\`, \`SARVAM\_API\_KEY\` (placed in \`.env\` / hosting env by the owner, never in chat or code), and a Vercel account. \| CONFIRMED \|  
\| 13 \| \*\*Rename (2026-11-15), superseded by \#14:\*\* the product is now \*\*Our Commentary Box\*\*. Short form in the UI: \*\*Our Box\*\*. Slug: \`ourcommentarybox\`. Tagline: \*\"The best commentary is your friends.\"\* Use the name warmly in copy (\"Welcome to the box\", \"Your gang is in the box\", \"Back in the box?\"). The browser IndexedDB database keeps its old name \`fun-banter\` so existing memories survive (see \`docs/decisions/0010-rename-our-commentary-box.md\`). \| CONFIRMED (superseded) \|  
\| 14 \| \*\*Rename (2026-11-15, later the same day):\*\* the product is now \*\*Apna Commentary Box\*\* (\"apna\": Hindi for \"our own\"). Short form in the UI: \*\*Apna Box\*\*. Slug: \`apnacommentarybox\`. The tagline \*\"The best commentary is your friends.\"\* and the warm \"box\" copy stay. The owner confirmed the spelling \"Commentary\" (not \"Commentry\"). The IndexedDB name stays \`fun-banter\` (ADR-0012). \| CONFIRMED \|  
\| 15 \| \*\*v1.3 — simulated LIVE broadcast (2026-11-16):\*\* the ECB video is embedded with \`controls=0\`, \`disablekb=1\`, \`rel=0\`, \`modestbranding=1\` (YouTube branding stays visible, nothing overlays the player). No seek, skip, rewind, pause or \"jump to moment\"; mute/volume only, beside the player. \"● LIVE\" badge and a live scoreboard strip (Cricsheet, current ball) above the player. The viewer joins India's chase in progress (\`public/data/live.json\`: \`joinBallSeq\` 317, \`endBallSeq\` 536). The live clock is the wall clock; it keeps running while the tab is hidden or the viewer steps away, and the gang's catch-up plays on return. Chapters, rewatch and seeking are removed from the main flow; \`/dev/tag\` stays dev-only. Supersedes the chapter journey (ADR-0007). See ADR-0014. \| CONFIRMED \|  
\| 16 \| \*\*v1.3 amendment — open-ended:\*\* no fixed ~3-minute session; the broadcast runs from the join point to the last ball of the chase. \"Leave the box\" shows the wrap at any time; the wrap also opens at match end and summarises what THIS viewer experienced. The first-3-minutes guarantees stay (\`guaranteeWindowSec\` 180). Friend pacing: busy on big moments, quiet on dot balls, never spammy (ADR-0014 §Pacing). \| CONFIRMED \|  
\| 17 \| \*\*Hinglish by default\*\*, small toggle for English, stored locally. Every spoken line from Gemini is \`{display: Roman Hinglish, speech: Devanagari}\`. Sarvam TTS uses \`language_code\` \`hi-IN\`/\`en-IN\` (the API field is \`language_code\`, not \`target_language_code\`), \`bulbul:v4-flash\`, with a distinct persona per friend per language. STT uses \`saaras:v3\` with \`mode: translit\` (auto language) for Roman Hinglish, and \`saaras:v4\` for English. Verified against docs.sarvam.ai and live calls. Banter is wholesome and never about religion, region, caste or body (blocklist in Roman and Devanagari). See ADR-0013. \| CONFIRMED \|  
\| 18 \| \*\*3-minute evaluator journey:\*\* landing = one line (\"Watch with your gang, even when you're apart.\") + \"Join the box\"; the gang is auto-created and labelled as AI; one coach hint (\"Hold 🎤 or Space to talk\"); the first wicket lands about 38 s in, with friends reacting in Hinglish voices and the match ducked; the comeback card comes at about 1 min; the step-away nudge comes at 2 min; memory shelf, Gang Calls and extras sit behind \"More\" after the wrap. See ADR-0015. \| CONFIRMED \|  
\| 19 \| \*\*Behind the scenes (X-ray):\*\* an off-by-default, read-only engine log beside the panel, stamped by over.ball: ball detection, moment rule and why, AI line source and latency, voice, ducking, prefetch. It never shows keys, prompts or personal data. See ADR-0016. \| CONFIRMED \|  
\| 20 \| \*\*/how-it-works:\*\* one SVG architecture diagram and four short sections (ball sync; the extension on any streaming app; what the AI does; real vs simulated), with the Hinglish/English toggle. Linked in the footer. See ADR-0016. \| CONFIRMED \|  
\| 21 \| \*\*One panel, two hosts:\*\* the gang panel is host-agnostic and depends only on \`MatchSource\`. Web host = panel + YouTube embed. Chrome extension (MV3, \`/extension\`) = side panel reusing the panel, with a content script reading the YouTube \`<video>\` for \`UnRMj4ZC12o\` through \`VideoElementSource\`. Permission is \`sidePanel\` only, there are no keys in the extension, and it calls our API (CORS allowlist). See ADR-0017. \| CONFIRMED \|  
\| 22 \| \*\*Not yet done:\*\* deployment to Vercel (needs the owner's login), so the extension was built and verified against the local dev server; rebuild it with \`ACB_API_BASE\` after deploying. \| UNRESOLVED (owner) \|

\---

\#\# 2\. Problem definition and product context

\#\#\# 2.1 Detailed problem statement (CONFIRMED — owner's own experience)

1\. \*\*The moment:\*\* the owner most misses friends when a friend's favourite team or player "is doing a shitty job" or gets out — the player that friend was so proud of. That is when they want to tease them.  
2\. \*\*The ritual:\*\* make fun of each other and laugh out loud.  
3\. \*\*The situation:\*\* the friends \*\*are also watching\*\*, just elsewhere.  
4\. \*\*The friction (owner selected these three):\*\*  
   \- F1 — "I have to leave the match screen and open another app."  
   \- F2 — "By the time I've typed, the moment (or the next ball) has passed."  
   \- F3 — "Typing a good joke on the spot is hard."  
5\. \*\*The desired feeling:\*\* "wholesome", "we had shared the experience".  
6\. \*\*Owner's explicit constraints:\*\* no VR; low friction; must not require going to another site or leaving the platform; the owner originally described "just one phone" as the viewing device (later superseded for the demo — see §2.5).  
7\. \*\*Owner's reframing:\*\* "I want us to do our version of the commentary of the match." The gang becomes the commentary box.

\#\#\# 2.2 Secondary problem (CONFIRMED as real, NOT the lead problem)

As an occasional fan who only follows big tournaments, the owner feels left out when friends know a new player's story ("He has done this, he is this…"). This is addressed \*\*only indirectly\*\*: the AI uses player stories to write teases (§4, F-B), so a casual fan absorbs who is who from the banter. No separate player-information feature is built.

\#\#\# 2.3 Why existing solutions are insufficient (PROPOSED analysis, discussed with owner)

\| Existing option \| What it allows \| Where it breaks \|  
\|---\|---\|---\|  
\| WhatsApp group \| Text, voice notes, stickers \| Separate app (F1); one endless thread so matches get buried; \*\*spoilers\*\*, because friends' streams run at different delays and a message about a wicket can arrive before the wicket reaches your screen \|  
\| Discord \| Voice channels, per-match threads, cricket score bots, even AI bots \| Separate app; setup-heavy; not where most Indian casual fans talk; live voice cannot be delayed per listener, so it is not in sync with each person's stream \|  
\| Streaming apps' live reactions \| Emoji reactions \| Shared with millions of strangers, not your friends \|  
\| Video call / screen-share watch party \| Faces and voices \| Not wanted (owner rejected VR-style immersion); bandwidth; copyright issues with screen-sharing broadcasts \|

\#\#\# 2.4 Differentiators (PROPOSED, presented and not contested)

1\. \*\*Ball-pinned messages:\*\* every clip is anchored to a ball and plays when \*your\* stream reaches that ball. Nobody is spoiled, even on different delays. WhatsApp and Discord do not know where your stream is.  
2\. \*\*AI that knows your gang, not just the score:\*\* it knows the wicket matters \*because that player is a particular friend's hero\*.  
3\. \*\*Memory organised by match:\*\* one room per match, saved as a keepsake, instead of an endless chat scroll.  
4\. \*\*Zero switching:\*\* it lives where the match is.  
5\. \*\*Dream11 fit:\*\* Dream11 does not stream matches; its users already watch elsewhere and switch back to Dream11. Dream11 users already form friend groups through private contests — the gang exists but cannot \*watch\* together. (ASSUMPTION: the private-contest behaviour is accurate; verify before quoting in the submission.)

\#\#\# 2.5 Platform context (CONFIRMED evolution)

\- Early idea: a phone-sized web app with banter under the stream → superseded.  
\- Owner clarified: \*\*"we are not streaming… we are just sitting above any streaming app."\*\* The product is a layer, not a streaming app. → CONFIRMED.  
\- Mobile overlay discussed (Android "draw over other apps"; iOS cannot float over apps) → owner decided: \*\*"let's not make it for mobile"\*\* because it would make it hard for the company to view and evaluate. → CONFIRMED: \*\*desktop\*\*.  
\- On desktop, "above any streaming app" \= a \*\*browser extension\*\* over streaming websites. A browser extension cannot float over native desktop apps or TV. → Explained to owner.  
\- Owner asked whether an extension can be built. Recommendation given: \*\*main submission is a demo link\*\* (no install, always works); a \*\*real Chrome extension is a bonus if time allows\*\*. Owner confirmed: \*\*extension only after the demo link is done.\*\* → CONFIRMED.

\#\#\# 2.6 Product hypothesis (PROPOSED wording, built from CONFIRMED answers)

\> If friends watching apart could banter in sync with the match — without leaving the stream or typing — they would feel like they watched together, and come back to watch the next match together too.

\#\#\# 2.7 Success metrics (PROPOSED)

\| Metric \| Definition \| Signals \|  
\|---\|---\|---\|  
\| Banter per match \| Clips \+ reactions sent per participant per match \| Friction removed \|  
\| AI tease use \| AI prompts used ÷ AI prompts shown \| AI is useful, not noise \|  
\| Back for the moment \| Participants who return within N balls after a call-back \| Call-back works \|  
\| Next match \| Gangs that open a room for their next match \| Belonging (retention) \|

These cannot be measured in a single-user demo; they belong in the submission note and demo-round talk.

\---

\#\# 3\. Target users and personas

The system has \*\*no admin or moderator role\*\* in scope. Roles below are product roles, not permission tiers.

\#\#\# P-1 — The fan watching apart (primary; CONFIRMED)  
\- \*\*Description:\*\* cricket fan watching a big match on a laptop browser while friends watch elsewhere.  
\- \*\*Goals:\*\* tease friends at the right moment, laugh together, feel the shared adrenaline, not miss the match.  
\- \*\*Pain points:\*\* F1, F2, F3 (§2.1).  
\- \*\*Interaction:\*\* joins the room, sets loyalties, holds to talk, sends AI prompts, reacts, steps away and returns, views the memory.  
\- \*\*Permissions:\*\* full participation in rooms they belong to.

\#\#\# P-2 — The occasional fan in the gang (secondary; CONFIRMED problem)  
\- \*\*Description:\*\* follows only big tournaments; doesn't know every player.  
\- \*\*Goal:\*\* keep up with banter about unfamiliar players.  
\- \*\*How served:\*\* AI teases include short player stories (F-B), so context arrives inside the banter.

\#\#\# P-3 — The friend being teased (CONFIRMED as part of the ritual)  
\- \*\*Goal:\*\* fire back.  
\- \*\*How served:\*\* comeback prompts (F-B2).

\#\#\# P-4 — Dream11 reviewer (evaluation audience; CONFIRMED)  
\- \*\*Description:\*\* opens the link on a laptop to evaluate the assignment.  
\- \*\*Goals:\*\* understand the problem, experience the product end to end quickly, judge design and working state.  
\- \*\*Needs:\*\* one link, no install, no sign-up, no live match required, no real friends required. Target experience length about 5 minutes (PROPOSED).  
\- \*\*Implication:\*\* the demo must simulate the stream and the friends (§4.0).

\#\#\# P-5 — Simulated friends (demo actors; PROPOSED)  
\- AI-driven gang members \*\*created by the build\*\* (CONFIRMED). Names "Rohan" and "Aman" used in this document are placeholders only. Each has a team, a hero, a villain, a one-line personality and a distinct Sarvam voice. PROPOSED gang shape for this match: 3 friends — one backs an Indian bowler (roasted when Seifert/Phillips attack), one backs an Indian batter, one contrarian who supports New Zealand. Personas are drafted by the build and approved by the owner. \*\*The note must say plainly that friends are simulated\*\* (PROPOSED, agreed in principle).

\---

\#\# 4\. Product scope and feature specification

\#\#\# 4.0 Two delivery targets

\| Target \| What it is \| Status \|  
\|---\|---\|---\|  
\| \*\*T1 — Demo web app\*\* \| One link. A page laid out like a browser window: left \= a generic, \*\*unbranded\*\* streaming site replaying a real past match; right \= the product's side panel. Simulated friends. \| PROPOSED as primary submission (presented; owner did not object; extension question pending) \|  
\| \*\*T2 — Chrome extension\*\* \| The same side panel injected over real streaming websites. \| CONFIRMED: build only after T1 is done and frozen. Real multiplayer remains FUTURE SCOPE. \|

Feature specs below describe T1 behaviour unless marked otherwise. Everything is designed so the same panel code can later move into T2.

\#\#\# 4.1 Feature inventory

\| ID \| Feature \| Class \| Status \|  
\|---\|---\|---\|---\|  
\| F-ROOM \| Match Room (one session per match) \| Core \| CONFIRMED (owner's idea) \|  
\| F-LOYAL \| Loyalty setup (team, hero, villain) \| Core \| PROPOSED \|  
\| F-REPLAY \| Simulated stream / replay engine \| Core (demo infra) \| PROPOSED \|  
\| F-SYNC \| Ball-pinned delivery (no spoilers) \| Core \| PROPOSED \|  
\| F-VOICE \| Hold-to-talk voice clips \| Core \| CONFIRMED (voice-first) / PROPOSED (mechanics) \|  
\| F-DUCK \| Auto-duck match audio during clips \| Core \| PROPOSED \|  
\| F-QUEUE \| Clip queueing \| Core \| PROPOSED \|  
\| F-TEXT \| Text \+ one-tap reactions fallback \| Core \| PROPOSED \|  
\| F-STT \| Transcription of clips (Sarvam Saaras) \| Core \| CONFIRMED provider / PROPOSED mechanics \|  
\| F-A \| AI moment spotting \| Core \| CONFIRMED (owner liked A) \|  
\| F-B \| AI tease prompts (character-aware) \| Core \| CONFIRMED (B) \+ PROPOSED (\#4 folded in) \|  
\| F-B2 \| AI comeback prompts \| Secondary \| PROPOSED \|  
\| F-FRIENDS \| Simulated friends \| Core (demo infra) \| PROPOSED \|  
\| F-AWAY \| Step away \+ gang call-back \| Core \| CONFIRMED (owner: "2 can easily be adopted") \|  
\| F-CATCH \| "While you were away" catch-up \| Core \| CONFIRMED (D-1 resolved: piece C kept) \|  
\| F-WRAP \| Gang wrap (end-of-match recap) \| Core \| CONFIRMED \|  
\| F-MEM \| Room becomes a saved memory; memory shelf \| Core \| CONFIRMED (owner's session idea) \|  
\| F-REWATCH \| Rewatch the match with the gang's clips in sync \| Secondary \| PROPOSED \|  
\| F-CALLS \| Gang Calls (one-tap predictions, bragging rights only) \| Secondary (build after core) \| CONFIRMED IN \|  
\| F-EXT \| Chrome extension over real sites \| Advanced \| CONFIRMED: only after T1 is done \|  
\| F-FUT-\* \| See §4.4 \| Future \| FUTURE SCOPE \|

\*\*Explicitly excluded (CONFIRMED or PROPOSED and uncontested):\*\*  
\- Tournament-as-a-series recap (\#5) — excluded (PROPOSED, uncontested).  
\- Spoiler-protection mode that hides scores app-wide (\#3) — excluded (CONFIRMED: owner's "we should not adopt 3" referred to this idea).  
\- Separate player-info screen — excluded; player stories live inside teases.  
\- Public chat with strangers, stats dashboard, video call, screen-share, \*\*betting/money\*\* — non-goals.  
\- Mobile build — excluded for now (CONFIRMED).  
\- Live always-on voice call — excluded because it breaks ball-sync (PROPOSED).

\---

\#\#\# 4.2 Core features — detailed specs

\#\#\#\# F-ROOM — Match Room  
\- \*\*Description:\*\* each match is a separate session holding everyone's loyalties, clips, reactions, AI moments, calls and the final memory.  
\- \*\*Purpose:\*\* owner's idea: "each match we should treat as a separate session, our memories our reactions all are kept well preserved in that session."  
\- \*\*Users:\*\* P-1, P-5.  
\- \*\*Lifecycle (PROPOSED):\*\* \`pre\_match → live → ended → archived (memory)\`.  
\- \*\*Preconditions:\*\* a match (replay dataset) and a gang exist.  
\- \*\*Inputs:\*\* match ID, gang ID.  
\- \*\*Processing:\*\* create room; attach participants; open pre-match lobby; on start, bind to replay clock; on final ball, transition to \`ended\`, trigger F-WRAP, persist as memory.  
\- \*\*Outputs:\*\* a room object (§10).  
\- \*\*Validation:\*\* one room per (gang, match) for the demo.  
\- \*\*Errors:\*\* storage unavailable → room still runs in memory; warn that the memory won't be saved (§16).  
\- \*\*Edge cases:\*\* reload mid-match → resume from persisted state if available, else restart room with a notice.  
\- \*\*Dependencies:\*\* F-REPLAY, F-LOYAL.  
\- \*\*Acceptance:\*\* AC-ROOM-1 room shows match, gang and status; AC-ROOM-2 after the last ball the room is saved and appears on the memory shelf; AC-ROOM-3 a new room never shows clips from another room.

\#\#\#\# F-LOYAL — Loyalty setup  
\- \*\*Description:\*\* before the match each participant sets team supported, hero (favourite player), villain (player they love to hate).  
\- \*\*Purpose:\*\* gives F-A the knowledge of \*who\* to tease \*when\*. From owner's moment: "their favourite player got out."  
\- \*\*Inputs:\*\* team (one of the two teams), hero (player from either XI), villain (player from either XI, ≠ hero). PROPOSED: hero and villain optional; team required.  
\- \*\*Processing:\*\* store per participant per room. Simulated friends have preset loyalties.  
\- \*\*Validation:\*\* hero ≠ villain; players must exist in match squads.  
\- \*\*Acceptance:\*\* AC-LOYAL-1 setup takes ≤ 3 interactions besides confirm; AC-LOYAL-2 loyalties are shown as small badges beside each gang member during the match.  
\- \*\*Open:\*\* whether loyalty can change mid-match (ASSUMPTION: no).

\#\#\#\# F-REPLAY — Simulated stream / replay engine (demo infrastructure)  
\- \*\*Description:\*\* plays a real past match ball by ball in the "streaming site" area.  
\- \*\*Purpose:\*\* reviewers can't depend on a live match (§3 P-4).  
\- \*\*Source data:\*\* ball-by-ball data for the \*\*5th T20I, New Zealand v India, 1 Nov 2026, Hamilton\*\* (CONFIRMED). Data source: \*\*Cricsheet\*\* first (JSON under the Open Data Commons Attribution License — attribution required). As of 2026-11-13 Cricsheet did \*\*not\*\* yet list this match. Fallback (PROPOSED): build the \~240 deliveries manually from public scorecards and ball-by-ball commentary, \*\*copying facts only\*\* (runs, extras, wickets, batter, bowler) and writing original short ball text — never copy commentary prose. Validate against the official scorecard (data test §17.5).  
\- \*\*Visual content:\*\* \*\*no real broadcast footage\*\* (CONFIRMED). A stylised, animated broadcast view (CONFIRMED): LIVE badge, match title, big score, target/required rate, current batters with runs(balls), current bowler figures, a large per-ball result animation (dot, 1–6, FOUR, SIX, WICKET), one line of original ball text, and ambient crowd audio that swells on big moments.  
\- \*\*Pacing:\*\* PROPOSED: whole experience ≈ 5 min. Compress the match by fast-forwarding low-interest balls and slowing to normal pace around scripted moments. A T20 has \~240 legal deliveries; showing every ball at real pace is impossible within 5 min.  
\- \*\*Clock:\*\* a deterministic playhead \`currentBallIndex\`; each ball has a \`displayDurationMs\` after compression.  
\- \*\*Controls:\*\* play/pause (reviewer convenience), "step away" (F-AWAY). No seeking during live state (it's meant to feel live). PROPOSED: a hidden debug speed control for development.  
\- \*\*Acceptance:\*\* AC-REPLAY-1 balls advance in order with correct cumulative score; AC-REPLAY-2 total runtime within the target ±1 min; AC-REPLAY-3 final score equals the real result.

\#\#\#\# F-SYNC — Ball-pinned delivery  
\- \*\*Description:\*\* every clip/reaction/text is stamped with the ball it refers to (\`anchorBallId\`). It is delivered to a listener only when the listener's playhead has reached that ball.  
\- \*\*Purpose:\*\* differentiator \#1; prevents spoilers across different stream delays.  
\- \*\*Demo behaviour (PROPOSED):\*\* simulated friends are modelled as being on different delays; their clips are authored against balls and held until the user's playhead arrives. A small "in sync with your stream" indicator explains the behaviour.  
\- \*\*Real product (FUTURE / T2):\*\* listener offset obtained from (a) the extension reading the page's video element position, or (b) one-tap calibration ("tap when you see the next ball bowled"), or (c) audio fingerprinting (FUTURE SCOPE).  
\- \*\*Anchoring rule (PROPOSED):\*\* a clip recorded while ball \*n\* is the latest completed ball is anchored to ball \*n\*.  
\- \*\*Acceptance:\*\* AC-SYNC-1 no clip anchored to ball \*n\* plays before the user's playhead completes ball \*n\*; AC-SYNC-2 clips anchored to past balls play immediately in anchor order.

\#\#\#\# F-VOICE — Hold-to-talk voice clips  
\- \*\*Status:\*\* voice-first CONFIRMED ("least friction"). Walkie-talkie mechanic PROPOSED.  
\- \*\*Description:\*\* press and hold a talk button (or a keyboard key) to record; release to send. Max length PROPOSED ≈ 5 s (auto-stop).  
\- \*\*Inputs:\*\* microphone audio.  
\- \*\*Processing:\*\* request mic permission on first use; record (MediaRecorder); anchor to current ball (F-SYNC); send to F-STT; append to feed with waveform and transcript when available.  
\- \*\*Validation:\*\* discard clips \< 300 ms (accidental taps) — ASSUMPTION threshold.  
\- \*\*Errors:\*\* permission denied → show text fallback (F-TEXT) with a short explanation; no mic → same.  
\- \*\*Acceptance:\*\* AC-VOICE-1 hold→release produces a clip in the feed within 1 s (excluding transcript); AC-VOICE-2 recording auto-stops at max length; AC-VOICE-3 the user can play back their own clip.

\#\#\#\# F-DUCK — Auto-duck  
\- \*\*Description:\*\* when any gang clip plays, lower the match audio, then restore it.  
\- \*\*Purpose:\*\* friends' voices would clash with broadcast commentary.  
\- \*\*Parameters (ASSUMPTION):\*\* duck to \~25% volume, 150 ms fade down, 300 ms fade up after the queue empties.  
\- \*\*T2 note:\*\* the extension can control the page's \`\<video\>\` volume.  
\- \*\*Acceptance:\*\* AC-DUCK-1 match volume lowers during clip playback and restores after.

\#\#\#\# F-QUEUE — Clip queue  
\- \*\*Description:\*\* when several clips are due at once (e.g. after a wicket) they play back to back in anchor order, then by send time, sounding like the gang yelling together.  
\- \*\*PROPOSED:\*\* gap 100–200 ms; if queue \> 5 clips, play only the first 5 and show the rest as transcripts (ASSUMPTION).  
\- \*\*Acceptance:\*\* AC-QUEUE-1 two clips never play over each other.

\#\#\#\# F-TEXT — Quiet fallback  
\- \*\*Description:\*\* text input and one-tap reactions (proposed set 😂 🔥 😭 🤡) for when the user can't talk (office, metro, family asleep).  
\- \*\*Acceptance:\*\* AC-TEXT-1 a text message or reaction appears in the feed anchored to the current ball.

\#\#\#\# F-STT — Transcription  
\- \*\*Description:\*\* each clip is transcribed so the feed is readable at a glance and F-CATCH/F-WRAP can use what people \*said\*.  
\- \*\*Provider:\*\* \*\*Sarvam AI speech-to-text (Saaras family; \`saaras:v3\` is the documented REST default — verify on docs.sarvam.ai)\*\* via the server proxy, language \`en-IN\` (CONFIRMED provider). See §15.  
\- \*\*Errors:\*\* STT failure → clip stays playable with "transcript unavailable"; it is excluded from AI summaries.  
\- \*\*Acceptance:\*\* AC-STT-1 transcript appears under the clip; AC-STT-2 failure never blocks playback.

\#\#\#\# F-A — AI moment spotting  
\- \*\*Status:\*\* CONFIRMED (piece A).  
\- \*\*Description:\*\* detects match events that matter \*to this gang\* given loyalties.  
\- \*\*Design (PROPOSED):\*\* \*\*detection is deterministic rules, not an LLM\*\*; the LLM only writes language (F-B). Reasons: reliability, zero latency, testable.  
\- \*\*Trigger rules (PROPOSED initial set):\*\*

\| Rule ID \| Condition \| Victim \| Example \|  
\|---\|---\|---\|---\|  
\| R1 \| Wicket of a player who is someone's \*\*hero\*\* \| that friend \| "Aman's hero out for 3" \|  
\| R2 \| Wicket of a player who is someone's \*\*villain\*\* \| (celebration for that friend) \| gloat prompt \|  
\| R3 \| Over conceding ≥ 15 runs by a bowler who is someone's hero \| that friend \| \|  
\| R4 \| Six/four hit off someone's hero (bowler) at a tense phase \| that friend \| \|  
\| R5 \| Milestone (50/100, 3-wicket haul) by someone's hero \| the \*other\* friends get "hype" prompt \| \|  
\| R6 \| Tension: last 2 overs of a chase and required runs ≤ 2 × balls left \| everyone \| call-back trigger (F-AWAY) \|  
\| R7 \| Team result: final ball \| everyone \| wrap trigger \|

\- \*\*Rate limit (PROPOSED):\*\* at most one moment card per user per over, except R1/R2, to avoid noise.  
\- \*\*Outputs:\*\* \`Moment {ruleId, ballId, victimMemberId?, playerId, severity}\`.  
\- \*\*Acceptance:\*\* AC-A-1 every scripted moment in the chosen match fires exactly once; AC-A-2 no moment fires for players nobody cares about; AC-A-3 unit tests cover R1–R7.

\#\#\#\# F-B — AI tease prompts (character-aware)  
\- \*\*Status:\*\* CONFIRMED (piece B), with player stories folded in (\#4, PROPOSED "invisible").  
\- \*\*Description:\*\* when F-A fires for the user, a \*\*moment card\*\* slides into the panel: headline (e.g. "Seifert smashes {Rohan's hero bowler} for SIX — Rohan's hero 😏"; placeholder, real players come from the scorecard) plus up to 3 AI lines.  
\- \*\*Voice-first behaviour (PROPOSED):\*\* each line is a \*\*prompt to say out loud\*\* — the user holds to talk and says it in their own voice. Secondary action: tap to send the line as text.  
\- \*\*Character-aware:\*\* prompt includes the player's short story (e.g. "dropped last game, playing for his place"). Stories come from a curated per-match profile file (PROPOSED, avoids hallucination).  
\- \*\*Timing:\*\* card auto-dismisses when the next ball is bowled (CONFIRMED in concept: "disappears before the next ball").  
\- \*\*Latency and liveness:\*\* lines are \*\*generated live by Gemini while the reviewer watches\*\* (CONFIRMED: AI must happen live). Text must be ready before the card shows. PROPOSED technique — \*\*look-ahead prefetch:\*\* because the replay data is known in advance, the moment engine evaluates ball \*n+1\* (and \*n+2\*) while ball \*n\* is playing and requests lines early, so live text is ready with no visible wait. Safety net: lines precomputed at build time for every moment the rules will fire, used only if the live call has not returned in time; then templates (§12).  
\- \*\*Acceptance:\*\* AC-B-1 card appears within 500 ms of the triggering ball; AC-B-2 lines mention the victim friend or their player; AC-B-3 lines are ≤ 15 words and pass the safety rules (§12.6); AC-B-4 card disappears at next ball.

\#\#\#\# F-FRIENDS — Simulated friends (demo)  
\- \*\*Description:\*\* 2–3 gang members (ASSUMPTION count) with personalities and loyalties who react to the match with voice clips.  
\- \*\*Clip source (CONFIRMED: AI voices):\*\* Sarvam text-to-speech (Bulbul; docs mention \`bulbul:v3\` and \`bulbul:v4-flash\` — verify current model), language \`en-IN\`, \*\*a different speaker voice per friend\*\*. Two paths (PROPOSED):  
  \- \*\*Ball-anchored reactions\*\* (must land exactly on the ball): text generated live by Gemini via look-ahead prefetch, voiced by Sarvam ahead of the ball; build-time pre-voiced clips act as the safety net.  
  \- \*\*Live replies\*\* to the reviewer (a second or two of delay is acceptable): Gemini text → Sarvam TTS on demand.  
  \- If TTS fails: show the line as a text bubble from that friend.  
\- \*\*Script:\*\* a timeline file maps balls → friend clips (audio \+ transcript), plus reactions to moments where the \*user\* is the victim (so the user also gets teased).  
\- \*\*Live replies (CONFIRMED live AI):\*\* when the user teases a friend (voice transcript or text), that friend replies with a \*\*live Gemini-generated\*\* comeback in their own Sarvam voice, using the user's actual words as context. Fallback: template comeback in text.  
\- \*\*Personas:\*\* created by the build (CONFIRMED) and stored in \`gang.json\`: name, personality line, team, hero, villain, Sarvam speaker ID, banter style notes. Owner approves before shipping.  
\- \*\*Disclosure:\*\* the UI shows a subtle "demo gang" label; the note discloses simulation.

\#\#\#\# F-AWAY — Step away \+ gang call-back  
\- \*\*Status:\*\* CONFIRMED.  
\- \*\*Description:\*\* "the gang calls you back, not the app."  
\- \*\*Demo behaviour (PROPOSED):\*\* a \*\*Step away\*\* control dims/covers the stream area with an "away" state while the replay continues. When F-A rule R6 fires (or another high-severity moment), a call-back banner appears with a friend's voice line (e.g. "Last over, 12 needed. Rohan's already celebrating. Get back here."). Optionally also when the tab is hidden: browser Notification (requires permission, ASSUMPTION optional).  
\- \*\*On return:\*\* F-CATCH card is shown.  
\- \*\*Acceptance:\*\* AC-AWAY-1 replay continues while away; AC-AWAY-2 call-back fires at the scripted tense moment; AC-AWAY-3 returning shows the catch-up.

\#\#\#\# F-CATCH — "While you were away"  
\- \*\*Status:\*\* CONFIRMED (adopted as \#1, merged with piece C; D-1 resolved).  
\- \*\*Description:\*\* on return, a 2–3 sentence summary told \*through the gang's banter\*, covering balls during the absence: key events \+ what friends said.  
\- \*\*Example tone (placeholder names):\*\* "You missed a lot. Seifert took Rohan's hero for 18 in one over and Aman hasn't stopped laughing since."  
\- \*\*Inputs:\*\* ball events in the away window, transcripts of clips in the window, loyalties.  
\- \*\*Processing:\*\* LLM summary (§12.3) with deterministic fallback (list of key events).  
\- \*\*Acceptance:\*\* AC-CATCH-1 mentions every wicket in the window; AC-CATCH-2 ≤ 60 words; AC-CATCH-3 appears within 3 s of return or shows the fallback.

\#\#\#\# F-WRAP — Gang wrap  
\- \*\*Status:\*\* CONFIRMED (C).  
\- \*\*Description:\*\* end-of-match recap: roast of the night, who got roasted most, the gang's emotional high and low, and (voice-first, PROPOSED) an \*\*audio reel\*\* — loudest scream, best roast, moment everyone went silent.  
\- \*\*Inputs:\*\* whole-room events, clips, transcripts, moments, call outcomes.  
\- \*\*Processing:\*\* deterministic stats (counts, most-roasted) \+ LLM for titles/one-liners \+ clip selection.  
\- \*\*Acceptance:\*\* AC-WRAP-1 appears within 5 s of final ball (or fallback); AC-WRAP-2 audio reel plays selected clips in order; AC-WRAP-3 stats are correct.

\#\#\#\# F-MEM — Memory and memory shelf  
\- \*\*Status:\*\* CONFIRMED.  
\- \*\*Description:\*\* ended rooms are stored as memories; a shelf lists them; opening one shows the wrap as its cover plus the ball timeline with the gang's clips.  
\- \*\*Demo storage:\*\* local to the viewer's browser (PROPOSED, §10.4).  
\- \*\*Acceptance:\*\* AC-MEM-1 finishing a match adds it to the shelf; AC-MEM-2 memory survives a page reload where browser storage is available.

\#\#\# 4.3 Secondary features

\#\#\#\# F-B2 — Comeback prompts (PROPOSED)  
When the user is teased, offer up to 3 comeback lines (same mechanics as F-B). Acceptance mirrors AC-B-1..4.

\#\#\#\# F-REWATCH — Rewatch with the gang (PROPOSED)  
From a memory, replay the match with clips playing at their anchored balls (re-uses F-REPLAY \+ F-SYNC \+ F-QUEUE). Acceptance: clips play at the same balls as originally.

\#\#\#\# F-CALLS — Gang Calls (CONFIRMED IN)  
\- One-tap prediction before a ball/over, e.g. "He's out this over", "Six this over". Resolved automatically when the window ends.  
\- Correct call → AI brag prompt writes itself ("Aman called it. Rohan, say something."). Wrong call → comeback prompt for others.  
\- \*\*Bragging rights only — no money, no points convertible to anything\*\* (PROPOSED, firm non-goal).  
\- Rationale: adds adrenaline \*before\* the ball (owner's first message).  
\- Build after the core journey (P2–P5) works; part of the submitted demo. Simulated friends also make calls, so the reviewer can win or lose bragging rights against them.

\#\#\# 4.4 Advanced and future features (FUTURE SCOPE unless noted)

\| ID \| Feature \| Note \|  
\|---\|---\|---\|  
\| F-EXT \| Chrome extension (Manifest V3) injecting the panel over streaming sites \| CONFIRMED: only after T1 is done and frozen \|  
\| F-FUT-1 \| Real multiplayer rooms (real friends, real-time) \| Required for the real product \|  
\| F-FUT-2 \| Automatic stream sync via the page's video element (extension) \| \|  
\| F-FUT-3 \| Audio-fingerprint sync ("like Shazam") \| Mentioned as "what I'd build next" \|  
\| F-FUT-4 \| Android floating overlay ("chat heads" style); iOS via Live Activities / Dynamic Island / notifications \| \|  
\| F-FUT-5 \| Desktop always-on-top app over any native app \| Discussed as an option, not chosen \|  
\| F-FUT-6 \| Live match data feed (instead of replay) \| \|  
\| F-FUT-7 \| Gang creation from Dream11 private-contest groups \| \|

\---

\#\# 5\. User journeys and system workflows

\#\#\# 5.0 End-to-end journey (demo)

\`\`\`mermaid  
flowchart LR  
  L\[Landing: what this is \+ 'demo gang' disclosure\] \--\> P\[Pre-match room: pick team, hero, villain\]  
  P \--\> M\[Mic permission prompt \- optional\]  
  M \--\> LIVE\[Live: replay \+ side panel\]  
  LIVE \--\>\|wicket of a friend's hero\| CARD\[Moment card: lines to say\]  
  CARD \--\>\|hold to talk / tap\| LIVE  
  LIVE \--\>\|Step away\| AWAY\[Away state, replay continues\]  
  AWAY \--\>\|tense moment\| CB\[Gang call-back\]  
  CB \--\> CU\[Catch-up card\] \--\> LIVE  
  LIVE \--\>\|final ball\| WRAP\[Gang wrap \+ audio reel\]  
  WRAP \--\> MEM\[Saved to memory shelf\]  
  MEM \--\> RW\[Rewatch with the gang \- optional\]  
\`\`\`

\#\#\# WF-1 — Open the demo and join the room  
1\. \*\*Trigger:\*\* reviewer opens the link.  
2\. \*\*Actors:\*\* P-4/P-1.  
3\. \*\*Initial conditions:\*\* none; no login.  
4\. \*\*Steps:\*\* landing explains the product in one screen with a single CTA "Join the gang's room" → pre-match room lists gang members and their loyalty badges → user chooses team / hero / villain → "Start match".  
5\. \*\*Backend:\*\* none required (static data). Room object created client-side.  
6\. \*\*Storage:\*\* create \`Room\`, \`Participant(self)\`; persist to browser storage if available.  
7\. \*\*External calls:\*\* none.  
8\. \*\*Expected response:\*\* replay starts; panel shows the gang.  
9\. \*\*Failures:\*\* match data fails to load → error state with retry.  
10\. \*\*Recovery:\*\* retry fetch; data is a static asset so failure implies network loss.

\#\#\# WF-2 — Send a voice clip

\`\`\`mermaid  
sequenceDiagram  
  participant U as User  
  participant P as Panel UI  
  participant R as Replay clock  
  participant A as Audio service  
  participant S as /api/transcribe  
  U-\>\>P: press & hold talk  
  P-\>\>A: start recording (MediaRecorder)  
  U-\>\>P: release  
  P-\>\>A: stop  
  A--\>\>P: audio blob  
  P-\>\>R: get current ball id  
  P-\>\>P: create Clip{anchorBallId}, add to feed (pending transcript)  
  P-\>\>S: POST audio  
  S--\>\>P: transcript \| error  
  P-\>\>P: update clip transcript or mark unavailable  
\`\`\`

Failures: mic denied → text fallback; STT error → clip kept, no transcript; blob empty → discard silently.

\#\#\# WF-3 — Moment → tease

\`\`\`mermaid  
sequenceDiagram  
  participant R as Replay clock  
  participant M as Moment engine (rules)  
  participant T as Tease service  
  participant P as Panel UI  
  participant F as Simulated friends  
  R-\>\>M: ball n completed (event)  
  M-\>\>M: evaluate R1..R7 with loyalties  
  M--\>\>P: Moment{R1, victim=Rohan}  
  P-\>\>T: get lines(moment)  
  T--\>\>P: 3 lines (precomputed \| live LLM \| template)  
  P-\>\>P: show moment card  
  F--\>\>P: friends' own clips anchored to ball n (queued, ducked)  
  R-\>\>P: ball n+1 started → dismiss card  
\`\`\`

Failures: LLM timeout → template lines; no lines at all → show headline only.

\#\#\# WF-4 — Step away, call-back, catch-up  
1\. Trigger: user clicks \*\*Step away\*\*. 2\. Replay keeps running; panel shows "Away". 3\. Moment engine fires R6 (or scripted high-severity moment) → call-back banner \+ friend voice line (+ optional system notification if tab hidden and permitted). 4\. User clicks "I'm back". 5\. Client collects events and clips in \`\[awayStartBall, currentBall\]\` → POST \`/api/catchup\`. 6\. Show summary card; on error show deterministic list. 7\. Clips that were due while away are \*\*not\*\* auto-played as a burst; they are available in the feed (ASSUMPTION — avoids a wall of audio; Q-12).

\#\#\# WF-5 — End of match → wrap → memory  
1\. Final ball → room \`ended\`. 2\. Client computes stats (most roasted, counts). 3\. POST \`/api/wrap\` with compact room digest. 4\. Render wrap \+ audio reel. 5\. Persist room as memory. Failures: LLM error → wrap with stats only and default titles.

\#\#\# WF-6 — Rewatch (secondary)  
Open memory → "Rewatch with the gang" → F-REPLAY in rewatch mode; clips play at anchored balls; no moment cards or prompts.

\#\#\# WF-7 — Gang Call  
Tap a call → \`Call{type, windowStartBall, windowEndBall, status=open}\` → resolve when window closes → brag or comeback prompt.

\---

\#\# 6\. Functional requirements

\| ID \| Requirement \| Initiator \| Inputs → Outputs \| Validation / errors \| Acceptance \| Feature \|  
\|---\|---\|---\|---\|---\|---\|---\|  
\| FR-001 \| The system shall load one match replay dataset and its squads, player profiles and friend script from static assets. \| System \| asset URLs → in-memory match \| Schema validation on load; error state on failure \| Invalid file shows error, valid file starts \| F-REPLAY \|  
\| FR-002 \| The system shall present a landing screen that explains the product and discloses simulated friends. \| User \| — → landing \| — \| Disclosure visible before joining \| F-FRIENDS \|  
\| FR-003 \| The user shall set team (required), hero and villain (optional) before the match. \| User \| selections → Participant loyalties \| hero ≠ villain; players in squads \| Start disabled until team chosen \| F-LOYAL \|  
\| FR-004 \| The system shall create one room per match session with status pre\_match/live/ended. \| System \| match, gang → Room \| — \| Status transitions logged correctly \| F-ROOM \|  
\| FR-005 \| The replay shall advance ball by ball with correct cumulative score and compressed pacing to a configured target duration. \| System \| dataset, pacing config → ball events \| — \| Final score matches dataset; duration within ±1 min \| F-REPLAY \|  
\| FR-006 \| The user shall record a voice clip by press-and-hold (pointer and keyboard), auto-stopping at the max length. \| User \| mic audio → Clip \| \< 300 ms discarded; permission errors handled \| Clip appears ≤ 1 s after release \| F-VOICE \|  
\| FR-007 \| Every clip, text and reaction shall be anchored to the latest completed ball at send time. \| System \| send event → anchorBallId \| — \| Unit test on anchoring \| F-SYNC \|  
\| FR-008 \| No gang item shall be presented to the user before the user's playhead reaches its anchor ball. \| System \| items, playhead → delivery \| — \| Automated test with offset friends \| F-SYNC \|  
\| FR-009 \| Gang clips shall play sequentially, never overlapping. \| System \| due clips → audio \| Queue cap \| No overlap in test \| F-QUEUE \|  
\| FR-010 \| Match audio shall duck during gang clip playback and restore afterwards. \| System \| queue state → gain \| — \| Gain values verified in test \| F-DUCK \|  
\| FR-011 \| The user shall be able to send text and one-tap reactions. \| User \| text/emoji → Message \| Text 1–140 chars (ASSUMPTION); trimmed \| Appears in feed anchored \| F-TEXT \|  
\| FR-012 \| Each user clip shall be transcribed; failures shall not block playback. \| System \| audio → transcript \| Size/length limits \| Transcript or "unavailable" \| F-STT \|  
\| FR-013 \| The moment engine shall evaluate rules R1–R7 after every ball using loyalties. \| System \| ball, loyalties → Moment\[\] \| — \| Rule unit tests pass \| F-A \|  
\| FR-014 \| For moments where the user is the teaser, the panel shall show a moment card with ≤ 3 lines within 500 ms, dismissed at the next ball. \| System \| Moment → card \| Lines pass safety filter \| Timing and dismissal tests \| F-B \|  
\| FR-015 \| Tease lines shall reference the victim friend or the player's story and be ≤ 15 words. \| System \| moment context → lines \| Length \+ safety checks; fallback templates \| Eval set passes (§17.6) \| F-B \|  
\| FR-016 \| The user shall be able to send a line as text with one tap, or say it via hold-to-talk. \| User \| line → Message/Clip \| — \| Both paths work \| F-B \|  
\| FR-017 \| Simulated friends shall emit scripted clips at their anchored balls and react when the user is the victim. \| System \| script → clips \| Missing audio → transcript-only \| Script coverage test \| F-FRIENDS \|  
\| FR-018 \| The user shall be able to step away; replay continues; a call-back shall fire on R6 or a scripted high-severity moment. \| User/System \| away flag, moments → banner \| Only one active call-back \| E2E test \| F-AWAY \|  
\| FR-019 \| On return the system shall show a catch-up of ≤ 60 words covering all wickets in the away window, with deterministic fallback. \| System \| window events \+ transcripts → summary \| Timeout 3 s → fallback \| E2E \+ eval \| F-CATCH \|  
\| FR-020 \| On the final ball the system shall generate the gang wrap (stats, titles, audio reel) with fallback. \| System \| room digest → wrap \| Timeout 5 s → stats-only \| E2E \| F-WRAP \|  
\| FR-021 \| Ended rooms shall be saved as memories and listed on a memory shelf. \| System \| room → memory \| Storage failure → warning \| Reload persists memory \| F-MEM \|  
\| FR-022 \| (Secondary) The user shall be able to rewatch a memory with clips at their anchored balls. \| User \| memory → replay \| — \| Clips align to balls \| F-REWATCH \|  
\| FR-023 \| (Secondary) The user shall receive comeback lines when teased. \| System \| moment (user victim) → lines \| As FR-015 \| As FR-014 \| F-B2 \|  
\| FR-024 \| The user shall make one-tap Gang Calls resolved automatically; no monetary value. \| User \| call → resolution \| One open call per user \| Resolution correct \| F-CALLS \|  
\| FR-025 \| All AI calls shall go through a server-side proxy; no API key in client code. \| System \| — \| Rate limits \| Key absent from bundle \| §14 \|

\---

\#\# 7\. Non-functional requirements

\*\*No numeric targets were set by the owner.\*\* All numbers are PROPOSED engineering targets.

\| Area \| Requirement \| Type \|  
\|---\|---\|---\|  
\| Responsiveness \| Moment card ≤ 500 ms after ball; clip in feed ≤ 1 s after release; catch-up ≤ 3 s; wrap ≤ 5 s (else fallback) \| PROPOSED target \|  
\| Timing correctness \| AI text must never arrive after the next ball when it matters → precompute scripted moments \| PROPOSED \|  
\| Availability \| Demo must work whenever a reviewer opens it: static hosting, no live data dependency; AI failures degrade gracefully \| CONFIRMED intent ("guaranteed to work") \|  
\| Reliability \| Every AI-dependent feature has a deterministic fallback \| PROPOSED \|  
\| Platform \| Desktop; latest Chrome primary; Edge/Firefox/Safari best-effort \| CONFIRMED desktop / ASSUMPTION browsers \|  
\| Layout \| Usable from 1280×720; designed for 1440×900 \| ASSUMPTION \|  
\| Usability \| Reviewer understands and completes the journey in ≈ 5 min with no instructions beyond the landing screen \| PROPOSED \|  
\| Accessibility \| Keyboard alternative to hold-to-talk (e.g. hold Space); transcripts double as captions; visible focus; WCAG AA contrast; reduced-motion support \| PROPOSED \|  
\| Privacy \| Voice audio not stored server-side in the demo; transcription only \| PROPOSED \|  
\| Cost control \| Rate limit AI proxy per IP; cap tokens; precompute where possible \| PROPOSED \|  
\| Maintainability \| Panel code independent of the demo's fake streaming page, so it can move into an extension \| PROPOSED \|  
\| Observability \| Client console logging in dev; server logs for AI proxy errors and latency \| PROPOSED \|  
\| Scalability \| Not a goal for the demo; real multiplayer is FUTURE SCOPE \| — \|  
\| Backup/recovery \| Not applicable to demo (browser-local data) \| — \|

\---

\#\# 8\. Technical architecture and system design

\#\#\# 8.1 Architectural style (PROPOSED)  
A \*\*static single-page web app\*\* plus a \*\*thin serverless AI proxy\*\*. No database server, no real-time backend, no microservices for the demo. Justification: one reviewer, simulated friends, static match data, and the hard requirement that the link always works.

\#\#\# 8.2 High-level architecture

\`\`\`mermaid  
flowchart TB  
  subgraph Browser \[Reviewer's browser\]  
    subgraph Shell \[Demo shell \- fake browser window\]  
      STREAM\[Fake streaming site: broadcast view \+ crowd audio\]  
      PANEL\[Product side panel\]  
    end  
    CORE\[Core engine: replay clock, sync, moment rules, queue, ducking\]  
    STORE\[(Browser storage: IndexedDB / localStorage)\]  
    MIC\[Mic: MediaRecorder\]  
  end  
  ASSETS\[(Static assets: match.json, squads, player profiles, friend script, audio, precomputed lines)\]  
  subgraph Server \[Serverless functions\]  
    API\[/AI proxy: /api/lines, /api/reply, /api/catchup, /api/wrap, /api/transcribe, /api/speak/\]  
  end  
  LLM\[Google Gemini \- text\]  
  STT\[Sarvam \- speech-to-text \+ text-to-speech\]

  STREAM \<--\> CORE  
  PANEL \<--\> CORE  
  CORE \--\> STORE  
  MIC \--\> PANEL  
  ASSETS \--\> CORE  
  PANEL \--\> API  
  API \--\> LLM  
  API \--\> STT  
\`\`\`

\#\#\# 8.3 Components and boundaries

\| Component \| Responsibility \| Must not \|  
\|---\|---\|---\|  
\| \*\*Demo shell\*\* \| Draws the fake browser chrome and the unbranded streaming site; owns match audio element \| Contain product logic (so the panel is portable to T2) \|  
\| \*\*Replay clock\*\* \| Deterministic playhead, pacing, events \`ballStarted\`, \`ballCompleted\`, \`matchEnded\` \| Know about friends or AI \|  
\| \*\*Sync/delivery\*\* \| Holds gang items until playhead ≥ anchor \| Play audio itself \|  
\| \*\*Moment engine\*\* \| Pure functions: \`(ball, state, loyalties) → Moment\[\]\` \| Call the network \|  
\| \*\*Line service\*\* \| Returns lines: precomputed → live API → template \| Block the UI \|  
\| \*\*Audio service\*\* \| Record, play queue, ducking via Web Audio gain \| Decide what to play \|  
\| \*\*Friends director\*\* \| Emits scripted friend clips/reactions; handles replies \| — \|  
\| \*\*Room store\*\* \| Room state, persistence, memories \| — \|  
\| \*\*AI proxy\*\* \| Holds secrets, validates input, calls LLM/STT, enforces limits, returns JSON \| Store user audio \|

\#\#\# 8.4 Event flow inside the client (PROPOSED)

\`\`\`mermaid  
flowchart LR  
  CLK\[Replay clock\] \-- ballCompleted \--\> ME\[Moment engine\]  
  CLK \-- ballCompleted \--\> FD\[Friends director\]  
  CLK \-- playhead \--\> SY\[Sync/delivery\]  
  FD \-- items \--\> SY  
  USR\[User input\] \-- items \--\> SY  
  SY \-- due items \--\> FEED\[Feed UI\]  
  SY \-- due clips \--\> AQ\[Audio queue\] \--\> DK\[Ducking\] \--\> MA\[Match audio\]  
  ME \-- moments \--\> LS\[Line service\] \--\> CARD\[Moment card\]  
  ME \-- R6 \--\> AW\[Away/call-back\]  
  CLK \-- matchEnded \--\> WR\[Wrap\]  
\`\`\`

A small typed event bus (or state-store subscriptions) connects these. Everything except the proxy runs client-side.

\#\#\# 8.5 Authentication and authorization  
None in the demo (no accounts, single local user). Real product: FUTURE SCOPE (§14).

\#\#\# 8.6 Background jobs, caching, queues  
\- \*\*Build-time job:\*\* precompute tease/comeback lines for scripted moments and (optionally) TTS audio for simulated friends → static JSON/audio files. PROPOSED.  
\- \*\*Caching:\*\* static assets via CDN; client memoises live line responses per moment.  
\- No server queues.

\#\#\# 8.7 T2 extension architecture (build only after T1 is frozen)

\`\`\`mermaid  
flowchart LR  
  CS\[Content script on streaming site\] \-- reads video.currentTime, sets volume \--\> VID\[Page video element\]  
  CS \--\> SP\[Injected side panel: same React panel\]  
  SP \--\> BG\[Service worker\]  
  BG \--\> API2\[Same AI proxy\]  
\`\`\`

Manifest V3; content script injects the panel (or Chrome Side Panel API); ducking via the page's video volume; known problem: fullscreen video hides injected UI unless injected into the fullscreen element.

\---

\#\# 9\. Technology stack

\*\*CONFIRMED:\*\* Google Gemini (text) and Sarvam AI (TTS \+ STT) as AI providers; Vercel for hosting (owner is creating the account). Everything else below is PROPOSED; change freely before code starts, not after.

\| Technology \| Purpose \| Where \| Why \|  
\|---\|---\|---\|---\|  
\| TypeScript \| Language \| Client \+ functions \| Type safety for event/state model \|  
\| React 18 \+ Vite \| UI \+ build \| Client \| Fast, simple SPA; panel reusable in an extension \|  
\| Zustand (or React \`useReducer\`) \| State \| Client \| Small, explicit store \|  
\| Tailwind CSS or CSS modules \| Styling \| Client \| Speed; design tokens \|  
\| Web APIs: MediaRecorder, Web Audio (GainNode), IndexedDB, Notification, Page Visibility \| Voice, ducking, storage, call-back \| Client \| No dependencies \|  
\| Vercel (or Netlify) serverless functions, Node 20 \| AI proxy \| Server \| Free tier, same deploy as static site \|  
\| \*\*Google Gemini API\*\* (official \`@google/genai\` SDK) \| All text: teases, comebacks, live friend replies, brag lines, catch-up, wrap \| Server (proxy) \+ build script (safety-net precompute) \| \*\*CONFIRMED provider.\*\* Use a fast Flash-class model for lines/replies and the same or a stronger model for the wrap; pick current model IDs from Google AI Studio docs at build time. Use JSON-mode / response schema for structured output. Key: \`GEMINI\_API\_KEY\`. \|  
\| \*\*Sarvam AI — Bulbul TTS\*\* \| Friend voices, \`en-IN\`, one speaker per friend \| Server (\`/api/speak\`) \+ build script (safety-net clips) \| \*\*CONFIRMED provider.\*\* REST \`https\://api.sarvam.ai/text-to-speech\`, header \`api-subscription-key\`, ≤ 2500 chars per request, \`target\_language\_code\` required. Docs disagree on current model (\`bulbul:v3\` vs \`bulbul:v4-flash\`) — verify. Key: \`SARVAM\_API\_KEY\`. \|  
\| \*\*Sarvam AI — Saaras STT\*\* \| Transcribe reviewer's clips \| Server (\`/api/transcribe\`) \| \*\*CONFIRMED provider.\*\* \`/speech-to-text\` REST, default \`saaras:v3\` per changelog — verify. Same key. \|  
\| Zod \| Runtime validation of assets and API I/O \| Both \| \|  
\| Vitest, React Testing Library, Playwright \| Testing \| Dev \| \|  
\| ESLint \+ Prettier \| Code quality \| Dev \| \|

Alternatives (not chosen): Next.js instead of Vite+functions (heavier); Web Speech API for free in-browser STT (Chrome-only) — acceptable only as an emergency fallback if Sarvam STT is unavailable.

\*\*Provider caveats to handle in code:\*\* Gemini free-tier rate limits may be hit if several reviewers use the demo at once — owner should check limits in AI Studio and consider enabling billing before submission; check Google's free-tier data-use terms. Sarvam credits/limits are visible in the Sarvam dashboard.

\---

\#\# 10\. Database and data modelling

\#\#\# 10.1 Demo vs real product  
\- \*\*Demo (T1):\*\* no server database. Static assets \+ browser storage. \*\*PROPOSED.\*\*  
\- \*\*Real product:\*\* relational DB \+ object storage for audio \+ real-time channel. \*\*FUTURE SCOPE\*\* — model below is designed to carry over.

\#\#\# 10.2 Entities (PROPOSED unless noted)

\| Entity \| Purpose \| Demo storage \|  
\|---\|---\|---\|  
\| Match \| A real match being replayed \| Static asset \|  
\| Team \| Two teams in a match \| Static \|  
\| Player \| Squad member \+ short story for teases \| Static (curated) \|  
\| Ball \| One delivery with outcome \| Static \|  
\| Gang \| Group of friends \| Static (demo gang) \|  
\| Member \| A person in the gang (user or simulated) \| Static \+ self \|  
\| Room \| One session per (gang, match) — CONFIRMED concept \| IndexedDB \|  
\| Participant \| Member in a room with loyalties and stream offset \| IndexedDB \|  
\| Item \| Clip / text / reaction / AI-line sent; anchored to a ball \| IndexedDB (audio as Blob) \|  
\| Moment \| A detected gang moment \| IndexedDB \|  
\| Call \| Gang Call \| IndexedDB \|  
\| AwaySession \| Away window \+ catch-up text \| IndexedDB \|  
\| Wrap \| End-of-match recap; memory cover \| IndexedDB \|

\#\#\# 10.3 ER diagram

\`\`\`mermaid  
erDiagram  
  MATCH \|\|--\|{ TEAM : has  
  TEAM \|\|--\|{ PLAYER : fields  
  MATCH \|\|--\|{ BALL : contains  
  GANG \|\|--\|{ MEMBER : has  
  GANG \|\|--o{ ROOM : opens  
  MATCH \|\|--o{ ROOM : "is watched in"  
  ROOM \|\|--\|{ PARTICIPANT : includes  
  MEMBER \|\|--o{ PARTICIPANT : "joins as"  
  ROOM \|\|--o{ ITEM : holds  
  PARTICIPANT \|\|--o{ ITEM : sends  
  BALL \|\|--o{ ITEM : anchors  
  ROOM \|\|--o{ MOMENT : detects  
  BALL \|\|--o{ MOMENT : "triggered by"  
  ROOM \|\|--o{ CALL : has  
  ROOM \|\|--o{ AWAY\_SESSION : has  
  ROOM \|\|--o\| WRAP : "ends with"  
\`\`\`

\#\#\# 10.4 Schemas (TypeScript, PROPOSED)

\`\`\`ts  
type ID \= string; // uuid v4 or stable slug for static data

interface Match {  
  id: ID; title: string; date: string; // ISO  
  format: 'T20' \| 'ODI' \| 'Test';       // ASSUMPTION: T20  
  teams: \[ID, ID\]; venue?: string;  
  result: string; source: { name: string; licence: string; url: string };  
}  
interface Team { id: ID; matchId: ID; name: string; shortName: string; colour: string }  
interface Player {  
  id: ID; teamId: ID; name: string; role: 'bat' \| 'bowl' \| 'all' \| 'wk';  
  story: string;            // ≤ 120 chars, curated, used in prompts (character-aware teases)  
}  
interface Ball {  
  id: ID; matchId: ID; innings: 1 \| 2; over: number; ballInOver: number; seq: number; // seq unique per match  
  batterId: ID; bowlerId: ID;  
  runsBat: number; extras: number; extraType?: 'wd' \| 'nb' \| 'b' \| 'lb';  
  wicket?: { playerOutId: ID; kind: string; fielderId?: ID };  
  scoreAfter: { runs: number; wickets: number };  
  commentary?: string;       // short ball text for the broadcast view  
  displayDurationMs: number; // from pacing step  
  scripted?: boolean;        // slowed down / key moment  
}  
interface Gang { id: ID; name: string }  
interface Member { id: ID; gangId: ID; displayName: string; isSelf: boolean; isSimulated: boolean; avatar?: string; persona?: string }

type RoomStatus \= 'pre\_match' \| 'live' \| 'ended';  
interface Room {  
  id: ID; gangId: ID; matchId: ID; status: RoomStatus;  
  createdAt: string; startedAt?: string; endedAt?: string;  
  playheadSeq: number; version: 1;  
}  
interface Participant {  
  id: ID; roomId: ID; memberId: ID;  
  teamId: ID; heroId?: ID; villainId?: ID;  // hero \!== villain  
  streamOffsetMs: number;                   // demo: simulated; real: measured  
}  
type ItemKind \= 'clip' \| 'text' \| 'reaction' \| 'ai\_line\_text';  
interface Item {  
  id: ID; roomId: ID; participantId: ID; kind: ItemKind;  
  anchorBallSeq: number; sentAt: string;  
  audio?: Blob; durationMs?: number;         // clip  
  transcript?: string; transcriptStatus?: 'pending' \| 'ok' \| 'failed';  
  text?: string;                             // text / ai\_line\_text, ≤ 140  
  emoji?: '😂' \| '🔥' \| '😭' \| '🤡';  
  sourceMomentId?: ID;                       // if it came from an AI line  
}  
type RuleId \= 'R1' \| 'R2' \| 'R3' \| 'R4' \| 'R5' \| 'R6' \| 'R7';  
interface Moment {  
  id: ID; roomId: ID; ballSeq: number; ruleId: RuleId;  
  playerId?: ID; victimParticipantId?: ID; audience: ID\[\]; // who sees a card  
  severity: 1 \| 2 \| 3; lines?: string\[\]; lineSource?: 'precomputed' \| 'live' \| 'template';  
  used?: boolean;  
}  
interface Call { id: ID; roomId: ID; participantId: ID; type: 'wicket\_this\_over' \| 'six\_this\_over' \| string;  
  windowStartSeq: number; windowEndSeq: number; status: 'open' \| 'won' \| 'lost' }  
interface AwaySession { id: ID; roomId: ID; startSeq: number; endSeq?: number; calledBackAtSeq?: number; catchup?: string; catchupSource?: 'llm' \| 'fallback' }  
interface Wrap {  
  roomId: ID; roastOfTheNight?: { itemId: ID; title: string };  
  mostRoasted: { participantId: ID; count: number };  
  high: { ballSeq: number; caption: string }; low: { ballSeq: number; caption: string };  
  reel: ID\[\]; // item ids of clips, ordered  
  source: 'llm' \| 'fallback';  
}  
\`\`\`

\#\#\# 10.5 Constraints and indexes (real-product DB, PROPOSED)  
\- \`Room\` unique (\`gang\_id\`, \`match\_id\`) — one session per match per gang.  
\- \`Participant\` unique (\`room\_id\`, \`member\_id\`); check \`hero\_id \<\> villain\_id\`.  
\- \`Item\` index (\`room\_id\`, \`anchor\_ball\_seq\`, \`sent\_at\`) — delivery order.  
\- \`Ball\` unique (\`match\_id\`, \`seq\`).  
\- Soft deletion: not discussed (ASSUMPTION: users may delete their own clips in the real product; not in demo).  
\- Retention: memories kept indefinitely is the product intent ("well preserved"); voice retention policy UNRESOLVED for the real product (Q-14).

\#\#\# 10.6 Browser storage mapping (demo)  
IndexedDB database \`fun-banter\` (the pre-rename name, kept on purpose so saved memories survive the rename — §1.1 \#13), object stores: \`rooms\`, \`participants\`, \`items\` (index \`byRoomAnchor\`), \`moments\`, \`away\`, \`wraps\`. Wrap all access in try/catch; if unavailable, run in memory and show "memory won't be saved on this browser".

\---

\#\# 11\. API specification

All endpoints are \*\*PROPOSED contracts\*\* for the demo AI proxy. No auth (public demo) — protected by validation, size limits and rate limiting (§14). JSON in/out unless stated. Common error body:

\`\`\`json  
{ "error": { "code": "RATE\_LIMITED \| BAD\_REQUEST \| UPSTREAM\_ERROR \| TIMEOUT", "message": "..." } }  
\`\`\`

\#\#\# 11.1 \`POST /api/lines\` — tease, comeback or brag lines (F-B, F-B2, F-CALLS)  
Request:  
\`\`\`json  
{  
  "kind": "tease \| comeback \| brag",  
  "moment": { "ruleId": "R3", "event": "expensive\_over", "ballText": "Seifert hits {bowler} for SIX over long-on" },  
  "player": { "name": "{bowler}", "story": "{one-line story from players.json}" },  
  "speaker": { "name": "You", "team": "IND" },  
  "target":  { "name": "Rohan", "team": "IND", "hero": "{bowler}" },  
  "matchState": "NZ {runs}/{wkts} after {overs} overs, chasing {target}",  
  "language": "en-IN"  
}  
\`\`\`  
Response 200:  
\`\`\`json  
{ "lines": \["...", "...", "..."\], "source": "live" }  
\`\`\`  
Validation: all strings ≤ 200 chars; \`kind\` enum; \`language\` from allowed list. Status: 200, 400, 429, 502, 504 (timeout 2.5 s). Side effects: none. Client falls back to templates on any non-200.

\#\#\# 11.2 \`POST /api/catchup\` (F-CATCH)  
Request: \`{ "events": \[{ "seq": 31, "text": "SIX — Phillips off {bowler}" }\], "said": \[{ "who": "Aman", "text": "..." }\], "self": "You", "maxWords": 60 }\` (≤ 60 events, ≤ 40 utterances).  
Response: \`{ "summary": "...", "source": "live" }\`. Timeout 3 s.

\#\#\# 11.3 \`POST /api/wrap\` (F-WRAP)  
Request: \`{ "match": "NZ v IND, 5th T20I", "result": "...", "stats": { "mostRoasted": "Rohan", "counts": {...} }, "highlights": \[{ "itemId": "...", "who": "Aman", "text": "...", "seq": 31 }\] }\` (≤ 50 highlights).  
Response: \`{ "roastOfTheNight": { "itemId": "...", "title": "..." }, "high": { "seq": 0, "caption": "..." }, "low": { "seq": 0, "caption": "..." }, "reel": \["itemId", "..."\] }\`. Server validates that every returned \`itemId\` exists in the request. Timeout 5 s.

\#\#\# 11.4 \`POST /api/transcribe\` (F-STT; proxies Sarvam speech-to-text, \`en-IN\`)  
Request: \`multipart/form-data\` with \`audio\` (webm/opus or mp4/aac), ≤ 6 s, ≤ 500 KB.  
Response: \`{ "text": "..." }\`. Errors: 413 too large, 415 unsupported type. Audio is not stored.

\#\#\# 11.4a \`POST /api/reply\` — live friend reply (F-FRIENDS, F-B2)  
Request: \`{ "friend": { "name": "Rohan", "persona": "...", "team": "IND", "hero": "..." }, "userSaid": "transcript or text ≤ 200 chars", "moment": { ... optional ... }, "matchState": "..." }\`  
Response: \`{ "line": "≤ 20 words", "source": "live" }\`. Gemini, timeout 2.5 s, same safety checks as §12.6; the client then calls \`/api/speak\`. On failure the client uses a template comeback as text.

\#\#\# 11.4b \`POST /api/speak\` — friend voice (F-FRIENDS)  
Request: \`{ "text": "≤ 200 chars", "speaker": "\<Sarvam speaker id from gang.json\>" }\`. Server calls Sarvam TTS with \`target\_language\_code: "en-IN"\`.  
Response: audio (e.g. \`audio/wav\` or base64 JSON — follow Sarvam's response format). Speaker must be in the server-side allowlist from \`gang.json\`. Timeout 4 s; on failure client shows the line as text. Cache by hash(text+speaker) in memory for the function lifetime.

\#\#\# 11.5 Traceability  
\| Endpoint \| FRs \| Entities \|  
\|---\|---\|---\|  
\| /api/reply \| FR-017, FR-023 \| Item (friend) \|  
\| /api/speak \| FR-017 \| Item.audio (friend) \|  
\| /api/lines \| FR-014–016, FR-023, FR-024 \| Moment.lines, Item(ai\_line\_text) \|  
\| /api/catchup \| FR-019 \| AwaySession.catchup \|  
\| /api/wrap \| FR-020 \| Wrap \|  
\| /api/transcribe \| FR-012 \| Item.transcript \|

\#\#\# 11.6 Real-product API (FUTURE SCOPE, outline only)  
Rooms CRUD, join via invite, loyalty update, item upload (signed URL for audio), real-time channel per room carrying items with \`anchorBallSeq\`, offset reporting per participant. Not specified further — not discussed.

\---

\#\# 12\. AI and intelligent systems

\#\#\# 12.1 Components

\| Component \| Feature \| Technique \| Status \|  
\|---\|---\|---\|---\|  
\| Moment spotting \| F-A \| Deterministic rules on ball events \+ loyalties \| PROPOSED (AI in product framing, rules in implementation) \|  
\| Tease / comeback / brag writer \| F-B, F-B2, F-CALLS \| LLM, few-shot, JSON output \| PROPOSED \|  
\| Catch-up writer \| F-CATCH \| LLM summarisation \| PROPOSED \|  
\| Wrap writer \+ reel picker \| F-WRAP \| Deterministic stats \+ LLM captions/selection \| PROPOSED \|  
\| Live friend replies \| F-FRIENDS, F-B2 \| Gemini, persona-conditioned \| CONFIRMED (live) \|  
\| Transcription \| F-STT \| Sarvam Saaras STT \| CONFIRMED provider \|  
\| Friend voices \| F-FRIENDS \| Sarvam Bulbul TTS, one speaker per friend \| CONFIRMED provider \|

No training, RAG, vector DB or embeddings are needed. Player context is supplied directly from the curated profile file.

\#\#\# 12.2 Line generation pipeline

\`\`\`mermaid  
flowchart LR  
  M\[Moment\] \--\> P{Precomputed line exists?}  
  P \-- yes \--\> OUT\[Show lines\]  
  P \-- no \--\> L\[POST /api/lines, 2.5 s timeout\]  
  L \-- ok \--\> V\[Validate: JSON, ≤15 words, safety\] \-- pass \--\> OUT  
  L \-- error/timeout \--\> T\[Template lines\]  
  V \-- fail \--\> T \--\> OUT  
\`\`\`

\*\*Live-first (CONFIRMED):\*\* the normal path is a live Gemini call, made early through look-ahead prefetch (the replay data tells the client which moments will fire on the next 1–2 balls). The build-time script runs the same prompt for every moment the rules will fire and stores results in \`precomputed-lines.json\` (plus pre-voiced Sarvam clips for ball-anchored friend reactions) \*\*only as a safety net\*\* when a live call is late or fails. The reviewer should normally see freshly generated lines that differ between runs.

\#\#\# 12.3 Prompt design (PROPOSED starting point)

System prompt (tease):  
\`\`\`  
You write one-line banter for friends watching cricket together.  
Rules:  
\- Return JSON: {"lines": \[string, string, string\]}.  
\- Each line ≤ 15 words, spoken aloud naturally, playful and friendly.  
\- Tease the friend through their player or team; use the player's story when given.  
\- Never target religion, caste, region, gender, body, family, or use slurs or profanity.  
\- No betting or money references.  
\- Language/style: {language\_style}.  
\`\`\`  
User content: the request JSON from §11.1. Few-shot: 3 examples per \`kind\`. Catch-up prompt: "Summarise what happened while {self} was away, in ≤ {maxWords} words, as a friend would tell it, mentioning every wicket and quoting at most one friend line." Wrap prompt: return captions and choose \`reel\` ids only from provided highlights.

\*\*Language and tone (CONFIRMED: English):\*\* natural Indian-English friend banter (\`en-IN\` voices), fun and teasing, never mean. Set \`{language\_style}\` \= "casual Indian English, like friends on a group call".

\#\#\# 12.4 Model selection (PROPOSED; verify)  
\- Provider: \*\*Google Gemini\*\* (CONFIRMED). Lines, replies and catch-up: a fast Flash-class Gemini model. Wrap: the same or a stronger Gemini model. Choose current model IDs from Google's docs at build time and keep them in env vars (\`GEMINI\_MODEL\_FAST\`, \`GEMINI\_MODEL\_WRAP\`).  
\- Voices and transcription: \*\*Sarvam\*\* (CONFIRMED), see §15.  
\- Temperature \~0.9 for lines (variety), \~0.4 for catch-up (faithfulness).

\#\#\# 12.5 Evaluation  
\- Golden set: every scripted moment × each \`kind\`; checks: valid JSON, 3 lines, ≤ 15 words, mentions target/player, no blocked terms.  
\- Catch-up faithfulness: every wicket in input appears in output; no invented events (string match on player names).  
\- Manual review by the owner of all precomputed lines before shipping (they ship as static files).

\#\#\# 12.6 Safety  
\- Blocklist \+ LLM instruction (§12.3). Any line failing the blocklist is replaced by a template.  
\- User-generated text/clip transcripts are \*\*not\*\* sent to the LLM except in catch-up/wrap; they are length-limited.

\#\#\# 12.7 Cost and latency  
Live-first means each reviewer run makes real calls: roughly one Gemini call per fired moment, per friend reply, plus catch-up and wrap, and one Sarvam TTS call per live friend line (estimate a few dozen calls per run — measure during build). Prefetch hides latency; the precomputed safety net keeps the demo working when limits are hit. Rate limit per IP (§14). Hard \`max\_tokens\` per endpoint (lines 150, catch-up 150, wrap 400 — ASSUMPTION).

\#\#\# 12.8 Fallbacks  
\| Component \| Fallback \|  
\|---\|---\|  
\| Lines \| Template bank keyed by rule (e.g. "{player} gone for {runs}. {target}, any words?") \|  
\| Catch-up \| Bullet list of events in the window \|  
\| Wrap \| Stats-only wrap with default titles; reel \= top 3 longest clips by the user \+ friends \|  
\| STT \| Clip without transcript \|

\---

\#\# 13\. Frontend and UI/UX specification

\#\#\# 13.1 Design principles (CONFIRMED intent → PROPOSED execution)  
1\. \*\*The match comes first.\*\* The panel must never cover the stream (CONFIRMED concern: "without removing the screen").  
2\. \*\*One action at a time.\*\* During a ball the only prominent control is \*\*hold to talk\*\*.  
3\. \*\*Disappearing UI.\*\* Cards vanish at the next ball.  
4\. \*\*Friends, not features.\*\* Faces/avatars and voices dominate; numbers are secondary.  
5\. \*\*No clutter for casual fans.\*\*

\#\#\# 13.2 Screen inventory

\| ID \| Screen \| Contents \|  
\|---\|---\|---\|  
\| S-1 \| Landing \| Product name, one-line pitch, 3-step "how it works", disclosure "Your gang here is simulated for this demo", CTA \|  
\| S-2 \| Pre-match room \| Match card (teams, venue, date), gang members with loyalty badges, user's pickers (team/hero/villain), mic test (optional), Start \|  
\| S-3 \| Live \| Fake browser window: left ≈ 70% stream area; right ≈ 30% panel (min 360 px) \|  
\| S-4 \| Away overlay \| Dimmed stream, "You stepped away — the gang will call you", I'm back \|  
\| S-5 \| Call-back banner \| Friend avatar, voice line, "Back to the match" \|  
\| S-6 \| Catch-up card \| Summary \+ "Rejoin" \|  
\| S-7 \| Wrap \| Cover: result \+ gang titles; audio reel player; stats; "Save memory" (automatic) / "Rewatch" \|  
\| S-8 \| Memory shelf \| List of past rooms (match, date, cover caption) \|  
\| S-9 \| Rewatch \| S-3 in rewatch mode (no prompts) \|

\#\#\# 13.3 Live screen layout

\`\`\`  
┌──────────────────────────────────────────────────────────────┐  
│ ● ● ●   streaming-site.example/live            (fake chrome) │  
├──────────────────────────────────────────┬───────────────────┤  
│                                          │ 🎙 Gang commentary │  
│  🔴 LIVE  NZ v IND · 5th T20I · Hamilton  │ Rohan (IND·bowler)│  
│   NZ 142/3 (16.2)   need 38 off 22       │ Aman  (NZ·Seifert)│  
│   Seifert 61\*(38) · Phillips 44\*(25)     │───────────────────│  
│        \[ SIX \]  big animated result      │ ▶ Aman  "BOOM\!"   │  
│                                          │ ● 16.2 SIX        │  
│                                          │ ┌ MOMENT CARD ──┐ │  
│                                          │ │18 off the over│ │  
│                                          │ │Rohan's hero 😏│ │  
│                                          │ │ › line 1 ...  │ │  
│                                          │ └───────────────┘ │  
│  🔊 crowd       ⏸     \[Step away\]       │ 😂 🔥 😭 🤡  ✎   │  
│                                          │ \[ HOLD TO TALK \]  │  
└──────────────────────────────────────────┴───────────────────┘  
\`\`\`

\#\#\# 13.4 Components  
\`BrowserChrome\`, \`BroadcastView\`, \`Scoreboard\`, \`BallResultBurst\`, \`GangHeader\` (avatars \+ loyalty badges \+ speaking indicator), \`Feed\` (\`ClipBubble\` with waveform, transcript, play; \`TextBubble\`; \`ReactionBubble\`; \`BallMarker\`), \`MomentCard\` (headline, ≤3 \`LineOption\`s with "say it" and "send as text"), \`TalkButton\` (press-and-hold; Space key; recording ring and countdown), \`ReactionBar\`, \`TextComposer\`, \`AwayOverlay\`, \`CallbackBanner\`, \`CatchupCard\`, \`WrapView\`, \`ReelPlayer\`, \`MemoryShelf\`, \`SyncBadge\` ("in sync with your stream").

\#\#\# 13.5 Design system (PROPOSED)  
\- Dark theme by default (matches how people watch at night) with tokens on \`:root\`; light theme supported.  
\- Tokens: \`--bg\`, \`--surface\`, \`--text\`, \`--muted\`, \`--accent\` (energy: e.g. saffron/orange), \`--live\` (red), \`--good\`, \`--bad\`. Team colours from data.  
\- Type: one geometric sans for UI; tabular numerals for scores.  
\- Motion: ball result burst (≤ 600 ms), card slide-in 200 ms, speaking pulse on avatars. Respect \`prefers-reduced-motion\`.  
\- \*\*No third-party branding\*\* (no JioHotstar/FanCode/Dream11 logos on the fake streaming site).

\#\#\# 13.6 States  
\| State \| Behaviour \|  
\|---\|---\|  
\| Loading \| Skeleton broadcast \+ "Setting up the room" \|  
\| Empty feed \| "The gang is warming up…" \|  
\| Mic denied \| Talk button replaced by "Mic off — type or react instead" with re-request link \|  
\| Recording \| Red ring, countdown, live level meter \|  
\| Transcript pending \| Shimmer line under clip \|  
\| AI fallback \| Silent (no error shown to user) \|  
\| Storage unavailable \| One-time toast \|  
\| Error (asset load) \| Full-screen retry \|

\#\#\# 13.7 Responsive behaviour  
Desktop-only (CONFIRMED). Below 1024 px wide show a "best on a laptop" notice but still render with the panel stacked under the stream (ASSUMPTION).

\---

\#\# 14\. Security and privacy

\| Topic \| Demo requirement \| Status \|  
\|---\|---\|---\|  
\| Authentication \| None \| PROPOSED \|  
\| Authorization/RBAC \| None \| PROPOSED \|  
\| Secrets \| LLM/STT keys only in serverless env vars; never in the client bundle \| PROPOSED (FR-025) \|  
\| API abuse \| Per-IP rate limit (e.g. 30 req/min, 300/day — ASSUMPTION), payload size caps, strict schema validation (Zod), timeouts \| PROPOSED \|  
\| Prompt injection \| User text is inserted as data inside JSON; outputs validated against schema and length; never executed \| PROPOSED \|  
\| Voice privacy \| Mic only on explicit press; recording indicator; audio stored only in the user's browser; server transcribes and discards \| PROPOSED \|  
\| Third-party STT privacy \| If browser Web Speech API is used, disclose that audio goes to the browser vendor \| PROPOSED \|  
\| Content safety \| Safety rules on AI lines (§12.6) \| PROPOSED \|  
\| Copyright \| No broadcast footage (CONFIRMED); open match data with attribution, or facts-only manual data with original ball text \| CONFIRMED / Q-07 \|  
\| Impersonation \| No real brand UIs or logos \| PROPOSED \|  
\| Transparency \| Simulated friends disclosed in UI and note \| PROPOSED \|  
\| XSS \| Render all text as text (React default); no \`dangerouslySetInnerHTML\` \| PROPOSED \|  
\| CORS \| Proxy accepts only the demo's origin \| PROPOSED \|  
\| Betting \| No money, odds or wagering anywhere \| PROPOSED (non-goal) \|  
\| Real product (FUTURE) \| Auth, invite-only rooms, per-room authorization, signed audio URLs, retention/deletion controls, abuse reporting \| FUTURE SCOPE \|

\---

\#\# 15\. Integrations and external dependencies

\| Service \| Purpose \| Method \| Auth \| Failure handling \| Status \|  
\|---\|---\|---\|---\|---\|---\|  
\| \*\*Google Gemini\*\* \| Lines, live replies, brag lines, catch-up, wrap \| \`@google/genai\` SDK from serverless functions; build script for safety net \| \`GEMINI\_API\_KEY\` (from Google AI Studio, provided by owner) \| Timeout/429/5xx → precomputed → template \| CONFIRMED \|  
\| \*\*Sarvam AI TTS (Bulbul)\*\* \| Friend voices, \`en-IN\` \| REST \`POST https\://api.sarvam.ai/text-to-speech\` from \`/api/speak\` and build script \| Header \`api-subscription-key: \$SARVAM\_API\_KEY\` (from Sarvam dashboard, provided by owner) \| ≤ 2500 chars/request; \`target\_language\_code\` required; failure → text bubble \| CONFIRMED \|  
\| \*\*Sarvam AI STT (Saaras)\*\* \| Transcribe reviewer clips \| REST \`/speech-to-text\` from \`/api/transcribe\` \| Same key \| Failure → clip without transcript \| CONFIRMED \|  
\| Web Speech API \| Emergency STT fallback only \| Browser API \| — \| Chrome-only \| PROPOSED (fallback) \|  
\| Match data — Cricsheet (preferred) \| Ball-by-ball replay of 5th T20I NZ v IND, 1 Nov 2026 \| Download JSON once, convert to \`match.json\` \| — \| Not yet published as of 2026-11-13 → manual build from public scorecards (facts only) \| CONFIRMED match / data source to verify \|  
\| Vercel \| Hosting \+ functions \| Git deploy \| Owner's account \| Re-promote previous deployment \| CONFIRMED \|  
\| Hosting (Vercel/Netlify) \| Static site \+ functions \| Git deploy \| Account \| — \| PROPOSED \|  
\| Browser Notifications \| Call-back when tab hidden \| Notification API \| User permission \| Fall back to in-page banner \| PROPOSED, optional \|

\---

\#\# 16\. Error handling and edge cases

\| Case \| Expected behaviour \|  
\|---\|---\|  
\| Mic permission denied / no mic \| Text \+ reactions remain; talk button explains; feature still demonstrable through friends' clips \|  
\| Very short press (\< 300 ms) \| Discard silently \|  
\| Hold beyond max length \| Auto-stop and send \|  
\| Talk pressed during a moment card \| Recording works; card stays until next ball \|  
\| User talks while friends' clips play \| User recording continues; queue keeps playing (ducked); ASSUMPTION: no echo cancellation beyond browser default \|  
\| Several clips due at once \| Sequential queue; cap 5 audio, rest as transcript \|  
\| STT failure \| "Transcript unavailable"; excluded from summaries \|  
\| LLM timeout / 5xx / 429 \| Templates/fallbacks; no user-facing error \|  
\| Invalid LLM JSON or unsafe line \| Replace with template \|  
\| Network offline \| Replay, friends, precomputed lines all work (static); live AI features fall back \|  
\| Browser storage unavailable \| Run in memory; toast that the memory won't be saved \|  
\| Page reload mid-match \| Resume from persisted room if present; else restart with notice \|  
\| Tab hidden (browser throttles timers) \| Replay clock based on elapsed real time, not interval counts, so it stays correct; call-back may use Notification \|  
\| User steps away and never returns \| Match continues to end; wrap waits; on return show wrap \|  
\| Step away pressed repeatedly \| Idempotent; one AwaySession open at a time \|  
\| Duplicate submissions (double tap a line) \| Debounce; one item per tap within 500 ms \|  
\| Hero \= villain chosen \| Prevent in picker \|  
\| User picks a player with no story \| Teases use name \+ match situation only \|  
\| Audio autoplay blocked by browser \| Start replay only after a user click (Start button) so the audio context is unlocked \|  
\| Unsupported codec for recording \| Pick the first supported MIME type; else disable voice with text fallback \|

\---

\#\# 17\. Testing strategy

\#\#\# 17.1 Unit (Vitest)  
\- Moment rules R1–R7 (tables of ball inputs → expected moments).  
\- Anchoring and delivery (FR-007, FR-008) including friends with offsets.  
\- Pacing: total duration within target; final score correct.  
\- Queue ordering and no overlap (FR-009).  
\- Wrap stats (most-roasted counts).  
\- Validators for every asset and API schema.

\#\#\# 17.2 Component (React Testing Library)  
TalkButton (pointer \+ Space, max length), MomentCard (render, dismiss on next ball), CatchupCard fallback, MemoryShelf.

\#\#\# 17.3 API tests  
Each endpoint: valid request → schema-valid response (with mocked LLM); oversized/invalid → 400/413; upstream error → 502; timeout → 504; rate limit → 429\.

\#\#\# 17.4 End-to-end (Playwright, Chrome, fake media device flags)  
1\. Full journey: landing → setup → live → moment card → send line → step away → call-back → catch-up → wrap → memory shelf (FR-002–FR-021).  
2\. Mic denied path.  
3\. Offline AI path (block \`/api/\*\`): journey still completes with fallbacks.  
4\. Reload mid-match resumes.

\#\#\# 17.5 Data tests  
Converted \`match.json\` reproduces the official scorecard (innings totals, wickets, top scorers).

\#\#\# 17.6 AI evaluation  
Golden set (§12.5) run in CI against precomputed outputs; optional live run before release. Owner manually reviews all precomputed lines.

\#\#\# 17.7 Performance and manual checks  
Moment card latency (instrumented), memory/CPU stable over the full replay, audio ducking audible, design review on 1280×720 and 1440×900, dark/light.

\#\#\# 17.8 Requirement → test map  
\| FR \| Tests \|  
\|---\|---\|  
\| FR-005 \| Unit pacing, data test, E2E-1 \|  
\| FR-006 \| Component TalkButton, E2E-1 \|  
\| FR-007/008 \| Unit sync \|  
\| FR-009/010 \| Unit queue, manual audio \|  
\| FR-013 \| Unit rules \|  
\| FR-014/015 \| Component MomentCard, AI eval \|  
\| FR-018/019 \| E2E-1, E2E-3 \|  
\| FR-020/021 \| E2E-1, E2E-4 \|  
\| FR-025 \| Build check: grep bundle for key prefix \|

\---

\#\# 18\. Deployment and infrastructure

\*\*No infrastructure exists yet.\*\* All PROPOSED.

\| Item \| Proposal \|  
\|---\|---\|  
\| Environments \| Local dev; preview deployments per branch; production \= the link submitted to Dream11 \|  
\| Hosting \| Vercel (static SPA \+ \`/api/\*\` functions) \|  
\| Env vars \| \`GEMINI\_API\_KEY\`, \`GEMINI\_MODEL\_FAST\`, \`GEMINI\_MODEL\_WRAP\`, \`SARVAM\_API\_KEY\`, \`SARVAM\_TTS\_MODEL\`, \`SARVAM\_STT\_MODEL\`, \`RATE\_LIMIT\_PER\_MIN\`, \`ALLOWED\_ORIGIN\`. Keys are set by the owner in \`.env\` (local, git-ignored) and in Vercel project settings; commit only \`.env.example\` with empty values. \|  
\| Build \| \`pnpm build\` → Vite static output; \`pnpm precompute\` (safety-net lines via Gemini \+ pre-voiced friend clips via Sarvam) run locally and committed as static assets \|  
\| CI \| Lint, typecheck, unit \+ component tests, AI golden-set check on precomputed files, Playwright E2E against preview \|  
\| Migrations \| None (no DB); IndexedDB schema has \`version\` with upgrade handler \|  
\| Logging/monitoring \| Function logs (errors, latency, upstream status); no user content logged \|  
\| Backups \| N/A \|  
\| Release \| Freeze a production deployment before submission; do not redeploy during the evaluation window except for critical fixes \|  
\| Rollback \| Re-promote previous deployment \|  
\| Extension (if T2) \| Packaged zip \+ install instructions (developer mode); Chrome Web Store optional (review takes days) \|

\---

\#\# 19\. Project directory and codebase structure (PROPOSED)

\`\`\`  
apnacommentarybox/  
├── .env.example                  \# empty GEMINI\_/SARVAM\_ vars; real .env is git-ignored  
├── README.md                     \# how to run, deploy, demo script  
├── docs/  
│   ├── PROJECT\_MASTER\_SPECIFICATION.md  
│   └── decisions/                \# ADRs: 0001-static-demo.md, ...  
├── data/  
│   ├── raw/                      \# downloaded source data (attribution)  
│   └── scripts/  
│       ├── convert-match.ts      \# raw → public/data/match.json  
│       ├── pace.ts               \# compute displayDurationMs  
│       ├── precompute-lines.ts   \# safety-net lines via Gemini  
│       └── generate-voices.ts    \# safety-net friend clips via Sarvam TTS  
├── public/  
│   ├── data/                     \# match.json, squads.json, players.json, gang.json, friend-script.json, precomputed-lines.json, templates.json  
│   └── audio/                    \# friend clips, crowd ambience  
├── api/                          \# serverless functions  
│   ├── lines.ts  
│   ├── catchup.ts  
│   ├── wrap.ts  
│   ├── reply.ts                  \# live friend reply (Gemini)  
│   ├── speak.ts                  \# friend voice (Sarvam TTS)  
│   ├── transcribe.ts             \# reviewer clip → text (Sarvam STT)  
│   └── \_lib/ (gemini.ts, sarvam.ts, prompts.ts, validate.ts, rateLimit.ts, safety.ts)  
├── src/  
│   ├── main.tsx, App.tsx  
│   ├── shell/                    \# demo-only: BrowserChrome, BroadcastView, Scoreboard  
│   ├── panel/                    \# PORTABLE product UI (no imports from shell/)  
│   │   ├── components/  
│   │   ├── screens/  
│   │   └── hooks/  
│   ├── core/                     \# PURE logic, no React, no DOM  
│   │   ├── replay/  sync/  moments/  wrapStats/  types.ts  
│   ├── services/                 \# side effects: audio/, storage/, api/, notifications/  
│   ├── store/                    \# Zustand stores  
│   ├── styles/                   \# tokens.css, global.css  
│   └── content/                  \# copy strings  
├── tests/  
│   ├── unit/  component/  e2e/  ai-eval/  
└── extension/                    \# only if T2 is approved  
\`\`\`

Conventions: \`core/\` is pure and fully unit-tested; \`panel/\` never imports \`shell/\` (enforced by lint rule) so it can be mounted in an extension; files \`kebab-case\` for scripts, \`PascalCase.tsx\` for components; types in \`core/types.ts\`; all external I/O in \`services/\`.

\---

\#\# 20\. Implementation roadmap

Deadline: \*\*5 days from receipt of the email.\*\* Receipt date not stated; conversation began 2026-11-12, so ASSUMPTION: submit by \*\*2026-11-17\*\*. Confirm (Q-05).

\| Phase \| Objective \| Includes \| Done when \|  
\|---\|---\|---\|---\|  
\| \*\*P0 — Data & personas\*\* \| Unblock build \| Decisions are made (§1.1). Owner adds keys to \`.env\`. Get ball-by-ball data for 5th T20I NZ v IND (Cricsheet or manual, facts only); write player stories; create gang personas \+ Sarvam voices; owner approves personas \| \`match.json\` passes data test against the official scorecard; \`gang.json\` approved \|  
\| \*\*P1 — Shell & replay\*\* \| Feel of watching \| Repo setup, tokens, BrowserChrome, BroadcastView, replay clock, pacing \| Full match replays in target time with correct score \|  
\| \*\*P2 — Panel & voice\*\* \| Core interaction \| Room, loyalty setup, feed, talk button, recording, queue, ducking, text/reactions, sync \| User and friends' clips flow in sync; no overlaps \|  
\| \*\*P3 — AI moments & lines\*\* \| The magic \| Rules R1–R7, moment card, precompute script, \`/api/lines\`, templates, safety, comebacks \| All scripted moments show good lines instantly \|  
\| \*\*P4 — Away & catch-up\*\* \| Owner-confirmed \#2 \+ \#1 \| Step away, call-back, \`/api/catchup\`, fallback \| E2E away flow passes \|  
\| \*\*P5 — Wrap & memory\*\* \| Shared keepsake \| Stats, \`/api/wrap\`, reel, persistence, shelf, (rewatch) \| Memory survives reload \|  
\| \*\*P5b — Gang Calls\*\* \| Adrenaline before the ball (CONFIRMED IN) \| Call UI, resolution, brag/comeback lines, friends' calls \| Calls resolve correctly; part of the submitted demo \|  
\| \*\*P6 — Polish & ship\*\* \| Design \+ reliability \| Landing, states, accessibility, E2E, deploy, freeze \| Fresh browser completes journey in ≈ 5 min \|  
\| \*\*P7 — Submission\*\* \| Deliver \| 200-word note, AI tools list, demo script \| Form submitted \|  
\| \*\*P8 — After the link is done\*\* \| Bonus \| Chrome extension (CONFIRMED: only after the demo link is done) \| Only after P7-ready build is frozen \|

Dependencies: P1 → P2 → P3; P4 and P5 depend on P2/P3; P6 after P5; P8 never blocks P7.

\---

\#\# 21\. Task breakdown

\| ID \| Task \| Rel. \| Deps \| Priority \| Definition of done \|  
\|---\|---\|---\|---\|---\|---\|  
\| TASK-001 \| Owner adds \`GEMINI\_API\_KEY\` and \`SARVAM\_API\_KEY\` to \`.env\` and creates a Vercel account (decisions already made, §1.1) \| §1.1 \| — \| P0-Critical \| A smoke script confirms both keys work without printing them \|  
\| TASK-002 \| Download/convert match data to \`match.json\` with attribution \| FR-001 \| 001 \| Critical \| Data test passes \|  
\| TASK-003 \| Write \`players.json\` stories for both XIs \| F-B \| 002 \| High \| Every player ≤120-char story \|  
\| TASK-004 \| Create demo gang (\`gang.json\`): 3 personas, loyalties, Sarvam speaker per friend \| F-FRIENDS \| 001,002 \| High \| Owner approves personas and voices \|  
\| TASK-005 \| Write \`friend-script.json\`: which balls each friend reacts to and with what intent (lines generated live by Gemini; safety-net text/audio precomputed) \| FR-017 \| 002,004 \| High \| Covers every rule-fired moment \+ R6 call-back \|  
\| TASK-006 \| Repo scaffold (Vite, TS, lint, test, structure §19) \| — \| — \| Critical \| CI green on empty app \|  
\| TASK-007 \| Design tokens \+ BrowserChrome \+ BroadcastView \| §13 \| 006 \| High \| Matches layout §13.3 \|  
\| TASK-008 \| Replay clock \+ pacing (\`core/replay\`) \| FR-005 \| 002,006 \| Critical \| Unit tests pass \|  
\| TASK-009 \| Room store \+ IndexedDB persistence \| FR-004,021 \| 006 \| High \| Reload test passes \|  
\| TASK-010 \| Landing \+ pre-match setup screens \| FR-002,003 \| 007,009 \| High \| Validation works \|  
\| TASK-011 \| Audio service: record, queue, ducking \| FR-006,009,010 \| 006 \| Critical \| Unit \+ manual audio check \|  
\| TASK-012 \| Sync/delivery module \| FR-007,008 \| 008 \| Critical \| Offset tests pass \|  
\| TASK-013 \| Feed UI, TalkButton, ReactionBar, TextComposer \| FR-006,011 \| 011,012 \| Critical \| Component tests pass \|  
\| TASK-014 \| Friends director \| FR-017 \| 005,012 \| High \| Clips appear at anchored balls \|  
\| TASK-015 \| Sarvam STT integration (\`/api/transcribe\`, \`en-IN\`) \| FR-012 \| 001,013 \| High \| Transcript or graceful failure \|  
\| TASK-016 \| Moment engine R1–R7 \| FR-013 \| 008 \| Critical \| Rule tests pass \|  
\| TASK-017 \| AI proxy scaffold: validation, rate limit, safety, \`/api/lines\` \| FR-015,025 \| 006 \| High \| API tests pass \|  
\| TASK-018 \| Precompute script \+ templates \| FR-014 \| 016,017,003 \| High \| Golden set passes; owner reviewed \|  
\| TASK-019 \| MomentCard \+ line actions (say it / send text) \+ comebacks \| FR-014,016,023 \| 016,018,013 \| Critical \| Card latency ≤500 ms \|  
\| TASK-020 \| Step away, call-back, notifications \| FR-018 \| 016 \| High \| E2E passes \|  
\| TASK-021 \| \`/api/catchup\` \+ CatchupCard \+ fallback \| FR-019 \| 017,020 \| High \| E2E \+ fallback test \|  
\| TASK-022 \| Wrap stats \+ \`/api/wrap\` \+ WrapView \+ reel \| FR-020 \| 017,013 \| High \| E2E passes \|  
\| TASK-023 \| Memory shelf \| FR-021 \| 009,022 \| High \| Reload test \|  
\| TASK-024 \| Rewatch mode \| FR-022 \| 023,012 \| Medium \| Clips align \|  
\| TASK-025 \| States, accessibility, reduced motion, dark/light \| §13.6, §7 \| 019–023 \| High \| Checklist complete \|  
\| TASK-026 \| Playwright E2E suite (4 journeys) \| §17.4 \| 025 \| High \| Green in CI \|  
\| TASK-027 \| Deploy \+ env vars \+ freeze \| §18 \| 026 \| Critical \| Public link works in fresh browser \|  
\| TASK-028 \| Write 200-word note \+ AI tools list \| Appendix A \| 027 \| Critical \| ≤200 words, answers all 4 questions \|  
\| TASK-029 \| Gang Calls (CONFIRMED IN) \| FR-024 \| 016,019 \| High (after core) \| Tests pass; included in submitted demo \|  
\| TASK-030 \| Chrome extension packaging \| F-EXT \| 027 (link frozen) \| Optional \| Works on one real streaming site \|  
\| TASK-031 \| Live friend replies \+ voices: \`/api/reply\` (Gemini) and \`/api/speak\` (Sarvam TTS), look-ahead prefetch \| FR-017, FR-023 \| 014,017 \| Critical \| Friend answers the reviewer's tease in voice within \~2 s; fallback to text works \|

Milestones: \*\*M1\*\* (TASK-001–008) replay works · \*\*M2\*\* (009–015) voice gang works · \*\*M3\*\* (016–019) AI moments · \*\*M4\*\* (020–024) full journey · \*\*M5\*\* (025–028) shipped and submitted.

\---

\#\# 22\. Assumptions, open questions and unresolved decisions

\#\#\# A. Confirmed decisions (owner)  
1\. Lead problem: watching apart from friends and missing the banter (problem 1).  
2\. Core idea: "our version of the commentary" — the gang becomes the commentary box.  
3\. Moment that matters: teasing when a friend's favourite team/player fails.  
4\. Frictions to solve: leaving the screen, moment passing while typing, hard to be funny on the spot.  
5\. Pieces A (spot the moment), B (write the tease), C (wrap) — owner "liked A, B, C".  
6\. Adopt \#2 "Come back, this matters".  
7\. Each match is a separate session with memories preserved.  
8\. Product sits above any streaming app; it does not stream.  
9\. Not mobile for now; desktop because the company must be able to view and evaluate it.  
10\. Voice-oriented ("least friction").  
11\. The idea must remain the owner's own (Dream11 rule); AI used for building.  
12\. Name: Apna Commentary Box (\"Apna Box\"), renamed from Fun-Banter, via Our Commentary Box, on 2026-11-15.  
13\. Match: 5th T20I, New Zealand v India, 1 Nov 2026, Hamilton (NZ won by 7 wickets; India won the series 3–2).  
14\. Language: English.  
15\. Friend voices: AI voices; friends created by the build; owner reviews.  
16\. AI happens live while the reviewer uses the demo; precomputed content is only a safety net.  
17\. Stream area: stylised scoreboard/broadcast view; no real footage.  
18\. Spoiler-protection mode (idea \#3) excluded; catch-up and wrap kept.  
19\. Gang Calls: in.  
20\. Chrome extension: only after the demo link is done.  
21\. AI providers: Google Gemini (text), Sarvam AI (TTS \+ STT). Hosting: Vercel.

\#\#\# B. Reasonable assumptions  
\- Sport is cricket; format T20.  
\- Demo gang \= user \+ 3 simulated friends.  
\- Deadline 2026-11-17.  
\- Loyalties fixed for the match.  
\- Clips due while away are not auto-played on return.  
\- Chrome is the primary browser for reviewers.  
\- Experience target ≈ 5 minutes.

\#\#\# C. Proposed technical recommendations  
Static SPA \+ serverless proxy; rules for detection, Gemini for language; look-ahead prefetch for live lines; precomputed safety net; browser storage for memories; walkie-talkie clips (≤ \~5 s) pinned to the ball; auto-ducking; text fallback; stylised broadcast instead of footage; demo link as the primary deliverable.

\#\#\# D. Conflicting information  
\| ID \| Conflict \| Resolution in this spec \|  
\|---\|---\|---\|  
\| D-1 \| Owner said "we should not adopt 3". It could mean idea \#3 (spoiler protection) or piece C (catch-up & wrap). Claude stated its interpretation (\#3) and asked; owner did not reply. Piece C was CONFIRMED earlier, and the session/memory idea depends on it. \| \*\*RESOLVED 2026-11-13:\*\* owner confirmed "3" \= spoiler protection. \#3 excluded, C kept. \|  
\| D-7 \| Earlier spec assumed Anthropic as LLM provider and recommended precomputed lines as the main path. \| \*\*RESOLVED:\*\* Gemini \+ Sarvam (owner's choice); live generation is the main path, precomputed is the safety net. \|  
\| D-8 \| Earlier recommendation: owner supplies gang names, real lines and match memories. \| \*\*RESOLVED:\*\* owner asked the build to create the friends; moments are derived from data by the rules. \|  
\| D-2 \| Text-first v1 (Claude's earlier recommendation) vs voice-first (owner). \| Voice-first wins (most recent, owner's explicit choice). \|  
\| D-3 \| Phone-sized web app → mobile floating overlay → desktop only. \| Desktop (most recent CONFIRMED). \|  
\| D-4 \| Banter "under the stream" vs side panel/overlay. \| Side panel (follows "sits above any app" \+ desktop). \|  
\| D-5 \| Sync via one-tap calibration (mobile proposal) vs reading the video element (extension). \| Demo simulates offsets; real method FUTURE. \|  
\| D-6 \| Owner's first framing "we all have just one phone". \| Superseded for the demo by the desktop decision; mobile remains the long-term target. \|

\#\#\# E. Missing requirements  
Exact deadline; whether memories need sharing/export; analytics (none assumed); exact roast boundaries beyond §12.6 (owner reviews personas and sample lines).

\#\#\# F. Unresolved architectural decisions and verification tasks  
\- Current Gemini model IDs (verify in Google docs at build time).  
\- Current Sarvam TTS model (\`bulbul:v3\` vs \`bulbul:v4-flash\`) and STT model (\`saaras:v3\`), and Sarvam's TTS response format (verify on docs.sarvam.ai).  
\- Ball-by-ball data source for the chosen match (Cricsheet if published; else manual, facts only).  
\- Extension architecture (content-script panel vs Chrome Side Panel API) — decide in P8.

\#\#\# G. Questions requiring owner input

Resolved on 2026-11-13 (kept for traceability): Q-01 match → 5th T20I NZ v IND · Q-02 name → Fun-Banter (renamed Our Commentary Box, then Apna Commentary Box, on 2026-11-15) · Q-03 extension → after the link · Q-04 Gang Calls → in · Q-06 "3" → spoiler protection · Q-08 stream → stylised scoreboard · Q-09 STT → Sarvam · Q-10 voices → AI (Sarvam) · Q-11 language → English.

\| ID \| Question \| Why it matters \| Options \| Recommendation \| Can dev proceed? \|  
\|---\|---\|---\|---\|---\|---\|  
\| Q-05 \| Exact email receipt date / deadline? \| Planning \| — \| — \| Yes \|  
\| Q-07 \| Match data source (Cricsheet not yet published for this match) \| Effort \+ accuracy \| Wait for Cricsheet / manual build from public scorecards (facts only) \| Check Cricsheet first; go manual if not available by end of P1 \| Scaffolding yes; P0 data blocked until resolved \|  
\| Q-15 \| Approve the AI gang personas and voices \| Authenticity, tone \| Approve / edit \| Build drafts 3 personas \+ Sarvam voices for owner review \| Yes; ship blocked until approved \|  
\| Q-12 \| On return from away, auto-play missed clips? \| UX \| Auto-play burst / list only \| List only \+ catch-up \| Yes \|  
\| Q-13 \| Show a "what WhatsApp would do" spoiler comparison in the demo? (new suggestion, not discussed) \| Makes differentiator \#1 visible \| Yes / no \| Owner's call \| Yes \|  
\| Q-14 \| Real-product voice retention policy \| Privacy \| Keep with memory / expire / user-controlled \| FUTURE \| Yes \|

\---

\#\# 23\. Final agentic coding instructions

To the coding agent receiving this document:

1\. Treat this document as the primary specification. Status labels are binding: do not change CONFIRMED items; follow PROPOSED items by default; surface ASSUMPTION and UNRESOLVED items to the owner when they block you.  
2\. Read the whole document, especially §4, §8, §12 and §22, before changing code.  
3\. Inspect the repository first. Compare its state to this spec and write a short implementation plan before significant changes.  
4\. Preserve finalized product decisions: voice-first, desktop, sits above a stream (not a streaming app), one room per match, call-back, A/B/C pieces.  
5\. AI providers are fixed: \*\*Google Gemini\*\* for text, \*\*Sarvam AI\*\* for TTS and STT. Do not substitute other providers. Verify current model IDs and API formats in their official docs before coding against them. Record remaining stack choices as ADRs in \`docs/decisions/\`.  
6\. Do not build out-of-scope features (§4.1 exclusions, FUTURE SCOPE). Gang Calls are in scope (after the core journey). The Chrome extension starts only after the demo link is deployed and frozen.  
7\. Follow §19 structure and conventions. Keep \`core/\` pure and \`panel/\` independent of \`shell/\`.  
8\. Implement in dependency order (§20). The demo link must be shippable before any optional work.  
9\. Write modular, typed, production-conscious code; avoid overengineering — no backend database, real-time server or microservices for the demo.  
10\. Validate all inputs (assets and API) with schemas; handle every failure in §16.  
11\. Add tests with each feature (§17). Keep the AI golden set passing.  
12\. Maintain IndexedDB schema versioning with upgrade handlers.  
13\. Never hardcode keys or secrets; never ship them in the client bundle.  
14\. Document architectural decisions as ADRs.  
15\. Keep README and this spec updated when decisions change.  
16\. Verify acceptance criteria before marking work done.  
17\. Report blockers and ambiguities (especially Q-07 match data and Q-15 persona approval) rather than guessing in ways that are hard to undo. Verify every match fact against the official scorecard; never invent match events.  
18\. Prefer the smallest change that meets the requirement; no rewrites without cause.  
19\. Do not claim a feature works unless it has been run and tested.  
20\. Maintain a task log (TASK-IDs, status) in \`docs/progress.md\`.  
21\. Never use real broadcast footage or third-party brand logos/UI; disclose simulated friends in the UI.  
22\. The owner places \`GEMINI\_API\_KEY\` and \`SARVAM\_API\_KEY\` in \`.env\` and in Vercel. Never ask for keys in chat, never print or log them, never commit \`.env\`; keys are used only in serverless functions and local build scripts.  
23\. AI must work live for the reviewer: prefer live Gemini/Sarvam calls with look-ahead prefetch; use precomputed content only as a safety net.

\---

\#\# Appendix A — Assignment deliverables

From the Dream11 email (CONFIRMED):  
\- A \*\*link to the working artifact\*\*.  
\- A \*\*note of at most 200 words\*\* covering: (1) the fan problem and why it matters; (2) the product hypothesis; (3) how the solution helps and why it was designed this way; (4) which AI tools were used and for what.  
\- Evaluation criteria: product hypothesis, conceptualisation, building it out (works as claimed), design (look and feel during a live match).  
\- Rule: the idea must be the owner's own; AI may be used to build.  
\- Submission form: https\://forms.gle/s3dxPxAd8Jw7w3an7  
\- Next steps: virtual demo round (walk through what was built and why), then in-person final in Mumbai.

Demo-round talking points prepared in discussion (PROPOSED): why desktop ("built for easy evaluation; same experience translates to an Android overlay next"); what's next (real extension, automatic/audio-fingerprint sync, Android overlay, iOS via Dynamic Island); why not WhatsApp/Discord (ball-sync, gang-aware AI, per-match memory, zero switching, Dream11 friend groups).

\#\# Appendix B — Decision history

1\. Owner proposed two problems: (1) missing friends while watching; (2) casual fan lacks player context.  
2\. Owner chose problem 1\.  
3\. Owner's answers defined the moment (teasing when a friend's player fails), ritual (laugh), friends watching elsewhere, desired feeling (wholesome, shared).  
4\. Owner selected frictions F1–F3; reframed product as "our version of the commentary"; liked pieces A, B, C.  
5\. Brainstorm of ideas borrowed from movie streaming; owner liked \#1 (while you were away), \#2 (come back), \#4 (players as characters), \#5 (tournament as series).  
6\. Recommendation: adopt \#1, fold \#4 invisibly into B, defer \#2, drop \#5.  
7\. Owner: don't adopt "3" (ambiguous — D-1), adopt \#2, treat each match as a session with preserved memories; asked about Discord/WhatsApp differentiation → ball-pinned sync, gang-aware AI, per-match memory, zero switching, Dream11 fit; Gang Calls proposed.  
8\. Consolidated concept presented (Match Rooms: before / live / away / after).  
9\. Owner: product is not a streaming app — it sits above any streaming app → overlay concept.  
10\. Owner: not mobile for now (evaluation concerns) → desktop; browser extension concept; demo link recommended.  
11\. Owner: asked if an extension can work over any app (answer: any website in a browser, not native apps); chose \*\*voice-first\*\* → walkie-talkie clips pinned to the ball, ducking, queue, text fallback, AI transcription/prompts/audio wrap.  
12\. Owner requested this specification (v1.0).  
13\. Owner chose: 5th T20I NZ v IND (1 Nov 2026, Hamilton); name Fun-Banter; English; AI voices; stylised scoreboard view; "3" \= spoiler protection (excluded); Gang Calls in; extension only after the demo link.  
14\. Owner: AI should happen live for the reviewer; friends should be created by the build rather than supplied by the owner.  
15\. Owner chose Gemini (text) and Sarvam (TTS \+ STT) as AI providers; will supply both keys and a Vercel account. Spec updated to v1.1.  
16\. 2026-11-15 — Owner renamed the product from Fun-Banter to \*\*Our Commentary Box\*\* (UI short form \"Our Box\", slug \`ourcommentarybox\`, tagline \"The best commentary is your friends.\"). This echoes item 4, where the owner first framed the product as \"our version of the commentary\". The IndexedDB name stays \`fun-banter\` (ADR-0010). Spec updated to v1.1.1.  
17\. 2026-11-15 — Owner renamed the product again, to \*\*Apna Commentary Box\*\* (UI short form \"Apna Box\", slug \`apnacommentarybox\`). Tagline and \"box\" copy kept. Owner confirmed the standard spelling \"Commentary\". IndexedDB name still \`fun-banter\` (ADR-0012). Spec updated to v1.1.2.  
18\. 2026-11-16 — v1.3 change request (live feel, Hinglish, 3-minute evaluator journey) and its amendment (open-ended live match, Behind the scenes, /how-it-works, one panel / two hosts with a Chrome extension) applied autonomously; every choice is recorded in ADR-0013 to ADR-0017 and §1.1 \#15–\#22. Spec updated to v1.3.

