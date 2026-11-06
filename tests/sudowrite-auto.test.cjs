// Adapter 0.7.0: automatic Sudowrite writing. Background run rules (one run per job, press recorded once,
// stop and report, pause / resume) and the Xưởng quality loop that sends fixes back to Sudowrite (max 3 rounds).
const test = require('node:test'), assert = require('node:assert/strict'), vm = require('node:vm'), fs = require('node:fs');
const { validate } = require('../shared/validate.cjs');
const schema = n => JSON.parse(fs.readFileSync('shared/schemas/' + n + '.schema.json', 'utf8'));
const plain = x => JSON.parse(JSON.stringify(x));

function adapter() {
  let receiver; const storage = {}, sent = [], tabs = { all: [] };
  const chrome = { runtime: { id: 'xp', getManifest: () => ({ version: '0.7.0' }), onMessage: { addListener(fn) { receiver = fn; } } },
    storage: { local: { async get(keys) { return Object.fromEntries(keys.map(k => [k, storage[k]])); }, async set(o) { Object.assign(storage, structuredClone(o)); }, async remove(k) { delete storage[k]; } } },
    tabs: { async query(q) { return tabs.all.filter(t => !q?.url || t.url.startsWith(q.url.replace('*', ''))); }, async update() {}, async create() {}, async sendMessage(id, msg) { sent.push([id, msg.kind, msg.msg?.kind, msg.msg?.payload]); return globalThis.__reply?.(id, msg); } },
    windows: { async update() {} }, alarms: { create() {}, onAlarm: { addListener() {} } } };
  const ctx = vm.createContext({ chrome, URL, Date, AbortController, setTimeout, clearTimeout, fetch: async () => { throw Error('offline'); }, importScripts: (...f) => f.forEach(n => vm.runInContext(fs.readFileSync('extension-publisher/' + n, 'utf8'), ctx)) });
  vm.runInContext(fs.readFileSync('extension-publisher/background.js', 'utf8'), ctx);
  const send = (m, s) => new Promise(r => receiver(m, { id: 'xp', ...s }, r)).then(plain);
  return { send, storage, sent, tabs };
}
const STUDIO = { url: 'https://xuong-noi-dung-khaki.vercel.app/#series', tab: { id: 1 } };
const SUDO = { url: 'https://editor.sudowrite.com/app/project/abc', tab: { id: 7 } }, SUDO2 = { url: 'https://editor.sudowrite.com/app/project/abc', tab: { id: 8 } };
const brief = { schema: 1, job_key: 'xw-ser-ser1:2', mode: 'write', chapter_no: 2, title: 'Chapter 2: The Field', beats: 'Shen Yan buys the field.', instructions: 'Adapter tự viết', target_word_count: 1500, auto: true };
async function started() { const a = adapter(); a.tabs.all = [{ id: 7, url: SUDO.url, active: true }]; await a.send({ kind: 'XP_SUDO_BRIEF', brief }, STUDIO); return a; }

