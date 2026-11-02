import React, { useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, Freeze, Sequence, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { track } from "../siblings/Cast";
import { EXPR, Pose } from "../siblings/Chibi";
import { Lights, RBox, Room, canvasTexture, useTexture } from "../siblings/Room";
import { Cam, Stage, lerpCam, orbit } from "../siblings/Stage";
import { GAMES } from "../timeline";
import { useClipFrame } from "./clip";
import { FEED, LONELY, LonelyGame, RecordingUI, Sticker, drawChartIcon, drawCode, drawFlop, drawPixelGame, drawStore, roundRect, useLiveCanvas } from "./Scenes";
import { BOTH_OPEN, Captions, Chunk, Founder, FounderStyle, FounderStyleCtx, GESTURE, HANDS_DOWN, PaperTitle, StudioSet } from "./Studio";
import { SCRIPT, Shot, TITLE, VOICE, YOUTUBE_ENDING } from "./script";
import voiceWords from "./data/voice-words.json";
import voiceMouth from "./data/voice-mouth.json";
import { FounderSound } from "./Sound";

/**
 * The founder story reel as one take: he stays in the middle at his desk and the set changes
 * around him as he talks, like a stage changing scenery mid-sentence. The studio sinks into the
 * floor and his childhood bedroom rises in its place; a giant phone rises behind him and turns
 * into a monitor, the top charts, the feed; towers of burning cash burst up round him; the lights
 * drop to one spotlight for the low point. Everything is placed from the script's timing.
 */

type Vec3 = [number, number, number];

const FPS = 30;
const sec = (s: number) => Math.round(s * FPS);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
/** How long a set change takes. */
const CHANGE = 16;

// ── timing ───────────────────────────────────────────────────────────────────

/** How long a caption chunk stays up when there's no voice to follow: long enough to read. */
const readTime = (text: string) => Math.max(0.45, 0.28 + 0.2 * text.split(/\s+/).length);
const END_HOLD = 0.8;

/** The voice take's words with their start and end times, from transcribing it. */
const WORDS = (voiceWords as [number, number, string][]).map(([start, end, word]) => ({ start, end, word: norm(word) }));
function norm(w: string) {
  return w.toLowerCase().replace(/[^a-z0-9']/g, "");
}

/**
 * When each caption chunk starts. With a voice take, each chunk starts on the spoken word it
 * begins with, found by walking the transcript in order; without one (or if a chunk isn't in the
 * take), chunks follow on at reading pace.
 */
const chunkStarts = (): number[] => {
  const texts = SCRIPT.flatMap((b) => b.say);
  const out: number[] = [];
  let w = 0;
  let t = 0;
  for (const text of texts) {
    const first = norm(text.replace(/\*/g, "").split(/\s+/)[0]);
    const hit = WORDS.findIndex((x, i) => i >= w && i < w + 6 && x.word === first);
    if (VOICE && hit >= 0) {
      t = Math.max(t, WORDS[hit].start - 0.05);
      w = hit + text.split(/\s+/).length;
    }
    out.push(t);
    t += VOICE ? 0.3 : readTime(text);
  }
  return out;
};

const TIMELINE = (() => {
  const starts = chunkStarts();
  const end = VOICE ? WORDS[WORDS.length - 1].end + END_HOLD : starts[starts.length - 1] + readTime(SCRIPT[SCRIPT.length - 1].say.slice(-1)[0]) + END_HOLD;
  const chunks: Chunk[] = [];
  let n = 0;
  const first = SCRIPT.map((b) => {
    const s = starts[n];
    n += b.say.length;
    return s;
  });
  n = 0;
  const beats = SCRIPT.map((beat, i) => {
    const start = i === 0 ? 0 : first[i];
    const stop = i + 1 < SCRIPT.length ? first[i + 1] : end;
    const marks: number[] = [];
    for (const text of beat.say) {
      const at = i === 0 && n === 0 ? 0 : starts[n];
      chunks.push({ at, text });
      marks.push(sec(at) - sec(start));
      n++;
    }
    return { ...beat, from: sec(start), len: sec(stop) - sec(start), marks };
  });
  return { beats, chunks, duration: sec(end) };
})();

export const FOUNDER_TRIAL_DURATION = TIMELINE.duration;

const BEATS = TIMELINE.beats;
const beatOf = (shot: Shot) => BEATS.find((b) => b.shot === shot);
/** The reel frame where chunk `i` of a beat starts, or -1 if the beat isn't in the script. */
const cue = (shot: Shot, i = 0) => {
  const b = beatOf(shot);
  return b ? b.from + (b.marks[Math.min(i, b.marks.length - 1)] ?? 0) : -1;
};
const lastCue = (shot: Shot) => cue(shot, (beatOf(shot)?.marks.length ?? 1) - 1);

/** A set piece's presence over the reel (0 gone, 1 in place), easing over each set change. */
const presence = (on: (shot: Shot) => number): [number, number][] => {
  const keys: [number, number][] = [];
  let prev = on(BEATS[0].shot);
  for (const b of BEATS) {
    const v = on(b.shot);
    keys.push([b.from, prev], [b.from + CHANGE, v]);
    prev = v;
  }
  return keys;
};

const ROOM = presence((s) => (["childhood", "flashback", "close", "fire", "lonely"].includes(s) ? 0 : 1));
const BEDROOM = presence((s) => (s === "childhood" ? 1 : 0));
const SCREEN = presence((s) => (["hook", "punch", "flashback", "store", "feed"].includes(s) ? 1 : 0));
const LAND = presence((s) => (s === "flashback" ? 1 : 0));
const MONEY = presence((s) => (s === "fire" || s === "lonely" ? 1 : 0));
const END = presence((s) => (s === "end" ? 1 : 0));
/** How dark the room is: dim for the late-night coding, out for "nothing" and the spotlight. */
const DIM: [number, number][] = (() => {
  const keys = presence((s) => (s === "flashback" ? 0.45 : s === "close" ? 1 : 0));
  const nothing = lastCue("flashback");
  if (nothing >= 0) keys.push([nothing, 0.45], [nothing + 8, 1]);
  return keys.sort((a, b) => a[0] - b[0]);
})();

/** What the giant screen shows at a frame: what its set asks for, or what it last showed on its way down. */
type ScreenMode = "feed" | "glitch" | "code" | "flop" | "store";
const SCREEN_SETS: Shot[] = ["hook", "punch", "flashback", "store", "feed"];
const screenMode = (f: number): ScreenMode => {
  const b = [...BEATS].reverse().find((x) => x.from <= f && SCREEN_SETS.includes(x.shot)) ?? BEATS[0];
  if (b.shot === "punch") return f >= lastCue("punch") ? "glitch" : "feed";
  if (b.shot === "flashback") return f >= lastCue("flashback") ? "flop" : "code";
  if (b.shot === "store") return "store";
  return "feed";
};

/** When the feed swipes to the next game: steadily under the hook, on the beats of the feed. */
const SWIPE = 12;
const SWIPES: number[] = (() => {
  const out: number[] = [];
  const hook = beatOf("hook");
  if (hook) for (let t = hook.from + 6; t < hook.from + hook.len + 10; t += 20) out.push(t);
  const feed = beatOf("feed");
  if (feed) for (const i of [3, 5, 7]) if (i < feed.marks.length) out.push(cue("feed", i));
  return out;
})();

// ── the camera ───────────────────────────────────────────────────────────────

type Framing = { t: Vec3; d: number; yaw: number; rise: number; fov: number };
const FRAMING: Record<Shot, Framing> = {
  hook: { t: [0.22, 1.6, -0.7], d: 7.0, yaw: 0.1, rise: 0.6, fov: 38 },
  punch: { t: [0.05, 1.45, -0.1], d: 4.3, yaw: 0.16, rise: 0.45, fov: 32 },
  childhood: { t: [0.1, 1.5, -1.2], d: 8.5, yaw: -0.06, rise: 0.8, fov: 46 },
  flashback: { t: [0.2, 1.65, -0.7], d: 6.4, yaw: 0.05, rise: 0.5, fov: 36 },
  close: { t: [0, 1.45, 0.05], d: 4.1, yaw: 0.08, rise: 0.3, fov: 30 },
  store: { t: [0.22, 1.65, -0.6], d: 6.8, yaw: 0.06, rise: 0.5, fov: 37 },
  fire: { t: [0, 1.6, -0.8], d: 8.5, yaw: 0.1, rise: 1.0, fov: 40 },
  lonely: { t: [0, 1.6, -0.8], d: 8.5, yaw: 0.1, rise: 1.0, fov: 40 },
  feed: { t: [0.1, 1.65, -0.6], d: 6.8, yaw: -0.05, rise: 0.5, fov: 37 },
  end: { t: [0, 1.75, -0.8], d: 7.0, yaw: 0.0, rise: 0.6, fov: 38 },
  selfie: { t: [0, 1.75, -0.8], d: 7.0, yaw: 0.0, rise: 0.6, fov: 38 },
};
const mix = (a: Framing, b: Framing, k: number): Framing => ({
  t: [a.t[0] + (b.t[0] - a.t[0]) * k, a.t[1] + (b.t[1] - a.t[1]) * k, a.t[2] + (b.t[2] - a.t[2]) * k],
  d: a.d + (b.d - a.d) * k,
  yaw: a.yaw + (b.yaw - a.yaw) * k,
  rise: a.rise + (b.rise - a.rise) * k,
  fov: a.fov + (b.fov - a.fov) * k,
});
/** Each set's framing, with a slow push in across it. */
const framingIn = (i: number, f: number): Framing => {
  const b = BEATS[i];
  const base = FRAMING[b.shot];
  const p = Math.min(1, Math.max(0, (f - b.from) / b.len));
  // the hook pushes in hard so the very first frame is already moving
  return { ...base, d: base.d * (1 - (b.shot === "hook" ? 0.16 : 0.06) * p) };
};
/**
 * The ending: he grabs the camera and walks off round the studio filming himself. The camera
 * swings in to arm's length in front of his face, then travels with him, handheld.
 */
/** How far to his side the phone is held. */
const SELFIE_SIDE = 0.3;
const selfieAt = (f: number) => {
  const b = beatOf("selfie");
  if (!b || f < b.from) return null;
  const t = f - b.from;
  const walk = interpolate(t, [10, b.len], [0, 1], clamp);
  const turn = ease(interpolate(t, [0, 14], [0, 1], clamp));
  const rotY = 0.12 + (-Math.PI / 2 + 0.35 - 0.12) * turn;
  const pos: Vec3 = [-1.7 * walk, 0, -0.2];
  const fwd: Vec3 = [Math.sin(rotY), 0, Math.cos(rotY)];
  const side: Vec3 = [Math.cos(rotY), 0, -Math.sin(rotY)];
  const head: Vec3 = [pos[0], 1.48, pos[2]];
  const phase = Math.max(0, t - 10) * 0.32;
  const step = Math.abs(Math.sin(phase)) * 0.025 * (walk > 0 && walk < 1 ? 1 : 0);
  const wob = (a: number, c: number) => Math.sin(f * a + c) * 0.007 + Math.sin(f * a * 2.7 + c) * 0.004;
  const selfieCam: Cam = {
    // the phone in his outstretched hand: a little above his eyes and off to his side, wide lens
    pos: [head[0] + fwd[0] * 1.25 + side[0] * SELFIE_SIDE + wob(0.13, 0), head[1] + 0.18 + step + wob(0.11, 2), head[2] + fwd[2] * 1.25 + side[2] * SELFIE_SIDE + wob(0.09, 4)],
    look: [head[0] + side[0] * 0.08, head[1] - 0.08 + step * 0.5, head[2] + side[2] * 0.08],
    fov: 72,
  };
  // the grab: from where the camera was to arm's length
  const prev = BEATS[BEATS.indexOf(b) - 1];
  const before = prev ? orbit(FRAMING[prev.shot].t, FRAMING[prev.shot].d * 0.94, FRAMING[prev.shot].yaw, FRAMING[prev.shot].rise, FRAMING[prev.shot].fov) : selfieCam;
  const cam = lerpCam(before, selfieCam, ease(interpolate(t, [0, 12], [0, 1], clamp)));
  const moving = walk > 0 && walk < 1 ? 1 : 0;
  const legs: Partial<Pose> = {
    hipL: Math.sin(phase) * 0.45 * moving,
    hipR: -Math.sin(phase) * 0.45 * moving,
    kneeL: Math.max(0, Math.sin(phase + 1.2)) * 0.6 * moving,
    kneeR: Math.max(0, -Math.sin(phase + 1.2)) * 0.6 * moving,
    bounce: step,
    armLx: 0.2 - Math.sin(phase) * 0.3 * moving,
  };
  return { cam, pos, rotY, legs };
};

const ON_LONELY = orbit([LONELY[0], LONELY[1] + 0.05, LONELY[2]], 0.7, 0.2, 0.15, 30);
const cameraAt = (f: number): Cam => {
  const self = selfieAt(f);
  if (self) return self.cam;
  let i = BEATS.findIndex((b) => f < b.from + b.len);
  if (i < 0) i = BEATS.length - 1;
  const b = BEATS[i];
  let fr = framingIn(i, f);
  if (i > 0) fr = mix(framingIn(i - 1, b.from), fr, ease(Math.min(1, (f - b.from) / (CHANGE + 6))));
  const cam = orbit(fr.t, fr.d, fr.yaw, fr.rise, fr.fov);
  // the lonely game: drift down to it on the desk by "never heard of", hold, then back out after
  if (b.shot === "lonely") return lerpCam(cam, ON_LONELY, ease(interpolate(f, [b.from + 4, cue("lonely", 2) + 10], [0, 1], clamp)));
  if (i > 0 && BEATS[i - 1].shot === "lonely" && f < b.from + CHANGE + 6) return lerpCam(ON_LONELY, cam, ease((f - b.from) / (CHANGE + 6)));
  return cam;
};

// ── the founder ──────────────────────────────────────────────────────────────

type Held = { arms: Partial<Pose>; face?: Partial<Pose>; lean?: number; look?: Partial<Pose> };
const POSES: Record<Shot, Held> = {
  hook: { arms: GESTURE, face: { smile: 0.45, browRaise: 0.45 } },
  punch: { arms: HANDS_DOWN, face: { smile: 0.15, browRaise: 0.2 }, lean: 0.08 },
  childhood: { arms: BOTH_OPEN, face: { smile: 0.6, browRaise: 0.5 } },
  flashback: { arms: HANDS_DOWN, face: { smile: 0.35 } },
  close: { arms: HANDS_DOWN, face: { ...EXPR.plead, mouthOpen: 0 }, lean: 0.1 },
  store: { arms: GESTURE, face: { browRaise: 0.4, smile: 0.2 } },
  fire: { arms: BOTH_OPEN, face: { ...EXPR.unimpressed, mouthOpen: 0 } },
  lonely: { arms: HANDS_DOWN, face: { smile: 0.1 }, look: { headPitch: 0.25, lookY: -0.5 } },
  feed: { arms: GESTURE, face: { smile: 0.55, browRaise: 0.4 } },
  end: { arms: BOTH_OPEN, face: { smile: 0.65, browRaise: 0.35 } },
  selfie: { arms: { ...BOTH_OPEN, armRx: 1.75, armRz: 0.18, elbowR: 0.05, reachR: 1.3, gripR: 0.9, armLx: 0.2, elbowL: 0.4, armLz: 0.1 }, face: { smile: 0.7, browRaise: 0.4 } },
};
const blendPose = (a: Partial<Pose>, b: Partial<Pose>, k: number): Partial<Pose> => {
  const out: Partial<Pose> = {};
  for (const key of [...new Set([...Object.keys(a), ...Object.keys(b)])] as (keyof Pose)[]) {
    const x = a[key] ?? b[key] ?? 0;
    const y = b[key] ?? a[key] ?? 0;
    out[key] = x + (y - x) * k;
  }
  return out;
};
/** His pose at a frame, easing from one set's to the next over a few frames. */
const poseAt = (f: number): Held => {
  let i = BEATS.findIndex((b) => f < b.from + b.len);
  if (i < 0) i = BEATS.length - 1;
  const cur = POSES[BEATS[i].shot];
  if (i === 0) return cur;
  const prev = POSES[BEATS[i - 1].shot];
  const k = ease(Math.min(1, (f - BEATS[i].from) / 12));
  return {
    arms: blendPose(prev.arms, cur.arms, k),
    face: blendPose(prev.face ?? {}, cur.face ?? {}, k),
    lean: (prev.lean ?? 0) + ((cur.lean ?? 0) - (prev.lean ?? 0)) * k,
    look: blendPose(prev.look ?? {}, cur.look ?? {}, k),
  };
};

// ── the giant screen ─────────────────────────────────────────────────────────

const PORTRAIT = { w: 1.05, h: 2.27, p: [0.62, 1.6, -1.2] as Vec3 };
const LANDSCAPE = { w: 2.0, h: 1.2, p: [0.35, 1.8, -1.2] as Vec3 };

/** Slices of the frame knocked sideways and tinted, fading to black: the feed dying. */
function glitch(g: CanvasRenderingContext2D, f: number, k: number) {
  const W = 390;
  const H = 844;
  const img = g.getImageData(0, 0, W, H);
  g.fillStyle = "#000";
  g.fillRect(0, 0, W, H);
  for (let y = 0; y < H; y += 22) {
    const shift = Math.sin(y * 0.37 + f * 2.1) * 60 * k * (Math.sin(f * 0.9 + y) > 0.2 ? 1 : 0.1);
    g.putImageData(img, shift, 0, 0, y, W, 22);
  }
  g.fillStyle = `rgba(255,0,80,${0.25 * k})`;
  g.fillRect(0, (f * 37) % H, W, 30);
  g.fillStyle = `rgba(0,0,0,${Math.min(1, k * 1.3)})`;
  g.fillRect(0, 0, W, H);
}

/** A huge phone behind him that rises from the floor, turns into a monitor and back. */
const GiantScreen: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const k = track(f, SCREEN);
  const land = track(f, LAND);
  const mode = screenMode(f);
  // the feed: which game is up, and the swipe in progress
  const n = FEED.length;
  const passed = SWIPES.filter((s) => f >= s + SWIPE).length;
  const moving = SWIPES.find((s) => f >= s && f < s + SWIPE);
  const p = moving === undefined ? 0 : ease((f - moving) / SWIPE);
  // only the games on screen move on; the rest hold their first frame
  const at = (i: number) => FEED[i][1] + (i === passed % n || (moving !== undefined && i === (passed + 1) % n) ? f / fps : 0);
  const frames = [useClipFrame(FEED[0][0], at(0)), useClipFrame(FEED[1][0], at(1)), useClipFrame(FEED[2][0], at(2)), useClipFrame(FEED[3][0], at(3))];
  const portrait = useLiveCanvas(390, 844);
  const landscape = useLiveCanvas(1000, 600);
  const g = portrait.g;
  if (mode === "feed" || mode === "glitch") {
    g.fillStyle = "#000";
    g.fillRect(0, 0, 390, 844);
    const draw = (i: number, y: number) => {
      const img = frames[i % n]?.image as CanvasImageSource | undefined;
      if (img) g.drawImage(img, 0, y, 390, 844);
    };
    draw(passed, -p * 844);
    if (moving !== undefined) draw(passed + 1, 844 - p * 844);
    const feed = beatOf("feed");
    const learns = feed ? cue("feed", 5) : -1;
    if (feed && learns >= 0 && f >= learns && f < feed.from + feed.len) {
      g.globalAlpha = interpolate(f - learns, [0, 6], [0, 1], clamp);
      g.fillStyle = "rgba(20,20,28,0.8)";
      roundRect(g, 115, 96, 160, 38, 19);
      g.fill();
      g.fillStyle = "#ffd84a";
      g.font = "700 17px Helvetica, Arial, sans-serif";
      g.textAlign = "center";
      g.fillText("✦ for you", 195, 121);
      g.textAlign = "left";
      g.globalAlpha = 1;
    }
    if (mode === "glitch") glitch(g, f, interpolate(f - lastCue("punch"), [0, 22], [0.1, 1], clamp));
  } else if (mode === "store") {
    const b = beatOf("store")!;
    drawStore(g, ease(interpolate(f, [b.from, b.from + b.len], [0, 1], clamp)) * 50);
  }
  portrait.tex.needsUpdate = true;
  if (mode === "code") drawCode(landscape.g, f);
  else if (mode === "flop") drawFlop(landscape.g, interpolate(f - lastCue("flashback"), [0, 30], [0, 1], clamp));
  landscape.tex.needsUpdate = true;
  if (k < 0.005) return null;
  const w = PORTRAIT.w + (LANDSCAPE.w - PORTRAIT.w) * land;
  const h = PORTRAIT.h + (LANDSCAPE.h - PORTRAIT.h) * land;
  const pos: Vec3 = [
    PORTRAIT.p[0] + (LANDSCAPE.p[0] - PORTRAIT.p[0]) * land,
    PORTRAIT.p[1] + (LANDSCAPE.p[1] - PORTRAIT.p[1]) * land - (1 - k) * 3.8,
    PORTRAIT.p[2] + (LANDSCAPE.p[2] - PORTRAIT.p[2]) * land,
  ];
  const showLand = mode === "code" || mode === "flop";
  return (
    <group position={pos} rotation={[0, -0.22 + 0.12 * land, 0]}>
      <RBox s={[w + 0.08, h + 0.08, 0.07]} c="#0c0c10" r={0.1 - 0.06 * land} rough={0.3} />
      <mesh position={[0, 0, 0.036]}>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial map={showLand ? landscape.tex : portrait.tex} toneMapped={false} />
      </mesh>
      {/* the screen lights him and the room */}
      <pointLight position={[0, 0, 0.6]} intensity={(showLand ? 2 : 3) * k} distance={3} decay={1.6} color={mode === "flop" ? "#ffd9d9" : "#9fb8ff"} />
    </group>
  );
};

// ── the childhood bedroom ────────────────────────────────────────────────────

/** His childhood bedroom, rising from the floor round him, the pixel game on the monitor. */
const Bedroom: React.FC = () => {
  const f = useCurrentFrame();
  const k = track(f, BEDROOM);
  const { g, tex } = useLiveCanvas(512, 288);
  drawPixelGame(g, f);
  tex.needsUpdate = true;
  if (k < 0.005) return null;
  return (
    <group position={[0, -(1 - k) * 6.5 + 0.003, 0]}>
      <Room monitor={tex} night />
      {k > 0.5 && <Lights mood="night" phoneGlow={null} />}
      <pointLight position={[1.7, 1.2, -2.2]} intensity={2.5 * k} distance={2.5} decay={1.6} color="#9cc0ff" />
    </group>
  );
};

// ── confetti for "so excited" ────────────────────────────────────────────────

const CONFETTI_COLORS = ["#ff5fd2", "#ffd84a", "#4fd8ff", "#7cff8a", "#ff8a3d", "#ffffff"];
const Confetti: React.FC = () => {
  const f = useCurrentFrame();
  const start = beatOf("flashback") ? cue("flashback", 2) : -1;
  const end = beatOf("close") ? beatOf("close")!.from + 10 : start + 120;
  const pieces = useMemo(
    () =>
      Array.from({ length: 80 }, (_, i) => {
        const r = (m: number) => {
          const x = Math.sin(i * 127.1 + m * 311.7) * 43758.5453;
          return x - Math.floor(x);
        };
        return { x: (r(1) - 0.5) * 1.2, vx: (r(2) - 0.5) * 2.4, vy: 3 + r(3) * 2, vz: (r(4) - 0.2) * 1.2, spin: r(5) * 10, c: CONFETTI_COLORS[i % CONFETTI_COLORS.length] };
      }),
    [],
  );
  if (start < 0 || f < start || f > end) return null;
  const t = (f - start) / FPS;
  const drag = (1 - Math.exp(-t * 1.5)) / 1.5;
  return (
    <>
      {pieces.map((p, i) => (
        <mesh key={i} position={[p.x + p.vx * drag, Math.max(0.02, 1.05 + p.vy * t - 4.5 * t * t), 0.5 + p.vz * drag]} rotation={[p.spin * t, p.spin * t * 0.7, 0]}>
          <planeGeometry args={[0.05, 0.03]} />
          <meshStandardMaterial color={p.c} side={THREE.DoubleSide} emissive={p.c} emissiveIntensity={0.3} />
        </mesh>
      ))}
    </>
  );
};

// ── burning money ────────────────────────────────────────────────────────────

const TOWERS: { p: [number, number]; h: number; icon: number }[] = [
  { p: [-1.3, -0.45], h: 1.5, icon: 0 },
  { p: [1.35, -0.35], h: 1.85, icon: 1 },
  { p: [-0.8, -1.5], h: 2.2, icon: 2 },
  { p: [0.85, -1.55], h: 1.7, icon: 3 },
];

/** A tower of banknotes with a big studio's game on top, burning. */
const Tower: React.FC<{ x: number; z: number; h: number; icon: number; f: number; k: number; delay: number }> = ({ x, z, h, icon, f, k, delay }) => {
  const tex = useMemo(() => canvasTexture(256, 256, (g) => drawChartIcon(g, 0, 0, 256, icon)), [icon]);
  const rise = ease(Math.min(1, Math.max(0, k * 1.4 - delay)));
  const n = Math.round(h / 0.075);
  return (
    <group position={[x, -(1 - rise) * (h + 0.6), z]}>
      {Array.from({ length: n }, (_, i) => (
        <RBox key={i} s={[0.6, 0.07, 0.32]} p={[Math.sin(i * 2.3) * 0.015, 0.037 + i * 0.075, Math.cos(i * 1.7) * 0.012]} c={i % 2 ? "#5d9e57" : "#4b8a48"} rough={0.8} r={0.012} />
      ))}
      <RBox s={[0.16, h * 0.55, 0.33]} p={[0, h / 2, 0]} c="#efe7cf" rough={0.7} r={0.008} />
      <group position={[0, h + 0.3, 0]} rotation={[0, Math.sin(f * 0.04 + icon) * 0.15, 0]}>
        <RBox s={[0.42, 0.42, 0.04]} c="#ffffff" r={0.07} rough={0.4} />
        <mesh position={[0, 0, 0.021]}>
          <planeGeometry args={[0.39, 0.39]} />
          <meshBasicMaterial map={tex} toneMapped={false} />
        </mesh>
      </group>
      {/* flames licking the top */}
      {Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * Math.PI * 2;
        const flick = 0.75 + 0.35 * Math.sin(f * 0.9 + i * 2.1) + 0.15 * Math.sin(f * 2.3 + i);
        const s = 0.07 * flick;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.24, h - 0.05 + ((f * 0.03 + i * 0.37) % 1) * 0.25, Math.sin(a) * 0.13]} scale={[s, s * 2.3, s]}>
            <sphereGeometry args={[1, 12, 10]} />
            <meshStandardMaterial color="#ff7a1a" emissive={i % 3 ? "#ff5a00" : "#ffc23a"} emissiveIntensity={3} />
          </mesh>
        );
      })}
      <pointLight position={[0, h + 0.2, 0.3]} intensity={(1.6 + Math.sin(f * 1.3) * 0.4) * rise} distance={2.5} decay={1.6} color="#ff8a2a" />
    </group>
  );
};

