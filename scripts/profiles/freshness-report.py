import json,sqlite3,datetime
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
rows={}
def add(url,date,status,reason):
 if url:rows[url]=(date,status,reason)
db=sqlite3.connect('file:'+str(ROOT/'data/corpus/search.sqlite')+'?mode=ro',uri=True)
for raw, in db.execute('select data from chunks'):
 c=json.loads(raw);u=c.get('url','');date=c.get('verified','unknown')
 if u.endswith('.xml'):add(u,date,'removed from public retrieval','Discovery feed retained internally; readable pages replace its answer citations.')
 elif c.get('temporal')=='historical':add(u,date,'cohort-only / review pending','Historical source retained for matching catalogs; active cohort applicability requires review. Not re-fetched in this change.')
 elif u not in rows:add(u,date,'review pending','Existing indexed source; the old verification date is not a claim of a fresh crawl.')
for p in json.loads((ROOT/'data/academic/programs.json').read_text())['records']:add(p['url'],p['fetchedAt'][:10],'current',p['status']+'; readable title confirmed; current content is not a guarantee of applicant eligibility.')
for p in json.loads((ROOT/'data/academic/study-plans.json').read_text())['plans']:
 add(p['sourceUrl'],p['sourceFetchedAt'][:10],'current container + cohort-only models','Fresh public PDF; numerical validation is per model. Use exact catalog, entry season and track; quarantined models are listed separately.')
for p in json.loads((ROOT/'.profile-source-cache/manifest.json').read_text()):
 if p.get('error'):add(p['url'],'not fetched','review pending',p['error'])
 elif p['url']not in rows:add(p['url'],p['fetchedAt'][:10],'current discovery metadata'if '.xml'in p['url']else 'current','Official bytes re-fetched; SHA-256 retained in the source manifest. Discovery feed is internal only.'if '.xml'in p['url']else 'Official page or document re-fetched for this change.')
lines=['# Source freshness — 17 November 2026','','This inventory distinguishes a fresh download from semantic validation. Existing sources that were not re-fetched remain **review pending**. No claim that the entire UAEU corpus is current is made. The shared SQLite search file was opened read-only; removal below means a runtime public-retrieval/citation exclusion, not erasure of another checkout’s index.','','Current college: College of Computing and Artificial Intelligence, verified at https://www.uaeu.ac.ae/en/cit/. Current Computer and AI Engineering has two concentrations plus a general pathway. Older Computer Engineering plans remain for explicitly matching cohorts.','','## Model validation','','Numeric totals and catalog-code linkage do not prove prerequisite order, category correctness or equivalence approvals. Do not infer absent requirements from a missing row.','', '| Model | Track | Numeric totals | Course links | Issues |','|---|---|---|---|---|']
for p in json.loads((ROOT/'data/academic/study-plans.json').read_text())['plans']:
 v=p['validation'];lines.append('| '+' | '.join([p['id'],str(p.get('track')or'—'),str(v['totalsPass']),str(v['allCatalogLinksVerified']),'; '.join(v['issues'])or'None found by numeric checks'])+' |')
lines+=['','The current CE PDF’s AI Systems table prints CENG510 as 0 credits while the readable program curriculum lists 3. Its extracted degree sum is 127 versus printed 130, so the model remains quarantined. Other mismatches can be extraction defects or publisher inconsistencies and must be visually adjudicated before attribution.','','## Every indexed or newly reviewed source','','| Official URL | Last recorded verification/download | Status | Reason |','|---|---|---|---|']
for u,(d,s,r)in sorted(rows.items()):lines.append('| '+' | '.join(x.replace('|',' / ').replace('\n',' ')for x in [u,d,s,r])+' |')
(ROOT/'sources-freshness.md').write_text('\n'.join(lines)+'\n')
print('Inventoried',len(rows),'URLs; retained explicit review-pending status.')
