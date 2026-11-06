'use strict';
// Fills Inkstone's "create novel" form (Ant Design) from a listing handed over by Xưởng. Never presses Create.
(()=>{if(window.__xpInk)return;window.__xpInk=true;
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,ms=8000,step=150){const end=Date.now()+ms;while(Date.now()<end){const v=fn();if(v)return v;await wait(step)}return null}
const norm=s=>String(s||'').toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]+/g,' ').trim();
function setNative(el,value){const proto=el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(el,value);el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}))}
function radioByText(text){const lab=[...document.querySelectorAll('label.ant-radio-wrapper')].find(l=>norm(l.textContent)===norm(text));if(!lab)return false;if(!lab.classList.contains('ant-radio-wrapper-checked'))(lab.querySelector('input')||lab).click();return true}
function formItem(re){return [...document.querySelectorAll('.ant-form-item')].find(fi=>re.test(fi.querySelector('.ant-form-item-label')?.textContent||''))}
function openDropdown(){return [...document.querySelectorAll('.ant-select-dropdown')].filter(d=>!d.classList.contains('ant-select-dropdown-hidden')&&getComputedStyle(d).display!=='none').at(-1)||null}
function closeDropdown(){document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));document.activeElement?.blur?.()}
function optionNames(dd){return [...dd.querySelectorAll('.ant-select-item-option')].map(o=>({el:o,name:(o.getAttribute('title')||o.textContent||'').trim()}))}
// Opens an Ant Select, scrolls its (virtual) list, and clicks the option chosen by match(names) -> index.
async function pickSelect(root,match){if(!root)return {ok:false,note:'không thấy ô trên trang'};if(root.classList.contains('ant-select-disabled')){await until(()=>!root.classList.contains('ant-select-disabled'),6000);if(root.classList.contains('ant-select-disabled'))return {ok:false,note:'ô đang khóa'}}
 root.querySelector('.ant-select-selector')?.dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));const dd=await until(openDropdown,5000);if(!dd)return {ok:false,note:'không mở được danh sách'};await until(()=>dd.querySelector('.ant-select-item-option'),4000);
 const seen=new Map,holder=dd.querySelector('.rc-virtual-list-holder');for(let step=0;step<25;step++){for(const o of optionNames(dd))if(!seen.has(o.name))seen.set(o.name,o.el);const names=[...seen.keys()],i=match(names);if(i>=0){const name=names[i],el=optionNames(dd).find(o=>o.name===name)?.el;if(el){el.dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));el.click();await wait(300);return {ok:true,note:name}}}if(!holder||holder.scrollTop+holder.clientHeight>=holder.scrollHeight-2)break;holder.scrollTop+=Math.max(80,holder.clientHeight-40);holder.dispatchEvent(new Event('scroll',{bubbles:true}));await wait(150)}
 const names=[...seen.keys()];closeDropdown();return {ok:false,note:'chưa có mục khớp — chọn tay. Có: '+names.slice(0,20).join(', ')}}
function bestMatch(target){const t=norm(target);return names=>{const n=names.map(norm);let i=n.indexOf(t);if(i>=0)return i;i=n.findIndex(x=>x&&(x.includes(t)||t.includes(x)));if(i>=0)return i;const stem=w=>w.slice(0,5),words=t.split(' ').filter(w=>w.length>2);let best=-1,score=0;n.forEach((x,k)=>{const xs=x.split(' ');const sc=words.filter(w=>xs.some(y=>y===w||(y.length>3&&stem(y)===stem(w)))).length;if(sc>score){score=sc;best=k}});return best}}
function lengthMatch(len){return names=>{const n=names.map(norm);let i=n.findIndex(x=>x.split(' ')[0]===len);if(i>=0)return i;const re={short:/(^| )(short|less|under|below)( |$)/,medium:/(^| )(medium|middle|moderate)( |$)/,long:/(^| )(long|over|more|above)( |$)/}[len];i=n.findIndex(x=>re.test(x));if(i>=0)return i;const k={short:0,medium:1,long:2}[len];return names.length>k?k:-1}}
function warningMatch(w){const none=!w||/^none$/i.test(w.trim());return names=>{const n=names.map(norm);if(none)return n.findIndex(x=>/(^| )(no|none|general|all ages|everyone)( |$)/.test(x));const t=norm(w);let i=n.findIndex(x=>t.split(' ').some(word=>word.length>3&&x.includes(word)));return i}}
async function pickTags(tags){const item=formItem(/tag/i);if(!item)return [{field:'Tag',ok:false,note:'không thấy ô tag'}];const roots=[...item.querySelectorAll('.ant-select')],root=roots.at(-1),input=root?.querySelector('input');if(!root||!input)return [{field:'Tag',ok:false,note:'không thấy ô tìm tag'}];if(root.classList.contains('ant-select-disabled'))await until(()=>!root.classList.contains('ant-select-disabled'),5000);const out=[];
 for(const tag of tags){input.focus();root.querySelector('.ant-select-selector')?.dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));setNative(input,tag);await wait(600);const dd=openDropdown(),opts=dd?optionNames(dd):[],i=bestMatch(tag)(opts.map(o=>o.name));if(i>=0&&norm(opts[i].name).length){opts[i].el.dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));opts[i].el.click();out.push(opts[i].name);await wait(250)}setNative(input,'')}
 closeDropdown();return [{field:'Tag',ok:out.length>0,note:out.length?'đã chọn: '+out.join(', ')+(out.length<tags.length?' (một số tag không có trên Webnovel)':''):'không tìm thấy tag nào — có thể cần chọn Tag category trước'}]}
