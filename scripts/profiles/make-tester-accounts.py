"""Fictional accounts constructed from explicit model rows, never from uploaded student records."""
import json,datetime,copy
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];plans=json.loads((ROOT/'data/academic/study-plans.json').read_text())['plans']
def category(c):
 t=c['type'].lower()
 if 'cluster' in t:
  import re
  m=re.search(r'cluster (\d+)',t);return 'gened-'+m[1]if m else 'gened'
 if 'theme' in t or 'gen' in t and 'ed' in t:return 'gened'
 if 'free elective' in t:return 'free'
 if 'major elective' in t:return 'major-elective'
 if 'college' in t:return 'college'
 if 'specialization' in t or 'concentration' in t:return 'major'
 if 'internship' in t:return 'internship'
 return 'unallocated'
TITLES={'gened':'General Education requirements','gened-1':'General Education — Cluster 1','gened-2':'General Education — Cluster 2','gened-3':'General Education — Cluster 3','college':'College requirements','major':'Major / specialization requirements','free':'Free electives','major-elective':'Major electives','internship':'Internship','unallocated':'Requirement category unresolved in extraction'}
def make(slug,label,planid,year,sem,scenario,minor=False,probation=False,repeat=False,transfer=False):
 p=next(p for p in plans if p['id']==planid);history=[];position=(year-1)*2+sem
 # Unselected elective slots remain unmet, rather than inventing completed courses.
 for t in p['terms']:
  if t['ordinal']>=position:continue
  season=t['season']or('Fall'if int(t['ordinal'])%2 else 'Spring');termYear=p['cohortStart']+(int(t['ordinal'])-1)//2+(1 if season in ['Spring','Summer']and p['entrySeason']=='Fall'else 0)
  for c in t['courses']:
   code=c['code']or('MATH130'if 'MATH130'in c['options']else next(iter(c['options']),None))
   if not code:continue
   history.append({'code':code,'title':c['title'],'credits':c['credits'],'term':{'season':season,'year':termYear},'status':'completed','grade':'D'if probation else 'B','repeated':False,'blockId':category(c),'disposition':'applied'})
 if repeat and history:
  chosen=next((c for c in history if c['blockId'].startswith('gened')and c['term']['season']=='Spring'),history[0]);item=copy.deepcopy(chosen);item.update(grade='F',status='failed',repeated=True,disposition='insufficient');chosen['repeated']=True;chosen['term']={'season':'Summer','year':chosen['term']['year']};history.append(item)
 if transfer and history:history[0].update(status='transfer-pending',grade='TR')
 blocks={}
 for t in p['terms']:
  for c in t['courses']:
   k=category(c)
   if k not in blocks:blocks[k]={'id':k,'title':TITLES[k],'requiredCredits':0,'courseCodes':[]}
   blocks[k]['requiredCredits']+=c['credits'];blocks[k]['courseCodes']+=([c['code']]if c['code']else c['options'])
 for t in p['terms']:
  if t['ordinal']!=position:continue
  for c in t['courses']:
   code=c['code']or('MATH130'if 'MATH130'in c['options']else next(iter(c['options']),None))
   if code:history.append({'code':code,'title':c['title'],'credits':c['credits'],'term':{'season':t['season']or('Fall'if sem==1 else'Spring'),'year':2026+(sem==2)},'status':'in-progress','grade':None,'repeated':False,'blockId':category(c),'disposition':'applied'})
 # Explicit deviations keep the fictional history consistent with published course rules.
 for c in history:
  if c['code']=='CSBP221':
   peer=next((x for x in history if x['code']=='CSBP319'),None)
   if peer:c['term']=copy.deepcopy(peer['term']);c['status']=peer['status'];c['grade']=peer['grade']
  if slug=='elm'and c['code']=='ELEC372':c.update(term={'season':'Fall','year':2026},status='in-progress',grade=None)
  if slug=='pine'and c['code']=='MECH384':c['term']={'season':'Summer','year':2024}
 if slug=='pine':history.append({'code':'MATH275','title':'Ordinary Differential Equations','credits':3,'term':{'season':'Spring','year':2024},'status':'completed','grade':'D','repeated':False,'blockId':None,'disposition':'fall-through'})
 if slug=='ash':history.append({'code':'CHEM115','title':'General Chemistry Laboratory I','credits':1,'term':{'season':'Spring','year':2024},'status':'completed','grade':'B','repeated':False,'blockId':None,'disposition':'fall-through'})
 if probation:
  for c in history:
   if c['status']=='completed':c['grade']='B'if c['term']['year']<=p['cohortStart']or c['term']=={'season':'Spring','year':p['cohortStart']+1}else'D'
 gpa_rows=[c for c in history if c['status']=='completed'];gpa=round(sum(c['credits']*(1 if c['grade']=='D'else 3)for c in gpa_rows)/sum(c['credits']for c in gpa_rows),2)if gpa_rows else None
 program=p['program'];college='College of Computing and Artificial Intelligence'if planid.startswith(('it-','cs-'))else 'College of Business and Economics'if planid.startswith('economics')else 'College of Engineering'
 profile={'schemaVersion':1,'displayName':label,'degree':'Bachelor','level':'UG','classification':['First Year','Second Year','Third Year','Fourth Year'][min(year-1,3)],'studentStatus':'Returning'if p['cohortStart']==2022 else 'Active','holds':[],'program':program,'college':college,'minors':['Minor in Artificial Intelligence']if minor else [],'track':None,'admitTerm':{'season':p['entrySeason'],'year':p['cohortStart']},'catalogYear':p['catalogYear'],'currentTerm':{'season':'Fall'if sem==1 else 'Spring','year':2026+(sem==2)},'modelPosition':{'year':year,'semester':sem},'academicStanding':'probation'if probation else 'good','overallGpa':gpa,'requiredCredits':p['totalCredits'],'blocks':list(blocks.values()),'courses':history,'planner':[],'provenance':{'kind':'fictional-tester','updatedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'sourceUrls':[p['sourceUrl']]}}
 if p['validation']['totalsPass']:
  upcoming=next((t for t in p['terms']if t['ordinal']==position+1),None)
  if upcoming:profile['planner']=[{'term':{'season':'Spring'if sem==1 else'Fall','year':2027 if sem==1 else 2026},'courseCodes':[c['code']for c in upcoming['courses']if c['code']],'status':'proposed'}]
 return {'slug':slug,'label':label,'scenario':scenario,'planId':planid,'profile':profile,'validation':{'semesterAndDegreeTotals':p['validation']['totalsPass'],'allCourseCatalogLinks':p['validation']['allCatalogLinksVerified'],'sourceIssues':p['validation']['issues'],'historyScope':'Model-derived fictional history plus documented prerequisite-driven delays. CSBP221 is aligned with CSBP319 after CSBP219; Elm delays ELEC372; Pine has an additional MATH275 attempt; Ash has an additional CHEM115 lab. Additional attempts are fall-through and do not inflate degree credits. Elective slots remain unselected. Unknown historical conditions are not certified.','readiness':'provisional-not-final-advising-fixture'}}
accounts=[make('cedar','Fictional Student Cedar','cs-2026-fall',1,1,'New undergraduate with no earned credits'),make('maple','Fictional Student Maple','cs-2025-fall',2,1,'Second-year CS student'),make('willow','Fictional Student Willow','it-2022-fall',4,1,'Returning older-catalog IT student'),make('birch','Fictional Student Birch','it-2025-fall',2,1,'IT cohort with a published arithmetic conflict; must not invent a resolved total'),make('elm','Fictional Student Elm','mechanical-2023-fall',4,1,'Mechanical Engineering approaching final project'),make('pine','Fictional Student Pine','mechanical-2022-fall',3,1,'Returning student reporting probation',probation=True),make('ash','Fictional Student Ash','chemical-2023-fall',4,1,'Repeated failed course followed by completion',repeat=True),make('olive','Fictional Student Olive','economics-2022-fall',3,1,'Returning Economics student with pending transfer evaluation',transfer=True),make('palm','Fictional Student Palm','it-2025-fall',2,1,'IT student with a declared AI minor; minor courses remain unmet and the degree-plan total remains disputed',minor=True)]
p=copy.deepcopy(accounts[0]['profile']);p.update(displayName='Fictional Student Juniper',degree='Master',level='PG',classification='Graduate',program='Master of Science in Information Technology Management',admitTerm={'season':'Fall','year':2026},catalogYear='2026/2027',currentTerm={'season':'Fall','year':2026},overallGpa=None,requiredCredits=30,courses=[],planner=[],blocks=[{'id':'core','title':'Core courses','requiredCredits':6,'courseCodes':['ITCO601','ITCO602']},{'id':'specialization','title':'Specialization courses','requiredCredits':12,'courseCodes':['ISBP631','ISBP632','ISBP637','ISBP639']},{'id':'option','title':'Thesis or non-thesis option requirements','requiredCredits':12,'courseCodes':[]}],provenance={'kind':'fictional-tester','updatedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'sourceUrls':['https://www.uaeu.ac.ae/en/cit/programs/graduate/master-of-science-in-information-technology-management.shtml']})
accounts.append({'slug':'juniper','label':'Fictional Student Juniper','scenario':'Graduate first-term student; a public curriculum is known, but an individual approved term plan is not supplied','planId':None,'profile':p,'validation':{'semesterAndDegreeTotals':None,'allCourseCatalogLinks':False,'sourceIssues':['No published semester-by-semester graduate model has been verified.'],'readiness':'provisional-not-final-advising-fixture'}})
for i,a in enumerate(accounts,1):
 a['studentId']='9900000'+str(i).zfill(4)
 if a['slug']=='palm':
  a['profile']['blocks'].append({'id':'minor-ai','title':'AI minor — allocation and cohort applicability pending','requiredCredits':18,'courseCodes':['CSBP219','CSBP319','CSBP301','CSBP411','CSBP476','CSBP441','CSBP491','CSBP475','CSBP477']})
  a['profile']['provenance']['sourceUrls'].append('https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/minor-in-artificial-intelligence.shtml')
  a['validation']['sourceIssues'].append('Minor requirement shown separately; approved course overlap and catalog applicability are not confirmed.')
(ROOT/'data/academic/tester-accounts.json').write_text(json.dumps({'schemaVersion':1,'warning':'All identities and academic histories are fictional. Fixtures are provisional until prerequisite and allocation audit completes.','accounts':accounts},ensure_ascii=False,indent=2)+'\n')
lines=['# Fictional tester accounts','','All identities are invented independently of the uploaded screenshots. These are provisional development fixtures, not ten certified complete academic audits. Unchosen electives remain unmet; prerequisite order and detailed requirement allocation still need validation.','']
for a in accounts:
 p=a['profile'];lines+=['## '+a['label'],'',f"- Selector: `{a['slug']}`",f"- Program: {p['program']}",f"- Catalog: {p['catalogYear']}; entry: {p['admitTerm']['season']} {p['admitTerm']['year']}",f"- Classification: {p['classification']}",f"- Passed attempt credits including nondegree courses: {sum(c['credits']for c in p['courses']if c['status']=='completed')}",f"- Applied earned degree credits: {sum(c['credits']for c in p['courses']if c['status']=='completed'and c['disposition']=='applied')}",'- Scenario: '+a['scenario'],'- Validation: '+json.dumps(a['validation'],ensure_ascii=False),'- Official sources: '+', '.join(p['provenance']['sourceUrls']),'']
(ROOT/'tester-accounts.md').write_text('\n'.join(lines)+'\n')
print('Created 10 explicitly provisional fictional fixtures; no private screenshot data used.')
