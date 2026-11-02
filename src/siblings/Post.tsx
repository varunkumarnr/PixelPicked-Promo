import React, { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { GTAOPass } from "three/examples/jsm/postprocessing/GTAOPass.js";
import { BokehPass } from "three/examples/jsm/postprocessing/BokehPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

/**
 * The "animated film" finish: ambient occlusion so things sit in their contact shadows, a shallow
 * depth of field focused on whoever the camera is looking at, then a grade (warm highlights, cool
 * shadows, a touch of contrast, vignette and grain). Takes over rendering from R3F.
 */

export type PostSettings = {
  /** World distance from the camera that is in focus. */
  focus: number;
  /** How quickly things blur away from the focus; bigger = shallower. */
  aperture?: number;
  maxBlur?: number;
  ao?: number;
  vignette?: number;
  grain?: number;
  /** Seed for the grain so it moves between frames. */
  frame?: number;
  /** "film": soft 3D movie finish. "comic": ink lines, cel bands, halftone, misprint. "anime": two-tone cel, coloured lines, glow. */
  style?: "film" | "comic" | "anime";
};

/**
 * The comic-book finish, run on the tone-mapped image: ink lines where depth or surface direction
 * jumps (from a normals+depth render), lighting snapped into cel bands, halftone dots in the
 * shadows, a slight colour-plate misprint that grows in the background, and paper grain.
 */
const Comic = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    tNormal: { value: null as THREE.Texture | null },
    tDepth: { value: null as THREE.Texture | null },
    res: { value: new THREE.Vector2(1080, 1920) },
    cameraNear: { value: 0.05 },
    cameraFar: { value: 60 },
    seed: { value: 0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    #include <packing>
    uniform sampler2D tDiffuse, tNormal, tDepth;
    uniform vec2 res;
    uniform float cameraNear, cameraFar, seed;
    varying vec2 vUv;
    float lin(vec2 uv) { return -perspectiveDepthToViewZ(texture2D(tDepth, uv).x, cameraNear, cameraFar); }
    vec3 nrm(vec2 uv) { return texture2D(tNormal, uv).xyz * 2.0 - 1.0; }
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233)) + seed) * 43758.5453); }
    void main() {
      vec2 px = 1.0 / res;
      float dc = lin(vUv);
      vec3 nc = nrm(vUv);
      float far = smoothstep(3.5, 8.0, dc);
      float t = mix(3.6, 2.0, far);
      float edge = 0.0;
      vec2 offs[8];
      offs[0] = vec2(1, 0); offs[1] = vec2(-1, 0); offs[2] = vec2(0, 1); offs[3] = vec2(0, -1);
      offs[4] = vec2(0.7, 0.7); offs[5] = vec2(-0.7, 0.7); offs[6] = vec2(0.7, -0.7); offs[7] = vec2(-0.7, -0.7);
      for (int i = 0; i < 8; i++) {
        vec2 q = vUv + offs[i] * t * px;
        float d = lin(q);
        edge = max(edge, smoothstep(0.018, 0.045, abs(d - dc) / dc));
        edge = max(edge, smoothstep(0.25, 0.5, 1.0 - dot(nrm(q), nc)));
      }
      edge *= mix(1.0, 0.6, far);
      // colour plates slightly out of register, more so in the background
      vec2 off = px * mix(2.5, 7.0, far);
      vec3 col = vec3(texture2D(tDiffuse, vUv + off).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - off).b);
      // cel bands: snap brightness to steps with soft edges, keep the hue
      float L = dot(col, vec3(0.299, 0.587, 0.114));
      float bands = 3.0;
      float f = fract(L * bands);
      float Lq = (floor(L * bands) + smoothstep(0.46, 0.54, f)) / bands + 0.08;
      col *= mix(1.0, Lq / max(L, 1e-3), 0.9);
      float L2 = dot(col, vec3(0.299, 0.587, 0.114));
      col = mix(vec3(L2), col, 1.5);
      // halftone dots in the shadows, on a 45 degree screen
      vec2 p = vUv * res;
      vec2 g = mat2(0.7071, -0.7071, 0.7071, 0.7071) * p / 10.0;
      vec2 cell = fract(g) - 0.5;
      float rad = (1.0 - smoothstep(0.06, 0.38, L)) * 0.5;
      float dotv = 1.0 - smoothstep(rad - 0.06, rad + 0.02, length(cell));
      col = mix(col, col * vec3(0.35, 0.3, 0.55), dotv * 0.6);
      // ink
      col = mix(col, vec3(0.07, 0.05, 0.1), clamp(edge, 0.0, 1.0));
      col += (hash(floor(p)) - 0.5) * 0.035;
      gl_FragColor = vec4(col, 1.0);
    }`,
};

const Grade = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    vignette: { value: 0.35 },
    grain: { value: 0.035 },
    seed: { value: 0 },
    aspect: { value: 1080 / 1920 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float vignette, grain, seed, aspect;
    varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233)) + seed) * 43758.5453); }
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      // still linear here (OutputPass tone maps after): split-tone warm highlights, cool shadows
      float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
      vec3 shadowTint = vec3(0.86, 0.94, 1.12);
      vec3 highTint = vec3(1.08, 1.0, 0.88);
      c.rgb *= mix(shadowTint, highTint, smoothstep(0.02, 0.6, l));
      // gentle S-curve on luminance
      float nl = l / (l + 0.18) * 1.18;
      c.rgb *= mix(1.0, nl / max(l, 1e-4), 0.35);
      // vignette, a bit wider than tall for 9:16
      vec2 d = (vUv - 0.5) * vec2(aspect * 1.6, 1.0);
      c.rgb *= 1.0 - vignette * smoothstep(0.25, 0.85, length(d) * 1.25);
      c.rgb += (hash(vUv * 1000.0) - 0.5) * grain * (0.3 + l);
      gl_FragColor = c;
    }`,
};