const MoneyRain: React.FC<{ f: number }> = ({ f }) => (
  <>
    {Array.from({ length: 40 }, (_, i) => {
      const u = (f * 0.012 + i * 0.137) % 1;
      const x = Math.sin(i * 12.9) * 2.2;
      const z = -0.3 - Math.abs(Math.cos(i * 7.7)) * 1.6;
      return (
        <mesh key={i} position={[x + Math.sin(f * 0.08 + i) * 0.2, 3.3 - u * 3.4, z]} rotation={[f * 0.05 + i, f * 0.07, i]}>
          <planeGeometry args={[0.16, 0.08]} />
          <meshStandardMaterial color="#6fb36a" side={THREE.DoubleSide} roughness={0.8} />
        </mesh>
      );
    })}
  </>
);

const Money: React.FC = () => {
  const f = useCurrentFrame();
  const k = track(f, MONEY);
  if (k < 0.005) return null;
  return (
    <>
      {TOWERS.map((t, i) => (
        <Tower key={i} x={t.p[0]} z={t.p[1]} h={t.h} icon={t.icon} f={f} k={k} delay={i * 0.1} />
      ))}
      {k > 0.6 && <MoneyRain f={f} />}
    </>
  );
};

// ── "the feed learns what you like": game cards flying in round him ──────────

