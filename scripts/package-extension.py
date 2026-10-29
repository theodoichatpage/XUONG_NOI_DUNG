"""Build the sole downloadable Bridge package from extension/ (stdlib only)."""
import hashlib,html,json,zipfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
source=ROOT/'extension'; output=ROOT/'dist/downloads'; output.mkdir(parents=True,exist_ok=True)
version=json.loads((source/'manifest.json').read_text())['version']
folder='Xuong_ChatGPT_Bridge'; filename=f'{folder}_v{version}.zip'
files=sorted(source.iterdir())
if any(not f.is_file() for f in files):raise SystemExit('extension/ must only contain release files')
with zipfile.ZipFile(output/filename,'w',zipfile.ZIP_DEFLATED) as archive:
 for file in files:
  entry=zipfile.ZipInfo(folder+'/'+file.name,date_time=(2020,1,1,0,0,0));entry.compress_type=zipfile.ZIP_DEFLATED;entry.external_attr=0o100644<<16
  archive.writestr(entry,file.read_bytes())
sha=hashlib.sha256((output/filename).read_bytes()).hexdigest()
info={'version':version,'filename':filename,'folder':folder,'sha256':sha,'packagingRevision':2,'files':[f.name for f in files]}
(output/'bridge-release.json').write_text(json.dumps(info,ensure_ascii=False,indent=2)+'\n')
(output/'index.html').write_text(f'''<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Tải Xưởng ChatGPT Bridge</title><style>body{{font:16px/1.6 Arial;margin:40px auto;padding:0 20px;max-width:760px;color:#173e31;background:#f5f8f6}}h1{{font-size:27px}}a{{color:#087d63}}.download{{display:inline-block;background:#087d63;color:white;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold}}section{{background:white;border:1px solid #bfd8ce;border-radius:10px;padding:20px;margin:20px 0}}code{{word-break:break-word}}li{{margin:8px 0}}</style><a href="/#ai">← Về Xưởng Nội Dung</a><h1>Xưởng ChatGPT Bridge {html.escape(version)}</h1><p>ZIP đã đóng gói trong <strong>một thư mục duy nhất</strong>. Dành cho Chrome/Edge trên máy tính.</p><a class="download" href="{filename}?sha={sha[:16]}" download="{filename}">Tải Bridge {version} — một thư mục</a><p>Tên ZIP: <code>{filename}</code><br>Thư mục bên trong: <code>{folder}/</code></p><section><h2>Cài lần đầu</h2><ol><li>Tải ZIP và giải nén. Toàn bộ file nằm trong thư mục <code>{folder}</code>.</li><li>Đặt thư mục ở một nơi cố định. Mở <code>chrome://extensions</code> hoặc <code>edge://extensions</code>, bật Chế độ nhà phát triển.</li><li>Bấm Tải tiện ích đã giải nén, chọn đúng thư mục <code>{folder}</code> có file <code>manifest.json</code>. Không chọn ZIP hoặc thư mục cha.</li><li>F5 Xưởng và ChatGPT. Mở popup <strong>Xưởng Nội Dung — ChatGPT Bridge</strong>, chọn tab ChatGPT rồi kết nối. Kiểm tra trạng thái xanh trên Xưởng.</li></ol></section><section><h2>Cập nhật bản đã cài</h2><ol><li>Mở trang quản lý extension và kiểm tra thư mục đã cài trước đó.</li><li>Giải nén ZIP mới ra chỗ tạm. Sao chép các file bên trong <code>{folder}</code> vào đúng thư mục đang được extension sử dụng, chọn <strong>ghi đè</strong>. Không lồng thêm một thư mục con.</li><li>Bấm <strong>Tải lại</strong> ở extension đã cài. Không bấm Tải tiện ích đã giải nén lần nữa để tránh tạo hai bản.</li><li>F5 Xưởng và ChatGPT, chọn lại tab nếu cần. Đối chiếu phiên bản trên popup và trang tải.</li></ol><p>Bản này sửa cách đóng gói của phiên bản {version}; giao thức kết nối không thay đổi. Popup “Xưởng Truyện × ChatGPT 1.0.0” thuộc Bridge khác.</p></section><details><summary>Kiểm tra gói</summary><p>SHA-256: <code>{sha}</code></p><p>Hướng dẫn đầy đủ nằm trong <code>{folder}/HUONG_DAN.md</code>.</p></details></html>''')
# Keep the fallback download synchronized with the manifest and bust stale ZIP caches.
p=ROOT/'dist/chatgpt-bridge.js';s=p.read_text()
import re
s=re.sub(r'href="/downloads/Xuong_ChatGPT_Bridge_v[^"?]+\.zip(?:\?[^\"]*)?"',f'href="/downloads/{filename}?sha={sha[:16]}"',s)
s=re.sub(r'download="Xuong_ChatGPT_Bridge_v[^\"]+\.zip"',f'download="{filename}"',s)
p.write_text(s)
print(json.dumps(info,ensure_ascii=False))
