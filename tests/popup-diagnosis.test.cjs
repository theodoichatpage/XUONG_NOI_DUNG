const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const src=fs.readFileSync('extension/popup.js','utf8');
function run({allowed=true,studioTabs=[],pingOk=false}={}){
  const els={};const el=id=>els[id]??={id,textContent:'',className:'',hidden:false,value:'',onclick:null,replaceChildren(){},append(){}};
  const calls={reloaded:[],requested:0,created:[]};
  const store={};const chrome={storage:{local:{get:async k=>({[k]:store[k]}),set:async o=>Object.assign(store,o)}},runtime:{sendMessage:async m=>m.kind==='POPUP_STATE'?{ok:true,tabs:[{id:9,title:'ChatGPT',url:'https://chatgpt.com/'}],selectedTabId:9,activeJob:null}:{ok:true}},
    permissions:{contains:async()=>allowed,request:async()=>{calls.requested++;return true}},
    tabs:{query:async q=>q.url.startsWith('https://xuong-noi-dung-khaki.vercel.app')?studioTabs:[],sendMessage:async()=>{if(!pingOk)throw Error('Could not establish connection. Receiving end does not exist.');return{ok:true}},reload:async id=>calls.reloaded.push(id),create:async t=>calls.created.push(t.url)}};
  const ctx=vm.createContext({chrome,document:{getElementById:el,createElement:()=>({})},window:{close(){}},URL,setTimeout:()=>{},console});
  vm.runInContext(src,ctx);
  return {els,calls,store,settle:()=>new Promise(r=>setImmediate(()=>setImmediate(()=>setImmediate(r))))}}
test('popup reports ChatGPT connection with a clear label',async()=>{const p=run({studioTabs:[{id:1}],pingOk:true});await p.settle();assert.equal(p.els.status.className,'ok');assert.match(p.els.status.textContent,/ĐÃ KẾT NỐI/)});
test('blocked site access is diagnosed and can be granted',async()=>{const p=run({allowed:false});await p.settle();assert.equal(p.els.studio.className,'off');assert.match(p.els.studio.textContent,/BỊ CHẶN/);assert.equal(p.els.studioFix.hidden,false);await p.els.studioFix.onclick();assert.equal(p.calls.requested,1)});
test('a Xưởng tab opened before the update is offered a reload',async()=>{const p=run({studioTabs:[{id:4},{id:5}],pingOk:false});await p.settle();await p.settle();assert.match(p.els.studio.textContent,/CHƯA NẠP/);await p.els.studioFix.onclick();assert.deepEqual([...p.calls.reloaded],[4,5])});
test('loaded Xưởng tab is confirmed',async()=>{const p=run({studioTabs:[{id:4}],pingOk:true});await p.settle();await p.settle();assert.equal(p.els.studio.className,'ok');assert.match(p.els.studio.textContent,/ĐÃ NẠP Bridge/);assert.equal(p.els.studioFix.hidden,true)});
test('no open Xưởng tab offers to open it',async()=>{const p=run({studioTabs:[]});await p.settle();assert.match(p.els.studio.textContent,/chưa mở/);await p.els.studioFix.onclick();assert.match(p.calls.created[0],/xuong-noi-dung-khaki\.vercel\.app/)});
test('auto-send toggle defaults to on and is saved',async()=>{const p=run({studioTabs:[{id:1}],pingOk:true});await p.settle();assert.equal(p.els.autoSend.checked,true);p.els.autoSend.checked=false;await p.els.autoSend.onchange();assert.equal(p.store.autoSend,false)});
