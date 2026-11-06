'use strict';
// Background side of the semi-automatic Sudowrite flow (loaded by background.js with importScripts).
// Xưởng hands over a chapter brief → the Sudowrite tab shows it → the user writes with Sudowrite's own
// buttons → "Gửi chương về Xưởng" sends the document back → delivered to the Xưởng tab (kept until delivered).
// Contract: shared/schemas/sudowrite-brief.schema.json, docs/sudowrite-adapter/PHASE2_PROTOCOL.md.
const JOB_KEY = /^[A-Za-z0-9_-]{8,64}:[0-9]{1,5}$/;

function cleanBrief(b) {
  const s = (v, max) => String(v ?? '').slice(0, max);
  if (!b || typeof b !== 'object' || !JOB_KEY.test(b.job_key)) throw Error('Brief không hợp lệ (job_key)');
  if (!['write', 'revise'].includes(b.mode)) throw Error('Brief không hợp lệ (mode)');
  const n = Number(b.chapter_no), w = Number(b.target_word_count);
  if (!Number.isInteger(n) || n < 1 || !Number.isInteger(w) || w < 300 || w > 10000) throw Error('Brief không hợp lệ (số chương / số chữ)');
  const out = { schema: 1, job_key: b.job_key, mode: b.mode, chapter_no: n, title: s(b.title, 200), beats: s(b.beats, 12000), previous_ending: s(b.previous_ending, 4000), canon_notes: s(b.canon_notes, 6000), instructions: s(b.instructions, 8000), target_word_count: w, round: Math.max(0, Math.min(3, Number(b.round) || 0)), revision_instructions: (Array.isArray(b.revision_instructions) ? b.revision_instructions : []).map(x => s(x, 600)).filter(Boolean).slice(0, 12), auto: b.auto === true };
  if (!out.instructions.trim()) throw Error('Brief không hợp lệ (thiếu hướng dẫn)');
  return out;
}

function cleanResult(r) {
  if (!r || typeof r !== 'object' || !JOB_KEY.test(r.job_key)) throw Error('Kết quả không hợp lệ');
  const body = String(r.body ?? '');
  if (!body.trim()) throw Error('Tài liệu Sudowrite đang trống');
  if (body.length > 200000) throw Error('Chương quá dài (trên 200.000 ký tự)');
  return { job_key: r.job_key, title: String(r.title ?? '').slice(0, 200), body, words: (body.match(/\S+/g) || []).length, url: String(r.url ?? '').slice(0, 300), at: Date.now() };
}

async function studioTabs() { return (await chrome.tabs.query({})).filter(t => { try { return STUDIO_ORIGINS.has(new URL(t.url).origin); } catch { return false; } }); }

// Sends a message into the Xưởng page (via studio-content.js) and waits for the page's reply.
async function toStudioPage(kind, payload) {
  for (const t of await studioTabs()) {
    try { const r = await chrome.tabs.sendMessage(t.id, { kind: 'XP_TO_PAGE', msg: { kind, payload } }); if (r) return r; } catch {}
  }
  return null;
}

// Delivers kept chapters to Xưởng. A result stays stored until Xưởng confirms it.
async function deliverResults() {
  const { sudoResults = [] } = await chrome.storage.local.get(['sudoResults']);
  if (!sudoResults.length) { await deliverStatus(); return { delivered: 0, left: 0 }; }
  let delivered = 0; const left = [], errors = [];
  for (const r of sudoResults) {
    const reply = await toStudioPage('XP_SUDO_RESULT', r);
    if (reply?.ok) { delivered++; continue; }
    if (reply && reply.ok === false && reply.final) { errors.push(reply.error); continue; } // Xưởng refused for good (e.g. chapter approved)
    left.push(r);
  }
  await chrome.storage.local.set({ sudoResults: left, ...(errors.length ? { sudoLastError: errors.at(-1) } : {}) });
  await deliverStatus();
  return { delivered, left: left.length, error: errors.at(-1) };
}

// Stopped automatic jobs are reported to Xưởng (kept until Xưởng answers).
async function deliverStatus() {
  const { sudoStatus = [] } = await chrome.storage.local.get(['sudoStatus']);
  if (!sudoStatus.length) return;
  const left = [];
  for (const st of sudoStatus) { const r = await toStudioPage('XP_SUDO_STATUS', st); if (!r) left.push(st); }
  await chrome.storage.local.set({ sudoStatus: left });
}

