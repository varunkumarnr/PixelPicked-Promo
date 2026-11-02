import ENV from "./narration-env.json";

/**
 * The narrator's lines for "There's a game for that" (public/audio/ad/narrator), in order, with
 * where the speech sits inside each take ([first, last] voiced frame) so captions land on the words.
 * GameForThat.tsx lays them out one after another.
 */

export type Narration = { name: keyof typeof ENV; text: string; speech: [number, number] };

const env = ENV as unknown as Record<string, { speech: [number, number]; len: number }>;
const line = (name: keyof typeof ENV, text: string): Narration => ({ name, text, speech: env[name].speech });

export const NARRATION: Narration[] = [
  line("calm-1", "What's great about PixelPicked is, if you've got a few minutes while your tea cools… there's a game for that."),
  line("calm-2", "Waiting for the bus? There's a game for that."),
  line("calm-3", "Five minutes before a meeting? There's a game for that."),
  line("calm-4", "Lunch break? There's a game for that."),
  line("calm-5", "Can't sleep? There's even a game for that."),
  line("calm-6", "Yep, there's a game for just about anything. Scroll and play at PixelPicked."),
];

/** Length of a take in frames, to the end of its speech. */
export const takeLen = (name: keyof typeof ENV) => env[name].len;
