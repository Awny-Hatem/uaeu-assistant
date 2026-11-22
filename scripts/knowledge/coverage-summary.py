"""Summarize crawl reach separately from approved/indexed coverage. Read-only."""
import argparse,collections,json,re,sqlite3
from pathlib import Path
from urllib.parse import urlsplit
ROOT=Path(__file__).resolve().parents[2]
p=argparse.ArgumentParser();p.add_argument('--cache',required=True);a=p.parse_args()
c=sqlite3.connect(Path(a.cache)/'crawl.sqlite');rows=c.execute('select url,state,result from urls').fetchall()
manifest=json.loads((ROOT/'data/corpus/manifest.json').read_text());docs=manifest['documents'];approved={d['sourceUrl']:d for d in docs}
coverage=json.loads((ROOT/'reports/knowledge-expansion-2026-11-04/coverage.json').read_text())
states={url:(state,json.loads(value) if value else {}) for url,state,value in rows}
for record in coverage:
 state,raw=states.get(record['url'],('not discovered',{}));record['sourceDisposition']=state
 record['reason']=record.get('reason','').replace('not published in this source:','not established in the extracted page:').replace('structured source sections indexed; completeness applies only to this page','structured source sections approved; indexing readiness is reported separately')
 if state in ('link-only','excluded'):
  record['coverageClassification']='reference-only-or-excluded'
  if record['status']=='missing':record['reason']=raw.get('reason',record['reason'])
 elif state=='content-alias' or record.get('canonicalUrl',record['url'])!=record['url'] or 'duplicate' in record['reason']:
  record['coverageClassification']='duplicate-or-redirect'
 elif record['status']=='missing':record['coverageClassification']='source-unavailable-or-unusable'
 elif record['reason'].startswith('not established'):record['coverageClassification']='per-page-field-observation'
 elif record['status']=='partial':record['coverageClassification']='extraction-review-required'
 else:record['coverageClassification']='approved-extraction'
(ROOT/'reports/knowledge-expansion-2026-11-04/coverage.json').write_text(json.dumps(coverage,ensure_ascii=False,indent=2)+'\n')
programs={d['topicId']:d for d in docs if d.get('program') and re.search(r'/programs/[^/]+\.shtml$',d['sourceUrl'])}
archives=[]
for url,state,value in rows:
 if not re.search(r'/(?:dvcaa/aau|prev_catalog)/',url) or not url.lower().endswith('.pdf'):continue
 d=json.loads(value) if value else {};front=' '.join(' '.join(page['text'].split()) for page in d.get('pages',[])[:3])
 m=re.search(r'(20\d{2})[_ –-]+(20\d{2})',url)
 if not m or int(m[2])!=int(m[1])+1:continue
 kind='undergraduate' if re.search(r'Undergraduate Programs?|Undergraduate Program Catalog',front,re.I) else 'graduate' if re.search(r'(?<!under)Graduate Programs?|Graduate Program Catalog',front,re.I) else 'course' if re.search(r'Course Catalog',front,re.I) else 'unclassified'
 archives.append({'year':m[1]+'-'+m[2],'kind':kind,'url':url,'state':state,'verified':d.get('verified'),'directApprovedSource':url in approved,'coverEditionObserved':all(y in front for y in [m[1],m[2]])})
index={}
f=ROOT/'data/corpus/search.sqlite'
if f.exists():
 db=sqlite3.connect('file:'+str(f)+'?mode=ro',uri=True);index=dict(db.execute('select key,value from metadata'));index={k:index.get(k) for k in ['fingerprint','generatedAt','model','dimensions','denseEnabled']};index['chunks']=db.execute('select count(*) from chunks').fetchone()[0];db.close()
