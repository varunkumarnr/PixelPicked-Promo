import React from "react";
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from "remotion";
import { EXPR, JIYA, Phone, Pose, ZACK, poseAt } from "./Chibi";
import { VOICE_LINES_EP3, talk } from "./voices";
import { useTexture } from "./Room";
import { Cam, lerpCam, orbit } from "./Stage";
import { Held, JIYA_HEAD, Jiya, Look, LookCtx, Scene, Shot, ZACK_SPOT, Zack, faceMix, push, shakeCam, track, wear } from "./Cast";
import { Episode3Audio } from "./Episode3Audio";
import { Booth, Ceremony, City, Earth, FantasyScene, ServerRoom } from "./Cutaways";
import { AnimeFx, CleanSubs, CleanTag, FxCue, ExcuseTag, HookCaption, Line, PhoneInsert, Subtitles } from "./Overlays";

/**
 * Zack & Jiya, episode 3: "Which backseat gamer is your brother?"
 * Jiya plays the tower game on the bed while Zack hovers over her shoulder and runs through every
 * type of backseat gamer: the narrator, the "I would've", the hand grabber, the fake pro, the credit
 * taker. She never looks up and sets a new best anyway. She hands him the phone, he loses in a
 * second, and becomes the last type: the excuse maker. His "NO NO NO" is frame 1, so it loops.
 * Every type is taken to a cartoon extreme: the bedroom becomes a stadium, his imagined attempt
 * flattens a city, his arm stretches across the room, time freezes for his countdown, he holds an
 * awards ceremony in the bedroom, and the lag turns out to be the whole planet on fire. Each
 * extreme dissolves in from the room and snaps back to it for the reaction.
 */

type Vec3 = [number, number, number];

/** Shot boundaries, in frames at 30fps. The cartoon extremes dissolve in over the shot before. */
export const SHOTS = {
  hook: [0, 45],
  narrate: [45, 94],
  stadium: [94, 165],
  sideEye: [165, 195],
  would: [195, 240],
  city: [240, 290],
  grab: [290, 348],
  slap: [348, 390],
  pro: [390, 508],
  combo: [508, 545],
  best: [545, 580],
  ceremony: [580, 650],
  nothing: [650, 690],
  turn: [690, 740],
  fail: [740, 788],
  broken: [788, 812],
  servers: [812, 842],
  earth: [842, 885],
} as const;

/** The countdown where time stands still: "wait for it... wait..." */
const FREEZE = [414, 505] as const;

/** How long a cartoon extreme takes to dissolve in. */
const DISSOLVE = 10;

export const EPISODE3_DURATION = SHOTS.earth[1];

export const HOOK = "Which backseat gamer is your brother? 💀";

/** Subtitles, timed to the speech in the voice lines (voices.ts). */
export const LINES: Line[] = [
  { from: 4, to: 42, text: "no no no no—", who: "zack" },
  { from: 52, to: 95, text: "okay you're stacking...", who: "zack" },
  { from: 95, to: 176, text: "stacking again... now you're—", who: "zack" },
  { from: 205, to: 240, text: "i would've got that.", who: "zack" },
  { from: 296, to: 348, text: "here, lemme just—", who: "zack" },
  { from: 357, to: 388, text: "ow.", who: "zack" },
  { from: 395, to: 470, text: "okay pro tip. wait for it...", who: "zack" },
  { from: 470, to: 508, text: "wait... NOW—", who: "zack" },
  { from: 520, to: 575, text: "...okay that works too.", who: "zack" },
  { from: 584, to: 650, text: "LET'S GO. i taught her that.", who: "zack" },
  { from: 700, to: 730, text: "your turn.", who: "jiya" },
  { from: 792, to: 840, text: "this phone is lagging.", who: "zack" },
];

/**
 * The film cut captions everything in one box in the upper third, like animated-film reels: the
 * hook is simply the first caption (his "no no no" plays under it), and the bottom of the frame
 * stays clear for the platform UI.
 */
