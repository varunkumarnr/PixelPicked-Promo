import { useLayoutEffect, useRef, useState } from "react";
import * as THREE from "three";
import { cancelRender, continueRender, delayRender, staticFile, useVideoConfig } from "remotion";
import { NoReactInternals } from "remotion/no-react";
import { useThree } from "@react-three/fiber";

/**
 * One frame of a clip as a texture, `t` seconds in. Like @remotion/three's video texture, but it
 * holds the render until the frame is on the material and drawn: that hook lets go as soon as the
 * image loads, so the canvas gets captured before the screen shows anything.
 */
export function useClipFrame(clip: string, t: number): THREE.Texture | null {
  const { fps } = useVideoConfig();
  const advance = useThree((s) => s.advance);
  const url = NoReactInternals.getOffthreadVideoSource({ src: staticFile(`clips/ad/${clip}.mp4`), currentTime: Math.round(t * fps) / fps, transparent: false, toneMapped: true });
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  const waiting = useRef<number | null>(null);
  useLayoutEffect(() => {
    const handle = delayRender(`clip frame ${url}`);
    let live = true;
    new THREE.TextureLoader().load(
      url,
      (next) => {
        if (!live) return next.dispose();
        next.colorSpace = THREE.SRGBColorSpace;
        waiting.current = handle;
        setTex((old) => {
          old?.dispose();
          return next;
        });
      },
      undefined,
      (err) => cancelRender(err),
    );
    return () => {
      live = false;
      if (waiting.current !== handle) continueRender(handle);
    };
  }, [url]);
  useLayoutEffect(() => {
    const handle = waiting.current;
    if (handle === null) return;
    waiting.current = null;
    advance(performance.now());
    continueRender(handle);
  }, [tex, advance]);
  return tex;
}
