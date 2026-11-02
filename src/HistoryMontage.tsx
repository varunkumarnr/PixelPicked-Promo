import React from "react";
import { AbsoluteFill, Audio, Easing, Img, interpolate, random, Sequence, staticFile, useCurrentFrame } from "remotion";

/**
 * Vertical fast-cut montage: the history of mobile gaming in archival-style black and white.
 * It opens with every photo strobing past over a riser, slams in the title, then the drums kick in
 * and the eras play in order, cut on the beat, ending on PixelPicked. Images are generated in one
 * consistent style (public/history/).
 */

const FONT = '"Helvetica Neue", "Inter", Arial, sans-serif';

type Cut = { img: string; scale: number; x: number; y: number };

/**
 * Cut to "Stylish Trailer Percussion" (120 BPM): every cut lands on an eighth note, every year on a
 * beat, and the title on the track's strongest hit (7.744s). The audio starts on the beat at 1.742s.
 */
const MUSIC_START = 1.742;
const EIGHTH = (0.4995 / 2) * 30; // frames per eighth note
const at = (eighths: number) => Math.round(eighths * EIGHTH);

/** Four cuts per era: which photo, how far it's punched in and where (focus point, 0..1). */
const ERAS: { year: string; cuts: Cut[] }[] = [
  { year: "1994", cuts: [
    { img: "1994-brick", scale: 1.0, x: 0.5, y: 0.5 },
    { img: "1994-brick", scale: 2.1, x: 0.6, y: 0.62 },
    { img: "1994-brick", scale: 1.6, x: 0.45, y: 0.82 },
    { img: "1994-brick", scale: 1.25, x: 0.35, y: 0.3 },
  ] },
  { year: "1997", cuts: [
    { img: "1997-snake", scale: 1.0, x: 0.5, y: 0.5 },
    { img: "1997-snake", scale: 1.9, x: 0.5, y: 0.36 },
    { img: "1997-teen", scale: 1.05, x: 0.5, y: 0.5 },
    { img: "1997-teen", scale: 1.8, x: 0.62, y: 0.58 },
  ] },
  { year: "2003", cuts: [
    { img: "2003-flip", scale: 1.0, x: 0.5, y: 0.5 },
    { img: "2003-flip", scale: 1.8, x: 0.45, y: 0.38 },
    { img: "2003-bus", scale: 1.05, x: 0.5, y: 0.5 },
    { img: "2003-bus", scale: 1.8, x: 0.3, y: 0.7 },
  ] },
  { year: "2008", cuts: [
    { img: "2008-touch", scale: 1.0, x: 0.5, y: 0.5 },
    { img: "2008-touch", scale: 1.9, x: 0.66, y: 0.48 },
    { img: "2008-touch", scale: 1.6, x: 0.5, y: 0.7 },
    { img: "2008-touch", scale: 1.25, x: 0.5, y: 0.4 },
  ] },
  { year: "2012", cuts: [
    { img: "2012-subway", scale: 1.0, x: 0.5, y: 0.5 },
    { img: "2012-subway", scale: 1.8, x: 0.3, y: 0.62 },
    { img: "2012-subway", scale: 1.8, x: 0.7, y: 0.55 },
    { img: "2012-subway", scale: 1.5, x: 0.5, y: 0.3 },
  ] },
  { year: "TODAY", cuts: [
    { img: "today-arena", scale: 1.0, x: 0.5, y: 0.5 },
    { img: "today-arena", scale: 1.8, x: 0.5, y: 0.8 },
    { img: "today-arena", scale: 1.7, x: 0.5, y: 0.25 },
    { img: "today-arena", scale: 1.15, x: 0.5, y: 0.5 },
  ] },
];
/** The flash intro: every photo strobing past like pages riffled in a flip book, then the title slams in. */
const INTRO = 60;
const FLASH = 2.5;
/** The title holds this long before the drums come in. */
const TITLE_LENGTH = 45;
const MONTAGE_START = INTRO + TITLE_LENGTH;

const ALL_CROPS = ERAS.flatMap((era) => era.cuts);
const INTRO_CUTS = Array.from({ length: INTRO / FLASH }, (_, i) => ({ ...ALL_CROPS[(i * 7) % ALL_CROPS.length], from: Math.round(i * FLASH) }));
const CUTS = ERAS.flatMap((era, e) => era.cuts.map((cut, c) => ({ ...cut, from: MONTAGE_START + at(e * 4 + c) })));
/** The years land on the first cut of each era, which is always on a beat. */
const YEARS = ERAS.map((era, e) => ({ text: era.year, from: MONTAGE_START + at(e * 4), to: MONTAGE_START + at(e * 4 + 4) }));
/** The end card lands on the track's strongest hit. */
const END_AT = MONTAGE_START + at(ERAS.length * 4);
export const HISTORY_MONTAGE_DURATION = END_AT + 50;


