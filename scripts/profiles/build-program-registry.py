"""Build readable-source program records from the official directory, validating each HTML target."""
import concurrent.futures,datetime,hashlib,json,re,threading,urllib.request
from pathlib import Path
from urllib.parse import urljoin,urlparse
from lxml import etree,html
ROOT=Path(__file__).resolve().parents[2];cache=ROOT/'.profile-source-cache';dest=cache/'programs';dest.mkdir(exist_ok=True)
feed=etree.fromstring((cache/'program-feed.html').read_bytes(),etree.XMLParser(resolve_entities=False,no_network=True))
stop=threading.Event()
def official(u):return urlparse(u).scheme=='https'and(urlparse(u).hostname=='uaeu.ac.ae'or(urlparse(u).hostname or'').endswith('.uaeu.ac.ae'))
def extract(item):
 v={x.tag:' '.join(''.join(x.itertext()).split())for x in item};url=urljoin('https://www.uaeu.ac.ae/',v.get('URL_CATALOG',''));title=v.get('TITLE','')
 if not title or not official(url):return None
 sid=hashlib.sha256(url.encode()).hexdigest()[:20];file=dest/(sid+'.html');meta=dest/(sid+'.json')
 if not file.exists():
  if stop.is_set():return {'title':title,'url':url,'status':'not-fetched-after-network-failure'}
  try:
   with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'UAEU Assistant academic program review'}),timeout=35)as response:
    assert official(response.url);raw=response.read(3_000_001);assert len(raw)<=3_000_000
   file.write_bytes(raw);meta.write_text(json.dumps({'fetchedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'sha256':hashlib.sha256(raw).hexdigest()}))
  except Exception as e:stop.set();return {'title':title,'url':url,'status':'network-failure','error':str(e)}
 raw=file.read_bytes();metadata=json.loads(meta.read_text());doc=html.fromstring(raw)
 for e in doc.xpath('//script|//style|//nav|//header|//footer'):e.drop_tree()
 headings=doc.xpath('//h1|//h2');heading=next((h for h in headings if ' '.join(h.text_content().split()).lower()==title.lower()),None)
 if heading is None:return {'title':title,'url':url,**metadata,'status':'title-not-verified'}
 # Element ordering keeps source sections and tables adjacent, without menu boilerplate.
 elems=doc.xpath('//h1|//h2|//h3|//h4|//h5|//p|//table');on=False;sections=[];stack=[];tables=[]
 for e in elems:
  if e is heading:on=True
  if not on:continue
  txt=' '.join(e.text_content().split())
  if not txt:continue
  if e.tag[0]=='h':
   level=int(e.tag[1]);stack=[s for s in stack if s[0]<level]+[(level,txt)];sections.append(txt)
  elif e.tag=='table':
   rows=[]
   for row in e.xpath('.//tr'):
    cells=[' '.join(c.text_content().split())for c in row.xpath('./td|./th')];links=[{'title':' '.join(a.text_content().split()),'url':urljoin(url,a.get('href'))}for a in row.xpath('.//a[@href]')if official(urljoin(url,a.get('href')))];
    if cells:rows.append({'cells':cells,'links':links})
   tables.append({'headings':[s[1]for s in stack],'rows':rows});sections.append('\n'.join(' | '.join(r['cells'])for r in rows))
  elif not e.xpath('ancestor::table'):sections.append(txt)
 college=v.get('COLLEGE_NAME','');current='College of Computing and Artificial Intelligence'if college=='College of Information Technology'else college
 qualification='minor'if title.startswith('Minor')else'microcredential'if'Micro-Credential'in title else'accelerated'if'Accelerated'in title else'master'if title.startswith('Master')else'doctorate'if title.startswith(('Doctor of Philosophy','Doctorate','Doctor of Business'))else'bachelor'if title.startswith(('Bachelor','Doctor of Medicine'))else'other'
 return {'id':v.get('PROGRAM_ID'), 'title':title,'titleAr':v.get('TITLE_AR'),'college':current,'collegeSourceValue':college,'collegeNameSource':'https://www.uaeu.ac.ae/en/cit/'if current!=college else url,'department':v.get('DEPARTMENT_NAME'),'qualification':qualification,'level':v.get('LEVEL'),'url':url,'studyPlanUrl':v.get('STUDYPLAN_URL'),**metadata,'status':'verified-readable-page','text':'\n\n'.join(sections),'tables':tables}
rows=list(concurrent.futures.ThreadPoolExecutor(max_workers=4).map(extract,feed.findall('PROGRAM')));rows=[r for r in rows if r]
(ROOT/'data/academic/programs.json').write_text(json.dumps({'schemaVersion':1,'directorySource':'https://www.uaeu.ac.ae/en/catalog/summary/search.xml','collegeNameSource':'https://www.uaeu.ac.ae/en/cit/','records':rows},ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'records':len(rows),'statuses':{s:sum(r['status']==s for r in rows)for s in sorted({r['status']for r in rows})},'errors':[{k:v for k,v in r.items()if k!='text'}for r in rows if r['status']!='verified-readable-page']},indent=2))
