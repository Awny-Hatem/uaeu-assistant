#!/usr/bin/env python3
"""Convert fetched official source sections into versioned, provenance-linked Markdown.
No generative extraction: copied structured source facts, not guessed interpretations.
"""
import argparse, collections, hashlib, json, re, sqlite3, datetime
from pathlib import Path
from urllib.parse import urlsplit, parse_qsl
from pdf_sections import model_plan_sections, catalog_course_sections
from crawl import official, eligible, DYNAMIC

DATE=datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=4))).date().isoformat()
ROOT=Path(__file__).resolve().parents[2]
COLLEGES={'cavm':'College of Agriculture and Veterinary Medicine','cbe':'College of Business and Economics','cedu':'College of Education','eng':'College of Engineering','chss':'College of Humanities and Social Sciences','cit':'College of Information Technology','cmhs':'College of Medicine and Health Sciences','cos':'College of Science','cl':'College of Law','law':'College of Law'}
FAST=re.compile(r'/(news|events|news_events|spotlights|conferences|employment|jobs|vacancies|media-center|media|photo_library|photo|newsletters)/',re.I)
YEARS=re.compile(r'\b((?:19|20)\d{2})\s*[-_/–—]\s*((?:19|20)?\d{2})\b')
COURSE=re.compile(r'\b([A-Z]{3,6})[ -]?(\d{3,4})\b')

def academic_years(text):
    # Approval dates such as 2018/04/2008 are not academic-year ranges.
    years=[]
    for start,end in YEARS.findall(text):
        end=end if len(end)==4 else start[:2]+end
        if int(end)==int(start)+1:years.append(start+'-'+end)
    return sorted(set(years))


def clean(t):
    return re.sub(r'\n{3,}','\n\n',re.sub(r'[ \t]+',' ',t)).strip()


def category(u,t):
    v=u.lower()+' '+t.lower()
    if re.search(r'admission|scholarship|tuition|fee|student_account|sponsor|financial.aid',v):return 'admissions-money'
    if re.search(r'polic|procedur|registr|calendar|conduct|transcript|probation|integrity|grievance',v):return 'registration-policies'
    if re.search(r'campus_life|library|housing|residential|transport|it.services|career|counsel|disabil|student.service|health',v):return 'student-life-services'
    if re.search(r'catalog|program|course|study.plan|accredit|foundation|placement|general.education|graduat',v):return 'academics'
    return 'university-people'


def split_text(text,limit=3300):
    if len(text)<=limit:return [text]
    # Preserve complete source rows/sentences; overlap only the last line as context.
    out=[];buf=[];size=0
    for line in text.splitlines():
        if len(line)>limit:
            sentences=re.split(r'(?<=[.!?؛。])\s+',line)
            if len(sentences)==1:sentences=[line[i:i+limit] for i in range(0,len(line),limit)]
        else:sentences=[line]
        for sentence in sentences:
            if size+len(sentence)>limit and buf:out.append('\n'.join(buf));buf=[];size=0
            buf.append(sentence);size+=len(sentence)+1
    if buf:out.append('\n'.join(buf))
    return out


