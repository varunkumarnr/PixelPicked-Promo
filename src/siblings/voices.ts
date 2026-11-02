import ENV from "./data/voice-env.json";

/**
 * The ElevenLabs voice lines for episode 1 (public/audio/siblings/voice), when each one starts,
 * and a loudness envelope per frame that drives the characters' mouths. Lines are spaced so
 * there's at least 12 frames of silence between one line's last word and the next one's first.
 */

export type VoiceLine = { name: keyof typeof ENV; who: "zack" | "jiya"; at: number; volume?: number; maxFrames?: number; ext?: "mp3" | "wav" };


/** Episode 2's lines (loudness-matched .wav takes); each starts so its speech lands on its subtitle. */
export const VOICE_LINES_EP2: VoiceLine[] = [
  { name: "ep2-zack-bet", who: "zack", at: 14, ext: "wav" },
  { name: "ep2-jiya-deal", who: "jiya", at: 84, ext: "wav" },
  { name: "ep2-zack-thumb", who: "zack", at: 222, ext: "wav" },
  { name: "ep2-zack-sun", who: "zack", at: 406, ext: "wav" },
  { name: "ep2-jiya-11pm", who: "jiya", at: 540, ext: "wav" },
  { name: "ep2-zack-distract", who: "zack", at: 659, ext: "wav" },
  { name: "ep2-zack-broken", who: "zack", at: 793, ext: "wav" },
  { name: "ep2-zack-beg", who: "zack", at: 966, ext: "wav" },
  { name: "ep2-jiya-fine", who: "jiya", at: 1044, ext: "wav" },
  { name: "ep2-zack-yes", who: "zack", at: 1152, ext: "wav" },
  { name: "ep2-jiya-dishes", who: "jiya", at: 1245, ext: "wav" },
];


/** Episode 3's lines (loudness-matched .wav takes); each starts so its speech lands on its subtitle. */
export const VOICE_LINES_EP3: VoiceLine[] = [
  { name: "ep3-zack-no", who: "zack", at: 1, ext: "wav" },
  { name: "ep3-zack-narrate", who: "zack", at: 48, ext: "wav" },
  { name: "ep3-zack-would", who: "zack", at: 198, ext: "wav" },
  { name: "ep3-zack-grab", who: "zack", at: 292, ext: "wav" },
  { name: "ep3-zack-ow", who: "zack", at: 354, ext: "wav", maxFrames: 32 },
  { name: "ep3-zack-pro", who: "zack", at: 392, ext: "wav" },
  { name: "ep3-zack-works", who: "zack", at: 518, ext: "wav" },
  { name: "ep3-zack-we", who: "zack", at: 576, ext: "wav" },
  { name: "ep3-jiya-turn", who: "jiya", at: 698, ext: "wav" },
  { name: "ep3-zack-broken", who: "zack", at: 792, ext: "wav" },
];

const env = ENV as Record<string, number[]>;

/** How open someone's mouth is at a global frame, from their voice line playing then (0..1). */
export function talk(who: "zack" | "jiya", frame: number, lines: VoiceLine[]): number {
  for (const l of lines) {
    if (l.who !== who) continue;
    const i = frame - l.at;
    const e = env[l.name];
    if (i >= 0 && i < Math.min(e.length, l.maxFrames ?? Infinity)) return e[i];
  }
  return 0;
}
