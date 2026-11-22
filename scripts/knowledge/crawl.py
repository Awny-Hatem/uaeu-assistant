#!/usr/bin/env python3
"""Resumable public UAEU crawl. Network requests never use authenticated sessions.
Run with bundled Python (lxml, pypdf), see README.md. Cached bodies are local only.
"""
import argparse, concurrent.futures, datetime, hashlib, heapq, json, re, sqlite3, time, threading, os, gzip
from pathlib import Path
from urllib.parse import urljoin, urlsplit, urlunsplit, parse_qsl, urlencode, quote, unquote
from urllib.request import Request, build_opener, HTTPRedirectHandler
from urllib.error import HTTPError
from lxml import html, etree
from pypdf import PdfReader
from io import BytesIO
from program_feed import parse_program_feed

DATE = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=4))).date().isoformat()
UA = 'UAEU-Assistant-Research/2.0 (public university knowledge; robots-aware; 1 request/second/host)'
ASSET = re.compile(r'\.(?:png|jpe?g|gif|svg|ico|mp[34]|avi|mov|woff2?|ttf|css|js|zip|exe|xlsx?|docx?|pptx?)$', re.I)
EXCLUDE = re.compile(r'(?:webtest|cms|localhost|staging|preview)', re.I)
DYNAMIC = re.compile(r'/(?:news|events|news_events|spotlights|blogs|conferences|jobs|employment|vacancies|job_vacancies|photo_library|photo|media|media-center|newsletters?)(?:/|[_.-])|/vc/uod/publications/|/cgs/tdd/.*\.pdf$|/[^/]*(?:daily[-_]?news|news[-_]clippings?)[^/]*$', re.I)
HIST = re.compile(r'(?:old|bkp|backup|archive|prev_catalog|catalog_20|catalog-20|historical|201[0-9]|202[0-4])', re.I)

def audit_safe_result(result):
    """Quarantine malformed extraction instead of silently repairing facts."""
    try:
        json.dumps(result,ensure_ascii=False).encode('utf-8')
        return result
    except UnicodeEncodeError:
        return {**{key:result[key] for key in ['url','finalUrl','status','verified','bodyFile','sha256','contentType'] if key in result},'state':'failed','quality':'invalid-unicode-extraction','error':'Extracted source contains invalid Unicode; original response bytes retained for manual/OCR review. No text approved.'}

def reference_only(url):
    p=urlsplit(url)
    return bool(DYNAMIC.search(p.path)
        or p.hostname=='research.uaeu.ac.ae' and (re.match(r'^/(?:en|ar)/(?:publications|datasets|prizes|projects|activities|clippings|impacts)/[^/]+/?$',p.path) or re.search(r'/(?:similar|network|network-map|network-organisations|publications|fingerprints|activities|projects)/?$',p.path) or re.match(r'^/files/\d+/',p.path))
        or p.hostname=='scholarworks.uaeu.ac.ae' and (re.search(r'/\d+/?$',p.path) or re.search(r'/vol\d+(?:/|$)',p.path) or re.search(r'/context/[^/]+/article/\d+/',p.path))
        or p.hostname in {'conferences.uaeu.ac.ae','jobs.uaeu.ac.ae','uaeulawjournal.uaeu.ac.ae'})


def official(u):
    try:
        p=urlsplit(u);h=(p.hostname or '').lower()
        return p.scheme=='https' and (h=='uaeu.ac.ae' or h.endswith('.uaeu.ac.ae')) and not EXCLUDE.search(h) and not re.search(r'webtest|(?:^|/)cms(?:/|[-_.])',p.path,re.I) and not p.username and not p.password and p.port in (None,443)
    except (ValueError,TypeError):return False


def public_link(u):
    # Legacy catalogs publish HTTP links; upgrade only the same official host.
    return official('https://'+u[7:]) if u.startswith('http://') else official(u)


