"""Fetch only named official public UAEU sources; keep originals outside Git."""
import concurrent.futures,datetime,hashlib,json,re,urllib.request,sys
from pathlib import Path
from urllib.parse import urlparse
from lxml import html
import pdfplumber
ROOT=Path(__file__).resolve().parents[2]
cache=ROOT/'.profile-source-cache';cache.mkdir(exist_ok=True)
sources={
 'ce-plan':'https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_computer_and_artificial_intelligence_engineering_study_plan.pdf',
 'ce-program':'https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-computer-and-artificial-intelligence-engineering.shtml',
 'program-feed':'https://www.uaeu.ac.ae/en/catalog/summary/search.xml',
 'it-program':'https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-information-technology.shtml',
 'ai-minor':'https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/minor-in-artificial-intelligence.shtml',
 'it-plan':'https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_information_technology_study_plan.pdf',
 'cs-plan':'https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_computer_science_study_plan.pdf',
 'mechanical-plan':'https://www.uaeu.ac.ae/en/eng/pdf/coe_bsc_mechanical_engineering_study_plan.pdf',
 'chemical-plan':'https://www.uaeu.ac.ae/en/eng/pdf/coe_bsc_chemical_engineering_study_plan.pdf',
 'economics-plan':'https://www.uaeu.ac.ae/en/cbe/pdf/cbe_bsc_economics_study_plan.pdf',
 'economics-program':'https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-economics.shtml',
 'itm-program':'https://uaeu.ac.ae/en/cit/programs/graduate/master-of-science-in-information-technology-management.shtml',
 'ccai-college':'https://www.uaeu.ac.ae/en/cit/',
 'program-directory':'https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/',
}
def official(url):
 u=urlparse(url);return u.scheme=='https' and (u.hostname=='uaeu.ac.ae' or u.hostname.endswith('.uaeu.ac.ae'))
def fetch(item):
 name,url=item;assert official(url)
 try:
  req=urllib.request.Request(url,headers={'User-Agent':'UAEU Assistant academic source review'})
  with urllib.request.urlopen(req,timeout=35) as r:
   final=r.url;assert official(final);raw=r.read(20_000_001);assert len(raw)<20_000_000
  suffix='.pdf' if raw.startswith(b'%PDF') else '.html';file=cache/(name+suffix);file.write_bytes(raw)
  row={'id':name,'url':url,'resolvedUrl':final,'fetchedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw)}
  if suffix=='.pdf':
   with pdfplumber.open(file) as pdf:
    pages=[{'number':i+1,'width':p.width,'height':p.height,'text':p.extract_text(layout=True),'words':p.extract_words(x_tolerance=2,y_tolerance=2)}for i,p in enumerate(pdf.pages)]
   (cache/(name+'.pages.json')).write_text(json.dumps(pages,ensure_ascii=False));row['pages']=len(pages)
  else:
   doc=html.fromstring(raw);row['links']=[{'title':' '.join(a.text_content().split()),'href':a.get('href')}for a in doc.xpath('//a[@href]') if re.search('plan|computer|engineering|graduate|\.pdf',a.get('href','')+' '+a.text_content(),re.I)]
   for e in doc.xpath('//script|//style|//nav|//header|//footer'):e.drop_tree()
   (cache/(name+'.txt')).write_text(' '.join(doc.text_content().split()))
  return row
 except Exception as e:return {'id':name,'url':url,'error':str(e)}
rows=list(concurrent.futures.ThreadPoolExecutor(max_workers=4).map(fetch,[(k,v)for k,v in sources.items()if len(sys.argv)==1 or k in sys.argv[1:]]))
previous={x['id']:x for x in json.loads((cache/'manifest.json').read_text())}if (cache/'manifest.json').exists()else {};previous.update({x['id']:x for x in rows});(cache/'manifest.json').write_text(json.dumps(list(previous.values()),ensure_ascii=False,indent=2)+'\n')
print(json.dumps([{k:v for k,v in r.items()if k!='links'}for r in rows],indent=2))
