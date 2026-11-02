import React, { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { continueRender, delayRender, staticFile } from "remotion";

/**
 * Zack and Jiya's bedroom: the one set every episode plays in. Warm evening light from the
 * window, a gamer desk on the right, Jiya's bed on the left, the door off to the right.
 * Floor at y=0, back wall at z=-3, left wall at x=-3.4.
 */

type Vec3 = [number, number, number];

/** Loads a texture from public/ and holds the render until it's ready. */
export function useTexture(path: string | null): THREE.Texture | null {
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  const [handle] = useState(() => (path ? delayRender(`texture ${path}`) : null));
  useEffect(() => {
    if (!path || handle === null) return;
    new THREE.TextureLoader().load(staticFile(path), (t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      setTex(t);
      continueRender(handle);
    });
  }, [path, handle]);
  return tex;
}

export function canvasTexture(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** Deterministic pseudo-random numbers so every render draws the same textures. */
function rng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

export const RBox: React.FC<{ s: Vec3; p?: Vec3; c: string; r?: number; rough?: number; rot?: Vec3; e?: number; map?: THREE.Texture }> = ({
  s,
  p,
  c,
  r = 0.04,
  rough = 0.7,
  rot,
  e = 0,
  map,
}) => {
  const geo = useMemo(() => new RoundedBoxGeometry(s[0], s[1], s[2], 4, Math.min(r, Math.min(...s) / 2 - 0.001)), [s[0], s[1], s[2], r]);
  return (
    <mesh geometry={geo} position={p} rotation={rot} castShadow receiveShadow>
      <meshStandardMaterial color={c} roughness={rough} emissive={e ? c : "#000"} emissiveIntensity={e} map={map} />
    </mesh>
  );
};

const Floor: React.FC<{ night?: boolean }> = ({ night }) => {
  const tex = useMemo(
    () =>
      canvasTexture(1024, 1024, (g) => {
        const rand = rng(7);
        const plank = 1024 / 8;
        for (let i = 0; i < 8; i++) {
          let y = -rand() * 400;
          while (y < 1024) {
            const len = 300 + rand() * 400;
            const shade = 150 + rand() * 30;
            g.fillStyle = `rgb(${shade + 40}, ${shade - 10}, ${shade - 60})`;
            g.fillRect(i * plank, y, plank, len);
            // grain
            g.strokeStyle = "rgba(90,50,20,0.12)";
            for (let k = 0; k < 6; k++) {
              g.beginPath();
              const x = i * plank + 10 + rand() * (plank - 20);
              g.moveTo(x, y);
              g.bezierCurveTo(x + 8, y + len / 3, x - 8, y + (2 * len) / 3, x, y + len);
              g.stroke();
            }
            g.fillStyle = "rgba(60,30,10,0.5)";
            g.fillRect(i * plank, y, plank, 3);
            y += len;
          }
          g.fillStyle = "rgba(60,30,10,0.45)";
          g.fillRect(i * plank, 0, 3, 1024);
        }
      }),
    [],
  );
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2.5, 2.5);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[14, 14]} />
      <meshStandardMaterial map={tex} roughness={0.55} color={night ? "#9a8478" : "#ffffff"} />
    </mesh>
  );
};

