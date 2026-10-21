// Shot list helper: picks the active shot and eases its camera move, adds handheld.
import {Cam} from './camera';
import {ease, EaseFn, FPS, handheld, invLerp, lerp} from './anim';

export type Shot = {t0: number; t1: number; from: Cam; to?: Cam; ease?: EaseFn; shake?: number; id: string};

export const camAt = (frame: number, shots: Shot[], seed = 1): {cam: Cam; shot: Shot; local: number} => {
  const s = frame / FPS;
  let shot = shots[0];
  for (const sh of shots) if (s >= sh.t0) shot = sh;
  const to = shot.to ?? shot.from;
  const k = (shot.ease ?? ease.inOutQuad)(invLerp(shot.t0, shot.t1, s));
  const hh = handheld(frame, seed + shots.indexOf(shot) * 3, shot.shake ?? 0.6);
  const cam: Cam = {
    x: lerp(shot.from.x, to.x, k) + hh.x / Math.max(1, lerp(shot.from.zoom, to.zoom, k)),
    y: lerp(shot.from.y, to.y, k) + hh.y / Math.max(1, lerp(shot.from.zoom, to.zoom, k)),
    zoom: lerp(shot.from.zoom, to.zoom, k),
    rot: lerp(shot.from.rot ?? 0, to.rot ?? 0, k) + hh.r,
    focus: lerp(shot.from.focus ?? 0, to.focus ?? 0, k),
    dof: lerp(shot.from.dof ?? 0, to.dof ?? 0, k),
  };
  return {cam, shot, local: frame - Math.round(shot.t0 * FPS)};
};

export const S = (s: number) => Math.round(s * FPS);
