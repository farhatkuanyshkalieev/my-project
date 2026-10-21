// «Ярче» design bible: one palette and one type system for characters, city and props.
import {continueRender, delayRender, staticFile} from 'remotion';
import {fontCss} from './fontsCss';

// Fonts are vendored in public/fonts (the render browser has no Google Fonts access).
if (typeof document !== 'undefined' && !document.getElementById('yarche-fonts')) {
  const handle = delayRender('fonts');
  const style = document.createElement('style');
  style.id = 'yarche-fonts';
  style.textContent = fontCss.replace(/FONTDIR\//g, staticFile('fonts/'));
  document.head.appendChild(style);
  const faces = ['400 1em "Great Vibes"', '700 1em Oswald', '500 1em Oswald', '400 1em Manrope', '600 1em Manrope', '800 1em Manrope', 'italic 500 1em Cormorant', 'italic 600 1em Cormorant'];
  Promise.all(faces.map((ff) => document.fonts.load(ff, 'Ярче abc')))
    .then(() => continueRender(handle))
    .catch(() => continueRender(handle));
}

export const fonts = {
  script: '"Great Vibes", cursive',
  cond: 'Oswald, sans-serif',
  sans: 'Manrope, sans-serif',
  serif: 'Cormorant, serif',
};

// Candy-pastel palette lifted from the reference: hot pink, acid lime, cobalt,
// terracotta skin, cream and an inky plum for line work.
export const P = {
  pink: '#F0418C',
  pinkSoft: '#F7A8C6',
  pinkPale: '#FBD9E5',
  lime: '#B8D336',
  limeDeep: '#8FA61E',
  olive: '#C9C35A',
  cobalt: '#4E5FD8',
  periwinkle: '#9AA6F2',
  sky: '#BFD3F7',
  peach: '#F6C7A6',
  apricot: '#F29B6B',
  autumn: '#E8743B',
  rust: '#B9472A',
  gold: '#E2B44A',
  cream: '#F6EBDD',
  ink: '#241B33',
  plum: '#3A2443',
  grey: '#8E8C93',
  slate: '#56607A',
  white: '#FFFFFF',
  red: '#D8343F',
};

// Skin tones, per character
export const SKIN = {
  lisa: {base: '#EFB096', shade: '#D98670', deep: '#B9604F', blush: '#F0566A', light: '#FFD3BE'},
  mark: {base: '#D18866', shade: '#B4664A', deep: '#8C4734', blush: '#E0473F', light: '#F2AE8C'},
};

// The narrative device: the world loses saturation chapter by chapter.
export const CHAPTER_SAT = [1.12, 1.0, 0.7, 0.38, 0.14];