function banner(items){let el=document.getElementById('xp-fill-report');if(!el){el=document.createElement('div');el.id='xp-fill-report';el.style.cssText='position:fixed;top:16px;right:16px;z-index:2147483647;width:380px;max-height:80vh;overflow:auto;background:#121213;color:#f2f2f2;border:1px solid #ff5a1f;box-shadow:0 14px 40px rgba(0,0,0,.45);font:13px/1.5 Arial,sans-serif;padding:14px';document.body.append(el)}
 el.replaceChildren();const h=document.createElement('strong');h.textContent='Xưởng đã điền hồ sơ truyện';h.style.cssText='display:block;font-size:14px;color:#ff7a45;margin-bottom:8px';el.append(h);
 for(const it of items){const row=document.createElement('div');row.style.cssText='padding:4px 0;border-bottom:1px solid #26262a';row.textContent=(it.ok?'✓ ':'✗ ')+it.field+(it.note?' — '+it.note:'');row.style.color=it.ok?'#f2f2f2':'#ffb59c';el.append(row)}
 const tip=document.createElement('p');tip.style.cssText='margin:10px 0 0;color:#d6d6da';tip.textContent='Ảnh bìa: bấm UPLOAD và chọn file bìa 600×800 đã tải từ Xưởng. Kiểm tra lại các ô ✗, rồi tự bấm CREATE — extension không tự tạo truyện.';el.append(tip);
 const close=document.createElement('button');close.textContent='Đóng';close.style.cssText='margin-top:10px;height:28px;padding:0 12px;background:#ff5a1f;color:#0b0b0c;border:0;font-weight:700;cursor:pointer';close.onclick=()=>el.remove();el.append(close)}
async function fill(l){const items=[],put=(field,ok,note='')=>items.push({field,ok,note});
 const title=document.getElementById('bookTitle');if(title){setNative(title,l.bookName);put('Tên truyện',true,l.bookName)}else put('Tên truyện',false,'không thấy ô');
 put('Type',radioByText('novel'),'Novel');
 const genderText=l.leadingGender==='female'?'Female Oriented':'Male Oriented';put('Leading gender',radioByText(genderText),genderText);await wait(500);
 const g=await pickSelect(document.getElementById('categoryId')?.closest('.ant-select'),bestMatch(l.genre));put('Genre ('+l.genre+')',g.ok,g.note);
 const syn=document.getElementById('synopsis');if(syn){setNative(syn,l.synopsis);put('Giới thiệu',true,l.synopsis.length+' ký tự')}else put('Giới thiệu',false,'không thấy ô');
 if(l.tags?.length)items.push(...await pickTags(l.tags));
 const ab=document.getElementById('abbreviation');if(ab){setNative(ab,l.abbreviation);put('Tên viết tắt',true,l.abbreviation)}else put('Tên viết tắt',false,'không thấy ô');
 const len=await pickSelect(document.getElementById('expectedLength')?.closest('.ant-select'),lengthMatch(l.length));put('Length ('+l.length+')',len.ok,len.note);
 const w=await pickSelect(document.getElementById('ageGroup')?.closest('.ant-select'),warningMatch(l.warning));put('Warning notice ('+l.warning+')',w.ok,w.note);
 return items}
