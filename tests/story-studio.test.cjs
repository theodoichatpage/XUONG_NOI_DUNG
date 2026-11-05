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
    lfSetSource:(s,src)=>{c.lfData(s).pipeline.source=src},bridgeConnectionState:()=>({tone:'connected',label:'Đã kết nối ChatGPT',help:''}),jobState:j=>j.status,lfJobKinds:{},lfStoryLang:s=>s?.storyLanguage||'English',lfNeedsReview:()=>true,lfReviewFresh:()=>false,lfChapterCheck:()=>({items:[]}),lfAIReviewFresh:()=>false,lfVersion:()=>1});
  vm.runInContext(src.slice(0,src.indexOf('const uiBaseChoose=')),c);
  c.uiRender=()=>{c.rendered=(c.rendered||0)+1};
  return c}
test('no story yet: full workspace with idea fields instead of the old blank start card',()=>{
  const c=runtime(),html=c.uiStory();
  assert.doesNotMatch(html,/Bắt đầu bộ truyện đầu tiên/);
  for(const part of['Bộ truyện của tôi','Tạo truyện mới','Xưởng Truyện','ChatGPT: Đã kết nối','Ý tưởng & nguồn','Cốt truyện & nhân vật','Sản xuất chương','Tạo từ chủ đề','Sáng tạo từ kịch bản mẫu','Chủ đề / Ý tưởng chính','0/2000','Thể loại','Quy mô','Văn phong cá nhân','Yêu cầu bổ sung','data-ui-action="reset-source"','data-ui-action="create-from-idea"','Xây dựng truyện bằng AI','Trợ lý Xưởng (AI)','Tác vụ','Hội thoại','Kết quả','Chọn tác vụ AI','Tiến trình','Đã gửi yêu cầu đến ChatGPT','ChatGPT đang xử lý','Nhận kết quả &amp; hiển thị'.replace('&amp;','&'),'Chờ bạn duyệt áp dụng'])assert.ok(html.includes(part),part);
  for(const gone of['Cấu trúc bộ truyện','Gợi ý nhanh','Ý tưởng mẫu','<h3>Ý tưởng & nguồn','Bộ truyện:'])assert.ok(!html.includes(gone),gone);
  vm.runInContext("uiState.storySteps={new:{step:3,base:1}}",c);assert.match(c.uiStory(),/Tạo truyện ở bước 1/)});
test('the source tab switches between topic and reference fields',()=>{
  const c=runtime();assert.doesNotMatch(c.uiStory(),/id="uStoryLink"/);
  vm.runInContext("uiState.srcTab='reference';uiState.srcTabFor='new'",c);const html=c.uiStory();
  assert.match(html,/id="uStoryLink"/);assert.ok(html.includes('Ý tưởng của bạn (tùy chọn)'));assert.ok(html.includes('Phân tích &amp; xây dựng bằng AI')||html.includes('Phân tích & xây dựng bằng AI'))});
test('development directions cover continue, arcs and both endings',()=>{
  const c=runtime(),values=vm.runInContext('uiStoryDirections',c).map(d=>d[1]);
  for(const v of['Tiếp tục tuyến hiện tại','Theo kế hoạch đã duyệt','Mở Arc mới','Đẩy nhanh xung đột','Chuẩn bị cao trào','Chuẩn bị kết Arc','Chuẩn bị kết mở','Chuẩn bị kết đóng'])assert.ok(values.includes(v),v)});
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
  for(const part of['Kẻ giữ ký ức','Minh khám phá thành phố.','Twist A','data-ui-character="c1"','data-ui-action="build-story"','data-ui-action="story-advanced"','aria-selected="true" data-ui-storystep="2"','Tổng quan','Thế giới','Tuyến truyện','Nút thắt đang theo dõi','data-ui-plottab="threads"','Minh khám phá thành phố.'])assert.ok(html.includes(part),part);
  assert.ok(!html.includes('Trợ lý Xưởng (AI)'),'step 2 has no AI assistant panel');assert.doesNotMatch(html,/data-ui-plottab="characters"/,'no duplicate characters tab');
  vm.runInContext("uiState.plotTab='threads'",c);assert.ok(c.uiStory().includes('Twist B'));vm.runInContext("uiState.plotTab=''",c);
  vm.runInContext("uiState.storySteps={s1:{step:1,base:2}}",c);assert.match(c.uiStory(),/id="uStoryIdea"[^>]*>Ý tưởng</);
  vm.runInContext("uiState.storySteps={s1:{step:1,base:1}}",c);assert.doesNotMatch(c.uiStory(),/id="uStoryIdea"/,'an old manual step is dropped once the workflow moves on')});
