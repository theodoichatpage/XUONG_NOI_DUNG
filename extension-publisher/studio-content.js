'use strict';
// Bridges the Xưởng page and the Adapter background. Only allow-listed kinds pass in either direction.
(()=>{if(window.__xpStudio)return;window.__xpStudio=true;
const allowed=new Set(['XP_PING','XP_FILL_LISTING','XP_SUDO_FILL','XP_SUDO_PULL','XP_SUDO_BRIEF','XP_SUDO_LAST_REPORT']);
// Page → extension
window.addEventListener('message',e=>{if(e.source!==window||e.origin!==location.origin||e.data?.source!=='XP_STUDIO_V1'||!allowed.has(e.data.kind))return;const {requestId,kind,listing,kit,overwrite,brief}=e.data;if(typeof requestId!=='string')return;chrome.runtime.sendMessage({kind,listing,kit,overwrite,brief}).then(result=>window.postMessage({source:'XP_EXTENSION_V1',requestId,result},location.origin)).catch(err=>window.postMessage({source:'XP_EXTENSION_V1',requestId,result:{ok:false,error:err.message}},location.origin))});
// Extension → page: the page answers with {source:'XP_STUDIO_V1', kind:'XP_REPLY', requestId, result}.
const toPage=new Set(['XP_SUDO_RESULT','XP_SUDO_STATUS']),waiting=new Map();
window.addEventListener('message',e=>{if(e.source!==window||e.origin!==location.origin||e.data?.source!=='XP_STUDIO_V1'||e.data.kind!=='XP_REPLY')return;const done=waiting.get(e.data.requestId);if(done){waiting.delete(e.data.requestId);done(e.data.result&&typeof e.data.result==='object'?e.data.result:{ok:false,error:'Phản hồi không hợp lệ'})}});
chrome.runtime.onMessage.addListener((m,_s,reply)=>{if(m?.kind!=='XP_TO_PAGE'||!toPage.has(m.msg?.kind))return;const requestId='x'+Math.random().toString(36).slice(2);
 const timer=setTimeout(()=>{waiting.delete(requestId);reply(null)},10000);waiting.set(requestId,r=>{clearTimeout(timer);reply(r)});
 window.postMessage({source:'XP_EXTENSION_V1',requestId,kind:m.msg.kind,payload:m.msg.payload},location.origin);return true});
window.postMessage({source:'XP_EXTENSION_V1',notice:'ready',version:chrome.runtime.getManifest().version},location.origin);
// Kept chapters from Sudowrite are delivered once the page has loaded its own listener.
setTimeout(()=>chrome.runtime.sendMessage({kind:'XP_STUDIO_READY'}).catch(()=>{}),2500)})();
