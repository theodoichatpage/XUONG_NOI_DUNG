const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function runtime(printProjects=[],assets=[],workflows=[]){
  const src=fs.readFileSync('dist/studio-ui.js','utf8'),store={};
  const c=vm.createContext({db:{series:[],channels:[],content:[],printProjects,assets,workflows,metrics:[],aiJobs:[]},Date,structuredClone,
    today:()=> '2026-10-30',loadError:false,choose:async()=>null,input:()=>'',uiConfirm:async()=>true,toast:m=>c.toasted=m,validate:()=>{},save:()=>true,
    esc:s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[ch]),
    localStorage:{getItem:k=>store[k]??null,setItem:(k,v)=>store[k]=String(v)},uid:()=> 'id'+(++c.n),n:0,$:()=>null,location:{hash:'#prints'},
    safeLink:(u,l)=>`<a href="${u}">${l}</a>`,uiPublishing:()=> '<section class="u-publishing"></section>'});
  vm.runInContext(src.slice(0,src.indexOf('const uiBaseChoose=')),c);
  c.uiRender=()=>{};
  return c}
const state=c=>vm.runInContext('uiState',c);
test('no product set yet: full workspace with editable direction instead of a blank start card',()=>{
  const c=runtime(),html=c.uiPrint();
  assert.doesNotMatch(html,/Bắt đầu bộ sản phẩm đầu tiên/);
  for(const part of['Bộ sản phẩm của tôi','Tạo bộ sản phẩm','1. Tìm ý tưởng','2. Tạo thiết kế','3. Chuẩn bị đăng Etsy','Chủ đề / từ khóa','data-ui-newprint-source="Pinterest"','Phong cách thiết kế','data-ui-newprint-field="productType"','data-ui-newprint-field="count"','data-ui-newprint-field="output"','data-ui-action="create-print"','Ý tưởng &amp; mẫu tham khảo','Thiết kế đang sản xuất','Chuẩn bị sản phẩm Etsy'].map(x=>x.replace('&amp;','&')))assert.ok(html.includes(part),part)});
test('creating from the inline direction saves a real product set and clears the draft',async()=>{
  const c=runtime(),d=c.uiPrintNewDraft();Object.assign(d,{keyword:'Áo chữ tối giản',style:'Ít màu',productType:'Poster',count:16,output:'PNG',sources:['Etsy']});
  await c.uiCreatePrint();
  const p=c.db.printProjects[0];
  assert.deepEqual({k:p.keyword,s:p.style,t:p.productType,n:p.count,o:p.output,src:[...p.sources],refs:p.references.length},{k:'Áo chữ tối giản',s:'Ít màu',t:'Poster',n:16,o:'PNG',src:['Etsy'],refs:0});
  assert.equal(state(c).print,p.id);assert.deepEqual({...state(c).newPrint},{})});
test('empty keyword is rejected without touching data',async()=>{
  const c=runtime();await assert.rejects(c.uiCreatePrint(),/Nhập chủ đề/);assert.equal(c.db.printProjects.length,0)});
test('selected set shows real references, design approval states and Etsy checklist',()=>{
  const p={id:'p1',title:'Áo chữ tối giản',keyword:'sách',productType:'Áo thun',count:12,output:'PNG nền trong',sources:['Pinterest'],references:[{id:'r1',title:'Tee',link:'https://www.pinterest.com/pin/1',source:'www.pinterest.com',selected:true},{id:'r2',title:'Idea'}]};
  const assets=[{id:'a1',printProjectId:'p1',title:'A',approval:'draft',data:'data:image/png;base64,AA=='},{id:'a2',printProjectId:'p1',title:'B',approval:'approved',data:'data:image/png;base64,AA=='}];
  const c=runtime([p],assets,[]),html=c.uiPrint();
  for(const part of['Áo chữ tối giản','Pinterest · Tham khảo','Ý tưởng mới','pr-ref selected','data-ui-ref-select="r1"','2/12 thiết kế đã tạo · 1 thiết kế đã duyệt','Chờ duyệt','Đã duyệt','1 ảnh đã duyệt','Chưa thiết lập','Tự động hóa: Chờ tích hợp','2. Tạo thiết kế'])assert.ok(html.includes(part),part);
  assert.match(html,/class="active"><b>2<\/b>2\. Tạo thiết kế/);
  assert.equal(c.uiPrintStatus(p),'2/12 thiết kế · Đang sản xuất')});
test('library status covers not started, waiting review and approved sets',()=>{
  const c=runtime();
  assert.equal(c.uiPrintStatus({id:'x',count:2,references:[]}),'Chưa triển khai');
  c.db.assets.push({id:'a',printProjectId:'y',approval:'draft',data:'d'},{id:'b',printProjectId:'y',approval:'approved',data:'d'});
  assert.equal(c.uiPrintStatus({id:'y',count:2,references:[]}),'Chờ duyệt thiết kế');
  c.db.assets[0].approval='approved';assert.equal(c.uiPrintStatus({id:'y',count:2,references:[]}),'2 thiết kế · Đã duyệt')});
test('index.html loads print styles and a single prints renderer',()=>{
  const html=fs.readFileSync('dist/index.html','utf8');assert.match(html,/print-studio\.css/);
  for(const f of html.match(/src="[^"]+\.js"/g).map(x=>x.slice(5,-1)))if(f!=='studio-ui.js')assert.doesNotMatch(fs.readFileSync('dist/'+f,'utf8'),/prints:\s*uiPrint/,f)});
