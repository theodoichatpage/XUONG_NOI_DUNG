# Automatic Sudowrite writing (Adapter 0.7.0)

Decided 2026-11-05: the Adapter may press Sudowrite's credit-spending buttons for a chapter Xưởng sends as an **automatic** job. The semi-automatic banner ("Viết trên Sudowrite") still presses nothing.

## Flow

```
Xưởng step 3 "Tự viết trên Sudowrite"
  → brief (auto:true) → Adapter → Sudowrite tab
  → Outline chapter (name + summary) → Start → Generate a Rough Draft → Generate Scenes → Plan Draft → Generate Draft
  → read the document → Xưởng saves the chapter (old version kept in history)
  → ChatGPT reviews (Bridge) → total ≥ 85, no contradictions, no critical errors → "Đạt", waits for your approval
                              → below 85 → revise brief (round 1..3) with the reviewer's instructions → Sudowrite again
  → after 3 rounds still below 85 → "Cần bạn xem" (Human Review)
```

Revise rounds write the reviewer's instructions into the outline chapter summary ("Revision notes"), clear the document the Adapter created in round 0, and generate again. The same outline row and document are reused; nothing is created twice.

## Files

| File | Role |
|---|---|
| `extension-publisher/sudowrite-auto.js` | Engine in the Sudowrite tab: steps, waits, panel (pause / resume / retry / send / drop) |
| `extension-publisher/sudowrite-brief.js` | Background: one run per `job_key`, press record, stop reports (`XP_SUDO_STATUS`) |
| `dist/studio-ui.js` | Xưởng: button, `uiSudoSend(…,{auto:true})`, `uiSudoStatus`, quality loop sends fixes to Sudowrite |
| `shared/schemas/sudowrite-brief.schema.json`, `sudowrite-status.schema.json` | Contracts |
| `tests/sudowrite-auto.test.cjs` | Unit tests (background rules, Xưởng loop) |
| `tests/fixtures/sudowrite-mock.html`, `tests/browser/sudowrite-auto.e2e.cjs` | MOCK Sudowrite page and browser test |

## Safety rules (how they are enforced)

| Rule | How |
|---|---|
| No double press (credits) | Before Generate Scenes / Generate Draft the press is stored in the background (`run.pressed`), then clicked. A stored press is never repeated by the engine. |
| Reload while Sudowrite writes | After a reload a stored press is trusted only while Sudowrite is visibly busy. Otherwise the job stops with `needs_check`; you look at the page and choose "Gửi chương về Xưởng" or "Thử lại". |
| Never read while AI is writing | Done = nothing busy (no disabled progress button, no "Loading" on Write) **and** the text unchanged 3 checks in a row, 2 s apart. Timeouts only ever mean failure, never "done". |
| One runner | The first Sudowrite tab that claims a run owns it; other tabs only show it while the owner is alive (heartbeat < 20 s). |
| Same job sent twice | Same `job_key`, round and mode while running → `already:true`, no new run. |
| Out of credits | Page text "0 credits left" (or "sign up for a plan to keep using") → stop `out_of_credits`; Xưởng marks the chapter "Cần bạn xem" with the reason. Nothing retries until you press "Thử lại". |
| User content | A document is cleared only if the Adapter created it with Start. Otherwise `doc_not_empty`. |
| Pause | "Tạm dừng" takes effect after the current step (a running Sudowrite generation is not interrupted). |
| No publishing | The engine never approves or publishes; Xưởng's approval stays manual. |

Stop codes: `out_of_credits`, `sudowrite_error`, `timeout`, `needs_check`, `ui_changed`, `no_start`, `doc_not_empty`, `wrong_project`, `empty`, `deliver`, `lost`, `error`.

## What is verified where

| Step | Live Sudowrite (2026-11-05) | Mock page |
|---|---|---|
| Outline row name + summary | Verified (persists after reload) | Tested |
| Start → linked document | Verified, no credits | Tested |
| Generate a Rough Draft panel | Verified | Tested |
| Generate Scenes + progress texts | Verified (~50 s) | Tested |
| Plan Draft → Generate Draft, its done signal | **Not verified** — account had 0 credits | Tested (assumed behaviour) |
| Clearing the Adapter's document, Rough Draft button coming back | **Not verified** | Tested (assumed behaviour) |
| "0 credits left" message | Verified (text seen on Plan Draft) | Tested |

When the account has credits: run one chapter in the test project "XUONG TEST Adapter" and confirm the two unverified rows; adjust `sudowrite-auto.js` (`STEP.draft`, `STEP.clear`) and the mock if Sudowrite behaves differently.

## Results (2026-11-06, mock page)

15/15 browser checks pass:

- A: write → 70 → fix → 80 → fix → 90 → "Đạt". 3 Sudowrite runs, each pressed Generate Scenes and Generate Draft once; 1 outline row and 1 document reused; reviewer notes reached the outline summary. About 60 s.
- B: always 70 → 3 revise rounds → "Cần bạn xem"; no 4th run.
- C: 1 credit → stops at Plan Draft with `out_of_credits`; Xưởng shows the reason; Generate Draft never pressed.
- D: pause holds (nothing pressed); after resume, reloading the tab during Generate Draft → `needs_check`, no second press.

Bugs the run found and fixed: the credit check read `<script>` text (would have stopped on any page that embeds the phrase); a stop report was not delivered when no chapter was waiting.

## Running the browser test

Needs Playwright (Chromium) installed somewhere; the repo does not depend on it.

```bash
NODE_PATH=<folder with node_modules/playwright> node tests/browser/sudowrite-auto.e2e.cjs <screenshot folder>
```

It serves `dist/` on 127.0.0.1:8080, loads the Adapter into a throwaway profile, answers every `editor.sudowrite.com` request with the mock page, and stubs the ChatGPT reviewer with fixed scores.