// ---- Automatic runs (sudowrite-auto.js). One run per job_key; the Sudowrite tab that claims it owns it.
const AUTO_STEPS = ['outline', 'start', 'clear', 'rough', 'scenes', 'plan', 'draft', 'read'];
const AUTO_CODES = ['out_of_credits', 'sudowrite_error', 'timeout', 'needs_check', 'ui_changed', 'no_start', 'doc_not_empty', 'wrong_project', 'empty', 'deliver', 'lost', 'error'];
const addLog = (run, text) => { if (text) run.log = [...(run.log || []), { at: Date.now(), text: String(text).slice(0, 200) }].slice(-40); };
async function getRuns() { return (await chrome.storage.local.get(['sudoRuns'])).sudoRuns || {}; }
async function putRun(run) {
  const runs = await getRuns(); runs[run.job_key] = run;
  for (const [k, v] of Object.entries(runs)) if (Date.now() - (v.startedAt || 0) > 30 * 24 * 3600 * 1000) delete runs[k];
  await chrome.storage.local.set({ sudoRuns: runs }); return run;
}
function newRun(brief, old) {
  const run = { job_key: brief.job_key, mode: brief.mode, round: brief.round, state: 'running', paused: false, done: [], step: null, pressed: null, docUrl: old?.docUrl || null, created: !!old?.created, rowId: old?.rowId || null, error: null, code: null, tabId: null, beat: 0, startedAt: Date.now(), log: [] };
  addLog(run, brief.mode === 'revise' ? 'Xưởng giao việc sửa (vòng ' + brief.round + ')' : 'Xưởng giao việc viết'); return run;
}
function cleanPatch(p) {
  const out = {};
  if (p && typeof p === 'object') {
    if (AUTO_STEPS.includes(p.step)) out.step = p.step;
    if (Array.isArray(p.done)) out.done = [...new Set(p.done.filter(x => AUTO_STEPS.includes(x)))];
    if (p.pressed === null) out.pressed = null;
    else if (p.pressed && AUTO_STEPS.includes(p.pressed.step)) out.pressed = { step: p.pressed.step, at: Number(p.pressed.at) || Date.now(), base: Number(p.pressed.base) || 0, baseDoc: Number(p.pressed.baseDoc) || 0 };
    if (typeof p.docUrl === 'string' && /^https:\/\/editor\.sudowrite\.com\/app\/project\//.test(p.docUrl)) out.docUrl = p.docUrl.slice(0, 300);
    if (typeof p.rowId === 'string') out.rowId = p.rowId.slice(0, 120);
    if (p.created === true) out.created = true;
  }
  return out;
}
async function autoHandle(m, sender) {
  const tabId = sender.tab?.id ?? null, runs = await getRuns();
  if (m.kind === 'XP_AUTO_GET') {
    const { sudoBriefs = {}, sudoActive } = await chrome.storage.local.get(['sudoBriefs', 'sudoActive']); const brief = sudoActive && sudoBriefs[sudoActive];
    if (!brief?.auto) return { ok: true, brief: null, run: null };
    const r = runs[brief.job_key] || null;
    if (!r) return { ok: true, brief, run: null };
    if (r.state === 'running' && r.tabId != null && r.tabId !== tabId && Date.now() - r.beat < 20000) return { ok: true, brief, run: r, otherTab: true };
    if (r.state === 'running') { r.tabId = tabId; r.beat = Date.now(); await putRun(r); }
    return { ok: true, brief, run: r };
  }
  const run = runs[m.job_key];
  if (!run) return err('Không có việc tự viết này');
  if (m.kind === 'XP_AUTO_STEP') {
    if (run.tabId != null && run.tabId !== tabId && run.state === 'running') return err('Việc đang chạy ở tab Sudowrite khác');
    Object.assign(run, cleanPatch(m.patch)); run.beat = Date.now(); addLog(run, m.log); return { ok: true, run: await putRun(run) };
  }
  if (m.kind === 'XP_AUTO_FAIL') {
    if (run.state !== 'running') return { ok: true, run };
    run.state = 'stopped'; run.code = AUTO_CODES.includes(m.code) ? m.code : 'error'; run.error = String(m.error || '').slice(0, 400); addLog(run, 'Dừng: ' + run.error); await putRun(run);
    const { sudoStatus = [] } = await chrome.storage.local.get(['sudoStatus']);
    await chrome.storage.local.set({ sudoStatus: [...sudoStatus.filter(x => x.job_key !== run.job_key), { job_key: run.job_key, mode: run.mode, round: run.round, status: 'stopped', code: run.code, error: run.error, step: AUTO_STEPS.includes(m.step) ? m.step : null, at: Date.now() }] });
    await deliverStatus(); return { ok: true, run };
  }
  if (m.kind === 'XP_AUTO_PAUSE') { if (run.state !== 'running') return { ok: true, run }; run.paused = !!m.paused; addLog(run, run.paused ? 'Bạn tạm dừng' : 'Bạn cho chạy tiếp'); return { ok: true, run: await putRun(run) }; }
  if (m.kind === 'XP_AUTO_RESUME') {
    if (run.state !== 'stopped') return { ok: true, run };
    // needs_check: you looked at the page and chose to go on, so the recorded press is cleared.
    // It goes back to the Rough Draft step (the panel is gone after a reload).
    if (run.code === 'needs_check') { run.pressed = null; run.done = run.done.filter(s => ['outline', 'start', 'clear'].includes(s)); }
    run.state = 'running'; run.paused = false; run.error = null; run.code = null; run.tabId = tabId; run.beat = Date.now(); addLog(run, 'Bạn bấm Thử lại'); return { ok: true, run: await putRun(run) };
  }
  return err('Lệnh không hỗ trợ');
}

async function sudoBriefHandle(m, sender) {
  if (m.kind === 'XP_SUDO_BRIEF') {
    if (!fromStudio(sender)) return err('Trang không được phép');
    const brief = cleanBrief(m.brief); const { sudoBriefs = {} } = await chrome.storage.local.get(['sudoBriefs']);
    sudoBriefs[brief.job_key] = { ...brief, at: Date.now() };
    for (const [k, v] of Object.entries(sudoBriefs)) if (Date.now() - v.at > 30 * 24 * 3600 * 1000) delete sudoBriefs[k];
    let already = false;
    if (brief.auto) {
      const old = (await getRuns())[brief.job_key];
      // The same job still running (same round): never start a second run.
      if (old && old.state === 'running' && old.round === brief.round && old.mode === brief.mode) already = true;
      else await putRun(newRun(brief, old));
    }
    await chrome.storage.local.set({ sudoBriefs, sudoActive: brief.job_key });
    const { lastSudoProject: last } = await chrome.storage.local.get(['lastSudoProject']);
    const tabs = (await sudoTabs()).filter(t => /\/app\/project\//.test(t.url));
    if (tabs[0]) {
      await chrome.tabs.update(tabs[0].id, { active: true }); await chrome.windows.update(tabs[0].windowId, { focused: true }).catch(() => {});
      await chrome.tabs.sendMessage(tabs[0].id, { kind: 'XP_SUDO_SHOW_BRIEF' }).catch(() => {});
      return { ok: true, opened: false, already };
    }
    await chrome.tabs.create({ url: last || 'https://editor.sudowrite.com/app' });
    return { ok: true, opened: true, project: !!last, already };
  }
  if (m.kind === 'XP_SUDO_ACTIVE') {
    if (!fromSudowrite(sender)) return err('Chỉ Sudowrite');
    const { sudoBriefs = {}, sudoActive } = await chrome.storage.local.get(['sudoBriefs', 'sudoActive']);
    return { ok: true, brief: sudoActive && sudoBriefs[sudoActive] || null };
  }
  if (m.kind === 'XP_SUDO_DISMISS') {
    if (!fromSudowrite(sender)) return err('Chỉ Sudowrite');
    const { sudoActive } = await chrome.storage.local.get(['sudoActive']);
    if (sudoActive === m.job_key) await chrome.storage.local.remove('sudoActive');
    const run = (await getRuns())[m.job_key]; if (run && run.state !== 'done') { run.state = 'cancelled'; addLog(run, 'Bạn bỏ việc'); await putRun(run); }
    return { ok: true };
  }
  if (m.kind === 'XP_SUDO_RESULT') {
    if (!fromSudowrite(sender)) return err('Chỉ Sudowrite');
    const r = cleanResult(m.result); const { sudoBriefs = {}, sudoResults = [], sudoActive } = await chrome.storage.local.get(['sudoBriefs', 'sudoResults', 'sudoActive']);
    if (!sudoBriefs[r.job_key]) return err('Xưởng chưa giao việc này (hoặc việc đã quá 30 ngày)');
    await chrome.storage.local.set({ sudoResults: [...sudoResults.filter(x => x.job_key !== r.job_key), r] });
    const d = await deliverResults();
    const delivered = !(await chrome.storage.local.get(['sudoResults'])).sudoResults.some(x => x.job_key === r.job_key);
    if (delivered && sudoActive === r.job_key) await chrome.storage.local.remove('sudoActive');
    const run = (await getRuns())[r.job_key]; if (run && ['running', 'stopped'].includes(run.state)) { run.state = 'done'; run.error = null; addLog(run, 'Đã gửi ' + r.words + ' chữ về Xưởng' + (delivered ? '' : ' (chờ mở tab Xưởng)')); await putRun(run); }
    if (delivered && d.error) return err(d.error);
    return { ok: true, delivered };
  }
  if (m.kind.startsWith('XP_AUTO_')) { if (!fromSudowrite(sender)) return err('Chỉ Sudowrite'); return autoHandle(m, sender); }
  if (m.kind === 'XP_STUDIO_READY') { if (!fromStudio(sender)) return err('Trang không được phép'); return { ok: true, ...(await deliverResults()) }; }
  return err('Lệnh không hỗ trợ');
}

async function sudoHealth() {
  const tab = (await sudoTabs()).find(t => /\/app\/project\//.test(t.url));
  if (!tab) return null;
  try { return await Promise.race([chrome.tabs.sendMessage(tab.id, { kind: 'XP_SUDO_HEALTH' }), new Promise(r => setTimeout(() => r(null), 1500))]); } catch { return { ok: false, error: 'Tab Sudowrite chưa nạp Adapter (bấm F5 tab Sudowrite)' }; }
}