const Shot: React.FC<{ cut: Cut & { from: number }; length: number }> = ({ cut, length }) => {
  const frame = useCurrentFrame();
  // A slow push during the shot, so even a quarter second feels alive.
  const drift = interpolate(frame, [0, length], [1, 1.04]);
  const scale = cut.scale * drift;
  // Keep the focus point centred, without showing past the photo's edges.
  const tx = Math.max(0, Math.min(1 - 1 / scale, cut.x - 0.5 / scale)) * -100;
  const ty = Math.max(0, Math.min(1 - 1 / scale, cut.y - 0.5 / scale)) * -100;
  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: "#000" }}>
      <Img
        src={staticFile(`history/${cut.img}.png`)}
        style={{
          position: "absolute",
          width: `${scale * 100}%`,
          height: `${scale * 100}%`,
          left: `${tx * scale}%`,
          top: `${ty * scale}%`,
          objectFit: "cover",
          filter: "grayscale(1) contrast(1.25) brightness(0.92)",
        }}
      />
    </AbsoluteFill>
  );
};

/** Film grain and a flicker that changes every frame, plus a vignette. */
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

/** The year, huge, slammed in with a quick overshoot. */
const Year: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const slam = interpolate(frame, [0, 3, 6], [1.35, 0.96, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div
        style={{
          fontFamily: FONT,
          fontWeight: 900,
          fontSize: text.length > 4 ? 230 : 300,
          letterSpacing: -8,
          color: "#fff",
          transform: `scale(${slam})`,
          textShadow: "0 10px 60px rgba(0,0,0,0.65)",
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};

/** The closing title on black. */
const Title: React.FC = () => {
  const frame = useCurrentFrame();
  const line = (at: number) => ({
    opacity: interpolate(frame, [at, at + 5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
    transform: `translateY(${interpolate(frame, [at, at + 8], [20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) })}px)`,
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

/** The last frame: PixelPicked on black. */
const EndCard: React.FC = () => {
  const frame = useCurrentFrame();
  const pop = interpolate(frame, [0, 4, 10], [1.2, 0.97, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const sub = interpolate(frame, [12, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ backgroundColor: "#000", alignItems: "center", justifyContent: "center", fontFamily: FONT, color: "#fff" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 28, transform: `scale(${pop})` }}>
        <Img src={staticFile("logo.svg")} style={{ width: 120, height: 120 }} />
        <div style={{ fontSize: 96, fontWeight: 900, letterSpacing: -2 }}>PixelPicked.</div>
      </div>
      <div style={{ marginTop: 30, fontSize: 44, fontWeight: 600, opacity: sub }}>pixelpicked.com</div>
    </AbsoluteFill>
  );
};

const Shots: React.FC<{ cuts: (Cut & { from: number })[]; end: number }> = ({ cuts, end }) => (
  <>
    {cuts.map((cut, i) => {
      const until = cuts[i + 1]?.from ?? end;
      return (
        <Sequence key={i} from={cut.from} durationInFrames={until - cut.from}>
          <Shot cut={cut} length={until - cut.from} />
        </Sequence>
      );
    })}
  </>
);

export const HistoryMontage: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {/* Pages riffling under the flash intro, cut off by the impact as the title lands. */}
      <Sequence durationInFrames={INTRO}>
        <Audio src={staticFile("audio/history/page-flip.m4a")} volume={(f) => interpolate(f, [0, 3, INTRO - 4, INTRO], [0, 1, 1, 0], { extrapolateRight: "clamp" })} />
      </Sequence>
      <Sequence from={INTRO} durationInFrames={TITLE_LENGTH + 30}>
        <Audio src={staticFile("audio/impact.mp3")} volume={0.8} />
      </Sequence>
      {/* Then the drums, started on a beat so every cut below lands on one. */}
      <Sequence from={MONTAGE_START}>
        <Audio
          src={staticFile("audio/history/stylish-trailer-percussion.mp3")}
          trimBefore={Math.round(MUSIC_START * 30)}
          volume={(f) =>
            interpolate(f, [HISTORY_MONTAGE_DURATION - MONTAGE_START - 12, HISTORY_MONTAGE_DURATION - MONTAGE_START], [1, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })
          }
        />
      </Sequence>

      <Shots cuts={INTRO_CUTS} end={INTRO} />
      <Shots cuts={CUTS} end={END_AT} />
      <Sequence durationInFrames={INTRO}>
        <FilmLook />
      </Sequence>
      <Sequence from={INTRO} durationInFrames={TITLE_LENGTH}>
        <Title />
        <FilmLook />
      </Sequence>
      <Sequence from={MONTAGE_START} durationInFrames={END_AT - MONTAGE_START}>
        <FilmLook />
      </Sequence>
      {YEARS.map((y) => (
        <Sequence key={y.text} from={y.from} durationInFrames={y.to - y.from}>
          <Year text={y.text} />
        </Sequence>
      ))}
      <Sequence from={END_AT}>
        <EndCard />
      </Sequence>
    </AbsoluteFill>
  );
};
