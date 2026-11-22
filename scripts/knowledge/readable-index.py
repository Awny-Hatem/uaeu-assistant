import collections, datetime, json, re, sqlite3
from pathlib import Path
root=Path(__file__).resolve().parents[2]
out=root/'reports/knowledge-expansion-2026-11-04';out.mkdir(exist_ok=True)
manifest=json.loads((root/'data/corpus/manifest.json').read_text())
docs=[{**d,'path':'data/knowledge/'+d['filename'],'layer':'crawled'} for d in manifest['documents']]
def front(path):
 text=path.read_text();m=re.match(r'^---\s*\n(.*?)\n---',text,re.S)
 return dict(line.split(':',1) for line in m[1].splitlines() if ':' in line) if m else {}
for p in (root/'data/knowledge').glob('*.md'):
 m={k.strip():v.strip().strip('\"') for k,v in front(p).items()}
 if m.get('status')!='approved':continue
 docs.append({**m,'path':str(p.relative_to(root)),'layer':'curated','subject':m.get('subjects',m.get('subject','reviewed-academic-and-service-evidence')),'language':m.get('language','en; Arabic where included')})
answers=[e for p in (root/'data/verified-answers').glob('*.json') for e in json.loads(p.read_text()).get('entries',[])]
guides=[json.loads(p.read_text()) for p in (root/'data/service-guides').glob('*.json')]
aliases=json.loads((root/'data/corpus/aliases.json').read_text())
indexed=0
if (root/'data/corpus/search.sqlite').exists():
 db=sqlite3.connect('file:'+str(root/'data/corpus/search.sqlite')+'?mode=ro',uri=True);indexed=db.execute('select count(*) from chunks').fetchone()[0];db.close()
counts={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'knowledgeDocuments':len(docs),'crawledDocuments':len(manifest['documents']),'curatedDocuments':len(docs)-len(manifest['documents']),'approvedSections':manifest['chunks'],'indexedSections':indexed,'verifiedAnswers':len(answers),'serviceGuides':len(guides),'aliases':len(aliases),'courseIdentities':len(json.loads((root/'data/corpus/course-identities.json').read_text())['codes'])}
baseline=out/'examiner-start-counts.json'
if not baseline.exists():baseline.write_text(json.dumps(counts,indent=2)+'\n')
previous=out/'progress-counts.json';old=json.loads(previous.read_text()) if previous.exists() else counts
counts['changeSincePreviousSnapshot']={k:counts[k]-old[k] for k in counts if k!='at' and isinstance(counts[k],int) and k in old}
previous.write_text(json.dumps(counts,indent=2)+'\n')
def safe(s):return re.sub(r'[|\n\r]',' ',str(s or 'not specified'))
lines=['# UAEU knowledge index','',f"Updated {counts['at']}. **{len(docs):,} approved knowledge documents**, including {counts['curatedDocuments']} curated and {counts['crawledDocuments']:,} crawled sources. **{indexed:,} indexed sections**; {len(answers)} reviewed answers; {len(guides)} guided workflows; {len(aliases):,} entity alias records.",'','Use the readable titles below to open source files in VS Code. Stable hash filenames prevent name collisions; they do not hide the document title. This navigation index is not itself chatbot evidence. Verification dates confirm access, not policy effective dates.','']
for category in sorted({d.get('subject','unclassified') for d in docs}):
 group=[d for d in docs if d.get('subject','unclassified')==category]
 lines += ['## '+category+f' ({len(group):,})','','| Title | College / program | Language | Layer | Official UAEU source | File |','|---|---|---|---|---|---|']
 for d in sorted(group,key=lambda d:d.get('title','').casefold()):
  path=Path(d['path']).relative_to('data/knowledge')
  lines.append('| '+safe(d.get('title'))+' | '+safe(' / '.join(filter(None,[d.get('college'),d.get('program')])))+' | '+safe(d.get('language'))+' | '+d['layer']+' | [Official source]('+d['sourceUrl']+') | [Open document]('+str(path)+') |')
 lines.append('')
lines+=['## Reviewed evidence packs','', '| Entry | Category | Official sources | File |','|---|---|---|---|']
for file in sorted((root/'data/verified-answers').glob('*.json')):
 for entry in json.loads(file.read_text()).get('entries',[]):
  sources=', '.join('[Source]('+c['url']+')' for c in entry['citations'] if c.get('url'))
  lines.append('| '+safe(entry['id'])+' | '+safe(entry['category'])+' | '+sources+' | [Open pack](../verified-answers/'+file.name+') |')
lines+=['','## Guided procedures','', '| Workflow | Audience | Official source | File |','|---|---|---|---|']
for file in sorted((root/'data/service-guides').glob('*.json')):
 guide=json.loads(file.read_text());lines.append('| '+safe(guide['title'])+' | '+safe(', '.join(guide['audience']))+' | [Source]('+guide['officialUrl']+') | [Open guide](../service-guides/'+file.name+') |')
lines+=['','## Retrieval metadata','', '[Entity aliases](../corpus/aliases.json) · [Course-code identities](../course-code-identities.json) · [Approved source manifest](../corpus/manifest.json)','']
(root/'data/knowledge/INDEX.md').write_text('\n'.join(lines)+'\n')
coverage=json.loads((out/'coverage.json').read_text())
gaps=[d for d in coverage if d['status'] in ('partial','missing')]
(out/'coverage-gaps.json').write_text(json.dumps(gaps,ensure_ascii=False,indent=2)+'\n')
lines=['# Every partial or missing source / field','',f'{len(gaps):,} records from the current coverage map. A missing source is not proof that UAEU has no published information. Link-only/excluded pages are separately identified by their reason, not silently counted as completed sources.','']
for status in ('partial','missing'):
 group=[d for d in gaps if d['status']==status];lines+=['## '+status+f' ({len(group):,})','','| Topic | Official source | Reason |','|---|---|---|']
 for d in group:lines.append('| '+safe(d.get('topic'))+' | [Source]('+d['url']+') | '+safe(d.get('reason'))+' |')
 lines.append('')
(out/'coverage-gaps.md').write_text('\n'.join(lines)+'\n')
print(json.dumps(counts))
