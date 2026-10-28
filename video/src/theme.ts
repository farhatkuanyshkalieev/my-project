import {FONT_DATA} from './fonts.generated';

// Fonts ship with the project (public/fonts, OFL) and are embedded in the bundle, so renders
// never wait on a network request.
const RANGES = {
  cyrillic: 'U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116',
  latin: 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD',
};

const decode = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)).buffer;

const loadLocal = (family: string, weights: string) => {
  for (const sub of Object.keys(RANGES) as (keyof typeof RANGES)[]) {
    // An ArrayBuffer source is parsed synchronously; no delayRender needed.
    const face = new FontFace(family, decode(FONT_DATA[`${family}-${sub}`]), {weight: weights, unicodeRange: RANGES[sub]});
    document.fonts.add(face);
  }
  return family;
};

// Condensed display face, close to the headlines on @dentline.kz posts.
export const display = loadLocal('Oswald', '200 700');
export const body = loadLocal('Montserrat', '100 900');

// Taken from the Dent Line logo: royal blue tooth on white, with a cyan glow.
export const C = {
  navy: '#050F26',
  deep: '#0A2560',
  blue: '#1D5FE6',
  royal: '#2F7BFF',
  cyan: '#46CFFF',
  ice: '#D9F3FF',
  white: '#FFFFFF',
};

export const FOOTAGE = 'footage/clinic.mp4';
