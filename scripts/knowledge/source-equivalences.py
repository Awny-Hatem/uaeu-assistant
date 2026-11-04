import argparse,hashlib,json,re,sqlite3
from pathlib import Path
from urllib.parse import urlsplit,parse_qsl
p=argparse.ArgumentParser();p.add_argument('--cache',required=True);a=p.parse_args();c=sqlite3.connect(Path(a.cache)/'crawl.sqlite');groups={}
for row, in c.execute('select result from urls where state="fetched"'):
 d=json.loads(row);text=re.sub(r'\s+',' ',d.get('text','')).strip()
 if len(text)<1000:continue
 u=d['url'];key=hashlib.sha256(text.encode()).hexdigest()
 # Department pages contain all courses, but different query IDs select different
 # visible cards. They are NOT interchangeable citations for a particular course.
 if '/catalog/courses/' in u:key+=':course:'+dict(parse_qsl(urlsplit(u).query)).get('id','')
 groups.setdefault(key,[]).append({'url':u,'bodySha256':d.get('sha256'),'verified':d.get('verified')})
out=Path(__file__).resolve().parents[2]/'reports/knowledge-expansion-2026-11-04/source-equivalences.json'
out.write_text(json.dumps({'method':'Identical complete normalized official source text. Course cards with different query IDs remain separate. No search-snippet or topic-only equivalence.','groups':[{'normalizedTextSha256':k,'sources':v} for k,v in groups.items() if len(v)>1]},ensure_ascii=False,indent=2)+'\n');print(len(json.loads(out.read_text())['groups']),'verified source equivalence groups')
