// ChatGPT review of the Story Bible (REVIEW_BIBLE): input, prompt, validation, storage, freshness and the step 2 gate.
const test = require('node:test'), assert = require('node:assert/strict'), vm = require('node:vm'), fs = require('node:fs');
const { validate } = require('../shared/validate.cjs');
const source = fs.readFileSync('dist/story-longform-v2.js', 'utf8');
function fixture() { let seq = 0; const s = { id: 'book', title: '[TEST] Working', channelId: 'wn', chapterLength: 1500, storyLanguage: 'English' }, ctx = vm.createContext({ db: { series: [s], content: [], aiJobs: [] }, structuredClone, Date, console, uid: () => 'id_' + (++seq), findWebnovelChannel: () => ({ id: 'wn' }), ch: () => ({ language: 'English' }), save: () => true, storyFingerprint: v => JSON.stringify(v) }); const wb = fs.readFileSync('dist/story-workbench.js', 'utf8'); vm.runInContext(wb.slice(wb.indexOf('function storyFingerprint('), wb.indexOf('function storyMapLocalBook(')), ctx); vm.runInContext(source.slice(0, source.indexOf('const lfBaseOpenEditor')), ctx); return { c: ctx, s }; }
const data = (c, k) => vm.runInContext(k, c);
const concept = () => ({ title: 'The Hour That Burns', logline: 'A watch rewinds the hour before a fire.', premise: 'Elias relives one hour each night.', originalityNotes: 'New cast.' });
const bible = c => Object.fromEntries(data(c, 'lfBibleFields').map(k => [k, k === 'title' ? 'The Hour That Burns' : 'Test ' + k]));
function apply(c, s, kind, value, scope = {}) { const j = { seriesId: s.id, storyTask: kind, scope, inputSignature: c.lfHash(c.lfTaskInput(s, kind, scope)), targetSignature: c.lfHash(c.lfPipeline(s).artifacts[c.lfStageFor(kind)] || null) }; c.lfApplyTask(j, JSON.stringify(value)); return j; }
function withBible() { const f = fixture(), { c, s } = f; c.lfSetSource(s, { mode: 'topic', topic: 'A clockmaker relives the hour before a fire', genre: 'Mystery', chapters: 3 }); apply(c, s, 'GENERATE_CONCEPT', concept()); c.lfApprove(s, 'concept'); apply(c, s, 'GENERATE_STORY_BIBLE', bible(c)); c.lfApprove(s, 'bible'); return f; }
const rubric = (c, scores) => Object.fromEntries(data(c, 'LF_BIBLE_RUBRIC').map(([k], i) => [k, { score: scores[i], why: 'vì sao ' + k, fix: 'sửa ' + k }]));

test('REVIEW_BIBLE needs an approved Story Bible and sends concept, bible, characters, outline and glossary', () => {
  const f = fixture(); assert.throws(() => f.c.lfTaskInput(f.s, 'REVIEW_BIBLE'), /Duyệt Cốt truyện tổng quan/);
  const { c, s } = withBible(); const input = c.lfTaskInput(s, 'REVIEW_BIBLE');
  for (const k of ['storyLanguage', 'concept', 'bible', 'characters', 'outline', 'glossary']) assert.ok(k in input, k);
  const p = c.lfTaskPrompt(s, 'REVIEW_BIBLE'); assert.match(p, /JOB: REVIEW_BIBLE/); assert.match(p, /KHÔNG viết lại Story Bible/); assert.match(p, /critical_errors/); assert.match(p, /85\+/);
  assert.equal(data(c, 'lfJobKinds.REVIEW_BIBLE'), 'Chấm Story Bible'); assert.equal(c.lfStageFor('REVIEW_BIBLE'), 'review');
});
test('the result is validated, scored by Xưởng (not by the AI total) and stored with its input signature', () => {
  const { c, s } = withBible(); const scores = [18, 13, 17, 9, 13, 9, 9];
  apply(c, s, 'REVIEW_BIBLE', { rubric: rubric(c, scores), total: 100, strengths: ['Mở đầu mạnh'], weaknesses: [], contradictions: [], critical_errors: [], revision_instructions: ['Thêm mốc thời gian'], summaryVi: 'Tốt' });
  const r = c.lfData(s).bibleReview; assert.equal(r.value.total, 88); assert.equal(r.value.verdict, 'ok'); assert.ok(r.signature); assert.equal(c.lfBibleReviewFresh(s), true);
  assert.deepEqual(validate(JSON.parse(fs.readFileSync('shared/schemas/bible-review.schema.json', 'utf8')), JSON.parse(JSON.stringify(r.value))), []);
});
test('85+ with a critical error or a contradiction is not "ok"', () => {
  const { c } = withBible(), v = s => c.lfValidateBibleReview({ rubric: rubric(c, [20, 15, 20, 10, 15, 10, 10]), summaryVi: 'x', ...s });
  assert.equal(v({}).verdict, 'ok'); assert.equal(v({ critical_errors: ['Nhân vật chính không có mục tiêu'] }).verdict, 'revise');
  assert.equal(v({ contradictions: [{ issue: 'Elias 24 tuổi ở bible, 30 tuổi ở nhân vật', where: 'nhân vật Elias' }] }).verdict, 'revise');
  assert.throws(() => c.lfValidateBibleReview({ rubric: {}, summaryVi: 'x' }), /Thiếu điểm/); assert.throws(() => c.lfValidateBibleReview({ rubric: rubric(c, [1, 1, 1, 1, 1, 1, 1]) }), /summaryVi/);
  assert.equal(c.lfValidateBibleReview({ rubric: rubric(c, [99, 99, 99, 99, 99, 99, 99]), summaryVi: 'x' }).total, 100, 'scores are clamped to each maximum');
});
test('changing the Story Bible makes the review stale (needs a new review)', () => {
  const { c, s } = withBible(); apply(c, s, 'REVIEW_BIBLE', { rubric: rubric(c, [18, 13, 17, 9, 13, 9, 9]), summaryVi: 'Tốt' }); assert.equal(c.lfBibleReviewFresh(s), true);
  c.lfData(s).glossary.push({ id: 'g1', term: 'Vane Clockworks', kind: 'Địa điểm', note: 'workshop' }); assert.equal(c.lfBibleReviewFresh(s), false);
});

