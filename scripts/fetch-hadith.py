"""Maintainer-only: pin upstream corpus verbatim for offline use."""
import pathlib,json,subprocess,hashlib,concurrent.futures,datetime
root=pathlib.Path(__file__).resolve().parent.parent/'data'/'hadith';root.mkdir(exist_ok=True)
commit='8e15b4f9e7585822426a0d470e8dfec27e2a1707'
names={'bukhari':'Bukhari','muslim':'Muslim','abu-daud':'Abu Daud','tirmidzi':'Tirmidzi','nasai':'Nasai','ibnu-majah':'Ibnu Majah','ahmad':'Ahmad','darimi':'Darimi','malik':'Malik'}
def fetch(item):
 key,name=item;url=f'https://raw.githubusercontent.com/gadingnst/hadith-api/{commit}/books/{key}.json'
 raw=subprocess.check_output(['curl','--retry','3','-LfsS',url],timeout=240);data=json.loads(raw);(root/(key+'.json')).write_bytes(raw)
 return dict(id=key,name=name,count=len(data),first=min(v['number'] for v in data),last=max(v['number'] for v in data),sha256=hashlib.sha256(raw).hexdigest(),source=url)
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:books=list(pool.map(fetch,names.items()))
manifest=dict(schemaVersion=1,source='https://github.com/gadingnst/hadith-api',commit=commit,retrieved=datetime.datetime.now(datetime.timezone.utc).isoformat(),upstreamClaim='tafsirq.com',license='MIT (repository); upstream translation rights and scholarly verification not independently confirmed',books=books)
(root/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
license=subprocess.check_output(['curl','-LfsS',f'https://raw.githubusercontent.com/gadingnst/hadith-api/{commit}/LICENSE']);(root/'LICENSE').write_bytes(license)
print('Downloaded',len(books),'books;',sum(b['count'] for b in books),'hadith, unchanged.')