/** Dusk sky with a city skyline, seen through the window. */
const SkyView: React.FC<{ night?: boolean }> = ({ night }) => {
  const tex = useMemo(
    () =>
      canvasTexture(1024, 768, (g) => {
        const grad = g.createLinearGradient(0, 0, 0, 768);
        const stops: [number, string][] = night
          ? [[0, "#0b1030"], [0.5, "#1d2560"], [0.8, "#4a3a7a"], [1, "#8a5a8a"]]
          : [[0, "#3a2d6b"], [0.45, "#a45ba8"], [0.75, "#ff9a76"], [1, "#ffcf8a"]];
        stops.forEach(([k, c]) => grad.addColorStop(k, c));
        g.fillStyle = grad;
        g.fillRect(0, 0, 1024, 768);
        const rand = rng(3);
        // two rows of buildings, the far one hazier
        [
          ["#6c4f8f", 0.62],
          ["#3b2c5a", 0.75],
        ].forEach(([col0, base], row) => {
          const col = night ? (row ? "#151a38" : "#2a2c58") : col0;
          let x = -20;
          while (x < 1050) {
            const w = 50 + rand() * 90;
            const h = 80 + rand() * (row ? 260 : 200);
            g.fillStyle = col as string;
            g.fillRect(x, 768 * (base as number) - h + 200, w, h + 400);
            if (row) {
              for (let wy = 768 * (base as number) - h + 220; wy < 768; wy += 22) {
                for (let wx = x + 8; wx < x + w - 10; wx += 16) {
                  if (rand() < 0.3) {
                    g.fillStyle = rand() < 0.5 ? "#ffd38a" : "#ffe9b8";
                    g.fillRect(wx, wy, 7, 10);
                  }
                }
              }
            }
            x += w + 4;
          }
        });
      }),
    [night],
  );
  return (
    <mesh position={[0, 0, 0.005]}>
      <planeGeometry args={[2.3, 1.7]} />
      <meshBasicMaterial map={tex} toneMapped={false} />
    </mesh>
  );
};

const Window: React.FC<{ p: Vec3; night?: boolean }> = ({ p, night }) => (
  <group position={p}>
    <SkyView night={night} />
    {/* frame and cross bars */}
    {[
      [0, 0.86, 2.4, 0.08],
      [0, -0.86, 2.4, 0.08],
      [-1.17, 0, 0.08, 1.8],
      [1.17, 0, 0.08, 1.8],
      [0, 0, 0.05, 1.7],
      [0, 0, 2.3, 0.05],
    ].map(([x, y, w, h], i) => (
      <RBox key={i} p={[x, y, 0.04]} s={[w, h, 0.08]} c="#f4efe6" r={0.015} />
    ))}
    <RBox p={[0, -0.93, 0.08]} s={[2.6, 0.06, 0.22]} c="#f4efe6" r={0.02} />
    {/* curtains */}
    {[-1, 1].map((side) => (
      <group key={side} position={[side * 1.45, 0.05, 0.12]}>
        {[0, 1, 2].map((k) => (
          <mesh key={k} position={[side * k * 0.09 - side * 0.09, 0, 0]} castShadow>
            <capsuleGeometry args={[0.07, 1.9, 8, 16]} />
            <meshPhysicalMaterial color="#ffd9a8" roughness={0.9} sheen={1} sheenColor="#fff" />
          </mesh>
        ))}
      </group>
    ))}
  </group>
);

