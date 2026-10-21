// Virtual 2.5D camera: layered SVG planes with parallax and depth-of-field blur.
import React, {createContext, useContext} from 'react';
import {AbsoluteFill} from 'remotion';
import {FLAGS} from './flags';

export type Cam = {x: number; y: number; zoom: number; rot?: number; focus?: number; dof?: number};
// off-frame margin so DOF blur never pulls in transparent edges
const M = 60;
const CamCtx = createContext<Cam>({x: 960, y: 540, zoom: 1});

export const Camera: React.FC<{cam: Cam; children: React.ReactNode; style?: React.CSSProperties}> = ({cam, children, style}) => (
  <CamCtx.Provider value={cam}>
    <AbsoluteFill style={{overflow: 'hidden', transform: `rotate(${cam.rot ?? 0}deg) scale(${1 + Math.abs(cam.rot ?? 0) * 0.012})`, ...style}}>
      {children}
    </AbsoluteFill>
  </CamCtx.Provider>
);

// pf: parallax factor (1 = focal plane, <1 = farther, >1 = nearer than subject)
// depth: used for DOF; distance from focus plane in arbitrary units
export const Layer: React.FC<{
  pf?: number;
  depth?: number;
  children: React.ReactNode;
  blurBoost?: number;
  style?: React.CSSProperties;
}> = ({pf = 1, depth = 0, children, blurBoost = 0, style}) => {
  const cam = useContext(CamCtx);
  const scale = 1 + (cam.zoom - 1) * pf;
  const cx = 960 + (cam.x - 960) * pf;
  const cy = 540 + (cam.y - 540) * pf;
  const focus = cam.focus ?? 0;
  const blur = Math.max(0, Math.abs(depth - focus) * (cam.dof ?? 0) * Math.sqrt(cam.zoom) + blurBoost);
  const g = (
    <g transform={`translate(960 540) scale(${scale.toFixed(4)}) translate(${(-cx).toFixed(2)} ${(-cy).toFixed(2)})`}>{children}</g>
  );
  if (blur > 1.2 && !FLAGS.noLayerBlur && false) {
    // Blurred planes are rasterised at quarter resolution and scaled up: identical look, ~16x cheaper.
    const k = blur > 4 ? 4 : 2;
    return (
      <AbsoluteFill style={{...style}}>
        <div style={{position: 'absolute', left: 0, top: 0, width: 1920 / k, height: 1080 / k, transform: `scale(${k})`, transformOrigin: '0 0', filter: `blur(${(blur / k).toFixed(2)}px)`}}>
          <svg width={1920 / k} height={1080 / k} viewBox="0 0 1920 1080" style={{overflow: 'visible', display: 'block'}}>
            {g}
          </svg>
        </div>
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={{left: -M, top: -M, width: 1920 + 2 * M, height: 1080 + 2 * M, filter: blur > 0.15 && !FLAGS.noLayerBlur ? `blur(${blur.toFixed(2)}px)` : undefined, overflow: 'hidden', ...style}}>
      <svg width={1920 + 2 * M} height={1080 + 2 * M} viewBox={`${-M} ${-M} ${1920 + 2 * M} ${1080 + 2 * M}`} style={{overflow: 'hidden', display: 'block'}}>
        {g}
      </svg>
    </AbsoluteFill>
  );
};

export const useCam = () => useContext(CamCtx);
