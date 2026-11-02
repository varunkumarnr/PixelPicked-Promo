import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { EXPR, Pose } from "../siblings/Chibi";
import { shakeCam } from "../siblings/Cast";
import { Cam, Stage, lerpCam } from "../siblings/Stage";
import { BENCH_Z, Bot, BotProps, CourtLights, CourtSet, Face, Judge } from "./Court";
import { BOTH_OPEN, Captions, Chunk, Founder, GESTURE, HANDS_DOWN, PaperTitle } from "./Studio";
import { CourtSound } from "./CourtSound";
import courtWords from "./data/court-words.json";

/**
 * "I let 2 AI lawyers & 12 AI judges judge my startup idea", paced like the nocodealex courtroom
 * reel: one narrator (the founder) tells it all, a new picture every couple of seconds, captions a
 * few words at a time. The jury fills up, every AI shouts YES (AI agrees with everything), so the
 * founder makes it argue with itself: the prosecution's billion-players card gets stamped FADED,
 * the defence crosses out a months-long soft launch for DAYS, the jury votes in secret as
 * different people, the teenager calls it lowkey fire, the cards land on 8–4, and the jury is
 * offered free. Every quote and the score come from the real trial run (trial 4, Oct 2026).
 * Timed to the voice take in public/audio/founder/voice/court.mp3.
 */

type Vec3 = [number, number, number];

export const FPS = 30;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

/** The voice take's words with start and end times, from transcribing it. */
const WORDS = (courtWords as [number, number, string][]).map(([start, end, word]) => ({ start, end, word }));
const norm = (w: string) => w.toLowerCase().replace(/[^a-z0-9]/g, "");
/** When the n-th time (from 0) a word is spoken starts, in seconds. */
const word = (w: string, n = 0) => WORDS.filter((x) => norm(x.word) === norm(w)).at(n)?.start ?? 0;

/** When each beat starts, in seconds, taken from the words in the take. */
export const T = {
  spawn: word("12") - 0.1,
  yes: word("agrees"),
  argue: word("so"),
  lawyers: word("argue"),
  pros: word("one"),
  card: word("facebook"),
  faded: word("faded"),
  def: word("another"),
  months: word("every"),
  strike: word("whats"),
  days: word("days"),
  vote: word("then"),
  secret: word("without"),
  personas: word("and", 0),
  vc: word("vc") - 0.15,
  teen: word("teenager") - 0.1,
  tiktok: word("tiktok") - 0.1,
  quote: word("the", 0),
  fire: word("fire") - 0.3,
  verdict: word("then", 1),
  slam: word("verdict"),
  cards: word("verdict") + 0.15,
  react: word("will") - 0.08,
  sentence: word("for", 0),
  free: word("i", 2),
  freeStamp: word("free"),
  end: word("for", 1),
  ask: word("comment"),
  subscribe: word("and", -1) + 0.1,
  total: WORDS[WORDS.length - 1].end + 0.7,
};
export const COURT_REEL_DURATION = Math.round(T.total * FPS);

/** The small section title under the hook, and when it changes. */
const SECTIONS: [number, string][] = [
  [0, "THE TRIAL"],
  [T.yes, "THE PROBLEM"],
  [T.pros, "THE PROSECUTION"],
  [T.def, "THE DEFENCE"],
  [T.vote, "THE JURY"],
  [T.verdict, "THE VERDICT"],
  [T.free, "YOUR TURN"],
];

/**
 * Captions straight from the take: up to three words at a time, breaking after punctuation, each
 * group up on its first word. Key words go yellow.
 */
const HOT = new Set(["trial", "12", "everything", "itself", "fail", "billion", "faded", "work", "days", "secret", "different", "lowkey", "fire", "8", "4", "guilty", "free", "jury"]);
const CAPTIONS: Chunk[] = (() => {
  const out: Chunk[] = [];
  let group: typeof WORDS = [];
  const flush = () => {
    if (!group.length) return;
    const text = group
      .map((w) => w.word.replace(/[,.!?]$/, ""))
      .map((w) => (HOT.has(norm(w)) ? `*${w}*` : w))
      .join(" ")
      // hyphenated words come back split ("start -up", "low -key"): stitch them
      .replace(/ \*?-/g, (m) => (m.includes("*") ? "*" : ""))
      .replace("low-key", "lowkey")
      .replace("*8* *4*", "*8–4*");
    out.push({ at: group[0].start - 0.03, text });
    group = [];
  };
  for (const w of WORDS) {
    group.push(w);
    if (group.length >= 3 || /[,.!?]$/.test(w.word)) flush();
  }
  flush();
  return out;
})();

