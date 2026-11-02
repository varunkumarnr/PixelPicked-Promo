import React, { useMemo } from "react";
import * as THREE from "three";
import { RBox, canvasTexture } from "../siblings/Room";
import { BotProps, paper } from "./Court";
import { pop } from "./CourtReel";

/**
 * The little sets for the Shark Tank reel. Each shot builds one of these at the origin; the reel
 * swaps between them every couple of seconds.
 */

export type Vec3 = [number, number, number];

// ── the sharks and their chairs ──────────────────────────────────────────────

export type Shark = { role: string; icon: string; color: string; prop: BotProps["prop"]; tie: string; offer?: string };

/**
 * Left to right as the founder sees them: AI impressions of the five sharks, judging the pitch on
 * its potential. Offers are the real ones from that run (Nov 2026).
 */
export const SHARKS: Shark[] = [
  { role: "AI Daymond", icon: "👕", color: "#ff7a2f", prop: "cap", tie: "#16141a", offer: "$1M\nfor 25%" },
  { role: "AI Barbara", icon: "🏠", color: "#ff7ad9", prop: null, tie: "#ff7ad9", offer: "$1M\nfor 20%" },
  { role: "AI Mr. Wonderful", icon: "💰", color: "#3f9e4a", prop: "glasses", tie: "#16141a", offer: "$1M\n+ROYALTY" },
  { role: "AI Cuban", icon: "🏀", color: "#3a7bff", prop: "briefcase", tie: "#1d2a6a", offer: "$1M\nfor 20%" },
  { role: "AI Lori", icon: "🛍️", color: "#b28cff", prop: "phone", tie: "#5a3a9a" },
];
export const DAYMOND = 0;
export const BARBARA = 1;
export const WONDERFUL = 2;
export const CUBAN = 3;
export const LORI = 4;



export const MARK: Vec3 = [0, 0, 1.0];
export const ARC_R = 3.0;
export const SHARK_SCALE = 0.82;
const BOT_HEAD = 1.6;

/** Shark i's chair on an arc around the founder's mark, turned to face it. */
export function chair(i: number): { p: Vec3; rotY: number; head: Vec3; facing: Vec3 } {
  const a = (i - 2) * 0.3;
  const p: Vec3 = [MARK[0] + ARC_R * Math.sin(a), 0, MARK[2] - ARC_R * Math.cos(a)];
  const rotY = -a;
  return { p, rotY, head: [p[0], p[1] + BOT_HEAD * SHARK_SCALE, p[2]], facing: [Math.sin(rotY), 0, Math.cos(rotY)] };
}

// ── shared pieces ────────────────────────────────────────────────────────────

/** The blue rug with gold rings the show is known for. */
const useRug = () =>
  useMemo(
    () =>
      canvasTexture(1024, 1024, (g) => {
        g.fillStyle = "#14306a";
        g.fillRect(0, 0, 1024, 1024);
        g.strokeStyle = "rgba(255,196,90,0.55)";
        for (let r = 80; r < 760; r += 90) {
          g.lineWidth = r % 180 ? 4 : 10;
          g.beginPath();
          g.arc(512, 512, r, 0, Math.PI * 2);
          g.stroke();
        }
        g.fillStyle = "rgba(255,255,255,0.05)";
        for (let i = 0; i < 300; i++) g.fillRect((i * 131) % 1024, (i * 337) % 1024, 3, 3);
      }),
    [],
  );

export const Floor: React.FC<{ rug?: boolean; color?: string }> = ({ rug = true, color = "#1a1410" }) => {
  const tex = useRug();
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>
      {rug && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, -0.4]} receiveShadow>
          <circleGeometry args={[3.4, 64]} />
          <meshStandardMaterial map={tex} roughness={0.85} />
        </mesh>
      )}
    </>
  );
};

