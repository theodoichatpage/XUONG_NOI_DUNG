const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function runtime(series=[]){
  const src=fs.readFileSync('dist/studio-ui.js','utf8'),store={};
  const c=vm.createContext({db:{series,channels:[{id:'wn',platform:'Webnovel'}],content:[],printProjects:[],assets:[],workflows:[],metrics:[],aiJobs:[]},Date,structuredClone,
    today:()=> '2026-10-30',loadError:false,choose:async()=>null,input:()=>'',uiConfirm:async()=>true,toast:m=>c.toasted=m,validate:()=>{},save:()=>true,
    esc:s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[ch]),
    localStorage:{getItem:k=>store[k]??null,setItem:(k,v)=>store[k]=String(v)},uid:()=> 'id'+(++c.n),n:0,
    $:()=>null,location:{hash:'#series'},findWebnovelChannel:()=>c.db.channels[0],
    lfData:s=>{s.story??={};s.story.characters??=[];s.story.plans??=[];s.story.pipeline??={source:{mode:'topic',topic:''},artifacts:{}};return s.story},
    lfPipeline:s=>c.lfData(s).pipeline,lfApproved:()=>false,lfChapters:()=>[],lfNextChapter:()=>1,uiPublishing:()=> '<section class="u-publishing"></section>',
    lfSetSource:(s,src)=>{c.lfData(s).pipeline.source=src}});
  vm.runInContext(src.slice(0,src.indexOf('const uiBaseChoose=')),c);
  c.uiRender=()=>{c.rendered=(c.rendered||0)+1};
  return c}
test('no story yet: full workspace with idea fields instead of the old blank start card',()=>{
  const c=runtime(),html=c.uiStory();
  assert.doesNotMatch(html,/Bắt đầu bộ truyện đầu tiên/);
  for(const part of['Bộ truyện của tôi','Tạo truyện mới','1. Ý tưởng & nguồn','Ý tưởng chính của truyện','Link truyện / YouTube tham khảo','Câu lệnh văn phong cá nhân','data-ui-action="create-from-idea"','Cốt truyện & nhân vật','Sản xuất đợt tiếp theo'])assert.ok(html.includes(part),part);
  assert.match(html,/id="uBatchButton"[^>]*disabled/)});
test('development directions cover continue, arcs and both endings',()=>{
  const c=runtime(),values=vm.runInContext('uiStoryDirections',c).map(d=>d[1]);
  for(const v of['Tiếp tục câu chuyện','Phát triển Arc hiện tại','Mở Arc mới','Chuẩn bị kết mở','Chuẩn bị kết đóng'])assert.ok(values.includes(v),v)});
test('creating from the inline idea stores the real source and starts the existing build workflow',async()=>{
  const c=runtime();c.uiStoryNewDraft().topic='Một người đánh đổi ký ức để cứu em gái.';c.uiStoryNewDraft().referenceLink='https://example.com';
  c.uiBuildStory=async s=>{c.built=s.id};await c.uiCreateFromIdea();
  assert.equal(c.db.series.length,1);const s=c.db.series[0];
  assert.equal(s.channelId,'wn');assert.equal(s.story.pipeline.source.topic,'Một người đánh đổi ký ức để cứu em gái.');assert.equal(s.story.pipeline.source.referenceLink,'https://example.com');
  assert.equal(c.built,s.id);const st=vm.runInContext('uiState',c);assert.equal(st.book,s.id);assert.deepEqual({...st.newDraft},{})});
test('empty idea is rejected without touching data',async()=>{
  const c=runtime();await assert.rejects(c.uiCreateFromIdea(),/Nhập ý tưởng/);assert.equal(c.db.series.length,0)});
test('selected story renders its title, status and character edit buttons',()=>{
  const s={id:'s1',title:'Kẻ giữ ký ức',story:{characters:[{id:'c1',name:'Minh',role:'Nhân vật chính',personality:'Thông minh'}],plans:[],pipeline:{source:{mode:'topic',topic:'Ý tưởng'},artifacts:{bible:{value:{premise:'Minh khám phá thành phố.',mainThreads:'Twist A\nTwist B'}}}}}};
  const c=runtime([s]);c.uiCurrentStage=()=>['characters','Nhân vật','GENERATE_CHARACTERS'];c.uiStoryJob=()=> '';
  const html=c.uiStory();
  for(const part of['Kẻ giữ ký ức','Minh khám phá thành phố.','Twist A','data-ui-character="c1"','data-ui-action="build-story"','data-ui-action="story-advanced"'])assert.ok(html.includes(part),part)});
test('index.html loads a single Xưởng Truyện renderer',()=>{
  const html=fs.readFileSync('dist/index.html','utf8');
  assert.doesNotMatch(html,/story-empty-reference\.js/);
  assert.ok(!fs.existsSync('dist/story-empty-reference.js'));
  for(const f of html.match(/src="[^"]+\.js"/g).map(x=>x.slice(5,-1))){const code=fs.readFileSync('dist/'+f,'utf8');if(f!=='studio-ui.js')assert.doesNotMatch(code,/series:\s*uiStory|u-story-empty/,f)}});