summary={'date':manifest['verified'],'crawlStates':dict(collections.Counter(state for _,state,_ in rows)),'approvedDocuments':len(docs),'approvedDocumentsByLanguage':dict(collections.Counter(d['language'] for d in docs)),'approvedDocumentsByCategory':dict(collections.Counter(d['subject'] for d in docs)),'approvedChunks':manifest['chunks'],'approvedChunkFingerprint':manifest['chunkFingerprint'],'currentIndex':index,'indexMatchesManifest':index.get('fingerprint')==manifest['chunkFingerprint'],'publishedProgramPages':len(programs),'programPagesByCollege':dict(collections.Counter(d.get('college') or 'not assigned from official source map' for d in programs.values())),'programPagesByQualification':dict(collections.Counter(d.get('qualification') or 'not established' for d in programs.values())),'courseIdentities':len(json.loads((ROOT/'data/corpus/course-identities.json').read_text())['codes']),'coverageStates':dict(collections.Counter(d['status'] for d in coverage)),'archives':sorted(archives,key=lambda d:(d['year'],d['kind'],d['url'])),'limitations':['Discovered, fetched, approved and indexed are separate counts.','An indexed publication is not proof of current intake, effective policy or complete extraction.','A missing/pending/blocked source is not an assertion that UAEU does not publish the information.','Individual research theses, old news/jobs and duplicate viewers remain reference-only/excluded with their reasons.','Program pages include minors, microcredentials and accelerated options, not just full degrees.']}
summary['coverageClassifications']=dict(collections.Counter(d['coverageClassification'] for d in coverage))
summary['limitations'].append('A programme overview need not contain every course prerequisite or model plan; per-page field observations are not proved topic-wide knowledge gaps.')
out=ROOT/'reports/knowledge-expansion-2026-11-04/coverage-summary.json';out.write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
lines=['# UAEU coverage summary','',f"Snapshot date: {summary['date']}. See `coverage_map.md` for every discovered source and `coverage.json` for structured states.",'',f"Approved source documents: {len(docs)}. Approved chunks: {manifest['chunks']}. Program pages: {len(programs)} (including separate qualification types). Observed course identifiers: {summary['courseIdentities']}.",'',f"Index matches approved manifest: {summary['indexMatchesManifest']}. Crawl states: `{json.dumps(summary['crawlStates'])}`.",'','## Catalog years requested','', '| Academic year | Undergraduate | Graduate | Courses |','|---|---|---|---|']
observed_years={s['year'] for s in summary['archives']}
requested_years={f'{year}-{year+1}' for year in range(2015,2027)} | observed_years
for y in sorted(requested_years):
 cells=[]
 for kind in ['undergraduate','graduate','course']:
  sources=[s for s in summary['archives'] if s['year']==y and s['kind']==kind]
  cells.append('<br>'.join(f"[{s['state']}; cover {'observed' if s['coverEditionObserved'] else 'unverified'}]({s['url']})" for s in sources) or 'No verified cover-classified source in this snapshot')
 lines.append('| '+y+' | '+' | '.join(cells)+' |')
lines+=['','## Published program pages by college','', '| College as mapped from official sources | Pages |','|---|---|']
lines += [f'| {college} | {count} |' for college,count in sorted(summary['programPagesByCollege'].items())]
lines+=['','## Limits','']+['- '+v for v in summary['limitations']]
lines+=['','## Coverage record classifications','','| Classification | Records |','|---|---|']+[f'| {kind} | {count} |' for kind,count in sorted(summary['coverageClassifications'].items())]
out.with_suffix('.md').write_text('\n'.join(lines)+'\n');print(json.dumps({k:v for k,v in summary.items() if k not in ['archives','limitations']},ensure_ascii=False))
safe=lambda value:re.sub(r'[|\n\r]',' ',str(value or ''))
maplines=['# UAEU knowledge coverage map','','[Category and catalog-year summary](reports/knowledge-expansion-2026-11-04/coverage-summary.md).','',f"Verified {summary['date']}. {len(docs)} approved crawled source documents; {manifest['chunks']} approved sections. Index matches approved manifest: {summary['indexMatchesManifest']}.",'','Every discovered source is retained below. Approval, indexing, extraction review, unavailable sources and duplicate/reference dispositions are separate. A per-page field observation is not proof that a topic is missing from all UAEU sources.','', '| Topic / source | Category | Language | Last verified | KB | Classification and reason / file |','|---|---|---|---|---|---|']
for record in sorted(coverage,key=lambda d:(d.get('category',''),d.get('topic',''),d['url'])):
 maplines.append('| ['+safe(record.get('topic') or urlsplit(record['url']).path)[:150]+']('+record['url']+') | '+safe(record.get('category'))+' | '+safe(record.get('language','unknown'))+' | '+safe(record.get('verified'))+' | '+record['status']+' | '+record['coverageClassification']+': '+safe(record.get('reason'))+' '+safe(record.get('file'))+' |')
(ROOT/'coverage_map.md').write_text('\n'.join(maplines)+'\n')
