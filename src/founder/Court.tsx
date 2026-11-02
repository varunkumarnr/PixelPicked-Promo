import React, { useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { EXPR, Pose } from "../siblings/Chibi";
import { RBox, canvasTexture } from "../siblings/Room";
import { Cam, Stage } from "../siblings/Stage";
import { BOTH_OPEN, Captions, Founder, HANDS_DOWN, PaperTitle } from "./Studio";

/**
 * "AI judged my startup": the founder on trial in a small courtroom built from the studio's
 * materials. The AIs are box-headed robots with a glowing screen for a face. Founder stands at
 * the defendant's table at the origin, the judge's bench is back centre (z=-3.4), the jury box
 * runs along the left, the two lawyers' podiums sit either side in front.
 */

type Vec3 = [number, number, number];

export const WALL = -4.2;
export const BENCH_Z = -3.2;

const wood = (base: string, seed = 1) =>
  canvasTexture(1024, 512, (g) => {
    g.fillStyle = base;
    g.fillRect(0, 0, 1024, 512);
    for (let i = 0; i < 160; i++) {
      const y = (i * 37 * seed) % 512;
      g.strokeStyle = `rgba(${i % 3 ? 40 : 110},${i % 3 ? 24 : 72},${i % 3 ? 14 : 44},0.35)`;
      g.lineWidth = 1 + (i % 4);
      g.beginPath();
      g.moveTo(0, y);
      for (let x = 0; x <= 1024; x += 64) g.lineTo(x, y + Math.sin(x / 140 + i) * 6);
      g.stroke();
    }
  });

/** A taped paper sign with black marker-ish type. */
export const paper = (text: string, w = 512, h = 256, color = "#16141a") =>
  canvasTexture(w, h, (g) => {
    g.fillStyle = "#f2ead8";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "rgba(0,0,0,0.05)";
    for (let i = 0; i < 40; i++) g.fillRect((i * 97) % w, (i * 53) % h, 3, 3);
    g.fillStyle = color;
    g.textAlign = "center";
    g.textBaseline = "middle";
    const lines = text.split("\n");
    const size = Math.min(h / (lines.length + 0.6), (w * 1.5) / Math.max(...lines.map((l) => l.length)));
    g.font = `900 ${size}px "Arial Black", sans-serif`;
    lines.forEach((l, i) => g.fillText(l, w / 2, h / 2 + (i - (lines.length - 1) / 2) * size * 1.05));
  });

// ── the robots ───────────────────────────────────────────────────────────────

export type Face = "happy" | "flat" | "angry" | "smug" | "yes" | "shock" | "talk" | "scribble";

const faceCache = new Map<string, THREE.CanvasTexture>();

/** The AI's face printed on the front of its body: two dark pill eyes, a small mouth, pink cheeks. Cached per face. */
function faceTexture(face: Face) {
  const hit = faceCache.get(face);
  if (hit) return hit;
  const tex = drawFace(face);
  faceCache.set(face, tex);
  return tex;
}

const INK = "#2a1712";

function drawFace(face: Face) {
  return canvasTexture(512, 400, (g) => {
    g.clearRect(0, 0, 512, 400);
    g.fillStyle = INK;
    g.strokeStyle = INK;
    g.lineCap = "round";
    g.lineJoin = "round";
    // cheeks
    g.fillStyle = "rgba(255,120,130,0.45)";
    for (const x of [118, 394]) {
      g.beginPath();
      g.ellipse(x, 250, 46, 26, 0, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = INK;
    if (face === "scribble") {
      g.lineWidth = 14;
      for (let r = 0; r < 3; r++) {
        g.beginPath();
        for (let x = 110; x <= 402; x += 22) g.lineTo(x, 130 + r * 70 + ((x * 7 + r * 13) % 26) - 13);
        g.stroke();
      }
      return;
    }
    const eye = (x: number) => {
      const y = 170;
      g.lineWidth = 24;
      if (face === "happy" || face === "yes") {
        // ^ ^
        g.beginPath();
        g.moveTo(x - 34, y + 22);
        g.lineTo(x, y - 18);
        g.lineTo(x + 34, y + 22);
        g.stroke();
      } else if (face === "flat") {
        g.beginPath();
        g.moveTo(x - 32, y + 10);
        g.lineTo(x + 32, y + 10);
        g.stroke();
      } else if (face === "shock") {
        g.beginPath();
        g.roundRect(x - 30, y - 56, 60, 112, 30);
        g.fill();
        g.fillStyle = "#fff";
        g.beginPath();
        g.arc(x + 9, y - 28, 11, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = INK;
      } else {
        // the resting eye: a tall rounded pill, with a glint
        g.beginPath();
        g.roundRect(x - 24, y - 44, 48, 88, 24);
        g.fill();
        g.fillStyle = "#fff";
        g.beginPath();
        g.arc(x + 7, y - 22, 9, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = INK;
        if (face === "angry") {
          const s = x < 256 ? 1 : -1;
          g.lineWidth = 20;
          g.beginPath();
          g.moveTo(x - 38 * s, y - 78);
          g.lineTo(x + 30 * s, y - 52);
          g.stroke();
        }
        if (face === "smug") {
          // half-lidded
          g.fillStyle = "#e8835a";
          g.fillRect(x - 30, y - 50, 60, 46);
          g.fillStyle = INK;
          g.lineWidth = 14;
          g.beginPath();
          g.moveTo(x - 30, y - 4);
          g.lineTo(x + 30, y - 4);
          g.stroke();
        }
      }
    };
    eye(180);
    eye(332);
    g.lineWidth = 16;
    g.beginPath();
    if (face === "happy" || face === "yes") {
      g.arc(256, 262, 34, Math.PI * 0.1, Math.PI * 0.9);
      g.stroke();
    } else if (face === "angry") {
      g.moveTo(222, 290);
      g.quadraticCurveTo(256, 262, 290, 290);
      g.stroke();
    } else if (face === "shock") {
      g.ellipse(256, 290, 22, 28, 0, 0, Math.PI * 2);
      g.fill();
    } else if (face === "talk") {
      g.ellipse(256, 282, 30, 22, 0, 0, Math.PI * 2);
      g.fill();
    } else if (face === "smug") {
      g.moveTo(226, 282);
      g.quadraticCurveTo(270, 296, 294, 268);
      g.stroke();
    } else {
      g.moveTo(236, 276);
      g.quadraticCurveTo(256, 290, 276, 276);
      g.stroke();
    }
  });
}

export type BotProps = {
  p: Vec3;
  rotY?: number;
  /** The AI's accent colour: its sprout, headphones, cap and the like. The body is always orange. */
  color: string;
  face: Face;
  tie?: string;
  /** Raise the right arm (0 down, 1 straight up) and hold a card in it. */
  raise?: number;
  card?: string;
  prop?: "briefcase" | "headphones" | "phone" | "gaming" | "wig" | "cap" | "glasses" | null;
  scale?: number;
  /** Ink colour for the card's text. */
  cardInk?: string;
  /** Powered down (1): darker, eyes shut, sprout out. */
  dim?: number;
  /** A shark fin on top instead of the sprout. */
  fin?: boolean;
};

const BODY = new THREE.Color("#ff8a52");
const BODY_OFF = new THREE.Color("#3a2c2a");

/**
 * An AI: a soft orange block with a face printed on the front, stubby arms and legs, and a little
 * sprout on top in its own colour. Roles are told apart by the sprout, a tie and a prop.
 * Heights match the old design (face around y=1.6) so the cameras still line up.
 */
export const Bot: React.FC<BotProps> = ({ p, rotY = 0, color, face, tie, raise = 0, card, prop = null, scale = 1, cardInk = "#d61f2c", dim = 0, fin = false }) => {
  const faceTex = faceTexture(dim > 0.5 ? "flat" : face);
  const cardTex = useMemo(() => (card ? paper(card, 512, 300, cardInk) : null), [card, cardInk]);
  const armUp = -raise * Math.PI * 0.85;
  const body = BODY.clone().lerp(BODY_OFF, dim).getStyle();
  const limb = BODY.clone().multiplyScalar(0.86).lerp(BODY_OFF, dim).getStyle();
  return (
    <group position={p} rotation={[0, rotY, 0]} scale={scale}>
      {/* stubby legs */}
      {[-1, 1].map((s) => (
        <RBox key={s} s={[0.16, 0.34, 0.18]} p={[0.15 * s, 0.98, 0]} c={limb} rough={0.75} r={0.07} />
      ))}
      {/* the body: one soft block, the face printed on its front */}
      <RBox s={[0.72, 0.68, 0.52]} p={[0, 1.48, 0]} c={body} rough={0.6} r={0.14} />
      {/* a soft warm bounce off the body, so a row of them lights the room like the screens used to */}
      {dim < 0.5 && <pointLight position={[0, 1.5, 0.6]} intensity={0.5} distance={1.5} decay={2} color="#ffb58a" />}
      <mesh position={[0, 1.55, 0.262]}>
        <planeGeometry args={[0.56, 0.44]} />
        <meshStandardMaterial map={faceTex} transparent roughness={0.7} />
      </mesh>
      {tie && (
        <group position={[0, 1.2, 0.26]}>
          <RBox s={[0.1, 0.07, 0.03]} p={[0, 0.02, 0]} c={tie} rough={0.6} r={0.01} />
          <RBox s={[0.07, 0.16, 0.025]} p={[0, -0.09, 0]} rot={[0, 0, 0]} c={tie} rough={0.6} r={0.01} />
        </group>
      )}
      {/* a shark's fin: a thin three-sided cone, swept back */}
      {fin && (
        <mesh position={[0, 2.0, -0.04]} rotation={[-0.35, Math.PI / 2, 0]} scale={[1, 1, 0.22]}>
          <coneGeometry args={[0.2, 0.42, 3]} />
          <meshStandardMaterial color={dim > 0.5 ? "#3d4550" : "#7f93a8"} roughness={0.5} />
        </mesh>
      )}
      {/* the sprout: a stem and two leaves in its colour */}
      {!fin && dim < 0.5 && (
        <group position={[0, 1.82, 0]}>
          <mesh position={[0, 0.05, 0]}>
            <cylinderGeometry args={[0.012, 0.014, 0.1, 8]} />
            <meshStandardMaterial color="#5a8a3a" roughness={0.7} />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[0.05 * s, 0.11, 0]} rotation={[0, 0, -0.6 * s]} scale={[1, 0.45, 0.6]}>
              <sphereGeometry args={[0.06, 16, 12]} />
              <meshStandardMaterial color={color} roughness={0.6} emissive={color} emissiveIntensity={0.25} />
            </mesh>
          ))}
        </group>
      )}
      {/* stubby arms: left hangs, right can raise a card */}
      <group position={[-0.42, 1.42, 0]}>
        <RBox s={[0.14, 0.26, 0.16]} p={[0, -0.09, 0]} rot={[0, 0, -0.25]} c={limb} rough={0.75} r={0.06} />
      </group>
      <group position={[0.42, 1.42, 0]} rotation={[0, 0, -armUp * 0.15]}>
        <group rotation={[armUp, 0, 0]}>
          <RBox s={[0.14, 0.26, 0.16]} p={[0, -0.09, 0]} rot={[0, 0, 0.25]} c={limb} rough={0.75} r={0.06} />
          {prop === "gaming" && (
            <group position={[0, -0.3, 0.04]} rotation={[-armUp, 0, 0]} scale={1.7}>
              <RBox s={[0.13, 0.22, 0.02]} p={[-0.12, 0.08, 0.1]} rot={[-0.5, 0.5, 0]} c="#16161c" rough={0.3} r={0.015} />
              <RBox s={[0.11, 0.19, 0.004]} p={[-0.113, 0.085, 0.112]} rot={[-0.5, 0.5, 0]} c={color} e={3} r={0.004} />
            </group>
          )}
          {cardTex && (
            <group position={[0, -0.32, 0.05]} rotation={[-armUp, 0, 0]}>
              <RBox s={[0.02, 0.2, 0.02]} p={[0, 0.06, 0]} c="#6b4a30" />
              <mesh position={[0, 0.3, 0.02]}>
                <planeGeometry args={[0.5, 0.3]} />
                <meshStandardMaterial map={cardTex} roughness={0.8} side={THREE.DoubleSide} />
              </mesh>
            </group>
          )}
        </group>
      </group>
      {prop === "headphones" && (
        <>
          <mesh position={[0, 1.6, 0]}>
            <torusGeometry args={[0.4, 0.03, 12, 32, Math.PI]} />
            <meshStandardMaterial color="#20232c" roughness={0.4} />
          </mesh>
          {[-1, 1].map((s) => (
            <RBox key={s} s={[0.08, 0.2, 0.2]} p={[0.38 * s, 1.55, 0]} c={color} rough={0.4} r={0.04} />
          ))}
        </>
      )}
      {prop === "cap" && (
        <>
          <RBox s={[0.6, 0.1, 0.48]} p={[0, 1.84, 0]} c={color} rough={0.6} r={0.04} />
          <RBox s={[0.46, 0.03, 0.24]} p={[0, 1.8, 0.33]} c={color} rough={0.6} r={0.01} />
        </>
      )}
      {prop === "glasses" &&
        [-1, 1].map((s) => (
          <mesh key={s} position={[0.08 * s, 1.6, 0.27]}>
            <torusGeometry args={[0.07, 0.01, 8, 24]} />
            <meshStandardMaterial color="#2a1712" metalness={0.3} roughness={0.4} />
          </mesh>
        ))}
      {prop === "briefcase" && <RBox s={[0.3, 0.22, 0.08]} p={[-0.48, 1.08, 0.06]} c="#5a3420" rough={0.5} r={0.02} />}
      {prop === "phone" && <RBox s={[0.1, 0.18, 0.015]} p={[-0.4, 1.3, 0.24]} rot={[-0.4, 0, 0.2]} c={color} e={1.2} r={0.01} />}
      {prop === "wig" &&
        [-1, 1].map((s) =>
          [0, 1, 2].map((k) => (
            <mesh key={`${s}${k}`} position={[0.36 * s, 1.72 - k * 0.14, -0.02]}>
              <sphereGeometry args={[0.1, 16, 12]} />
              <meshStandardMaterial color="#f1efe8" roughness={0.9} />
            </mesh>
          )),
        )}
    </group>
  );
};

// ── the courtroom ────────────────────────────────────────────────────────────

const Window: React.FC<{ x: number }> = ({ x }) => (
  <group position={[x, 2.6, WALL + 0.02]}>
    <mesh>
      <planeGeometry args={[0.9, 2.0]} />
      <meshStandardMaterial color="#9fc3ff" emissive="#6f9cff" emissiveIntensity={1.6} />
    </mesh>
    <mesh position={[0, 1.0, 0]}>
      <circleGeometry args={[0.45, 32, 0, Math.PI]} />
      <meshStandardMaterial color="#9fc3ff" emissive="#6f9cff" emissiveIntensity={1.6} />
    </mesh>
    {/* mullions */}
    <RBox s={[0.04, 2.9, 0.04]} p={[0, 0.3, 0.02]} c="#1d1a22" r={0.01} />
    {[-0.5, 0.2, 0.9].map((y) => (
      <RBox key={y} s={[0.9, 0.04, 0.04]} p={[0, y, 0.02]} c="#1d1a22" r={0.01} />
    ))}
  </group>
);

export const CourtSet: React.FC<{ neon?: number; bigJury?: boolean }> = ({ neon = 1, bigJury = false }) => {
  const walnut = useMemo(() => wood("#5a3b26"), []);
  const desk = useMemo(() => wood("#7a5236", 3), []);
  const floor = useMemo(() => wood("#3a281c", 5), []);
  const sign = useMemo(() => paper("PIXELPICKED", 640, 200), []);
  const seal = useMemo(
    () =>
      canvasTexture(512, 512, (g) => {
        g.fillStyle = "#c9a45c";
        g.beginPath();
        g.arc(256, 256, 250, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = "#8a6a2c";
        g.beginPath();
        g.arc(256, 256, 200, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = "#f3d98c";
        g.font = '900 120px "Arial Black", sans-serif';
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.fillText("AI", 256, 260);
      }),
    [],
  );
  return (
    <>
      <fog attach="fog" args={["#0b0b18", 8, 20]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[16, 16]} />
        <meshStandardMaterial color="#2a1d14" roughness={0.6} map={floor} />
      </mesh>
      {/* aisle rug */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, -0.8]} receiveShadow>
        <planeGeometry args={[1.4, 7]} />
        <meshStandardMaterial color="#5a1e2c" roughness={1} />
      </mesh>
      {/* back wall: navy above, walnut panelling below */}
      <mesh position={[0, 3.5, WALL]} receiveShadow>
        <planeGeometry args={[16, 7]} />
        <meshStandardMaterial color="#14141f" roughness={1} />
      </mesh>
      <RBox s={[16, 1.3, 0.06]} p={[0, 0.65, WALL + 0.03]} c="#4a3324" map={walnut} rough={0.5} r={0.01} />
      {[-2.6, 2.6].map((x) => (
        <Window key={x} x={x} />
      ))}
      {/* side walls */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[4.2 * s, 3.5, -1]} rotation={[0, -s * Math.PI / 2, 0]} receiveShadow>
          <planeGeometry args={[10, 7]} />
          <meshStandardMaterial color="#121220" roughness={1} />
        </mesh>
      ))}
      {/* the seal over the bench */}
      <mesh position={[0, 3.55, WALL + 0.05]}>
        <circleGeometry args={[0.45, 48]} />
        <meshStandardMaterial map={seal} roughness={0.35} metalness={0.5} />
      </mesh>
      {/* judge's bench: raised platform and a tall front */}
      <RBox s={[3.0, 0.4, 1.4]} p={[0, 0.2, BENCH_Z - 0.2]} c="#3b2a20" map={walnut} rough={0.5} r={0.02} />
      <RBox s={[2.6, 1.55, 0.12]} p={[0, 0.78, BENCH_Z + 0.45]} c="#5a3b26" map={walnut} rough={0.45} r={0.02} />
      <RBox s={[2.8, 0.08, 0.6]} p={[0, 1.58, BENCH_Z + 0.25]} c="#7a5236" map={desk} rough={0.4} r={0.02} />
      {/* gavel */}
      <group position={[0.7, 1.67, BENCH_Z + 0.35]} rotation={[0, 0.5, 0]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.06, 0.06, 0.2, 20]} />
          <meshStandardMaterial color="#3a2416" roughness={0.4} />
        </mesh>
        <mesh position={[0, 0, 0.16]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.014, 0.014, 0.3, 10]} />
          <meshStandardMaterial color="#5a3b26" roughness={0.4} />
        </mesh>
      </group>
      {/* jury box along the left wall, raised, facing the aisle */}
      <group position={[-2.5, 0, -1.2]} rotation={[0, Math.PI / 2 - 0.25, 0]}>
        {bigJury ? (
          <>
            {/* two rows of six: a front row and a raised back row */}
            <RBox s={[3.8, 0.3, 1.0]} p={[0, 0.15, -0.2]} c="#3b2a20" map={walnut} rough={0.5} r={0.02} />
            <RBox s={[3.8, 0.75, 0.9]} p={[0, 0.375, -1.05]} c="#3b2a20" map={walnut} rough={0.5} r={0.02} />
            <RBox s={[3.8, 1.05, 0.1]} p={[0, 0.52, 0.3]} c="#5a3b26" map={walnut} rough={0.45} r={0.02} />
            <RBox s={[3.9, 0.06, 0.2]} p={[0, 1.07, 0.3]} c="#7a5236" map={desk} rough={0.4} r={0.02} />
          </>
        ) : (
          <>
            <RBox s={[3.0, 0.3, 1.2]} p={[0, 0.15, -0.3]} c="#3b2a20" map={walnut} rough={0.5} r={0.02} />
            <RBox s={[3.0, 1.05, 0.1]} p={[0, 0.52, 0.3]} c="#5a3b26" map={walnut} rough={0.45} r={0.02} />
            <RBox s={[3.1, 0.06, 0.2]} p={[0, 1.07, 0.3]} c="#7a5236" map={desk} rough={0.4} r={0.02} />
          </>
        )}
      </group>
      {/* lawyers' podiums */}
      {[-1, 1].map((s) => (
        <group key={s} position={[1.05 * s - s * 0.26, 0, 2.0 + 0.36]} rotation={[0, -s * 0.7, 0]}>
          <RBox s={[0.7, 1.05, 0.45]} p={[0, 0.52, 0]} c="#5a3b26" map={walnut} rough={0.45} r={0.03} />
          <RBox s={[0.78, 0.05, 0.55]} p={[0, 1.07, -0.02]} rot={[0.25, 0, 0]} c="#7a5236" map={desk} rough={0.4} r={0.02} />
        </group>
      ))}
      {/* defendant's table: the studio desk, with the pink strip and a taped sign */}
      <RBox s={[1.9, 0.06, 0.75]} p={[0, 0.95, 0.5]} c="#7a5236" rough={0.45} map={desk} r={0.02} />
      <RBox s={[1.8, 0.92, 0.05]} p={[0, 0.47, 0.84]} c="#4a3324" rough={0.55} map={desk} />
      <RBox s={[1.82, 0.012, 0.012]} p={[0, 0.9, 0.87]} c="#ff5fd2" e={5 * neon} r={0.005} />
      <mesh position={[0, 0.6, 0.875]} rotation={[0, 0, 0.03]}>
        <planeGeometry args={[0.9, 0.28]} />
        <meshStandardMaterial map={sign} roughness={0.9} />
      </mesh>
      {/* papers on the table */}
      <RBox s={[0.32, 0.01, 0.42]} p={[0.45, 0.985, 0.55]} rot={[0, 0.2, 0]} c="#f2ead8" rough={0.9} r={0.003} />
      <RBox s={[0.32, 0.01, 0.42]} p={[0.48, 0.995, 0.57]} rot={[0, 0.32, 0]} c="#ece2cc" rough={0.9} r={0.003} />
      {/* dust in the moonlight */}
      {Array.from({ length: 36 }, (_, i) => (
        <mesh key={i} position={[(i % 2 ? 2.6 : -2.6) - 0.5 + ((i * 0.37) % 1.0), 1.6 + ((i * 0.53) % 2.6), WALL + 0.2 + ((i * 0.71) % 0.9)]}>
          <sphereGeometry args={[0.006, 6, 4]} />
          <meshStandardMaterial color="#cfe0ff" emissive="#cfe0ff" emissiveIntensity={3} />
        </mesh>
      ))}
    </>
  );
};

