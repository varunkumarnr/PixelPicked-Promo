import React from "react";

/**
 * Voxel building blocks for the 3D explainer videos: everything is built from flat-shaded boxes,
 * so characters and props share one chunky toy look. Units: 1 = one "big" block.
 */

type Vec3 = [number, number, number];

export const Box: React.FC<{ p?: Vec3; s: Vec3; c: string; glow?: number; r?: Vec3 }> = ({ p = [0, 0, 0], s, c, glow = 0, r }) => (
  <mesh position={p} rotation={r} castShadow receiveShadow>
    <boxGeometry args={s} />
    <meshStandardMaterial color={c} flatShading roughness={0.85} emissive={glow ? c : "#000000"} emissiveIntensity={glow} />
  </mesh>
);

export type Mood = "focus" | "sad" | "happy";

/**
 * A little voxel developer. Sits at y=0 (feet), about 2.3 units tall.
 * `typing` bobs the arms, `slump` (0..1) tips the head and shoulders forward,
 * `cheer` (0..1) raises the arms and lifts him off the ground.
 */
export const VoxelDev: React.FC<{ p?: Vec3; mood: Mood; t: number; typing?: boolean; slump?: number; cheer?: number; shirt?: string }> = ({
  p = [0, 0, 0],
  mood,
  t,
  typing = false,
  slump = 0,
  cheer = 0,
  shirt = "#3b4252",
}) => {
  const skin = "#f2c6a0";
  const hair = "#2b2118";
  const bob = typing ? Math.sin(t * 0.9) * 0.05 : 0;
  const hop = cheer * Math.abs(Math.sin(t * 0.35)) * 0.45;
  const armUp = cheer * 2.6;
  return (
    <group position={[p[0], p[1] + hop, p[2]]}>
      {/* legs */}
      <Box p={[-0.17, 0.35, 0]} s={[0.28, 0.7, 0.32]} c="#2e3a59" />
      <Box p={[0.17, 0.35, 0]} s={[0.28, 0.7, 0.32]} c="#2e3a59" />
      {/* body leans forward when slumped */}
      <group position={[0, 0.7, 0]} rotation={[slump * 0.5, 0, 0]}>
        <Box p={[0, 0.42, 0]} s={[0.72, 0.84, 0.42]} c={shirt} />
        {/* arms: forward for typing, up for cheering */}
        <group position={[-0.47, 0.75, 0]} rotation={[-0.9 * (typing ? 1 : 0) - armUp + bob * 3, 0, -cheer * 0.3]}>
          <Box p={[0, -0.32, 0]} s={[0.22, 0.64, 0.24]} c={shirt} />
          <Box p={[0, -0.7, 0]} s={[0.2, 0.16, 0.22]} c={skin} />
        </group>
        <group position={[0.47, 0.75, 0]} rotation={[-0.9 * (typing ? 1 : 0) - armUp - bob * 3, 0, cheer * 0.3]}>
          <Box p={[0, -0.32, 0]} s={[0.22, 0.64, 0.24]} c={shirt} />
          <Box p={[0, -0.7, 0]} s={[0.2, 0.16, 0.22]} c={skin} />
        </group>
        {/* head */}
        <group position={[0, 1.2, 0]} rotation={[slump * 0.6, 0, 0]}>
          <Box p={[0, 0.0, 0]} s={[0.78, 0.74, 0.7]} c={skin} />
          <Box p={[0, 0.42, -0.04]} s={[0.84, 0.18, 0.8]} c={hair} />
          <Box p={[0, 0.16, -0.36]} s={[0.84, 0.5, 0.12]} c={hair} />
          <Box p={[-0.36, 0.2, 0.05]} s={[0.12, 0.34, 0.6]} c={hair} />
          <Box p={[0.36, 0.2, 0.05]} s={[0.12, 0.34, 0.6]} c={hair} />
          {/* eyes */}
          <Box p={[-0.17, mood === "sad" ? 0.0 : 0.04, 0.36]} s={[0.1, mood === "happy" ? 0.06 : 0.12, 0.03]} c="#1a1a1a" />
          <Box p={[0.17, mood === "sad" ? 0.0 : 0.04, 0.36]} s={[0.1, mood === "happy" ? 0.06 : 0.12, 0.03]} c="#1a1a1a" />
          {/* mouth */}
          {mood === "happy" && <Box p={[0, -0.18, 0.36]} s={[0.3, 0.1, 0.03]} c="#7a2e2e" />}
          {mood === "sad" && <Box p={[0, -0.2, 0.36]} s={[0.18, 0.05, 0.03]} c="#3a2a2a" />}
          {mood === "focus" && <Box p={[0, -0.18, 0.36]} s={[0.14, 0.04, 0.03]} c="#3a2a2a" />}
          {/* sweat drop when things go badly */}
          {mood === "sad" && <Box p={[0.42, 0.18 - ((t * 0.03) % 0.3), 0.2]} s={[0.08, 0.12, 0.08]} c="#7ec8ff" glow={0.4} />}
        </group>
      </group>
    </group>
  );
};

/**
 * Desk with a monitor and keyboard. The developer sits behind it (on the -z side) facing the
 * camera, so we see the monitor's back, like a laptop in an explainer scene.
 */
