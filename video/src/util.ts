import {interpolate, spring, Easing} from 'remotion';

export type Word = {w: string; s: number; e: number};
export type Scene = {
  type: string;
  start: number;
  duration: number;
  words: Word[];
  [k: string]: any;
};
export type ReelProps = {
  handle: string;
  duration: number;
  audio?: string;
  music?: string;
  musicVolume?: number;
  accent?: string;
  keywords?: string[];
  scenes: Scene[];
};

export const FPS = 30;

export const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

// Item text may be a plain string or {text, cue}
export const itemText = (it: any): string => (typeof it === 'string' ? it : it.text ?? it.label ?? '');

// Seconds (relative to scene start) when an element should appear.
// If a cue word is given and is spoken in this scene, appear just before it; otherwise spread evenly.
export const cueTime = (scene: Scene, cue: string | undefined, i: number, n: number, from = 0.35, to = 0.8): number => {
  if (cue) {
    const parts = cue.split(/\s+/).map(norm).filter(Boolean);
    const ws = scene.words;
    for (let k = 0; k < ws.length; k++) {
      if (parts.every((p, j) => ws[k + j] && norm(ws[k + j].w).startsWith(p))) {
        return Math.max(0, ws[k].s - scene.start - 0.15);
      }
    }
  }
  const span = scene.duration * (to - from);
  return scene.duration * from * 0.4 + (n <= 1 ? 0 : (span * i) / (n - 1));
};

export const pop = (frame: number, at: number, damping = 13) =>
  spring({frame: frame - at * FPS, fps: FPS, config: {damping, stiffness: 160, mass: 0.7}});

export const fade = (frame: number, at: number, dur = 0.3) =>
  interpolate(frame, [at * FPS, (at + dur) * FPS], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
