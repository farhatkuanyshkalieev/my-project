import React from "react";
import { Sequence, staticFile } from "remotion";
import { Audio } from "@remotion/media";
import { s2f } from "../lib/anim";

/** Сколько секунд от начала файла до «удара» — чтобы пик звука попадал ровно в событие */
const SFX = {
  boom: { file: "boom.wav", lead: 0.05, vol: 0.9 },
  bass_hit: { file: "bass_hit.wav", lead: 0.16, vol: 0.55 },
  whoosh_fast: { file: "whoosh_fast.wav", lead: 0.26, vol: 0.5 },
  swoosh: { file: "swoosh.wav", lead: 0.4, vol: 0.5 },
  whoosh_line: { file: "whoosh_line.wav", lead: 0.31, vol: 0.45 },
  deep_whoosh: { file: "deep_whoosh.wav", lead: 1.38, vol: 0.8 },
  pop: { file: "pop.wav", lead: 0.0, vol: 0.45 },
  notify: { file: "notify.wav", lead: 0.17, vol: 0.55 },
  glitch: { file: "glitch.wav", lead: 0.22, vol: 0.5 },
  tick: { file: "tick.wav", lead: 0.0, vol: 0.18 },
  click: { file: "click.wav", lead: 0.05, vol: 1 },
  soft_wipe: { file: "soft_wipe.wav", lead: 0.14, vol: 0.35 },
  rise: { file: "rise.wav", lead: 0.29, vol: 0.4 },
  riser: { file: "riser.wav", lead: 1.72, vol: 0.45 },
  object: { file: "object.wav", lead: 0.17, vol: 0.35 },
} as const;

export type SfxName = keyof typeof SFX;
export type Cue = [number, SfxName] | [number, SfxName, number];

/** Список звуковых событий: [секунда удара, звук, (громкость)] */
export const SfxTrack: React.FC<{ cues: Cue[] }> = ({ cues }) => (
  <>
    {cues.map(([t, name, vol], i) => {
      const s = SFX[name];
      const from = s2f(t - s.lead);
      const trim = from < 0 ? -from : 0;
      return (
        <Sequence key={i} from={Math.max(0, from)} layout="none" name={`sfx ${name} @${t}s`}>
          <Audio src={staticFile(`sfx/${s.file}`)} volume={vol ?? s.vol} trimBefore={trim || undefined} />
        </Sequence>
      );
    })}
  </>
);
