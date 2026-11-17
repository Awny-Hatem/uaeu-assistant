"""Coordinate-aware plan extraction. Never repair a printed arithmetic mismatch silently."""
import json,re,datetime,sqlite3
from pathlib import Path
import pdfplumber
ROOT=Path(__file__).resolve().parents[2];CACHE=ROOT/'.profile-source-cache'
source={x['id']:x for x in json.loads((CACHE/'manifest.json').read_text())}
identities=set(json.loads((ROOT/'data/course-code-identities.json').read_text())['codes'])
DB=sqlite3.connect('file:'+str(ROOT/'data/corpus/search.sqlite')+'?mode=ro',uri=True)
registry={}; historical={}
for data, in DB.execute("select data from chunks where json_extract(data,'$.courseCode') is not null and json_extract(data,'$.courseCode') != ''"):
 c=json.loads(data);code=c['courseCode']
 if '.pdf' in c.get('url','') and 'course' in c['url'].lower() and code not in historical:
  pg=re.search(r'Source PDF page:\s*(\d+)',c['text']);historical[code]={'code':code,'title':c['title'],'url':c['url']+('#page='+pg[1]if pg else ''),'text':c['text'],'sourceVerified':'2026-11-04','historical':True,'years':c.get('years',[])}
 if '/courses/' in c.get('url','') and '.shtml' in c['url'] and code not in registry:
  registry[code]={'code':code,'title':c['title'],'url':c['url'],'text':c['text'],'sourceVerified':'2026-11-04'}
for code,record in historical.items():
 if code not in registry:registry[code]=record
