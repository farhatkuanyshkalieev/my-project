import { Composition } from "remotion";
import { DURATION_S, LishniyVes } from "./reels/LishniyVes";

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
    </>
  );
};