test('auto brief: starts one run; sending the same round again does not restart it', async () => {
  const a = await started();
  const g = await a.send({ kind: 'XP_AUTO_GET' }, SUDO); assert.equal(g.brief.auto, true); assert.equal(g.run.state, 'running'); assert.deepEqual(g.run.done, []);
  await a.send({ kind: 'XP_AUTO_STEP', job_key: brief.job_key, patch: { step: 'outline', done: ['outline'], rowId: 'story-bible-outline-chapter-1' }, log: 'Xong' }, SUDO);
  const again = await a.send({ kind: 'XP_SUDO_BRIEF', brief }, STUDIO); assert.equal(again.already, true);
  assert.deepEqual((await a.send({ kind: 'XP_AUTO_GET' }, SUDO)).run.done, ['outline'], 'progress kept');
  assert.equal((await a.send({ kind: 'XP_AUTO_GET' }, STUDIO)).ok, false, 'only Sudowrite reads runs');
});
test('a semi-automatic brief has no run (the Adapter presses nothing)', async () => {
  const a = adapter(); a.tabs.all = [{ id: 7, url: SUDO.url }];
  await a.send({ kind: 'XP_SUDO_BRIEF', brief: { ...brief, auto: 'yes' } }, STUDIO);
  const g = await a.send({ kind: 'XP_AUTO_GET' }, SUDO); assert.equal(g.brief, null); assert.equal(a.storage.sudoRuns, undefined);
});
test('one tab runs a job: a second Sudowrite tab only watches while the first is alive', async () => {
  const a = await started();
  await a.send({ kind: 'XP_AUTO_GET' }, SUDO);
  const other = await a.send({ kind: 'XP_AUTO_GET' }, SUDO2); assert.equal(other.otherTab, true);
  assert.match((await a.send({ kind: 'XP_AUTO_STEP', job_key: brief.job_key, patch: { step: 'start' } }, SUDO2)).error, /tab Sudowrite khác/);
  a.storage.sudoRuns[brief.job_key].beat = Date.now() - 60000; // first tab gone quiet
  assert.equal((await a.send({ kind: 'XP_AUTO_GET' }, SUDO2)).otherTab, undefined);
});
test('a credit press is recorded before the click and kept; bad patch fields are dropped', async () => {
  const a = await started(); await a.send({ kind: 'XP_AUTO_GET' }, SUDO);
  const r = await a.send({ kind: 'XP_AUTO_STEP', job_key: brief.job_key, patch: { step: 'scenes', pressed: { step: 'scenes', at: 5, base: 120 }, docUrl: 'https://evil.example/x', state: 'done', done: ['outline', 'hack'] } }, SUDO);
  assert.deepEqual(r.run.pressed, { step: 'scenes', at: 5, base: 120, baseDoc: 0 }); assert.equal(r.run.docUrl, null); assert.equal(r.run.state, 'running'); assert.deepEqual(r.run.done, ['outline']);
  assert.deepEqual((await a.send({ kind: 'XP_AUTO_GET' }, SUDO)).run.pressed.step, 'scenes', 'survives a reload of the Sudowrite tab');
});
test('out of credits: the run stops, Xưởng is told once, nothing retries until you press Thử lại', async () => {
  const a = await started(); await a.send({ kind: 'XP_AUTO_GET' }, SUDO); a.tabs.all.push({ id: 1, url: STUDIO.url });
  const got = []; globalThis.__reply = (id, m) => { if (m.kind === 'XP_TO_PAGE') { got.push(m.msg); return { ok: true }; } };
  const f = await a.send({ kind: 'XP_AUTO_FAIL', job_key: brief.job_key, code: 'out_of_credits', error: 'Sudowrite báo hết credit', step: 'draft' }, SUDO);
  assert.equal(f.run.state, 'stopped'); assert.equal(f.run.code, 'out_of_credits');
  assert.equal(got.length, 1); assert.equal(got[0].kind, 'XP_SUDO_STATUS'); assert.deepEqual(validate(schema('sudowrite-status'), plain(got[0].payload)), []); assert.deepEqual(a.storage.sudoStatus, []);
  await a.send({ kind: 'XP_AUTO_FAIL', job_key: brief.job_key, code: 'timeout', error: 'x' }, SUDO); assert.equal(got.length, 1, 'a stopped run is not reported twice');
  const res = await a.send({ kind: 'XP_AUTO_RESUME', job_key: brief.job_key }, SUDO); assert.equal(res.run.state, 'running'); assert.equal(res.run.error, null);
  globalThis.__reply = null;
});
test('a stop report waits until Xưởng is open', async () => {
  const a = await started(); await a.send({ kind: 'XP_AUTO_GET' }, SUDO);
  await a.send({ kind: 'XP_AUTO_FAIL', job_key: brief.job_key, code: 'ui_changed', error: 'Không thấy nút', step: 'rough' }, SUDO);
  assert.equal(a.storage.sudoStatus.length, 1);
  a.tabs.all.push({ id: 1, url: STUDIO.url }); globalThis.__reply = (id, m) => m.kind === 'XP_TO_PAGE' ? { ok: true } : undefined;
  await a.send({ kind: 'XP_STUDIO_READY' }, STUDIO); assert.equal(a.storage.sudoStatus.length, 0); globalThis.__reply = null;
});
test('Thử lại after needs_check clears the recorded press (you checked the page); other stops keep it', async () => {
  const a = await started(); await a.send({ kind: 'XP_AUTO_GET' }, SUDO);
  await a.send({ kind: 'XP_AUTO_STEP', job_key: brief.job_key, patch: { pressed: { step: 'draft', at: 1 } } }, SUDO);
  await a.send({ kind: 'XP_AUTO_FAIL', job_key: brief.job_key, code: 'timeout', error: 'x' }, SUDO);
  assert.equal((await a.send({ kind: 'XP_AUTO_RESUME', job_key: brief.job_key }, SUDO)).run.pressed.step, 'draft');
  await a.send({ kind: 'XP_AUTO_FAIL', job_key: brief.job_key, code: 'needs_check', error: 'x' }, SUDO);
  assert.equal((await a.send({ kind: 'XP_AUTO_RESUME', job_key: brief.job_key }, SUDO)).run.pressed, null);
});
test('pause and resume; the chapter result ends the run; a new round keeps the Adapter’s document', async () => {
  const a = await started(); await a.send({ kind: 'XP_AUTO_GET' }, SUDO);
  assert.equal((await a.send({ kind: 'XP_AUTO_PAUSE', job_key: brief.job_key, paused: true }, SUDO)).run.paused, true);
  assert.equal((await a.send({ kind: 'XP_AUTO_PAUSE', job_key: brief.job_key, paused: false }, SUDO)).run.paused, false);
  await a.send({ kind: 'XP_AUTO_STEP', job_key: brief.job_key, patch: { docUrl: 'https://editor.sudowrite.com/app/project/abc#doc=d1', created: true } }, SUDO);
  await a.send({ kind: 'XP_SUDO_RESULT', result: { job_key: brief.job_key, body: 'Chapter text', title: 'Chapter 2: The Field' } }, SUDO);
  assert.equal(a.storage.sudoRuns[brief.job_key].state, 'done');
  await a.send({ kind: 'XP_SUDO_BRIEF', brief: { ...brief, mode: 'revise', round: 1, revision_instructions: ['Mở bằng cảnh chợ'] } }, STUDIO);
  const r = a.storage.sudoRuns[brief.job_key]; assert.equal(r.state, 'running'); assert.equal(r.round, 1); assert.deepEqual(r.done, []); assert.equal(r.docUrl, 'https://editor.sudowrite.com/app/project/abc#doc=d1'); assert.equal(r.created, true);
  await a.send({ kind: 'XP_SUDO_DISMISS', job_key: brief.job_key }, SUDO); assert.equal(a.storage.sudoRuns[brief.job_key].state, 'cancelled');
});

