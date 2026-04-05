import type { MusicStyle, MusicSuite } from '../types';

export const musicStyles: MusicStyle[] = [
  {
    id: 'orch_a',
    name: 'Orchestral A',
    description: 'Dramatic orchestral intro with brass and strings',
    duration: '8s',
    mood: 'upbeat, professional'
  },
  {
    id: 'modern_b',
    name: 'Modern B',
    description: 'Elegant orchestral theme with woodwinds',
    duration: '8s',
    mood: 'sophisticated, calm'
  },
  {
    id: 'nordic_c',
    name: 'Nordic C',
    description: 'Clean, minimal electronic with subtle melody',
    duration: '1-2s',
    mood: 'modern, subtle'
  },
  {
    id: 'bbc_d',
    name: 'BBC Style',
    description: 'Classic news transition sting',
    duration: '3s',
    mood: 'authoritative, urgent'
  },
  {
    id: 'contemp_e',
    name: 'Contemporary E',
    description: 'Modern electronic with driving beat',
    duration: '8s',
    mood: 'energetic, contemporary'
  }
];

export const musicStyleList = musicStyles;

export const defaultMusicSuite: MusicSuite = {
  intro: musicStyles[0],
  outro: musicStyles[0],
  storySting: musicStyles[2],
  blockSting: musicStyles[3]
};

export const musicSuites: MusicSuite[] = [
  {
    name: 'Orchestral Suite',
    intro: musicStyles[0],
    outro: musicStyles[0],
    storySting: musicStyles[2],
    blockSting: musicStyles[3]
  },
  {
    name: 'Modern Suite',
    intro: musicStyles[1],
    outro: musicStyles[1],
    storySting: musicStyles[2],
    blockSting: musicStyles[3]
  },
  {
    name: 'BBC Suite',
    intro: musicStyles[3],
    outro: musicStyles[3],
    storySting: musicStyles[2],
    blockSting: musicStyles[3]
  },
  {
    name: 'Contemporary Suite',
    intro: musicStyles[4],
    outro: musicStyles[4],
    storySting: musicStyles[2],
    blockSting: musicStyles[3]
  }
];
