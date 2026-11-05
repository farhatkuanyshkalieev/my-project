"""Builds index.html from index.template.html: inlines the traced VIKING 90 section and the storyboard."""
import json, pathlib
here = pathlib.Path(__file__).parent
tpl = (here/'index.template.html').read_text()
svg = (here/'assets/viking90_door_section_traced.svg').read_text()
paths = [l for l in svg.splitlines() if l.startswith('<path')]
shots = json.loads((here/'storyboard.json').read_text())
board = []
for s in shots:
    board.append(f'''<article class="shot">
      <div class="pair">
        <figure><img src="assets/ref/{s["ref"]}" alt="Кадр референса, {s["ref_t"]} с" loading="lazy"><figcaption>референс {s["ref_t"]} с</figcaption></figure>
        <figure><img src="assets/frames/{s["frame"]}" alt="Кадр прототипа THERMINAL, {s["t"]} с" loading="lazy"><figcaption>THERMINAL {s["t"]} с</figcaption></figure>
      </div>
      <h3><span>{s["title"]}</span><span class="mono">{s["range"]}</span></h3>
      <p>{s["note"]}</p>
    </article>''')
out = (tpl.replace('{{SECTION_PATHS}}', '\n'.join(p.replace('<path ', '<path class="sec" ') for p in paths))
          .replace('{{SECTION_PATHS_PLAIN}}', ''.join(paths))
          .replace('{{BOARD}}', '\n'.join(board)))
(here/'index.html').write_text(out)
print('index.html', len(out))
