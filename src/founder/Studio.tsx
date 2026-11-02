import React, { useMemo } from "react";
import * as THREE from "three";
import { interpolate, staticFile, useCurrentFrame } from "remotion";
import { useClipFrame } from "./clip";
import { AnimeEyes, Chibi, EXPR, Look, Pose, REST, ZACK, ZACK_ANIME, blink, chatter } from "../siblings/Chibi";
import { Books, Plant, RBox, canvasTexture, useTexture } from "../siblings/Room";

/**
 * The founder channel's set: the PixelPicked studio. A chibi stand-in for the founder at a desk,
 * a guitar and a synth around him, a neon sign on the back wall and a Mac behind his shoulder
 * playing a game from the site. Lit like a talking-head shoot: warm key, cool rim, coloured
 * practicals and haze. Founder sits at z=0 behind the desk; back wall at z=-2.2.
 */

type Vec3 = [number, number, number];

export const FOUNDER: Look = {
  ...ZACK,
  skin: "#eab48c",
  hair: "#141117",
  hoodie: "#1b1b21",
  hoodieDark: "#2b2b34",
  pants: "#1a1a20",
  shoes: "#f2f2f2",
  iris: "#3a2418",
};

export const HEAD: Vec3 = [0, 1.48, 0];
const WALL = -2.2;

const wood = (base: string) => () =>
  canvasTexture(1024, 512, (g) => {
    g.fillStyle = base;
    g.fillRect(0, 0, 1024, 512);
    for (let i = 0; i < 160; i++) {
      const y = (i * 37) % 512;
      g.strokeStyle = `rgba(${i % 3 ? 40 : 110},${i % 3 ? 24 : 72},${i % 3 ? 14 : 44},0.35)`;
      g.lineWidth = 1 + (i % 4);
      g.beginPath();
      g.moveTo(0, y);
      for (let x = 0; x <= 1024; x += 64) g.lineTo(x, y + Math.sin(x / 140 + i) * 6);
      g.stroke();
    }
  });

// ── the room ─────────────────────────────────────────────────────────────────

/** Acoustic foam in columns either side of the sign, catching the rim light. */
const Foam: React.FC = () => {
  const tiles: Vec3[] = [];
  for (const x of [-2.1, -1.68, 1.26, 1.68, 2.1]) for (let y = 0; y < 6; y++) tiles.push([x, 0.6 + y * 0.42, WALL + 0.04]);
  return (
    <>
      {tiles.map((p, i) => (
        <RBox key={i} s={[0.39, 0.39, 0.07]} p={p} c={i % 5 === 2 ? "#2a2440" : "#1d1f30"} r={0.03} rough={1} />
      ))}
    </>
  );
};

/** "PixelPicked" in pink neon tubing on a dark backboard. */
const Neon: React.FC<{ p: Vec3 }> = ({ p }) => {
  const tex = useMemo(
    () =>
      canvasTexture(1400, 360, (g) => {
        g.clearRect(0, 0, 1400, 360);
        g.font = "italic 900 210px 'Arial Black', sans-serif";
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.lineJoin = "round";
        g.shadowColor = "#ff4fd8";
        g.shadowBlur = 40;
        g.strokeStyle = "#ff7ae3";
        g.lineWidth = 16;
        g.strokeText("PixelPicked", 700, 185);
        g.shadowBlur = 0;
        g.strokeStyle = "#ffe6fa";
        g.lineWidth = 5;
        g.strokeText("PixelPicked", 700, 185);
      }),
    [],
  );
  return (
    <group position={p}>
      <RBox s={[1.75, 0.5, 0.03]} c="#0d0c14" r={0.02} rough={0.5} />
      <mesh position={[0, 0, 0.02]}>
        <planeGeometry args={[1.66, 0.43]} />
        <meshBasicMaterial map={tex} transparent toneMapped={false} color={[3.2, 2.2, 3.2]} />
      </mesh>
    </group>
  );
};

