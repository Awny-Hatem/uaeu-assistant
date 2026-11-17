"""Derive course rules by catalog year from existing official PDF excerpts; no new claims."""
import json,sqlite3,re
from pathlib import Path
R=Path(__file__).resolve().parents[2]
plans=json.loads((R/'data/academic/study-plans.json').read_text())['plans']
codes={x for p in plans for t in p['terms']for c in t['courses']for x in ([c['code']]if c['code']else c['options'])}
versions={}
db=sqlite3.connect('file:'+str(R/'data/corpus/search.sqlite')+'?mode=ro',uri=True)
for raw, in db.execute("select data from chunks where json_extract(data,'$.courseCode') is not null and json_extract(data,'$.url') like '%.pdf'"):
 c=json.loads(raw);code=c.get('courseCode');u=c.get('url','');year=re.search(r'(20\d{2})[-_](20\d{2})\.pdf',u)
 if code not in codes or not year or 'course'in u.lower():
  if code not in codes or not year or 'course'not in u.lower():continue
 catalog=year[1]+'/'+year[2];pg=re.search(r'Source PDF page:\s*(\d+)',c['text']);record={'code':code,'title':c['title'],'url':u+('#page='+pg[1]if pg else''),'text':c['text'],'sourceVerified':c.get('verified','2026-11-04'),'historical':True,'catalogYear':catalog,'years':[year[1]+'-'+year[2]]}
 # The old index occasionally included the next course header in one excerpt.
 text=record['text'];boundary=next((m.start()for m in re.finditer(r'(?m)^([A-Z]{2,6})\s+(\d{3,4})\s*[-–]\s+[^\n]+$',text)if m[1]+m[2]!=code),None)
 if boundary is not None:record['text']=text[:boundary].rstrip();record['boundaryTrimmed']=True
 old=versions.setdefault(code,{}).get(catalog)
 if old is None or len(record['text'])>len(old['text']):versions[code][catalog]=record
(R/'data/academic/course-versions.json').write_text(json.dumps({'schemaVersion':1,'provenance':'Derived from previously indexed official UAEU course catalog PDF excerpts; source verification dates retained.','records':versions},ensure_ascii=False,indent=2)+'\n')
print('Catalog-version records:',sum(map(len,versions.values())),'for',len(versions),'plan course codes')
