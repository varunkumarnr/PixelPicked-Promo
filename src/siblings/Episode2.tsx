import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { EXPR, JIYA, Phone, PlasterProp, Pose, REST, Sponge, poseAt } from "./Chibi";
import { VOICE_LINES_EP2, talk } from "./voices";
import { useTexture } from "./Room";
import { Cam, lerpCam, orbit } from "./Stage";
import { Held, JIYA_HEAD, Jiya, Look, LookCtx, LowPhone, PHONE_LOW, Scene, Shot, TWO_SHOT, ZACK_HEAD, Zack, faceMix, push, shakeCam, track, wear } from "./Cast";
import { Episode2Audio } from "./Episode2Audio";
import { AnimeFx, AnimeSubs, FxCue, EndCard, ExcuseTag, HookCaption, Line, LiveScore, PhoneInsert, SplitPhones, Subtitles } from "./Overlays";

/**
 * Zack & Jiya, episode 2: "Every excuse your brother uses after losing".
 * Zack bets that the loser does the dishes. Head to head on their phones he loses round after
 * round, each time with an excuse and each time Jiya answers it without looking up. He begs for
 * best of fifteen, wins exactly one round, and she reminds him of the score: four to one. Dishes.
 */

type Vec3 = [number, number, number];

/** Shot boundaries, in frames at 30fps. */
export const SHOTS = {
  bet: [0, 130],
  round1: [130, 215],
  thumb: [215, 300],
  plaster: [300, 345],
  round2: [345, 400],
  sun: [400, 470],
  window: [470, 535],
  elevenPm: [535, 600],
  round3: [600, 655],
  distract: [655, 715],
  crunch: [715, 790],
  broken: [790, 865],
  takesOver: [865, 960],
  beg: [960, 1040],
  fine: [1040, 1100],
  round5: [1100, 1150],
  celebrate: [1150, 1235],
  payoff: [1235, 1330],
  freeze: [1330, 1440],
} as const;

export const EPISODE2_DURATION = SHOTS.freeze[1];

export const HOOK = "Every excuse your brother uses after losing";

/** Subtitles, timed to the speech in the voice lines (voices.ts). */
export const LINES: Line[] = [
  { from: 20, to: 74, text: "Loser does the DISHES.", who: "zack" },
  { from: 89, to: 110, text: "Deal.", who: "jiya" },
  { from: 228, to: 262, text: "My thumb slipped.", who: "zack" },
  { from: 412, to: 466, text: "The SUN was in my eyes.", who: "zack" },
  { from: 478, to: 532, text: "*crickets*", who: "sfx" },
  { from: 543, to: 590, text: "It's 11 PM.", who: "jiya" },
  { from: 662, to: 711, text: "She was DISTRACTING me!", who: "zack" },
  { from: 744, to: 770, text: "*crunch*", who: "sfx" },
  { from: 796, to: 862, text: "This game is literally BROKEN.", who: "zack" },
  { from: 972, to: 1031, text: "Best of... FIFTEEN.", who: "zack" },
  { from: 1048, to: 1094, text: "...Fine.", who: "jiya" },
  { from: 1159, to: 1228, text: "YESSS! Who's the pro now?!", who: "zack" },
  { from: 1250, to: 1325, text: "That's four to one. Dishes.", who: "jiya" },
];

/** How open a mouth is at a frame, from the loudness of the voice line playing then. */
const mouth = (who: "zack" | "jiya", frame: number, loud = 1) => Math.min(1, talk(who, frame, VOICE_LINES_EP2) * 0.9 * loud);

