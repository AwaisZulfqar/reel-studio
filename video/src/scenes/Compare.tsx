import React from 'react';
import {useCurrentFrame} from 'remotion';
import {C, BORDER, SHADOW} from '../theme';
import {Scene, cueTime, itemText, pop} from '../util';
import {Title} from './common';

type Side = {title: string; icon?: string; points: any[]; color?: string};

// Side by side comparison. Fields: title, hl, label, left{title,icon,points[]}, right{...}
export const Compare: React.FC<{scene: Scene}> = ({scene}) => {
  const f = useCurrentFrame();
  const sides: Side[] = [scene.left, scene.right].filter(Boolean);
  const n = Math.max(...sides.map((s) => s.points.length));
  const cols = [C.red, C.blue];
  return (
    <>
      <Title text={scene.title ?? ''} hl={scene.hl} label={scene.label} />
      <div style={{position: 'absolute', top: 470, left: 50, right: 50, display: 'flex', gap: 30}}>
        {sides.map((s, si) => {
          const col = s.color ?? cols[si];
          const head = pop(f, cueTime(scene, s.title.split(' ')[0], si, 2, 0.05, 0.25));
          return (
            <div
              key={si}
              style={{
                flex: 1,
                borderRadius: 18,
                border: BORDER,
                background: C.card,
                boxShadow: SHADOW,
                padding: '36px 30px',
                transform: `scale(${head})`,
                minHeight: 620,
              }}
            >
              <div style={{fontSize: 90, textAlign: 'center'}}>{s.icon ?? (si ? '⚡' : '🧱')}</div>
              <div style={{fontSize: 68, fontWeight: 900, textAlign: 'center', color: col, marginBottom: 36}}>{s.title}</div>
              {s.points.map((pt, i) => {
                const at = cueTime(scene, typeof pt === 'string' ? undefined : pt.cue, i * 2 + si, n * 2, 0.3, 0.85);
                const p = pop(f, at);
                return (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      gap: 14,
                      fontSize: 42,
                      fontWeight: 700,
                      lineHeight: 1.2,
                      marginBottom: 34,
                      opacity: p,
                      transform: `translateX(${(1 - p) * (si ? 40 : -40)}px)`,
                    }}
                  >
                    <span style={{color: col}}>●</span>
                    <span>{itemText(pt)}</span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </>
  );
};