const Poster: React.FC<{ p: Vec3; w: number; h: number; draw: (g: CanvasRenderingContext2D, W: number, H: number) => void; rot?: Vec3 }> = ({ p, w, h, draw, rot }) => {
  const tex = useMemo(() => canvasTexture(Math.round(w * 400), Math.round(h * 400), (g) => draw(g, w * 400, h * 400)), []);
  return (
    <group position={p} rotation={rot}>
      <RBox s={[w + 0.04, h + 0.04, 0.02]} c="#1d1d24" r={0.008} />
      <mesh position={[0, 0, 0.012]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial map={tex} roughness={0.6} />
      </mesh>
    </group>
  );
};

const Bed: React.FC = () => (
  <group position={[-2.2, 0, -1.6]}>
    <RBox p={[0, 0.17, 0]} s={[2.1, 0.34, 2.6]} c="#8a6a52" r={0.05} />
    {/* mattress and blanket */}
    <RBox p={[0, 0.44, 0]} s={[2.0, 0.22, 2.5]} c="#f6f1ea" r={0.09} rough={0.9} />
    <RBox p={[0.02, 0.56, 0.35]} s={[2.04, 0.08, 1.8]} c="#6a8fd8" r={0.04} rough={0.95} />
    <RBox p={[0.02, 0.6, -0.5]} s={[2.05, 0.06, 0.2]} c="#f6f1ea" r={0.03} rough={0.95} />
    {/* pillows */}
    <RBox p={[-0.45, 0.66, -1.0]} s={[0.8, 0.2, 0.45]} c="#ffffff" r={0.09} rough={0.95} />
    <RBox p={[0.45, 0.66, -1.0]} s={[0.8, 0.2, 0.45]} c="#ffd1dc" r={0.09} rough={0.95} />
    {/* headboard */}
    <RBox p={[0, 0.75, -1.33]} s={[2.1, 0.9, 0.1]} c="#8a6a52" r={0.04} />
    {/* plush */}
    <group position={[0.6, 0.72, -0.85]}>
      <mesh castShadow>
        <sphereGeometry args={[0.16, 24, 16]} />
        <meshPhysicalMaterial color="#fff2c7" roughness={1} sheen={1} sheenColor="#fff" />
      </mesh>
      <mesh position={[0, 0.2, 0.02]} castShadow>
        <sphereGeometry args={[0.12, 24, 16]} />
        <meshPhysicalMaterial color="#fff2c7" roughness={1} sheen={1} sheenColor="#fff" />
      </mesh>
    </group>
  </group>
);

/** The gamer desk: monitor with a game on it, RGB keyboard, lamp, chair. */
const Desk: React.FC<{ monitor?: THREE.Texture | null }> = ({ monitor }) => (
  <group position={[1.7, 0, -2.45]}>
    <RBox p={[0, 0.76, 0]} s={[1.9, 0.05, 0.8]} c="#2a2a33" r={0.02} rough={0.5} />
    {[-0.88, 0.88].map((x) => (
      <RBox key={x} p={[x, 0.38, 0]} s={[0.06, 0.76, 0.7]} c="#1d1d24" r={0.02} />
    ))}
    {/* monitor */}
    <group position={[0, 1.2, -0.2]}>
      <RBox s={[1.1, 0.64, 0.05]} c="#111216" r={0.02} rough={0.4} />
      <mesh position={[0, 0, 0.027]}>
        <planeGeometry args={[1.04, 0.58]} />
        {monitor ? <meshBasicMaterial map={monitor} toneMapped={false} color="#bbbbbb" /> : <meshBasicMaterial color="#20324a" />}
      </mesh>
      <RBox p={[0, -0.38, -0.03]} s={[0.06, 0.2, 0.06]} c="#111216" />
      <RBox p={[0, -0.43, 0]} s={[0.3, 0.02, 0.2]} c="#111216" />
    </group>
    {/* RGB keyboard */}
    <RBox p={[-0.05, 0.8, 0.18]} s={[0.6, 0.03, 0.2]} c="#16161c" r={0.01} />
    <mesh position={[-0.05, 0.816, 0.18]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[0.56, 0.16]} />
      <meshBasicMaterial color="#c86bff" transparent opacity={0.55} />
    </mesh>
    <RBox p={[0.45, 0.795, 0.2]} s={[0.1, 0.03, 0.15]} c="#16161c" r={0.012} />
    {/* lamp */}
    <group position={[-0.75, 0.78, -0.15]}>
      <RBox p={[0, 0.02, 0]} s={[0.18, 0.04, 0.18]} c="#f4efe6" r={0.015} />
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 0.45, 8]} />
        <meshStandardMaterial color="#f4efe6" />
      </mesh>
      <mesh position={[0.06, 0.48, 0]} rotation={[0, 0, -0.5]}>
        <coneGeometry args={[0.12, 0.16, 24, 1, true]} />
        <meshStandardMaterial color="#f4efe6" side={THREE.DoubleSide} emissive="#ffd9a0" emissiveIntensity={0.2} />
      </mesh>
      {/* bulb, bright enough to bloom */}
      <mesh position={[0.1, 0.43, 0]}>
        <sphereGeometry args={[0.04, 16, 12]} />
        <meshBasicMaterial color={[9, 6.3, 3.9]} />
      </mesh>
    </group>
    {/* energy drink can */}
    <mesh position={[0.7, 0.86, 0.15]} castShadow>
      <cylinderGeometry args={[0.04, 0.04, 0.16, 20]} />
      <meshStandardMaterial color="#25d07a" metalness={0.6} roughness={0.3} />
    </mesh>
  </group>
);

