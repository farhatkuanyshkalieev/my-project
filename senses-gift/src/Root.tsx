import { Composition, Folder } from "remotion";
import { SCENES, SensesGift, TOTAL } from "./SensesGift";

const W = 1080;
const H = 1920;

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="SensesGift" component={SensesGift} width={W} height={H} fps={30} durationInFrames={TOTAL} />
    <Folder name="Scenes">
      {SCENES.map((s) => (
        <Composition key={s.name} id={s.name} component={s.component} width={W} height={H} fps={30} durationInFrames={s.durationInFrames} />
      ))}
    </Folder>
  </>
);
