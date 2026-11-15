# ADR-0015: The 3-minute evaluator journey, with nothing that needs explaining

**Date:** 2026-11-16 · **Status:** Accepted (v1.3 §3)

- **Landing.** One line, *"Watch with your gang, even when you're apart."*, and one button, **"Join the box"**.
  - No sign-up, no forms, no settings. The hero picker, the fixture and the transcript from ADR-0011 are gone. The
    box wordmark with the gang on its sill stays, as the brand.
  - The AI disclosure stays under the button: it is required by FR-002, and it is the "labelled as AI" requirement.
  - If a live room from before a reload is still on air, the same button rejoins it.
- **The gang is created for you:** you (India, Rohit as your hero), plus Dev, Ritu and Sunny. Each friend carries an
  "AI" tag in the gang row.
- **One coach hint only:** "Hold 🎤 or Space to talk", in the dock. It disappears when you talk or when your first card
  arrives.
- **One nudge, at 2 minutes:** "Step away for 20 s and come back." Sunny says it too. The away view counts the
  seconds, and "I'm back" turns primary once 20 s have passed.
- **The first wicket lands at about 38 s**, with friends reacting on that ball. Their voices duck the match audio.
- **The comeback card waits until the gang has spoken.** It comes `comebackCardDelaySec` (14 s) after the wicket,
  plus any time for the teases to finish, so it shows at about 55–60 s. It stays up to 45 s or until used. Saying the
  comeback (hold to talk) also counts as using it.
- **The wrap opens automatically at the end of the match, or on "Leave the box".**
  - It shows top moments (the wickets and sixes this viewer saw), the best line and a short audio reel (up to four
    clips).
  - It covers what this viewer experienced: from the ball they joined on to the ball they left on, and how many
    minutes.
  - Memories, the numbers and Gang Calls sit behind **More**.
- **Gang Calls is an extra, off by default.**
  - Its in-match card would compete with the first-minutes beats.
  - Behind "More" there is a checkbox: "Gang Calls next time". When on, the next room offers a call at the start of
    every fifth over, after the 3-minute guarantee window.
  - The choice is remembered in this browser.
- **Hidden** (the brief: "if an element isn't used in this journey, hide it"): chapters, rewatch, "Finish and see the
  wrap" (now "Leave the box"), the hero picker, the resume label and the call row (unless switched on).