def canonical(u):
    p=urlsplit(u); h=(p.hostname or '').lower()
    if h=='uaeu.ac.ae': h='www.uaeu.ac.ae'
    q=[(k,v) for k,v in parse_qsl(p.query,keep_blank_values=True) if not re.match(r'utm_|fbclid|gclid',k)]
    return urlunsplit(('https',h,quote(re.sub('/+','/',p.path or '/'),safe="/%:@!$&'()*+,;=-._~"),urlencode(sorted(q)),''))


def eligible(u):
    p=urlsplit(u)
    if unquote(p.path).rstrip('/').split('/')[-1]=='للتواصل عبر واتساب':return False
    if re.search(r'/(?:en|ar)/.*?/(?:en|ar)/',p.path): return False
    if len(p.path)>300: return False
    if re.search(r'/(?:demo\d*|test)/|index[-_](?:test|ws|bkp)|(?:_back|_backup|_bkp)\d*|eform[^/]*test|eform-(?:failure|response)|/(?:failure|success|subscribe)\.shtml$',p.path,re.I): return False
    if not official(u) or ASSET.search(p.path): return False
    if '/flipbooks/' in p.path and not p.path.lower().endswith('.pdf'): return False
    if re.search(r'/files/assets/(?:common/)?(?:basic-html/|downloads/page\d+\.pdf$)',p.path,re.I): return False
    if re.search(r'/(?:_resources|_includes|api|search|sign_in|login|logout|admin)/',p.path,re.I): return False
    if re.search(r'(?:_bkp|_backup|tabs-test|test2024|index-slider|news_events_tabs_slider)',p.path,re.I): return False
    # Avoid infinite calendar/search/query spaces. Retain observed legacy catalog IDs.
    if p.query:
        query=dict(parse_qsl(p.query,keep_blank_values=True))
        public_service=(p.hostname=='coreservices.uaeu.ac.ae' and p.path.lower()=='/servicecatalog/details' or re.fullmatch(r'/(?:en|ar)/eservices/details\.shtml',p.path)) and set(query)=={'serviceId'} and bool(re.fullmatch(r'\d{1,6}',query['serviceId']))
        public_program=bool(re.fullmatch(r'/(?:en|ar)/catalog/program-details\.shtml',p.path)) and set(query)=={'PROGRAM_ID'} and bool(re.fullmatch(r'\d+(?:\.\d+){2}',query['PROGRAM_ID']))
        public_calendar=p.hostname=='coreservices.uaeu.ac.ae' and p.path.lower()=='/calendar/calendar' and set(query)<={'culture'} and query.get('culture') in ('en','ar')
        if not (p.hostname=='webapps.uaeu.ac.ae' and p.path.startswith('/catalog/') or re.fullmatch(r'/(?:en|ar)/(?:catalog|eng)/courses/course_\d+\.shtml',p.path) and set(query)=={'id'} and re.fullmatch(r'[A-Z]{3,6}\d{3,4}',query['id'],re.I) or public_service or public_program or public_calendar):return False
    if re.fullmatch(r'/(?:en|ar)/catalog/summary/search\.xml',p.path) and not p.query:return True
    return p.path.endswith(('.shtml','.html','.htm','.asp','.aspx','.pdf','/')) or not Path(p.path).suffix


def priority(u):
    s=urlsplit(u).path.lower()
    if urlsplit(u).hostname=='webapps.uaeu.ac.ae' and s.startswith('/catalog/'):return 1
    return (0 if '/servicecatalog/' in s or '/eservices/' in s or '/catalog/' in s and '/programs/' in s else 1 if '/catalog/' in s or '/servicecatalog/' in s or '/eservices/' in s or '/accreditation/' in s or re.search(r'/vc/(?:index\.shtml)?$',s) else 1 if re.search(r'study.plan|prev_catalog|polic|scholarship|admission|calendar|fees|catalog.*pdf',s) else 2 if re.search(r'campus_life|library|student|about/|contact|cgs|research|depart',s) else 3) + (2 if HIST.search(s) else 0)


