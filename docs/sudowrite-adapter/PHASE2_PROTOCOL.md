# Sudowrite Adapter — Phase 2 protocol and API contract

Schemas live in `shared/schemas/` (JSON Schema 2020-12); examples in `shared/examples/`. `tests/adapter-contracts.test.cjs` checks every example against its schema.

## 1. Manager story API (new, `http://127.0.0.1:8765/api/story/*`)

All responses are JSON. Errors: `{ "ok": false, "error": "<code>", "message": "<Vietnamese text>" }`.

| Method & path | Caller | Auth | Body → Response |
|---|---|---|---|
| `POST /api/story/pairing-code` | Manager page | Manager page origin | — → `{ok, code, expires_at}` (6 digits, 5 min, one use) |
| `POST /api/story/pair` | Adapter | Origin `chrome-extension://…` + valid code | `{code, extension_version}` → `{ok, token}`; pins the extension origin |
| `POST /api/story/revoke` | Manager page | Manager page origin | — → `{ok}`; token and pinned origin cleared |
| `GET /api/story/health` | Adapter | Bearer + pinned origin | → `{ok, manager_version, server_time}` |
| `POST /api/story/orders` | Manager page | Manager page origin | `production-order` (without `order_id`) → `{ok, order}`; same `idempotency_key` returns the existing order |
| `GET /api/story/orders?status=queued,accepted,running` | Adapter | Bearer | → `{ok, orders: production-order[]}` |
| `POST /api/story/orders/{order_id}/ack` | Adapter | Bearer | `order-ack` → `{ok}` |
| `POST /api/story/orders/{order_id}/control` | Manager page | Manager page origin | `{action: pause\|resume\|cancel}` → `{ok}`; queued for the Adapter |
| `GET /api/story/controls?since=<seq>` | Adapter | Bearer | → `{ok, controls: order-control[], next}` |
| `POST /api/story/events` | Adapter | Bearer | `{events: job-event[]}` (≤100) → `{ok, accepted, duplicates}` |
| `GET /api/story/orders/{order_id}` | Manager page | Manager page origin | → `{ok, order, chapters: [{chapter_no, state, round, score, version, updated_at}]}` |

Rules: the token is compared in constant time; requests with a browser `Origin` other than the pinned extension (for Adapter calls) or the Manager page (for page calls) get 403; bodies over 256 KB get 413. Manager stores events idempotently by `event_id`.

## 2. Adapter ↔ Xưởng messages (`window.postMessage` through `studio-content.js`)

Envelope (`adapter-message.schema.json`):

```json
{ "source": "XP_STUDIO_V1" | "XP_EXTENSION_V1", "requestId": "…", "kind": "…", "payload": { } }
```

Existing kinds stay: `XP_PING`, `XP_FILL_LISTING`, `XP_SUDO_FILL`, `XP_SUDO_PULL`.

New kinds:

| Kind | Direction | Payload | Reply |
|---|---|---|---|
| `XP_ORDER` | Adapter → Xưởng | `production-order` | `order-ack` |
| `XP_ORDER_CONTROL` | Adapter → Xưởng | `order-control` | `{ok}` |
| `XP_ORDER_STATUS` | Adapter → Xưởng | `{order_id}` | `{ok, chapters:[…]}` (for reconciliation) |
| `XP_JOB_EVENT` | Xưởng → Adapter | `job-event` | `{ok}` (Adapter queues it in the outbox) |
| `XP_SUDO_BRIEF` | Xưởng → Adapter | `sudowrite-brief` | `{ok, opened}` (Adapter shows the banner on Sudowrite) |
| `XP_SUDO_RESULT` | Adapter → Xưởng | `{job_key, title, body, words, url}` | `{ok, version}` |

Commands toward Xưởng (`XP_ORDER*`) travel as extension → page messages; `studio-content.js` posts them to the page only on configured Xưởng origins, and Xưởng re-validates every payload. Messages from the page to the extension stay on the allow-list.

## 3. Adapter ↔ Sudowrite content script (`chrome.tabs.sendMessage`)

| Kind | Payload | Reply |
|---|---|---|
| `XP_SUDO_READ` (exists) | — | `{ok, title, body, words, url}` |
| `XP_SUDO_SHOW_BRIEF` | `sudowrite-brief` | `{ok}` |
| `XP_SUDO_HEALTH` | — | `{ok, selectors: {braindump, genre, synopsis, editor, title}: boolean}` |

The banner's "Gửi chương về Xưởng" button sends `XP_SUDO_RESULT` (with the brief's `job_key`) to the background, which routes it to the Xưởng tab.

## 4. Review result v3 (`chapter-review.schema.json`)

Extends the current Xưởng review (`lfValidateChapterReview`, v2):

- Keeps `rubric.{plot,hook,characters,style,world,pacing,genre}.{score,why,fix}`, `contradictions[]`, `fixes[]`, `summaryVi`.
- Adds `strengths[]`, `weaknesses[]`, `critical_errors[]`, `revision_instructions[]`.
- Xưởng computes `total` (sum of clamped scores) and `verdict`: `pass` when total ≥ threshold and both `contradictions` and `critical_errors` are empty; otherwise `revise`. A total sent by the AI is ignored.

## 5. Versioning

- `story_bible_version`: Xưởng's `bibleRevision` for the series, raised whenever an approved Story Bible artifact (concept, bible, characters, outline, style) changes. Orders carry it; a mismatch gives `bible_version_conflict`.
- Chapter `version` = `bodyRevision`. Every event carries it; a review applies only to `scoredVersion === version`.
- Contracts carry `"schema": 1`. A breaking change bumps it; both sides reject unknown majors.
