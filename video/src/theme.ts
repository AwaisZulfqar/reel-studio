import {loadFont as loadInter} from '@remotion/google-fonts/Inter';
import {loadFont as loadMono} from '@remotion/google-fonts/JetBrainsMono';
import {loadFont as loadSerif} from '@remotion/google-fonts/InstrumentSerif';

export const {fontFamily: SANS} = loadInter('normal', {weights: ['400', '600', '800', '900'], subsets: ['latin']});
export const {fontFamily: MONO} = loadMono('normal', {weights: ['400', '700'], subsets: ['latin']});
export const {fontFamily: SERIF} = loadSerif('italic', {weights: ['400'], subsets: ['latin']});

// brand.json is written by make.py from config.json "theme" (editable in the settings UI)
import brand from './brand.json';

// Editorial "paper" look: off-white page, black ink, one accent. Flat, no glows or gradients.
const B = brand as Partial<Record<'bg' | 'ink' | 'accent' | 'mark', string>>;
export const C = {
  bg: B.bg ?? '#F3EFE6',
  card: '#FFFFFF',
  ink: B.ink ?? '#151515',
  dim: '#77736B',
  soft: '#DCD6CA',
  red: B.accent ?? '#E4372B',
  blue: '#0095F6', // Instagram button blue
  green: '#1E9E57',
  mark: B.mark ?? '#FFE066', // highlighter
  code: '#1E1E1E',
  codeBar: '#2B2B2B',
};

// Hard offset shadow used on every card
export const SHADOW = `8px 8px 0 ${C.ink}`;
export const BORDER = `3px solid ${C.ink}`;

export const W = 1080;
export const H = 1920;
