const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const source=fs.readFileSync('dist/story-longform-v2.js','utf8');
function fixture(){const s={id:'book',title:'Ashen Crown',channelId:'wn',chapterLength:1500,storyLanguage:'English'},ctx=vm.createContext({db:{series:[s],content:[],aiJobs:[]},structuredClone,Date,console,uid:()=>'id',findWebnovelChannel:()=>({id:'wn'}),ch:()=>({language:'English'}),save:()=>true,storyFingerprint:v=>JSON.stringify(v)});
  const wb=fs.readFileSync('dist/story-workbench.js','utf8');vm.runInContext(wb.slice(wb.indexOf('function storyFingerprint('),wb.indexOf('function storyMapLocalBook(')),ctx);vm.runInContext(source.slice(0,source.indexOf('const lfBaseOpenEditor')),ctx);return {c:ctx,s}}
const long=(n,ch='x')=>ch.repeat(n);
function bigStory(c,s,{chars=12,charSize=4000,planNames=null}={}){const sd=c.lfData(s);
  sd.characters=Array.from({length:chars},(_,i)=>({id:'c'+i,name:'Hero '+i,role:'r',personality:long(charSize,'p'),goal:long(charSize,'g'),backstory:long(charSize,'b'),reviewVi:{personality:long(charSize,'v')}}));
  sd.plans=[{id:'v1',kind:'volume',title:'Vol',startChapter:1,endChapter:20,order:0,body:long(6000,'o'),reviewVi:long(6000,'v')},{id:'a1',kind:'arc',title:'Arc',startChapter:1,endChapter:10,order:1,body:long(6000,'a'),reviewVi:long(6000,'v')},{id:'p1',kind:'chapter',title:'Ch1',startChapter:1,endChapter:1,order:2,body:'Shen Yan wakes up.',characterNames:planNames||[],reviewVi:'Tiếng Việt'}];
  c.lfPipeline(s).artifacts.bible={value:{title:'T',logline:'L',premise:long(3000,'q'),world:long(8000,'w'),reviewVi:{premise:long(3000,'v')}}}}
test('Vietnamese review copies are never sent to ChatGPT',()=>{const {c,s}=fixture();bigStory(c,s,{chars:2,charSize:200});const text=c.lfContext(s,1,'Write it');assert.doesNotMatch(text,/reviewVi/);assert.doesNotMatch(text,/Tiếng Việt/)});
test('only the characters named in the chapter plan are sent (matched by name)',()=>{const {c,s}=fixture();bigStory(c,s,{chars:5,charSize:100,planNames:['hero 2']});const text=c.lfContext(s,1,'');assert.match(text,/Hero 2/);assert.doesNotMatch(text,/Hero 3/)});
test('a large story is compacted automatically instead of failing',()=>{const {c,s}=fixture();bigStory(c,s,{chars:14,charSize:6000});const text=c.lfContext(s,1,'Write chapter one');assert.ok(text.length<=85000,'within limit: '+text.length);assert.match(text,/Shen Yan wakes up\./,'the current chapter plan is kept in full');assert.match(text,/Hero 13/,'every relevant character still appears')});

test('every chapter prompt carries the hook rules; chapter 1 gets the stricter opening rule',()=>{const {c,s}=fixture();bigStory(c,s,{chars:1,charSize:50});const one=c.lfContext(s,1,''),two=c.lfContext(s,2,'');
  assert.match(one,/QUY TẮC NHỊP ĐỌC/);assert.match(one,/CẤM mở bằng: nhân vật tỉnh dậy/);assert.match(one,/KHÔNG tiết lộ bí mật cốt lõi/);assert.match(one,/Xác nhận muộn/);assert.doesNotMatch(one,/300 chữ đầu phải thấy/);assert.match(one,/CHƯƠNG 1: câu đầu tiên/);assert.match(two,/QUY TẮC NHỊP ĐỌC/);assert.doesNotMatch(two,/CHƯƠNG 1: câu đầu tiên/)});

test('Webnovel listing: prompt asks for the Inkstone fields; limits are enforced',()=>{const {c,s}=fixture();bigStory(c,s,{chars:1,charSize:50});
  const p=c.lfListingPrompt(s,{x:1});for(const x of['JOB: GENERATE_WEBNOVEL_LISTING','bookName tối đa 70 ký tự','abbreviation tối đa 15','coverPrompt','3:4'])assert.ok(p.includes(x),x);
  const ok={bookName:'The Ashen Crown',leadingGender:'male',genre:'Historical',synopsis:'S',tags:['Reincarnation','Reincarnation',' Kingdom Building '],abbreviation:'ASHEN',length:'huge',warning:'',coverPrompt:'c'};
  const v=c.lfValidateListing({...ok});assert.deepEqual([...v.tags],['Reincarnation','Kingdom Building']);assert.equal(v.length,'medium');assert.equal(v.warning,'none');
  assert.throws(()=>c.lfValidateListing({...ok,bookName:'x'.repeat(71)}),/70/);assert.throws(()=>c.lfValidateListing({...ok,abbreviation:'x'.repeat(16)}),/15/);assert.throws(()=>c.lfValidateListing({...ok,leadingGender:'both'}),/male hoặc female/)});
