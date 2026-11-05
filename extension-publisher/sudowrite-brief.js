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
  const out = { schema: 1, job_key: b.job_key, mode: b.mode, chapter_no: n, title: s(b.title, 200), beats: s(b.beats, 12000), previous_ending: s(b.previous_ending, 4000), canon_notes: s(b.canon_notes, 6000), instructions: s(b.instructions, 8000), target_word_count: w, round: Math.max(0, Math.min(3, Number(b.round) || 0)), revision_instructions: (Array.isArray(b.revision_instructions) ? b.revision_instructions : []).map(x => s(x, 600)).filter(Boolean).slice(0, 12) };
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
  if (!sudoResults.length) return { delivered: 0, left: 0 };
  let delivered = 0; const left = [], errors = [];
  for (const r of sudoResults) {
    const reply = await toStudioPage('XP_SUDO_RESULT', r);
    if (reply?.ok) { delivered++; continue; }
    if (reply && reply.ok === false && reply.final) { errors.push(reply.error); continue; } // Xưởng refused for good (e.g. chapter approved)
    left.push(r);
  }
  await chrome.storage.local.set({ sudoResults: left, ...(errors.length ? { sudoLastError: errors.at(-1) } : {}) });
  return { delivered, left: left.length, error: errors.at(-1) };
}

async function sudoBriefHandle(m, sender) {
  if (m.kind === 'XP_SUDO_BRIEF') {
    if (!fromStudio(sender)) return err('Trang không được phép');
    const brief = cleanBrief(m.brief); const { sudoBriefs = {} } = await chrome.storage.local.get(['sudoBriefs']);
    sudoBriefs[brief.job_key] = { ...brief, at: Date.now() };
    for (const [k, v] of Object.entries(sudoBriefs)) if (Date.now() - v.at > 30 * 24 * 3600 * 1000) delete sudoBriefs[k];
    await chrome.storage.local.set({ sudoBriefs, sudoActive: brief.job_key });
    const { lastSudoProject: last } = await chrome.storage.local.get(['lastSudoProject']);
    const tabs = (await sudoTabs()).filter(t => /\/app\/project\//.test(t.url));
    if (tabs[0]) {
      await chrome.tabs.update(tabs[0].id, { active: true }); await chrome.windows.update(tabs[0].windowId, { focused: true }).catch(() => {});
      await chrome.tabs.sendMessage(tabs[0].id, { kind: 'XP_SUDO_SHOW_BRIEF' }).catch(() => {});
      return { ok: true, opened: false };
    }
    await chrome.tabs.create({ url: last || 'https://editor.sudowrite.com/app' });
    return { ok: true, opened: true, project: !!last };
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
    if (delivered && d.error) return err(d.error);
    return { ok: true, delivered };
  }
  if (m.kind === 'XP_STUDIO_READY') { if (!fromStudio(sender)) return err('Trang không được phép'); return { ok: true, ...(await deliverResults()) }; }
  return err('Lệnh không hỗ trợ');
}

async function sudoHealth() {
  const tab = (await sudoTabs()).find(t => /\/app\/project\//.test(t.url));
  if (!tab) return null;
  try { return await Promise.race([chrome.tabs.sendMessage(tab.id, { kind: 'XP_SUDO_HEALTH' }), new Promise(r => setTimeout(() => r(null), 1500))]); } catch { return { ok: false, error: 'Tab Sudowrite chưa nạp Adapter (bấm F5 tab Sudowrite)' }; }
}
