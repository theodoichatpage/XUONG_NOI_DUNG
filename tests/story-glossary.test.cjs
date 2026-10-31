const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const source=fs.readFileSync('dist/story-longform-v2.js','utf8');
function fixture(){let seq=0;const s={id:'book',title:'Working',channelId:'wn',chapterLength:1500,storyLanguage:'English'},ctx=vm.createContext({db:{series:[s],content:[],aiJobs:[]},structuredClone,Date,console,uid:()=> 'id_'+(++seq),findWebnovelChannel:()=>({id:'wn'}),ch:()=>({language:'English'}),save:()=>true,storyFingerprint:v=>JSON.stringify(v)});const workbench=fs.readFileSync('dist/story-workbench.js','utf8');vm.runInContext(workbench.slice(workbench.indexOf('function storyFingerprint('),workbench.indexOf('function storyMapLocalBook(')),ctx);vm.runInContext(source.slice(0,source.indexOf('const lfBaseOpenEditor')),ctx);return {c:ctx,s}}
function data(c,key){return vm.runInContext(key,c)}
const concept=()=>({title:'The Cloud Orchard',logline:'A gardener harvests memories.',premise:'A sky gardener returns lost memories.',originalityNotes:'New cast.'});
function bible(c){return Object.fromEntries(data(c,'lfBibleFields').map(k=>[k,k==='title'?'The Cloud Orchard':'New '+k]))}
const characters=()=>({characters:[{name:'Mira',role:'protagonist',age:'25',appearance:'a',personality:'b',goal:'c',motivation:'d',strengths:'e',weaknesses:'f',secret:'g',relationships:'h',arc:'i'}]});
function apply(c,s,kind,value,scope={}){const j={seriesId:s.id,storyTask:kind,scope,inputSignature:c.lfHash(c.lfTaskInput(s,kind,scope)),targetSignature:c.lfHash(c.lfPipeline(s).artifacts[c.lfStageFor(kind)]||null)};c.lfApplyTask(j,JSON.stringify(value));return j}
function withBible(){const f=fixture(),{c,s}=f;c.lfSetSource(s,{mode:'topic',topic:'Cloud memories',genre:'Fantasy',chapters:2});apply(c,s,'GENERATE_CONCEPT',concept());c.lfApprove(s,'concept');apply(c,s,'GENERATE_STORY_BIBLE',bible(c));c.lfApprove(s,'bible');return f}
test('existing series gain an empty glossary without losing data',()=>{
  const {c,s}=fixture();s.story={characters:[{id:'x'}],plans:[],memories:[],importKeys:[]};c.lfData(s);assert.deepEqual([...s.story.glossary],[]);assert.equal(s.story.characters[0].id,'x')});
test('style guide and glossary are sent with stage prompts, chapter context and review translation',()=>{
  const {c,s}=withBible(),sd=c.lfData(s);sd.styleGuide='POV: third person\nSpelling: American English';sd.glossary.push({id:'g1',term:'Skyreach',kind:'Địa danh',note:'floating city',vi:'Thành Chạm Trời'});
  const stage=c.lfTaskPrompt(s,'GENERATE_CHARACTERS');assert.match(stage,/STYLE GUIDE/);assert.match(stage,/American English/);assert.match(stage,/Skyreach \[Địa danh\]: floating city/);
  s.title='The Cloud Orchard';const ch={id:'ch1',seriesId:s.id,title:'Chapter 1',body:'Mira saw Skyreach.',status:'draft',bodyRevision:1,chapterNumber:1};c.db.content.push(ch);
  const tr=c.lfTaskPrompt(s,'REVIEW_TRANSLATE',{chapterId:'ch1'});assert.match(tr,/VI: Thành Chạm Trời/);assert.doesNotMatch(tr,/STYLE GUIDE/);
  assert.doesNotMatch(JSON.stringify(c.lfTaskInput(s,'GENERATE_CHARACTERS')),/Skyreach|STYLE GUIDE/)});
test('ChatGPT proposal merges new terms, skips duplicates and keeps the previous style guide',()=>{
  const {c,s}=withBible(),sd=c.lfData(s);sd.styleGuide='Old guide';sd.glossary.push({id:'g1',term:'Mira',kind:'Nhân vật',note:'',vi:''});
  const p=c.lfTaskPrompt(s,'GENERATE_STYLE_GLOSSARY');assert.match(p,/existingGlossary/);assert.match(p,/Mira/);
  apply(c,s,'GENERATE_STYLE_GLOSSARY',{styleGuide:'New guide',glossary:[{term:'mira',kind:'Nhân vật'},{term:'Skyreach',kind:'Địa danh',note:'city',vi:'Thành Chạm Trời'},{term:'Aether',kind:'Unknown'}]});
  assert.equal(sd.styleGuide,'New guide');assert.equal(sd.styleGuidePrev,'Old guide');
  assert.deepEqual(JSON.parse(JSON.stringify(sd.glossary.map(g=>[g.term,g.kind]))),[['Mira','Nhân vật'],['Skyreach','Địa danh'],['Aether','Thuật ngữ khác']])});
test('proposal requires an approved Story Bible and valid JSON',()=>{
  const {c,s}=fixture();c.lfSetSource(s,{mode:'topic',topic:'x',genre:'y',chapters:2});assert.throws(()=>c.lfTaskInput(s,'GENERATE_STYLE_GLOSSARY'),/Story Bible/);
  const f=withBible();assert.throws(()=>apply(f.c,f.s,'GENERATE_STYLE_GLOSSARY',{glossary:[]}),/styleGuide/)});
