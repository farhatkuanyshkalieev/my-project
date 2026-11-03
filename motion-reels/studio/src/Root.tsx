import { Composition } from "remotion";
import { DURATION_S, LishniyVes } from "./reels/LishniyVes";
import { FLAT_DURATION_S, LishniyVesFlat } from "./reels/LishniyVesFlat";
import { LENIVY_DURATION_S, LenivySport } from "./reels/LenivySport";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="LishniyVes"
        component={LishniyVes}
        durationInFrames={Math.round(DURATION_S * 30)}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="LishniyVesFlat"
        component={LishniyVesFlat}
        durationInFrames={Math.round(FLAT_DURATION_S * 30)}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="LenivySport"
        component={LenivySport}
        durationInFrames={Math.round(LENIVY_DURATION_S * 30)}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
};
