'use strict';
// Automatic chapter writing on Sudowrite (Adapter 0.7.0). Runs only for a brief Xưởng sent with auto:true.
// Path, from the live survey (docs/sudowrite-adapter/SUDOWRITE_AUTOMATION_MAP.md):
//   Outline chapter → Start (linked document) → Generate a Rough Draft → Generate Scenes → Plan Draft → Generate Draft → read → Xưởng.
// Verified live up to Generate Scenes. Plan Draft / Generate Draft were blocked by "0 credits left", so their
// done signal is built from general signals (nothing busy + text stopped changing) and checked against a mock page.
// Rules:
// - A credit-spending button is pressed at most once per step. The press is recorded in the background before the
//   click and survives a reload; after a reload the Adapter never presses again on its own (it waits or asks you).
// - Results are read only when nothing on the page is busy and the text has stopped changing.
// - "0 credits left" stops the job (code out_of_credits); nothing is retried automatically.
// - A document is only cleared if the Adapter created it with Start for this chapter.
(()=>{if(window.__xpSudoAuto)return;window.__xpSudoAuto=true;
const K=window.__xpSudoKit;if(!K)return;
const {wait,norm,setNative,setRich,richText,press,until,buttonByText,outlineRows,rowParts,openBible,editor,readDoc,fitWords,inProject}=K;
const send=m=>chrome.runtime.sendMessage(m).catch(e=>({ok:false,error:e.message}));
const CREDITS=/\b0 credits left\b|out of credits|not enough credits|sign up for a plan to keep using/i;
const SW_ERROR=/there was an error|something went wrong/i;
const BUSY=/loading|checking|reviewing|ensuring|generating|writing|planning|drafting|…|\.\.\./i;
const LABEL={outline:'Dàn ý chương trong Outline',start:'Mở tài liệu chương',clear:'Xóa bản nháp cũ của Adapter',rough:'Mở Generate a Rough Draft',scenes:'Generate Scenes (tốn credit)',plan:'Plan Draft',draft:'Generate Draft (tốn credit)',read:'Đọc chương, gửi về Xưởng'};
const LIMIT={outline:30e3,start:45e3,clear:15e3,rough:20e3,scenes:8*60e3,plan:2*60e3,draft:20*60e3,read:30e3};
const STABLE={times:3,every:2000};
const stepsFor=b=>b.mode==='revise'?['outline','start','clear','rough','scenes','plan','draft','read']:['outline','start','rough','scenes','plan','draft','read'];
class Stop extends Error{constructor(code,msg){super(msg);this.code=code}}
const stop=(code,msg)=>{throw new Stop(code,msg)};
const mine=e=>!!e.closest('[id^="xp-"]');
// Visible page text only (body.innerText skips <script>, which can hold strings like "0 credits left"), minus the Adapter's panels.
function pageText(){let t=document.body.innerText||'';for(const e of document.querySelectorAll('[id^="xp-"]'))if(e.innerText)t=t.split(e.innerText).join('');return t}
function panel(){return document.querySelector('[class*="GeneratePanel"]')}
function btn(re,root=document){return [...root.querySelectorAll('button,[role="button"]')].find(b=>!mine(b)&&b.getClientRects().length&&(re.test((b.getAttribute('aria-label')||'').trim())||re.test((b.innerText||'').trim())))||null}
function busy(){const p=panel();if(p&&[...p.querySelectorAll('button')].some(b=>b.disabled&&BUSY.test(b.innerText||'')))return true;if(p?.querySelector('[aria-busy="true"]'))return true;const w=document.querySelector('button[aria-label="Write"]');return !!(w&&/loading/i.test(w.innerText||''))}
function problem(){const t=pageText();if(CREDITS.test(t))stop('out_of_credits','Sudowrite báo hết credit ("0 credits left"). Mua gói Sudowrite, rồi bấm Thử lại.');const p=panel();const e=p&&(p.innerText||'').match(SW_ERROR);if(e)stop('sudowrite_error','Sudowrite báo lỗi: '+(p.innerText||'').split('\n').find(l=>SW_ERROR.test(l)).slice(0,200))}
const titleEl=()=>document.querySelector('textarea[aria-label="Edit Title"]');
const titleIs=t=>norm(titleEl()?.value)===norm(t);
const docText=()=>{const e=editor();return e?(e.innerText||'').trim():''};
const words=s=>(String(s).match(/\S+/g)||[]).length;
function rowFor(title){return outlineRows().find(r=>norm(rowParts(r).name?.value)===norm(title))||null}
function blankRow(){return outlineRows().find(r=>{const p=rowParts(r);return /^(chapter\s*\d*)?$/i.test(String(p.name?.value||'').trim())&&!richText(p.summary)})||null}
function summaryText(b){const notes=(b.revision_instructions||[]).length?'\n\nRevision notes (round '+b.round+') — fix all of these:\n- '+b.revision_instructions.join('\n- '):'';const prev=b.previous_ending?'\n\nThe previous chapter ended with: '+b.previous_ending.slice(-400):'';return fitWords((b.beats||b.title)+prev+notes,1500)}

let brief=null,run=null,running=false,lastBeat=0,shown='';
async function mark(patch,log){const r=await send({kind:'XP_AUTO_STEP',job_key:brief.job_key,patch,log});if(r?.ok&&r.run)run=r.run;else if(r&&!r.ok)stop('lost',r.error||'Adapter không ghi được tiến độ');draw();return run}
async function beat(){if(Date.now()-lastBeat<5000)return;lastBeat=Date.now();await mark({})}
// Waits for a finished state: nothing busy, ready() true, and sample() unchanged STABLE.times in a row.
async function waitDone(step,ready,sample){const end=Date.now()+LIMIT[step];let last=null,same=0;
 while(Date.now()<end){problem();const s=sample?sample():'';if(!busy()&&ready()){same=s===last?same+1:0;if(same>=STABLE.times-1)return true}else same=0;last=s;await beat();await wait(STABLE.every)}
 stop('timeout','Quá '+Math.round(LIMIT[step]/60e3)+' phút mà Sudowrite chưa xong bước "'+LABEL[step]+'".')}
// A credit-spending press, recorded before the click. After a reload the recorded press is never repeated.
// pressedHere: presses made by this page load. A press recorded before a reload is trusted only while Sudowrite is
// visibly still busy; text already on the page may be half-written, so it is never read as the result.
const pressedHere=new Set();
async function creditPress(step,find,started){if(run.pressed?.step===step){if(pressedHere.has(step)&&(busy()||started(run.pressed)))return run.pressed;if(!pressedHere.has(step)&&busy()){pressedHere.add(step);return run.pressed}stop('needs_check','Trang đã tải lại sau khi Adapter bấm "'+LABEL[step]+'". Nếu chương trong tài liệu đã xong, bấm "Gửi chương về Xưởng". Nếu chưa, xóa phần viết dở rồi bấm Thử lại (Adapter mở lại Rough Draft; bấm lại sẽ tốn credit).')}
 const b=find();if(!b)stop('ui_changed','Không thấy nút cho bước "'+LABEL[step]+'". Sudowrite có thể đã đổi giao diện.');if(b.disabled)stop('ui_changed','Nút của bước "'+LABEL[step]+'" đang bị khóa.');
 const rec={step,at:Date.now(),base:(panel()?.innerText||'').length,baseDoc:docText().length};await mark({pressed:rec},'Bấm '+LABEL[step]);pressedHere.add(step);await press(b);
 const ok=await until(()=>{problem();return busy()||started(rec)},20000);if(!ok)stop('no_start','Đã bấm "'+LABEL[step]+'" nhưng Sudowrite không bắt đầu.');return rec}

const STEP={
 async outline(b){if(!document.getElementById('story-bible-outline')){openBible();await until(()=>document.getElementById('story-bible-outline'),15000)}
  const sec=document.getElementById('story-bible-outline');if(!sec)stop('ui_changed','Không mở được mục Outline trong Story Bible.');sec.scrollIntoView({block:'start'});
  let row=await until(()=>rowFor(b.title),1500);
  if(!row&&run.pressed?.step==='outline')row=blankRow();// Add Chapter was pressed before a reload: reuse that row
  if(!row){const add=buttonByText(sec,/^\s*add chapter\s*$/i);if(!add)stop('ui_changed','Không thấy nút Add Chapter trong Outline.');const before=new Set(outlineRows());await mark({pressed:{step:'outline',at:Date.now()}},'Thêm chương vào Outline');await press(add);row=await until(()=>outlineRows().find(r=>!before.has(r)),8000);if(!row)stop('ui_changed','Đã bấm Add Chapter nhưng không thấy chương mới.')}
  row.scrollIntoView({block:'center'});const p=await until(()=>{const x=rowParts(row);return x.name&&x.summary?x:null},8000);if(!p)stop('ui_changed','Chương trong Outline chưa hiện ô tên / tóm tắt.');
  if(norm(p.name.value)!==norm(b.title)){p.name.focus();setNative(p.name,b.title)}
  const text=summaryText(b);if(norm(richText(p.summary))!==norm(text)){await setRich(p.summary,text);p.summary.blur();p.summary.dispatchEvent(new FocusEvent('focusout',{bubbles:true}))}
  if(!await until(()=>{const x=rowParts(row);return norm(x.name?.value)===norm(b.title)&&richText(x.summary).length>0},5000))stop('ui_changed','Không ghi được tên / tóm tắt chương vào Outline.');
  return {rowId:row.id}},
 async start(b){
  if(run.docUrl){const u=new URL(run.docUrl);if(u.pathname!==location.pathname){location.href=run.docUrl;await wait(15000);stop('wrong_project','Không mở được tài liệu chương trong dự án Sudowrite đã dùng.')}
   if(location.hash!==u.hash)location.hash=u.hash;if(await until(()=>editor()&&titleIs(b.title),15000))return {docUrl:location.href}}
  const row=rowFor(b.title)||(run.rowId&&document.getElementById(run.rowId));if(!row)stop('ui_changed','Không thấy Chương "'+b.title+'" trong Outline.');
  const st=buttonByText(row,/^\s*start\s*$/i);let created=false;
  if(st){await press(st);created=true}
  else{const d=[...document.querySelectorAll('[role="button"][aria-label]')].find(e=>!mine(e)&&norm(e.getAttribute('aria-label'))===norm(b.title));if(!d)stop('ui_changed','Chương trong Outline không có nút Start và không thấy tài liệu cùng tên.');await press(d)}
  if(!await until(()=>editor()&&titleIs(b.title)&&/doc=/.test(location.hash),LIMIT.start))stop('ui_changed','Đã bấm Start nhưng không thấy tài liệu "'+b.title+'".');
  return {docUrl:location.href,created:created||!!run.created}},
 async clear(){if(!docText())return {};if(!run.created)stop('doc_not_empty','Tài liệu chương có chữ nhưng không do Adapter tạo, nên Adapter không xóa. Xóa tay hoặc dùng "Gửi chương về Xưởng".');
  const ed=editor();ed.focus();const sel=getSelection(),r=document.createRange();r.selectNodeContents(ed);sel.removeAllRanges();sel.addRange(r);document.execCommand('delete');
  if(!await until(()=>!docText(),LIMIT.clear))stop('ui_changed','Không xóa được bản nháp cũ trong tài liệu.');return {}},
 async rough(){if(panel())return {};if(docText())stop('doc_not_empty','Tài liệu chương đã có chữ, Adapter không viết đè. Xóa tay hoặc dùng "Gửi chương về Xưởng".');
  const g=await until(()=>document.querySelector('button[aria-label="Generate a Rough Draft"]')||btn(/^generate a rough draft$/i),LIMIT.rough);if(!g)stop('ui_changed','Không thấy nút "Generate a Rough Draft" trong tài liệu chương.');
  await press(g);if(!await until(panel,LIMIT.rough))stop('ui_changed','Bảng Generate a Rough Draft không mở.');return {}},
 async scenes(){if(!panel())stop('needs_check','Bảng Rough Draft đã đóng (có thể do tải lại trang). Mở lại tài liệu chương rồi bấm Thử lại.');
  const grown=rec=>(panel()?.innerText||'').length>(rec.base||0)+200;
  const rec=await creditPress('scenes',()=>btn(/^generate scenes$/i,panel()),grown);
  await waitDone('scenes',()=>grown(rec)&&!!btn(/plan draft/i,panel()||document),()=>String((panel()?.innerText||'').length));return {}},
 async plan(){const p=panel();if(!p)stop('needs_check','Bảng Rough Draft đã đóng. Mở lại tài liệu chương rồi bấm Thử lại.');if(btn(/^generate draft$/i,p))return {};
  const b=btn(/plan draft/i,p);if(!b)stop('ui_changed','Không thấy nút Plan Draft.');await press(b);
  const end=Date.now()+LIMIT.plan;while(Date.now()<end){problem();if(btn(/^generate draft$/i,panel()||document))return {};await beat();await wait(1000)}stop('timeout','Plan Draft chưa xong.')},
 async draft(b){const rec=await creditPress('draft',()=>btn(/^generate draft$/i,panel()||document),r=>docText().length>(r.baseDoc||0));
  await waitDone('draft',()=>words(docText())>=Math.min(100,b.target_word_count)&&!(panel()&&btn(/^generate draft$/i,panel())?.disabled),()=>String(docText().length));return {}},
 async read(b){const d=readDoc();if(!d.ok)stop('empty',d.error);const r=await send({kind:'XP_SUDO_RESULT',result:{job_key:b.job_key,title:d.title,body:d.body,words:d.words,url:d.url}});if(!r?.ok)stop('deliver',r?.error||'Không gửi được chương về Xưởng');return {delivered:!!r.delivered}}
};

async function go(){for(const step of stepsFor(brief)){if((run.done||[]).includes(step))continue;
  const g=await send({kind:'XP_AUTO_GET'});if(!g?.ok||g.brief?.job_key!==brief.job_key||!g.run||g.otherTab){run=g?.run||run;draw();return}run=g.run;if(run.state!=='running'||run.paused){draw();return}
  await mark({step},'Bắt đầu: '+LABEL[step]);
  try{const patch=await STEP[step](brief);await mark({...patch,done:[...(run.done||[]),step],pressed:null},'Xong: '+LABEL[step])}
  catch(e){const code=e instanceof Stop?e.code:'error';const r=await send({kind:'XP_AUTO_FAIL',job_key:brief.job_key,code,error:String(e.message||e).slice(0,400),step});if(r?.run)run=r.run;draw();return}}}
async function tick(){if(running||!inProject())return;running=true;try{const g=await send({kind:'XP_AUTO_GET'});if(!g?.ok||!g.brief){brief=null;run=null;draw();return}brief=g.brief;run=g.run;draw(g.otherTab);if(!run||g.otherTab||run.state!=='running'||run.paused)return;await go()}catch{}finally{running=false}}

// ---- Panel (bottom right): steps, log, pause / resume / retry / drop.
const el=(tag,css,text)=>{const e=document.createElement(tag);if(css)e.style.cssText=css;if(text!=null)e.textContent=text;return e};
const B='height:28px;padding:0 10px;border:1px solid #3a3a40;background:#1d1d20;color:#f2f2f2;cursor:pointer;font:600 12px Arial,sans-serif';
const STATE={running:'Đang chạy',stopped:'Đã dừng',done:'Xong',cancelled:'Đã bỏ'};
function draw(other){const key=JSON.stringify([brief,run,other]);if(key===shown&&document.getElementById('xp-sudo-auto'))return;shown=key;document.getElementById('xp-sudo-auto')?.remove();if(!brief||!run)return;
 const box=el('div','position:fixed;right:16px;bottom:16px;z-index:2147483646;width:400px;max-height:80vh;overflow:auto;background:#121213;color:#f2f2f2;border:1px solid #ff5a1f;box-shadow:0 14px 40px rgba(0,0,0,.45);font:13px/1.5 Arial,sans-serif;padding:12px');box.id='xp-sudo-auto';
 box.append(el('strong','display:block;color:#ff7a45',(brief.mode==='revise'?'Xưởng · Tự sửa ':'Xưởng · Tự viết ')+'Chương '+brief.chapter_no+(brief.round?' · vòng '+brief.round:'')),el('div','font-weight:700',brief.title));
 const st=run.paused&&run.state==='running'?'Tạm dừng (dừng sau bước đang chạy)':STATE[run.state]||run.state;box.append(el('div','margin:4px 0 8px;color:'+(run.state==='stopped'?'#ffb59c':run.state==='done'?'#4ade80':'#d6d6da'),'Trạng thái: '+st+(other?' · đang chạy ở tab Sudowrite khác':'')));
 for(const s of stepsFor(brief)){const done=(run.done||[]).includes(s),cur=run.step===s&&!done;box.append(el('div','padding:2px 0;color:'+(done?'#f2f2f2':cur?'#ff7a45':'#8b8b90'),(done?'✓ ':cur?'▶ ':'· ')+LABEL[s]))}
 if(run.error)box.append(el('p','margin:8px 0;color:#ffb59c',run.error));
 const log=(run.log||[]).slice(-5);if(log.length)box.append(el('div','margin-top:8px;color:#8b8b90;font-size:11.5px;white-space:pre-wrap',log.map(l=>new Date(l.at).toLocaleTimeString()+' '+l.text).join('\n')));
 const row=el('div','display:flex;flex-wrap:wrap;gap:6px;margin-top:10px');
 const act=(label,msg,primary)=>{const b=el('button',B+(primary?';background:#ff5a1f;border-color:#ff5a1f;color:#0b0b0c':''),label);b.onclick=async()=>{b.disabled=true;const r=await send({...msg,job_key:brief.job_key});if(r?.run)run=r.run;shown='';draw();tick()};row.append(b)};
 if(run.state==='running')act(run.paused?'Tiếp tục':'Tạm dừng',{kind:'XP_AUTO_PAUSE',paused:!run.paused},run.paused);
 if(run.state==='stopped'){act('Thử lại',{kind:'XP_AUTO_RESUME'},true);const sb=el('button',B,'Gửi chương về Xưởng');sb.onclick=async()=>{const d=readDoc();if(!d.ok)return alert(d.error);if(!confirm('Gửi tài liệu đang mở ('+d.words+' chữ) về Xưởng làm Chương '+brief.chapter_no+'?'))return;sb.disabled=true;const r=await send({kind:'XP_SUDO_RESULT',result:{job_key:brief.job_key,title:d.title,body:d.body,words:d.words,url:d.url}});if(!r?.ok)return alert(r?.error||'Không gửi được');shown='';tick()};row.append(sb)}
 if(run.state!=='done'){const d=el('button',B,'Bỏ việc này');d.onclick=async()=>{if(!confirm('Bỏ việc tự viết Chương '+brief.chapter_no+'? Chương trong Xưởng không bị thay đổi.'))return;await send({kind:'XP_SUDO_DISMISS',job_key:brief.job_key});brief=null;run=null;shown='';draw()};row.append(d)}
 box.append(row);document.body.append(box)}

chrome.runtime.onMessage.addListener(m=>{if(m?.kind==='XP_SUDO_SHOW_BRIEF')setTimeout(tick,300)});
setInterval(tick,1500);tick();
})();
