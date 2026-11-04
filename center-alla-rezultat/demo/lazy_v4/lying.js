/* Lying girl on a cosmetology couch, side view (head left, feet right).
   Local units: couch surface at y = 0, figure above it (negative y).
   drawLying(g, ox, oy, s, t) renders into SVG group g. Uses smooth() from the page. */

const LY = {
  skinTop: '#8EF0EA', skinBot: '#3CE0D7', clothTop: '#1EBBB0', clothBot: '#128C84', hair: '#5C3A2C',
};

// body silhouette: top contour (head side -> toes), then the back resting on the couch (toes -> neck)
const LY_TOP = [
  [102, -64], [126, -58], [152, -64], [184, -84], [210, -95], [238, -91], [262, -76], [286, -64],
  [322, -60], [362, -63], [404, -71], [446, -73], [492, -68], [560, -57], [628, -49], [676, -50],
  [726, -45], [764, -36], [784, -44], [800, -74], [812, -92], [824, -90], [826, -72], [820, -40], [812, -8],
];
const LY_BACK = [
  [780, -2], [730, -2], [690, -4], [646, -11], [604, -6], [560, -2], [500, 0], [440, -1],
  [390, -3], [340, -7], [290, -4], [230, -2], [170, -3], [126, -16], [96, -36],
];
// near arm along the body: round shoulder, soft elbow, hand by the hip
const LY_ARM = [
  [158, -50], [168, -62], [188, -64], [214, -56], [262, -40], [302, -28], [350, -20], [392, -16],
  [412, -18], [426, -13], [430, -6], [418, -2], [394, -3], [350, -6], [300, -12], [256, -20],
  [210, -30], [176, -36],
];

function lyPts(arr) { return arr.map(([x, y]) => [x, y]); }

// head in profile, face up: crown to the left (on the pillow), nose pointing up
function lyHead() {
  return smooth([[44, -24], [20, -38], [10, -62], [16, -88], [36, -106], [62, -114], [78, -118], [86, -126],
                 [92, -122], [94, -112], [100, -108], [102, -100], [108, -92], [110, -80], [104, -66], [96, -46], [72, -26]]);
}
// hair: ONE shape. Outer edge wraps the crown and flows over the pillow; the inner edge
// is the hairline on the head, so there is no seam between pieces.
function lyHair() {
  // Hand-set cubic Béziers with matching tangents at every joint -> one clean, even silhouette.
  // forehead -> round crown -> soft drape onto the pillow -> rounded end -> along the pillow
  // -> rounded nape -> hairline on the side of the head -> back to the forehead
  return 'M60 -110' +
    ' C44 -120, 14 -112, 4 -92' +        // crown
    ' C-6 -72, -50 -46, -84 -36' +       // drape onto the pillow
    ' C-90 -34, -90 -28.5, -78 -28.5' +  // rounded end
    ' L36 -27.5' +                       // resting on the pillow
    ' C44 -27.5, 44 -36, 40 -46' +       // nape
    ' C36 -58, 36 -86, 48 -102' +        // hairline behind the ear and temple
    ' C52 -107, 56 -109, 60 -110 Z';     // to the forehead
}

function drawLying(g, ox, oy, s, t) {
  const pulse = Math.pow(Math.abs(Math.sin(t * Math.PI * 2.4)), 2);
  const sway = Math.sin(t * 1.6) * 1.5;
  const body = smooth(lyPts(LY_TOP).concat(lyPts(LY_BACK)));
  const arm = smooth(lyPts(LY_ARM));
  const pad = (x, y, w, a) => `<g transform="rotate(${a} ${x} ${y})">
      <rect x="${x - w / 2}" y="${y - 7}" width="${w}" height="14" rx="7" fill="#FFFFFF"/>
      <rect x="${x - w / 2 + 6}" y="${y - 2}" width="${w - 12}" height="4" rx="2" fill="#3CE0D7" opacity="${0.45 + 0.55 * pulse}"/></g>`;
  g.innerHTML = `
  <defs>
    <linearGradient id="lySkin" x1="0" y1="-110" x2="0" y2="0" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${LY.skinTop}"/><stop offset="1" stop-color="${LY.skinBot}"/></linearGradient>
    <linearGradient id="lyCloth" x1="0" y1="-100" x2="0" y2="0" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${LY.clothTop}"/><stop offset="1" stop-color="${LY.clothBot}"/></linearGradient>
    <linearGradient id="lyMat" x1="0" y1="0" x2="0" y2="40" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#E4F4F2"/></linearGradient>
    <radialGradient id="lyGlow"><stop offset="0" stop-color="#3CE0D7" stop-opacity=".9"/><stop offset="1" stop-color="#3CE0D7" stop-opacity="0"/></radialGradient>
    <clipPath id="lyBodyClip"><path d="${body}"/></clipPath>
    <clipPath id="lyHeadClip"><path d="${lyHead()}"/></clipPath>
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
      <rect x="-96" y="-2" width="962" height="38" rx="19" fill="url(#lyMat)"/>
    </g>
    <!-- pillow -->
    <rect x="-96" y="-30" width="226" height="38" rx="19" fill="#FFFFFF"/>
    <rect x="-96" y="-30" width="226" height="38" rx="19" fill="none" stroke="#D5EEEB" stroke-width="2"/>
    <!-- glow on the working muscles (behind the body) -->
    <g opacity="${0.35 + 0.6 * pulse}">
      <ellipse cx="335" cy="-62" rx="70" ry="34" fill="url(#lyGlow)" filter="url(#lyBlur)"/>
      <ellipse cx="530" cy="-62" rx="85" ry="34" fill="url(#lyGlow)" filter="url(#lyBlur)"/>
    </g>
    <!-- body -->
    <path d="${body}" fill="url(#lySkin)"/>
    <g clip-path="url(#lyBodyClip)">
      <rect x="140" y="-120" width="148" height="130" fill="url(#lyCloth)"/>
      <rect x="388" y="-120" width="372" height="130" fill="url(#lyCloth)"/>
      <rect x="388" y="-120" width="6" height="130" fill="#FFFFFF" opacity=".22"/>
    </g>
    <!-- head (profile), then the hair as one shape on top -->
    <path d="${lyHead()}" fill="url(#lySkin)"/>
    <path d="${lyHair()}" fill="${LY.hair}"/>
    <!-- near arm -->
    <path d="${arm}" fill="url(#lySkin)" stroke="#20BDB3" stroke-width="2.5" stroke-linejoin="round"/>
    <!-- EMS pads -->
    ${pad(312, -64, 34, 2)}${pad(352, -66, 34, -4)}${pad(500, -72, 40, 4)}${pad(560, -63, 40, 8)}
  </g>`;
}
