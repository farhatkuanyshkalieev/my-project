/**
 * Тайминги голоса: абсолютная секунда любого слова на таймлайне.
 * plan — *.vo.json (старты клипов, необязательные сегменты), words — *.words.json (расшифровка клипов).
 */
type Plan = {
  duration: number;
  clips: Record<string, number>;
  segments?: Record<string, (number | null)[][]>;
};
type Words = Record<string, { dur: number; words: (string | number)[][] }>;

export const makeVo = (plan: Plan, words: Words) => {
  /** Перевод времени внутри клипа в абсолютное (с учётом разрезов клипа на сегменты) */
  const abs = (clip: string, t: number) => {
    const segs = plan.segments?.[clip];
    if (!segs) return plan.clips[clip] + t;
    for (const seg of segs) {
      const [from, to, at] = seg as [number, number | null, number];
      if (t >= from && (to === null || t < to)) return at + (t - from);
    }
    return plan.clips[clip] + t;
  };
  const w = (clip: string, i: number) => abs(clip, words[clip].words[i][1] as number);
  const ws = (clip: string, ...idx: number[]) => idx.map((i) => w(clip, i));
  const range = (clip: string, a: number, b: number) => ws(clip, ...Array.from({ length: b - a + 1 }, (_, k) => a + k));
  const clipEnd = (clip: string) => abs(clip, words[clip].dur - 0.001);
  return { w, ws, range, clipEnd, duration: plan.duration };
};
