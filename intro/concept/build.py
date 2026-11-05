"""Builds index.html from index.template.html.
Inlines: timeline.json, the solid regions and traced lines of the VIKING 90 section, the 3D look,
src/profile3d.js, src/engine.js, the audio cue sheet and the storyboard."""
import json, pathlib, re
here = pathlib.Path(__file__).parent
rd = lambda p: (here / p).read_text(encoding='utf-8')
tpl = rd('index.template.html')
svg = rd('assets/viking90_door_section_traced.svg')
paths = [l for l in svg.splitlines() if l.startswith('<path')]
lines_d = [re.search(r'd="([^"]+)"', p).group(1) for p in paths]
cues_p = here / 'assets/audio/cues.json'
cues = cues_p.read_text(encoding='utf-8') if cues_p.exists() else '[]'
shots = json.loads(rd('storyboard.json'))
board = []
for s in shots:
    board.append(f'''<article class="shot">
      <div class="pair">
        <figure><img src="assets/ref/{s["ref"]}" alt="Кадр референса, {s["ref_t"]} с" loading="lazy"><figcaption>референс {s["ref_t"]} с</figcaption></figure>
        <figure><img src="assets/frames/{s["frame"]}" alt="Кадр THERMINAL v2, {s["t"]} с" loading="lazy"><figcaption>THERMINAL {s["t"]} с</figcaption></figure>
      </div>
      <h3><span>{s["title"]}</span><span class="mono">{s["range"]}</span></h3>
      <p>{s["note"]}</p>
    </article>''')
js_safe = lambda txt: txt.replace('</script', '<\\/script')
rep = {
    '{{SECTION_PATHS}}': '\n'.join(p.replace('<path ', '<path class="sec" ') for p in paths),
    '{{SECTION_PATHS_PLAIN}}': ''.join(paths),
    '{{BOARD}}': '\n'.join(board),
    '{{TIMELINE}}': json.dumps(json.loads(rd('timeline.json')), ensure_ascii=False),
    '{{SOLID}}': json.dumps(json.loads(rd('assets/viking90_door_section_solid.json')), separators=(',', ':')),
    '{{LINES}}': json.dumps(lines_d),
    '{{LOOK}}': json.dumps(json.loads(rd('src/look.json'))),
    '{{CUES}}': cues,
    '{{PROFILE3D}}': js_safe(rd('src/profile3d.js')),
    '{{ENGINE}}': js_safe(rd('src/engine.js')),
}
out = tpl
for k, v in rep.items():
    assert k in out, k
    out = out.replace(k, v)
(here / 'index.html').write_text(out, encoding='utf-8')
print('index.html', len(out))
