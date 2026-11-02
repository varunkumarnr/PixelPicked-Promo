import React from "react";
import { AbsoluteFill, Img, staticFile, useVideoConfig } from "remotion";
import { COLORS, FONT } from "./config";
import { GAMES } from "./timeline";

/** A repeatable shuffle, so the header looks the same every render. */
function shuffled<T>(items: T[], seed: number): T[] {
  const result = [...items];
  let state = seed;
  for (let i = result.length - 1; i > 0; i--) {
    state = (state * 1664525 + 1013904223) % 4294967296;
    const j = state % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * X (Twitter) profile header, 3:1. A wall of every game's icon with the
 * player promise on top. X puts the profile picture over the bottom-left
 * corner and crops the top and bottom on phones, so the text sits in the
 * centre of the middle band.
 */
export const XHeader: React.FC = () => {
  const { width, height } = useVideoConfig();
  const unit = height / 1000;
  const rows = 7;
  const pitch = height / rows;
  const columns = Math.ceil(width / pitch) + 1;
  const gap = pitch * 0.14;
  const size = pitch - gap;
  const icons = shuffled(GAMES, 2026);

  const cells: React.ReactNode[] = [];
  for (let row = 0; row < rows; row++) {
    // Alternate rows shift by half a tile, like a brick wall.
    const shift = row % 2 === 0 ? 0 : -pitch / 2;
    for (let column = 0; column < columns; column++) {
      const index = row * columns + column;
      const game = icons[index % icons.length];
      cells.push(
        <Img
          key={index}
          src={staticFile(`icons/${game.id}.png`)}
          style={{
            position: "absolute",
            left: shift + column * pitch + gap / 2,
            top: row * pitch + gap / 2,
            width: size,
            height: size,
            borderRadius: size * 0.22,
          }}
        />,
      );
    }
  }

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.background, fontFamily: FONT }}>
      <AbsoluteFill style={{ opacity: 0.7 }}>{cells}</AbsoluteFill>
      {/* Dark band behind the words, icons stay bright at the edges. */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 42% 62% at 50% 50%, ${COLORS.background}f5 0%, ${COLORS.background}d9 55%, ${COLORS.background}40 100%)`,
        }}
      />
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
        }}
      >
        <div style={{ color: COLORS.text, fontSize: 104 * unit, fontWeight: 800, letterSpacing: -2.5 * unit, lineHeight: 1.05 }}>
          Doomscroll, but you&apos;re playing.
        </div>
        <div style={{ marginTop: 26 * unit, color: "rgba(255,255,255,0.75)", fontSize: 46 * unit, fontWeight: 600 }}>
          Right in your browser. No download.
        </div>
        <div
          style={{
            marginTop: 40 * unit,
            padding: `${16 * unit}px ${36 * unit}px`,
            borderRadius: 999,
            background: COLORS.text,
            color: COLORS.background,
            fontSize: 38 * unit,
            fontWeight: 800,
          }}
        >
          pixelpicked.com/play
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
