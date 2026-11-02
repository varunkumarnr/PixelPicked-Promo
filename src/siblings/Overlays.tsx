import React from "react";
import { AbsoluteFill, Img, OffthreadVideo, interpolate, spring, staticFile, useCurrentFrame } from "remotion";

/**
 * The 2D layers of a Zack & Jiya episode: close-ups of the phone (real PixelPicked gameplay with
 * our own score on the HUD), the hook caption, word-by-word subtitles and the running scoreboard.
 */

const FPS = 30;
const CAPTION_FONT = '"Helvetica Neue", "Arial", sans-serif';
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// ── phone close-ups ──────────────────────────────────────────────────────────

/** Size of the gameplay recordings, and where their HUD sits, in recording pixels. */
const CLIP = { w: 390, h: 844 };
const PHONE_W = 640;
const K = PHONE_W / CLIP.w;
const PHONE_H = CLIP.h * K;

/**
 * Covers the tower game's HUD (header score, floor count and score box) with our own numbers,
 * matching the game's look, so the story's scores show on screen.
 */
const TowerHud: React.FC<{ floors: number }> = ({ floors }) => (
  <>
    <div style={{ position: "absolute", left: 222 * K, top: 6 * K, width: 50 * K, height: 46 * K, background: "#0b0b0d" }}>
      <div style={{ fontSize: 6 * K, letterSpacing: 1, color: "#8b8b93", fontWeight: 700, textAlign: "center", marginTop: 7 * K, fontFamily: CAPTION_FONT }}>SCORE</div>
      <div style={{ fontSize: 16 * K, color: "#f5c542", fontWeight: 800, textAlign: "center", fontFamily: CAPTION_FONT, lineHeight: 1 }}>{floors * 25}</div>
    </div>
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 58 * K,
        width: CLIP.w * K,
        height: 96 * K,
        background: "linear-gradient(180deg, rgb(103,224,240) 0%, rgb(112,226,231) 100%)",
      }}
    >
      <div style={{ position: "absolute", left: 52 * K, top: 14 * K, display: "flex", alignItems: "baseline", gap: 6 * K, fontFamily: '"Arial Rounded MT Bold", Arial, sans-serif' }}>
        <span style={{ fontSize: 58 * K, fontWeight: 900, color: "#ff9a2e", WebkitTextStroke: `${3 * K}px #fff`, paintOrder: "stroke fill", lineHeight: 1 }}>{floors}</span>
        <span style={{ fontSize: 22 * K, fontWeight: 900, color: "#ff9a2e", WebkitTextStroke: `${2 * K}px #fff`, paintOrder: "stroke fill" }}>floors</span>
      </div>
      <div
        style={{
          position: "absolute",
          left: 246 * K,
          top: 16 * K,
          width: 128 * K,
          height: 36 * K,
          borderRadius: 10 * K,
          background: "rgba(255,255,255,0.45)",
          border: `${1.5 * K}px solid rgba(255,255,255,0.8)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: `0 ${10 * K}px`,
          boxSizing: "border-box",
          fontFamily: '"Arial Rounded MT Bold", Arial, sans-serif',
          fontWeight: 900,
        }}
      >
        <span style={{ fontSize: 15 * K, color: "#fff", WebkitTextStroke: `${2.4 * K}px #7a4a24`, paintOrder: "stroke fill" }}>SCORE</span>
        <span style={{ fontSize: 18 * K, color: "#ff8a1f" }}>{floors * 25}</span>
      </div>
    </div>
  </>
);

/** The big "NEW BEST" stamp that slams onto the phone screen, with confetti. */
const NewBest: React.FC<{ value: number; at: number }> = ({ value, at }) => {
  const frame = useCurrentFrame();
  if (frame < at) return null;
  const f = frame - at;
  const pop = spring({ frame: f, fps: FPS, config: { damping: 9, stiffness: 220 } });
  const scale = interpolate(pop, [0, 1], [2.4, 1]);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", background: `rgba(10,10,20,${Math.min(0.45, f * 0.05)})` }}>
      {Array.from({ length: 26 }, (_, i) => {
        const a = (i / 26) * Math.PI * 2;
        const v = 14 + (i % 5) * 4;
        const x = Math.cos(a) * v * f;
        const y = Math.sin(a) * v * f + 0.9 * f * f;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              width: 16,
              height: 26,
              borderRadius: 4,
              background: ["#ffd23f", "#ff5d8f", "#4ade80", "#5ec8ff"][i % 4],
              transform: `translate(${x}px, ${y}px) rotate(${f * 20 + i * 40}deg)`,
              opacity: interpolate(f, [0, 22, 30], [1, 1, 0], clamp),
            }}
          />
        );
      })}
      <div
        style={{
          transform: `scale(${scale}) rotate(-6deg)`,
          background: "linear-gradient(180deg, #ffe066, #ffb703)",
          borderRadius: 34,
          padding: "26px 54px 30px",
          border: "8px solid #fff",
          boxShadow: "0 18px 50px rgba(0,0,0,0.45)",
          textAlign: "center",
          fontFamily: '"Arial Rounded MT Bold", Arial, sans-serif',
        }}
      >
        <div style={{ fontSize: 46, fontWeight: 900, color: "#7a3d00", letterSpacing: 4 }}>NEW BEST</div>
        <div style={{ fontSize: 150, fontWeight: 900, color: "#fff", lineHeight: 0.95, WebkitTextStroke: "10px #c85a00", paintOrder: "stroke fill" }}>{value}</div>
        <div style={{ fontSize: 40, fontWeight: 900, color: "#7a3d00" }}>FLOORS</div>
      </div>
    </AbsoluteFill>
  );
};

