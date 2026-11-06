import { Composition } from "remotion";
import { MuseumReel } from "./MuseumReel";
import { DURATION_S, FPS, HEIGHT, WIDTH } from "./theme";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="MuseumReel"
      component={MuseumReel}
      durationInFrames={Math.round(DURATION_S * FPS)}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
  );
};
