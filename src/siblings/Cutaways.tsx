import React, { useMemo } from "react";
import * as THREE from "three";
import { useCurrentFrame } from "remotion";
import { AnimeEyes } from "./Chibi";
import { LookCtx } from "./Cast";
import { RBox, canvasTexture } from "./Room";
import { Cam, Stage } from "./Stage";

/**
 * Where Zack's backseat gaming goes when it's taken to a cartoon extreme: a stadium commentary
 * booth, a city flattened by his tower, an awards ceremony in the bedroom, a server room on fire
 * and the whole planet. Each is a small stylised set with its own lighting; the cast goes in as
 * children.
 */

type Vec3 = [number, number, number];

/** A 3D shot on one of the fantasy sets, with the episode's finish but none of the bedroom. */
export const FantasyScene: React.FC<{ cam: Cam; children: React.ReactNode; exposure?: number; width?: number; height?: number; aperture?: number }> = ({ cam, children, exposure = 0.95, width, height, aperture = 0.016 }) => {
  const frame = useCurrentFrame();
  const look = React.useContext(LookCtx);
  return (
    <Stage cam={cam} width={width} height={height} post={{ frame, style: look, ...(look === "film" ? { aperture, vignette: 0.55 } : {}) }} env={0.15} fill={0.25} exposure={exposure}>
      <AnimeEyes.Provider value={look === "anime"}>{children}</AnimeEyes.Provider>
    </Stage>
  );
};

const seeded = (n: number) => {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
};

/** A flat card with text painted on, for signs, scoreboards and podium numbers. */
const Sign: React.FC<{ text: string; p: Vec3; w: number; h: number; bg: string; fg: string; font?: number; glow?: number; rot?: Vec3 }> = ({ text, p, w, h, bg, fg, font = 0.6, glow = 0, rot }) => {
  const tex = useMemo(
    () =>
      canvasTexture(Math.round(512 * (w / h)), 512, (g) => {
        g.fillStyle = bg;
        g.fillRect(0, 0, g.canvas.width, g.canvas.height);
        g.fillStyle = fg;
        g.font = `900 ${Math.round(512 * font)}px "Arial Rounded MT Bold", Arial, sans-serif`;
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.fillText(text, g.canvas.width / 2, 270);
      }),
    [text, w, h, bg, fg, font],
  );
  return (
    <mesh position={p} rotation={rot}>
      <planeGeometry args={[w, h]} />
      {glow ? <meshBasicMaterial map={tex} color={[glow, glow, glow]} toneMapped={false} /> : <meshStandardMaterial map={tex} roughness={0.6} />}
    </mesh>
  );
};

/** Out-of-focus lights in the dark behind a set. */
const Bokeh: React.FC<{ n: number; z: number; spread: [number, number]; y: [number, number]; colors: string[]; seed?: number; size?: number }> = ({ n, z, spread, y, colors, seed = 1, size = 0.12 }) => (
  <>
    {Array.from({ length: n }, (_, i) => {
      const c = new THREE.Color(colors[i % colors.length]).multiplyScalar(2.5);
      return (
        <mesh key={i} position={[spread[0] + seeded(i + seed) * (spread[1] - spread[0]), y[0] + seeded(i * 3 + seed) * (y[1] - y[0]), z - seeded(i * 7 + seed) * 2]}>
          <sphereGeometry args={[size * (0.6 + seeded(i * 5 + seed)), 12, 8]} />
          <meshBasicMaterial color={c} toneMapped={false} />
        </mesh>
      );
    })}
  </>
);

const Spot: React.FC<{ p: Vec3; aim: Vec3; color: string; intensity: number; angle?: number; shadow?: boolean }> = ({ p, aim, color, intensity, angle = 0.5, shadow }) => {
  const obj = useMemo(() => new THREE.Object3D(), []);
  obj.position.set(...aim);
  return (
    <>
      <primitive object={obj} />
      <spotLight position={p} target={obj} color={color} intensity={intensity} angle={angle} penumbra={0.8} decay={1.4} distance={14} castShadow={shadow} shadow-mapSize={[1024, 1024]} shadow-bias={-0.0003} />
    </>
  );
};

