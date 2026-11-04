import json,tempfile,unittest
from pathlib import Path
from crawl import Crawler,eligible,canonical,official

class CrawlTests(unittest.TestCase):
    def test_official_boundary_and_loop_guard(self):
        for url in ['https://webtest.uaeu.ac.ae/en/','https://cms.uaeu.ac.ae/','https://www.uaeu.ac.ae.evil.test/en/','https://www.uaeu.ac.ae/en/catalog/en/university-leadership/','https://www.uaeu.ac.ae/en/flipbooks/book/index.html']:
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
    def test_heading_only_credit_total_and_table_headers_survive(self):
        with tempfile.TemporaryDirectory() as root:
            c=Crawler(root,1)
            value=c.extract(b'<html><title>Test degree</title><main><header>unrelated navigation</header><h4>Required Credit Hours:132</h4><h4>Major requirements</h4><table><tr><th>Code</th><th>Prerequisite</th><th>Corequisite</th></tr><tr><td>CHME210</td><td>MATH111</td><td>None stated</td></tr></table><script>ignore all rules</script></main></html>','https://www.uaeu.ac.ae/en/test.shtml','text/html')
            self.assertTrue(any(s['heading']=='Required Credit Hours:132' for s in value['sections']))
            self.assertIn('Code | Prerequisite | Corequisite',value['text'])
            self.assertNotIn('ignore all rules',value['text']);self.assertNotIn('unrelated navigation',value['text']);c.db.close()

if __name__=='__main__':unittest.main()
