const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
test('installing or reloading the Bridge clears a stuck job and reloads Xưởng and ChatGPT tabs',async()=>{
  let onInstalled;const removed=[],reloaded=[],queried=[];
  const tabs={'https://xuong-noi-dung-khaki.vercel.app/*':[{id:11}],'https://chatgpt.com/*':[{id:21},{id:22}]};
  const chrome={runtime:{id:'ext',onMessage:{addListener(){}},onInstalled:{addListener:f=>onInstalled=f}},
    storage:{local:{remove:async k=>removed.push(k),get:async()=>({}),set:async()=>{}}},
    tabs:{query:async q=>{queried.push(q.url);return tabs[q.url]||[]},reload:async id=>{reloaded.push(id)},onRemoved:{addListener(){}},onUpdated:{addListener(){}}}};
  vm.runInNewContext(fs.readFileSync('extension/background.js','utf8'),{chrome,URL,console,setTimeout,clearTimeout,fetch:async()=>{},btoa,Uint8Array});
  assert.equal(typeof onInstalled,'function');await onInstalled({reason:'update'});
  assert.deepEqual(removed,['activeJob']);assert.ok(queried.includes('https://chatgpt.com/*'));assert.deepEqual(reloaded.sort(),[11,21,22])});
