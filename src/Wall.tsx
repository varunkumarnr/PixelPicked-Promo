import React, { useMemo } from "react";
import {
  AbsoluteFill,
  Audio,
  Easing,
  Img,
  interpolate,
  OffthreadVideo,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS, FONT, OUTRO, OUTRO_BEATS, type Word } from "./config";
import { wallLayout, type Tile } from "./layout";
import { Soundtrack } from "./Soundtrack";
import { Cursor, tileLift } from "./Cursor";
import { FULL_CUT, GAMES, SHORT_CUT, TimelineContext, useTimeline, type StoryWindow } from "./timeline";

const ease = Easing.inOut(Easing.cubic);

/** How far into a story's zoom we are: 0 = whole wall, 1 = fully on the story. */
function zoomProgress(frame: number, window: StoryWindow | null, zoomFrames: number): number {
  if (!window) return 0;
  const inT = (frame - window.start) / zoomFrames;
  const outT = (window.end - frame) / zoomFrames;
  return ease(Math.min(1, Math.max(0, Math.min(inT, outT))));
}

/** The video. `cut` picks the full three-story version or the short two-story one. */
export const Wall: React.FC<{ cut?: "full" | "short" }> = ({ cut = "full" }) => (
  <TimelineContext.Provider value={cut === "short" ? SHORT_CUT : FULL_CUT}>
    <WallScene />
  </TimelineContext.Provider>
);

const WallScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const { DURATION, OUTRO_GROWTH_END, STORY_WINDOWS, VOICE_START, ZOOM_FRAMES, COUNT_START, storyAt, tileCount } = useTimeline();
  const tiles = useMemo(() => wallLayout(width, height, GAMES.length), [width, height]);
  // The frame each tile first appears on, so it can pop in.
  const appearsAt = useMemo(() => {
    const appears = new Array<number>(GAMES.length).fill(DURATION);
    let shown = 0;
    for (let f = 0; f <= DURATION && shown < GAMES.length; f++) {
      const count = tileCount(f);
      for (; shown < count; shown++) appears[shown] = f;
    }
    return appears;
  }, [DURATION, tileCount]);
  const count = tileCount(frame);
  const window = storyAt(frame);
  const progress = zoomProgress(frame, window, ZOOM_FRAMES);

  // Camera: from the whole wall towards the story's tile, growing it to half the frame height.
  const target = window ? tiles[window.index] : null;
  const maxScale = target ? (height * 0.5) / target.size : 1;
  const scale = Math.pow(maxScale, progress);
  const focusX = target ? interpolate(progress, [0, 1], [width / 2, target.x]) : width / 2;
  const focusY = target ? interpolate(progress, [0, 1], [height / 2, target.y]) : height / 2;
  const storyOpacity = interpolate(progress, [0.55, 1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // The wall dims as the count rolls up over it, then sits behind the closing card.
  const outroDim = interpolate(frame, [COUNT_START, OUTRO_GROWTH_END, OUTRO_GROWTH_END + 20], [1, 0.55, 0.28], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.background, fontFamily: FONT }}>
      <Soundtrack />
      <AbsoluteFill
        style={{
          transformOrigin: "0 0",
          transform: `translate(${width / 2}px, ${height / 2}px) scale(${scale}) translate(${-focusX}px, ${-focusY}px)`,
          opacity: outroDim,
        }}
      >
        {GAMES.slice(0, count).map((game, i) => {
          const story = STORY_WINDOWS.find((w) => w.index === i);
          return (
            <WallTile
              key={game.id}
              id={game.id}
              tile={tiles[i]}
              age={frame - appearsAt[i]}
              lift={story ? tileLift(frame, story, ZOOM_FRAMES) : 1}
              highlight={story ? frame >= story.start - 20 && frame < story.end : false}
            />
          );
        })}
      </AbsoluteFill>

      <Cursor tiles={tiles} camera={{ scale, focusX, focusY }} />

      {STORY_WINDOWS.map((w) => (
        <Sequence key={w.game.id} from={w.start} durationInFrames={w.end - w.start}>
          <AbsoluteFill style={{ opacity: storyOpacity }}>
            <StoryScene window={w} />
          </AbsoluteFill>
          <Sequence from={VOICE_START}>
            <Audio src={staticFile(w.story.voice)} />
          </Sequence>
        </Sequence>
      ))}

      <Sequence from={COUNT_START}>
        <OutroCard landAt={OUTRO_GROWTH_END - COUNT_START} />
      </Sequence>
    </AbsoluteFill>
  );
};

