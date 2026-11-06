// Step 3a: an approved chapter → Inkstone "create chapter" page (title + body). The Adapter never presses save or publish.
const test = require('node:test'), assert = require('node:assert/strict'), vm = require('node:vm'), fs = require('node:fs');
const plain = x => JSON.parse(JSON.stringify(x));
function adapter() {
  let receiver; const storage = {}, opened = [], updated = [], scripts = [], tabs = { all: [] };
  const chrome = { runtime: { id: 'xp', getManifest: () => ({ version: '0.8.0' }), onMessage: { addListener(fn) { receiver = fn; } } },
    storage: { local: { async get(keys) { return Object.fromEntries(keys.map(k => [k, storage[k]])); }, async set(o) { Object.assign(storage, structuredClone(o)); }, async remove(k) { delete storage[k]; } } },
    tabs: { async query(q) { return tabs.all.filter(t => !q?.url || t.url.startsWith(q.url.replace('*', ''))); }, async update(id, p) { updated.push([id, p.url]); }, async create(t) { opened.push(t.url); }, async sendMessage() {} },
    windows: { async update() {} }, alarms: { create() {}, onAlarm: { addListener() {} } },
    scripting: { async executeScript(o) { scripts.push(o); return [{ result: { ok: true, words: 3, paragraphs: 2 } }]; } } };
  const ctx = vm.createContext({ chrome, URL, Date, AbortController, setTimeout, clearTimeout, fetch: async () => { throw Error('offline'); }, importScripts: (...f) => f.forEach(n => vm.runInContext(fs.readFileSync('extension-publisher/' + n, 'utf8'), ctx)) });
  vm.runInContext(fs.readFileSync('extension-publisher/background.js', 'utf8'), ctx);
  const send = (m, s) => new Promise(r => receiver(m, { id: 'xp', ...s }, r)).then(plain);
  return { send, storage, opened, updated, scripts, tabs };
}
const STUDIO = { url: 'https://xuong-noi-dung-khaki.vercel.app/#series', tab: { id: 1 } };
const INK = id => ({ url: 'https://inkstone.webnovel.com/novels/chapter/create/' + id, tab: { id: 9 } });
const chapter = { bookId: '37373679300070605', chapterNo: 3, title: 'Water Has Its Own Price', body: 'Para one.\n\nPara two.' };

test('only Xưởng can hand over a chapter; it opens that novel\'s create-chapter page', async () => {
  const a = adapter();
  assert.equal((await a.send({ kind: 'XP_INK_CHAPTER', chapter }, INK('1'))).ok, false);
  assert.match((await a.send({ kind: 'XP_INK_CHAPTER', chapter: { ...chapter, bookId: 'x' } }, STUDIO)).error, /mã truyện/);
  assert.match((await a.send({ kind: 'XP_INK_CHAPTER', chapter: { ...chapter, body: ' ' } }, STUDIO)).error, /thiếu tiêu đề hoặc nội dung/);
  assert.equal((await a.send({ kind: 'XP_INK_CHAPTER', chapter }, STUDIO)).ok, true);
  assert.deepEqual(a.opened, ['https://inkstone.webnovel.com/novels/chapter/create/37373679300070605']);
});
test('the chapter is given only to the matching novel\'s page, once, within 15 minutes', async () => {
  const a = adapter(); await a.send({ kind: 'XP_INK_CHAPTER', chapter }, STUDIO);
  assert.equal((await a.send({ kind: 'XP_INK_TAKE' }, STUDIO)).ok, false, 'only Inkstone takes it');
  assert.equal((await a.send({ kind: 'XP_INK_TAKE' }, INK('99999999'))).pending, null, 'another novel gets nothing');
  const t = await a.send({ kind: 'XP_INK_TAKE' }, INK(chapter.bookId)); assert.equal(t.pending.title, 'Water Has Its Own Price');
  assert.equal((await a.send({ kind: 'XP_INK_TAKE' }, INK(chapter.bookId))).pending, null, 'taken once');
  await a.send({ kind: 'XP_INK_CHAPTER', chapter }, STUDIO); a.storage.pendingInkChapter.at -= 16 * 60 * 1000;
  assert.equal((await a.send({ kind: 'XP_INK_TAKE' }, INK(chapter.bookId))).pending, null, 'expired');
});
test('the body is set through the page\'s own TinyMCE (main world), in the sender tab only', async () => {
  const a = adapter(); const r = await a.send({ kind: 'XP_INK_SETBODY', html: '<p>a</p><p>b</p>' }, INK(chapter.bookId));
  assert.equal(r.ok, true); assert.equal(a.scripts[0].world, 'MAIN'); assert.equal(a.scripts[0].target.tabId, 9); assert.deepEqual(plain(a.scripts[0].args), ['<p>a</p><p>b</p>']);
  assert.equal((await a.send({ kind: 'XP_INK_SETBODY', html: 'x' }, STUDIO)).ok, false);
  assert.ok(JSON.parse(fs.readFileSync('extension-publisher/manifest.json', 'utf8')).permissions.includes('scripting'));
});
test('the Inkstone content script never presses save or publish', () => {
  const src = fs.readFileSync('extension-publisher/inkstone-content.js', 'utf8'), part = src.slice(src.indexOf('// ---- New chapter page'));
  assert.doesNotMatch(part, /\.click\(\)/.source ? /(publish|save)[^;]{0,40}\.click\(\)/i : /x/);
  assert.doesNotMatch(part, /querySelector[^;]*(publish|save)/i);
});
test('Xưởng sends only chapters that passed the approval gate, and asks for the Inkstone link once', () => {
  const src = fs.readFileSync('dist/studio-ui.js', 'utf8');
  assert.match(src, /\['mark','save-schedule','ink-fill'\]\.includes\(cmd\)&&!await uiScoreGate\(s,list\)/);
  assert.match(src, /novels\\\/\(\?:view\|chapter\\\/create\)\\\/\(\\d\{6,25\}\)/);
  assert.match(src, /uiPersist\(\(\)=>\{s\.inkstoneBookId=book\}\)/);
});