/** The windows behind the sharks: a grid of warm amber panes. */
export const WindowWall: React.FC<{ z: number }> = ({ z }) => (
  <>
    <mesh position={[0, 3.5, z]} receiveShadow>
      <planeGeometry args={[18, 7]} />
      <meshStandardMaterial color="#2a1a14" roughness={1} />
    </mesh>
    {Array.from({ length: 7 }, (_, c) =>
      Array.from({ length: 3 }, (_, r) => <RBox key={`${c}-${r}`} s={[0.9, 0.95, 0.04]} p={[-3.6 + c * 1.2, 1.3 + r * 1.1, z + 0.04]} c="#ffb35a" e={1.4 - r * 0.25} r={0.01} />),
    )}
    {Array.from({ length: 8 }, (_, c) => (
      <RBox key={c} s={[0.3, 3.6, 0.1]} p={[-4.2 + c * 1.2, 2.4, z + 0.08]} c="#3a2418" rough={0.6} r={0.01} />
    ))}
    {Array.from({ length: 4 }, (_, r) => (
      <RBox key={r} s={[9, 0.15, 0.1]} p={[0, 0.75 + r * 1.1, z + 0.08]} c="#3a2418" rough={0.6} r={0.01} />
    ))}
  </>
);

const Chair: React.FC<{ p: Vec3; rotY: number }> = ({ p, rotY }) => (
  <group position={p} rotation={[0, rotY, 0]}>
    <RBox s={[0.95, 0.42, 0.8]} p={[0, 0.21, -0.1]} c="#3a2016" rough={0.45} r={0.08} />
    <RBox s={[0.95, 1.1, 0.22]} p={[0, 0.85, -0.45]} c="#45261a" rough={0.45} r={0.09} />
    {[-1, 1].map((s) => (
      <RBox key={s} s={[0.16, 0.62, 0.8]} p={[0.48 * s, 0.4, -0.1]} c="#3a2016" rough={0.45} r={0.06} />
    ))}
  </group>
);

const CashTable: React.FC<{ p: Vec3 }> = ({ p }) => (
  <group position={p}>
    <RBox s={[0.42, 0.55, 0.42]} p={[0, 0.275, 0]} c="#2a1a12" rough={0.5} r={0.03} />
    {[0, 1, 2, 3].map((k) => (
      <RBox key={k} s={[0.26, 0.05, 0.13]} p={[0.02 * (k % 2), 0.58 + k * 0.052, 0]} rot={[0, k * 0.2, 0]} c="#3f9e4a" rough={0.8} r={0.006} />
    ))}
  </group>
);