export const CourtLights: React.FC<{ spot?: number; room?: number }> = ({ spot = 0, room = 1 }) => {
  const key = useMemo(() => new THREE.Object3D(), []);
  key.position.set(0, 1.3, 0);
  const bench = useMemo(() => new THREE.Object3D(), []);
  bench.position.set(0, 1.9, BENCH_Z);
  const jury = useMemo(() => new THREE.Object3D(), []);
  jury.position.set(-2.5, 1.3, -1.2);
  return (
    <>
      <primitive object={key} />
      <primitive object={bench} />
      <primitive object={jury} />
      <hemisphereLight args={["#5a6a9a", "#1a1420", 0.45 * room]} />
      <spotLight position={[-1.6, 2.6, 2.6]} target={key} angle={0.6} penumbra={1} intensity={30 * room} decay={1.6} distance={10} color="#ffe0bf" castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0003} shadow-radius={10} />
      {/* moonlight through the windows */}
      <spotLight position={[-2.6, 4.2, WALL + 0.3]} target={key} angle={0.55} penumbra={0.9} intensity={40 * room} decay={1.5} distance={12} color="#7fb2ff" />
      <spotLight position={[2.6, 4.2, WALL + 0.3]} target={jury} angle={0.6} penumbra={0.9} intensity={30 * room} decay={1.5} distance={12} color="#7fb2ff" />
      <spotLight position={[0, 4.0, 0.5]} target={bench} angle={0.45} penumbra={0.8} intensity={30 * room} decay={1.5} distance={10} color="#ffd6a0" />
      <spotLight position={[1.0, 3.8, 1.5]} target={jury} angle={0.5} penumbra={0.9} intensity={22 * room} decay={1.5} distance={10} color="#ffd6a0" />
      <pointLight position={[0, 0.9, 1.4]} intensity={3 * room} distance={2.2} decay={1.6} color="#ff4fd8" />
      {/* the single spotlight for the low point */}
      <spotLight position={[0, 4.0, 1.0]} target={key} angle={0.28} penumbra={0.5} intensity={70 * spot} decay={1.4} distance={9} color="#fff4e0" castShadow />
    </>
  );
};

