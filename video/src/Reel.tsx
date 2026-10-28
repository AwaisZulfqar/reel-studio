import React from 'react';
import {AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {C, SANS, MONO} from './theme';
import {FPS, ReelProps, Scene} from './util';
import {Captions} from './Captions';
import {Hook} from './scenes/Hook';
import {Diagram} from './scenes/Diagram';
import {Code} from './scenes/Code';
import {Compare} from './scenes/Compare';
import {List} from './scenes/List';
import {Big} from './scenes/Big';
import {Cta} from './scenes/Cta';

const SCENES: Record<string, React.FC<{scene: Scene}>> = {
  hook: Hook,
  diagram: Diagram,
  code: Code,
  compare: Compare,
  list: List,
  big: Big,
  cta: Cta,
};

// Paper with faint graph lines and a little grain
const Background: React.FC = () => (
  <AbsoluteFill style={{background: C.bg}}>
    <AbsoluteFill
      style={{
        backgroundImage: `linear-gradient(${C.soft}66 2px, transparent 2px), linear-gradient(90deg, ${C.soft}66 2px, transparent 2px)`,
        backgroundSize: '90px 90px',
        backgroundPosition: '-2px -2px',
      }}
    />
  </AbsoluteFill>
);

// Hard cut between scenes; new content only slides up slightly (no fade to empty, so no flicker)
const SceneShell: React.FC<{children: React.ReactNode}> = ({children}) => {
  const f = useCurrentFrame();
  const y = interpolate(f, [0, 6], [24, 0], {extrapolateRight: 'clamp'});
  return <AbsoluteFill style={{transform: `translateY(${y}px)`}}>{children}</AbsoluteFill>;
};

const Header: React.FC<{handle: string; total: number; tag?: string}> = ({handle, total, tag}) => {
  const f = useCurrentFrame();
  const p = Math.min(1, f / (total * FPS));
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', top: 70, left: 60, right: 60, height: 6, background: C.soft}}>
        <div style={{width: `${p * 100}%`, height: '100%', background: C.ink}} />
      </div>
      <div
        style={{
          position: 'absolute',
          top: 100,
          left: 60,
          right: 60,
          display: 'flex',
          justifyContent: 'space-between',
          fontFamily: MONO,
          fontSize: 30,
          fontWeight: 700,
          color: C.ink,
        }}
      >
        <span>{handle}</span>
        {tag ? <span style={{color: C.red}}>#{tag}</span> : null}
      </div>
    </AbsoluteFill>
  );
};

export const Reel: React.FC<ReelProps> = (props) => {
  const tag = props.scenes.find((s) => s.type === 'hook')?.tag;
  const total = Math.ceil(props.duration * FPS);
  // contiguous frame ranges so there is never a gap frame between scenes
  const starts = props.scenes.map((s) => Math.round(s.start * FPS));
  return (
    <AbsoluteFill style={{fontFamily: SANS, color: C.ink}}>
      <Background />
      {props.scenes.map((s, i) => {
        const View = SCENES[s.type] ?? Big;
        const from = starts[i];
        const to = i + 1 < starts.length ? starts[i + 1] : total;
        return (
          <Sequence key={i} from={from} durationInFrames={Math.max(1, to - from)}>
            <SceneShell>
              <View scene={s} />
            </SceneShell>
          </Sequence>
        );
      })}
      <Header handle={props.handle} total={props.duration} tag={tag} />
      <Captions scenes={props.scenes} keywords={props.keywords ?? []} />
      {props.audio ? <Audio src={staticFile(props.audio)} /> : null}
      {props.music ? <Audio src={staticFile(props.music)} volume={props.musicVolume ?? 0.1} loop /> : null}
    </AbsoluteFill>
  );
};
