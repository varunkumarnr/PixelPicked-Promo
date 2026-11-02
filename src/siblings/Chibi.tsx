import React, { useMemo } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * Smooth, rounded "chibi" characters for the Zack & Jiya series: big heads, hair made of tapered
 * clumps, fingers, ribbed hoodie cuffs, sneakers, and a face rig (lids, brows, mouth, gaze)
 * driven by plain numbers so shots can keyframe them.
 * Units: feet at y=0, Zack is about 1.9 tall. +z is the character's front.
 */

type Vec3 = [number, number, number];

export type Pose = {
  // whole body
  lean: number; // forward tilt at the hips (radians)
  twist: number; // turn of the upper body
  bounce: number; // vertical squash/stretch, 0 = rest
  // head
  headYaw: number;
  headPitch: number; // + looks down
  headRoll: number;
  // arms: shoulder swing forward (x), out to the side (z), elbow bend, finger curl
  armLx: number;
  armLz: number;
  elbowL: number;
  gripL: number;
  armRx: number;
  armRz: number;
  elbowR: number;
  gripR: number;
  // legs: hip swing (negative = forward, -1.57 = seated), knee bend
  hipL: number;
  hipR: number;
  kneeL: number;
  kneeR: number;
  // face
  lid: number; // 0 = wide open, 0.5 = bored, 1 = closed
  lookX: number; // -1..1
  lookY: number; // -1..1
  browRaise: number; // -1..1
  browAngle: number; // + angry (inner ends down), - worried
  mouthOpen: number; // 0..1
  smile: number; // -1 frown .. 1 smile
  // expression extras
  squint: number; // 0..1 lower lids rise (happy, suspicious, glare)
  lidTilt: number; // + angry (upper lids slope down to the nose), - sad
  eyeWide: number; // 0..1 eyes pop open bigger
  pupil: number; // iris size, 1 normal, 0.7 shocked, 1.15 pleading
  smirk: number; // -1..1 lifts one mouth corner (+ = her/his left on screen right)
  mouthWide: number; // -1 pursed .. 1 stretched (grimace, shout)
  browTilt: number; // -1..1 one brow up, the other down (skeptical)
  glint: number; // 0..1 glasses flash solid white (anime menace)
  reachR: number; // 0 = normal; >0 stretches the right arm cartoon-long (1 = twice the length)
};

export const REST: Pose = {
  lean: 0,
  twist: 0,
  bounce: 0,
  headYaw: 0,
  headPitch: 0,
  headRoll: 0,
  armLx: 0,
  armLz: 0.12,
  elbowL: 0.15,
  gripL: 0.35,
  armRx: 0,
  armRz: -0.12,
  elbowR: 0.15,
  gripR: 0.35,
  hipL: 0,
  hipR: 0,
  kneeL: 0,
  kneeR: 0,
  lid: 0.12,
  lookX: 0,
  lookY: 0,
  browRaise: 0,
  browAngle: 0,
  mouthOpen: 0,
  smile: 0.15,
  squint: 0,
  lidTilt: 0,
  eyeWide: 0,
  pupil: 1,
  smirk: 0,
  mouthWide: 0,
  browTilt: 0,
  glint: 0,
  reachR: 0,
};

/** Ready-made faces to merge into poses; each sets only face fields. */
export const EXPR = {
  neutral: { lid: 0.12, squint: 0, lidTilt: 0, eyeWide: 0, pupil: 1, browRaise: 0, browAngle: 0, browTilt: 0, smile: 0.15, smirk: 0, mouthWide: 0, mouthOpen: 0 },
  joy: { lid: 0, squint: 0.65, lidTilt: 0, eyeWide: 0, pupil: 1, browRaise: 0.6, browAngle: -0.2, browTilt: 0, smile: 1, smirk: 0, mouthWide: 0.4, mouthOpen: 0.75 },
  shock: { lid: 0, squint: 0, lidTilt: 0, eyeWide: 1, pupil: 0.68, browRaise: 1, browAngle: -0.3, browTilt: 0, smile: -0.15, smirk: 0, mouthWide: -0.35, mouthOpen: 0.85 },
  angry: { lid: 0.32, squint: 0.25, lidTilt: 1, eyeWide: 0, pupil: 0.9, browRaise: -0.45, browAngle: 1, browTilt: 0, smile: -0.7, smirk: 0, mouthWide: 0.7, mouthOpen: 0.45 },
  smug: { lid: 0.48, squint: 0.35, lidTilt: 0.2, eyeWide: 0, pupil: 1, browRaise: 0.15, browAngle: 0.1, browTilt: 0.8, smile: 0.35, smirk: 0.9, mouthWide: 0.1, mouthOpen: 0 },
  plead: { lid: 0.12, squint: 0, lidTilt: -0.9, eyeWide: 0.35, pupil: 1.18, browRaise: 0.7, browAngle: -1, browTilt: 0, smile: -0.55, smirk: 0, mouthWide: 0.1, mouthOpen: 0.3 },
  pain: { lid: 0.3, squint: 0.35, lidTilt: -0.7, eyeWide: 0, pupil: 1, browRaise: 0.4, browAngle: -0.9, browTilt: 0, smile: -0.8, smirk: 0, mouthWide: 0.55, mouthOpen: 0.12 },
  glare: { lid: 0.5, squint: 0.75, lidTilt: 0.5, eyeWide: 0, pupil: 0.9, browRaise: -0.3, browAngle: 0.7, browTilt: 0, smile: -0.45, smirk: 0, mouthWide: 0.6, mouthOpen: 0.18 },
  deadpan: { lid: 0.6, squint: 0.1, lidTilt: 0, eyeWide: 0, pupil: 1, browRaise: -0.25, browAngle: 0, browTilt: 0, smile: -0.05, smirk: 0, mouthWide: -0.25, mouthOpen: 0 },
  unimpressed: { lid: 0.55, squint: 0.2, lidTilt: 0, eyeWide: 0, pupil: 0.95, browRaise: -0.1, browAngle: 0, browTilt: -0.7, smile: -0.2, smirk: -0.6, mouthWide: -0.1, mouthOpen: 0 },
} satisfies Record<string, Partial<Pose>>;

export type PoseKey = [number, Partial<Pose>];

const ease = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/**
 * The pose at a frame from keyframes: each key holds until the next, easing between them over
 * `blend` frames that end at the next key. Fields a key leaves out carry over from earlier keys.
 */
export function poseAt(
  frame: number,
  keys: PoseKey[],
  base: Pose = REST,
  blend = 8,
): Pose {
  const filled: Pose[] = [];
  let acc = { ...base };
  for (const [, p] of keys) {
    acc = { ...acc, ...p };
    filled.push(acc);
  }
  let i = 0;
  while (i < keys.length - 1 && frame >= keys[i + 1][0]) i++;
  const cur = filled[i];
  const next = filled[i + 1];
  if (!next) return cur;
  const end = keys[i + 1][0];
  const span = Math.min(blend, end - keys[i][0]);
  const t = Math.max(0, Math.min(1, (frame - (end - span)) / span));
  if (t <= 0) return cur;
  const e = ease(t);
  const out = { ...cur };
  (Object.keys(out) as (keyof Pose)[]).forEach((k) => {
    out[k] = cur[k] + (next[k] - cur[k]) * e;
  });
  return out;
}

/** Natural blinks: every ~3s a 5-frame blink, offset per character. */
export function blink(frame: number, seed = 0): number {
  const period = 97 + (seed % 23);
  const f = (frame + seed * 31) % period;
  return f < 5 ? Math.sin((f / 5) * Math.PI) : 0;
}

/** Mouth movement for talking until the real voice lines drive it. */
export function chatter(frame: number, on: boolean, loud = 1): number {
  if (!on) return 0;
  const v = Math.abs(Math.sin(frame * 0.9) * 0.6 + Math.sin(frame * 2.3) * 0.4);
  return Math.min(1, v * 0.75 * loud);
}

export type Look = {
  height: number; // overall scale
  skin: string;
  blush: string;
  hair: string;
  hoodie: string;
  hoodieDark: string;
  pants: string;
  shoes: string;
  soles: string;
  iris: string;
  style: "zack" | "jiya";
  /** Anime designs: taller proportions, signature hair, outfits and props. */
  anime?: boolean;
  /** A grown-up: adult proportions, an oval head with a jaw, small eyes, a real nose, no blush. */
  mature?: boolean;
  /** Stubble or a short beard, in this colour (mature looks). */
  beard?: string;
};

export const ZACK: Look = {
  height: 1,
  skin: "#f0bf98",
  blush: "#ff8f80",
  hair: "#3b2a22",
  hoodie: "#3d6fe0",
  hoodieDark: "#2c55b8",
  pants: "#2b2f3a",
  shoes: "#ff5a3c",
  soles: "#f6f3ee",
  iris: "#6b3f22",
  style: "zack",
};

export const JIYA: Look = {
  height: 0.8,
  skin: "#f6caa6",
  blush: "#ff8a9a",
  hair: "#2a1c18",
  hoodie: "#c7a8f2",
  hoodieDark: "#a986d8",
  pants: "#f2e6d8",
  shoes: "#ff8fab",
  soles: "#ffffff",
  iris: "#4a2c1c",
  style: "jiya",
};

/**
 * The anime-series designs. Zack: spiky swept-back black hair with one electric-blue streak and a
 * cowlick, orange headphones with bolts, navy track jacket with orange trim over a black tee,
 * fingerless gamer glove, cheek plaster, lanyard of homemade badges. Jiya: long straight
 * princess-cut hair with blunt bangs and an ahoge, giant glasses that glint, lilac cat-ear
 * hoodie with mint trim and sleeves over her hands.
 */
export const ZACK_ANIME: Look = {
  ...ZACK,
  hair: "#17151d",
  hoodie: "#24315e",
  hoodieDark: "#ff7a1a",
  shoes: "#ff7a1a",
  iris: "#c47f1f",
  anime: true,
};

export const JIYA_ANIME: Look = {
  ...JIYA,
  hair: "#1d1626",
  hoodie: "#c9b3f5",
  hoodieDark: "#7fe0c4",
  pants: "#25222e",
  shoes: "#7fe0c4",
  iris: "#7b4fd0",
  anime: true,
};

// ── shared geometry and materials ────────────────────────────────────────────

const v3 = (p: Vec3, k = 1) => new THREE.Vector3(p[0] * k, p[1] * k, p[2] * k);

