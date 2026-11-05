# Sudowrite Automation Map

Surveyed live on 2026-11-05 with Claude in Chrome, in the user's signed-in Chrome, **only in a new test project** "XUONG TEST Adapter" (`/app/project/9G4Gqm3zuElwmCzYL8w6`). The existing projects ("Project 1", "The Ashen Crown…") were not opened or changed. No cookies, tokens or internal endpoints were read or used; everything below is DOM interaction a user could do.

Write was run twice in the test project (Sudowrite credits used for 2 Write calls). Nothing else that spends credits was pressed.

Legend: **SUPPORTED** = verified live, including after a page reload. **PARTIAL** = works but needs the user for a step, or has a known quirk. **UNSUPPORTED** = not verified / not stable / not allowed. **Not tested** = not tried yet.

Automation policy (decided 2026-11-05 Phase 1): Sudowrite has no public API; its Terms forbid "spider, crawl, or scrape". The Adapter only works inside the user's own project, on the user's request, at human pace. Whether the Adapter may press credit-spending buttons (Write, Rewrite, First Draft, Generate…) is the user's decision; the current Adapter (0.6.0) does not.

## 1. Project list

| Function | Steps | Selector / method | Done when | Errors | Stability | Tested | Status |
|---|---|---|---|---|---|---|---|
| List projects | Read cards | `[role=button][aria-label^="Open project: "]` (name after the colon) | — | none found | High (aria-label) | Live | SUPPORTED (read) |
| Create blank project | Click New → Blank Project | `[data-testid=new-project-card] button[aria-label="Create new"]` → `[role=menu][aria-label="Create new"] button[role=menuitem]` text "Blank Project" | URL becomes `/app/project/<id>` | menu not shown → retry once | High | Live | SUPPORTED |
| Other create options | — | Same menu: Generate Project, Import Project, Folder, Series | — | — | — | Seen only | Not tested |
| Rename project | Click title → Ctrl+A → type → Enter | `[data-testid=project-top-bar-title]` (aria-label "… Select to edit project title.") | Title text equals new name | — | High | Live | SUPPORTED |

## 2. Story Bible (in the project page)

Story Bible sections render lazily: scroll the section into view and **wait until the element exists** before writing (never a fixed delay). Sidebar links: `[aria-label="Story Bible sections"] a[href="#story-bible-<section>"]`. Story Bible on/off: `input[type=checkbox][aria-label="Deactivate Story Bible"]`.

| Function | Selector / method | Write method | Done when | Stability | Tested | Status |
|---|---|---|---|---|---|---|
| Braindump | `#textarea-seed` | native value setter + `input` + `change` + real `blur()` (save happens on blur) | value equal after reload | High (id) | Live + reload | SUPPORTED |
| Genre | `#textarea-genre` (limit 40 words) | same | same | High | Live + reload | SUPPORTED |
| Synopsis | `#textarea-synopsis` (limit 4000 words) | same | same | High | Live + reload | SUPPORTED |
| Style | `#story-bible-style`: Featured Styles / Match My Style / Custom | — | — | — | Seen only | Not tested |
| Add character | `#story-bible-characters button[aria-label="Add Character"]` (Radix select): `pointerdown` opens; options `[role=option]` "Blank Character" / "Generate Character" (credits) / "Surprise Me" (credits); select with `pointerup` (+ `click` fallback) | — | new `[data-selectable]` card (`id=story-bible-character-<id>`) appears | Medium-high | Live | SUPPORTED (Blank only) |
| Character fields | inside the card: `[contenteditable][aria-label="Character name"]`, `"Personality value for Character"`, `"Motivations value for Character"`, `"Internal Conflict value for Character"`, `"Strengths value for Character"`, `"Weaknesses value for Character"`, `"Pronouns"`, `"Groups"`, `"Other Names"` | select contents → `execCommand('insertText')` or paste event → `blur()` | text present after reload | Medium (editors load lazily: scroll card into view, wait) | Live + reload (name, personality) | SUPPORTED |
| Add world element | `#story-bible-worldbuilding button[aria-label="Add Element"]`, options "Blank Element" / "Generate Element" / "Surprise Me" | — | new `[data-selectable]` card (`id=story-bible-worldbuilding-<id>`) | Medium-high | Live | SUPPORTED (Blank only) |
| World fields | name: contenteditable containing `[data-placeholder=Name]`; description: `[aria-label^="Description value"]` | insertText → blur | after reload | Medium (lazy) | Live + reload | SUPPORTED |
| Add outline chapter | `#story-bible-outline` button text "Add Chapter" (plain click) | — | new row `[id^="story-bible-outline-chapter-"]` with default name "Chapter 1" | Medium (button found by text) | Live | SUPPORTED |
| Outline chapter name | row `input[placeholder="Chapter Name"]` | native setter + input/change + blur | value after reload | High | Live + reload | SUPPORTED |
| Outline chapter summary | row `[contenteditable=true]` (appears after the row is in view) | insertText → blur | after reload | Medium (lazy) | Live + reload | SUPPORTED |
| Outline → draft chapter | each outline chapter shows "Start" ("Click Start when you're ready to draft your Chapter") | — | — | — | Seen only (credits) | Not tested |

