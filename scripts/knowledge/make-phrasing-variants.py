"""Build examiner_100_phrasing.json: harder phrasing variants per scenario.

Each scenario keeps its main question, expected facts, checks and sources.
Its variants are replaced by three deterministic perturbations:
  1. typo  - common misspellings / swapped letters, lower case, no '?'
  2. short - casual compressed form (filler words dropped, lower case)
  3. ar-typo - the Arabic variant with everyday spelling slips
Facts and rubric are unchanged, so any failure is phrasing sensitivity.
"""
import json, re, sys
SRC='examiner-scenarios/examiner_100.json'; OUT='examiner-scenarios/examiner_100_phrasing.json'
TYPOS={'uaeu':'uaue','founded':'fouded','established':'establised','prerequisites':'prerequisits','prerequisite':'prerequisit',
 'tuition':'tution','admission':'admision','admissions':'admisions','requirements':'requirments','requirement':'requirment','credits':'credts',
 'credit':'cradit','courses':'cources','course':'cours','university':'univeristy','located':'locted','colleges':'collages','college':'collage',
 'engineering':'enginering','computer':'computr','science':'sceince','semester':'semster','scholarship':'scholorship','scholarships':'scholorships',
 'graduate':'gradute','program':'progam','programs':'progams','deadline':'dedline','required':'requred','elective':'elctive','electives':'elctives',
 'information':'infomation','technology':'technolgy','business':'buisness','medicine':'medecine','calendar':'calender','registration':'registeration',
 'library':'libary','housing':'housng','minimum':'minimun','master':'mastr','bachelor':'bachlor','corequisite':'corequisit','transfer':'tranfer',
 'withdraw':'withdrow','policy':'polcy','students':'studnets','student':'studnet','apply':'aply','hours':'hourse','fees':'fess'}
FILLER=set('what is are the does do for of a an can i to at in please tell me about which there would could should be its it this that'.split())
def swap(word):
    return word[:2]+word[3]+word[2]+word[4:] if len(word)>=6 else word
def typo(q):
    words=re.findall(r"\w+|\W+",q); hit=0; out=[]
    for w in words:
        lw=w.lower()
        if lw in TYPOS and hit<2: out.append(TYPOS[lw]); hit+=1
        else: out.append(lw)
    s=''.join(out)
    if not hit:
        longest=max(re.findall(r'[a-z]{6,}',s) or [''],key=len)
        if longest: s=s.replace(longest,swap(longest),1)
    return re.sub(r'\s*\?+\s*$','',s).strip()
def short(q):
    keep=[w for w in re.findall(r"[\w/'’.%-]+",q.lower()) if w not in FILLER]
    return (' '.join(keep)).rstrip('.')+'?'
AR=[('جامعة الإمارات','جامعه الامارات'),('أ','ا'),('إ','ا'),('ى ','ي '),('ة ','ه '),('ة؟','ه؟'),('؟','')]
def ar_typo(q):
    for a,b in AR: q=q.replace(a,b)
    return q.strip()
d=json.load(open(SRC,encoding='utf-8'))
for c in d['cases']:
    first,rest=c['turns'][0],c['turns'][1:]
    arabic=c.get('arabicQuestion') or next((v for v in c['variants'] if isinstance(v,str) and re.search('[؀-ۿ]',v)),None)
    if isinstance(arabic,list): arabic=arabic[0]
    kinds=['typo','short-casual']+(['arabic-typo'] if arabic else [])
    made=[typo(first),short(first)]+([ar_typo(arabic)] if arabic else [])
    # Multi-turn scenarios perturb the opening turn and keep the follow-up.
    c['variants']=[{'turns':[v,*rest],'kind':k} for v,k in zip(made,kinds)] if rest else made
    c['variantKinds']=kinds
d['title']='UAEU Assistant examiner 100 - harder phrasing pass (typos, casual short forms, Arabic spelling slips)'
d['methodology']=__doc__.strip()
for k in ('currentCandidate','latestAutomatedResults'): d.pop(k,None)
json.dump(d,open(OUT,'w',encoding='utf-8'),ensure_ascii=False,indent=2)
for c in d['cases'][:4]+d['cases'][40:42]: print(c['id'],c['variants'])
print(sum(len(c['variants']) for c in d['cases']),'variants')
