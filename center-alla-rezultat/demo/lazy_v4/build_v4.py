"""Build lazy_v4/index.html from lazy_v3/index.html.

Scene 1 (calendar + motivation) is copied byte-for-byte from v3.
Scenes 2-4, the figure and the transitions are replaced.
Usage: python3 build_v4.py
"""
from pathlib import Path

HERE = Path(__file__).parent
v3 = (HERE.parent / "lazy_v3" / "index.html").read_text(encoding="utf-8")

EXTRA_CSS = """
  .cam { position: absolute; inset: 0; transform-origin: 540px 960px; }
  .word { display: inline-block; white-space: pre; }
  .shine { position: absolute; top: 0; bottom: 0; width: 160px; border-radius: 82px;
           background: linear-gradient(100deg, rgba(255,255,255,0), rgba(255,255,255,.55), rgba(255,255,255,0)); }
  .big-num { font-weight: 900; font-size: 104px; line-height: 1.05; }
  .benefit span { white-space: nowrap; font-size: 36px; }
"""

SCENES_2_4 = """<!-- ===================== SCENE 2: Тоже я (simplified) ===================== -->
<div class="scene brand" id="s2"><div class="cam" id="cam2">
  <svg class="abs" width="1080" height="1920" style="left:0;top:0">
    <circle id="c2a" cx="1100" cy="1560" r="620" fill="#3CE0D7" opacity=".13"/>
    <circle id="c2b" cx="1100" cy="1560" r="470" fill="#3CE0D7" opacity=".12"/>
    <circle id="c2c" cx="900" cy="330" r="92" fill="#3CE0D7" opacity=".16"/>
  </svg>
  <div class="abs center" style="top:290px"><h1 id="s2title">Тоже я:</h1></div>
  <div class="abs center sub" id="s2sub" style="top:440px"></div>
  <svg class="abs" style="left:0; top:600px" width="1080" height="940" viewBox="0 0 1080 940">
    <defs>
      <radialGradient id="gZone"><stop offset="0" stop-color="#3CE0D7" stop-opacity=".95"/><stop offset="1" stop-color="#3CE0D7" stop-opacity="0"/></radialGradient>
      <filter id="soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="12"/></filter>
      <filter id="shadow" x="-20%" y="-10%" width="140%" height="130%"><feDropShadow dx="0" dy="18" stdDeviation="22" flood-color="#128C84" flood-opacity=".18"/></filter>
    </defs>
    <g id="waves2" fill="none" stroke="#3CE0D7" stroke-linecap="round"></g>
    <ellipse cx="540" cy="900" rx="190" ry="24" fill="#128C84" opacity=".08"/>
    <g filter="url(#shadow)"><g id="fig2"></g></g>
    <g id="zones2"></g>
  </svg>
  <div class="card" id="cmp2" style="left:90px; top:1560px; width:900px; height:250px; display:flex; align-items:center">
    <div style="flex:1; text-align:center"><div class="stat-label">Мои усилия</div><div class="big-num" id="effort" style="color:#A3A9B2">0%</div></div>
    <div style="width:2px; height:150px; background:#E3F4F2"></div>
    <div style="flex:1; text-align:center"><div class="stat-label">Работа мышц</div><div class="big-num" id="muscle" style="color:var(--turq-d)">0%</div></div>
  </div>
</div></div>

<!-- ===================== SCENE 3: Ленивый спорт ===================== -->
<div class="scene brand" id="s3"><div class="cam" id="cam3">
  <svg class="abs" width="1080" height="1920" style="left:0;top:0">
    <circle id="c3a" cx="-80" cy="1400" r="520" fill="#3CE0D7" opacity=".1"/>
    <circle id="c3b" cx="1100" cy="430" r="300" fill="#3CE0D7" opacity=".1"/>
  </svg>
  <div class="abs center" style="top:290px"><h1 id="s3title" style="font-size:112px"></h1></div>
  <div class="abs center sub" id="s3sub" style="top:420px; color:var(--turq-d); font-weight:700">30 минут · без нагрузки</div>
  <svg class="abs" style="left:0; top:540px" width="1080" height="880" viewBox="0 0 1080 880">
    <defs>
      <linearGradient id="gSkinB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D3DADC"/><stop offset="1" stop-color="#B9C3C6"/></linearGradient>
      <linearGradient id="gSkinA" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8EF0EA"/><stop offset="1" stop-color="#3CE0D7"/></linearGradient>
      <linearGradient id="gClothA" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1EBBB0"/><stop offset="1" stop-color="#128C84"/></linearGradient>
      <filter id="shadow3" x="-20%" y="-10%" width="140%" height="130%"><feDropShadow dx="0" dy="20" stdDeviation="24" flood-color="#128C84" flood-opacity=".22"/></filter>
      <filter id="glow3" x="-20%" y="-200%" width="140%" height="500%"><feGaussianBlur stdDeviation="10"/></filter>
      <clipPath id="scanClip"><rect id="scanRect" x="0" y="0" width="1080" height="0"/></clipPath>
    </defs>
    <ellipse id="sh1" cx="540" cy="830" rx="170" ry="22" fill="#128C84" opacity=".08"/>
    <ellipse id="sh2" cx="540" cy="830" rx="170" ry="22" fill="#128C84" opacity=".1"/>
    <g id="before3" filter="url(#shadow3)"></g>
    <g id="after3wrap" clip-path="url(#scanClip)"><g id="after3" filter="url(#shadow3)"></g></g>
    <g id="beam3"></g>
    <g id="tape3"></g>
    <g id="arrow3" fill="none" stroke="#1EBBB0" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" opacity="0">
      <path d="M490 380 l36 36 l-36 36"/><path d="M546 380 l36 36 l-36 36" opacity=".55"/>
    </g>
    <g id="sparks3" fill="#1EBBB0"></g>
  </svg>
  <div class="abs" id="lblBefore" style="left:190px; width:200px; top:1425px; text-align:center; opacity:0">
    <span class="pill" style="color:#7C878B">ДО</span></div>
  <div class="abs" id="lblAfter" style="left:670px; width:240px; top:1425px; text-align:center; opacity:0">
    <span class="pill" style="color:#fff; background:linear-gradient(90deg,#3CE0D7,#1EBBB0)">ПОСЛЕ</span></div>

  <div class="card benefit" id="b0" style="left:60px; top:1540px; width:470px"><div class="ic">
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none" stroke="#1EBBB0" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"><path d="M40 8C22 10 12 22 10 42"/><path d="M40 8c2 14-6 26-22 28"/><path d="M10 42l6-6"/></svg>
  </div><span>Без нагрузки</span></div>
  <div class="card benefit" id="b1" style="left:550px; top:1540px; width:470px"><div class="ic">
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none" stroke="#1EBBB0" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"><path d="M29 4L12 29h13l-3 19 18-26H27z"/></svg>
  </div><span>Тонус мышц</span></div>
  <div class="card benefit" id="b2" style="left:60px; top:1700px; width:470px"><div class="ic">
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none" stroke="#1EBBB0" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"><path d="M26 6c8 11 13 18 13 25a13 13 0 01-26 0c0-7 5-14 13-25z"/><path d="M20 33a6 6 0 006 6"/></svg>
  </div><span>Лимфодренаж</span></div>
  <div class="card benefit" id="b3" style="left:550px; top:1700px; width:470px"><div class="ic">
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none" stroke="#1EBBB0" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 6l4 12 12 4-12 4-4 12-4-12-12-4 12-4z"/><path d="M40 32l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/></svg>
  </div><span>Подтянутая кожа</span></div>
</div></div>

<!-- ===================== SCENE 4: CTA ===================== -->
<div class="scene brand" id="s4"><div class="cam" id="cam4">
  <svg class="abs" width="1080" height="1920" style="left:0;top:0">
    <circle id="c4a" cx="1100" cy="1560" r="620" fill="#3CE0D7" opacity=".13"/>
    <circle id="c4b" cx="1100" cy="1560" r="470" fill="#3CE0D7" opacity=".12"/>
    <circle id="c4c" cx="-60" cy="640" r="260" fill="#3CE0D7" opacity=".1"/>
  </svg>
  <div class="abs center" id="s4eyebrow" style="top:380px"><div class="eyebrow" style="color:var(--turq-d)">Ленивый спорт</div></div>
  <div class="abs center" style="top:440px"><h1 id="s4title" style="font-size:104px; line-height:1.05"></h1></div>
  <div class="abs center sub" id="s4sub" style="top:690px; color:var(--grey)">можно заморозить на неделю</div>
  <div class="card" id="s4stats" style="left:90px; top:960px; width:900px; height:250px; display:flex; align-items:center; justify-content:space-around; padding:0 20px">
    <div style="text-align:center"><div class="stat-val" id="n30" style="color:var(--turq-d)">0</div><div class="stat-label">минут за визит</div></div>
    <div style="width:2px; height:130px; background:#E3F4F2"></div>
    <div style="text-align:center"><div class="stat-val" style="color:var(--turq-d)">0</div><div class="stat-label">нагрузки</div></div>
    <div style="width:2px; height:130px; background:#E3F4F2"></div>
    <div style="text-align:center"><div class="stat-val" id="n1" style="color:var(--turq-d)">0</div><div class="stat-label">месяц</div></div>
  </div>
  <div class="btn" id="cta" style="top:1300px; overflow:hidden"><div class="shine" id="shine"></div><b>Напишите «ЛЕНЬ»</b><small>в директ @center.alla.rezultat</small></div>
  <div class="abs center" style="top:1700px; font-weight:600; font-size:32px; color:var(--grey)">Алматы · Аксай-1, 10/3 · аль-Фараби, 83</div>
  <div class="abs center demo" style="top:1830px">демо-концепт ролика</div>
</div></div>

<script>"""

