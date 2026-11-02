import React, { useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Lights, RBox, Room, canvasTexture, useTexture } from "../siblings/Room";
import { Cam, Stage, lerpCam, orbit } from "../siblings/Stage";
import { Chibi, Pose, REST, EXPR, blink } from "../siblings/Chibi";
import { GAMES } from "../timeline";
import { useClipFrame } from "./clip";
import { BOTH_OPEN, FOUNDER, Founder, HANDS_DOWN, StudioLights, StudioSet } from "./Studio";

/**
 * The story's picture scenes, all in the studio so the reel feels like one place: the flashback
 * at the Mac, a phone on the desk showing the store, big studios' games on burning cash, one
 * lonely indie game, the PixelPicked feed, and the selfie the reel ends on.
 *
 * Every scene gets its length in frames, where each caption chunk starts (`marks`, from the start
 * of the scene) and `offset`, the reel frame it starts on, so idle motion carries across cuts.
 */

type Vec3 = [number, number, number];
export type SceneProps = { len: number; marks: number[]; offset: number; stickers?: Record<number, string> };

export const DESK_TOP = 0.98;
const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Which chunk is up at frame `f`. */
const chunkAt = (marks: number[], f: number) => marks.filter((m) => f >= m).length - 1;

/** A canvas that is redrawn every frame and used as a texture. */
export function useLiveCanvas(w: number, h: number) {
  return useMemo(() => {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    return { g: c.getContext("2d")!, tex };
  }, [w, h]);
}

export const roundRect = (g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
};

/** One shot in the studio: its lights, its set, the film finish, and whatever the scene adds. */
const InStudio: React.FC<{ cam: Cam; g: number; aperture?: number; props?: boolean; macScreen?: THREE.Texture | null; children: React.ReactNode; exposure?: number }> = ({
  cam,
  g,
  aperture = 0.02,
  props = true,
  macScreen,
  children,
  exposure = 0.95,
}) => (
  <Stage cam={cam} post={{ frame: g, aperture, maxBlur: 0.016, vignette: 0.55, grain: 0.05 }} env={0.1} fill={0.15} exposure={exposure}>
    <StudioLights />
    {/* the clip opens on a loading screen, so the Mac starts a few seconds in */}
    <StudioSet macClip="orbitglide" macTime={4 + g / 30} macScreen={macScreen} props={props} />
    {children}
  </Stage>
);

/** A phone standing on the desk, leaning back a touch on a little stand. */
const DeskPhone: React.FC<{ screen: THREE.Texture; p?: Vec3; rotY?: number }> = ({ screen, p = [0, DESK_TOP, 0.62], rotY = 0 }) => (
  <group position={p} rotation={[0, rotY, 0]}>
    <RBox s={[0.16, 0.012, 0.12]} p={[0, 0.006, -0.03]} c="#26262c" rough={0.4} r={0.005} />
    <group position={[0, 0.42, 0]} rotation={[-0.12, 0, 0]}>
      <RBox s={[0.4, 0.84, 0.04]} c="#0e0e12" r={0.05} rough={0.3} />
      <mesh position={[0, 0, 0.0205]}>
        <planeGeometry args={[0.37, 0.8]} />
        <meshBasicMaterial map={screen} toneMapped={false} />
      </mesh>
    </group>
  </group>
);

// ── childhood ────────────────────────────────────────────────────────────────

/** Him as a kid: the same face, a red hoodie, smaller. */
const KID = { ...FOUNDER, hoodie: "#d8423a", hoodieDark: "#a9302b" };

