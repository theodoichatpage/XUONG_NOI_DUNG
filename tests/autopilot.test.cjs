// Autopilot per story: one chapter at a time → review → fixes (max 3) → approve through the gate; keeps a buffer; never publishes.
const test = require('node:test'), assert = require('node:assert/strict'), vm = require('node:vm'), fs = require('node:fs');
function setup({ writer = 'xuong', chapters = [], planned = 10, buffer = 2, ap = true, stage = 'ready' } = {}) {
  const src = fs.readFileSync('dist/studio-ui.js', 'utf8'), store = {};
  const s = { id: 'ser1', title: '[TEST] Book', writer, chapterLength: 1500, story: { plans: [], glossary: [], characters: [], pipeline: { source: { chapters: planned } } }, ...(ap ? { autopilot: { on: true, state: 'running', buffer, startedAt: '2026-11-06T00:00:00Z', log: [] } } : {}) };
  const c = vm.createContext({ db: { series: [s], content: chapters, channels: [], printProjects: [], assets: [], workflows: [], metrics: [], aiJobs: [], uiSettings: {}, migrations: { statusSplit: 'x' } }, Date, structuredClone, setTimeout: () => {}, console, today: () => '2026-11-06', loadError: false,
    toast: m => c.toasted = m, save: () => true, validate: () => {}, esc: x => String(x ?? ''), uid: () => 'id' + (++c.n), n: 0, $: () => null, location: { hash: '#series' }, localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => store[k] = String(v) },
    lfData: x => x.story, lfPipeline: x => x.story.pipeline, lfApproved: () => true, lfChapters: x => chapters.filter(y => y.seriesId === x.id).sort((a, b) => a.chapterNumber - b.chapterNumber), lfStoryLang: () => 'English', lfChapterCheck: () => ({ items: [] }), lfVersion: x => Number(x.bodyRevision || 1),
    lfAIReviewFresh: x => !!x.aiReview && x.aiReview.revision === Number(x.bodyRevision || 1), LF_RUBRIC: [], lfRubricLabel: (_s, k) => k, lfBibleReviewFresh: () => false,
    lfNextChapter: x => Math.max(0, ...chapters.filter(y => y.seriesId === x.id).map(y => y.chapterNumber)) + 1, lfChapterDefaults: x => ({ seriesId: x.id, chapterNumber: Math.max(0, ...chapters.map(y => y.chapterNumber)) + 1, title: 'Chương', status: 'draft', body: '' }), lfPlans: () => [],
    bridgeConnectionState: () => ({}), jobState: j => j.status, lfJobKinds: {}, lfNeedsReview: () => false, lfReviewFresh: () => false });
  vm.runInContext(src.slice(0, src.indexOf('const uiBaseChoose=')), c);
  c.uiRender = () => {}; c.uiCurrentStage = () => [stage]; c.uiConfirm = async () => true;
  c.writes = []; c.uiChapterWrite = async (_s, ch, mode) => { let x = ch; if (!x) { x = { id: 'w' + (chapters.length + 1), seriesId: 'ser1', chapterNumber: c.lfNextChapter(s), title: 'Chương', status: 'draft', body: '', history: [], bodyRevision: 1 }; chapters.push(x); } c.writes.push({ id: x.id, n: x.chapterNumber, mode }); c.db.aiJobs.push({ seriesId: 'ser1', storyTask: 'WRITE_CHAPTER', targetId: x.id, status: 'queued' }); };
  c.reviews = []; c.lfSend = async (_s, kind, scope) => { c.reviews.push(scope.chapterId); c.db.aiJobs.push({ seriesId: 'ser1', storyTask: kind, scope, status: 'queued' }); };
  c.calls = []; c.xpCall = async (kind, extra) => { c.calls.push(JSON.parse(JSON.stringify({ kind, ...extra }))); return { ok: true }; };
  return { c, s, chapters };
}
const finishJobs = c => c.db.aiJobs.forEach(j => { if (j.status === 'queued') j.status = 'applied'; });
const rv = (total, rev = 1, extra = {}) => ({ revision: rev, value: { v: 2, total, rubric: { plot: { score: 10, fix: 'x' } }, fixes: [], contradictions: [], critical_errors: [], revision_instructions: ['Sửa nhịp'], summaryVi: 's', ...extra } });
const ch = (n, extra = {}) => ({ id: 'c' + n, seriesId: 'ser1', chapterNumber: n, title: 'Chương ' + n, status: 'draft', body: 'Body ' + n, history: [], bodyRevision: 1, qa: { round: 0, scores: [], autopilot: true }, ...extra });