/** An electric guitar leaning back on a little stand. */
const Guitar: React.FC<{ p: Vec3; rotY?: number }> = ({ p, rotY = 0 }) => {
  const body = "#c4242f";
  return (
    <group position={p} rotation={[0, rotY, 0]}>
      {/* stand */}
      {[-0.12, 0.12].map((x) => (
        <mesh key={x} position={[x, 0.12, 0.05]} rotation={[0.3, 0, x > 0 ? -0.35 : 0.35]}>
          <cylinderGeometry args={[0.012, 0.012, 0.28, 8]} />
          <meshStandardMaterial color="#111" metalness={0.7} roughness={0.4} />
        </mesh>
      ))}
      <group position={[0, 0.2, 0]} rotation={[-0.22, 0, 0]}>
        {/* body: two lobes */}
        <mesh position={[0, 0.2, 0]} scale={[1, 1, 0.22]} castShadow>
          <sphereGeometry args={[0.21, 32, 24]} />
          <meshStandardMaterial color={body} roughness={0.2} metalness={0.1} />
        </mesh>
        <mesh position={[0, 0.45, 0]} scale={[1, 1, 0.22]} castShadow>
          <sphereGeometry args={[0.16, 32, 24]} />
          <meshStandardMaterial color={body} roughness={0.2} metalness={0.1} />
        </mesh>
        {/* pickguard and pickups */}
        <mesh position={[0.03, 0.28, 0.045]} scale={[1, 1.3, 0.05]}>
          <sphereGeometry args={[0.1, 24, 16]} />
          <meshStandardMaterial color="#f1ece2" roughness={0.4} />
        </mesh>
        {[0.22, 0.32].map((y) => (
          <RBox key={y} s={[0.09, 0.03, 0.015]} p={[0, y, 0.052]} c="#1a1a1a" r={0.005} />
        ))}
        {/* neck and headstock */}
        <RBox s={[0.055, 0.62, 0.03]} p={[0, 0.85, 0.01]} c="#3a2416" rough={0.5} r={0.01} />
        <RBox s={[0.08, 0.16, 0.025]} p={[0, 1.22, 0.0]} c="#1a1214" rough={0.4} r={0.015} />
        {/* strings catching the light */}
        {[-0.015, -0.005, 0.005, 0.015].map((x) => (
          <RBox key={x} s={[0.002, 0.95, 0.002]} p={[x, 0.72, 0.035]} c="#ddd" rough={0.2} r={0.0005} />
        ))}
      </group>
    </group>
  );
};

/** A synth on an X stand: white and black keys, a few knobs. */
const Synth: React.FC<{ p: Vec3; rotY?: number }> = ({ p, rotY = 0 }) => {
  const keys = 21;
  return (
    <group position={p} rotation={[0, rotY, 0]}>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0, -0.42, 0]} rotation={[0, 0, s * 0.65]}>
          <cylinderGeometry args={[0.015, 0.015, 1.05, 8]} />
          <meshStandardMaterial color="#1a1a1e" metalness={0.7} roughness={0.4} />
        </mesh>
      ))}
      <RBox s={[0.95, 0.07, 0.32]} c="#232329" rough={0.5} r={0.02} />
      {Array.from({ length: keys }, (_, i) => (
        <RBox key={i} s={[0.036, 0.02, 0.15]} p={[-0.38 + i * 0.038, 0.04, 0.07]} c="#f3f1ec" rough={0.35} r={0.004} />
      ))}
      {Array.from({ length: keys - 1 }, (_, i) => i)
        .filter((i) => [0, 1, 3, 4, 5].includes(i % 7))
        .map((i) => (
          <RBox key={i} s={[0.022, 0.025, 0.09]} p={[-0.361 + i * 0.038, 0.055, 0.04]} c="#141416" rough={0.3} r={0.004} />
        ))}
      {Array.from({ length: 6 }, (_, i) => (
        <mesh key={i} position={[-0.3 + i * 0.12, 0.05, -0.08]}>
          <cylinderGeometry args={[0.018, 0.018, 0.03, 16]} />
          <meshStandardMaterial color={i === 2 ? "#ff8a3d" : "#d8d8dc"} roughness={0.3} metalness={0.3} />
        </mesh>
      ))}
      <RBox s={[0.18, 0.01, 0.05]} p={[0.32, 0.04, -0.08]} c="#38e0ff" e={3} r={0.004} />
    </group>
  );
};