const CARD_SLOTS: Vec3[] = [
  [-1.0, 2.3, -0.8],
  [-0.6, 2.3, -0.8],
  [-1.0, 1.9, -0.8],
  [-0.6, 1.9, -0.8],
  [-1.0, 1.5, -0.8],
  [-0.6, 1.5, -0.8],
];

const Card: React.FC<{ i: number; slot: Vec3; game: number; at: number; f: number; out: number }> = ({ i, slot, game, at, f, out }) => {
  const icon = useTexture(`icons/${GAMES[game].id}.png`);
  const t = ease(interpolate(f, [at, at + 14], [0, 1], clamp));
  const gone = ease(interpolate(f, [out, out + 12], [0, 1], clamp));
  if (t <= 0 || gone >= 1) return null;
  const from: Vec3 = [slot[0] - 2 + Math.sin(i) * 1.5, slot[1] + 2.5, slot[2] - 2];
  return (
    <group position={[from[0] + (slot[0] - from[0]) * t, from[1] + (slot[1] - from[1]) * t - gone * 4, from[2] + (slot[2] - from[2]) * t]} rotation={[0, 0.25 + (1 - t) * 3, (1 - t) * 1.5]}>
      <RBox s={[0.34, 0.34, 0.03]} c="#ffffff" r={0.06} rough={0.4} />
      {icon && (
        <mesh position={[0, 0, 0.016]}>
          <planeGeometry args={[0.31, 0.31]} />
          <meshBasicMaterial map={icon} toneMapped={false} />
        </mesh>
      )}
    </group>
  );
};

