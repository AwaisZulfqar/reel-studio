import React from 'react';
import {useCurrentFrame} from 'remotion';
import {C, MONO, BORDER, SHADOW} from '../theme';
import {Scene, cueTime, itemText, pop} from '../util';
import {Title} from './common';

// Numbered steps / tips. Fields: title, hl, label, items[string | {text, sub, cue}], check (bool: tick items off)
export const List: React.FC<{scene: Scene}> = ({scene}) => {
  const f = useCurrentFrame();
  const items: any[] = scene.items ?? [];
  const gap = Math.min(190, 820 / Math.max(1, items.length));
  return (
    <>
      <Title text={scene.title ?? ''} hl={scene.hl} label={scene.label} />
      {items.map((it, i) => {
        const at = cueTime(scene, typeof it === 'string' ? undefined : it.cue, i, items.length);
        const p = pop(f, at);
        const sub = typeof it === 'string' ? undefined : it.sub;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: 450 + i * gap,
              left: 60,
              right: 60,
              height: gap - 26,
              display: 'flex',
              alignItems: 'center',
              gap: 28,
              padding: '0 30px',
              borderRadius: 18,
              background: C.card,
              border: BORDER,
              boxShadow: SHADOW,
              opacity: p,
              transform: `translateX(${(1 - p) * -80}px)`,
            }}
          >
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: 14,
                flexShrink: 0,
                color: '#fff',
                background: scene.check ? C.green : i % 2 ? C.ink : C.red,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: MONO,
                fontWeight: 700,
                fontSize: 40,
              }}
            >
              {scene.check ? '✓' : i + 1}
            </div>
            <div>
              <div style={{fontSize: Math.min(44, gap * 0.3), fontWeight: 800, lineHeight: 1.15}}>{itemText(it)}</div>
              {sub ? <div style={{fontSize: 28, color: C.dim, marginTop: 6, fontFamily: MONO}}>{sub}</div> : null}
            </div>
          </div>
        );
      })}
    </>
  );
};