/** A studio monitor speaker. */
const Speaker: React.FC<{ p: Vec3; rotY?: number }> = ({ p, rotY = 0 }) => (
  <group position={p} rotation={[0, rotY, 0]}>
    <RBox s={[0.2, 0.32, 0.22]} c="#16161a" rough={0.6} r={0.02} />
    {[
      [0.07, 0.07],
      [-0.06, 0.035],
    ].map(([y, r]) => (
      <group key={y} position={[0, y, 0.111]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[r, r, 0.01, 32]} />
          <meshStandardMaterial color="#2a2a30" roughness={0.3} metalness={0.4} />
        </mesh>
        <mesh position={[0, 0, 0.006]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[r * 0.75, r * 0.75, 0.004, 32]} />
          <meshStandardMaterial color={y > 0 ? "#e6c34a" : "#0c0c0e"} roughness={0.4} metalness={0.5} />
        </mesh>
      </group>
    ))}
  </group>
);

/** The page around the game on the Mac: the site's dark player with a header and side rails. */
const siteTexture = () =>
  canvasTexture(1600, 1000, (g) => {
    g.fillStyle = "#0c0d14";
    g.fillRect(0, 0, 1600, 1000);
    g.fillStyle = "#151726";
    g.fillRect(0, 0, 1600, 70);
    g.fillStyle = "#ff5fd2";
    g.beginPath();
    g.arc(48, 35, 18, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#e9e9f2";
    g.font = "700 30px Helvetica, Arial, sans-serif";
    g.fillText("PixelPicked", 78, 45);
    g.fillStyle = "#7d8099";
    g.font = "400 24px Helvetica, Arial, sans-serif";
    g.fillText("pixelpicked.com/play", 1320, 45);
    // side rails: other games, as soft tiles
    const colors = ["#3b2a6b", "#1f4c6b", "#6b2a4a", "#2a6b4f", "#6b552a", "#2a3a6b"];
    for (let i = 0; i < 6; i++) {
      g.fillStyle = colors[i];
      g.fillRect(70, 120 + i * 140, 360, 115);
      g.fillStyle = colors[(i + 3) % 6];
      g.fillRect(1170, 120 + i * 140, 360, 115);
    }
  });


/** An iMac on the back desk, playing a game from the site, `t` seconds into the clip. */
const Mac: React.FC<{ p: Vec3; rotY?: number; clip: string; t: number; screen?: THREE.Texture | null }> = ({ p, rotY = 0, clip, t, screen }) => {
  const game = useClipFrame(clip, t);
  const site = useMemo(siteTexture, []);
  const W = 1.0;
  const H = 0.6;
  const gameH = H * 0.86;
  return (
    <group position={p} rotation={[0, rotY, 0]}>
      {/* stand */}
      <RBox s={[0.22, 0.012, 0.18]} p={[0, 0.006, 0]} c="#c9cbd1" rough={0.25} r={0.005} />
      <RBox s={[0.16, 0.34, 0.012]} p={[0, 0.17, -0.05]} rot={[-0.15, 0, 0]} c="#c9cbd1" rough={0.25} r={0.005} />
      <group position={[0, 0.62, 0]}>
        {/* body with the chin below the screen */}
        <RBox s={[W + 0.04, H + 0.16, 0.025]} p={[0, -0.05, -0.005]} c="#d8dade" rough={0.25} r={0.02} />
        <RBox s={[W, H, 0.004]} p={[0, 0.0, 0.009]} c="#000" rough={0.2} r={0.002} />
        <mesh position={[0, 0, 0.012]}>
          <planeGeometry args={[W * 0.985, H * 0.975]} />
          <meshBasicMaterial map={screen ?? site} toneMapped={false} color={screen ? [1, 1, 1] : [0.85, 0.85, 0.85]} />
        </mesh>
        {game && !screen && (
          <mesh position={[0, -0.02, 0.013]}>
            <planeGeometry args={[gameH * (780 / 1688), gameH]} />
            <meshBasicMaterial map={game} toneMapped={false} />
          </mesh>
        )}
      </group>
    </group>
  );
};

/** Podcast mic on a boom arm, off to his left so it never covers the face. */
const Mic: React.FC = () => (
  <group position={[0.62, 1.22, 0.55]} rotation={[0, 0, 0.35]}>
    <mesh rotation={[0.25, 0.5, 0]} castShadow>
      <cylinderGeometry args={[0.065, 0.06, 0.26, 32]} />
      <meshStandardMaterial color="#1a1a1e" roughness={0.35} metalness={0.7} />
    </mesh>
    <mesh position={[0, 0.13, 0]} rotation={[0.25, 0.5, 0]} castShadow>
      <sphereGeometry args={[0.07, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
      <meshStandardMaterial color="#3a3a42" roughness={0.6} metalness={0.8} />
    </mesh>
    <mesh position={[0.12, -0.22, -0.05]} rotation={[0, 0, 0.5]} castShadow>
      <cylinderGeometry args={[0.012, 0.012, 0.5, 12]} />
      <meshStandardMaterial color="#0f0f12" roughness={0.4} metalness={0.8} />
    </mesh>
  </group>
);

/**
 * The whole studio. `props` off clears the desk (mic, mug, notebook, phone) for close work on it.
 * `room` (0..1) sinks everything but the floor and the front desk into the floor, so the set can
 * change around him.
 */
export const StudioSet: React.FC<{ macClip: string; macTime: number; macScreen?: THREE.Texture | null; props?: boolean; room?: number }> = ({ macClip, macTime, macScreen, props = true, room = 1 }) => {
  const deskTex = useMemo(wood("#5a3b26"), []);
  const backTex = useMemo(wood("#3b2a20"), []);
  const logo = useTexture("logo.svg");
  return (
    <>
      <fog attach="fog" args={["#0b0b18", 7, 18]} />
      {/* floor, rug and walls */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[14, 14]} />
        <meshStandardMaterial color="#17151c" roughness={0.85} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, -0.4]} receiveShadow>
        <circleGeometry args={[1.8, 64]} />
        <meshStandardMaterial color="#3a2346" roughness={1} />
      </mesh>
      <group position={[0, -(1 - room) * 6.2, 0]} visible={room > 0.005}>
      <mesh position={[0, 3, WALL]} receiveShadow>
        <planeGeometry args={[14, 6]} />
        <meshStandardMaterial color="#14141f" roughness={1} />
      </mesh>
      <Foam />
      <Neon p={[-0.25, 2.3, WALL + 0.05]} />
      {/* string lights under the sign: they blur into bokeh */}
      {Array.from({ length: 19 }, (_, i) => {
        const u = i / 18;
        return (
          <mesh key={i} position={[-1.2 + u * 2.4, 1.95 - Math.sin(u * Math.PI) * 0.22 + (i % 2) * 0.03, WALL + 0.08]}>
            <sphereGeometry args={[0.022, 12, 8]} />
            <meshStandardMaterial color="#ffc27a" emissive="#ffb060" emissiveIntensity={8} />
          </mesh>
        );
      })}
      {/* shelf with a cyan LED strip, back left */}
      <RBox s={[0.9, 0.05, 0.26]} p={[-1.3, 1.45, WALL + 0.15]} c="#2a2320" rough={0.6} />
      <RBox s={[0.85, 0.015, 0.02]} p={[-1.3, 1.42, WALL + 0.27]} c="#4fd8ff" e={6} />
      <Books p={[-1.15, 1.48, WALL + 0.15]} />
      <Plant p={[-1.6, 1.48, WALL + 0.15]} />
      {/* instruments, back left */}
      <Guitar p={[-1.35, 0, -1.55]} rotY={0.35} />
      <Synth p={[-1.05, 0.9, -0.75]} rotY={0.55} />
      {/* back desk on the right: the Mac between two speakers */}
      <RBox s={[1.5, 0.05, 0.6]} p={[1.05, 0.95, -1.55]} c="#3b2a20" rough={0.5} map={backTex} r={0.015} />
      {[0.35, 1.75].map((x) => (
        <RBox key={x} s={[0.04, 0.95, 0.5]} p={[x, 0.475, -1.55]} c="#1a1a1e" rough={0.5} r={0.01} />
      ))}
      <Mac p={[1.05, 0.975, -1.6]} rotY={-0.3} clip={macClip} t={macTime} screen={macScreen} />
      <Speaker p={[0.42, 1.135, -1.5]} rotY={-0.1} />
      <Speaker p={[1.68, 1.135, -1.65]} rotY={-0.45} />
      </group>
      {/* front desk */}
      <RBox s={[1.9, 0.06, 0.75]} p={[0, 0.95, 0.5]} c="#7a5236" rough={0.45} map={deskTex} r={0.02} />
      <RBox s={[1.8, 0.92, 0.05]} p={[0, 0.47, 0.84]} c="#4a3324" rough={0.55} map={deskTex} />
      <RBox s={[1.82, 0.012, 0.012]} p={[0, 0.9, 0.87]} c="#ff5fd2" e={5} r={0.005} />
      {logo && (
        <mesh position={[0, 0.62, 0.868]}>
          <planeGeometry args={[0.26, 0.26]} />
          <meshStandardMaterial map={logo} transparent roughness={0.4} />
        </mesh>
      )}
      {props && <DeskProps />}
    </>
  );
};

/** The mic and the clutter on the front desk: mug, notebook and pen, phone face up. */
const DeskProps: React.FC = () => (
    <>
      <Mic />
      <mesh position={[-0.62, 1.04, 0.62]} castShadow>
        <cylinderGeometry args={[0.065, 0.06, 0.14, 32]} />
        <meshStandardMaterial color="#e8e2d8" roughness={0.3} />
      </mesh>
      <RBox s={[0.34, 0.025, 0.24]} p={[0.42, 0.99, 0.66]} rot={[0, 0.25, 0]} c="#c94f3d" rough={0.8} r={0.01} />
      <RBox s={[0.3, 0.012, 0.012]} p={[0.42, 1.01, 0.6]} rot={[0, 0.6, 0]} c="#e0c060" rough={0.3} r={0.005} />
      <RBox s={[0.12, 0.012, 0.24]} p={[-0.3, 0.985, 0.72]} rot={[0, -0.3, 0]} c="#111114" rough={0.2} r={0.012} />
      <RBox s={[0.105, 0.002, 0.215]} p={[-0.3, 0.992, 0.72]} rot={[0, -0.3, 0]} c="#6b8cff" e={1.5} r={0.001} />
    </>
);

/** Talking-head lighting: warm key front-left, cool rim back-right, neon and screen spill behind. */
export const StudioLights: React.FC = () => {
  const key = useMemo(() => new THREE.Object3D(), []);
  key.position.set(0, 1.3, 0);
  const rim = useMemo(() => new THREE.Object3D(), []);
  rim.position.set(0, 1.4, 0);
  return (
    <>
      <primitive object={key} />
      <primitive object={rim} />
      <hemisphereLight args={["#5a6a9a", "#1a1420", 0.4]} />
      <spotLight position={[-1.6, 2.2, 2.0]} target={key} angle={0.6} penumbra={1} intensity={30} decay={1.6} distance={10} color="#ffe0bf" castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0003} shadow-radius={10} />
      <spotLight position={[1.4, 2.4, -1.2]} target={rim} angle={0.5} penumbra={0.8} intensity={45} decay={1.6} distance={8} color="#7fb2ff" />
      <pointLight position={[-0.25, 2.2, WALL + 0.5]} intensity={6} distance={3.5} decay={1.6} color="#ff4fd8" />
      <pointLight position={[1.0, 1.6, -1.2]} intensity={3} distance={2.2} decay={1.6} color="#8fa8ff" />
      <pointLight position={[-1.3, 1.35, WALL + 0.4]} intensity={3} distance={2} decay={1.6} color="#4fd8ff" />
      <pointLight position={[-1.2, 1.2, -0.3]} intensity={2.5} distance={2.2} decay={1.6} color="#ffb070" />
    </>
  );
};