const Cards: React.FC = () => {
  const f = useCurrentFrame();
  const feed = beatOf("feed");
  if (!feed || feed.marks.length < 6) return null;
  const at = cue("feed", 5);
  return (
    <>
      {CARD_SLOTS.map((_, i) => (
        <Card key={i} i={i} slot={CARD_SLOTS[i]} game={i * 37 + 5} at={at + i * 3} f={f} out={feed.from + feed.len} />
      ))}
    </>
  );
};

// ── the hook: a live developer counter and games piling up ──────────────────

/** The developer counter runs from the first frame to just before the hook ends. */
const countEnd = () => {
  const hook = beatOf("hook");
  return hook ? hook.from + hook.len - 12 : 0;
};
const COUNTER = presence((s) => (s === "hook" || s === "punch" ? 1 : 0));

/** A big counter board above him, ticking up from 0 to 1,000+ from frame 0. */
const Counter: React.FC = () => {
  const f = useCurrentFrame();
  const k = track(f, COUNTER);
  const { g, tex } = useLiveCanvas(1000, 300);
  const end = countEnd();
  const p = interpolate(f, [0, end], [0, 1], clamp);
  const n = Math.round(1000 * Math.pow(p, 1.6));
  const done = f >= end;
  g.clearRect(0, 0, 1000, 300);
  g.fillStyle = "#0b0a12";
  roundRect(g, 0, 0, 1000, 300, 40);
  g.fill();
  g.textAlign = "center";
  g.fillStyle = "#8b8fb0";
  g.font = "800 54px Helvetica, Arial, sans-serif";
  g.fillText("DEVELOPERS ON PIXELPICKED", 500, 80);
  g.font = "900 170px Arial Black, sans-serif";
  g.shadowColor = done ? "#ffd84a" : "#4fd8ff";
  g.shadowBlur = 30;
  g.fillStyle = done ? "#ffe680" : "#d9f7ff";
  g.fillText(done ? "1,000+" : n.toLocaleString("en-US"), 500, 250);
  g.shadowBlur = 0;
  g.textAlign = "left";
  tex.needsUpdate = true;
  if (k < 0.005) return null;
  const pop = done ? 1 + 0.08 * Math.max(0, 1 - (f - end) / 8) : 1;
  return (
    // level with his face so it sits in the focus plane and stays sharp
    <group position={[0, 2.3 + (1 - k) * 3, 0.25]} scale={pop}>
      <mesh>
        <planeGeometry args={[1.3, 0.39]} />
        <meshBasicMaterial map={tex} transparent toneMapped={false} color={[1.6, 1.6, 1.6]} />
      </mesh>
    </group>
  );
};