/** The big screen in the stadium: her floor count, painted like a broadcast graphic. */
const Jumbotron: React.FC = () => {
  const tex = useMemo(
    () =>
      canvasTexture(1024, 578, (g) => {
        const sky = g.createLinearGradient(0, 0, 0, 578);
        sky.addColorStop(0, "#67e0f0");
        sky.addColorStop(1, "#b9f3ff");
        g.fillStyle = sky;
        g.fillRect(0, 0, 1024, 578);
        // her tower, floor on floor
        for (let i = 0; i < 9; i++) {
          g.fillStyle = i % 2 ? "#b5462f" : "#c4553b";
          g.fillRect(420 + Math.sin(i * 1.3) * 10, 520 - i * 56, 184, 50);
          g.fillStyle = "#9fd3ff";
          g.fillRect(462 + Math.sin(i * 1.3) * 10, 534 - i * 56, 100, 20);
        }
        g.font = "900 120px 'Arial Rounded MT Bold', Arial";
        g.lineWidth = 16;
        g.strokeStyle = "#fff";
        g.fillStyle = "#ff9a2e";
        g.strokeText("17", 70, 170);
        g.fillText("17", 70, 170);
        g.font = "900 46px 'Arial Rounded MT Bold', Arial";
        g.strokeText("floors", 80, 230);
        g.fillText("floors", 80, 230);
      }),
    [],
  );
  return (
    <mesh>
      <planeGeometry args={[3.1, 1.75]} />
      <meshBasicMaterial map={tex} color={[0.9, 0.9, 0.9]} />
    </mesh>
  );
};

// ── the commentary booth ─────────────────────────────────────────────────────

/** A broadcast desk in a packed stadium at night: mics, a LIVE light, the crowd, the jumbotron. */
export const Booth: React.FC = () => {
  const f = useCurrentFrame();
  const live = Math.floor(f / 12) % 2 === 0 ? 3 : 1.2;
  return (
    <>
      <color attach="background" args={["#0b0d1c"]} />
      <hemisphereLight args={["#7c8cff", "#140f20", 0.5]} />
      <Spot p={[-1.5, 3.2, 3]} aim={[0, 1.2, 0]} color="#ffd4a0" intensity={40} shadow />
      <directionalLight position={[0, 3, -4]} intensity={2.2} color="#7fa8ff" />
      {/* the desk */}
      <RBox p={[0, 0.5, 0.75]} s={[2.4, 1.0, 0.7]} c="#1d2340" r={0.05} />
      <RBox p={[0, 1.02, 0.75]} s={[2.5, 0.06, 0.8]} c="#2c3566" r={0.02} />
      <Sign text="LIVE" p={[0, 0.62, 1.105]} w={0.9} h={0.32} bg="#c1121f" fg="#fff" glow={live} />
      {/* two desk mics */}
      {[-0.55, 0.6].map((x) => (
        <group key={x} position={[x, 1.05, 0.95]}>
          <mesh position={[0, 0.16, 0]} castShadow>
            <cylinderGeometry args={[0.012, 0.012, 0.32, 8]} />
            <meshStandardMaterial color="#222" metalness={0.6} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.36, 0]} castShadow>
            <sphereGeometry args={[0.06, 16, 12]} />
            <meshStandardMaterial color="#444" metalness={0.5} roughness={0.5} />
          </mesh>
        </group>
      ))}
      {/* stadium floodlights and crowd glitter far behind */}
      {[-3, 3].map((x) => (
        <group key={x} position={[x, 4.2, -9]}>
          {Array.from({ length: 6 }, (_, i) => (
            <mesh key={i} position={[(i % 3) * 0.4 - 0.4, Math.floor(i / 3) * 0.4, 0]}>
              <sphereGeometry args={[0.16, 12, 8]} />
              <meshBasicMaterial color={[4, 3.8, 3.2]} toneMapped={false} />
            </mesh>
          ))}
        </group>
      ))}
      <Bokeh n={50} z={-6} spread={[-6, 6]} y={[0.3, 2.6]} colors={["#ffd166", "#ef476f", "#4cc9f0", "#ffffff"]} size={0.07} />
      {/* the jumbotron: Jiya's game, live */}
      <group position={[0, 3.3, -6]}>
        <RBox p={[0, 0, -0.08]} s={[3.3, 1.95, 0.12]} c="#111" r={0.03} />
        <Jumbotron />
        <Sign text="JIYA  ·  LIVE" p={[0, -1.15, 0]} w={2.4} h={0.32} bg="#c1121f" fg="#fff" glow={2} />
      </group>
      {/* the crowd: rows of heads bobbing in the stands */}
      {Array.from({ length: 4 }, (_, row) =>
        Array.from({ length: 26 }, (_, i) => {
          const bob = Math.abs(Math.sin(f * 0.35 + i * 1.7 + row)) * 0.08;
          return (
            <mesh key={`${row}-${i}`} position={[-6.5 + i * 0.52 + (row % 2) * 0.26, 0.55 + row * 0.42 + bob, -3.2 - row * 0.6]}>
              <sphereGeometry args={[0.17, 10, 8]} />
              <meshStandardMaterial color={["#3d6fe0", "#e9c46a", "#f4a261", "#e76f51", "#c77dff", "#2a9d8f"][(i + row * 3) % 6]} roughness={0.8} />
            </mesh>
          );
        }),
      )}
      <mesh position={[0, 0, -2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#15182b" roughness={0.9} />
      </mesh>
    </>
  );
};

