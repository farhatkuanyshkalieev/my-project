"""Writes the static vector elements of the intro to exports/graphics/."""
import json, pathlib, shutil
R = pathlib.Path(__file__).resolve().parent.parent
G = R / 'exports/graphics'; G.mkdir(parents=True, exist_ok=True)
svg = (R / 'assets/viking90_door_section_traced.svg').read_text()
paths = [l for l in svg.splitlines() if l.startswith('<path')]
head = '<?xml version="1.0" encoding="UTF-8"?>\n'
(G / 'section_viking90_lines.svg').write_text(head +
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 924 463" width="924" height="463">\n'
    '<g fill="none" stroke="#1f1f1f" stroke-width="1.6" stroke-linejoin="round">\n' + '\n'.join(paths) + '\n</g></svg>\n')
solid = json.loads((R / 'assets/viking90_door_section_solid.json').read_text())
d = ''.join('M' + 'L'.join(f'{x},{y}' for x, y in r) + 'Z' for s in solid['shapes'] for r in [s['outer'], *s['holes']])
(G / 'section_viking90_solid.svg').write_text(head +
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 924 463" width="924" height="463">\n'
    f'<path fill="#d8d9db" fill-rule="evenodd" d="{d}"/></svg>\n')
shutil.copy(R / 'assets/logo.png', G / 'logo_therminal_mark_raster.png')
print('svg elements written')
