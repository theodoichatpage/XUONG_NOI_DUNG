// Chapter status split (quality / publication), hard approval gate and non-destructive flagging of old chapters.
const test = require('node:test'), assert = require('node:assert/strict'), vm = require('node:vm'), fs = require('node:fs');
const plain = x => JSON.parse(JSON.stringify(x));
function studio(chapters, opts = {}) {
  const src = fs.readFileSync('dist/studio-ui.js', 'utf8'), store = {}, saves = [];
  const s = { id: 'ser1', title: 'Ashen (test copy)', chapterLength: 1500, story: { plans: [], glossary: [], characters: [], pipeline: { source: {} } } };
  const c = vm.createContext({ db: { series: [s], content: chapters, channels: [], printProjects: [], assets: [], workflows: [], metrics: [], aiJobs: [], uiSettings: {}, ...(opts.migrated ? { migrations: { statusSplit: '2026-11-06' } } : {}) }, Date, structuredClone, setTimeout: () => {}, console, today: () => '2026-11-06', loadError: false,
    toast: m => c.toasted = m, save: () => { saves.push(1); return true; }, validate: () => {}, esc: x => String(x ?? ''), uid: () => 'id' + (++c.n), n: 0, $: () => null, location: { hash: '#series' }, localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => store[k] = String(v) },
    lfData: x => x.story, lfPipeline: x => x.story.pipeline, lfApproved: () => true, lfChapters: () => chapters, lfStoryLang: () => 'English', lfChapterCheck: () => ({ items: [] }), lfVersion: x => Number(x.bodyRevision || 1),
    lfAIReviewFresh: x => !!x.aiReview && x.aiReview.revision === Number(x.bodyRevision || 1), LF_RUBRIC: [], lfRubricLabel: (_s, k) => k,
    bridgeConnectionState: () => ({}), jobState: j => j.status, lfJobKinds: {}, lfNeedsReview: () => false, lfReviewFresh: () => false, ...(opts.ctx || {}) });
  vm.runInContext(src.slice(0, src.indexOf('const uiBaseChoose=')), c); c.uiRender = () => {}; c.saves = saves;
  return { c, s };
}
const rv = (total, rev = 1, extra = {}) => ({ revision: rev, value: { v: 2, total, rubric: {}, contradictions: [], critical_errors: [], ...extra } });
const ch = (n, status, extra = {}) => ({ id: 'c' + n, seriesId: 'ser1', chapterNumber: n, title: 'Chương ' + n, status, body: 'Body ' + n, history: [], bodyRevision: 1, ...extra });

