# Sudowrite Adapter — Phase 1 survey

Date: 2026-11-05. Scope: what exists today in Xưởng Nội Dung, AI Manager and Sudowrite, and what the master prompt can and cannot rely on. Nothing in this phase was mocked or claimed as connected.

## 1. Xưởng Nội Dung (this repo)

| Item | Finding |
|---|---|
| Framework | Static site, plain JavaScript (no build step), served from `dist/` on Vercel (`vercel.json`: `outputDirectory: dist`). Main renderer `dist/studio-ui.js` (~200 KB). |
| Backend | **None.** No API routes, no serverless functions, no database server. |
| Storage | Browser `localStorage` key `xuong-noi-dung-v1` (`db.series`, `db.content`, `db.aiJobs`, `db.webnovelAccounts`, `db.vault`, `db.uiSettings`), plus backup export/import. Data lives in one browser profile; no cross-device sync. |
| Story Bible | `s.story.pipeline.artifacts` (concept, bible, characters, outline, style/glossary, listing), per-series `lfData(s)` (plans, characters, glossary, styleGuide). Built by ChatGPT jobs `GENERATE_CONCEPT/STORY_BIBLE/CHARACTERS/OUTLINE/STYLE_GLOSSARY`. |
| Chapters | `db.content` items: status `idea/draft/review/approved/live`, versions + history, `aiReview`, `qa{round,scores,status,version,scoredVersion}`, `publishedAccountId`, `link`. |
| ChatGPT link | **ChatGPT Bridge extension 0.4.14** (`extension/`): Xưởng posts a job, the extension types the prompt into chatgpt.com (user's ChatGPT Plus), captures the reply, returns it. No OpenAI API key. |
| Quality review | Already built: step 4 "Đánh giá & đăng", rubric `LF_RUBRIC` = plot 20, hook 20, characters 15, style 15, world 10, pacing 10, genre 10; target 85; automatic fix → rescore loop with max rounds (`uiQaTick`). |
| Batch production | `uiBatch*` writes N chapters in sequence; one job per chapter; resend on stall. |
| Publishing | Adapter (formerly Publisher) fills Inkstone's create form; user presses CREATE. Chapter posting not automated. |
| Adapter today | `extension-publisher/` = **Sudowrite Adapter 0.4.0**: Story Bible fill (Braindump, Genre, Synopsis; word limits 4000/40/4000; save on blur), "Lấy từ Sudowrite" (reads the open document into a chapter), Inkstone form fill. Card creation (Characters/Worldbuilding/Outline) is turned off after it misbehaved on the live site. |

## 2. AI Manager (`../AI_MANAGER`, read only — not modified)

- Local Python HTTP server on `127.0.0.1:8765` (`server.py`), SQLite queue per root folder, checkpoints, logs, Windows Automation Agent (loopback + random token).
- Built for **VIDEO_IMAGE_STUDIO** (endpoints `/api/studio-*`, `/api/queue`, `/api/automation`, `/api/ext/heartbeat`). Origin checks: Studio origin regex, `chrome-extension://`, or its own page.
- **No story, Xưởng, Sudowrite or Webnovel code or endpoint.** Sending production orders from Manager to Xưởng would need new code in AI_MANAGER, which the project rules forbid ("KHÔNG sửa AI_MANAGER").

## 3. Sudowrite

- **No public API, SDK or developer key** on docs.sudowrite.com or sudowrite.com. The only extension point is in-app **Plugins** (run inside Sudowrite, use the user's credits, read Story Bible through template variables; cannot be called from outside).
- **Terms & Conditions** (updated 2025-04-11) forbid using the service "to spam, phish, pharm, pretext, spider, crawl, or scrape" and to "interfere with or circumvent the security features". They say nothing about browser extensions or automated access in general. Sudowrite may suspend accounts that breach the terms.
- Live-site observations (this session): Story Bible fields are React textareas saved on blur, with word limits (Braindump 4000, Genre 40, Synopsis 4000, Characters 700, Outline 1700). Cards use TipTap editors and Radix menus; programmatic card creation produced blank duplicate rows. The editor exposes Write / First Draft / Generate buttons that spend credits.

## 4. OpenAI

- The user runs ChatGPT Plus through the Bridge and has asked to avoid paid APIs. No OpenAI key, no backend to hold one. An "OpenAI API via backend" connector would need a new backend (e.g. Vercel functions + a database) and paid API usage.

## 5. Master prompt vs reality

| Master-prompt module | Status today | Gap / constraint |
|---|---|---|
| A. Connection Manager | Partial: Bridge status card, Adapter ping | No Manager link (Manager can't be modified) |
| B. Sudowrite Connector | Partial: fill 3 fields, pull document | No API; writing/revising = clicking credit-spending buttons in a site whose terms forbid scraping → semi-automatic is the safe mode |
| C. OpenAI Connector | Replaced by ChatGPT Bridge | API route needs backend + paid key |
| D. Story Bible Processor | Built (pipeline + reference-link analysis) | Canon ledger/timeline fields partial |
| E. Chapter Production | Built for ChatGPT writer | Sudowrite as writer = semi-automatic |
| F. Quality Review (7 criteria, 85, rounds) | Built | Matches the master prompt's rubric |
| G. Task Queue | Built in-page (`db.aiJobs`, batch) | Not IndexedDB; survives reloads via localStorage |
| H. Sync | Xưởng is the single source of truth (browser) | No backend → no server-side conflict detection or multi-device |
| I. Publishing handoff | Partial (Inkstone form fill, user confirms) | Chapter posting page not mapped yet |
| Tech stack (TS/React/Vite/Zod) | Plain JS, no build | Rewrite would touch working code; can be adopted for the extension only |

## 6. Decisions needed before Phase 2

1. Sudowrite writing: **semi-automatic** (user presses Write/First Draft; Adapter prepares inputs and pulls results) or automated clicking of credit-spending buttons (terms/account risk).
2. Reviewer: keep **ChatGPT Plus via Bridge** (free, built) or add an **OpenAI API backend** (paid, new backend).
3. AI Manager: keep it **unchanged** (Adapter + Xưởng coordinate on their own) or lift the rule to add a story module to Manager.
4. Backend: keep **browser storage** as the source of truth, or build a backend for sync and multi-device.
5. Stack: rebuild only the **extension** in TypeScript + Vite + Zod, keep Xưởng as is.

Sources: https://docs.sudowrite.com/ · https://www.sudowrite.com/features/plugins · https://docs.sudowrite.com/using-sudowrite/1ow1qkGqof9rtcyGnrWUBS/how-do-i-build-plugins/a3iVxJb4UZLKfSxf8BG3mY · https://www.sudowrite.com/terms-and-conditions

## 7. Decisions (user, 2026-11-05)

1. Sudowrite writing: **semi-automatic**. The user presses Write / First Draft in Sudowrite; the Adapter prepares inputs and pulls results back. The Adapter never presses credit-spending buttons.
2. Reviewer: **ChatGPT Plus via the Bridge** (existing step 4 rubric and quality loop). No OpenAI API backend.
3. AI Manager: **may be modified** to add a story module that sends production orders.
4. Backend: **none for now**. Xưởng in the browser stays the single source of truth.
