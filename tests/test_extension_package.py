import hashlib,json,unittest,zipfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
class ExtensionPackage(unittest.TestCase):
 def test_single_folder_and_exact_source(self):
  version=json.loads((ROOT/'extension/manifest.json').read_text())['version']
  with zipfile.ZipFile(ROOT/f'dist/downloads/Xuong_ChatGPT_Bridge_v{version}.zip') as z:
   roots={n.split('/')[0] for n in z.namelist()}
   self.assertEqual(roots,{'Xuong_ChatGPT_Bridge'})
   for path in (ROOT/'extension').iterdir():
    if path.is_file():self.assertEqual(z.read('Xuong_ChatGPT_Bridge/'+path.name),path.read_bytes())
   self.assertEqual(json.loads(z.read('Xuong_ChatGPT_Bridge/manifest.json'))['version'],version)
 def test_release_metadata_matches_download(self):
  info=json.loads((ROOT/'dist/downloads/bridge-release.json').read_text())
  raw=(ROOT/'dist/downloads'/info['filename']).read_bytes()
  self.assertEqual(info['sha256'],hashlib.sha256(raw).hexdigest())
  self.assertEqual(info['version'],json.loads((ROOT/'extension/manifest.json').read_text())['version'])
  self.assertIn(info['filename'],(ROOT/'dist/downloads/index.html').read_text())
 def test_download_page_explains_updating_in_place(self):
  page=(ROOT/'dist/downloads/index.html').read_text()
  for text in ['manifest.json','Tải lại','ghi đè','Xuong_ChatGPT_Bridge']:
   self.assertIn(text,page)
if __name__=='__main__':unittest.main()