test('old chapters that do not meet the new rules are flagged, never downgraded or changed', () => {
  const chapters = [ch(1, 'live'), ch(3, 'approved', { aiReview: rv(78) }), ch(4, 'approved'), ch(5, 'review')];
  const before = plain(chapters); const { c } = studio(chapters, { migrated: true });
  assert.equal(c.uiSyncStatuses(true), true);
  const [c1, c3, c4, c5] = chapters;
  assert.match(c1.recheck.reason, /Đã đăng khi chưa được ChatGPT chấm/); assert.equal(c1.quality_status, 'human_review'); assert.equal(c1.publication_status, 'published');
  assert.match(c3.recheck.reason, /Điểm 78\/100, chưa đạt 85/); assert.equal(c3.quality_status, 'human_review'); assert.equal(c3.publication_status, 'unpublished');
  assert.match(c4.recheck.reason, /Đã duyệt khi chưa được ChatGPT chấm/);
  assert.equal(c5.recheck, undefined); assert.equal(c5.quality_status, 'draft');
  for (let i = 0; i < 4; i++) for (const k of ['status', 'body', 'title', 'history', 'aiReview']) assert.deepEqual(chapters[i][k], before[i][k], 'kept: ' + k);
  assert.equal(c.uiSyncStatuses(true), false, 'a second sync changes nothing');
});
test('quality comes from the review, not from publication', () => {
  const chapters = [ch(1, 'draft', { aiReview: rv(70) }), ch(2, 'draft', { aiReview: rv(90) }), ch(3, 'draft', { aiReview: rv(88, 1, { critical_errors: [{ issue: 'Nhân vật đã chết xuất hiện lại' }] }) }), ch(4, 'draft', { aiReview: rv(90, 1), bodyRevision: 2 }), ch(5, 'draft', { qa: { status: 'needs-human' } })];
  const { c } = studio(chapters, { migrated: true }); c.uiSyncStatuses(true);
  assert.deepEqual(chapters.map(x => x.quality_status), ['revision_required', 'reviewing', 'revision_required', 'draft', 'human_review']);
  assert.equal(c.uiChRowState(c.db.series[0], chapters[1])[1], 'Đạt — chờ duyệt');
  assert.match(c.uiApprovalBlock(c.db.series[0], chapters[2]), /1 lỗi nghiêm trọng/, '85+ with a critical error cannot be approved');
  assert.match(c.uiApprovalBlock(c.db.series[0], chapters[3]), /đã sửa sau lần chấm/, 'a review of an older version does not count');
});
test('approval: only at 85+ on the current version; stores an immutable snapshot and queues for publishing', () => {
  const chapters = [ch(1, 'review', { aiReview: rv(84) }), ch(2, 'review', { aiReview: rv(85) })];
  const { c } = studio(chapters, { migrated: true });
  assert.throws(() => c.uiChapterApprove('c1'), /Điểm 84\/100, chưa đạt 85/); assert.equal(chapters[0].status, 'review');
  c.uiChapterApprove('c2'); const x = chapters[1];
  assert.equal(x.status, 'approved'); assert.equal(x.quality_status, 'approved'); assert.equal(x.publication_status, 'ready');
  assert.deepEqual(plain(x.approval), { revision: 1, score: 85, at: x.approval.at, reviewAt: '' }); assert.equal(x.approvedSnapshot.body, 'Body 2');
  x.bodyRevision = 2; assert.equal(c.uiApprovalValid(x), false, 'a new version is not approved by the old approval');
});
test('a flagged old chapter is cleared only by a real approval (score it again first)', () => {
  const chapters = [ch(3, 'approved', { aiReview: rv(78) })]; const { c } = studio(chapters, { migrated: true }); c.uiSyncStatuses(true);
  assert.throws(() => c.uiChapterApprove('c3'), /78\/100/);
  chapters[0].aiReview = rv(90); c.uiChapterApprove('c3'); assert.equal(chapters[0].recheck, undefined); assert.ok(chapters[0].recheckCleared.reason); assert.equal(chapters[0].quality_status, 'approved');
});
test('migration: a full backup is written before the first status sync; no sync without it', async () => {
  const puts = [], fakeIDB = { open: () => { const rq = {}; setImmediate(() => { rq.result = { createObjectStore() {}, transaction: () => { const tx = { objectStore: () => ({ put: v => puts.push(v) }) }; setImmediate(() => tx.oncomplete()); return tx; } }; rq.onsuccess(); }); return rq; } };
  const chapters = [ch(1, 'live')]; const { c } = studio(chapters, { ctx: { indexedDB: fakeIDB } });
  assert.equal(c.uiSyncStatuses(true), false, 'nothing is touched before the backup'); assert.equal(chapters[0].recheck, undefined);
  await c.uiStatusMigrate();
  assert.equal(puts.length, 1); assert.equal(puts[0].label, 'before-status-split'); assert.match(puts[0].data, /"status":"live"/); assert.doesNotMatch(puts[0].data, /recheck/, 'backup taken before any flag');
  assert.ok(c.db.migrations.statusSplit); assert.ok(chapters[0].recheck);
});
test('the generic edit form cannot approve a story chapter past the gate', () => {
  const src = fs.readFileSync('dist/studio-ui.js', 'utf8');
  assert.match(src, /lfPrepareContent=function\(d,old\)\{uiBasePrepare\(d,old\);if\(old&&old\.seriesId&&\['approved','live'\]\.includes\(d\.status\)/);
});
test('old approvals flagged for recheck (never published) can be revised; published and newly approved chapters stay locked', () => {
  const chapters = [ch(1, 'live'), ch(3, 'approved', { aiReview: rv(78) }), ch(5, 'review', { aiReview: rv(90) })];
  const { c } = studio(chapters, { migrated: true }); c.uiSyncStatuses(true); c.uiChapterApprove('c5');
  assert.equal(c.uiLocked(chapters[0]), true, 'published (even if flagged)'); assert.equal(c.uiLocked(chapters[1]), false, 'flagged old approval'); assert.equal(c.uiLocked(chapters[2]), true, 'approved under the new gate');
  vm.runInContext("uiState.chDraft={c3:{title:'Chương 3',body:'Revised body 3'}}", c); assert.equal(c.uiChapterSave('c3'), true);
  assert.equal(chapters[1].body, 'Revised body 3'); assert.equal(chapters[1].status, 'review', 'no longer shown as approved'); assert.equal(chapters[1].history.at(-1).body, 'Body 3', 'old text kept');
  vm.runInContext("uiState.chDraft={c1:{title:'Chương 1',body:'x'}}", c); assert.throws(() => c.uiChapterSave('c1'), /khóa/);
});
test('asking ChatGPT to revise a flagged old approval turns its label back to review first (so the result can be applied)', async () => {
  const chapters = [ch(3, 'approved', { aiReview: rv(78) })]; const { c } = studio(chapters, { migrated: true }); c.uiSyncStatuses(true);
  c.xnDispatchText = async job => { c.db.aiJobs.push(job); return job; }; c.lfContext = () => 'ctx'; c.lfPlans = () => []; c.lfChapterDefaults = () => ({});
  try { await c.uiChapterWrite(c.db.series[0], chapters[0], 'fix', null, 'Sửa'); } catch (e) { /* the send itself is not under test */ }
  assert.equal(chapters[0].status, 'review');
});
