import React from 'react';
import {useCurrentFrame, interpolate} from 'remotion';
import {C, MONO, BORDER, SHADOW} from '../theme';
import {Scene, cueTime, pop, FPS} from '../util';
import {Title} from './common';

const KW = new Set(
  'const let var function return if else for while do switch case break continue new class extends super this async await import export from default try catch finally throw typeof instanceof in of null undefined true false yield static get set def self None True False elif lambda pass public private void int string interface type enum'.split(
    ' ',
  ),
);
const BUILTIN = new Set('console log setTimeout setInterval Promise resolve reject then fetch Array Object Map Set JSON Math queueMicrotask print len range'.split(' '));

// Tiny tokenizer good enough for JS/TS/Python snippets
const tokens = (line: string): {t: string; c: string}[] => {
  const out: {t: string; c: string}[] = [];
  const re = /(\/\/.*$|#.*$|"[^"]*"?|'[^']*'?|`[^`]*`?|\b\d+(\.\d+)?\b|\b[A-Za-z_$][\w$]*\b|\s+|[^\sA-Za-z_$\d])/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line))) {
    const s = m[0];
    let c = '#9CDCFE';
    if (/^(\/\/|#)/.test(s)) c = '#6A9955';
    else if (/^["'`]/.test(s)) c = '#CE9178';
    else if (/^\d/.test(s)) c = '#B5CEA8';
    else if (KW.has(s)) c = '#569CD6';
    else if (BUILTIN.has(s)) c = '#4EC9B0';
    else if (/^[A-Za-z_$]/.test(s) && line.slice(m.index + s.length).trimStart().startsWith('(')) c = '#DCDCAA';
    else if (/^[{}()[\];,.=<>+\-*/!&|?:]$/.test(s)) c = '#D4D4D4';
    out.push({t: s, c});
  }
  return out;
};

// Code editor that types itself. Fields: title, hl, label, file, code, highlight:[line numbers], highlightCue,
// output (console text), outputCue
export const Code: React.FC<{scene: Scene}> = ({scene}) => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const code: string = String(scene.code ?? '').replace(/\t/g, '  ');
  const lines = code.split('\n');
  const maxLen = Math.max(...lines.map((l) => l.length), 10);
  const fs = Math.min(46, 900 / (maxLen * 0.6), (scene.output ? 560 : 760) / (lines.length * 1.55));
  // instant: show the code at once (answer/recap scenes where the voice talks about it immediately)
  const typeEnd = scene.instant ? 0.45 : Math.min(scene.duration * 0.5, 0.6 + code.length * 0.022);
  const shown = Math.floor(interpolate(t, [0.4, Math.max(0.41, typeEnd)], [0, code.length], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}));
  const hlAt = scene.highlightCue ? cueTime(scene, scene.highlightCue, 0, 1) : typeEnd + 0.3;
  const outAt = scene.output ? (scene.outputCue ? cueTime(scene, scene.outputCue, 0, 1) : Math.max(typeEnd, scene.duration * 0.6)) : 1e9;
  const outP = pop(f, outAt);
  const hl = new Set<number>(scene.highlight ?? []);
  let used = 0;
  const top = scene.title ? 440 : 280;
  return (
    <>
      {scene.title ? <Title text={scene.title} hl={scene.hl} label={scene.label} /> : null}
      <div
        style={{
          position: 'absolute',
          top,
          left: 50,
          right: 50,
          borderRadius: 18,
          background: C.code,
          border: BORDER,
          boxShadow: SHADOW,
          overflow: 'hidden',
          transform: `scale(${pop(f, 0.05)})`,
        }}
      >
        <div style={{display: 'flex', alignItems: 'center', gap: 12, padding: '20px 26px', background: C.codeBar, borderBottom: '2px solid #000'}}>
          {['#FF5F57', '#FEBC2E', '#28C840'].map((c) => (
            <div key={c} style={{width: 20, height: 20, borderRadius: 10, background: c}} />
          ))}
          <div style={{marginLeft: 20, fontFamily: MONO, fontSize: 26, color: '#BBBBBB'}}>{scene.file ?? 'index.js'}</div>
        </div>
        <div style={{padding: '26px 0', fontFamily: MONO, fontSize: fs, lineHeight: 1.55}}>
          {lines.map((ln, i) => {
            const start = used;
            used += ln.length + 1;
            const vis = Math.max(0, Math.min(ln.length, shown - start));
            const on = hl.has(i + 1) && t >= hlAt;
            const cursor = shown >= start && shown <= start + ln.length && shown < code.length && Math.floor(t * 3) % 2 === 0;
            let left = vis;
            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  padding: '0 26px',
                  background: on ? '#FFE06633' : 'transparent',
                  borderLeft: `6px solid ${on ? C.mark : 'transparent'}`,
                  opacity: shown >= start || i === 0 ? 1 : 0,
                }}
              >
                <span style={{width: fs * 1.6, color: '#5A5A5A', flexShrink: 0}}>{i + 1}</span>
                <span style={{whiteSpace: 'pre'}}>
                  {tokens(ln).map((tk, j) => {
                    if (left <= 0) return null;
                    const s = tk.t.slice(0, left);
                    left -= tk.t.length;
                    return (
                      <span key={j} style={{color: tk.c}}>
                        {s}
                      </span>
                    );
                  })}
                  {cursor ? <span style={{background: '#AEAFAD', color: '#AEAFAD'}}>|</span> : null}
                </span>
              </div>
            );
          })}
        </div>
        {scene.output ? (
          <div
            style={{
              borderTop: '2px solid #000',
              background: '#141414',
              padding: '20px 30px',
              fontFamily: MONO,
              fontSize: Math.min(38, fs * 1.05),
              opacity: outP,
              transform: `translateY(${(1 - outP) * 30}px)`,
            }}
          >
            <div style={{color: '#888', fontSize: 24, marginBottom: 8}}>CONSOLE</div>
            {String(scene.output)
              .split('\n')
              .map((o, i) => (
                <div key={i} style={{color: /error/i.test(String(scene.output)) ? '#F14C4C' : '#4EC98B', opacity: pop(f, outAt + i * 0.35)}}>
                  {'> '}
                  {o}
                </div>
              ))}
          </div>
        ) : null}
      </div>
    </>
  );
};
