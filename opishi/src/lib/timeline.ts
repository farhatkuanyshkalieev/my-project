// Master edit list (seconds). Scenes, subtitles, lip sync and the sound mix all read from here.
import {VO} from '../data/vo';
import {FPS} from './anim';

export const TOTAL_S = 100;
export const TOTAL = TOTAL_S * FPS;

export const CH = {
  title: [0, 6.5],
  c1: [6.5, 27.0],
  c2: [27.0, 38.5],
  c3: [38.5, 58.0],
  c4: [58.0, 68.5],
  c5: [68.5, 100],
} as const;

export const CHAPTERS = [
  {id: 'c1', label: 'НАЧАЛО:', start: 6.5, end: 26.6},
  {id: 'c2', label: 'ПОЛГОДА СПУСТЯ:', start: 27.0, end: 38.1},
  {id: 'c3', label: 'ГОД СПУСТЯ:', start: 38.5, end: 57.6},
  {id: 'c4', label: 'ПОСЛЕДНИЙ ДЕНЬ:', start: 58.0, end: 68.1},
  {id: 'c5', label: 'ТРИ ГОДА СПУСТЯ:', start: 68.5, end: 96.5},
];

export const LINE_AT: Record<string, number> = {
  T1: 9.4,
  M1: 12.9,
  T2: 18.6,
  M2: 23.2,
  T3: 29.4,
  M3: 33.2,
  T4: 42.4,
  M4: 45.3,
  T5: 49.2,
  M5: 52.8,
  MN: 61.4,
  M6: 73.6,
  T6: 76.0,
  M7: 83.6,
  T7: 88.2,
  M8: 90.0,
};

export const SUBS: Record<string, [number, string][]> = {
  T1: [[0, 'сними очки.'], [1.05, 'хочу увидеть твои глаза.']],
  M1: [[0, 'не-а.'], [0.7, 'через них мир зеленее.'], [3.0, 'лучше опиши мне закат.']],
  T2: [[0, 'оранжевый.'], [1.1, 'будто кто-то пролил апельсиновый сок на небо.']],
  M2: [[0, 'ужасно!'], [1.75, 'ещё.']],
  T3: [[0, 'опять в очках?'], [2.0, 'ночь же на дворе.']],
  M3: [[0, 'свет режет.'], [0.85, 'всё нормально, правда.']],
  T4: [[0, 'Мира…'], [1.05, 'почему ты молчала?!']],
  M4: [[0, 'потому что ты бы остался.'], [2.5, 'из жалости.']],
  T5: [[0, 'я бы остался, потому что люблю тебя!']],
  M5: [[0, 'вот поэтому мне и надо уйти.']],
  MN: [[0, 'не ищи меня.'], [1.45, 'смотри вперёд…'], [2.6, 'за нас двоих.']],
  M6: [[0, 'здесь кто-то сел?']],
  T6: [[0, 'да…'], [1.0, 'тут закат.'], [2.4, 'оранжевый.'], [3.5, 'будто кто-то пролил апельсиновый сок на небо.']],
  M7: [[0, 'один человек…'], [1.75, 'описывал мне закат точно так же.']],
  T7: [[0, 'и что с ним стало?']],
  M8: [[0, 'я его отпустила.'], [1.75, 'чтобы он видел…'], [3.15, 'за нас двоих.']],
};

export const lineFrame = (id: string) => Math.round(LINE_AT[id] * FPS);
export const talkAt = (frame: number, ids: string[]) => {
  for (const id of ids) {
    const i = frame - lineFrame(id);
    const env = VO[id].env;
    if (i >= 0 && i < env.length) return env[i];
  }
  return 0;
};
export const S = (s: number) => Math.round(s * FPS);
export const at = (id: string, off = 0) => lineFrame(id) + S(off);
