import React from "react";
import { AbsoluteFill, Audio, Easing, Img, interpolate, random, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import verticalShots from "./data/history-v.json";

/**
 * "The history of mobile gaming": about 90 archival-style photos, one per cut, cut to the beat.
 * A page-flip flash of everything, the title, then every era in order with its year slammed in and
 * iconic games named. Cuts get shorter as the story nears today, so the later eras fly by. The drums
 * drop out before esports and crash back for the fastest run, then "Every era had its legend. The
 * next one is waiting to be found." and the PixelPicked logo.
 * Shots come from src/data/history-v.json (built by the scratchpad's build_history_manifest.py).
 */

type Shot = { file: string; year: number | null; game: string | null; esports: boolean };

const FONT = '"Helvetica Neue", "Inter", Arial, sans-serif';
const FPS = 30;

/** "Stylish Trailer Percussion" is 120 BPM; it starts on its beat at 1.742s, so cuts land on eighth notes. */
const MUSIC_START = 1.742;
const EIGHTH = (0.4995 / 2) * FPS;
const at = (eighths: number) => Math.round(eighths * EIGHTH);

const INTRO = 60;
const FLASH = 2.5;
const TITLE_LENGTH = 45;
const MONTAGE_START = INTRO + TITLE_LENGTH;
/** The track goes silent at 34.249s and comes back at 36.746s: the drop before esports. */
const MAIN_EIGHTHS = 130;
const DROP_AT = MONTAGE_START + at(MAIN_EIGHTHS);
const ESPORTS_AT = MONTAGE_START + at(140);
const ESPORTS_EIGHTHS = 16;
const END_AT = MONTAGE_START + at(140 + ESPORTS_EIGHTHS);
const TEXT_AT = END_AT;
const LOGO_AT = TEXT_AT + 84;
export const HISTORY_FULL_DURATION = LOGO_AT + 75;

type Cut = Shot & { from: number; to: number; label: string | null };

/**
 * Lays shots end to end in sixteenth notes: long cuts for the early eras, getting steadily shorter so
 * the later eras fly by. Year slams always get at least an eighth so they can be read.
 */
function layout(shots: Shot[], start: number, eighths: number, label: (s: Shot) => string, from = 4, to = 1): Cut[] {
  const total = eighths * 2;
  const firstOfYear = shots.map((s, i) => i === 0 || label(shots[i - 1]) !== label(s));
  const weights = shots.map((_, i) => from + (to - from) * (i / Math.max(1, shots.length - 1)) ** 1.1);
  const scale = total / weights.reduce((a, b) => a + b, 0);
  const lengths = weights.map((w, i) => Math.max(firstOfYear[i] ? 2 : 1, Math.round(w * scale)));
  // Make the lengths add up exactly, taking from or giving to the longest early cuts.
  let diff = total - lengths.reduce((a, b) => a + b, 0);
  for (let i = 0; diff !== 0 && i < lengths.length * 4; i++) {
    const k = i % lengths.length;
    if (diff > 0) { lengths[k]++; diff--; } else if (lengths[k] > (firstOfYear[k] ? 2 : 1)) { lengths[k]--; diff++; }
  }
  let e = 0;
  return shots.map((s, i) => {
    const cut = { ...s, from: start + at(e / 2), to: start + at((e + lengths[i]) / 2), label: firstOfYear[i] ? label(s) : null };
    e += lengths[i];
    return cut;
  });
}

const SHOTS = verticalShots as Shot[];
const MAIN = SHOTS.filter((s) => !s.esports).slice(0, MAIN_EIGHTHS);
const ESPORTS = SHOTS.filter((s) => s.esports);
const yearLabel = (s: Shot) => (s.year && s.year < 2026 ? String(s.year) : "TODAY");
const MAIN_CUTS = layout(MAIN, MONTAGE_START, MAIN_EIGHTHS, yearLabel);
/** The finale is the fastest run: the esports shots cycled, a sixteenth each after the slam. */
const ESPORTS_RUN = Array.from({ length: ESPORTS_EIGHTHS * 2 - 3 }, (_, i) => ESPORTS[i % ESPORTS.length]);
const ESPORTS_CUTS = layout(ESPORTS_RUN, ESPORTS_AT, ESPORTS_EIGHTHS, () => "ESPORTS", 1, 1).map((c, i) => ({ ...c, label: i === 0 ? "ESPORTS" : null }));
/** The intro flashes a spread of shots from every era. */
const FLASH_CUTS = Array.from({ length: INTRO / FLASH }, (_, i) => ({
  ...SHOTS[Math.floor((i * SHOTS.length) / (INTRO / FLASH))],
  from: Math.round(i * FLASH),
  to: Math.round((i + 1) * FLASH),
}));

const Photo: React.FC<{ file: string; length: number }> = ({ file, length }) => {
  const frame = useCurrentFrame();
  const drift = interpolate(frame, [0, Math.max(1, length)], [1.0, 1.05]);
  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: "#000" }}>
      <Img
        src={staticFile(`history/v/${file}`)}
        style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${drift})`, filter: "grayscale(1) contrast(1.25) brightness(0.92)" }}
      />
    </AbsoluteFill>
  );
};

/** Film grain and flicker that change every frame, plus a vignette. */
const FilmLook: React.FC = () => {
  const frame = useCurrentFrame();
  const flicker = 0.94 + random(`flicker-${frame}`) * 0.08;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, opacity: 0.22, mixBlendMode: "overlay" }}>
        <filter id={`grain-${frame}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={frame} />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#grain-${frame})`} />
      </svg>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 75% 65% at 50% 50%, transparent 55%, rgba(0,0,0,0.7) 100%)" }} />
      <AbsoluteFill style={{ backgroundColor: `rgba(0,0,0,${1 - flicker})` }} />
    </AbsoluteFill>
  );
};