/**
 * The Japanese TV-anime finish: every surface flattened to a lit tone and one cool shadow tone
 * (plus a highlight band), thin line art tinted from the colour underneath rather than black,
 * a painted, line-free background, and a little extra saturation.
 */
const Anime = {
  uniforms: { ...Comic.uniforms, tAlbedo: { value: null as THREE.Texture | null } },
  vertexShader: Comic.vertexShader,
  fragmentShader: /* glsl */ `
    #include <packing>
    uniform sampler2D tDiffuse, tNormal, tDepth, tAlbedo;
    uniform vec2 res;
    uniform float cameraNear, cameraFar, seed;
    varying vec2 vUv;
    const vec3 W = vec3(0.2126, 0.7152, 0.0722);
    float lin(vec2 uv) { return -perspectiveDepthToViewZ(texture2D(tDepth, uv).x, cameraNear, cameraFar); }
    vec3 nrm(vec2 uv) { return texture2D(tNormal, uv).xyz * 2.0 - 1.0; }
    void main() {
      vec2 px = 1.0 / res;
      float dc = lin(vUv);
      vec3 nc = nrm(vUv);
      float far = smoothstep(3.0, 6.5, dc);
      float edge = 0.0;
      vec2 offs[4];
      offs[0] = vec2(1, 0); offs[1] = vec2(-1, 0); offs[2] = vec2(0, 1); offs[3] = vec2(0, -1);
      for (int i = 0; i < 4; i++) {
        vec2 q = vUv + offs[i] * 2.2 * px;
        edge = max(edge, smoothstep(0.02, 0.05, abs(lin(q) - dc) / dc));
        edge = max(edge, smoothstep(0.3, 0.55, 1.0 - dot(nrm(q), nc)));
      }
      edge *= 1.0 - far;
      vec3 shaded = texture2D(tDiffuse, vUv).rgb;          // lit, tone mapped, display space
      vec3 albLin = texture2D(tAlbedo, vUv).rgb;            // flat base colour, linear
      vec3 alb = pow(max(albLin, 0.0), vec3(1.0 / 2.2));
      // how lit this pixel is, relative to its own base colour
      float s = dot(pow(shaded, vec3(2.2)), W) / max(dot(albLin, W), 0.004);
      // one lit tone, one cool shadow tone, a highlight band, hard edges
      float lit = smoothstep(0.32, 0.38, s);
      float hi = smoothstep(1.05, 1.12, s);
      vec3 cel = alb * mix(vec3(0.64, 0.6, 0.82), vec3(0.98, 0.96, 0.95), lit);
      cel = mix(cel, alb * 1.1 + 0.05, hi * 0.5);
      // keep some of the room's coloured light and the glow of bright things
      cel = mix(cel, shaded, 0.15);
      float glow = smoothstep(0.75, 0.95, dot(shaded, W));
      cel = mix(cel, shaded, glow * 0.6);
      // the background stays painterly
      vec3 col = mix(cel, shaded, far * 0.6);
      float L2 = dot(col, W);
      col = mix(vec3(L2), col, 1.12);
      vec3 line = mix(alb * 0.3, vec3(0.13, 0.08, 0.16), 0.55);
      col = mix(col, line, clamp(edge, 0.0, 1.0));
      gl_FragColor = vec4(col, 1.0);
    }`,
};

export const Post: React.FC<PostSettings> = ({ style = "film", ...rest }) =>
  style === "film" ? <FilmPost {...rest} /> : <LinePost {...rest} anime={style === "anime"} />;

