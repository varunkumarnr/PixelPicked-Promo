import React from "react";
import { AbsoluteFill } from "remotion";

/**
 * YouTube thumbnail for the 1,000 games trailer: three mystery developers (silhouettes with a "?")
 * under spotlights, and the headline below.
 */

const FONT = '"Inter", "SF Pro Display", "Helvetica Neue", Arial, sans-serif';

/** A head-and-shoulders silhouette with a question mark, lit from behind in its own colour. */
const Mystery: React.FC<{ x: number; size: number; glow: string }> = ({ x, size, glow }) => (
  <div style={{ position: "absolute", left: x - size / 2, bottom: 430, width: size, height: size * 1.05 }}>
    <div
      style={{
        position: "absolute",
        inset: `${-size * 0.15}px`,
        background: `radial-gradient(circle at 50% 45%, ${glow}55 0%, ${glow}22 35%, transparent 65%)`,
      }}
    />
    <svg viewBox="0 0 200 210" width={size} height={size * 1.05} style={{ position: "absolute", inset: 0 }}>
      <defs>
        <linearGradient id={`body-${x}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2a2a30" />
          <stop offset="1" stopColor="#141417" />
        </linearGradient>
      </defs>
      {/* shoulders */}
      <path d="M20 210 C20 150 55 128 100 128 C145 128 180 150 180 210 Z" fill={`url(#body-${x})`} stroke={glow} strokeWidth="2.5" strokeOpacity="0.8" />
      {/* head */}
      <circle cx="100" cy="72" r="50" fill={`url(#body-${x})`} stroke={glow} strokeWidth="2.5" strokeOpacity="0.8" />
      <text x="100" y="98" textAnchor="middle" fontFamily={FONT} fontWeight="900" fontSize="74" fill="#ffffff">
        ?
      </text>
    </svg>
  </div>
);

export const YouTubeThumb: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#07070a", fontFamily: FONT, overflow: "hidden" }}>
    <AbsoluteFill style={{ background: "radial-gradient(ellipse 70% 60% at 50% 35%, #1b1b22 0%, #07070a 70%)" }} />

    <Mystery x={560} size={360} glow="#ff4d6d" />
    <Mystery x={1360} size={360} glow="#ff6ec7" />
    <Mystery x={960} size={430} glow="#4ade80" />

    <div style={{ position: "absolute", left: 0, right: 0, bottom: 120, textAlign: "center", color: "#fff" }}>
      <div style={{ fontSize: 84, fontWeight: 800, letterSpacing: -2, color: "rgba(255,255,255,0.8)" }}>The stories of the developers</div>
      <div style={{ fontSize: 118, fontWeight: 900, letterSpacing: -4, lineHeight: 1.05 }}>
        behind <span style={{ color: "#4ade80" }}>PixelPicked</span> games
      </div>
    </div>
  </AbsoluteFill>
);