/** Anime effects (comic and anime versions), by frame (screen positions on the 1080x1920 frame). */
const FX: FxCue[] = [
  { kind: "sweat", at: 225, until: 300, x: 760, y: 560 },
  { kind: "sweat", at: 410, until: 470, x: 300, y: 600 },
  { kind: "speed", at: 660, until: 715, x: 260, y: 900, dark: true },
  { kind: "vein", at: 660, until: 715, x: 800, y: 660 },
  { kind: "menace", at: 735, until: 790 },
  { kind: "text", at: 744, until: 770, text: "ポリッ", x: 780, y: 1050, size: 150, color: "#ffd23f", stroke: "#3a1a00" },
  { kind: "vein", at: 796, until: 865, x: 330, y: 660, size: 180 },
  { kind: "impact", at: 830, until: 832 },
  { kind: "speed", at: 832, until: 865, x: 540, y: 820 },
  { kind: "sweat", at: 975, until: 1040, x: 780, y: 500 },
  { kind: "speed", at: 1010, until: 1040, x: 540, y: 760 },
  { kind: "speed", at: 1150, until: 1235, x: 540, y: 780 },
  { kind: "sparkle", at: 1154, until: 1235, pts: [[200, 560], [880, 640], [180, 1080], [900, 1100]] },
  { kind: "sparkle", at: 1312, until: 1330, pts: [[640, 720]] },
  { kind: "gloom", at: 1350, until: 1440 },
  { kind: "text", at: 1346, until: 1440, text: "ガーン", x: 540, y: 560, size: 210, color: "#dfe8ff", stroke: "#1a2a6e", rot: -6 },
];

/** Tonight's score: every round shown on the split screen, plus the one she plays on his phone. */
const SCORE: [number, number, number][] = [
  [0, 0, 0],
  [186, 0, 1],
  [381, 0, 2],
  [636, 0, 3],
  [910, 0, 4],
  [1131, 1, 4],
];

// ── the shots ────────────────────────────────────────────────────────────────

/** The bet: both on their phones. "Loser does the dishes." "Deal." She doesn't look up. */
const Bet: React.FC = () => {
  const f = useCurrentFrame();
  const g = SHOTS.bet[0] + f;
  const pose = poseAt(f, [
    [0, { ...PHONE_LOW, armRx: 0.3, elbowR: 0.4 }],
    [18, { armRx: 0.45, armRz: -1.2, elbowR: 0.15, gripR: 0.9, headYaw: 0.3, lookX: 0.5 }],
    [70, {}],
    [80, { armRx: 0.55, armRz: -0.1, elbowR: 1.1, gripR: 0.8, headYaw: 0, lookX: 0, headPitch: 0.25, lookY: -0.6 }],
  ]);
  wear(pose, EXPR.smug, track(f, [[10, 0], [18, 1]]), mouth("zack", g));
  const cam = lerpCam(TWO_SHOT, { ...TWO_SHOT, pos: [0.45, 1.42, 3.0] }, f / 130);
  return (
    <Scene cam={cam} post={{ focus: 3.0, aperture: 0.005 }}>
      <Zack frame={g} pose={pose} rotY={-0.15} leftHand={<LowPhone pose={pose} />} />
      <Jiya frame={g} pose={{ ...EXPR.deadpan, mouthOpen: mouth("jiya", g, 0.6) }} />
    </Scene>
  );
};

/** Excuse 1: he holds his thumb up to the light like it's injured. */
const Thumb: React.FC = () => {
  const f = useCurrentFrame();
  const g = SHOTS.thumb[0] + f;
  const pose = poseAt(f, [
    [0, { ...PHONE_LOW, armRx: 0.3, elbowR: 0.4, lid: 0, browRaise: 0.6, smile: -0.2 }],
    [10, { armRx: 1.25, armRz: 0.35, elbowR: 2.0, gripR: 1, headYaw: 0.25, headPitch: -0.05, lookX: 0.5, lookY: 0.2 }],
  ]);
  pose.armRz += Math.sin(f * 0.25) * 0.05;
  wear(pose, EXPR.pain, track(f, [[4, 0], [12, 1]]), mouth("zack", g));
  pose.headRoll = Math.sin(f * 0.18) * 0.06;
  return (
    <Scene cam={push(ZACK_HEAD, f, 85, 3.3, 3.0, 0.12)} phoneGlow={[-0.1, 1.0, 0.75]}>
      <Zack frame={g} pose={pose} leftHand={<LowPhone pose={pose} />} />
    </Scene>
  );
};