FIGURE_JS = r"""/* ---------- female figure, front view; p=0 before (fuller), p=1 after ---------- */
function figure(cx, top, h, p) {
  const b = 1 - p;
  const outer = [[0, .042], [.035, .058], [.075, .165 + .015 * b], [.13, .160 + .02 * b], [.19, .150 + .05 * b],
    [.27, .108 + .075 * b], [.33, .102 + .092 * b], [.42, .176 + .068 * b], [.50, .182 + .06 * b],
    [.60, .146 + .05 * b], [.74, .090 + .03 * b], [.80, .080 + .02 * b], [.95, .052], [.99, .058]];
  const inner = [[.995, .016], [.80, .02], [.66, .006 + .012 * p], [.55, 0]];
  const right = outer.concat(inner).map(([y, w]) => [cx + w * h, top + y * h]);
  const left = right.slice().reverse().map(([x, y]) => [2 * cx - x, y]).slice(1, -1);
  const body = smooth(right.concat(left));
  const arms = [1, -1].map(s => smooth([
    [cx + s * (.145 + .012 * b) * h, top + .075 * h], [cx + s * (.190 + .02 * b) * h, top + .10 * h],
    [cx + s * (.210 + .045 * b) * h, top + .28 * h], [cx + s * (.226 + .055 * b) * h, top + .46 * h],
    [cx + s * (.200 + .05 * b) * h, top + .47 * h], [cx + s * (.176 + .04 * b) * h, top + .30 * h],
    [cx + s * (.146 + .03 * b) * h, top + .15 * h]]));
  return { body, arms, head: [cx, top - .052 * h, .058 * h, .070 * h] };
}

/* hair: voluminous mass behind the head down to the shoulders + a wavy lock over one shoulder */
function hairBack(hx, hy, rx, ry, h, top, sway) {
  const side = s => [[hx + s * rx * 1.30, hy - ry * 0.70], [hx + s * rx * 1.55, hy + ry * 0.35],
                     [hx + s * (rx * 1.85 + sway), top + .085 * h], [hx + s * rx * 1.15, top + .095 * h],
                     [hx + s * rx * 0.70, hy + ry * 1.05]];
  return smooth([[hx, hy - ry * 1.30], ...side(1), [hx, hy + ry * 0.9], ...side(-1).reverse()]);
}
function hairLock(hx, hy, rx, ry, h, top, sway) {
  return smooth([[hx + rx * 0.82, hy + ry * 0.05], [hx + rx * 1.35, hy + ry * 0.55],
                 [hx + rx * 1.55 + sway, top + .08 * h], [hx + rx * 1.20 + sway * 1.4, top + .14 * h],
                 [hx + rx * 1.55 + sway * 1.8, top + .20 * h], [hx + rx * 1.00 + sway * 1.8, top + .215 * h],
                 [hx + rx * 0.62 + sway, top + .15 * h], [hx + rx * 0.88, top + .08 * h], [hx + rx * 0.80, hy + ry * 0.75]]);
}

let FIG_UID = 0;
function drawFigure(g, cx, top, h, p, col, t = 0) {
  const f = figure(cx, top, h, p);
  const [hx, hy, rx, ry] = f.head;
  const id = 'fc' + (++FIG_UID);
  const sway = Math.sin(t * 2.2) * .006 * h;
  const st = col.stroke ? `stroke="${col.stroke}" stroke-width="4"` : '';
  g.innerHTML = `
    <defs><clipPath id="${id}"><path d="${f.body}"/></clipPath></defs>
    <path d="${hairBack(hx, hy, rx, ry, h, top, sway)}" fill="${col.hair}"/>
    ${f.arms.map(a => `<path d="${a}" fill="${col.skin}" ${st}/>`).join('')}
    <path d="${f.body}" fill="${col.skin}" ${st}/>
    <g clip-path="url(#${id})">
      <rect x="${cx - h}" y="${top + .095 * h}" width="${2 * h}" height="${.12 * h}" fill="${col.cloth}"/>
      <rect x="${cx - h}" y="${top + .405 * h}" width="${2 * h}" height="${.62 * h}" fill="${col.cloth}"/>
      <rect x="${cx - h}" y="${top + .405 * h}" width="${2 * h}" height="${.025 * h}" fill="#ffffff" opacity=".25"/>
    </g>
    <ellipse cx="${hx}" cy="${hy + ry * .12}" rx="${rx * .80}" ry="${ry * .88}" fill="${col.skin}" ${st}/>
    <path d="M${hx - rx * .85} ${hy - ry * .25} Q${hx - rx * .2} ${hy - ry * 1.15} ${hx + rx * .95} ${hy - ry * .45}
             Q${hx + rx * .3} ${hy - ry * .78} ${hx - rx * .85} ${hy - ry * .25}Z" fill="${col.hair}"/>
    <path d="${hairLock(hx, hy, rx, ry, h, top, sway)}" fill="${col.hair}"/>`;
}
"""

