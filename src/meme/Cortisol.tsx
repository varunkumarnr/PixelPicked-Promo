import React from "react";
import { AbsoluteFill, Audio, OffthreadVideo, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { EXPR, Phone, Pose, poseAt } from "../siblings/Chibi";
import { Held, PHONE_LOW, Scene, ZACK_HEAD, ZACK_SPOT, Zack, push, shakeCam, track, wear } from "../siblings/Cast";
import { RBox, useTexture } from "../siblings/Room";
import { City, FantasyScene } from "../siblings/Cutaways";
import { lerpCam, orbit } from "../siblings/Stage";

/**
 * "Cortisol level" meme reel. It opens in the streamer layout (Zack's cam in the top 30%, Stack
 * Pack in the bottom 70%); losing sends the meter to HIGH, then it cuts full screen to Zack's
 * rage, and each excuse brings the meter back down until he sits smug at LOW. Based on the gaming-page format where a meter card sits on
 * the clip and quoted excuses pile up, scored with the song that format uses, "WHO DO U KNOW
 * (Slowed)", whose beat switch lands on the smug turn. Everything stays above the bottom quarter
 * and clear of the right edge, so the same cut works on Reels and Shorts.
 */

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const FONT = '"Helvetica Neue", Arial, sans-serif';

/** The beats, in frames. */
/** The block shatters (the clip starts just before, so frame 1 is already moving). */
const BREAK = 40;
const RAGE = 82; // full screen: Zack screams at his phone
const KNEES = 104; // ...and drops to his knees
const CALM = 172; // the beat switch: a montage of Zack being cool as the excuses pile up

/** Where the montage cuts: on the song's kicks after the switch, in frames after CALM. */
const CUTS = [0, 34, 67, 98, 130, 163];

/** The streamer split for the gameplay: the cam on top, the game below. */
const CAM_H = 576;
export const CORTISOL_DURATION = 372;

const EXCUSES: { text: string; at: number; x: number; y: number }[] = [
  { text: "my thumb slipped", at: CALM + 4, x: 300, y: 330 },
  { text: "the block was faster", at: CALM + 40, x: 640, y: 450 },
  { text: "the game is rigged", at: CALM + 100, x: 330, y: 960 },
  { text: "i wasn't even trying", at: CALM + 165, x: 680, y: 1090 },
];

/** Meter reading, 0 (LOW) to 1 (HIGH), for a frame. */
const level = (f: number) => {
  if (f < CALM) {
    // normal while playing, spikes as the tower falls, pinned through the rage
    const v = interpolate(f, [0, BREAK - 6, BREAK + 6], [0.5, 0.58, 0.97], clamp);
    return Math.min(1, v + (f > BREAK + 6 ? Math.sin(f * 1.7) * 0.025 : 0) + (f < BREAK ? Math.sin(f * 0.9) * 0.03 : 0));
  }
  const steps = [0.97, 0.75, 0.52, 0.3, 0.06];
  let v = steps[0];
  EXCUSES.forEach((e, i) => {
    const k = spring({ frame: f - e.at, fps: 30, config: { damping: 11, stiffness: 120 } });
    v += (steps[i + 1] - steps[i]) * k;
  });
  return v;
};

// ── pieces ───────────────────────────────────────────────────────────────────

/** The cortisol meter card: five bands from green to red and a needle. */
const Meter: React.FC<{ value: number }> = ({ value }) => {
  const W = 340;
  const cx = W / 2;
  const cy = 210;
  const r = 130;
  const colors = ["#3aa83a", "#8cc63f", "#f2c12e", "#f08a24", "#d93025"];
  const arc = (a0: number, a1: number) => {
    const p = (a: number, rr: number) => [cx + rr * Math.cos(a), cy + rr * Math.sin(a)];
    const [x0, y0] = p(a0, r);
    const [x1, y1] = p(a1, r);
    const [x2, y2] = p(a1, r - 52);
    const [x3, y3] = p(a0, r - 52);
    return `M${x0},${y0} A${r},${r} 0 0 1 ${x1},${y1} L${x2},${y2} A${r - 52},${r - 52} 0 0 0 ${x3},${y3} Z`;
  };
  const a = Math.PI + value * Math.PI;
  return (
    <svg width={W} height={260} style={{ background: "#fff", boxShadow: "0 6px 20px rgba(0,0,0,0.45)" }}>
      <text x={cx} y={34} textAnchor="middle" fontFamily={FONT} fontSize={22} fontWeight={600} fill="#222">CORTISOL LEVEL</text>
      {colors.map((c, i) => <path key={i} d={arc(Math.PI + (i / 5) * Math.PI + 0.01, Math.PI + ((i + 1) / 5) * Math.PI - 0.01)} fill={c} />)}
      <text x={cx - 112} y={cy - 6} textAnchor="middle" fontFamily={FONT} fontSize={15} fill="#333" transform={`rotate(-62 ${cx - 112} ${cy - 6})`}>LOW</text>
      <text x={cx} y={cy - r + 12} textAnchor="middle" fontFamily={FONT} fontSize={15} fill="#333">NORMAL</text>
      <text x={cx + 112} y={cy - 6} textAnchor="middle" fontFamily={FONT} fontSize={15} fill="#333" transform={`rotate(62 ${cx + 112} ${cy - 6})`}>HIGH</text>
      <line x1={cx} y1={cy} x2={cx + (r - 18) * Math.cos(a)} y2={cy + (r - 18) * Math.sin(a)} stroke="#1a1a1a" strokeWidth={9} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={17} fill="#1a1a1a" />
      <circle cx={cx} cy={cy} r={8} fill="#fff" />
    </svg>
  );
};

const textStyle: React.CSSProperties = {
  fontFamily: FONT,
  fontWeight: 500,
  fontSize: 50,
  color: "#fff",
  textShadow: "0 0 6px rgba(0,0,0,0.9), 0 2px 3px rgba(0,0,0,0.9)",
  whiteSpace: "nowrap",
};

/** The streamer cam over the gameplay: Zack locked in, then the block goes and so does his face. */
const StreamerCam: React.FC = () => {
  const f = useCurrentFrame();
  const pose = poseAt(f, [
    [0, { ...PHONE_LOW, headPitch: 0.12, lean: 0.12, lookY: -0.45 }],
    [BREAK, { headPitch: -0.05, lean: -0.05, lookY: 0 }],
  ], undefined, 4);
  wear(pose, f < BREAK ? { ...EXPR.glare, squint: 0.9 } : EXPR.shock, 1, f < BREAK ? 0 : 0.9);
  if (f >= BREAK) pose.headRoll = Math.sin(f * 1.9) * 0.04;
  // aimed left of him, so he sits on the right and the meter has the left side
  const target: [number, number, number] = [ZACK_HEAD[0] - 0.32, ZACK_HEAD[1] - 0.02, ZACK_HEAD[2]];
  const near = orbit([target[0], target[1] + 0.08, target[2]], 1.8, 0, 0.02, 40);
  const far = orbit([target[0] - 0.1, target[1] + 0.1, target[2]], 2.1, 0, 0.02, 40);
  const cam = f < BREAK ? lerpCam(far, near, (f / BREAK) * 0.3) : shakeCam(near, f, 0.01);
  return (
    <Scene cam={cam} width={1080} height={CAM_H}>
      <Zack frame={f} pose={pose} rotY={0} />
    </Scene>
  );
};

const ANGRY = { ...EXPR.angry, browAngle: 1.3, browRaise: -0.8, lidTilt: 1.2, squint: 0.4 };

/** A slow walk cycle, `t` in frames. */
const walk = (t: number, rate = 0.13): Partial<Pose> => {
  const s = Math.sin(t * rate);
  const c = Math.cos(t * rate);
  return { hipL: s * 0.4, hipR: -s * 0.4, kneeL: Math.max(0, c) * 0.45, kneeR: Math.max(0, -c) * 0.45, armLx: -s * 0.3, armRx: s * 0.3, armLz: 0.05, armRz: 0.05, elbowL: 0.35, elbowR: 0.35, gripL: 0.6, gripR: 0.6, bounce: Math.abs(c) * 0.015 };
};

/** Hands on his hips. */
const AKIMBO: Partial<Pose> = { armRx: -0.1, armRz: -0.6, elbowR: 1.5, gripR: 0.9, armLx: -0.1, armLz: -0.6, elbowL: 1.5, gripL: 0.9 };

/** Black "deal with it" sunglasses, worn on the head (see Chibi's headProp). `drop` 0 is hovering above, 1 is on. */
const HEAD_R = 0.37;
const Shades: React.FC<{ drop?: number }> = ({ drop = 1 }) => {
  const R = HEAD_R;
  return (
    <group position={[0, R * 0.08 + (1 - drop) * 0.7, R * 1.0]}>
      {[-1, 1].map((x) => (
        <RBox key={x} p={[x * R * 0.37, 0, 0]} s={[R * 0.62, R * 0.36, 0.035]} c="#0a0a0d" r={0.025} rough={0.15} />
      ))}
      <RBox p={[0, R * 0.1, 0]} s={[R * 0.3, 0.035, 0.03]} c="#0a0a0d" />
      {[-1, 1].map((x) => (
        <RBox key={`arm${x}`} p={[x * R * 0.7, R * 0.1, -R * 0.42]} s={[0.025, 0.03, R * 0.85]} c="#0a0a0d" />
      ))}
      {/* a glint across each lens */}
      {[-1, 1].map((x) => (
        <RBox key={`glint${x}`} p={[x * R * 0.37 - R * 0.08, R * 0.05, 0.02]} s={[R * 0.1, R * 0.26, 0.005]} rot={[0, 0, 0.6]} c="#ffffff" e={0.6} />
      ))}
    </group>
  );
};

/** Stressed #1: extreme close-up, screaming at his phone, the camera shaking with him. */
const Scream: React.FC = () => {
  const f = useCurrentFrame();
  const pose = poseAt(f, [[0, { ...PHONE_LOW, lean: 0.15, headPitch: -0.18 }]]);
  pose.headRoll = Math.sin(f * 2.1) * 0.07;
  pose.headYaw = Math.sin(f * 1.3) * 0.06;
  wear(pose, ANGRY, 1, 1);
  pose.mouthOpen = 1;
  pose.mouthWide = 1;
  const cam = shakeCam(lerpCam(orbit(ZACK_HEAD, 1.75, 0, -0.02, 40), orbit(ZACK_HEAD, 1.5, 0, -0.02, 40), f / (KNEES - RAGE)), f, 0.025);
  return (
    <Scene cam={cam}>
      <Zack frame={RAGE + f} pose={pose} rotY={0} />
    </Scene>
  );
};

/** Stressed #2: he drops to his knees and pounds the floor while his phone slides away. */
const Knees: React.FC = () => {
  const f = useCurrentFrame();
  const tex = useTexture("siblings/screen-tower.png");
  const drop = interpolate(f, [0, 7, 10, 13], [0, 1, 0.93, 1], clamp);
  const pose = poseAt(f, [
    [0, { ...PHONE_LOW, lean: 0.1 }],
    [7, { hipL: 0, hipR: 0, kneeL: 1.55, kneeR: 1.55, lean: 0.75, headPitch: 0.35, armLx: 1.25, armLz: -0.15, elbowL: 0.25, gripL: 1, armRx: 1.25, armRz: -0.15, elbowR: 0.25, gripR: 1 }],
  ], undefined, 6);
  if (f > 12) {
    // pounding the carpet, one fist then the other
    const a = Math.sin(f * 0.75);
    pose.armLx += Math.max(0, a) * 0.6;
    pose.armRx += Math.max(0, -a) * 0.6;
    pose.lean += Math.abs(a) * 0.05;
  }
  wear(pose, { ...EXPR.pain, browAngle: -1 }, 1, 0.75 + Math.abs(Math.sin(f * 0.5)) * 0.25);
  pose.mouthWide = 0.8;
  const slide = Math.max(0, f - 6);
  const at: [number, number, number] = [ZACK_SPOT[0] + 0.15, -0.32 * drop, ZACK_SPOT[2]];
  const cam = shakeCam(lerpCam(orbit([ZACK_SPOT[0], 0.75, at[2]], 4.3, 0.2, 0.1, 40), orbit([ZACK_SPOT[0], 0.7, at[2]], 3.8, 0.2, 0.1, 40), f / (CALM - KNEES)), f, f > 6 && f < 16 ? 0.02 : 0.004);
  return (
    <Scene cam={cam}>
      <Zack frame={KNEES + f} pose={pose} p={[ZACK_SPOT[0], -0.32 * drop, ZACK_SPOT[2]]} rotY={0} />
      {f > 6 && <Phone screen={tex} p={[ZACK_SPOT[0] + 0.25 + slide * 0.004, 0.02, ZACK_SPOT[2] + 0.45 + slide * 0.012]} rot={[-Math.PI / 2, 0, 0.5 + slide * 0.01]} />}
    </Scene>
  );
};

/** The city set at sunset, for the cool shots (its tower never falls here). */
const CitySet: React.FC<{ cam: Parameters<typeof FantasyScene>[0]["cam"]; children: React.ReactNode }> = ({ cam, children }) => (
  <FantasyScene cam={cam} exposure={1.0}>
    <City fall={100000} />
    {children}
  </FantasyScene>
);

const smugFace = (pose: Pose, nod = 0) => {
  wear(pose, EXPR.smug);
  pose.smirk = 1;
  pose.browTilt = 1;
  pose.headPitch += nod;
  return pose;
};

/** A slow nod, frames since the shot started. */
const nod = (t: number) => Math.max(0, Math.sin(t * 0.18)) * 0.1;

/** Calm #1: slow-mo, walking away down the street into the sunset. */
const WalkAway: React.FC = () => {
  const f = useCurrentFrame();
  const z = 4.2 - f * 0.012;
  const pose = smugFace(poseAt(0, [[0, walk(f)]]));
  return (
    <CitySet cam={{ pos: [0.6, 1.25, z + 4.2], look: [0, 1.1, z - 3], fov: 42 }}>
      <Zack frame={CALM + f} pose={pose} p={[0, 0, z]} rotY={Math.PI} />
    </CitySet>
  );
};

/** Calm #2: low angle, the shades drop onto his face, slow nod. */
const ShadesOn: React.FC = () => {
  const f = useCurrentFrame();
  const drop = interpolate(f, [2, 9, 11, 13], [0, 1, 0.94, 1], clamp);
  const pose = smugFace(poseAt(0, [[0, { lean: -0.04, headPitch: -0.1, armLx: 0.05, armRx: 0.05 }]]), f > 13 ? nod(f - 13) : 0);
  return (
    <CitySet cam={lerpCam({ pos: [0.35, 0.8, 5.7], look: [0, 1.45, 3], fov: 40 }, { pos: [0.3, 0.8, 5.35], look: [0, 1.45, 3], fov: 40 }, f / 33)}>
      <Zack frame={CALM + f} pose={pose} p={[0, 0, 3]} rotY={0} headProp={<Shades drop={drop} />} />
    </CitySet>
  );
};

/** Calm #3: in his gaming chair, slowly spinning round to face us, shades on. */
const Chill: React.FC = () => {
  const f = useCurrentFrame();
  const spin = interpolate(f, [0, 24], [1.1, 0], { ...clamp, easing: (t) => 1 - Math.pow(1 - t, 3) });
  const pose = smugFace(poseAt(0, [[0, { hipL: -1.5, hipR: -1.5, kneeL: 1.45, kneeR: 1.45, lean: -0.12, ...AKIMBO, headPitch: -0.08 }]]));
  return (
    <Scene cam={lerpCam(orbit([ZACK_SPOT[0], 1.0, ZACK_SPOT[2]], 3.0, 0, 0.1, 40), orbit([ZACK_SPOT[0], 1.0, ZACK_SPOT[2]], 2.7, 0, 0.1, 40), f / 31)}>
      <group position={[ZACK_SPOT[0], 0, ZACK_SPOT[2]]} rotation={[0, spin, 0]}>
        <group position={[0, 0, -0.05]}>
          <RBox p={[0, 0.5, 0]} s={[0.6, 0.12, 0.6]} c="#1f1f27" r={0.05} />
          <RBox p={[0, 1.0, -0.33]} s={[0.6, 0.95, 0.12]} c="#1f1f27" r={0.06} rot={[-0.15, 0, 0]} />
          <RBox p={[0, 1.02, -0.26]} s={[0.12, 0.8, 0.02]} c="#ff3d6e" r={0.005} e={0.5} rot={[-0.15, 0, 0]} />
        </group>
        <Zack frame={CALM + f} pose={pose} p={[0, -0.08, 0]} rotY={0} headProp={<Shades />} />
      </group>
    </Scene>
  );
};

/** Calm #4: close-up side-eye, the smirk growing. */
const SideEye: React.FC = () => {
  const f = useCurrentFrame();
  const pose = smugFace(poseAt(0, [[0, { headYaw: 0.35, headPitch: -0.05, headRoll: 0.08, lookX: -0.9, lookY: 0.05 }]]));
  pose.headYaw -= Math.min(1, f / 20) * 0.1;
  return (
    <Scene cam={lerpCam(orbit(ZACK_HEAD, 1.7, -0.15, 0.0, 40), orbit(ZACK_HEAD, 1.5, -0.15, 0.0, 40), f / 32)}>
      <Zack frame={CALM + f} pose={pose} rotY={0} />
    </Scene>
  );
};

/** Calm #5: slow-mo, shades on, walking toward the camera with the city behind him. */
const WalkIn: React.FC = () => {
  const f = useCurrentFrame();
  const z = 1.6 + f * 0.012;
  const pose = smugFace(poseAt(0, [[0, walk(f + 10)]]));
  return (
    <CitySet cam={{ pos: [0.25, 0.85, z + 2.4], look: [0, 1.4, z - 1], fov: 42 }}>
      <Zack frame={CALM + f} pose={pose} p={[0, 0, z]} rotY={0} headProp={<Shades />} />
    </CitySet>
  );
};

/** Calm #6: back in his room, hands on hips, shades on: "i wasn't even trying". Cuts back to the game, so it loops. */
const Folded: React.FC = () => {
  const f = useCurrentFrame();
  const pose = smugFace(poseAt(0, [[0, { ...AKIMBO, lean: -0.05, headPitch: -0.1, headRoll: 0.1 }]]), nod(f));
  return (
    <Scene cam={lerpCam(orbit([ZACK_SPOT[0], 1.35, ZACK_SPOT[2]], 2.5, 0.1, 0.03, 40), orbit([ZACK_SPOT[0], 1.4, ZACK_SPOT[2]], 2.15, 0.1, 0.03, 40), f / 37)}>
      <Zack frame={CALM + f} pose={pose} rotY={0} headProp={<Shades />} />
    </Scene>
  );
};

const MONTAGE = [WalkAway, ShadesOn, Chill, SideEye, WalkIn, Folded];

/** Stack Pack in the bottom 70%: the loss, then the "1 BLOCK" screen. */
const Game: React.FC = () => {
  const f = useCurrentFrame();
  const shake = interpolate(f, [BREAK - 2, BREAK + 4, BREAK + 22], [0, 1, 0], clamp);
  return (
    <div style={{ position: "absolute", left: 0, top: CAM_H, width: 1080, height: 1920 - CAM_H, overflow: "hidden", background: "#000" }}>
      <div style={{ position: "absolute", inset: 0, transform: `translate(${Math.sin(f * 2.3) * 14 * shake}px, ${Math.cos(f * 3.1) * 10 * shake}px)` }}>
        <OffthreadVideo src={staticFile("clips/ad/stackpack.mp4")} startFrom={138} muted style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 45%" }} />
      </div>
      <AbsoluteFill style={{ background: "#d00", opacity: interpolate(f, [BREAK - 2, BREAK + 6, RAGE], [0, 0.22, 0.12], clamp), mixBlendMode: "multiply" }} />
    </div>
  );
};

const Excuse: React.FC<{ e: (typeof EXCUSES)[number] }> = ({ e }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (f < e.at) return null;
  const k = spring({ frame: f - e.at, fps, config: { damping: 12, stiffness: 180 } });
  return <div style={{ ...textStyle, position: "absolute", left: e.x, top: e.y, transform: `translateX(-50%) scale(${0.6 + 0.4 * k})`, opacity: k }}>“{e.text}”</div>;
};

// ── the edit ─────────────────────────────────────────────────────────────────

export const Cortisol: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Sequence durationInFrames={RAGE}>
        <StreamerCam />
        <Game />
        <div style={{ position: "absolute", left: 0, right: 0, top: CAM_H - 3, height: 6, background: "#fff" }} />
      </Sequence>
      <Sequence from={RAGE} durationInFrames={KNEES - RAGE}>
        <Scream />
      </Sequence>
      <Sequence from={KNEES} durationInFrames={CALM - KNEES}>
        <Knees />
      </Sequence>
      {MONTAGE.map((Shot, i) => (
        <Sequence key={i} from={CALM + CUTS[i]} durationInFrames={(CUTS[i + 1] ?? CORTISOL_DURATION - CALM) - CUTS[i]}>
          <Shot />
        </Sequence>
      ))}

      {f < CALM && (
        <div style={{ position: "absolute", top: f < RAGE ? CAM_H - 70 : 170, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
          <div style={{ background: "#fff", color: "#000", fontFamily: FONT, fontWeight: 800, fontSize: 70, lineHeight: 1.1, letterSpacing: -1, textAlign: "center", padding: "18px 36px", borderRadius: 24, boxShadow: "0 10px 30px rgba(0,0,0,0.45)" }}>
            admitting you
            <br />
            suck at games 💀
          </div>
        </div>
      )}
      {EXCUSES.map((e) => <Excuse key={e.text} e={e} />)}

      {/* in the cam panel's corner during the gameplay, then low on the left once he's full screen */}
      <div style={{ position: "absolute", left: f < RAGE ? 40 : 50, top: f < RAGE ? 40 : 1180, transform: `scale(${f < RAGE ? 0.8 : 1})`, transformOrigin: "0 0" }}>
        <Meter value={level(f)} />
      </div>

      {/* sound */}
      <Sequence from={BREAK}>
        <Audio src={staticFile("audio/siblings/crack.wav")} volume={0.6} />
      </Sequence>
      {/* "WHO DO U KNOW (Slowed)", cut so its beat switch (35.13s in the song) hits the smug turn; no fade, so the loop is seamless */}
      <Audio src={staticFile("audio/meme/who-do-u-know.wav")} volume={0.7} />
      {EXCUSES.map((e) => (
        <Sequence key={e.at} from={e.at}>
          <Audio src={staticFile("audio/siblings/tap.wav")} volume={0.5} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
