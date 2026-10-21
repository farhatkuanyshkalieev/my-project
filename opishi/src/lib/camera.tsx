// Virtual 2.5D camera for a vertical 1080x1920 frame: layered SVG planes, parallax, DOF.
import React, {createContext, useContext} from 'react';
import {AbsoluteFill} from 'remotion';
import {H, W} from './design';

export type Cam = {x: number; y: number; zoom: number; rot?: number; focus?: number; dof?: number};
const M = 60; // off-frame margin so DOF blur never pulls in transparent edges
const CX = W / 2;
const CY = H / 2;
const CamCtx = createContext<Cam>({x: CX, y: CY, zoom: 1});

export const Camera: React.FC<{cam: Cam; children: React.ReactNode; style?: React.CSSProperties}> = ({cam, children, style}) => (
  <CamCtx.Provider value={cam}>
    <AbsoluteFill style={{overflow: 'hidden', transform: `rotate(${cam.rot ?? 0}deg) scale(${1 + Math.abs(cam.rot ?? 0) * 0.015})`, ...style}}>
      {children}
    </AbsoluteFill>
  </CamCtx.Provider>
);

export const Layer: React.FC<{pf?: number; depth?: number; children: React.ReactNode; blurBoost?: number; style?: React.CSSProperties}> = ({
  pf = 1,
  depth = 0,
  children,
  blurBoost = 0,
  style,
}) => {
  const cam = useContext(CamCtx);
  const scale = 1 + (cam.zoom - 1) * pf;
  const cx = CX + (cam.x - CX) * pf;
  const cy = CY + (cam.y - CY) * pf;
  const blur = Math.max(0, Math.abs(depth - (cam.focus ?? 0)) * (cam.dof ?? 0) * Math.sqrt(cam.zoom) + blurBoost);
  return (
    <AbsoluteFill style={{left: -M, top: -M, width: W + 2 * M, height: H + 2 * M, overflow: 'hidden', filter: blur > 0.15 ? `blur(${blur.toFixed(2)}px)` : undefined, ...style}}>
      <svg width={W + 2 * M} height={H + 2 * M} viewBox={`${-M} ${-M} ${W + 2 * M} ${H + 2 * M}`} style={{display: 'block'}}>
        <g transform={`translate(${CX} ${CY}) scale(${scale.toFixed(4)}) translate(${(-cx).toFixed(2)} ${(-cy).toFixed(2)})`}>{children}</g>
      </svg>
    </AbsoluteFill>
  );
};
