import React from "react";
import { Composition } from "remotion";
import { Short } from "./Short";
import plan from "./plan.json";

export const Root: React.FC = () => (
  <Composition id="Short" component={Short} durationInFrames={plan.total} fps={plan.fps} width={1080} height={1920} />
);