/** Real games from the site flying in and piling up beside him while the counter runs. */
const HOOK_SLOTS: Vec3[] = [
  [-1.0, 1.5, -0.8],
  [-0.6, 1.5, -0.8],
  [-1.0, 1.9, -0.8],
  [-0.6, 1.9, -0.8],
  [-1.0, 2.3, -0.8],
  [-0.6, 2.3, -0.8],
];
const HookCards: React.FC = () => {
  const f = useCurrentFrame();
  if (!beatOf("hook")) return null;
  // they scatter as the feed dies on "flopped"
  const out = beatOf("punch") ? lastCue("punch") : countEnd() + 20;
  return (
    <>
      {HOOK_SLOTS.map((slot, i) => (
        <Card key={i} i={i} slot={slot} game={i * 53 + 11} at={i * 7 - 8} f={f} out={out} />
      ))}
    </>
  );
};

// ── the numbers, as neon signs ───────────────────────────────────────────────

/** Level with his face, so they sit in the focus plane and stay sharp. */
const SIGN_SPOTS: Vec3[] = [
  [0, 2.5, 0.25],
  [0, 2.28, 0.25],
  [0, 2.06, 0.25],
];

/** A line of text in cyan neon that flickers on. The letters are the same size whatever the length. */
const NeonSign: React.FC<{ text: string; p: Vec3; at: number; f: number }> = ({ text, p, at, f }) => {
  const cw = 48 * text.length + 100;
  const tex = useMemo(
    () =>
      canvasTexture(cw, 180, (g) => {
        g.font = "900 80px Arial Black, sans-serif";
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.lineJoin = "round";
        g.shadowColor = "#4fd8ff";
        g.shadowBlur = 10;
        g.strokeStyle = "#2fb8e6";
        g.lineWidth = 8;
        g.strokeText(text, cw / 2, 95);
        g.shadowBlur = 0;
        g.fillStyle = "#ffffff";
        g.fillText(text, cw / 2, 95);
      }),
    [text, cw],
  );
  if (f < at) return null;
  const k = interpolate(f - at, [0, 3, 5, 7, 10], [0, 1, 0.3, 1, 1], clamp);
  const pop = interpolate(f - at, [0, 6], [0.6, 1], clamp);
  return (
    <group position={p} scale={pop}>
      {/* a dark board behind the tubes, so the sign reads over whatever is on the wall */}
      <RBox s={[cw / 900 + 0.06, 180 / 900 + 0.02, 0.025]} p={[0, 0, -0.02]} c="#0b0a12" r={0.02} rough={0.5} />
      <mesh>
        <planeGeometry args={[cw / 900, 180 / 900]} />
        <meshBasicMaterial map={tex} transparent toneMapped={false} color={[1.15 * k, 1.15 * k, 1.15 * k]} opacity={k} />
      </mesh>
    </group>
  );
};

