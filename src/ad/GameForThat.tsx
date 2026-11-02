import React from "react";
import { AbsoluteFill, Img, OffthreadVideo, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { GameForThatAudio } from "./GameForThatAudio";
import { NARRATION, takeLen } from "./narration";

/**
 * "There's a game for that." A PixelPicked ad in the style of the 2009 iPhone spot: one phone on a
 * clean white background, real games from pixelpicked.com/play on its screen, and a calm narrator
 * walking through everyday moments with a few minutes to spare. Each new moment swipes up to the
 * next game, the way the PixelPicked feed does. It ends on the logo, on white.
 */

const ease = (t: number) => 1 - Math.pow(1 - t, 3);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Frames between one line ending and the next starting. */
const GAP = 14;
/** How long the swipe to the next game takes. */
const SWIPE = 12;

/** The games, in order: [clip in public/clips/ad, second to start from, name]. */
const GAMES: [string, number, string][] = [
  ["mochi", 4, "Mochi Mochi Donuts"],
  ["stackpack", 15.5, "Stack Pack"],
  ["office", 3, "9to5: Office Defense"],
  ["island", 1, "Island Fishing Match"],
  ["orbitglide", 4, "Orbit Glide"],
];

/** When each line starts: one after another, with a breath between. The first waits a beat. */
const STARTS = (() => {
  const out: number[] = [];
  let t = 16;
  for (const n of NARRATION) {
    out.push(t);
    t += takeLen(n.name) + GAP;
  }
  return out;
})();

/** Each game swipes in just before its line; the logo card comes in with the last line. */
const GAME_AT = GAMES.map((_, i) => (i === 0 ? 0 : STARTS[i] - SWIPE));
const CARD_AT = STARTS[GAMES.length] - SWIPE;

export const GAME_FOR_THAT_DURATION = STARTS[NARRATION.length - 1] + takeLen(NARRATION[NARRATION.length - 1].name) + 45;

/** The narration with its start frames, for the audio and the captions. */
const TIMED = NARRATION.map((n, i) => ({ ...n, at: STARTS[i] }));

// ── the phone ────────────────────────────────────────────────────────────────

const PHONE_H = 1240;
const BEZEL = 18;
const PHONE_W = Math.round((PHONE_H - BEZEL * 2) * (780 / 1688)) + BEZEL * 2;
const PHONE_TOP = 420;

/** One game's recording, filling the screen. */
const Game: React.FC<{ i: number }> = ({ i }) => {
  const { fps } = useVideoConfig();
  const [clip, from] = GAMES[i];
  return <OffthreadVideo src={staticFile(`clips/ad/${clip}.mp4`)} startFrom={Math.round(from * fps)} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />;
};

/** The screen: each game swipes up into place over the last, like scrolling the feed. */
const Screen: React.FC = () => {
  const f = useCurrentFrame();
  const h = PHONE_H - BEZEL * 2;
  return (
    <div style={{ position: "absolute", inset: BEZEL, borderRadius: 64, overflow: "hidden", background: "#000" }}>
      {GAMES.map((_, i) => {
        const start = GAME_AT[i];
        const next = i + 1 < GAMES.length ? GAME_AT[i + 1] : CARD_AT;
        if (f < start || f >= next + SWIPE) return null;
        const inK = i === 0 ? 1 : ease(interpolate(f, [start, start + SWIPE], [0, 1], clamp));
        const outK = i + 1 < GAMES.length ? ease(interpolate(f, [next, next + SWIPE], [0, 1], clamp)) : 0;
        return (
          <div key={i} style={{ position: "absolute", left: 0, top: (1 - inK) * h - outK * h, width: "100%", height: h }}>
            <Sequence from={start} layout="none">
              <Game i={i} />
            </Sequence>
          </div>
        );
      })}
      {/* glass */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(120deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 32%)" }} />
    </div>
  );
};

/** A fingertip that touches down and swipes up for each new game. */
const Swipes: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <>
      {GAME_AT.slice(1).map((at, k) => {
        const t = f - (at - 6);
        if (t < 0 || t > SWIPE + 12) return null;
        const y = interpolate(t, [0, 6, 6 + SWIPE], [0, 0, -280], { ...clamp, easing: ease });
        const o = interpolate(t, [0, 4, SWIPE + 4, SWIPE + 12], [0, 0.6, 0.6, 0], clamp);
        return <div key={k} style={{ position: "absolute", left: "50%", top: PHONE_H * 0.64 + y, width: 104, height: 104, marginLeft: -52, borderRadius: 52, background: "rgba(255,255,255,0.85)", boxShadow: "0 0 0 2px rgba(0,0,0,0.06), 0 10px 30px rgba(0,0,0,0.2)", opacity: o }} />;
      })}
    </>
  );
};