/** A tube along a curve whose radius tapers from r0 at the root to r1 at the tip. */
function taperedTube(
  points: THREE.Vector3[],
  r0: number,
  r1: number,
  seg = 20,
  radial = 12,
  flat = 1,
): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(points);
  const g = new THREE.TubeGeometry(curve, seg, 1, radial, false);
  const pos = g.attributes.position;
  const v = new THREE.Vector3();
  const frames = curve.computeFrenetFrames(seg, false);
  for (let i = 0; i <= seg; i++) {
    const u = i / seg;
    const c = curve.getPointAt(u);
    const r = r0 + (r1 - r0) * Math.pow(u, 0.9);
    for (let j = 0; j <= radial; j++) {
      const k = i * (radial + 1) + j;
      v.fromBufferAttribute(pos, k).sub(c);
      // squash across the binormal so clumps read as flat locks of hair, not noodles
      const b = frames.binormals[i];
      const along = v.dot(b);
      v.addScaledVector(b, along * (flat - 1));
      v.multiplyScalar(r).add(c);
      pos.setXYZ(k, v.x, v.y, v.z);
    }
  }
  g.computeVertexNormals();
  return g;
}

/** A ribbed band (hoodie hem, cuffs): a short open cylinder with vertical ridges. */
function ribbed(
  radius: number,
  height: number,
  ribs: number,
  depth: number,
): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(
    radius,
    radius,
    height,
    ribs * 4,
    2,
    false,
  );
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const a = Math.atan2(z, x);
    const r = Math.hypot(x, z);
    if (r < 1e-4) continue;
    const k = (r + Math.cos(a * ribs) * depth) / r;
    pos.setX(i, x * k);
    pos.setZ(i, z * k);
  }
  g.computeVertexNormals();
  return g;
}

const SkinMat: React.FC<{ c: string }> = ({ c }) => (
  <meshPhysicalMaterial
    color={c}
    roughness={0.62}
    sheen={0.7}
    sheenColor="#ff9f86"
    sheenRoughness={0.6}
    specularIntensity={0.35}
  />
);

/** A tileable knit normal map: fine vertical ribs with rows of stitches, shared by all fabric. */
let knit: THREE.DataTexture | null = null;
function knitNormal(): THREE.DataTexture {
  if (knit) return knit;
  const n = 128;
  const h = (x: number, y: number) => {
    const rib = Math.abs(Math.sin((x / n) * Math.PI * 16));
    const row = Math.abs(Math.sin((y / n) * Math.PI * 24 + Math.sin((x / n) * Math.PI * 32) * 0.6));
    return rib * 0.7 + row * 0.3;
  };
  const data = new Uint8Array(n * n * 4);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const dx = h((x + 1) % n, y) - h((x - 1 + n) % n, y);
      const dy = h(x, (y + 1) % n) - h(x, (y - 1 + n) % n);
      const v = new THREE.Vector3(-dx * 1.5, -dy * 1.5, 1).normalize();
      const i = (y * n + x) * 4;
      data[i] = (v.x * 0.5 + 0.5) * 255;
      data[i + 1] = (v.y * 0.5 + 0.5) * 255;
      data[i + 2] = (v.z * 0.5 + 0.5) * 255;
      data[i + 3] = 255;
    }
  }
  knit = new THREE.DataTexture(data, n, n, THREE.RGBAFormat);
  knit.wrapS = knit.wrapT = THREE.RepeatWrapping;
  knit.repeat.set(5, 5);
  knit.magFilter = THREE.LinearFilter;
  knit.minFilter = THREE.LinearMipmapLinearFilter;
  knit.generateMipmaps = true;
  knit.needsUpdate = true;
  return knit;
}

const ClothMat: React.FC<{ c: string; rough?: number }> = ({
  c,
  rough = 0.92,
}) => {
  const sheen = useMemo(
    () => new THREE.Color(c).lerp(new THREE.Color("#ffffff"), 0.45),
    [c],
  );
  const normal = useMemo(() => knitNormal(), []);
  return (
    <meshPhysicalMaterial
      color={c}
      roughness={rough}
      sheen={1}
      sheenColor={sheen}
      sheenRoughness={0.45}
      normalMap={normal}
      normalScale={new THREE.Vector2(0.35, 0.35)}
    />
  );
};

const HairMat: React.FC<{ c: string }> = ({ c }) => {
  const sheen = useMemo(
    () => new THREE.Color(c).lerp(new THREE.Color("#c99a7a"), 0.6),
    [c],
  );
  return (
    <meshPhysicalMaterial
      color={c}
      roughness={0.48}
      sheen={0.9}
      sheenColor={sheen}
      sheenRoughness={0.4}
      specularIntensity={0.6}
    />
  );
};

const Ball: React.FC<{
  p?: Vec3;
  r: number;
  s?: Vec3;
  c: string;
  rough?: number;
  e?: number;
  rot?: Vec3;
  opacity?: number;
  seg?: number;
}> = ({
  p = [0, 0, 0],
  r,
  s = [1, 1, 1],
  c,
  rough = 0.6,
  e = 0,
  rot,
  opacity,
  seg = 32,
}) => (
  <mesh position={p} scale={s} rotation={rot} castShadow={opacity === undefined && r > 0.01} receiveShadow>
    <sphereGeometry args={[r, seg, Math.round(seg * 0.7)]} />
    <meshStandardMaterial
      color={c}
      roughness={rough}
      emissive={e ? c : "#000000"}
      emissiveIntensity={e}
      transparent={opacity !== undefined}
      opacity={opacity ?? 1}
      depthWrite={opacity === undefined}
    />
  </mesh>
);

/** A capsule hanging down from its top end (so rotations pivot at the joint). */
const Limb: React.FC<{ len: number; r: number; children: React.ReactNode }> = ({
  len,
  r,
  children,
}) => (
  <mesh position={[0, -len / 2, 0]} castShadow receiveShadow>
    <capsuleGeometry args={[r, len, 10, 28]} />
    {children}
  </mesh>
);

/** Top cap of a sphere: thetaLength is how far down from the top (0..PI) it reaches. */
const Cap: React.FC<{
  r: number;
  theta: number;
  p?: Vec3;
  s?: Vec3;
  rot?: Vec3;
  children: React.ReactNode;
}> = ({ r, theta, p, s, rot, children }) => (
  <mesh position={p} scale={s} rotation={rot} castShadow receiveShadow>
    <sphereGeometry args={[r, 48, 28, 0, Math.PI * 2, 0, theta]} />
    {children}
  </mesh>
);

// ── face ─────────────────────────────────────────────────────────────────────

/** Animated-film eyes: a big, dark, glossy iris with a soft lighter crescent at the bottom. */
function irisTexture(color: string): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  const base = new THREE.Color(color);
  const deep = base.clone().multiplyScalar(0.45);
  const glow = base.clone().lerp(new THREE.Color("#d9925a"), 0.35);
  g.fillStyle = `#${deep.getHexString()}`;
  g.beginPath();
  g.arc(128, 128, 128, 0, Math.PI * 2);
  g.fill();
  // light bouncing up into the lower half of the iris
  const lower = g.createRadialGradient(128, 200, 10, 128, 190, 120);
  lower.addColorStop(0, `#${glow.getHexString()}`);
  lower.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = lower;
  g.beginPath();
  g.arc(128, 128, 118, 0, Math.PI * 2);
  g.fill();
  // dark limbal ring and a large pupil
  g.strokeStyle = "#0d0705";
  g.lineWidth = 14;
  g.beginPath();
  g.arc(128, 128, 120, 0, Math.PI * 2);
  g.stroke();
  const pupil = g.createRadialGradient(128, 122, 30, 128, 122, 70);
  pupil.addColorStop(0, "#050302");
  pupil.addColorStop(0.8, "#0a0504");
  pupil.addColorStop(1, "rgba(10,5,4,0)");
  g.fillStyle = pupil;
  g.beginPath();
  g.arc(128, 122, 70, 0, Math.PI * 2);
  g.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** Turns on the anime eye style (tall glossy irises, eyeliner, sparkles) for everything inside. */
export const AnimeEyes = React.createContext(false);

