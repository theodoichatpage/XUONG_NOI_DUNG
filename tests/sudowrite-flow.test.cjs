// Phase 4: review v3, semi-automatic Sudowrite brief and result (Xưởng side and Adapter side).
const test = require('node:test'), assert = require('node:assert/strict'), vm = require('node:vm'), fs = require('node:fs');
const { validate } = require('../shared/validate.cjs');
const schema = n => JSON.parse(fs.readFileSync('shared/schemas/' + n + '.schema.json', 'utf8'));

// ---- Review v3 (dist/story-longform-v2.js)
function reviewRuntime() {
  const src = fs.readFileSync('dist/story-longform-v2.js', 'utf8'), c = vm.createContext({});
  vm.runInContext(src.match(/const LF_RUBRIC=.*?;/)[0] + '\n' + src.match(/function lfUnwrapRubric\(v,list\)\{[^\n]*/)[0] + '\n' + src.match(/function lfValidateChapterReview\(v\)\{[^\n]*/)[0], c);
  return c;
}
test('review: ChatGPT answering the 7 criteria at the top level (no "rubric" wrapper) is accepted', () => {
  const c = reviewRuntime(); const v = c.lfValidateChapterReview({ ...rubric(9), summaryVi: 'Tốt', critical_errors: [] });
  assert.equal(v.total, 90); assert.equal(v.rubric.plot.score, 18); assert.equal(v.plot, undefined);
});
const rubric = (n) => ({ plot: { score: 18 }, hook: { score: 18 }, characters: { score: 14 }, style: { score: 13 }, world: { score: n }, pacing: { score: 9 }, genre: { score: 9 } });

test('review v3: a critical error blocks approval even at 90 points', () => {
  const c = reviewRuntime();
  const ok = c.lfValidateChapterReview({ rubric: rubric(9), summaryVi: 'Tốt', strengths: ['Mở đầu mạnh', ''], weaknesses: [], critical_errors: [], revision_instructions: [] });
  assert.equal(ok.total, 90); assert.equal(ok.verdict, 'ok'); assert.deepEqual([...ok.strengths], ['Mở đầu mạnh']); assert.equal(ok.rev, 3);
  const bad = c.lfValidateChapterReview({ rubric: rubric(9), summaryVi: 'Tốt', critical_errors: ['Shen Yan đã chết ở chương 3 nhưng xuất hiện lại'] });
  assert.equal(bad.total, 90); assert.equal(bad.verdict, 'revise'); assert.equal(bad.critical_errors[0].issue, 'Shen Yan đã chết ở chương 3 nhưng xuất hiện lại');
  assert.deepEqual(validate(schema('chapter-review'), JSON.parse(JSON.stringify(bad))), [], 'Xưởng output matches the contract');
});
test('review v3: the AI total is ignored and scores are clamped', () => {
  const c = reviewRuntime(), r = c.lfValidateChapterReview({ rubric: { ...rubric(10), plot: { score: 99 } }, total: 100, summaryVi: 'x' });
  assert.equal(r.rubric.plot.score, 20); assert.equal(r.total, 93);
});
test('review v3: old reviews without the new lists still validate', () => {
  const c = reviewRuntime(), r = c.lfValidateChapterReview({ rubric: rubric(0), summaryVi: 'x' });
  assert.deepEqual([...r.strengths, ...r.weaknesses, ...r.critical_errors, ...r.revision_instructions], []); assert.equal(r.verdict, 'revise');
});
test('the review prompt asks for strengths, weaknesses, critical errors and revision instructions', () => {
  const src = fs.readFileSync('dist/story-longform-v2.js', 'utf8');
  for (const k of ['strengths', 'weaknesses', 'critical_errors', 'revision_instructions']) assert.match(src.match(/function lfCheckPrompt[^\n]*\n[^\n]*/)[0], new RegExp(k));
});

// ---- Xưởng side (dist/studio-ui.js)
function studio() {
  const src = fs.readFileSync('dist/studio-ui.js', 'utf8'), store = {};
  const s = { id: 'ser1', title: 'Ashen', chapterLength: 2200, story: { plans: [{ kind: 'chapter', startChapter: 2, title: 'The Field', body: 'Shen Yan buys the field nobody wants.' }], glossary: [{ term: 'Shen Yan', kind: 'Nhân vật', note: 'protagonist' }], characters: [], pipeline: { source: {}, artifacts: {} } } };
  const ch = (n, status, body) => ({ id: 'c' + n, seriesId: 'ser1', chapterNumber: n, title: 'Chương ' + n, status, body, history: [], bodyRevision: 1 });
  const content = [ch(1, 'approved', 'Chapter one text. The gate closed behind him.'), ch(2, 'draft', 'Old draft of two.'), ch(3, 'approved', 'Locked.')];
  const c = vm.createContext({ db: { series: [s], content, channels: [], printProjects: [], assets: [], workflows: [], metrics: [], aiJobs: [] }, Date, structuredClone, today: () => '2026-11-05', loadError: false,
    toast: m => c.toasted = m, save: () => true, validate: () => {}, esc: x => String(x ?? ''), uid: () => 'id' + (++c.n), n: 0, $: () => null, location: { hash: '#series' }, localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => store[k] = String(v) },
    lfData: x => x.story, lfPipeline: x => x.story.pipeline, lfApproved: () => true, lfChapters: () => content, lfStoryLang: () => 'English', lfChapterCheck: () => ({ items: [] }), lfVersion: x => Number(x.bodyRevision || 1),
    lfAIReviewFresh: x => !!x.aiReview, LF_RUBRIC: [['plot', 'Cốt truyện', 20], ['hook', 'Mở đầu', 20], ['characters', 'Nhân vật', 15], ['style', 'Văn phong', 15], ['world', 'Thế giới', 10], ['pacing', 'Nhịp', 10], ['genre', 'Thể loại', 10]], lfRubricLabel: (_s, k) => k,
    bridgeConnectionState: () => ({}), jobState: j => j.status, lfJobKinds: {}, lfNeedsReview: () => false, lfReviewFresh: () => false });
  vm.runInContext(src.slice(0, src.indexOf('const uiBaseChoose=')), c); c.uiRender = () => {};
  return { c, s, content };
}

test('the brief carries the plan, the end of the previous chapter, canon and the word target, and matches the schema', () => {
  const { c, s, content } = studio(), b = JSON.parse(JSON.stringify(c.uiSudoBrief(s, content[1], 'write')));
  assert.deepEqual(validate(schema('sudowrite-brief'), b), []);
  assert.equal(b.job_key, 'xw-ser-ser1:2'); assert.equal(b.chapter_no, 2); assert.equal(b.target_word_count, 2200);
  assert.match(b.beats, /buys the field/); assert.match(b.previous_ending, /gate closed behind him/); assert.match(b.canon_notes, /Shen Yan \[Nhân vật\]: protagonist/);
  assert.match(b.instructions, /Gửi chương về Xưởng/); assert.deepEqual(b.revision_instructions, []);
});
test('a revise brief lists critical errors first, then the reviewer’s instructions', () => {
  const { c, s, content } = studio();
  content[1].aiReview = { value: { v: 2, rubric: { plot: { score: 18 }, hook: { score: 10, fix: 'Mở bằng cảnh chợ' }, characters: { score: 14 }, style: { score: 13 }, world: { score: 9 }, pacing: { score: 9 }, genre: { score: 9 } }, fixes: [], contradictions: [], critical_errors: [{ issue: 'Sai tên mẹ' }], revision_instructions: ['Cắt đoạn tóm tắt đầu'], summaryVi: 'x' } };
  const b = c.uiSudoBrief(s, content[1], 'revise');
  assert.match(b.revision_instructions[0], /LỖI NGHIÊM TRỌNG.*Sai tên mẹ/); assert.ok(b.revision_instructions.some(x => /Cắt đoạn tóm tắt đầu/.test(x))); assert.ok(b.revision_instructions.some(x => /Mở bằng cảnh chợ/.test(x)));
  assert.deepEqual(validate(schema('sudowrite-brief'), JSON.parse(JSON.stringify(b))), []);
});
test('a chapter from Sudowrite replaces the draft (old version kept), never an approved chapter, never an unknown job', () => {
  const { c, s, content } = studio();
  c.db.sudoJobs = { 'xw-ser-ser1:2': { seriesId: 'ser1', chapterId: 'c2', mode: 'write' }, 'xw-ser-ser1:3': { seriesId: 'ser1', chapterId: 'c3', mode: 'write' } };
  const r = c.uiSudoResult({ job_key: 'xw-ser-ser1:2', body: 'New chapter two from Sudowrite.', words: 5 });
  assert.equal(r.ok, true); assert.equal(content[1].body, 'New chapter two from Sudowrite.'); assert.equal(content[1].history.at(-1).body, 'Old draft of two.'); assert.ok(c.db.sudoJobs['xw-ser-ser1:2'].doneAt); assert.match(c.toasted, /Chương 2 từ Sudowrite/);
  const locked = c.uiSudoResult({ job_key: 'xw-ser-ser1:3', body: 'x' }); assert.equal(locked.ok, false); assert.equal(locked.final, true); assert.equal(content[2].body, 'Locked.');
  const unknown = c.uiSudoResult({ job_key: 'xw_other:9', body: 'x' }); assert.equal(unknown.final, true);
  assert.equal(c.uiSudoResult({ job_key: 'xw-ser-ser1:2', body: '   ' }).ok, false);
});

// ---- Adapter side (extension-publisher/background.js + sudowrite-brief.js)
function adapter() {
  let receiver; const storage = {}, sent = [], opened = [], tabs = { all: [] };
  const chrome = { runtime: { id: 'xp', getManifest: () => ({ version: '0.6.0' }), onMessage: { addListener(fn) { receiver = fn; } } },
    storage: { local: { async get(keys) { return Object.fromEntries(keys.map(k => [k, storage[k]])); }, async set(o) { Object.assign(storage, structuredClone(o)); }, async remove(k) { delete storage[k]; } } },
    tabs: { async query(q) { return tabs.all.filter(t => !q?.url || t.url.startsWith(q.url.replace('*', ''))); }, async update() {}, async create(t) { opened.push(t.url); }, async sendMessage(id, msg) { sent.push([id, msg.kind, msg.msg?.kind]); return globalThis.__reply?.(id, msg); } },
    windows: { async update() {} }, alarms: { create() {}, onAlarm: { addListener() {} } } };
  const ctx = vm.createContext({ chrome, URL, Date, AbortController, setTimeout, clearTimeout, fetch: async () => { throw Error('offline'); }, importScripts: (...f) => f.forEach(n => vm.runInContext(fs.readFileSync('extension-publisher/' + n, 'utf8'), ctx)) });
  vm.runInContext(fs.readFileSync('extension-publisher/background.js', 'utf8'), ctx);
  const send = (m, s) => new Promise(r => receiver(m, { id: 'xp', ...s }, r));
  return { send, storage, sent, opened, tabs };
}
const STUDIO = { url: 'https://xuong-noi-dung-khaki.vercel.app/#series', tab: { id: 1 } }, SUDO = { url: 'https://editor.sudowrite.com/app/project/abc', tab: { id: 7 } };
const brief = { schema: 1, job_key: 'xw-ser-ser1:2', mode: 'write', chapter_no: 2, title: 'Chapter 2', instructions: 'Viết rồi bấm Gửi chương về Xưởng', target_word_count: 2200, extra: 'dropped' };

test('Adapter: only Xưởng can hand over a brief; it opens the Sudowrite project and the banner can read it', async () => {
  const a = adapter(); a.tabs.all = [{ id: 7, url: SUDO.url, active: true }];
  assert.equal((await a.send({ kind: 'XP_SUDO_BRIEF', brief }, SUDO)).ok, false);
  assert.match((await a.send({ kind: 'XP_SUDO_BRIEF', brief: { ...brief, job_key: 'bad' } }, STUDIO)).error, /job_key/);
  const r = await a.send({ kind: 'XP_SUDO_BRIEF', brief }, STUDIO); assert.equal(r.ok, true); assert.equal(r.opened, false);
  assert.deepEqual(a.sent.at(-1), [7, 'XP_SUDO_SHOW_BRIEF', undefined]);
  assert.equal((await a.send({ kind: 'XP_SUDO_ACTIVE' }, STUDIO)).ok, false, 'only Sudowrite reads the active brief');
  const act = (await a.send({ kind: 'XP_SUDO_ACTIVE' }, SUDO)).brief; assert.equal(act.chapter_no, 2); assert.equal(act.extra, undefined);
  a.tabs.all = []; a.storage.lastSudoProject = 'https://editor.sudowrite.com/app/project/abc';
  assert.deepEqual(JSON.parse(JSON.stringify(await a.send({ kind: 'XP_SUDO_BRIEF', brief }, STUDIO))), { ok: true, opened: true, project: true, already: false }); assert.deepEqual(a.opened, ['https://editor.sudowrite.com/app/project/abc']);
});
test('Adapter: a chapter is kept until Xưởng confirms it, then delivered when Xưởng opens', async () => {
  const a = adapter(); a.tabs.all = [{ id: 7, url: SUDO.url }];
  await a.send({ kind: 'XP_SUDO_BRIEF', brief }, STUDIO);
  assert.match((await a.send({ kind: 'XP_SUDO_RESULT', result: { job_key: 'xw-none-x:1', body: 'x' } }, SUDO)).error, /chưa giao/);
  assert.match((await a.send({ kind: 'XP_SUDO_RESULT', result: { job_key: 'xw-ser-ser1:2', body: '  ' } }, SUDO)).error, /trống/);
  const kept = await a.send({ kind: 'XP_SUDO_RESULT', result: { job_key: 'xw-ser-ser1:2', body: 'Chapter two text', title: 'Untitled' } }, SUDO);
  assert.deepEqual(JSON.parse(JSON.stringify(kept)), { ok: true, delivered: false }); assert.equal(a.storage.sudoResults.length, 1); assert.equal(a.storage.sudoActive, 'xw-ser-ser1:2');
  a.tabs.all.push({ id: 1, url: STUDIO.url }); globalThis.__reply = (id, m) => m.kind === 'XP_TO_PAGE' ? { ok: true, version: 2 } : undefined;
  const ready = await a.send({ kind: 'XP_STUDIO_READY' }, STUDIO); assert.equal(ready.delivered, 1); assert.equal(a.storage.sudoResults.length, 0);
  assert.ok(a.sent.some(x => x[0] === 1 && x[2] === 'XP_SUDO_RESULT')); globalThis.__reply = null;
});
test('Adapter: a final refusal from Xưởng (approved chapter) is reported and not retried', async () => {
  const a = adapter(); a.tabs.all = [{ id: 7, url: SUDO.url }, { id: 1, url: STUDIO.url }];
  await a.send({ kind: 'XP_SUDO_BRIEF', brief }, STUDIO);
  globalThis.__reply = (id, m) => m.kind === 'XP_TO_PAGE' ? { ok: false, final: true, error: 'Chương 2 đã duyệt đang khóa' } : undefined;
  const r = await a.send({ kind: 'XP_SUDO_RESULT', result: { job_key: 'xw-ser-ser1:2', body: 'text' } }, SUDO);
  assert.match(r.error, /đã duyệt/); assert.equal(a.storage.sudoResults.length, 0); globalThis.__reply = null;
});
test('the Sudowrite content script never presses Write, Generate, Rewrite or Create', () => {
  const sw = fs.readFileSync('extension-publisher/sudowrite-content.js', 'utf8');
  assert.doesNotMatch(sw, /aria-label="(Write|Generate a Rough Draft|Write Options Menu)"\]'\)\??\.click|First Draft'\)\??\.click/);
  for (const lit of sw.match(/\/[^/\n]+\/i(?=[,)};])/g) || []) assert.doesNotMatch(lit, /generate|surprise|\bgo\b|\bwrite\b|rewrite/i, lit);
});
