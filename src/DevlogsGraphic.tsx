import React from "react";
import { AbsoluteFill, Img, staticFile, useVideoConfig } from "remotion";
import { FONT } from "./config";

/**
 * Social graphic for passing 500 devlogs: real devlog titles from PixelPicked
 * fill the background, with the logo, "500+" and one line in front.
 */

/** Real devlog titles. The first few (the stories we shortlisted) are lit brighter. */
const TITLES: { text: string; lit?: boolean }[] = [
  { text: "I made a game solo in the hours around my newborn", lit: true },
  { text: "After 25 Years Making Games, AI Finally Let Me Build One on My Own", lit: true },
  { text: "From Zero Experience to My First iOS Game", lit: true },
  { text: "I finally released my first game", lit: true },
  { text: "13 years ago I started making a game", lit: true },
  { text: "I taught myself Unity and shipped my first game" },
  { text: "I thought the tutorial was fine. Then I watched someone play it." },
  { text: "A player told me my game punished you for playing it. He was right." },
  { text: "My death screen was lying to players" },
  { text: "I remade a game from my childhood phone" },
  { text: "What a local newspaper article did to my install numbers" },
  { text: "My game writes a new song every day and ships zero audio files" },
  { text: "Three bugs I still think about" },
  { text: "Going free permanently, and the hardest design call I've had to make" },
  { text: "Thank you. Graze won launch week." },
  { text: "Bringing an Indian Board Game to Mobile" },
  { text: "A Timeless Barbadian Strategy Game" },
  { text: "I made the game stop ending" },
  { text: "When a small game suddenly starts getting real traffic" },
  { text: "Your thumb was covering the game" },
  { text: "The obstacle looked impossible. So I searched every button press." },
  { text: "I made Le Barbu because I couldn't find the version I wanted to play" },
  { text: "Why I Redesigned My Game's Heat Meter From Scratch" },
  { text: "Building My First Mobile Game" },
  { text: "From the Stone Age to the Space Age" },
  { text: "Word Endings Make Terrible Beginnings" },
  { text: "From Ugly Shapes to a Real River" },
  { text: "Hello from a solo dev" },
  { text: "Finding Players Is Easy, Finding Paying Players Is Not" },
  { text: "Designing a calm puzzle game" },
];

function random(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

export const DevlogsGraphic: React.FC = () => {
  const { width, height } = useVideoConfig();
  const unit = width / 1080;
  const rand = random(502);

  // Rows of titles, each row slid sideways a little so the wall feels hand-set.
  const rowHeight = 50 * unit;
  const rows = Math.ceil(height / rowHeight) + 1;
  const order = [...TITLES.keys()];
  // Shortlisted stories go in rows around the middle third, where they'll be noticed.
  const litRows = new Set([3, 5, 14, 16, 18]);
  const plain = TITLES.filter((title) => !title.lit);
  const lit = TITLES.filter((title) => title.lit);
  let plainIndex = 0;
  let litIndex = 0;
  const lines = Array.from({ length: rows }, (_, row) => {
    const parts: { text: string; lit: boolean }[] = [];
    const isLit = litRows.has(row) && litIndex < lit.length;
    const first = isLit ? lit[litIndex++] : plain[plainIndex++ % plain.length];
    parts.push({ text: first.text, lit: isLit });
    for (let i = 0; i < 3; i++) parts.push({ text: plain[plainIndex++ % plain.length].text, lit: false });
    // Lit titles start inside the frame so they can be read whole.
    const offset = isLit ? (150 + rand() * 60) * unit : -rand() * 520 * unit;
    return { parts, offset, size: (26 + rand() * 6) * unit };
  });
  void order;

  return (
    <AbsoluteFill style={{ backgroundColor: "#080808", fontFamily: FONT, overflow: "hidden" }}>
      {/* The wall of devlog titles. */}
      <AbsoluteFill style={{ transform: "rotate(-6deg) scale(1.18)" }}>
        {lines.map((line, row) => (
          <div
            key={row}
            style={{
              position: "absolute",
              top: row * rowHeight - rowHeight,
              left: line.offset,
              whiteSpace: "nowrap",
              fontSize: line.size,
              fontWeight: 700,
              letterSpacing: -0.4 * unit,
            }}
          >
            {line.parts.map((part, i) => (
              <span
                key={i}
                style={{
                  color: part.lit ? "rgba(255,255,255,0.62)" : "rgba(255,255,255,0.13)",
                  marginRight: 46 * unit,
                }}
              >
                “{part.text}”
              </span>
            ))}
          </div>
        ))}
      </AbsoluteFill>

      {/* Darken the middle so the number reads; keep the titles alive at the edges. */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse 50% 42% at 50% 52%, rgba(8,8,8,0.99) 0%, rgba(8,8,8,0.96) 55%, rgba(8,8,8,0.4) 85%, rgba(8,8,8,0.12) 100%)",
        }}
      />

      {/* A soft fade at the bottom for the wordmark. */}
      <AbsoluteFill style={{ background: "linear-gradient(to top, rgba(8,8,8,0.95) 0%, rgba(8,8,8,0.6) 9%, transparent 18%)" }} />

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", textAlign: "center" }}>
        <Img src={staticFile("logo.svg")} style={{ width: 92 * unit, height: 92 * unit, marginBottom: 26 * unit }} />
        <div
          style={{
            color: "#fff",
            fontSize: 250 * unit,
            fontWeight: 900,
            letterSpacing: -12 * unit,
            lineHeight: 0.9,
          }}
        >
          500+
        </div>
        <div
          style={{
            color: "#fff",
            fontSize: 34 * unit,
            fontWeight: 900,
            letterSpacing: 10 * unit,
            marginTop: 18 * unit,
            paddingLeft: 10 * unit,
          }}
        >
          DEVLOGS
        </div>
        <div
          style={{
            color: "rgba(255,255,255,0.62)",
            fontSize: 27 * unit,
            fontWeight: 500,
            lineHeight: 1.4,
            maxWidth: 760 * unit,
            marginTop: 30 * unit,
          }}
        >
          Real developers sharing the story
          <br />
          behind every game they make.
        </div>
      </AbsoluteFill>

      <div
        style={{
          position: "absolute",
          bottom: 44 * unit,
          left: 0,
          right: 0,
          textAlign: "center",
          color: "rgba(255,255,255,0.75)",
          fontSize: 22 * unit,
          fontWeight: 800,
          letterSpacing: 1 * unit,
        }}
      >
        PixelPicked.
      </div>
    </AbsoluteFill>
  );
};
