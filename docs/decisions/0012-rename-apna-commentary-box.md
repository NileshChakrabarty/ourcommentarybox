# ADR-0012: Rename to Apna Commentary Box

**Date:** 2026-11-15 · **Status:** Accepted (owner instruction) · Supersedes the name in ADR-0010

The product is renamed from Our Commentary Box to **Apna Commentary Box** ("apna" is Hindi for "our own"). Everything
else in ADR-0010 still applies, with these values:

| | Before | Now |
|---|---|---|
| Full name | Our Commentary Box | **Apna Commentary Box** |
| Short form (app bar, panel label, app name) | Our Box | **Apna Box** |
| Slug (`package.json`, dev plugins, log prefix) | `ourcommentarybox` | **`apnacommentarybox`** |
| Tagline | "The best commentary is your friends." | unchanged |

- **Spelling.** The request said "Commentry". The owner was asked and confirmed the standard spelling "Commentary".
- **Kept as they were:** the tagline and the warm "box" copy ("Welcome to the box", "Your gang is in the box",
  "Back in the box?"). They work as well with "Apna".
- **Start screen.** The wordmark now reads "Apna / Commentary / Box" inside the marigold box (ADR-0011). "Apna" is
  wider than "Our" but still narrower than "Commentary", so the box size doesn't change.
- **IndexedDB is still `fun-banter`.** The reason is the same as ADR-0010: renaming it would orphan saved memories.
- **Dev tagging tool:** the key is now `apnacommentarybox-tag-v1`. It reads `ourcommentarybox-tag-v1`, then
  `fun-banter-tag-v1`, so local tags survive both renames. Reset clears all three. The bundle check blocks all three
  keys from `dist/`.
- **History.** The spec records this as §1.1 #14 (with #13 marked superseded) and Appendix B #17. The review docs'
  titles keep both earlier names. ADR-0010 keeps its file name, because it records that earlier rename.
- **Not renamed:** the local folder (`ourcommentarybox`), the git remote and any Vercel project or domain. These live
  outside the repo and are the owner's to change.