/** A word slammed in with a quick overshoot. */
const Slam: React.FC<{ text: string; size: number; top?: string }> = ({ text, size, top = "50%" }) => {
  const frame = useCurrentFrame();
  const slam = interpolate(frame, [0, 3, 6], [1.35, 0.96, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top, transform: `translateY(-50%) scale(${slam})`, textAlign: "center" }}>
      <span style={{ fontFamily: FONT, fontWeight: 900, fontSize: size, letterSpacing: -6, color: "#fff", textShadow: "0 10px 60px rgba(0,0,0,0.7)" }}>
        {text}
      </span>
    </div>
  );
};

/** The game a shot shows, in a bar low on the frame. */
const GameTag: React.FC<{ name: string }> = ({ name }) => {
  const frame = useCurrentFrame();
  const pop = interpolate(frame, [0, 4], [0, 1], { extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 300, textAlign: "center", opacity: pop }}>
      <span style={{ fontFamily: FONT, fontWeight: 800, fontSize: 64, letterSpacing: 6, color: "#fff", background: "rgba(0,0,0,0.55)", padding: "12px 30px" }}>
        {name}
      </span>
    </div>
  );
};

/** The current era's year, small in the corner after its slam. */
const YearBadge: React.FC<{ text: string }> = ({ text }) => (
  <div style={{ position: "absolute", top: 120, left: 70, fontFamily: FONT, fontWeight: 800, fontSize: 52, color: "rgba(255,255,255,0.85)", letterSpacing: 2 }}>{text}</div>
);

