const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const source=fs.readFileSync('dist/story-longform-v2.js','utf8');
function fixture(lang){let seq=0;const s={id:'book',title:'Working',channelId:'wn',chapterLength:1500,...(lang?{storyLanguage:lang}:{})},ctx=vm.createContext({db:{series:[s],content:[],aiJobs:[]},structuredClone,Date,console,uid:()=> 'id_'+(++seq),findWebnovelChannel:()=>({id:'wn'}),ch:()=>({language:'English'}),save:()=>true,storyFingerprint:v=>JSON.stringify(v)});const workbench=fs.readFileSync('dist/story-workbench.js','utf8');vm.runInContext(workbench.slice(workbench.indexOf('function storyFingerprint('),workbench.indexOf('function storyMapLocalBook(')),ctx);vm.runInContext(source.slice(0,source.indexOf('const lfBaseOpenEditor')),ctx);return {c:ctx,s}}
const concept=()=>({title:'The Cloud Orchard',logline:'A gardener harvests memories.',premise:'A sky gardener returns lost memories.',originalityNotes:'New cast.',reviewVi:'Vườn mây: người làm vườn trả lại ký ức.'});
function apply(c,s,kind,value,scope={}){const j={seriesId:s.id,storyTask:kind,scope,inputSignature:c.lfHash(c.lfTaskInput(s,kind,scope)),targetSignature:c.lfHash(c.lfPipeline(s).artifacts[c.lfStageFor(kind)]||null)};c.lfApplyTask(j,JSON.stringify(value));return j}
test('story language defaults to the channel language and English needs a Vietnamese review copy',()=>{
  const {c,s}=fixture();assert.equal(c.lfStoryLang(s),'English');assert.equal(c.lfNeedsReview(s),true);
  s.storyLanguage='Tiếng Việt';assert.equal(c.lfNeedsReview(s),false)});
test('stage prompts ask for English content plus a reviewVi field',()=>{
  const {c,s}=fixture('English');c.lfSetSource(s,{mode:'topic',topic:'Cloud memories',genre:'Fantasy',chapters:2});
  const p=c.lfTaskPrompt(s,'GENERATE_CONCEPT');assert.match(p,/bằng English/);assert.match(p,/"reviewVi"/);
  s.storyLanguage='Tiếng Việt';assert.doesNotMatch(c.lfTaskPrompt(s,'GENERATE_CONCEPT'),/"reviewVi"/)});
test('reviewVi is kept for review but never fed into the next stage',()=>{
  const {c,s}=fixture('English');c.lfSetSource(s,{mode:'topic',topic:'Cloud memories',genre:'Fantasy',chapters:2});
  apply(c,s,'GENERATE_CONCEPT',concept());assert.equal(c.lfPipeline(s).artifacts.concept.value.reviewVi,'Vườn mây: người làm vườn trả lại ký ức.');
  c.lfApprove(s,'concept');const input=JSON.stringify(c.lfTaskInput(s,'GENERATE_STORY_BIBLE'));assert.doesNotMatch(input,/reviewVi|Vườn mây/)});
test('on-demand chapter translation stores reviewVi without touching the chapter body',()=>{
  const {c,s}=fixture('English');const ch={id:'ch1',seriesId:s.id,title:'Chapter 1',body:'Mira opened the gate.',status:'approved',bodyRevision:3,chapterNumber:1};c.db.content.push(ch);
  const p=c.lfTaskPrompt(s,'REVIEW_TRANSLATE',{chapterId:'ch1'});assert.match(p,/Mira opened the gate/);assert.match(p,/reviewVi/);
  apply(c,s,'REVIEW_TRANSLATE',{reviewVi:'Mira mở cánh cổng.'},{chapterId:'ch1'});
  assert.equal(ch.body,'Mira opened the gate.');assert.equal(ch.status,'approved');assert.equal(ch.reviewVi,'Mira mở cánh cổng.');assert.equal(c.lfReviewFresh(ch),true);
  ch.bodyRevision=4;assert.equal(c.lfReviewFresh(ch),false)});
test('translation is rejected if the chapter changed after the request',()=>{
  const {c,s}=fixture('English');const ch={id:'ch1',seriesId:s.id,title:'Chapter 1',body:'Old text.',status:'draft',bodyRevision:1,chapterNumber:1};c.db.content.push(ch);
  const j={seriesId:s.id,storyTask:'REVIEW_TRANSLATE',scope:{chapterId:'ch1'},inputSignature:c.lfHash(c.lfTaskInput(s,'REVIEW_TRANSLATE',{chapterId:'ch1'})),targetSignature:c.lfHash(null)};
  ch.body='New text.';ch.bodyRevision=2;assert.throws(()=>c.lfApplyTask(j,JSON.stringify({reviewVi:'x'})),/đã đổi/);assert.equal(ch.reviewVi,undefined)});
test('Bridge chapter parsing keeps reviewVi next to body and summary',()=>{
  const src=fs.readFileSync('dist/chatgpt-bridge.js','utf8'),c=vm.createContext({});
  vm.runInContext(src.slice(src.indexOf('function parseStory('),src.indexOf('function canAutoApply(')),c);
  const r=c.parseStory(JSON.stringify({title:'T',body:'English body',summary:'S',reviewVi:'Bản tiếng Việt'}));
  assert.equal(r.body,'English body');assert.equal(r.reviewVi,'Bản tiếng Việt')});
