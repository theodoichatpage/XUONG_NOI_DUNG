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
  for(const part of['Chương','Tất cả','Bản nháp','Đã duyệt','Đã đăng','Chọn nhiều','Chưa có chương. Chọn số chương','Sản xuất tiếp','Hướng phát triển','Yêu cầu bổ sung','Sản xuất 10 chương','Xưởng <b>→</b> ChatGPT','Trợ lý Xưởng (AI)'])assert.ok(html.includes(part),part);
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