/** Anime iris: dark at the top fading to a bright, saturated bottom, a tall pupil and painted shines. */
function animeIrisTexture(color: string): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  const base = new THREE.Color(color);
  const top = base.clone().multiplyScalar(0.25);
  const bottom = base.clone().lerp(new THREE.Color("#d9a066"), 0.3).multiplyScalar(1.35);
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, `#${top.getHexString()}`);
  grad.addColorStop(0.45, `#${base.getHexString()}`);
  grad.addColorStop(1, `#${bottom.getHexString()}`);
  g.fillStyle = grad;
  g.beginPath();
  g.arc(128, 128, 128, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = "#140806";
  g.lineWidth = 16;
  g.beginPath();
  g.arc(128, 128, 120, 0, Math.PI * 2);
  g.stroke();
  // tall pupil
  g.fillStyle = "#0b0403";
  g.beginPath();
  g.ellipse(128, 118, 40, 62, 0, 0, Math.PI * 2);
  g.fill();
  // painted shines: a big soft oval up top and a small crescent bottom right
  g.fillStyle = "rgba(255,255,255,0.95)";
  g.beginPath();
  g.ellipse(88, 70, 34, 26, -0.4, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "rgba(255,255,255,0.7)";
  g.beginPath();
  g.ellipse(176, 190, 18, 10, -0.5, 0, Math.PI * 2);
  g.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

const Eye: React.FC<{
  x: number;
  R: number;
  pose: Pose;
  look: Look;
  side: 1 | -1;
}> = ({ x, R, pose, look, side }) => {
  const adult = !!look.mature;
  const e = R * (adult ? 0.12 : 0.185);
  const lx = pose.lookX * e * 0.34;
  const ly = pose.lookY * e * 0.3;
  const lid = Math.min(1, Math.max(0, pose.lid));
  const anime = React.useContext(AnimeEyes) || !!look.anime;
  const iris = useMemo(() => (anime ? animeIrisTexture(look.iris) : irisTexture(look.iris)), [look.iris, anime]);
  const theta = Math.PI * (0.04 + lid * 0.92);
  const lashes = look.style === "jiya";
  const wide = Math.max(0, pose.eyeWide);
  const squint = Math.min(1, Math.max(0, pose.squint));
  const tilt = side * pose.lidTilt * 0.42;
  return (
    <group position={[adult ? x * 0.92 : x, R * (anime ? 0.04 : adult ? 0.14 : 0.06), R * (adult ? 0.9 : 0.86)]} rotation={[0, side * (adult ? 0.14 : 0.32), 0]} scale={[(1 + wide * 0.12) * (anime ? 1.06 : adult ? 1.15 : 1), (1 + wide * 0.22) * (anime ? 1.3 : adult ? 0.8 : 1), 1]}>
      <mesh scale={[1, 1.18, 0.55]}>
        <sphereGeometry args={[e, 40, 28]} />
        <meshPhysicalMaterial
          color="#ebe4dc"
          roughness={0.18}
          clearcoat={1}
          clearcoatRoughness={0.05}
        />
      </mesh>
      {/* iris and pupil, on the flattened front of the eye */}
      <mesh position={[lx, ly - e * 0.04, e * 0.553]} scale={[pose.pupil * (anime ? 0.98 : 1), pose.pupil * (anime ? 1.12 : 1.08), 1]}>
        <circleGeometry args={[e * (anime ? 0.9 : 0.86), 64]} />
        <meshPhysicalMaterial
          map={iris}
          roughness={0.12}
          clearcoat={1}
          clearcoatRoughness={0.02}
          polygonOffset
          polygonOffsetFactor={-2}
        />
      </mesh>
      {/* anime eyeliner: a thick dark stroke along the top of the eye, with a flick at the outer corner */}
      {anime && lid < 0.3 && (
        <group position={[0, 0, e * 0.05]}>
          <mesh rotation={[0, 0, 0.1 * Math.PI]}>
            <torusGeometry args={[e * 1.0, e * 0.1, 8, 48, Math.PI * 0.8]} />
            <meshStandardMaterial color="#1a0d0b" roughness={0.6} />
          </mesh>
          <mesh position={[side * e * 1.02, e * 0.32, 0]} rotation={[0, 0, side * -0.9]}>
            <capsuleGeometry args={[e * 0.07, e * 0.32, 4, 8]} />
            <meshStandardMaterial color="#1a0d0b" roughness={0.6} />
          </mesh>
        </group>
      )}
      {/* catch lights */}
      {!anime && (
      <>
      <Ball
        p={[lx + e * 0.24, ly + e * 0.26, e * 0.6]}
        r={e * 0.13}
        c="#ffffff"
        e={1.4}
        seg={16}
      />
      <Ball
        p={[lx - e * 0.2, ly - e * 0.22, e * 0.59]}
        r={e * 0.06}
        c="#ffffff"
        e={1.2}
        seg={12}
      />
      </>
      )}
      {/* lower lid: gives the eye its shape, and pushes up for a squint */}
      <Cap
        r={e * 1.06}
        theta={Math.PI * (0.16 + squint * 0.3)}
        s={[1, 1.18, 0.6]}
        rot={[Math.PI, 0, 0]}
      >
        <SkinMat c={look.skin} />
      </Cap>
      {/* upper lid slides down and tilts (angry / sad); a dark lash line sits on its edge */}
      <group rotation={[0, 0, tilt]}>
      {lid > 0.01 && (
        <Cap r={e * 1.08} theta={theta} s={[1, 1.18, 0.62]}>
          <SkinMat c={look.skin} />
        </Cap>
      )}
      {lid > (anime ? 0.05 : 0.2) && (
        <group scale={[1, 1.18, 0.62]}>
          {/* lies along the lid's rim (a horizontal circle), front half only */}
          <mesh
            rotation={[Math.PI / 2, 0, 0.05 * Math.PI]}
            position={[0, Math.cos(theta) * e * 1.09, 0]}
          >
            <torusGeometry
              args={[
                Math.sin(theta) * e * 0.97,
                e * (anime ? 0.11 : 0.06),
                8,
                40,
                Math.PI * 0.9,
              ]}
            />
            <meshStandardMaterial color="#1c1210" roughness={0.6} />
          </mesh>
        </group>
      )}
      {lashes &&
        [0.42, 0.62, 0.8].map((k, i) => {
          const phi = Math.PI / 2 - side * k;
          const px = Math.sin(theta) * Math.cos(phi) * e * 1.09;
          const pz = Math.sin(theta) * Math.sin(phi) * e * 1.09 * 0.62;
          const py = Math.cos(theta) * e * 1.09 * 1.18;
          return (
            <mesh
              key={i}
              position={[px, py, pz]}
              rotation={[-0.4, 0, side * (0.7 + i * 0.25)]}
            >
              <capsuleGeometry
                args={[e * 0.025, e * (0.22 + i * 0.04), 4, 8]}
              />
              <meshStandardMaterial color="#1c1210" />
            </mesh>
          );
        })}
      </group>
    </group>
  );
};

/**
 * The mouth as a drawn shape on the face: corners lift for a smile (or one side for a smirk),
 * drop for a frown, the top flattens into a D for a big grin, and it stretches wide for a shout
 * or grimace. Open, it shows top teeth and a tongue; closed, it's a single curved line.
 */
function mouthOutline(R: number, pose: Pose, n = 24) {
  const open = Math.max(0, Math.min(1.2, pose.mouthOpen));
  const sm = Math.max(-1, Math.min(1, pose.smile));
  const w = R * (0.12 + 0.05 * pose.mouthWide + 0.035 * Math.max(0, sm) + open * 0.025);
  const lift = (t: number) => sm * R * 0.07 * t * t + pose.smirk * R * 0.06 * Math.max(0, t) * t;
  const top = open * R * 0.06 * (1 - Math.max(0, sm) * 0.75);
  const bottom = -open * R * (0.2 + Math.max(0, sm) * 0.06);
  const upper: [number, number][] = [];
  const lower: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const t = -1 + (2 * i) / n;
    const k = Math.sqrt(Math.max(0, 1 - t * t));
    upper.push([t * w, lift(t) + top * k]);
    // a sad open mouth droops at the corners and is flatter at the bottom
    lower.push([t * w, lift(t) + bottom * Math.pow(k, sm < 0 ? 0.6 : 1)]);
  }
  return { upper, lower, open, w };
}

/** Bends a flat shape onto the round face so it doesn't float or sink. */
function onFace(g: THREE.BufferGeometry, R: number, z0: number) {
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    pos.setZ(i, z0 - (x * x) / (1.7 * R) - (y * y) / (3 * R));
  }
  g.computeVertexNormals();
  return g;
}

const Mouth: React.FC<{ R: number; pose: Pose; anime?: boolean }> = ({ R, pose, anime }) => {
  const y = -R * (anime ? 0.44 : 0.36);
  const z = R * 0.925;
  const { upper, lower, open } = mouthOutline(R * (anime ? 1.25 : 1), pose);
  const key = [pose.mouthOpen, pose.smile, pose.smirk, pose.mouthWide].map((v) => v.toFixed(3)).join();
  const geos = useMemo(() => {
    if (open < 0.05) {
      const pts = upper.map(([x, yy]) => new THREE.Vector3(x, yy, 0));
      const line = taperedTube(pts, R * 0.02, R * 0.02, 24, 8, 0.8);
      onFace(line, R, 0.004);
      return { line };
    }
    const shape = new THREE.Shape();
    upper.forEach(([x, yy], i) => (i ? shape.lineTo(x, yy) : shape.moveTo(x, yy)));
    [...lower].reverse().forEach(([x, yy]) => shape.lineTo(x, yy));
    const hole = onFace(new THREE.ShapeGeometry(shape, 4), R, 0.002);
    // teeth: a band hanging from the top edge
    const teethDepth = Math.min(R * 0.045, (upper[12][1] - lower[12][1]) * 0.35);
    const tShape = new THREE.Shape();
    const inner = upper.slice(3, -3);
    inner.forEach(([x, yy], i) => (i ? tShape.lineTo(x, yy - R * 0.004) : tShape.moveTo(x, yy - R * 0.004)));
    [...inner].reverse().forEach(([x, yy]) => tShape.lineTo(x * 0.96, yy - teethDepth));
    const teeth = onFace(new THREE.ShapeGeometry(tShape, 2), R, 0.004);
    // tongue: a soft mound sitting in the bottom of the mouth
    const lw = (lower[n2(lower)][0] - lower[0][0]) * 0.32;
    const tongue = new THREE.Shape();
    const by = lower[12][1];
    tongue.moveTo(-lw, by + R * 0.004);
    tongue.quadraticCurveTo(0, by + Math.min(R * 0.07, (upper[12][1] - by) * 0.5), lw, by + R * 0.004);
    tongue.lineTo(-lw, by + R * 0.004);
    const tongueG = onFace(new THREE.ShapeGeometry(tongue, 8), R, 0.0035);
    // lip rim around the opening
    const rimPts = [...upper, ...[...lower].reverse()].map(([x, yy]) => new THREE.Vector3(x, yy, 0));
    const rim = onFace(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rimPts, true), 64, R * 0.011, 6, true), R, 0.003);
    return { hole, teeth, tongue: tongueG, rim };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, R]);
  return (
    <group position={[0, y, z]}>
      {geos.line && (
        <mesh geometry={geos.line}>
          <meshStandardMaterial color="#5a2a28" roughness={0.6} />
        </mesh>
      )}
      {geos.hole && (
        <>
          <mesh geometry={geos.hole}>
            <meshStandardMaterial color="#3d1016" roughness={0.6} polygonOffset polygonOffsetFactor={-1} />
          </mesh>
          <mesh geometry={geos.tongue}>
            <meshStandardMaterial color="#d9606c" roughness={0.5} polygonOffset polygonOffsetFactor={-2} />
          </mesh>
          <mesh geometry={geos.teeth}>
            <meshStandardMaterial color="#fbf6ee" roughness={0.35} polygonOffset polygonOffsetFactor={-3} />
          </mesh>
          <mesh geometry={geos.rim}>
            <meshStandardMaterial color="#b8655c" roughness={0.5} />
          </mesh>
        </>
      )}
    </group>
  );
};
const n2 = (a: unknown[]) => a.length - 1;

/** An eyebrow: a tapered stroke following the brow ridge. */
const Brow: React.FC<{
  x: number;
  R: number;
  pose: Pose;
  side: 1 | -1;
  c: string;
}> = ({ x, R, pose, side, c }) => {
  const geo = useMemo(
    () =>
      taperedTube(
        [
          v3([-0.13 * side, 0, 0], R),
          v3([0.0, 0.025, 0.01], R),
          v3([0.14 * side, -0.005, -0.02], R),
        ],
        R * 0.055,
        R * 0.02,
        16,
        10,
        0.55,
      ),
    [R, side],
  );
  return (
    <mesh
      geometry={geo}
      position={[x + side * pose.browAngle * R * 0.02, R * (0.44 + (pose.browRaise - side * pose.browTilt * 0.6) * 0.15), R * (0.9 - Math.max(0, pose.browRaise) * 0.03)]}
      rotation={[0.2, side * 0.32, side * pose.browAngle * 0.55]}
    >
      <HairMat c={c} />
    </mesh>
  );
};

// ── hair ─────────────────────────────────────────────────────────────────────

type Lock = [Vec3, Vec3, Vec3, number]; // root, bend, tip (in head radii), root thickness

