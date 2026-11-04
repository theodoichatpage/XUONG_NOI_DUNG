'use strict';
// Bridges Xưởng page <-> Publisher background. Only these message kinds pass through.
(()=>{if(window.__xpStudio)return;window.__xpStudio=true;const allowed=new Set(['XP_PING','XP_FILL_LISTING']);
window.addEventListener('message',e=>{if(e.source!==window||e.origin!==location.origin||e.data?.source!=='XP_STUDIO_V1'||!allowed.has(e.data.kind))return;const {requestId,kind,listing}=e.data;if(typeof requestId!=='string')return;chrome.runtime.sendMessage({kind,listing}).then(result=>window.postMessage({source:'XP_EXTENSION_V1',requestId,result},location.origin)).catch(err=>window.postMessage({source:'XP_EXTENSION_V1',requestId,result:{ok:false,error:err.message}},location.origin))});
window.postMessage({source:'XP_EXTENSION_V1',notice:'ready',version:chrome.runtime.getManifest().version},location.origin)})();