RENDER_REST_JS = r"""  /* ---- transitions (scene 1 itself is untouched) ---- */
  const e2 = eo((t - T_ME2) / 0.4);
  $('s2').style.opacity = t >= T_ME2 ? 1 : 0;
  $('s2').style.clipPath = `circle(${e2 * 1750}px at 540px 1040px)`;
  const e3 = eo((t - T_PROD) / 0.45);
  $('s3').style.opacity = t >= T_PROD ? 1 : 0;
  $('s3').style.transform = `translateY(${(1 - e3) * 1920}px)`;
  const e4 = eo((t - T_CTA) / 0.4);
  $('s4').style.opacity = t >= T_CTA ? 1 : 0;
  $('s4').style.clipPath = `circle(${e4 * 1750}px at 540px 1380px)`;
  $('s1').style.opacity = t < T_ME2 + 0.45 ? 1 : 0;

  /* scene 2 — simplified: figure with working muscles + one comparison */
  if (t >= T_ME2 - 0.01 && t < T_PROD + 0.5) {
    const lt = t - T_ME2;
    $('cam2').style.transform = `scale(${1 + 0.035 * clamp(lt / 4)})`;
    drift(['c2a', 'c2b', 'c2c'], t);
    const s = 1 + 0.22 * Math.max(0, 1 - lt / 0.22);
    $('s2title').style.transform = `scale(${s})`;
    words('s2sub', ['лежу', '30', 'минут', '—', '\n', 'а', 'мышцы', 'работают'], lt - 0.45, 0.09, 4);
    drawFigure($('fig2'), 540, 150, 720, 0.8,
               { skin: '#E4FAF8', cloth: '#3CE0D7', hair: '#5C3A2C', stroke: '#A5EAE4' }, lt);
    const pulse = Math.pow(Math.abs(Math.sin(lt * Math.PI * 2.4)), 2);
    const zx = 540, zt = 150, zh = 720;
    const zones = [[zx - .035 * zh, zt + .27 * zh, 28, 34], [zx + .035 * zh, zt + .27 * zh, 28, 34],
                   [zx - .035 * zh, zt + .335 * zh, 28, 34], [zx + .035 * zh, zt + .335 * zh, 28, 34],
                   [zx - .09 * zh, zt + .56 * zh, 44, 78], [zx + .09 * zh, zt + .56 * zh, 44, 78]];
    const za = ease((lt - 0.3) / 0.5);
    $('zones2').innerHTML = zones.map(([x, y, rx, ry]) =>
      `<ellipse cx="${x}" cy="${y}" rx="${rx * 1.7}" ry="${ry * 1.5}" fill="url(#gZone)" opacity="${(0.3 + 0.6 * pulse) * za}" filter="url(#soft)"/>
       <ellipse cx="${x}" cy="${y}" rx="${rx * .55}" ry="${ry * .6}" fill="#3CE0D7" opacity="${(0.25 + 0.45 * pulse) * za}"/>`).join('');
    let w = '';
    for (let i = 0; i < 3; i++) {
      const ph = (lt * 0.9 + i / 3) % 1, r = 70 + ph * 300;
      w += `<circle cx="540" cy="${150 + .3 * 720}" r="${r}" stroke-width="${8 * (1 - ph)}" opacity="${0.45 * (1 - ph) * za}"/>`;
    }
    $('waves2').innerHTML = w;
    $('cmp2').style.opacity = ease((lt - 0.8) / 0.35);
    $('cmp2').style.transform = `translateY(${(1 - eo((lt - 0.8) / 0.45)) * 40}px)`;
    const mp = eo((lt - 1.0) / 2.4);
    $('muscle').textContent = Math.round(mp * 100) + '%';
    $('muscle').style.transform = `scale(${1 + 0.08 * pulse * mp})`;
  }

  /* scene 3 — scan turns ДО into ПОСЛЕ, then the two split apart */
  if (t >= T_PROD - 0.01 && t < T_CTA + 0.5) {
    const lt = t - T_PROD;
    $('cam3').style.transform = `scale(${1 + 0.03 * clamp(lt / 6)})`;
    drift(['c3a', 'c3b'], t);
    words('s3title', ['Ленивый', 'спорт'], lt - 0.25, 0.14, 0);
    $('s3sub').style.opacity = ease((lt - 0.55) / 0.35);
    const top = 150, h = 620;
    const split = eo((lt - 2.55) / 0.6);
    const xb = 540 - 250 * split, xa = 540 + 250 * split;
    const appear = ease((lt - 0.35) / 0.4);
    const BEFORE = { skin: 'url(#gSkinB)', cloth: '#8D999D', hair: '#6F7A7E' };
    const AFTER = { skin: 'url(#gSkinA)', cloth: 'url(#gClothA)', hair: '#5C3A2C' };
    drawFigure($('before3'), xb, top, h, 0, BEFORE, lt);
    $('before3').style.opacity = appear;
    drawFigure($('after3'), xa, top, h, 1, AFTER, lt);
    $('sh1').setAttribute('cx', xb); $('sh2').setAttribute('cx', xa);
    // scan beam
    const sp = clamp((lt - 1.0) / 1.4);
    const y0 = top - 140, y1 = top + h + 20;
    const by = y0 + (y1 - y0) * ease(sp);
    $('scanRect').setAttribute('height', lt < 1.0 ? 0 : (sp >= 1 ? 2000 : by));
    $('beam3').innerHTML = (lt > 1.0 && sp < 1) ? `
      <rect x="${540 - 270}" y="${by - 14}" width="540" height="28" rx="14" fill="#3CE0D7" opacity=".55" filter="url(#glow3)"/>
      <rect x="${540 - 250}" y="${by - 3}" width="500" height="6" rx="3" fill="#ffffff"/>
      <rect x="${540 - 250}" y="${by - 3}" width="500" height="6" rx="3" fill="#3CE0D7" opacity=".6"/>` : '';
    $('arrow3').setAttribute('opacity', ease((lt - 3.0) / 0.3));
    $('lblBefore').style.opacity = ease((lt - 3.0) / 0.3);
    $('lblAfter').style.opacity = ease((lt - 3.1) / 0.3);
    const ta = ease((lt - 3.2) / 0.35);
    const tw = 0.102 * h + 10, ty = top + 0.33 * h;
    $('tape3').innerHTML = ta > 0 ? `<g opacity="${ta}">
      <path d="M${xa - tw} ${ty} Q${xa} ${ty + 26} ${xa + tw} ${ty}" fill="none" stroke="#F2C94C" stroke-width="14" stroke-linecap="round"/>
      <path d="M${xa - tw} ${ty} Q${xa} ${ty + 26} ${xa + tw} ${ty}" fill="none" stroke="#B88A1B" stroke-width="3" stroke-dasharray="2 10"/></g>` : '';
    const sk = ease((lt - 2.4) / 0.3);
    $('sparks3').innerHTML = [[xa - 120, 200], [xa + 130, 290], [xa + 115, 560], [xa - 140, 470]].map(([x, y], k) => {
      const s = (14 + 7 * Math.sin(lt * 7 + k)) * sk;
      return `<path d="M${x} ${y - s}L${x + s * .28} ${y - s * .28}L${x + s} ${y}L${x + s * .28} ${y + s * .28}L${x} ${y + s}L${x - s * .28} ${y + s * .28}L${x - s} ${y}L${x - s * .28} ${y - s * .28}Z"/>`;
    }).join('');
    for (let i = 0; i < 4; i++) {
      const a = ease((lt - 1.4 - i * 1.0) / 0.35);
      $('b' + i).style.opacity = a;
      $('b' + i).style.transform = `translateY(${(1 - eo((lt - 1.4 - i * 1.0) / 0.45)) * 40}px) scale(${0.94 + 0.06 * eo((lt - 1.4 - i * 1.0) / 0.45)})`;
    }
  }

  /* scene 4 */
  if (t >= T_CTA - 0.01) {
    const lt = t - T_CTA;
    $('cam4').style.transform = `scale(${1 + 0.03 * clamp(lt / 4)})`;
    drift(['c4a', 'c4b', 'c4c'], t);
    $('s4eyebrow').style.opacity = ease((lt - 0.15) / 0.3);
    words('s4title', ['Абонемент', '\n', 'на', 'месяц'], lt - 0.2, 0.12, 0);
    $('s4sub').style.opacity = ease((lt - 0.6) / 0.35);
    const sa = ease((lt - 0.8) / 0.35);
    $('s4stats').style.opacity = sa;
    $('s4stats').style.transform = `translateY(${(1 - eo((lt - 0.8) / 0.45)) * 40}px)`;
    const c = eo((lt - 0.9) / 1.0);
    $('n30').textContent = Math.round(30 * c); $('n1').textContent = Math.round(1 * c);
    const a = ease((lt - 1.3) / 0.35);
    $('cta').style.opacity = a;
    $('cta').style.transform = `translateY(${(1 - eo((lt - 1.3) / 0.45)) * 40}px) scale(${1 + 0.025 * Math.sin(lt * 6)})`;
    const sh = ((lt - 1.6) % 1.6) / 1.6;
    $('shine').style.left = (lt > 1.6 ? -200 + sh * 1100 : -300) + 'px';
  }
};

function drift(ids, t) {
  ids.forEach((id, i) => {
    const el = $(id);
    el.setAttribute('transform', `translate(${Math.sin(t * 0.45 + i * 1.7) * 26} ${Math.cos(t * 0.38 + i) * 22})`);
  });
}

/* word-by-word reveal; '\n' = line break; boldFrom: index from which words are turquoise-bold */
function words(id, list, lt, step, boldFrom) {
  const el = $(id);
  if (!el.dataset.built) {
    el.innerHTML = list.map((w, i) => w === '\n' ? '<br>' :
      `<span class="word" data-i="${i}" style="${boldFrom && i >= boldFrom ? 'color:var(--turq-d);font-weight:800' : ''}">${w}${i < list.length - 1 && list[i + 1] !== '\n' ? ' ' : ''}</span>`).join('');
    el.dataset.built = 1;
  }
  el.querySelectorAll('.word').forEach(s => {
    const i = +s.dataset.i, x = (lt - i * step) / 0.3;
    s.style.opacity = ease(x);
    s.style.transform = `translateY(${(1 - eo(x)) * 30}px)`;
  });
}
window.render(0);
</script>
</body>
</html>
"""

# --- splice ---
css_end = v3.index("</style>")
out = v3[:css_end] + EXTRA_CSS + v3[css_end:]

s2_start = out.index("<!-- ===================== SCENE 2")
script_start = out.index("<script>", s2_start)
out = out[:s2_start] + SCENES_2_4 + out[script_start + len("<script>"):]

f_start = out.index("/* ---------- female figure")
f_end = out.index("/* ---------- scene 1: calendar")
out = out[:f_start] + FIGURE_JS + "\n" + out[f_end:]

r_start = out.index("  /* scene 2 */")
out = out[:r_start] + RENDER_REST_JS

# scene-visibility lines from v3 are replaced by the transition block
for line in ["  show('s2',", "  show('s3',", "  show('s4',"]:
    i = out.index(line)
    j = out.index("\n", i)
    out = out[:i] + out[j + 1:]

(HERE / "index.html").write_text(out, encoding="utf-8")
print("written", HERE / "index.html")
