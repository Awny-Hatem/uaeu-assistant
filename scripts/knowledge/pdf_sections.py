"""Conservative geometry-based extraction for the recurring UAEU model-plan tables.
Only recognized 12-column layouts and unambiguous course cells become row facts.
Other layouts remain page excerpts with an explicit verification limitation.
"""
import re
import pdfplumber
CODE=re.compile(r'^[A-Z]{3,6}\d{3,4}$')

def model_plan_sections(file):
    sections=[];warnings=[];captions=set()
    with pdfplumber.open(file) as pdf:
        for page_number,page in enumerate(pdf.pages,1):
            previous_bottom=0;found=False
            for table in page.find_tables():
                rows=table.extract()
                if not rows or len(rows[0])!=12 or 'Semester' not in ' '.join(str(v) for v in rows[0] if v):continue
                caption=page.crop((0,max(previous_bottom,table.bbox[1]-48),page.width,table.bbox[1])).extract_text() or ''
                previous_bottom=table.bbox[3]
                caption=' '.join(caption.split())
                if not re.search(r'20\d{2}.*(?:Cohort|cohort)|(?:Cohort|cohort).*20\d{2}',caption):
                    warnings.append(f'page {page_number}: recognized grid without a reliable cohort caption');continue
                if caption not in captions:
                    captions.add(caption)
                    sections.append({'heading':caption+' — Degree credit requirement','text':'Model scope: '+caption+'\nSource PDF page: '+str(page_number),'page':page_number,'modelScope':caption})
                current=['',''];valid=0;semester_groups={}
                for row in rows[1:]:
                    for side,start in enumerate([0,6]):
                        semester=' '.join((row[start+1] or '').split())
                        if re.match(r'^\d+\s*\((?:Fall|Spring|Summer)\)',semester,re.I):current[side]=semester
                        code=''.join((row[start+2] or '').split());title=' '.join((row[start+3] or '').split());credit=''.join((row[start+4] or '').split());kind=' '.join((row[start+5] or '').split())
                        group=semester_groups.setdefault(current[side],{'rows':[],'ambiguous':[],'subtotal':None,'credits':0.0})
                        if not code:
                            if current[side] and not title and re.fullmatch(r'\d+(?:\.\d+)?',credit):group['subtotal']=credit
                            elif current[side] and title:
                                if re.fullmatch(r'\d+(?:\.\d+)?',credit):
                                    group['rows'].append(f'Uncoded published requirement — {title}; {credit} credit hours; {kind}')
                                    group['credits']+=float(credit)
                                else:group['ambiguous'].append(title)
                            continue
                        if not (CODE.fullmatch(code) and re.fullmatch(r'\d+(?:\.\d+)?',credit) and float(credit)<=20 and title and current[side]):
                            if code.lower()=='elective' and re.fullmatch(r'\d+(?:\.\d+)?',credit):
                                group['rows'].append(f'Elective slot — {title}; {credit} credit hours; {kind}');group['credits']+=float(credit);continue
                            group['ambiguous'].append(code)
                            warnings.append(f'page {page_number}, semester {current[side] or "unknown"}: ambiguous row {code!r}; raw PDF required');continue
                        heading=f'{caption} — Semester {current[side]} — {code} {title}'
                        text=f'Model scope: {caption}\nSource PDF page: {page_number}\nCourse code: {code}\nCourse name: {title}\nCredit hours: {credit}\nCourse type in this model: {kind or "not stated"}\nRecommended semester in this model: {current[side]}\nThis model row does not establish prerequisites, corequisites, present-day sections/seats or individual eligibility; consult the separate course catalog for prerequisite rules.'
                        sections.append({'heading':heading,'text':text,'page':page_number,'modelScope':caption});valid+=1
                        group['rows'].append(f'{code} {title}; {credit} credit hours; {kind}')
                        group['credits']+=float(credit)
                for semester,group in semester_groups.items():
                    if not semester or not group['rows']:continue
                    if group['subtotal'] is not None and abs(group['credits']-float(group['subtotal']))>0.001:
                        group['ambiguous'].append('extracted row credits do not match the published subtotal')
                    completeness='Complete unambiguous table rows for this semester.' if not group['ambiguous'] else 'Partial extraction only: ambiguous cells '+', '.join(group['ambiguous'])+'. Do not present this as a complete course list.'
                    body=f'Model scope: {caption}\nSource PDF page: {page_number}\nRecommended semester in this model: {semester}\n{completeness}\n'
                    if group['subtotal'] is not None:body+='Published semester subtotal: '+group['subtotal']+' credit hours.\n'
                    body+='Courses or elective slots in this model semester:\n'+'\n'.join(group['rows'])
                    sections.append({'heading':caption+' — Semester '+semester+' course list','text':body,'page':page_number,'modelScope':caption})
                found=found or valid>0
            if not found:warnings.append(f'page {page_number}: no safely recognized course-row layout; page excerpt retained separately')
    return sections,warnings


def catalog_course_sections(pages):
    """Split dated single-column catalog entries by their explicit code/title/CH
    heading. Reject headings containing a second code (possible column merge).
    No prerequisite, grade or equivalency is inferred from a course number.
    """
    header=re.compile(r'^[ \t]*([A-Z]{3,6})[ \t]?(\d{3,4})[ \t]+([^\n]{2,200}?)\s*\((\d+(?:\.\d+)?)\s*(?:CH|Credit\s+Hours?)\)\s*$',re.M|re.I)
    records=[];current=None;warnings=[]
    for page in pages:
        text=page['text'];matches=list(header.finditer(text))
        prefix=text[:matches[0].start()] if matches else text
        if current and prefix.strip():current['text']+='\n'+prefix
        for i,m in enumerate(matches):
            if current:records.append(current)
            code=m[1].upper()+m[2];title=' '.join(m[3].split());end=matches[i+1].start() if i+1<len(matches) else len(text)
            if re.search(r'\b[A-Z]{3,6}\s?\d{3,4}\b',title):
                warnings.append(f'page {page["page"]}: ambiguous multi-code heading {code}; raw page review required');current=None;continue
            current={'heading':code+' '+title,'text':f'Source PDF page: {page["page"]}\nPublished credit hours: {m[4]}\n'+text[m.end():end].strip(),'page':page['page']}
    if current:records.append(current)
    # A few accidental matches cannot replace a whole catalog's page evidence.
    if len(records)<10:return [],warnings+['Fewer than ten confidently recognized catalog entries; page excerpts retained']
    return records,warnings
