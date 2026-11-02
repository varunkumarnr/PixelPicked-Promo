import React, { useEffect, useMemo, useState } from "react";
import { AbsoluteFill, cancelRender, continueRender, delayRender, staticFile, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { FONT } from "./config";
import { GAMES } from "./timeline";

/**
 * The relativity wallpaper as a real 3D scene: a curved spacetime surface
 * pulled into a gravity well by PixelPicked, with every game as a lit 3D tile
 * orbiting on the fabric, trailing light.
 */

function random(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

const WELL_DEPTH = 9;
const WELL_RADIUS = 1.3;
const wellY = (r: number) => -WELL_DEPTH / Math.sqrt(1 + (r / WELL_RADIUS) ** 2);

const ICON_SPACING = 0.58;
const RING_GAP = 0.6;
const FIRST_RING = 2.1;
const TILE = 0.34;
const TRAIL = 0.55;
const LOGO_Y = -5.7;

/** Mid tiles orbit on the fabric; near ones drift right past the camera; far ones hang deep in the sky. */
type Layer = "near" | "mid" | "far";
type Orbit = { x: number; y: number; z: number; theta: number; r: number; ground: number; tiltX: number; tiltZ: number; layer: Layer; pull: number };

/**
 * How high tiles can float at distance r: low near PixelPicked (keeping the
 * throat clear), highest around the middle rings, thinning out at the edges,
 * like a galaxy's disc.
 */
const floatHeight = (r: number) => Math.min(1, Math.max(0, (r - 2.5) / 4)) ** 1.5 * (0.6 + 3.4 * Math.exp(-(((r - 7.5) / 4) ** 2)));

/** Every game placed on rings around the well, inner rings first, each floating at its own height. */
function orbits(count: number): Orbit[] {
  const rand = random(42);
  const result: Orbit[] = [];
  for (let ring = 0; result.length < count; ring++) {
    const r = FIRST_RING + ring * RING_GAP;
    const n = Math.min(count - result.length, Math.floor((2 * Math.PI * r) / ICON_SPACING));
    const phase = rand() * Math.PI * 2;
    for (let k = 0; k < n; k++) {
      // A little jitter so the rings read as a drifting cloud, not a machine.
      // Swirl: inner rings are wound further round, so the whole disc reads as spiralling in.
      const theta = phase + (k / n) * Math.PI * 2 + ((rand() - 0.5) * 0.3) / r - 2.2 * Math.log(r);
      const radius = r + (rand() - 0.5) * 0.36;
      const ground = wellY(radius);
      const lift = 0.05 + floatHeight(radius) * rand() ** 1.1;
      const roll = rand();
      const layer: Layer = roll < 0.05 ? "near" : roll < 0.2 ? "far" : "mid";
      result.push({
        x: radius * Math.cos(theta),
        y: ground + TILE * 0.55 + lift,
        z: radius * Math.sin(theta),
        theta,
        r: radius,
        ground,
        tiltX: (rand() - 0.5) * 0.7,
        tiltZ: (rand() - 0.5) * 0.7,
        layer,
        pull: rand(),
      });
    }
  }
  return result;
}

/** Loads every texture before the frame is captured. */
function useTextures(urls: string[]) {
  const [handle] = useState(() => delayRender("Loading wallpaper textures"));
  const [textures, setTextures] = useState<THREE.Texture[] | null>(null);
  useEffect(() => {
    const loader = new THREE.TextureLoader();
    Promise.all(urls.map((url) => loader.loadAsync(url)))
      .then((loaded) => {
        loaded.forEach((texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.anisotropy = 8;
        });
        setTextures(loaded);
        continueRender(handle);
      })
      .catch((error) => cancelRender(error));
    // Load once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return textures;
}

/** A soft round glow for sprites. */
function glowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const context = canvas.getContext("2d")!;
  const gradient = context.createRadialGradient(128, 128, 0, 128, 128, 128);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.2, "rgba(190,215,255,0.65)");
  gradient.addColorStop(0.5, "rgba(100,140,255,0.18)");
  gradient.addColorStop(1, "rgba(60,80,255,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(canvas);
}

/** The fabric: a curved surface with a glowing grid that follows the curve. */
const fabricShader = {
  vertexShader: /* glsl */ `
    varying vec3 vWorld;
    void main() {
      vec4 world = modelMatrix * vec4(position, 1.0);
      vWorld = world.xyz;
      gl_Position = projectionMatrix * viewMatrix * world;
    }
  `,
  fragmentShader: /* glsl */ `
    varying vec3 vWorld;
    uniform vec3 uCamera;
    void main() {
      vec2 coord = vWorld.xz * 2.0;
      vec2 grid = abs(fract(coord - 0.5) - 0.5) / fwidth(coord);
      float line = 1.0 - smoothstep(0.0, 1.6, min(grid.x, grid.y));
      float r = length(vWorld.xz);
      float throat = exp(-r * 0.45);
      float fog = clamp(1.0 - distance(vWorld, uCamera) / 42.0, 0.0, 1.0);
      vec3 surface = mix(vec3(0.03, 0.04, 0.12), vec3(0.16, 0.24, 0.62), throat);
      vec3 grid3 = mix(vec3(0.40, 0.60, 1.0), vec3(0.90, 0.96, 1.0), throat);
      vec3 color = surface * 0.7 + grid3 * line * (0.9 + throat * 2.2);
      gl_FragColor = vec4(color * fog, (0.55 + line * 0.45) * fog);
    }
  `,
};

function Fabric() {
  const camera = useThree((state) => state.camera);
  const geometry = useMemo(() => {
    const plane = new THREE.PlaneGeometry(60, 60, 360, 360);
    plane.rotateX(-Math.PI / 2);
    const position = plane.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i);
      const z = position.getZ(i);
      position.setY(i, wellY(Math.hypot(x, z)));
    }
    plane.computeVertexNormals();
    return plane;
  }, []);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        ...fabricShader,
        uniforms: { uCamera: { value: camera.position.clone() } },
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    [camera],
  );
  return <mesh geometry={geometry} material={material} />;
}