/** Jiya, eyes still on her phone, silently holds out a plaster. */
const PlasterShot: React.FC = () => {
  const f = useCurrentFrame();
  const g = SHOTS.plaster[0] + f;
  const out = track(f, [
    [0, 0],
    [12, 1],
  ]);
  return (
    <Scene cam={push(JIYA_HEAD, f, 45, 2.8, 2.65, 0.45, 0.04)}>
      <Jiya
        frame={g}
        phone={false}
        pose={{
          ...EXPR.deadpan,
          armRx: 0.6 + out * 0.75,
          armRz: -0.05 - out * 0.45,
          elbowR: 1.3 - out * 1.1,
          gripR: 0.75,
        }}
        rightHand={(p) => (
          <Held armX={p.armRx} elbow={p.elbowR}>
            <group scale={2.2}>
              <PlasterProp p={[0.0, -0.01, 0.04]} rot={[0.4, 0, 0.3]} />
            </group>
          </Held>
        )}
      />
    </Scene>
  );
};

/** Excuse 2: squinting, hand up against the glare. */
const Sun: React.FC = () => {
  const f = useCurrentFrame();
  const g = SHOTS.sun[0] + f;
  const pose = poseAt(f, [
    [0, { ...PHONE_LOW, lid: 0.15 }],
    [8, { armRx: 2.35, armRz: 0.25, elbowR: 1.9, gripR: 0.1, headPitch: -0.12, headYaw: -0.15, lean: -0.06 }],
  ]);
  wear(pose, EXPR.glare, track(f, [[4, 0], [10, 1]]), mouth("zack", g, 0.8));
  return (
    <Scene cam={push(ZACK_HEAD, f, 70, 3.2, 3.0, -0.15, 0.08)} phoneGlow={[-0.1, 1.0, 0.75]}>
      <Zack frame={g} pose={pose} leftHand={<LowPhone pose={pose} />} />
    </Scene>
  );
};

/** ...it's night. A slow push on the window: moon, city lights, crickets. */
const NightWindow: React.FC = () => {
  const f = useCurrentFrame();
  const cam = lerpCam({ pos: [-0.6, 1.75, 0.6], look: [-0.9, 1.8, -3], fov: 38 }, { pos: [-0.65, 1.77, 0.1], look: [-0.9, 1.8, -3], fov: 38 }, f / 65);
  return (
    <Scene cam={cam} post={{ focus: 3.2 }}>
      <mesh position={[-0.25, 2.25, -3.05]}>
        <circleGeometry args={[0.13, 48]} />
        <meshBasicMaterial color={[3.2, 3.1, 2.6]} toneMapped={false} />
      </mesh>
    </Scene>
  );
};

/** "It's 11 PM." She doesn't look up; at the very end her eyes flick over to him. */
const ElevenPm: React.FC = () => {
  const f = useCurrentFrame();
  const g = SHOTS.elevenPm[0] + f;
  const glance = track(f, [
    [44, 0],
    [50, 1],
  ]);
  return (
    <Scene cam={push(JIYA_HEAD, f, 65, 2.7, 2.5, 0.25, 0.04)}>
      <Jiya frame={g} pose={{ ...EXPR.deadpan, lookX: glance * 0.8, lookY: -0.8 + glance * 0.5, mouthOpen: mouth("jiya", g, 0.6) }} />
    </Scene>
  );
};

/** Excuse 3: he points at Jiya. She's in the background, motionless. */
const Distract: React.FC = () => {
  const f = useCurrentFrame();
  const g = SHOTS.distract[0] + f;
  const pose = poseAt(f, [
    [0, { ...PHONE_LOW }],
    [6, { armRx: 0.45, armRz: -1.35, elbowR: 0.05, gripR: 0.9, twist: 0.1, headYaw: 0.25, lookX: 0.5, lean: 0.06 }],
  ]);
  wear(pose, EXPR.angry, track(f, [[2, 0], [8, 1]]), mouth("zack", g));
  pose.headPitch = Math.sin(f * 0.5) * 0.05;
  return (
    <Scene cam={TWO_SHOT} post={{ focus: 3.0, aperture: 0.006 }}>
      <Zack frame={g} pose={pose} rotY={-0.15} leftHand={<LowPhone pose={pose} />} />
      <Jiya frame={g} pose={EXPR.deadpan} />
    </Scene>
  );
};

