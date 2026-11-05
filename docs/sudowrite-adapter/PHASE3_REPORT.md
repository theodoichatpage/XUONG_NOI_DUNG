# Sudowrite Adapter — Phase 3 report (Connection Manager)

Date: 2026-11-05.

## Files

| Repo | File | Change |
|---|---|---|
| AI_MANAGER | `story_orders.py` (new) | Story store (SQLite `~/.ai_manager/story/story.sqlite3`: orders, chapters, events, controls, pairing) and `/api/story/*` router |
| AI_MANAGER | `story.html` (new) | Page `http://127.0.0.1:8765/story`: pairing code, revoke, create order, order list with chapter progress, pause/resume/cancel |
| AI_MANAGER | `server.py` | Routes `/story` and `/api/story/*` to the module (body limit 256 KB) |
| AI_MANAGER | `tests/test_story_orders.py` (new) | 6 HTTP tests |
| XUONG_NOI_DUNG | `extension-publisher/manager.js` (new) | Pairing, 30 s polling (`chrome.alarms`), outbox with backoff, connection state |
| XUONG_NOI_DUNG | `extension-publisher/background.js`, `popup.html`, `popup.js`, `manifest.json` | Loads `manager.js`; popup shows Manager / Xưởng / Sudowrite / Inkstone status, pairing box, test button, waiting orders; adds `alarms` and `http://127.0.0.1:8765/*`; version 0.5.0 |
| XUONG_NOI_DUNG | `tests/publisher.test.cjs` | 5 new Manager-client tests |

## Done

- Pairing with a 6-digit one-time code (5 min); token 32 bytes; extension origin pinned; constant-time token check; revoke from Manager.
- Orders: validated (no unknown fields; rounds ≤ 3; threshold 50–100), idempotent by `idempotency_key`, overlapping chapter ranges of the same story refused while an order is open.
- Events: idempotent by `event_id`; a late older event never rolls a chapter back; order becomes `done` / `partially_done` when every chapter is finished.
- Controls (pause / resume / cancel) queued with a sequence number for the Adapter.
- Adapter: states Connected / Busy / Disconnected / Error / Unpaired; outbox survives service-worker restarts; retry 5 s → 5 min; events Manager rejects as invalid are dropped instead of retried forever.

## Tests

- Xưởng repo: `node --test tests/*.cjs` → 186 pass, 0 fail (Adapter 18, contracts 6).
- AI_MANAGER: `tests.test_story_orders` → 6 pass. Full suite: 253 tests; the same 4 failures as before this phase (`test_startup_port`, 2× `test_work_orchestration`, `test_windows_api_contract`), none in story code.
- **Real browser + real Manager** (Playwright Chromium loading the real extension; Manager from this code on a test port with a temporary data folder): pairing → "Đã kết nối"; a new order appears in the popup; a progress event reaches Manager; Manager stopped → "Mất kết nối", event kept; Manager back → event delivered, outbox empty; revoke → "Chưa ghép đôi".
  - Found and fixed during this run: Chrome sends no `Origin` header on the extension's GET requests. Manager now requires the token always, checks `Origin` when present, and refuses origin-less cross-site requests.

## Real vs mock

| Item | Status |
|---|---|
| Pairing, polling, outbox, revoke | Real (tested in Chromium against real Manager code) |
| Orders reaching Xưởng | Not yet: orders wait as "chờ Xưởng nhận" until Phase 6 |
| Progress events from Xưởng | Not yet: sent by tests only until Phase 7 |
| Your installed Cốc Cốc + your running Manager | Not tested: Manager must be restarted to load the new code; the extension must be reloaded |

## Limits

- One paired Adapter per Manager (pairing again replaces the old one).
- `/story` page has no link from the main Manager screen yet (Phase 8 dashboard).

## Next

Phase 4: Sudowrite connector (brief banner, "Gửi chương về Xưởng", selector health check) and review schema v3 in Xưởng.
