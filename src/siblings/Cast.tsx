import React from "react";
import { Freeze as Hold, Sequence, useCurrentFrame } from "remotion";
import { AnimeEyes, Chibi, Chips, JIYA, JIYA_ANIME, Phone, Pose, REST, ZACK, ZACK_ANIME, blink } from "./Chibi";
import { Lights, Room, useTexture } from "./Room";
import { Cam, Stage, lerpCam, orbit } from "./Stage";
import { PostSettings } from "./Post";

/**
 * The cast and set shared by every Zack & Jiya episode: the bedroom at night with the episode's
 * finish, the two of them with their props, and the timing helpers shots are built from.
 */

type Vec3 = [number, number, number];

// ── places in the room ───────────────────────────────────────────────────────

export const ZACK_SPOT: Vec3 = [-0.3, 0, 0.4];
export const JIYA_BED: Vec3 = [-1.7, 0.15, -0.5];
export const ZACK_HEAD: Vec3 = [-0.3, 1.5, 0.4];
export const JIYA_HEAD: Vec3 = [-1.7, 1.1, -0.5];

export const SEATED: Partial<Pose> = { hipL: -1.5, hipR: -1.5, kneeL: 1.45, kneeR: 1.5, lid: 0.5, smile: 0, browRaise: -0.2 };

// ── helpers ──────────────────────────────────────────────────────────────────

export function track(frame: number, keys: [number, number][]): number {
  if (frame <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [f0, v0] = keys[i];
    const [f1, v1] = keys[i + 1];
    if (frame <= f1) {
      const t = (frame - f0) / (f1 - f0);
      const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      return v0 + (v1 - v0) * e;
    }
  }
  return keys[keys.length - 1][1];
}

export const FACE_KEYS = ["lid", "squint", "lidTilt", "eyeWide", "pupil", "browRaise", "browAngle", "browTilt", "smile", "smirk", "mouthWide"] as const;

/**
 * Blends a face preset into a pose by `k` (0..1), so expressions can ease in. The mouth is
 * left to the voice, but a preset's open mouth still shows a little between words.
 */
export function wear(pose: Pose, e: Partial<Pose>, k = 1, voice = 0): Pose {
  for (const key of FACE_KEYS) {
    const v = e[key];
    if (v !== undefined) pose[key] = pose[key] + (v - pose[key]) * k;
  }
  pose.mouthOpen = Math.max(voice, (e.mouthOpen ?? 0) * 0.35 * k);
  return pose;
}

/** Face fields only, blended from one preset to another, for the Jiya pose prop. */
export const faceMix = (a: Partial<Pose>, b: Partial<Pose>, k: number): Partial<Pose> =>
  Object.fromEntries(FACE_KEYS.map((key) => [key, (a[key] ?? REST[key]) + ((b[key] ?? REST[key]) - (a[key] ?? REST[key])) * k]));

/** Counter-rotates a held prop so it keeps the body's orientation whatever the arm does. */
export const Held: React.FC<{ armX: number; elbow: number; children: React.ReactNode }> = ({ armX, elbow, children }) => <group rotation={[armX + elbow, 0, 0]}>{children}</group>;

export const shakeCam = (cam: Cam, frame: number, amt: number): Cam => ({
  ...cam,
  pos: [cam.pos[0] + Math.sin(frame * 3.1) * amt, cam.pos[1] + Math.sin(frame * 4.7 + 1) * amt, cam.pos[2]],
});

/** Slow push-in on a target over a shot, for life in otherwise static close-ups. */
export const push = (target: Vec3, frame: number, len: number, d0: number, d1: number, yaw = 0.1, rise = 0.05): Cam =>
  lerpCam(orbit(target, d0, yaw, rise, 40), orbit(target, d1, yaw, rise, 40), frame / len);

export type Look = "film" | "comic" | "anime";
export const LookCtx = React.createContext<Look>("film");

