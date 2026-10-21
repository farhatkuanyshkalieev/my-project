import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Mira} from '../rig/Mira';
import {Timur} from '../rig/Timur';
import {EXPR} from '../rig/expr';

export const RigTest: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{background: '#D9CCF6'}}>
      <svg width={1080} height={1920}>
        <g transform="translate(540 480) scale(0.9)">
          <Timur id="t" frame={frame} e={EXPR.cool} />
        </g>
        <g transform="translate(270 1430) scale(0.45)">
          <Mira id="a" frame={frame} e={EXPR.grin} />
        </g>
        <g transform="translate(810 1400) scale(0.45)">
          <Timur id="t2" frame={frame} e={EXPR.shocked} outfit="tee" />
        </g>
      </svg>
    </AbsoluteFill>
  );
};