def main():
    p=argparse.ArgumentParser();p.add_argument('--cache',required=True);p.add_argument('--source-map',default='reports/qa-audit-2026-11-03/uaeu_source_map.md');a=p.parse_args()
    c=sqlite3.connect(Path(a.cache)/'crawl.sqlite');c.row_factory=sqlite3.Row
    records=[json.loads(r['result']) if r['result'] else dict(r) for r in c.execute('select * from urls')]
    old_urls={re.search(r'^sourceUrl:\s*(.*)$',f.read_text(),re.M)[1].strip('"\' ') for f in (ROOT/'data/knowledge').glob('*.md') if re.search(r'^sourceUrl:\s*(.*)$',f.read_text(),re.M)}
    college_map={};plan_programs={};active=''
    existing_text={}
    for f in (ROOT/'data/knowledge').glob('*.md'):
        raw=f.read_text();m=re.search(r'^sourceUrl:\s*(.*)$',raw,re.M)
        if m:existing_text[m[1].strip("\"' ")]=existing_text.get(m[1].strip("\"' "),'')+' '+clean(raw).lower()
    for line in (ROOT/a.source_map).read_text().splitlines():
        if line.startswith('### '):active=line[4:]
        urls=re.findall(r'\]\((https://[^)]+)\)',line)
        for url in urls:
            if '/programs/' in url:college_map[url]=active
        if line.startswith('| ') and urls and '/programs/' in urls[0]:
            for url in urls[1:]:
                if '.pdf' in url:plan_programs[url]={'program':line.split('|')[1].strip(),'college':active}
    course_urls={}
    for r in records:
        if '/catalog/courses/' in r['url']:
            code=dict(parse_qsl(urlsplit(r['url']).query)).get('id','')
            if re.fullmatch(r'[A-Z]{3,6}\d{3,4}',code):course_urls[(r['url'].split('?')[0],code)]=r['url']
    good=[d for d in records if d['state']=='fetched' and d.get('text') and official(d.get('finalUrl',d['url'])) and eligible(d['url']) and not FAST.search(d['url']) and not DYNAMIC.search(d['url'])]
    byurl={d['url']:d for d in good};seen={};documents=[];aliases=[];chunks=[];coverage=[];rejected=[]
    dest=ROOT/'data/knowledge/crawled';dest.mkdir(exist_ok=True)
    for d in sorted(good,key=lambda d:(d['url'] not in old_urls, '/catalog/' not in d['url'],d['url'])):
        u=d.get('finalUrl',d['url']);title=clean(d.get('title') or d.get('label') or urlsplit(u).path)
        text=clean(d['text']);digest=hashlib.sha256(text.encode()).hexdigest()
        if digest in seen:
            coverage.append({'url':d['url'],'status':'partial','canonicalUrl':seen[digest],'reason':'exact extracted-content duplicate; shared canonical evidence','verified':d['verified']});continue
        seen[digest]=u
        if len(text)<100 or '\ufffd' in text[:200] or re.search(r'access denied|403 forbidden|404 not found|page not found',title,re.I):
            rejected.append({'url':u,'reason':'empty/error/encoding quality gate'});continue
        path=urlsplit(u).path; lang='ar' if len(re.findall(r'[\u0600-\u06ff]',text))>len(re.findall(r'[A-Za-z]',text))*0.12 else 'en'
        program=title if '/programs/' in path and re.search(r'Bachelor|Master|Doctor|Minor|Micro.?Credential|Diploma|بكالوريوس|ماجستير|دكتور|دبلوم|فرعي',title,re.I) else ''
        if u in plan_programs:
            program=plan_programs[u]['program'];title=program+' — official model study plan';college=plan_programs[u]['college']
        qual='accelerated' if re.search(r'accelerated|تسريع',program,re.I) else 'minor' if re.search(r'\bMinor\b|فرعي',program,re.I) else 'microcredential' if re.search(r'micro.?credential',program,re.I) else 'diploma' if re.search('diploma|دبلوم',program,re.I) else 'doctorate' if re.search(r'Philosophy|Doctor of (?!Medicine)|دكتوراه',program,re.I) else 'master' if re.search(r'Master|ماجستير',program,re.I) else 'bachelor' if program else ''
        level='' if qual=='accelerated' else 'postgraduate' if qual in ['master','doctorate','diploma','accelerated'] or '/graduate/' in path else 'undergraduate' if qual else ''
        college=plan_programs.get(u,{}).get('college') or college_map.get(d['url'],'') or next((v for k,v in COLLEGES.items() if '/'+k+'/' in path),'')
        years=academic_years(path+' '+title+(' '+text[:700] if d.get('kind')=='pdf' else ''))
        legacy_year=re.search(r'/catalog/auto/(?:degree|major)_[^/]*_((?:19|20)\d{2})\.asp$',path,re.I)
        if legacy_year and not years:years=[legacy_year[1]]
        # Undated web pages are verified today, not silently assigned a catalog year.
        temporal='historical' if re.search(r'prev_catalog|old|archive|legacy|/catalog/auto/',path,re.I) or years and all(int(y[:4])<2025 for y in years) or urlsplit(u).hostname=='webapps.uaeu.ac.ae' else 'undated-current-page'
        topic=re.sub(r'^/(en|ar)/','/',path);topic=re.sub(r'\.(s?html?|aspx?)$','',topic)
        docid=hashlib.sha256(u.encode()).hexdigest()[:20];filename=docid+'.md';subject=category(u,title)
        meta={'title':title,'sourceUrl':u,'status':'approved','language':lang,'lastVerified':d['verified'],'subject':subject,'college':college,'program':program,'qualification':qual,'degreeLevel':level,'catalogYear':' | '.join(years) or 'not stated','temporalStatus':temporal,'audience':'public; exact eligibility as published in sections','topicId':topic,'extraction':d['quality'],'sourceSha256':d['sha256'],'sourceDate':'not inferred from verification date'}
        # Parsed front matter matches the existing one-key-per-line format.
        front='---\n'+'\n'.join(k+': '+str(v).replace('\n',' ') for k,v in meta.items() if v)+'\n---\n'
        content=['# '+title,'','Source applicability: '+temporal+'. Verification date confirms access, not the effective date of every rule. Undated, legacy and cohort facts must retain their labels.','']
        valid=[]
        sections=d.get('sections',[])
        global_scope='\n'.join(v['text'] for v in sections if ' > ' not in v['heading'] and re.search(r'effective from|apply to new students|conditions.*admitted from',v['text'],re.I))[:2400]
        if d.get('kind')=='pdf' and re.search(r'(?:study|model)[_-]?plan',u,re.I):
            structured,warnings=model_plan_sections(Path(a.cache)/'bodies'/d['bodyFile'])
            if structured:sections=structured
            for warning in warnings:rejected.append({'url':u,'reason':warning})
        if '/catalog/courses/' in path:
            grouped=[];course=None
            for part in sections:
                match=re.match(r'^(.+?)\(([A-Z]{3,6})[ -]?(\d{3,4})\)\s*$',part['heading'])
                if match:
                    if course:grouped.append(course)
                    course={'heading':match[2]+match[3]+' '+match[1].strip(),'text':part['text']}
                elif course and not re.search(r'(?:^| > )عفوا$',part['heading']):
                    course['text']+='\n'+part['heading']+'\n'+part['text']
            if course:grouped.append(course)
            sections=grouped
            if not title or title==path:title='UAEU official course catalog — '+path.rsplit('/',1)[-1]
        if d.get('kind')=='pdf' and re.search(r'course.?catalog',u,re.I):
            structured,warnings=catalog_course_sections(d.get('pages',[]))
            if structured:
                cover=next((page for page in d.get('pages',[])[:3] if re.search(r'Course Catalog',page['text'],re.I)),None)
                sections=([{'heading':'Historical course catalog edition and scope','text':cover['text'][:1600],'page':cover['page']}] if cover else [])+structured
            for warning in warnings:rejected.append({'url':u,'reason':warning})
        if program and d.get('kind')=='html':
            labels=[v['heading'] for v in sections if 'Degree Requirements' in v['heading'] and re.search(r'required credit|req\.?\s*(?:ch|credit|[(:0-9])|credit hours',v['heading'],re.I)]
            if labels:sections=[{'heading':program+' — published degree credit breakdown','text':'Published requirement/category headings from this program page. Preserve their hierarchy; subcategories may already be included in a parent total.\n'+'\n'.join(dict.fromkeys(labels))}]+sections
        for section in sections:
            heading=clean(section['heading']);body='\n'.join(line.rstrip() for line in section['text'].splitlines()).strip() if d.get('kind')=='pdf' else clean(section['text'])
            if re.search(r'(?:^| > )عفوا$|cookie|subscribe|accessibility menu|website feedback',heading,re.I):continue
            if global_scope and body and clean(body)!=clean(global_scope):body='Page-wide published applicability (same official source):\n'+global_scope+'\n\nSection facts:\n'+body
            if body and clean(body).lower() in existing_text.get(u,''):continue
            if not body and not re.search(r'credit|hour|req\.|ساع',heading,re.I):continue
            if d.get('kind')=='pdf' and len(body)<80:continue
            # Layout text is retained as evidence with page; never convert arrows into prerequisite claims.
            for number,part in enumerate(split_text(body or heading)):
                code_match=re.match(r'^([A-Z]{3,6})[ -]?(\d{3,4})\b',heading)
                chunk_url=course_urls.get((u.split('?')[0],code_match[1]+code_match[2]),u) if code_match and '/catalog/courses/' in path else u
                if chunk_url!=u:part='Official course record: '+chunk_url+'\n'+part
                head=heading+(f' — continuation {number+1}' if number else '')
                content+=['## '+head,part,''];codes=sorted({m[0]+m[1] for m in COURSE.findall(head+' '+part)})
                course_match=re.match(r'^([A-Z]{3,6})[ -]?(\d{3,4})\b',heading)
                course=course_match[1]+course_match[2] if course_match else ''
                valid.append({'id':f'{docid}:{len(valid)}','source':f'crawled/{filename}','title':title,'url':chunk_url,'verified':d['verified'],'text':part,'heading':head,'page':section.get('page'),'language':lang,'program':program,'college':college,'qualification':qual,'degreeLevel':level,'years':academic_years(section.get('modelScope','')) or years,'temporal':temporal,'subject':subject,'topicId':topic,'courseCode':course,'mentionedCodes':codes,'hash':hashlib.sha256((chunk_url+'\n'+head+'\n'+part).encode()).hexdigest()})
        if not valid:rejected.append({'url':u,'reason':'no usable sections'});continue
        (dest/filename).write_text(front+'\n'.join(content));documents.append({**meta,'filename':'crawled/'+filename,'chunks':len(valid)});chunks+=valid
        # Only observed names; Arabic counterparts linked via official alternate or identical language-neutral topic.
        names={title}
        if program:
            short=re.sub(r'^(?:Bachelor of (?:Science|Arts|Education)|Master of (?:Science|Arts|Education)|Doctor of Philosophy) in ','',program,flags=re.I)
            names.add(short)
        for name in sorted(names):
            if 3<len(name)<140:aliases.append({'alias':name,'canonical':title,'topicId':topic,'program':program,'qualification':qual,'language':lang,'sourceUrl':u})
        missing=[]
        if program:
            for field,pattern in [('credits',r'credit|hour|ساع'),('plan',r'study.plan|model.plan|خطة'),('prerequisites',r'prerequisite|متطلب.{0,10}سابق')]:
                if not re.search(pattern,text,re.I):missing.append(field)
        coverage.append({'url':d['url'],'canonicalUrl':u,'status':'partial' if missing or d.get('kind')=='pdf' else 'yes','verified':d['verified'],'topic':title,'language':lang,'category':subject,'file':'data/knowledge/crawled/'+filename,'reason':('not published in this source: '+', '.join(missing)) if missing else 'PDF layout retained; table relationships need targeted verification' if d.get('kind')=='pdf' else 'structured source sections indexed; completeness applies only to this page'})
    program_topics={d['topicId']:d for d in documents if d.get('program')}
    observed_keys={(v['alias'],v['topicId']) for v in aliases}
    for page in good:
        for link in page.get('links',[]):
            path=urlsplit(link['url']).path;topic=re.sub(r'^/(en|ar)/','/',path);topic=re.sub(r'\.(s?html?|aspx?)$','',topic)
            target=program_topics.get(topic);label=clean(link.get('text',''))
            if not target or not 4<=len(label)<140 or re.fullmatch(r'(?i)(?:program|read more|view|more|details|apply now|click here|المزيد|تفاصيل)',label):continue
            key=(label,topic)
            if key in observed_keys:continue
            observed_keys.add(key);aliases.append({'alias':label,'canonical':target['program'],'topicId':topic,'program':target['program'],'qualification':target['qualification'],'language':'ar' if re.search(r'[\u0600-\u06ff]',label) else 'en','sourceUrl':page['url'],'entityType':'official-anchor-name'})
    # Entity aliases are observed headings/names, plus mechanical initials; they
    # aid retrieval only and are never independent evidence for a university fact.
    entity_keys={(a['alias'],a['topicId']) for a in aliases}
    for chunk in chunks:
        names=[]
        if chunk.get('college'):names.append((chunk['college'],'college'))
        if re.search(r'Office|Department|Unit|Centre|Center|Building|Library|مكتب|مركز|وحدة|قسم|مبنى|مكتبة',chunk['heading']) and len(chunk['heading'])<120:names.append((chunk['heading'],'office-or-facility'))
        for name,kind in names:
            candidates=[name]
            if kind=='college':
                file_alias=re.search(r'/([a-z]{2,5})_(?:bsc|msc|phd|study)',chunk['url'],re.I)
                if file_alias:candidates.append(file_alias[1].upper())
            if name.isascii():
                words=[w for w in re.findall(r'[A-Za-z]+',name) if w.lower() not in ['of','and','the','in','for']]
                acronym=''.join(w[0].upper() for w in words)
                if 2<=len(acronym)<=6:candidates.append(acronym)
            for alias in candidates:
                key=(alias,chunk['topicId'])
                if key in entity_keys:continue
                entity_keys.add(key);aliases.append({'alias':alias,'canonical':name,'topicId':chunk['topicId'],'program':'','qualification':'','language':chunk['language'],'sourceUrl':chunk['url'],'entityType':kind})
    for alias in list(aliases):
        if alias['program']:
            short=re.sub(r'^(?:Bachelor of (?:Science|Arts|Education)|Master of (?:Science|Arts|Education)|Doctor of Philosophy) in ','',alias['program'],flags=re.I)
            words=[w for w in re.findall(r'[A-Za-z]+',short) if w.lower() not in ['of','and','the','in','for']]
            acronym=''.join(w[0].upper() for w in words)
            if 2<=len(acronym)<=5 and (acronym,alias['topicId']) not in entity_keys:
                entity_keys.add((acronym,alias['topicId']));aliases.append({**alias,'alias':acronym,'entityType':'program-acronym'})
    corpus=ROOT/'data/corpus';corpus.mkdir(exist_ok=True)
    course_names=collections.defaultdict(set)
    for chunk in chunks:
        if chunk.get('courseCode'):course_names[re.sub(r' — continuation \d+$','',chunk['heading'].removeprefix(chunk['courseCode']).strip())].add(chunk['courseCode'])
    (corpus/'course-identities.json').write_text(json.dumps({'verified':DATE,'provenance':'Observed official course catalog record headings only; not inferred from prerequisites','codes':sorted({c['courseCode'] for c in chunks if c.get('courseCode')}),'names':{name:next(iter(codes)) for name,codes in sorted(course_names.items()) if len(codes)==1 and len(name)>=10}},ensure_ascii=False,indent=2)+'\n')

    (corpus/'chunks.jsonl').write_text(''.join(json.dumps(v,ensure_ascii=False)+'\n' for v in chunks))
    bytopic=collections.defaultdict(list)
    for alias in aliases:bytopic[alias['topicId']].append(alias)
    for a in aliases:
        a['equivalents']=sorted({v['alias'] for v in bytopic[a['topicId']] if v['language']!=a['language']})
    (corpus/'aliases.json').write_text(json.dumps(aliases,ensure_ascii=False,indent=2)+'\n')
    (corpus/'manifest.json').write_text(json.dumps({'schemaVersion':1,'verified':DATE,'documents':documents,'chunks':len(chunks),'chunkFingerprint':hashlib.sha256((corpus/'chunks.jsonl').read_bytes()).hexdigest(),'dedupe':'exact normalized source text; reviewed existing sources retained; no fabricated translations','rejected':rejected},ensure_ascii=False,indent=2)+'\n')
    known={v['url'] for v in coverage}
    for r in records:
        if r['url'] in known:continue
        if r['state']=='content-alias':
            coverage.append({'url':r['url'],'canonicalUrl':r['canonicalUrl'],'status':'partial','verified':r.get('verified',DATE),'reason':r['reason'],'topic':r.get('label') or urlsplit(r['url']).path,'category':'academics'});continue
        coverage.append({'url':r['url'],'status':'missing','verified':r.get('verified','not fetched'),'reason':r.get('error') or r.get('reason') or r['state'],'topic':r.get('title') or r.get('label') or urlsplit(r['url']).path,'category':category(r['url'],r.get('label',''))})
    for r in rejected:
        for v in coverage:
            if v['url']==r['url']:v['reason']=r['reason']
    report=ROOT/'reports/knowledge-expansion-2026-11-04';report.mkdir(exist_ok=True)
    (report/'coverage.json').write_text(json.dumps(coverage,ensure_ascii=False,indent=2)+'\n')
    lines=['# UAEU knowledge coverage map','',f'Verified: {DATE}. Public official sources only. `yes` means the fetched page’s structured sections are indexed; it does not certify every possible fact. `partial` retains the specific missing-field/layout/duplicate reason; `missing` includes unfetched, blocked, failed and link-only pages. No unpublished current availability is inferred.','',f'Documents added: {len(documents)}; chunks: {len(chunks)}. Sources discovered: {len(records)}.','', '| Topic / source | Category | Language | Last verified | KB | Reason / repository file |','|---|---|---|---|---|---|']
    for v in sorted(coverage,key=lambda x:(x.get('category',''),x.get('topic',''),x['url'])):
        label=v.get('topic') or urlsplit(v['url']).path
        lines.append('| ['+label.replace('|','/').replace('\n',' ')[:150]+']('+v['url']+') | '+v.get('category','')+' | '+v.get('language','unknown')+' | '+v['verified']+' | '+v['status']+' | '+v.get('reason','').replace('|','/')+' '+v.get('file','')+' |')
    (ROOT/'coverage_map.md').write_text('\n'.join(lines)+'\n')
    print(json.dumps({'documents':len(documents),'chunks':len(chunks),'coverage':dict(collections.Counter(v['status'] for v in coverage)),'categories':dict(collections.Counter(v['subject'] for v in chunks))}))

if __name__=='__main__':main()