const Chair: React.FC<{ p: Vec3; rotY?: number }> = ({ p, rotY = 0 }) => (
  <group position={p} rotation={[0, rotY, 0]}>
    <RBox p={[0, 0.5, 0]} s={[0.6, 0.12, 0.6]} c="#1f1f27" r={0.05} />
    <RBox p={[0, 1.0, -0.28]} s={[0.6, 0.9, 0.12]} c="#1f1f27" r={0.06} />
    <RBox p={[0, 1.02, -0.21]} s={[0.12, 0.8, 0.02]} c="#ff3d6e" r={0.005} e={0.5} />
    <mesh position={[0, 0.25, 0]}>
      <cylinderGeometry args={[0.04, 0.04, 0.45, 12]} />
      <meshStandardMaterial color="#555" metalness={0.6} roughness={0.3} />
    </mesh>
    <RBox p={[0, 0.04, 0]} s={[0.6, 0.05, 0.08]} c="#333" />
    <RBox p={[0, 0.04, 0]} s={[0.08, 0.05, 0.6]} c="#333" />
  </group>
);

const Shelf: React.FC = () => (
  <group position={[1.6, 2.15, -2.88]}>
    <RBox s={[1.4, 0.05, 0.25]} c="#f4efe6" r={0.01} />
    {/* little figurines and a trophy */}
    <mesh position={[-0.5, 0.12, 0]} castShadow>
      <capsuleGeometry args={[0.05, 0.08, 6, 12]} />
      <meshStandardMaterial color="#ff6b6b" roughness={0.5} />
    </mesh>
    <mesh position={[-0.3, 0.11, 0]} castShadow>
      <sphereGeometry args={[0.08, 20, 14]} />
      <meshStandardMaterial color="#4ade80" roughness={0.5} />
    </mesh>
    <group position={[0.1, 0.03, 0]}>
      <mesh position={[0, 0.03, 0]}>
        <cylinderGeometry args={[0.05, 0.06, 0.06, 16]} />
        <meshStandardMaterial color="#2a2a33" />
      </mesh>
      <mesh position={[0, 0.16, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.03, 0.18, 20]} />
        <meshStandardMaterial color="#f5c542" metalness={0.8} roughness={0.25} />
      </mesh>
    </group>
    {[0.35, 0.42, 0.49].map((x, i) => (
      <RBox key={i} p={[x, 0.12, 0]} s={[0.05, 0.2, 0.16]} c={["#6a8fd8", "#ff9a76", "#c7a8f2"][i]} r={0.008} />
    ))}
  </group>
);

/** Neon LED strip running along the top of the walls. */
const LedStrip: React.FC = () => (
  <group>
    <mesh position={[0, 3.25, -2.97]}>
      <boxGeometry args={[6.8, 0.03, 0.02]} />
      <meshBasicMaterial color={[3.3, 1.35, 4.5]} toneMapped={false} />
    </mesh>
    <mesh position={[-3.37, 3.25, 0]} rotation={[0, Math.PI / 2, 0]}>
      <boxGeometry args={[6, 0.03, 0.02]} />
      <meshBasicMaterial color={[3.3, 1.35, 4.5]} toneMapped={false} />
    </mesh>
  </group>
);

const Rug: React.FC<{ night?: boolean }> = ({ night }) => {
  const tex = useMemo(
    () =>
      canvasTexture(512, 512, (g) => {
        g.fillStyle = "#e9e1f2";
        g.beginPath();
        g.arc(256, 256, 256, 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = "#c7a8f2";
        g.lineWidth = 18;
        for (const r of [200, 140, 80]) {
          g.beginPath();
          g.arc(256, 256, r, 0, Math.PI * 2);
          g.stroke();
        }
      }),
    [],
  );
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.2, 0.006, -0.2]} receiveShadow>
      <circleGeometry args={[1.5, 64]} />
      <meshStandardMaterial map={tex} transparent roughness={1} color={night ? "#8f86a6" : "#ffffff"} />
    </mesh>
  );
};


