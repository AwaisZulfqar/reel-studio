import React, {useMemo} from 'react';
import {useCurrentFrame} from 'remotion';
import {C, SANS} from './theme';
import {FPS, Scene, Word, norm} from './util';

type Chunk = {words: Word[]; s: number; e: number};

// Group words into short phrases (max 4 words, break on pauses and punctuation)
const chunk = (words: Word[]): Chunk[] => {
  const out: Chunk[] = [];
  let cur: Word[] = [];
  words.forEach((w, i) => {
    cur.push(w);
    const next = words[i + 1];
    const brk = !next || cur.length >= 4 || next.s - w.e > 0.3 || /[.,!?;:]$/.test(w.w);
    if (brk) {
      out.push({words: cur, s: cur[0].s, e: cur[cur.length - 1].e});
      cur = [];
    }
  });
  return out;
};

// Spoken word gets a highlighter mark; keywords are red; words not yet spoken are faded
export const Captions: React.FC<{scenes: Scene[]; keywords: string[]}> = ({scenes, keywords}) => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const chunks = useMemo(() => chunk(scenes.flatMap((s) => s.words)), [scenes]);
  const keys = useMemo(() => new Set(keywords.flatMap((k) => k.split(/\s+/)).map(norm)), [keywords]);
  const idx = chunks.findIndex((c, i) => t >= c.s - 0.05 && t < Math.min(chunks[i + 1]?.s ?? Infinity, c.e + 0.8) - 0.05);
  if (idx < 0) return null;
  const c = chunks[idx];
  return (
    <div
      style={{
        position: 'absolute',
        left: 60,
        right: 60,
        top: 1340,
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: '6px 14px',
        fontFamily: SANS,
        fontWeight: 900,
        fontSize: 66,
        lineHeight: 1.2,
        textAlign: 'center',
      }}
    >
      {c.words.map((w, i) => {
        const said = t >= w.s - 0.04;
        const now = said && t < w.e + 0.05;
        const key = keys.has(norm(w.w));
        return (
          <span
            key={i}
            style={{
              padding: '0 10px',
              borderRadius: 8,
              background: now ? C.mark : 'transparent',
              color: key ? C.red : C.ink,
              opacity: said ? 1 : 0.3,
            }}
          >
            {w.w}
          </span>
        );
      })}
    </div>
  );
};