const Signs: React.FC = () => {
  const f = useCurrentFrame();
  const end = beatOf("end");
  if (!end?.sign) return null;
  return (
    <>
      {Object.entries(end.sign).map(([i, text], n) => (
        <NeonSign key={i} text={text} p={SIGN_SPOTS[n % SIGN_SPOTS.length]} at={cue("end", Number(i))} f={f} />
      ))}
    </>
  );
};

// ── lights ───────────────────────────────────────────────────────────────────

/** The studio's lights, dimmed for the low points, with one spotlight on him in the dark. */
const OneTakeLights: React.FC = () => {
  const f = useCurrentFrame();
  const dim = track(f, DIM);
  const a = 1 - 0.85 * dim;
  const key = useMemo(() => new THREE.Object3D(), []);
  key.position.set(0, 1.3, 0);
  const rim = useMemo(() => new THREE.Object3D(), []);
  rim.position.set(0, 1.4, 0);
  return (
    <>
      <primitive object={key} />
      <primitive object={rim} />
      <hemisphereLight args={["#5a6a9a", "#1a1420", 0.4 * a]} />
      <spotLight position={[-1.6, 2.2, 2.0]} target={key} angle={0.6} penumbra={1} intensity={30 * a} decay={1.6} distance={10} color="#ffe0bf" castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0003} shadow-radius={10} />
      <spotLight position={[1.4, 2.4, -1.2]} target={rim} angle={0.5} penumbra={0.8} intensity={45 * a} decay={1.6} distance={8} color="#7fb2ff" />
      <pointLight position={[-0.25, 2.2, -1.7]} intensity={6 * a * track(f, ROOM)} distance={3.5} decay={1.6} color="#ff4fd8" />
      <pointLight position={[-1.2, 1.2, -0.3]} intensity={2.5 * a} distance={2.2} decay={1.6} color="#ffb070" />
      {/* the spotlight for the low point */}
      <spotLight position={[0, 3.6, 0.9]} target={key} angle={0.32} penumbra={0.5} intensity={55 * dim} decay={1.4} distance={8} color="#fff4e0" />
    </>
  );
};

