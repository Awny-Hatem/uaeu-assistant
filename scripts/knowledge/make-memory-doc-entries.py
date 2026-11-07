"""Render FR3/FR4 results as Google Doc log entries in the shared testing format.

Usage: python3 scripts/knowledge/make-memory-doc-entries.py memory-v9 browser-memory-v9 > reports/memory-personalization/google-doc-entries.txt
Each scenario: tester, date, version, question, expected, official source,
complete conversation (every turn, full reply, sources shown), result,
what went wrong, source relevance and speed. Labels: [Memory] / [Personalization].
"""
import json, re, sys

label, browser_label = sys.argv[1], sys.argv[2]
BUILD = sys.argv[3] if len(sys.argv) > 3 else 'memory-v9'
run = json.load(open(f'reports/memory-personalization/{label}.json', encoding='utf-8'))
browser = json.load(open(f'reports/memory-personalization/{browser_label}.json', encoding='utf-8'))
ICON = {'correct': '✅ Correct', 'partial': '⚠️ Partly correct', 'incorrect': '❌ Incorrect'}
TAG = {'followup': '[Memory]', 'followup-2turn': '[Memory]', 'personalization': '[Personalization]', 'guest': '[Personalization]', 'control': '[Personalization]'}
KIND = {'followup': 'Multi-turn follow-up', 'followup-2turn': 'Two-turn follow-up (source-reviewed fixture)', 'personalization': 'Signed-in personalization', 'guest': 'Guest comparison', 'control': 'Control / privacy'}

def expected(grade):
    out = []
    for c in grade['checks']:
        nums = re.findall(r'\(\?<!\\\\d\)(\d+)\(\?!\\\\d\)', json.dumps(c['any']))
        if nums: out.append(f"{nums[0]} credit hours")
        elif c['name'] == 'says it used the saved profile': out.append('says it used the saved profile')
        elif c['name'] in ('answers in Arabic', 'answers in English'): out.append(c['name'].replace('answers', 'reply'))
        else: out.append(c['name'])
    return '; '.join(dict.fromkeys(out))

lines = []
for r in run['results']:
    grades = r.get('turnGrades') or [None] * (len(r['turns']) - 1) + [{'checks': r['checks'], 'sources': r['sources']}]
    a = r['assessment']
    graded = [(i, g) for i, g in enumerate(grades) if g]
    lines.append(f"{TAG[r['suite']]} {r['id']} — {KIND[r['suite']]} ({len(r['turns'])} turn{'s' if len(r['turns']) > 1 else ''})")
    lines.append('Tester name: Claude (continuing Codex)')
    lines.append('Date: 7 November 2026')
    lines.append(f"Version tested: Local — http://localhost:3003/ — feat/memory-personalization (build {BUILD})")
    prof = r.get('profile')
    who = 'Guest (no account)' if not prof else f"Signed-in test account; saved profile: major {prof.get('major') or '(none)'}, year {prof.get('academicYear')}" + (f", language {prof['language']}" if prof.get('language') else '') + (', student ID saved' if prof.get('studentId') else '')
    lines.append(f'Who asked: {who}. Each message was sent alone; earlier turns came only from server memory.')
    lines.append('Question or scenario: ' + ' → '.join(r['turns']))
    lines.append('Expected answer: ' + ' | '.join(f"turn {i+1}: {expected(g)}" for i, g in graded) + (f" | must not contain: {', '.join(r.get('forbidden') or [])}" if r.get('forbidden') else ''))
    srcs = sorted({s for _, g in graded for s in (g.get('sources') or [])})
    lines.append('Official UAEU source supporting the expected answer: ' + (', '.join(srcs) if srcs else 'Not a sourced fact (behaviour check: ' + (r.get('basis') or 'see expected answer') + ')'))
    lines.append('Complete conversation:')
    slow = []
    for t in r['conversation']:
        p = t.get('payload') or {}
        lines.append(f"Student: {t['user']}")
        lines.append('Assistant: ' + (p.get('content') or f"[HTTP {t.get('status')}]").replace('\n\n', '\n'))
        cites = [c.get('url') for c in p.get('citations') or [] if c.get('url')]
        lines.append('Sources shown: ' + (', '.join(cites) if cites else 'none'))
        if t.get('seconds', 0) > 10: slow.append(f"{t['seconds']}s")
    lines.append(f"Result: {ICON[a['result']]}")
    wrong = '; '.join(a.get('missing') or []) + ('; unwanted: ' + ', '.join(a.get('unrelated')) if a.get('unrelated') else '')
    lines.append('What went wrong, if anything: ' + (wrong or 'Nothing.'))
    lines.append('Was the cited source relevant? ' + ('Yes, the expected official page was cited.' if a.get('sourcePass') and srcs else 'Not applicable (no source required for this check).' if not srcs else 'No, the expected official page was not cited.'))
    lines.append('Was the response unusually slow? ' + ('Yes: ' + ', '.join(slow) if slow else 'No (' + ', '.join(f"{t.get('seconds')}s" for t in r['conversation']) + ').'))
    lines.append('')

lines.append('[Memory] [Personalization] Browser test — sign in, ask, refresh, restart the server, continue')
lines.append('Tester name: Claude (continuing Codex)')
lines.append('Date: 7 November 2026')
lines.append('Version tested: Local — http://localhost:3000/ — feat/memory-personalization (build memory-v9), system Chrome via Playwright; the server process was stopped and started again between the two phases.')
for s in browser['steps']:
    lines.append(f"{'✅' if s['pass'] else '❌'} ({s['phase']}) {s['name']}" + (f" — {s.get('answer')}" if s.get('answer') else ''))
lines.append(f"Result: {browser['summary']['passed']}/{browser['summary']['passed'] + browser['summary']['failed']} steps passed.")
lines.append('')
print('\n'.join(lines))
