const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function runtime(series=[]){
  const src=fs.readFileSync('dist/studio-ui.js','utf8'),store={};
  const c=vm.createContext({db:{series,channels:[{id:'wn',platform:'Webnovel'}],content:[],printProjects:[],assets:[],workflows:[],metrics:[],aiJobs:[]},Date,structuredClone,
    today:()=> '2026-10-30',loadError:false,choose:async()=>null,input:()=>'',uiConfirm:async()=>true,toast:m=>c.toasted=m,validate:()=>{},save:()=>true,
    esc:s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[ch]),
    localStorage:{getItem:k=>store[k]??null,setItem:(k,v)=>store[k]=String(v)},uid:()=> 'id'+(++c.n),n:0,
    $:()=>null,location:{hash:'#series'},findWebnovelChannel:()=>c.db.channels[0],
    lfData:s=>{s.story??={};s.story.characters??=[];s.story.plans??=[];s.story.glossary??=[];s.story.pipeline??={source:{mode:'topic',topic:''},artifacts:{}};return s.story},
    lfPipeline:s=>c.lfData(s).pipeline,lfApproved:()=>false,lfChapters:()=>[],lfNextChapter:()=>1,uiPublishing:()=> '<section class="u-publishing"></section>',
    lfSetSource:(s,src)=>{c.lfData(s).pipeline.source=src},bridgeConnectionState:()=>({tone:'connected',label:'Đã kết nối ChatGPT',help:''}),jobState:j=>j.status,lfJobKinds:{},lfStoryLang:s=>s?.storyLanguage||'English',lfNeedsReview:()=>true,lfReviewFresh:()=>false});
  vm.runInContext(src.slice(0,src.indexOf('const uiBaseChoose=')),c);
  c.uiRender=()=>{c.rendered=(c.rendered||0)+1};
  return c}
test('no story yet: full workspace with idea fields instead of the old blank start card',()=>{
  const c=runtime(),html=c.uiStory();
  assert.doesNotMatch(html,/Bắt đầu bộ truyện đầu tiên/);
  for(const part of['Bộ truyện của tôi','Tạo truyện mới','Xưởng Truyện','ChatGPT: Đã kết nối','Ý tưởng & nguồn','Cốt truyện & nhân vật','Sản xuất chương','Tạo từ chủ đề','Sáng tạo từ kịch bản mẫu','Chủ đề / Ý tưởng chính','0/2000','Thể loại','Quy mô','Văn phong cá nhân','Yêu cầu bổ sung','data-ui-action="reset-source"','data-ui-action="create-from-idea"','Xây dựng truyện bằng AI','Trợ lý Xưởng (AI)','Tác vụ','Hội thoại','Kết quả','Chọn tác vụ AI','Tiến trình','Đã gửi yêu cầu đến ChatGPT','ChatGPT đang xử lý','Nhận kết quả &amp; hiển thị'.replace('&amp;','&'),'Chờ bạn duyệt áp dụng'])assert.ok(html.includes(part),part);
  for(const gone of['Cấu trúc bộ truyện','Gợi ý nhanh','Ý tưởng mẫu','<h3>Ý tưởng & nguồn','Bộ truyện:'])assert.ok(!html.includes(gone),gone);
  vm.runInContext("uiState.storySteps={new:{step:3,base:1}}",c);assert.match(c.uiStory(),/id="uBatchButton"[^>]*disabled/)});
test('the source tab switches between topic and reference fields',()=>{
  const c=runtime();assert.doesNotMatch(c.uiStory(),/id="uStoryLink"/);
  vm.runInContext("uiState.srcTab='reference';uiState.srcTabFor='new'",c);const html=c.uiStory();
  assert.match(html,/id="uStoryLink"/);assert.ok(html.includes('Ý tưởng của bạn (tùy chọn)'));assert.ok(html.includes('Phân tích &amp; xây dựng bằng AI')||html.includes('Phân tích & xây dựng bằng AI'))});
test('development directions cover continue, arcs and both endings',()=>{
  const c=runtime(),values=vm.runInContext('uiStoryDirections',c).map(d=>d[1]);
  for(const v of['Tiếp tục câu chuyện','Phát triển Arc hiện tại','Mở Arc mới','Chuẩn bị kết mở','Chuẩn bị kết đóng'])assert.ok(values.includes(v),v)});