// ── the reel ─────────────────────────────────────────────────────────────────

/**
 * What the lens is focused on: his face, wherever he is, except while the camera is down on the
 * lonely game on the desk.
 */
const focusAt = (f: number, cam: Cam, faceY = 1.48): number => {
  const self = selfieAt(f);
  const face: Vec3 = self ? [self.pos[0], faceY, self.pos[2]] : [0, faceY, 0.3];
  let p = face;
  const lonely = beatOf("lonely");
  if (lonely) {
    const k = f < lonely.from + lonely.len ? interpolate(f, [lonely.from + 4, cue("lonely", 2) + 10], [0, 1], clamp) : interpolate(f, [lonely.from + lonely.len, lonely.from + lonely.len + CHANGE], [1, 0], clamp);
    const icon: Vec3 = [LONELY[0], LONELY[1] + 0.05, LONELY[2]];
    p = [face[0] + (icon[0] - face[0]) * k, face[1] + (icon[1] - face[1]) * k, face[2] + (icon[2] - face[2]) * k];
  }
  return Math.hypot(cam.pos[0] - p[0], cam.pos[1] - p[1], cam.pos[2] - p[2]);
};

const World: React.FC = () => {
  const f = useCurrentFrame();
  const pose = poseAt(f);
  const dim = track(f, DIM);
  const cam = cameraAt(f);
  const style = React.useContext(FounderStyleCtx);
  return (
    <Stage cam={cam} post={{ frame: f, style: style.post, focus: focusAt(f, cam, style.mature ? 1.95 : 1.48), aperture: 0.016 * (1 - 0.75 * track(f, END)), maxBlur: 0.014, vignette: 0.55 + 0.2 * dim, grain: 0.05 }} env={0.1} fill={0.15 * (1 - 0.7 * dim)} exposure={0.95}>
      <OneTakeLights />
      <StudioSet macClip="orbitglide" macTime={4 + f / FPS} props={false} room={track(f, ROOM)} />
      <Bedroom />
      <GiantScreen />
      <Money />
      <LonelyGame />
      <Cards />
      <HookCards />
      <Counter />
      <Signs />
      <Confetti />
      {(() => {
        const self = selfieAt(f);
        // with a voice take, the mouth follows how loud he is at this frame
        const mouth = VOICE ? { mouthOpen: Math.min(1, ((voiceMouth as number[])[f] ?? 0) * 0.8) } : {};
        return <Founder f={f} arms={pose.arms} face={pose.face} lean={pose.lean} p={self?.pos} rotY={self?.rotY} extra={{ ...pose.look, ...self?.legs, ...mouth }} />;
      })()}
    </Stage>
  );
};