/** The loss: the screen dims red and GAME OVER slams down with a shake (or a green WIN). */
const GameOver: React.FC<{ at: number; win?: boolean }> = ({ at, win }) => {
  const frame = useCurrentFrame();
  if (frame < at) return null;
  const f = frame - at;
  const pop = spring({ frame: f, fps: FPS, config: { damping: 8, stiffness: 260 } });
  const shake = f < 8 ? Math.sin(f * 5) * (8 - f) * 2 : 0;
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", background: win ? `rgba(0,40,20,${Math.min(0.45, f * 0.1)})` : `rgba(60,0,10,${Math.min(0.62, f * 0.12)})` }}>
      <div
        style={{
          transform: `translateX(${shake}px) scale(${interpolate(pop, [0, 1], [2.6, 1])}) rotate(-5deg)`,
          fontFamily: '"Arial Black", "Arial Rounded MT Bold", Arial, sans-serif',
          fontWeight: 900,
          fontSize: 118,
          lineHeight: 0.92,
          textAlign: "center",
          color: win ? "#3ddc84" : "#ff3b4e",
          WebkitTextStroke: "12px #fff",
          paintOrder: "stroke fill",
          textShadow: "0 14px 40px rgba(0,0,0,0.55)",
        }}
      >
        {win ? (
          "WIN!"
        ) : (
          <>
            GAME
            <br />
            OVER
          </>
        )}
      </div>
    </AbsoluteFill>
  );
};

/** A cartoon thumb that taps the screen on `taps` frames. */
const Thumb: React.FC<{ skin: string; taps: number[]; x?: number; y?: number }> = ({ skin, taps, x = 420, y = 1180 }) => {
  const frame = useCurrentFrame();
  const press = taps.reduce((m, t) => Math.max(m, interpolate(frame - t, [-3, 0, 4], [0, 1, 0], clamp)), 0);
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: 190,
        height: 420,
        borderRadius: "95px 95px 60px 60px",
        background: `radial-gradient(ellipse 70% 40% at 40% 18%, rgba(255,255,255,0.35), transparent 70%), ${skin}`,
        boxShadow: "inset -18px -10px 40px rgba(120,60,30,0.35), 0 20px 40px rgba(0,0,0,0.35)",
        transform: `rotate(-28deg) translate(${press * -14}px, ${press * -26}px) scale(${1 - press * 0.04})`,
        transformOrigin: "50% 100%",
      }}
    >
      <div style={{ position: "absolute", left: 38, top: 22, width: 110, height: 110, borderRadius: "55px 55px 40px 40px", background: "rgba(255,240,230,0.55)", boxShadow: "inset 0 -6px 10px rgba(160,90,60,0.25)" }} />
    </div>
  );
};

export type PhoneInsertProps = {
  clip: "tower" | "archer";
  /** Second of the recording to start from. */
  from: number;
  rate?: number;
  /** Floors shown on the tower HUD for each frame of this insert. */
  floors?: (frame: number) => number;
  newBest?: { at: number; value: number };
  /** Swipe up to the archer game at this frame. */
  swipeAt?: number;
  skin: string;
  taps?: number[];
  /** Freeze on the first frame (phone lying on the desk). */
  still?: boolean;
  /** Slam a GAME OVER stamp onto the screen at this frame. */
  gameOver?: number;
};

const Screen: React.FC<{ clip: "tower" | "archer"; from: number; rate: number; still?: boolean }> = ({ clip, from, rate, still }) =>
  still ? (
    <Img src={staticFile(`siblings/screen-${clip}.png`)} style={{ width: "100%", height: "100%" }} />
  ) : (
    <OffthreadVideo
      src={staticFile(`clips/play-${clip === "tower" ? "tower-building" : "bullseye-archer"}.mp4`)}
      startFrom={Math.round(from * FPS)}
      playbackRate={rate}
      muted
      style={{ width: "100%", height: "100%" }}
    />
  );