const Phone: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: f, fps, config: { damping: 22, stiffness: 70 } });
  const leave = interpolate(f, [CARD_AT, CARD_AT + 18], [0, 1], { ...clamp, easing: ease });
  return (
    <div
      style={{
        position: "absolute",
        left: (1080 - PHONE_W) / 2,
        top: PHONE_TOP + (1 - enter) * 120 + Math.sin(f / 40) * 6 - leave * 80,
        width: PHONE_W,
        height: PHONE_H,
        borderRadius: 82,
        background: "linear-gradient(135deg, #3a3b40, #121216 40%, #2c2d32)",
        boxShadow: "0 60px 120px rgba(20,20,40,0.26), 0 18px 40px rgba(20,20,40,0.16), inset 0 0 0 3px #4a4b52",
        opacity: enter * (1 - leave),
        transform: `rotate(${Math.sin(f / 70) * 0.6}deg) scale(${0.96 + 0.04 * enter})`,
      }}
    >
      <Screen />
      <Swipes />
    </div>
  );
};

// ── words ────────────────────────────────────────────────────────────────────

const FONT = '"Helvetica Neue", Arial, sans-serif';

/** The narration as quiet captions above the phone: dark text on white, no box. */
const Captions: React.FC = () => {
  const f = useCurrentFrame();
  const n = TIMED.findIndex((t) => f >= t.at + t.speech[0] - 2 && f < t.at + t.speech[1] + GAP);
  if (n < 0) return null;
  const t = TIMED[n];
  const k = interpolate(f - (t.at + t.speech[0] - 2), [0, 6], [0, 1], clamp);
  const last = n === TIMED.length - 1;
  return (
    <div style={{ position: "absolute", top: last ? 1180 : 170, left: 90, right: 90, textAlign: "center", opacity: k, transform: `translateY(${(1 - k) * 8}px)`, fontFamily: FONT, fontWeight: 500, fontSize: 50, lineHeight: 1.3, color: "#3a3a40" }}>
      {t.text}
    </div>
  );
};

/** The game's name under the phone, so people can find it. */
const GameName: React.FC = () => {
  const f = useCurrentFrame();
  const i = GAME_AT.findIndex((at, k) => f >= at + SWIPE && f < (k + 1 < GAMES.length ? GAME_AT[k + 1] : CARD_AT));
  if (i < 0) return null;
  const k = interpolate(f - GAME_AT[i] - SWIPE, [0, 8], [0, 1], clamp);
  return <div style={{ position: "absolute", top: PHONE_TOP + PHONE_H + 40, left: 0, right: 0, textAlign: "center", opacity: k * 0.9, fontFamily: FONT, fontWeight: 500, fontSize: 34, color: "#8a8a92" }}>{GAMES[i][2]}</div>;
};

/** The logo on white, as the last line is spoken. */
const EndCard: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = f - CARD_AT - 8;
  if (t < 0) return null;
  const k = spring({ frame: t, fps, config: { damping: 20, stiffness: 90 } });
  const url = interpolate(t, [24, 40], [0, 1], clamp);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", fontFamily: FONT }}>
      <div style={{ opacity: k, transform: `scale(${0.92 + 0.08 * k})`, display: "flex", flexDirection: "column", alignItems: "center", marginTop: -160 }}>
        <Img src={staticFile("logo.svg")} style={{ width: 210, height: 210, borderRadius: 50, boxShadow: "0 20px 50px rgba(20,20,40,0.16), 0 0 0 1px rgba(0,0,0,0.05)" }} />
        <div style={{ marginTop: 40, fontSize: 84, fontWeight: 700, color: "#1d1d22", letterSpacing: -2 }}>PixelPicked</div>
        <div style={{ marginTop: 14, fontSize: 40, fontWeight: 400, color: "#6e6e76", opacity: url }}>pixelpicked.com</div>
      </div>
    </AbsoluteFill>
  );
};

// ── the edit ─────────────────────────────────────────────────────────────────

/** `bare` leaves the background out, for the wide cut to supply its own. */
export const GameForThat: React.FC<{ bare?: boolean }> = ({ bare }) => (
  <AbsoluteFill style={{ background: bare ? undefined : "radial-gradient(ellipse at 50% 45%, #ffffff 0%, #f3f3f6 70%, #ececf0 100%)" }}>
    <Phone />
    <GameName />
    <Captions />
    <EndCard />
    <GameForThatAudio narration={TIMED} swipes={GAME_AT.slice(1)} cardAt={CARD_AT} />
  </AbsoluteFill>
);

/** The 16:9 cut for YouTube and the website: the same spot, centred on a wider white frame. */
export const GameForThatWide: React.FC = () => (
  <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 50%, #ffffff 0%, #f1f1f4 80%)" }}>
    <div style={{ position: "absolute", left: (1920 - 1080 * 0.6) / 2, top: -36, width: 1080, height: 1920, transform: "scale(0.6)", transformOrigin: "0 0" }}>
      <GameForThat bare />
    </div>
  </AbsoluteFill>
);
