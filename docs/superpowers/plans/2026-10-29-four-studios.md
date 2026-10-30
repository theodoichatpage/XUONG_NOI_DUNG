# Four-studio Interface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the existing site's navigation and four working screens using user-approved image references.
**Architecture:** Keep data/editor/Bridge functions, add a focused presentation module and CSS, use existing longform stage routing. Merge current packaging fixes into the working branch before editing.
**Tech Stack:** Buildless HTML, CSS, JavaScript; localStorage; existing XN Bridge.
**Spec:** docs/superpowers/specs/2026-10-29-four-studios-design.md

## Global Constraints
- Arial 14px; buttons 32px; no document scrolling in primary desktop views.
- Keep all existing records, IDs, metadata and human approval; do not introduce fake data.
- Existing main Site and current extension only.
- Two visual browser passes across all four screens before completion claim.

## Review Focus
- Empty and long project lists: pagination keeps controls accessible.
- Unsaved source forms: switching projects must not lose edits silently.
- Approved/live chapters: UI never overwrites them.
- Disconnected Bridge: useful error, no fake queued success.
- Refresh/backups: new print records persist alongside legacy records.

### Task 1: View model and shell
- [x] Write/run failing route, metrics, pagination and non-mutation tests in tests/studio-ui.test.cjs.
- [x] Implement dist/studio-ui.js model helpers and four-route shell; dist/studio-ui.css layout tokens.
- [x] Run node --test tests/*.test.cjs; verify existing tests remain green.
### Task 2: Four operational screens
- [x] Render overview and connect actual metrics/project/health data.
- [x] Render story form/library/approval/batch view using existing longform functions; keep advanced existing editors.
- [x] Render persisted print collections/assets/Etsy drafts with unavailable automation indicated.
- [x] Render settings and wire backup, restore, CSV, theme and Bridge refresh.
- [x] Verify state tests and actual UI create/edit/refresh actions.
### Task 3: Visual verification and publication
- [x] Browser pass 1: compare all four reference pictures with screenshots; fix observed issues.
- [x] Fresh whole-change review; fix important issues with regression tests.
- [x] Browser pass 2: all four pages plus alternate viewport, typography/control heights and no document overflow.
- [x] Run full tests, inspect diff, commit/update GitHub and publish the existing Site. Report limits honestly.
