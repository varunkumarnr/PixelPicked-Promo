import React from "react";
import { AbsoluteFill, Img, staticFile, useVideoConfig } from "remotion";
import { FONT } from "./config";
import { GAMES } from "./timeline";

/**
 * A gallery wall: every game hung as a framed picture, salon style, with
 * PixelPicked in the big frame in the middle under a spotlight.
 */

function random(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

type FrameStyle = { outer: string; edge: string; mat: string | null };

/** Black, oak, walnut, white, gold and silver mouldings; some with a white mat. */
const STYLES: FrameStyle[] = [
  { outer: "linear-gradient(135deg, #2a2a2a, #0d0d0d 55%, #1f1f1f)", edge: "#000", mat: null },
  { outer: "linear-gradient(135deg, #2a2a2a, #0d0d0d 55%, #1f1f1f)", edge: "#000", mat: "#f6f3ec" },
  { outer: "linear-gradient(135deg, #d9b88a, #b38b5d 50%, #caa676)", edge: "#8a6a43", mat: null },
  { outer: "linear-gradient(135deg, #d9b88a, #b38b5d 50%, #caa676)", edge: "#8a6a43", mat: "#fbf8f1" },
  { outer: "linear-gradient(135deg, #6b4a32, #3e2a1c 50%, #5a3e2a)", edge: "#2a1a10", mat: null },
  { outer: "linear-gradient(135deg, #ffffff, #e9e7e2 55%, #f7f6f2)", edge: "#cfcbc2", mat: null },
  { outer: "linear-gradient(135deg, #f3dc8e, #b8902f 35%, #f0d27a 55%, #9c7522 80%, #e6c35f)", edge: "#7a5a17", mat: null },
  { outer: "linear-gradient(135deg, #f3dc8e, #b8902f 35%, #f0d27a 55%, #9c7522 80%, #e6c35f)", edge: "#7a5a17", mat: "#f8f4ea" },
  { outer: "linear-gradient(135deg, #f2f2f2, #a9adb3 40%, #e6e8eb 60%, #8f949b)", edge: "#6d7177", mat: null },
];

type Placed = { col: number; row: number; span: number; style: FrameStyle; tilt: number };

export const WallpaperGallery: React.FC = () => {
  const { width, height } = useVideoConfig();
  const portrait = height > width;
  const unit = Math.min(width, height) / 1080;
  const rand = random(929);

  // ── Grid ──────────────────────────────────────────────────────────────
  const pitch = (portrait ? 92 : 66) * unit;
  const cols = Math.floor(width / pitch);
  const rows = Math.floor(height / pitch);
  const offsetX = (width - cols * pitch) / 2;
  const offsetY = (height - rows * pitch) / 2;
  const taken: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));

  // The PixelPicked frame: a big square in the middle, with room for its plaque below.
  const heroSpan = portrait ? 6 : 8;
  const heroCol = Math.floor((cols - heroSpan) / 2);
  const heroRow = Math.floor((rows - heroSpan - 1) / 2);
  for (let r = heroRow; r < heroRow + heroSpan + 1; r++) for (let c = heroCol; c < heroCol + heroSpan; c++) taken[r][c] = true;

  // ── Salon hang: fill every free spot with a 1, 2 or 3 cell frame ──────
  const fits = (col: number, row: number, span: number) => {
    if (col + span > cols || row + span > rows) return false;
    for (let r = row; r < row + span; r++) for (let c = col; c < col + span; c++) if (taken[r][c]) return false;
    return true;
  };
  const frames: Placed[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (taken[row][col]) continue;
      const roll = rand();
      const wanted = roll < 0.08 ? 3 : roll < 0.36 ? 2 : 1;
      let span = wanted;
      while (span > 1 && !fits(col, row, span)) span--;
      for (let r = row; r < row + span; r++) for (let c = col; c < col + span; c++) taken[r][c] = true;
      frames.push({ col, row, span, style: STYLES[Math.floor(rand() * STYLES.length)], tilt: (rand() - 0.5) * 2.4 });
    }
  }

  // Each frame gets a different game, the bigger frames going to a fresh shuffle.
  const games = [...GAMES];
  const shuffle = random(1000);
  for (let i = games.length - 1; i > 0; i--) {
    const j = Math.floor(shuffle() * (i + 1));
    [games[i], games[j]] = [games[j], games[i]];
  }

  const frame = (key: React.Key, left: number, top: number, size: number, style: FrameStyle, tilt: number, picture: React.ReactNode) => {
    const moulding = size * (style.mat ? 0.075 : 0.09);
    const mat = style.mat ? size * 0.11 : 0;
    return (
      <div
        key={key}
        style={{
          position: "absolute",
          left,
          top,
          width: size,
          height: size,
          transform: `rotate(${tilt}deg)`,
          background: style.outer,
          border: `${Math.max(1, size * 0.006)}px solid ${style.edge}`,
          padding: moulding,
          boxSizing: "border-box",
          // Hung on the wall: a soft drop shadow down and to the right, under the spotlight.
          boxShadow: `${size * 0.02}px ${size * 0.06}px ${size * 0.08}px rgba(40,28,15,0.38), ${size * 0.005}px ${size * 0.015}px ${size * 0.02}px rgba(40,28,15,0.35)`,
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            padding: mat,
            boxSizing: "border-box",
            backgroundColor: style.mat ?? "transparent",
            // The bevel where the moulding meets the picture.
            boxShadow: `inset ${size * 0.006}px ${size * 0.01}px ${size * 0.018}px rgba(0,0,0,0.45)`,
          }}
        >
          {picture}
        </div>
      </div>
    );
  };

  const heroLeft = offsetX + heroCol * pitch;
  const heroTop = offsetY + heroRow * pitch;
  const heroSize = heroSpan * pitch;
  const gap = pitch * 0.16;

  return (
    <AbsoluteFill style={{ backgroundColor: "#e9e2d6", fontFamily: FONT, overflow: "hidden" }}>
      {/* Plaster: fine grain, then warm gallery light falling off to the corners. */}
      <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
        <filter id="plaster">
          <feTurbulence type="fractalNoise" baseFrequency={0.9 / unit} numOctaves={3} seed={4} />
          <feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.38  0 0 0 0 0.3  0 0 0 0.22 0" />
        </filter>
        <rect width={width} height={height} filter="url(#plaster)" />
      </svg>

      {frames.map((placed, i) => {
        const size = placed.span * pitch - gap;
        const left = offsetX + placed.col * pitch + gap / 2;
        const top = offsetY + placed.row * pitch + gap / 2;
        const game = games[i % games.length];
        return frame(
          i,
          left,
          top,
          size,
          placed.style,
          placed.tilt,
          <Img src={staticFile(`icons/${game.id}.png`)} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />,
        );
      })}

      {/* Light: a spotlight on PixelPicked, the rest of the wall falling into soft shadow. */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse ${portrait ? "75% 38%" : "42% 62%"} at 50% ${((heroTop + heroSize / 2) / height) * 100}%, rgba(255,236,200,0.28) 0%, rgba(255,236,200,0.08) 40%, rgba(25,16,8,0.28) 80%, rgba(20,12,6,0.5) 100%)`,
          mixBlendMode: "multiply",
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse ${portrait ? "60% 26%" : "30% 44%"} at 50% ${((heroTop + heroSize / 2) / height) * 100}%, rgba(255,240,210,0.35), transparent 70%)`,
          mixBlendMode: "screen",
        }}
      />

      {/* PixelPicked: the big gold frame in the middle, with its plaque. */}
      {frame(
        "hero",
        heroLeft + gap / 2,
        heroTop + gap / 2,
        heroSize - gap,
        { outer: STYLES[6].outer, edge: STYLES[6].edge, mat: "#faf7f0" },
        0,
        <Img src={staticFile("logo.svg")} style={{ width: "100%", height: "100%", display: "block", filter: `drop-shadow(0 ${6 * unit}px ${14 * unit}px rgba(0,0,0,0.25))` }} />,
      )}
      <div
        style={{
          position: "absolute",
          left: heroLeft + heroSize / 2 - pitch * 1.6,
          top: heroTop + heroSize + pitch * 0.12,
          width: pitch * 3.2,
          height: pitch * 0.66,
          borderRadius: 4 * unit,
          background: "linear-gradient(135deg, #f1d88c, #b48c34 40%, #ecd07c 60%, #a07a28)",
          boxShadow: `0 ${4 * unit}px ${10 * unit}px rgba(40,28,15,0.4), inset 0 0 0 ${2 * unit}px rgba(120,90,30,0.6)`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "#3a2a0c",
        }}
      >
        <div style={{ fontSize: pitch * 0.24, fontWeight: 800, letterSpacing: -0.5 * unit, lineHeight: 1 }}>PixelPicked.</div>
        <div style={{ fontSize: pitch * 0.085, fontWeight: 600, letterSpacing: 2.5 * unit, textTransform: "uppercase", marginTop: pitch * 0.05, opacity: 0.8 }}>
          {GAMES.length} games · play in your browser
        </div>
      </div>
    </AbsoluteFill>
  );
};
