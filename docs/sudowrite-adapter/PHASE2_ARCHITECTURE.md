# Sudowrite Adapter — Phase 2 architecture

Builds on the Phase 1 survey and the user's decisions (semi-automatic Sudowrite, ChatGPT Plus via the Bridge as reviewer, AI Manager may be extended, no backend). Contracts are in `PHASE2_PROTOCOL.md` and `shared/schemas/`.

## 1. Components and responsibilities

```
 AI Manager (Python, 127.0.0.1:8765)          Xưởng (browser tab, source of truth)
 ┌──────────────────────────────┐             ┌──────────────────────────────────────┐
 │ story module (new)           │             │ db.series / db.content / db.aiJobs   │
 │  - production orders (SQLite)│             │ db.storyOrders (new)                 │
 │  - order events / progress   │             │ batch + quality loop (exists)        │
 │  - pairing token             │             │ order executor (new)                 │
 └──────────────▲───────────────┘             └───────────▲───────────────┬──────────┘
        HTTP + Bearer token                   window.postMessage           │ jobs
                │                              (studio-content.js)         ▼
 ┌──────────────┴──────────────────────────────────────────┴───┐   ChatGPT Bridge 0.4.x
 │ Sudowrite Adapter (extension, MV3)                           │   (writer / reviewer /
 │  background: order poller, outbox, router, state            │    fixer via chatgpt.com)
 │  content: studio-content, sudowrite-content, inkstone-content│
 └──────────────────────────────┬───────────────────────────────┘
                                │ DOM (fill fields, read doc, banner) — never presses Write/Generate
                          Sudowrite editor          Inkstone (create form; user presses CREATE)
```

| Component | Owns | Never does |
|---|---|---|
| AI Manager story module | Orders the user creates, their progress, pairing token | Store chapters; talk to Sudowrite or ChatGPT |
| Sudowrite Adapter | Transport + routing, outbox, Sudowrite/Inkstone DOM work | Decide quality, keep story data, press credit-spending or publish buttons |
| Xưởng | Story Bible, chapters, versions, reviews, approval, publish state | Accept commands that are not schema-valid and origin-checked |
| ChatGPT Bridge | Sending prompts to chatgpt.com and returning replies | Anything outside its job |

Xưởng stays the single source of truth. Manager only holds orders and a progress mirror built from Xưởng's events.

## 2. Production flow

1. **Order** — In Manager the user creates an order: project (Xưởng series id), chapter range, writer (`chatgpt` or `sudowrite`), reviser (`chatgpt` or `sudowrite`), target words, threshold 85, max rounds 3. Manager stores it as `queued`.
2. **Pickup** — The Adapter polls Manager every 30 s (`chrome.alarms`) and on popup open. For each `queued` order it needs an open Xưởng tab; without one the order stays `queued` and the popup says "Mở Xưởng để nhận lệnh".
3. **Accept** — Xưởng validates the order, checks the series exists and `story_bible_version` matches, de-duplicates by `order_id`, then replies `accepted` or `rejected` (with reason). The Adapter reports the result to Manager.
4. **Chapter jobs** — Xưởng creates one job per chapter with key `order_id:chapter_no`. It reuses the existing chapter record for that number; approved or published chapters are skipped (`skipped_existing`), never duplicated.
5. **Writing**
   - `chatgpt`: the existing batch writer (`uiChapterWrite`) runs through the Bridge.
   - `sudowrite` (semi-automatic): Xưởng builds a **Sudowrite brief** (chapter outline beats, end of the previous chapter, canon notes, word target). The Adapter opens the Sudowrite project and shows a banner with the brief, "Sao chép", and "Gửi chương về Xưởng". The user writes with Write / First Draft, then presses the banner button; the Adapter reads the document into the chapter. Job state: `waiting_user`.