// ── the cast in place ────────────────────────────────────────────────────────

const JURY: { color: string; prop: BotProps["prop"]; tie: string }[] = [
  { color: "#ffcf4a", prop: "briefcase", tie: "#3a3f8a" }, // investor
  { color: "#5ab8ff", prop: "headphones", tie: "#22252e" }, // developer
  { color: "#ff6fd8", prop: "phone", tie: "#ff6fd8" }, // player
];

/** Juror i's seat, in world space: along the jury box, raised on its platform, facing the aisle. */
const jurorSpot = (i: number): { p: Vec3; rotY: number } => {
  const rot = Math.PI / 2 - 0.25;
  const along = (i - 1) * 0.9;
  const local: Vec3 = [along, 0.3 - 0.35, -0.25];
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  return { p: [-2.5 + local[0] * c + local[2] * s, local[1], -1.2 - local[0] * s + local[2] * c], rotY: rot };
};

/** `gamer` is the juror who's ignoring the trial to play a game on their phone. */
const Jury: React.FC<{ face: Face; raise?: number; card?: string; gamer?: number }> = ({ face, raise = 0, card, gamer }) => (
  <>
    {JURY.map((j, i) => {
      const { p, rotY } = jurorSpot(i);
      if (i === gamer) return <Bot key={i} p={p} rotY={rotY - 0.45} color={j.color} face="happy" prop="gaming" tie={j.tie} raise={0.62} />;
      return <Bot key={i} p={p} rotY={rotY} color={j.color} face={face} prop={j.prop} tie={j.tie} raise={raise} card={card} />;
    })}
  </>
);