/** A close-up of the phone in someone's hand, over the blurred bedroom. */
export const PhoneInsert: React.FC<PhoneInsertProps> = ({ clip, from, rate = 1, floors, newBest, swipeAt, skin, taps = [], still, gameOver }) => {
  const frame = useCurrentFrame();
  const sway = Math.sin(frame * 0.12) * 0.8;
  const swipe = swipeAt === undefined ? 0 : interpolate(frame, [swipeAt, swipeAt + 9], [0, 1], { ...clamp, easing: (t) => 1 - Math.pow(1 - t, 3) });
  const top = 1060 - PHONE_H / 2;
  return (
    <AbsoluteFill style={{ background: "#1a1420", overflow: "hidden" }}>
      <Img
        src={staticFile("siblings/room-bg-night.jpg")}
        style={{ position: "absolute", inset: -60, width: 1200, height: 2040, objectFit: "cover", filter: "blur(30px) brightness(0.8) saturate(1.1)" }}
      />
      <div
        style={{
          position: "absolute",
          left: (1080 - PHONE_W) / 2 - 18,
          top: top - 18,
          width: PHONE_W + 36,
          height: PHONE_H + 36,
          borderRadius: 74,
          background: "#16171c",
          boxShadow: "0 40px 90px rgba(0,0,0,0.6), inset 0 0 0 3px #3a3b42",
          transform: `rotate(${sway}deg)`,
        }}
      >
        <div style={{ position: "absolute", left: 18, top: 18, width: PHONE_W, height: PHONE_H, borderRadius: 58, overflow: "hidden", background: "#000" }}>
          <div style={{ position: "absolute", left: 0, top: -swipe * PHONE_H, width: PHONE_W, height: PHONE_H }}>
            <Screen clip={clip} from={from} rate={rate} still={still} />
            {clip === "tower" && floors && <TowerHud floors={floors(frame)} />}
            {newBest && <NewBest {...newBest} />}
            {gameOver !== undefined && <GameOver at={gameOver} />}
          </div>
          {swipeAt !== undefined && (
            <div style={{ position: "absolute", left: 0, top: (1 - swipe) * PHONE_H, width: PHONE_W, height: PHONE_H }}>
              <OffthreadVideo
                src={staticFile("clips/play-bullseye-archer.mp4")}
                startFrom={Math.max(0, frame - swipeAt) > 0 ? 0 : 0}
                muted
                style={{ width: "100%", height: "100%" }}
              />
            </div>
          )}
          {/* glass glare */}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(125deg, rgba(255,255,255,0.12) 0%, transparent 30%)" }} />
          {/* dynamic island */}
          <div style={{ position: "absolute", left: PHONE_W / 2 - 70, top: 14, width: 140, height: 34, borderRadius: 17, background: "#000" }} />
        </div>
      </div>
      {(taps.length > 0 || swipeAt !== undefined) && (
        <Thumb skin={skin} taps={swipeAt !== undefined ? [...taps, swipeAt - 2] : taps} y={swipeAt !== undefined ? 1180 - swipe * 240 : 1180} />
      )}
    </AbsoluteFill>
  );
};

// ── text layers ──────────────────────────────────────────────────────────────

/** The hook, in the classic white caption box at the top, there for the whole reel. */
export const HookCaption: React.FC<{ text: string }> = ({ text }) => (
  <div style={{ position: "absolute", top: 190, left: 0, right: 0, display: "flex", justifyContent: "center", padding: "0 80px" }}>
    <div
      style={{
        background: "#fff",
        color: "#111",
        fontFamily: CAPTION_FONT,
        fontWeight: 700,
        fontSize: 50,
        lineHeight: 1.22,
        textAlign: "center",
        padding: "16px 30px 18px",
        borderRadius: 22,
        boxShadow: "0 6px 24px rgba(0,0,0,0.18)",
        maxWidth: 880,
      }}
    >
      {text}
    </div>
  </div>
);

export type Line = { from: number; to: number; text: string; who: "zack" | "jiya" | "sfx" };

const WHO_COLOR = { zack: "#ffffff", jiya: "#e7d2ff", sfx: "#ffe27a" };

