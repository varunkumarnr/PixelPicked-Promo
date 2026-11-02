/**
 * Everything you'd tweak for the video lives here: timing, the three stories
 * and the closing words. The wall itself comes from src/data/games.json
 * (run `npm run fetch-games` to refresh it as games are approved).
 */

export const FPS = 30;

export type Timing = {
  intro: number;
  firstGrowth: number;
  voiceLead: number;
  voiceTail: number;
  zoom: number;
  betweenStories: number;
  outroGrowth: number;
  outroCard: number;
};

/** Seconds for each part of the full cut (about 73s in total). */
export const TIMING: Timing = {
  /** Empty wall, then the very first game appears. */
  intro: 4,
  /** Tiles fill in faster and faster up to the first story's game. */
  firstGrowth: 6,
  /** Each story lasts as long as its voice, plus a beat before and after it inside the zoom. */
  voiceLead: 0.5,
  voiceTail: 1.2,
  /** Zoom in / out inside each story. */
  zoom: 1.2,
  /** Between stories: the wall keeps growing. */
  betweenStories: 2.5,
  /** The last growth to every game, then the closing card. */
  outroGrowth: 4,
  outroCard: 6.5,
};

export type Word = { w: string; start: number; end: number };

export type Story = {
  /** The game's short id (see src/data/games.json). */
  gameId: string;
  /** Screenshots in public/, shown as a slow slideshow inside the phone when there's no trailer. */
  shots: string[];
  /** Their trailer in public/ (played muted under their voice) and the second it starts from. */
  trailer: { src: string; from: number } | null;
  /** Their voice in public/stories/, trimmed and levelled. */
  voice: string;
  /** Length of the voice file in seconds; the story's slot is sized from it. */
  voiceSeconds: number;
  /** Word timings for the subtitles (transcribed with Whisper, names corrected by hand). */
  words: Word[];
  /** Who made it, as they describe themselves. */
  name: string;
  /** One line of context under their name. */
  caption: string;
};

import keithWords from "../public/stories/keith-graze.words.json";
import decadesWords from "../public/stories/decades.words.json";
import kieranWords from "../public/stories/kieran-its-pink.words.json";

/** Played in this order (not join order): a strong open, a lighter middle, the most moving last. */
export const STORIES: Story[] = [
  {
    gameId: "3aPZlUnoF71", // GRAZE: Edge Rush
    shots: [0, 1, 2, 4].map((i) => `stories/graze/shot${i}.webp`),
    // Non-stop gameplay: x16 multiplier and near misses.
    trailer: { src: "stories/graze/trailer.mp4", from: 0 },
    voice: "stories/keith-graze.m4a",
    voiceSeconds: 11.0,
    words: keithWords,
    name: "Keith Braccia",
    caption: "Solo developer and new dad",
  },
  {
    gameId: "4jqxMpmTUKS", // Decades: 10-20-30 Solitaire
    shots: [0, 2, 1, 3].map((i) => `stories/decades/shot${i}.webp`),
    // Her own captions: "And so I tried… accidentally built an entire game!!" through "share it with you all!"
    trailer: { src: "stories/decades/trailer.mp4", from: 24 },
    voice: "stories/decades.m4a",
    voiceSeconds: 14.7,
    words: decadesWords,
    name: "whalefuud games",
    caption: "First game, made right after turning 50, with no background in games",
  },
  {
    gameId: "5pV28GGOcA4", // It's Pink
    shots: [0, 1, 2, 3].map((i) => `stories/its-pink/shot${i}.webp`),
    // Gameplay, skipping the menu at the start and the store card at the end.
    trailer: { src: "stories/its-pink/trailer.mp4", from: 3 },
    voice: "stories/kieran-its-pink.m4a",
    voiceSeconds: 9.45,
    words: kieranWords,
    name: "Kieran McCluskey",
    caption: "Made for the Forget Me Not Dementia Cafe",
  },
];

/** The short vertical cut for Reels and Shorts (about 45s): tighter gaps, two stories. */
export const SHORT_TIMING: Timing = {
  ...TIMING,
  intro: 2.5,
  firstGrowth: 4,
  betweenStories: 1.5,
  outroGrowth: 3,
  outroCard: 5.5,
};
/** Keith's and Kieran's stories: the fast hook and the emotional close. */
export const SHORT_STORY_IDS = ["3aPZlUnoF71", "5pV28GGOcA4"];

/**
 * The ending, in frames after the count lands on 1,000: the number holds, fades away,
 * then the line, the logo and the call to action come in one by one.
 */
export const OUTRO_BEATS = { numberOut: 40, line: 62, logo: 88, cta: 104 };

export const OUTRO = {
  line: "Every tile is someone's story.",
  cta: "Make yours  ·  pixelpicked.com/developer",
};

export const COLORS = {
  background: "#07070a",
  text: "#ffffff",
  muted: "rgba(255,255,255,0.55)",
  tileGlow: "rgba(255,255,255,0.9)",
};

export const FONT = '"Inter", "SF Pro Display", "Helvetica Neue", Arial, sans-serif';
