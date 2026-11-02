import React from "react";
import { AbsoluteFill, Img, staticFile, useVideoConfig } from "remotion";
import { FONT } from "./config";
import { GAMES } from "./timeline";

/**
 * Relativity-themed wallpaper: PixelPicked as the mass bending a grid of
 * spacetime into a gravity well, with every game's logo orbiting on the warped
 * fabric, trailing light as it turns.
 */

/** Repeatable random numbers, so every render is identical. */
function random(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

/** Depth of the gravity well at distance r from PixelPicked (world units; negative is down). */
const WELL_DEPTH = 4.6;
const WELL_RADIUS = 1.25;
const wellY = (r: number) => -WELL_DEPTH / Math.sqrt(1 + (r / WELL_RADIUS) ** 2);

type View = { cx: number; cy: number; scale: number; tilt: number; focal: number };

/** World point (x across, y up, z away) to screen, seen from above at an angle. */
function project(view: View, x: number, y: number, z: number) {
  const vy = y * Math.cos(view.tilt) + z * Math.sin(view.tilt);
  const depth = -y * Math.sin(view.tilt) + z * Math.cos(view.tilt);
  const perspective = view.focal / (view.focal + depth);
  return {
    x: view.cx + x * perspective * view.scale,
    y: view.cy - vy * perspective * view.scale,
    perspective,
    depth,
  };
}

const ICON_SPACING = 0.58;
const RING_GAP = 0.6;
const FIRST_RING = 2.4;
/** How far back along its orbit each icon's light trail reaches (radians at r = 1). */
const TRAIL = 0.55;

export const WallpaperSpace: React.FC = () => {
  const { width, height } = useVideoConfig();
  const portrait = height > width;
  const unit = Math.min(width, height) / 1080;
  const view: View = portrait
    ? { cx: width / 2, cy: height * 0.47, scale: width / 12, tilt: (52 * Math.PI) / 180, focal: 22 }
    : { cx: width / 2, cy: height * 0.54, scale: width / 21, tilt: (32 * Math.PI) / 180, focal: 24 };

  // ── Stars and nebula ──────────────────────────────────────────────────
  const rand = random(7);
  const starCount = Math.round((width * height) / 9000);
  const stars = Array.from({ length: starCount }, () => {
    // A faint diagonal "milky way" band gets extra stars.
    let x = rand() * width;
    let y = rand() * height;
    if (rand() < 0.35) {
      const t = rand();
      x = t * width;
      y = height * (0.15 + 0.5 * t) + (rand() - 0.5) * height * 0.18;
    }
    const big = rand() < 0.04;
    return { x, y, r: (big ? 1.8 : 0.5 + rand() * 0.9) * unit * 1.6, a: 0.25 + rand() * 0.75 };
  });

  // ── Spacetime grid ────────────────────────────────────────────────────
  const extent = 16;
  const step = 0.5;
  const sample = 0.12;
  const gridLines: { d: string; alpha: number }[] = [];
  for (let fixed = -extent; fixed <= extent + 1e-6; fixed += step) {
    for (const along of ["x", "z"] as const) {
      const points: string[] = [];
      for (let t = -extent; t <= extent + 1e-6; t += sample) {
        const x = along === "x" ? t : fixed;
        const z = along === "x" ? fixed : t;
        const p = project(view, x, wellY(Math.hypot(x, z)), z);
        points.push(`${p.x.toFixed(1)},${p.y.toFixed(1)}`);
      }
      // Lines fade towards the edges of the fabric.
      const alpha = Math.max(0.05, 0.42 - Math.abs(fixed) / (extent * 1.25));
      gridLines.push({ d: `M${points.join(" L")}`, alpha });
    }
  }

  // ── Orbits: every game, ring by ring ─────────────────────────────────
  const order = [...GAMES];
  const shuffle = random(42);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(shuffle() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  type Body = { id: string; x: number; y: number; size: number; angle: number; depth: number; fade: number; trail: string; trailWidth: number };
  const bodies: Body[] = [];
  let placed = 0;
  for (let ring = 0; placed < order.length; ring++) {
    const r = FIRST_RING + ring * RING_GAP;
    const count = Math.min(order.length - placed, Math.floor((2 * Math.PI * r) / ICON_SPACING));
    const phase = shuffle() * Math.PI * 2;
    for (let k = 0; k < count; k++) {
      const theta = phase + (k / count) * Math.PI * 2;
      const at = (a: number) => project(view, r * Math.cos(a), wellY(r), r * Math.sin(a));
      const p = at(theta);
      const ahead = at(theta + 0.02);
      // Light trail behind the icon (orbits run anticlockwise seen from above).
      const sweep = TRAIL / Math.sqrt(r);
      const trailPoints: string[] = [];
      for (let s = 0; s <= 10; s++) {
        const q = at(theta - sweep * (s / 10));
        trailPoints.push(`${q.x.toFixed(1)},${q.y.toFixed(1)}`);
      }
      bodies.push({
        id: order[placed].id,
        x: p.x,
        y: p.y,
        size: 0.3 * view.scale * p.perspective,
        angle: (Math.atan2(ahead.y - p.y, ahead.x - p.x) * 180) / Math.PI,
        depth: p.depth,
        fade: Math.min(1, Math.max(0.25, 1.15 - p.depth / 14)),
        trail: `M${trailPoints.join(" L")}`,
        trailWidth: 0.07 * view.scale * p.perspective,
      });
      placed++;
    }
  }
  // Far bodies first, so nearer ones pass in front.
  bodies.sort((a, b) => b.depth - a.depth);

  // ── PixelPicked, the mass at the centre ──────────────────────────────
  const core = project(view, 0, wellY(0) * 0.42, 0);
  const logoSize = 170 * unit;
  const ringRadius = logoSize * 0.95;

  return (
    <AbsoluteFill
      style={{
        background: "radial-gradient(ellipse 120% 90% at 50% 45%, #0d1433 0%, #070a1d 45%, #02030a 100%)",
        fontFamily: FONT,
        overflow: "hidden",
      }}
    >
      {/* Nebula glows. */}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 45% 35% at 18% 22%, rgba(122,76,255,0.22), transparent 70%)" }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 40% 30% at 85% 30%, rgba(0,190,255,0.14), transparent 70%)" }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 50% 30% at 70% 88%, rgba(255,90,170,0.10), transparent 70%)" }} />

      <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation={3 * unit} result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {stars.map((star, i) => (
          <circle key={i} cx={star.x} cy={star.y} r={star.r} fill="#fff" opacity={star.a} />
        ))}
        <g filter="url(#glow)">
          {gridLines.map((line, i) => (
            <path key={i} d={line.d} fill="none" stroke={`rgba(120,175,255,${line.alpha})`} strokeWidth={1.4 * unit} />
          ))}
        </g>
        {bodies.map((body, i) => (
          <path
            key={i}
            d={body.trail}
            fill="none"
            stroke={`rgba(170,205,255,${0.22 * body.fade})`}
            strokeWidth={body.trailWidth}
            strokeLinecap="round"
          />
        ))}
      </svg>

      {/* The logos, turned along their orbits and laid back into the fabric. */}
      {bodies.map((body, i) => (
        <Img
          key={i}
          src={staticFile(`icons/${body.id}.png`)}
          style={{
            position: "absolute",
            left: body.x - body.size / 2,
            top: body.y - body.size / 2,
            width: body.size,
            height: body.size,
            borderRadius: body.size * 0.22,
            opacity: body.fade,
            transform: `rotate(${body.angle}deg) scaleY(${portrait ? 0.82 : 0.72})`,
            boxShadow: `0 0 ${body.size * 0.35}px rgba(120,170,255,${0.35 * body.fade})`,
          }}
        />
      ))}

      {/* Light bent around the mass: glow and an Einstein ring. */}
      <div
        style={{
          position: "absolute",
          left: core.x - ringRadius * 2,
          top: core.y - ringRadius * 2,
          width: ringRadius * 4,
          height: ringRadius * 4,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,255,255,0.55) 0%, rgba(160,200,255,0.28) 18%, rgba(90,120,255,0.10) 38%, transparent 62%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: core.x - ringRadius,
          top: core.y - ringRadius * Math.sin(view.tilt) - ringRadius * 0.05,
          width: ringRadius * 2,
          height: ringRadius * 2 * Math.sin(view.tilt) + ringRadius * 0.1,
          borderRadius: "50%",
          border: `${3 * unit}px solid rgba(190,225,255,0.85)`,
          boxShadow: `0 0 ${30 * unit}px rgba(140,200,255,0.9), inset 0 0 ${30 * unit}px rgba(140,200,255,0.6)`,
        }}
      />
      <Img
        src={staticFile("logo.svg")}
        style={{
          position: "absolute",
          left: core.x - logoSize / 2,
          top: core.y - logoSize / 2,
          width: logoSize,
          height: logoSize,
          filter: `drop-shadow(0 0 ${40 * unit}px rgba(170,210,255,0.95))`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          // Phones: under the logo (the top is under the lock-screen clock). PCs: up in the open sky.
          top: portrait ? core.y + logoSize * 0.62 + 70 * unit : height * 0.09,
          textAlign: "center",
          color: "#fff",
          fontSize: (portrait ? 84 : 96) * unit,
          fontWeight: 800,
          letterSpacing: -2 * unit,
          textShadow: `0 0 ${30 * unit}px rgba(140,190,255,0.9), 0 ${4 * unit}px ${24 * unit}px rgba(0,0,0,0.8)`,
        }}
      >
        PixelPicked.
      </div>
    </AbsoluteFill>
  );
};