/** Spoken lines as bold outlined subtitles; words pop in one by one across the line. */
export const Subtitles: React.FC<{ lines: Line[]; top?: number }> = ({ lines, top = 1430 }) => {
  const frame = useCurrentFrame();
  const line = lines.find((l) => frame >= l.from && frame < l.to);
  if (!line) return null;
  const words = line.text.split(" ");
  const span = Math.min(line.to - line.from - 6, words.length * 7);
  const sfx = line.who === "sfx";
  return (
    <div style={{ position: "absolute", top, left: 70, right: 70, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "0 36px" }}>
      {words.map((w, i) => {
        const at = line.from + (span * i) / words.length;
        if (frame < at) return null;
        const pop = spring({ frame: frame - at, fps: FPS, config: { damping: 12, stiffness: 260 } });
        const shout = w === w.toUpperCase() && /[A-Z]{2,}/.test(w);
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              transform: `scale(${interpolate(pop, [0, 1], [0.6, 1])})`,
              fontFamily: '"Arial Black", "Helvetica Neue", Arial, sans-serif',
              fontWeight: 900,
              fontStyle: sfx ? "italic" : "normal",
              fontSize: shout ? 104 : sfx ? 60 : 78,
              color: shout ? "#ffd23f" : WHO_COLOR[line.who],
              WebkitTextStroke: "14px #000",
              paintOrder: "stroke fill",
              lineHeight: 1.15,
              letterSpacing: -1,
            }}
          >
            {w}
          </span>
        );
      })}
    </div>
  );
};

/**
 * The premium-look subtitles: the whole line at once in a soft dark box, sentence case, no
 * shouting colours, the way animated-film reels caption their dialogue.
 */
export const CleanSubs: React.FC<{ lines: Line[]; top?: number }> = ({ lines, top = 1390 }) => {
  const frame = useCurrentFrame();
  const line = lines.find((l) => frame >= l.from && frame < l.to);
  if (!line) return null;
  // a line that opens the reel is there on frame 1 (it is the cover and the hook); the rest ease in
  const k = line.from === 0 ? 1 : interpolate(frame - line.from, [0, 4], [0, 1], clamp);
  return (
    <div style={{ position: "absolute", top, left: 90, right: 90, display: "flex", justifyContent: "center", opacity: k, transform: `translateY(${(1 - k) * 10}px)` }}>
      <div
        style={{
          background: "rgba(20,18,26,0.62)",
          backdropFilter: "blur(6px)",
          color: line.who === "sfx" ? "#ffe6a8" : "#fff",
          fontFamily: CAPTION_FONT,
          fontWeight: 700,
          fontStyle: line.who === "sfx" ? "italic" : "normal",
          fontSize: 54,
          lineHeight: 1.25,
          textAlign: "center",
          padding: "16px 30px 18px",
          borderRadius: 24,
        }}
      >
        {line.text}
      </div>
    </div>
  );
};

/** The premium-look beat label: a small frosted pill that fades in, "#3 · the hand grabber". */
export const CleanTag: React.FC<{ n: number; label: string; at: number; until: number }> = ({ n, label, at, until }) => {
  const frame = useCurrentFrame();
  if (frame < at || frame >= until) return null;
  const k = interpolate(frame - at, [0, 6], [0, 1], clamp) * interpolate(frame, [until - 5, until], [1, 0], clamp);
  return (
    <div style={{ position: "absolute", top: 440, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: k }}>
      <div
        style={{
          background: "rgba(255,255,255,0.86)",
          color: "#1d1a24",
          fontFamily: CAPTION_FONT,
          fontWeight: 700,
          fontSize: 38,
          padding: "10px 26px 12px",
          borderRadius: 999,
          letterSpacing: 0.5,
          boxShadow: "0 8px 30px rgba(0,0,0,0.25)",
        }}
      >
        <span style={{ color: "#8a6bd1" }}>#{n}</span> · {label}
      </div>
    </div>
  );
};

/** The running series score. */
export const Scoreboard: React.FC<{ zack: number; jiya: number; at: number }> = ({ zack, jiya, at }) => {
  const frame = useCurrentFrame();
  if (frame < at) return null;
  const pop = spring({ frame: frame - at, fps: FPS, config: { damping: 10, stiffness: 200 } });
  const chip = (name: string, n: number, bg: string, fg: string, side: "l" | "r") => (
    <div style={{ display: "flex", alignItems: "center", gap: 18, flexDirection: side === "l" ? "row" : "row-reverse" }}>
      <div style={{ background: bg, color: fg, borderRadius: 18, padding: "10px 22px", fontSize: 44, fontWeight: 900, letterSpacing: 2 }}>{name}</div>
      <div style={{ fontSize: 110, fontWeight: 900, color: "#fff", WebkitTextStroke: "12px #000", paintOrder: "stroke fill" }}>{n}</div>
    </div>
  );
  return (
    <div style={{ position: "absolute", top: 470, left: 0, right: 0, display: "flex", justifyContent: "center", transform: `scale(${pop})` }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 26,
          padding: "14px 34px",
          borderRadius: 40,
          background: "rgba(15,12,25,0.78)",
          border: "4px solid rgba(255,255,255,0.9)",
          fontFamily: '"Arial Black", Arial, sans-serif',
        }}
      >
        {chip("ZACK", zack, "#3d6fe0", "#fff", "l")}
        <div style={{ fontSize: 70, fontWeight: 900, color: "#fff" }}>–</div>
        {chip("JIYA", jiya, "#c7a8f2", "#2a1840", "r")}
      </div>
    </div>
  );
};

