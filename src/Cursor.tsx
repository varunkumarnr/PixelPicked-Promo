import React from "react";
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { FPS } from "./config";
import type { Tile } from "./layout";
import { CURSOR, useTimeline, type StoryWindow, type Timeline } from "./timeline";

const sec = (value: number) => Math.round(value * FPS);

export const clickFrame = (w: StoryWindow) => w.start - CURSOR.clickLead;
export const arriveFrame = (w: StoryWindow) => clickFrame(w) - CURSOR.hover;
const departFrame = (w: StoryWindow) => arriveFrame(w) - CURSOR.travel;

/** The hovered tile lifts; at the click it dips, like a button being pressed. */
export function tileLift(frame: number, w: StoryWindow, zoomFrames: number): number {
  if (frame < arriveFrame(w) - 4 || frame >= w.start + zoomFrames) return 1;
  const lift = interpolate(frame, [arriveFrame(w) - 4, arriveFrame(w) + 4], [1, 1.15], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const click = clickFrame(w);
  const press = interpolate(frame, [click, click + 2, click + CURSOR.press], [1, 0.9, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return lift * press;
}

/** Camera state, so the cursor can stay on its tile while the wall zooms. */
export type Camera = { scale: number; focusX: number; focusY: number };

type State = { x: number; y: number; opacity: number; pressed: boolean } | null;

function cursorState(frame: number, tiles: Tile[], camera: Camera, width: number, height: number, timeline: Timeline): State {
  const { STORY_WINDOWS, ZOOM_FRAMES } = timeline;
  const onScreen = (tile: Tile) => ({
    x: width / 2 + (tile.x - camera.focusX) * camera.scale,
    y: height / 2 + (tile.y - camera.focusY) * camera.scale,
  });
  const ease = Easing.inOut(Easing.cubic);

  for (let i = 0; i < STORY_WINDOWS.length; i++) {
    const w = STORY_WINDOWS[i];
    const previous = STORY_WINDOWS[i - 1];
    const target = tiles[w.index];
    const depart = departFrame(w);
    const arrive = arriveFrame(w);
    const pressed = frame >= clickFrame(w) && frame < clickFrame(w) + CURSOR.press;

    if (frame < depart) {
      if (!previous) return null; // not on screen yet
      // Resting where the last story's tile was, after zooming back out.
      return { ...onScreen(tiles[previous.index]), opacity: 1, pressed: false };
    }
    if (frame < arrive) {
      // Gliding in a gentle arc: from off the bottom-right corner, or from the last tile.
      const from = previous ? { x: tiles[previous.index].x, y: tiles[previous.index].y } : { x: width * 0.82, y: height * 1.08 };
      const t = ease((frame - depart) / (arrive - depart));
      const dx = target.x - from.x;
      const dy = target.y - from.y;
      const bow = Math.sin(Math.PI * t) * 0.12;
      return {
        x: from.x + dx * t - dy * bow,
        y: from.y + dy * t + dx * bow,
        opacity: previous ? 1 : interpolate(frame - depart, [0, 8], [0, 1], { extrapolateRight: "clamp" }),
        pressed: false,
      };
    }
    if (frame < w.start) return { ...onScreen(target), opacity: 1, pressed };
    if (frame < w.end) {
      // Follows the tile into the zoom, fading out; fades back in as the wall returns.
      const fadeIn = interpolate(frame, [w.start, w.start + ZOOM_FRAMES / 2], [1, 0], { extrapolateRight: "clamp" });
      const fadeOut = interpolate(frame, [w.end - ZOOM_FRAMES / 2, w.end], [0, 1], { extrapolateLeft: "clamp" });
      const opacity = frame < w.start + ZOOM_FRAMES ? fadeIn : fadeOut;
      return opacity > 0 ? { ...onScreen(target), opacity, pressed: false } : null;
    }
  }
  // After the last story: fade out over half a second.
  const last = STORY_WINDOWS.at(-1);
  if (!last) return null;
  const opacity = interpolate(frame, [last.end + sec(0.3), last.end + sec(0.8)], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return opacity > 0 ? { ...onScreen(tiles[last.index]), opacity, pressed: false } : null;
}

/** A macOS-style arrow pointer. */
export const Cursor: React.FC<{ tiles: Tile[]; camera: Camera }> = ({ tiles, camera }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const state = cursorState(frame, tiles, camera, width, height, useTimeline());
  if (!state) return null;
  const size = Math.min(width, height) * 0.045;
  return (
    <svg
      width={size}
      height={size * 1.5}
      viewBox="0 0 20 30"
      style={{
        position: "absolute",
        // The arrow's tip sits a little inside the tile's centre, like a real click.
        left: state.x - size * 0.12,
        top: state.y - size * 0.1,
        opacity: state.opacity,
        transform: `scale(${state.pressed ? 0.85 : 1})`,
        transformOrigin: "10% 5%",
        filter: "drop-shadow(0 3px 5px rgba(0,0,0,0.55))",
      }}
    >
      <path d="M2 2 L2 24 L8 18.5 L12 27 L15.5 25.5 L11.6 17 L19 17 Z" fill="#111" stroke="#fff" strokeWidth={1.8} strokeLinejoin="round" />
    </svg>
  );
};