const Locks: React.FC<{
  R: number;
  c: string;
  locks: Lock[];
  flat?: number;
  tip?: number;
}> = ({ R, c, locks, flat = 0.6, tip = 0.4 }) => {
  const geos = useMemo(
    () =>
      locks.map(([a, b, d, w]) =>
        taperedTube(
          [v3(a, R), v3(b, R), v3(d, R)],
          w * R,
          w * R * tip,
          22,
          12,
          flat,
        ),
      ),
    [R, locks, flat, tip],
  );
  return (
    <>
      {geos.map((g, i) => (
        <mesh key={i} geometry={g} castShadow receiveShadow>
          <HairMat c={c} />
        </mesh>
      ))}
    </>
  );
};

/**
 * Hair as a soft mass of flat, tapered clumps (like the animated-film look): each clump grows from
 * a root on the scalp, walks over the head following a flow field, lies flat against it (its wide
 * side faces out), and long hair falls straight down once it passes `hangY`. Two layers, a darker
 * inner one and a lighter outer one, give it depth.
 */
type Clump = { pts: THREE.Vector3[]; w: number; flat: number; tip: number; outer: boolean; root?: THREE.Vector3 };

function clumpGeometry(c: Clump, R: number, seg = 30, radial = 14): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(c.pts.map((p) => p.clone().multiplyScalar(R)), false, "centripetal");
  const pos: number[] = [];
  const idx: number[] = [];
  const out = new THREE.Vector3();
  const N = new THREE.Vector3();
  const B = new THREE.Vector3();
  for (let i = 0; i <= seg; i++) {
    const u = i / seg;
    const P = curve.getPointAt(u);
    const T = curve.getTangentAt(u);
    // "outward" is away from the head centre, or from the vertical axis for hair hanging below it
    out.copy(P).sub(new THREE.Vector3(0, Math.min(P.y, 0), 0)).normalize();
    N.copy(out).addScaledVector(T, -out.dot(T)).normalize();
    B.crossVectors(T, N).normalize();
    const swell = Math.sin(Math.min(1, (u + 0.15) / 0.4) * (Math.PI / 2));
    const prof = swell * (1 - (1 - c.tip) * Math.pow(u, 1.3));
    const wB = c.w * R * prof;
    const wN = c.w * R * c.flat * prof;
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      const sa = Math.sin(a);
      // lens-shaped section: rounder on the outside, flatter against the head
      const y = sa * wN * (sa > 0 ? 1 : 0.45);
      const x = Math.cos(a) * wB;
      pos.push(P.x + B.x * x + N.x * y, P.y + B.y * x + N.y * y, P.z + B.z * x + N.z * y);
    }
  }
  for (let i = 0; i < seg; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j;
      const b = a + radial + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function rng2(seed: number) {
  let x = seed;
  return () => {
    x = (x * 16807) % 2147483647;
    return (x - 1) / 2147483646;
  };
}

type HairStyle = {
  /** Roots must also be at least this far down from the top (polar angle), e.g. for a fringe. */
  from?: (front: number) => number;
  /** How pointed the tips are (0 sharp .. 1 blunt) and how flat the clumps lie. */
  tip?: number;
  count: number; // points tried on the sphere
  /** Polar angle (from the top) of the hairline in a direction; `front` is 1 at the forehead. */
  hairline: (front: number, side: number) => number;
  flow: (p: THREE.Vector3) => THREE.Vector3;
  /** Lowest y a clump from this root may reach before it stops (in head radii). */
  stop: (root: THREE.Vector3) => number;
  len: (root: THREE.Vector3, r: number) => number;
  width: [number, number];
  hangY?: number;
  /** Extra outward puff at the tips, for texture. */
  flick?: number;
};

function growClumps(style: HairStyle, seed: number): Clump[] {
  const rand = rng2(seed);
  const clumps: Clump[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let layer = 0; layer < 2; layer++) {
    const outer = layer === 1;
    for (let i = 0; i < style.count; i++) {
      // even spread of roots (Fibonacci sphere), skipping every other one on the outer layer
      if (outer && i % 2) continue;
      const y = 1 - ((i + (outer ? 0.5 : 0)) / (style.count - 1)) * 2;
      const rr = Math.sqrt(Math.max(0, 1 - y * y));
      const th = i * golden + (outer ? 0.7 : 0);
      const root = new THREE.Vector3(Math.cos(th) * rr, y, Math.sin(th) * rr);
      const theta = Math.acos(root.y);
      const front = root.z / Math.max(1e-3, rr);
      if (theta > style.hairline(front, root.x / Math.max(1e-3, rr))) continue;
      if (style.from && theta < style.from(front)) continue;
      const len = style.len(root, rand());
      const stopY = style.stop(root) + (rand() - 0.5) * 0.06;
      // a little randomness in direction so it looks combed by hand, not by a machine
      const twist = (rand() - 0.5) * 0.5;
      const steps = 14;
      const pts = [root.clone().multiplyScalar(0.97)];
      let q = root.clone();
      let hanging = false;
      let walked = 0;
      const lift = outer ? 0.035 : 0.012;
      for (let k = 1; k <= steps * 3 && walked < len; k++) {
        const step = len / steps;
        if (!hanging) {
          const d = style.flow(q);
          d.addScaledVector(q, -d.dot(q)).normalize();
          d.applyAxisAngle(q, twist);
          q = q.clone().addScaledVector(d, step).normalize();
          const t = walked / len;
          const pt = q.clone().multiplyScalar(1.015 + lift + t * 0.03 + (style.flick ?? 0) * t * t);
          if (style.hangY !== undefined && pt.y < style.hangY) {
            hanging = true;
            q = pt.clone();
          }
          if (pt.y < stopY) break;
          if (k % 1 === 0) pts.push(pt);
        } else {
          // fall straight down, drifting slightly outward so it clears the shoulders
          const flat = new THREE.Vector3(q.x, 0, q.z);
          const r = Math.max(flat.length(), 0.98);
          flat.setLength(r + step * 0.12);
          q = new THREE.Vector3(flat.x, q.y - step, flat.z);
          if (q.y < stopY) break;
          pts.push(q.clone());
        }
        walked += step;
      }
      if (pts.length < 4) continue;
      const [w0, w1] = style.width;
      clumps.push({ pts, w: (w0 + rand() * (w1 - w0)) * (outer ? 0.9 : 1.1), flat: outer ? 0.4 : 0.32, tip: style.tip ?? 0.06, outer, root });
    }
  }
  return clumps;
}

const ZACK_STYLE: HairStyle = {
  count: 150,
  hairline: (front) => (front > 0.5 ? 0.3 * Math.PI : front > -0.3 ? 0.42 * Math.PI : 0.58 * Math.PI),
  // messy fringe: away from a crown at the back, falling forward over the forehead
  flow: (p) => p.clone().sub(new THREE.Vector3(0.1, 0.8, -0.6)).add(new THREE.Vector3(0.15, -0.2, 0.25)),
  stop: (r) => (r.z > 0.35 ? 0.64 : r.z > -0.25 ? 0.12 : -0.2),
  len: (_r, k) => 0.55 + k * 0.3,
  width: [0.17, 0.24],
  flick: 0.05,
};

const JIYA_STYLE: HairStyle = {
  count: 170,
  hairline: (front) => (front > 0.6 ? 0.2 * Math.PI : 0.5 * Math.PI),
  // parted in the middle; bangs comb forward and down, the rest falls down and out from the part
  flow: (p) =>
    p.z > 0.3 && Math.abs(p.x) < 0.6
      ? new THREE.Vector3(p.x * 0.2, -1, 0.5)
      : new THREE.Vector3(Math.sign(p.x || 1) * 0.7, -1, p.z > 0 ? 0.05 : -0.2),
  stop: (r) => (r.z > 0.3 && Math.abs(r.x) < 0.6 ? 0.6 : -0.7),
  len: (r, k) => (r.z > 0.3 && Math.abs(r.x) < 0.6 ? 0.9 : 1.8 + k * 0.4),
  width: [0.17, 0.25],
  hangY: 0.1,
  flick: 0.04,
};

const Clumps: React.FC<{ R: number; c: string; style: HairStyle; seed: number; accent?: { c: string; pick: (root: THREE.Vector3) => boolean } }> = ({ R, c, style, seed, accent }) => {
  const { inner, outer, streak } = useMemo(() => {
    const all = growClumps(style, seed);
    const isAccent = (k: Clump) => !!accent && !!k.root && accent.pick(k.root);
    const merge = (cs: Clump[]) => (cs.length ? mergeGeometries(cs.map((k) => clumpGeometry(k, R))) : null);
    return {
      inner: merge(all.filter((k) => !k.outer && !isAccent(k))),
      outer: merge(all.filter((k) => k.outer && !isAccent(k))),
      streak: merge(all.filter(isAccent)),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [R, style, seed]);
  const dark = useMemo(() => new THREE.Color(c).multiplyScalar(0.6).getStyle(), [c]);
  return (
    <>
      {inner && (
        <mesh geometry={inner} castShadow receiveShadow>
          <HairMat c={dark} />
        </mesh>
      )}
      {outer && (
        <mesh geometry={outer} castShadow receiveShadow>
          <HairMat c={c} />
        </mesh>
      )}
      {streak && accent && (
        <mesh geometry={streak} castShadow receiveShadow>
          <HairMat c={accent.c} />
        </mesh>
      )}
    </>
  );
};

/** Zack (anime): spikes swept up and back like he's mid-jump, plus a few falling over his forehead. */
const ZACK_SPIKES: HairStyle = {
  count: 120,
  hairline: (front) => (front > 0.5 ? 0.27 * Math.PI : front > -0.3 ? 0.42 * Math.PI : 0.58 * Math.PI),
  flow: (p) => new THREE.Vector3(p.x * 0.5, 0.5, -1),
  stop: () => -0.25,
  len: (_r, k) => 0.75 + k * 0.35,
  width: [0.24, 0.34],
  flick: 0.42,
  tip: 0.03,
};

const ZACK_FRINGE: HairStyle = {
  count: 220,
  from: () => 0.12 * Math.PI,
  hairline: (front) => (front > 0.7 ? 0.28 * Math.PI : 0),
  flow: (p) => new THREE.Vector3(p.x * 0.9, -1, 0.4),
  stop: () => 0.52,
  len: () => 0.7,
  width: [0.18, 0.24],
  flick: 0.2,
  tip: 0.03,
};

/** Jiya (anime): long straight princess cut: blunt bangs, chin-length side locks, the rest to her waist. */
const JIYA_HIME: HairStyle = {
  count: 180,
  hairline: (front) => (front > 0.55 ? 0.2 * Math.PI : 0.52 * Math.PI),
  flow: (p) =>
    p.z > 0.3 && Math.abs(p.x) < 0.55
      ? new THREE.Vector3(p.x * 0.15, -1, 0.45)
      : new THREE.Vector3(Math.sign(p.x || 1) * 0.5, -1, p.z > 0 ? 0.05 : -0.25),
  stop: (r) => (r.z > 0.3 && Math.abs(r.x) < 0.55 ? 0.44 : r.z > 0.15 ? -0.95 : -1.75),
  len: (r) => (r.z > 0.3 && Math.abs(r.x) < 0.55 ? 0.95 : 4),
  width: [0.17, 0.25],
  hangY: 0.1,
  flick: 0,
  tip: 0.6,
};

const ZackAnimeHair: React.FC<{ R: number; c: string }> = ({ R, c }) => (
  <group>
    <Cap r={R * 1.0} theta={Math.PI * 0.36} rot={[-0.25, 0, 0]}>
      <HairMat c={c} />
    </Cap>
    <Cap r={R * 0.995} theta={Math.PI * 0.6} rot={[-1.0, 0, 0]}>
      <HairMat c={c} />
    </Cap>
    <Clumps R={R} c={c} style={ZACK_SPIKES} seed={21} accent={{ c: "#2f8bff", pick: (r) => r.x > 0.12 && r.x < 0.5 && r.z > -0.2 }} />
    <Clumps R={R} c={c} style={ZACK_FRINGE} seed={4} accent={{ c: "#2f8bff", pick: (r) => r.x > 0.12 && r.x < 0.5 }} />
    {/* the cowlick */}
    <Locks R={R} c={c} locks={[[[-0.05, 0.98, 0.2], [0.02, 1.55, 0.25], [0.3, 1.62, -0.1], 0.13]]} flat={0.5} tip={0.05} />
  </group>
);

const JiyaAnimeHair: React.FC<{ R: number; c: string }> = ({ R, c }) => (
  <group>
    <Cap r={R * 1.0} theta={Math.PI * 0.42} rot={[-0.3, 0, 0]}>
      <HairMat c={c} />
    </Cap>
    <Cap r={R * 0.995} theta={Math.PI * 0.68} rot={[-1.1, 0, 0]}>
      <HairMat c={c} />
    </Cap>
    <Clumps R={R} c={c} style={JIYA_HIME} seed={9} />
    {/* the ahoge: one strand that refuses to lie down */}
    <Locks R={R} c={c} locks={[[[0, 1.0, 0.05], [0.12, 1.42, 0.12], [0.3, 1.36, 0.36], 0.06]]} flat={0.5} tip={0.1} />
  </group>
);

const ZackHair: React.FC<{ R: number; c: string }> = ({ R, c }) => (
  <group>
    <Cap r={R * 1.0} theta={Math.PI * 0.36} rot={[-0.25, 0, 0]}>
      <HairMat c={c} />
    </Cap>
    <Cap r={R * 0.995} theta={Math.PI * 0.6} rot={[-1.0, 0, 0]}>
      <HairMat c={c} />
    </Cap>
    <Clumps R={R} c={c} style={ZACK_STYLE} seed={11} />
  </group>
);

const JIYA_BUN: Lock[] = [
  // swirl of the bun
  [[-0.2, 1.1, -0.2], [0.05, 1.42, -0.1], [0.28, 1.2, -0.38], 0.2],
  [[0.22, 1.12, -0.12], [0.2, 1.44, -0.4], [-0.15, 1.3, -0.5], 0.2],
  [[0.05, 1.05, -0.5], [-0.25, 1.35, -0.45], [-0.05, 1.5, -0.2], 0.18],
];

const JiyaHair: React.FC<{ R: number; c: string }> = ({ R, c }) => (
  <group>
    <Cap r={R * 1.0} theta={Math.PI * 0.42} rot={[-0.3, 0, 0]}>
      <HairMat c={c} />
    </Cap>
    <Cap r={R * 0.995} theta={Math.PI * 0.68} rot={[-1.1, 0, 0]}>
      <HairMat c={c} />
    </Cap>
    <Clumps R={R} c={c} style={JIYA_STYLE} seed={5} />
    {/* bun and scrunchie */}
    <mesh position={[0, R * 1.2, -R * 0.3]} castShadow>
      <sphereGeometry args={[R * 0.32, 32, 24]} />
      <HairMat c={c} />
    </mesh>
    <Locks R={R} c={c} locks={JIYA_BUN} flat={0.6} tip={0.3} />
    <mesh position={[0, R * 1.02, -R * 0.24]} rotation={[Math.PI / 2 - 0.25, 0, 0]}>
      <torusGeometry args={[R * 0.25, R * 0.085, 14, 32]} />
      <ClothMat c="#ff8fab" />
    </mesh>
  </group>
);

const Glasses: React.FC<{ R: number; big?: boolean; glint?: number }> = ({ R, big, glint = 0 }) => {
  const r = R * (big ? 0.37 : 0.29);
  const gap = R * (big ? 0.42 : 0.37);
  return (
    <group position={[0, R * 0.06, R * 0.98]}>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * gap, 0, 0]} rotation={[0, side * 0.3, 0]}>
          <mesh>
            <torusGeometry args={[r, R * (big ? 0.02 : 0.022), 14, 64]} />
            <meshPhysicalMaterial color="#1d1816" roughness={0.3} clearcoat={1} clearcoatRoughness={0.15} />
          </mesh>
          <mesh position={[0, 0, R * 0.01]}>
            <circleGeometry args={[r * 0.97, 48]} />
            <meshStandardMaterial
              color="#e6f2ff"
              emissive="#ffffff"
              emissiveIntensity={glint * 2.5}
              transparent
              opacity={0.035 + glint * 0.95}
              roughness={0.05}
              depthWrite={false}
            />
          </mesh>
          {/* the glint's diagonal shine streak */}
          {glint > 0.05 && (
            <mesh position={[r * 0.1, r * 0.1, R * 0.02]} rotation={[0, 0, -0.75]}>
              <planeGeometry args={[r * 0.25, r * 1.6]} />
              <meshBasicMaterial color={[3, 3, 3]} transparent opacity={glint} toneMapped={false} />
            </mesh>
          )}
          <mesh position={[side * r * 1.03, 0, -R * 0.45]} rotation={[Math.PI / 2, 0, 0]}>
            <capsuleGeometry args={[R * 0.016, R * 0.9, 4, 8]} />
            <meshStandardMaterial color="#2a2522" roughness={0.3} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, R * 0.05, R * 0.02]} rotation={[0, 0, Math.PI / 2]}>
        <capsuleGeometry args={[R * 0.025, gap * 2 - r * 2 + R * 0.02, 6, 10]} />
        <meshStandardMaterial color="#2a2522" roughness={0.3} />
      </mesh>
    </group>
  );
};

