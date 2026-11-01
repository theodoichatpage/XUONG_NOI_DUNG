const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const PROD='https://xuong-noi-dung-khaki.vercel.app';
const manifest=JSON.parse(fs.readFileSync('extension/manifest.json','utf8'));
test('Bridge content script runs on the production Xưởng domain',()=>{
  const studio=manifest.content_scripts.find(c=>c.js.includes('studio-content.js'));
  assert.ok(studio.matches.includes(PROD+'/*'))});
test('Bridge background accepts messages from the production Xưởng domain',()=>{
  const bg=fs.readFileSync('extension/background.js','utf8');assert.match(bg,new RegExp("STUDIO_ORIGINS=new Set\\(\\[[^\\]]*'"+PROD.replace(/[.]/g,'\\.')+"'"))});
test('web, background and popup expect the same Bridge version as the manifest',()=>{
  const v=manifest.version;
  assert.match(fs.readFileSync('extension/background.js','utf8'),new RegExp("version:'"+v.replace(/\./g,'\\.')+"'"));
  assert.match(fs.readFileSync('extension/popup.html','utf8'),new RegExp('Bridge '+v.replace(/\./g,'\\.')));
  const web=fs.readFileSync('dist/chatgpt-bridge.js','utf8');assert.match(web,new RegExp("r\\.version==='"+v.replace(/\./g,'\\.')+"'"));
  assert.match(web,new RegExp('Xuong_ChatGPT_Bridge_v'+v.replace(/\./g,'\\.')+'\\.zip'))});
