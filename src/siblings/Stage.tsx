import React, { useLayoutEffect } from "react";
import * as THREE from "three";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { Post, PostSettings } from "./Post";

/** A 3D shot: canvas with soft shadows and filmic tone mapping, and a camera aimed each frame. */

type Vec3 = [number, number, number];

export type Cam = { pos: Vec3; look: Vec3; fov?: number };

const CameraRig: React.FC<Cam> = ({ pos, look, fov = 35 }) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  useLayoutEffect(() => {
    camera.position.set(...pos);
    camera.fov = fov;
    camera.near = 0.05;
    camera.far = 60;
    camera.updateProjectionMatrix();
    camera.lookAt(...look);
  }, [camera, pos[0], pos[1], pos[2], look[0], look[1], look[2], fov]);
  return null;
};

/** Soft studio reflections so glossy eyes, glasses and plastic pick up highlights. */
const Environment: React.FC<{ intensity: number }> = ({ intensity }) => {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  useLayoutEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = intensity;
    return () => {
      env.dispose();
      pmrem.dispose();
    };
  }, [gl, scene, intensity]);
  return null;
};

export type StageProps = {
  cam: Cam;
  width?: number;
  height?: number;
  children: React.ReactNode;
  exposure?: number;
  /** Film finish (AO, depth of field, grade). Focus defaults to the camera's look-at point. */
  post?: Partial<PostSettings> | false;
  env?: number;
  fill?: number;
};

export const Stage: React.FC<StageProps> = ({ cam, width = 1080, height = 1920, children, exposure = 1.1, post, env = 0.35, fill = 0.9 }) => (
  <ThreeCanvas
    width={width}
    height={height}
    shadows={{ type: THREE.PCFSoftShadowMap }}
    gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: exposure }}
    style={{ position: "absolute", inset: 0 }}
  >
    <CameraRig {...cam} />
    <Environment intensity={env} />
    {/* soft fill from the camera side so faces never go muddy */}
    <directionalLight position={cam.pos} intensity={fill} color="#fff1e0" />
    {children}
    {post !== false && post && <Post focus={dist(cam.pos, cam.look)} {...post} />}
  </ThreeCanvas>
);

const dist = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/** Interpolates a camera between two framings with smooth easing. */
export function lerpCam(a: Cam, b: Cam, t: number): Cam {
  const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  const l = (x: Vec3, y: Vec3): Vec3 => [x[0] + (y[0] - x[0]) * e, x[1] + (y[1] - x[1]) * e, x[2] + (y[2] - x[2]) * e];
  return { pos: l(a.pos, b.pos), look: l(a.look, b.look), fov: (a.fov ?? 35) + ((b.fov ?? 35) - (a.fov ?? 35)) * e };
}

/** A camera `dist` away from `target`, swung `yaw` radians around from straight in front (+z). */
export function orbit(target: Vec3, dist: number, yaw = 0, rise = 0, fov = 32): Cam {
  return { pos: [target[0] + Math.sin(yaw) * dist, target[1] + rise, target[2] + Math.cos(yaw) * dist], look: target, fov };
}
