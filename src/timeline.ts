import { createContext, useContext } from "react";
import { Easing } from "remotion";
import gamesJson from "./data/games.json";
import { FPS, SHORT_STORY_IDS, SHORT_TIMING, STORIES, TIMING, type Story, type Timing } from "./config";

export type Game = {
  id: string;
  name: string;
  slug: string;
  banner: string | null;
  playable: boolean;
  joinedAt: string;
};

/** The first 1,000 approved games, oldest first: the order tiles appear in. The video marks exactly 1,000. */
export const GAMES = (gamesJson as Game[]).slice(0, 1000);

const seconds = (value: number) => Math.round(value * FPS);

export type StoryWindow = {
  story: Story;
  game: Game;
  /** The game's place in the wall (its tile index). */
  index: number;
  start: number;
  end: number;
};

/**
 * The cursor glides to a story's tile, hovers, then clicks just before the
 * zoom opens it. The wall reaches that game before the cursor sets off.
 */
export const CURSOR = { travel: seconds(1.3), hover: seconds(0.45), clickLead: seconds(0.2), press: 5 };
const CURSOR_LEAD = CURSOR.travel + CURSOR.hover + CURSOR.clickLead + 6;

/** The first game pops in at this frame. */
export const FIRST_TILE_FRAME = seconds(1.5);

type Key = { frame: number; count: number; ease: (t: number) => number };

export type Timeline = ReturnType<typeof buildTimeline>;

/** Everything timed in one cut of the video: which stories it tells, when, and how the wall grows. */
export function buildTimeline(stories: Story[], timing: Timing) {
  // Stories in the order given (not join order); an earlier game's tile is already on the wall.
  const placed = stories.map((story) => {
    const index = GAMES.findIndex((game) => game.id === story.gameId);
    if (index < 0) throw new Error(`Story game ${story.gameId} isn't in games.json (run npm run fetch-games)`);
    return { story, game: GAMES[index], index };
  });

  // A story's length: zoom in, a beat, the voice, a beat, zoom out.
  const storyLength = (story: Story) =>
    seconds(timing.zoom * 2 + timing.voiceLead + story.voiceSeconds + timing.voiceTail);
  const introEnd = seconds(timing.intro);
  const firstGrowthEnd = introEnd + seconds(timing.firstGrowth);
  const zoomFrames = seconds(timing.zoom);

  const windows: StoryWindow[] = [];
  let start = firstGrowthEnd;
  for (const p of placed) {
    windows.push({ ...p, start, end: start + storyLength(p.story) });
    start = windows[windows.length - 1].end + seconds(timing.betweenStories);
  }

  const lastStoryEnd = windows.at(-1)?.end ?? firstGrowthEnd;
  const outroGrowthEnd = lastStoryEnd + seconds(timing.outroGrowth);
  const duration = outroGrowthEnd + seconds(timing.outroCard);

  /**
   * How many tiles are on the wall at each moment. The wall grows faster and
   * faster between stories; while a story plays (zoomed in, wall hidden) it keeps
   * growing, so zooming out shows how far it has come.
   */
  const keys: Key[] = (() => {
    const accelerate = Easing.in(Easing.cubic);
    const smooth = Easing.inOut(Easing.cubic);
    const out: Key[] = [
      { frame: 0, count: 0, ease: smooth },
      { frame: FIRST_TILE_FRAME, count: 0, ease: smooth },
      { frame: FIRST_TILE_FRAME + 1, count: 1, ease: smooth },
      { frame: introEnd, count: 1, ease: smooth },
    ];
    // The wall only ever grows: a story whose game is already up just holds the count.
    let shown = 1;
    windows.forEach((window, i) => {
      // Reach the story's game before the cursor heads for it, then hold while it hovers and clicks.
      shown = Math.max(shown, window.index + 1);
      out.push({ frame: window.start - CURSOR_LEAD, count: shown, ease: accelerate });
      out.push({ frame: window.start, count: shown, ease: smooth });
      // Hidden growth while the story plays, so zooming out shows how far the wall has come.
      const next = windows[i + 1];
      const goal = next ? Math.max(next.index + 1, shown + 120) : shown + 150;
      shown = Math.min(GAMES.length, Math.round((shown + goal) / 2));
      out.push({ frame: window.end - zoomFrames, count: shown, ease: smooth });
    });
    out.push({ frame: outroGrowthEnd, count: GAMES.length, ease: accelerate });
    return out;
  })();

  const tileCount = (frame: number): number => {
    for (let i = 1; i < keys.length; i++) {
      const from = keys[i - 1];
      const to = keys[i];
      if (frame <= to.frame) {
        const span = Math.max(1, to.frame - from.frame);
        const t = Math.min(1, Math.max(0, (frame - from.frame) / span));
        return Math.floor(from.count + (to.count - from.count) * to.ease(t));
      }
    }
    return GAMES.length;
  };

  return {
    STORY_WINDOWS: windows,
    OUTRO_GROWTH_END: outroGrowthEnd,
    DURATION: duration,
    ZOOM_FRAMES: zoomFrames,
    /** When the voice starts, counted from the story's start. */
    VOICE_START: seconds(timing.zoom + timing.voiceLead),
    /** The count starts rolling once the camera is back out after the last story. */
    COUNT_START: lastStoryEnd + 10,
    tileCount,
    /** The story playing at this frame, if any. */
    storyAt: (frame: number): StoryWindow | null => windows.find((w) => frame >= w.start && frame < w.end) ?? null,
  };
}

/** The full cut: all three stories. */
export const FULL_CUT = buildTimeline(STORIES, TIMING);
/** The short vertical cut: Keith and Kieran only, tighter pacing. */
export const SHORT_CUT = buildTimeline(
  STORIES.filter((story) => SHORT_STORY_IDS.includes(story.gameId)),
  SHORT_TIMING,
);

/** The cut being rendered, provided by Wall to everything inside it. */
export const TimelineContext = createContext<Timeline>(FULL_CUT);
export const useTimeline = () => useContext(TimelineContext);
