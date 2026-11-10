"""Re-extract one approved official HTML source from cached bytes, preserving tab scope.
No network download and no freshening of source verification dates.
"""
import argparse,hashlib,json,re,datetime
from pathlib import Path
from crawl import Crawler,official,audit_safe_result
from ingest import academic_years,clean,split_text
ROOT=Path(__file__).resolve().parents[2]
def main():
 p=argparse.ArgumentParser();p.add_argument('--cache',required=True);p.add_argument('--url',required=True);p.add_argument('--apply',action='store_true');a=p.parse_args()
 if not official(a.url):raise ValueError('Official UAEU source required')
 c=Crawler(a.cache,1);row=c.db.execute('SELECT result,state FROM urls WHERE url=?',(a.url,)).fetchone()
 if not row or row['state']!='fetched':raise ValueError('Previously fetched source required')
 old=json.loads(row['result'])
 if old.get('kind')!='html':raise ValueError('This repair handles HTML only')
 cache=Path(a.cache);raw=(cache/'bodies'/old['bodyFile']).read_bytes();digest=hashlib.sha256(raw).hexdigest()
 if digest!=old['sha256']:raise ValueError('Original source byte checksum mismatch')
 updated={**old,**c.extract(raw,old.get('finalUrl',a.url),old.get('contentType','text/html'))};updated=audit_safe_result(updated)
 if updated['state']!='fetched' or updated.get('soft404'):raise ValueError('Source not approved after re-extraction')
 manifestPath=ROOT/'data/corpus/manifest.json';manifest=json.loads(manifestPath.read_text());doc=next((d for d in manifest['documents'] if d['sourceUrl']==a.url),None)
 if not doc:raise ValueError('An existing approved document is required; run ordinary ingestion for new sources')
 target=ROOT/'data/knowledge'/doc['filename'];before=target.read_text();m=re.match(r'^---\s*\n([\s\S]*?)\n---\s*\n',before)
 if not m:raise ValueError('Invalid approved front matter')
 years=sorted({year for s in updated['sections'] for year in academic_years(s['heading']+' '+s['text'][:1200])})
 sections=[]
 for s in updated['sections']:
  heading=clean(s['heading']);body=clean(s['text'])
  if re.search(r'(?:^| > )عفوا$|cookie|subscribe|accessibility menu|website feedback',heading,re.I):continue
  if not body and not re.search(r'credit|hour|req\.|ساع',heading,re.I):continue
  own=academic_years(heading+' '+body[:1200])
  for index,part in enumerate(split_text(body or heading)):
   if own:part='Published academic-year scope: '+' | '.join(own)+'\n'+part
   sections.append({'heading':heading+(f' — continuation {index+1}' if index else ''),'text':part})
 front=m[1]
 for key,value in [('catalogYear',' | '.join(years) or 'not stated'),('temporalStatus','dated-publication' if years else doc['temporalStatus'])]:
  line=key+': '+json.dumps(value,ensure_ascii=False)
  front=re.sub(r'^'+re.escape(key)+r':.*$',lambda _:line,front,flags=re.M) if re.search(r'^'+re.escape(key)+':',front,re.M) else front+'\n'+line
 after='---\n'+front+'\n---\n# '+doc['title']+'\n\n'+'\n'.join('## '+s['heading']+'\n'+s['text']+'\n' for s in sections)
 report={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'sourceUrl':a.url,'document':doc['filename'],'sourceBodySha256':digest,'sourceFetchedAtPreserved':old.get('fetchedAt'),'sourceVerificationPreserved':old.get('verified'),'oldSections':doc['chunks'],'newSections':len(sections),'oldMarkdownSha256':hashlib.sha256(before.encode()).hexdigest(),'newMarkdownSha256':hashlib.sha256(after.encode()).hexdigest(),'printedYearScopes':years,'method':'Original tab label bound by aria-controls/data-tabs-target to its own printed panel, never to the adjacent panel. Cached official bytes only. No new fact or download date inferred.','applied':a.apply}
 if a.apply:
  backup=cache/'repairs';backup.mkdir(exist_ok=True);key=hashlib.sha256(a.url.encode()).hexdigest()[:20]
  oldMd=backup/(key+'-before-tab-scope.md');oldJson=backup/(key+'-before-tab-scope.json')
  if not oldMd.exists():oldMd.write_text(before)
  if not oldJson.exists():oldJson.write_text(json.dumps(old,ensure_ascii=False,indent=2)+'\n')
  target.write_text(after);doc.update(chunks=len(sections),catalogYear=' | '.join(years) or 'not stated',temporalStatus='dated-publication' if years else doc['temporalStatus']);manifestPath.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
  c.db.execute('UPDATE urls SET result=? WHERE url=?',(json.dumps(updated,ensure_ascii=False),a.url));c.db.commit();c.export()
  out=ROOT/'reports/knowledge-expansion-2026-11-04/fee-tab-scope-repair-v41.json';out.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
 c.db.close();print(json.dumps(report,ensure_ascii=False,indent=2))
if __name__=='__main__':main()
