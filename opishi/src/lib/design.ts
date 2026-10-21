// «Опиши мне» design bible. Angular cel-shading: hard-edged shadow planes, geometric
// highlights, a warm ink outline. One language for characters, sets and props.
import {continueRender, delayRender, staticFile} from 'remotion';
import {fontCss} from './fontsCss';

if (typeof document !== 'undefined' && !document.getElementById('op-fonts')) {
  const handle = delayRender('fonts');
  const style = document.createElement('style');
  style.id = 'op-fonts';
  style.textContent = fontCss.replace(/FONTDIR\//g, staticFile('fonts/'));
  document.head.appendChild(style);
  const faces = ['700 1em Oswald', '500 1em Oswald', '400 1em Manrope', '600 1em Manrope', '800 1em Manrope', 'italic 500 1em Cormorant', 'italic 600 1em Cormorant', '400 1em "Great Vibes"'];
  Promise.all(faces.map((ff) => document.fonts.load(ff, 'Опиши мне abc')))
    .then(() => continueRender(handle))
    .catch(() => continueRender(handle));
}

export const W = 1080;
export const H = 1920;

export const fonts = {
  cond: 'Oswald, sans-serif',
  sans: 'Manrope, sans-serif',
  serif: 'Cormorant, serif',
  script: '"Great Vibes", cursive',
};

export const INK = '#3B1520'; // outline colour for warm surfaces
export const INK_DARK = '#120A0E'; // outline for hair / black cloth

export const P = {
  lime: '#B9E33C',
  limeDeep: '#7FA617',
  lilac: '#A48BE0',
  lilacDeep: '#7A62BE',
  lilacPale: '#D9CCF6',
  sunset: '#FF8A3D',
  sunsetDeep: '#E2532E',
  peach: '#FFC9A0',
  rose: '#F06A8A',
  gold: '#F2B33D',
  goldDeep: '#C27F17',
  silver: '#D9DEE6',
  night: '#211A45',
  nightDeep: '#120E2B',
  cold: '#BFD6E6',
  coldDeep: '#7F9DB4',
  cream: '#F7EEE3',
  ink: '#2A1622',
  white: '#FFFFFF',
};

export const SKIN = {
  mira: {base: '#C98A5E', shade: '#A4643E', deep: '#7E4429', light: '#E9B285', blush: '#E0566A', lip: '#B9455B', lipDark: '#7E2238'},
  timur: {base: '#E0AE84', shade: '#BC8560', deep: '#93603F', light: '#F5CDA6', blush: '#E1786A', lip: '#B9665E', lipDark: '#7F3B37'},
};

// Each chapter has its own light: warm sunset → indigo night → clinical cold → grey dawn → last sunset
export const GRADE = {
  c1: {sat: 1.08, tint: 'rgba(255,140,60,0.10)'},
  c2: {sat: 0.95, tint: 'rgba(60,40,160,0.18)'},
  c3: {sat: 0.7, tint: 'rgba(120,180,220,0.14)'},
  c4: {sat: 0.45, tint: 'rgba(140,150,170,0.18)'},
  c5: {sat: 1.0, tint: 'rgba(255,120,60,0.12)'},
};
