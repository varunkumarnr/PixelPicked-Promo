import React from "react";
import { AbsoluteFill, Img, staticFile, useVideoConfig } from "remotion";
import { COLORS, FONT } from "./config";
import { GAMES } from "./timeline";

/** A repeatable shuffle, so the wallpaper looks the same every render. */
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
 * Every game's icon edge to edge (repeating a few to fill the corners), gently
 * dimmed, with the PixelPicked logo in the middle. `plain` is the find-the-game version:
 * every game exactly once at full brightness, no logo, spare cells left empty.
 */
export const Wallpaper: React.FC<{ plain?: boolean }> = ({ plain = false }) => {
  const { width, height } = useVideoConfig();
  const columns = Math.ceil(Math.sqrt((GAMES.length * width) / height));
  const pitch = width / columns;
  const rows = plain ? Math.ceil(GAMES.length / columns) : Math.ceil(height / pitch) + 1;
  const gap = pitch * 0.14;
  const size = pitch - gap;
  const offsetY = (height - rows * pitch) / 2;
  const icons = shuffled(GAMES, 1000);
  const unit = Math.min(width, height) / 1080;

  const cells: React.ReactNode[] = [];
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const index = row * columns + column;
      if (plain && index >= icons.length) continue;
      const game = icons[index % icons.length];
      cells.push(
        <Img
          key={index}
          src={staticFile(`icons/${game.id}.png`)}
          style={{
            position: "absolute",
            left: column * pitch + gap / 2,
            top: offsetY + row * pitch + gap / 2,
            width: size,
            height: size,
            borderRadius: size * 0.22,
          }}
        />,
      );
    }
  }

  if (plain) {
    return <AbsoluteFill style={{ backgroundColor: COLORS.background }}>{cells}</AbsoluteFill>;
  }

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.background, fontFamily: FONT }}>
      <AbsoluteFill style={{ opacity: 0.55 }}>{cells}</AbsoluteFill>
      {/* Darker towards the middle so the logo stands out, lighter at the edges. */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse ${width > height ? "38% 48%" : "70% 32%"} at 50% 50%, ${COLORS.background}f2 0%, ${COLORS.background}b3 45%, ${COLORS.background}33 100%)`,
        }}
      />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 34 * unit }}>
          <Img src={staticFile("logo.svg")} style={{ width: 150 * unit, height: 150 * unit }} />
          <div style={{ color: COLORS.text, fontSize: 112 * unit, fontWeight: 800, letterSpacing: -2.5 * unit }}>
            PixelPicked.
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
