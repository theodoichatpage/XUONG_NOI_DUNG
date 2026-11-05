// Sudowrite Adapter contracts: every example matches its schema, and key rules are enforced.
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { validate } = require('../shared/validate.cjs');
const dir = 'shared/schemas', ex = 'shared/examples';
const load = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const names = fs.readdirSync(dir).filter(f => f.endsWith('.schema.json')).map(f => f.replace('.schema.json', ''));
const schema = (n) => load(path.join(dir, n + '.schema.json'));
const example = (n) => load(path.join(ex, n + '.json'));

test('every schema has an example that validates', () => {
  assert.ok(names.length >= 7);
  for (const n of names) assert.deepEqual(validate(schema(n), example(n)), [], n);
});
test('orders cap revision rounds at 3 and reject unknown fields', () => {
  const s = schema('production-order'), o = example('production-order');
  assert.match(validate(s, { ...o, max_revision_rounds: 4 }).join(), /above 3/);
  assert.match(validate(s, { ...o, api_key: 'x' }).join(), /unexpected property api_key/);
  assert.match(validate(s, { ...o, writer: 'gpt5' }).join(), /must be one of/);
  const { story_bible_version, ...noVersion } = o;
  assert.match(validate(s, noVersion).join(), /missing story_bible_version/);
});
test('job events need a job key of order:chapter and a known state', () => {
  const s = schema('job-event'), e = example('job-event');
  assert.match(validate(s, { ...e, job_key: 'ord_7Kq2mX9a' }).join(), /does not match/);
  assert.match(validate(s, { ...e, state: 'done' }).join(), /must be one of/);
  assert.deepEqual(validate(s, { ...e, score: null }), []);
});
test('a review must score all 7 criteria and include the Vietnamese summary', () => {
  const s = schema('chapter-review'), r = example('chapter-review');
  const { hook, ...six } = r.rubric;
  assert.match(validate(s, { ...r, rubric: six }).join(), /missing hook/);
  assert.match(validate(s, { ...r, summaryVi: '' }).join(), /shorter than 1/);
  assert.match(validate(s, { ...r, rubric: { ...r.rubric, plot: { score: 25 } } }).join(), /above 20/);
});
test('the rubric in the contract matches Xưởng (20/20/15/15/10/10/10 = 100)', () => {
  const src = fs.readFileSync('dist/story-longform-v2.js', 'utf8');
  const rubric = JSON.parse(src.match(/const LF_RUBRIC=(\[.*?\]\]);/)[1].replace(/'/g, '"'));
  assert.deepEqual(rubric.map(r => r[0]), Object.keys(schema('chapter-review').properties.rubric.properties));
  assert.equal(rubric.reduce((a, r) => a + r[2], 0), 100);
});
test('messages outside the allow-listed kinds are rejected', () => {
  assert.match(validate(schema('adapter-message'), { source: 'XP_STUDIO_V1', kind: 'XP_EVAL' }).join(), /must be one of/);
});
