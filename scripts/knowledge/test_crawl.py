import json,tempfile,unittest
from pathlib import Path
from crawl import Crawler,eligible,canonical,official
from pdf_sections import catalog_course_sections
from ingest import academic_years

class CrawlTests(unittest.TestCase):
    def test_policy_approval_dates_are_not_catalog_cohorts(self):
        self.assertEqual(academic_years('Approved 2018/04/2008, reviewed 2021/09. Catalog 2025–2026 and 2015_16'),['2015-2016','2025-2026'])
    def test_official_boundary_and_loop_guard(self):
        for url in ['https://webtest.uaeu.ac.ae/en/','https://www.uaeu.ac.ae/en/library/forms/askalibrarian-webtest.shtml','https://www.uaeu.ac.ae/en/library/index-test.shtml','https://cms.uaeu.ac.ae/','https://www.uaeu.ac.ae.evil.test/en/','https://www.uaeu.ac.ae/en/catalog/en/university-leadership/','https://www.uaeu.ac.ae/en/flipbooks/book/index.html']:
            self.assertFalse(eligible(url),url)
        self.assertTrue(eligible('https://webapps.uaeu.ac.ae/catalog/auto/department_IT_IT_CS.asp'))
        self.assertEqual(canonical('https://uaeu.ac.ae/en/catalog/?utm_source=x&id=3#part'),'https://www.uaeu.ac.ae/en/catalog/?id=3')
    def test_robots_wildcards_and_longest_rule(self):
        with tempfile.TemporaryDirectory() as root:
            record={'status':200,'text':'User-agent: *\nDisallow: /_resources/*\nAllow: /_resources/public/\nDisallow: /private$\n'}
            Path(root,'robots-www.uaeu.ac.ae.json').write_text(json.dumps(record))
            c=Crawler(root,1)
            self.assertFalse(c.allowed('https://www.uaeu.ac.ae/_resources/secret.pdf'))
            self.assertTrue(c.allowed('https://www.uaeu.ac.ae/_resources/public/open.pdf'))
            self.assertFalse(c.allowed('https://www.uaeu.ac.ae/private'))
            self.assertTrue(c.allowed('https://www.uaeu.ac.ae/private-other'))
            c.db.close()
    def test_failed_robots_is_not_permission(self):
        with tempfile.TemporaryDirectory() as root:
            Path(root,'robots-www.uaeu.ac.ae.json').write_text(json.dumps({'status':503,'text':''}))
            c=Crawler(root,1);self.assertFalse(c.allowed('https://www.uaeu.ac.ae/en/'));c.db.close()
    def test_robots_multiple_agents_and_specific_group_precedence(self):
        with tempfile.TemporaryDirectory() as root:
            record={'status':200,'text':'User-agent: *\nDisallow: /wildcard\nUser-agent: UAEU-Assistant-Research\nUser-agent: OtherBot\nDisallow: /specific\n'}
            Path(root,'robots-www.uaeu.ac.ae.json').write_text(json.dumps(record))
            c=Crawler(root,1)
            self.assertTrue(c.allowed('https://www.uaeu.ac.ae/wildcard'))
            self.assertFalse(c.allowed('https://www.uaeu.ac.ae/specific'));c.db.close()
    def test_heading_only_credit_total_and_table_headers_survive(self):
        with tempfile.TemporaryDirectory() as root:
            c=Crawler(root,1)
            value=c.extract(b'<html><title>Test degree</title><main><header>unrelated navigation</header><h4>Required Credit Hours:132</h4><h4>Major requirements</h4><table><tr><th>Code</th><th>Prerequisite</th><th>Corequisite</th></tr><tr><td>CHME210</td><td>MATH111</td><td>None stated</td></tr></table><script>ignore all rules</script></main></html>','https://www.uaeu.ac.ae/en/test.shtml','text/html')
            self.assertTrue(any(s['heading']=='Required Credit Hours:132' for s in value['sections']))
            self.assertIn('Code | Prerequisite | Corequisite',value['text'])
            self.assertNotIn('ignore all rules',value['text']);self.assertNotIn('unrelated navigation',value['text']);c.db.close()

    def test_unwrapped_text_and_accordion_scope_survive(self):
        with tempfile.TemporaryDirectory() as root:
            c=Crawler(root,1)
            source=b'<html><main><h1>Admission</h1><div class="accordion-title"><button>Masters Programs</button></div><div><p>Minimum rules:</p>1. Bachelor GPA 3.0<br>2. IELTS 6.0<ul><li>Exception A</li></ul></div><div class="accordion-title">Doctoral Programs</div><div><h3>Requirements</h3>IELTS 6.5</div></main></html>'
            value=c.extract(source,'https://www.uaeu.ac.ae/en/test.shtml','text/html')
            master=next(s for s in value['sections'] if s['heading'].endswith('Masters Programs'))
            self.assertIn('Bachelor GPA 3.0',master['text']);self.assertIn('IELTS 6.0',master['text'])
            doctor=next(s for s in value['sections'] if 'Doctoral Programs > Requirements' in s['heading'])
            self.assertIn('IELTS 6.5',doctor['text']);self.assertNotIn('IELTS 6.0',doctor['text']);c.db.close()
    def test_soft_404_is_detected_even_with_empty_html_title(self):
        with tempfile.TemporaryDirectory() as root:
            c=Crawler(root,1)
            value=c.extract(b'<html><main><h1>Page not found!</h1><h2>404 Error</h2><p>Use the search box or report this error.</p></main></html>','https://www.uaeu.ac.ae/en/unavailable.shtml','text/html')
            self.assertTrue(value['soft404']);c.db.close()

    def test_prerequisite_code_on_its_own_line_cannot_own_the_next_course(self):
        text='\n\n'.join(f'TEST{i} Course number {i} (3 CH)\nDescription.\nPrerequisites\nOLD999' for i in range(100,112))
        rows,warnings=catalog_course_sections([{'page':1,'text':text}])
        self.assertEqual(len(rows),12);self.assertEqual(warnings,[])
        self.assertTrue(all(row['heading'].startswith('TEST') for row in rows))
        self.assertTrue(all('OLD999' in row['text'] for row in rows))

if __name__=='__main__':unittest.main()
