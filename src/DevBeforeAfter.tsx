import React from "react";
import { ThreeCanvas } from "@remotion/three";
import { AbsoluteFill, Audio, Img, OffthreadVideo, Sequence, interpolate, spring, staticFile, useCurrentFrame } from "remotion";
import { Box, Coin, Desk, Hourglass, MiniPlayer, Phone, QuestionMark, VoxelDev } from "./voxel/Voxel";

/**
 * Reel for developers: launching a mobile game "the normal way" (top) vs "with pixelpicked"
 * (bottom). The halves take turns: the active one plays a voxel 3D scene of the developer at
 * their laptop, then dives into the laptop to show what's on screen, while the other half
 * stays frozen in black and white.
 */

const ROUNDED = '"Arial Rounded MT Bold", "Nunito", "Helvetica Neue", sans-serif';
const FPS = 30;
const INTRO = 30;
const BUILD = 60; // both halves building the game together
const PHASE = 78; // one half's turn: 3D scene, dive, screen
const END = 90;
const SCENE_END = 24; // 3D scene alone until here
const DIVE = [18, 30] as const; // camera dives into the laptop
const SCREEN_AT = 28;

type Label = { title: string; sub: string };
const STEPS: { normal: Label; picked: Label }[] = [
  { normal: { title: "store review", sub: "days of waiting ⏳" }, picked: { title: "upload a web build", sub: "playable in any browser" } },
  { normal: { title: "lost in 2M+ apps", sub: "nobody finds it" }, picked: { title: "in the play feed", sub: "players scroll & play" } },
  { normal: { title: "~$2–3 per install", sub: "ads, just to test it" }, picked: { title: "players try it free", sub: "no download needed" } },
  { normal: { title: "why did they quit?", sub: "no idea 🤷" }, picked: { title: "session replays", sub: "see exactly where" } },
  { normal: { title: "3 downloads", sub: "(2 were mum)" }, picked: { title: "real players", sub: "real feedback 🎉" } },
];
const BUILD_LABEL: Label = { title: "6 months of work", sub: "building the game" };
const STORY_START = INTRO + BUILD;
const STORY_END = STORY_START + STEPS.length * PHASE * 2;
export const DEV_BEFORE_AFTER_DURATION = STORY_END + END;

const TOP = { y: 170, h: 860 };
const BOTTOM = { y: 1050, h: 860 };
/** Where the laptop sits within a half, so the dive zooms into it. */
const LAPTOP = { x: 240, y: 470 };

type Side = "normal" | "picked";
/** What one half shows: which step (-1 = building), how far into its turn, and whether it's live. */
type HalfState = { step: number; f: number; t: number; active: boolean };

/** Works out each half's state at a frame. A half that isn't playing holds its last frame. */
function halfState(frame: number, side: Side): HalfState {
  if (frame < STORY_START) return { step: -1, f: Math.max(0, frame - INTRO), t: frame, active: true };
  const k = Math.min(Math.floor((frame - STORY_START) / PHASE), STEPS.length * 2 - 1);
  const f = frame - STORY_START - k * PHASE;
  const turn: Side = k % 2 === 0 ? "normal" : "picked";
  const step = Math.floor(k / 2);
  if (frame >= STORY_END) return { step: STEPS.length - 1, f: PHASE - 1, t: frame, active: false };
  if (turn === side) return { step, f, t: frame, active: true };
  // Not this half's turn: hold the end of its own last turn (or the building scene before its first).
  const last = side === "normal" ? step : step - 1;
  if (last < 0) return { step: -1, f: BUILD - 1, t: STORY_START - 1, active: false };
  return { step: last, f: PHASE - 1, t: STORY_START + (last * 2 + (side === "normal" ? 0 : 1)) * PHASE + PHASE - 1, active: false };
}

