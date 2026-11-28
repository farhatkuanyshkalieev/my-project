import { Easing, interpolate } from "remotion";
import { continueRender, delayRender, staticFile } from "remotion";
import manifest from "./fontManifest.json";

// Fonts are bundled locally in public/fonts (see scripts-fetch-fonts.mjs).
if (typeof document !== "undefined") {
  const handle = delayRender("Loading local fonts");
  Promise.all(
    manifest.map((m) => {
      const face = new FontFace(m.family, `url(${staticFile(`fonts/${m.file}`)}) format("woff2")`, {
        style: m.style,
        weight: m.weight,
        unicodeRange: m.range,
      });
      document.fonts.add(face);
      return face.load();
    }),
  )
    .then(() => continueRender(handle))
    .catch((e) => {
      console.error(e);
      continueRender(handle);
    });
}

export const fonts = { serif: "'Cormorant Garamond', serif", sans: "'Manrope', sans-serif" };

// Placeholder palette — swap for the clinic's brand colors.
export const colors = {
  cream: "#F5EFE7",
  sand: "#EADFD2",
  blush: "#E8CFC4",
  gold: "#B8925F",
  goldLight: "#E6CFA6",
  goldDeep: "#8C6A3F",
  ink: "#2B221D",
  inkSoft: "#6B5B50",
};

export const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
export const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);

export const ip = (
  frame: number,
  input: number[],
  output: number[],
  easing: (t: number) => number = easeOut,
) =>
  interpolate(frame, input, output, {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing,
  });
