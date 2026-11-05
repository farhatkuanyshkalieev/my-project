"""Builds intro/v3/index.html: inlines timeline.json, the VIKING 90 section (solid + lines), the 3D look and code.
The section data, 3D module and look are shared with ../concept."""
import json, pathlib, re
here = pathlib.Path(__file__).parent
C = here.parent / 'concept'
rd = lambda p: p.read_text(encoding='utf-8')
svg = rd(C / 'assets/viking90_door_section_traced.svg')
paths = [l for l in svg.splitlines() if l.startswith('<path')]
js = lambda t: t.replace('</script', '<\\/script')
rep = {
    '{{SECTION_PATHS}}': '\n'.join(p.replace('<path ', '<path class="sec" ') for p in paths),
    '{{TIMELINE}}': json.dumps(json.loads(rd(here / 'timeline.json')), ensure_ascii=False),
    '{{SOLID}}': json.dumps(json.loads(rd(C / 'assets/viking90_door_section_solid.json')), separators=(',', ':')),
    '{{LINES}}': json.dumps([re.search(r'd="([^"]+)"', p).group(1) for p in paths]),
    '{{LOOK}}': json.dumps(json.loads(rd(C / 'src/look.json'))),
    '{{PROFILE3D}}': js(rd(C / 'src/profile3d.js')),
    '{{ENGINE}}': js(rd(here / 'src/engine.js')),
}
out = rd(here / 'index.template.html')
for k, v in rep.items():
    assert k in out, k
    out = out.replace(k, v)
(here / 'index.html').write_text(out, encoding='utf-8')
print('index.html', len(out))
