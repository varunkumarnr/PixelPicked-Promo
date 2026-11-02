import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";

/**
 * "What are you building?" post for indie devs: copy on the left, a tilted wall of real PixelPicked
 * game icons on the right (public/devcall/, the 64 most colourful), with one empty "your game" slot.
 */

const FONT = '"Inter", "SF Pro Display", "Helvetica Neue", Arial, sans-serif';
const ICONS = 64;
const TILE = 168;
const GAP = 24;
const COLS = 9;
const ROWS = 10;
/** Where the empty slot sits in the grid. */
const SLOT = { col: 4, row: 4 };

const Tile: React.FC<{ index: number }> = ({ index }) => (
  <Img
    src={staticFile(`devcall/${String(index % ICONS).padStart(2, "0")}.png`)}
    style={{ width: TILE, height: TILE, borderRadius: TILE * 0.22, objectFit: "cover", boxShadow: "0 12px 30px rgba(0,0,0,0.45)" }}
  />
);

const YourGame: React.FC = () => (
  <div
    style={{
      width: TILE,
      height: TILE,
      borderRadius: TILE * 0.22,
      border: "5px dashed #4ade80",
      background: "rgba(74,222,128,0.06)",
      boxShadow: "0 0 50px rgba(74,222,128,0.45)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      color: "#4ade80",
      fontFamily: FONT,
      fontWeight: 800,
      textAlign: "center",
      lineHeight: 1.05,
    }}
  >
    <div style={{ fontSize: 46, fontWeight: 400, marginBottom: 6 }}>+</div>
    <div style={{ fontSize: 26, letterSpacing: 1 }}>YOUR</div>
    <div style={{ fontSize: 26, letterSpacing: 1 }}>GAME</div>
  </div>
);

const Pill: React.FC<{ text: string }> = ({ text }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 18,
      padding: "18px 32px",
      borderRadius: 999,
      background: "#141416",
      border: "1px solid #26262b",
      color: "#fff",
      fontSize: 30,
      fontWeight: 600,
    }}
  >
    <div style={{ width: 20, height: 20, borderRadius: 10, background: "#4ade80" }} />
    {text}
  </div>
);

export const DevCallGraphic: React.FC = () => {
  let n = 0;
  return (
    <AbsoluteFill style={{ backgroundColor: "#080809", fontFamily: FONT, overflow: "hidden" }}>
      {/* The tilted icon wall. */}
      <div
        style={{
          position: "absolute",
          left: 760,
          top: -360,
          display: "grid",
          gridTemplateColumns: `repeat(${COLS}, ${TILE}px)`,
          gap: GAP,
          transform: "rotate(-14deg)",
          transformOrigin: "0 0",
        }}
      >
        {Array.from({ length: COLS * ROWS }, (_, i) => {
          const col = i % COLS;
          const row = Math.floor(i / COLS);
          return <div key={i}>{col === SLOT.col && row === SLOT.row ? <YourGame /> : <Tile index={n++} />}</div>;
        })}
      </div>
      {/* Fade the wall into black behind the copy. */}
      <AbsoluteFill style={{ background: "linear-gradient(90deg, #080809 0%, #080809 46%, rgba(8,8,9,0.82) 54%, rgba(8,8,9,0.3) 62%, rgba(8,8,9,0) 70%)" }} />

      <div style={{ position: "absolute", left: 120, top: 150 }}>
        <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: 9, color: "#8a8a92" }}>#INDIEDEV &nbsp;·&nbsp; #GAMEDEV</div>
        <div style={{ marginTop: 34, fontSize: 132, fontWeight: 900, letterSpacing: -5, lineHeight: 1, color: "#fff" }}>What are you</div>
        <div style={{ fontSize: 132, fontWeight: 900, letterSpacing: -5, lineHeight: 1.05, color: "#8a8a92" }}>building?</div>
        <div style={{ marginTop: 50, fontSize: 40, lineHeight: 1.4, color: "#c9c9cf", maxWidth: 720 }}>
          Drop your game below and get it in front of <b style={{ color: "#fff" }}>real players</b> on PixelPicked.
        </div>
        <div style={{ display: "flex", gap: 20, marginTop: 56 }}>
          <Pill text="50,000+ players" />
          <Pill text="Human-reviewed" />
          <Pill text="Free to submit" />
        </div>
      </div>

      <div style={{ position: "absolute", left: 120, bottom: 88, display: "flex", alignItems: "center", gap: 24 }}>
        <Img src={staticFile("logo.svg")} style={{ width: 100, height: 100 }} />
        <div>
          <div style={{ fontSize: 48, fontWeight: 900, color: "#fff", letterSpacing: -1 }}>PixelPicked.</div>
          <div style={{ fontSize: 28, color: "#8a8a92", marginTop: 2 }}>pixelpicked.com</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
