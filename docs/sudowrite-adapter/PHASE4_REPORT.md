# Sudowrite Adapter — Phase 4 report (Sudowrite connector + review v3)

Date: 2026-11-05. Adapter 0.6.0.

## Done

- **Review v3** (Xưởng step 4): the reviewer also returns `strengths`, `weaknesses`, `critical_errors`, `revision_instructions`. A critical error blocks approval at any score; Xưởng still computes the total itself. Step 4 shows critical errors on top, strengths/weaknesses, and "Việc cần làm khi sửa". Older reviews keep working.
- **Semi-automatic Sudowrite writing**:
  - Step 3 "Viết trên Sudowrite": Xưởng builds a brief (chapter plan, last 1,500 characters of the previous chapter, canon/glossary, word target) → Adapter opens or focuses the Sudowrite project → panel at bottom right with copy buttons.
  - The user writes with Sudowrite's own buttons; "Gửi chương về Xưởng" reads the open document and sends it back. Xưởng replaces the draft through the normal save path (old version in history). Approved/live chapters are refused and nothing is retried.
  - If Xưởng is closed, the chapter is kept by the Adapter and delivered when Xưởng opens (`XP_STUDIO_READY`).
  - Step 4 "Sửa trên Sudowrite": sends a revise brief with critical errors first, then the reviewer's instructions; the current chapter text is copied to the clipboard.
- **Page health**: the popup names missing Sudowrite parts (editor, title, Story Bible) instead of guessing.
- The Adapter never presses Write, Generate, Rewrite, First Draft or Create (checked by a test).

## Tests

- `node --test tests/*.cjs`: 197 pass (11 new in `tests/sudowrite-flow.test.cjs`, briefs checked against `sudowrite-brief.schema.json`, reviews against `chapter-review.schema.json`).
- Real browser (Chromium + real Adapter + real Xưởng code served locally + the user's saved Sudowrite page served at the real URL with all page scripts blocked): brief → panel → "Gửi chương về Xưởng" → chapter replaced (427 words, old draft in history); approved chapter refused, nothing kept; popup shows "Đang mở dự án".
  - Note: during one test run a tab opened by the extension loaded the real `editor.sudowrite.com` page once (plain page load in an empty test profile, no account). The test now opens the routed page itself.

## Real vs mock

| Item | Status |
|---|---|
| Brief → panel → send back → Xưởng | Real code, tested in a browser on a saved Sudowrite page |
| Live Sudowrite (your account) | Not tested yet |
| Review v3 with real ChatGPT | Not tested yet (prompt changed; validator tested) |

## Next

Phase 5: Story Bible processor gaps. Separate request from the user: restructure step 2 (remove duplicates, put Sudowrite higher, prefer Sudowrite results).