const FILM_LINES: Line[] = [
  { from: 0, to: 50, text: HOOK, who: "zack" },
  ...LINES.slice(1),
  // the comment bait, over the last shot, so people answer the hook
  { from: 852, to: 885, text: "which one is yours? 👇", who: "zack" },
];

/** The types, as tags over each stretch: [n, label, from, until]. */
const TYPES: [number, string, number, number][] = [
  [1, "the narrator", SHOTS.narrate[0], SHOTS.sideEye[1]],
  [2, "the \"i would've\"", SHOTS.would[0], SHOTS.city[1]],
  [3, "the hand grabber", SHOTS.grab[0], SHOTS.slap[1]],
  [4, "the fake pro", SHOTS.pro[0], SHOTS.combo[1]],
  [5, "the credit taker", SHOTS.best[0], SHOTS.nothing[1]],
  [6, "the excuse maker", SHOTS.broken[0], SHOTS.earth[1]],
];

/** Anime effects (comic and anime versions), by frame (screen positions on the 1080x1920 frame). */
const FX: FxCue[] = [
  { kind: "speed", at: 0, until: 45, x: 540, y: 820 },
  { kind: "sparkle", at: 186, until: 195, pts: [[470, 760]] },
  { kind: "vein", at: 262, until: 290, x: 860, y: 520 },
  { kind: "impact", at: 352, until: 354 },
  { kind: "text", at: 352, until: 378, text: "バシッ", x: 760, y: 980, size: 170, color: "#fff", stroke: "#c8102e", rot: -10 },
  { kind: "menace", at: 400, until: 470 },
  { kind: "speed", at: 508, until: 548, x: 540, y: 1000 },
  { kind: "sparkle", at: 594, until: 663, pts: [[200, 560], [880, 640], [180, 1080], [900, 1100]] },
  { kind: "sparkle", at: 673, until: 690, pts: [[560, 760]] },
  { kind: "gloom", at: 763, until: 788 },
  { kind: "text", at: 760, until: 788, text: "ガーン", x: 540, y: 700, size: 210, color: "#dfe8ff", stroke: "#1a2a6e", rot: -6 },
  { kind: "vein", at: 798, until: 843, x: 860, y: 560, size: 170 },
];

/** How open a mouth is at a frame, from the loudness of the voice line playing then. */
const mouth = (who: "zack" | "jiya", frame: number, loud = 1) => Math.min(1, talk(who, frame, VOICE_LINES_EP3) * 0.9 * loud);

// ── the set-up: Zack hovering over Jiya's shoulder ───────────────────────────

/** Zack stands at the foot of her bed, leaning in over her right shoulder. */
const HOVER: Vec3 = [-0.8, 0, -0.95];
const HOVER_ROT = -0.45;
const HOVER_HEAD: Vec3 = [-0.9, 1.45, -0.75];
/** Leaning in, hands on knees, eyes on her screen. */
const LEAN: Partial<Pose> = { lean: 0.18, headPitch: 0.15, headYaw: -0.25, lookY: -0.5, lookX: -0.6, armLx: 0.5, armLz: 0.15, elbowL: 0.7, armRx: 0.5, armRz: -0.15, elbowR: 0.7, gripL: 0.5, gripR: 0.5 };

/** Both of them from the front: Jiya on the bed edge, Zack looming behind her shoulder. */
const PAIR: Cam = { pos: [-0.75, 1.35, 2.55], look: [-1.35, 1.1, -0.7], fov: 42 };

const Hoverer: React.FC<{ pose: Pose; g: number; rightHand?: React.ReactNode }> = ({ pose, g, rightHand }) => <Zack frame={g} pose={pose} p={HOVER} rotY={HOVER_ROT} rightHand={rightHand} />;