/** A round white bubble with an icon, floating over a shark so you know who's who. */
export const IconBubble: React.FC<{ icon: string; p: Vec3; rotY: number; scale: number }> = ({ icon, p, rotY, scale }) => {
  const tex = useMemo(
    () =>
      canvasTexture(256, 300, (g) => {
        g.fillStyle = "#fbf8f1";
        g.beginPath();
        g.arc(128, 128, 118, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.moveTo(108, 236);
        g.lineTo(128, 292);
        g.lineTo(148, 236);
        g.fill();
        g.font = '130px "Apple Color Emoji", sans-serif';
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.fillText(icon, 128, 136);
      }),
    [icon],
  );
  if (scale <= 0) return null;
  return (
    <mesh position={p} rotation={[0, rotY, 0]} scale={scale}>
      <planeGeometry args={[0.42, 0.49]} />
      <meshBasicMaterial map={tex} transparent toneMapped={false} />
    </mesh>
  );
};

/** The panel: five chairs on an arc in front of the windows, cash on the side tables. */
export const PanelSet: React.FC = () => (
  <>
    <fog attach="fog" args={["#0d0a14", 9, 22]} />
    <Floor />
    <WindowWall z={-4.4} />
    {[-1, 1].map((s) => (
      <mesh key={s} position={[5.5 * s, 3.5, 0.6]} rotation={[0, -s * Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[12, 7]} />
        <meshStandardMaterial color="#1c1218" roughness={1} />
      </mesh>
    ))}
    {SHARKS.map((_, i) => {
      const c = chair(i);
      return <Chair key={i} p={[c.p[0] - c.facing[0] * 0.35, 0, c.p[2] - c.facing[2] * 0.35]} rotY={c.rotY} />;
    })}
    {[0.5, 1.5, 2.5, 3.5].map((k) => {
      const a = (k - 2) * 0.3;
      return <CashTable key={k} p={[MARK[0] + (ARC_R - 0.1) * Math.sin(a), 0, MARK[2] - (ARC_R - 0.1) * Math.cos(a) - 0.25]} />;
    })}
  </>
);

const useCard = (w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) => useMemo(() => canvasTexture(w, h, draw), []);

const drawAsk = (g: CanvasRenderingContext2D) => {
  g.fillStyle = "#fbf8f1";
  g.fillRect(0, 0, 1024, 560);
  g.fillStyle = "#ff8a52";
  g.fillRect(60, 60, 64, 64);
  g.fillStyle = "#16141a";
  g.font = '900 48px "Arial Black", sans-serif';
  g.textBaseline = "middle";
  g.fillText("PIXELPICKED", 150, 94);
  g.font = '900 150px "Arial Black", sans-serif';
  g.textAlign = "center";
  g.fillStyle = "#1f9e5c";
  g.fillText("$", 170, 330);
  g.fillStyle = "#16141a";
  g.fillText("1,000,000", 590, 330);
  g.font = '900 54px "Arial Black", sans-serif';
  g.fillStyle = "#5a5a66";
  g.fillText("FOR 10%", 512, 470);
};

/** The pitch card on its little easel: PIXELPICKED, $1,000,000. */
export const AskCard: React.FC<{ p: Vec3; rotY?: number; scale?: number }> = ({ p, rotY = 0, scale = 1 }) => {
  const tex = useCard(1024, 560, drawAsk);
  return (
    <group position={p} rotation={[0, rotY, 0]} scale={scale}>
      {[-1, 1].map((s) => (
        <RBox key={s} s={[0.05, 1.3, 0.05]} p={[0.42 * s, 0.6, 0.05]} rot={[0.12, 0, 0.12 * s]} c="#6b4a30" rough={0.6} r={0.01} />
      ))}
      <RBox s={[0.05, 1.3, 0.05]} p={[0, 0.6, -0.25]} rot={[-0.3, 0, 0]} c="#6b4a30" rough={0.6} r={0.01} />
      <mesh position={[0, 1.15, 0.1]} rotation={[-0.12, 0, 0]}>
        <planeGeometry args={[1.3, 0.71]} />
        <meshStandardMaterial map={tex} roughness={0.85} />
      </mesh>
    </group>
  );
};

/** A tiny deterministic random, so the shreds fly the same way every render. */
const rnd = (i: number, k = 0) => {
  const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/**
 * The hook: a big papercraft shark, jaw snapping, tearing into the $1M card. Shreds of paper fly
 * out of its mouth on every bite, from the very first frame.
 */
export const ShredSharkSet: React.FC<{ t: number }> = ({ t }) => {
  const skin = useCard(512, 512, (g) => {
    g.fillStyle = "#e8673a";
    g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 900; i++) {
      g.fillStyle = `rgba(${i % 2 ? 255 : 120},${i % 2 ? 190 : 50},${i % 2 ? 140 : 20},0.18)`;
      g.fillRect(rnd(i, 1) * 512, rnd(i, 2) * 512, 3 + rnd(i, 3) * 6, 2 + rnd(i, 4) * 4);
    }
  });
  const card = useCard(1024, 560, drawAsk);
  // a bite every 0.42s: the jaw snaps shut fast and opens slower
  const phase = (t % 0.42) / 0.42;
  const jaw = phase < 0.25 ? 0.55 * (1 - phase / 0.25) : 0.55 * ((phase - 0.25) / 0.75);
  const bite = Math.floor(t / 0.42);
  const lunge = Math.sin(Math.min(1, phase / 0.25) * Math.PI) * 0.12;
  const mouth: Vec3 = [-0.55, 1.45, 0.75];
  const shreds = Array.from({ length: 46 }, (_, i) => {
    const born = (i % 23) * 0.42 * 0.5 + Math.floor(i / 23) * 0.21;
    const age = (t - born) % 2.0;
    if (age < 0) return null;
    const vx = -1.2 + rnd(i, 1) * 2.4;
    const vy = 1.0 + rnd(i, 2) * 1.6;
    const vz = 0.2 + rnd(i, 3) * 1.4;
    const p: Vec3 = [mouth[0] + vx * age, mouth[1] + vy * age - 2.4 * age * age, mouth[2] + vz * age];
    if (p[1] < 0.02) p[1] = 0.02;
    return { p, r: [rnd(i, 4) * 6 + age * 7, rnd(i, 5) * 6 + age * 5, 0] as Vec3, s: 0.07 + rnd(i, 6) * 0.1, green: i % 5 === 0 };
  });
  const tex = (on: boolean) => <meshStandardMaterial map={skin} color={on ? "#ffffff" : "#ffd2c0"} roughness={0.85} />;
  return (
    <>
      <fog attach="fog" args={["#0d0a14", 7, 18]} />
      <Floor />
      <WindowWall z={-5} />
      {/* the shark: a chunky papercraft box with a hinged jaw full of teeth */}
      <group position={[0.35 + lunge * -1, 0, -0.2]} rotation={[0, -0.45, 0]}>
        {/* legs */}
        {[-1, 1].map((sx) =>
          [-1, 1].map((sz) => (
            <mesh key={`${sx}${sz}`} position={[0.55 * sx, 0.35, 0.45 * sz]}>
              <boxGeometry args={[0.3, 0.7, 0.3]} />
              {tex(false)}
            </mesh>
          )),
        )}
        {/* body and upper head */}
        <mesh position={[0, 1.55, 0]} rotation={[-0.05, 0, 0]}>
          <boxGeometry args={[1.7, 1.5, 1.4]} />
          {tex(true)}
        </mesh>
        {/* eyes */}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[0.42 * s, 1.95, 0.71]}>
            <boxGeometry args={[0.22, 0.26, 0.02]} />
            <meshStandardMaterial color="#1a1010" roughness={0.6} />
          </mesh>
        ))}
        {/* upper teeth */}
        {Array.from({ length: 8 }, (_, i) => (
          <mesh key={`u${i}`} position={[-0.7 + i * 0.2, 1.0, 0.66]} rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[0.085, 0.24, 4]} />
            <meshStandardMaterial color="#fbf8f1" roughness={0.5} />
          </mesh>
        ))}
        {/* the jaw, hinged at the back */}
        <group position={[0, 0.85, -0.6]} rotation={[jaw, 0, 0]}>
          <mesh position={[0, -0.12, 0.6]}>
            <boxGeometry args={[1.6, 0.32, 1.3]} />
            {tex(false)}
          </mesh>
          {Array.from({ length: 8 }, (_, i) => (
            <mesh key={`l${i}`} position={[-0.7 + i * 0.2, 0.12, 1.2]}>
              <coneGeometry args={[0.085, 0.22, 4]} />
              <meshStandardMaterial color="#fbf8f1" roughness={0.5} />
            </mesh>
          ))}
        </group>
        {/* the fin */}
        <mesh position={[0, 2.55, -0.2]} rotation={[-0.3, Math.PI / 2, 0]} scale={[1, 1, 0.25]}>
          <coneGeometry args={[0.45, 0.9, 3]} />
          {tex(true)}
        </mesh>
      </group>
      {/* the card, caught in its teeth and shaking with every bite */}
      <group position={[-0.7 + lunge * -0.6, 0, 0.9]} rotation={[0, 0.35 + Math.sin(bite * 2.1) * 0.06, Math.sin(bite * 1.7) * 0.05]}>
        {[-1, 1].map((s) => (
          <RBox key={s} s={[0.05, 1.3, 0.05]} p={[0.42 * s, 0.6, 0.05]} rot={[0.12 + lunge, 0, 0.12 * s]} c="#6b4a30" rough={0.6} r={0.01} />
        ))}
        <mesh position={[0, 1.15, 0.1]} rotation={[-0.12, 0, 0]}>
          <planeGeometry args={[1.3, 0.71]} />
          <meshStandardMaterial map={card} roughness={0.85} side={THREE.DoubleSide} />
        </mesh>
      </group>
      {shreds.map((s, i) =>
        s ? (
          <mesh key={i} position={s.p} rotation={s.r}>
            <planeGeometry args={[s.s, s.s * 0.7]} />
            <meshStandardMaterial color={s.green ? "#3f9e4a" : "#f3ead2"} roughness={0.9} side={THREE.DoubleSide} />
          </mesh>
        ) : null,
      )}
    </>
  );
};

