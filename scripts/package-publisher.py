"""Build the downloadable Xưởng Webnovel Publisher package from extension-publisher/ (stdlib only)."""
import hashlib,json,re,zipfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
source=ROOT/'extension-publisher'; output=ROOT/'dist/downloads'; output.mkdir(parents=True,exist_ok=True)
version=json.loads((source/'manifest.json').read_text(encoding='utf-8'))['version']
folder='Xuong_Webnovel_Publisher'; filename=f'{folder}_v{version}.zip'
for old in output.glob(folder+'_v*.zip'):
 if old.name!=filename: old.unlink()
files=sorted(source.iterdir())
if any(not f.is_file() for f in files):raise SystemExit('extension-publisher/ must only contain release files')
with zipfile.ZipFile(output/filename,'w',zipfile.ZIP_DEFLATED) as archive:
 for file in files:
  entry=zipfile.ZipInfo(folder+'/'+file.name,date_time=(2020,1,1,0,0,0));entry.compress_type=zipfile.ZIP_DEFLATED;entry.external_attr=0o100644<<16
  archive.writestr(entry,file.read_bytes())
sha=hashlib.sha256((output/filename).read_bytes()).hexdigest()
info={'version':version,'filename':filename,'folder':folder,'sha256':sha,'files':[f.name for f in files]}
(output/'publisher-release.json').write_text(json.dumps(info,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
ui=ROOT/'dist/studio-ui.js';s=ui.read_text(encoding='utf-8')
s=re.sub(r'/downloads/Xuong_Webnovel_Publisher_v[^"?\']+\.zip(?:\?sha=[0-9a-f]+)?',f'/downloads/{filename}?sha={sha[:16]}',s)
ui.write_text(s,encoding='utf-8')
print(json.dumps(info,ensure_ascii=False))
