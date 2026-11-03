import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

// Палитра снята с кадров референса (см. motion-reels/STYLE_GUIDE.md)
export const C = {
  bgCenter: "#F4F2F5",
  bgMid: "#E6E3E7",
  bgEdge: "#C6C3C8",
  ink: "#1E1C1F",
  grey: "#A3A0A6",
  wine: "#973A4D",
  wineText: "#7A1F2E",
  darkCenter: "#3A373C",
  darkMid: "#2C292D",
  darkEdge: "#18161A",
  white: "#FFFFFF",
};

export const FONT = "Inter Tight";
export const SCRIPT = "Great Vibes";

const CYR = "U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116";
const LAT =
  "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD";

const faces: Promise<void>[] = [];
for (const w of ["500", "600", "700", "800"]) {
  faces.push(
    loadFont({ family: FONT, weight: w, url: staticFile(`fonts/inter-tight-cyrillic-${w}-normal.woff2`), unicodeRange: CYR }),
    loadFont({ family: FONT, weight: w, url: staticFile(`fonts/inter-tight-latin-${w}-normal.woff2`), unicodeRange: LAT }),
  );
}
faces.push(
  loadFont({ family: SCRIPT, url: staticFile("fonts/great-vibes-cyrillic-400-normal.woff2"), unicodeRange: CYR }),
  loadFont({ family: SCRIPT, url: staticFile("fonts/great-vibes-latin-400-normal.woff2"), unicodeRange: LAT }),
);
// Стиль №2 (инфографика): Montserrat
export const MONT = "Montserrat";
for (const w of ["500", "600", "700", "800", "900"]) {
  faces.push(
    loadFont({ family: MONT, weight: w, url: staticFile(`fonts/montserrat-cyrillic-${w}-normal.woff2`), unicodeRange: CYR }),
    loadFont({ family: MONT, weight: w, url: staticFile(`fonts/montserrat-latin-${w}-normal.woff2`), unicodeRange: LAT }),
  );
}
export const fontsLoaded = Promise.all(faces);

// Базовая типографика: строчные, жирный гротеск, очень плотный трекинг
export const textStyle: React.CSSProperties = {
  fontFamily: `'${FONT}', sans-serif`,
  fontWeight: 700,
  letterSpacing: "-0.055em",
  lineHeight: 0.98,
};