plans=[]
for name in ['it','cs','mechanical','chemical','economics','ce']:
 with pdfplumber.open(CACHE/(name+'-plan.pdf'))as pdf:
  for pn,page in enumerate(pdf.pages,1):
   words=[w for w in page.extract_words(x_tolerance=.4,y_tolerance=.2)if w.get('upright',True)]
   ys=sorted(set(round(w['top'],1)for w in words if w['text']=='Semester'))
   headerYs=[]
   for y in ys:
    ws=sorted([w for w in words if abs(w['top']-y)<.4],key=lambda w:w['x0'])
    if sum(w['text']=='CH' for w in ws)==2:headerYs.append(y)
   prev=0
   for j,hy in enumerate(headerYs):
    # Heading is above this particular table, not a title floating at the end of extracted text.
    prior=[w for w in words if prev<=w['top']<hy-1]
    lines={}
    for w in prior:lines.setdefault(round(w['top'],0),[]).append(w)
    heading=' '.join(' '.join(w['text'] for w in sorted(v,key=lambda w:w['x0']))for y,v in sorted(lines.items()))
    match=re.search(r'((?:Bachelor|Master).+?)\s+Model Study Plan\s*\((\d{4})[-–](\d{4}) Cohort',heading)
    if not match:prev=hy;continue
    program=match[1].strip();year=int(match[2]);track=None
    if name=='ce'and year>=2026:
     program='Bachelor of Science in Computer and Artificial Intelligence Engineering'
     track='AI Systems Engineering'if 'Concentration 1:'in heading else 'Robotics and Autonomous Systems'if 'Concentration 2:'in heading else 'General Computer and AI Engineering Pathway'
    entry='Spring' if re.search('from the Spring',heading,re.I)else 'Fall'
    hs=sorted([w for w in words if abs(w['top']-hy)<.4],key=lambda w:w['x0'])
    semheads=[w for w in hs if w['text']=='Semester'];ch=[w for w in hs if w['text']=='CH']
    nextY=headerYs[j+1] if j+1<len(headerYs)else page.height
    laterHeads=[w['top']for w in words if hy+1<w['top']<nextY and w['text']=='Bachelor']
    end=min(laterHeads,default=nextY)-1
    terms=[];issues=[]
    for side in [0,1]:
     lo=semheads[side]['x0']-17;hi=(semheads[1]['x0']-17 if side==0 else page.width)
     h=[w for w in hs if lo<=w['x0']<hi];codeH=next(w for w in h if w['text']=='Code');courseH=next(w for w in h if w['text']=='Course');cx=ch[side]['x0']
     ws=[w for w in words if lo<=w['x0']<hi and hy+1<w['top']<end]
     grouped={}
     for w in ws:
      key=round(w['top']/.5)*.5;grouped.setdefault(key,[]).append(w)
     courses=[];start=hy;lastOrdinal=0;alternative=False
     for y,line in sorted(grouped.items()):
      line=sorted(line,key=lambda w:w['x0']);alternative=alternative or any(w['text']=='OR' for w in line);anchors=[w for w in line if courseH['x0']-14<=w['x0']<=codeH['x1']+6 and (re.fullmatch(r'[A-Z]{2,6}\d{3,4}(?:[-/][A-Za-z0-9]+)*',w['text'])or re.fullmatch('elective',w['text'],re.I))]
      amount=next((float(w['text'])for w in line if abs((w['x0']+w['x1'])/2-(cx+2))<4 and re.fullmatch(r'\d+(?:\.\d+)?',w['text'])),None)
      if anchors and amount is not None:
       a=anchors[0];title=' '.join(w['text']for w in line if w['x0']>a['x1']+.1 and w['x1']<cx-1)
       kind=' '.join(w['text']for w in line if w['x0']>cx+1 and not(re.fullmatch(r'\d+(?:\.\d+)?',w['text'])and abs((w['x0']+w['x1'])/2-(cx+2))<4))
       options=re.findall(r'[A-Z]{2,6}\d{3,4}',a['text']);slash=re.fullmatch(r'([A-Z]{2,6})(\d{3,4})/(\d{3,4})',a['text']);options=[slash[1]+slash[2],slash[1]+slash[3]]if slash else options;elective=not options
       code=options[0]if len(options)==1 else None
       if alternative and courses and courses[-1]['credits']==amount:
        previous=courses.pop();options=([previous['code']]if previous['code']else previous['options'])+options;code=None;title=previous['title']+' OR '+title;alternative=False
       courses.append({'code':code,'options':options if len(options)>1 else [],'title':title,'credits':amount,'type':kind,'elective':elective,'catalogUrl':registry.get(code,{}).get('url'),'catalogVerified':code in registry if code else bool(options)and all(x in registry for x in options),'optionCatalogs':[{'code':x,'url':registry[x]['url']}for x in options if x in registry],'sourceRowY':y})
      elif amount is not None and courses and amount>=sum(c['credits']for c in courses)-1:
       labels=[w for w in ws if start<w['top']<y+1 and abs(w['x0']-semheads[side]['x0'])<10 and re.fullmatch(r'[1-9]|1[0-2]|\(Fall\)|\(Spring\)|Summer',w['text'])]
       ordinal=next((int(w['text'])for w in labels if w['text'].isdigit()),None)
       season=next((w['text'].strip('()')for w in labels if w['text']in ['(Fall)','(Spring)','Summer']),None)
       if ordinal is None and any('Summer'==w['text']for w in ws if start<w['top']<y+2):season='Summer';ordinal=lastOrdinal+1.5
       if ordinal is None:issues.append(f'Unresolved semester near PDF y={y}')
       else:
        lastOrdinal=ordinal;computed=sum(c['credits']for c in courses)
        terms.append({'ordinal':ordinal,'year':int((ordinal-1)//2)+1,'semester':0 if season=='Summer'else (int(ordinal)-1)%2+1,'season':season,'courses':courses,'printedCredits':amount,'computedCredits':computed})
        if computed!=amount:issues.append(f'Semester {ordinal} subtotal {computed} != printed {amount}')
       courses=[];start=y+1
     if courses:issues.append(f'Unterminated course group side {side}')
    total=re.search(r'Total Degree Credit hours:\s*(\d+)',heading,re.I)
    total=int(total[1])if total else None;computed=sum(t['computedCredits']for t in terms)
    if total!=computed:issues.append(f'Plan sum {computed} != printed degree total {total}')
    if not terms:issues.append('No semesters extracted')
    terms.sort(key=lambda t:t['ordinal'])
    missing=sorted({code for t in terms for c in t['courses']for code in ([c['code']]if c['code']else c['options'])if code not in registry})
    plans.append({'id':f'{name}-{year}-{entry.lower()}'+('-'+('ai-systems'if track=='AI Systems Engineering'else 'robotics'if track=='Robotics and Autonomous Systems'else 'general')if track else ''),'program':program,'track':track,'rawHeading':heading,'cohortStart':year,'cohortOnwards':'Cohort onwards' in heading,'catalogYear':f'{year}/{year+1}','entrySeason':entry,'totalCredits':total,'sourceUrl':source[name+'-plan']['url'],'sourceSha256':source[name+'-plan']['sha256'],'sourceFetchedAt':source[name+'-plan']['fetchedAt'],'page':pn,'extraction':'pdfplumber coordinate rows and independently printed semester totals','validation':{'totalsPass':not issues,'issues':issues,'unlinkedCourseCodes':missing,'allCatalogLinksVerified':not missing},'terms':terms})
    prev=end
out=ROOT/'data/academic';out.mkdir(exist_ok=True)
(out/'study-plans.json').write_text(json.dumps({'schemaVersion':1,'plans':plans},ensure_ascii=False,indent=2)+'\n')
(out/'course-records.json').write_text(json.dumps({'schemaVersion':1,'records':registry},ensure_ascii=False,indent=2)+'\n')
print(json.dumps([{'id':p['id'],'terms':len(p['terms']),'total':p['totalCredits'],**p['validation']}for p in plans],indent=2))
