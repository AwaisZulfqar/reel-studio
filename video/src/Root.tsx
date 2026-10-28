import {Composition} from 'remotion';
import {Reel} from './Reel';
import {FPS, ReelProps} from './util';
import sample from './sample.json';

export const RemotionRoot = () => (
  <Composition
    id="Reel"
    component={Reel}
    width={1080}
    height={1920}
    fps={FPS}
    durationInFrames={300}
    defaultProps={sample as unknown as ReelProps}
    calculateMetadata={({props}) => ({durationInFrames: Math.max(1, Math.ceil(props.duration * FPS))})}
  />
);