/** One 3D shot in the bedroom at night, with the episode's finish (film or comic). */
export const Scene: React.FC<{ cam: Cam; children: React.ReactNode; phoneGlow?: Vec3 | null; post?: Partial<PostSettings>; width?: number; height?: number }> = ({
  cam,
  children,
  phoneGlow = null,
  post = {},
  width,
  height,
}) => {
  const frame = useCurrentFrame();
  const look = React.useContext(LookCtx);
  const monitor = useTexture("siblings/screen-archer.png");
  return (
    <Stage
      cam={cam}
      width={width}
      height={height}
      post={{ frame, style: look, ...(look === "film" ? { aperture: 0.016, vignette: 0.5 } : {}), ...post }}
      env={0.12}
      fill={look === "anime" ? 1.3 : look === "film" ? 0.22 : 0.5}
      exposure={look === "anime" ? 1.15 : look === "film" ? 0.92 : 1.0}
    >
      <AnimeEyes.Provider value={look === "anime"}>
        <Lights mood="night" phoneGlow={phoneGlow} phoneGlowIntensity={0.3} />
        <Room monitor={monitor} night />
        {children}
      </AnimeEyes.Provider>
    </Stage>
  );
};

/** Zack standing in the middle of the room, blinking, with whatever pose the shot gives him. */
export const Zack: React.FC<{ pose: Pose; frame: number; p?: Vec3; rotY?: number; rightHand?: React.ReactNode; leftHand?: React.ReactNode; headProp?: React.ReactNode }> = ({ pose, frame, p = ZACK_SPOT, rotY = 0.15, rightHand, leftHand, headProp }) => {
  const b = blink(frame, 1);
  const anime = React.useContext(LookCtx) === "anime";
  return <Chibi look={anime ? ZACK_ANIME : ZACK} p={p} rot={[0, rotY, 0]} pose={{ ...pose, lid: Math.max(pose.lid, b) }} rightHand={rightHand} leftHand={leftHand} headProp={headProp} />;
};

/** Jiya on the bed, phone in her right hand, chips in her left, barely moving. */
export const Jiya: React.FC<{ frame: number; pose?: Partial<Pose>; phone?: boolean; rightHand?: (p: Pose) => React.ReactNode }> = ({ frame, pose = {}, phone = true, rightHand }) => {
  const tex = useTexture("siblings/screen-archer.png");
  const anime = React.useContext(LookCtx) === "anime";
  const p: Pose = {
    ...REST,
    ...SEATED,
    armLx: 0.45,
    armLz: 0.2,
    elbowL: 0.65,
    gripL: 0.8,
    armRx: 0.6,
    armRz: -0.05,
    elbowR: 1.3,
    gripR: 0.6,
    headPitch: 0.35,
    lookY: -0.8,
    lid: 0.6,
    ...pose,
  };
  const b = blink(frame, 3);
  p.lid = Math.max(p.lid, b * 0.6 + p.lid * (1 - b));
  return (
    <Chibi
      look={anime ? JIYA_ANIME : JIYA}
      p={JIYA_BED}
      rot={[0, 0.25, 0]}
      pose={p}
      leftHand={
        <Held armX={p.armLx} elbow={p.elbowL}>
          <group scale={0.72}>
            <Chips p={[0.08, 0.08, 0.06]} />
          </group>
        </Held>
      }
      rightHand={
        rightHand ? (
          rightHand(p)
        ) : phone ? (
          <Held armX={p.armRx} elbow={p.elbowR}>
            <Phone screen={tex} p={[-0.03, 0.06, 0.05]} rot={[0.75, Math.PI, 0]} />
          </Held>
        ) : null
      }
    />
  );
};

/** Zack's phone held low in his left hand while he talks with the other. */
export const LowPhone: React.FC<{ pose: Pose }> = ({ pose }) => {
  const tex = useTexture("siblings/screen-tower.png");
  return (
    <Held armX={pose.armLx} elbow={pose.elbowL}>
      <Phone screen={tex} p={[0.03, 0.06, 0.05]} rot={[0.9, Math.PI, 0]} />
    </Held>
  );
};

export const PHONE_LOW: Partial<Pose> = { armLx: 0.55, armLz: 0.1, elbowL: 1.1, gripL: 0.8 };

export const TWO_SHOT: Cam = { pos: [0.55, 1.45, 3.4], look: [-1.0, 1.25, -0.4], fov: 44 };

/** Comic and anime looks animate "on twos": each drawing holds for two frames. */
export const OnTwos: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const f = useCurrentFrame();
  const look = React.useContext(LookCtx);
  return look === "film" ? <>{children}</> : <Hold frame={f - (f % 2)}>{children}</Hold>;
};

export const Shot: React.FC<{ s: readonly [number, number]; children: React.ReactNode }> = ({ s, children }) => (
  <Sequence from={s[0]} durationInFrames={s[1] - s[0]}>
    <OnTwos>{children}</OnTwos>
  </Sequence>
);
