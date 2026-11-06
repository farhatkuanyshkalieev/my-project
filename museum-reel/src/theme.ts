import { continueRender, delayRender } from "remotion";
import "./typefaces/fonts.css";

// Шрифты лежат локально (src/typefaces), ждём их загрузки перед рендером кадра
const fontHandle = delayRender("fonts");
Promise.all(
  [
    "600 40px Montserrat",
    "700 40px Montserrat",
    "800 40px Montserrat",
    "700 40px Comfortaa",
  ].map((f) => document.fonts.load(f, "АБВ abc 0123")),
).then(() => continueRender(fontHandle));

export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;
export const DURATION_S = 51.6;
export const VO_END = 49.8;

// Как в референсе: субтитры — Montserrat, крупные вставки — Comfortaa
export const SANS = "Montserrat, sans-serif";
export const DISPLAY = "Comfortaa, sans-serif";

export const YELLOW = "#FFE01A";
export const ORANGE = "#FF7A1A";
export const WHITE = "#FFFFFF";

export const sec = (s: number) => Math.round(s * FPS);