/** The YouTube cut: Shorts can't DM, so the ask points to the description and subscribe instead. */
const YOUTUBE_CAPTIONS: Chunk[] = [
  ...CAPTIONS.filter((c) => c.at < T.ask - 0.1),
  { at: T.ask - 0.03, text: "link in *description*" },
  { at: T.subscribe - 0.03, text: "and *subscribe*!" },
];

// ── the jury ─────────────────────────────────────────────────────────────────

type Juror = { role: string; color: string; prop: BotProps["prop"]; tie: string; guilty: boolean };

/** Seats 0-5 are the front row, 6-11 the raised back row. Votes are the real trial-4 votes. */
const JURORS: Juror[] = [
  { role: "indie dev", color: "#5ab8ff", prop: "headphones", tie: "#22252e", guilty: true },
  { role: "VC", color: "#ffcf4a", prop: "briefcase", tie: "#3a3f8a", guilty: false },
  { role: "13-year-old", color: "#9dff5a", prop: "cap", tie: "#2a6a1a", guilty: false },
  { role: "candy crush mom", color: "#ff7ad9", prop: "phone", tie: "#ff7ad9", guilty: true },
  { role: "TikTok exec", color: "#4ff0ff", prop: null, tie: "#ff2d6f", guilty: true },
  { role: "burned-out founder", color: "#c9c9d6", prop: null, tie: "#444", guilty: true },
  { role: "casual gamer", color: "#7dffcf", prop: "phone", tie: "#1f9e8c", guilty: false },
  { role: "ad network exec", color: "#ff9a3c", prop: "briefcase", tie: "#7a3a10", guilty: true },
  { role: "accountant", color: "#d8d8e8", prop: "glasses", tie: "#333a55", guilty: true },
  { role: "UA manager", color: "#b28cff", prop: "headphones", tie: "#3a2370", guilty: true },
  { role: "hardcore gamer", color: "#ff4a4a", prop: "headphones", tie: "#111", guilty: true },
  { role: "streamer", color: "#c35bff", prop: "cap", tie: "#c35bff", guilty: false },
];

/** The three jurors he names as "someone different", then the teenager's line. */
const PERSONAS: { seat: number; at: () => number; until: () => number }[] = [
  { seat: 1, at: () => T.vc, until: () => T.teen },
  { seat: 2, at: () => T.teen, until: () => T.tiktok },
  { seat: 4, at: () => T.tiktok, until: () => T.quote },
];
const TEEN = 2;
const personaAt = (t: number) => PERSONAS.findIndex((p) => t >= p.at() && t < p.until());

/** The order the cards go up in, and when each one does. */
const CARD_ORDER = [10, 1, 7, 2, 8, 0, 6, 4, 9, 11, 3, 5];
const cardAt = (seat: number) => T.cards + CARD_ORDER.indexOf(seat) * 0.08;

const JURY_ROT = Math.PI / 2 - 0.25;
const JURY_SCALE = 0.72;
const BOT_HEAD = 1.6;

/** A juror's seat in world space, and the way they face. */
function seat(i: number): { p: Vec3; head: Vec3; facing: Vec3 } {
  const back = i >= 6;
  const lx = -1.55 + (i % 6) * 0.62;
  const lz = back ? -1.05 : -0.15;
  const y = back ? 0.72 : 0.28;
  const c = Math.cos(JURY_ROT);
  const s = Math.sin(JURY_ROT);
  const p: Vec3 = [-2.5 + lx * c + lz * s, y, -1.2 - lx * s + lz * c];
  return { p, head: [p[0], p[1] + BOT_HEAD * JURY_SCALE, p[2]], facing: [s, 0, c] };
}

/** The jury fills up in a quick run, front row then back, while the counter ticks to 12. */
export const spawnAt = (i: number) => T.spawn + i * 0.1;

/** Pops from nothing to full size with a little overshoot. */
export const pop = (t: number, at: number) => {
  const k = (t - at) / 0.3;
  if (k <= 0) return 0;
  if (k >= 1) return 1;
  return 1 + Math.sin(k * Math.PI) * 0.25 * (1 - k) - (1 - k) * (1 - k) * (1 - k);
};