/** The studio door with the show's sign glowing over it. */
export const DoorSet: React.FC = () => {
  const sign = useMemo(() => paper("AI SHARK TANK", 900, 220, "#ff8a52"), []);
  return (
    <>
      <fog attach="fog" args={["#0d0a14", 7, 16]} />
      <Floor rug={false} color="#20160f" />
      <mesh position={[0, 3, -1.2]} receiveShadow>
        <planeGeometry args={[14, 7]} />
        <meshStandardMaterial color="#3a2418" roughness={0.9} />
      </mesh>
      <RBox s={[1.7, 2.7, 0.2]} p={[0, 1.35, -1.15]} c="#1a120c" rough={0.6} r={0.03} />
      <mesh position={[0, 1.25, -1.04]}>
        <planeGeometry args={[1.35, 2.4]} />
        <meshStandardMaterial color="#ffc27a" emissive="#ffb35a" emissiveIntensity={1.6} />
      </mesh>
      <RBox s={[2.6, 0.78, 0.1]} p={[0, 3.15, -1.08]} c="#16141a" rough={0.6} r={0.04} />
      <mesh position={[0, 3.15, -1.02]}>
        <planeGeometry args={[2.4, 0.6]} />
        <meshStandardMaterial map={sign} roughness={0.8} emissive="#ffffff" emissiveIntensity={0.15} emissiveMap={sign} />
      </mesh>
      {[-1, 1].map((s) => (
        <RBox key={s} s={[0.14, 0.14, 0.08]} p={[1.6 * s, 3.15, -1.06]} c="#fff1cf" e={4} r={0.04} />
      ))}
    </>
  );
};

