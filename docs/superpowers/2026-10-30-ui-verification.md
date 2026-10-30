# Four-studio interface verification — 2026-10-30

## Scope
Existing XUONG_NOI_DUNG presentation and workflows. No new Site, extension, API key, or production sample data. Merge current main packaging fixes into the ongoing integration branch.

## Visual review
Compared rendered browser screenshots with all four user-approved image references in two passes, at 1363 × 936 CSS pixels. Pass 1 found source controls crossing card boundaries, a cast/footer overlap, clipped chart axis labels, and Bridge/Etsy notes extending beyond cards. Corrected these before pass 2.

Pass 2: Overview, Story, Print, Settings — inspected screenshots and DOM geometry. Document height equals viewport height (936); no primary `.u-card`/`.u-section` content overflow. Input computed font Arial, 14px; primary button height 32px. Tested populated and initial empty states. Real records replace illustrative reference numbers and images; no claim of pixel identity at every viewport.

Additional 1100 × 760 iframe viewport review: source/cast and print production pages, settings data/operation page, overview. Document height 760; no visible primary-card overflow. Short screens use explicit section buttons and pagination, rather than hiding inaccessible controls. Desktop arrangement remains the four reference layouts.

## Functional checks
- Create print collection through UI; refresh #prints retains selected destination and collection.
- Restore QA backup through visible restore/confirm flow; book/cast/metrics/print data render correctly.
- Character editor paginates three fields per page; next-page and close buttons work.
- Existing Node regression suite: 51 passing tests (including routes, totals, pagination, restore recovery, stale source artifacts, chapter metadata/revisions/approval locks, typed Bridge result routing).
- Extension packaging Python suite: 3 passing tests.
- Fresh whole-change review completed; corrected important findings and added regression coverage.

## Limits
- Cloud QA browser has no user-installed Xưởng Bridge. Real ChatGPT send/receive is not claimed tested; disconnected state is shown truthfully. Automated tests cover routing/persistence logic.
- Automated product research and Etsy publishing are intentionally marked not integrated, as requested; scheduling is internal/manual until an official publishing integration exists.
- Advanced legacy editors and long text fields can have their own text scrolling. Primary desktop pages do not require document scrolling. Very narrow mobile layouts have not been verified in this pass.
