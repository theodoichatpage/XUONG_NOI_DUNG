const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const src=fs.readFileSync('extension/background.js','utf8'),c=vm.createContext({});vm.runInContext(src.slice(src.indexOf('function chatPath('),src.indexOf('function sameChat(')+src.slice(src.indexOf('function sameChat(')).indexOf('\n')),c);
test('same conversation is accepted after ChatGPT moves it into a project',()=>{assert.equal(c.sameChat('/c/abc-1','/g/g-p-9/c/abc-1','baseline'),true)});
test('a new chat or a project home that becomes a conversation is accepted',()=>{assert.equal(c.sameChat('/','/c/x','baseline'),true);assert.equal(c.sameChat('/g/g-p-9/project','/g/g-p-9/c/x','baseline'),true)});
test('an answer that follows this job marker is accepted wherever it is',()=>{assert.equal(c.sameChat('/c/a','/c/b','marker'),true)});
test('switching to a different conversation without the marker is still rejected',()=>{assert.equal(c.sameChat('/c/a','/c/b','baseline'),false);assert.equal(c.sameChat('/c/a','/c/b',undefined),false)});
test('the content script reports how it anchored the answer',()=>{assert.match(fs.readFileSync('extension/chatgpt-content.js','utf8'),/anchor:markerNode\(\)\?'marker':'baseline'/)});
test('updating the extension keeps a recent running job instead of dropping it',()=>{assert.match(src,/details\?\.reason==='update'&&activeJob&&Date\.now\(\)-\(activeJob\.startedAt\|\|0\)<1800000/)});

test('the ChatGPT tab applies the same conversation rule as the background',()=>{const cs=fs.readFileSync('extension/chatgpt-content.js','utf8');assert.match(cs,/if\(!sameChatHere\(job\.path,path\)\)/);assert.doesNotMatch(cs,/job\.path!=='\/'&&job\.path!==path/);
  const ctx=vm.createContext({markerNode:()=>null});vm.runInContext(cs.slice(cs.indexOf('function sameChatHere('),cs.indexOf('async function captureResult(')),ctx);
  assert.equal(ctx.sameChatHere('/c/abc','/g/g-p-1/c/abc'),true);assert.equal(ctx.sameChatHere('/','/c/x'),true);assert.equal(ctx.sameChatHere('/c/a','/c/b'),false);ctx.markerNode=()=>({});assert.equal(ctx.sameChatHere('/c/a','/c/b'),true)});
test('Xưởng can ask the Bridge to read the ChatGPT answer now (no pasting)',()=>{const st=fs.readFileSync('extension/studio-content.js','utf8'),bg=fs.readFileSync('extension/background.js','utf8'),cs=fs.readFileSync('extension/chatgpt-content.js','utf8');assert.match(st,/'XN_FETCH'/);assert.match(bg,/m\.kind==='XN_FETCH'/);assert.match(cs,/m\.kind==='XN_CHAT_CAPTURE'/)});
test('results are received from any compatible Bridge, not only the exact newest one',()=>{const w=fs.readFileSync('dist/chatgpt-bridge.js','utf8');assert.doesNotMatch(w,/r\.version===/);assert.match(w,/r\?\.ok&&xnBridgeOK\(r\.version\)\)\{await receiveResults\(\)/)});