class Redirects(HTTPRedirectHandler):
    def __init__(self, owner): self.owner=owner
    def redirect_request(self,req,fp,code,msg,headers,newurl):
        target=canonical(urljoin(req.full_url,newurl))
        if not official(target) or not self.owner.allowed(target): raise ValueError('Redirect rejected: nonofficial or robots disallowed')
        self.owner.throttle(urlsplit(target).netloc)
        return super().redirect_request(req,fp,code,msg,headers,target)


class Crawler:
    def __init__(self,root,delay):
        self.root=Path(root);self.root.mkdir(parents=True,exist_ok=True);(self.root/'bodies').mkdir(exist_ok=True)
        self.db=sqlite3.connect(self.root/'crawl.sqlite');self.db.row_factory=sqlite3.Row
        self.db.execute('CREATE TABLE IF NOT EXISTS urls(url TEXT PRIMARY KEY, discovered_on TEXT, label TEXT, priority INT, state TEXT DEFAULT "pending", result TEXT)')
        self.rules={}; self.next={}; self.locks={}; self.delay=delay;self.delays={};self.opener=build_opener(Redirects(self))
        self.db.execute('UPDATE urls SET state="pending" WHERE state="fetching"');self.db.commit()

    def throttle(self,host):
        lock=self.locks.setdefault(host,threading.Lock())
        with lock:
            time.sleep(max(0,self.next.get(host,0)-time.monotonic()));self.next[host]=time.monotonic()+self.delays.get(host,self.delay)

    def raw(self,u,cap=35_000_000):
        self.throttle(urlsplit(u).netloc)
        with self.opener.open(Request(u,headers={'User-Agent':UA}),timeout=35) as r:
            raw=r.read(cap+1)
            if len(raw)>cap: raise ValueError(f'Body exceeds {cap} byte safety limit')
            return raw,r.status,r.url,r.headers.get('Content-Type','')

    def allowed(self,u):
        host=urlsplit(u).netloc
        if host not in self.rules:
            cache=self.root/('robots-'+host+'.json')
            if cache.exists(): record=json.loads(cache.read_text())
            else:
                # Mark while fetching robots so redirects cannot recurse.
                self.rules[host]=[(False,re.compile('.*'))]
                try:
                    b,status,final,ct=self.raw('https://'+host+'/robots.txt',1_000_000)
                    record={'url':'https://'+host+'/robots.txt','status':status,'text':b.decode(errors='replace'),'verified':DATE}
                except HTTPError as e: record={'status':e.code,'text':'','verified':DATE}
                except Exception as e: record={'status':0,'text':'','error':str(e),'verified':DATE}
                cache.write_text(json.dumps(record,ensure_ascii=False,indent=2))
            # 404 robots means no rules; server/network errors mean do not crawl.
            rules=[]
            if record['status'] not in (200,404): rules=[(False,re.compile('.*'))]
            else:
                groups=[];agents=[];directives=[]
                for line in record['text'].splitlines():
                    key,_,value=line.split('#')[0].partition(':');key=key.strip().lower();value=value.strip()
                    if key=='user-agent':
                        if directives:groups.append((agents,directives));agents=[];directives=[]
                        agents.append(value.lower())
                    elif agents and key in ('allow','disallow','crawl-delay'):directives.append((key,value))
                if agents:groups.append((agents,directives))
                ranked=[(max((len(a) for a in agents if a!='*' and a in UA.lower()),default=0),agents,items) for agents,items in groups]
                specificity=max((score for score,agents,items in ranked),default=0)
                for score,agents,items in ranked:
                    if score!=specificity or (not score and '*' not in agents):continue
                    for key,value in items:
                        if key in ('allow','disallow') and value:rules.append((key=='allow',re.compile('^'+re.escape(value).replace(r'\*','.*').replace(r'\$','$'))))
                        elif key=='crawl-delay':
                            try:self.delays[host]=max(self.delays.get(host,self.delay),float(value))
                            except ValueError:pass
            self.rules[host]=rules
        path=urlsplit(u).path+('?' + urlsplit(u).query if urlsplit(u).query else '')
        matches=[(len(p.pattern),allow) for allow,p in self.rules[host] if p.search(path)]
        return sorted(matches,reverse=True)[0][1] if matches else True

    def add(self,u,parent='',label=''):
        u=canonical(u)
        if eligible(u):
            state='link-only' if reference_only(u) else 'pending'
            result=json.dumps({'url':u,'state':state,'reason':'news/events/media/jobs or individual thesis publication; reference link only, not current institutional requirements'}) if state=='link-only' else None
            self.db.execute('INSERT OR IGNORE INTO urls(url,discovered_on,label,priority,state,result) VALUES(?,?,?,?,?,?)',(u,parent,label,priority(u),state,result))

    def seed(self,maps):
        for f in maps:
            for u in re.findall(r'https://[^\s)<>\]"\']+',Path(f).read_text()): self.add(u,str(f))
        for u in ['https://www.uaeu.ac.ae/en/','https://www.uaeu.ac.ae/ar/','https://webapps.uaeu.ac.ae/catalog/degrees.asp']: self.add(u,'seed')
        sitemap=self.root/'sitemap.xml'
        if not sitemap.exists():
            raw,*_=self.raw('https://www.uaeu.ac.ae/sitemap.xml',20_000_000);sitemap.write_bytes(raw)
        for u in etree.fromstring(sitemap.read_bytes()).xpath('//*[local-name()="loc"]/text()'): self.add(u,'official sitemap')
        self.db.commit()

    def extract(self,b,u,ct):
        if b.startswith(b'%PDF'):
            reader=PdfReader(BytesIO(b));pages=[];links=[]
            for i,p in enumerate(reader.pages):
                text=p.extract_text(extraction_mode='layout') or ''
                pages.append({'page':i+1,'text':text})
                for a in p.get('/Annots',[]):
                    obj=a.get_object().get('/A',{});target=obj.get('/URI') if obj else None
                    if target and official(urljoin(u,str(target))): links.append({'url':canonical(urljoin(u,str(target))),'text':''})
            return {'kind':'pdf','title':str(reader.metadata.title or Path(urlsplit(u).path).name) if reader.metadata else Path(urlsplit(u).path).name,'pages':pages,'sections':[{'heading':f'PDF page {p["page"]}','text':p['text'],'page':p['page']} for p in pages if p['text'].strip()],'links':links,'text':'\n\n'.join(p['text'] for p in pages),'quality':'text-extracted-layout-review-required'}
        if re.fullmatch(r'/(?:en|ar)/catalog/summary/search\.xml',urlsplit(u).path):
            parsed=parse_program_feed(b,u)
            if parsed:return parsed
        doc=html.fromstring(b,base_url=u)
        links=[{'url':canonical(urljoin(u,a.get('href'))),'text':' '.join(a.text_content().split())} for a in doc.xpath('//a[@href]') if public_link(urljoin(u,a.get('href')))]
        alternate=[canonical(urljoin(u,a.get('href'))) for a in doc.xpath('//link[@rel="alternate"][@href]') if public_link(urljoin(u,a.get('href')))]
        title=' '.join(doc.xpath('//title/text()'))
        # Tab labels are factual scope, often an admission year. Navigation is
        # removed below, so bind its printed label to the referenced panel first.
        tab_labels={}
        for tab in doc.xpath('//*[@role="tab"][@aria-controls] | //*[@data-tabs-target]'):
            target=(tab.get('aria-controls') or tab.get('data-tabs-target') or '').lstrip('#')
            label=' '.join(tab.text_content().split())
            if target and label and re.fullmatch(r'[A-Za-z0-9_-]+',target):tab_labels[target]=label

        for el in doc.xpath('//script|//style|//header|//footer|//nav|//*[@role="navigation"]|//*[contains(concat(" ",normalize-space(@class)," ")," tab-items ")]|//form[.//input[@type="password"]]|//input|//select|//textarea|//svg|//*[@aria-hidden="true"]|//*[contains(concat(" ",normalize-space(@class)," ")," breadcrumb ")]'):
            if el.get('id') not in tab_labels:el.drop_tree()
        main=doc.xpath('//main') or doc.xpath('//body') or [doc];node=main[0]
        sections=[];heading='Overview';parts=[];hierarchy={};active_tabs=[]
        def flush():
            nonlocal parts
            text=re.sub(r'[ \t]+',' ',''.join(parts))
            text=re.sub(r' *\n *','\n',text);text=re.sub(r'\n{3,}','\n\n',text).strip()
            if text or heading:sections.append({'heading':' > '.join(active_tabs+[heading]),'text':text})
            parts=[]
        def add_text(value):
            value=' '.join((value or '').split())
            if value:parts.append(' '+value+' ')
        def walk_content(el):
            nonlocal heading
            if not isinstance(el.tag,str):return
            tag=el.tag.lower();classes=(el.get('class') or '').split()
            if re.fullmatch(r'h[1-6]',tag) or 'accordion-title' in classes:
                flush();level=int(tag[1]) if re.fullmatch(r'h[1-6]',tag) else 2
                label=' '.join(el.text_content().split())
                for key in list(hierarchy):
                    if key>=level:del hierarchy[key]
                hierarchy[level]=label;heading=' > '.join(hierarchy[key] for key in sorted(hierarchy) if hierarchy[key]);return
            if tag=='table':
                parts.append('\n')
                for tr in el.xpath('.//tr[not(ancestor::tr)]'):
                    cells=[' '.join(td.text_content().split()) for td in tr.xpath('./th|./td')]
                    if cells:parts.append(' | '.join(cells)+'\n')
                return
            if tag in ['p','div','li','ul','ol','section','article','dl','dt','dd','br']:parts.append('\n')
            add_text(el.text)
            for child in el:
                walk(child);add_text(child.tail)
            if tag in ['p','div','li','ul','ol','section','article','dl','dt','dd','br']:parts.append('\n')
        def walk(el):
            nonlocal heading
            label=tab_labels.get(el.get('id')) if isinstance(el.tag,str) else None
            if not label:return walk_content(el)
            flush();previous_heading=heading;previous_hierarchy=hierarchy.copy()
            active_tabs.append(label);walk_content(el);flush();active_tabs.pop()
            hierarchy.clear();hierarchy.update(previous_hierarchy);heading=previous_heading
        walk(node);flush()
        text='\n\n'.join(s['heading']+'\n'+s['text'] for s in sections)
        return {'kind':'html','title':title,'soft404':any(re.fullmatch(r'(?:.* > )?(?:page not found!?|404 error|403 forbidden)',s['heading'],re.I) for s in sections),'sections':sections,'links':links,'alternates':alternate,'text':text,'quality':'structured-html'}

    def fetch(self,row):
        u=row['url'];r={'url':u,'verified':DATE,'fetchedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'discoveredOn':row['discovered_on'],'label':row['label']}
        if row['result']:
            previous=json.loads(row['result'])
            r['previousAttempts']=previous.get('previousAttempts',[])+[{k:previous[k] for k in ['state','status','verified','error'] if k in previous}]
        try:
            if not self.allowed(u):return {**r,'status':0,'state':'robots-blocked','error':'robots.txt disallows crawl'}
            if reference_only(u):return {**r,'status':None,'state':'link-only','reason':'news/events/media/jobs or individual thesis publication; reference link only, not current institutional requirements'}
            b,status,final,ct=self.raw(u);r.update(status=status,finalUrl=final,contentType=ct,sha256=hashlib.sha256(b).hexdigest())
            if not official(final):raise ValueError('Nonofficial final URL')
            key=hashlib.sha256(u.encode()).hexdigest();name=key+('.pdf' if b.startswith(b'%PDF') else '.html');(self.root/'bodies'/name).write_bytes(b);r['bodyFile']=name
            r.update(self.extract(b,final,ct));r['state']='soft-404' if r.get('soft404') else 'fetched' if len(r['text'].strip())>=80 else 'empty'
            if r.get('soft404'):r['error']='HTTP 200 returned a not-found/error page; excluded from knowledge'
        except Exception as e:r.update(status=getattr(e,'code',0),state='failed',error=str(e))
        return r

    def retry_transient_failures(self):
        count=0
        for row in self.db.execute('SELECT url,result FROM urls WHERE state="failed"').fetchall():
            prior=json.loads(row['result'] or '{}');status=prior.get('status',0)
            transient=status in (408,429,500,502,503,504) or status==0 and re.search(r'timed? out|timeout|temporarily|connection reset|remote end closed',prior.get('error',''),re.I)
            if transient and eligible(row['url']) and not reference_only(row['url']):
                self.db.execute('UPDATE urls SET state="pending" WHERE url=?',(row['url'],));count+=1
        self.db.commit();return count

    def run(self,max_pages,workers=3):
        (self.root/'crawler.pid').write_text(str(os.getpid()))
        count=0;submitted=0;pending={};catalog_bodies={}
        # Reapply explicit scope rules when resuming an older queue. Retain every
        # discovered URL and reason rather than downloading duplicate viewer pages.
        for row in self.db.execute('SELECT url,result FROM urls WHERE state="pending"').fetchall():
            u=row['url'];state='excluded' if not eligible(u) else 'link-only' if reference_only(u) else None
            if state:
                result={'url':u,'state':state,'reason':'duplicate viewer/assets or nonpublic/test route' if state=='excluded' else 'news/events/media/jobs or individual thesis publication; reference link only, not current institutional requirements'}
                self.db.execute('UPDATE urls SET state=?,result=? WHERE url=?',(state,json.dumps(result),u))
            else:self.db.execute('UPDATE urls SET priority=? WHERE url=?',(-5 if json.loads(row['result'] or '{}').get('forceFetch') else priority(u),u))
        for row in self.db.execute('SELECT url FROM urls WHERE state IN ("fetched","failed","empty","soft-404")').fetchall():
            if reference_only(row['url']):
                result=json.loads(self.db.execute('SELECT result FROM urls WHERE url=?',(row['url'],)).fetchone()[0]);result.update(priorState=result.get('state'),state='link-only',reason='Individual research output, duplicate profile view, news or media: retained as a reference link, not current institutional requirements')
                self.db.execute('UPDATE urls SET state=?,result=? WHERE url=?',('link-only',json.dumps(result,ensure_ascii=False),row['url']))
        self.db.commit()
        for value in self.db.execute('SELECT result FROM urls WHERE state="fetched" AND url LIKE "%/catalog/courses/%"'):
            item=json.loads(value[0]);base=item['url'].split('?')[0];digest=hashlib.sha256(item.get('text','').encode()).hexdigest()
            catalog_bodies.setdefault((base,digest),[]).append(item['url'])
        for (base,digest),urls in catalog_bodies.items():
            if len(urls)>1:self.alias_catalog(base,urls[0])
        # A bounded larger pool processes slow PDFs while request starts remain
        # serialized per host, including its published crawl delay.
        with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as pool:
            while True:
                while len(pending)<workers and (not max_pages or submitted<max_pages) and not (self.root/'STOP').exists():
                    row=self.db.execute('SELECT * FROM urls WHERE state="pending" ORDER BY priority,rowid LIMIT 1').fetchone()
                    if not row:break
                    # Robots initialized on the coordinator; workers only read rules.
                    self.allowed(row['url'])
                    self.db.execute('UPDATE urls SET state="fetching" WHERE url=?',(row['url'],));self.db.commit()
                    pending[pool.submit(self.fetch,row)]=row;submitted+=1
                if not pending:break
                done,_=concurrent.futures.wait(pending,return_when=concurrent.futures.FIRST_COMPLETED)
                for future in done:
                    row=pending.pop(future);r=audit_safe_result(future.result())
                    self.db.execute('UPDATE urls SET state=?,result=? WHERE url=?',(r['state'],json.dumps(r,ensure_ascii=False),row['url']))
                    for a in r.get('links',[]):self.add(a['url'],row['url'],a['text'])
                    for a in r.get('alternates',[]):self.add(a,row['url'],'language alternate')
                    if r['state']=='fetched' and '/catalog/courses/' in row['url']:
                        base=row['url'].split('?')[0];digest=hashlib.sha256(r.get('text','').encode()).hexdigest()
                        urls=catalog_bodies.setdefault((base,digest),[]);urls.append(row['url'])
                        if len(urls)>1:self.alias_catalog(base,urls[0])
                    self.db.commit();count+=1
                    print(count,r['state'],r.get('status'),row['url'],flush=True)
                if (self.root/'STOP').exists() and not pending:break
        self.export()

    def alias_catalog(self,base,canonical_url):
        # Only after two different observed IDs returned identical complete catalog
        # text. These are content aliases, never falsely reported as fetched URLs.
        for row in self.db.execute('SELECT url FROM urls WHERE state="pending" AND url LIKE ?',(base+'?%',)).fetchall():
            previous=json.loads(self.db.execute('SELECT result FROM urls WHERE url=?',(row['url'],)).fetchone()[0] or '{}')
            if previous.get('forceFetch'):continue
            result={'url':row['url'],'state':'content-alias','canonicalUrl':canonical_url,'verified':DATE,'reason':'two observed course IDs returned the identical complete department catalog; source-specific course links retained'}
            self.db.execute('UPDATE urls SET state=?,result=? WHERE url=?',('content-alias',json.dumps(result),row['url']))
        self.db.commit()

    def export(self):
        counts=dict(self.db.execute('SELECT state,count(*) FROM urls GROUP BY state'))
        # The cache DB remains the authoritative resumable record. Stream its
        # duplicate audit export so a large crawl does not sort gigabytes of
        # source text into SQLite temporary files or hold it all in memory.
        destination=self.root/'manifest.json.gz';temporary=self.root/'manifest.json.gz.tmp'
        with gzip.open(temporary,'wt',encoding='utf-8',compresslevel=3) as output:
            output.write('{"date":'+json.dumps(DATE)+',"counts":'+json.dumps(counts)+',"sources":[')
            first=True
            for url, in self.db.execute('SELECT url FROM urls ORDER BY priority,url'):
                row=self.db.execute('SELECT * FROM urls WHERE url=?',(url,)).fetchone()
                value=json.loads(row['result']) if row['result'] else {'url':row['url'],'state':row['state'],'discoveredOn':row['discovered_on'],'label':row['label']}
                if not first:output.write(',\n')
                output.write(json.dumps(value,ensure_ascii=False));first=False
            output.write(']}\n')
        os.replace(temporary,destination)
        print('STATE',counts,flush=True)

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--cache',default='.uaeu-crawl');p.add_argument('--delay',type=float,default=1.0);p.add_argument('--workers',type=int,choices=range(1,7),default=3);p.add_argument('--max-pages',type=int,default=0);p.add_argument('--seed-map',action='append',default=[]);p.add_argument('--export-only',action='store_true');p.add_argument('--retry-transient',action='store_true',help='One explicit retry of previously timed-out/429/5xx public sources; never loop automatically');a=p.parse_args()
    crawler=Crawler(a.cache,max(1,a.delay))
    if a.export_only:crawler.export()
    else:
        crawler.seed(a.seed_map)
        if a.retry_transient:print('Requeued transient failures:',crawler.retry_transient_failures(),flush=True)
        try:crawler.run(a.max_pages,a.workers)
        finally:crawler.export()
