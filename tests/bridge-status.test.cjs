const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function state(status,checking=false){const source=fs.readFileSync('dist/chatgpt-bridge.js','utf8'),start=source.indexOf('function bridgeConnectionState('),end=source.indexOf('function bridgeConnectionHTML(');assert.ok(start>=0,'connection status model exists');const ctx=vm.createContext({bridgeStatus:status,bridgeChecking:checking});vm.runInContext(source.slice(start,end),ctx);return ctx.bridgeConnectionState()}
test('connection is not green before a response',()=>assert.match(state({connected:false,state:'unchecked'}).label,/Chưa kiểm tra/));
test('checking state is explicit',()=>assert.match(state({connected:false},true).label,/Đang kiểm tra/));
test('only current bridge response shows connected',()=>{assert.equal(state({ok:true,version:'0.4.0',connected:true}).tone,'connected');assert.match(state({ok:true,version:'1.0.0',connected:true}).label,/không tương thích/)});
test('missing extension explains the different Xưởng Truyện extension',()=>{const s=state({connected:false,state:'missing'});assert.match(s.label,/Chưa kết nối/);assert.match(s.help,/Xưởng Truyện/);assert.match(s.help,/0.4.0/)});
test('selected tab closing shows lost connection',()=>assert.match(state({ok:true,version:'0.4.0',connected:false,hadConnection:true}).label,/Mất kết nối/));
test('bridge present but no tab gives actionable instruction',()=>assert.match(state({ok:true,version:'0.4.0',connected:false}).help,/chọn tab ChatGPT/));
test('background polling does not flicker away the known state',()=>assert.equal(state({state:'missing',connected:false,checkedAt:'2026-10-29T13:00:00Z'},true).tone,'disconnected'));