/** ...Jiya looks straight at the camera, slowly eats one chip, holding eye contact. Crunch. */
const Crunch: React.FC = () => {
  const f = useCurrentFrame();
  const g = SHOTS.crunch[0] + f;
  const fx = React.useContext(LookCtx) !== "film";
  const up = track(f, [
    [0, 0],
    [12, 1],
  ]);
  const bite = track(f, [
    [14, 0],
    [24, 1],
    [30, 1],
    [38, 0],
  ]);
  const chew = f > 30 && f < 62 ? Math.abs(Math.sin(f * 0.6)) * 0.22 : 0;
  return (
    <Scene cam={push(JIYA_HEAD, f, 75, 2.6, 2.25, 0.25, 0.03)}>
      <Jiya
        frame={g}
        pose={{
          ...faceMix(EXPR.deadpan, EXPR.unimpressed, up),
          headPitch: 0.35 - up * 0.4,
          lookY: -0.8 + up * 0.85,
          armLx: 0.45 + bite * 0.8,
          elbowL: 0.65 + bite * 1.4,
          armLz: 0.2 + bite * 0.2,
          mouthOpen: chew + bite * 0.2,
          glint: fx ? track(f, [[44, 0], [48, 1], [60, 1], [66, 0]]) : 0,
        }}
      />
    </Scene>
  );
};