/** A little pixel platformer on the bedroom monitor: a hero hopping over blocks, coins to grab. */
export function drawPixelGame(g: CanvasRenderingContext2D, f: number) {
  const W = 512;
  const H = 288;
  const px = 8;
  const sky = g.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#5c94fc");
  sky.addColorStop(1, "#a4c8ff");
  g.fillStyle = sky;
  g.fillRect(0, 0, W, H);
  const scroll = (f * 2) % 64;
  // clouds
  g.fillStyle = "#ffffff";
  for (let i = 0; i < 4; i++) {
    const x = ((i * 150 - f * 0.6) % 600) + 40;
    g.fillRect(x, 40 + (i % 2) * 30, px * 6, px * 2);
    g.fillRect(x + px, 32 + (i % 2) * 30, px * 4, px);
  }
  // ground and floating blocks
  for (let x = -scroll; x < W; x += 32) {
    g.fillStyle = "#c84c0c";
    g.fillRect(x, H - 48, 31, 23);
    g.fillRect(x, H - 24, 31, 24);
    g.fillStyle = "#fcbcb0";
    g.fillRect(x, H - 48, 31, 3);
  }
  for (let i = 0; i < 3; i++) {
    const x = ((i * 190 + 260 - f * 2) % 640) - 60;
    g.fillStyle = "#fc9838";
    g.fillRect(x, 140, 30, 30);
    g.fillStyle = "#c84c0c";
    g.fillRect(x + 12, 148, 6, 14);
    // coin above
    if (Math.floor(f / 6 + i) % 2 === 0) {
      g.fillStyle = "#fcd800";
      g.fillRect(x + 10, 110, 10, 16);
    }
  }
  // the hero, hopping
  const jump = Math.abs(Math.sin(f * 0.12)) * 70;
  const hx = 120;
  const hy = H - 48 - 32 - jump;
  g.fillStyle = "#e40058";
  g.fillRect(hx, hy, 24, 10);
  g.fillStyle = "#fcbcb0";
  g.fillRect(hx + 2, hy + 10, 20, 10);
  g.fillStyle = "#0058f8";
  g.fillRect(hx, hy + 20, 24, 12);
  // score
  g.fillStyle = "#ffffff";
  g.font = "bold 20px Courier New, monospace";
  g.fillText(`SCORE ${String(Math.floor(f * 7)).padStart(5, "0")}`, 16, 28);
}

/** Years back: him as a kid in his bedroom, glued to a little pixel game on the monitor. */
export const Childhood: React.FC<SceneProps> = ({ len, offset }) => {
  const f = useCurrentFrame();
  const g = f + offset;
  const { g: ctx, tex } = useLiveCanvas(512, 288);
  drawPixelGame(ctx, f);
  tex.needsUpdate = true;
  const cam = lerpCam({ pos: [0.55, 1.55, -0.45], look: [1.7, 1.1, -2.5], fov: 40 }, { pos: [0.75, 1.5, -0.8], look: [1.7, 1.12, -2.55], fov: 36 }, f / len);
  const bob = Math.sin(g * 0.35) * 0.04;
  return (
    <AbsoluteFill style={{ filter: "sepia(0.4) saturate(0.9) contrast(1.05)" }}>
      <Stage cam={cam} post={{ frame: g, aperture: 0.014, vignette: 0.6, grain: 0.07 }} env={0.12} fill={0.25} exposure={0.95}>
        <Lights mood="night" phoneGlow={null} />
        <Room monitor={tex} night />
        <pointLight position={[1.7, 1.2, -2.2]} intensity={2.5} distance={2.5} decay={1.6} color="#9cc0ff" />
        <group position={[1.62, 0, -1.8]} rotation={[0, Math.PI + 0.15, 0]} scale={0.78}>
          <Chibi
            look={KID}
            pose={{
              ...REST,
              ...EXPR.joy,
              mouthOpen: 0.35,
              armLx: 1.2,
              armRx: 1.2,
              elbowL: 0.6 + bob,
              elbowR: 0.6 - bob,
              gripL: 0.8,
              gripR: 0.8,
              headPitch: -0.05,
              bounce: Math.max(0, Math.sin(g * 0.24)) * 0.03,
              lid: blink(g, 2),
            }}
          />
        </group>
      </Stage>
    </AbsoluteFill>
  );
};

// ── flashback ────────────────────────────────────────────────────────────────

const CODE_COLORS = ["#c792ea", "#82aaff", "#c3e88d", "#f78c6c", "#89ddff", "#ffcb6b", "#a6accd"];

