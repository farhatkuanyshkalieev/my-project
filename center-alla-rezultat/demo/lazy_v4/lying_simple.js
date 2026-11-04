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

function drawLyingSimple(g, ox, oy, s, t) {
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
    <!-- head, long hair, face -->
    <path d="${LS_HAIR}" fill="${LS_COL.hair}"/>
    <circle cx="145" cy="-65" r="65" fill="${LS_COL.skin}"/>
    <path d="${LS_HAIR}" fill="${LS_COL.hair}" clip-path="url(#lsHeadClip)"/>
    <clipPath id="lsHeadClip"><circle cx="145" cy="-65" r="65"/></clipPath>
    <rect x="150" y="-98" width="62" height="22" rx="11" fill="${LS_COL.glasses}"/>
    <ellipse cx="196" cy="-58" rx="10" ry="6" fill="${LS_COL.blush}" opacity=".8"/>
    <path d="M168 -52 Q180 -40 192 -50" fill="none" stroke="${LS_COL.lips}" stroke-width="5" stroke-linecap="round"/>
  </g>`;
}