/** The pitch stage: the rug and windows, with the ask card dropping onto its easel. */
export const StageSet: React.FC<{ drop: number }> = ({ drop }) => (
  <>
    <fog attach="fog" args={["#0d0a14", 8, 18]} />
    <Floor />
    <WindowWall z={-4.4} />
    <group position={[0, 2.5 * (1 - drop), 0]}>
      <AskCard p={[-0.3, 0, 0.6]} rotY={0.1} scale={1.0} />
    </group>
  </>
);

/** An old cash register with its drawer sliding open on nothing. */
export const RegisterSet: React.FC<{ open: number; t: number }> = ({ open, t }) => {
  const display = useCard(512, 160, (g) => {
    g.fillStyle = "#0c1a10";
    g.fillRect(0, 0, 512, 160);
    g.fillStyle = "#5dff7a";
    g.font = '900 110px "Courier New", monospace';
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText("$0.00", 256, 86);
  });
  return (
    <>
      <fog attach="fog" args={["#0d0a14", 7, 15]} />
      <Floor rug={false} color="#2a1c14" />
      <mesh position={[0, 3, -1.4]}>
        <planeGeometry args={[12, 7]} />
        <meshStandardMaterial color="#2a2036" roughness={0.95} />
      </mesh>
      <RBox s={[3.2, 0.9, 1.2]} p={[0, 0.45, 0]} c="#5a3420" rough={0.6} r={0.03} />
      <group position={[0, 0.9, 0.05]}>
        <RBox s={[1.2, 0.5, 0.9]} p={[0, 0.25, 0]} c="#b8892f" rough={0.35} r={0.05} />
        <RBox s={[1.0, 0.45, 0.5]} p={[0, 0.65, -0.15]} rot={[-0.5, 0, 0]} c="#c99a3a" rough={0.35} r={0.05} />
        <mesh position={[0, 1.05, -0.3]} rotation={[-0.15, 0, 0]}>
          <planeGeometry args={[0.7, 0.22]} />
          <meshBasicMaterial map={display} toneMapped={false} />
        </mesh>
        {/* the drawer, sliding out: empty */}
        <group position={[0, 0.08, 0.45 + open * 0.5]}>
          <RBox s={[1.1, 0.16, 0.6]} p={[0, 0, -0.3]} c="#8a6a2a" rough={0.4} r={0.02} />
          {[-0.36, -0.12, 0.12, 0.36].map((x) => (
            <RBox key={x} s={[0.2, 0.02, 0.5]} p={[x, 0.09, -0.3]} c="#3a2a14" r={0.005} />
          ))}
        </group>
        {/* a moth flutters out */}
        {open > 0.6 && (
          <group position={[Math.sin(t * 5) * 0.3, 0.5 + (open - 0.6) * 2 + Math.sin(t * 13) * 0.05, 0.8]}>
            {[-1, 1].map((s) => (
              <mesh key={s} position={[0.06 * s, 0, 0]} rotation={[0, 0, s * (0.4 + Math.sin(t * 40) * 0.5)]}>
                <planeGeometry args={[0.12, 0.08]} />
                <meshStandardMaterial color="#c9b9a0" side={THREE.DoubleSide} />
              </mesh>
            ))}
          </group>
        )}
      </group>
    </>
  );
};