/** The editor on the Mac: lines of code typing out, a cursor blinking. */
export function drawCode(g: CanvasRenderingContext2D, f: number) {
  const W = 1000;
  const H = 600;
  g.fillStyle = "#1e1f29";
  g.fillRect(0, 0, W, H);
  g.fillStyle = "#16171f";
  g.fillRect(0, 0, W, 44);
  g.fillStyle = "#2a2c3a";
  g.fillRect(16, 8, 150, 36);
  g.fillStyle = "#d6d7e2";
  g.font = "500 20px Menlo, monospace";
  g.fillText("game.js", 34, 33);
  const shown = Math.min(22, 4 + f / 4);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  for (let i = 0; i < Math.floor(shown); i++) {
    const y = 62 + i * 24;
    g.fillStyle = "#4a4d63";
    g.fillText(String(i + 1).padStart(2, " "), 14, y + 16);
    let x = 70 + Math.floor(rnd() * 3) * 28;
    const words = 2 + Math.floor(rnd() * 5);
    for (let k = 0; k < words; k++) {
      const w = 30 + rnd() * 110;
      g.fillStyle = CODE_COLORS[Math.floor(rnd() * CODE_COLORS.length)];
      roundRect(g, x, y + 4, w, 13, 4);
      g.fill();
      x += w + 12;
    }
    if (i === Math.floor(shown) - 1 && Math.floor(f / 8) % 2 === 0) {
      g.fillStyle = "#ffffff";
      g.fillRect(x, y + 1, 3, 19);
    }
  }
}

/** The store page of his first game: a flat downloads graph. */
export function drawFlop(g: CanvasRenderingContext2D, k: number) {
  const W = 1000;
  const H = 600;
  g.fillStyle = "#f4f5f8";
  g.fillRect(0, 0, W, H);
  const grad = g.createLinearGradient(60, 50, 200, 190);
  grad.addColorStop(0, "#ff7a59");
  grad.addColorStop(1, "#ffc94a");
  g.fillStyle = grad;
  roundRect(g, 60, 50, 140, 140, 32);
  g.fill();
  g.fillStyle = "#ffffff";
  g.font = "900 80px Arial Black, sans-serif";
  g.fillText("★", 90, 150);
  g.fillStyle = "#16161c";
  g.font = "800 40px Helvetica, Arial, sans-serif";
  g.fillText("My First Game", 230, 105);
  g.fillStyle = "#8a8a96";
  g.font = "400 26px Helvetica, Arial, sans-serif";
  g.fillText("Released", 230, 145);
  g.fillStyle = "#2f6bff";
  roundRect(g, 230, 160, 110, 40, 20);
  g.fill();
  g.fillStyle = "#fff";
  g.font = "700 22px Helvetica, Arial, sans-serif";
  g.fillText("GET", 266, 188);
  // the graph
  g.fillStyle = "#ffffff";
  roundRect(g, 60, 240, 880, 320, 24);
  g.fill();
  g.fillStyle = "#16161c";
  g.font = "700 28px Helvetica, Arial, sans-serif";
  g.fillText("Downloads", 92, 290);
  g.strokeStyle = "#e5e6ec";
  g.lineWidth = 2;
  for (let i = 0; i < 4; i++) {
    g.beginPath();
    g.moveTo(92, 330 + i * 52);
    g.lineTo(908, 330 + i * 52);
    g.stroke();
  }
  g.strokeStyle = "#ff4d6d";
  g.lineWidth = 6;
  g.beginPath();
  const end = 92 + 816 * k;
  g.moveTo(92, 500);
  for (let x = 92; x <= end; x += 8) g.lineTo(x, 500 - (x < 160 ? (x - 92) * 0.25 : 17) + Math.sin(x / 9) * 1.5);
  g.stroke();
}

/** Years back: him at the Mac at night, coding, warm and a bit faded. The last chunk turns the
 * screen to his game's store page; he sags. */