// ── words ────────────────────────────────────────────────────────────────────

/** Taped paper title, like a label stuck on the frame. */
export const PaperTitle: React.FC<{ text: string }> = ({ text }) => (
  <div style={{ position: "absolute", top: 200, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
    <div
      style={{
        position: "relative",
        transform: "rotate(-2deg)",
        background: "linear-gradient(180deg, #f7f1e3, #ece4d2)",
        padding: "24px 42px",
        maxWidth: 820,
        boxShadow: "0 18px 40px rgba(0,0,0,0.45), 0 2px 0 rgba(0,0,0,0.15)",
        fontFamily: '"Arial Black", "Helvetica Neue", sans-serif',
        fontSize: 58,
        lineHeight: 1.05,
        color: "#16141a",
        textAlign: "center",
        letterSpacing: -1,
      }}
    >
      {text}
      <div style={{ position: "absolute", top: -22, left: -30, width: 130, height: 44, background: "rgba(235,225,190,0.75)", transform: "rotate(-24deg)" }} />
      <div style={{ position: "absolute", top: -18, right: -34, width: 130, height: 44, background: "rgba(235,225,190,0.75)", transform: "rotate(20deg)" }} />
    </div>
  </div>
);

/** One caption chunk: when it starts (seconds) and its words, *starred* words in yellow. */
export type Chunk = { at: number; text: string };

/**
 * Captions a few words at a time, popping in. Kept above y=1440 and clear of the right edge so
 * the same render is safe under the Instagram and YouTube Shorts overlays.
 */
export const Captions: React.FC<{ chunks: Chunk[]; fps: number }> = ({ chunks, fps }) => {
  const f = useCurrentFrame();
  const now = chunks.filter((c) => f >= c.at * fps);
  if (!now.length) return null;
  const { at, text } = now[now.length - 1];
  const pop = interpolate(f - at * fps, [0, 3, 6], [0.7, 1.08, 1], { extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", top: 1230, left: 60, right: 140, textAlign: "center" }}>
      <span
        style={{
          display: "inline-block",
          transform: `scale(${pop})`,
          fontFamily: '"Arial Black", sans-serif',
          fontSize: 96,
          lineHeight: 1.05,
          color: "#fff",
          WebkitTextStroke: "4px #000",
          paintOrder: "stroke fill",
          textShadow: "0 8px 24px rgba(0,0,0,0.7)",
          textTransform: "uppercase",
        }}
      >
        {text.split("*").map((part, i) => (
          <span key={i} style={{ color: i % 2 ? "#ffd84a" : undefined }}>
            {part}
          </span>
        ))}
      </span>
    </div>
  );
};

// ── the founder ──────────────────────────────────────────────────────────────

/**
 * Which art style the founder is drawn in. The reel uses the default (3D film chibi); the
 * concept stills switch it to compare other looks without touching the reel.
 */
export type FounderStyle = { post: "film" | "comic" | "anime"; tall: boolean; mature?: boolean };
export const FounderStyleCtx = React.createContext<FounderStyle>({ post: "film", tall: false });

/** The founder in the anime designs: same dark hair and hoodie, anime hair and eyes. */
/** The founder as a grown-up: adult proportions, a jaw, small eyes, stubble. */
const FOUNDER_MATURE: Look = { ...FOUNDER, mature: true, beard: "#231a17", blush: "#e8a888" };

const FOUNDER_ANIME: Look = { ...ZACK_ANIME, skin: FOUNDER.skin, hoodie: "#1b1b21", hoodieDark: "#ff5fd2", iris: "#3a2418" };

/** The founder, idling while he talks: head drifting, blinking, mouth going. `extra` overrides the pose. */
export const Founder: React.FC<{ f: number; arms: Partial<Pose>; face?: Partial<Pose>; lean?: number; p?: Vec3; rotY?: number; talking?: boolean; extra?: Partial<Pose> }> = ({
  f,
  arms,
  face = {},
  lean = 0,
  p = [0, 0, 0],
  rotY = 0.12,
  talking = true,
  extra = {},
}) => {
  const style = React.useContext(FounderStyleCtx);
  const anime = style.post === "anime";
  return (
  <AnimeEyes.Provider value={anime}>
  <Chibi
    look={style.mature ? FOUNDER_MATURE : anime ? FOUNDER_ANIME : FOUNDER}
    tall={style.tall}
    p={p}
    rot={[0, rotY, 0]}
    pose={{
      ...REST,
      ...EXPR.neutral,
      smile: 0.3,
      browRaise: 0.25,
      ...arms,
      ...face,
      lean,
      headYaw: -0.05 + Math.sin(f / 23) * 0.05,
      headPitch: Math.sin(f / 7) * 0.03,
      headRoll: Math.sin(f / 31) * 0.03,
      lid: Math.max(face.lid ?? 0.1, blink(f) * 0.95),
      mouthOpen: talking ? chatter(f, true, 0.75) : 0,
      ...extra,
    }}
  />
  </AnimeEyes.Provider>
  );
};

export const HANDS_DOWN: Partial<Pose> = { armLx: 0.75, armRx: 0.75, elbowL: 1.0, elbowR: 1.0, armLz: -0.05, armRz: -0.05, gripL: 0.95, gripR: 0.95 };
export const GESTURE: Partial<Pose> = { armLx: 0.75, elbowL: 1.0, armLz: -0.05, gripL: 0.95, armRx: 1.0, armRz: -0.15, elbowR: 1.3, gripR: 0.3 };
export const BOTH_OPEN: Partial<Pose> = { armLx: 0.9, armRx: 0.9, elbowL: 1.2, elbowR: 1.2, armLz: 0.2, armRz: -0.2, gripL: 0.3, gripR: 0.3 };
