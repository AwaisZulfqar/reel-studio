import React from 'react';
import {useCurrentFrame, interpolate} from 'remotion';
import {C, MONO, BORDER, SHADOW} from '../theme';
import {Scene, cueTime, pop, FPS} from '../util';
import {Title} from './common';

type Node = {id: string; label: string; icon?: string; sub?: string; pos: [number, number]; cue?: string; color?: string};
type Edge = {from: string; to: string; label?: string; cue?: string; dashed?: boolean};

const TOP = 430;
const AREA_H = 860;
const LEFT = 50;
const AREA_W = 980;

// System-design diagram: boxes on a grid, arrows draw themselves, packets flow along them.
// Fields: title, hl, label, nodes[{id,label,icon,sub,pos:[col,row],cue}], edges[{from,to,label,cue}]
export const Diagram: React.FC<{scene: Scene}> = ({scene}) => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const nodes: Node[] = scene.nodes ?? [];
  const edges: Edge[] = (scene.edges ?? []).map((e: any) => (Array.isArray(e) ? {from: e[0], to: e[1], label: e[2]} : e));
  const cols = scene.cols ?? Math.max(1, ...nodes.map((n) => n.pos[0] + 1));
  const rows = scene.rows ?? Math.max(1, ...nodes.map((n) => n.pos[1] + 1));
  const cw = AREA_W / cols;
  const ch = AREA_H / rows;
  const bw = Math.min(380, cw - 40);
  const bh = Math.min(200, ch - 60);
  const center = (n: Node) => ({x: LEFT + (n.pos[0] + 0.5) * cw, y: TOP + (n.pos[1] + 0.5) * ch});
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));

  // Reveal order: nodes and edges interleaved in the order given unless cued
  const total = nodes.length + edges.length;
  const nodeAt: Record<string, number> = {};
  nodes.forEach((n, i) => (nodeAt[n.id] = cueTime(scene, n.cue ?? n.label.split(' ')[0], i, total)));
  const edgeAt = edges.map((e, i) => {
    const base = cueTime(scene, e.cue ?? e.label?.split(' ')[0], nodes.length + i, total);
    return Math.max(base, (nodeAt[e.from] ?? 0) + 0.3, (nodeAt[e.to] ?? 0) + 0.1);
  });

  // Line from box edge to box edge
  const seg = (a: Node, b: Node) => {
    const p = center(a);
    const q = center(b);
    const dx = q.x - p.x;
    const dy = q.y - p.y;
    const k = (hw: number, hh: number) => Math.min(dx ? hw / Math.abs(dx) : Infinity, dy ? hh / Math.abs(dy) : Infinity);
    const ka = k(bw / 2 + 14, bh / 2 + 14);
    return {x1: p.x + dx * ka, y1: p.y + dy * ka, x2: q.x - dx * ka, y2: q.y - dy * ka};
  };

  return (
    <>
      <Title text={scene.title ?? ''} hl={scene.hl} label={scene.label} />
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill={C.ink} />
          </marker>
        </defs>
        {edges.map((e, i) => {
          const a = byId[e.from];
          const b = byId[e.to];
          if (!a || !b) return null;
          const s = seg(a, b);
          const len = Math.hypot(s.x2 - s.x1, s.y2 - s.y1);
          const p = interpolate(t, [edgeAt[i], edgeAt[i] + 0.45], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
          // packet travelling along the line once drawn
          const flow = p >= 1 ? ((t - edgeAt[i] - 0.45) % 1.4) / 1.4 : -1;
          return (
            <g key={i}>
              <line
                {...s}
                stroke={C.ink}
                strokeWidth={5}
                strokeLinecap="round"
                strokeDasharray={e.dashed ? '14 14' : `${len} ${len}`}
                strokeDashoffset={e.dashed ? -t * 40 : len * (1 - p)}
                opacity={e.dashed ? p : 1}
                markerEnd={p > 0.95 ? 'url(#arrow)' : undefined}
              />
              {flow >= 0 ? (
                <circle cx={s.x1 + (s.x2 - s.x1) * flow} cy={s.y1 + (s.y2 - s.y1) * flow} r={11} fill={C.red} opacity={Math.sin(Math.PI * flow)} />
              ) : null}
              {e.label ? (
                <g opacity={p}>
                  <rect
                    x={(s.x1 + s.x2) / 2 - e.label.length * 9.5 - 16}
                    y={(s.y1 + s.y2) / 2 - 24}
                    width={e.label.length * 19 + 32}
                    height={48}
                    rx={12}
                    fill={C.mark}
                    stroke={C.ink}
                    strokeWidth={3}
                  />
                  <text
                    x={(s.x1 + s.x2) / 2}
                    y={(s.y1 + s.y2) / 2 + 10}
                    textAnchor="middle"
                    fontFamily={MONO}
                    fontSize={28}
                    fill={C.ink}
                  >
                    {e.label}
                  </text>
                </g>
              ) : null}
            </g>
          );
        })}
      </svg>
      {nodes.map((n) => {
        const c = center(n);
        const p = pop(f, nodeAt[n.id]);
                return (
          <div
            key={n.id}
            style={{
              position: 'absolute',
              left: c.x - bw / 2,
              top: c.y - bh / 2,
              width: bw,
              height: bh,
              transform: `scale(${p})`,
              opacity: Math.min(1, p * 1.5),
              borderRadius: 18,
              background: n.color ?? C.card,
              border: BORDER,
              boxShadow: SHADOW,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              textAlign: 'center',
            }}
          >
            {n.icon ? <div style={{fontSize: bh * 0.34, lineHeight: 1}}>{n.icon}</div> : null}
            <div style={{fontSize: Math.min(46, ((bw - 20) / Math.max(6, n.label.length)) * 1.8), fontWeight: 800, lineHeight: 1.1}}>{n.label}</div>
            {n.sub ? <div style={{fontFamily: MONO, fontSize: 28, color: C.dim}}>{n.sub}</div> : null}
          </div>
        );
      })}
    </>
  );
};
