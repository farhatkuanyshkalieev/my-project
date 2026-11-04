/* Lying girl on a cosmetology couch, side view (head left, feet right).
   Local units: couch surface at y = 0, figure above it (negative y).
   The headrest is slightly raised and the head is turned to the viewer, so the face
   (a simple oval, no features) is framed by the hair, like the client's reference.
   drawLying(g, ox, oy, s, t) renders into SVG group g. Uses smooth() from the page. */

const LY = {
  skinTop: '#8EF0EA', skinBot: '#3CE0D7', clothTop: '#1EBBB0', clothBot: '#128C84', hair: '#5C3A2C',
};

// body silhouette: top contour (shoulder -> toes), then the back resting on the couch (toes -> shoulder)
const LY_TOP = [
  [118, -52], [140, -60], [166, -72], [188, -86], [210, -95], [238, -91], [262, -76], [286, -64],
  [322, -60], [362, -63], [404, -71], [446, -73], [492, -68], [560, -57], [628, -49], [676, -50],
  [726, -45], [764, -36], [784, -44], [800, -74], [812, -92], [824, -90], [826, -72], [820, -40], [812, -8],
];
const LY_BACK = [
  [780, -2], [730, -2], [690, -4], [646, -11], [604, -6], [560, -2], [500, 0], [440, -1],
  [390, -3], [340, -7], [290, -4], [230, -2], [176, -4], [146, -10], [124, -26],
];
// near arm along the body: round shoulder, soft elbow, hand by the hip
const LY_ARM = [
  [158, -50], [168, -62], [188, -64], [214, -56], [262, -40], [302, -28], [350, -20], [392, -16],
  [412, -18], [426, -13], [430, -6], [418, -2], [394, -3], [350, -6], [300, -12], [256, -20],
  [210, -30], [176, -36],
];

// head placement on the raised headrest (upright head drawn at 0,0 then moved and tilted)
// backrest raised: everything left of the hinge (head, shoulders, chest) is rotated up around it;
// points near the hinge are blended so the body bends smoothly at the waist
const LY_RECLINE = { px: 350, py: -2, ang: 25, blend: 50 };
function lyRot(x, y, k = 1) {
  const r = LY_RECLINE;
  if (x >= r.px) return [x, y];
  let w = Math.min(1, (r.px - x) / r.blend); w = w * w * (3 - 2 * w); w *= k;
  const a = r.ang * w * Math.PI / 180, dx = x - r.px, dy = y - r.py;
  return [r.px + dx * Math.cos(a) - dy * Math.sin(a), r.py + dx * Math.sin(a) + dy * Math.cos(a)];
}
const LY_HEAD = (() => { const [x, y] = lyRot(66, -80); return { x, y, rot: -22 }; })();

function lyPts(arr) { return arr.map(([x, y]) => lyRot(x, y)); }

/* --- head in its own upright frame: face centre at 0,0, face oval rx 30, ry 38 --- */
// hair behind the face: rounded crown, falls to shoulder length on both sides
const LY_HAIR_BACK = 'M0 -54' +
  ' C28 -54, 46 -38, 48 -10' +      // crown -> right side
  ' C50 18, 50 50, 48 76' +         // right side to the shoulder
  ' C47 88, 30 90, 29 78' +         // rounded end
  ' C27 56, 24 38, 20 24' +         // inner edge (hidden by the face/neck)
  ' L-20 24' +
  ' C-30 40, -44 58, -60 70' +      // left side flows out over the pillow
  ' C-68 77, -80 73, -79 63' +      // rounded end
  ' C-76 40, -66 16, -58 -8' +      // outer left edge going up
  ' C-50 -36, -28 -54, 0 -54 Z';
// front layer: side part, fringe swept across the forehead, lock along the cheek towards the shoulder
const LY_HAIR_FRONT = 'M-6 -51' +
  ' C14 -53, 34 -41, 39 -18' +
  ' C43 6, 44 46, 42 82' +
  ' C41 94, 27 96, 27 84' +
  ' C26 56, 26 24, 24 4' +
  ' C22 -13, 11 -25, -6 -28' +
  ' C-18 -29, -28 -24, -33 -13' +
  ' C-36 -30, -26 -47, -6 -51 Z';
// short neck from under the chin to the shoulder
const LY_NECK = 'M-13 20 C-13 34, -12 46, -10 62 L18 62 C16 46, 14 34, 13 20 Z';

function lyHeadTransform() { return `translate(${LY_HEAD.x} ${LY_HEAD.y}) rotate(${LY_HEAD.rot})`; }

