'use strict';
// Sudowrite Adapter ↔ AI Manager (story orders). Loaded by background.js with importScripts.
// Contract: docs/sudowrite-adapter/PHASE2_PROTOCOL.md. All state lives in chrome.storage so a stopped
// service worker loses nothing; the 'xp-mgr' alarm restarts polling.
const MGR_URL = 'http://127.0.0.1:8765';
const MGR_ALARM = 'xp-mgr';
const OUTBOX_MAX = 500;
const STATES = ['queued','writing','waiting_user','reviewing','revising','review_passed','human_review','approved','ready_to_publish','published','publish_failed','failed','paused','cancelled','skipped_existing'];

// Only the Adapter's own pages (popup, opened as popup or tab) may pair, unpair or read state.
function fromExtension(sender) { return typeof sender.url === 'string' && sender.url.startsWith('chrome-extension://' + chrome.runtime.id + '/'); }
async function mgrConf() { const { mgr } = await chrome.storage.local.get(['mgr']); return { url: MGR_URL, ...(mgr || {}) }; }
async function mgrSave(patch) { const c = await mgrConf(); await chrome.storage.local.set({ mgr: { ...c, ...patch } }); return { ...c, ...patch }; }

class MgrError extends Error { constructor(code, message) { super(message); this.code = code; } }

async function mgrFetch(path, { method = 'GET', body, token } = {}) {
  const c = await mgrConf(); const t = token === undefined ? c.token : token;
  if (token === undefined && !t) throw new MgrError('unpaired', 'Chưa ghép đôi với AI Manager');
  const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), 8000);
  let r;
  try {
    r = await fetch(c.url + '/api/story/' + path, { method, signal: ctrl.signal, headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: 'Bearer ' + t } : {}) }, body: body ? JSON.stringify(body) : undefined });
  } catch (e) { throw new MgrError('offline', 'Không kết nối được AI Manager (đã mở MO_AI_MANAGER.bat chưa?)'); }
  finally { clearTimeout(timer); }
  const d = await r.json().catch(() => ({}));
  if (r.status === 401 && t) { await mgrSave({ token: null, state: 'unpaired', error: d.message || 'Token bị thu hồi' }); throw new MgrError('unpaired', d.message || 'Token bị thu hồi'); }
  if (!r.ok || d.ok === false) throw new MgrError(d.error || 'http_' + r.status, d.message || 'AI Manager trả lỗi ' + r.status);
  return d;
}

async function mgrPair(code, url) {
  if (!/^\d{6}$/.test(String(code || '').trim())) throw new MgrError('bad_code', 'Mã ghép đôi gồm 6 chữ số');
  if (url && !/^http:\/\/(127\.0\.0\.1|localhost):\d{2,5}$/.test(url)) throw new MgrError('bad_url', 'Địa chỉ Manager phải là http://127.0.0.1:<cổng>');
  if (url) await mgrSave({ url });
  const d = await mgrFetch('pair', { method: 'POST', token: null, body: { code: String(code).trim(), extension_version: chrome.runtime.getManifest().version } });
  await mgrSave({ token: d.token, pairedAt: Date.now(), state: 'connected', error: null, controlSeq: 0 });
  await mgrTick();
  return { ok: true };
}

async function mgrUnpair() { await mgrSave({ token: null, state: 'unpaired', error: null, orders: [] }); return { ok: true }; }

// Minimal check before an event leaves the browser (full schema: shared/schemas/job-event.schema.json).
function cleanEvent(e) {
  const id = /^[A-Za-z0-9_-]{8,64}$/;
  if (!e || typeof e !== 'object' || !id.test(e.event_id) || !id.test(e.order_id) || !Number.isInteger(e.chapter_no) || e.chapter_no < 1 || !STATES.includes(e.state) || e.job_key !== e.order_id + ':' + e.chapter_no) throw new MgrError('invalid_event', 'Sự kiện không hợp lệ');
  const out = { schema: 1, event_id: e.event_id, order_id: e.order_id, job_key: e.job_key, chapter_no: e.chapter_no, state: e.state, at: typeof e.at === 'string' ? e.at : new Date().toISOString() };
  for (const k of ['round', 'score', 'version', 'words']) if (Number.isInteger(e[k])) out[k] = e[k];
  if (typeof e.message === 'string') out.message = e.message.slice(0, 500);
  if (typeof e.link === 'string' && e.link.startsWith('https://')) out.link = e.link.slice(0, 500);
  return out;
}