// ── the awards ceremony (in the bedroom) ─────────────────────────────────────

/**
 * Everything Zack needs to accept an award for her high score, set down in the middle of the
 * bedroom: a podium, a trophy taller than him, a spotlight, confetti and fireworks going off
 * under the ceiling. Zack stands on the top block at `p` + [0, 0.7, 0].
 */
export const Ceremony: React.FC<{ p: Vec3 }> = ({ p }) => {
  const f = useCurrentFrame();
  const confetti = useMemo(
    () =>
      Array.from({ length: 140 }, (_, i) => ({
        x: (seeded(i) - 0.5) * 4,
        z: (seeded(i * 3) - 0.5) * 2.4,
        y0: seeded(i * 7) * 3.2,
        speed: 0.018 + seeded(i * 11) * 0.02,
        spin: seeded(i * 13) * 0.4,
        c: ["#ffd23f", "#ff5d8f", "#4ade80", "#5ec8ff", "#ffffff", "#c77dff"][i % 6],
      })),
    [],
  );
  return (
    <group position={p}>
      <Spot p={[0, 3.1, 1.5]} aim={[0, 1.0, 0]} color="#fff2d0" intensity={45} angle={0.45} shadow />
      {/* blocks: 2 left, 1 centre, 3 right */}
      <RBox p={[0, 0.35, 0]} s={[0.85, 0.7, 0.7]} c="#f4f1ea" r={0.03} />
      <RBox p={[-0.88, 0.22, 0]} s={[0.85, 0.44, 0.7]} c="#e7e3da" r={0.03} />
      <RBox p={[0.88, 0.16, 0]} s={[0.85, 0.32, 0.7]} c="#e7e3da" r={0.03} />
      <Sign text="1" p={[0, 0.36, 0.355]} w={0.36} h={0.36} bg="#f4f1ea" fg="#e0a100" font={0.9} />
      <Sign text="2" p={[-0.88, 0.22, 0.355]} w={0.28} h={0.28} bg="#e7e3da" fg="#8d99ae" font={0.9} />
      <Sign text="3" p={[0.88, 0.16, 0.355]} w={0.24} h={0.24} bg="#e7e3da" fg="#b5651d" font={0.9} />
      <Trophy p={[0.88, 0.32, 0]} />
      {confetti.map((c, i) => {
        const y = 3.2 - ((c.y0 + f * c.speed * 3) % 3.2);
        return (
          <mesh key={i} position={[c.x + Math.sin(f * 0.1 + i) * 0.08, y, c.z]} rotation={[f * c.spin, f * c.spin * 0.7, i]}>
            <planeGeometry args={[0.05, 0.08]} />
            <meshStandardMaterial color={c.c} side={THREE.DoubleSide} emissive={c.c} emissiveIntensity={0.35} />
          </mesh>
        );
      })}
      <Fireworks />
    </group>
  );
};

