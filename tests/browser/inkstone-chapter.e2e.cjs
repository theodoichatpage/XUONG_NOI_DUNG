// Real Adapter in Chromium against a MOCK Inkstone create-chapter page: title + body (via the page's TinyMCE, main world), never save/publish.
// Usage: NODE_PATH=<dir with playwright> node tests/browser/inkstone-chapter.e2e.cjs
const { chromium } = require('playwright'); const fs = require('fs'), os = require('os'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..'), EXT = path.join(ROOT, 'extension-publisher'), MOCK = fs.readFileSync(path.join(ROOT, 'tests', 'fixtures', 'inkstone-chapter-mock.html'));
const BOOK = '123456789012', URL_ = 'https://inkstone.webnovel.com/novels/chapter/create/' + BOOK;
const sleep = ms => new Promise(r => setTimeout(r, ms)); const results = []; const check = (n, ok, info) => { results.push(ok); console.log((ok ? 'PASS ' : 'FAIL ') + n + (info !== undefined ? ' — ' + JSON.stringify(info) : '')); };
(async () => {
  const ctx = await chromium.launchPersistentContext(fs.mkdtempSync(path.join(os.tmpdir(), 'xp-ink-')), { headless: true, channel: 'chromium', args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`] });
  await ctx.route('https://inkstone.webnovel.com/**', r => r.request().resourceType() === 'document' ? r.fulfill({ status: 200, headers: { 'content-type': 'text/html; charset=utf-8' }, body: MOCK }) : r.abort());
  let sw; for (let i = 0; i < 60 && !sw; i++) { sw = ctx.serviceWorkers()[0]; if (!sw) await sleep(500); }
  const body = 'The steward placed three tally sticks on the table.\n\n"Rent, interest, and unpaid labor," he said.\n\nShen Yan did not touch them.';
  // Xưởng's hand-over, as XP_INK_CHAPTER stores it (the opening of the tab itself is covered by unit tests).
  await sw.evaluate(async p => chrome.storage.local.set({ pendingInkChapter: { ...p, at: Date.now() } }), { bookId: BOOK, title: 'Water Has Its Own Price', body, chapterNo: 3 });
  const page = await ctx.newPage(); await page.goto(URL_, { waitUntil: 'domcontentloaded' });
  check('mock page is labelled as a mock', /MOCK INKSTONE/.test(await page.locator('#mock-label').innerText()));
  await page.waitForSelector('#xp-ink-chapter', { timeout: 20000 });
  const r = await page.evaluate(() => ({ title: document.querySelector('input[placeholder="Title Here"]').value, ps: [...document.querySelector('iframe').contentDocument.body.querySelectorAll('p')].map(p => p.innerText), set: window.__setContent, clicks: window.__clicks, report: document.getElementById('xp-ink-chapter').innerText }));
  check('title filled', r.title === 'Water Has Its Own Price', r.title);
  check('body set through TinyMCE as 3 paragraphs', r.set === 1 && r.ps.length === 3 && r.ps[1] === '"Rent, interest, and unpaid labor," he said.', r.ps);
  check('report shown, asks you to publish yourself', /Xưởng đã điền chương/.test(r.report) && /tự bấm publish/.test(r.report), r.report.split('\n').slice(0, 3));
  check('save / publish never clicked', r.clicks.length === 0, r.clicks);
  check('the hand-over is used once', await sw.evaluate(async () => !(await chrome.storage.local.get(['pendingInkChapter'])).pendingInkChapter));
  await page.screenshot({ path: path.join(os.tmpdir(), 'xp-ink-mock.png') });
  await ctx.close(); const failed = results.filter(x => !x).length; console.log(`\n${results.length - failed}/${results.length} checks passed`); process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
