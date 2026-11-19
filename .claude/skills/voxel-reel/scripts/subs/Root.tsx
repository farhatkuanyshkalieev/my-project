import { Composition } from "remotion";
import { Subs } from "./Composition";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition id="Subs" component={Subs} durationInFrames={1535} fps={30} width={1080} height={1920} />
  );
};