const leaning = (f: number, keys: [number, Partial<Pose>][]) => poseAt(f, [[0, { ...LEAN }], ...keys]);

// ── the shots ────────────────────────────────────────────────────────────────

/** Frame 1: Zack an inch from her screen, shouting. (The reel loops back here.) */
const Hook: React.FC = () => {
  const f = useCurrentFrame();
  const g = SHOTS.hook[0] + f;
  const pose = leaning(f, [[0, { lean: 0.4, armRx: 1.25, armRz: -0.4, elbowR: 0.5, gripR: 0.1, armLx: 1.1, elbowL: 0.6, gripL: 0.1, headPitch: 0.15 }]]);
  pose.headRoll = Math.sin(f * 0.9) * 0.05;
  wear(pose, EXPR.shock, 1, mouth("zack", g, 1.2));
  pose.mouthWide = 0.6;
  // already mid-scream on frame 1, before the voice line's first word lands
  pose.mouthOpen = Math.max(pose.mouthOpen, 0.6);
  pose.lookY = -0.2;
  pose.lookX = -0.2;
  const cam = shakeCam(orbit([-0.95, 1.45, -0.65], 2.7, -0.3, -0.05, 34), f, 0.01);
  return (
    <Scene cam={cam} phoneGlow={[-1.5, 0.95, -0.3]}>
      <Hoverer pose={pose} g={g} />
      <Jiya frame={g} pose={EXPR.deadpan} />
    </Scene>
  );
};

/** #1 The Narrator: a running commentary on every single tap. */
const Narrate: React.FC = () => {
  const f = useCurrentFrame();
  const g = SHOTS.narrate[0] + f;
  const pose = leaning(f, [[6, { armRx: 0.9, armRz: -0.6, elbowR: 0.4, gripR: 0.7 }]]);
  pose.armRz += Math.sin(f * 0.35) * 0.12;
  pose.headYaw = -0.1 + Math.sin(f * 0.2) * 0.08;
  wear(pose, faceMix(EXPR.neutral, EXPR.joy, 0.4), 1, mouth("zack", g));
  return (
    <Scene cam={lerpCam(PAIR, { ...PAIR, pos: [-0.6, 1.32, 2.15] }, f / 120)} phoneGlow={[-1.5, 0.95, -0.3]} post={{ focus: 2.6 }}>
      <Hoverer pose={pose} g={g} />
      <Jiya frame={g} pose={EXPR.deadpan} />
    </Scene>
  );
};

/** She slowly slides her eyes over to him. Glasses glint. Back to the game. */
const SideEye: React.FC = () => {
  const f = useCurrentFrame();
  const g = SHOTS.sideEye[0] + f;
  const fx = React.useContext(LookCtx) !== "film";
  const look = track(f, [
    [0, 0],
    [10, 1],
  ]);
  return (
    <Scene cam={push(JIYA_HEAD, f, 30, 2.3, 2.15, 0.2, 0.03)}>
      <Jiya frame={g} pose={{ ...faceMix(EXPR.deadpan, EXPR.unimpressed, look), lookX: look * 0.9, lookY: -0.8 + look * 0.6, glint: fx ? track(f, [[18, 0], [21, 1], [28, 1], [30, 0]]) : 0 }} />
    </Scene>
  );
};

/** #2 The "I would've": arms folded, smug, as if he's ever made that stack. */
const Would: React.FC = () => {
  const f = useCurrentFrame();
  const g = SHOTS.would[0] + f;
  const pose = leaning(f, [[6, { lean: 0.12, armLx: 1.3, armLz: -0.55, elbowL: 1.9, armRx: 1.3, armRz: 0.55, elbowR: 1.9, gripL: 0.6, gripR: 0.6, headPitch: -0.05, headYaw: 0.25, lookX: 0.3, lookY: 0 }]]);
  wear(pose, EXPR.smug, track(f, [[2, 0], [8, 1]]), mouth("zack", g));
  return (
    <Scene cam={push(HOVER_HEAD, f, 50, 2.2, 2.0, -0.25, 0.05)}>
      <Hoverer pose={pose} g={g} />
    </Scene>
  );
};