/** The money machine: a conveyor of coins dropping into a piggy bank, on and on. */
export const MachineSet: React.FC<{ t: number }> = ({ t }) => {
  const bill = useCard(512, 240, (g) => {
    g.fillStyle = "#cfe8c4";
    g.fillRect(0, 0, 512, 240);
    g.strokeStyle = "#2f7a3a";
    g.lineWidth = 12;
    g.strokeRect(14, 14, 484, 212);
    g.fillStyle = "#2f7a3a";
    g.font = '900 140px "Arial Black", sans-serif';
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText("$", 256, 126);
  });
  const coins = Array.from({ length: 9 }, (_, i) => {
    const u = (t * 0.55 + i / 9) % 1;
    const x = -1.9 + u * 3.0;
    const drop = x > 0.85 ? (x - 0.85) * 3 : 0;
    return { x: Math.min(x, 0.95), y: 1.08 - drop * drop * 0.6, show: drop < 0.6 };
  });
  return (
    <>
      <fog attach="fog" args={["#0d0a14", 8, 16]} />
      <Floor rug={false} color="#1d2a20" />
      <mesh position={[0, 3, -1.6]}>
        <planeGeometry args={[14, 7]} />
        <meshStandardMaterial color="#2f5a3a" roughness={0.9} />
      </mesh>
      {[
        [-1.6, 2.6, 0.1],
        [1.4, 2.9, -0.15],
        [-0.2, 3.3, 0.05],
      ].map(([x, y, r], i) => (
        <mesh key={i} position={[x, y + Math.sin(t * 2 + i) * 0.05, -1.55]} rotation={[0, 0, r + Math.sin(t * 1.5 + i) * 0.05]}>
          <planeGeometry args={[0.9, 0.42]} />
          <meshStandardMaterial map={bill} roughness={0.9} />
        </mesh>
      ))}
      <RBox s={[3.2, 0.14, 0.6]} p={[-0.45, 0.95, 0]} c="#2a2a30" rough={0.5} r={0.05} />
      {Array.from({ length: 8 }, (_, i) => (
        <RBox key={i} s={[0.08, 0.95, 0.08]} p={[-1.9 + i * 0.42, 0.47, 0.25]} c="#3a3a44" rough={0.5} r={0.02} />
      ))}
      {coins.map((c, i) =>
        c.show ? (
          <mesh key={i} position={[c.x, c.y + 0.1, 0]} rotation={[Math.PI / 2, 0, t * 4 + i]}>
            <cylinderGeometry args={[0.13, 0.13, 0.04, 24]} />
            <meshStandardMaterial color="#ffcf4a" metalness={0.7} roughness={0.25} emissive="#ffb000" emissiveIntensity={0.25} />
          </mesh>
        ) : null,
      )}
      <group position={[1.35, 0, 0.1]} scale={1.1}>
        <mesh position={[0, 0.62, 0]} scale={[1.15, 0.95, 0.95]}>
          <sphereGeometry args={[0.45, 32, 24]} />
          <meshStandardMaterial color="#ff9ec2" roughness={0.45} />
        </mesh>
        <mesh position={[0.5, 0.62, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.13, 0.15, 0.12, 24]} />
          <meshStandardMaterial color="#ff86b3" roughness={0.45} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[0.28, 1.0, 0.2 * s]} rotation={[0, 0, -0.4]}>
            <coneGeometry args={[0.1, 0.18, 3]} />
            <meshStandardMaterial color="#ff86b3" roughness={0.45} />
          </mesh>
        ))}
        {[-1, 1].map((sx) =>
          [-1, 1].map((sz) => <RBox key={`${sx}${sz}`} s={[0.12, 0.25, 0.12]} p={[0.25 * sx, 0.14, 0.22 * sz]} c="#ff86b3" rough={0.45} r={0.04} />),
        )}
        <RBox s={[0.26, 0.03, 0.06]} p={[-0.05, 1.05, 0]} c="#3a1a24" r={0.01} />
        {[-1, 1].map((s) => (
          <mesh key={s} position={[0.38, 0.75, 0.16 * s]}>
            <sphereGeometry args={[0.035, 12, 8]} />
            <meshStandardMaterial color="#16141a" />
          </mesh>
        ))}
      </group>
    </>
  );
};

