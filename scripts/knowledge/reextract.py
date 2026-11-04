"""Re-extract cached official bytes after parser improvements; no network."""
import argparse,json
from pathlib import Path
from crawl import Crawler
p=argparse.ArgumentParser();p.add_argument('cache');a=p.parse_args();c=Crawler(a.cache,1)
for u,raw in c.db.execute('select url,result from urls where state="fetched"').fetchall():
 d=json.loads(raw);b=(Path(a.cache)/'bodies'/d['bodyFile']).read_bytes();d.update(c.extract(b,d.get('finalUrl',u),d.get('contentType','')));c.db.execute('update urls set result=? where url=?',(json.dumps(d,ensure_ascii=False),u))
c.db.commit();c.export()