// ---- Step 2 panel (dist/studio-ui.js)
function ui(review) {
  const src = fs.readFileSync('dist/studio-ui.js', 'utf8'), s = { id: 'b1', title: '[TEST] Book', story: { pipeline: { artifacts: {} }, bibleReview: review ? { value: review, at: '2026-11-06T09:00:00Z' } : null } };
  const c = vm.createContext({ db: { series: [s], content: [], aiJobs: [], uiSettings: {} }, Date, esc: x => String(x ?? ''), uiTime: x => x, lfData: x => x.story, lfApproved: () => true, lfBibleReviewFresh: () => !!review, LF_BIBLE_RUBRIC: [['premise', 'Ý tưởng', 20], ['conflict', 'Xung đột', 15], ['characters', 'Nhân vật', 20], ['world', 'Thế giới', 10], ['outline', 'Dàn ý', 15], ['consistency', 'Nhất quán', 10], ['genre', 'Thể loại', 10]] });
  const pick = n => { const i = src.indexOf('function ' + n + '('); return src.slice(i, src.indexOf('\n', i)); };
  vm.runInContext(['function uiBibleReviewJob', 'function uiSbReview'].map(x => { const i = src.indexOf(x + '('); let e = src.indexOf('\nfunction ', i + 5); return src.slice(i, e); }).join('\n'), c); void pick;
  return { c, s };
}
const v = (total, crit) => ({ total, verdict: total >= 85 && !crit ? 'ok' : 'revise', rubric: Object.fromEntries(['premise', 'conflict', 'characters', 'world', 'outline', 'consistency', 'genre'].map(k => [k, { score: 5, why: '', fix: '' }])), critical_errors: crit ? [{ issue: 'Bí mật lộ ở chương 1', where: 'dàn ý chương 1' }] : [], contradictions: [], revision_instructions: ['Dời bí mật sang chương 3'], summaryVi: 'Khá' });
test('step 2: no review → a real "Chấm Story Bible" button; with a review → score, critical errors and instructions', () => {
  let { c, s } = ui(null); let html = c.uiSbReview(s); assert.match(html, /data-ui-action="review-bible">Chấm Story Bible</); assert.doesNotMatch(html, /Chưa xây/);
  ({ c, s } = ui(v(78, true))); html = c.uiSbReview(s);
  assert.match(html, /<b>78<\/b>/); assert.match(html, /Cần sửa/); assert.match(html, /Lỗi nghiêm trọng/); assert.match(html, /Bí mật lộ ở chương 1 — dàn ý chương 1/); assert.match(html, /Dời bí mật sang chương 3/); assert.match(html, /Chấm lại/); assert.match(html, /copy-bible-fix/);
});
test('step 2: a fresh review with critical errors blocks "Sang bước 3"', () => {
  const src = fs.readFileSync('dist/studio-ui.js', 'utf8');
  assert.match(src, /blocked=!!bv&&bv\.critical_errors\.length>0/); assert.match(src, /data-ui-storystep="3" '\+\(ready&&!blocked\?'':'disabled'\)/);
});
