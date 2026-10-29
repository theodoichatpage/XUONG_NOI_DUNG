# Bước 1 v0.5.0

Base: a80be84f5ef1c486facbdb148e2cf93c34e5b7db, branch integrate-xuong-truyen-v0.5.0, PR #1.

1. Replace story-longform-v2.js implementation in place; retire its overlapping fixes listener. Preserve workbench import/translation features without extending translation.
2. Add durable per-series initialization source, hierarchical DNA chunk analysis/aggregation, versioned concept/bible/characters/outline artifacts with explicit approval and stale dependency checks.
3. Route typed story jobs through the current XN text bridge; save raw results first and apply only to the matching stage/series, never chapter body for planning tasks. Preserve existing image jobs.
4. Integrate content metadata and approved-content guards directly in editor submit and AI result handlers. Revisions are separate records; approved→live is allowed without manuscript changes.
5. Add fixture-driven A–F tests with simulated ChatGPT JSON, browser smoke for forms/refresh, regressions, then inspect diff/PR. Real ChatGPT integration must be distinguished from simulated tests. Merge/deploy only when verification supports it.