/** Warm fairy lights draped across the top of the window. */
const FairyLights: React.FC = () => {
  const bulbs = useMemo(() => {
    const out: Vec3[] = [];
    for (let i = 0; i <= 22; i++) {
      const t = i / 22;
      const x = -2.4 + t * 3.0;
      // two sagging loops
      const sag = Math.sin(t * Math.PI * 2) ** 2 * 0.22;
      out.push([x, 2.85 - sag, -2.9]);
    }
    return out;
  }, []);
  const wire = useMemo(() => new THREE.CatmullRomCurve3(bulbs.map((b) => new THREE.Vector3(b[0], b[1] + 0.03, b[2]))), [bulbs]);
  return (
    <group>
      <mesh>
        <tubeGeometry args={[wire, 80, 0.004, 6, false]} />
        <meshStandardMaterial color="#3a3a3a" />
      </mesh>
      {bulbs.map((b, i) => (
        <mesh key={i} position={b}>
          <sphereGeometry args={[0.022, 12, 10]} />
          <meshBasicMaterial color={new THREE.Color(i % 3 === 0 ? "#ffd27a" : i % 3 === 1 ? "#ffb36b" : "#ffe7a8").multiplyScalar(5)} toneMapped={false} />
        </mesh>
      ))}
      <pointLight position={[-0.9, 2.7, -2.7]} intensity={1.5} distance={2.5} color="#ffc070" decay={1.8} />
    </group>
  );
};

