const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('extension/chatgpt-content.js','utf8');
const ctx=vm.createContext({});vm.runInContext(src.slice(src.indexOf('function balancedJSON('),src.indexOf('\nfunction readBlock(')),ctx);
const j=s=>ctx.balancedJSON(s);
test('a finished JSON answer is extracted even with text and a code header around it',()=>{
  assert.equal(j('Kết quả:\njson Copy code\n{"title":"T","body":"He said \\"hi\\" }","summary":"s"}\nXong.'),'{"title":"T","body":"He said \\"hi\\" }","summary":"s"}')});
test('an answer still being written is not taken early, not even an inner object',()=>{
  assert.equal(j('{"plans":[{"id":"v1","title":"T"},{"id":"a1"'),'');assert.equal(j('{"characters":[{"name":"Mira"}'),'')});
test('stray braces in prose before the JSON are skipped',()=>{assert.equal(j('Note {x} then {"ok":true}'),'{"ok":true}')});
test('no JSON means nothing to sync',()=>{assert.equal(j('ChatGPT đang suy nghĩ…'),'')});
test('the reader recognises ChatGPT answer layouts without role attributes',()=>{
  for(const sel of['[class*="ResponseRoot-"]','[data-markdown-text-style="assistant-message"]','[data-turn="assistant"]','[data-message-role="assistant"]','[data-message-author-role="assistant"]','.markdown'])assert.ok(src.includes(sel),sel);
  assert.ok(src.includes('[data-stream-word]'))});
