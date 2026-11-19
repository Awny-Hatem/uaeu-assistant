"""Build reproducible factual fixtures from original official response bytes.
This does not grade a chatbot answer; all output still requires source review.
"""
import argparse,hashlib,json,re,sqlite3
from pathlib import Path
from lxml import html
ROOT=Path(__file__).resolve().parents[2]
p=argparse.ArgumentParser();p.add_argument('--cache',required=True);p.add_argument('--programs-only',action='store_true');a=p.parse_args()
c=sqlite3.connect(Path(a.cache)/'crawl.sqlite');records=[json.loads(r[0]) for r in c.execute('select result from urls where state="fetched"')];cases=[]

def add(question,expected,source,checks,variants,category,language='en',focus='Missing Knowledge',college='',source_quote='',source_hash=''):
    cases.append({'id':f'KE{len(cases)+1:03}','category':category,'language':language,'focus':focus,'college':college,'turns':[question],'expected':expected,'sources':[source],'needsCitation':True,'checks':checks,'variants':variants,'sourceQuote':source_quote,'sourceBodySha256':source_hash,'sourceVerified':'2026-11-04','reviewRequired':True})

# Independent HTML check of the published total heading, not of ingested Markdown.
for d in sorted(records,key=lambda d:d['url']):
    u=d['url']
    if not re.search(r'/catalog/(?:undergraduate|graduate)/programs/[^/]+\.shtml$',u) or '/ar/' in u:continue
    raw=(Path(a.cache)/'bodies'/d['bodyFile']).read_bytes()
    if hashlib.sha256(raw).hexdigest()!=d['sha256']:raise ValueError('Source bytes checksum changed')
    doc=html.fromstring(raw);headings=[' '.join(h.text_content().split()) for h in doc.xpath('//h1|//h2|//h3|//h4')]
    heading=next((h for h in headings if re.search(r'Required Credit Hours',h,re.I)),None)
    if not heading:continue
    m=re.search(r'(\d+(?:\.\d+)?)\s*hours',heading,re.I)
    if not m:continue
    title=d['title'];credit=m[1];question=f'According to its UAEU catalog entry, how many credits are required for {title}?'
    variants=[f'{title} at UAEU: total credit hours?',f'hey how many credits do i need for {title} at uaeu',f'كم عدد الساعات المطلوبة لبرنامج {title} في جامعة الإمارات؟',f'{title} UAEU crdit hours plz?']
    add(question,f'The published catalog entry states minimum {credit} credit hours. Preserve the exact qualification; this does not establish a current intake or personal eligibility.',u,[{'name':'published credit total','any':[r'(?<!\d)'+re.escape(credit)+r'(?!\d)']}],variants,'academics',source_quote=heading,source_hash=d['sha256'])

if not a.programs_only:
    # Course records selected across prefixes; direct DOM ownership prevents a
    # neighboring course's prerequisite from becoming fixture truth.
    courses={}
    for d in records:
        if '/catalog/courses/' not in d['url']:continue
        raw=(Path(a.cache)/'bodies'/d['bodyFile']).read_bytes();doc=html.fromstring(raw)
        for div in doc.xpath('//div[@id]'):
            code=div.get('id','')
            if not re.fullmatch(r'[A-Z]{3,6}\d{3,4}',code):continue
            titles=div.xpath('./h1|./h2')
            if not titles:continue
            text=' '.join(div.text_content().split());m=re.search(r'Credit Hours\s*:\s*(\d+(?:\.\d+)?)',text,re.I)
            if not m:continue
            prereq=div.xpath('./h3[contains(translate(.,"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"),"prerequisites")]/following-sibling::*[1]')
            pre=' '.join(prereq[0].text_content().split()) if prereq else ''
            courses.setdefault(code,{'code':code,'title':' '.join(titles[0].text_content().split()),'credits':m[1],'prerequisites':pre,'url':d['url'].split('?')[0]+'?id='+code,'sha256':d['sha256']})
    groups={}
    for code,record in sorted(courses.items()):groups.setdefault(re.sub(r'\d+$','',code),[]).append(record)
    picked=[]
    while len(picked)<80 and any(groups.values()):
        for prefix in sorted(groups):
            if groups[prefix]:picked.append(groups[prefix].pop(0))
            if len(picked)>=80:break
    for index,r in enumerate(picked):
        code=r['code'];spaced=re.sub(r'(\D)(\d)',r'\1 \2',code);q=f'How many credit hours is {spaced} at UAEU?'
        checks=[{'name':'course credits','any':[r'(?<!\d)'+re.escape(r['credits'])+r'\s*(?:credit|hour|ساعة|ساعات|ساعه)']},{'name':'correct course identity','any':[code]}]
        expected=f'{r["title"]}: {r["credits"]} credit hours. Do not substitute the degree total or another course.'
        if index%3==0 and r['prerequisites']:
            q=f'What are the prerequisites for {spaced}? Include any published minimum grade.';pre_codes=re.findall(r'\b[A-Z]{3,6}\d{3,4}\b',r['prerequisites'])
            checks=[{'name':'published prerequisite '+v,'any':[v]} for v in pre_codes]
            if re.search(r'minimum grade D\b',r['prerequisites']):checks.append({'name':'minimum grade D','any':[r'\bD\b']})
            if not checks:checks=[{'name':'published prerequisite condition','any':[re.escape(r['prerequisites'][:35])]}]
            expected=r['title']+' prerequisites: '+r['prerequisites']+'. Preserve AND/OR and pre/corequisite distinctions.'
        variants=[q.replace(spaced,code),q.replace(spaced,spaced.lower().replace(' ','-')),q.replace('prerequisites','prerequisits') if 'prerequisites' in q else f'hey how many crdit hours is {spaced.lower()} worth at uaeu plz?',f'أريد نفس معلومات المساق {spaced}: '+('المتطلبات السابقة والحد الأدنى للدرجة؟' if 'prerequisite' in q else 'كم ساعة معتمدة؟')]
        add(q,expected,r['url'],checks,variants,'academics',focus='Phrasing Sensitivity',source_quote=r['title']+' | credits '+r['credits']+' | prerequisites '+r['prerequisites'],source_hash=r['sha256'])

out=ROOT/'evals/knowledge-expansion-2026-11-04.json';out.write_text(json.dumps({'created':'2026-11-04','methodology':'Expected facts extracted independently from original official HTML; automated scoring is provisional and requires source/semantic review. Each variant is an isolated conversation unless explicit follow-up turns are listed.','cases':cases},ensure_ascii=False,indent=2)+'\n');print(len(cases),'cases',out)