/** "EXCUSE #3" (or any label): a tilted tag that pops in at the start of each beat. */
export const ExcuseTag: React.FC<{ n: number; at: number; until: number; label?: string }> = ({ n, at, until, label }) => {
  const frame = useCurrentFrame();
  if (frame < at || frame >= until) return null;
  const pop = spring({ frame: frame - at, fps: FPS, config: { damping: 9, stiffness: 240 } });
  return (
    <div style={{ position: "absolute", top: 400, left: 70, transform: `scale(${pop}) rotate(-6deg)`, transformOrigin: "0% 50%" }}>
      <div
        style={{
          background: "#ffd23f",
          color: "#1a1206",
          fontFamily: '"Arial Black", Arial, sans-serif',
          fontWeight: 900,
          fontSize: 54,
          letterSpacing: 1,
          padding: "10px 26px 12px",
          borderRadius: 16,
          border: "6px solid #1a1206",
          boxShadow: "0 10px 0 #1a1206",
        }}
      >
        {label ? `#${n} ${label}` : `EXCUSE #${n}`}
      </div>
    </div>
  );
};

/**
 * The running score in the top right: each number pops when it changes. `ticks` are
 * [frame, zack, jiya] and the last one at or before now is shown; `star` adds an asterisk to Zack's.
 */
export const LiveScore: React.FC<{ ticks: [number, number, number][]; star?: number; hideFrom?: number }> = ({ ticks, star, hideFrom }) => {
  const frame = useCurrentFrame();
  if (hideFrom !== undefined && frame >= hideFrom) return null;
  let i = 0;
  while (i < ticks.length - 1 && frame >= ticks[i + 1][0]) i++;
  const [at, z, j] = ticks[i];
  const prev = ticks[Math.max(0, i - 1)];
  const bump = (changed: boolean) => (changed && i > 0 ? 1 + 0.6 * Math.max(0, 1 - spring({ frame: frame - at, fps: FPS, config: { damping: 10, stiffness: 220 } })) : 1);
  const starOn = star !== undefined && frame >= star;
  const num = (n: number, scale: number, extra?: string) => (
    <span style={{ display: "inline-block", transform: `scale(${scale})`, fontSize: 64, color: "#fff", WebkitTextStroke: "9px #000", paintOrder: "stroke fill" }}>
      {n}
      {extra && <span style={{ color: "#ffd23f", fontSize: 52, verticalAlign: "top" }}>{extra}</span>}
    </span>
  );
  return (
    <div style={{ position: "absolute", top: 392, right: 60, display: "flex", alignItems: "center", gap: 14, padding: "8px 22px", borderRadius: 26, background: "rgba(15,12,25,0.72)", border: "3px solid rgba(255,255,255,0.85)", fontFamily: '"Arial Black", Arial, sans-serif', fontWeight: 900 }}>
      <span style={{ background: "#3d6fe0", color: "#fff", borderRadius: 12, padding: "4px 12px", fontSize: 30 }}>ZACK</span>
      {num(z, bump(z !== prev[1]), starOn ? "*" : undefined)}
      <span style={{ color: "#fff", fontSize: 44 }}>–</span>
      {num(j, bump(j !== prev[2]))}
      <span style={{ background: "#c7a8f2", color: "#2a1840", borderRadius: 12, padding: "4px 12px", fontSize: 30 }}>JIYA</span>
    </div>
  );
};

