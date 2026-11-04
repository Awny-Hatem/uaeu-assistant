"""Parse the official public PROGRAMS XML without inventing course/degree rules."""
import collections,re
from urllib.parse import urljoin,urlsplit
from lxml import etree

def parse_program_feed(raw,url):
    root=etree.fromstring(raw,etree.XMLParser(resolve_entities=False,no_network=True))
    if root.tag!='PROGRAMS':return None
    records=[];sections=[];links=[];groups=collections.defaultdict(list)
    def official(target):
        p=urlsplit(target);return p.scheme=='https' and (p.hostname=='uaeu.ac.ae' or (p.hostname or '').endswith('.uaeu.ac.ae')) and not re.search('webtest|cms',p.hostname or '',re.I)
    for item in root.findall('PROGRAM'):
        values={child.tag:' '.join(''.join(child.itertext()).split()) for child in item}
        title=values.get('TITLE','');target=urljoin(url,values.get('URL_CATALOG',''))
        if not title or not values.get('URL_CATALOG') or not official(target):continue
        qual='accelerated' if re.search('accelerated',title,re.I) else 'minor' if re.match('Minor',title,re.I) else 'microcredential' if re.search('micro.?credential',title,re.I) else 'diploma' if re.search('diploma',title,re.I) else 'doctorate' if re.match('Doctor of (?!Medicine)|Doctorate',title,re.I) else 'master' if re.match('Master',title,re.I) else 'bachelor' if re.match('Bachelor|Doctor of Medicine',title,re.I) else 'general-education'
        level='undergraduate' if qual in ['bachelor','minor','general-education'] or values.get('LEVEL')=='Undergraduate' else 'postgraduate'
        record={**values,'program':title,'url':target,'qualification':qual,'degreeLevel':level};records.append(record)
        topic=re.sub(r'^/(?:en|ar)/','/',urlsplit(target).path);topic=re.sub(r'\.(?:s?html?|aspx?)$','',topic)
        text='\n'.join(f'{key}: {values[key]}' for key in ['TITLE','TITLE_AR','COLLEGE_NAME','COLLEGE_NAME_AR','DEPARTMENT_NAME','DEPARTMENT_NAME_AR','PROGRAM_ID','AWARD_LEVEL','LEVEL','DESCRIPTION','STUDYPLAN_URL'] if values.get(key))
        sections.append({'heading':title+' — published program-finder record','text':text,'program':title,'college':values.get('COLLEGE_NAME',''),'qualification':qual,'degreeLevel':level,'topicId':topic})
        groups[(values.get('COLLEGE_NAME',''),qual,level)].append(record)
        links.append({'url':target,'text':title})
        for key in ['STUDYPLAN_URL']:
            if values.get(key):
                link=urljoin(url,values[key])
                if official(link):links.append({'url':link,'text':title+' model study plan'})
    for (college,qual,level),items in groups.items():
        text='Published catalog listing only; this does not guarantee an open intake or individual eligibility. Qualification group: '+qual+'.\n'+'\n'.join(' | '.join([x['TITLE'],x.get('TITLE_AR',''),x['url']]) for x in items)
        sections.append({'heading':college+' — '+qual+' programs directory','text':text,'college':college,'qualification':qual,'degreeLevel':level})
    return {'kind':'xml-program-finder','title':'UAEU Official Program Finder — bilingual catalog data','sections':sections,'links':links,'programRecords':records,'text':'\n\n'.join(x['heading']+'\n'+x['text'] for x in sections),'quality':'structured-official-program-xml'}