/** Excuse 4: he shoves the phone at the camera and shakes it. */
const Broken: React.FC = () => {
  const f = useCurrentFrame();
  const g = SHOTS.broken[0] + f;
  const tex = useTexture("siblings/screen-tower.png");
  const pose = poseAt(f, [
    [0, { armRx: 0.6, elbowR: 1.3, gripR: 0.8 }],
    [7, { armRx: 1.45, armRz: 0.1, elbowR: 0.35, gripR: 0.9, lean: 0.12 }],
  ]);
  const rattle = f > 10 && f < 60 ? Math.sin(f * 2.2) : 0;
  pose.armRx += rattle * 0.08;
  pose.armRz += rattle * 0.06;
  wear(pose, EXPR.angry, track(f, [[3, 0], [8, 1]]), mouth("zack", g, 1.2));
  if (f > 40) Object.assign(pose, { eyeWide: 0.6, lidTilt: 0.6, lid: 0.15, pupil: 0.8 });
  const cam = shakeCam(orbit([-0.25, 1.35, 0.45], 2.9, 0.05, 0.02, 40), f, f > 10 && f < 60 ? 0.008 : 0);
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

/** On his knees, hands together: "best of... FIFTEEN." */
const Beg: React.FC = () => {
  const f = useCurrentFrame();
  const g = SHOTS.beg[0] + f;
  const drop = track(f, [
    [0, 0],
    [8, 1],
  ]);
  const pose = poseAt(f, [
    [0, { lid: 0, browRaise: 0.6 }],
    [8, { hipL: 0, hipR: 0, kneeL: 1.55, kneeR: 1.55, armLx: 1.25, armLz: -0.45, elbowL: 0.9, armRx: 1.25, armRz: 0.45, elbowR: 0.9, gripL: 0.5, gripR: 0.5, headPitch: -0.3, lookY: 0.4 }],
    [44, { headPitch: -0.38, lean: 0.1 }],
  ]);
  wear(pose, EXPR.plead, track(f, [[4, 0], [10, 1]]), mouth("zack", g, f > 44 ? 1.3 : 0.8));
  if (f > 48) Object.assign(pose, { eyeWide: 0.8, pupil: 0.75, browAngle: -0.4, browRaise: 1 });
  const p: Vec3 = [-0.3, -0.27 * drop, 0.4];
  const cam = shakeCam(lerpCam({ pos: [0.1, 1.75, 3.3], look: [-0.3, 0.8, 0.35], fov: 42 }, { pos: [0.05, 1.7, 3.0], look: [-0.3, 0.8, 0.35], fov: 42 }, f / 80), f, f > 48 && f < 58 ? 0.012 : 0);
  return (
    <Scene cam={cam}>
      <Zack frame={g} pose={pose} p={p} rotY={0} />
    </Scene>
  );
};

/** Jiya sighs, closes her eyes, and gives in. "...Fine." */
const Fine: React.FC = () => {
  const f = useCurrentFrame();
  const g = SHOTS.fine[0] + f;
  const sigh = track(f, [
    [0, 0],
    [12, 1],
    [40, 1],
    [50, 0],
  ]);
  return (
    <Scene cam={push(JIYA_HEAD, f, 60, 2.6, 2.45, 0.25, 0.04)}>
      <Jiya frame={g} pose={{ ...EXPR.deadpan, lid: 0.6 + sigh * 0.4, headPitch: 0.35 + sigh * 0.15, headRoll: sigh * 0.08, mouthOpen: mouth("jiya", g, 0.6) }} />
    </Scene>
  );
};

/** He wins one. Arms up, jumping, the whole room is his. */
const Celebrate: React.FC = () => {
  const f = useCurrentFrame();
  const g = SHOTS.celebrate[0] + f;
  const tex = useTexture("siblings/screen-tower.png");
  const hop = Math.max(0, Math.sin(f * 0.42)) * 0.16 * (f < 70 ? 1 : 0);
  const pose = poseAt(f, [
    [0, { armRx: 0.6, elbowR: 1.3, gripR: 0.8, lid: 0 }],
    [5, { armLx: 2.9, armLz: 0.45, elbowL: 0.25, gripL: 1, armRx: 2.9, armRz: -0.45, elbowR: 0.25, gripR: 0.9, headPitch: -0.25 }],
  ]);
  pose.bounce = hop > 0.01 ? 0.05 : -0.03;
  wear(pose, EXPR.joy, track(f, [[2, 0], [6, 1]]), Math.max(mouth("zack", g, 1.3), 0.4));
  const cam: Cam = { pos: [0.2, 0.75, 3.5], look: [-0.3, 1.35, 0.4], fov: 44 };
  return (
    <Scene cam={cam}>
      <Zack
        frame={g}
        pose={pose}
        p={[-0.3, hop, 0.4]}
        rotY={0.1}
        rightHand={
          <Held armX={pose.armRx} elbow={pose.elbowR}>
            <Phone screen={tex} p={[0, 0.1, 0.03]} rot={[0, 0, 0]} />
          </Held>
        }
      />
    </Scene>
  );
};

/** "That's four to one. Dishes." Four fingers up, then the tiniest smirk. */
const Payoff: React.FC = () => {
  const f = useCurrentFrame();
  // the glasses glint is an anime effect; the comic version gets it too
  const fx = React.useContext(LookCtx) !== "film";
  const g = SHOTS.payoff[0] + f;
  const up = track(f, [
    [4, 0],
    [12, 1],
  ]);
  return (
    <Scene cam={push(JIYA_HEAD, f, 95, 2.7, 2.4, 0.25, 0.03)}>
      <Jiya
        frame={g}
        phone={false}
        pose={{
          armRx: 0.6 + up * 1.2,
          armRz: -0.05 - up * 0.2,
          elbowR: 1.3 + up * 0.4,
          gripR: 0.6 - up * 0.6,
          headPitch: 0.15,
          lookY: -0.1,
          lookX: 0.3,
          ...faceMix(EXPR.deadpan, { ...EXPR.unimpressed, smirk: 0.7, smile: 0.1, browTilt: 0.6 }, track(f, [[72, 0], [80, 1]])),
          glint: fx ? track(f, [[76, 0], [80, 1]]) : 0,
          mouthOpen: mouth("jiya", g, 0.6),
        }}
      />
    </Scene>
  );
};

/** Zack frozen mid-celebration as it sinks in, and a sponge drops onto his head. */
const Freeze: React.FC = () => {
  const f = useCurrentFrame();
  const g = SHOTS.freeze[0] + f;
  const pose: Pose = {
    ...REST,
    armLx: 2.9,
    armLz: 0.45,
    elbowL: 0.25,
    gripL: 1,
    armRx: 2.9,
    armRz: -0.45,
    elbowR: 0.25,
    gripR: 0.9,
    headPitch: -0.1,
  };
  wear(pose, EXPR.joy, 1);
  wear(pose, EXPR.shock, track(f, [[14, 0], [22, 1]]));
  pose.mouthOpen = track(f, [[0, 0.6], [22, 0.45]]);
  // the sponge falls from above and lands on his head with a little bounce
  const t = Math.max(0, f - 8);
  const fall = Math.min(1, (t / 8) ** 2);
  const bounce = t > 8 ? Math.abs(Math.sin((t - 8) * 0.5)) * 0.05 * Math.exp(-(t - 8) * 0.25) : 0;
  const spongeY = 3.3 - (3.3 - 2.0) * fall + bounce;
  const cam = push([-0.3, 1.6, 0.4], f, 110, 3.3, 3.0, 0.1, 0.08);
  return (
    <Scene cam={cam}>
      <Zack frame={g + 40} pose={pose} rotY={0.1} />
      <Sponge p={[-0.3, spongeY, 0.42]} rot={[0.1, 0.3, 0.12]} />
    </Scene>
  );
};

// ── the edit ─────────────────────────────────────────────────────────────────


const EXCUSES: [number, number, number][] = [
  [1, SHOTS.thumb[0], SHOTS.plaster[1]],
  [2, SHOTS.sun[0], SHOTS.elevenPm[1]],
  [3, SHOTS.distract[0], SHOTS.crunch[1]],
  [4, SHOTS.broken[0], SHOTS.takesOver[1]],
];

const END = SHOTS.freeze[0] + 40;

export const Episode2: React.FC<{ look?: Look }> = ({ look = "comic" }) => {
  const anime = look === "anime";
  return (
    <LookCtx.Provider value={look}>
      <AbsoluteFill style={{ background: "#000" }}>
        <Shot s={SHOTS.bet}>
          <Bet />
        </Shot>
        <Shot s={SHOTS.round1}>
          <SplitPhones at={50} zackFrom={3.4} jiyaFrom={1.2} zackFloors={[2, 5]} jiyaFloors={[2, 13]} />
        </Shot>
        <Shot s={SHOTS.thumb}>
          <Thumb />
        </Shot>
        <Shot s={SHOTS.plaster}>
          <PlasterShot />
        </Shot>
        <Shot s={SHOTS.round2}>
          <SplitPhones at={30} zackFrom={5} jiyaFrom={2.2} zackFloors={[3, 6]} jiyaFloors={[5, 15]} />
        </Shot>
        <Shot s={SHOTS.sun}>
          <Sun />
        </Shot>
        <Shot s={SHOTS.window}>
          <NightWindow />
        </Shot>
        <Shot s={SHOTS.elevenPm}>
          <ElevenPm />
        </Shot>
        <Shot s={SHOTS.round3}>
          <SplitPhones at={30} zackFrom={6.5} jiyaFrom={3} zackFloors={[4, 7]} jiyaFloors={[8, 18]} />
        </Shot>
        <Shot s={SHOTS.distract}>
          <Distract />
        </Shot>
        <Shot s={SHOTS.crunch}>
          <Crunch />
        </Shot>
        <Shot s={SHOTS.broken}>
          <Broken />
        </Shot>
        <Shot s={SHOTS.takesOver}>
          {/* she takes his phone and beats his level one-handed: the game isn't broken */}
          <PhoneInsert
            clip="tower"
            from={2.6}
            rate={1.7}
            skin={JIYA.skin}
            taps={[4, 10, 16, 22, 28, 34]}
            floors={(fr) => Math.round(Math.min(31, 8 + fr * 0.6))}
            newBest={{ at: 40, value: 31 }}
          />
        </Shot>
        <Shot s={SHOTS.beg}>
          <Beg />
        </Shot>
        <Shot s={SHOTS.fine}>
          <Fine />
        </Shot>
        <Shot s={SHOTS.round5}>
          <SplitPhones at={25} zackWins zackFrom={2.6} jiyaFrom={4} zackFloors={[6, 16]} jiyaFloors={[6, 9]} />
        </Shot>
        <Shot s={SHOTS.celebrate}>
          <Celebrate />
        </Shot>
        <Shot s={SHOTS.payoff}>
          <Payoff />
        </Shot>
        <Shot s={SHOTS.freeze}>
          <Freeze />
        </Shot>
        <HookCaption text={HOOK} />
        {EXCUSES.map(([n, a, b]) => (
          <ExcuseTag key={n} n={n} at={a} until={b} />
        ))}
        <LiveScore ticks={SCORE} hideFrom={END} />
        {look !== "film" && <AnimeFx cues={FX} />}
        {anime ? <AnimeSubs lines={LINES} /> : <Subtitles lines={LINES} />}
        <EndCard at={END} zack="1" jiya="4" note="loser does the dishes" episode="EP. 2" />
        <Episode2Audio voices={VOICE_LINES_EP2} />
      </AbsoluteFill>
    </LookCtx.Provider>
  );
};
