import React from "react";
import { AbsoluteFill, Img, staticFile, useVideoConfig } from "remotion";
import { FONT } from "./config";
import { GAMES } from "./timeline";

/**
 * A gallery wall where the framed games are hung to spell PIXEL / PICKED,
 * pixel-font style, under the PixelPicked logo in its gold frame.
 */

function random(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

const WORDS = ["PIXEL", "PICKED"];
/** Pixels per grid cell when tracing the letters. */
const SAMPLE = 12;

/**
 * Traces bold PIXEL / PICKED onto a grid `cols` cells wide and returns the
 * cells the letters cover (in cell units), plus the grid's height.
 */
function traceWords(cols: number) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true })!;
  const font = (size: number) => `900 ${size}px ${FONT}`;
  context.font = font(100);
  const widest = Math.max(...WORDS.map((word) => context.measureText(word).width));
  const fontSize = (100 * cols * SAMPLE) / widest;
  context.font = font(fontSize);
  const metrics = context.measureText("PIXELPICKED");
  const capHeight = metrics.actualBoundingBoxAscent;
  const lineGap = capHeight * 0.32;
  canvas.width = cols * SAMPLE;
  canvas.height = Math.ceil(capHeight * WORDS.length + lineGap * (WORDS.length - 1)) + SAMPLE;
  context.font = font(fontSize);
  context.fillStyle = "#000";
  context.textAlign = "center";
  context.textBaseline = "alphabetic";
  WORDS.forEach((word, line) => context.fillText(word, canvas.width / 2, capHeight + line * (capHeight + lineGap)));
  const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
  const rows = Math.ceil(canvas.height / SAMPLE);
  const cells: { col: number; row: number }[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      let covered = 0;
      let total = 0;
      for (let y = row * SAMPLE; y < Math.min(canvas.height, (row + 1) * SAMPLE); y += 2) {
        for (let x = col * SAMPLE; x < (col + 1) * SAMPLE; x += 2) {
          total++;
          if (data[(y * canvas.width + x) * 4 + 3] > 128) covered++;
        }
      }
      if (covered / total > 0.5) cells.push({ col, row });
    }
  }
  return { cells, rows };
}

type FrameStyle = { outer: string; edge: string };
const STYLES: FrameStyle[] = [
  { outer: "linear-gradient(135deg, #2a2a2a, #0d0d0d 55%, #1f1f1f)", edge: "#000" },
  { outer: "linear-gradient(135deg, #d9b88a, #b38b5d 50%, #caa676)", edge: "#8a6a43" },
  { outer: "linear-gradient(135deg, #6b4a32, #3e2a1c 50%, #5a3e2a)", edge: "#2a1a10" },
  { outer: "linear-gradient(135deg, #ffffff, #e9e7e2 55%, #f7f6f2)", edge: "#cfcbc2" },
  { outer: "linear-gradient(135deg, #f3dc8e, #b8902f 35%, #f0d27a 55%, #9c7522 80%, #e6c35f)", edge: "#7a5a17" },
  { outer: "linear-gradient(135deg, #f2f2f2, #a9adb3 40%, #e6e8eb 60%, #8f949b)", edge: "#6d7177" },
];
const GOLD = STYLES[4];

export const WallpaperLetters: React.FC = () => {
  const { width, height } = useVideoConfig();
  const portrait = height > width;
  const unit = Math.min(width, height) / 1080;
  const rand = random(929);

  // ── Pick the grid resolution that uses about one cell per game ───────
  const fewest = portrait ? 46 : 40;
  let traced = traceWords(fewest);
  let cols = fewest;
  for (let c = fewest; c <= (portrait ? 46 : 140); c += 2) {
    const attempt = traceWords(c);
    if (Math.abs(attempt.cells.length - GAMES.length) < Math.abs(traced.cells.length - GAMES.length)) {
      traced = attempt;
      cols = c;
    }
  }
  const logoCells = Math.round(traced.rows * (portrait ? 0.7 : 0.42));
  const logoGap = Math.round(traced.rows * 0.18);
  const rowsTotal = logoCells + logoGap + traced.rows;
  const pitch = Math.min((width * (portrait ? 0.94 : 0.84)) / cols, (height * (portrait ? 0.7 : 0.86)) / rowsTotal);
  const top = (height - rowsTotal * pitch) / 2;
  const left = (width - cols * pitch) / 2;
  const cells = traced.cells.map((cell) => ({ x: left + cell.col * pitch, y: top + (logoCells + logoGap + cell.row) * pitch }));

  const games = [...GAMES];
  for (let i = games.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [games[i], games[j]] = [games[j], games[i]];
  }

  const gap = pitch * 0.08;
  const frame = (key: React.Key, left: number, y: number, size: number, style: FrameStyle, tilt: number, picture: React.ReactNode, mat?: string) => (
    <div
      key={key}
      style={{
        position: "absolute",
        left,
        top: y,
        width: size,
        height: size,
        transform: `rotate(${tilt}deg)`,
        background: style.outer,
        border: `${Math.max(1, size * 0.008)}px solid ${style.edge}`,
        padding: size * (mat ? 0.07 : 0.085),
        boxSizing: "border-box",
        boxShadow: `${size * 0.02}px ${size * 0.06}px ${size * 0.09}px rgba(40,28,15,0.4), ${size * 0.005}px ${size * 0.015}px ${size * 0.02}px rgba(40,28,15,0.35)`,
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          padding: mat ? size * 0.1 : 0,
          boxSizing: "border-box",
          backgroundColor: mat ?? "transparent",
          boxShadow: `inset ${size * 0.008}px ${size * 0.012}px ${size * 0.02}px rgba(0,0,0,0.45)`,
        }}
      >
        {picture}
      </div>
    </div>
  );

  const logoSize = logoCells * pitch;
  const logoTop = top;
  const centreY = top + (rowsTotal * pitch) / 2;

  return (
    <AbsoluteFill style={{ backgroundColor: "#e9e2d6", fontFamily: FONT, overflow: "hidden" }}>
      {/* Plaster grain. */}
      <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
        <filter id="plaster">
          <feTurbulence type="fractalNoise" baseFrequency={0.9 / unit} numOctaves={3} seed={4} />
          <feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.38  0 0 0 0 0.3  0 0 0 0.22 0" />
        </filter>
        <rect width={width} height={height} filter="url(#plaster)" />
      </svg>
      {/* Gallery light: bright on the letters, soft shadow towards the corners. */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse ${portrait ? "80% 42%" : "55% 65%"} at 50% ${(centreY / height) * 100}%, rgba(255,240,212,0.55) 0%, rgba(255,240,212,0.12) 45%, rgba(25,16,8,0.22) 85%, rgba(20,12,6,0.4) 100%)`,
        }}
      />

      {cells.map((cell, i) => {
        const game = games[i % games.length];
        const size = pitch - gap;
        return frame(
          i,
          cell.x + gap / 2,
          cell.y + gap / 2,
          size,
          STYLES[Math.floor(rand() * STYLES.length)],
          (rand() - 0.5) * 3,
          <Img src={staticFile(`icons/${game.id}.png`)} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />,
        );
      })}

      {/* PixelPicked's own frame, above the words. */}
      {frame(
        "logo",
        (width - logoSize) / 2 + gap / 2,
        logoTop + gap / 2,
        logoSize - gap,
        GOLD,
        0,
        <Img src={staticFile("logo.svg")} style={{ width: "100%", height: "100%", display: "block" }} />,
        "#faf7f0",
      )}
    </AbsoluteFill>
  );
};
