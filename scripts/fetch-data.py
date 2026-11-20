"""Maintainer-only download. Never run by the installed application."""
import json, subprocess, concurrent.futures, pathlib, hashlib, datetime
root=pathlib.Path(__file__).resolve().parent.parent

def get(url):
 return json.loads(subprocess.check_output(["curl","--retry","3","-LfsS",url],timeout=90))
def write(name,data):
 p=root/'data'/name;p.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n');return hashlib.sha256(p.read_bytes()).hexdigest()
ar=get('https://quran-json.risanb.com/text/uthmani/quran.json')
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
 chapters=list(pool.map(lambda n:get(f'https://equran.id/api/v2/surat/{n}')['data'],range(1,115)))
meta=[dict(id=s['nomor'],name=s['namaLatin'],arabic=s['nama'],meaning=s['arti'],count=s['jumlahAyat'],place=s['tempatTurun']) for s in chapters]
translations=[dict(id=s['nomor'],verses=[dict(id=v['nomorAyat'],text=v['teksIndonesia']) for v in s['ayat']]) for s in chapters]
hashes={name:write(name,d) for name,d in [('quran-uthmani.json',ar),('terjemahan-kemenag.json',translations),('surah-meta.json',meta)]}
write('provenance.json',dict(retrieved=datetime.datetime.now(datetime.timezone.utc).isoformat(),arabicSource='https://quran-json.risanb.com/text/uthmani/quran.json',arabicUpstream='https://tanzil.net',translationSource='https://equran.id/api/v2/surat/{1-114}',translationClaim='Kemenag via EQuran.id; edition not independently confirmed',translationLicense='Redistribution permission not independently confirmed; review before public release',manualReview='Pending: 50 verses and mandatory popular passages against official print/source',sha256=hashes))
print('Downloaded 114 chapters, local data written.')
