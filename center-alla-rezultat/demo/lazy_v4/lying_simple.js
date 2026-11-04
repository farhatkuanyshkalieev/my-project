/* Scene 2, simple flat version (the composition the client liked in v1), now with a girl:
   flat couch, girl lying on her back, EMS pads with pulsing arcs, side table with a smoothie.
   Local units: couch top at y = 0. drawLyingSimple(g, ox, oy, s, t). */

const LS_COL = {
  couch: '#11706A', couchLeg: '#0D5753', pillow: '#FFFFFF', skin: '#F1C8B2', blush: '#F4A99C',
  hair: '#5C3A2C', top: '#7FD8CF', topShade: '#63CEC4', leggings: '#0F4F4B', shoe: '#FFFFFF',
  glasses: '#1E1E24', lips: '#E26E6E', arc: '#F2786E', table: '#C9D4D7', glass: '#D9F2F7', straw: '#F2786E',
};

// long hair: wraps the back of the head and flows over the pillow, one smooth shape
const LS_HAIR = 'M172 -126' +
  ' C150 -137, 100 -133, 83 -98' +    // over the crown
  ' C72 -76, 60 -66, 40 -64' +        // back of the head down to the pillow
  ' C24 -62, 12 -60, 7 -53' +         // over the pillow
  ' C3 -46, 10 -40, 22 -41' +         // rounded end
  ' C50 -44, 82 -44, 100 -40' +       // resting on the pillow
  ' C98 -64, 110 -94, 130 -112' +     // hairline behind the ear
  ' C143 -121, 158 -124, 172 -126 Z';

function drawLyingSimple(g, ox, oy, s, t, variant = LS_DEFAULT_VARIANT) {
  const pulse = Math.abs(Math.sin(t * Math.PI * 2.5));
  const arc = (cx) => {
    const r = 26 + pulse * 34, a0 = 205 * Math.PI / 180, a1 = 335 * Math.PI / 180, cy = -100;
    const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0), x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
    return `<path d="M${x0} ${y0} A${r} ${r} 0 0 1 ${x1} ${y1}" fill="none" stroke="${LS_COL.arc}" stroke-width="6" stroke-linecap="round" opacity="${0.55 + 0.45 * (1 - pulse)}"/>`;
  };
  g.innerHTML = `
  <defs>
    <filter id="lsShadow" x="-10%" y="-30%" width="120%" height="180%"><feDropShadow dx="0" dy="16" stdDeviation="18" flood-color="#0D5753" flood-opacity=".22"/></filter>
    <linearGradient id="lsTop" x1="0" y1="-100" x2="0" y2="0" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${LS_COL.top}"/><stop offset="1" stop-color="${LS_COL.topShade}"/></linearGradient>
  </defs>
  <g transform="translate(${ox} ${oy}) scale(${s})">
    <!-- side table with a smoothie -->
    <rect x="890" y="-80" width="50" height="250" rx="12" fill="${LS_COL.table}"/>
    <rect x="850" y="-100" width="130" height="30" rx="15" fill="${LS_COL.table}"/>
    <path d="M880 -200 L950 -200 L940 -100 L890 -100 Z" fill="${LS_COL.glass}"/>
    <path d="M884 -160 L946 -160 L940 -100 L890 -100 Z" fill="#F7C9BE"/>
    <line x1="926" y1="-240" x2="916" y2="-165" stroke="${LS_COL.straw}" stroke-width="8" stroke-linecap="round"/>
    <!-- couch -->
    <g filter="url(#lsShadow)">
      <rect x="60" y="40" width="30" height="130" rx="15" fill="${LS_COL.couchLeg}"/>
      <rect x="770" y="40" width="30" height="130" rx="15" fill="${LS_COL.couchLeg}"/>
      <rect x="0" y="0" width="860" height="70" rx="35" fill="${LS_COL.couch}"/>
    </g>
    <rect x="20" y="-50" width="210" height="60" rx="30" fill="${LS_COL.pillow}"/>
    <!-- legs in leggings and a sneaker -->
    <rect x="530" y="-76" width="300" height="66" rx="33" fill="${LS_COL.leggings}"/>
    <ellipse cx="822" cy="-58" rx="31" ry="50" fill="${LS_COL.shoe}"/>
    <!-- body in a sports top, with a soft bust line -->
    <rect x="190" y="-96" width="380" height="96" rx="48" fill="url(#lsTop)"/>
    <ellipse cx="268" cy="-96" rx="52" ry="20" fill="${LS_COL.top}"/>
    <!-- EMS pads with pulsing arcs -->
    <rect x="292" y="-86" width="88" height="38" rx="13" fill="#FFFFFF"/>
    <rect x="420" y="-86" width="88" height="38" rx="13" fill="#FFFFFF"/>
    ${arc(336)}${arc(464)}
    <!-- head, hairstyle, face -->
    ${lsHead(variant)}
  </g>`;
}


/* ===== hairstyles (head centre 145,-65, r 65; crown towards the pillow, face to the right) ===== */
const LS_DEFAULT_VARIANT = 'A';
const H = LS_COL.hair, H2 = '#7A5040';   // hair + a lighter tone for subtle strands