// ── the lawyers ──────────────────────────────────────────────────────────────

const PROS = { p: [1.05, -0.28, 2.0] as Vec3, rotY: -0.7, color: "#ff4a4a", tie: "#b3202a" };
const DEF = { p: [-1.05, -0.28, 2.0] as Vec3, rotY: 0.7, color: "#4fffb0", tie: "#1f9e5c" };
const lawyerHead = (l: typeof PROS): Vec3 => [l.p[0], l.p[1] + BOT_HEAD, l.p[2]];
const lawyerFacing = (l: typeof PROS): Vec3 => [Math.sin(l.rotY), 0, Math.cos(l.rotY)];

// ── cameras ──────────────────────────────────────────────────────────────────

const add = (a: Vec3, b: Vec3, k = 1): Vec3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const dist = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

// close enough that nothing (him, the lawyers' podiums) gets between the camera and the face;
// the wider lens keeps it from feeling cramped
export const closeUp = (head: Vec3, facing: Vec3, k: number, side = 0.25, d0 = 2.3, d1 = 2.05): Cam => {
  const d = d0 + (d1 - d0) * ease(k);
  const right: Vec3 = [facing[2], 0, -facing[0]];
  return { pos: add(add(add(head, facing, d), right, side), [0, 0.18, 0]), look: add(head, [0, -0.08, 0]), fov: 48 };
};

const JURY_WIDE: Cam = { pos: [-0.1, 2.05, 2.3], look: [-2.75, 1.25, -1.45], fov: 52 };
/** High and wide: him at his table and the jury box filling up beside him. */
const ROOM_WIDE: Cam = { pos: [1.4, 3.1, 6.2], look: [-1.0, 1.1, -0.9], fov: 52 };

const BOTH_LAWYERS: Cam = { pos: [0, 2.15, 6.4], look: [0, 1.3, 0.9], fov: 54 };
const FOUNDER_MED: Cam = { pos: [0.45, 1.8, 4.2], look: [0, 1.42, 0], fov: 40 };

function camAt(t: number): Cam {
  const seg = (a: number, b: number) => Math.min(1, Math.max(0, (t - a) / (b - a)));
  const jurorShot = (i: number, a: number, b: number, k = 0) => {
    const s = seat(i);
    return closeUp(s.head, s.facing, seg(a, b), k % 2 ? -0.3 : 0.3);
  };
  if (t < T.yes) return lerpCam(ROOM_WIDE, { ...ROOM_WIDE, pos: [1.1, 2.8, 5.4] }, ease(seg(0, T.yes)));
  if (t < T.argue) return lerpCam(JURY_WIDE, { pos: [-0.5, 1.95, 1.7], look: [-2.75, 1.25, -1.45], fov: 52 }, seg(T.yes, T.argue));
  if (t < T.pros) return lerpCam(BOTH_LAWYERS, { ...BOTH_LAWYERS, pos: [0, 2.05, 5.8] }, seg(T.argue, T.pros));
  if (t < T.def) return closeUp(lawyerHead(PROS), lawyerFacing(PROS), seg(T.pros, T.def), 0.6, 3.6, 3.0);
  if (t < T.vote) return closeUp(lawyerHead(DEF), lawyerFacing(DEF), seg(T.def, T.vote), -0.6, 3.6, 3.0);
  if (t < T.vc) return lerpCam(JURY_WIDE, { pos: [-0.4, 1.95, 1.8], look: [-2.75, 1.25, -1.45], fov: 52 }, seg(T.vote, T.vc));
  if (t < T.quote) {
    const k = Math.max(0, personaAt(t));
    return jurorShot(PERSONAS[k].seat, PERSONAS[k].at(), PERSONAS[k].until(), k);
  }
  if (t < T.verdict) return jurorShot(TEEN, T.quote, T.verdict);
  if (t < T.cards) {
    const judgeHead: Vec3 = [0, 0.4 + BOT_HEAD * 1.1, BENCH_Z - 0.3];
    return lerpCam({ pos: [0.6, 1.3, BENCH_Z + 3.6], look: judgeHead, fov: 44 }, { pos: [0.45, 1.3, BENCH_Z + 3.1], look: judgeHead, fov: 44 }, seg(T.verdict, T.cards));
  }
  if (t < T.react) return lerpCam(JURY_WIDE, { pos: [-0.3, 2.0, 2.0], look: [-2.75, 1.4, -1.45], fov: 52 }, seg(T.cards, T.react));
  if (t < T.free) return lerpCam(FOUNDER_MED, { pos: [0.35, 1.75, 3.7], look: [0, 1.44, 0], fov: 40 }, seg(T.react, T.free));
  return lerpCam({ pos: [0.6, 1.9, 4.4], look: [-0.2, 1.35, -0.2], fov: 44 }, { pos: [1.2, 2.9, 6.6], look: [-0.8, 1.1, -0.9], fov: 50 }, ease(seg(T.free, T.total)));
}