export const Flashback: React.FC<SceneProps> = ({ len, marks, offset }) => {
  const f = useCurrentFrame();
  const g = f + offset;
  const { g: ctx, tex } = useLiveCanvas(1000, 600);
  const flop = marks.length - 1;
  const excited = marks.length - 2;
  const c = chunkAt(marks, f);
  if (c >= flop) drawFlop(ctx, interpolate(f - marks[flop], [0, 30], [0, 1], clamp));
  else drawCode(ctx, f);
  tex.needsUpdate = true;
  const sag = interpolate(f - marks[flop], [0, 10], [0, 1], clamp);
  const cheer = c === excited ? Math.sin(interpolate(f - marks[excited], [0, 8], [0, Math.PI / 2], clamp)) : 0;
  const typing = c < excited ? Math.sin(g * 1.7) * 0.08 : 0;
  const arms: Partial<Pose> = {
    armLx: 1.05 + cheer * 1.4 - sag * 0.4,
    armRx: 1.05 + cheer * 1.4 - sag * 0.4,
    elbowL: 0.5 + typing - cheer * 0.3,
    elbowR: 0.5 - typing - cheer * 0.3,
    armLz: 0.05 + cheer * 0.35,
    armRz: -0.05 - cheer * 0.35,
    gripL: 0.4,
    gripR: 0.4,
  };
  const cam = lerpCam({ pos: [1.85, 1.95, 0.55], look: [1.05, 1.55, -1.6], fov: 36 }, { pos: [1.72, 1.9, 0.3], look: [1.05, 1.58, -1.6], fov: 33 }, f / len);
  return (
    <AbsoluteFill style={{ filter: "sepia(0.45) saturate(0.85) brightness(0.95) contrast(1.05)" }}>
      <InStudio cam={cam} g={g} macScreen={tex} props={false} aperture={0.012}>
        <Founder
          f={g}
          p={[0.68, 0, -0.95]}
          rotY={2.65}
          arms={arms}
          talking={false}
          extra={{ headPitch: 0.05 + sag * 0.3, bounce: cheer * 0.06, smile: 0.5 * (1 - sag) + cheer * 0.5 - sag * 0.4 }}
        />
      </InStudio>
    </AbsoluteFill>
  );
};

// ── the store ────────────────────────────────────────────────────────────────

/** Made-up games for the top charts, so no real studio is pointed at. */
const CHART: [string, string, string, string][] = [
  ["Kingdom Clash X", "Strategy", "#e8453c", "#ffb03a"],
  ["Galaxy Tycoon", "Simulation", "#5b4bff", "#3ad7ff"],
  ["Royal Merge Saga", "Puzzle", "#ff4fa3", "#ffd04f"],
  ["Hero Legends III", "RPG", "#2e9f5b", "#b7f24a"],
  ["Speed Rivals", "Racing", "#ff7a1a", "#ff3b3b"],
  ["Empire Builder", "Strategy", "#3a6bff", "#8f5bff"],
  ["Dragon Raid", "Action", "#a01e3a", "#ff8a3a"],
  ["Puzzle Palace", "Puzzle", "#1aa6a6", "#7ef0c8"],
  ["Battle Arena Pro", "Action", "#444a66", "#ff4f4f"],
];

export function drawChartIcon(g: CanvasRenderingContext2D, x: number, y: number, s: number, i: number) {
  const [, , a, b] = CHART[i % CHART.length];
  const grad = g.createLinearGradient(x, y, x + s, y + s);
  grad.addColorStop(0, a);
  grad.addColorStop(1, b);
  g.fillStyle = grad;
  roundRect(g, x, y, s, s, s * 0.24);
  g.fill();
  g.fillStyle = "rgba(255,255,255,0.9)";
  g.font = `900 ${s * 0.55}px Arial Black, sans-serif`;
  g.textAlign = "center";
  g.fillText(CHART[i % CHART.length][0][0], x + s / 2, y + s * 0.7);
  g.textAlign = "left";
}

