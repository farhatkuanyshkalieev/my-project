import {Composition} from 'remotion';
import {AtlantisAd} from './AtlantisAd';
import timeline from './timeline.json';

export const RemotionRoot: React.FC = () => (
  <Composition
    id="AtlantisAd"
    component={AtlantisAd}
    durationInFrames={timeline.total}
    fps={timeline.fps}
    width={1080}
    height={1920}
  />
);
