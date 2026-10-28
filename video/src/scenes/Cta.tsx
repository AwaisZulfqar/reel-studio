import React from 'react';
import {useCurrentFrame} from 'remotion';
import {C, BORDER, SHADOW} from '../theme';
import {Scene, pop, cueTime, FPS} from '../util';
import {Hl} from './common';

// Closing call to action. Fields: text, hl, sub, button (default Follow)
export const Cta: React.FC<{scene: Scene}> = ({scene}) => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const tapAt = Math.max(0.8, cueTime(scene, scene.tapCue ?? 'follow', 0, 1, 0.45, 0.45));
  const on = t >= tapAt;
  const b = pop(f, 0.3);
  const squish = on ? 1 - 0.1 * Math.max(0, Math.sin(Math.PI * Math.min(1, (t - tapAt) / 0.25))) : 1;
  const ring = on ? Math.min(1, (t - tapAt) / 0.5) : 0;
  return (
    <div style={{position: 'absolute', top: 420, left: 70, right: 70, textAlign: 'center'}}>
      <div style={{fontSize: 84, fontWeight: 900, lineHeight: 1.1, letterSpacing: -1, opacity: pop(f, 0)}}>
        <Hl text={scene.text ?? 'Follow for daily interview prep'} hl={scene.hl} color={C.red} />
      </div>
      <div style={{position: 'relative', marginTop: 90, display: 'flex', justifyContent: 'center'}}>
        {on && ring < 1 ? (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: 520 * (0.6 + ring),
              height: 140 * (0.6 + ring) + 100 * ring,
              transform: 'translate(-50%,-50%)',
              borderRadius: 120,
              border: `5px solid ${C.ink}`,
              opacity: 1 - ring,
            }}
          />
        ) : null}
        <div
          style={{
            width: 520,
            height: 140,
            borderRadius: 24,
            color: on ? C.ink : '#fff',
            background: on ? '#EFEFEF' : C.blue,
            border: BORDER,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 56,
            fontWeight: 800,
            transform: `scale(${b * squish})`,
            boxShadow: SHADOW,
          }}
        >
          {on ? 'Following ✓' : `+ ${scene.button ?? 'Follow'}`}
        </div>
      </div>
      {scene.sub ? <div style={{marginTop: 70, fontSize: 44, color: C.dim, fontWeight: 600, opacity: pop(f, 1)}}>{scene.sub}</div> : null}
    </div>
  );
};