export function drawStore(g: CanvasRenderingContext2D, scroll: number) {
  const W = 390;
  const H = 844;
  g.fillStyle = "#f6f6f9";
  g.fillRect(0, 0, W, H);
  for (let i = 0; i < CHART.length; i++) {
    const y = 200 + i * 86 - scroll;
    if (y < 150 || y > H) continue;
    g.fillStyle = "#16161c";
    g.font = "700 22px Helvetica, Arial, sans-serif";
    g.fillText(String(i + 1), 18, y + 40);
    drawChartIcon(g, 46, y + 6, 62, i);
    g.fillStyle = "#16161c";
    g.font = "600 19px Helvetica, Arial, sans-serif";
    g.fillText(CHART[i][0], 122, y + 32);
    g.fillStyle = "#8a8a96";
    g.font = "400 15px Helvetica, Arial, sans-serif";
    g.fillText(CHART[i][1], 122, y + 54);
    g.fillStyle = "#e9e9ef";
    roundRect(g, 304, y + 22, 66, 32, 16);
    g.fill();
    g.fillStyle = "#2f6bff";
    g.font = "700 15px Helvetica, Arial, sans-serif";
    g.fillText("GET", 323, y + 43);
    g.fillStyle = "#e6e6ec";
    g.fillRect(122, y + 80, 268, 1);
  }
  // header over the list
  g.fillStyle = "#f6f6f9";
  g.fillRect(0, 0, W, 150);
  g.fillStyle = "#16161c";
  g.font = "600 16px Helvetica, Arial, sans-serif";
  g.fillText("9:41", 30, 34);
  g.font = "800 36px Helvetica, Arial, sans-serif";
  g.fillText("Top Charts", 18, 100);
  g.font = "600 16px Helvetica, Arial, sans-serif";
  ["Free", "Paid", "Grossing"].forEach((t, i) => {
    g.fillStyle = i === 0 ? "#2f6bff" : "#8a8a96";
    g.fillText(t, 18 + i * 80, 136);
  });
}

/** A phone on the desk showing the top charts. */
export const Store: React.FC<SceneProps> = ({ len, offset }) => {
  const f = useCurrentFrame();
  const g = f + offset;
  const { g: ctx, tex } = useLiveCanvas(390, 844);
  drawStore(ctx, ease(Math.min(1, f / len)) * 50);
  tex.needsUpdate = true;
  const cam = lerpCam(orbit([0, 1.52, 0.62], 1.95, 0.12, 0.08, 34), orbit([0, 1.52, 0.62], 1.75, 0.06, 0.06, 34), f / len);
  return (
    <InStudio cam={cam} g={g} props={false} aperture={0.04}>
      <Founder f={g} arms={HANDS_DOWN} talking={false} extra={{ headPitch: 0.25 }} />
      <DeskPhone screen={tex} />
    </InStudio>
  );
};

// ── burning money ────────────────────────────────────────────────────────────

const STACKS: { x: number; h: number }[] = [
  { x: -0.34, h: 0.42 },
  { x: 0, h: 0.52 },
  { x: 0.34, h: 0.34 },
];
const STACK_Z = 0.6;

export const iconTexture = (i: number) =>
  canvasTexture(256, 256, (g) => {
    drawChartIcon(g, 0, 0, 256, i);
  });

/** A stack of banknotes: thin slabs in two greens with a paper band round the middle. */
const Cash: React.FC<{ x: number; h: number }> = ({ x, h }) => {
  const n = Math.round(h / 0.03);
  return (
    <group position={[x, DESK_TOP, STACK_Z]}>
      {Array.from({ length: n }, (_, i) => (
        <RBox key={i} s={[0.24, 0.028, 0.13]} p={[Math.sin(i * 2.3) * 0.006, 0.015 + i * 0.03, Math.cos(i * 1.7) * 0.005]} c={i % 2 ? "#5d9e57" : "#4b8a48"} rough={0.8} r={0.006} />
      ))}
      <RBox s={[0.07, h * 0.6, 0.135]} p={[0, h / 2, 0]} c="#efe7cf" rough={0.7} r={0.004} />
    </group>
  );
};