/** A shop shelf stacked with games, and an empty cart rolling past: a shelf with no shoppers. */
export const ShelfSet: React.FC<{ t: number; t0: number }> = ({ t, t0 }) => {
  const colors = ["#ff5fd2", "#4fffb0", "#ffcf4a", "#5ab8ff", "#ff8a52", "#b28cff"];
  const cartX = -1.6 + (t - t0) * 1.3;
  return (
    <>
      <fog attach="fog" args={["#0d0a14", 7, 15]} />
      <Floor rug={false} color="#cfc7b8" />
      <mesh position={[0, 3, -1.2]}>
        <planeGeometry args={[12, 7]} />
        <meshStandardMaterial color="#e9e2d2" roughness={0.95} />
      </mesh>
      {[0.5, 1.2, 1.9].map((y, r) => (
        <React.Fragment key={r}>
          <RBox s={[3.4, 0.06, 0.6]} p={[0, y, -0.8]} c="#8a8a94" rough={0.4} r={0.01} />
          {Array.from({ length: 9 }, (_, i) => (
            <RBox key={i} s={[0.28, 0.42, 0.3]} p={[-1.5 + i * 0.37, y + 0.24, -0.8]} c={colors[(i + r * 2) % colors.length]} rough={0.5} r={0.02} />
          ))}
        </React.Fragment>
      ))}
      {/* the cart */}
      <group position={[cartX, 0, 0.6]} rotation={[0, 0, Math.sin(t * 9) * 0.01]}>
        <RBox s={[0.9, 0.5, 0.55]} p={[0, 0.75, 0]} c="#c9ccd4" rough={0.3} r={0.03} />
        <RBox s={[0.8, 0.42, 0.45]} p={[0, 0.79, 0]} c="#2a2a30" rough={0.6} r={0.02} />
        <RBox s={[0.04, 0.5, 0.04]} p={[-0.5, 1.05, 0]} rot={[0, 0, 0.3]} c="#9aa0aa" r={0.01} />
        {[-1, 1].map((sx) =>
          [-1, 1].map((sz) => (
            <mesh key={`${sx}${sz}`} position={[0.35 * sx, 0.1, 0.22 * sz]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.08, 0.08, 0.05, 16]} />
              <meshStandardMaterial color="#16141a" />
            </mesh>
          )),
        )}
        <RBox s={[0.05, 0.42, 0.05]} p={[0, 0.3, 0]} c="#9aa0aa" r={0.01} />
      </group>
    </>
  );
};