/** Closing card over the last shot: the series score with its footnote. */
export const EndCard: React.FC<{ at: number; zack: string; jiya: string; note: string; episode: string }> = ({ at, zack, jiya, note, episode }) => {
  const frame = useCurrentFrame();
  if (frame < at) return null;
  const f = frame - at;
  const pop = spring({ frame: f, fps: FPS, config: { damping: 11, stiffness: 180 } });
  const noteIn = spring({ frame: f - 14, fps: FPS, config: { damping: 14, stiffness: 160 } });
  const chip = (name: string, n: string, bg: string, fg: string) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <div style={{ background: bg, color: fg, borderRadius: 18, padding: "8px 24px", fontSize: 46, letterSpacing: 2 }}>{name}</div>
      <div style={{ fontSize: 190, color: "#fff", WebkitTextStroke: "16px #000", paintOrder: "stroke fill", lineHeight: 1 }}>{n}</div>
    </div>
  );
  return (
    <AbsoluteFill style={{ background: `rgba(8,6,16,${Math.min(0.6, f * 0.06)})`, alignItems: "center", justifyContent: "center", fontFamily: '"Arial Black", Arial, sans-serif', fontWeight: 900 }}>
      <div style={{ transform: `scale(${pop})`, display: "flex", alignItems: "flex-end", gap: 40 }}>
        {chip("ZACK", zack, "#3d6fe0", "#fff")}
        <div style={{ fontSize: 120, color: "#fff", paddingBottom: 40 }}>–</div>
        {chip("JIYA", jiya, "#c7a8f2", "#2a1840")}
      </div>
      <div style={{ marginTop: 40, opacity: noteIn, transform: `translateY(${(1 - noteIn) * 30}px)`, fontSize: 52, color: "#ffd23f", WebkitTextStroke: "8px #000", paintOrder: "stroke fill", fontStyle: "italic" }}>{note}</div>
      <div style={{ marginTop: 26, opacity: noteIn, fontSize: 34, color: "rgba(255,255,255,0.8)", letterSpacing: 6 }}>{episode}</div>
    </AbsoluteFill>
  );
};

// ── anime effects ────────────────────────────────────────────────────────────

const JP_FONT = '"Hiragino Sans", "Hiragino Kaku Gothic ProN", "Arial Black", sans-serif';
const seeded = (n: number) => {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
};

/** Focus lines: white streaks rushing in from the frame edge toward a point, redrawn on twos. */
const SpeedLines: React.FC<{ cx: number; cy: number; f: number; color?: string }> = ({ cx, cy, f, color = "rgba(255,255,255,0.85)" }) => {
  const k = Math.floor(f / 2);
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
      {Array.from({ length: 70 }, (_, i) => {
        const a = (i / 70) * Math.PI * 2 + seeded(i + k * 31) * 0.08;
        const inner = 430 + seeded(i * 7 + k) * 260;
        const w = 3 + seeded(i * 3 + k * 5) * 9;
        const x1 = cx + Math.cos(a) * 1500;
        const y1 = cy + Math.sin(a) * 1500;
        const x2 = cx + Math.cos(a) * inner;
        const y2 = cy + Math.sin(a) * inner;
        const nx = -Math.sin(a) * w;
        const ny = Math.cos(a) * w;
        return <polygon key={i} points={`${x1 + nx},${y1 + ny} ${x1 - nx},${y1 - ny} ${x2},${y2}`} fill={color} />;
      })}
    </svg>
  );
};

/** The anger vein mark (💢), pulsing. */
const Vein: React.FC<{ x: number; y: number; f: number; size?: number }> = ({ x, y, f, size = 150 }) => {
  const s = size * (1 + Math.abs(Math.sin(f * 0.6)) * 0.15);
  const arm = (r: number) => (
    <path
      key={r}
      transform={`rotate(${r} 50 50)`}
      d="M 30 8 Q 42 30 20 40"
      fill="none"
      stroke="#e8203a"
      strokeWidth={11}
      strokeLinecap="round"
    />
  );
  return (
    <svg width={s} height={s} viewBox="0 0 100 100" style={{ position: "absolute", left: x - s / 2, top: y - s / 2, filter: "drop-shadow(0 0 3px #fff) drop-shadow(0 0 2px #fff)" }}>
      {[0, 90, 180, 270].map(arm)}
    </svg>
  );
};

/** A big blue sweat drop sliding slowly down. */
const Sweat: React.FC<{ x: number; y: number; f: number }> = ({ x, y, f }) => (
  <svg width={90} height={140} viewBox="0 0 60 90" style={{ position: "absolute", left: x, top: y + Math.min(40, f * 0.8) }}>
    <path d="M30 4 C 12 40, 6 56, 6 64 A 24 24 0 0 0 54 64 C 54 56, 48 40, 30 4 Z" fill="#9fd8ff" stroke="#1f5fa8" strokeWidth={4} />
    <ellipse cx={22} cy={60} rx={6} ry={10} fill="#fff" opacity={0.85} />
  </svg>
);

/** Four-point sparkles that twinkle in and out. */
const Sparkles: React.FC<{ pts: [number, number][]; f: number }> = ({ pts, f }) => (
  <>
    {pts.map(([x, y], i) => {
      const t = Math.max(0, Math.sin(f * 0.25 + i * 1.7));
      const s = 40 + 70 * t;
      return (
        <svg key={i} width={s} height={s} viewBox="0 0 100 100" style={{ position: "absolute", left: x - s / 2, top: y - s / 2, opacity: t }}>
          <path d="M50 0 Q 56 44 100 50 Q 56 56 50 100 Q 44 56 0 50 Q 44 44 50 0 Z" fill="#fff8c8" stroke="#ffc83d" strokeWidth={3} />
        </svg>
      );
    })}
  </>
);