/** A gold cup on a stand, taller than Zack. */
const Trophy: React.FC<{ p: Vec3 }> = ({ p }) => {
  const cup = useMemo(() => {
    const pts = [
      [0.0, 0.0],
      [0.22, 0.0],
      [0.22, 0.05],
      [0.08, 0.1],
      [0.06, 0.45],
      [0.1, 0.55],
      [0.32, 0.75],
      [0.4, 1.15],
      [0.42, 1.3],
      [0.38, 1.3],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    return new THREE.LatheGeometry(pts, 40);
  }, []);
  return (
    <group position={p}>
      <mesh geometry={cup} castShadow>
        <meshStandardMaterial color="#f2c14e" metalness={1} roughness={0.22} side={THREE.DoubleSide} />
      </mesh>
      {[-1, 1].map((sd) => (
        <mesh key={sd} position={[sd * 0.44, 1.0, 0]} rotation={[0, 0, sd * 0.2]}>
          <torusGeometry args={[0.13, 0.03, 10, 24, Math.PI]} />
          <meshStandardMaterial color="#f2c14e" metalness={1} roughness={0.22} />
        </mesh>
      ))}
    </group>
  );
};

/** Bursts of sparks under the ceiling, a new one every few beats. */
const Fireworks: React.FC = () => {
  const f = useCurrentFrame();
  const bursts = [
    { at: 4, x: -1.4, y: 2.4, c: [5, 3.2, 0.6] },
    { at: 14, x: 1.3, y: 2.6, c: [4, 0.8, 2.6] },
    { at: 26, x: -0.4, y: 2.8, c: [0.8, 3, 5] },
    { at: 40, x: 1.0, y: 2.3, c: [5, 3.2, 0.6] },
    { at: 52, x: -1.2, y: 2.7, c: [0.8, 4, 1.2] },
  ];
  return (
    <>
      {bursts.map((b, k) => {
        const t = f - b.at;
        if (t < 0 || t > 22) return null;
        const r = 0.15 + t * 0.045;
        const fade = 1 - t / 22;
        return (
          <group key={k} position={[b.x, b.y - t * t * 0.0012, 0]}>
            {Array.from({ length: 22 }, (_, i) => {
              const a = (i / 22) * Math.PI * 2;
              const e = (seeded(i + k * 31) - 0.5) * 1.4;
              return (
                <mesh key={i} position={[Math.cos(a) * r, Math.sin(a) * r, Math.sin(e) * r * 0.6]}>
                  <sphereGeometry args={[0.025, 6, 4]} />
                  <meshBasicMaterial color={[b.c[0] * fade, b.c[1] * fade, b.c[2] * fade]} toneMapped={false} />
                </mesh>
              );
            })}
          </group>
        );
      })}
    </>
  );
};

// ── the server room on fire ──────────────────────────────────────────────────

/** Rows of racks blinking red, an alarm light sweeping, and the middle rack on fire. */
export const ServerRoom: React.FC = () => {
  const f = useCurrentFrame();
  const sweep = f * 0.35;
  return (
    <>
      <color attach="background" args={["#05070c"]} />
      <hemisphereLight args={["#3b5bdb", "#0a0a0a", 0.25]} />
      {/* rotating red alarm light */}
      <pointLight position={[Math.sin(sweep) * 2, 2.9, Math.cos(sweep) * 1.2 - 1]} intensity={14} distance={7} color="#ff2a2a" decay={1.3} />
      <mesh position={[0, 3.0, -1]}>
        <sphereGeometry args={[0.12, 16, 12]} />
        <meshBasicMaterial color={[5, 0.3, 0.3]} toneMapped={false} />
      </mesh>
      {/* two rows of racks running away from camera */}
      {[-1.15, 1.15].map((x) =>
        Array.from({ length: 6 }, (_, k) => (
          <group key={`${x}${k}`} position={[x, 0, -k * 0.75]} rotation={[0, x < 0 ? Math.PI / 2 : -Math.PI / 2, 0]}>
            <RBox p={[0, 1.0, 0]} s={[0.7, 2.0, 0.55]} c="#151a24" r={0.02} rough={0.4} />
            {Array.from({ length: 14 }, (_, j) => {
              const on = seeded(j * 17 + k * 5 + Math.floor(f / 3) + (x > 0 ? 99 : 0)) > 0.45;
              const red = seeded(j + k * 3) > 0.5;
              return (
                <mesh key={j} position={[-0.25 + (j % 7) * 0.08, 0.3 + Math.floor(j / 7) * 0.9 + (j % 3) * 0.2, 0.28]}>
                  <boxGeometry args={[0.03, 0.02, 0.01]} />
                  <meshBasicMaterial color={on ? (red ? [4, 0.2, 0.2] : [0.3, 3, 0.6]) : [0.05, 0.05, 0.05]} toneMapped={false} />
                </mesh>
              );
            })}
          </group>
        )),
      )}
      {/* the rack at the end, on fire */}
      <RBox p={[0, 1.0, -3.2]} s={[0.8, 2.0, 0.6]} c="#0f1218" r={0.02} />
      {Array.from({ length: 9 }, (_, i) => {
        const flick = 0.75 + 0.25 * Math.sin(f * 0.9 + i * 2.1) + 0.15 * Math.sin(f * 2.3 + i);
        const x = (i - 4) * 0.11;
        const h = (0.7 + seeded(i) * 0.6) * flick;
        return (
          <mesh key={i} position={[x, 2.0 + h / 2, -3.0]}>
            <coneGeometry args={[0.12 + seeded(i * 3) * 0.06, h, 10]} />
            <meshBasicMaterial color={i % 3 ? [2.2, 0.7, 0.08] : [2.4, 1.5, 0.3]} toneMapped={false} transparent opacity={0.85} />
          </mesh>
        );
      })}
      <pointLight position={[0, 2.5, -2.6]} intensity={12 + Math.sin(f * 1.3) * 4} distance={6} color="#ff8a2a" decay={1.3} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#0d1018" roughness={0.3} metalness={0.4} />
      </mesh>
    </>
  );
};

// ── the city his tower flattens ─────────────────────────────────────────────

/**
 * Downtown at dusk with a tower of game floors standing in the middle of it. At `fall` the tower
 * tips over to the right, slams through two buildings (which keel over in turn) and throws up a
 * dust cloud.
 */
export const City: React.FC<{ fall: number }> = ({ fall }) => {
  const f = useCurrentFrame();
  const t = Math.max(0, f - fall);
  // accelerates like a real topple, stops on the ground
  const tip = Math.min(Math.PI / 2 - 0.08, 0.004 * t * t);
  const hit = fall + 22;
  const knock = (delay: number) => Math.min(0.9, Math.max(0, f - hit - delay) ** 2 * 0.006);
  const windows = useMemo(
    () =>
      canvasTexture(128, 256, (g) => {
        g.fillStyle = "#2b2f45";
        g.fillRect(0, 0, 128, 256);
        for (let y = 8; y < 256; y += 22)
          for (let x = 8; x < 128; x += 24) {
            g.fillStyle = seeded(x * 7 + y * 13) > 0.45 ? "#ffd27a" : "#3d4260";
            g.fillRect(x, y, 14, 12);
          }
      }),
    [],
  );
  const buildings = useMemo(
    () =>
      Array.from({ length: 34 }, (_, i) => ({
        x: -9 + (i % 17) * 1.1 + seeded(i) * 0.4,
        z: -3 - Math.floor(i / 17) * 2.2 - seeded(i * 3) * 0.8,
        h: 1.4 + seeded(i * 7) * 3.2,
        w: 0.7 + seeded(i * 11) * 0.4,
      })),
    [],
  );
  const shake = f > hit && f < hit + 14 ? Math.sin(f * 3) * 0.04 * (1 - (f - hit) / 14) : 0;
  return (
    <>
      <color attach="background" args={["#f0a06a"]} />
      <fog attach="fog" args={["#e89a6e", 8, 26]} />
      <hemisphereLight args={["#ffd1a8", "#3a2a40", 0.8]} />
      <directionalLight position={[-6, 6, 4]} intensity={2.2} color="#ffc48a" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-12} shadow-camera-right={12} shadow-camera-top={12} shadow-camera-bottom={-12} />
      <group position={[0, shake, 0]}>
        {buildings.map((b, i) => (
          <mesh key={i} position={[b.x, b.h / 2, b.z]} castShadow receiveShadow>
            <boxGeometry args={[b.w, b.h, b.w]} />
            <meshStandardMaterial map={windows} roughness={0.8} />
          </mesh>
        ))}
        {/* the two buildings in its way, pivoting at their base */}
        {[
          [2.6, 2.6, 0],
          [4.3, 2.0, 6],
        ].map(([x, h, d], i) => (
          <group key={i} position={[x, 0, -0.6]} rotation={[0, 0, -knock(d)]}>
            <mesh position={[0, h / 2, 0]} castShadow>
              <boxGeometry args={[0.9, h, 0.9]} />
              <meshStandardMaterial map={windows} roughness={0.8} />
            </mesh>
          </group>
        ))}
        {/* his tower: game floors stacked into the sky, pivoting at its base */}
        <group position={[0, 0, -0.6]} rotation={[0, 0, -tip]}>
          {Array.from({ length: 14 }, (_, i) => (
            <group key={i} position={[Math.sin(i * 1.3) * 0.05 * (1 + tip), 0.25 + i * 0.5, 0]}>
              <RBox s={[0.9, 0.46, 0.9]} c={i % 2 ? "#b5462f" : "#c4553b"} r={0.03} />
              <mesh position={[0, 0, 0.455]}>
                <planeGeometry args={[0.6, 0.22]} />
                <meshStandardMaterial color="#9fd3ff" emissive="#9fd3ff" emissiveIntensity={0.3} />
              </mesh>
            </group>
          ))}
        </group>
        {/* dust where it lands */}
        {f > hit &&
          Array.from({ length: 26 }, (_, i) => {
            const u = f - hit;
            const a = seeded(i) * Math.PI;
            const r = 0.4 + u * (0.08 + seeded(i * 3) * 0.06);
            return (
              <mesh key={i} position={[4 + Math.cos(a) * r, 0.3 + Math.sin(a) * r * 0.5, -0.6 + (seeded(i * 5) - 0.5) * 1.5]}>
                <sphereGeometry args={[0.35 + u * 0.03, 10, 8]} />
                <meshStandardMaterial color="#c9b8a6" transparent opacity={Math.max(0, 0.75 - u * 0.02)} depthWrite={false} />
              </mesh>
            );
          })}
      </group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#4a4652" roughness={0.9} />
      </mesh>
    </>
  );
};