/** A small taped sticker note on the frame, for an aside. */
export const Sticker: React.FC<{ text: string; x: number; y: number; rot?: number }> = ({ text, x, y, rot = 4 }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      transform: `rotate(${rot}deg)`,
      background: "#fff36b",
      padding: "14px 24px",
      fontFamily: '"Arial Black", sans-serif',
      fontSize: 40,
      color: "#16141a",
      boxShadow: "0 12px 28px rgba(0,0,0,0.5)",
    }}
  >
    {text}
  </div>
);

const Lawyers: React.FC<{ bull: Face; bear: Face }> = ({ bull, bear }) => (
  <>
    <Bot p={[-1.05, -0.28, 2.0]} rotY={0.7} color="#4fffb0" face={bull} tie="#1f9e5c" />
    <Bot p={[1.05, -0.28, 2.0]} rotY={-0.7} color="#ff4a4a" face={bear} tie="#b3202a" />
  </>
);

export const Judge: React.FC<{ face: Face }> = ({ face }) => <Bot p={[0, 0.4, BENCH_Z - 0.3]} color="#f2f2f2" face={face} prop="wig" tie="#111" scale={1.1} />;

// ── key frames ───────────────────────────────────────────────────────────────

type Frame = {
  title: string;
  caption: string;
  cam: Cam;
  focus: number;
  founder: { arms: Partial<Pose>; face: Partial<Pose>; rotY?: number; mouth?: number };
  jury: { face: Face; raise?: number; card?: string; gamer?: number };
  /** The red robot leaning into the shot to gloat. */
  cameo?: Face;
  sticker?: { text: string; x: number; y: number; rot?: number };
  /** Null cheats them off set for shots where they'd block the lens. */
  lawyers: { bull: Face; bear: Face } | null;
  judge: Face;
  spot?: number;
  room?: number;
  neon?: number;
};

