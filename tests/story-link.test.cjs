const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const source=fs.readFileSync('dist/story-longform-v2.js','utf8');
function fixture(){let seq=0;const s={id:'book',title:'Working',channelId:'wn',chapterLength:1500,storyLanguage:'English'},ctx=vm.createContext({db:{series:[s],content:[],aiJobs:[]},structuredClone,Date,console,uid:()=> 'id_'+(++seq),findWebnovelChannel:()=>({id:'wn'}),ch:()=>({language:'English'}),save:()=>true,storyFingerprint:v=>JSON.stringify(v)});const wb=fs.readFileSync('dist/story-workbench.js','utf8');vm.runInContext(wb.slice(wb.indexOf('function storyFingerprint('),wb.indexOf('function storyMapLocalBook(')),ctx);vm.runInContext(source.slice(0,source.indexOf('const lfBaseOpenEditor')),ctx);return {c:ctx,s}}
const LINK='https://truyen.example/thien-dao/';
function dna(c,extra={}){return {...Object.fromEntries(vm.runInContext('lfDNAFields',c).map(k=>[k,'Phân tích '+k])),sourceIdentifiers:['Trương Huyền','Thiên Đạo Đồ Thư Quán'],readChapters:['Chương 1','Chương 2'],accessNote:'Đọc được 2 chương',...extra}}
function apply(c,s,kind,value){const j={seriesId:s.id,storyTask:kind,scope:{},inputSignature:c.lfHash(c.lfTaskInput(s,kind,{})),targetSignature:c.lfHash(c.lfPipeline(s).artifacts[c.lfStageFor(kind)]||null)};c.lfApplyTask(j,JSON.stringify(value));return j}
function linkStory(){const f=fixture();f.c.lfSetSource(f.s,{mode:'reference',topic:'Trùng sinh làng nghèo',script:'',referenceLink:LINK,genre:'',chapters:20,options:''});return f}
test('reference mode accepts a link instead of pasted text, but not neither',()=>{
  const {c,s}=linkStory();assert.equal(c.lfPipeline(s).parts.length,0);
  assert.throws(()=>c.lfSetSource(s,{mode:'reference',script:'',referenceLink:'',chapters:20}),/link tham khảo/)});
test('link prompt asks ChatGPT to open the link and forbids guessing',()=>{
  const {c,s}=linkStory();const p=c.lfTaskPrompt(s,'ANALYZE_REFERENCE_LINK');
  assert.match(p,/JOB: ANALYZE_REFERENCE_LINK/);assert.ok(p.includes(LINK));assert.match(p,/MỞ link/);assert.match(p,/KHÔNG được đoán/);assert.match(p,/readChapters/)});
test('a blocked page or an answer that read nothing is rejected',()=>{
  const {c,s}=linkStory();
  assert.throws(()=>apply(c,s,'ANALYZE_REFERENCE_LINK',{error:'Trang yêu cầu xác minh'}),/không đọc được link: Trang yêu cầu xác minh/);
  assert.throws(()=>apply(c,s,'ANALYZE_REFERENCE_LINK',dna(c,{readChapters:[]})),/chưa xác nhận đã đọc/);
  assert.equal(c.lfPipeline(s).artifacts.dna,undefined)});
test('valid link analysis becomes the Content DNA for review, then feeds the concept with the author idea',()=>{
  const {c,s}=linkStory();apply(c,s,'ANALYZE_REFERENCE_LINK',dna(c));
  const a=c.lfPipeline(s).artifacts.dna;assert.equal(a.status,'review');assert.equal(a.value.readChapters,undefined);assert.equal(a.value.coreTheme,'Phân tích coreTheme');
  assert.deepEqual([...c.lfPipeline(s).linkRead.readChapters],['Chương 1','Chương 2']);
  c.lfApprove(s,'dna');assert.equal(c.lfApproved(s,'dna'),true);
  const input=c.lfTaskInput(s,'GENERATE_CONCEPT');assert.equal(input.source.dna.coreTheme,'Phân tích coreTheme');assert.equal(input.source.authorIdea,'Trùng sinh làng nghèo');
  assert.match(c.lfTaskPrompt(s,'GENERATE_CONCEPT'),/Trương Huyền/)});