export const Desk: React.FC<{ p?: Vec3; screen: string; screenGlow?: number; children?: React.ReactNode }> = ({ p = [0, 0, 0], screen, screenGlow = 0.6, children }) => (
  <group position={p}>
    <Box p={[0, 1.05, 0]} s={[2.4, 0.12, 1.1]} c="#e9d6b8" />
    <Box p={[-1.05, 0.5, -0.4]} s={[0.12, 1.0, 0.12]} c="#cdb894" />
    <Box p={[1.05, 0.5, -0.4]} s={[0.12, 1.0, 0.12]} c="#cdb894" />
    <Box p={[-1.05, 0.5, 0.4]} s={[0.12, 1.0, 0.12]} c="#cdb894" />
    <Box p={[1.05, 0.5, 0.4]} s={[0.12, 1.0, 0.12]} c="#cdb894" />
    {/* a laptop, low enough that we still see the developer's face over it */}
    <Box p={[0, 1.13, 0.0]} s={[1.1, 0.05, 0.7]} c="#c9ced6" />
    <group position={[0, 1.15, 0.33]} rotation={[0.25, 0, 0]}>
      <Box p={[0, 0.36, 0]} s={[1.1, 0.72, 0.06]} c="#c9ced6" />
      <Box p={[0, 0.36, -0.035]} s={[0.98, 0.6, 0.02]} c={screen} glow={screenGlow} />
      <Box p={[0, 0.38, 0.04]} s={[0.16, 0.16, 0.02]} c="#eef1f5" />
    </group>
    {children}
  </group>
);

/** A phone standing upright. `screen` is drawn by the caller as children at z≈0.06. */
export const Phone: React.FC<{ p?: Vec3; scale?: number; r?: Vec3; children?: React.ReactNode }> = ({ p = [0, 0, 0], scale = 1, r, children }) => (
  <group position={p} scale={scale} rotation={r}>
    <Box p={[0, 0, 0]} s={[0.9, 1.7, 0.1]} c="#16181d" />
    {children}
  </group>
);

/** An hourglass whose sand drains with `fill` (1 = all on top). */
export const Hourglass: React.FC<{ p?: Vec3; fill: number; r?: number }> = ({ p = [0, 0, 0], fill, r = 0 }) => (
  <group position={p} rotation={[0, 0, r]}>
    <Box p={[0, 0.85, 0]} s={[0.9, 0.12, 0.9]} c="#8a5a3b" />
    <Box p={[0, -0.85, 0]} s={[0.9, 0.12, 0.9]} c="#8a5a3b" />
    {[0.55, 0.35, 0.15].map((y, i) => (
      <React.Fragment key={i}>
        <Box p={[0, y, 0]} s={[0.7 - i * 0.2, 0.2, 0.7 - i * 0.2]} c="#cfe9ff" />
        <Box p={[0, -y, 0]} s={[0.7 - i * 0.2, 0.2, 0.7 - i * 0.2]} c="#cfe9ff" />
      </React.Fragment>
    ))}
    {fill > 0.05 && <Box p={[0, 0.15 + fill * 0.25, 0]} s={[0.4 * fill + 0.1, 0.5 * fill, 0.4 * fill + 0.1]} c="#f2c14e" />}
    {fill < 0.95 && <Box p={[0, -0.65 + (1 - fill) * 0.2, 0]} s={[0.55, 0.4 * (1 - fill), 0.55]} c="#f2c14e" />}
  </group>
);

/** A tiny voxel player: body + head, in a given colour. */
export const MiniPlayer: React.FC<{ p: Vec3; c: string; hop?: number }> = ({ p, c, hop = 0 }) => (
  <group position={[p[0], p[1] + hop, p[2]]}>
    <Box p={[0, 0.25, 0]} s={[0.32, 0.5, 0.24]} c={c} />
    <Box p={[0, 0.66, 0]} s={[0.34, 0.32, 0.3]} c="#f2c6a0" />
    <Box p={[0, 0.84, 0]} s={[0.36, 0.08, 0.32]} c="#3a2a1a" />
  </group>
);

/** A coin as a flat yellow block. */
export const Coin: React.FC<{ p: Vec3; spin: number }> = ({ p, spin }) => (
  <group position={p} rotation={[0, spin, 0]}>
    <Box s={[0.36, 0.36, 0.08]} c="#f5c542" />
    <Box p={[0, 0, 0.05]} s={[0.12, 0.2, 0.02]} c="#c99a1d" />
  </group>
);

/** A "?" drawn in voxels, floating above someone. */
export const QuestionMark: React.FC<{ p: Vec3; scale?: number }> = ({ p, scale = 1 }) => {
  const cells: [number, number][] = [
    [-1, 4], [0, 4], [1, 4], [-2, 3], [2, 3], [2, 2], [1, 1], [0, 0], [0, -2],
  ];
  return (
    <group position={p} scale={scale}>
      {cells.map(([x, y], i) => (
        <Box key={i} p={[x * 0.16, y * 0.16, 0]} s={[0.16, 0.16, 0.16]} c="#ffffff" />
      ))}
    </group>
  );
};
