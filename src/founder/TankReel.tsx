import React, { useMemo } from "react";
import { AbsoluteFill, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { EXPR } from "../siblings/Chibi";
import { shakeCam } from "../siblings/Cast";
import { Cam, Stage, lerpCam } from "../siblings/Stage";
import { Bot, Face } from "./Court";
import { BLACK_FONT, Flash, PAPER, Stamp, closeUp, ease, pop, slam } from "./CourtReel";
import { BOTH_OPEN, Founder, GESTURE, HANDS_DOWN, PaperTitle } from "./Studio";
import { TankSound } from "./TankSound";
import tankWords from "./data/tank-words.json";
import { BARBARA, CUBAN, DAYMOND, DoorSet, Floor, IconBubble, LORI, Lights, MachineSet, PanelSet, SHARKS, SHARK_SCALE, ShredSharkSet, StageSet, Vec3, WONDERFUL, WindowWall, chair } from "./TankSets";

/**
 * "I pitched my startup to 5 AI sharks": about 40 seconds, fast, with something moving in every
 * shot. It opens on a giant paper shark already tearing into the $1M PixelPicked card, the AIs
 * who love every idea grow fins and flip to NO, the founder walks in and pitches with real
 * PixelPicked gameplay swiping on a phone, then a close-up per shark as each one goes out or in:
 * AI Lori out, AI Mr. Wonderful in with a royalty forever, AI Cuban, AI Barbara and AI Daymond in.
 * Four offers, one catch, and a COMMENT TANK burst. The hook stays on screen the whole way.
 *
 * The sharks are AI impressions judging the pitch on its potential; their offers and lines are
 * the real ones from that run (Nov 2026). Timed to the voice take: every cut, stamp and caption is
 * placed from the transcribed words.
 */

export const FPS = 30;
const norm = (w: string) => w.toLowerCase().replace(/[^a-z0-9]/g, "");
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

type Word = { start: number; end: number; word: string; beat: number };

/** The first word of each line in the take, found in order, so every word knows its line. */
const BEAT_STARTS = ["five", "normal", "so", "pixel", "swipe", "one", "ai", "ai", "ai", "ai", "ai", "four", "want"];

/** Words the transcription gets wrong, fixed for the captions. */
const FIXES: Record<string, string> = { damon: "Daymond", tank: "TANK" };

/** The voice take's words with start and end times, from transcribing it, each tagged with its line. */
const WORDS: Word[] = (() => {
  const raw = (tankWords as [number, number, string][])
    .map(([start, end, word]) => ({ start, end, word }))
    // the take says "Pixel picked": put the brand back together
    .reduce<{ start: number; end: number; word: string }[]>((out, w) => {
      const prev = out[out.length - 1];
      if (prev && norm(prev.word) === "pixel" && norm(w.word).startsWith("picked")) prev.word = "PixelPicked" + w.word.slice(6), (prev.end = w.end);
      else out.push({ ...w, word: FIXES[norm(w.word)] ? FIXES[norm(w.word)] + w.word.replace(/^[A-Za-z]+/, "") : w.word });
      return out;
    }, []);
  const starts: number[] = [];
  let from = 0;
  for (const b of BEAT_STARTS) {
    const i = raw.findIndex((w, k) => k >= from && norm(w.word).startsWith(b));
    starts.push(i);
    from = i + 1;
  }
  return raw.map((w, i) => ({ ...w, beat: starts.filter((s) => s <= i).length - 1 }));
})();

const beatAt = (b: number) => (b === 0 ? 0 : WORDS.find((w) => w.beat === b)!.start - 0.08);
/** When a word is first spoken in beat `b`. */
const said = (b: number, w: string) => WORDS.find((x) => x.beat === b && norm(x.word).startsWith(norm(w)))!.start;

export const T = {
  yes: beatAt(1),
  tank: said(2, "tank"),
  door: beatAt(3),
  swipe: beatAt(4),
  ask: beatAt(5),
  panel: beatAt(6),
  lori: beatAt(6) + 0.55,
  loriOut: said(6, "out"),
  wonderful: beatAt(7),
  wonderfulIn: said(7, "in"),
  royalties: said(7, "royalties"),
  forever: said(7, "forever"),
  cuban: beatAt(8),
  cubanIn: said(8, "in"),
  barbara: beatAt(9),
  barbaraIn: said(9, "in"),
  daymond: beatAt(10),
  daymondIn: said(10, "in"),
  offers: beatAt(11),
  ship: said(11, "ship"),
  cta: beatAt(12),
  freeSkill: said(12, "idea"),
  ask2: said(12, "comment"),
  total: WORDS[WORDS.length - 1].end + 0.9,
};
export const TANK_REEL_DURATION = Math.round(T.total * FPS);

// ── the shots ────────────────────────────────────────────────────────────────

type ShotId = "shred" | "yes" | "door" | "phone" | "ask" | "panel" | "lori" | "wonderful" | "machine" | "cuban" | "barbara" | "daymond" | "offers" | "cta";

/** Which little set we're on, and the small tag under the hook. */
const SHOTS: { id: ShotId; at: () => number; tag: string }[] = [
  { id: "shred", at: () => 0, tag: "SHARK TANK, BUT AI" },
  { id: "yes", at: () => T.yes, tag: "AI SAYS YES TO EVERYTHING" },
  { id: "door", at: () => T.door, tag: "PITCH IT LIKE IT'S ON TV" },
  { id: "phone", at: () => T.swipe, tag: "REAL GAMES. NO INSTALL." },
  { id: "ask", at: () => T.ask, tag: "THE ASK" },
  { id: "panel", at: () => T.panel, tag: "5 AI SHARKS" },
  { id: "lori", at: () => T.lori, tag: "HERO OR ZERO?" },
  { id: "wonderful", at: () => T.wonderful, tag: "HIS ONLY DEAL: A ROYALTY" },
  { id: "machine", at: () => T.royalties, tag: "HIS ROYALTY NEVER ENDS" },
  { id: "cuban", at: () => T.cuban, tag: "SHARK #2: IN" },
  { id: "barbara", at: () => T.barbara, tag: "SHARK #3: IN" },
  { id: "daymond", at: () => T.daymond, tag: "SHARK #4: IN" },
  { id: "offers", at: () => T.offers, tag: "EVERY OFFER HAD A CATCH" },
  { id: "cta", at: () => T.cta, tag: "IT'S FREE: COMMENT TANK" },
];
const shotAt = (t: number) => {
  let k = 0;
  for (let i = 0; i < SHOTS.length; i++) if (t >= SHOTS[i].at()) k = i;
  return { ...SHOTS[k], index: k, from: SHOTS[k].at(), to: SHOTS[k + 1]?.at() ?? T.total };
};

/** When each shark says in or out, and the close-up they get. */
const VERDICT: { seat: number; at: () => number; shot: ShotId; lower: string }[] = [
  { seat: LORI, at: () => T.loriOut, shot: "lori", lower: "AI Lori: “could be a hero… but I'm out”" },
  { seat: WONDERFUL, at: () => T.wonderfulIn, shot: "wonderful", lower: "AI Mr. Wonderful: $1M for 10% + a royalty forever" },
  { seat: CUBAN, at: () => T.cubanIn, shot: "cuban", lower: "AI Cuban: $1M for 20%, once you ship" },
  { seat: BARBARA, at: () => T.barbaraIn, shot: "barbara", lower: "AI Barbara: $1M for 20% + a sales co-founder" },
  { seat: DAYMOND, at: () => T.daymondIn, shot: "daymond", lower: "AI Daymond: $1M for 25% + a creator program" },
];
const verdictAt = (seat: number) => VERDICT.find((v) => v.seat === seat)!.at();
const spawnAt = (i: number) => T.panel + 0.05 + i * 0.08;
const offerAt = (i: number) => T.offers + 0.15 + i * 0.18;

// ── overlays ─────────────────────────────────────────────────────────────────

const RED = "#d61f2c";
const GREEN = "#1f9e5c";

/** The small tag under the hook, changing with each shot. */
const SectionTag: React.FC<{ text: string; at: number; t: number }> = ({ text, at, t }) => {
  const k = interpolate(t - at, [0, 0.1, 0.18], [0.6, 1.08, 1], clamp);
  return (
    <div style={{ position: "absolute", top: 470, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
      <div style={{ transform: `scale(${k}) rotate(1.5deg)`, background: "#16141a", color: PAPER, fontFamily: BLACK_FONT, fontSize: 36, letterSpacing: 3, padding: "10px 24px", borderRadius: 10, boxShadow: "0 10px 24px rgba(0,0,0,0.4)" }}>{text}</div>
    </div>
  );
};

/** A news-style lower third: a blue box of white capitals, sliding in from the left. */
const LowerThird: React.FC<{ text: string; at: number; t: number }> = ({ text, at, t }) => {
  if (t < at) return null;
  const x = interpolate(t - at, [0, 0.16], [-900, 0], { ...clamp, easing: ease });
  return (
    <div style={{ position: "absolute", top: 1190, left: 40, transform: `translateX(${x}px)`, maxWidth: 780 }}>
      <div style={{ background: "#1d4ed8", color: "#fff", fontFamily: '"Impact", "Arial Narrow Bold", sans-serif', fontSize: 62, lineHeight: 1.02, padding: "14px 26px", textTransform: "uppercase", boxShadow: "0 12px 30px rgba(0,0,0,0.5)", borderLeft: "12px solid #ffd84a" }}>{text}</div>
    </div>
  );
};

/** Captions a word or two at a time on little paper tiles. */
const TileCaptions: React.FC<{ t: number }> = ({ t }) => {
  const groups = useMemo(() => {
    const out: { at: number; words: string[] }[] = [];
    let g: Word[] = [];
    const flush = () => {
      if (g.length) out.push({ at: g[0].start - 0.03, words: g.map((w) => w.word.replace(/[,.!?:…"]+$/, "").replace(/^"/, "")) });
      g = [];
    };
    for (const w of WORDS) {
      g.push(w);
      if (g.length >= 2 || /[,.!?:…]"?$/.test(w.word)) flush();
    }
    flush();
    return out;
  }, []);
  const now = groups.filter((g) => t >= g.at);
  if (!now.length) return null;
  const { at, words } = now[now.length - 1];
  return (
    <div style={{ position: "absolute", top: 1400, left: 60, right: 60, display: "flex", justifyContent: "center", gap: 14 }}>
      {words.map((w, i) => {
        const k = interpolate(t - at - i * 0.05, [0, 0.05, 0.1], [0.5, 1.1, 1], clamp);
        return (
          <div key={i} style={{ transform: `rotate(${[-3, 2.5, -1.5][i % 3]}deg) scale(${k})`, background: "#f3ead2", color: "#7a3a1c", fontFamily: 'Georgia, "Times New Roman", serif', fontWeight: 900, fontSize: 80, padding: "4px 20px 10px", boxShadow: "0 8px 18px rgba(0,0,0,0.45)" }}>
            {w}
          </div>
        );
      })}
    </div>
  );
};

/** Real PixelPicked gameplay on a phone, swiping up to the next game every so often. */
const CLIPS = ["orbitglide", "stackpack", "mochi", "island"];
const SWIPE_EVERY = 0.62;
const GamePhone: React.FC<{ t: number; from: number; to: number }> = ({ t, from, to }) => {
  if (t < from || t >= to) return null;
  const local = t - from;
  const rise = interpolate(local, [0, 0.22], [900, 0], { ...clamp, easing: ease });
  const n = Math.floor(local / SWIPE_EVERY);
  const into = local - n * SWIPE_EVERY;
  const swipe = interpolate(into, [SWIPE_EVERY - 0.16, SWIPE_EVERY], [0, 1], { ...clamp, easing: ease });
  const W = 400;
  const H = 866;
  return (
    <div style={{ position: "absolute", top: 560, left: 560, transform: `translateY(${rise}px) rotate(${3 + Math.sin(local * 2) * 1.5}deg) scale(0.86)`, transformOrigin: "top left" }}>
      <div style={{ position: "relative", width: W + 28, height: H + 28, background: "#0c0c10", borderRadius: 56, padding: 14, boxShadow: "0 30px 70px rgba(0,0,0,0.6)" }}>
        <div style={{ position: "relative", width: W, height: H, borderRadius: 44, overflow: "hidden", background: "#000" }}>
          {[n, n + 1].map((k, j) => (
            <div key={k} style={{ position: "absolute", inset: 0, transform: `translateY(${(j - swipe) * 100}%)` }}>
              <Sequence from={Math.round((from + k * SWIPE_EVERY - 0.2) * FPS)} layout="none">
                <OffthreadVideo src={staticFile(`clips/ad/${CLIPS[k % CLIPS.length]}.mp4`)} startFrom={30 + k * 45} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </Sequence>
            </div>
          ))}
          <div style={{ position: "absolute", top: 22, left: 0, right: 0, textAlign: "center", fontFamily: BLACK_FONT, fontSize: 26, color: "#fff", textShadow: "0 2px 8px rgba(0,0,0,0.6)", letterSpacing: 2 }}>PIXELPICKED</div>
        </div>
        {/* a thumb flicking up on each swipe */}
        <div style={{ position: "absolute", right: -30, top: 560 - swipe * 260, fontSize: 120, opacity: into > SWIPE_EVERY - 0.3 ? 1 : 0, transform: "rotate(-15deg)" }}>👆</div>
      </div>
    </div>
  );
};

/** The big comic burst at the end: COMMENT TANK, with speed lines. */
const CommentBurst: React.FC<{ t: number }> = ({ t }) => {
  if (t < T.ask2) return null;
  const k = slam(t, T.ask2);
  const spin = (t - T.ask2) * 20;
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: 0.55 }}>
        {Array.from({ length: 28 }, (_, i) => {
          const a = ((i * 360) / 28 + spin) * (Math.PI / 180);
          const r0 = 420 + (i % 3) * 60;
          return <line key={i} x1={540 + Math.cos(a) * r0} y1={720 + Math.sin(a) * r0} x2={540 + Math.cos(a) * 1200} y2={720 + Math.sin(a) * 1200} stroke="#fbf8f1" strokeWidth={i % 2 ? 6 : 12} strokeLinecap="round" />;
        })}
      </svg>
      <div style={{ position: "absolute", top: 540, left: 220, transform: `scale(${0.85 * k}) rotate(-4deg)`, background: "#fbf8f1", borderRadius: "50%", width: 640, height: 360, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", boxShadow: "0 24px 60px rgba(0,0,0,0.55)", border: "10px solid #16141a" }}>
        <div style={{ fontFamily: BLACK_FONT, fontSize: 52, color: "#16141a", letterSpacing: 4 }}>COMMENT</div>
        <div style={{ fontFamily: BLACK_FONT, fontSize: 150, color: RED, lineHeight: 1 }}>TANK</div>
      </div>
    </div>
  );
};


// ── cameras ──────────────────────────────────────────────────────────────────

const PANEL: Cam = { pos: [0, 2.3, 5.4], look: [0, 1.15, -1.6], fov: 62 };

function sharkShot(i: number, k: number, side: number): Cam {
  const c = chair(i);
  const cam = closeUp(c.head, c.facing, k, side, 2.7, 2.2);
  return { ...cam, look: [cam.look[0], cam.look[1] + 0.12, cam.look[2]] as Vec3 };
}

function camFor(id: ShotId, k: number): Cam {
  switch (id) {
    case "shred":
      return lerpCam({ pos: [-0.3, 1.3, 4.6], look: [-0.1, 1.45, -0.1], fov: 54 }, { pos: [0.3, 1.25, 5.8], look: [0, 1.55, -0.2], fov: 54 }, ease(k));
    case "yes":
      return lerpCam({ pos: [0, 1.5, 4.8], look: [0, 1.2, 0], fov: 50 }, { pos: [0, 1.4, 3.6], look: [0, 1.3, 0], fov: 50 }, k);
    case "door":
      return lerpCam({ pos: [0, 1.6, 4.6], look: [0, 1.9, -1.1], fov: 46 }, { pos: [0, 1.55, 3.6], look: [0, 1.8, -1.1], fov: 46 }, k);
    case "phone":
      return lerpCam({ pos: [-1.5, 2.0, 4.6], look: [0, 1.2, -1], fov: 56 }, { pos: [1.5, 2.0, 4.6], look: [0, 1.2, -1], fov: 56 }, k);
    case "ask":
      return lerpCam({ pos: [0.5, 1.5, 5.8], look: [0.15, 1.15, 0.6], fov: 50 }, { pos: [0.3, 1.45, 5.1], look: [0.15, 1.2, 0.6], fov: 50 }, ease(k));
    case "panel":
      return lerpCam({ ...PANEL, pos: [0, 2.6, 6.4] }, PANEL, ease(k));
    case "lori":
      return sharkShot(LORI, k, 0.3);
    case "wonderful":
      return sharkShot(WONDERFUL, k, -0.3);
    case "machine":
      return lerpCam({ pos: [0.4, 1.8, 7.2], look: [0.35, 0.95, 0], fov: 52 }, { pos: [0.45, 1.75, 6.6], look: [0.4, 0.95, 0], fov: 52 }, k);
    case "cuban":
      return sharkShot(CUBAN, k, 0.3);
    case "barbara":
      return sharkShot(BARBARA, k, -0.3);
    case "daymond":
      return sharkShot(DAYMOND, k, -0.3);
    case "offers":
      return lerpCam({ ...PANEL, pos: [0, 2.2, 5.0] }, { ...PANEL, pos: [0, 2.1, 4.5] }, k);
    case "cta":
      return lerpCam(PANEL, { ...PANEL, pos: [0, 2.5, 6.0] }, ease(k));
  }
}

// ── the reel ─────────────────────────────────────────────────────────────────

const talk = (f: number, a: Face, b: Face = "talk", every = 4) => (Math.floor(f / every) % 2 ? b : a);
const SHARK_SHOTS: ShotId[] = ["panel", "lori", "wonderful", "cuban", "barbara", "daymond", "offers", "cta"];
const CLOSE_UPS: Record<string, number> = { lori: LORI, wonderful: WONDERFUL, cuban: CUBAN, barbara: BARBARA, daymond: DAYMOND };

export const TankReel: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const shot = shotAt(t);
  const k = Math.min(1, (t - shot.from) / Math.max(0.1, shot.to - shot.from));

  // the sharks: whoever's in close-up talks until their verdict, then reacts
  const out = (i: number) => i === LORI && t >= T.loriOut;
  const isIn = (i: number) => i !== LORI && t >= verdictAt(i);
  const speaking = (i: number) => CLOSE_UPS[shot.id] === i && t < verdictAt(i);
  const sharkFace = (i: number): Face => {
    if (t >= T.cta) return "happy";
    if (out(i)) return t < T.loriOut + 0.6 ? "flat" : "flat";
    if (isIn(i)) return "happy";
    if (speaking(i)) return talk(f, "smug");
    return t < T.lori ? "smug" : "flat";
  };
  const dim = (i: number) => (i === LORI && t < T.cta ? interpolate(t, [T.loriOut + 0.6, T.loriOut + 0.9], [0, 1], clamp) : 0);
  const offerIdx = (i: number) => SHARKS.filter((s) => s.offer).indexOf(SHARKS[i]);
  const card = (i: number): { raise: number; text?: string; ink?: string } => {
    if (t >= T.cta) return { raise: interpolate(t, [T.cta + 0.2 + i * 0.08, T.cta + 0.4 + i * 0.08], [0, 0.95], clamp), text: "FREE", ink: GREEN };
    if (out(i)) return { raise: interpolate(t, [T.loriOut, T.loriOut + 0.16], [0, 0.95], clamp), text: "I'M OUT", ink: RED };
    if (SHARKS[i].offer && t >= T.offers) {
      const a = offerAt(offerIdx(i));
      return { raise: interpolate(t, [a, a + 0.18], [0, 0.95], clamp), text: SHARKS[i].offer, ink: GREEN };
    }
    if (isIn(i)) return { raise: interpolate(t, [verdictAt(i), verdictAt(i) + 0.16], [0, 0.95], clamp), text: "I'M IN", ink: GREEN };
    return { raise: 0 };
  };
  const bob = (i: number) => (speaking(i) ? Math.abs(Math.sin(t * 9)) * 0.03 : isIn(i) && t < T.offers ? Math.abs(Math.sin(t * 6 + i)) * 0.04 : Math.sin(t * 2 + i) * 0.01);

  let cam = camFor(shot.id, k);
  // a touch of handheld drift on every shot
  cam = { ...cam, pos: [cam.pos[0] + Math.sin(t * 1.3) * 0.03, cam.pos[1] + Math.sin(t * 1.7) * 0.02, cam.pos[2]] };
  for (const at of [T.tank, T.loriOut, T.wonderfulIn, T.forever, T.cubanIn, T.barbaraIn, T.daymondIn, T.ship, T.ask2]) if (t >= at && t < at + 0.22) cam = shakeCam(cam, f, 0.03 * (1 - (t - at) / 0.22));
  if (shot.id === "shred") cam = shakeCam(cam, f, 0.012);

  const finned = t >= T.tank;
  const target: Vec3 = SHARK_SHOTS.includes(shot.id) ? [0, 1.1, -1.6] : shot.id === "shred" ? [0, 1.5, 0] : [0, 1.3, 0];
  const verdict = VERDICT.find((v) => v.shot === shot.id);

  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Stage cam={cam} post={{ frame: f, style: "film", focus: Math.hypot(cam.pos[0] - cam.look[0], cam.pos[1] - cam.look[1], cam.pos[2] - cam.look[2]), aperture: 0.02, maxBlur: 0.014, vignette: 0.55, grain: 0.05 }} env={0.2} fill={0.45} exposure={1.05}>
        <Lights target={target} />
        {shot.id === "shred" && <ShredSharkSet t={t} />}
        {shot.id === "yes" && (
          <>
            <fog attach="fog" args={["#0d0a14", 8, 18]} />
            <Floor />
            <WindowWall z={-4.4} />
            {[-2, -1, 0, 1, 2].map((x, i) => (
              <Bot
                key={i}
                p={[x * 0.85, Math.abs(Math.sin(t * 7 + i)) * (finned ? 0 : 0.08), -0.3 - Math.abs(x) * 0.25]}
                rotY={-x * 0.12}
                color={SHARKS[i].color}
                face={finned ? "angry" : "yes"}
                tie={SHARKS[i].tie}
                scale={0.8}
                fin={finned}
                raise={0.95}
                card={finned ? "NO" : "GREAT\nIDEA!"}
                cardInk={finned ? RED : GREEN}
              />
            ))}
          </>
        )}
        {shot.id === "door" && (
          <>
            <DoorSet />
            <Founder f={f} arms={GESTURE} face={{ ...EXPR.smug }} p={[0, Math.abs(Math.sin(t * 9)) * 0.03, interpolate(t, [T.door, T.swipe], [-1.3, 0.8], clamp)]} rotY={0} talking />
          </>
        )}
        {shot.id === "phone" && (
          <>
            <fog attach="fog" args={["#0d0a14", 8, 18]} />
            <Floor />
            <WindowWall z={-4.4} />
            <Founder f={f} arms={GESTURE} face={{ ...EXPR.smug, smile: 0.6 }} p={[-0.75, 0, 0.6]} rotY={0.35} talking />
          </>
        )}
        {shot.id === "ask" && (
          <>
            <StageSet drop={interpolate(t, [T.ask, T.ask + 0.35], [0, 1], { ...clamp, easing: (x) => 1 - Math.pow(1 - x, 3) })} />
            <Founder f={f} arms={GESTURE} face={{ ...EXPR.smug }} p={[0.62, 0, 1.25]} rotY={-0.45} talking />
          </>
        )}
        {shot.id === "machine" && <MachineSet t={t} />}
        {(shot.id === "panel" || shot.id === "cta") && (
          <Founder
            f={f}
            arms={shot.id === "cta" ? GESTURE : HANDS_DOWN}
            face={shot.id === "cta" ? { ...EXPR.smug, smile: 0.6 } : { ...EXPR.neutral }}
            p={[0.15, 0, 1.9]}
            rotY={shot.id === "cta" ? 0.1 : Math.PI + 0.1}
            talking={shot.id === "cta"}
          />
        )}
        {SHARK_SHOTS.includes(shot.id) && (
          <>
            <PanelSet />
            {SHARKS.map((s, i) => {
              const sk = pop(t, spawnAt(i));
              if (sk <= 0) return null;
              const c = chair(i);
              const cd = card(i);
              return (
                <React.Fragment key={i}>
                  <Bot p={[c.p[0], bob(i), c.p[2]]} rotY={c.rotY} color={s.color} face={sharkFace(i)} tie={s.tie} prop={s.prop} scale={SHARK_SCALE * sk} dim={dim(i)} raise={cd.raise} card={cd.raise > 0 ? cd.text : undefined} cardInk={cd.ink} fin />
                  {shot.id === "panel" && <IconBubble icon={s.icon} p={[c.p[0], c.head[1] + 0.62, c.p[2]]} rotY={c.rotY} scale={pop(t, spawnAt(i) + 0.1) * 0.8} />}
                </React.Fragment>
              );
            })}
          </>
        )}
      </Stage>

      <PaperTitle text="I pitched my startup to 5 AI sharks" />
      {t < T.ask2 && <SectionTag text={shot.tag} at={shot.from} t={t} />}

      <GamePhone t={t} from={T.swipe} to={T.ask} />
      {shot.id === "ask" && <LowerThird text="Seeking $1M for a 10% stake" at={T.ask + 0.3} t={t} />}
      {/* each shark's name as they come up, then their verdict */}
      {verdict && t < verdict.at() && <Stamp key={shot.id} text={SHARKS[verdict.seat].role.toUpperCase()} color="#16141a" at={shot.from} t={t} top={600} rot={-3} size={70} />}
      {shot.id === "lori" && <Stamp text="I'M OUT" color={RED} at={T.loriOut} t={t} top={540} rot={-10} size={110} />}
      {verdict && verdict.seat !== LORI && <Stamp text="I'M IN!" color={GREEN} at={verdict.at()} t={t} top={540} rot={-8} size={100} />}
      {verdict && <LowerThird text={verdict.lower} at={verdict.at() + 0.1} t={t} />}
      {shot.id === "machine" && <LowerThird text={VERDICT[1].lower} at={T.royalties} t={t} />}
      {shot.id === "machine" && <Stamp text="FOREVER" color={RED} at={T.forever} t={t} top={620} rot={-10} size={140} />}
      {shot.id === "offers" && t >= T.ship && (
        <div style={{ position: "absolute", top: 600, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
          <div style={{ transform: `rotate(-8deg) scale(${slam(t, T.ship)})`, border: `12px solid ${RED}`, borderRadius: 18, padding: "10px 30px", color: RED, fontFamily: BLACK_FONT, fontSize: 80, lineHeight: 1.05, textAlign: "center", background: "rgba(251,248,241,0.9)", boxShadow: "0 14px 34px rgba(0,0,0,0.45)" }}>
            PROVE YOU
            <br />
            CAN SHIP
          </div>
        </div>
      )}
      {shot.id === "cta" && t >= T.freeSkill && t < T.ask2 && <Stamp text="FREE SKILL" color={GREEN} at={T.freeSkill} t={t} top={560} rot={-8} size={120} />}
      <CommentBurst t={t} />
      <Flash t={t} at={T.tank} />
      <Flash t={t} at={T.loriOut} />
      <TileCaptions t={t} />
      <TankSound />
    </AbsoluteFill>
  );
};

export const TANK_CUES = {
  spawnAt,
  offerAt,
  SHARK_COUNT: SHARKS.length,
  verdicts: () => VERDICT.map((v) => ({ at: v.at(), in: v.seat !== LORI })),
  shotStarts: () => SHOTS.map((s) => s.at()),
  swipes: () => Array.from({ length: Math.floor((T.ask - T.swipe) / SWIPE_EVERY) }, (_, i) => T.swipe + (i + 1) * SWIPE_EVERY - 0.12),
};