async function outboxAdd(event) {
  const ev = cleanEvent(event); const { outbox = [] } = await chrome.storage.local.get(['outbox']);
  if (outbox.some(x => x.event.event_id === ev.event_id)) return { ok: true, duplicate: true };
  outbox.push({ event: ev, tries: 0, next: 0 });
  const dropped = Math.max(0, outbox.length - OUTBOX_MAX);
  // Keep the newest; an older progress state is superseded by a newer one for the same chapter anyway.
  await chrome.storage.local.set({ outbox: outbox.slice(dropped), outboxDropped: ((await chrome.storage.local.get(['outboxDropped'])).outboxDropped || 0) + dropped });
  return { ok: true };
}

const backoff = (tries) => Math.min(5 * 60_000, 5000 * 2 ** tries);

async function outboxFlush(now = Date.now()) {
  const { outbox = [] } = await chrome.storage.local.get(['outbox']);
  const due = outbox.filter(x => x.next <= now).slice(0, 100);
  if (!due.length) return { sent: 0, left: outbox.length };
  try {
    await mgrFetch('events', { method: 'POST', body: { events: due.map(x => x.event) } });
    const sent = new Set(due.map(x => x.event.event_id));
    const { outbox: cur = [] } = await chrome.storage.local.get(['outbox']);
    const left = cur.filter(x => !sent.has(x.event.event_id));
    await chrome.storage.local.set({ outbox: left });
    return { sent: due.length, left: left.length };
  } catch (e) {
    const ids = new Set(due.map(x => x.event.event_id));
    const { outbox: cur = [] } = await chrome.storage.local.get(['outbox']);
    // A rejected event (400/404) will never pass: drop it instead of retrying forever.
    const permanent = /^invalid_|^not_found$/.test(e.code);
    const next = cur.filter(x => !(permanent && ids.has(x.event.event_id))).map(x => ids.has(x.event.event_id) ? { ...x, tries: x.tries + 1, next: now + backoff(x.tries) } : x);
    await chrome.storage.local.set({ outbox: next });
    throw e;
  }
}

// One polling round: health, waiting orders, controls, outbox. Never throws; records the state for the popup.
async function mgrTick() {
  const c = await mgrConf();
  if (!c.token) { await mgrSave({ state: 'unpaired', checkedAt: Date.now() }); return mgrConf(); }
  try {
    const h = await mgrFetch('health');
    const o = await mgrFetch('orders?status=queued,accepted,running');
    const ctl = await mgrFetch('controls?since=' + (c.controlSeq || 0));
    const { controlsPending = [] } = await chrome.storage.local.get(['controlsPending']);
    await chrome.storage.local.set({ controlsPending: [...controlsPending, ...ctl.controls].slice(-200) });
    const orders = o.orders.map(x => ({ order_id: x.order_id, project_title: x.project_title || x.project_id, chapter_start: x.chapter_start, chapter_count: x.chapter_count, writer: x.writer, status: x.status }));
    await mgrSave({ state: orders.some(x => x.status === 'running') ? 'busy' : 'connected', error: null, managerVersion: h.manager_version, orders, controlSeq: ctl.next || c.controlSeq || 0, checkedAt: Date.now(), lastOkAt: Date.now() });
    await outboxFlush().catch(() => {});
  } catch (e) {
    await mgrSave({ state: e.code === 'unpaired' ? 'unpaired' : e.code === 'offline' ? 'disconnected' : 'error', error: e.message, checkedAt: Date.now() });
  }
  return mgrConf();
}

async function mgrHandle(m, sender) {
  const fromPopup = fromExtension(sender);
  if (m.kind === 'XP_MGR_PAIR') { if (!fromPopup) return err('Chỉ popup'); return mgrPair(m.code, m.url); }
  if (m.kind === 'XP_MGR_UNPAIR') { if (!fromPopup) return err('Chỉ popup'); return mgrUnpair(); }
  if (m.kind === 'XP_MGR_TEST') { if (!fromPopup) return err('Chỉ popup'); return { ok: true, mgr: await mgrTick() }; }
  if (m.kind === 'XP_JOB_EVENT') { if (!fromStudio(sender)) return err('Trang không được phép'); return outboxAdd(m.event); }
  return err('Lệnh không hỗ trợ');
}

chrome.alarms.create(MGR_ALARM, { periodInMinutes: 0.5 });
chrome.alarms.onAlarm.addListener(a => { if (a.name === MGR_ALARM) mgrTick(); });