/** Zack across the room by the desk, side-on to her, too lazy to walk over. */
const FAR: Vec3 = [0.75, 0, -0.5];
const WIDE: Cam = { pos: [-0.5, 1.4, 5.6], look: [-0.5, 0.95, -0.5], fov: 50 };

/** #3 The Hand Grabber: his arm stretches all the way across the room for her phone. */
const Grab: React.FC = () => {
  const f = useCurrentFrame();
  const g = SHOTS.grab[0] + f;
  const out = track(f, [
    [8, 0],
    [40, 1],
  ]);
  const wobble = Math.sin(f * 0.9) * 0.08 * out;
  const pose = poseAt(f, [
    [0, { armRx: 0.2, elbowR: 0.3 }],
    [6, { armRx: 1.38, armRz: 0, elbowR: 0.05, gripR: 0.2, headYaw: -0.2, lookX: -0.4 }],
  ]);
  pose.reachR = out * 3.3 + wobble;
  wear(pose, faceMix(EXPR.smug, EXPR.joy, 0.3), track(f, [[2, 0], [8, 1]]), mouth("zack", g));
  return (
    <Scene cam={lerpCam(WIDE, { ...WIDE, pos: [-0.5, 1.35, 5.1] }, f / 58)} phoneGlow={[-1.5, 0.95, -0.3]}>
      <Zack frame={g} pose={pose} p={FAR} rotY={-Math.PI / 2} />
      <Jiya frame={g} pose={EXPR.deadpan} />
    </Scene>
  );
};

/** She swats it without looking up; it snaps back like a rubber band and spins him round. OW. */
const Slap: React.FC = () => {
  const f = useCurrentFrame();
  const g = SHOTS.slap[0] + f;
  const swat = track(f, [
    [0, 0],
    [4, 1],
    [14, 1],
    [22, 0],
  ]);
  const snap = track(f, [
    [3, 0],
    [8, 1],
  ]);
  const spin = track(f, [
    [6, 0],
    [30, 1],
  ]);
  const pose = poseAt(f, [[0, { armRx: 1.38, armRz: 0, elbowR: 0.05, gripR: 0.2, headYaw: -0.2, lookX: -0.4 }]]);
  pose.reachR = 3.3 * (1 - snap);
  pose.armRx -= snap * 1.2;
  wear(pose, EXPR.pain, snap, mouth("zack", g, 1.2));
  const cam = shakeCam({ ...WIDE, pos: [-0.5, 1.35, 5.1] }, f, f > 3 && f < 14 ? 0.02 : 0);
  return (
    <Scene cam={cam} phoneGlow={[-1.5, 0.95, -0.3]}>
      <Zack frame={g} pose={pose} p={FAR} rotY={-Math.PI / 2 + spin * Math.PI * 5} />
      <Jiya frame={g} pose={{ ...EXPR.deadpan, armLx: 0.45 + swat * 0.9, armLz: 0.2 - swat * 1.1, elbowL: 0.65 - swat * 0.5 }} />
    </Scene>
  );
};

/** #4 The Fake Pro: hushed, finger up, building to "NOW!" */
const Pro: React.FC = () => {
  const f = useCurrentFrame();
  const g = SHOTS.pro[0] + f;
  const now = track(f, [
    [109, 0],
    [115, 1],
  ]);
  const pose = leaning(f, [
    [6, { armRx: 1.6, armRz: -0.2, elbowR: 1.7, gripR: 0.85, headPitch: 0.2, lookX: 0.4, lookY: 0.1, headYaw: 0.35 }],
    [109, {}],
    [115, { armRx: 2.7, armRz: -0.5, elbowR: 0.3, armLx: 2.6, armLz: 0.5, elbowL: 0.3, lean: 0.1, headPitch: -0.15 }],
  ]);
  wear(pose, faceMix(EXPR.glare, EXPR.shock, now), 1, mouth("zack", g, 1 + now * 0.3));
  const cam = shakeCam(push(HOVER_HEAD, f, 118, 2.4, 1.9, -0.25, 0.02), f, now > 0.5 ? 0.012 : 0);
  return (
    <Scene cam={cam}>
      <Hoverer pose={pose} g={g} />
    </Scene>
  );
};