const pop = (frame: number, at = 0) => spring({ frame: frame - at, fps: FPS, config: { damping: 11, stiffness: 180 } });
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** One half's 3D stage: a pastel floor, lights and an isometric camera. */
const Stage: React.FC<{ height: number; floor: string; children: React.ReactNode }> = ({ height, floor, children }) => (
  <ThreeCanvas width={1080} height={height} orthographic shadows camera={{ position: [6, 7, 12], zoom: 175, near: 0.1, far: 100 }} style={{ position: "absolute", inset: 0 }}>
    <ambientLight intensity={1.5} />
    <directionalLight position={[5, 12, 9]} intensity={2.4} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-8} shadow-camera-right={8} shadow-camera-top={8} shadow-camera-bottom={-8} />
    {/* the camera looks at the origin, so shift the set to frame it below the label card */}
    <group position={[-0.7, -1.9, 0]}>
      <Box p={[0.6, -0.15, 0.3]} s={[6.4, 0.3, 4.2]} c={floor} />
      {children}
    </group>
  </ThreeCanvas>
);

const NormalScene: React.FC<{ s: HalfState }> = ({ s }) => {
  const { step, f, t } = s;
  const appear = pop(f, 4);
  return (
    <Stage height={TOP.h} floor="#aeb7c3">
      <Desk p={[-1.0, 0, 0.35]} screen="#a9c7e8" screenGlow={0.4} />
      <VoxelDev p={[-1.0, 0, -0.55]} mood={step >= 1 ? "sad" : "focus"} t={t} typing={step <= 0} slump={step === 4 ? interpolate(f, [0, 16], [0, 1], clamp) : 0} shirt="#5d6778" />
      {step === 0 && <Hourglass p={[1.9, 1.2, 0.6]} fill={1 - f / 30} r={0} />}
      {step === 1 &&
        Array.from({ length: 18 }, (_, i) => {
          const x = ((i * 37) % 9) / 9 - 0.5, z = ((i * 53) % 7) / 7 - 0.5;
          const land = 0.25 + Math.floor(i / 6) * 0.42;
          return <Box key={i} p={[2.0 + x * 2.0, Math.max(land, 4 - (f - i * 1.2) * 0.35), 0.4 + z * 1.5]} s={[0.4, 0.4, 0.4]} c={i === 9 ? "#ff8a3d" : "#9aa3ae"} r={[0, i, 0]} />;
        })}
      {step === 2 &&
        Array.from({ length: 7 }, (_, i) => {
          const k = Math.max(0, f - i * 3);
          return <Coin key={i} p={[-0.6 + k * 0.09, 1.7 + k * 0.06, 0.4]} spin={k * 0.4} />;
        })}
      {step === 3 && <QuestionMark p={[-1.0, 3.35, -0.55]} scale={appear} />}
      {step === 4 && (
        <Phone p={[1.9, 1.1, 0.6]} scale={appear} r={[0, -0.5, 0]}>
          <Box p={[0, 0, 0.06]} s={[0.78, 1.52, 0.02]} c="#2d3440" glow={0.2} />
        </Phone>
      )}
    </Stage>
  );
};

const PickedScene: React.FC<{ s: HalfState }> = ({ s }) => {
  const { step, f, t } = s;
  const appear = pop(f, 4);
  const playerColors = ["#ff6b9a", "#7cc4ff", "#8bf0a7", "#ffd54a", "#b388ff", "#ff9f43"];
  const players = step >= 2 ? (step === 2 ? Math.min(6, Math.floor(f / 3) + 1) : 6) : 0;
  return (
    <Stage height={BOTTOM.h} floor="#ffc9a3">
      <Desk p={[-1.0, 0, 0.35]} screen="#ffb36b" screenGlow={0.7} />
      <VoxelDev p={[-1.0, 0, -0.55]} mood={step >= 0 ? "happy" : "focus"} t={t} typing={step <= 1} cheer={step === 4 ? 1 : 0} shirt="#ff7a59" />
      {step >= 0 && step <= 1 && (
        <Phone p={[1.9, 1.25, 0.5]} scale={step === 0 ? appear : 1} r={[0, -0.5, 0]}>
          <Box p={[0, 0, 0.06]} s={[0.78, 1.52, 0.02]} c={["#ff6b9a", "#7cc4ff", "#8bf0a7"][Math.floor(t / 12) % 3]} glow={0.55} />
        </Phone>
      )}
      {step === 3 && (
        <group position={[2.0, 1.5, 0.4]} scale={appear} rotation={[0, -0.5, 0]}>
          <Box s={[1.8, 1.3, 0.1]} c="#2b2f36" />
          {Array.from({ length: 24 }, (_, i) => {
            const heat = ((i * 7) % 5) / 5;
            const c = heat > 0.75 ? "#ff5252" : heat > 0.45 ? "#ffb74d" : heat > 0.2 ? "#ffee58" : "#66bb6a";
            return <Box key={i} p={[-0.68 + (i % 6) * 0.27, 0.4 - Math.floor(i / 6) * 0.27, 0.07]} s={[0.23, 0.23, 0.02]} c={c} glow={0.35} />;
          })}
        </group>
      )}
      {Array.from({ length: players }, (_, i) => {
        const angle = 0.9 + i * 0.7;
        const hop = step === 4 ? Math.abs(Math.sin((t + i * 5) * 0.3)) * 0.35 : 0;
        return <MiniPlayer key={i} p={[1.9 + Math.cos(angle) * 1.3, 0, 0.6 + Math.sin(angle) * 1.0]} c={playerColors[i]} hop={hop} />;
      })}
    </Stage>
  );
};

