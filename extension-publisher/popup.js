'use strict';
const $ = (id) => document.getElementById(id);
const MGR = { connected: ['ok', 'Đã kết nối'], busy: ['busy', 'Đang chạy lệnh'], disconnected: ['err', 'Mất kết nối'], error: ['err', 'Lỗi'], unpaired: ['', 'Chưa ghép đôi'] };
const ORDER = { queued: 'chờ Xưởng nhận', accepted: 'Xưởng đã nhận', running: 'đang chạy' };
function line(name, cls, text) { const d = document.createElement('div'); const dot = document.createElement('i'); dot.className = 'dot ' + cls; const b = document.createElement('b'); b.textContent = name; const s = document.createElement('span'); s.textContent = text; d.append(dot, b, s); return d; }
// Sudowrite: open project, page health (missing parts named), active brief, chapters waiting for Xưởng.
const PART = { editor: 'trình soạn', title: 'ô tên tài liệu', storyBibleNav: 'mục Story Bible' };
function sudoMissing(r) { const s = r.sudoHealth?.selectors; return s ? Object.keys(PART).filter(k => !s[k]).map(k => PART[k]) : []; }
function sudoCls(r) { if (!r.tabs.sudo) return ''; if (r.sudoHealth && r.sudoHealth.ok === false || sudoMissing(r).length) return 'err'; return r.sudoBrief ? 'busy' : 'ok'; }
function sudoText(r) {
  if (!r.tabs.sudo) return r.lastSudoProject ? 'Chưa mở (nhớ dự án gần nhất)' : 'Chưa mở dự án';
  if (r.sudoHealth && r.sudoHealth.ok === false) return r.sudoHealth.error;
  const miss = sudoMissing(r), extra = [r.sudoBrief ? (r.sudoBrief.mode === 'revise' ? 'đang sửa' : 'đang viết') + ' Ch.' + r.sudoBrief.chapter_no : '', r.sudoRun ? 'tự động: ' + ({ running: r.sudoRun.paused ? 'tạm dừng' : 'đang chạy' + (r.sudoRun.step ? ' (' + r.sudoRun.step + ')' : ''), stopped: 'đã dừng — ' + (r.sudoRun.code === 'out_of_credits' ? 'hết credit' : r.sudoRun.code), done: 'xong', cancelled: 'đã bỏ' }[r.sudoRun.state] || r.sudoRun.state) : '', r.sudoWaiting ? r.sudoWaiting + ' chương chờ về Xưởng' : ''].filter(Boolean).join(' · ');
  return (miss.length ? 'Không thấy ' + miss.join(', ') : 'Đang mở dự án') + (extra ? ' · ' + extra : '');
}
function ago(t) { if (!t) return ''; const s = Math.round((Date.now() - t) / 1000); return s < 60 ? s + ' giây trước' : Math.round(s / 60) + ' phút trước'; }

async function render() {
  const r = await chrome.runtime.sendMessage({ kind: 'XP_POPUP_STATE' });
  if (!r?.ok) throw Error(r?.error || 'Không đọc được trạng thái');
  $('ver').textContent = 'Xưởng × Sudowrite × Webnovel · ' + r.version;
  const m = r.mgr || {}, [cls, label] = MGR[m.state] || MGR.unpaired;
  const conn = $('conn'); conn.replaceChildren(
    line('AI Manager', cls, label + (m.checkedAt ? ' · ' + ago(m.checkedAt) : '')),
    line('Xưởng', r.tabs.studio ? 'ok' : '', r.tabs.studio ? 'Đang mở' : 'Chưa mở tab Xưởng'),
    line('Sudowrite', sudoCls(r), sudoText(r)),
    line('Inkstone', r.tabs.ink ? 'ok' : '', r.tabs.ink ? 'Đang mở' : 'Chưa mở'));
  $('msg').textContent = m.error && m.state !== 'connected' && m.state !== 'busy' ? m.error : (r.outbox ? r.outbox + ' cập nhật đang chờ gửi về Manager' : '');
  const box = $('pairbox'); box.replaceChildren();
  if (!m.token) {
    const p = document.createElement('p'); p.className = 'muted'; p.textContent = 'Mở AI Manager → Sản xuất truyện → Tạo mã ghép đôi, rồi nhập mã 6 số:';
    const row = document.createElement('div'); row.className = 'row';
    const input = document.createElement('input'); input.inputMode = 'numeric'; input.maxLength = 6; input.placeholder = '000000';
    const btn = document.createElement('button'); btn.className = 'primary'; btn.textContent = 'Ghép đôi';
    btn.onclick = async () => { btn.disabled = true; $('msg').textContent = 'Đang ghép đôi…'; const x = await chrome.runtime.sendMessage({ kind: 'XP_MGR_PAIR', code: input.value }); $('msg').textContent = x?.ok ? '' : (x?.error || 'Ghép đôi lỗi'); btn.disabled = false; render(); };
    row.append(input, btn); box.append(p, row);
  } else {
    const row = document.createElement('div'); row.className = 'row';
    const btn = document.createElement('button'); btn.textContent = 'Ngắt ghép đôi';
    btn.onclick = async () => { if (confirm('Ngắt ghép đôi với AI Manager trên máy này?')) { await chrome.runtime.sendMessage({ kind: 'XP_MGR_UNPAIR' }); render(); } };
    row.append(btn); box.append(row);
  }
  const orders = $('orders'); orders.replaceChildren();
  if (!m.token) orders.textContent = '—';
  else if (!(m.orders || []).length) orders.textContent = 'Không có lệnh đang chờ.';
  else for (const o of m.orders) { const d = document.createElement('div'); d.textContent = o.project_title + ' · Ch.' + o.chapter_start + '–' + (o.chapter_start + o.chapter_count - 1) + ' · ' + (o.writer === 'sudowrite' ? 'Sudowrite' : 'ChatGPT') + ' · ' + (ORDER[o.status] || o.status); orders.append(d); }
  $('state').textContent = r.pending ? 'Đang chờ điền: “' + r.pending.listing.bookName + '” — mở trang tạo truyện Inkstone (đã đăng nhập).' : 'Sẵn sàng.';
  const report = $('report'); report.replaceChildren();
  if (r.lastReport) { const h = document.createElement('p'); h.className = 'muted'; h.textContent = 'Lần điền gần nhất (' + new Date(r.lastReport.at).toLocaleString('vi-VN') + '):'; report.append(h); for (const it of r.lastReport.items) { const d = document.createElement('div'); d.textContent = (it.ok ? '✓ ' : '✗ ') + it.field + (it.note ? ' — ' + it.note : ''); if (!it.ok) d.className = 'bad'; report.append(d); } }
}
$('test').onclick = async () => { $('msg').textContent = 'Đang kiểm tra…'; await chrome.runtime.sendMessage({ kind: 'XP_MGR_TEST' }); render().catch(e => $('msg').textContent = e.message); };
render().catch(e => { $('state').textContent = e.message; });