/** ...and she has no reaction at all. Still playing. */
const Nothing: React.FC = () => {
  const f = useCurrentFrame();
  const g = SHOTS.nothing[0] + f;
  return (
    <Scene cam={push(JIYA_HEAD, f, 110, 2.2, 1.85, 0.15, 0.03)}>
      <Jiya frame={g} pose={EXPR.deadpan} />
    </Scene>
  );
};

/** She holds the phone out to him, eyes front. "Your turn." */
const Turn: React.FC = () => {
  const f = useCurrentFrame();
  const g = SHOTS.turn[0] + f;
  const tex = useTexture("siblings/screen-tower.png");
  const out = track(f, [
    [0, 0],
    [10, 1],
  ]);
  return (
    <Scene cam={{ pos: [-0.6, 1.3, 2.2], look: [-1.3, 1.05, -0.7], fov: 40 }}>
      <Zack frame={g} pose={wear(poseAt(f, [[0, { ...LEAN, lean: 0.2 }], [20, { lean: 0.25, armRx: 1.1, armRz: 0.1, elbowR: 0.5, gripR: 0.4, armLx: 1.0, armLz: -0.1, elbowL: 0.5, gripL: 0.4 }]]), EXPR.shock, track(f, [[30, 0], [38, 0.6]]))} p={HOVER} rotY={HOVER_ROT} />
      <Jiya
        frame={g}
        phone={false}
        pose={{ ...EXPR.deadpan, armRx: 0.6 + out * 0.8, armRz: -0.05 + out * 0.55, elbowR: 1.3 - out * 0.8, gripR: 0.7, mouthOpen: mouth("jiya", g, 0.6) }}
        rightHand={(p) => (
          <Held armX={p.armRx} elbow={p.elbowR}>
            <Phone screen={tex} p={[-0.03, 0.06, 0.05]} rot={[0.75, Math.PI, 0]} />
          </Held>
        )}
      />
    </Scene>
  );
};

/** #6 The Excuse Maker: he shoves the phone at the camera. */
const Broken: React.FC = () => {
  const f = useCurrentFrame();
  const g = SHOTS.broken[0] + f;
  const tex = useTexture("siblings/screen-tower.png");
  const pose = poseAt(f, [
    [0, { armRx: 0.6, elbowR: 1.3, gripR: 0.8 }],
    [6, { armRx: 1.45, armRz: 0.1, elbowR: 0.35, gripR: 0.9, lean: 0.12 }],
  ]);
  const rattle = f > 8 && f < 45 ? Math.sin(f * 2.2) : 0;
  pose.armRx += rattle * 0.08;
  pose.armRz += rattle * 0.06;
  wear(pose, EXPR.angry, track(f, [[2, 0], [7, 1]]), mouth("zack", g, 1.2));
  const cam = shakeCam(orbit([ZACK_SPOT[0], 1.35, ZACK_SPOT[2]], 2.7, 0.05, 0.02, 40), f, f > 8 && f < 45 ? 0.008 : 0);
  return (
    <Scene cam={cam} phoneGlow={[-0.2, 1.3, 1.0]}>
      <Zack
        frame={g}
        pose={pose}
        rotY={0}
        rightHand={
          <Held armX={pose.armRx} elbow={pose.elbowR}>
            <Phone screen={tex} p={[0, 0.1, 0.04]} rot={[0, Math.PI, 0]} />
          </Held>
        }
      />
    </Scene>
  );
};

