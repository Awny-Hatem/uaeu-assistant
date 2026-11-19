"""Create a readable official-program/source map from the audited crawl cache.

This navigational file is not ingested as answer evidence. Missing links stay
missing; English/Arabic names come from the official programme feed.
"""
import argparse, collections, datetime, json, re, sqlite3
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
p=argparse.ArgumentParser();p.add_argument('--cache',required=True);a=p.parse_args()
c=sqlite3.connect(Path(a.cache)/'crawl.sqlite')
rows={u:(state,json.loads(raw) if raw else {}) for u,state,raw in c.execute('SELECT url,state,result FROM urls')}
feed='https://www.uaeu.ac.ae/en/catalog/summary/search.xml'
records=rows.get(feed,('',{}))[1].get('programRecords',[])
if not records:raise SystemExit('An actually fetched official programme feed is required')
escape=lambda text:re.sub(r'[|\n\r]',' ',str(text or ''))
state=lambda url:rows.get(url,('not discovered',{}))[0]
lines=['# UAEU official source map','',
       'Generated '+datetime.datetime.now(datetime.timezone.utc).isoformat()+'. This is a source-discovery map, not a claim of complete extraction, current intake or approval for a particular student.','',
       f'Programme identities: [official UAEU English/Arabic programme feed]({feed}). Its {len(records)} records include separate full degrees, accelerated options, minors, microcredentials and general education. Labels are preserved as published.','',
       'Qualifications: '+', '.join(f'{key}: {value}' for key,value in sorted(collections.Counter(r['qualification'] for r in records).items()))+'.','']
for college in sorted(set(r.get('COLLEGE_NAME') or 'College not stated' for r in records)):
 lines+=['## '+college,'']
 for qual in sorted(set(r['qualification'] for r in records if (r.get('COLLEGE_NAME') or 'College not stated')==college)):
  lines+=['### '+qual,'','| Programme | Official Arabic label | Programme source / crawl state | Official study-plan link / crawl state |','|---|---|---|---|']
  for r in records:
   if (r.get('COLLEGE_NAME') or 'College not stated')!=college or r['qualification']!=qual:continue
   url=r['url'];plan=r.get('STUDYPLAN_URL')
   lines.append('| '+escape(r['program'])+' | '+escape(r.get('TITLE_AR'))+f' | [UAEU]({url}) — {state(url)} | '+(f'[Study plan]({plan}) — {state(plan)}' if plan else 'No study-plan URL in this feed record')+' |')
  lines+=['']
groups=[('Catalog archives and course catalogs',r'prev_catalog|course.?catalog|(?:under)?graduate.*catalog|catalog.*(?:20\d{2})'),
        ('Course descriptions and prerequisite records',r'/catalog/courses/'),
        ('Admissions, tuition, scholarships and payments',r'admission|scholarship|student_account|tuition|financial.aid'),
        ('Calendar, registration and academic policies',r'calendar|academic.dates|polic|registr|probation|grievance|transcript'),
        ('Student services, campus facilities and contacts',r'campus_life|library|housing|residential|transport|counsel|disabil|career|health|contact|university.leadership|/research/centers/')]
for title,pattern in groups:
 lines+=['## '+title,'','Every matching discovered official URL is listed with its actual crawl disposition; a blocked or reference-only link is not verified answer evidence.','', '| Official page / document | State |','|---|---|']
 for url,(s,d) in sorted(rows.items()):
  if not re.search(pattern,url,re.I):continue
  label=escape(d.get('title') or d.get('label') or url)
  lines.append(f'| [{label}]({url}) | {s} |')
 lines+=['']
dest=ROOT/'uaeu_source_map.md';dest.write_text('\n'.join(lines)+'\n')
print(json.dumps({'file':str(dest),'feedRecords':len(records),'discoveredUrls':len(rows),'characters':dest.stat().st_size}))