test('off, paused or Story Bible not approved → nothing is written', async () => {
  let t = setup({ ap: false }); assert.equal(await t.c.uiAutopilotTick(), false); assert.equal(t.c.writes.length, 0);
  t = setup(); t.s.autopilot.state = 'paused'; await t.c.uiAutopilotTick(); assert.equal(t.c.writes.length, 0);
  t = setup({ stage: 'characters' }); await t.c.uiAutopilotTick(); assert.equal(t.c.writes.length, 0); assert.equal(t.s.autopilot.state, 'waiting'); assert.match(t.s.autopilot.note, /Story Bible/);
});
test('Xưởng story: writes the next chapter with ChatGPT, one at a time', async () => {
  const { c, s, chapters } = setup();
  await c.uiAutopilotTick(); assert.deepEqual(c.writes.map(w => w.mode), ['new']); assert.equal(chapters[0].qa.autopilot, true); assert.match(s.autopilot.log.at(-1).text, /Bắt đầu Chương 1/);
  await c.uiAutopilotTick(); assert.equal(c.writes.length, 1, 'no second chapter while the first is being written');
});
test('a written chapter is sent for review; a passing one is approved through the gate; a failing one is fixed', async () => {
  const { c, s, chapters } = setup({ chapters: [ch(1)] });
  await c.uiAutopilotTick(); assert.deepEqual(c.reviews, ['c1']); finishJobs(c);
  chapters[0].aiReview = rv(90); await c.uiAutopilotTick(); assert.equal(chapters[0].status, 'approved'); assert.equal(chapters[0].approval.score, 90); assert.match(s.autopilot.log.at(-1).text, /Duyệt Chương 1 \(90\/100\)/);
  const t = setup({ chapters: [ch(1, { aiReview: rv(70) })] }); await t.c.uiAutopilotTick(); assert.deepEqual(t.c.writes.map(w => w.mode), ['fix']); assert.equal(t.chapters[0].qa.round, 1); assert.notEqual(t.chapters[0].status, 'approved');
});
test('a chapter waiting for you (after 3 rounds) does not block the next one; the buffer and the outline end stop it', async () => {
  const { c, chapters } = setup({ chapters: [ch(1, { aiReview: rv(80), qa: { round: 3, scores: [70, 75, 80], autopilot: true, status: 'needs-human' } })] });
  await c.uiAutopilotTick(); assert.deepEqual(c.writes.map(w => [w.n, w.mode]), [[2, 'new']]);
  const ok = n => ch(n, { status: 'approved', aiReview: rv(90), approval: { revision: 1, score: 90 } });
  let t = setup({ chapters: [ok(1), ok(2)], buffer: 2 }); await t.c.uiAutopilotTick(); assert.equal(t.c.writes.length, 0); assert.equal(t.s.autopilot.state, 'idle');
  t = setup({ chapters: [ok(1), ok(2)], buffer: 3, planned: 2 }); await t.c.uiAutopilotTick(); assert.equal(t.c.writes.length, 0); assert.equal(t.s.autopilot.state, 'done');
  void chapters;
});
test('a ChatGPT error stops the autopilot; an empty chapter stops it and is retried on resume', async () => {
  let t = setup(); t.c.db.aiJobs.push({ seriesId: 'ser1', storyTask: 'WRITE_CHAPTER', status: 'error', error: 'ChatGPT quá tải', createdAt: '2026-11-06T01:00:00Z' });
  await t.c.uiAutopilotTick(); assert.equal(t.s.autopilot.state, 'error'); assert.match(t.s.autopilot.note, /quá tải/); assert.equal(t.c.writes.length, 0);
  t = setup({ chapters: [ch(1, { body: '' })] }); await t.c.uiAutopilotTick(); assert.equal(t.s.autopilot.state, 'error'); assert.match(t.s.autopilot.note, /Chương 1 chưa có nội dung/);
  await t.c.uiAutopilotSwitch(t.s, 'resume'); await t.c.uiAutopilotTick(); assert.deepEqual(t.c.writes.map(w => [w.id, w.mode]), [['c1', 'rewrite']], 'the same chapter is written again, no gap');
});
test('Sudowrite story: the chapter goes to Sudowrite; when credits are out, ChatGPT writes it instead', async () => {
  let t = setup({ writer: 'sudowrite' }); await t.c.uiAutopilotTick();
  assert.equal(t.c.calls[0].kind, 'XP_SUDO_BRIEF'); assert.equal(t.c.calls[0].brief.auto, true); assert.equal(t.chapters[0].qa.autopilot, true); assert.equal(t.chapters[0].qa.sudoAuto, true);
  t = setup({ writer: 'sudowrite' }); t.c.db.uiSettings.sudoCreditsOutAt = '2026-11-06T00:00:00Z'; await t.c.uiAutopilotTick();
  assert.equal(t.c.calls.length, 0); assert.deepEqual(t.c.writes.map(w => w.mode), ['rewrite']); assert.match(t.s.autopilot.log.at(-1).text, /ChatGPT viết thay/);
});
test('nothing is ever published by the autopilot', () => {
  const src = fs.readFileSync('dist/studio-ui.js', 'utf8'), engine = src.slice(src.indexOf('// ---- Autopilot per story'), src.indexOf('function uiAutopilotSwitch'));
  assert.doesNotMatch(engine, /status='live'|publication_status='published'|uiPublishAction|XP_FILL_LISTING/);
});
test('a fix round whose revision never came back (Bridge error) is retried, not counted', async () => {
  const { c, chapters } = setup({ chapters: [ch(1, { aiReview: rv(84), qa: { round: 0, scores: [84], autopilot: true } })] });
  await c.uiAutopilotTick(); assert.equal(chapters[0].qa.round, 1); assert.equal(chapters[0].qa.fixVersion, 1);
  c.db.aiJobs.forEach(j => { j.status = 'error'; j.createdAt = '2026-11-05T00:00:00Z'; }); // the send failed; the text is unchanged (version 1)
  c.writes = []; await c.uiQaTick(); assert.equal(chapters[0].qa.round, 1, 'same round reused'); assert.deepEqual(c.writes.map(w => w.mode), ['fix']);
  // a revision that was applied (new version) counts: after 3 real rounds it stops
  chapters[0].qa = { round: 3, scores: [70, 75, 80], autopilot: true, fixVersion: 1 }; chapters[0].bodyRevision = 2; chapters[0].aiReview = rv(80, 2); c.db.aiJobs = []; c.writes = [];
  await c.uiQaTick(); assert.equal(chapters[0].qa.status, 'needs-human'); assert.equal(c.writes.length, 0);
});
test('a ChatGPT job with no answer for 20 minutes is cancelled and the fix is sent again; 3 timeouts → Cần bạn xem', async () => {
  const { c, s, chapters } = setup({ chapters: [ch(1, { aiReview: rv(83), qa: { round: 3, scores: [78, 84, 83], autopilot: true, status: 'fixing', fixVersion: 1, scoredVersion: 1 } })] });
  const job = { seriesId: 'ser1', storyTask: 'WRITE_CHAPTER', targetId: 'c1', status: 'running', createdAt: '2026-11-06T14:52:00Z' };
  c.db.aiJobs.push(job);
  assert.equal(await c.uiStuckTick(Date.parse('2026-11-06T15:05:00Z')), false, '13 minutes: still waiting');
  assert.equal(await c.uiStuckTick(Date.parse('2026-11-06T15:13:00Z')), true); assert.equal(job.status, 'error'); assert.equal(job.timedOut, true); assert.equal(chapters[0].qa.stuck, 1);
  c.writes = []; await c.uiQaTick(); assert.deepEqual(c.writes.map(w => w.mode), ['fix'], 'the same fix round is sent again'); assert.equal(chapters[0].qa.round, 3);
  await c.uiAutopilotTick(); assert.notEqual(s.autopilot.state, 'error', 'a timeout does not stop the autopilot');
  chapters[0].qa.stuck = 2; c.db.aiJobs.forEach(j => { if (j.status === 'queued') { j.status = 'running'; j.createdAt = '2026-11-06T16:00:00Z'; } });
  await c.uiStuckTick(Date.parse('2026-11-06T17:00:00Z')); assert.equal(chapters[0].qa.status, 'needs-human'); assert.match(chapters[0].qa.note, /3 lần/);
});
test('old finished ChatGPT jobs drop their heavy text after a full snapshot; recent and running jobs keep it', async () => {
  const { c } = setup(); const snaps = [];
  c.db.aiJobs.push({ id: 'old', status: 'applied', createdAt: '2026-11-05T00:00:00Z', prompt: 'P'.repeat(1000), resultText: 'R', baseBody: 'B', storyTask: 'WRITE_CHAPTER' },
    { id: 'new', status: 'applied', createdAt: '2026-11-06T22:00:00Z', prompt: 'P', resultText: 'R' },
    { id: 'run', status: 'running', createdAt: '2026-11-05T00:00:00Z', prompt: 'P' });
  const n = await c.uiJobCompact(Date.parse('2026-11-07T00:00:00Z'), async l => { snaps.push([l, JSON.stringify(c.db.aiJobs).includes('P'.repeat(1000))]); });
  assert.equal(n, 1); assert.deepEqual(snaps, [['before-job-archive', true]], 'snapshot taken while the text was still there');
  const [o, nw, r] = c.db.aiJobs; assert.equal(o.prompt, undefined); assert.equal(o.resultText, undefined); assert.ok(o.archived); assert.equal(o.status, 'applied');
  assert.equal(nw.prompt, 'P'); assert.equal(r.prompt, 'P');
  assert.equal(await c.uiJobCompact(Date.parse('2026-11-07T00:00:00Z'), async () => { throw Error('no IDB'); }), 0, 'nothing left to archive');
});
test('one sender at a time: nothing new is sent while any ChatGPT job is in flight', async () => {
  const { c, chapters } = setup({ chapters: [ch(1, { qa: { round: 0, scores: [], autopilot: true } })] });
  c.db.aiJobs.push({ seriesId: 'other', storyTask: 'REVIEW_CHAPTER', status: 'running', createdAt: new Date().toISOString() });
  await c.uiQaTick(); await c.uiAutopilotTick(); assert.deepEqual(c.reviews, []); assert.equal(c.writes.length, 0);
  c.db.aiJobs[0].status = 'applied'; await c.uiAutopilotTick(); assert.deepEqual(c.reviews, ['c1'], 'sent once the Bridge is free'); void chapters;
});
test('a job left queued (never handed to the Bridge) expires after 3 minutes and frees the sender', async () => {
  const { c } = setup(); const j = { seriesId: 'ser1', storyTask: 'WRITE_CHAPTER', status: 'queued', createdAt: '2026-11-07T03:55:40Z' }; c.db.aiJobs.push(j);
  assert.equal(await c.uiStuckTick(Date.parse('2026-11-07T03:57:40Z')), false); assert.equal(c.uiBridgeBusy(), true);
  assert.equal(await c.uiStuckTick(Date.parse('2026-11-07T03:59:00Z')), true); assert.equal(j.status, 'error'); assert.equal(c.uiBridgeBusy(), false);
});
test('every chapter of a run (Viết tiếp N chương) is reviewed, even one re-sent without its autopilot mark', async () => {
  const { c, s, chapters } = setup({ chapters: [ch(8, { qa: null, body: 'Text 8' })] }); s.autopilot.until = 17; s.autopilot.from = 8;
  await c.uiAutopilotTick(); assert.equal(chapters[0].qa.autopilot, true); assert.deepEqual(c.reviews, ['c8']);
});