const WallTile: React.FC<{ id: string; tile: Tile; age: number; lift: number; highlight: boolean }> = ({
  id,
  tile,
  age,
  lift,
  highlight,
}) => {
  const pop = interpolate(age, [0, 8], [0.3, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.back(2)) });
  const opacity = interpolate(age, [0, 6], [0, 1], { extrapolateRight: "clamp" });
  return (
    <Img
      src={staticFile(`icons/${id}.png`)}
      style={{
        position: "absolute",
        left: tile.x - tile.size / 2,
        top: tile.y - tile.size / 2,
        width: tile.size,
        height: tile.size,
        borderRadius: tile.size * 0.22,
        transform: `scale(${pop * lift})`,
        zIndex: lift !== 1 ? 1 : undefined,
        opacity,
        boxShadow: highlight ? `0 0 ${tile.size * 0.5}px ${COLORS.tileGlow}` : undefined,
      }}
    />
  );
};

/** One developer's story: their game playing in a phone, with who they are and their words. */
const StoryScene: React.FC<{ window: StoryWindow }> = ({ window }) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const { ZOOM_FRAMES } = useTimeline();
  const vertical = height > width;
  const { story, game } = window;

  const phoneHeight = vertical ? height * 0.6 : height * 0.82;
  const phoneWidth = phoneHeight * (9 / 19.5);
  const textIn = (delay: number) => ({
    opacity: interpolate(frame, [delay, delay + 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
    transform: `translateY(${interpolate(frame, [delay, delay + 15], [20, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    })}px)`,
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.background,
        flexDirection: vertical ? "column" : "row",
        alignItems: "center",
        justifyContent: "center",
        gap: vertical ? height * 0.035 : width * 0.06,
        padding: vertical ? "6% 8%" : "0 8%",
      }}
    >
      <div
        style={{
          width: phoneWidth,
          height: phoneHeight,
          borderRadius: phoneWidth * 0.12,
          border: `${phoneWidth * 0.025}px solid #26262c`,
          overflow: "hidden",
          backgroundColor: "#000",
          position: "relative",
          flexShrink: 0,
          boxShadow: "0 30px 80px rgba(0,0,0,0.6)",
        }}
      >
        {story.trailer ? (
          <OffthreadVideo
            src={staticFile(story.trailer.src)}
            trimBefore={Math.round(story.trailer.from * fps)}
            muted
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <Slideshow shots={story.shots} length={window.end - window.start} />
        )}
      </div>

      <div style={{ maxWidth: vertical ? "100%" : width * 0.4, color: COLORS.text, textAlign: vertical ? "center" : "left" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            justifyContent: vertical ? "center" : "flex-start",
            ...textIn(ZOOM_FRAMES + 5),
          }}
        >
          <Img src={staticFile(`icons/${game.id}.png`)} style={{ width: 64, height: 64, borderRadius: 14 }} />
          <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: -0.5 }}>{game.name}</div>
        </div>
        <div style={{ marginTop: 14, fontSize: 30, fontWeight: 700, ...textIn(ZOOM_FRAMES + 12) }}>{story.name}</div>
        <div style={{ marginTop: 6, fontSize: 26, color: COLORS.muted, ...textIn(ZOOM_FRAMES + 18) }}>{story.caption}</div>
        <Subtitles words={story.words} fontSize={vertical ? 50 : 54} />
      </div>
    </AbsoluteFill>
  );
};