test('index.html loads a single Xưởng Truyện renderer',()=>{
  const html=fs.readFileSync('dist/index.html','utf8');
  assert.doesNotMatch(html,/story-empty-reference\.js/);
  assert.ok(!fs.existsSync('dist/story-empty-reference.js'));
  for(const f of html.match(/src="[^"]+\.js"/g).map(x=>x.slice(5,-1))){const code=fs.readFileSync('dist/'+f,'utf8');if(f!=='studio-ui.js')assert.doesNotMatch(code,/series:\s*uiStory|u-story-empty/,f)}});

function produce(){
  const s={id:'b',title:'Book',channelId:'wn',story:{characters:[],plans:[],glossary:[],memories:[],pipeline:{source:{mode:'topic',topic:'x',chapters:20},artifacts:{}}}};
  const c=runtime([s]);c.db.channels[0].name='Webnovel – Book';
  const chs=()=>c.db.content.filter(x=>x.seriesId==='b').sort((a,b)=>a.chapterNumber-b.chapterNumber);
  Object.assign(c,{lfApproved:()=>true,lfChapters:chs,lfNextChapter:()=>Math.max(0,...chs().map(x=>x.chapterNumber))+1,lfPlans:(s,n)=>[{kind:'chapter',title:'Plan '+n,startChapter:n,endChapter:n}],
    lfChapterDefaults:()=>{const n=c.lfNextChapter();return{title:'Chương '+n+' — Book',channelId:'wn',seriesId:'b',status:'draft',chapterNumber:n,productionTask:'chapter',body:'',prompt:'Viết đúng kế hoạch'}},
    lfContext:(s,n,intent)=>'CTX '+n+'\n'+intent,lfCurrentStage:()=>['ready'],uiCurrentStage:()=>['ready','Sẵn sàng',''],jobState:j=>j.status,uiStoryJob:()=>'',
    sent:[],xnDispatchText:async(job,prompt)=>{c.sent.push({job,prompt});c.db.aiJobs.push(job);job.status='waiting_send';return job}});
  c.uiState=vm.runInContext('uiState',c);return {c,s,chs}}
test('step 3 shows chapter list, editor and production panel without fake chapters',()=>{
  const {c,s}=produce();vm.runInContext("uiState.storySteps={b:{step:3,base:3}}",c);const html=c.uiStory();
  for(const part of['Chương','Tất cả','Bản nháp','Đã duyệt','Đã đăng','Chưa có chương. Chọn số chương','Sản xuất tiếp','Hướng phát triển','Yêu cầu bổ sung','Sản xuất 10 chương','Xưởng <b>→</b> ChatGPT','Trợ lý Xưởng (AI)'])assert.ok(html.includes(part),part);
  assert.doesNotMatch(html,/data-ui-chapter=/)});
test('batch writes chapters one by one and only moves on after the previous one is saved',async()=>{
  const {c,s,chs}=produce();vm.runInContext("uiState.batchDrafts={b:{count:3,ending:'faster',options:'Giữ nhịp nhanh'}}",c);
  await c.uiBatchStart(s);assert.equal(s.uiBatch.status,'running');assert.equal(c.sent.length,1);assert.equal(chs()[0].title,'Chương 1 — Plan 1');
  assert.match(c.sent[0].prompt,/Đẩy nhanh xung đột/);assert.match(c.sent[0].prompt,/Giữ nhịp nhanh/);
  await c.uiBatchTick();assert.equal(c.sent.length,1,'no next chapter while ChatGPT is still writing');
  const j1=c.sent[0].job;chs()[0].body='Body 1';chs()[0].status='review';j1.status='applied';await c.uiBatchTick();
  assert.equal(c.sent.length,2);assert.equal(s.uiBatch.current,2);assert.match(c.sent[1].prompt,/CHƯƠNG TRƯỚC \(bản nháp chưa duyệt/);
  c.sent[1].job.status='error';c.sent[1].job.error='Không gửi được';await c.uiBatchTick();assert.equal(s.uiBatch.status,'error');
  await c.uiBatchControl(s,'retry');assert.equal(c.sent.length,3);assert.equal(c.sent[2].job.targetId,chs()[1].id,'retry resends the failed chapter, not the finished one');
  await c.uiBatchControl(s,'pause');chs()[1].body='Body 2';c.sent[2].job.status='applied';await c.uiBatchTick();assert.equal(c.sent.length,3,'paused batch waits');
  await c.uiBatchControl(s,'resume');assert.equal(c.sent.length,4);chs()[2].body='Body 3';c.sent[3].job.status='applied';await c.uiBatchTick();assert.equal(s.uiBatch.status,'done');assert.equal(chs().every(x=>x.status!=='approved'),true,'nothing is approved automatically')});
test('approve, then publish needs a real link; schedule spaces chapters 24h apart',async()=>{
  const {c,s,chs}=produce();for(const n of[1,2])c.db.content.push({id:'c'+n,seriesId:'b',chapterNumber:n,title:'Chương '+n+' — T'+n,status:'review',body:'Text '+n,productionTask:'chapter'});
  await assert.rejects(c.uiPublishAction(s,'one'),/Duyệt chương trước khi đăng/);
  c.uiChapterApprove('c1');c.uiChapterApprove('c2');assert.equal(chs()[0].status,'approved');
  c.uiState.chOpen={b:'c1'};await c.uiPublishAction(s,'one');await assert.rejects(c.uiPublishAction(s,'mark'),/Dán link chương đã đăng/);assert.equal(chs()[0].status,'approved');
  c.uiState.pubPop.link='https://www.webnovel.com/c1';await c.uiPublishAction(s,'mark');assert.equal(chs()[0].status,'live');assert.equal(chs()[0].link,'https://www.webnovel.com/c1');
  c.uiState.chSel=new Set(['c2']);await c.uiPublishAction(s,'schedule');Object.assign(c.uiState.pubPop,{date:'2026-11-05',time:'20:00'});await c.uiPublishAction(s,'save-schedule');assert.equal(chs()[1].scheduledAt,'2026-11-05T20:00');assert.equal(chs()[1].status,'approved','scheduling does not mark as published')});
test('editing a chapter saves body and keeps history; approved chapters are locked',()=>{
  const {c,chs}=produce();c.db.content.push({id:'c1',seriesId:'b',chapterNumber:1,title:'Chương 1 — T',status:'review',body:'Old',productionTask:'chapter'});
  c.uiState.chDraft={c1:{title:'T',body:'New'}};assert.equal(c.uiChapterSave('c1'),true);assert.equal(chs()[0].body,'New');assert.equal(chs()[0].history.at(-1).body,'Old');
  c.uiChapterApprove('c1');c.uiState.chDraft={c1:{title:'T',body:'Changed'}};assert.throws(()=>c.uiChapterSave('c1'),/khóa/)});
test('chat bridge builds the chapter prompt in one place for the editor and the batch',()=>{
  const src=fs.readFileSync('dist/chatgpt-bridge.js','utf8');assert.match(src,/function xnTextPrompt\(prompt,job\)/);assert.match(src,/const textPrompt=type==='text'\?xnTextPrompt\(prompt,job\):prompt;/);assert.match(src,/async function xnDispatchText\(job,prompt\)/)});

test('Duyệt và tiếp tục approves the stage and sends the next one to ChatGPT',async()=>{
  const s={id:'k',title:'K',story:{characters:[],plans:[],glossary:[],pipeline:{source:{mode:'topic',topic:'x'},artifacts:{concept:{value:{}}}}}};
  const c=runtime([s]);const order=['concept','bible'],approved=new Set;let built=0;
  Object.assign(c,{lfApprove:(x,k)=>approved.add(k),uiCurrentStage:()=>{const k=order.find(k=>!approved.has(k))||'ready';return [k,{concept:'Concept',bible:'Cốt truyện tổng quan'}[k]||'']},uiBuildStory:async()=>{built++}});
  await c.uiApproveAndContinue(s);assert.ok(approved.has('concept'));assert.equal(built,1);assert.match(c.toasted,/Đã gửi “Cốt truyện tổng quan”/);
  s.story.pipeline.artifacts.bible={value:{}};await c.uiApproveAndContinue(s);assert.equal(built,1,'nothing more to send once everything is approved');assert.match(c.toasted,/Sang bước 3/)});

test('after the outline is approved ChatGPT drafts the glossary and style guide automatically, once',async()=>{
  const s={id:'g',title:'G',story:{characters:[],plans:[],glossary:[],styleGuide:'',pipeline:{source:{mode:'topic',topic:'x'},artifacts:{}}}};
  const c=runtime([s]);const sent=[];let stage='outline';
  Object.assign(c,{lfApprove:()=>{stage='ready'},uiCurrentStage:()=>[stage,stage==='ready'?'':'Dàn ý chương'],lfSend:async(x,kind)=>{sent.push(kind)},lfJobKinds:{}});
  await c.uiApproveAndContinue(s);assert.deepEqual(sent,['GENERATE_STYLE_GLOSSARY']);assert.match(c.toasted,/Thuật ngữ & văn phong/);
  stage='outline';s.story.glossary.push({term:'Shang'});await c.uiApproveAndContinue(s);assert.equal(sent.length,1,'an existing glossary is not regenerated')});
test('chapter production waits while another ChatGPT step of the same book is running',async()=>{
  const s={id:'w',title:'W',story:{characters:[],plans:[],glossary:[],pipeline:{source:{mode:'topic',topic:'x'},artifacts:{}}}};
  const c=runtime([s]);c.lfApproved=()=>true;c.db.aiJobs.push({id:'x',seriesId:'w',storyTask:'GENERATE_STYLE_GLOSSARY',status:'waiting_send'});c.lfJobKinds={GENERATE_STYLE_GLOSSARY:'Thuật ngữ & văn phong'};
  await assert.rejects(c.uiBatchStart(s),/Thuật ngữ & văn phong/)});

test('auto-approve: valid stage results are approved and the next stage is sent, only when switched on',async()=>{
  const s={id:'a',title:'A',story:{characters:[],plans:[],glossary:[],styleGuide:'x',pipeline:{source:{mode:'topic',topic:'x'},artifacts:{bible:{value:{premise:'p'},createdAt:'t1'}}}}};
  const c=runtime([s]);const approved=[],sent=[];let order=['bible','characters','outline'];
  Object.assign(c,{lfApprove:(x,k)=>{approved.push(k)},uiCurrentStage:()=>{const k=order.find(k=>!approved.includes(k))||'ready';return [k,k]},uiBuildStory:async()=>{sent.push(uiCur())}});
  const uiCur=()=>c.uiCurrentStage()[0];
  await c.uiAutoApproveTick();assert.deepEqual(approved,[],'off by default');
  c.db.uiSettings={autoApprove:true};await c.uiAutoApproveTick();assert.deepEqual(approved,['bible']);assert.deepEqual(sent,['characters'],'next stage sent to ChatGPT');
  await c.uiAutoApproveTick();assert.deepEqual(approved,['bible'],'nothing to approve until the characters arrive');
  s.story.pipeline.artifacts.characters={value:{characters:[]},createdAt:'t2'};c.db.aiJobs.push({seriesId:'a',storyTask:'GENERATE_OUTLINE',status:'running'});await c.uiAutoApproveTick();assert.deepEqual(approved,['bible'],'waits while ChatGPT is busy');
  c.db.aiJobs[0].status='applied';await c.uiAutoApproveTick();assert.deepEqual(approved,['bible','characters'])});
test('auto-approve stops on an invalid result and does not retry the same result',async()=>{
  const s={id:'b',title:'B',story:{characters:[],plans:[],glossary:[],pipeline:{source:{mode:'topic',topic:'x'},artifacts:{bible:{value:{},createdAt:'t'}}}}};
  const c=runtime([s]);let tries=0;c.db.uiSettings={autoApprove:true};
  Object.assign(c,{uiCurrentStage:()=>['bible','Cốt truyện tổng quan'],uiApproveAndContinue:async()=>{tries++;throw Error('Thiếu premise.')}});
  await c.uiAutoApproveTick();await c.uiAutoApproveTick();assert.equal(tries,1);assert.match(c.toasted,/Không tự duyệt được Cốt truyện tổng quan: Thiếu premise/)});
test('settings show the auto-approve switch',()=>{const c=runtime();c.db.uiSettings={autoApprove:true};Object.assign(c,{bridgeStatus:{ok:false},document:{documentElement:{classList:{contains:()=>true}}}});const html=vm.runInContext('uiSettings()',c);assert.match(html,/Tự duyệt các bước dựng truyện/);assert.match(html,/data-ui-autoapprove="on" class="selected"/)});

test('stepper marks finished steps and keeps the viewed one active',()=>{const c=runtime();const html=c.uiStorySteps(1,2);assert.match(html,/data-ui-storystep="1" class="active done"/);assert.match(html,/data-ui-storystep="2" class="done"/);assert.match(html,/data-ui-storystep="3" class=""/);assert.equal((html.match(/class="hot"/g)||[]).length,2)});

test('a chapter being written shows the moving "writing" state in the list and the editor',()=>{
  const s={id:'w2',title:'W',story:{characters:[],plans:[],glossary:[],memories:[],pipeline:{source:{mode:'topic',topic:'x',chapters:20},artifacts:{}}}};
  const c=runtime([s]);Object.assign(c,{lfApproved:()=>true,lfChapters:()=>c.db.content,lfNextChapter:()=>2,lfPlans:()=>[],jobState:j=>j.status,uiCurrentStage:()=>['ready','',''],uiStoryJob:()=>''});
  c.db.content.push({id:'k1',seriesId:'w2',chapterNumber:1,title:'Chương 1 — W',status:'draft',body:'',productionTask:'chapter'});c.db.aiJobs.push({id:'j',storyTask:'WRITE_CHAPTER',targetId:'k1',seriesId:'w2',status:'waiting_send'});
  vm.runInContext("uiState.storySteps={w2:{step:3,base:3}}",c);const html=c.uiStory();
  assert.match(html,/class="sp-row active writing"/);assert.match(html,/class="sp-skel"/);assert.match(html,/ChatGPT đang viết Chương 1/)});
test('Bridge returns to the Xưởng tab once the prompt is sent, and only then',()=>{
  const bg=fs.readFileSync('extension/background.js','utf8'),cs=fs.readFileSync('extension/chatgpt-content.js','utf8');
  assert.match(cs,/kind:'XN_CHAT_SENT',jobId:j\.id,sent/);assert.match(bg,/m\.kind==='XN_CHAT_SENT'/);assert.match(bg,/if\(m\.sent&&j\.studioTabId\)/)});

test('the author request box is shown in the editor and sent with Viết lại',async()=>{
  const s={id:'r',title:'R',story:{characters:[],plans:[],glossary:[],memories:[],pipeline:{source:{mode:'topic',topic:'x',chapters:20},artifacts:{}}}};
  const c=runtime([s]);let prompt='';Object.assign(c,{lfApproved:()=>true,lfChapters:()=>c.db.content,lfNextChapter:()=>2,lfPlans:()=>[],jobState:j=>j.status,uiCurrentStage:()=>['ready','',''],uiStoryJob:()=>'',lfContext:(s,n,intent)=>intent,xnDispatchText:async(job,p)=>{prompt=p;c.db.aiJobs.push(job);return job}});
  c.db.content.push({id:'q1',seriesId:'r',chapterNumber:1,title:'Chương 1 — R',status:'review',body:'Old text',productionTask:'chapter'});
  vm.runInContext("uiState.storySteps={r:{step:3,base:3}}",c);assert.match(c.uiStory(),/id="uChAsk"/);
  await c.uiChapterWrite(s,c.db.content[0],'rewrite',null,'Mở đầu bằng cảnh chủ nợ đến đòi nhà');assert.match(prompt,/VIẾT LẠI toàn bộ chương này theo hướng KHÁC RÕ RỆT/);assert.match(prompt,/ĐOẠN MỞ ĐẦU CỦA BẢN TRƯỚC[\s\S]*Old text/);assert.match(prompt,/YÊU CẦU CỦA TÁC GIẢ CHO LẦN VIẾT NÀY.*chủ nợ/)});

test('a rewrite result replaces a chapter that is waiting for review; approved chapters stay locked',()=>{
  const src=fs.readFileSync('dist/chatgpt-bridge.js','utf8'),ctx=vm.createContext({});vm.runInContext(src.slice(src.indexOf('function canAutoApply('),src.indexOf('function',src.indexOf('function canAutoApply(')+10)),ctx);
  const j={baseUpdatedAt:'u1',baseBody:'Old'};assert.equal(ctx.canAutoApply(j,{status:'review',updatedAt:'u1',body:'Old'}),true);assert.equal(ctx.canAutoApply(j,{status:'approved',updatedAt:'u1',body:'Old'}),false);assert.equal(ctx.canAutoApply(j,{status:'review',updatedAt:'u2',body:'Edited'}),false)});
test('waiting chapter results are applied automatically, newest only, never over the author\'s unsaved edits',()=>{
  const c=runtime();let applied=[];Object.assign(c,{canAutoApply:()=>true,applyStory:(j,ch)=>{applied.push(j.id);j.status='applied'}});
  c.db.content.push({id:'x1',status:'review'},{id:'x2',status:'review'});c.db.aiJobs.push({id:'old',storyTask:'WRITE_CHAPTER',targetId:'x1',status:'ready'},{id:'new',storyTask:'WRITE_CHAPTER',targetId:'x1',status:'ready'},{id:'mine',storyTask:'WRITE_CHAPTER',targetId:'x2',status:'ready'});
  vm.runInContext("uiState.chDraft={x2:{body:'typing'}}",c);assert.equal(c.uiApplyReadyChapters(),1);assert.deepEqual(applied,['new'])});

test('a finished batch that still carries an old error is closed, so production can continue',async()=>{
  const {c,s,chs}=produce();c.db.content.push({id:'d1',seriesId:'b',chapterNumber:1,title:'Chương 1 — Plan 1',status:'approved',body:'Text',productionTask:'chapter'});
  s.uiBatch={id:'old',start:1,end:1,count:1,current:1,status:'error',error:'Context vượt giới hạn.'};
  vm.runInContext("uiState.storySteps={b:{step:3,base:3}}",c);const html=c.uiStory();assert.equal(s.uiBatch.status,'done');assert.doesNotMatch(html,/Context vượt giới hạn/);
  assert.match(html,/data-ui-action="batch-one"[^>]*>Viết chương tiếp theo \(2\)/);await c.uiBatchStart(s,1);assert.equal(s.uiBatch.start,2);assert.equal(c.sent.length,1)});

function vaultRuntime(series=[]){const c=runtime(series);Object.assign(c,{crypto:globalThis.crypto,TextEncoder,TextDecoder,atob,btoa,setTimeout:()=>0,clearTimeout:()=>{},safeLink:(u,l)=>'<a>'+l+'</a>',uiBadge:t=>t});const answers=[];c.choose=async()=>answers.shift()??null;return {c,answers}}
test('Webnovel passwords are stored only encrypted and open again with the master password (new device = same backup + master password)',async()=>{
  const {c,answers}=vaultRuntime();answers.push({name:'Main',loginId:'me@mail.com',password:'Secret#123',penName:'Ash',profileUrl:'https://inkstone.webnovel.com/'},{p1:'master-pass',p2:'master-pass'});
  assert.equal(await c.uiAccountEdit(''),true);const saved=JSON.stringify(c.db);assert.doesNotMatch(saved,/Secret#123/);assert.doesNotMatch(saved,/master-pass/);assert.ok(c.db.vault.check.ct);
  const backup=JSON.parse(saved);
  // another device: same data, vault locked
  const other=vaultRuntime();Object.assign(other.c.db,backup);other.answers.push({p:'wrong-pass'});await assert.rejects(other.c.uiAccountSecret(backup.webnovelAccounts[0].id),/Mật khẩu chủ không đúng/);
  other.answers.push({p:'master-pass'});assert.equal(await other.c.uiAccountSecret(backup.webnovelAccounts[0].id),'Secret#123')});
test('the same Webnovel login cannot be added twice, and every story belongs to one account',async()=>{
  const s={id:'s9',title:'Ashen',story:{characters:[],plans:[],glossary:[],pipeline:{source:{mode:'topic',topic:'x'},artifacts:{}}}};
  const {c,answers}=vaultRuntime([s]);answers.push({name:'A',loginId:'a@mail.com',password:'',penName:'',profileUrl:''});await c.uiAccountEdit('');
  answers.push({name:'B',loginId:'A@mail.com',password:'',penName:'',profileUrl:''});await assert.rejects(c.uiAccountEdit(''),/đã có trong danh sách/);
  s.webnovelAccountId=c.db.webnovelAccounts[0].id;assert.equal(c.uiAccountOf(s).name,'A');const html=c.uiAccountRows(s);assert.match(html,/Truyện: Ashen/);assert.match(html,/data-ui-acctmenu=/);assert.match(c.uiAccountAssign(s),/id="uStoryAccount"/);vm.runInContext("uiState.acctMenu="+JSON.stringify(c.db.webnovelAccounts[0].id),c);const menu=c.uiAccountRows(s);for(const x of['Sao chép thành tài khoản mới','Sao chép ID đăng nhập','Sửa','Xóa'])assert.ok(menu.includes(x),x);
  answers.push({name:'Copy',loginId:'b@mail.com',password:'',penName:'',profileUrl:''});let seen='';const base=c.choose;c.input=(n,l,v)=>'<input name="'+n+'" value="'+v+'">';c.choose=async(t,h)=>{seen=h;return base(t,h)};await c.uiAccountEdit('',c.db.webnovelAccounts[0].id);assert.match(seen,/value="A \(bản sao\)"/);assert.match(seen,/data-no-paginate/);assert.equal(c.db.webnovelAccounts.length,2)});
test('publishing needs the story\'s account once accounts exist, and records it',async()=>{
  const {c,s,chs}=produce();Object.assign(c,{crypto:globalThis.crypto});c.db.webnovelAccounts=[{id:'acc1',name:'Main',loginId:'me'}];c.db.content.push({id:'p1',seriesId:'b',chapterNumber:1,title:'Chương 1 — T',status:'approved',body:'x',productionTask:'chapter'});
  c.uiState.chOpen={b:'p1'};await c.uiPublishAction(s,'one');c.uiState.pubPop.link='https://www.webnovel.com/c1';await assert.rejects(c.uiPublishAction(s,'mark'),/Gán tài khoản Webnovel/);
  s.webnovelAccountId='acc1';await c.uiPublishAction(s,'mark');assert.equal(chs()[0].status,'live');assert.equal(chs()[0].publishedAccountId,'acc1')});

test('publishing tab shows the Webnovel listing with copy buttons and the cover actions',()=>{
  const s={id:'L',title:'Ashen',webnovelListing:{bookName:'The Ashen Crown',leadingGender:'male',genre:'Historical',synopsis:'Hook.',tags:['Reincarnation'],abbreviation:'ASHEN',length:'long',warning:'none',coverPrompt:'c'},story:{characters:[],plans:[],glossary:[],pipeline:{source:{mode:'topic',topic:'x'},artifacts:{}}}};
  const c=runtime([s]);c.lfApproved=()=>true;const html=c.uiListing(s);for(const x of['Hồ sơ truyện trên Webnovel','The Ashen Crown','Male oriented','data-ui-listcopy="synopsis"','Tạo ảnh bìa bằng ChatGPT','Soạn lại bằng ChatGPT'])assert.ok(html.includes(x),x);
  c.db.assets=[{id:'img1',data:'data:image/jpeg;base64,AA'}];c.db.aiJobs.push({type:'image',coverFor:'L',status:'applied',targetId:'img1'});const h2=c.uiListing(s);assert.match(h2,/<img src="data:image\/jpeg;base64,AA"/);assert.match(h2,/Tải bìa 600×800/)});

test('"Điền lên Inkstone" is always visible; disabled until the listing exists',()=>{const s={id:'N',title:'N',story:{characters:[],plans:[],glossary:[],pipeline:{source:{mode:'topic',topic:'x'},artifacts:{}}}};const c=runtime([s]);c.lfApproved=()=>true;assert.match(c.uiListing(s),/data-ui-listing="inkstone" disabled/)});

test('when the Bridge lost a job, Xưởng sends the newest one again by itself, only once',async()=>{
  const s={id:'R1',title:'R',story:{characters:[],plans:[],glossary:[],pipeline:{source:{mode:'topic',topic:'x'},artifacts:{}}}};
  const c=runtime([s]);const sent=[];Object.assign(c,{bridgeStatus:{ok:true,connected:true,activeJob:null},bridgeCall:async()=>({ok:true}),lfSend:async(x,kind)=>{sent.push(kind)},lfJobKinds:{GENERATE_STORY_BIBLE:'Story Bible'}});
  c.db.aiJobs.push({id:'old',seriesId:'R1',storyTask:'GENERATE_STORY_BIBLE',status:'error',error:'Bridge đã tải lại nên không còn theo dõi việc này.',createdAt:new Date().toISOString(),scope:{}});
  assert.equal(await c.uiAutoResendTick(),true);assert.deepEqual(sent,['GENERATE_STORY_BIBLE']);assert.equal(c.db.aiJobs[0].status,'stopped');
  c.db.aiJobs[0].status='error';assert.equal(await c.uiAutoResendTick(),false,'not again for the same job');assert.equal(sent.length,1);
  c.bridgeStatus.connected=false;c.db.aiJobs.push({id:'new',seriesId:'R1',storyTask:'GENERATE_STORY_BIBLE',status:'error',error:'Bridge đã tải lại nên không còn theo dõi việc này.',createdAt:new Date().toISOString(),scope:{}});assert.equal(await c.uiAutoResendTick(),false,'waits until ChatGPT is connected')});

test('a batch whose current chapter never got a job (page reloaded mid-send) sends it on the next tick',async()=>{
  const {c,s,chs}=produce();c.db.content.push({id:'k5',seriesId:'b',chapterNumber:5,title:'Chương 5 — Plan 5',status:'draft',body:'',productionTask:'chapter'});for(const n of[1,2,3,4])c.db.content.push({id:'k'+n,seriesId:'b',chapterNumber:n,title:'Chương '+n,status:'review',body:'B'+n,productionTask:'chapter'});
  s.uiBatch={id:'bb',start:3,end:6,count:4,current:5,status:'running',ending:'continue'};await c.uiBatchTick();assert.equal(c.sent.length,1);assert.equal(c.sent[0].job.targetId,'k5');assert.equal(c.sent[0].job.batchId,'bb');
  await c.uiBatchTick();assert.equal(c.sent.length,1,'no duplicate while the chapter is being written')});
test('copy for Inkstone puts only the chapter body on the clipboard; the title has its own button',async()=>{
  const {c,s}=produce();let clip='',opened=[];Object.assign(c,{navigator:{clipboard:{writeText:async x=>{clip=x}}},window:{open:(u,n)=>opened.push(n)}});c.db.content.push({id:'q1',seriesId:'b',chapterNumber:1,title:'Chương 1 — A House Full of Debt',status:'approved',body:'Put the account book on the table.',productionTask:'chapter'});
  c.uiState.chOpen={b:'q1'};await c.uiPublishAction(s,'one');await c.uiPublishAction(s,'copy');assert.equal(clip,'Put the account book on the table.');assert.deepEqual(opened,['xuong-inkstone']);
  await c.uiPublishAction(s,'copy-title');assert.equal(clip,'A House Full of Debt')});

test('chapter score: ChatGPT review + automatic checks give 0–100; a pass needs ≥70, verdict ok and no errors',()=>{const c=runtime();
  const clean={items:[]},ai={verdict:'ok',hook:{score:5,note:''},ending:{score:4,note:''},planCoverage:'ok',contradictions:[],styleIssues:['x'],summaryVi:'s'};
  const a=c.uiChapterScore(clean,ai);assert.equal(a.score,25+20+20+12+15);assert.equal(a.pass,true);
  const b=c.uiChapterScore(clean,{...ai,verdict:'revise',hook:{score:2,note:'flat'},contradictions:[{issue:'i'}]});assert.equal(b.pass,false);assert.ok(b.score<70);
  const d=c.uiChapterScore({items:[{level:'error',title:'Thiếu chữ'}]},ai);assert.equal(d.pass,false,'automatic errors block a pass');
  const e=c.uiChapterScore(clean,null);assert.equal(e.ai,false);assert.equal(e.pass,false);assert.match(e.label,/Chưa chấm/)});
test('"Sửa theo góp ý" turns the review into a rewrite request',()=>{const c=runtime();const ask=c.uiScoreFixAsk({verdict:'revise',hook:{score:2,note:'Opens on weather'},ending:{score:5,note:'good'},planCoverage:'',contradictions:[{issue:'Linh biết tên cha Minh quá sớm'}],styleIssues:['Lặp "suddenly"'],summaryVi:'Tăng xung đột.'});
  assert.match(ask,/Mở đầu: Opens on weather/);assert.doesNotMatch(ask,/Kết chương/);assert.match(ask,/Sửa mâu thuẫn: Linh biết/);assert.match(ask,/Văn phong: Lặp/)});
test('publishing a chapter below the score asks first; declining keeps it unpublished',async()=>{const {c,s,chs}=produce();let asked='';c.uiConfirm=async m=>{asked=m;return false};c.lfChapterCheck=()=>({items:[]});c.lfAIReviewFresh=()=>false;
  c.db.content.push({id:'g1',seriesId:'b',chapterNumber:1,title:'Chương 1 — T',status:'approved',body:'x',productionTask:'chapter'});c.uiState.chOpen={b:'g1'};await c.uiPublishAction(s,'one');c.uiState.pubPop.link='https://www.webnovel.com/c1';
  await c.uiPublishAction(s,'mark');assert.match(asked,/Chương 1: chưa chấm bằng ChatGPT/);assert.equal(chs()[0].status,'approved');c.uiConfirm=async()=>true;await c.uiPublishAction(s,'mark');assert.equal(chs()[0].status,'live')});
test('quality loop: score → fix below target → score again; passes at the target, stops after N rounds',async()=>{const {c,s}=produce();const sent=[];let ver=1;
  const rv=total=>({v:2,total,rubric:Object.fromEntries([['plot',20],['hook',20],['characters',15],['style',15],['world',10],['pacing',10],['genre',10]].map(([k,m])=>[k,{score:Math.round(m*total/100),why:'w',fix:'f'}])),contradictions:[],fixes:[{where:'x',problem:'p',suggestion:'s'}],summaryVi:'s'});
  Object.assign(c,{LF_RUBRIC:[['plot','a',20],['hook','b',20],['characters','c',15],['style','d',15],['world','e',10],['pacing','f',10],['genre','g',10]],lfRubricLabel:(s,k)=>k,lfChapterCheck:()=>({items:[]}),lfVersion:()=>ver,lfAIReviewFresh:x=>!!x.aiReview&&x.aiReview.revision===ver,lfSend:async(x,k,sc)=>{sent.push('review:'+sc.chapterId)},uiChapterWrite:async(x,ch,mode,b,ask)=>{sent.push(mode+':'+ch.id);assert.match(ask,/Sửa chương theo góp ý/)}});
  
  c.db.content.push({id:'q1',seriesId:'b',chapterNumber:1,status:'review',body:'a',productionTask:'chapter'});
  assert.equal(await c.uiQaTick(),false,'off by default');c.db.uiSettings={qaLoop:true,qaTarget:85,qaMaxRounds:2};
  await c.uiQaTick();assert.deepEqual(sent,['review:q1']);
  c.db.content[0].aiReview={revision:ver,value:rv(70)};await c.uiQaTick();assert.deepEqual(sent,['review:q1','fix:q1']);assert.equal(c.db.content[0].qa.round,1);
  ver=2;await c.uiQaTick();assert.equal(sent.at(-1),'review:q1','the fixed chapter is scored again');
  c.db.content[0].aiReview={revision:ver,value:rv(80)};await c.uiQaTick();assert.equal(sent.at(-1),'fix:q1');assert.equal(c.db.content[0].qa.round,2);
  ver=3;c.db.content[0].aiReview={revision:ver,value:rv(82)};await c.uiQaTick();assert.equal(c.db.content[0].qa.status,'needs-human','stops after the maximum rounds');assert.deepEqual([...c.db.content[0].qa.scores],[70,80,82]);
  ver=4;c.db.content[0].qa.status='fixing';c.db.content[0].aiReview={revision:ver,value:rv(90)};await c.uiQaTick();assert.equal(c.db.content[0].qa.status,'passed')});
test('step 4 shows the 7 criteria with why/where to fix, and publishing lives there (not in step 3)',()=>{const {c,s}=produce();c.LF_RUBRIC=[['plot','Cốt truyện và ý tưởng',20],['hook','Mở đầu và sức hút',20],['characters','Xây dựng nhân vật',15],['style','Văn phong',15],['world','Bối cảnh',10],['pacing','Nhịp',10],['genre','Phù hợp',10]];c.lfRubricLabel=(s,k)=>c.LF_RUBRIC.find(x=>x[0]===k)[1];c.lfChapterCheck=()=>({items:[]});c.lfAIReviewFresh=()=>true;
  const value={v:2,total:70,verdict:'revise',rubric:{plot:{score:16,why:'Ý tưởng rõ',fix:''},hook:{score:11,why:'Mở chậm',fix:'Cắt đoạn tả mái nhà'},characters:{score:11,why:'',fix:''},style:{score:13,why:'',fix:''},world:{score:8,why:'',fix:''},pacing:{score:5,why:'',fix:'Kết bằng tiếng gõ cửa'},genre:{score:6,why:'',fix:''}},contradictions:[],fixes:[{where:'The roof was not his.',problem:'Mở bằng tả',suggestion:'Mở bằng chủ nợ'}],summaryVi:'Tiềm năng tốt.'};
  c.db.content.push({id:'v1',seriesId:'b',chapterNumber:1,title:'Chương 1 — A House Full of Debt',status:'review',body:'x',productionTask:'chapter',aiReview:{revision:1,value}});c.uiState.chOpen={b:'v1'};
  vm.runInContext("uiState.storySteps={b:{step:4,base:3}}",c);const html=c.uiStory();
  for(const x of['ĐÁNH GIÁ BIÊN TẬP','70/100','Mở đầu và sức hút','11/20','Vì sao:','Sửa ở đâu:','Cắt đoạn tả mái nhà','Cần sửa ở đâu (1)','Mở bằng chủ nợ','Điều phối chất lượng','Sửa theo góp ý','data-ui-publish="one"','Chọn nhiều'])assert.ok(html.includes(x),x);
  vm.runInContext("uiState.storySteps={b:{step:3,base:3}}",c);const s3=c.uiStory();assert.doesNotMatch(s3,/data-ui-publish=/);assert.match(s3,/Đánh giá & đăng ›/)});
test('scoring shows "sending" at once and keeps an error visible in the score row',async()=>{const {c,s}=produce();Object.assign(c,{lfChapterCheck:()=>({items:[]}),lfAIReviewFresh:()=>false});c.db.content.push({id:'z1',seriesId:'b',chapterNumber:1,title:'Chương 1 — T',status:'review',body:'Text',productionTask:'chapter'});c.uiState.chOpen={b:'z1'};
  let seen='';c.lfSend=async()=>{seen=c.uiScoreRow(s,c.db.content[0],'Text',false);throw Error('Bộ truyện đang có việc khác')};c.uiRender=()=>{};
  await assert.rejects(c.uiScoreAction(s,'review'),/việc khác/);assert.match(seen,/Đang gửi yêu cầu chấm sang ChatGPT/);assert.match(c.uiScoreRow(s,c.db.content[0],'Text',false),/sp-score-err">Bộ truyện đang có việc khác/);
  c.uiState.chDraft={z1:{body:'typing'}};assert.doesNotMatch(c.uiScoreRow(s,c.db.content[0],'typing',false),/data-ui-score="review" disabled/,'unsaved text no longer disables the button')});

test('Sudowrite Story Bible kit is built from the approved story data, 7 sections',()=>{const s={id:'sw',title:'Ashen',storyLanguage:'English',webnovelListing:{genre:'Historical',tags:['Kingdom Building','Clan Building']},story:{characters:[],plans:[{kind:'arc',title:'Debt',startChapter:1,endChapter:10,body:'Survive the debt'},{kind:'chapter',title:'A House Full of Debt',startChapter:1,endChapter:1,body:'Creditor arrives'}],glossary:[{term:'Han Qirong',note:'landlord'}],styleGuide:'Third person past.',pipeline:{source:{mode:'topic',topic:'Rebirth in a poor village'},artifacts:{concept:{value:{logline:'L',premise:'P'}},bible:{value:{premise:'Shen Yan wakes in debt',world:'Shang Empire frontier',worldRules:'Debt bondage',majorSecret:'He is from the future',reviewVi:{premise:'VI'}}},characters:{value:{characters:[{name:'Shen Yan',role:'Protagonist',personality:'Calm'},{name:'Han Qirong',role:'Landlord'}]}}}}}};
  const c=runtime([s]);c.lfNoReview=v=>JSON.parse(JSON.stringify(v,(k,x)=>k==='reviewVi'?undefined:x));c.lfApproved=()=>true;const k=c.uiSudoKit(s);
  assert.equal(k.genre,'Historical, Kingdom Building, Clan Building');assert.match(k.braindump,/Hidden truth \(never reveal early\): He is from the future/);assert.match(k.synopsis,/Shen Yan wakes in debt/);assert.match(k.worldbuilding,/Han Qirong: landlord/);assert.match(k.outline,/ARC \(Ch\. 1–10\): Debt/);assert.match(k.outline,/Chapter 1: A House Full of Debt/);assert.match(k.style,/Third person past\./);assert.equal(k.characterList.length,2);assert.doesNotMatch(JSON.stringify(k),/VI/);
  const html=c.uiSudoKitView(s);for(const x of['Braindump','Genre','Style','Synopsis','Characters','Worldbuilding','Outline','data-ui-swcopy="char:1"','Sao chép cả gói'])assert.ok(html.includes(x),x)});