/** The wall of no's: every objection on a sticky note, beside the exit. */
const NOTES: { text: string; color: string; p: [number, number]; rot: number }[] = [
  { text: "WHO\nPAYS?", color: "#ffe680", p: [-0.55, 2.35], rot: 0.08 },
  { text: "ROYALTY\nFOREVER", color: "#ffb3c7", p: [0.55, 2.45], rot: -0.06 },
  { text: "TIKTOK\nTESTED IT", color: "#9fd8ff", p: [-0.45, 1.6], rot: -0.05 },
  { text: "I'M\nOUT", color: "#b8f0a8", p: [0.6, 1.65], rot: 0.07 },
  { text: "PROVE\nIT", color: "#ffd0a0", p: [0.05, 0.95], rot: 0.04 },
];
export const ExitSet: React.FC<{ t: number; t0: number }> = ({ t, t0 }) => {
  const brick = useCard(1024, 1024, (g) => {
    g.fillStyle = "#6a3424";
    g.fillRect(0, 0, 1024, 1024);
    g.fillStyle = "#4a2418";
    for (let r = 0; r < 16; r++) {
      g.fillRect(0, r * 64, 1024, 6);
      for (let c = 0; c < 9; c++) g.fillRect(((r % 2) * 64 + c * 128) % 1024, r * 64, 6, 64);
    }
  });
  const exit = useMemo(() => paper("EXIT", 400, 160, "#ff3b3b"), []);
  const notes = useMemo(() => NOTES.map((n) => paper(n.text, 400, 400, "#16141a")), []);
  return (
    <>
      <fog attach="fog" args={["#0d0a14", 8, 16]} />
      <Floor rug={false} color="#2a1c14" />
      <mesh position={[0, 3, -1.2]}>
        <planeGeometry args={[12, 7]} />
        <meshStandardMaterial map={brick} roughness={0.95} />
      </mesh>
      <RBox s={[1.1, 2.2, 0.08]} p={[-1.9, 1.1, -1.12]} c="#5a3420" rough={0.6} r={0.03} />
      <RBox s={[0.06, 0.06, 0.06]} p={[-1.5, 1.1, -1.05]} c="#d8b45a" r={0.02} />
      <mesh position={[-1.9, 2.5, -1.1]}>
        <planeGeometry args={[0.8, 0.32]} />
        <meshStandardMaterial map={exit} emissive="#ff3b3b" emissiveMap={exit} emissiveIntensity={0.6 + 0.4 * Math.sin(t * 8)} />
      </mesh>
      {NOTES.map((n, i) => {
        const k = pop(t, t0 + 0.1 + i * 0.2);
        return k > 0 ? (
          <mesh key={i} position={[n.p[0] + 0.55, n.p[1] + 0.1, -1.1]} rotation={[0, 0, n.rot + Math.sin(t * 3 + i) * 0.03]} scale={k * 0.85}>
            <planeGeometry args={[0.7, 0.7]} />
            <meshStandardMaterial map={notes[i]} color={n.color} roughness={0.9} />
          </mesh>
        ) : null;
      })}
    </>
  );
};

export const Lights: React.FC<{ target: Vec3; warm?: number }> = ({ target, warm = 1 }) => {
  const o = useMemo(() => new THREE.Object3D(), []);
  o.position.set(...target);
  return (
    <>
      <primitive object={o} />
      <hemisphereLight args={["#8a7aa8", "#1a1420", 0.6]} />
      <spotLight position={[1.5, 4.4, 4.0]} target={o} angle={0.7} penumbra={1} intensity={60} decay={1.5} distance={14} color="#ffe2c0" castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0003} />
      <spotLight position={[-2.6, 3.2, 3.0]} target={o} angle={0.6} penumbra={1} intensity={20} decay={1.6} distance={10} color="#8fb4ff" />
      <pointLight position={[0, 2.4, -3.4]} intensity={10 * warm} distance={7} decay={1.6} color="#ffb35a" />
    </>
  );
};