test('creating from the inline idea stores the real source and starts the existing build workflow',async()=>{
  const c=runtime();vm.runInContext("uiState.srcTab='reference';uiState.srcTabFor='new'",c);c.uiStoryNewDraft().topic='Một người đánh đổi ký ức để cứu em gái.';Object.assign(c.uiStoryNewDraft(),{genre:'Fantasy',chapters:12,chapterLength:'2200',extra:'Kết mở'});c.uiStoryNewDraft().referenceLink='https://example.com';
  c.uiBuildStory=async s=>{c.built=s.id};c.lfSend=async(s,kind)=>{c.sent=kind};await c.uiCreateFromIdea();
  assert.equal(c.db.series.length,1);const s=c.db.series[0];
  assert.equal(s.channelId,'wn');assert.equal(s.story.pipeline.source.topic,'Một người đánh đổi ký ức để cứu em gái.');assert.equal(s.story.pipeline.source.referenceLink,'https://example.com');
  assert.equal(s.story.pipeline.source.mode,'reference');assert.equal(c.sent,'ANALYZE_REFERENCE_LINK');assert.equal(c.built,undefined);assert.equal(s.story.pipeline.source.genre,'Fantasy');assert.equal(s.story.pipeline.source.chapters,12);assert.equal(s.story.pipeline.source.extra,'Kết mở');assert.equal(s.chapterLength,2200);const st=vm.runInContext('uiState',c);assert.equal(st.book,s.id);assert.deepEqual({...st.newDraft},{})});
test('an idea without a link goes straight to the concept build',async()=>{
  const c=runtime();c.uiStoryNewDraft().topic='Trùng sinh vào ngôi làng nghèo';c.uiBuildStory=async s=>{c.built=s.id};c.lfSend=async(s,kind)=>{c.sent=kind};await c.uiCreateFromIdea();
  const s=c.db.series[0];assert.equal(s.story.pipeline.source.mode,'topic');assert.equal(c.built,s.id);assert.equal(c.sent,undefined)});
test('reference tab accepts a link without an idea; topic tab ignores a stale link',async()=>{
  const c=runtime();vm.runInContext("uiState.srcTab='reference';uiState.srcTabFor='new'",c);c.uiStoryNewDraft().referenceLink='https://example.com/story';c.lfSend=async(s,kind)=>{c.sent=kind};await c.uiCreateFromIdea();
  assert.equal(c.db.series[0].title,'Truyện mới từ link tham khảo');assert.equal(c.sent,'ANALYZE_REFERENCE_LINK');
  const d=runtime();d.uiStoryNewDraft().topic='Ý tưởng';d.uiStoryNewDraft().referenceLink='https://example.com/old';d.uiBuildStory=async s=>{d.built=s.id};d.lfSend=async(s,kind)=>{d.sent=kind};await d.uiCreateFromIdea();
  assert.equal(d.db.series[0].story.pipeline.source.mode,'topic');assert.equal(d.sent,undefined)});
test('empty idea is rejected without touching data',async()=>{
  const c=runtime();await assert.rejects(c.uiCreateFromIdea(),/Nhập ý tưởng/);assert.equal(c.db.series.length,0)});
test('selected story renders its title, status and character edit buttons',()=>{
  const s={id:'s1',title:'Kẻ giữ ký ức',story:{characters:[{id:'c1',name:'Minh',role:'Nhân vật chính',personality:'Thông minh'}],plans:[],pipeline:{source:{mode:'topic',topic:'Ý tưởng'},artifacts:{bible:{value:{premise:'Minh khám phá thành phố.',mainThreads:'Twist A\nTwist B'}}}}}};
  const c=runtime([s]);c.uiCurrentStage=()=>['characters','Nhân vật','GENERATE_CHARACTERS'];c.uiStoryJob=()=> '';
  const html=c.uiStory();
  for(const part of['Kẻ giữ ký ức','Minh khám phá thành phố.','Twist A','data-ui-character="c1"','data-ui-action="build-story"','data-ui-action="story-advanced"','Xây dựng: Nhân vật','aria-selected="true" data-ui-storystep="2"'])assert.ok(html.includes(part),part);
  vm.runInContext("uiState.storySteps={s1:{step:1,base:2}}",c);assert.match(c.uiStory(),/id="uStoryIdea"[^>]*>Ý tưởng</);
  vm.runInContext("uiState.storySteps={s1:{step:1,base:1}}",c);assert.doesNotMatch(c.uiStory(),/id="uStoryIdea"/,'an old manual step is dropped once the workflow moves on')});
test('index.html loads a single Xưởng Truyện renderer',()=>{
  const html=fs.readFileSync('dist/index.html','utf8');
  assert.doesNotMatch(html,/story-empty-reference\.js/);
  assert.ok(!fs.existsSync('dist/story-empty-reference.js'));
  for(const f of html.match(/src="[^"]+\.js"/g).map(x=>x.slice(5,-1))){const code=fs.readFileSync('dist/'+f,'utf8');if(f!=='studio-ui.js')assert.doesNotMatch(code,/series:\s*uiStory|u-story-empty/,f)}});
