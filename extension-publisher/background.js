'use strict';
// Xưởng Webnovel Publisher: Xưởng hands over a listing; this opens Inkstone's create page where the content script fills it.
const STUDIO_ORIGINS=new Set(['https://xuong-noi-dung-khaki.vercel.app','http://localhost:8080','http://127.0.0.1:8080']);
const CREATE_URL='https://inkstone.webnovel.com/novels/create';
const VERSION=chrome.runtime.getManifest().version;
function err(e){return {ok:false,error:String(e?.message||e)}}
function fromStudio(sender){try{return STUDIO_ORIGINS.has(new URL(sender.url).origin)}catch{return false}}
function fromInkstone(sender){try{return new URL(sender.url).origin==='https://inkstone.webnovel.com'}catch{return false}}
function cleanListing(l){const s=(v,max)=>String(v??'').slice(0,max);if(!l||typeof l!=='object')throw Error('Thiếu hồ sơ truyện');const out={bookName:s(l.bookName,70).trim(),type:'novel',leadingGender:l.leadingGender==='female'?'female':'male',genre:s(l.genre,80),synopsis:s(l.synopsis,5000),tags:(Array.isArray(l.tags)?l.tags:[]).map(t=>s(t,40)).filter(Boolean).slice(0,10),abbreviation:s(l.abbreviation,15).trim(),length:['short','medium','long'].includes(l.length)?l.length:'medium',warning:s(l.warning||'none',80)};if(!out.bookName)throw Error('Thiếu tên truyện');return out}
async function handle(m,sender){if(sender.id!==chrome.runtime.id)return err('Nguồn không hợp lệ');
 if(m.kind==='XP_PING'){if(!fromStudio(sender)&&sender.tab)return err('Trang không được phép');return {ok:true,version:VERSION}}
 if(m.kind==='XP_FILL_LISTING'){if(!fromStudio(sender))return err('Trang không được phép');const listing=cleanListing(m.listing);await chrome.storage.local.set({pending:{listing,at:Date.now(),studioTabId:sender.tab?.id||null}});const tabs=await chrome.tabs.query({url:'https://inkstone.webnovel.com/*'});const t=tabs.find(x=>new URL(x.url).pathname.startsWith('/novels/create'))||tabs[0];if(t){await chrome.tabs.update(t.id,{url:CREATE_URL,active:true});await chrome.windows.update(t.windowId,{focused:true}).catch(()=>{})}else await chrome.tabs.create({url:CREATE_URL});return {ok:true}}
 if(m.kind==='XP_TAKE_PENDING'){if(!fromInkstone(sender))return err('Chỉ Inkstone được đọc');const {pending}=await chrome.storage.local.get(['pending']);if(!pending||Date.now()-pending.at>15*60*1000){await chrome.storage.local.remove('pending');return {ok:true,pending:null}}await chrome.storage.local.remove('pending');return {ok:true,pending}}
 if(m.kind==='XP_REPORT'){if(!fromInkstone(sender))return err('Chỉ Inkstone được báo');await chrome.storage.local.set({lastReport:{at:Date.now(),items:(m.items||[]).slice(0,30).map(x=>({field:String(x.field).slice(0,40),ok:!!x.ok,note:String(x.note||'').slice(0,200)}))}});return {ok:true}}
 if(m.kind==='XP_POPUP_STATE'){if(sender.tab)return err('Chỉ popup');const s=await chrome.storage.local.get(['pending','lastReport']);return {ok:true,version:VERSION,...s}}
 return err('Lệnh không hỗ trợ')}
chrome.runtime.onMessage.addListener((m,sender,reply)=>{handle(m||{},sender).then(reply,e=>reply(err(e)));return true});