// ── props and overlays ───────────────────────────────────────────────────────

export const PAPER = "#fbf8f1";
export const BLACK_FONT = '"Arial Black", sans-serif';

/** Slams in from slightly too big: for cards and stamps. */
export const slam = (t: number, at: number) => interpolate(t - at, [0, 0.1, 0.18], [1.6, 0.94, 1], clamp);

/** A rubber stamp: thick coloured border and letters, slammed on at an angle. */
export const Stamp: React.FC<{ text: string; color: string; at: number; t: number; top: number; rot?: number; size?: number }> = ({ text, color, at, t, top, rot = -12, size = 120 }) => {
  if (t < at) return null;
  return (
    <div style={{ position: "absolute", top, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
      <div style={{ transform: `rotate(${rot}deg) scale(${slam(t, at)})`, border: `12px solid ${color}`, borderRadius: 18, padding: "10px 34px", color, fontFamily: BLACK_FONT, fontSize: size, letterSpacing: 4, whiteSpace: "nowrap", background: "rgba(251,248,241,0.88)", boxShadow: "0 14px 34px rgba(0,0,0,0.45)" }}>
        {text}
      </div>
    </div>
  );
};

/** A paper card the prosecution slams down: a billion players, ticking up, then stamped FADED. */
const BillionCard: React.FC<{ t: number }> = ({ t }) => {
  if (t < T.card || t >= T.def) return null;
  const n = Math.round(interpolate(t, [T.card + 0.1, T.card + 1.0], [0, 1_000_000_000], { ...clamp, easing: (x) => 1 - Math.pow(1 - x, 3) }));
  return (
    <>
      <div style={{ position: "absolute", top: 610, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <div style={{ transform: `rotate(-3deg) scale(${slam(t, T.card)})`, background: PAPER, borderRadius: 14, padding: "26px 40px", boxShadow: "0 22px 50px rgba(0,0,0,0.55)", textAlign: "center", minWidth: 760 }}>
          <div style={{ fontFamily: BLACK_FONT, fontSize: 40, color: "#3b5bdb", letterSpacing: 2 }}>FACEBOOK INSTANT GAMES</div>
          <div style={{ fontFamily: BLACK_FONT, fontSize: 92, color: "#16141a", lineHeight: 1.1 }}>{n.toLocaleString("en-US")}</div>
          <div style={{ fontFamily: BLACK_FONT, fontSize: 40, color: "#5a5a66" }}>PLAYERS</div>
        </div>
      </div>
      <Stamp text="FADED" color="#d61f2c" at={T.faded} t={t} top={690} rot={-14} size={150} />
    </>
  );
};

/** The defence's calendar: a months-long soft launch crossed out, then DAYS. */
const Calendar: React.FC<{ t: number }> = ({ t }) => {
  if (t < T.months || t >= T.vote) return null;
  const strike = interpolate(t, [T.strike, T.strike + 0.25], [0, 1], clamp);
  return (
    <>
      <div style={{ position: "absolute", top: 610, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <div style={{ transform: `rotate(2deg) scale(${slam(t, T.months)})`, background: PAPER, borderRadius: 14, overflow: "hidden", boxShadow: "0 22px 50px rgba(0,0,0,0.55)", textAlign: "center", minWidth: 700 }}>
          <div style={{ background: "#d61f2c", color: "#fff", fontFamily: BLACK_FONT, fontSize: 40, padding: "10px 0", letterSpacing: 2 }}>SOFT LAUNCH</div>
          <div style={{ position: "relative", padding: "20px 40px 26px" }}>
            <div style={{ fontFamily: BLACK_FONT, fontSize: 110, color: "#16141a", lineHeight: 1 }}>3 MONTHS</div>
            <div style={{ position: "absolute", left: 30, top: "50%", height: 16, width: `${strike * 92}%`, background: "#d61f2c", borderRadius: 8, transform: "rotate(-4deg)" }} />
          </div>
        </div>
      </div>
      <Stamp text="DAYS" color="#1f9e5c" at={T.days} t={t} top={800} rot={8} size={170} />
    </>
  );
};

/** A juror's one-line sticker, slapped on beside them. */
const Sticker: React.FC<{ text: string; color: string; label: string; at: number; t: number; side: number }> = ({ text, color, label, at, t, side }) => (
  <div style={{ position: "absolute", top: 610, left: 60, right: 60, display: "flex", justifyContent: side > 0 ? "flex-end" : "flex-start" }}>
    <div style={{ transform: `rotate(${side * 3}deg) scale(${slam(t, at)})`, maxWidth: 820 }}>
      <div style={{ display: "inline-block", background: color, color: "#111", fontFamily: BLACK_FONT, fontSize: 30, padding: "8px 18px", borderRadius: 10, marginLeft: 20, marginBottom: -8, position: "relative", zIndex: 1, textTransform: "uppercase" }}>{label}</div>
      <div style={{ background: PAPER, border: `7px solid ${color}`, borderRadius: 26, padding: "24px 34px", fontFamily: BLACK_FONT, fontSize: 64, lineHeight: 1.08, color: "#16141a", boxShadow: "0 18px 40px rgba(0,0,0,0.5)" }}>“{text}”</div>
    </div>
  </div>
);

/** A juror's role, big, as he names them. */
const Tag: React.FC<{ label: string; color: string; at: number; t: number }> = ({ label, color, at, t }) => (
  <div style={{ position: "absolute", top: 640, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
    <div style={{ transform: `rotate(-2deg) scale(${slam(t, at)})`, background: color, color: "#111", fontFamily: BLACK_FONT, fontSize: 84, padding: "14px 40px", borderRadius: 18, textTransform: "uppercase", boxShadow: "0 16px 36px rgba(0,0,0,0.5)" }}>{label}</div>
  </div>
);

/** The jury counter while the box fills. */
const JuryCounter: React.FC<{ t: number }> = ({ t }) => {
  if (t < T.spawn || t >= T.yes) return null;
  const n = JURORS.filter((_, i) => t >= spawnAt(i)).length;
  return (
    <div style={{ position: "absolute", top: 930, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
      <div style={{ background: PAPER, borderRadius: 18, padding: "12px 34px", boxShadow: "0 14px 30px rgba(0,0,0,0.5)", textAlign: "center", border: "6px solid #ff8a52", transform: `scale(${slam(t, T.spawn)})` }}>
        <div style={{ fontFamily: BLACK_FONT, fontSize: 30, color: "#ff8a52", letterSpacing: 2 }}>AI JURY</div>
        <div style={{ fontFamily: BLACK_FONT, fontSize: 110, lineHeight: 1, color: "#16141a" }}>{n}/12</div>
      </div>
    </div>
  );
};

/** The live count as the cards go up. */
const Tally: React.FC<{ t: number }> = ({ t }) => {
  const up = JURORS.map((j, i) => ({ j, i })).filter(({ i }) => t >= cardAt(i));
  const g = up.filter(({ j }) => j.guilty).length;
  const n = up.length - g;
  const box = (label: string, v: number, color: string) => (
    <div style={{ background: PAPER, borderRadius: 18, padding: "14px 26px", boxShadow: "0 14px 30px rgba(0,0,0,0.5)", textAlign: "center", border: `6px solid ${color}` }}>
      <div style={{ fontFamily: BLACK_FONT, fontSize: 30, color }}>{label}</div>
      <div style={{ fontFamily: BLACK_FONT, fontSize: 110, lineHeight: 1, color: "#16141a" }}>{v}</div>
    </div>
  );
  return (
    <div style={{ position: "absolute", top: 930, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 40 }}>
      {box("WILL FAIL", g, "#d61f2c")}
      {box("WILL SUCCEED", n, "#1f9e5c")}
    </div>
  );
};

/** A white flash, for the gavel. */
export const Flash: React.FC<{ t: number; at: number }> = ({ t, at }) => {
  const o = interpolate(t - at, [0, 0.03, 0.25], [0, 0.75, 0], clamp);
  return o > 0 ? <div style={{ position: "absolute", inset: 0, background: "#fff", opacity: o }} /> : null;
};

/** The small section title that sits under the hook. */
const SectionTag: React.FC<{ t: number }> = ({ t }) => {
  const [at, label] = [...SECTIONS].reverse().find(([s]) => t >= s)!;
  const k = interpolate(t - at, [0, 0.12, 0.2], [0.6, 1.08, 1], clamp);
  return (
    <div style={{ position: "absolute", top: 455, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
      <div style={{ transform: `scale(${k}) rotate(1.5deg)`, background: "#16141a", color: PAPER, fontFamily: BLACK_FONT, fontSize: 38, letterSpacing: 3, padding: "10px 26px", borderRadius: 10, boxShadow: "0 10px 24px rgba(0,0,0,0.4)" }}>{label}</div>
    </div>
  );
};

/** The hook stays on screen the whole reel, so anyone joining late knows what they're watching. */
const TITLE = "I let 2 AI lawyers & 12 AI judges judge my startup idea";

// ── the reel ─────────────────────────────────────────────────────────────────

/** Toggles a face between two looks every few frames, like talking. */
const talk = (f: number, a: Face, b: Face = "talk", every = 4) => (Math.floor(f / every) % 2 ? b : a);

/** `platform` "youtube" is the Shorts cut: the same reel with a description/subscribe ending. */
export const CourtReel: React.FC<{ platform?: "instagram" | "youtube" }> = ({ platform = "instagram" }) => {
  const youtube = platform === "youtube";
  const f = useCurrentFrame();
  const t = f / FPS;

  // the founder
  let arms: Partial<Pose> = t < T.pros ? GESTURE : HANDS_DOWN;
  let face: Partial<Pose> = { ...EXPR.smug };
  let talking = t < T.pros || t >= T.free;
  let mouth: number | undefined;
  if (t >= T.pros && t < T.verdict) face = { ...EXPR.neutral };
  if (t >= T.verdict && t < T.react) face = { ...EXPR.plead };
  if (t >= T.react && t < T.sentence) {
    face = { ...EXPR.shock };
    arms = BOTH_OPEN;
    mouth = 0.7;
  }
  if (t >= T.sentence) {
    face = { ...EXPR.smug };
    arms = GESTURE;
    talking = true;
  }

  // the jury
  const persona = personaAt(t);
  const jurorFace = (i: number): Face => {
    const j = JURORS[i];
    if (t >= T.yes && t < T.argue) return "yes";
    if (persona >= 0 && PERSONAS[persona].seat === i) return j.guilty ? "smug" : "happy";
    if (i === TEEN && t >= T.quote && t < T.verdict) return t >= T.fire ? "happy" : "talk";
    if (t >= cardAt(i) - 0.1 && t < T.free) return j.guilty ? "angry" : "happy";
    if (t >= T.secret && t < T.personas) return "flat";
    if (t >= spawnAt(i) && t < spawnAt(i) + 0.6) return "happy";
    return "flat";
  };
  const raise = (i: number) => interpolate(t, [cardAt(i), cardAt(i) + 0.22], [0, 0.95], clamp);

  // the lawyers: whoever has the floor talks; the other reacts
  const lawyerFace = (who: "pros" | "def"): Face => {
    if (t >= T.lawyers && t < T.pros) return who === "pros" ? "angry" : "happy";
    if (t >= T.pros && t < T.def) return who === "pros" ? (t >= T.faded ? "smug" : talk(f, "angry")) : "shock";
    if (t >= T.def && t < T.vote) return who === "def" ? (t >= T.days ? "happy" : talk(f, "happy")) : "flat";
    if (t >= T.cards) {
      const n = JURORS.filter((j, i) => t >= cardAt(i) && j.guilty).length;
      return who === "pros" ? (n >= 6 ? "happy" : "smug") : n >= 6 ? "shock" : "flat";
    }
    return "flat";
  };
  const lawyerScale = pop(t, T.lawyers);

  let cam = camAt(t);
  if (t >= T.slam && t < T.slam + 0.35) cam = shakeCam(cam, f, 0.035 * (1 - (t - T.slam) / 0.35));
  for (const at of [T.card, T.faded, T.days, T.freeStamp]) if (t >= at && t < at + 0.2) cam = shakeCam(cam, f, 0.02 * (1 - (t - at) / 0.2));
  const spot = t >= T.verdict && t < T.free ? 1 : 0;

  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Stage cam={cam} post={{ frame: f, style: "film", focus: dist(cam.pos, cam.look), aperture: 0.018, maxBlur: 0.012, vignette: 0.5, grain: 0.04 }} env={0.18} fill={0.45} exposure={1.05}>
        <CourtLights spot={spot * 0.6} room={spot ? 0.6 : 1} />
        <CourtSet bigJury neon={t >= T.free ? 1.4 : 1} />
        <Founder f={f} arms={arms} face={face} talking={talking} extra={mouth !== undefined ? { mouthOpen: mouth } : {}} />
        {lawyerScale > 0 && (
          <>
            <Bot p={PROS.p} rotY={PROS.rotY} color={PROS.color} tie={PROS.tie} face={lawyerFace("pros")} scale={lawyerScale} />
            <Bot p={DEF.p} rotY={DEF.rotY} color={DEF.color} tie={DEF.tie} face={lawyerFace("def")} scale={lawyerScale} />
          </>
        )}
        {JURORS.map((j, i) => {
          const s = pop(t, spawnAt(i));
          if (s <= 0) return null;
          const { p } = seat(i);
          const r = raise(i);
          return (
            <Bot
              key={i}
              p={p}
              rotY={JURY_ROT}
              color={j.color}
              face={jurorFace(i)}
              tie={j.tie}
              prop={j.prop}
              scale={JURY_SCALE * s}
              raise={r}
              card={r > 0 ? (j.guilty ? "FAIL" : "SUCCEED") : undefined}
              cardInk={j.guilty ? "#d61f2c" : "#1f9e5c"}
            />
          );
        })}
        <Judge face={t >= T.verdict && t < T.cards ? (t >= T.slam ? "angry" : "flat") : "flat"} />
      </Stage>

      <PaperTitle text={TITLE} />
      <SectionTag t={t} />
      <JuryCounter t={t} />
      <BillionCard t={t} />
      <Calendar t={t} />
      {t >= T.yes && t < T.argue && [0, 1, 2].map((k) => <Stamp key={k} text="YES!" color="#1f9e5c" at={T.yes + k * 0.45} t={t} top={[640, 820, 1000][k]} rot={[-10, 7, -4][k]} size={[110, 130, 150][k]} />)}
      {t >= T.secret && t < T.personas && <Stamp text="SECRET VOTE" color="#16141a" at={T.secret} t={t} top={700} rot={-6} size={90} />}
      {persona >= 0 && (() => {
        const j = JURORS[PERSONAS[persona].seat];
        return <Tag key={persona} label={j.role} color={j.color} at={PERSONAS[persona].at()} t={t} />;
      })()}
      {t >= T.fire && t < T.verdict && <Sticker text="lowkey fire 🔥" color={JURORS[TEEN].color} label="13-year-old · will succeed" at={T.fire} t={t} side={-1} />}
      {t >= T.cards && t < T.react + 0.6 && <Tally t={t} />}
      {t >= T.react && t < T.free && <Stamp text="WILL FAIL… FOR NOW" color="#d61f2c" at={T.react} t={t} top={640} rot={-8} size={66} />}
      {t >= T.freeStamp && t < T.ask && <Stamp text="FREE" color="#1f9e5c" at={T.freeStamp} t={t} top={660} rot={-8} size={190} />}
      {t >= T.ask && (
        <div style={{ position: "absolute", top: 640, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
          <div style={{ transform: `rotate(-3deg) scale(${slam(t, T.ask)})`, background: "#ffd84a", color: "#16141a", fontFamily: BLACK_FONT, fontSize: youtube ? 72 : 84, padding: "20px 44px", borderRadius: 22, boxShadow: "0 18px 44px rgba(0,0,0,0.5)" }}>
            {youtube ? "link in description 👇" : "comment JURY 👇"}
          </div>
        </div>
      )}
      {youtube && t >= T.subscribe && (
        <div style={{ position: "absolute", top: 820, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
          <div style={{ transform: `rotate(3deg) scale(${slam(t, T.subscribe)})`, background: "#ff2d2d", color: "#fff", fontFamily: BLACK_FONT, fontSize: 84, padding: "20px 44px", borderRadius: 22, boxShadow: "0 18px 44px rgba(0,0,0,0.5)" }}>SUBSCRIBE 🔔</div>
        </div>
      )}
      <Flash t={t} at={T.slam} />
      <Captions chunks={youtube ? YOUTUBE_CAPTIONS : CAPTIONS} fps={FPS} />
      <CourtSound youtube={youtube} />
    </AbsoluteFill>
  );
};