function Stars() {
  const geometry = useMemo(() => {
    const rand = random(7);
    const positions: number[] = [];
    for (let i = 0; i < 4000; i++) {
      // On a big sphere, mostly above and behind the fabric.
      const u = rand() * Math.PI * 2;
      const v = Math.acos(rand() * 1.6 - 0.6);
      const radius = 70 + rand() * 30;
      positions.push(radius * Math.sin(v) * Math.cos(u), radius * Math.cos(v) * 0.9 + 6, -Math.abs(radius * Math.sin(v) * Math.sin(u)) - 5);
    }
    const buffer = new THREE.BufferGeometry();
    buffer.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    return buffer;
  }, []);
  return (
    <points geometry={geometry}>
      <pointsMaterial color="#ffffff" size={0.22} sizeAttenuation transparent opacity={0.85} />
    </points>
  );
}

/** Light trails behind every tile along its orbit, as one batch of line segments. */
function Trails({ placed }: { placed: Orbit[] }) {
  const camera = useThree((state) => state.camera);
  const geometry = useMemo(() => {
    const positions: number[] = [];
    const colors: number[] = [];
    const steps = 12;
    for (const body of placed) {
      if (depthLayer(body, camera) !== "mid") continue;
      const sweep = (TRAIL * 1.6) / Math.sqrt(body.r);
      for (let s = 0; s < steps; s++) {
        for (const t of [s, s + 1]) {
          // Behind each tile the trail sweeps back and outward: it is falling in towards PixelPicked.
          const a = body.theta - sweep * (t / steps);
          const radius = body.r * (1 + 0.22 * (t / steps));
          const y = body.y - TILE * 0.45 + (wellY(radius) - wellY(body.r));
          positions.push(radius * Math.cos(a), y, radius * Math.sin(a));
          const fade = 1 - t / steps;
          colors.push(0.6 * fade, 0.78 * fade, 1.0 * fade);
        }
      }
    }
    const buffer = new THREE.BufferGeometry();
    buffer.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    buffer.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    return buffer;
  }, [placed, camera]);
  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial vertexColors transparent opacity={0.7} blending={THREE.AdditiveBlending} depthWrite={false} />
    </lineSegments>
  );
}

/**
 * Which depth layer a tile ends up in. Near tiles that would sit over
 * PixelPicked or the wordmark stay on the fabric, so the centre stays clear.
 */
function depthLayer(body: Orbit, camera: THREE.Camera): Layer {
  if (body.layer === "far") return "far";
  camera.updateMatrixWorld();
  const screen = new THREE.Vector3(body.x, body.y, body.z).project(camera);
  if (body.layer === "mid" || Math.abs(screen.x) < 0.55) {
    // A tile floating in front of PixelPicked would hide it: send it off into the sky instead.
    const logo = new THREE.Vector3(0, LOGO_Y, 0).project(camera);
    const aspect = (camera as THREE.PerspectiveCamera).aspect;
    return Math.abs(screen.x - logo.x) < 0.2 / aspect && Math.abs(screen.y - logo.y) < 0.22 ? "far" : "mid";
  }
  return "near";
}