/** Gaming headphones resting around the neck. */
/** A lightning bolt decal. */
const boltShape = (() => {
  const sh = new THREE.Shape();
  [[0.1, 1], [-0.45, -0.05], [-0.02, -0.05], [-0.15, -1], [0.45, 0.15], [0.03, 0.15], [0.1, 1]].forEach(([x, y], i) => (i ? sh.lineTo(x, y) : sh.moveTo(x, y)));
  return sh;
})();

const NeckPhones: React.FC<{ color?: string; bolts?: boolean }> = ({ color = "#1d1f26", bolts }) => (
  <group position={[0, 0.03, 0.02]}>
    <mesh rotation={[Math.PI / 2 + 0.25, 0, 0]}>
      <torusGeometry args={[0.2, 0.026, 12, 48, Math.PI * 1.2]} />
      <meshPhysicalMaterial color={color} roughness={0.35} clearcoat={0.6} />
    </mesh>
    {[-1, 1].map((side) => (
      <group
        key={side}
        position={[side * 0.19, -0.04, 0.1]}
        rotation={[0.4, side * 0.5, Math.PI / 2]}
      >
        <mesh castShadow>
          <cylinderGeometry args={[0.085, 0.085, 0.06, 32]} />
          <meshPhysicalMaterial
            color={color}
            roughness={0.35}
            clearcoat={0.6}
          />
        </mesh>
        {bolts && (
          <mesh position={[0, -0.031, 0]} rotation={[Math.PI / 2, 0, 0]} scale={0.04}>
            <shapeGeometry args={[boltShape]} />
            <meshStandardMaterial color="#ffe14d" side={THREE.DoubleSide} polygonOffset polygonOffsetFactor={-2} />
          </mesh>
        )}
        <mesh position={[0, 0.035, 0]}>
          <torusGeometry args={[0.07, 0.022, 10, 28]} />
          <ClothMat c="#2b2d36" />
        </mesh>
        {!bolts && <mesh position={[0, -0.032, 0]}>
          <cylinderGeometry args={[0.055, 0.055, 0.01, 28]} />
          <meshStandardMaterial
            color="#ff3d6e"
            emissive="#ff3d6e"
            emissiveIntensity={1.2}
            toneMapped={false}
          />
        </mesh>}
      </group>
    ))}
  </group>
);

// ── body parts ───────────────────────────────────────────────────────────────

/** A hand: palm, four curling fingers and a thumb. `grip` 0 = open, 1 = fist. */
const Hand: React.FC<{
  skin: string;
  grip: number;
  side: 1 | -1;
  size: number;
  glove?: boolean;
}> = ({ skin, grip, side, size, glove }) => {
  const curl = 0.25 + grip * 1.15;
  const glv = "#1e2130";
  return (
    <group scale={size} rotation={[0, (-side * Math.PI) / 2, 0]}>
      <mesh position={[0, -0.03, 0]} scale={[1, 1, 0.55]} castShadow>
        <sphereGeometry args={[0.058, 28, 20]} />
        {glove ? <ClothMat c={glv} rough={0.7} /> : <SkinMat c={skin} />}
      </mesh>
      {glove && (
        <mesh position={[0, -0.005, 0]} scale={[1.05, 0.5, 0.62]}>
          <sphereGeometry args={[0.058, 24, 14]} />
          <meshStandardMaterial color="#ff7a1a" roughness={0.6} />
        </mesh>
      )}
      {[-0.033, -0.011, 0.011, 0.033].map((x, i) => {
        const len = [0.036, 0.042, 0.04, 0.032][i];
        return (
          <group
            key={i}
            position={[x, -0.07, 0.004]}
            rotation={[-curl, 0, x * 1.5]}
          >
            <mesh position={[0, -len / 2, 0]} castShadow>
              <capsuleGeometry args={[glove ? 0.015 : 0.0135, len, 6, 12]} />
              {glove ? <ClothMat c={glv} rough={0.7} /> : <SkinMat c={skin} />}
            </mesh>
            <group position={[0, -len, 0]} rotation={[-curl * 0.9, 0, 0]}>
              <mesh position={[0, -len * 0.4, 0]} castShadow>
                <capsuleGeometry args={[0.0125, len * 0.8, 6, 12]} />
                <SkinMat c={skin} />
              </mesh>
            </group>
          </group>
        );
      })}
      {/* thumb */}
      <group
        position={[0.05, -0.03, 0.015]}
        rotation={[-0.3 - grip * 0.6, 0, 0.75]}
      >
        <mesh position={[0, -0.025, 0]} castShadow>
          <capsuleGeometry args={[0.016, 0.04, 6, 12]} />
          <SkinMat c={skin} />
        </mesh>
      </group>
    </group>
  );
};

