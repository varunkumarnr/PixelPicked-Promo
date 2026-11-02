import React from "react";
import { AbsoluteFill, Img, staticFile, useVideoConfig } from "remotion";
import { GAMES } from "./timeline";

/** Teenage Engineering-style palette: warm light grey, ink black, one orange. */
const TE = {
  shell: "#e3e2dc",
  panel: "#f2f1ec",
  ink: "#141414",
  faint: "rgba(20,20,20,0.45)",
  orange: "#ff5a1f",
};
const MONO = '"SF Mono", "JetBrains Mono", "IBM Plex Mono", Menlo, monospace';
const SANS = '"Helvetica Neue", "Inter", Arial, sans-serif';

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

/** Every 37th cell is a solid orange square instead of a game. */
const ORANGE_EVERY = 37;

/**
 * A technical, Teenage Engineering-inspired wallpaper: greyscale game icons on
 * a strict grid, a few orange cells, corner ticks, and a spec-plate label.
 */
export const WallpaperTE: React.FC = () => {
  const { width, height } = useVideoConfig();
  const unit = Math.min(width, height) / 1080;
  const margin = 64 * unit;
  const innerW = width - margin * 2;
  const innerH = height - margin * 2;
  const columns = Math.ceil(Math.sqrt((GAMES.length * innerW) / innerH));
  const pitch = innerW / columns;
  const rows = Math.floor(innerH / pitch);
  const gap = pitch * 0.22;
  const size = pitch - gap;
  const offsetY = margin + (innerH - rows * pitch) / 2;
  const icons = shuffled(GAMES, 2026);

  const cells: React.ReactNode[] = [];
  let used = 0;
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const index = row * columns + column;
      const left = margin + column * pitch + gap / 2;
      const top = offsetY + row * pitch + gap / 2;
      if (index % ORANGE_EVERY === 17) {
        cells.push(
          <div key={index} style={{ position: "absolute", left, top, width: size, height: size, borderRadius: size * 0.12, backgroundColor: TE.orange }} />,
        );
        continue;
      }
      const game = icons[used++ % icons.length];
      cells.push(
        <Img
          key={index}
          src={staticFile(`icons/${game.id}.png`)}
          style={{
            position: "absolute",
            left,
            top,
            width: size,
            height: size,
            borderRadius: size * 0.12,
            filter: "grayscale(1) contrast(1.08) brightness(1.04)",
            opacity: 0.88,
          }}
        />,
      );
    }
  }

  const label = (text: string, style: React.CSSProperties) => (
    <div style={{ position: "absolute", fontFamily: MONO, fontSize: 15 * unit, letterSpacing: 1.5 * unit, color: TE.faint, textTransform: "lowercase", ...style }}>
      {text}
    </div>
  );
  const tick = (style: React.CSSProperties) => (
    <div style={{ position: "absolute", width: 28 * unit, height: 28 * unit, borderColor: TE.ink, borderStyle: "solid", borderWidth: 0, ...style }} />
  );
  const t = 2 * unit;

  return (
    <AbsoluteFill style={{ backgroundColor: TE.shell }}>
      {cells}

      {/* Corner ticks and edge labels, like a technical drawing. */}
      {tick({ left: margin / 2, top: margin / 2, borderLeftWidth: t, borderTopWidth: t })}
      {tick({ right: margin / 2, top: margin / 2, borderRightWidth: t, borderTopWidth: t })}
      {tick({ left: margin / 2, bottom: margin / 2, borderLeftWidth: t, borderBottomWidth: t })}
      {tick({ right: margin / 2, bottom: margin / 2, borderRightWidth: t, borderBottomWidth: t })}
      {label("pp-1000 / game wall", { left: margin / 2 + 40 * unit, top: margin / 2 - 2 * unit })}
      {label(`${GAMES.length} units`, { right: margin / 2 + 40 * unit, top: margin / 2 - 2 * unit })}
      {label("pixelpicked.com", { left: margin / 2 + 40 * unit, bottom: margin / 2 - 2 * unit })}
      {label("rev. 2026", { right: margin / 2 + 40 * unit, bottom: margin / 2 - 2 * unit })}

      {/* The spec plate. */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div
          style={{
            backgroundColor: TE.panel,
            border: `${t}px solid ${TE.ink}`,
            borderRadius: 10 * unit,
            padding: `${34 * unit}px ${44 * unit}px ${30 * unit}px`,
            minWidth: 560 * unit,
            boxShadow: `${10 * unit}px ${10 * unit}px 0 ${TE.ink}`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 24 * unit }}>
            <div style={{ width: 96 * unit, height: 96 * unit, borderRadius: 18 * unit, backgroundColor: TE.ink, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Img src={staticFile("logo.svg")} style={{ width: 96 * unit, height: 96 * unit }} />
            </div>
            <div style={{ fontFamily: SANS, fontSize: 92 * unit, fontWeight: 700, letterSpacing: -3.5 * unit, color: TE.ink, lineHeight: 1 }}>
              pixelpicked<span style={{ color: TE.orange }}>.</span>
            </div>
          </div>
          <div style={{ height: t, backgroundColor: TE.ink, margin: `${26 * unit}px 0 ${18 * unit}px` }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: MONO, fontSize: 17 * unit, letterSpacing: 1.2 * unit, color: TE.ink, textTransform: "lowercase" }}>
            <span>{GAMES.length} mobile games</span>
            <span>play in browser</span>
            <span style={{ display: "flex", alignItems: "center", gap: 10 * unit }}>
              <span style={{ width: 14 * unit, height: 14 * unit, borderRadius: 999, backgroundColor: TE.orange, display: "inline-block" }} />
              live
            </span>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
