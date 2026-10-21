// Master edit decision list (seconds). Every scene, subtitle and sound cue reads from here.
import {VO} from '../data/vo';
import {FPS} from './anim';

export const TOTAL_S = 60;
export const TOTAL = TOTAL_S * FPS;

export const CHAPTERS = [
  {id: 'c1', label: 'НАЧАЛО ОТНОШЕНИЙ:', start: 4.0, end: 17.7},
  {id: 'c2', label: 'ПОЛГОДА ОТНОШЕНИЙ:', start: 17.7, end: 28.15},
  {id: 'c3', label: 'ГОД ОТНОШЕНИЙ:', start: 28.15, end: 40.8},
  {id: 'c4', label: 'ПОЛТОРА ГОДА ОТНОШЕНИЙ:', start: 40.8, end: 48.0},
  {id: 'c5', label: 'СЕЙЧАС:', start: 48.0, end: 57.6},
];

// When each voice line starts (seconds)
export const LINE_AT: Record<string, number> = {
  L1: 6.15,
  M1: 10.8,
  L2: 14.15,
  M2: 15.9,
  M3: 18.05,
  L3: 21.05,
  M4: 24.7,
  L4: 30.0,
  M5: 34.4,
  L5: 35.45,
  LP: 42.9,
  M6: 44.9,
  L6: 48.2,
  M7: 51.4,
  L7: 52.3,
  M8: 55.2,
};

// Subtitle text, split into readable phrases with their own start offsets (s, relative to line)
export const SUBS: Record<string, [number, string][]> = {
  L1: [[0, 'это что… я?!'], [2.1, 'ты ненормальный!']],
  M1: [[0, 'ненормально талантливый.'], [1.9, 'привыкай.']],
  L2: [[0, 'нарисуешь меня ещё раз?']],
  M2: [[0, 'хоть каждый день.']],
  M3: [[0, 'Лиз! мою картину взяли на выставку!']],
  L3: [[0, 'круто…'], [1.35, 'а деньги за это будут?']],
  M4: [[0, 'ну… это же опыт.']],
  L4: [[0, 'я скинула тебе вакансию.'], [1.95, 'нормальная работа. нормальные деньги.']],
  M5: [[0, 'а картины?']],
  L5: [[0, 'Марк, тебе двадцать семь.'], [2.6, 'хватит играть в художника.']],
  LP: [[0, 'купи хлеба по дороге, ладно?']],
  M6: [[0, 'да.'], [1.4, 'куплю.']],
  L6: [[0, 'помнишь…'], [0.9, 'ты рисовал меня на стаканчиках?']],
  M7: [[0, 'угу.']],
  L7: [[0, 'нарисуй меня…'], [1.4, 'ещё раз.']],
  M8: [[0, 'я уже не помню…'], [1.5, 'как.']],
};

export const lineFrame = (id: string) => Math.round(LINE_AT[id] * FPS);
export const lineEnd = (id: string) => lineFrame(id) + Math.round(VO[id].dur * FPS);

// Mouth openness for a character at an absolute frame
export const talkAt = (frame: number, ids: string[]) => {
  for (const id of ids) {
    const i = frame - lineFrame(id);
    const env = VO[id].env;
    if (i >= 0 && i < env.length) return env[i];
  }
  return 0;
};
export const MARK_LINES = Object.keys(LINE_AT).filter((k) => k.startsWith('M'));
export const LISA_LINES = Object.keys(LINE_AT).filter((k) => k.startsWith('L') && k !== 'LP');