Earlier failure explained: the old Adapter wrote to cards before their editors had loaded and did not wait for new rows, so rows kept "Chapter 1" and blank cards piled up. Fix: wait for the specific new element (by id not seen before) and for its editor, never assume timing.

## 3. Documents (chapters)

| Function | Selector / method | Done when | Stability | Tested | Status |
|---|---|---|---|---|---|
| New document menu | `button[aria-label="Add to project"]` (`pointerdown`): menuitems "Blank document", "Create from outline...", "Import document...", "New folder" | menu visible | High | Live (opened, closed) | SUPPORTED (menu); create not tested |
| Documents list | `[role=button][aria-label="<title>"]`, actions `button[aria-label='Actions for document "<title>"']` | — | High | Live | SUPPORTED (read) |
| Set document title | `textarea[aria-label="Edit Title"]`, native setter + blur | sidebar label changes to the new title; kept after reload | High | Live + reload | SUPPORTED |
| Put text into a document | editor: `[aria-label="Document editor"] .tiptap.ProseMirror`, fallback first `.tiptap.ProseMirror` not inside `[id^="story-bible-"]` and not `.mention-tiptap-editor` (the label is not always present). Select all → paste event with `text/plain` (blank lines become paragraphs) → blur | paragraphs present after reload | Medium-high | Live + reload | SUPPORTED |
| Read a document | editor children → paragraphs (`innerText`), title from Edit Title | — | Medium-high | Live | SUPPORTED |
| Export | — | — | — | Not tested | Not tested |

## 4. Writing with Sudowrite AI (spends credits)