/** Flames licking up a stack: flickering glowing blobs round its top and sides. */
const Fire: React.FC<{ x: number; h: number; g: number; k: number }> = ({ x, h, g, k }) => (
  <group position={[x, DESK_TOP + h, STACK_Z]}>
    {Array.from({ length: 9 }, (_, i) => {
      const a = (i / 9) * Math.PI * 2;
      const flick = 0.75 + 0.35 * Math.sin(g * 0.9 + i * 2.1) + 0.15 * Math.sin(g * 2.3 + i);
      const s = 0.028 * flick * k;
      const y = -0.05 + ((g * 0.03 + i * 0.37) % 1) * 0.12;
      return (
        <mesh key={i} position={[Math.cos(a) * 0.1, y, Math.sin(a) * 0.05 + 0.02]} scale={[s, s * 2.2, s]}>
          <sphereGeometry args={[1, 12, 10]} />
          <meshStandardMaterial color="#ff7a1a" emissive={i % 3 ? "#ff5a00" : "#ffc23a"} emissiveIntensity={3} />
        </mesh>
      );
    })}
    <pointLight position={[0, 0.1, 0.1]} intensity={(0.6 + Math.sin(g * 1.3) * 0.15) * k} distance={1.0} decay={1.8} color="#ff8a2a" />
  </group>
);

/** Banknotes fluttering down onto the stacks, more money going in. */
const FallingBills: React.FC<{ g: number }> = ({ g }) => (
  <>
    {Array.from({ length: 14 }, (_, i) => {
      const s = STACKS[i % 3];
      const u = (g * 0.018 + i * 0.29) % 1;
      const y = DESK_TOP + s.h + 0.05 + (1 - u) * 0.9;
      return (
        <mesh key={i} position={[s.x + Math.sin(g * 0.1 + i) * 0.12, y, STACK_Z + Math.cos(i * 1.3) * 0.08]} rotation={[g * 0.05 + i, g * 0.07, i]}>
          <planeGeometry args={[0.09, 0.045]} />
          <meshStandardMaterial color="#6fb36a" side={THREE.DoubleSide} roughness={0.8} />
        </mesh>
      );
    })}
  </>
);

/** The big studios' games, each on its own pile of burning cash. `lonelyIcon` adds the indie game. */
const MoneyPit: React.FC<{ g: number; fireIn: number }> = ({ g, fireIn }) => {
  const icons = useMemo(() => STACKS.map((_, i) => iconTexture(i)), []);
  return (
    <>
      {STACKS.map(({ x, h }, i) => (
        <group key={i}>
          <Cash x={x} h={h} />
          <group position={[x, DESK_TOP + h + 0.1, STACK_Z - 0.03]} rotation={[-0.1, 0, Math.sin(g * 0.05 + i) * 0.04]}>
            <RBox s={[0.15, 0.15, 0.02]} c="#ffffff" r={0.03} rough={0.4} />
            <mesh position={[0, 0, 0.0105]}>
              <planeGeometry args={[0.14, 0.14]} />
              <meshBasicMaterial map={icons[i]} toneMapped={false} />
            </mesh>
          </group>
          <Fire x={x} h={h} g={g} k={fireIn} />
        </group>
      ))}
      <FallingBills g={g} />
    </>
  );
};

/** A real PixelPicked game, small and unlit at the front of the desk. */
export const LONELY: Vec3 = [0.66, DESK_TOP, 0.82];
export const LonelyGame: React.FC = () => {
  const icon = useTexture(`icons/${GAMES[12].id}.png`);
  return (
    <group position={LONELY} rotation={[-0.25, -0.35, 0]}>
      <RBox s={[0.09, 0.09, 0.012]} p={[0, 0.045, 0]} c="#ffffff" r={0.016} rough={0.5} />
      {icon && (
        <mesh position={[0, 0.045, 0.0065]}>
          <planeGeometry args={[0.084, 0.084]} />
          <meshStandardMaterial map={icon} roughness={0.5} />
        </mesh>
      )}
    </group>
  );
};

/** Every game at the top: big studios, burning money. */
export const MoneyFire: React.FC<SceneProps> = ({ len, offset }) => {
  const f = useCurrentFrame();
  const g = f + offset;
  const cam = lerpCam(orbit([0, 1.42, STACK_Z], 2.3, 0.18, 0.3, 34), orbit([0, 1.42, STACK_Z], 2.05, 0.08, 0.22, 34), f / len);
  return (
    <InStudio cam={cam} g={g} props={false} aperture={0.035}>
      <Founder f={g} arms={HANDS_DOWN} talking={false} extra={{ headPitch: 0.3, lookY: -0.6 }} />
      <MoneyPit g={g} fireIn={interpolate(f, [0, 10], [0.2, 1], clamp)} />
      <LonelyGame />
    </InStudio>
  );
};