// ---- Content script rules (static checks of extension-publisher/sudowrite-auto.js)
test('credit buttons are pressed only through the recorded, once-per-step press', () => {
  const src = fs.readFileSync('extension-publisher/sudowrite-auto.js', 'utf8');
  assert.equal((src.match(/creditPress\('/g) || []).length, 2, 'Generate Scenes and Generate Draft');
  assert.match(src, /async function creditPress[^\n]*if\(run\.pressed\?\.step===step\)/, 'a recorded press is never repeated');
  assert.match(src, /await mark\(\{pressed:rec\}[^)]*\);pressedHere\.add\(step\);await press\(b\)/, 'recorded before the click');
  assert.match(src, /if\(pressedHere\.has\(step\)&&\(busy\(\)\|\|started\(run\.pressed\)\)\)return run\.pressed;if\(!pressedHere\.has\(step\)&&busy\(\)\)/, 'after a reload, page text alone is never trusted');
  assert.match(src, /if\(!busy\(\)&&ready\(\)\)/, 'results are read only when nothing is busy');
  assert.match(src, /0 credits left/);
  assert.match(src, /function pageText\(\)\{let t=document\.body\.innerText/, 'error texts are read from visible text only, never from <script>');
  assert.match(src, /if\(!run\.created\)stop\('doc_not_empty'/, 'only the Adapter’s own document is cleared');
  const manifest = JSON.parse(fs.readFileSync('extension-publisher/manifest.json', 'utf8'));
  assert.deepEqual(manifest.content_scripts.find(c => c.matches[0].startsWith('https://editor.sudowrite.com')).js, ['sudowrite-content.js', 'sudowrite-auto.js']);
});

// ---- Xưởng side: the quality loop sends fixes to Sudowrite and stops at 3 rounds
function studio() {
  const src = fs.readFileSync('dist/studio-ui.js', 'utf8'), store = {};
  const s = { id: 'ser1', title: 'Ashen', chapterLength: 1500, story: { plans: [{ kind: 'chapter', startChapter: 2, title: 'The Field', body: 'Shen Yan buys the field nobody wants.' }], glossary: [], characters: [], pipeline: { source: {} } } };
  const ch = (n, status, body) => ({ id: 'c' + n, seriesId: 'ser1', chapterNumber: n, title: 'Chương ' + n, status, body, history: [], bodyRevision: 1 });
  const content = [ch(1, 'approved', 'The gate closed behind him.'), ch(2, 'draft', 'Old draft of two.')];
  const c = vm.createContext({ db: { series: [s], content, channels: [], printProjects: [], assets: [], workflows: [], metrics: [], aiJobs: [], uiSettings: {} }, Date, structuredClone, today: () => '2026-11-06', loadError: false, setTimeout: () => {},
    toast: m => c.toasted = m, save: () => true, validate: () => {}, esc: x => String(x ?? ''), uid: () => 'id' + (++c.n), n: 0, $: () => null, location: { hash: '#series' }, localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => store[k] = String(v) },
    lfData: x => x.story, lfPipeline: x => x.story.pipeline, lfApproved: () => true, lfChapters: () => content, lfStoryLang: () => 'English', lfChapterCheck: () => ({ items: [] }), lfVersion: x => Number(x.bodyRevision || 1),
    lfAIReviewFresh: x => !!x.aiReview && x.aiReview.revision === Number(x.bodyRevision || 1), LF_RUBRIC: [['plot', 'Cốt truyện', 20], ['hook', 'Mở đầu', 20], ['characters', 'Nhân vật', 15], ['style', 'Văn phong', 15], ['world', 'Thế giới', 10], ['pacing', 'Nhịp', 10], ['genre', 'Thể loại', 10]], lfRubricLabel: (_s, k) => k,
    bridgeConnectionState: () => ({}), jobState: j => j.status, lfJobKinds: {}, lfNeedsReview: () => false, lfReviewFresh: () => false });
  vm.runInContext(src.slice(0, src.indexOf('const uiBaseChoose=')), c); c.uiRender = () => {};
  c.calls = []; c.xpCall = async (kind, extra) => { c.calls.push(plain({ kind, ...extra })); return { ok: true }; };
  c.reviews = []; c.lfSend = async (_s, kind, scope) => { c.reviews.push(scope.chapterId); };
  c.uiChapterWrite = async () => { c.chatgptFix = true; };
  return { c, s, content };
}
const review = (total, rev) => ({ revision: rev, value: { v: 2, total, rubric: { plot: { score: 14, fix: 'Thêm xung đột' }, hook: { score: 12, fix: 'Mở bằng cảnh chợ' }, characters: { score: 12 }, style: { score: 12 }, world: { score: 8 }, pacing: { score: 8 }, genre: { score: 8 } }, fixes: [], contradictions: [], critical_errors: [], revision_instructions: ['Cắt đoạn tóm tắt đầu'], summaryVi: 'Khá' } });

test('Xưởng: an auto chapter from Sudowrite is reviewed, then sent back to Sudowrite to fix (not to ChatGPT)', async () => {
  const { c, content } = studio(); const ch2 = content[1];
  c.db.sudoJobs = { 'xw-ser-ser1:2': { seriesId: 'ser1', chapterId: 'c2', mode: 'write', auto: true, round: 0, status: 'sent', at: new Date().toISOString() } };
  assert.equal(c.uiQaTag(Object.assign(ch2, { qa: { round: 0, scores: [], sudoAuto: true } }))[1], 'Sudowrite đang viết');
  assert.equal(await c.uiQaTick(), false, 'nothing happens while Sudowrite is writing');
  assert.equal(c.uiSudoResult({ job_key: 'xw-ser-ser1:2', body: 'Sudowrite chapter two.', words: 3 }).ok, true);
  assert.equal(c.db.sudoJobs['xw-ser-ser1:2'].status, 'done'); assert.equal(ch2.qa.sudoAuto, true);
  assert.equal(await c.uiQaTick(), true); assert.deepEqual(c.reviews, ['c2'], 'ChatGPT reviews it (qa loop setting is off)');
  ch2.aiReview = review(74, ch2.bodyRevision);
  assert.equal(await c.uiQaTick(), true); assert.equal(c.chatgptFix, undefined);
  const sent = c.calls.at(-1); assert.equal(sent.kind, 'XP_SUDO_BRIEF'); assert.equal(sent.brief.mode, 'revise'); assert.equal(sent.brief.auto, true); assert.equal(sent.brief.round, 1);
  assert.ok(sent.brief.revision_instructions.some(x => /Mở bằng cảnh chợ/.test(x))); assert.deepEqual(validate(schema('sudowrite-brief'), sent.brief), []);
  assert.equal(c.db.sudoJobs['xw-ser-ser1:2'].status, 'sent'); assert.equal(ch2.qa.status, 'fixing');
});
test('Xưởng: after 3 Sudowrite rounds below 85 the chapter waits for you (Cần bạn xem)', async () => {
  const { c, content } = studio(); const ch2 = content[1];
  c.db.sudoJobs = {}; ch2.qa = { round: 3, scores: [70, 75, 80], sudoAuto: true, status: 'fixing' }; ch2.aiReview = review(82, 1);
  assert.equal(await c.uiQaTick(), false); assert.equal(ch2.qa.status, 'needs-human'); assert.equal(c.calls.length, 0);
  assert.equal(c.uiQaTag(ch2)[1], 'Cần bạn xem');
});
test('Xưởng: a passing chapter stops the loop', async () => {
  const { c, content } = studio(); const ch2 = content[1];
  c.db.sudoJobs = {}; ch2.qa = { round: 1, scores: [74], sudoAuto: true, status: 'fixing' }; ch2.aiReview = review(88, 1); ch2.aiReview.value.rubric.plot.score = 20; ch2.aiReview.value.rubric.hook.score = 18;
  await c.uiQaTick(); assert.equal(ch2.qa.status, 'passed'); assert.equal(c.calls.length, 0);
});
const stopped = (c, mode = 'write') => { c.db.sudoJobs = { 'xw-ser-ser1:2': { seriesId: 'ser1', chapterId: 'c2', mode, auto: true, round: mode === 'revise' ? 1 : 0, status: 'sent', at: new Date().toISOString() } }; return { job_key: 'xw-ser-ser1:2', mode, round: 0, status: 'stopped', code: 'out_of_credits', error: 'Sudowrite báo hết credit', at: 1 }; };
const runTimers = c => { c.later = []; c.setTimeout = fn => { c.later.push(fn); }; };
const gptCalls = c => { c.writes = []; c.uiChapterWrite = async (_s, ch, mode, _b, ask) => { c.writes.push({ chapter: ch.id, mode, ask }); }; };
test('Xưởng: out of credits with the fallback off → Cần bạn xem with the reason (no ChatGPT)', () => {
  const { c, content } = studio(); gptCalls(c); c.db.uiSettings.sudoFallback = false;
  const r = c.uiSudoStatus(stopped(c));
  assert.equal(r.ok, true); assert.equal(c.db.sudoJobs['xw-ser-ser1:2'].status, 'stopped'); assert.equal(content[1].qa.status, 'needs-human'); assert.match(content[1].qa.note, /hết credit/); assert.match(c.toasted, /hết credit/);
  assert.equal(c.writes.length, 0); assert.ok(c.db.uiSettings.sudoCreditsOutAt, 'Xưởng remembers Sudowrite is out of credits');
  assert.equal(c.uiSudoStatus({ job_key: 'xw-none-x:1' }).final, true);
});
test('Xưởng: out of credits (fallback on by default) → ChatGPT writes the chapter instead, then reviews as usual', async () => {
  const { c, content } = studio(); gptCalls(c); runTimers(c);
  const r = c.uiSudoStatus(stopped(c)); assert.equal(r.fallback, 'chatgpt'); await Promise.all(c.later.map(f => f()));
  assert.deepEqual(c.writes.map(w => w.mode), ['rewrite']); assert.equal(content[1].qa.fallback, true); assert.equal(content[1].qa.sudoAuto, false); assert.equal(content[1].writtenBy, 'chatgpt-fallback');
  assert.match(c.toasted, /ChatGPT viết thay Chương 2/); assert.equal(c.db.sudoJobs['xw-ser-ser1:2'].fallback, 'chatgpt');
  // the chapter comes back from ChatGPT (new version): the loop reviews it although the qa setting is off
  content[1].bodyRevision = 2; content[1].body = 'ChatGPT chapter two.'; assert.equal(await c.uiQaTick(), true); assert.deepEqual(c.reviews, ['c2']);
});
test('Xưởng: out of credits during a fix round → ChatGPT fixes with the reviewer’s notes', async () => {
  const { c, content } = studio(); gptCalls(c); runTimers(c); content[1].aiReview = review(74, 1); content[1].qa = { round: 1, scores: [74], sudoAuto: true, status: 'fixing' };
  c.uiSudoStatus(stopped(c, 'revise')); await Promise.all(c.later.map(f => f()));
  assert.equal(c.writes[0].mode, 'fix'); assert.match(c.writes[0].ask, /Mở bằng cảnh chợ/); assert.equal(content[1].qa.round, 1, 'the round count is kept');
});
test('Xưởng: while Sudowrite is out of credits, new auto jobs and fix rounds go straight to ChatGPT; a live credit check switches back', async () => {
  const { c, s, content } = studio(); gptCalls(c); c.db.uiSettings.sudoCreditsOutAt = '2026-11-06T09:00:00Z';
  await c.uiSudoSend(s, content[1], 'write', { auto: true }); assert.equal(c.calls.length, 0, 'nothing sent to Sudowrite'); assert.equal(c.writes[0].mode, 'rewrite');
  content[1].qa = { round: 0, scores: [], sudoAuto: true }; content[1].aiReview = review(70, 1); c.writes = [];
  await c.uiQaTick(); assert.equal(c.calls.length, 0); assert.equal(c.writes[0].mode, 'fix');
  c.uiSudoMarkCredits(5000); assert.equal(c.db.uiSettings.sudoCreditsOutAt, undefined); assert.equal(c.uiSudoUseGpt(), false);
  c.uiSudoMarkCredits(0); assert.ok(c.uiSudoUseGpt());
});
test('Xưởng: ChatGPT fallback chapters also stop after 3 rounds below 85', async () => {
  const { c, content } = studio(); gptCalls(c); content[1].qa = { round: 3, scores: [70, 72, 80], fallback: true, status: 'fixing' }; content[1].aiReview = review(80, 1);
  assert.equal(await c.uiQaTick(), false); assert.equal(content[1].qa.status, 'needs-human'); assert.equal(c.writes.length, 0);
});
test('Xưởng: if the Adapter is missing, the fix round goes to Cần bạn xem instead of looping', async () => {
  const { c, content } = studio(); const ch2 = content[1];
  c.db.sudoJobs = {}; ch2.qa = { round: 0, scores: [], sudoAuto: true }; ch2.aiReview = review(70, 1);
  c.xpCall = async () => ({ ok: false, error: 'Chưa thấy extension' });
  await c.uiQaTick(); assert.equal(ch2.qa.status, 'needs-human'); assert.match(ch2.qa.note, /Chưa thấy extension/);
  assert.equal(await c.uiQaTick(), false, 'no second attempt');
});