/** The comic and anime finishes: both need a normals+depth render for their line art. */
const LinePost: React.FC<PostSettings & { anime: boolean }> = ({ focus, aperture = 0.004, maxBlur = 0.006, frame = 0, anime }) => {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);

  const { composer, bokeh, comic, normals, normalMat, albedo, flatLight } = useMemo(() => {
    const w = size.width;
    const h = size.height;
    const composer = new EffectComposer(gl, new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: 4 }));
    composer.setPixelRatio(1);
    composer.setSize(w, h);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(anime ? new UnrealBloomPass(new THREE.Vector2(w, h), 0.7, 0.8, 1.3) : new UnrealBloomPass(new THREE.Vector2(w, h), 0.35, 0.4, 2.2));
    const bokeh = new BokehPass(scene, camera, { focus, aperture, maxblur: maxBlur });
    composer.addPass(bokeh);
    composer.addPass(new OutputPass());
    const comic = new ShaderPass(anime ? Anime : Comic);
    comic.uniforms.res.value.set(w, h);
    composer.addPass(comic);
    const normals = new THREE.WebGLRenderTarget(w, h, { depthTexture: new THREE.DepthTexture(w, h) });
    const normalMat = new THREE.MeshNormalMaterial();
    const albedo = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: 4 });
    const flatLight = new THREE.AmbientLight(0xffffff, 1);
    return { composer, bokeh, comic, normals, normalMat, albedo, flatLight };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, scene, camera, size.width, size.height, anime]);

  useLayoutEffect(() => {
    const u = (bokeh as unknown as { uniforms: Record<string, { value: number }> }).uniforms;
    u.focus.value = focus;
    u.aperture.value = aperture;
    u.maxblur.value = maxBlur;
    comic.uniforms.seed.value = (Math.floor(frame / 2) * 7.31) % 100;
  }, [bokeh, comic, focus, aperture, maxBlur, frame]);

  useLayoutEffect(
    () => () => {
      composer.dispose();
      normals.dispose();
      normalMat.dispose();
      albedo.dispose();
    },
    [composer, normals, normalMat, albedo],
  );

  useFrame(() => {
    // normals + depth of everything solid (see-through things like blush and lenses get no ink)
    const hidden: THREE.Object3D[] = [];
    scene.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.Material | undefined;
      if (o.visible && m && !Array.isArray(m) && m.transparent) {
        o.visible = false;
        hidden.push(o);
      }
    });
    const prevOverride = scene.overrideMaterial;
    const prevBg = scene.background;
    scene.overrideMaterial = normalMat;
    scene.background = null;
    gl.setRenderTarget(normals);
    gl.clear();
    gl.render(scene, camera);
    gl.setRenderTarget(null);
    scene.overrideMaterial = prevOverride;
    scene.background = prevBg;
    hidden.forEach((o) => (o.visible = true));
    comic.uniforms.tNormal.value = normals.texture;
    comic.uniforms.tDepth.value = normals.depthTexture;
    comic.uniforms.cameraNear.value = camera.near;
    comic.uniforms.cameraFar.value = camera.far;
    if (anime) {
      // base colours: everything lit by one flat white ambient light, no shadows or reflections
      const lights: THREE.Light[] = [];
      scene.traverse((o) => {
        if ((o as THREE.Light).isLight && o.visible) {
          o.visible = false;
          lights.push(o as THREE.Light);
        }
      });
      const env = scene.environment;
      scene.environment = null;
      scene.add(flatLight);
      gl.setRenderTarget(albedo);
      gl.clear();
      gl.render(scene, camera);
      gl.setRenderTarget(null);
      scene.remove(flatLight);
      scene.environment = env;
      lights.forEach((l) => (l.visible = true));
      comic.uniforms.tAlbedo.value = albedo.texture;
    }
    composer.render();
  }, 1);
  return null;
};

const FilmPost: React.FC<PostSettings> = ({ focus, aperture = 0.012, maxBlur = 0.012, ao = 1, vignette = 0.35, grain = 0.035, frame = 0 }) => {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);

  const { composer, bokeh, grade, gtao } = useMemo(() => {
    const w = size.width;
    const h = size.height;
    const composer = new EffectComposer(gl, new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: 4 }));
    composer.setPixelRatio(1);
    composer.setSize(w, h);
    composer.addPass(new RenderPass(scene, camera));
    const gtao = new GTAOPass(scene, camera, w, h);
    gtao.updateGtaoMaterial({ radius: 0.35, distanceExponent: 1.5, thickness: 1.2, scale: 1, samples: 16 });
    gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 16 });
    composer.addPass(gtao);
    // only things brighter than white (bulbs, screens, practicals) glow
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(w, h), 0.45, 0.5, 2.2));
    const bokeh = new BokehPass(scene, camera, { focus, aperture, maxblur: maxBlur });
    composer.addPass(bokeh);
    const grade = new ShaderPass(Grade);
    grade.uniforms.aspect.value = w / h;
    composer.addPass(grade);
    composer.addPass(new OutputPass());
    return { composer, bokeh, grade, gtao };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, scene, camera, size.width, size.height]);

  useLayoutEffect(() => {
    const u = (bokeh as unknown as { uniforms: Record<string, { value: number }> }).uniforms;
    u.focus.value = focus;
    u.aperture.value = aperture;
    u.maxblur.value = maxBlur;
    gtao.blendIntensity = ao;
    grade.uniforms.vignette.value = vignette;
    grade.uniforms.grain.value = grain;
    grade.uniforms.seed.value = (frame * 7.31) % 100;
  }, [bokeh, gtao, grade, focus, aperture, maxBlur, ao, vignette, grain, frame]);

  useLayoutEffect(() => () => composer.dispose(), [composer]);

  useFrame(() => {
    composer.render();
  }, 1);
  return null;
};