/** The camera drifts away from the fire, down to one small indie game nobody is looking at. */
export const Lonely: React.FC<SceneProps> = ({ len, marks, offset }) => {
  const f = useCurrentFrame();
  const g = f + offset;
  // arrive by the "never heard of" chunk, then hold
  const arrive = marks[Math.min(2, marks.length - 1)] + 10;
  const cam = lerpCam(orbit([0, 1.42, STACK_Z], 2.05, 0.08, 0.22, 34), orbit([LONELY[0], LONELY[1] + 0.05, LONELY[2]], 0.6, 0.18, 0.12, 30), Math.min(1, f / Math.max(1, arrive)));
  return (
    <InStudio cam={cam} g={g} props={false} aperture={0.05}>
      <Founder f={g} arms={HANDS_DOWN} talking={false} extra={{ headPitch: 0.3 }} />
      <MoneyPit g={g} fireIn={1} />
      <LonelyGame />
    </InStudio>
  );
};

// ── the feed ─────────────────────────────────────────────────────────────────

export const FEED: [string, number][] = [
  ["orbitglide", 4],
  ["stackpack", 4],
  ["mochi", 4],
  ["island", 1],
];
const SWIPE = 12;

/** The phone's screen in the feed: one game playing, swiping up to the next. Lives inside the
 * canvas because the clip frames need the renderer. */
const FeedPhone: React.FC<{ marks: number[] }> = ({ marks }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  // swipe on "you just scroll", on "the feed actually learns" and on "instead of"
  const swipes = [3, 5, 7].filter((i) => i < marks.length).map((i) => marks[i]);
  const passed = swipes.filter((s) => f >= s + SWIPE).length;
  const moving = swipes.find((s) => f >= s && f < s + SWIPE);
  const p = moving === undefined ? 0 : ease((f - moving) / SWIPE);
  // only the games on screen move on; the rest hold their first frame
  const at = (i: number) => FEED[i][1] + (i === passed || (moving !== undefined && i === passed + 1) ? f / fps : 0);
  const frames = [useClipFrame(FEED[0][0], at(0)), useClipFrame(FEED[1][0], at(1)), useClipFrame(FEED[2][0], at(2)), useClipFrame(FEED[3][0], at(3))];
  const { g: ctx, tex } = useLiveCanvas(390, 844);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, 390, 844);
  const draw = (i: number, y: number) => {
    const img = frames[i]?.image as CanvasImageSource | undefined;
    if (img) ctx.drawImage(img, 0, y, 390, 844);
  };
  draw(passed, -p * 844);
  if (moving !== undefined && passed + 1 < FEED.length) draw(passed + 1, 844 - p * 844);
  // "for you" once the feed starts learning
  if (marks[5] !== undefined && f >= marks[5]) {
    ctx.globalAlpha = interpolate(f - marks[5], [0, 6], [0, 1], clamp);
    ctx.fillStyle = "rgba(20,20,28,0.8)";
    roundRect(ctx, 115, 96, 160, 38, 19);
    ctx.fill();
    ctx.fillStyle = "#ffd84a";
    ctx.font = "700 17px Helvetica, Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("✦ for you", 195, 121);
    ctx.textAlign = "left";
    ctx.globalAlpha = 1;
  }
  // the fingertip that swipes
  if (moving !== undefined) {
    ctx.fillStyle = `rgba(255,255,255,${0.7 * Math.sin(p * Math.PI)})`;
    ctx.beginPath();
    ctx.arc(195, 600 - p * 260, 30, 0, Math.PI * 2);
    ctx.fill();
  }
  tex.needsUpdate = true;
  return <DeskPhone screen={tex} />;
};