const RBox: React.FC<{
  s: Vec3;
  p?: Vec3;
  r?: number;
  rot?: Vec3;
  children: React.ReactNode;
}> = ({ s, p, r = 0.02, rot, children }) => {
  const geo = useMemo(
    () => new RoundedBoxGeometry(s[0], s[1], s[2], 4, r),
    [s[0], s[1], s[2], r],
  );
  return (
    <mesh geometry={geo} position={p} rotation={rot} castShadow receiveShadow>
      {children}
    </mesh>
  );
};

/** A chunky sneaker: white sole, coloured upper, toe cap, laces. Sits under the ankle. */
const Sneaker: React.FC<{ look: Look }> = ({ look }) => (
  <group position={[0, -0.035, 0.05]}>
    <RBox s={[0.17, 0.05, 0.28]} p={[0, -0.05, 0]} r={0.022}>
      <meshStandardMaterial color={look.soles} roughness={0.55} />
    </RBox>
    <mesh
      position={[0, 0.0, -0.02]}
      rotation={[Math.PI / 2, 0, 0]}
      scale={[1, 1, 0.8]}
      castShadow
    >
      <capsuleGeometry args={[0.075, 0.12, 10, 24]} />
      <meshPhysicalMaterial
        color={look.shoes}
        roughness={0.6}
        sheen={0.5}
        sheenColor="#ffffff"
      />
    </mesh>
    <mesh position={[0, -0.012, 0.09]} scale={[1, 0.62, 0.8]} castShadow>
      <sphereGeometry args={[0.07, 24, 16]} />
      <meshStandardMaterial color={look.soles} roughness={0.5} />
    </mesh>
    {[0.0, 0.03, 0.06].map((z) => (
      <mesh
        key={z}
        position={[0, 0.058 - z * 0.25, z - 0.01]}
        rotation={[0.4, 0, 0]}
      >
        <boxGeometry args={[0.08, 0.008, 0.012]} />
        <meshStandardMaterial color="#ffffff" roughness={0.6} />
      </mesh>
    ))}
    <mesh position={[0, 0.06, -0.05]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[0.06, 0.016, 8, 24]} />
      <meshStandardMaterial color={look.soles} roughness={0.6} />
    </mesh>
  </group>
);

/** The hoodie body: a capsule with soft folds bunching at the waist. */
/**
 * A head that isn't a ball: full, round cheeks low on the face, a softer narrower chin, a slightly
 * flatter face front and a fuller back of the skull.
 */
/** Stubble: a speckled shadow over the jaw, chin and upper lip, as an alpha map on the head's own UVs. */
function stubbleTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = "#000";
  g.fillRect(0, 0, 512, 256);
  // the face is at u = 0.25 on a three.js sphere; the jaw wraps back towards the ears
  const cx = 0.25 * 512;
  for (let i = 0; i < 9000; i++) {
    const u = (Math.random() - 0.5) * 2;
    const v = Math.random();
    const x = cx + u * 150;
    const y = 256 * (0.6 + v * 0.32);
    // thicker along the jaw and chin, thinning towards the cheeks, a gap under the lower lip
    const jaw = 1 - Math.abs(u) * 0.55;
    const lip = Math.abs(u) < 0.12 && v > 0.12 && v < 0.24 ? 0.25 : 1;
    const a = Math.min(1, Math.max(0, (v - 0.05) * 3)) * jaw * lip;
    g.fillStyle = `rgba(255,255,255,${0.55 * a})`;
    g.fillRect(x, y, 1.6, 1.6);
  }
  // a light moustache over the top lip, speckled like the rest
  for (let i = 0; i < 900; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random());
    g.fillStyle = "rgba(255,255,255,0.4)";
    g.fillRect(cx + Math.cos(a) * r * 30, 256 * 0.6 + Math.sin(a) * r * 6, 1.6, 1.6);
  }
  const t = new THREE.CanvasTexture(c);
  return t;
}

const Stubble: React.FC<{ geometry: THREE.BufferGeometry; c: string }> = ({ geometry, c }) => {
  const alpha = useMemo(stubbleTexture, []);
  return (
    <mesh geometry={geometry} scale={1.006}>
      <meshStandardMaterial color={c} alphaMap={alpha} transparent roughness={1} depthWrite={false} />
    </mesh>
  );
};

function headGeometry(R: number, anime = false, adult = false): THREE.BufferGeometry {
  const g = new THREE.SphereGeometry(R, 96, 72);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i) / R;
    let y = pos.getY(i) / R;
    let z = pos.getZ(i) / R;
    const cheek = Math.exp(-Math.pow((y + 0.28) / 0.32, 2)) * Math.max(0, z + 0.3);
    x *= 1.04 + 0.07 * cheek;
    // chin: taper the very bottom in and nudge it forward
    const low = Math.max(0, -y - (anime ? 0.4 : 0.55));
    x *= 1 - low * (anime ? 0.5 : 0.35);
    z += low * 0.18 * Math.max(0, z);
    if (anime && y < -0.4) y -= (-y - 0.4) * 0.12 * Math.max(0, z + 0.2);
    if (z > 0) z *= 0.95 + 0.04 * cheek;
    else z *= 1.03;
    y *= 0.96;
    if (adult) {
      // a grown-up head: longer than wide, a squared jaw and a chin that comes forward,
      // the temples pulled in a little and the back of the skull rounder
      const jaw = Math.max(0, -y - 0.2);
      x *= 0.9 + jaw * 0.25 - Math.max(0, y - 0.3) * 0.08;
      z += Math.max(0, -y - 0.55) * 0.35 * Math.max(0, z);
      y *= 1.22;
    }
    pos.setXYZ(i, x * R, y * R, z * 0.96 * R);
  }
  g.computeVertexNormals();
  return g;
}

function hoodieGeometry(r: number, h: number): THREE.BufferGeometry {
  const g = new THREE.CapsuleGeometry(r, h, 16, 48);
  const pos = g.attributes.position;
  const n = new THREE.Vector3();
  g.computeVertexNormals();
  const normals = g.attributes.normal;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    n.fromBufferAttribute(normals, i);
    const a = Math.atan2(x, z);
    const low = Math.max(0, Math.min(1, (-y + h * 0.1) / (h * 0.6)));
    const fold =
      Math.sin(y * 55 + Math.sin(a * 3) * 2) * 0.006 * low +
      Math.sin(a * 9 + y * 18) * 0.0035;
    pos.setXYZ(i, x + n.x * fold, y + n.y * fold, z + n.z * fold);
  }
  g.computeVertexNormals();
  return g;
}

/**
 * Zack's hoodie is worn open: a dark tee shows down the front between two zip edges, each a
 * rolled lapel of the hoodie fabric with a line of zip teeth.
 */
const OpenFront: React.FC<{ r: number; h: number; hoodie: string }> = ({ r, h, hoodie }) => {
  const open = 0.32; // half-angle of the gap, radians
  const edge = useMemo(
    () =>
      [-1, 1, -0.88, 0.88].map((side) => {
        const pts: THREE.Vector3[] = [];
        for (let i = 0; i <= 12; i++) {
          const t = i / 12;
          const y = -h / 2 - 0.02 + t * (h + 0.16);
          // the gap widens a little towards the neck
          const a = side * (open + 0.12 * Math.max(0, t - 0.6));
          const rr = (y > h / 2 ? Math.sqrt(Math.max(0, r * r - (y - h / 2) ** 2)) : r) * (Math.abs(side) < 1 ? 1.06 : 1.05);
          pts.push(new THREE.Vector3(Math.sin(a) * rr, y, Math.cos(a) * rr));
        }
        return new THREE.CatmullRomCurve3(pts);
      }),
    [r, h],
  );
  return (
    <group position={[0, h / 2 + 0.06, 0]} scale={[1, 1, 0.82]}>
      {/* the tee */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[r * 1.03, r * 1.03, h, 24, 1, true, -open - 0.04, (open + 0.04) * 2]} />
        <ClothMat c="#22252e" rough={0.95} />
      </mesh>
      <mesh position={[0, h / 2, 0]}>
        <sphereGeometry args={[r * 1.03, 24, 12, Math.PI / 2 - open - 0.16, (open + 0.16) * 2, Math.PI * 0.3, Math.PI * 0.2]} />
        <ClothMat c="#22252e" rough={0.95} />
      </mesh>
      {edge.slice(0, 2).map((curve, i) => (
        <mesh key={i} castShadow>
          <tubeGeometry args={[curve, 40, 0.022, 12, false]} />
          <ClothMat c={hoodie} />
        </mesh>
      ))}
      {/* zip teeth along the inner edge of each side */}
      {edge.slice(2).map((curve, i) => (
        <mesh key={i}>
          <tubeGeometry args={[curve, 40, 0.007, 6, false]} />
          <meshStandardMaterial color="#c9ccd4" metalness={0.7} roughness={0.35} />
        </mesh>
      ))}
    </group>
  );
};

function printTexture(kind: "zack" | "jiya"): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = "#ffffff";
  if (kind === "zack") {
    // a little game controller
    g.beginPath();
    g.roundRect(28, 78, 200, 100, 50);
    g.fill();
    g.fillStyle = "#2c55b8";
    g.fillRect(64, 118, 44, 14);
    g.fillRect(79, 103, 14, 44);
    g.beginPath();
    g.arc(170, 112, 10, 0, Math.PI * 2);
    g.arc(192, 134, 10, 0, Math.PI * 2);
    g.fill();
  } else {
    // a star
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      const r = i % 2 ? 46 : 110;
      g.lineTo(128 + Math.cos(a) * r, 128 + Math.sin(a) * r);
    }
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Zack's cheek plaster, sitting on the curve of his right cheek. */
const Plaster: React.FC<{ R: number }> = ({ R }) => {
  const x = -R * 0.52;
  const y = -R * 0.2;
  const z = Math.sqrt(Math.max(0, R * R - x * x - y * y)) * 0.98;
  return (
    <group position={[x, y, z]} rotation={[0.15, Math.atan2(x, z), 0.35]}>
      <RBox s={[R * 0.26, R * 0.1, R * 0.02]} r={R * 0.009}>
        <meshStandardMaterial color="#f3d2a8" roughness={0.7} />
      </RBox>
      <RBox p={[0, 0, R * 0.008]} s={[R * 0.09, R * 0.075, R * 0.012]} r={R * 0.006}>
        <meshStandardMaterial color="#fbe6cc" roughness={0.7} />
      </RBox>
    </group>
  );
};