const FRAMES: Frame[] = [
  {
    title: "AI JUDGED MY STARTUP",
    caption: "should be *easy*",
    cam: { pos: [1.2, 3.1, 6.6], look: [-0.6, 1.1, -1.2], fov: 50 },
    focus: 6.8,
    founder: { arms: HANDS_DOWN, face: { ...EXPR.smug } },
    jury: { face: "flat" },
    lawyers: { bull: "flat", bear: "flat" },
    judge: "flat",
  },
  {
    title: "ONE SAYS WIN. ONE SAYS DIE.",
    caption: "one says *we die*",
    cam: { pos: [0, 1.75, 6.4], look: [0, 1.35, 1.2], fov: 50 },
    focus: 4.4,
    founder: { arms: HANDS_DOWN, face: { ...EXPR.plead }, mouth: 0.25 },
    jury: { face: "flat" },
    lawyers: { bull: "happy", bear: "angry" },
    judge: "flat",
  },
  {
    title: "3 SECRET BALLOTS",
    caption: "secret *votes*",
    cam: { pos: [-0.5, 1.75, 1.3], look: [-2.65, 1.4, -1.7], fov: 48 },
    focus: 3.4,
    founder: { arms: HANDS_DOWN, face: { ...EXPR.neutral } },
    jury: { face: "smug", raise: 0.45, card: "BALLOT", gamer: 2 },
    sticker: { text: "(not listening)", x: 600, y: 470, rot: 6 },
    lawyers: { bull: "flat", bear: "smug" },
    judge: "flat",
  },
  {
    title: "THE VERDICT",
    caption: "*guilty*",
    cam: { pos: [1.0, 1.4, 3.0], look: [-0.9, 1.55, -0.6], fov: 50 },
    focus: 3.0,
    founder: { arms: BOTH_OPEN, face: { ...EXPR.shock }, mouth: 0.8, rotY: 0.2 },
    jury: { face: "flat", raise: 0.95, card: "GUILTY" },
    lawyers: null,
    judge: "angry",
    spot: 1,
    room: 0.35,
    neon: 0.3,
  },
  {
    title: "IT WAS 8–7",
    caption: "lost by *1 point*",
    cam: { pos: [-0.6, 1.55, 2.6], look: [0.35, 1.5, 0.3], fov: 48 },
    focus: 2.3,
    founder: { arms: HANDS_DOWN, face: { ...EXPR.deadpan, lid: 0.55 }, rotY: -0.1 },
    jury: { face: "flat" },
    lawyers: null,
    judge: "flat",
    cameo: "smug",
    sticker: { text: "three times.", x: 170, y: 1370, rot: -5 },
    spot: 0.6,
    room: 0.5,
    neon: 0.4,
  },
];

