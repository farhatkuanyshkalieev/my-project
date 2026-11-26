import {continueRender, delayRender, staticFile} from 'remotion';

const fontFiles: [string, string, string][] = [
  ['Inter', 'Inter-Regular.otf', '400'],
  ['Inter', 'Inter-Medium.otf', '500'],
  ['Inter', 'Inter-SemiBold.otf', '600'],
  ['Inter', 'Inter-Bold.otf', '700'],
  ['InterDisplay', 'InterDisplay-Bold.otf', '700'],
  ['InterDisplay', 'InterDisplay-ExtraBold.otf', '800'],
];
if (typeof document !== 'undefined') {
  const h = delayRender('fonts', {timeoutInMilliseconds: 180000, retries: 2});
  Promise.all(
    fontFiles.map(([fam, file, w]) => {
      const f = new FontFace(fam, `url(${staticFile('fonts/' + file)})`, {weight: w});
      return f.load().then((ff) => document.fonts.add(ff));
    }),
  )
    .catch((e) => console.warn('font load failed', e))
    .then(() => continueRender(h));
}