/** A laptop screen filling the half after the dive. */
const Screen: React.FC<{ dark?: boolean; children: React.ReactNode }> = ({ dark, children }) => (
  <div style={{ position: "absolute", left: 90, top: 290, width: 900, height: 530, borderRadius: 30, background: "#1d2129", padding: 16, boxShadow: "0 30px 60px rgba(0,0,0,0.25)" }}>
    <div style={{ width: "100%", height: "100%", borderRadius: 18, overflow: "hidden", position: "relative", background: dark ? "#14161b" : "#f6f7f9", color: dark ? "#fff" : "#1d2129" }}>{children}</div>
  </div>
);

const count = (s: number, from: number, to: number, len = 30) => Math.round(interpolate(s, [0, len], [from, to], { ...clamp, easing: (x) => 1 - (1 - x) ** 3 }));

/** What the developer sees on their screen "the normal way". */
const NormalScreen: React.FC<{ step: number; s: number }> = ({ step, s }) => {
  if (step === 0)
    return (
      <Screen>
        <div style={{ padding: 44, fontSize: 40 }}>
          <div style={{ fontSize: 30, color: "#888" }}>App Store submission</div>
          <div style={{ fontSize: 56, marginTop: 10 }}>My Game 1.0</div>
          <div style={{ display: "inline-block", marginTop: 34, padding: "14px 28px", borderRadius: 999, background: "#fff4cc", color: "#8a6a00" }}>⏳ Waiting for Review</div>
          <div style={{ marginTop: 40, fontSize: 46 }}>submitted {count(s, 1, 6, 40)} days ago…</div>
        </div>
      </Screen>
    );
  if (step === 1)
    return (
      <Screen>
        <div style={{ padding: "26px 30px 0", fontSize: 34 }}>
          <div style={{ background: "#e7e9ee", borderRadius: 14, padding: "12px 20px", color: "#666" }}>🔍 puzzle game</div>
          <div style={{ marginTop: 12, fontSize: 28, color: "#888" }}>2,000,000+ apps</div>
        </div>
        <div style={{ position: "absolute", top: 150, left: 30, right: 30, transform: `translateY(${-s * 9}px)`, display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 14 }}>
          {Array.from({ length: 96 }, (_, i) => (
            <div key={i} style={{ aspectRatio: "1", borderRadius: 18, background: i === 67 ? "#ff8a3d" : "#c9ced6", outline: i === 67 ? "5px solid #ff3d3d" : "none" }} />
          ))}
        </div>
        <div style={{ position: "absolute", right: 30, bottom: 26, padding: "10px 22px", borderRadius: 12, background: "#ff3d3d", color: "#fff", fontSize: 32, opacity: interpolate(s, [24, 30], [0, 1], clamp) }}>your game: #847 ⬆</div>
      </Screen>
    );
  if (step === 2)
    return (
      <Screen>
        <div style={{ padding: 44 }}>
          <div style={{ fontSize: 30, color: "#888" }}>Ad campaign</div>
          <div style={{ display: "flex", gap: 30, marginTop: 24 }}>
            {[
              ["spent", `$${count(s, 0, 500)}`],
              ["installs", `${count(s, 0, 174)}`],
              ["cost per install", "$2.87"],
            ].map(([k, v], i) => (
              <div key={k} style={{ flex: 1, background: "#fff", borderRadius: 18, padding: 22, boxShadow: "0 4px 14px rgba(0,0,0,0.06)" }}>
                <div style={{ fontSize: 26, color: "#888" }}>{k}</div>
                <div style={{ fontSize: 62, color: i === 2 ? "#e0453b" : "#1d2129", marginTop: 6 }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 40, fontSize: 40 }}>💸 and you still don't know if it's fun</div>
        </div>
      </Screen>
    );
  if (step === 3) {
    const pts = [100, 34, 20, 13, 9, 6, 4];
    return (
      <Screen>
        <div style={{ padding: 40 }}>
          <div style={{ fontSize: 30, color: "#888" }}>players still playing</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 26, height: 300, marginTop: 30 }}>
            {pts.map((v, i) => (
              <div key={i} style={{ flex: 1, textAlign: "center" }}>
                <div style={{ height: v * 2.8 * interpolate(s, [i * 2, i * 2 + 10], [0, 1], clamp), background: "#9aa8ba", borderRadius: 10 }} />
                <div style={{ fontSize: 26, color: "#888", marginTop: 8 }}>day {i + 1}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ position: "absolute", right: 70, top: 70, fontSize: 200, color: "#e0453b", transform: `scale(${pop(s, 18)})` }}>?</div>
      </Screen>
    );
  }
  return (
    <Screen>
      <div style={{ padding: 44, display: "flex", gap: 36 }}>
        <div style={{ width: 170, height: 170, borderRadius: 38, background: "#ff8a3d" }} />
        <div>
          <div style={{ fontSize: 56 }}>My Game</div>
          <div style={{ fontSize: 40, color: "#888", marginTop: 8 }}>downloads</div>
          <div style={{ fontSize: 110, lineHeight: 1 }}>{count(s, 0, 3, 20)}</div>
        </div>
      </div>
      <div style={{ margin: "0 44px", padding: 24, borderRadius: 18, background: "#fff", fontSize: 36, opacity: interpolate(s, [20, 28], [0, 1], clamp) }}>
        ★★★★★ "so proud of you sweetie" <span style={{ color: "#888" }}>— mum</span>
      </div>
    </Screen>
  );
};

/** What the developer sees on PixelPicked. */
const PickedScreen: React.FC<{ step: number; s: number }> = ({ step, s }) => {
  const header = (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "20px 28px", borderBottom: "1px solid #2a2e36" }}>
      <Img src={staticFile("logo.svg")} style={{ width: 44, height: 44 }} />
      <div style={{ fontSize: 32 }}>pixelpicked</div>
    </div>
  );
  if (step === 0) {
    const progress = interpolate(s, [4, 26], [0, 1], clamp);
    return (
      <Screen dark>
        {header}
        <div style={{ padding: 40 }}>
          <div style={{ border: "3px dashed #4a5060", borderRadius: 20, padding: 36, textAlign: "center", fontSize: 40 }}>📦 my-game-web-build.zip</div>
          <div style={{ marginTop: 30, height: 20, borderRadius: 10, background: "#2a2e36" }}>
            <div style={{ width: `${progress * 100}%`, height: "100%", borderRadius: 10, background: "#ff7a59" }} />
          </div>
          <div style={{ marginTop: 30, fontSize: 46, color: "#8bf0a7", opacity: progress >= 1 ? 1 : 0 }}>✓ playable in any browser</div>
        </div>
      </Screen>
    );
  }
  if (step === 1 || step === 2)
    return (
      <Screen dark>
        {header}
        <div style={{ position: "absolute", top: 90, bottom: 0, left: 0, right: 0, display: "flex", justifyContent: "center", alignItems: "center", gap: 40 }}>
          <div style={{ width: 210, height: 440, borderRadius: 28, overflow: "hidden", border: "6px solid #000", background: "#000" }}>
            <OffthreadVideo src={staticFile(step === 1 ? "clips/play-bullseye-archer.mp4" : "clips/play-tower-building.mp4")} trimBefore={60} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
          {step === 1 ? (
            <div style={{ fontSize: 44, lineHeight: 1.3 }}>
              swipe ↑<br />play instantly<br />
              <span style={{ color: "#ff9f6e" }}>no install</span>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 70px)", gap: 16 }}>
              {Array.from({ length: 9 }, (_, i) => (
                <div key={i} style={{ width: 70, height: 70, borderRadius: 35, background: ["#ff6b9a", "#7cc4ff", "#8bf0a7", "#ffd54a", "#b388ff", "#ff9f43"][i % 6], transform: `scale(${pop(s, i * 2)})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30 }}>
                  ▶
                </div>
              ))}
              <div style={{ gridColumn: "span 3", fontSize: 34, marginTop: 6 }}>players trying it now</div>
            </div>
          )}
        </div>
      </Screen>
    );
  if (step === 3) {
    const head = interpolate(s, [0, 40], [0.1, 0.72], clamp);
    return (
      <Screen dark>
        {header}
        <div style={{ position: "absolute", top: 100, left: 40, right: 40, bottom: 30, display: "flex", gap: 36 }}>
          <div style={{ width: 200, height: 390, borderRadius: 24, overflow: "hidden", border: "5px solid #000", position: "relative" }}>
            <OffthreadVideo src={staticFile("clips/play-void-loop.mp4")} trimBefore={100} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            {[[60, 210], [120, 250], [90, 300], [140, 160]].map(([x, y], i) => (
              <div key={i} style={{ position: "absolute", left: x - 26, top: y - 26, width: 52, height: 52, borderRadius: 26, background: "radial-gradient(circle, rgba(255,60,60,0.85), rgba(255,180,0,0))", opacity: interpolate(s, [i * 4, i * 4 + 6], [0, 1], clamp) }} />
            ))}
          </div>
          <div style={{ flex: 1, fontSize: 36 }}>
            <div style={{ fontSize: 30, color: "#9aa3ae" }}>session replay</div>
            <div style={{ marginTop: 24, height: 14, borderRadius: 7, background: "#2a2e36", position: "relative" }}>
              <div style={{ width: `${head * 100}%`, height: "100%", borderRadius: 7, background: "#ff7a59" }} />
              <div style={{ position: "absolute", left: "72%", top: -46, fontSize: 30 }}>⚠️</div>
            </div>
            <div style={{ marginTop: 40, lineHeight: 1.35, opacity: interpolate(s, [26, 34], [0, 1], clamp) }}>
              players quit at <span style={{ color: "#ff9f6e" }}>level 3</span>
              <br />now you know what to fix
            </div>
          </div>
        </div>
      </Screen>
    );
  }
  const notes = ["loved the wind mechanic 🔥", "level 3 is too hard 😭", "followed your devlog!", "when's the full release?"];
  return (
    <Screen dark>
      {header}
      <div style={{ padding: "26px 36px", display: "flex", flexDirection: "column", gap: 16 }}>
        {notes.map((n, i) => (
          <div key={n} style={{ alignSelf: i % 2 ? "flex-end" : "flex-start", padding: "16px 26px", borderRadius: 22, background: "#262a33", fontSize: 36, transform: `scale(${pop(s, i * 6)})`, transformOrigin: i % 2 ? "right" : "left" }}>
            💬 {n}
          </div>
        ))}
      </div>
    </Screen>
  );
};

/** A label card in a half's top-left corner, like the explainer cards: bold title, small subtitle. */
const LabelCard: React.FC<{ label: Label; tone: "grey" | "warm"; f: number }> = ({ label, tone, f }) => {
  const s = pop(f, 3);
  return (
    <div style={{ position: "absolute", left: 48, top: 110, padding: "20px 30px", borderRadius: 26, background: "#fff", boxShadow: "0 12px 30px rgba(0,0,0,0.12)", transform: `scale(${0.6 + s * 0.4})`, transformOrigin: "left top", opacity: s, zIndex: 2 }}>
      <div style={{ fontSize: 58, color: tone === "grey" ? "#566173" : "#ff6a3d", lineHeight: 1.05 }}>{label.title}</div>
      <div style={{ fontSize: 36, color: "#1d2129", marginTop: 6 }}>{label.sub}</div>
    </div>
  );
};

const HalfTag: React.FC<{ text: string; dark: boolean }> = ({ text, dark }) => (
  <div style={{ position: "absolute", left: 48, top: 30, padding: "10px 26px", borderRadius: 999, background: dark ? "#3c4452" : "#1d2129", color: "#fff", fontSize: 40, zIndex: 2 }}>{text}</div>
);

/** One half: the 3D scene, the dive into the laptop, the screen, its label, and black & white when paused. */
const Half: React.FC<{ side: Side; state: HalfState; box: { y: number; h: number } }> = ({ side, state, box }) => {
  const { step, f, active } = state;
  const building = step < 0;
  const dive = building ? 0 : interpolate(f, [DIVE[0], DIVE[1]], [0, 1], clamp);
  const screenIn = building ? 0 : interpolate(f, [SCREEN_AT - 4, SCREEN_AT + 4], [0, 1], clamp);
  const label = building ? BUILD_LABEL : side === "normal" ? STEPS[step].normal : STEPS[step].picked;
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: box.y,
        width: 1080,
        height: box.h,
        overflow: "hidden",
        background: side === "normal" ? "linear-gradient(180deg, #e8ebef, #cfd5dd)" : "linear-gradient(180deg, #fff6ec, #ffd9c2)",
        filter: active ? "none" : "grayscale(1) brightness(0.92)",
      }}
    >
      {dive < 1 && (
        <div style={{ position: "absolute", inset: 0, transform: `scale(${1 + dive * 1.8})`, transformOrigin: `${LAPTOP.x}px ${LAPTOP.y}px`, opacity: 1 - dive }}>
          {side === "normal" ? <NormalScene s={state} /> : <PickedScene s={state} />}
        </div>
      )}
      {screenIn > 0 && (
        <div style={{ position: "absolute", inset: 0, opacity: screenIn, transform: `scale(${0.4 + screenIn * 0.6})`, transformOrigin: `${LAPTOP.x}px ${LAPTOP.y}px` }}>
          {side === "normal" ? <NormalScreen step={step} s={f - SCREEN_AT} /> : <PickedScreen step={step} s={f - SCREEN_AT} />}
        </div>
      )}
      <HalfTag text={side === "normal" ? "the normal way 😩" : "with pixelpicked 😎"} dark={side === "normal"} />
      <LabelCard key={`${step}`} label={label} tone={side === "normal" ? "grey" : "warm"} f={f} />
      {!active && !building && <div style={{ position: "absolute", right: 40, top: 34, fontSize: 40, color: "#fff", zIndex: 2 }}>⏸</div>}
    </div>
  );
};

const EndCard: React.FC = () => {
  const frame = useCurrentFrame();
  const s = pop(frame);
  const s2 = pop(frame, 10);
  return (
    <AbsoluteFill style={{ background: "linear-gradient(180deg, #fff6ec, #ffe0cc)", alignItems: "center", justifyContent: "center", textAlign: "center", opacity: interpolate(frame, [0, 8], [0, 1], clamp) }}>
      <Img src={staticFile("logo.svg")} style={{ width: 170, height: 170, transform: `scale(${s})` }} />
      <div style={{ fontSize: 96, color: "#1d2129", marginTop: 40, letterSpacing: -2, transform: `scale(${0.7 + s * 0.3})` }}>submit your game free</div>
      <div style={{ marginTop: 40, padding: "18px 44px", borderRadius: 999, background: "#1d2129", color: "#fff", fontSize: 56, opacity: s2 }}>pixelpicked.com</div>
    </AbsoluteFill>
  );
};

export const DevBeforeAfter: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "#f4f1ec", fontFamily: ROUNDED }}>
      <Audio src={staticFile("audio/cute/music-cosy-quirky.mp3")} trimBefore={30} volume={0.5} />
      {Array.from({ length: STEPS.length * 2 }, (_, k) => (
        <React.Fragment key={k}>
          <Sequence from={STORY_START + k * PHASE + 3} durationInFrames={30}>
            <Audio src={staticFile("audio/pop.mp3")} volume={0.35} />
          </Sequence>
          <Sequence from={STORY_START + k * PHASE + DIVE[0]} durationInFrames={30}>
            <Audio src={staticFile("audio/whoosh.mp3")} volume={0.25} />
          </Sequence>
        </React.Fragment>
      ))}
      <div style={{ position: "absolute", top: 40, left: 0, right: 0, textAlign: "center", fontSize: 66, color: "#1d2129", letterSpacing: -1 }}>launching a mobile game 🎮</div>
      <Half side="normal" state={halfState(frame, "normal")} box={TOP} />
      <Half side="picked" state={halfState(frame, "picked")} box={BOTTOM} />
      <Sequence from={STORY_END}>
        <EndCard />
      </Sequence>
    </AbsoluteFill>
  );
};