/** A lanyard of homemade "tournament" badges hanging on Zack's chest. */
const Lanyard: React.FC<{ y: number; r: number }> = ({ y, r }) => {
  const cord = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.08, y + 0.02, -0.02),
        new THREE.Vector3(-0.06, y - 0.08, r * 0.88),
        new THREE.Vector3(0.02, y - 0.2, r * 0.98),
        new THREE.Vector3(0.07, y - 0.08, r * 0.88),
        new THREE.Vector3(0.08, y + 0.02, -0.02),
      ]),
    [y, r],
  );
  return (
    <group>
      <mesh>
        <tubeGeometry args={[cord, 40, 0.005, 6, false]} />
        <meshStandardMaterial color="#ff7a1a" roughness={0.6} />
      </mesh>
      {[
        ["#ffffff", "#ff7a1a", 0],
        ["#ffe14d", "#24315e", 1],
      ].map(([bg, stripe, i]) => (
        <group key={i as number} position={[0.02 + (i as number) * 0.03, y - 0.255 - (i as number) * 0.02, r * 1.0 + 0.012]} rotation={[-0.1, 0, (i as number) * 0.25 - 0.08]}>
          <RBox s={[0.06, 0.08, 0.004]} r={0.002}>
            <meshStandardMaterial color={bg as string} roughness={0.4} />
          </RBox>
          <mesh position={[0, 0.022, 0.0025]}>
            <planeGeometry args={[0.06, 0.016]} />
            <meshStandardMaterial color={stripe as string} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

/** Cat ears on Jiya's hood, poking up behind her shoulders. */
const CatEars: React.FC<{ y: number; r: number; c: string }> = ({ y, r, c }) => (
  <group position={[0, y + 0.02, -r * 0.7]}>
    {[-1, 1].map((side) => (
      <group key={side} position={[side * 0.12, 0.06, 0]} rotation={[-0.35, 0, side * -0.35]}>
        <mesh castShadow>
          <coneGeometry args={[0.055, 0.11, 4, 1]} />
          <ClothMat c={c} />
        </mesh>
        <mesh position={[0, -0.01, 0.022]} scale={[0.6, 0.6, 0.4]}>
          <coneGeometry args={[0.05, 0.09, 4, 1]} />
          <meshStandardMaterial color="#ffb3cf" roughness={0.8} />
        </mesh>
      </group>
    ))}
  </group>
);

export type ChibiProps = {
  look: Look;
  pose: Pose;
  p?: Vec3;
  rot?: Vec3;
  /** Props held in the hands, positioned at the palm. */
  rightHand?: React.ReactNode;
  leftHand?: React.ReactNode;
  /** Props worn on the head (sunglasses...), in head space: origin at the head's centre, +z out of the face. */
  headProp?: React.ReactNode;
  /** Taller, less chibi proportions: smaller head, longer limbs. */
  tall?: boolean;
};

export const Chibi: React.FC<ChibiProps> = ({
  look,
  pose,
  p = [0, 0, 0],
  rot = [0, 0, 0],
  rightHand,
  leftHand,
  headProp,
  tall = false,
}) => {
  const zack = look.style === "zack";
  // anime designs keep the chibi ("super-deformed") body: cute, readable, made for gag comedy;
  // what changes is the hair, eyes, outfit and props
  const an = !!look.anime;
  const adult = !!look.mature;
  if (adult) tall = true;
  const R = adult ? 0.2 : tall ? (zack ? 0.27 : 0.285) : zack ? 0.37 : 0.4;
  const legLen = adult ? 0.46 : tall ? (zack ? 0.44 : 0.37) : zack ? 0.3 : 0.26;
  const shin = adult ? 0.44 : tall ? (zack ? 0.42 : 0.35) : zack ? 0.26 : 0.22;
  const torsoH = adult ? 0.4 : tall ? (zack ? 0.36 : 0.28) : zack ? 0.3 : 0.22;
  const torsoR = adult ? 0.23 : tall ? (zack ? 0.2 : 0.185) : zack ? 0.25 : 0.22;
  const hipY = legLen + shin + 0.1;
  const upper = adult ? 0.33 : tall ? (zack ? 0.31 : 0.26) : zack ? 0.27 : 0.22;
  const fore = adult ? 0.31 : tall ? (zack ? 0.29 : 0.27) : zack ? 0.25 : 0.2;
  const squash = 1 + pose.bounce;
  const shoulderY = torsoH + torsoR * 0.9;

  const body = useMemo(() => hoodieGeometry(torsoR, torsoH), [torsoR, torsoH]);
  const head = useMemo(() => headGeometry(R, tall && !adult, adult), [R, adult]);
  const hem = useMemo(() => ribbed(torsoR * 0.93, 0.07, 30, 0.004), [torsoR]);
  const cuff = useMemo(() => ribbed(0.084, 0.055, 22, 0.0012), []);
  const ankle = useMemo(() => ribbed(0.095, 0.05, 22, 0.0012), []);
  const print = useMemo(() => printTexture(look.style), [look.style]);
  const strings = useMemo(
    () =>
      [-1, 1].map((side) =>
        taperedTube(
          [
            new THREE.Vector3(side * 0.05, 0, 0),
            new THREE.Vector3(side * 0.06, -0.06, 0.012),
            new THREE.Vector3(side * 0.055 + side * 0.01, -0.13, 0.008),
          ],
          0.009,
          0.008,
          12,
          8,
        ),
      ),
    [],
  );

  const leg = (side: 1 | -1, hip: number, knee: number) => (
    <group position={[side * torsoR * 0.48, 0, 0]} rotation={[hip, 0, 0]}>
      <Limb len={legLen} r={tall ? 0.075 : 0.1}>
        <ClothMat c={look.pants} />
      </Limb>
      <group position={[0, -legLen, 0]} rotation={[knee, 0, 0]}>
        <Limb len={shin} r={tall ? 0.068 : 0.092}>
          <ClothMat c={look.pants} />
        </Limb>
        <mesh geometry={ankle} position={[0, -shin + 0.005, 0]}>
          <ClothMat c={look.pants} rough={0.95} />
        </mesh>
        <group position={[0, -shin - 0.05, 0]}>
          <Sneaker look={look} />
        </group>
      </group>
    </group>
  );

  // cartoon reach: the right arm's upper and fore segments stretch along their length
  const stretch = (side: 1 | -1) => (side === 1 ? 1 + pose.reachR : 1);
  const arm = (
    side: 1 | -1,
    x: number,
    z: number,
    elbow: number,
    grip: number,
    held?: React.ReactNode,
  ) => (
    <group
      position={[side * (torsoR + 0.04), shoulderY, 0]}
      rotation={[-x, 0, side * z]}
    >
      <mesh castShadow>
        <sphereGeometry args={[tall ? 0.078 : 0.095, 28, 20]} />
        <ClothMat c={look.hoodie} />
      </mesh>
      <group scale={[1, stretch(side), 1]}>
        <Limb len={upper} r={tall ? 0.07 : 0.088}>
          <ClothMat c={look.hoodie} />
        </Limb>
      </group>
      <group position={[0, -upper * stretch(side), 0]} rotation={[-elbow, 0, 0]}>
        <group scale={[1, stretch(side), 1]}>
          <Limb len={fore} r={tall ? 0.066 : 0.082}>
            <ClothMat c={look.hoodie} />
          </Limb>
        </group>
        <mesh geometry={cuff} position={[0, -fore * stretch(side) - (an && !zack ? 0.045 : 0.02), 0]} scale={an && !zack ? 1.12 : 1}>
          <ClothMat c={look.hoodieDark} rough={0.95} />
        </mesh>
        <group position={[0, -fore * stretch(side) - 0.045, 0]}>
          <Hand
            skin={look.skin}
            grip={grip}
            side={side}
            size={an && !zack ? 0.8 : zack ? 1.05 : 0.95}
            glove={an && zack && side === 1}
          />
          <group position={[0, -0.04, 0]}>{held}</group>
        </group>
      </group>
    </group>
  );

  return (
    <group position={p} rotation={rot} scale={look.height}>
      <group
        position={[0, hipY, 0]}
        scale={[1 / Math.sqrt(squash), squash, 1 / Math.sqrt(squash)]}
      >
        {leg(-1, pose.hipL, pose.kneeL)}
        {leg(1, pose.hipR, pose.kneeR)}
        {/* upper body pivots at the hips */}
        <group rotation={[pose.lean, pose.twist, 0]}>
          <mesh
            geometry={body}
            position={[0, torsoH / 2 + 0.06, 0]}
            scale={[1, 1, 0.82]}
            castShadow
            receiveShadow
          >
            <ClothMat c={look.hoodie} />
          </mesh>
          <mesh geometry={hem} position={[0, 0.03, 0]} scale={[1, 1, 0.82]}>
            <ClothMat c={look.hoodieDark} rough={0.95} />
          </mesh>
          {zack ? (
            <OpenFront r={torsoR} h={torsoH} hoodie={look.hoodie} />
          ) : (
            /* kangaroo pocket */
            <mesh position={[0, 0.13, torsoR * 0.78]} scale={[1, 0.5, 0.16]}>
              <sphereGeometry args={[torsoR * 0.55, 32, 16]} />
              <ClothMat c={look.hoodieDark} />
            </mesh>
          )}
          {/* chest print */}
          <mesh
            position={[
              zack ? 0.155 : -0.07,
              shoulderY - 0.17,
              torsoR * 0.83 + 0.004,
            ]}
            rotation={[-0.12, 0, 0]}
          >
            <planeGeometry args={[0.1, 0.1]} />
            <meshStandardMaterial
              map={print}
              transparent
              roughness={0.8}
              polygonOffset
              polygonOffsetFactor={-2}
            />
          </mesh>
          {/* hood lying on the back, rim around the neck */}
          <mesh
            position={[0, shoulderY - 0.05, -torsoR * 0.55]}
            rotation={[-1.9, 0, 0]}
            scale={[1.15, 0.7, 0.75]}
            castShadow
          >
            <sphereGeometry
              args={[0.2, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]}
            />
            <meshPhysicalMaterial
              color={look.hoodieDark}
              roughness={0.92}
              sheen={1}
              sheenColor="#ffffff"
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh
            position={[0, shoulderY + 0.02, -0.06]}
            rotation={[Math.PI / 2 + 0.35, 0, 0]}
            castShadow
          >
            <torusGeometry args={[0.15, 0.06, 16, 40]} />
            <ClothMat c={look.hoodie} />
          </mesh>
          {/* drawstrings with metal tips */}
          {!zack && strings.map((g, i) => (
            <group key={i} position={[0, shoulderY - 0.02, torsoR * 0.8]}>
              <mesh geometry={g}>
                <meshStandardMaterial color="#f5f5f5" roughness={0.6} />
              </mesh>
              <mesh position={[(i ? 1 : -1) * 0.065, -0.14, 0.008]}>
                <cylinderGeometry args={[0.011, 0.011, 0.025, 10]} />
                <meshStandardMaterial
                  color="#c9c9c9"
                  metalness={0.9}
                  roughness={0.25}
                />
              </mesh>
            </group>
          ))}
          {zack && (
            <group position={[0, shoulderY + 0.03, 0]}>
              <NeckPhones color={an ? "#ff7a1a" : undefined} bolts={an} />
            </group>
          )}
          {an && zack && <Lanyard y={shoulderY} r={torsoR} />}
          {an && !zack && <CatEars y={shoulderY} r={torsoR} c={look.hoodie} />}
          {arm(-1, pose.armLx, pose.armLz, pose.elbowL, pose.gripL, leftHand)}
          {arm(1, pose.armRx, pose.armRz, pose.elbowR, pose.gripR, rightHand)}
          {/* neck and head */}
          <mesh position={[0, shoulderY + (adult ? 0.08 : 0.05), 0]}>
            <cylinderGeometry args={adult ? [0.06, 0.075, 0.16, 20] : [0.07, 0.08, 0.1, 20]} />
            <SkinMat c={look.skin} />
          </mesh>
          <group
            position={[0, shoulderY + (adult ? 0.12 : 0.06), 0]}
            rotation={[pose.headPitch, pose.headYaw, pose.headRoll]}
          >
            <group position={[0, R * (adult ? 1.12 : 0.92), 0.02]}>
              {headProp}
              <mesh geometry={head} castShadow receiveShadow>
                <SkinMat c={look.skin} />
              </mesh>
              {/* ears with a little inner fold */}
              {[-1, 1].map((side) => (
                <group key={side} position={[side * R * 0.98, 0, 0]}>
                  <mesh scale={[0.5, 1, 0.8]} castShadow>
                    <sphereGeometry args={[R * 0.17, 24, 16]} />
                    <SkinMat c={look.skin} />
                  </mesh>
                  <Ball
                    p={[side * R * 0.05, 0, R * 0.03]}
                    r={R * 0.09}
                    s={[0.4, 1, 0.6]}
                    c={new THREE.Color(look.skin)
                      .multiplyScalar(0.82)
                      .getStyle()}
                    rough={0.6}
                  />
                </group>
              ))}
              {/* nose */}
              {adult && (
                // a real nose: a bridge running down from the brow to the tip
                <mesh position={[0, -R * 0.05, R * 0.9]} rotation={[0.3, 0, 0]} scale={[0.8, 1, 0.7]} castShadow>
                  <capsuleGeometry args={[R * 0.085, R * 0.2, 8, 16]} />
                  <SkinMat c={look.skin} />
                </mesh>
              )}
              <mesh
                position={[0, -R * (an ? 0.16 : adult ? 0.2 : 0.12), R * (adult ? 1.01 : 0.95)]}
                scale={an ? [0.7, 0.6, 0.8] : adult ? [1.25, 0.95, 1] : [1.15, 0.85, 0.85]}
              >
                <sphereGeometry args={[R * (adult ? 0.1 : 0.075), 24, 16]} />
                <SkinMat c={look.skin} />
              </mesh>
              {/* cheeks, and freckles for Jiya; a grown-up gets stubble instead */}
              {adult && look.beard && <Stubble geometry={head} c={look.beard} />}
              {!adult && [-1, 1].map((side) => (
                <Ball
                  key={side}
                  p={[side * R * 0.56, -R * (0.2 - Math.max(0, pose.smile) * 0.05 - pose.squint * 0.04), R * 0.78]}
                  r={R * 0.14}
                  s={[1, 0.6, 0.3]}
                  c={look.blush}
                  opacity={0.32 + Math.max(0, pose.smile) * 0.12}
                />
              ))}
              {!zack && !an &&
                [
                  [-0.5, -0.1],
                  [-0.42, -0.16],
                  [-0.58, -0.17],
                  [0.5, -0.1],
                  [0.42, -0.16],
                  [0.58, -0.17],
                ].map(([x, y], i) => (
                  <Ball
                    key={i}
                    p={[x * R, y * R, R * (0.93 - Math.abs(x) * 0.25)]}
                    r={R * 0.014}
                    c="#b77a5a"
                    seg={8}
                  />
                ))}
              <Eye x={-R * 0.36} R={R} pose={pose} look={look} side={-1} />
              <Eye x={R * 0.36} R={R} pose={pose} look={look} side={1} />
              <Brow x={-R * 0.36} R={R} pose={pose} side={-1} c={look.hair} />
              <Brow x={R * 0.36} R={R} pose={pose} side={1} c={look.hair} />
              <Mouth R={R} pose={pose} anime={an} />
              <group position={[0, adult ? R * 0.2 : 0, 0]} scale={adult ? [0.94, 1.12, 0.98] : 1}>
                {an ? zack ? <ZackAnimeHair R={R} c={look.hair} /> : <JiyaAnimeHair R={R} c={look.hair} /> : zack ? <ZackHair R={R} c={look.hair} /> : <JiyaHair R={R} c={look.hair} />}
              </group>
              {!zack && <Glasses R={R} big={an} glint={pose.glint} />}
              {an && zack && <Plaster R={R} />}
            </group>
          </group>
        </group>
      </group>
    </group>
  );
};

// ── props ────────────────────────────────────────────────────────────────────

/** A phone held in a hand; `screen` is a texture of what's on it. */
export const Phone: React.FC<{
  screen?: THREE.Texture | null;
  p?: Vec3;
  rot?: Vec3;
  glow?: number;
}> = ({ screen, p = [0, -0.02, 0.07], rot = [0, 0, 0], glow = 1 }) => (
  <group position={p} rotation={rot}>
    <RBox s={[0.13, 0.26, 0.014]} r={0.006}>
      <meshPhysicalMaterial
        color="#1b1c22"
        roughness={0.25}
        metalness={0.5}
        clearcoat={1}
      />
    </RBox>
    <mesh position={[0, 0, 0.0075]}>
      <planeGeometry args={[0.118, 0.245]} />
      {screen ? (
        <meshBasicMaterial
          map={screen}
          toneMapped={false}
          color={new THREE.Color(glow, glow, glow)}
        />
      ) : (
        <meshBasicMaterial color="#9fe3ff" />
      )}
    </mesh>
    {/* camera bump on the back */}
    <RBox s={[0.045, 0.045, 0.008]} p={[-0.032, 0.09, -0.01]} r={0.008}>
      <meshPhysicalMaterial color="#2a2b31" roughness={0.3} metalness={0.5} />
    </RBox>
  </group>
);

/** An open bag of chips: a puffy foil pouch with a crimped top and a few chips poking out. */
export const Chips: React.FC<{ p?: Vec3; rot?: Vec3 }> = ({
  p = [0, -0.02, 0.09],
  rot = [0, 0, 0],
}) => {
  const pouch = useMemo(() => {
    const g = new THREE.SphereGeometry(0.1, 32, 24);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      // flatten front-to-back, stretch tall, square off the top, crinkle the sides
      const top = y > 0.04 ? 1 - (y - 0.04) * 2.5 : 1;
      pos.setXYZ(
        i,
        x * 1.05 * (1 + Math.sin(y * 90) * 0.02),
        y * 1.6,
        z * 0.45 * Math.max(0.15, top),
      );
    }
    g.computeVertexNormals();
    return g;
  }, []);
  return (
    <group position={p} rotation={rot}>
      <mesh geometry={pouch} castShadow>
        <meshPhysicalMaterial
          color="#ffb703"
          roughness={0.2}
          metalness={0.45}
          clearcoat={0.6}
        />
      </mesh>
      <mesh position={[0, 0.15, 0]}>
        <boxGeometry args={[0.2, 0.025, 0.012]} />
        <meshStandardMaterial color="#e63946" roughness={0.3} metalness={0.4} />
      </mesh>
      <mesh position={[0, 0.0, 0.043]}>
        <circleGeometry args={[0.05, 28]} />
        <meshStandardMaterial color="#e63946" roughness={0.35} />
      </mesh>
      {[-0.04, 0.0, 0.045].map((x, i) => (
        <mesh
          key={i}
          position={[x, 0.17, 0.01]}
          rotation={[0.4 + i * 0.7, i * 0.9, 0.3 - i * 0.4]}
          scale={[1, 1, 0.22]}
        >
          <sphereGeometry args={[0.032, 14, 10]} />
          <meshStandardMaterial color="#f6c453" roughness={0.7} />
        </mesh>
      ))}
    </group>
  );
};

/** A glass of water. */
export const Glass: React.FC<{ p?: Vec3; rot?: Vec3; level?: number }> = ({
  p = [0, -0.02, 0.07],
  rot = [0, 0, 0],
  level = 0.75,
}) => (
  <group position={p} rotation={rot}>
    <mesh>
      <cylinderGeometry args={[0.055, 0.045, 0.16, 28, 1, true]} />
      <meshPhysicalMaterial
        color="#e8f6ff"
        transparent
        opacity={0.3}
        roughness={0.05}
        clearcoat={1}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
    <mesh position={[0, -0.08 + (0.16 * level) / 2, 0]}>
      <cylinderGeometry args={[0.05, 0.044, 0.16 * level, 28]} />
      <meshPhysicalMaterial
        color="#7cc8ff"
        transparent
        opacity={0.55}
        roughness={0.05}
        depthWrite={false}
      />
    </mesh>
  </group>
);

/** A sticking plaster held out between two fingers. */
export const PlasterProp: React.FC<{ p?: Vec3; rot?: Vec3 }> = ({ p = [0, 0, 0], rot = [0, 0, 0] }) => (
  <group position={p} rotation={rot}>
    <RBox s={[0.13, 0.045, 0.006]} r={0.004}>
      <meshStandardMaterial color="#f3d2a8" roughness={0.7} />
    </RBox>
    <RBox p={[0, 0, 0.004]} s={[0.045, 0.034, 0.005]} r={0.003}>
      <meshStandardMaterial color="#fbe6cc" roughness={0.7} />
    </RBox>
  </group>
);

/** A kitchen sponge: yellow foam with a green scrubby top. */
export const Sponge: React.FC<{ p?: Vec3; rot?: Vec3 }> = ({ p = [0, 0, 0], rot = [0, 0, 0] }) => (
  <group position={p} rotation={rot}>
    <RBox s={[0.2, 0.06, 0.13]} r={0.02}>
      <meshStandardMaterial color="#ffd23f" roughness={0.95} />
    </RBox>
    <RBox p={[0, 0.04, 0]} s={[0.2, 0.025, 0.13]} r={0.01}>
      <meshStandardMaterial color="#3fae5a" roughness={0.9} />
    </RBox>
  </group>
);