/** The paper title, gone once he's filming himself (the phone has its own look). */
const TitleUntilSelfie: React.FC = () => {
  const f = useCurrentFrame();
  const b = beatOf("selfie");
  return b && f >= b.from + 6 ? null : <PaperTitle text={TITLE} />;
};

/** The phone's recording look and story stickers while he films himself, then cut to black. */
const SelfieOverlay: React.FC<{ youtube: boolean }> = ({ youtube }) => {
  const f = useCurrentFrame();
  const b = beatOf("selfie");
  if (!b) return null;
  const stickers = Object.entries({ ...(b.sticker ?? {}), ...(youtube ? YOUTUBE_ENDING.sticker : {}) });
  return (
    <Sequence from={b.from + 6} durationInFrames={b.len - 6} layout="none">
      <RecordingUI />
      {stickers.map(([i, text], n) => (
        <Sticker key={i} text={text} at={b.marks[Number(i)] - 6} y={[300, 430][n % 2]} tilt={n % 2 ? 3 : -3} hot={n === stickers.length - 1} />
      ))}
      <AbsoluteFill style={{ background: "#000", opacity: interpolate(f, [b.from + b.len - 8, b.from + b.len], [0, 1], clamp) }} />
    </Sequence>
  );
};

/** Captions for a platform: the YouTube cut swaps the DM ask at the end for subscribe and the description. */
const captionsFor = (youtube: boolean): Chunk[] => {
  if (!youtube) return TIMELINE.chunks;
  const selfie = beatOf("selfie");
  if (!selfie) return TIMELINE.chunks;
  const first = TIMELINE.beats.slice(0, TIMELINE.beats.indexOf(selfie)).reduce((n, b) => n + b.say.length, 0);
  return TIMELINE.chunks.map((c, i) => (YOUTUBE_ENDING.say[i - first] ? { ...c, text: YOUTUBE_ENDING.say[i - first] } : c));
};

/** `platform` "youtube" is the Shorts cut: the same reel with a subscribe/description ending. */
export const FounderTrial: React.FC<{ platform?: "instagram" | "youtube" }> = ({ platform = "instagram" }) => {
  const youtube = platform === "youtube";
  const selfie = beatOf("selfie");
  // on YouTube the voice stops before the DM ask
  const voiceUntil = youtube && selfie ? selfie.from + (selfie.marks[2] ?? selfie.len) - 2 : undefined;
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Sequence from={0} durationInFrames={TIMELINE.duration}>
        <World />
      </Sequence>
      <TitleUntilSelfie />
      <SelfieOverlay youtube={youtube} />
      <Captions chunks={captionsFor(youtube)} fps={FPS} />
      <FounderSound beats={TIMELINE.beats} duration={TIMELINE.duration} voice={VOICE} voiceUntil={voiceUntil} />
    </AbsoluteFill>
  );
};

/**
 * One frame of the reel in another art style, for comparing looks. Renders the set and the founder
 * only (no captions or title), so the style is all you see. The reel itself is unchanged.
 */
export const FounderConcept: React.FC<{ style: FounderStyle; at: number; portrait?: boolean }> = ({ style, at, portrait }) => (
  <AbsoluteFill style={{ background: "#000" }}>
    <FounderStyleCtx.Provider value={style}>
      <Freeze frame={at}>{portrait ? <Portrait /> : <World />}</Freeze>
    </FounderStyleCtx.Provider>
  </AbsoluteFill>
);

/** A head-and-shoulders portrait of the founder at his desk, to judge the face and build. */
const Portrait: React.FC = () => {
  const f = useCurrentFrame();
  const style = React.useContext(FounderStyleCtx);
  const faceY = style.mature ? 1.92 : 1.48;
  const cam = orbit([0, faceY - 0.12, 0.1], style.mature ? 2.0 : 2.6, 0.28, 0.05, 30);
  return (
    <Stage cam={cam} post={{ frame: f, style: style.post, focus: Math.hypot(cam.pos[0], cam.pos[1] - faceY, cam.pos[2] - 0.3), aperture: 0.02, maxBlur: 0.014, vignette: 0.5, grain: 0.04 }} env={0.1} fill={0.2} exposure={0.95}>
      <OneTakeLights />
      <StudioSet macClip="orbitglide" macTime={4} props={false} room={1} />
      <Founder f={f} arms={GESTURE} face={{ smile: 0.35, browRaise: 0.2 }} />
    </Stage>
  );
};
