const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const source=fs.readFileSync('dist/story-longform-v2.js','utf8');
function fixture(){let seq=0;const s={id:'book',title:'Working',channelId:'wn',chapterLength:100,storyLanguage:'English'},ctx=vm.createContext({db:{series:[s],content:[],aiJobs:[]},structuredClone,Date,console,uid:()=> 'id_'+(++seq),findWebnovelChannel:()=>({id:'wn'}),ch:()=>({language:'English'}),save:()=>true,storyFingerprint:v=>JSON.stringify(v)});const workbench=fs.readFileSync('dist/story-workbench.js','utf8');vm.runInContext(workbench.slice(workbench.indexOf('function storyFingerprint('),workbench.indexOf('function storyMapLocalBook(')),ctx);vm.runInContext(source.slice(0,source.indexOf('const lfBaseOpenEditor')),ctx);return {c:ctx,s}}
const titles=r=>r.items.map(i=>i.level+':'+i.title);
const words=n=>Array.from({length:n},(_,i)=>['Mira','walked','toward','the','silver','gate','while','rain','fell','upward'][i%10]+(i%10===9?'.':'')).join(' ');
test('clean chapter of the right length passes',()=>{
  const {c,s}=fixture();const unique=Array.from({length:85},(_,i)=>String.fromCharCode(98+i%20)+String.fromCharCode(97+Math.floor(i/20))+'x'+(i%7===6?'.':'')).join(' ');
  const r=c.lfChapterCheck(s,'Rain fell upward over Skyreach. Mira laughed at the sky. Sol watched from the tower, silent and cold. '+unique);
  assert.equal(c.lfCheckSummary(r).tone,'ok');assert.ok(titles(r).includes('ok:Độ dài phù hợp'))});
test('empty, short and long chapters are flagged',()=>{
  const {c,s}=fixture();assert.equal(c.lfCheckSummary(c.lfChapterCheck(s,'')).tone,'error');
  assert.ok(titles(c.lfChapterCheck(s,words(40))).includes('error:Chương ngắn hơn mục tiêu'));
  assert.ok(titles(c.lfChapterCheck(s,words(200))).includes('warn:Chương dài hơn mục tiêu'))});
test('Vietnamese text inside an English chapter is an error',()=>{
  const {c,s}=fixture();const r=c.lfChapterCheck(s,words(95)+' Cô ấy mỉm cười.');const e=r.items.find(i=>i.title.startsWith('Lẫn tiếng Việt'));
  assert.ok(e);assert.equal(e.level,'error');assert.match(e.detail,/mỉm cười/);
  s.storyLanguage='Tiếng Việt';assert.ok(!c.lfChapterCheck(s,words(95)+' Cô ấy mỉm cười.').items.some(i=>i.title.startsWith('Lẫn tiếng Việt')))});
test('AI cliches and style-guide "Avoid" phrases are counted',()=>{
  const {c,s}=fixture();c.lfData(s).styleGuide='Tone: dark\nAvoid: "orbs", "a beat later"';
  const r=c.lfChapterCheck(s,words(90)+' It was a testament to her will. A tapestry of light. Her orbs glowed. A beat later he delved deeper.');
  const x=r.items.find(i=>i.title==='Cụm sáo rỗng / cụm cần tránh');assert.ok(x);for(const k of['testament to ×1','tapestry ×1','delve ×1','orbs ×1','a beat later ×1'])assert.ok(x.detail.includes(k),k)});
test('repeated sentence openings, repeated phrases and misspelled glossary names are reported',()=>{
  const {c,s}=fixture();c.lfData(s).glossary.push({id:'g',term:'Skyreach',kind:'Địa danh'},{id:'h',term:'Hope',kind:'Thuật ngữ khác'});
  const body=words(60)+' She ran. She jumped. She fell. The silver gate opened. The silver gate closed. The silver gate shone. The silver gate broke. They reached SkyReach and skyreach. We have hope.';
  const r=c.lfChapterCheck(s,body),t=titles(r);
  assert.ok(t.includes('warn:Lặp cách mở câu'));assert.ok(t.includes('warn:Lặp cụm từ'));
  const g=r.items.find(i=>i.title.startsWith('Viết sai tên riêng'));assert.match(g.detail,/SkyReach ×2 \(đúng: Skyreach\)/);assert.doesNotMatch(g.detail,/hope/)});
test('ChatGPT chapter review stores a verdict without touching the body and goes stale after edits',()=>{
  const {c,s}=fixture();const ch={id:'ch1',seriesId:s.id,title:'Chapter 1',body:'Mira opened the gate.',status:'review',bodyRevision:2,chapterNumber:1};c.db.content.push(ch);
  const p=c.lfTaskPrompt(s,'REVIEW_CHAPTER',{chapterId:'ch1'});assert.match(p,/Mira opened the gate/);assert.match(p,/contradictions/);
  const review={verdict:'revise',hook:{score:2,note:'Mở chậm'},ending:{score:4,note:'Tốt'},planCoverage:'Đủ',contradictions:[{issue:'Mira đã mất chìa khóa ở chương trước',evidence:'Mira opened the gate.'}],styleIssues:[],summaryVi:'Cần sửa phần mở.'};
  const j={seriesId:s.id,storyTask:'REVIEW_CHAPTER',scope:{chapterId:'ch1'},inputSignature:c.lfHash(c.lfTaskInput(s,'REVIEW_CHAPTER',{chapterId:'ch1'})),targetSignature:c.lfHash(null)};
  c.lfApplyTask(j,JSON.stringify(review));
  assert.equal(ch.body,'Mira opened the gate.');assert.equal(ch.status,'review');assert.equal(ch.aiReview.value.verdict,'revise');assert.equal(c.lfAIReviewFresh(ch),true);
  ch.bodyRevision=3;assert.equal(c.lfAIReviewFresh(ch),false)});
test('malformed chapter review is rejected',()=>{
  const {c,s}=fixture();assert.throws(()=>c.lfValidateOutput(s,'REVIEW_CHAPTER',{verdict:'maybe'}),/verdict/);
  assert.throws(()=>c.lfValidateOutput(s,'REVIEW_CHAPTER',{verdict:'ok',hook:{score:9,note:''},ending:{score:3,note:''},planCoverage:'x',contradictions:[],styleIssues:[],summaryVi:'x'}),/hook/)});
