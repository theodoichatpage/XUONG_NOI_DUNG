// Browser end-to-end test of automatic Sudowrite writing, against the MOCK Sudowrite page (tests/fixtures/sudowrite-mock.html).
// Real Xưởng code (dist on 127.0.0.1:8080) + real Adapter (extension-publisher) in a throwaway Chromium profile.
// The real editor.sudowrite.com is never contacted: every request to it is answered with the mock page or aborted.
// ChatGPT is not available in a test, so the reviewer is a labelled stub that returns fixed scores.
// Usage: NODE_PATH=<dir with playwright> node tests/browser/sudowrite-auto.e2e.cjs [shots dir]
const { chromium } = require('playwright'); const fs = require('fs'), os = require('os'), path = require('path'), { spawn } = require('child_process');
const ROOT = path.resolve(__dirname, '..', '..'), EXT = path.join(ROOT, 'extension-publisher'), DIST = path.join(ROOT, 'dist');
const MOCK = fs.readFileSync(path.join(ROOT, 'tests', 'fixtures', 'sudowrite-mock.html')); const SHOTS = process.argv[2] || os.tmpdir();
const PROJECT = 'https://editor.sudowrite.com/app/project/MOCKPROJ01';
const sleep = ms => new Promise(r => setTimeout(r, ms)); const results = []; const check = (name, ok, info) => { results.push({ name, ok: !!ok, info }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' — ' + JSON.stringify(info) : '')); };
async function until(fn, ms, every = 500) { const end = Date.now() + ms; while (Date.now() < end) { const v = await fn(); if (v) return v; await sleep(every); } return null; }

