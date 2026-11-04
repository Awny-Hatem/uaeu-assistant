"""Re-extract cached official bytes after parser improvements; no network."""
import argparse,json
from pathlib import Path
from crawl import Crawler,audit_safe_result
p=argparse.ArgumentParser();p.add_argument('cache');p.add_argument('--html-only',action='store_true');a=p.parse_args();c=Crawler(a.cache,1)
for u,raw in c.db.execute('select url,result from urls where state="fetched"').fetchall():
 d=json.loads(raw)
 if a.html_only and d.get('kind')=='pdf':continue
 b=(Path(a.cache)/'bodies'/d['bodyFile']).read_bytes();d.update(c.extract(b,d.get('finalUrl',u),d.get('contentType','')));
 if d.get('soft404'):d.update(state='soft-404',error='HTTP 200 returned a not-found/error page; excluded from knowledge')
 d=audit_safe_result(d)
 c.db.execute('update urls set state=?,result=? where url=?',(d['state'],json.dumps(d,ensure_ascii=False),u))
c.db.commit();c.export()