const Title: React.FC = () => {
  const frame = useCurrentFrame();
  const line = (start: number) => ({
    opacity: interpolate(frame, [start, start + 5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
    transform: `translateY(${interpolate(frame, [start, start + 8], [20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) })}px)`,
  });
  return (
    <AbsoluteFill style={{ backgroundColor: "#000", alignItems: "center", justifyContent: "center", fontFamily: FONT, color: "#fff", textAlign: "center" }}>
      <div style={{ fontSize: 56, fontWeight: 600, letterSpacing: 8, color: "rgba(255,255,255,0.7)", ...line(0) }}>THE HISTORY OF</div>
      <div style={{ fontSize: 150, fontWeight: 900, letterSpacing: -5, lineHeight: 0.95, marginTop: 18, ...line(5) }}>
        MOBILE
        <br />
        GAMING
      </div>
    </AbsoluteFill>
  );
};

/** The drop: black and one line while the drums are out. */
const Drop: React.FC = () => {
  const frame = useCurrentFrame();
  const fade = interpolate(frame, [8, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ backgroundColor: "#000", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 64, color: "#fff", opacity: fade, textAlign: "center" }}>
        and then
        <br />
        it became a sport.
      </div>
    </AbsoluteFill>
  );
};

/** The closing line, word by word: the legend, then where the next one is. */
const CLOSING_LINES = [
  ["EVERY", "ERA", "HAD", "ITS", "LEGEND."],
  ["THE", "NEXT", "ONE", "IS"],
  ["WAITING", "TO", "BE", "FOUND."],
];
const Chapter: React.FC = () => {
  const frame = useCurrentFrame();
  let index = 0;
  return (
    <AbsoluteFill style={{ backgroundColor: "#000", alignItems: "center", justifyContent: "center", padding: "0 6%" }}>
      {CLOSING_LINES.map((line, l) => (
        <div key={l} style={{ fontFamily: FONT, fontWeight: 900, fontSize: l === 0 ? 62 : 86, lineHeight: 1.1, letterSpacing: -2, color: l === 0 ? "rgba(255,255,255,0.75)" : "#fff", textAlign: "center", whiteSpace: "nowrap", marginTop: l === 1 ? 44 : 0 }}>
          {line.map((w) => {
            // The second line waits a beat after the first.
            const start = index++ * 3 + (l >= 1 ? 12 : 0);
            const o = interpolate(frame, [start, start + 3], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            const sc = interpolate(frame, [start, start + 4], [1.3, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
            return (
              <span key={w + start} style={{ display: "inline-block", opacity: o, transform: `scale(${sc})`, margin: "0 0.14em" }}>
                {w}
              </span>
            );
          })}
        </div>
      ))}
    </AbsoluteFill>
  );
};

const EndCard: React.FC = () => {
  const frame = useCurrentFrame();
  const pop = interpolate(frame, [0, 4, 10], [1.35, 0.96, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const sub = interpolate(frame, [14, 22], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ backgroundColor: "#000", alignItems: "center", justifyContent: "center", fontFamily: FONT, color: "#fff" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 28, transform: `scale(${pop})` }}>
        <Img src={staticFile("logo.svg")} style={{ width: 130, height: 130 }} />
        <div style={{ fontSize: 104, fontWeight: 900, letterSpacing: -2 }}>PixelPicked.</div>
      </div>
      <div style={{ marginTop: 30, fontSize: 44, fontWeight: 600, opacity: sub }}>pixelpicked.com</div>
    </AbsoluteFill>
  );
};

const Cuts: React.FC<{ cuts: { file: string; from: number; to: number }[] }> = ({ cuts }) => (
  <>
    {cuts.map((cut, i) => (
      <Sequence key={i} from={cut.from} durationInFrames={Math.max(1, cut.to - cut.from)}>
        <Photo file={cut.file} length={cut.to - cut.from} />
      </Sequence>
    ))}
  </>
);

/** Year slams, the small year badge, and game names over a run of cuts. */
const Overlays: React.FC<{ cuts: Cut[]; slamSize: number }> = ({ cuts, slamSize }) => {
  const { height } = useVideoConfig();
  return (
    <>
      {cuts.map((cut, i) => {
        // The badge shows the era from its second cut until the next era's slam.
        const eraStart = cuts.slice(0, i + 1).reverse().find((c) => c.label)!;
        return (
          <Sequence key={i} from={cut.from} durationInFrames={Math.max(1, cut.to - cut.from)}>
            {cut.label ? <Slam text={cut.label} size={slamSize} top={`${height > 1080 ? 46 : 50}%`} /> : <YearBadge text={eraStart.label!} />}
            {cut.game && <GameTag name={cut.game} />}
          </Sequence>
        );
      })}
    </>
  );
};

export const HistoryFull: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Sequence durationInFrames={INTRO}>
        <Audio src={staticFile("audio/history/page-flip.m4a")} volume={(f) => interpolate(f, [0, 3, INTRO - 4, INTRO], [0, 1, 1, 0], { extrapolateRight: "clamp" })} />
      </Sequence>
      <Sequence from={INTRO} durationInFrames={TITLE_LENGTH + 30}>
        <Audio src={staticFile("audio/impact.mp3")} volume={0.8} />
      </Sequence>
      <Sequence from={MONTAGE_START}>
        <Audio
          src={staticFile("audio/history/stylish-trailer-percussion.mp3")}
          trimBefore={Math.round(MUSIC_START * FPS)}
          volume={(f) =>
            0.8 * interpolate(f, [LOGO_AT - MONTAGE_START, HISTORY_FULL_DURATION - MONTAGE_START], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
          }
        />
      </Sequence>
      <Sequence from={TEXT_AT} durationInFrames={90}>
        <Audio src={staticFile("audio/impact.mp3")} volume={0.55} />
      </Sequence>
      <Sequence from={LOGO_AT} durationInFrames={90}>
        <Audio src={staticFile("audio/impact.mp3")} volume={0.55} />
      </Sequence>

      <Cuts cuts={FLASH_CUTS} />
      <Cuts cuts={MAIN_CUTS} />
      <Cuts cuts={ESPORTS_CUTS} />
      <Sequence durationInFrames={INTRO}>
        <FilmLook />
      </Sequence>
      <Sequence from={INTRO} durationInFrames={TITLE_LENGTH}>
        <Title />
      </Sequence>
      <Sequence from={MONTAGE_START} durationInFrames={DROP_AT - MONTAGE_START}>
        <FilmLook />
      </Sequence>
      <Overlays cuts={MAIN_CUTS} slamSize={300} />
      <Sequence from={DROP_AT} durationInFrames={ESPORTS_AT - DROP_AT}>
        <Drop />
      </Sequence>
      <Sequence from={ESPORTS_AT} durationInFrames={END_AT - ESPORTS_AT}>
        <FilmLook />
      </Sequence>
      <Overlays cuts={ESPORTS_CUTS} slamSize={230} />
      <Sequence from={TEXT_AT} durationInFrames={LOGO_AT - TEXT_AT}>
        <Chapter />
      </Sequence>
      <Sequence from={LOGO_AT}>
        <EndCard />
      </Sequence>
    </AbsoluteFill>
  );
};