(async () => {
  const srv = spawn('python', ['-m', 'http.server', '8080', '--bind', '127.0.0.1', '--directory', DIST], { stdio: 'ignore' });
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'xp-auto-'));
  try {
    for (let i = 0; i < 40; i++) { try { await fetch('http://127.0.0.1:8080/'); break; } catch { await sleep(200); } }
    const ctx = await chromium.launchPersistentContext(path.join(tmp, 'p'), { headless: true, channel: 'chromium', viewport: { width: 1400, height: 900 }, args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`] });
    await ctx.route('https://editor.sudowrite.com/**', r => r.request().resourceType() === 'document' ? r.fulfill({ status: 200, headers: { 'content-type': 'text/html; charset=utf-8' }, body: MOCK }) : r.abort());
    let sw; for (let i = 0; i < 60 && !sw; i++) { sw = ctx.serviceWorkers()[0]; if (!sw) await sleep(500); }
    const run = async key => sw.evaluate(async k => (await chrome.storage.local.get(['sudoRuns'])).sudoRuns?.[k] || null, key);
    const sp = await ctx.newPage();
    const mockReset = async credits => { await sp.goto(PROJECT, { waitUntil: 'domcontentloaded' }); await sp.evaluate(() => localStorage.removeItem('mockSudo')); await sp.goto(PROJECT + '?credits=' + credits, { waitUntil: 'domcontentloaded' }); await sp.waitForSelector('#story-bible-outline'); };
    const presses = () => sp.evaluate(() => JSON.parse(localStorage.getItem('mockSudo')).presses);
    await mockReset(20);
    check('mock page is labelled as a mock', /MOCK SUDOWRITE/.test(await sp.locator('#mock-label').innerText()));

    // Xưởng with a test story in the throwaway profile; the reviewer stub gives scores from a list.
    const x = await ctx.newPage(); await x.goto('http://127.0.0.1:8080/#series'); await sleep(2500);
    await x.evaluate(() => {
      db.series.push({ id: 'e2eAuto01', title: 'E2E Auto', chapterLength: 1500, story: { plans: [2, 3, 4, 5, 6, 7].map(n => ({ kind: 'chapter', startChapter: n, title: 'Part ' + n, body: 'Shen Yan buys the field nobody wants. The headman laughs at him. At night he finds the old ledger under the floor.' })), glossary: [{ term: 'Shen Yan', kind: 'Nhân vật', note: 'protagonist' }] } });
      db.content.push({ id: 'e2eA1', seriesId: 'e2eAuto01', chapterNumber: 1, title: 'Chương 1', status: 'approved', body: 'The gate closed behind him.', history: [] });
      for (const n of [2, 3, 4, 5, 6, 7]) db.content.push({ id: 'e2eA' + n, seriesId: 'e2eAuto01', chapterNumber: n, title: 'Chương ' + n, status: 'draft', body: '', history: [] });
      save();
      const R = { 70: [14, 14, 10, 11, 7, 7, 7], 80: [16, 16, 12, 12, 8, 8, 8], 90: [18, 18, 14, 13, 9, 9, 9] }, keys = ['plot', 'hook', 'characters', 'style', 'world', 'pacing', 'genre'];
      window.__scores = {}; window.__reviews = [];
      // STUB REVIEWER (test only): stands in for ChatGPT via the Bridge.
      lfSend = async (s, kind, scope) => {
        if (kind !== 'REVIEW_CHAPTER') throw Error('stub: only REVIEW_CHAPTER');
        const c = db.content.find(v => v.id === scope.chapterId), list = window.__scores[c.id] || [90], total = list[Math.min(window.__reviews.filter(v => v === c.id).length, list.length - 1)];
        window.__reviews.push(c.id);
        const value = lfValidateChapterReview({ rubric: Object.fromEntries(keys.map((k, i) => [k, { score: R[total][i], fix: total < 85 ? 'Stub: tăng xung đột ở ' + k : '' }])), summaryVi: 'Stub reviewer ' + total, revision_instructions: total < 85 ? ['Stub: mở chương bằng cảnh chợ'] : [] });
        c.aiReview = { revision: lfVersion(c), value, at: new Date().toISOString() }; save();
        setTimeout(() => uiQaTick().catch(e => console.log('tick', e.message)), 300);
      };
    });
    const chapter = id => x.evaluate(i => { const c = db.content.find(v => v.id === i); return { qa: c.qa, words: (c.body.match(/\S+/g) || []).length, body: c.body, history: (c.history || []).length, jobs: Object.values(db.sudoJobs || {}).filter(j => j.chapterId === i) }; }, id);
    const startAuto = (id, scores) => x.evaluate(async ([i, sc]) => { window.__scores[i] = sc; const c = db.content.find(v => v.id === i), s = db.series.find(v => v.id === c.seriesId); uiPersist(() => c.qa = { round: 0, scores: [], sudoAuto: true }); try { await uiSudoSend(s, c, 'write', { auto: true }); return { ok: true }; } catch (e) { return { ok: false, error: e.message }; } }, [id, scores]);

    // ---- A: write → review 70 → Sudowrite fix → 80 → fix → 90 → passed (2 revise rounds, 3 Sudowrite runs)
    const t0 = Date.now();
    check('A: Xưởng hands the auto job to the Adapter', (await startAuto('e2eA2', [70, 80, 90])).ok);
    await sp.waitForSelector('#xp-sudo-auto', { timeout: 15000 });
    await until(async () => (await run('xw-ser-e2eAuto01:2'))?.done?.includes('scenes'), 60000);
    await sp.screenshot({ path: path.join(SHOTS, 'auto-A-running.png') });
    const doneA = await until(async () => { const c = await chapter('e2eA2'); return ['passed', 'needs-human'].includes(c.qa?.status) ? c : null; }, 6 * 60000, 1000);
    const pA = await presses();
    check('A: chapter passed after Sudowrite fixes', doneA?.qa?.status === 'passed', { status: doneA?.qa?.status, round: doneA?.qa?.round, scores: doneA?.qa?.scores, seconds: Math.round((Date.now() - t0) / 1000) });
    check('A: 2 revise rounds, each pressed Generate Scenes and Generate Draft exactly once', doneA?.qa?.round === 2 && pA.scenes === 3 && pA.draft === 3, pA);
    const applied = await sp.evaluate(() => JSON.parse(localStorage.getItem('mockSudo')).applied);
    check('A: revise rounds gave Sudowrite the reviewer’s notes (via the outline summary)', applied?.length === 3 && !applied[0] && applied.slice(1).every(Boolean), applied);
    check('A: Xưởng’s own checks found no errors in the final chapter', await x.evaluate(() => { const c = db.content.find(v => v.id === 'e2eA2'), s = db.series.find(v => v.id === c.seriesId); return lfChapterCheck(s, c.body).items.filter(i => i.level === 'error').length === 0; }));
    check('A: older versions kept in history', doneA?.history >= 2, doneA?.history);
    check('A: one outline row and one document reused across rounds', await sp.evaluate(() => { const s = JSON.parse(localStorage.getItem('mockSudo')); return s.rows.length === 1 && s.docs.length === 1; }));
    await x.bringToFront(); await x.evaluate(() => { view = 'series'; uiRender(); }); await x.screenshot({ path: path.join(SHOTS, 'auto-A-xuong.png') });

    // ---- B: always below 85 → after 3 rounds the chapter waits for you
    await mockReset(20);
    await startAuto('e2eA3', [70]);
    const doneB = await until(async () => { const c = await chapter('e2eA3'); return ['passed', 'needs-human'].includes(c.qa?.status) && !c.jobs.some(j => j.status === 'sent') ? c : null; }, 8 * 60000, 1000);
    const pB = await presses();
    check('B: 3 rounds below 85 → Cần bạn xem', doneB?.qa?.status === 'needs-human' && doneB?.qa?.round === 3, { status: doneB?.qa?.status, round: doneB?.qa?.round, note: doneB?.qa?.note, presses: pB });
    check('B: no 4th Sudowrite run', pB.draft === 4, pB);

    // ---- C: out of credits with the ChatGPT fallback OFF → stops, Xưởng is told, nothing retried
    await mockReset(1);
    await x.evaluate(() => { uiPersist(() => { (db.uiSettings ??= {}).sudoFallback = false; delete db.uiSettings.sudoCreditsOutAt; }); });
    await startAuto('e2eA4', [90]);
    const stopC = await until(async () => { const r = await run('xw-ser-e2eAuto01:4'); return r?.state === 'stopped' ? r : null; }, 90000);
    await sleep(4000);
    const cC = await chapter('e2eA4'), pC = await presses();
    check('C: run stops with out_of_credits', stopC?.code === 'out_of_credits', { code: stopC?.code, step: stopC?.step });
    check('C: Xưởng puts the chapter in Cần bạn xem with the reason', cC.qa?.status === 'needs-human' && /credit/.test(cC.qa?.note || ''), cC.qa?.note);
    check('C: Generate Draft never pressed, nothing retried', pC.draft === 0 && pC.scenes === 1, pC);
    await sp.bringToFront(); await sp.screenshot({ path: path.join(SHOTS, 'auto-C-credits.png') });

    // ---- C2: out of credits with the fallback ON (default) → ChatGPT writes the chapter instead (STUB writer: records the call)
    await mockReset(1);
    await x.evaluate(() => { uiPersist(() => { db.uiSettings ??= {}; delete db.uiSettings.sudoFallback; delete db.uiSettings.sudoCreditsOutAt; }); window.__gptWrites = []; uiChapterWrite = async (s, c, mode) => { window.__gptWrites.push({ chapter: c.id, mode }); }; });
    await startAuto('e2eA6', [90]);
    const gpt = await until(async () => { const w = await x.evaluate(() => window.__gptWrites); return w.length ? w : null; }, 90000);
    const cC2 = await chapter('e2eA6'), pC2 = await presses(), outAt = await x.evaluate(() => db.uiSettings.sudoCreditsOutAt || null);
    check('C2: Sudowrite out of credits → ChatGPT writes Chapter 6 instead', gpt?.[0]?.chapter === 'e2eA6' && gpt[0].mode === 'rewrite' && cC2.qa?.fallback === true, { gpt, qa: cC2.qa?.status });
    check('C2: Xưởng remembers the credits are out; Generate Draft never pressed', !!outAt && pC2.draft === 0, { outAt, presses: pC2 });
    await x.evaluate(async () => { const s = db.series.find(v => v.id === 'e2eAuto01'), c = db.content.find(v => v.id === 'e2eA7'); window.__gptWrites = []; await uiSudoSend(s, c, 'write', { auto: true }); });
    const direct = await x.evaluate(() => window.__gptWrites), pC3 = await presses();
    check('C2: the next auto job goes straight to ChatGPT (no Sudowrite press)', direct[0]?.chapter === 'e2eA7' && pC3.scenes === pC2.scenes, { direct, presses: pC3 });

    await x.evaluate(() => uiPersist(() => { delete db.uiSettings.sudoCreditsOutAt; }));
    // ---- D: pause / resume, then a reload while Sudowrite writes → no second press, asks you
    await mockReset(20);
    await startAuto('e2eA5', [90]);
    await sp.waitForSelector('#xp-sudo-auto button:has-text("Tạm dừng")', { timeout: 15000 });
    await sp.click('#xp-sudo-auto button:has-text("Tạm dừng")');
    await sleep(8000); const pausedRun = await run('xw-ser-e2eAuto01:5'), pD1 = await presses();
    check('D: paused job does not press anything', pausedRun?.paused && pD1.scenes === 0, { done: pausedRun?.done, presses: pD1 });
    await sp.click('#xp-sudo-auto button:has-text("Tiếp tục")');
    await until(async () => (await run('xw-ser-e2eAuto01:5'))?.pressed?.step === 'draft', 90000, 300);
    await sleep(800); await sp.reload({ waitUntil: 'domcontentloaded' });
    const stopD = await until(async () => { const r = await run('xw-ser-e2eAuto01:5'); return r?.state === 'stopped' ? r : null; }, 30000);
    await sleep(5000); const pD2 = await presses();
    check('D: reload during Generate Draft → stops with needs_check, Generate Draft pressed once', stopD?.code === 'needs_check' && pD2.draft === 1, { code: stopD?.code, presses: pD2 });
    await sp.screenshot({ path: path.join(SHOTS, 'auto-D-reload.png') });
    await ctx.close();
  } finally { srv.kill(); }
  const failed = results.filter(r => !r.ok).length; console.log(`\n${results.length - failed}/${results.length} checks passed`); process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