/** A blurred copy of a texture, faking a lens's depth of field. */
function blurred(texture: THREE.Texture, px: number) {
  const image = texture.image as HTMLImageElement;
  const size = 256;
  const pad = px * 2;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const context = canvas.getContext("2d")!;
  context.filter = `blur(${px}px)`;
  context.drawImage(image, pad, pad, size - pad * 2, size - pad * 2);
  const result = new THREE.CanvasTexture(canvas);
  result.colorSpace = texture.colorSpace;
  return result;
}

/** A faint thread of light from each floating tile down to the fabric, so its height reads. */
function Tethers({ placed }: { placed: Orbit[] }) {
  const camera = useThree((state) => state.camera);
  const geometry = useMemo(() => {
    const positions: number[] = [];
    const colors: number[] = [];
    for (const body of placed) {
      if (depthLayer(body, camera) !== "mid") continue;
      positions.push(body.x, body.y - TILE * 0.5, body.z, body.x, body.ground, body.z);
      colors.push(0.45, 0.6, 1.0, 0.05, 0.08, 0.2);
    }
    const buffer = new THREE.BufferGeometry();
    buffer.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    buffer.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    return buffer;
  }, [placed, camera]);
  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial vertexColors transparent opacity={0.55} blending={THREE.AdditiveBlending} depthWrite={false} />
    </lineSegments>
  );
}

function Tiles({ placed, textures }: { placed: Orbit[]; textures: THREE.Texture[] }) {
  const camera = useThree((state) => state.camera);
  const geometry = useMemo(() => new RoundedBoxGeometry(TILE, TILE, TILE * 0.12, 4, TILE * 0.14), []);
  const side = useMemo(() => new THREE.MeshStandardMaterial({ color: "#d8deea", roughness: 0.35, metalness: 0.3 }), []);
  const tiles = useMemo(
    () =>
      placed.map((body, i) => {
        // Face the camera, then lean back into the fabric and roll along the orbit.
        const holder = new THREE.Object3D();
        holder.position.set(body.x, body.y, body.z);
        const layer = depthLayer(body, camera);
        if (layer === "near") {
          // Slide along the line of sight towards the lens: big, soft, out of focus.
          holder.position.lerp(camera.position, 0.55 + body.pull * 0.2);
        } else if (layer === "far") {
          // Lift far up and back into the sky: tiny and faint.
          holder.position.set(body.x * 2.2, 3 + body.pull * 7, body.z * 2.2 - 14 - body.pull * 18);
        }
        holder.lookAt(camera.position);
        holder.rotateX(-0.45 + body.tiltX);
        holder.rotateZ(Math.sin(body.theta) * 0.35 + body.tiltZ);
        const map = layer === "near" ? blurred(textures[i], 5 + body.pull * 5) : layer === "far" ? blurred(textures[i], 1.5) : textures[i];
        const fade = layer === "near" ? 0.55 : layer === "far" ? 0.22 + body.pull * 0.2 : 1;
        const front = new THREE.MeshStandardMaterial({
          map,
          emissive: "#ffffff",
          emissiveMap: map,
          emissiveIntensity: 0.45 * fade,
          color: new THREE.Color(fade, fade, fade * 1.1),
          roughness: 0.45,
          metalness: 0.05,
          transparent: layer !== "mid",
          opacity: layer === "near" ? 0.75 : layer === "far" ? 0.5 + body.pull * 0.3 : 1,
        });
        const edge = layer === "mid" ? side : new THREE.MeshStandardMaterial({ color: "#8a93a8", transparent: true, opacity: front.opacity * 0.6 });
        return { position: holder.position.clone(), quaternion: holder.quaternion.clone(), materials: [edge, edge, edge, edge, front, edge], layer };
      }),
    [placed, textures, camera, side],
  );
  return (
    <>
      {tiles.map((tile, i) => (
        <mesh key={i} geometry={geometry} material={tile.materials} position={tile.position} quaternion={tile.quaternion} renderOrder={tile.layer === "near" ? 10 : 0} />
      ))}
    </>
  );
}