// ── the planet ───────────────────────────────────────────────────────────────

/** Earth from orbit, with one city glowing red and smoking: wherever his "lag" came from. */
export const Earth: React.FC = () => {
  const f = useCurrentFrame();
  const map = useMemo(
    () =>
      canvasTexture(2048, 1024, (g) => {
        // deep ocean, lighter towards the equator
        const sea = g.createLinearGradient(0, 0, 0, 1024);
        sea.addColorStop(0, "#0d2f63");
        sea.addColorStop(0.5, "#1f5fa8");
        sea.addColorStop(1, "#0d2f63");
        g.fillStyle = sea;
        g.fillRect(0, 0, 2048, 1024);
        // continents: clusters of soft overlapping blobs, blurred so the coasts look organic
        g.filter = "blur(5px)";
        const lands = [
          [420, 330, 1.2],
          [560, 620, 0.9],
          [1050, 300, 1.4],
          [1120, 560, 1.0],
          [1500, 420, 1.1],
          [1700, 720, 0.7],
        ];
        lands.forEach(([cx, cy, sc], k) => {
          for (let i = 0; i < 26; i++) {
            const a = seeded(k * 40 + i) * Math.PI * 2;
            const d = seeded(k * 40 + i * 3) * 150 * sc;
            const r = (40 + seeded(k * 40 + i * 7) * 70) * sc;
            g.fillStyle = seeded(k * 40 + i * 11) > 0.72 ? "#b89b62" : seeded(k + i) > 0.5 ? "#3d8a46" : "#2f7a3c";
            g.beginPath();
            g.ellipse(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.7, r, r * 0.75, a, 0, Math.PI * 2);
            g.fill();
          }
        });
        // ice caps
        g.fillStyle = "#eef5ff";
        g.fillRect(0, 0, 2048, 36);
        g.fillRect(0, 988, 2048, 36);
        g.filter = "none";
      }),
    [],
  );
  const clouds = useMemo(
    () =>
      canvasTexture(2048, 1024, (g) => {
        g.clearRect(0, 0, 2048, 1024);
        g.filter = "blur(4px)";
        for (let i = 0; i < 90; i++) {
          g.fillStyle = `rgba(255,255,255,${0.12 + seeded(i * 9) * 0.2})`;
          g.beginPath();
          g.ellipse(seeded(i * 2.3) * 2048, 120 + seeded(i * 4.1) * 780, 50 + seeded(i) * 120, 10 + seeded(i * 6) * 18, (seeded(i * 8) - 0.5) * 0.4, 0, Math.PI * 2);
          g.fill();
        }
        g.filter = "none";
      }),
    [],
  );
  const stars = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pts = new Float32Array(900 * 3);
    for (let i = 0; i < 900; i++) {
      const a = seeded(i) * Math.PI * 2;
      const b = (seeded(i * 3) - 0.5) * Math.PI;
      pts.set([Math.cos(a) * Math.cos(b) * 60, Math.sin(b) * 60, Math.sin(a) * Math.cos(b) * 60], i * 3);
    }
    g.setAttribute("position", new THREE.BufferAttribute(pts, 3));
    return g;
  }, []);
  const pulse = 1 + Math.sin(f * 0.6) * 0.25;
  // the burning city sits on the face turned to the camera, upper right
  const spot = new THREE.Vector3(0.45, 0.5, 0.74).normalize().multiplyScalar(2.0);
  return (
    <>
      <color attach="background" args={["#02030a"]} />
      <points geometry={stars}>
        <pointsMaterial color="#ffffff" size={0.12} sizeAttenuation />
      </points>
      <ambientLight intensity={0.15} />
      <directionalLight position={[-5, 3, 5]} intensity={2.6} color="#fff4e0" />
      <group rotation={[0.25, -0.6 + f * 0.002, 0]}>
        <mesh>
          <sphereGeometry args={[2, 64, 48]} />
          <meshStandardMaterial map={map} roughness={0.6} metalness={0.05} />
        </mesh>
        <mesh>
          <sphereGeometry args={[2.03, 64, 48]} />
          <meshStandardMaterial map={clouds} transparent depthWrite={false} />
        </mesh>
      </group>
      {/* atmosphere */}
      {[2.06, 2.12, 2.2].map((r, i) => (
        <mesh key={r}>
          <sphereGeometry args={[r, 64, 48]} />
          <meshBasicMaterial color="#7cc4ff" transparent opacity={[0.14, 0.08, 0.04][i]} side={THREE.BackSide} depthWrite={false} />
        </mesh>
      ))}
      {/* the one city on fire */}
      <mesh position={spot.toArray()}>
        <sphereGeometry args={[0.06 * pulse, 16, 12]} />
        <meshBasicMaterial color={[6, 0.6, 0.2]} toneMapped={false} />
      </mesh>
      <pointLight position={spot.clone().multiplyScalar(1.05).toArray()} intensity={3 * pulse} distance={1.5} color="#ff3a1a" />
      {Array.from({ length: 8 }, (_, i) => {
        const u = ((f * 0.03 + i / 8) % 1) * 0.6;
        const p = spot.clone().multiplyScalar(1 + u * 0.35);
        return (
          <mesh key={i} position={p.toArray()}>
            <sphereGeometry args={[0.04 + u * 0.12, 10, 8]} />
            <meshStandardMaterial color="#4a4a4a" transparent opacity={0.6 * (1 - u / 0.6)} depthWrite={false} />
          </mesh>
        );
      })}
    </>
  );
};
