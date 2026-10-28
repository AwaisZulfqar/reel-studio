import React from 'react';
import {useCurrentFrame} from 'remotion';
import {C, MONO, SERIF} from '../theme';
import {fade} from '../util';

// Renders text with the `hl` part in red serif italic (the editorial accent)
export const Hl: React.FC<{text: string; hl?: string; color?: string}> = ({text, hl, color = C.red}) => {
  if (!hl || !text.toLowerCase().includes(hl.toLowerCase())) return <>{text}</>;
  const i = text.toLowerCase().indexOf(hl.toLowerCase());
  return (
    <>
      {text.slice(0, i)}
      <span style={{fontFamily: SERIF, fontWeight: 400, color, letterSpacing: 0}}>{text.slice(i, i + hl.length)}</span>
      {text.slice(i + hl.length)}
    </>
  );
};

export const Title: React.FC<{text: string; hl?: string; label?: string; top?: number}> = ({text, hl, label, top = 200}) => {
  const f = useCurrentFrame();
  const o = fade(f, 0, 0.25);
  return (
    <div style={{position: 'absolute', top, left: 70, right: 70, opacity: o, transform: `translateY(${(1 - o) * 16}px)`}}>
      {label ? (
        <div style={{fontFamily: MONO, fontSize: 28, color: C.dim, letterSpacing: 1, marginBottom: 14}}>
          {'// '}
          {label.toLowerCase()}
        </div>
      ) : null}
      <div style={{fontSize: 68, fontWeight: 800, lineHeight: 1.08, letterSpacing: -1.5, color: C.ink}}>
        <Hl text={text} hl={hl} />
      </div>
    </div>
  );
};
