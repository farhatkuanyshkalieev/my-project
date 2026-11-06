import { continueRender, delayRender } from "remotion";
import "./fonts/fonts.css";

// Шрифты лежат локально (src/fonts), ждём их загрузки перед рендером кадра
const fontHandle = delayRender("fonts");
Promise.all(
  [
    "500 40px Montserrat",
    "600 40px Montserrat",
    "700 40px Montserrat",
    "800 40px Montserrat",
    "700 40px 'Playfair Display'",
    "900 40px 'Playfair Display'",
  ].map((f) => document.fonts.load(f, "АБВ abc 0123")),
).then(() => continueRender(fontHandle));

export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;
export const DURATION_S = 57.5;

export const SANS = "Montserrat, sans-serif";
export const SERIF = "'Playfair Display', serif";

// Тёплое золото — цвет акцентов (под позолоту рукописей и куполов)
export const GOLD = "#F3C969";
export const GOLD_DEEP = "#C9963A";
export const IVORY = "#FFF8EC";

export const goldGradient = `linear-gradient(180deg, #FFE7A8 0%, ${GOLD} 45%, ${GOLD_DEEP} 100%)`;

export const softShadow =
  "0 2px 3px rgba(0,0,0,0.55), 0 6px 22px rgba(0,0,0,0.55)";

export const sec = (s: number) => Math.round(s * FPS);