/** A potted plant with big rounded leaves. */
export const Plant: React.FC<{ p: Vec3 }> = ({ p }) => (
  <group position={p}>
    <mesh position={[0, 0.18, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[0.2, 0.15, 0.36, 28]} />
      <meshStandardMaterial color="#f0e2cf" roughness={0.8} />
    </mesh>
    {Array.from({ length: 9 }, (_, i) => {
      const a = (i / 9) * Math.PI * 2;
      const tilt = 0.5 + (i % 3) * 0.2;
      return (
        <group key={i} position={[0, 0.34, 0]} rotation={[0, a, tilt]}>
          <mesh position={[0, 0.32 + (i % 2) * 0.08, 0]} scale={[0.55, 1, 0.12]} castShadow>
            <sphereGeometry args={[0.2, 20, 14]} />
            <meshStandardMaterial color={i % 2 ? "#3f8f4f" : "#57a862"} roughness={0.55} />
          </mesh>
        </group>
      );
    })}
  </group>
);

export const Books: React.FC<{ p: Vec3; rotY?: number }> = ({ p, rotY = 0 }) => (
  <group position={p} rotation={[0, rotY, 0]}>
    {["#e76f51", "#2a9d8f", "#f4a261", "#264653"].map((c, i) => (
      <RBox key={i} p={[Math.sin(i * 2) * 0.03, 0.03 + i * 0.055, 0]} rot={[0, i * 0.25, 0]} s={[0.36 - i * 0.03, 0.05, 0.26]} c={c} r={0.01} rough={0.7} />
    ))}
  </group>
);

/** A game controller lying on the bed. */
const Controller: React.FC<{ p: Vec3; rot?: Vec3 }> = ({ p, rot }) => (
  <group position={p} rotation={rot}>
    <RBox s={[0.26, 0.05, 0.12]} c="#f4f4f6" r={0.025} rough={0.35} />
    {[-1, 1].map((side) => (
      <mesh key={side} position={[side * 0.11, -0.005, -0.04]} rotation={[0, 0, 0]} scale={[1, 0.5, 1.4]} castShadow>
        <sphereGeometry args={[0.055, 20, 14]} />
        <meshStandardMaterial color="#f4f4f6" roughness={0.35} />
      </mesh>
    ))}
    {[-0.06, 0.06].map((x) => (
      <mesh key={x} position={[x, 0.032, 0.01]}>
        <cylinderGeometry args={[0.018, 0.018, 0.02, 16]} />
        <meshStandardMaterial color="#2a2a33" />
      </mesh>
    ))}
  </group>
);

export const Clock: React.FC<{ p: Vec3 }> = ({ p }) => (
  <group position={p} rotation={[0, Math.PI / 2, 0]}>
    <mesh>
      <cylinderGeometry args={[0.18, 0.18, 0.04, 40]} />
      <meshStandardMaterial color="#ffffff" roughness={0.4} />
    </mesh>
    <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <torusGeometry args={[0.18, 0.018, 10, 40]} />
      <meshStandardMaterial color="#ff8fab" roughness={0.4} />
    </mesh>
    <mesh position={[0, 0.05, 0.025]} rotation={[0, 0, 0]}>
      <boxGeometry args={[0.012, 0.1, 0.005]} />
      <meshStandardMaterial color="#222" />
    </mesh>
    <mesh position={[0.04, 0, 0.025]} rotation={[0, 0, Math.PI / 2]}>
      <boxGeometry args={[0.01, 0.08, 0.005]} />
      <meshStandardMaterial color="#222" />
    </mesh>
  </group>
);

export const Room: React.FC<{ monitor?: THREE.Texture | null; night?: boolean }> = ({ monitor, night }) => (
  <group>
    <Floor night={night} />
    <Rug night={night} />
    {/* walls */}
    <mesh position={[0, 3, -3]} receiveShadow>
      <planeGeometry args={[14, 6]} />
      <meshStandardMaterial color={night ? "#6f6a86" : "#e6d5c3"} roughness={0.95} />
    </mesh>
    <mesh position={[-3.4, 3, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
      <planeGeometry args={[14, 6]} />
      <meshStandardMaterial color={night ? "#625d7a" : "#d9c6b4"} roughness={0.95} />
    </mesh>
    <mesh position={[3.6, 3, 0]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
      <planeGeometry args={[14, 6]} />
      <meshStandardMaterial color={night ? "#625d7a" : "#d9c6b4"} roughness={0.95} />
    </mesh>
    {/* skirting */}
    <RBox p={[0, 0.06, -2.97]} s={[14, 0.12, 0.04]} c="#f4efe6" r={0.01} />
    <Window p={[-0.9, 1.75, -2.96]} night={night} />
    <Poster
      p={[-3.36, 1.9, -0.6]}
      rot={[0, Math.PI / 2, 0]}
      w={0.7}
      h={1.0}
      draw={(g, W, H) => {
        const grad = g.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, "#2b1e5c");
        grad.addColorStop(1, "#ff5d8f");
        g.fillStyle = grad;
        g.fillRect(0, 0, W, H);
        g.fillStyle = "#ffe066";
        g.beginPath();
        g.arc(W / 2, H * 0.45, W * 0.25, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = "#fff";
        g.font = `bold ${W * 0.13}px Arial Black, Arial`;
        g.textAlign = "center";
        g.fillText("LEVEL UP", W / 2, H * 0.85);
      }}
    />
    <Poster
      p={[1.2, 1.95, -2.96]}
      w={0.5}
      h={0.7}
      draw={(g, W, H) => {
        g.fillStyle = "#14a3a3";
        g.fillRect(0, 0, W, H);
        g.fillStyle = "#fff";
        for (let i = 0; i < 5; i++) {
          g.fillRect(W * 0.2 + i * W * 0.12, H * 0.3 + (i % 2) * H * 0.1, W * 0.08, W * 0.08);
        }
        g.font = `bold ${W * 0.15}px Arial Black, Arial`;
        g.textAlign = "center";
        g.fillText("GG", W / 2, H * 0.8);
      }}
    />
    <Poster
      p={[2.15, 2.0, -2.96]}
      w={0.55}
      h={0.42}
      draw={(g, W, H) => {
        g.fillStyle = "#ffcf3f";
        g.fillRect(0, 0, W, H);
        g.fillStyle = "#1d1d24";
        g.font = `bold ${W * 0.16}px Arial Black, Arial`;
        g.textAlign = "center";
        g.fillText("PRESS", W / 2, H * 0.45);
        g.fillText("START", W / 2, H * 0.8);
      }}
    />
    <Shelf />
    <FairyLights />
    <Plant p={[-0.0, 0, -2.6]} />
    <Books p={[2.9, 0, -1.2]} rotY={0.4} />
    <Controller p={[-1.8, 0.62, -1.3]} rot={[0, 0.6, 0]} />
    <Clock p={[-3.37, 2.55, -1.6]} />
    <LedStrip />
    <Bed />
    <Desk monitor={monitor} />
    <Chair p={[2.1, 0, -1.75]} rotY={Math.PI + 0.5} />
    {/* door on the right wall */}
    <group position={[3.58, 0, 0.6]} rotation={[0, -Math.PI / 2, 0]}>
      <RBox p={[0, 1.05, 0]} s={[0.95, 2.1, 0.06]} c="#f4efe6" r={0.02} />
      <mesh position={[0.35, 1.0, 0.05]}>
        <sphereGeometry args={[0.035, 16, 12]} />
        <meshStandardMaterial color="#c9a227" metalness={0.8} roughness={0.3} />
      </mesh>
    </group>
  </group>
);

/** Evening lighting: warm window key, cool fill, purple LED bounce and the desk lamp. */
export const Lights: React.FC<{ phoneGlow?: Vec3 | null; phoneGlowIntensity?: number; mood?: "evening" | "night" }> = ({
  phoneGlow,
  phoneGlowIntensity = 1.2,
  mood = "evening",
}) =>
  mood === "night" ? (
    <NightLights phoneGlow={phoneGlow} phoneGlowIntensity={phoneGlowIntensity} />
  ) : (
  <>
    <hemisphereLight args={["#ffe2c4", "#5b4a6e", 1.1]} />
    <directionalLight
      position={[-2.5, 4.5, 2.5]}
      intensity={2.2}
      color="#ffd2a6"
      castShadow
      shadow-mapSize={[2048, 2048]}
      shadow-camera-left={-5}
      shadow-camera-right={5}
      shadow-camera-top={5}
      shadow-camera-bottom={-5}
      shadow-bias={-0.0004}
      shadow-radius={6}
    />
    {/* light coming in from the dusk window */}
    <pointLight position={[-0.9, 1.8, -2.3]} intensity={6} distance={6} color="#ff9fb0" decay={1.6} />
    <pointLight position={[0, 3.1, -2.6]} intensity={4} distance={5} color="#c77dff" decay={1.6} />
    <pointLight position={[1.0, 1.4, -2.3]} intensity={3} distance={3} color="#ffd59a" decay={1.6} />
    <directionalLight position={[3, 2, 4]} intensity={0.6} color="#9fc0ff" />
    {phoneGlow && <pointLight position={phoneGlow} intensity={phoneGlowIntensity} distance={0.9} color="#bfe9ff" decay={1.5} />}
  </>
);

/** A spotlight whose target is in the scene, so it actually aims where it's told. */
const KeySpot: React.FC<Omit<React.ComponentProps<"spotLight">, "target"> & { aim: Vec3 }> = ({ aim, ...props }) => {
  const obj = useMemo(() => new THREE.Object3D(), []);
  obj.position.set(aim[0], aim[1], aim[2]);
  return (
    <>
      <primitive object={obj} />
      <spotLight {...props} target={obj} />
    </>
  );
};

/**
 * Late-night, film-style lighting: the room falls off into blue shadow, one warm lamp key from the
 * front left shapes the faces, a cool moonlight rim from the window separates them from the
 * background, and the LED strip and fairy lights give coloured practicals.
 */
const NightLights: React.FC<{ phoneGlow?: Vec3 | null; phoneGlowIntensity: number }> = ({ phoneGlow, phoneGlowIntensity }) => (
  <>
    <hemisphereLight args={["#8fa6d9", "#2a2238", 0.45]} />
    {/* warm key, like a lamp just off-screen left */}
    <KeySpot
      position={[-2.6, 2.9, 2.4]}
      aim={[-0.4, 0.9, -0.6]}
      angle={0.75}
      penumbra={0.9}
      intensity={38}
      decay={1.6}
      distance={12}
      color="#ffc58f"
      castShadow
      shadow-mapSize={[2048, 2048]}
      shadow-bias={-0.0003}
      shadow-radius={8}
    />
    {/* cool moonlight from the window behind: rims hair and shoulders */}
    <directionalLight position={[-0.6, 3.2, -4]} intensity={2.4} color="#8fb4ff" />
    <pointLight position={[0, 3.1, -2.6]} intensity={5} distance={5} color="#b56dff" decay={1.6} />
    <pointLight position={[-0.9, 2.7, -2.6]} intensity={2.5} distance={3} color="#ffb060" decay={1.6} />
    <pointLight position={[1.0, 1.35, -2.2]} intensity={3.5} distance={2.6} color="#ffd08a" decay={1.6} />
    {phoneGlow && <pointLight position={phoneGlow} intensity={phoneGlowIntensity * 1.6} distance={1.1} color="#bfe9ff" decay={1.5} />}
  </>
);