/** Japanese sound-effect lettering (ゴゴゴ, ガーン, ポリッ), drawn big and outlined. */
const Onomatopoeia: React.FC<{ text: string; x: number; y: number; f: number; size?: number; color?: string; stroke?: string; shake?: number; rot?: number }> = ({
  text,
  x,
  y,
  f,
  size = 160,
  color = "#fff",
  stroke = "#000",
  shake = 0,
  rot = -8,
}) => {
  const pop = spring({ frame: f, fps: FPS, config: { damping: 9, stiffness: 240 } });
  const jx = shake ? (seeded(Math.floor(f / 2) * 3) - 0.5) * shake : 0;
  const jy = shake ? (seeded(Math.floor(f / 2) * 5 + 1) - 0.5) * shake : 0;
  return (
    <div
      style={{
        position: "absolute",
        left: x + jx,
        top: y + jy,
        transform: `translate(-50%, -50%) rotate(${rot}deg) scale(${pop})`,
        fontFamily: JP_FONT,
        fontWeight: 900,
        fontSize: size,
        color,
        WebkitTextStroke: `${size * 0.09}px ${stroke}`,
        paintOrder: "stroke fill",
        whiteSpace: "nowrap",
        lineHeight: 1,
      }}
    >
      {text}
    </div>
  );
};

/** One beat of anime effects on the timeline. */
export type FxCue =
  | { kind: "speed"; at: number; until: number; x: number; y: number; dark?: boolean }
  | { kind: "vein" | "sweat"; at: number; until: number; x: number; y: number; size?: number }
  | { kind: "sparkle"; at: number; until: number; pts: [number, number][] }
  | { kind: "text"; at: number; until: number; text: string; x: number; y: number; size?: number; color?: string; stroke?: string; shake?: number; rot?: number }
  | { kind: "menace"; at: number; until: number }
  | { kind: "gloom"; at: number; until: number }
  | { kind: "impact"; at: number; until: number };

export const AnimeFx: React.FC<{ cues: FxCue[] }> = ({ cues }) => {
  const frame = useCurrentFrame();
  return (
    <>
      {cues.map((c, i) => {
        if (frame < c.at || frame >= c.until) return null;
        const f = frame - c.at;
        switch (c.kind) {
          case "speed":
            return <SpeedLines key={i} cx={c.x} cy={c.y} f={f} color={c.dark ? "rgba(20,10,40,0.75)" : undefined} />;
          case "vein":
            return <Vein key={i} x={c.x} y={c.y} f={f} size={c.size} />;
          case "sweat":
            return <Sweat key={i} x={c.x} y={c.y} f={f} />;
          case "sparkle":
            return <Sparkles key={i} pts={c.pts} f={f} />;
          case "text":
            return <Onomatopoeia key={i} {...c} f={f} />;
          case "menace":
            // JoJo-style menacing letters stacked down the side, shuddering
            return (
              <React.Fragment key={i}>
                <AbsoluteFill style={{ background: "rgba(40,0,60,0.25)" }} />
                {[
                  [880, 820, 150],
                  [940, 1010, 120],
                  [860, 1190, 170],
                  [170, 1240, 110],
                ].map(([x, y, s], k) => (
                  <Onomatopoeia key={k} text="ゴ" x={x} y={y} f={f - k * 3} size={s} color="#b35cff" stroke="#14001f" shake={10} rot={-12 + k * 6} />
                ))}
              </React.Fragment>
            );
          case "gloom":
            // the classic "depressed" blue lines raining down from the top
            return (
              <React.Fragment key={i}>
                <AbsoluteFill style={{ background: `linear-gradient(180deg, rgba(40,60,140,${Math.min(0.55, f * 0.05)}) 0%, rgba(40,60,140,0) 60%)` }} />
                <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
                  {Array.from({ length: 16 }, (_, k) => (
                    <line key={k} x1={180 + k * 48} y1={0} x2={180 + k * 48} y2={Math.min(900, f * 40) * (0.6 + seeded(k) * 0.4)} stroke="rgba(30,40,110,0.75)" strokeWidth={6} />
                  ))}
                </svg>
              </React.Fragment>
            );
          case "impact":
            // a two-frame inverted flash, like an anime impact frame
            return <AbsoluteFill key={i} style={{ backdropFilter: "invert(1) grayscale(1) contrast(2.2)" }} />;
        }
        return null;
      })}
    </>
  );
};