// ── the cartoon extremes ─────────────────────────────────────────────────────

/** #1: the bedroom is now a stadium, he's on the commentary desk, she's on the jumbotron. */
const Stadium: React.FC = () => {
  const f = useCurrentFrame();
  const g = SHOTS.stadium[0] - DISSOLVE + f;
  const pose = poseAt(f, [
    [0, { armRx: 0.9, armRz: 0.05, elbowR: 1.2, gripR: 0.4, armLx: 0.9, armLz: -0.05, elbowL: 1.2, gripL: 0.4, lean: 0.12 }],
    [24, { armRx: 1.5, armRz: -0.4, elbowR: 0.6, gripR: 0.1, headYaw: -0.15 }],
    [50, { armRx: 0.9, armRz: 0.05, elbowR: 1.2, gripR: 0.4, headYaw: 0.1 }],
  ]);
  pose.headRoll = Math.sin(f * 0.25) * 0.05;
  wear(pose, faceMix(EXPR.joy, EXPR.shock, 0.3), 1, mouth("zack", g, 1.1));
  const cam = lerpCam({ pos: [0, 1.75, 6.6], look: [0, 1.9, 0], fov: 44 }, { pos: [0, 1.6, 5.6], look: [0, 1.75, 0], fov: 44 }, f / 80);
  return (
    <FantasyScene cam={cam}>
      <Booth />
      <Zack frame={g} pose={pose} p={[0.05, 0, 0.25]} rotY={0} />
    </FantasyScene>
  );
};

/** #2: what "i would've got that" looks like: his tower topples and flattens downtown. */
const CityShot: React.FC = () => {
  const f = useCurrentFrame();
  const hit = DISSOLVE + 28;
  const cam = shakeCam(lerpCam({ pos: [-2.2, 2.4, 10.5], look: [1.6, 2.8, -1], fov: 46 }, { pos: [-1.8, 2.3, 9.4], look: [1.8, 2.4, -1], fov: 46 }, f / 60), f, f > hit && f < hit + 12 ? 0.05 : 0);
  return (
    <FantasyScene cam={cam} exposure={1.0}>
      <City fall={DISSOLVE + 6} />
    </FantasyScene>
  );
};