// shared: smooth cap over the crown with a side-swept fringe, face left open
const LS_CAP = 'M206 -102' +
  ' C196 -128, 166 -140, 138 -138' +
  ' C104 -136, 76 -112, 74 -80' +
  ' C72 -54, 80 -26, 100 -6' +
  ' C106 -40, 110 -76, 128 -98' +
  ' C150 -112, 178 -114, 206 -102 Z';

const LS_STYLES = {
  // A: long wavy hair spread over the pillow + side fringe
  A: {
    back: 'M150 -136' +
      ' C110 -144, 76 -122, 70 -90' +
      ' C64 -62, 50 -54, 30 -58' +
      ' C10 -62, -8 -54, -10 -38' +
      ' C-12 -24, 2 -18, 12 -24' +
      ' C4 -12, 14 0, 30 -4' +
      ' C54 -10, 82 -6, 102 0' +
      ' C96 -40, 104 -84, 128 -110' +
      ' C134 -124, 142 -132, 150 -136 Z',
    front: LS_CAP,
    extra: `<path d="M24 -40 C40 -46, 58 -44, 74 -36" fill="none" stroke="${H2}" stroke-width="4" stroke-linecap="round" opacity=".7"/>
            <path d="M120 -122 C140 -128, 170 -126, 190 -110" fill="none" stroke="${H2}" stroke-width="4" stroke-linecap="round" opacity=".6"/>`,
  },
  // B: neat top bun with a hair tie
  B: {
    back: '',
    front: LS_CAP,
    extra: `<circle cx="82" cy="-128" r="34" fill="${H}"/>
            <path d="M64 -136 C72 -152, 96 -152, 102 -136" fill="none" stroke="${H2}" stroke-width="4" stroke-linecap="round" opacity=".7"/>
            <path d="M70 -120 C80 -112, 94 -114, 100 -124" fill="none" stroke="${H2}" stroke-width="4" stroke-linecap="round" opacity=".55"/>
            <rect x="96" y="-118" width="20" height="12" rx="6" fill="#3CE0D7" transform="rotate(-38 106 -112)"/>`,
  },
  // C: long braid lying on the pillow
  C: {
    back: '',
    front: LS_CAP,
    extra: (() => {
      const links = [[78, -66, 24, 17, -20], [52, -56, 22, 16, -12], [28, -50, 20, 15, -6], [6, -46, 18, 13, -2]];
      let out = '';
      links.forEach(([x, y, rx, ry, a]) => {
        out += `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${H}" transform="rotate(${a} ${x} ${y})"/>`;
        out += `<path d="M${x - rx * .5} ${y - ry * .7} Q${x} ${y} ${x - rx * .5} ${y + ry * .7}" fill="none" stroke="${H2}" stroke-width="3.5" stroke-linecap="round" opacity=".8" transform="rotate(${a} ${x} ${y})"/>`;
      });
      out += `<rect x="-14" y="-52" width="12" height="14" rx="5" fill="#3CE0D7"/>
              <path d="M-14 -45 C-28 -52, -38 -44, -40 -36 C-30 -40, -22 -36, -14 -40 Z" fill="${H}"/>`;
      return out;
    })(),
  },
  // D: high ponytail flowing over the pillow
  D: {
    back: '',
    front: LS_CAP,
    extra: `<path d="M88 -116 C60 -122, 30 -104, 12 -82 C0 -66, -6 -50, 4 -40 C10 -50, 22 -62, 40 -70 C58 -78, 76 -88, 90 -100 Z" fill="${H}"/>
            <path d="M80 -106 C56 -102, 34 -88, 18 -66" fill="none" stroke="${H2}" stroke-width="4" stroke-linecap="round" opacity=".7"/>
            <rect x="80" y="-120" width="18" height="12" rx="6" fill="#3CE0D7" transform="rotate(-30 89 -114)"/>`,
  },
};

function lsFace() {
  // closed eye with lashes, blush, pink lips
  return `<path d="M170 -84 Q182 -76 194 -84" fill="none" stroke="#3A2A2A" stroke-width="4" stroke-linecap="round"/>
          <path d="M173 -81 L169 -76 M181 -78.5 L179.5 -72.5 M189 -79 L190 -73 M194 -82 L198 -77" stroke="#3A2A2A" stroke-width="3" stroke-linecap="round"/>
          <ellipse cx="198" cy="-62" rx="11" ry="6.5" fill="${LS_COL.blush}" opacity=".75"/>
          <path d="M172 -50 Q181 -42 190 -50 Q181 -46 172 -50 Z" fill="${LS_COL.lips}" stroke="${LS_COL.lips}" stroke-width="3" stroke-linejoin="round"/>`;
}

function lsHead(v) {
  const st = LS_STYLES[v] || LS_STYLES.A;
  return `${st.back ? `<path d="${st.back}" fill="${H}"/>` : ''}
    <circle cx="145" cy="-65" r="65" fill="${LS_COL.skin}"/>
    ${st.extra}
    <path d="${st.front}" fill="${H}"/>
    ${lsFace()}`;
}
