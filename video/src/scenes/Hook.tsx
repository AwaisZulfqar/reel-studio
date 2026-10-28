import React from 'react';
import {useCurrentFrame} from 'remotion';
import {C, MONO, SERIF, BORDER, SHADOW} from '../theme';
import {Scene, pop, fade, norm} from '../util';

// Opening question. Fields: label (small tag), title, hl (words in red serif), tag (topic), sub
export const Hook: React.FC<{scene: Scene}> = ({scene}) => {
  const f = useCurrentFrame();
  const words = String(scene.title ?? '').split(' ');
  const hot = String(scene.hl ?? '').split(' ').map(norm);
  const tagP = pop(f, 0);
  return (
    <div style={{position: 'absolute', top: 400, left: 70, right: 70}}>
      <div
        style={{
          display: 'inline-block',
          fontFamily: MONO,
          fontSize: 30,
          fontWeight: 700,
          color: '#fff',
          background: C.red,
          border: BORDER,
          boxShadow: SHADOW,
          padding: '10px 22px',
          transform: `rotate(-2deg) scale(${tagP})`,
          transformOrigin: 'left',
        }}
      >
        {String(scene.label ?? 'Interview question').toUpperCase()}
      </div>
      <div style={{marginTop: 70, fontSize: 112, fontWeight: 900, lineHeight: 1.02, letterSpacing: -3}}>
        {words.map((w, i) => {
          const p = pop(f, 0.1 + i * 0.06, 14);
          const isHot = hot.includes(norm(w));
          return (
            <span
              key={i}
              style={{
                display: 'inline-block',
                marginRight: 24,
                opacity: p,
                transform: `translateY(${(1 - p) * 30}px)`,
                ...(isHot ? {fontFamily: SERIF, fontWeight: 400, color: C.red, letterSpacing: 0, fontSize: 128} : {}),
              }}
            >
              {w}
            </span>
          );
        })}
      </div>
      {scene.sub ? (
        <div style={{marginTop: 50, fontSize: 44, color: C.dim, fontWeight: 600, opacity: fade(f, 0.3 + words.length * 0.06)}}>{scene.sub}</div>
      ) : null}
    </div>
  );
};
