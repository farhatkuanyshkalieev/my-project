import { AbsoluteFill, useCurrentFrame } from "remotion";
import { SenseTitle } from "../components/SenseTitle";
import { colors, ip } from "../theme";

// One-line face profile (eyes closed, serene), then a beam of light glides across = glow.
const PROFILE =
  "M 150 130 C 210 50, 360 50, 400 150 C 415 190, 418 230, 415 262 C 418 282, 432 304, 456 346 " +
  "C 463 360, 462 373, 447 378 C 439 382, 435 390, 440 398 C 452 405, 452 418, 440 424 " +
  "C 449 432, 448 446, 436 452 C 428 458, 428 468, 432 482 C 438 502, 424 526, 394 531 " +
  "C 368 535, 350 548, 346 600 L 346 720";
const EYE = "M 362 300 C 373 312, 390 312, 400 302";
const LASHES = "M 368 306 L 362 318 M 380 310 L 377 323 M 392 308 L 393 320";

export const SightScene: React.FC = () => {
  const f = useCurrentFrame();
  const draw = ip(f, [4, 46], [1, 0]);
  const beam = ip(f, [40, 80], [-500, 1200], (t) => t);
  const sparkle = ip(f, [55, 64, 80], [0, 1, 0.6]);
  return (
    <AbsoluteFill>
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        <defs>
          <radialGradient id="glow">
            <stop offset="0" stopColor="#fff" stopOpacity="0.95" />
            <stop offset="1" stopColor={colors.goldLight} stopOpacity="0" />
          </radialGradient>
          <linearGradient id="beam" gradientUnits="userSpaceOnUse" x1={beam} y1="0" x2={beam + 260} y2="200">
            <stop offset="0" stopColor="#fff" stopOpacity="0" />
            <stop offset="0.5" stopColor="#fff" stopOpacity="0.85" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <g transform="translate(210 560) scale(1.15)">
          <circle cx={385} cy={385} r={ip(f, [44, 70], [0, 160])} fill="url(#glow)" />
          <path d={PROFILE} fill="none" stroke={colors.goldDeep} strokeWidth={3} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={draw} />
          <path d={EYE} fill="none" stroke={colors.goldDeep} strokeWidth={3} strokeLinecap="round" opacity={ip(f, [30, 40], [0, 1])} />
          <path d={LASHES} fill="none" stroke={colors.goldDeep} strokeWidth={2} strokeLinecap="round" opacity={ip(f, [34, 44], [0, 1])} />
          <g transform={`translate(392 372) scale(${sparkle * 0.7})`}>
            <path d="M0 -34 L6 -6 L34 0 L6 6 L0 34 L-6 6 L-34 0 L-6 -6 Z" fill="#fff" />
          </g>
        </g>
        <rect width={1080} height={1920} fill="url(#beam)" opacity={0.7} style={{ mixBlendMode: "screen" }} />
      </svg>
      <SenseTitle index={4} word="Взгляд" caption="сияние в отражении" />
    </AbsoluteFill>
  );
};
