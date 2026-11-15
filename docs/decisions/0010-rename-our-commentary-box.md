# ADR-0010: Rename to Our Commentary Box

**Date:** 2026-11-15 · **Status:** Accepted (owner instruction)

The product is renamed from Fun-Banter to **Our Commentary Box**. The short form in the UI is **Our Box**, the slug is
`ourcommentarybox`, and the tagline is *"The best commentary is your friends."* The owner asked for no questions, so these
are the choices made during the rename:

- **Where each form is used.**
  - The full name appears on the start screen wordmark, in the page `<title>`, the meta description and `og:title`.
  - "Our Box" is used where space is tight: the app bar (its tooltip gives the full name), the panel's accessible name,
    `application-name` and `apple-mobile-web-app-title`.
  - The slug is used in `package.json`, the dev-server plugin names, console log prefixes and test fixtures.
- **Warm copy.** "Welcome to the box" is a small kicker above the wordmark. The tagline is the lede, with the old one-line
  description kept under it. "Back in the box?" sits next to the Resume button. "Your gang is in the box" is the feed's
  empty state before the first ball. The resume toast now reads "Back in the box. Picked up where you left off."
  Button labels are unchanged, so the tests and muscle memory still hold.
- **Wordmark size.** Three words at the old 128px size took over the start screen. It is now `clamp(52px, 7vw, 104px)`
  with `max-width: 9ch`, so it stacks one word per line ("Our / Commentary / Box"), which looks like a box. Checked at
  1440px and 390px wide.
- **Favicon.** The old icon had no text, and 16px is too small for letters. It changed from a circle to a rounded
  square (the "box"), with the same two speech marks and the same marigold colour. The SVG has a `<title>Our Box</title>`.
- **IndexedDB keeps the name `fun-banter`.** Renaming the database would make every saved memory and resumable room
  vanish for existing users. A copy-on-open migration is possible, but it adds a risky one-time path (it copies audio
  blobs and can fail partway) and gains nothing a user can see. The name is internal, so it stays, with a comment in
  `src/services/storage/db.ts` and a note in spec §10.6.
- **The dev tagging tool's localStorage key** moves to `ourcommentarybox-tag-v1`. It falls back to reading the old
  `fun-banter-tag-v1` key, so local tags carry over. Reset clears both keys. The bundle check blocks both keys from `dist/`.
- **History stays.** The old name is kept only where it records history: spec §1.1 (#1 superseded by #13), Appendix B
  (item 13, plus new item 16), the resolved Q-02 line, and the titles of the v1.1 audit and v1.2 redesign reviews.
  The root `PROJECT MASTER SPECIFICATION.md` is kept byte-identical to `docs/PROJECT_MASTER_SPECIFICATION.md`.
- **Not renamed:** the local folder and any Vercel project or domain. Those live outside the repo and are the owner's
  to change.
