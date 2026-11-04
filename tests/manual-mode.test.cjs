const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const source=fs.readFileSync('dist/story-longform-v2.js','utf8');
function fixture(extra={}){let seq=0;const s={id:'book',title:'Working',channelId:'wn',chapterLength:1500,storyLanguage:'English'},ctx=vm.createContext({db:{series:[s],content:[],aiJobs:[]},structuredClone,Date,console,setTimeout:f=>f(),uid:()=> 'id_'+(++seq),findWebnovelChannel:()=>({id:'wn'}),ch:()=>({language:'English'}),save:()=>true,toast:m=>ctx.toasted=m,storyFingerprint:v=>JSON.stringify(v),...extra});const workbench=fs.readFileSync('dist/story-workbench.js','utf8');vm.runInContext(workbench.slice(workbench.indexOf('function storyFingerprint('),workbench.indexOf('function storyMapLocalBook(')),ctx);vm.runInContext(source.slice(0,source.indexOf('const lfBaseOpenEditor')),ctx);vm.runInContext(source.slice(source.indexOf('async function lfSend('),source.indexOf('function lfProgress(')),ctx);ctx.lfTab=()=>{};return {c:ctx,s}}
const concept={title:'The Cloud Orchard',logline:'A gardener harvests memories.',premise:'A sky gardener returns lost memories.',originalityNotes:'New cast.',reviewVi:'Vườn mây.'};
test('JSON is recovered from an answer with extra prose and code fences',()=>{
  const {c}=fixture();const answer='Here is the result:\n```json\n'+JSON.stringify(concept)+'\n```\nLet me know!';
  assert.equal(c.lfParse(answer).title,'The Cloud Orchard');assert.equal(c.lfParse(JSON.stringify(concept)).logline,'A gardener harvests memories.')});
test('without a connected Bridge nothing turns into a paste job: the author is told to connect',async()=>{
  let opened='';const {c,s}=fixture({bridgeCall:async()=>({ok:false}),uiManualJob:async id=>{opened=id}});
  c.lfSetSource(s,{mode:'topic',topic:'Cloud memories',genre:'Fantasy',chapters:2});
  await assert.rejects(c.lfSend(s,'GENERATE_CONCEPT'),/Chưa kết nối ChatGPT/);assert.equal(c.db.aiJobs.length,0);assert.equal(opened,'')});
test('a Bridge call that throws (no extension) also asks to connect instead of pasting',async()=>{const {c,s}=fixture({bridgeCall:async()=>{throw Error('Chưa thấy extension')},uiManualJob:async()=>{}});c.lfSetSource(s,{mode:'topic',topic:'x',genre:'y',chapters:2});await assert.rejects(c.lfSend(s,'GENERATE_CONCEPT'),/Chưa kết nối ChatGPT/);assert.equal(c.db.aiJobs.length,0)});
test('a leftover job in the extension that Xưởng no longer tracks is cancelled, then the new stage is sent',async()=>{
  const calls=[];const {c,s}=fixture({bridgeCall:async(kind)=>{calls.push(kind);return kind==='XN_STATUS'?{ok:true,connected:true,activeJob:{id:'xn_old'}}:{ok:true}}});
  c.lfSetSource(s,{mode:'topic',topic:'x',genre:'y',chapters:2});await c.lfSend(s,'GENERATE_CONCEPT');
  assert.deepEqual(calls,['XN_STATUS','XN_CANCEL','XN_START']);assert.equal(c.db.aiJobs[0].status,'waiting_send')});
test('manual paste still works when the author picks manual mode in Settings',async()=>{
  let opened='';const {c,s}=fixture({bridgeCall:async()=>({ok:false}),uiManualJob:async id=>{opened=id},xnManualMode:()=>true});
  c.lfSetSource(s,{mode:'topic',topic:'Cloud memories',genre:'Fantasy',chapters:2});await c.lfSend(s,'GENERATE_CONCEPT');
  const j=c.db.aiJobs[0];assert.equal(j.status,'manual');assert.equal(opened,j.id);
  c.lfApplyTask(j,'Sure!\n'+JSON.stringify(concept));assert.equal(j.status,'applied');assert.equal(c.lfPipeline(s).artifacts.concept.value.title,'The Cloud Orchard')});
test('manual mode setting skips the Bridge even when it is connected',async()=>{
  let called=0;const {c,s}=fixture({bridgeCall:async()=>{called++;return{ok:true,connected:true}},uiManualJob:async()=>{},xnManualMode:()=>true});
  c.lfSetSource(s,{mode:'topic',topic:'Cloud memories',genre:'Fantasy',chapters:2});await c.lfSend(s,'GENERATE_CONCEPT');
  assert.equal(called,0);assert.equal(c.db.aiJobs[0].status,'manual')});
test('Bridge chapter parsing also tolerates prose around the JSON',()=>{
  const src=fs.readFileSync('dist/chatgpt-bridge.js','utf8'),c=vm.createContext({});vm.runInContext(src.slice(src.indexOf('function parseStory('),src.indexOf('function canAutoApply(')),c);
  const r=c.parseStory('Đây là chương:\n{"title":"T","body":"English body","summary":"S","reviewVi":"Bản dịch"}\nHết.');
  assert.equal(r.body,'English body');assert.equal(r.reviewVi,'Bản dịch')});
