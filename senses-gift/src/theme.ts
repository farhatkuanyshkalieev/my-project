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

export const fonts = {
  display: "'Unbounded', sans-serif",
  serif: "'Playfair Display', serif",
  sans: "'Manrope', sans-serif",
};

// Placeholder palette — swap for the clinic's brand colors.
export const colors = {
  cream: "#F3ECE2",
  powder: "#EFC9BF",
  coral: "#D7654A",
  coralDeep: "#A8432F",
  wine: "#5A1A29",
  wineDeep: "#3A0E19",
  ink: "#1F1716",
  butter: "#F2D58A",
};

export const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
export const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);
export const easeBack = Easing.bezier(0.34, 1.56, 0.64, 1);
export const easeInExpo = Easing.bezier(0.7, 0, 0.84, 0);

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
