#!/usr/bin/env python3
"""Resumable public UAEU crawl. Network requests never use authenticated sessions.
Run with bundled Python (lxml, pypdf), see README.md. Cached bodies are local only.
"""
import argparse, concurrent.futures, datetime, hashlib, heapq, json, re, sqlite3, time
from pathlib import Path
from urllib.parse import urljoin, urlsplit, urlunsplit, parse_qsl, urlencode
from urllib.request import Request, build_opener, HTTPRedirectHandler
from urllib.error import HTTPError
from lxml import html, etree
from pypdf import PdfReader
from io import BytesIO

DATE = '2026-11-04'
UA = 'UAEU-Assistant-Research/2.0 (public university knowledge; robots-aware; 1 request/second/host)'
ASSET = re.compile(r'\.(?:png|jpe?g|gif|svg|ico|mp[34]|avi|mov|woff2?|ttf|css|js|zip|exe|xlsx?|docx?|pptx?)$', re.I)
EXCLUDE = re.compile(r'(?:webtest|cms|localhost|staging|preview)', re.I)
DYNAMIC = re.compile(r'/(?:news|events|news_events|conferences|jobs|employment|vacancies)(?:/|[_.-])', re.I)
HIST = re.compile(r'(?:old|bkp|backup|archive|prev_catalog|catalog_20|catalog-20|historical|201[0-9]|202[0-4])', re.I)


def official(u):
    p=urlsplit(u); h=(p.hostname or '').lower()
    return p.scheme=='https' and (h=='uaeu.ac.ae' or h.endswith('.uaeu.ac.ae')) and not EXCLUDE.search(h) and not p.username and not p.password and p.port in (None,443)


def canonical(u):
    p=urlsplit(u); h=(p.hostname or '').lower()
    if h=='uaeu.ac.ae': h='www.uaeu.ac.ae'
    q=[(k,v) for k,v in parse_qsl(p.query,keep_blank_values=True) if not re.match(r'utm_|fbclid|gclid',k)]
    return urlunsplit(('https',h,re.sub('/+','/',p.path or '/'),urlencode(sorted(q)),''))


def eligible(u):
    p=urlsplit(u)
    if re.search(r'/(?:en|ar)/.*?/(?:en|ar)/',p.path): return False
    if len(p.path)>300: return False
    if not official(u) or ASSET.search(p.path): return False
    if '/flipbooks/' in p.path and not p.path.lower().endswith('.pdf'): return False
    if re.search(r'/(?:_resources|_includes|api|search|sign_in|login|logout|admin)/',p.path,re.I): return False
    if re.search(r'(?:_bkp|_backup|tabs-test|test2024|index-slider|news_events_tabs_slider)',p.path,re.I): return False
    # Avoid infinite calendar/search/query spaces. Retain observed legacy catalog IDs.
    if p.query and not (p.hostname=='webapps.uaeu.ac.ae' and p.path.startswith('/catalog/') or '/catalog/courses/' in p.path): return False
    return p.path.endswith(('.shtml','.html','.htm','.asp','.aspx','.pdf','/')) or not Path(p.path).suffix


