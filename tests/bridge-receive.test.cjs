const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const src=fs.readFileSync('dist/chatgpt-bridge.js','utf8');
const start=src.indexOf('async function receiveResults(');const rest=src.slice(start+10);const end=start+10+rest.search(/\n(async )?function /);
function run(job,applyImpl){const acks=[],toasts=[];const ctx=vm.createContext({db:{aiJobs:[job],content:[]},resultReading:false,bridgeCall:async k=>k==='XN_GET_RESULTS'?{ok:true,results:[{jobId:job.id,text:'{"x":1}'}]}:(acks.push(k),{ok:true}),save:()=>true,toast:m=>toasts.push(m),$:()=>({open:false}),render(){},view:'series',editType:'',editId:'',lfApplyTask:applyImpl,lfTab:undefined,JSON,console});vm.runInContext('let resultReading=false;'+src.slice(start,end).replace(/^async function receiveResults/,'globalThis.receiveResults=async function'),ctx);return {ctx,acks,toasts}}
test('a stage result from ChatGPT is applied automatically and waits for review',async()=>{
  const job={id:'xn_1',type:'text',storyTask:'GENERATE_CONCEPT',seriesId:'s',status:'waiting_send'};let applied=0;
  const {ctx,acks,toasts}=run(job,(j)=>{applied++;j.status='applied'});await ctx.receiveResults();
  assert.equal(applied,1);assert.equal(job.status,'applied');assert.ok(acks.includes('XN_ACK'));assert.match(toasts[0],/chờ bạn duyệt/)});
test('an unusable result becomes a clear error instead of waiting',async()=>{
  const job={id:'xn_2',type:'text',storyTask:'ANALYZE_REFERENCE_LINK',seriesId:'s',status:'running'};
  const {ctx,toasts}=run(job,()=>{throw Error('ChatGPT không đọc được link: bị chặn')});await ctx.receiveResults();
  assert.equal(job.status,'error');assert.match(job.error,/không đọc được link/);assert.match(toasts[0],/không đọc được link/)});