/** PixelPicked on a phone on the desk, swiping from game to game. */
export const Feed: React.FC<SceneProps> = ({ len, marks, offset }) => {
  const f = useCurrentFrame();
  const g = f + offset;
  const cam = lerpCam(orbit([0, 1.52, 0.62], 1.95, -0.1, 0.06, 34), orbit([0, 1.52, 0.62], 1.7, -0.04, 0.04, 34), f / len);
  return (
    <InStudio cam={cam} g={g} props={false} aperture={0.04}>
      <Founder f={g} arms={HANDS_DOWN} talking={false} extra={{ headPitch: 0.25, smile: 0.5 }} />
      <FeedPhone marks={marks} />
    </InStudio>
  );
};

// ── the selfie ───────────────────────────────────────────────────────────────

/** A story sticker: a white tag, slightly tilted, popping in. */
export const Sticker: React.FC<{ text: string; at: number; y: number; tilt: number; hot?: boolean }> = ({ text, at, y, tilt, hot }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (f < at) return null;
  const k = spring({ frame: f - at, fps, config: { damping: 11, stiffness: 180 } });
  return (
    <div style={{ position: "absolute", top: y, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
      <div
        style={{
          transform: `rotate(${tilt}deg) scale(${k})`,
          background: hot ? "#ffd84a" : "#ffffff",
          color: "#111",
          borderRadius: 18,
          padding: "16px 30px",
          fontFamily: '"Helvetica Neue", Arial, sans-serif',
          fontWeight: 800,
          fontSize: hot ? 66 : 54,
          boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
        }}
      >
        {text}
      </div>
    </div>
  );
};

/** The phone's own recording look: a blinking red dot and a running timer. */
export const RecordingUI: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = Math.floor(f / fps);
  return (
    <div style={{ position: "absolute", top: 110, left: 70, display: "flex", alignItems: "center", gap: 16, fontFamily: '"Helvetica Neue", Arial, sans-serif', fontWeight: 700, fontSize: 40, color: "#fff", textShadow: "0 2px 10px rgba(0,0,0,0.6)" }}>
      <div style={{ width: 26, height: 26, borderRadius: 13, background: "#ff3b30", opacity: Math.floor(f / 15) % 2 ? 0.35 : 1 }} />
      {`00:${String(s).padStart(2, "0")}`}
    </div>
  );
};

/** He films himself on his phone: we see the front camera, arm reaching in, studio behind. */
export const Selfie: React.FC<SceneProps> = ({ len, marks, offset, stickers = {} }) => {
  const f = useCurrentFrame();
  const g = f + offset;
  const wob = (a: number, b: number) => Math.sin(g * a + b) * 0.006 + Math.sin(g * a * 2.7 + b) * 0.003;
  const cam: Cam = { pos: [0.2 + wob(0.13, 0), 1.33 + wob(0.11, 2), 1.3], look: [0.0 + wob(0.07, 4), 1.5, 0.3], fov: 58 };
  const last = marks[marks.length - 2] ?? 0;
  const grin = interpolate(f - last, [0, 10], [0, 1], clamp);
  const out = interpolate(f, [len - 8, len], [0, 1], clamp);
  const STICKER_Y = [250, 370, 490, 1010];
  return (
    <AbsoluteFill>
      <InStudio cam={cam} g={g} props={false} aperture={0.015}>
        <Founder
          f={g}
          rotY={0}
          arms={{ ...BOTH_OPEN, armRx: 1.45, armRz: -0.35, elbowR: 0.25, gripR: 0.9, armLx: 0.3, elbowL: 0.4, armLz: 0.1 }}
          face={{ smile: 0.45 + grin * 0.4, browRaise: 0.35 }}
          extra={{ headYaw: 0.04 + Math.sin(g / 23) * 0.04, squint: grin * 0.4 }}
        />
      </InStudio>
      <RecordingUI />
      {Object.entries(stickers).map(([i, text], n) => (
        <Sticker key={i} text={text} at={marks[Number(i)] ?? 0} y={STICKER_Y[n % STICKER_Y.length]} tilt={n % 2 ? 3 : -3} hot={Number(i) === Math.max(...Object.keys(stickers).map(Number))} />
      ))}
      <AbsoluteFill style={{ background: "#000", opacity: out }} />
    </AbsoluteFill>
  );
};