def priority(u):
    s=urlsplit(u).path.lower()
    return (0 if '/catalog/' in s and '/programs/' in s else 1 if re.search(r'study.plan|prev_catalog|polic|scholarship|admission|calendar|fees|catalog.*pdf',s) else 2 if re.search(r'campus_life|library|student|about/|contact|cgs|research|depart',s) else 3) + (2 if HIST.search(s) else 0)


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
        self.rules={}; self.next={}; self.delay=delay;self.opener=build_opener(Redirects(self))
        self.db.execute('UPDATE urls SET state="pending" WHERE state="fetching"');self.db.commit()

    def throttle(self,host):
        time.sleep(max(0,self.next.get(host,0)-time.monotonic()));self.next[host]=time.monotonic()+self.delay

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
                active=False
                for line in record['text'].splitlines():
                    key,_,value=line.split('#')[0].partition(':');key=key.strip().lower();value=value.strip()
                    if key=='user-agent': active=value=='*' or value.lower() in UA.lower()
                    elif active and key in ('allow','disallow') and value:
                        rules.append((key=='allow',re.compile('^'+re.escape(value).replace(r'\*','.*').replace(r'\$','$'))))
                    elif active and key=='crawl-delay':
                        try:self.delay=max(self.delay,float(value))
                        except ValueError:pass
            self.rules[host]=rules
        path=urlsplit(u).path+('?' + urlsplit(u).query if urlsplit(u).query else '')
        matches=[(len(p.pattern),allow) for allow,p in self.rules[host] if p.search(path)]
        return sorted(matches,reverse=True)[0][1] if matches else True

    def add(self,u,parent='',label=''):
        u=canonical(u)
        if eligible(u): self.db.execute('INSERT OR IGNORE INTO urls(url,discovered_on,label,priority) VALUES(?,?,?,?)',(u,parent,label,priority(u)))

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
        doc=html.fromstring(b,base_url=u)
        links=[{'url':canonical(urljoin(u,a.get('href'))),'text':' '.join(a.text_content().split())} for a in doc.xpath('//a[@href]') if official(urljoin(u,a.get('href')))]
        alternate=[canonical(urljoin(u,a.get('href'))) for a in doc.xpath('//link[@rel="alternate"][@href]') if official(urljoin(u,a.get('href')))]
        title=' '.join(doc.xpath('//title/text()'))
        for el in doc.xpath('//script|//style|//header|//footer|//nav|//form|//*[@aria-hidden="true"]|//*[contains(concat(" ",normalize-space(@class)," ")," breadcrumb ")]'):
            el.drop_tree()
        main=doc.xpath('//main') or doc.xpath('//body') or [doc];node=main[0]
        sections=[];heading='Overview';parts=[]
        def flush():
            nonlocal parts
            text='\n'.join(parts).strip()
            if text or heading:sections.append({'heading':heading,'text':text})
            parts=[]
        # Table cells retain row boundaries and headers; never join unrelated columns as prose.
        for el in node.xpath('.//h1|.//h2|.//h3|.//h4|.//h5|.//p[not(ancestor::table)]|.//li[not(ancestor::table) and not(ancestor::li)]|.//table[not(ancestor::table)]'):
            if el.tag.startswith('h') and len(el.tag)==2:
                flush();heading=' '.join(el.text_content().split());continue
            if el.tag=='table':
                rows=[]
                for tr in el.xpath('.//tr[not(ancestor::tr)]'):
                    cells=[' '.join(td.text_content().split()) for td in tr.xpath('./th|./td')]
                    if cells:rows.append(' | '.join(cells))
                parts.append('\n'.join(rows))
            else:
                text=' '.join(el.text_content().split())
                if text and text not in parts:parts.append(text)
        flush()
        text='\n\n'.join(s['heading']+'\n'+s['text'] for s in sections)
        return {'kind':'html','title':title,'sections':sections,'links':links,'alternates':alternate,'text':text,'quality':'structured-html'}

    def fetch(self,row):
        u=row['url'];r={'url':u,'verified':DATE,'fetchedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'discoveredOn':row['discovered_on'],'label':row['label']}
        try:
            if not self.allowed(u):return {**r,'status':0,'state':'robots-blocked','error':'robots.txt disallows crawl'}
            if DYNAMIC.search(urlsplit(u).path):return {**r,'status':None,'state':'link-only','reason':'fast-changing news/events/employment: official navigation only'}
            b,status,final,ct=self.raw(u);r.update(status=status,finalUrl=final,contentType=ct,sha256=hashlib.sha256(b).hexdigest())
            if not official(final):raise ValueError('Nonofficial final URL')
            key=hashlib.sha256(u.encode()).hexdigest();name=key+('.pdf' if b.startswith(b'%PDF') else '.html');(self.root/'bodies'/name).write_bytes(b);r['bodyFile']=name
            r.update(self.extract(b,final,ct));r['state']='fetched' if len(r['text'].strip())>=80 else 'empty'
        except Exception as e:r.update(status=getattr(e,'code',0),state='failed',error=str(e))
        return r

    def run(self,max_pages):
        count=0
        while not max_pages or count<max_pages:
            row=self.db.execute('SELECT * FROM urls WHERE state="pending" ORDER BY priority,rowid LIMIT 1').fetchone()
            if not row:break
            r=self.fetch(row)
            self.db.execute('UPDATE urls SET state=?,result=? WHERE url=?',(r['state'],json.dumps(r,ensure_ascii=False),row['url']))
            for a in r.get('links',[]):self.add(a['url'],row['url'],a['text'])
            for a in r.get('alternates',[]):self.add(a,row['url'],'language alternate')
            self.db.commit();count+=1
            print(count,r['state'],r.get('status'),row['url'],flush=True)
        self.export()

    def export(self):
        rows=[dict(r) for r in self.db.execute('SELECT * FROM urls ORDER BY priority,url')]
        (self.root/'manifest.json').write_text(json.dumps({'date':DATE,'counts':{s:sum(r['state']==s for r in rows) for s in sorted({r['state'] for r in rows})},'sources':[{**json.loads(r['result'])} if r['result'] else {'url':r['url'],'state':r['state'],'discoveredOn':r['discovered_on'],'label':r['label']} for r in rows]},ensure_ascii=False,indent=2))
        print('STATE', {s:sum(r['state']==s for r in rows) for s in sorted({r['state'] for r in rows})},flush=True)

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--cache',default='.uaeu-crawl');p.add_argument('--delay',type=float,default=1.0);p.add_argument('--max-pages',type=int,default=0);p.add_argument('--seed-map',action='append',default=[]);p.add_argument('--export-only',action='store_true');a=p.parse_args()
    crawler=Crawler(a.cache,max(1,a.delay))
    if a.export_only:crawler.export()
    else:
        crawler.seed(a.seed_map)
        try:crawler.run(a.max_pages)
        finally:crawler.export()
