// Render-time switches (pass via --props) used for profiling and fast previews.
import {getInputProps} from 'remotion';

const p = getInputProps() as Record<string, unknown>;
export const FLAGS = {
  noGrain: !!p.noGrain,
  noLayerBlur: !!p.noLayerBlur,
  noSvgBlur: !!p.noSvgBlur,
  noGrade: !!p.noGrade,
};