| Function | Selector / method | Start signal | Done signal | Errors | Tested | Status |
|---|---|---|---|---|---|---|
| Write (continue at cursor) | place the caret at the end of the editor; `button[aria-label="Write"]` | a new `.card-set` appears first in `#card-sets` (right panel History); the Write button text becomes "Loading … Write" | the Write button text no longer contains "Loading" **and** the card text lengths stop changing (2 checks in a row) | nothing on screen if no credits / error: needs a timeout (no card-set within 30 s → failed) | Live ×2 | PARTIAL |
| Write results | `#card-sets .card-set` (newest first) → `.cards .card` (2 alternatives per run, ~150–170 words each); card text = card `innerText` minus its `.bottom_menu` | — | see above | — | Live | SUPPORTED (read) |
| Insert a result | card `.bottom_menu a.insert` | — | text appears in the editor at the caret | **quirk:** joins the first paragraph to the caret's paragraph with no space ("…believe it.The yellowed…") | Live | PARTIAL |
| Outline → chapter document | outline row button "Start" | — | a new document named after the outline chapter appears in the documents list, opens (`#doc=` changes), shows "Linked to <chapter> in your Outline"; **no credits used** | — | Live | SUPPORTED |
| Rough Draft wizard | in the linked document: `button[aria-label="Generate a Rough Draft"]` opens a generator panel (`[class*=GeneratePanel__InnerContainer]`): POV, length (Auto), tense, Prose Mode, "Plan Draft · All Scenes" | — | — | — | Live | SUPPORTED (opens) |
| Generate Scenes | draft panel button "Generate Scenes" (uses the outline summary + Story Bible) | button disabled with progress text: "Checking Characters…", "Checking Worldbuilding…", "Checking Style and Genre…", "Checking Synopsis and Outline…", "Reviewing Scenes Best Practices…", "Ensuring Perfect Formatting…" | scene text appears under "Scenes" and the panel returns to "Plan Draft · All Scenes" (~50 s) | — | Live (credits) | SUPPORTED |
| Plan Draft → Review Plan → Generate Draft | "Plan Draft · All Scenes", then "Generate Draft" | "Checking scenes…" | — | without scenes: "There was an error estimating credits for this chapter…" (Retry / Cancel). Out of credits: **"0 credits left, sign up for a plan to keep using Sudowrite."** | Live: blocked by 0 credits | UNSUPPORTED until the account has credits |
| Rewrite / Describe / Brainstorm / First Draft / Generate 3 Openings / Canvas | buttons with those labels | — | — | — | Seen only | Not tested |

Measured run (Write #2): card-set appeared at 0.4 s with a `.loading` element; text streamed from 4.4 s to 7.6 s; the Insert link and bottom menu were **already present while streaming**; "Loading" left the Write button at 10.8 s. So:

- **Never** treat the presence of Insert/bottom menu as "finished".
- The Write button is **not disabled** while writing → the Adapter must refuse a second press while "Loading" is present (anti-duplicate).
- Read results only after the done signal; compare with the previous read to avoid reading a half-written card.

## 5. Summary

| Area | Status |
|---|---|
| Create/rename test project | SUPPORTED |
| Story Bible text fields (Braindump, Genre, Synopsis) | SUPPORTED |
| Characters, Worldbuilding, Outline (blank cards + fields) | SUPPORTED (wait for lazy elements) |
| Style section | Not tested |
| Document title + text in/out | SUPPORTED |
| Write + reading results | PARTIAL (works; spends credits; needs the done signal above) |
| Insert result into document | PARTIAL (spacing quirk; build the chapter text in Xưởng instead) |
| Outline Start → linked chapter document | SUPPORTED (no credits) |
| Rough Draft: Generate Scenes | SUPPORTED (credits) |
| Rough Draft: Generate Draft (full chapter) | **Blocked: the account has 0 credits** |
| Rewrite, First Draft, Export | Not tested |

**Credits (2026-11-05):** after 2 Write runs and 1 Generate Scenes, Sudowrite reports "0 credits left, sign up for a plan". Any automated writing needs a paid plan. The Adapter must detect this message and stop the task as `out_of_credits` (never retry).

**Recommended chapter path:** Outline chapter (name + summary from Xưởng) → Start (linked document) → Generate a Rough Draft → Generate Scenes → Plan Draft → Generate Draft → wait for the done signal → read the document → Xưởng. Fallback with fewer credits: Write in a loop from a seeded opening until the word target.

## 6. When Sudowrite changes its UI

1. Open the Adapter popup: the Sudowrite line names any missing part (editor, title, Story Bible).
2. Re-run the probes in this file in a test project (all selectors above), update `extension-publisher/sudowrite-content.js`, and re-run `tests/sudowrite-flow.test.cjs` plus the browser test in `docs/sudowrite-adapter/`.
3. Prefer, in order: `id`, `aria-label`, `data-testid`, `placeholder`, visible text. Never mouse coordinates.