/** #4: time stands still for his countdown. The world goes grey and a giant clock ticks. */
const TimeFreeze: React.FC = () => {
  const f = useCurrentFrame();
  const len = FREEZE[1] - FREEZE[0];
  const k = interpolate(f, [0, 8, len - 2, len], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const tick = Math.floor(f / 15);
  return (
    <AbsoluteFill style={{ backdropFilter: `grayscale(${k}) brightness(${1 - 0.15 * k})` }}>
      <AbsoluteFill style={{ background: `rgba(40,70,140,${0.18 * k})` }} />
      <svg width={420} height={420} viewBox="-110 -110 220 220" style={{ position: "absolute", left: 330, top: 1250, opacity: k }}>
        <circle r={100} fill="rgba(255,255,255,0.92)" stroke="#1d1a24" strokeWidth={8} />
        {Array.from({ length: 12 }, (_, i) => (
          <line key={i} x1={0} y1={-84} x2={0} y2={-72} stroke="#1d1a24" strokeWidth={6} transform={`rotate(${i * 30})`} />
        ))}
        <line x1={0} y1={0} x2={0} y2={-45} stroke="#1d1a24" strokeWidth={9} strokeLinecap="round" transform="rotate(300)" />
        <line x1={0} y1={0} x2={0} y2={-78} stroke="#c1121f" strokeWidth={5} strokeLinecap="round" transform={`rotate(${tick * 6})`} />
        <circle r={8} fill="#1d1a24" />
      </svg>
    </AbsoluteFill>
  );
};

/** #5: he holds an awards ceremony for her high score, in the bedroom. She keeps playing. */
const CeremonyShot: React.FC = () => {
  const f = useCurrentFrame();
  const g = SHOTS.ceremony[0] - DISSOLVE + f;
  const hop = Math.max(0, Math.sin(f * 0.42)) * 0.08;
  const pose = poseAt(f, [[0, { armLx: 2.9, armLz: 0.45, elbowL: 0.25, gripL: 1, armRx: 2.9, armRz: -0.45, elbowR: 0.25, gripR: 1, headPitch: -0.2 }]]);
  pose.bounce = hop > 0.01 ? 0.05 : -0.03;
  wear(pose, faceMix(EXPR.joy, EXPR.plead, 0.35), 1, Math.max(mouth("zack", g, 1.2), 0.3));
  const at: Vec3 = [0.35, 0, 0.0];
  const cam = lerpCam({ pos: [-0.6, 1.6, 6.4], look: [-0.6, 1.35, -0.3], fov: 52 }, { pos: [-0.6, 1.55, 5.9], look: [-0.6, 1.35, -0.3], fov: 52 }, f / 80);
  return (
    <Scene cam={cam} phoneGlow={[-1.5, 0.95, -0.3]}>
      <Ceremony p={at} />
      <Zack frame={g} pose={pose} p={[at[0], 0.7 + hop, at[2]]} rotY={-0.15} />
      <Jiya frame={g} pose={EXPR.deadpan} />
    </Scene>
  );
};

/** #6: "lagging". Somewhere, a server room is on fire. */
const ServersShot: React.FC = () => {
  const f = useCurrentFrame();
  const cam = shakeCam(lerpCam({ pos: [0, 1.4, 2.6], look: [0, 1.7, -3], fov: 46 }, { pos: [0, 1.45, 1.4], look: [0, 1.8, -3], fov: 46 }, f / 40), f, 0.01);
  const blink = Math.floor(f / 5) % 2 === 0;
  return (
    <AbsoluteFill>
      <FantasyScene cam={cam} exposure={1.0}>
        <ServerRoom />
      </FantasyScene>
      <div style={{ position: "absolute", top: 1280, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, background: "rgba(10,10,14,0.7)", borderRadius: 22, padding: "14px 28px", fontFamily: '"Helvetica Neue", Arial, sans-serif', fontWeight: 800, fontSize: 46, color: "#ff4d4d", opacity: blink ? 1 : 0.55 }}>
          <svg width="56" height="46" viewBox="0 0 28 23">
            {[0, 1, 2, 3].map((i) => (
              <rect key={i} x={i * 7} y={18 - i * 5} width={5} height={5 + i * 5} rx={1.2} fill={i === 0 ? "#ff4d4d" : "rgba(255,255,255,0.18)"} />
            ))}
          </svg>
          ping 9999ms
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** ...and further out: the whole planet, one city burning. */
const EarthShot: React.FC = () => {
  const f = useCurrentFrame();
  const dir: Vec3 = [0.42, 0.47, 0.77];
  const d = interpolate(f, [0, 50], [3.2, 15], { extrapolateRight: "clamp", easing: (t) => 1 - Math.pow(1 - t, 3) });
  return (
    <FantasyScene cam={{ pos: [dir[0] * d, dir[1] * d, dir[2] * d], look: [0, 0, 0], fov: 40 }} exposure={1.0} aperture={0.001}>
      <Earth />
    </FantasyScene>
  );
};

/** A cartoon extreme: dissolves in (with a slow settle) over the end of the shot before it. */
const Dream: React.FC<{ s: readonly [number, number]; children: React.ReactNode }> = ({ s, children }) => (
  <Sequence from={s[0] - DISSOLVE} durationInFrames={s[1] - s[0] + DISSOLVE}>
    <DreamFade>{children}</DreamFade>
  </Sequence>
);

const DreamFade: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const f = useCurrentFrame();
  const k = interpolate(f, [0, DISSOLVE], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ opacity: k, transform: `scale(${1.06 - 0.06 * k})`, filter: k < 1 ? `blur(${(1 - k) * 12}px)` : undefined }}>{children}</AbsoluteFill>;
};

// ── the edit ─────────────────────────────────────────────────────────────────

/**
 * `shorts` is the YouTube Shorts cut: in the comic look its subtitles are lifted clear of the
 * Shorts title and channel bar along the bottom (the film look's captions already sit up top).
 * The default "film" look is the premium one: soft lit 3D with depth of field and calm captions;
 * "comic" brings back the ink, halftone, anime effects and shouty subtitles.
 */
export const Episode3: React.FC<{ look?: Look; shorts?: boolean }> = ({ look = "film", shorts = false }) => (
  <LookCtx.Provider value={look}>
    <AbsoluteFill style={{ background: "#000" }}>
      <Shot s={SHOTS.hook}>
        <Hook />
      </Shot>
      <Shot s={SHOTS.narrate}>
        <Narrate />
      </Shot>
      <Dream s={SHOTS.stadium}>
        <Stadium />
      </Dream>
      <Shot s={SHOTS.sideEye}>
        <SideEye />
      </Shot>
      <Shot s={SHOTS.would}>
        <Would />
      </Shot>
      <Dream s={SHOTS.city}>
        <CityShot />
      </Dream>
      <Shot s={SHOTS.grab}>
        <Grab />
      </Shot>
      <Shot s={SHOTS.slap}>
        <Slap />
      </Shot>
      <Shot s={SHOTS.pro}>
        <Pro />
      </Shot>
      <Sequence from={FREEZE[0]} durationInFrames={FREEZE[1] - FREEZE[0]}>
        <TimeFreeze />
      </Sequence>
      <Shot s={SHOTS.combo}>
        {/* she ignores the countdown and taps early, fast: a run of floors */}
        <PhoneInsert clip="tower" from={3.2} rate={2.2} skin={JIYA.skin} taps={[2, 8, 14, 20, 26, 32]} floors={(fr) => Math.min(19, 13 + Math.floor(fr / 6))} />
      </Shot>
      <Shot s={SHOTS.best}>
        <PhoneInsert clip="tower" from={5.2} rate={1.6} skin={JIYA.skin} taps={[1]} floors={() => 20} newBest={{ at: 4, value: 20 }} />
      </Shot>
      <Dream s={SHOTS.ceremony}>
        <CeremonyShot />
      </Dream>
      <Shot s={SHOTS.nothing}>
        <Nothing />
      </Shot>
      <Shot s={SHOTS.turn}>
        <Turn />
      </Shot>
      <Shot s={SHOTS.fail}>
        {/* his go: one tap, game over */}
        <PhoneInsert clip="tower" from={0.3} rate={1.2} skin={ZACK.skin} taps={[10]} floors={() => 0} gameOver={18} />
      </Shot>
      <Shot s={SHOTS.broken}>
        <Broken />
      </Shot>
      <Dream s={SHOTS.servers}>
        <ServersShot />
      </Dream>
      <Dream s={SHOTS.earth}>
        <EarthShot />
      </Dream>
      {look !== "film" && <HookCaption text={HOOK} />}
      {TYPES.map(([n, label, a, b]) =>
        look === "film" ? <CleanTag key={n} n={n} label={label} at={a} until={b} /> : <ExcuseTag key={n} n={n} label={label.toUpperCase()} at={a} until={b} />,
      )}
      {look !== "film" && <AnimeFx cues={FX} />}
      {look === "film" ? <CleanSubs lines={FILM_LINES} top={300} /> : <Subtitles lines={LINES} top={shorts ? 1150 : 1430} />}
      <Episode3Audio voices={VOICE_LINES_EP3} />
    </AbsoluteFill>
  </LookCtx.Provider>
);