export const CourtFrame: React.FC<{ shot: number; platform?: "instagram" | "youtube" }> = ({ shot }) => {
  const f = useCurrentFrame();
  const k = FRAMES[shot] ?? FRAMES[0];
  const t = f + 40 + shot * 17;
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Stage cam={k.cam} post={{ frame: t, style: "film", focus: k.focus, aperture: 0.018, maxBlur: 0.012, vignette: 0.5, grain: 0.04 }} env={0.12} fill={0.25} exposure={0.95}>
        <CourtLights spot={k.spot} room={k.room} />
        <CourtSet neon={k.neon} />
        <Founder f={t} arms={k.founder.arms} face={k.founder.face} rotY={k.founder.rotY ?? 0.12} talking={false} extra={{ mouthOpen: k.founder.mouth ?? 0 }} />
        <Jury {...k.jury} />
        {k.lawyers && <Lawyers {...k.lawyers} />}
        <Judge face={k.judge} />
        {k.cameo && <Bot p={[0.62, -0.12, 0.75]} rotY={-0.9} color="#ff4a4a" face={k.cameo} tie="#b3202a" />}
      </Stage>
      <PaperTitle text={k.title} />
      {k.sticker && <Sticker {...k.sticker} />}
      <Captions chunks={[{ at: 0, text: k.caption }]} fps={30} />
    </AbsoluteFill>
  );
};

