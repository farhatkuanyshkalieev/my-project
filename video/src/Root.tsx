import {Composition} from 'remotion';
import {DentLineAd} from './DentLineAd';
import timeline from './timeline.json';

export const RemotionRoot: React.FC = () => (
  <Composition
    id="DentLineAd"
    component={DentLineAd}
    durationInFrames={timeline.total}
    fps={timeline.fps}
    width={1080}
    height={1920}
  />
);
