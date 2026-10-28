import React from 'react';
import {useCurrentFrame} from 'remotion';
import {C, MONO} from '../theme';
import {Scene, pop, fade} from '../util';
import {Hl} from './common';

// One big statement or number. Fields: emoji, text, hl, sub, label
export const Big: React.FC<{scene: Scene}> = ({scene}) => {
  const f = useCurrentFrame();
  const e = pop(f, 0.05, 9);
  return (
    <div style={{position: 'absolute', top: 380, left: 70, right: 70, textAlign: 'center'}}>
      {scene.label ? (
        <div style={{fontFamily: MONO, fontSize: 30, color: C.dim, letterSpacing: 3, opacity: fade(f, 0)}}>{scene.label.toUpperCase()}</div>
      ) : null}
      {scene.emoji ? <div style={{fontSize: 200, marginTop: 30, transform: `scale(${e}) rotate(${(1 - e) * -20}deg)`}}>{scene.emoji}</div> : null}
      <div
        style={{
          marginTop: 40,
          fontSize: String(scene.text ?? '').length > 40 ? 76 : 100,
          fontWeight: 900,
          lineHeight: 1.08,
          letterSpacing: -2,
          opacity: pop(f, 0.2),
          transform: `scale(${0.85 + 0.15 * pop(f, 0.2)})`,
        }}
      >
        <Hl text={scene.text ?? ''} hl={scene.hl} color={C.red} />
      </div>
      {scene.sub ? <div style={{marginTop: 40, fontSize: 44, color: C.dim, fontWeight: 600, opacity: fade(f, 0.6)}}>{scene.sub}</div> : null}
    </div>
  );
};
