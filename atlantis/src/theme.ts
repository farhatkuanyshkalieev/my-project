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

// Condensed display face for headlines.
export const display = loadLocal('Oswald', '200 700');
export const body = loadLocal('Montserrat', '100 900');

// Atlantis Dent: black-and-white tooth logo with a sparkle; wine red from their feed as the accent.
export const C = {
  bg: '#0C0809',
  bgDeep: '#3B0E19',
  brand: '#A61E36',
  brandLight: '#D23A55',
  accent: '#FF5A74',
  cream: '#F7EEE9',
  white: '#FFFFFF',
};

export const FOOTAGE = 'footage/clinic.mp4';