let busy=false;
async function check(){if(busy||!location.pathname.startsWith('/novels/create'))return;if(!document.getElementById('bookTitle'))return;busy=true;try{const r=await chrome.runtime.sendMessage({kind:'XP_TAKE_PENDING'});if(r?.ok&&r.pending){await wait(600);const items=await fill(r.pending.listing);banner(items);chrome.runtime.sendMessage({kind:'XP_REPORT',items}).catch(()=>{})}}catch{}finally{busy=false}}
setInterval(check,1200);check();
})();

// ---- New chapter page (/novels/chapter/create/<book>): title + body from Xưởng. Never presses save or publish.
(()=>{if(window.__xpInkCh)return;window.__xpInkCh=true;
const wait=ms=>new Promise(r=>setTimeout(r,ms));async function until(fn,ms=10000){const end=Date.now()+ms;while(Date.now()<end){const v=fn();if(v)return v;await wait(200)}return null}
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
function toHtml(body){return String(body).split(/\n\s*\n|\n/).map(x=>x.trim()).filter(Boolean).map(x=>'<p>'+esc(x)+'</p>').join('')}
function setNative(el,value){Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,value);el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}))}
function show(lines,ok){let el=document.getElementById('xp-ink-chapter');if(!el){el=document.createElement('div');el.id='xp-ink-chapter';el.style.cssText='position:fixed;top:16px;right:16px;z-index:2147483647;width:380px;background:#121213;color:#f2f2f2;border:1px solid #ff5a1f;border-radius:12px;box-shadow:0 0 24px rgba(255,90,31,.3);font:13px/1.5 Arial,sans-serif;padding:14px';document.body.append(el)}el.replaceChildren();const h=document.createElement('strong');h.textContent=ok?'Xưởng đã điền chương':'Xưởng chưa điền được chương';h.style.cssText='display:block;color:#ff7a45;margin-bottom:6px';el.append(h);for(const l of lines){const d=document.createElement('div');d.textContent=l;d.style.padding='3px 0';el.append(d)}const tip=document.createElement('p');tip.style.cssText='margin:8px 0 0;color:#d6d6da';tip.textContent='Đọc lại chương, rồi tự bấm publish (hoặc save). Adapter không bấm save hay publish.';el.append(tip);const b=document.createElement('button');b.textContent='Đóng';b.style.cssText='margin-top:8px;height:28px;padding:0 12px;background:#ff5a1f;color:#0b0b0c;border:0;border-radius:8px;font-weight:700;cursor:pointer';b.onclick=()=>el.remove();el.append(b)}
let busy=false;
async function check(){if(busy||!/^\/novels\/chapter\/create\/\d+/.test(location.pathname))return;busy=true;try{
 const title=await until(()=>document.querySelector('input[placeholder="Title Here"]'),8000),frame=await until(()=>document.querySelector('iframe.tox-edit-area__iframe')?.contentDocument?.body,8000);if(!title||!frame)return;
 const r=await chrome.runtime.sendMessage({kind:'XP_INK_TAKE'});const p=r?.ok&&r.pending;if(!p)return;await wait(500);const lines=[];
 setNative(title,p.title);lines.push((title.value===p.title?'✓ ':'✗ ')+'Tiêu đề: '+p.title);
 const res=await chrome.runtime.sendMessage({kind:'XP_INK_SETBODY',html:toHtml(p.body)});const want=(p.body.match(/\S+/g)||[]).length;
 const got=(frame.innerText.match(/\S+/g)||[]).length;const ok=!!res?.ok&&title.value===p.title&&got>=want*0.98;
 lines.push((res?.ok?'✓ ':'✗ ')+'Nội dung: '+(res?.ok?got.toLocaleString('vi-VN')+' / '+want.toLocaleString('vi-VN')+' chữ, '+(res.paragraphs||0)+' đoạn':(res?.error||'không điền được')));
 show(lines,ok);chrome.runtime.sendMessage({kind:'XP_REPORT',items:[{field:'Inkstone chương '+(p.chapterNo||''),ok,note:lines.join(' · ')}]}).catch(()=>{})}catch{}finally{busy=false}}
setInterval(check,1500);check()})();