6. **Review** — Xưởng runs the step-4 review (rubric v3: 7 criteria plus strengths, weaknesses, contradictions, critical_errors, revision_instructions). Xưởng computes the total itself; the AI's own total is ignored.
7. **Decision**
   - total ≥ threshold and no critical errors or contradictions → `review_passed` (waits for the user's approval in step 4).
   - Otherwise → `revising`, round +1, using the **latest** version. Reviser `chatgpt` = existing fix mode; reviser `sudowrite` = banner with revision instructions, user rewrites, presses "Gửi chương về Xưởng".
   - After `max_revision_rounds` without passing → `human_review`.
8. **Approval and publishing** — The user approves (version locks) → `approved` → `ready_to_publish`. Publishing still needs the user's confirmation on Inkstone. `published` is set only with evidence (chapter link saved).

## 3. Chapter job state machine

| State | Meaning | Next |
|---|---|---|
| `queued` | Created, not started | `writing`, `waiting_user`, `paused`, `cancelled`, `skipped_existing` |
| `writing` | ChatGPT is writing or fixing | `reviewing`, `failed`, `paused` |
| `waiting_user` | Waiting for the user to write or rewrite in Sudowrite and press "Gửi chương về Xưởng" | `reviewing`, `paused`, `cancelled` |
| `reviewing` | Scoring via the Bridge | `review_passed`, `revising`, `failed` |
| `revising` | Revision round in progress | `writing` (ChatGPT) or `waiting_user` (Sudowrite) |
| `review_passed` | ≥ threshold, no blocking issues; waits for the user | `approved`, `revising` (if the user asks) |
| `human_review` | Max rounds reached | `approved`, `revising` (user decision) |
| `approved` | User approved; version locked | `ready_to_publish` |
| `ready_to_publish` | Waiting for the user to publish | `published`, `publish_failed` |
| `published` | Link saved as evidence | final |
| `failed` | Retries exhausted (see §5) | `queued` (user retry) |
| `paused` / `cancelled` | User control | resume → previous state / final |
| `skipped_existing` | Chapter already approved or live | final |

Order state is derived: `queued → accepted → running → done | partially_done | cancelled | rejected`.

## 4. Idempotency and duplicates

- Manager: `idempotency_key` is unique; re-submitting returns the existing order.
- Adapter: forwards an order to Xưởng until it receives an `accepted`/`rejected` ack; repeats are safe.
- Xưởng: `db.storyOrders[order_id]` is written once; a repeat returns the stored ack. Chapter identity is `(series_id, chapter_no)`. A job never creates a second content record for the same number.
- Events: each has an `event_id`; Manager ignores repeats.
- Writing: a job re-sends a prompt only when the Bridge reports a stalled job (existing auto-resend, max 2). Steps already done (a scored version) are not repeated.

## 5. Retries, recovery, interruption

| Failure | Handling |
|---|---|
| Bridge job stalls / ChatGPT error | Existing resend (2 tries), then `failed` with the message |
| Review JSON invalid | Reject and re-ask once (existing validator), then `failed` |
| Manager unreachable | Adapter keeps events in its outbox (`chrome.storage.local`, max 500) and retries with backoff 5 s → 10 s → … → 5 min |
| Service worker stopped | State lives in `chrome.storage`; the alarm restarts polling; nothing kept only in memory |
| Xưởng tab closed / reloaded | Jobs persist in localStorage; on load Xưởng resumes ticks (existing) and re-sends the state of open orders |
| Browser restarted | Same as above; Adapter re-syncs open orders with Xưởng (`XP_ORDER_STATUS`) |
| Sudowrite page changed (selectors missing) | Adapter reports `selector_missing` with the field name; job stays `waiting_user`; no guessing |
| Story Bible changed after the order | Xưởng rejects at accept time (`bible_version_conflict`); running orders pause on the next chapter |

## 6. Security

- **Manager ↔ Adapter:** pairing. Manager shows a one-time pairing code; the user pastes it into the Adapter popup; the Adapter exchanges it for a random 32-byte token (`POST /api/story/pair`). Manager pins the extension origin (`chrome-extension://<id>`) on pairing and then requires `Authorization: Bearer <token>` and that origin on every story call. "Thu hồi" in Manager rotates the token. Manager stays bound to 127.0.0.1.
- **Adapter ↔ Xưởng:** only through `studio-content.js` on the configured Xưởng origins, with an allow-list of message kinds; every payload is schema-checked on both sides.
- **Adapter ↔ Sudowrite/Inkstone:** content scripts on those exact origins only; they fill fields and read the open document; they never press Write, Generate, Create or publish buttons.
- No API keys exist anywhere; no cookies or tokens are logged; drafts are sent only to ChatGPT (the user's Bridge) and Sudowrite (the user's own project).
- No `eval` or remote code; Manager returns data, never code.

## 7. Storage

| Where | What |
|---|---|
| Manager `~/.ai_manager/story/story.sqlite3` (new, separate from the video queue) | `story_orders`, `story_events`, `story_pairing` |
| Adapter `chrome.storage.local` | token, Manager URL, last Sudowrite project, pending Sudowrite kit, outbox, order→tab routing |
| Xưởng `localStorage` | `db.storyOrders` (new) plus existing series, content, jobs |

The master prompt suggests IndexedDB for the Adapter queue; the outbox is small (≤500 events), so `chrome.storage.local` is enough and survives service-worker restarts.

## 8. Technology

- **Adapter:** stays plain JavaScript (Manifest V3, no build step) so the existing ZIP packager, updater and Load-unpacked install keep working; contracts are enforced by JSON Schemas and tests. A TypeScript + Vite rebuild can come later without changing the contracts.
- **Manager story module:** Python stdlib (`http.server`, `sqlite3`), same style as the existing server.
- **Xưởng:** existing plain JS.

## 9. Phase plan from here

| Phase | Work |
|---|---|
| 3 | Adapter: pairing, Manager poller, outbox, popup status (Connected / Disconnected / Busy / Error). Manager: story module (pair, orders, events) + tests |
| 4 | Sudowrite connector: brief banner, "Gửi chương về Xưởng", selector health check. Review schema v3 in Xưởng |
| 5 | Story Bible processor gaps (timeline, canon ledger, open threads) |
| 6 | Xưởng order executor: accept/reject, chapter jobs, state machine, rounds, human review |
| 7 | Event sync Xưởng → Adapter → Manager, reconciliation after restarts |
| 8 | Manager story dashboard (orders, progress, score history) + publishing handoff states |
| 9 | Integration test with mocks, then a real run on one chapter; report real vs mock |