/** The game's screenshots, crossfading with a slow push-in, one after another for the whole story. */
const Slideshow: React.FC<{ shots: string[]; length: number }> = ({ shots, length }) => {
  const frame = useCurrentFrame();
  const each = length / shots.length;
  const fade = 12;
  return (
    <AbsoluteFill>
      {shots.map((shot, i) => {
        const from = i * each;
        const local = frame - from;
        if (local < -fade || local > each + fade) return null;
        const opacity = i === 0 ? 1 : interpolate(local, [-fade, 0], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const zoom = interpolate(local, [-fade, each + fade], [1.0, 1.08]);
        return (
          <Img
            key={shot}
            src={staticFile(shot)}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity, transform: `scale(${zoom})` }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

/**
 * What they're saying, a phrase at a time, in time with their voice. Words light up as they're spoken.
 */
const Subtitles: React.FC<{ words: Word[]; fontSize: number }> = ({ words, fontSize }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { VOICE_START } = useTimeline();
  const t = (frame - VOICE_START) / fps;
  const phrases = useMemo(() => {
    const out: Word[][] = [];
    let current: Word[] = [];
    for (const word of words) {
      current.push(word);
      // End a phrase at a sentence end, at a comma once it has a few words, or when it gets long.
      if (current.length >= 10 || /[.?!]$/.test(word.w) || (current.length >= 5 && /,$/.test(word.w))) {
        out.push(current);
        current = [];
      }
    }
    if (current.length) out.push(current);
    return out;
  }, [words]);
  // The phrase being spoken, held until the next one starts.
  const index = phrases.reduce((found, phrase, i) => (t >= phrase[0].start - 0.05 ? i : found), -1);
  if (index < 0) return null;
  const phrase = phrases[index];
  const last = phrases.length - 1;
  const fadeOut = index === last ? interpolate(t, [phrase.at(-1)!.end + 0.6, phrase.at(-1)!.end + 1.0], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1;
  return (
    <div style={{ marginTop: 40, minHeight: fontSize * 2.6, fontSize, lineHeight: 1.25, fontWeight: 700, letterSpacing: -0.5, opacity: fadeOut }}>
      {phrase.map((word, i) => (
        <span key={i} style={{ color: t >= word.start - 0.03 ? COLORS.text : "rgba(255,255,255,0.3)" }}>
          {word.w}{" "}
        </span>
      ))}
    </div>
  );
};

/**
 * The ending: the count rolls up with the last tiles and lands on 1,000 as the wall
 * fills, holds, then fades away before the line, logo and call to action come in.
 */
const OutroCard: React.FC<{ landAt: number }> = ({ landAt }) => {
  const frame = useCurrentFrame();
  const { COUNT_START, tileCount } = useTimeline();
  const fade = (delay: number) =>
    interpolate(frame, [landAt + delay, landAt + delay + 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const count = tileCount(COUNT_START + frame);
  const landed = frame >= landAt;
  const punch = interpolate(frame, [landAt, landAt + 4, landAt + 12], [1, 1.08, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", color: COLORS.text, textAlign: "center", gap: 28 }}>
      {/* A soft dark glow behind the text so it reads over the bright wall (the text is positioned so it paints above it). */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 45% 38% at 50% 50%, ${COLORS.background}e6 0%, ${COLORS.background}99 45%, transparent 100%)`,
          opacity: interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" }),
        }}
      />
      <div
        style={{
          position: "absolute",
          opacity:
            interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" }) *
            interpolate(frame, [landAt + OUTRO_BEATS.numberOut, landAt + OUTRO_BEATS.numberOut + 14], [1, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          transform: `scale(${punch * interpolate(frame, [landAt + OUTRO_BEATS.numberOut, landAt + OUTRO_BEATS.numberOut + 14], [1, 0.92], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })})`,
          textShadow: "0 4px 30px rgba(0,0,0,0.9)",
        }}
      >
        <span style={{ fontSize: 150, fontWeight: 900, letterSpacing: -4, fontVariantNumeric: "tabular-nums" }}>
          {count.toLocaleString("en-US")}
        </span>
        <span style={{ fontSize: 64, fontWeight: 800, marginLeft: 20, opacity: landed ? 1 : 0.7 }}>games</span>
      </div>
      <div style={{ position: "relative", fontSize: 60, fontWeight: 800, letterSpacing: -1.2, opacity: fade(OUTRO_BEATS.line), padding: "0 6%", textShadow: "0 4px 24px rgba(0,0,0,0.9)" }}>
        {OUTRO.line}
      </div>
      <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 18, opacity: fade(OUTRO_BEATS.logo), marginTop: 16 }}>
        <Img src={staticFile("logo.svg")} style={{ width: 60, height: 60 }} />
        <div style={{ fontSize: 42, fontWeight: 800 }}>PixelPicked.</div>
      </div>
      <div style={{ position: "relative", fontSize: 34, fontWeight: 600, color: COLORS.text, opacity: fade(OUTRO_BEATS.cta), textShadow: "0 4px 24px rgba(0,0,0,0.9)" }}>
        {OUTRO.cta}
      </div>
    </AbsoluteFill>
  );
};