/** Anime-style subtitles: whole lines in a fansub style (optionally with a Japanese line above). */
export const AnimeSubs: React.FC<{ lines: (Line & { jp?: string })[] }> = ({ lines }) => {
  const frame = useCurrentFrame();
  const line = lines.find((l) => frame >= l.from && frame < l.to);
  if (!line) return null;
  const sfx = line.who === "sfx";
  const fade = interpolate(frame - line.from, [0, 3], [0, 1], clamp);
  return (
    <div style={{ position: "absolute", top: 1440, left: 50, right: 50, display: "flex", flexDirection: "column", alignItems: "center", gap: 10, opacity: fade }}>
      {line.jp && (
        <div style={{ fontFamily: JP_FONT, fontWeight: 800, fontSize: sfx ? 70 : 54, color: sfx ? "#ffe27a" : line.who === "jiya" ? "#e7d2ff" : "#fff", WebkitTextStroke: "10px #000", paintOrder: "stroke fill", textAlign: "center" }}>
          {line.jp}
        </div>
      )}
      {line.text && (
        <div
          style={{
            fontFamily: '"Trebuchet MS", "Helvetica Neue", Arial, sans-serif',
            fontWeight: 700,
            fontStyle: sfx ? "italic" : "normal",
            fontSize: sfx ? 56 : 64,
            color: sfx ? "#ffe27a" : line.who === "jiya" ? "#f1e4ff" : "#fffbe8",
            WebkitTextStroke: "10px #1a1020",
            paintOrder: "stroke fill",
            textAlign: "center",
            lineHeight: 1.15,
          }}
        >
          {line.text}
        </div>
      )}
    </div>
  );
};

/**
 * Both phones side by side, labelled, playing the same game head to head. At `at` the loser's
 * screen gets GAME OVER and the winner's gets WIN, so it's always clear who beat whom.
 */
export const SplitPhones: React.FC<{ at: number; zackWins?: boolean; zackFrom: number; jiyaFrom: number; zackFloors: [number, number]; jiyaFloors: [number, number] }> = ({
  at,
  zackWins,
  zackFrom,
  jiyaFrom,
  zackFloors,
  jiyaFloors,
}) => {
  const frame = useCurrentFrame();
  const k = 0.7;
  const phone = (who: "ZACK" | "JIYA", from: number, floors: [number, number], wins: boolean, x: number) => {
    const fl = Math.round(interpolate(frame, [0, at], floors, clamp));
    const tilt = (who === "ZACK" ? -1 : 1) * (2 + Math.sin(frame * 0.12) * 0.6);
    return (
      <div style={{ position: "absolute", left: x, top: 600, width: PHONE_W * k, transform: `rotate(${tilt}deg)` }}>
        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <span
            style={{
              background: who === "ZACK" ? "#3d6fe0" : "#c7a8f2",
              color: who === "ZACK" ? "#fff" : "#2a1840",
              fontFamily: '"Arial Black", Arial, sans-serif',
              fontSize: 40,
              padding: "6px 22px",
              borderRadius: 14,
              border: "4px solid #fff",
            }}
          >
            {who}
          </span>
        </div>
        <div style={{ width: PHONE_W * k + 24, height: PHONE_H * k + 24, borderRadius: 52, background: "#16171c", boxShadow: "0 30px 70px rgba(0,0,0,0.6), inset 0 0 0 3px #3a3b42", position: "relative" }}>
          <div style={{ position: "absolute", left: 12, top: 12, width: PHONE_W * k, height: PHONE_H * k, borderRadius: 42, overflow: "hidden", background: "#000" }}>
            <div style={{ width: PHONE_W, height: PHONE_H, transform: `scale(${k})`, transformOrigin: "0 0", position: "relative" }}>
              <Screen clip="tower" from={from} rate={1.5} />
              <TowerHud floors={fl} />
              <GameOver at={at} win={wins} />
            </div>
          </div>
        </div>
      </div>
    );
  };
  return (
    <AbsoluteFill style={{ background: "#1a1420", overflow: "hidden" }}>
      <Img src={staticFile("siblings/room-bg-night.jpg")} style={{ position: "absolute", inset: -60, width: 1200, height: 2040, objectFit: "cover", filter: "blur(30px) brightness(0.7) saturate(1.1)" }} />
      {phone("ZACK", zackFrom, zackFloors, !!zackWins, 60)}
      {phone("JIYA", jiyaFrom, jiyaFloors, !zackWins, 1080 - 60 - PHONE_W * k - 24)}
      <div style={{ position: "absolute", top: 1180, left: 0, right: 0, textAlign: "center", fontFamily: '"Arial Black", Arial, sans-serif', fontSize: 70, color: "#fff", WebkitTextStroke: "10px #000", paintOrder: "stroke fill" }}>VS</div>
    </AbsoluteFill>
  );
};