function Core({ logo }: { logo: THREE.Texture }) {
  const camera = useThree((state) => state.camera);
  const glow = useMemo(() => glowTexture(), []);
  const geometry = useMemo(() => new RoundedBoxGeometry(1.8, 1.8, 0.26, 6, 0.36), []);
  const quaternion = useMemo(() => {
    const holder = new THREE.Object3D();
    holder.position.set(0, LOGO_Y, 0);
    holder.lookAt(camera.position);
    return holder.quaternion.clone();
  }, [camera]);
  const materials = useMemo(() => {
    const side = new THREE.MeshStandardMaterial({ color: "#f4f6fb", roughness: 0.25, metalness: 0.2, emissive: "#9db8ff", emissiveIntensity: 0.25 });
    // Unlit, so the light right next to it can't wash out the logo's dark pixels.
    const front = new THREE.MeshBasicMaterial({ map: logo, depthTest: false, transparent: true });
    return [side, side, side, side, front, side];
  }, [logo]);
  return (
    <group>
      <sprite position={[0, LOGO_Y, 0]} scale={[11, 11, 1]}>
        <spriteMaterial map={glow} transparent blending={THREE.AdditiveBlending} depthWrite={false} opacity={0.9} />
      </sprite>
      {/* Rings of light hugging the funnel wall, brightest deepest down: everything is being drawn in. */}
      {[1.45, 1.9, 2.5, 3.3].map((radius, i) => (
        <mesh key={radius} position={[0, wellY(radius) + 0.04, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[radius, 0.028 - i * 0.004, 16, 220]} />
          <meshBasicMaterial color={i < 2 ? "#e2efff" : "#8fb7ff"} transparent opacity={0.95 - i * 0.2} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      ))}
      <mesh geometry={geometry} material={materials} position={[0, LOGO_Y, 0]} quaternion={quaternion} renderOrder={30} />
      <pointLight position={[0, LOGO_Y + 0.5, 0]} color="#a9c8ff" intensity={60} distance={14} decay={1.6} />
    </group>
  );
}

function CameraRig({ position, target, fov }: { position: [number, number, number]; target: [number, number, number]; fov: number }) {
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera;
  useMemo(() => {
    camera.position.set(...position);
    camera.fov = fov;
    camera.lookAt(...target);
    camera.updateProjectionMatrix();
  }, [camera, position, target, fov]);
  return null;
}

export const WallpaperSpace3D: React.FC = () => {
  const { width, height } = useVideoConfig();
  const portrait = height > width;
  const unit = Math.min(width, height) / 1080;
  const urls = useMemo(() => [staticFile("logo.svg"), ...GAMES.map((game) => staticFile(`icons/${game.id}.png`))], []);
  const textures = useTextures(urls);
  const placed = useMemo(() => orbits(GAMES.length), []);
  const shot = portrait
    ? { position: [0, 14, 10] as [number, number, number], target: [0, -4.2, -0.4] as [number, number, number], fov: 62 }
    : { position: [0, 8.5, 13.5] as [number, number, number], target: [0, -3.6, 0] as [number, number, number], fov: 50 };

  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse 120% 90% at 50% 40%, #0d1433 0%, #070a1d 45%, #02030a 100%)", fontFamily: FONT }}>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 45% 35% at 18% 18%, rgba(122,76,255,0.22), transparent 70%)" }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 40% 30% at 85% 25%, rgba(0,190,255,0.14), transparent 70%)" }} />
      {textures && (
        <ThreeCanvas width={width} height={height} gl={{ alpha: true, antialias: true }} camera={{ near: 0.1, far: 300 }}>
          <CameraRig {...shot} />
          <ambientLight intensity={0.55} />
          <directionalLight position={[4, 12, 10]} intensity={1.4} />
          <Stars />
          <Fabric />
          <Trails placed={placed} />
          <Tethers placed={placed} />
          <Tiles placed={placed} textures={textures.slice(1)} />
          <Core logo={textures[0]} />
        </ThreeCanvas>
      )}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: portrait ? height * 0.6 : height * 0.08,
          textAlign: "center",
          color: "#fff",
          fontSize: (portrait ? 84 : 96) * unit,
          fontWeight: 800,
          letterSpacing: -2 * unit,
          textShadow: `0 0 ${30 * unit}px rgba(140,190,255,0.9), 0 ${4 * unit}px ${24 * unit}px rgba(0,0,0,0.8)`,
          // On phones the wordmark sits over tiles: a soft dark backing keeps it readable.
          background: portrait ? "radial-gradient(ellipse 45% 60% at 50% 50%, rgba(3,5,15,0.75), transparent 75%)" : undefined,
          padding: portrait ? `${30 * unit}px 0` : undefined,
        }}
      >
        PixelPicked.
      </div>
    </AbsoluteFill>
  );
};