function drawLying(g, ox, oy, s, t) {
  const pulse = Math.pow(Math.abs(Math.sin(t * Math.PI * 2.4)), 2);
  const body = smooth(lyPts(LY_TOP).concat(lyPts(LY_BACK)));
  const arm = smooth(lyPts(LY_ARM));
  const pad = (x, y, w, a) => `<g transform="rotate(${a} ${x} ${y})">
      <rect x="${x - w / 2}" y="${y - 7}" width="${w}" height="14" rx="7" fill="#FFFFFF"/>
      <rect x="${x - w / 2 + 6}" y="${y - 2}" width="${w - 12}" height="4" rx="2" fill="#3CE0D7" opacity="${0.45 + 0.55 * pulse}"/></g>`;
  g.innerHTML = `
  <defs>
    <linearGradient id="lySkin" x1="0" y1="-110" x2="0" y2="0" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${LY.skinTop}"/><stop offset="1" stop-color="${LY.skinBot}"/></linearGradient>
    <linearGradient id="lyFace" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#9AF2EC"/><stop offset="1" stop-color="#6DE8E0"/></linearGradient>
    <linearGradient id="lyCloth" x1="0" y1="-100" x2="0" y2="0" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${LY.clothTop}"/><stop offset="1" stop-color="${LY.clothBot}"/></linearGradient>
    <linearGradient id="lyMat" x1="0" y1="0" x2="0" y2="40" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#E4F4F2"/></linearGradient>
    <radialGradient id="lyGlow"><stop offset="0" stop-color="#3CE0D7" stop-opacity=".9"/><stop offset="1" stop-color="#3CE0D7" stop-opacity="0"/></radialGradient>
    <clipPath id="lyBodyClip"><path d="${body}"/></clipPath>
    <filter id="lyShadow" x="-10%" y="-40%" width="120%" height="200%"><feDropShadow dx="0" dy="14" stdDeviation="16" flood-color="#128C84" flood-opacity=".18"/></filter>
    <filter id="lyBlur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="14"/></filter>
  </defs>
  <g transform="translate(${ox} ${oy}) scale(${s})">
    <!-- couch -->
    <g filter="url(#lyShadow)">
      <rect x="-30" y="38" width="16" height="150" rx="8" fill="#128C84"/>
      <rect x="770" y="38" width="16" height="150" rx="8" fill="#128C84"/>
      <rect x="-60" y="176" width="76" height="14" rx="7" fill="#128C84"/>
      <rect x="740" y="176" width="76" height="14" rx="7" fill="#128C84"/>
      <rect x="-70" y="28" width="910" height="22" rx="11" fill="#1EBBB0"/>
      <rect x="${LY_RECLINE.px - 40}" y="-2" width="${866 - LY_RECLINE.px + 40}" height="38" rx="19" fill="url(#lyMat)"/>
      <g transform="rotate(${LY_RECLINE.ang} ${LY_RECLINE.px} ${LY_RECLINE.py})">
        <rect x="-60" y="-2" width="${LY_RECLINE.px + 60 + 10}" height="38" rx="19" fill="url(#lyMat)"/>
      </g>
      <!-- backrest support -->
      <path d="M${LY_RECLINE.px - 230} 40 L${LY_RECLINE.px - 200} ${-2 - 0}" stroke="#128C84" stroke-width="12" stroke-linecap="round" opacity="0"/>
    </g>
    <!-- pillow on the raised backrest -->
    <g transform="rotate(${LY_RECLINE.ang} ${LY_RECLINE.px} ${LY_RECLINE.py})">
      <rect x="-50" y="-30" width="190" height="36" rx="18" fill="#FFFFFF"/>
      <rect x="-50" y="-30" width="190" height="36" rx="18" fill="none" stroke="#D5EEEB" stroke-width="2"/>
    </g>
    <!-- glow on the working muscles (behind the body) -->
    <g opacity="${0.35 + 0.6 * pulse}">
      <ellipse cx="${lyRot(335, -62)[0]}" cy="${lyRot(335, -62)[1]}" rx="70" ry="34" fill="url(#lyGlow)" filter="url(#lyBlur)"/>
      <ellipse cx="530" cy="-62" rx="85" ry="34" fill="url(#lyGlow)" filter="url(#lyBlur)"/>
    </g>
    <!-- hair behind the head, then the neck (its base is hidden by the shoulders) -->
    <g transform="${lyHeadTransform()}"><path d="${LY_HAIR_BACK}" fill="${LY.hair}"/>
      <path d="${LY_NECK}" fill="url(#lyFace)"/></g>
    <!-- body -->
    <path d="${body}" fill="url(#lySkin)"/>
    <g clip-path="url(#lyBodyClip)">
      <g transform="rotate(${LY_RECLINE.ang} ${LY_RECLINE.px} ${LY_RECLINE.py})"><rect x="100" y="-140" width="188" height="160" fill="url(#lyCloth)"/></g>
      <rect x="388" y="-120" width="372" height="130" fill="url(#lyCloth)"/>
      <rect x="388" y="-120" width="6" height="130" fill="#FFFFFF" opacity=".22"/>
    </g>
    <!-- neck, face (plain oval, no features), front hair -->
    <g transform="${lyHeadTransform()}">
      <ellipse cx="0" cy="0" rx="30" ry="38" fill="url(#lyFace)"/>
      <path d="${LY_HAIR_FRONT}" fill="${LY.hair}"/>
    </g>
    <!-- near arm -->
    <path d="${arm}" fill="url(#lySkin)" stroke="#20BDB3" stroke-width="2.5" stroke-linejoin="round"/>
    <!-- EMS pads -->
    ${pad(...lyRot(300, -63), 30, 18)}${pad(...lyRot(368, -64), 34, 0)}${pad(500, -72, 40, 4)}${pad(560, -63, 40, 8)}
  </g>`;
}
