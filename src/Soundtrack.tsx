import React, { useMemo } from "react";
import { Audio, interpolate, Sequence, staticFile, useVideoConfig } from "remotion";
import { FPS, OUTRO_BEATS } from "./config";
import { clickFrame } from "./Cursor";
import { FIRST_TILE_FRAME, useTimeline, type Timeline } from "./timeline";

const sec = (value: number) => Math.round(value * FPS);

/** Music volume: down under each story, back up on the zoom-outs, peak at the full wall, fade at the end. */
const MUSIC = { base: 0.5, underStory: 0.16, finale: 0.75 };
const RAMP = sec(0.7);

/** `end` is the composition's last frame. */
function musicVolume(frame: number, end: number, timeline: Timeline): number {
  const { STORY_WINDOWS, ZOOM_FRAMES, OUTRO_GROWTH_END } = timeline;
  let volume = MUSIC.base;
  for (const w of STORY_WINDOWS) {
    const quietFrom = w.start + ZOOM_FRAMES;
    const quietTo = w.end - ZOOM_FRAMES;
    if (frame >= quietFrom - RAMP && frame <= quietTo + RAMP) {
      const t = Math.min(
        interpolate(frame, [quietFrom - RAMP, quietFrom], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        interpolate(frame, [quietTo, quietTo + RAMP], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
      );
      volume = MUSIC.base + (MUSIC.underStory - MUSIC.base) * t;
    }
  }
  const lastStoryEnd = STORY_WINDOWS.at(-1)?.end ?? 0;
  if (frame >= lastStoryEnd) {
    const finale = interpolate(frame, [lastStoryEnd, OUTRO_GROWTH_END], [0, 1], { extrapolateRight: "clamp" });
    volume = Math.max(volume, MUSIC.base + (MUSIC.finale - MUSIC.base) * finale);
  }
  const fadeOut = interpolate(frame, [end - sec(3), end], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return volume * fadeOut;
}

/**
 * Tile pops: one for each tile appearing while they're sparse, thinning out to
 * at most one every few frames as the wall speeds up, rising slightly in pitch.
 * Silent while a story plays (the wall is hidden then).
 */
function tilePops(timeline: Timeline): { frame: number; pitch: number; volume: number }[] {
  const { OUTRO_GROWTH_END, storyAt, tileCount } = timeline;
  const pops: { frame: number; pitch: number; volume: number }[] = [];
  const minGap = 3;
  let previous = 0;
  let lastPop = -Infinity;
  for (let frame = FIRST_TILE_FRAME + 2; frame < OUTRO_GROWTH_END; frame++) {
    const count = tileCount(frame);
    const added = count - previous;
    previous = count;
    if (added <= 0 || storyAt(frame) || frame - lastPop < minGap) continue;
    const progress = count / Math.max(1, tileCount(OUTRO_GROWTH_END));
    pops.push({ frame, pitch: 1 + 0.35 * progress, volume: 0.22 + 0.1 * Math.min(1, added / 6) });
    lastPop = frame;
  }
  return pops;
}

/** Whoosh peaks 0.5s in: line that up with the middle of each zoom. */
const WHOOSH_PEAK = sec(0.5);
/** Shimmer swells to its peak 2.25s in: line that up with the zoom starting. */
const SHIMMER_PEAK = sec(2.25);
/** The click sound starts 0.16s into its file: start it early so it lands on the press. */
const CLICK_ONSET = 5;
/** Riser peaks 7.25s in: line that up with the full wall. */
const RISER_PEAK = sec(7.25);

export const Soundtrack: React.FC = () => {
  const { durationInFrames } = useVideoConfig();
  const timeline = useTimeline();
  const { STORY_WINDOWS, ZOOM_FRAMES, OUTRO_GROWTH_END } = timeline;
  const pops = useMemo(() => tilePops(timeline), [timeline]);
  const lastStoryEnd = STORY_WINDOWS.at(-1)?.end ?? OUTRO_GROWTH_END;
  const riserStart = lastStoryEnd - ZOOM_FRAMES;
  const riserSkip = Math.max(0, RISER_PEAK - (OUTRO_GROWTH_END - riserStart));

  return (
    <>
      <Audio src={staticFile("audio/music.mp3")} volume={(f) => musicVolume(f, durationInFrames, timeline)} />

      <Sequence from={FIRST_TILE_FRAME} durationInFrames={sec(2)}>
        <Audio src={staticFile("audio/chime.mp3")} volume={0.6} />
      </Sequence>

      {pops.map((pop) => (
        <Sequence key={pop.frame} from={pop.frame} durationInFrames={sec(0.6)}>
          <Audio src={staticFile("audio/pop.mp3")} volume={pop.volume} toneFrequency={pop.pitch} />
        </Sequence>
      ))}

      {STORY_WINDOWS.map((w) => (
        <React.Fragment key={w.game.id}>
          <Sequence from={Math.max(0, w.start - SHIMMER_PEAK)} durationInFrames={sec(5)}>
            <Audio src={staticFile("audio/shimmer.mp3")} volume={0.3} />
          </Sequence>
          <Sequence from={clickFrame(w) - CLICK_ONSET} durationInFrames={sec(0.8)}>
            <Audio src={staticFile("audio/click.mp3")} volume={0.9} />
          </Sequence>
          <Sequence from={w.start + Math.round(ZOOM_FRAMES / 2) - WHOOSH_PEAK} durationInFrames={sec(3)}>
            <Audio src={staticFile("audio/whoosh.mp3")} volume={0.45} />
          </Sequence>
          <Sequence from={w.end - ZOOM_FRAMES + Math.round(ZOOM_FRAMES / 2) - WHOOSH_PEAK} durationInFrames={sec(3)}>
            <Audio src={staticFile("audio/whoosh.mp3")} volume={0.35} />
          </Sequence>
        </React.Fragment>
      ))}

      <Sequence from={riserStart} durationInFrames={OUTRO_GROWTH_END - riserStart + sec(1)}>
        <Audio src={staticFile("audio/riser.mp3")} startFrom={riserSkip} volume={0.55} />
      </Sequence>
      <Sequence from={OUTRO_GROWTH_END} durationInFrames={sec(6)}>
        <Audio src={staticFile("audio/impact.mp3")} volume={0.7} />
      </Sequence>

      {/* One soft tick per closing line (matches OutroCard's fade-ins). */}
      {[OUTRO_BEATS.line, OUTRO_BEATS.logo, OUTRO_BEATS.cta].map((delay) => (
        <Sequence key={delay} from={OUTRO_GROWTH_END + delay} durationInFrames={sec(1)}>
          <Audio src={staticFile("audio/tick.mp3")} volume={0.3} />
        </Sequence>
      ))}
    </>
  );
};
