/**
 * The founder reel's script. Edit this file to change what the reel says; timing follows the
 * words, so the reel gets longer or shorter on its own, and the set changes and sound follow.
 *
 * The reel is one take: he stays in the middle at his desk and the set changes around him.
 * Each beat is one set. `say` is the captions, shown one chunk at a time, in order (about two to
 * five words each). Wrap words in *stars* to turn them yellow.
 *
 * Sets:
 *   "hook"      - the studio, a giant phone rising behind him playing the PixelPicked feed
 *   "punch"     - push in on him; the giant phone glitches and dies on the last chunk
 *   "childhood" - the studio sinks away and his childhood bedroom rises round him, pixel game on
 *   "flashback" - dark; a giant monitor rises with code typing; confetti on the third chunk;
 *                 the last chunk turns it to his game's store page with a flat graph, lights out
 *   "close"     - nothing but him in a spotlight
 *   "store"     - the studio back, the giant phone showing the top charts
 *   "fire"      - towers of cash burst up round him, on fire, money raining
 *   "lonely"    - the camera drifts down to one small indie game on his desk
 *   "feed"      - the giant phone plays the feed again; game cards fly in round him on chunk 6
 *   "end"       - the studio settles back, the numbers lighting up as neon signs
 *   "selfie"    - he grabs the camera and walks off round the studio filming himself, the
 *                 phone's record dot and timer on screen
 *
 * `sign` (end only): text that lights up as a neon sign when that chunk starts, by chunk index.
 * `sticker` (selfie only): text that pops up as a story sticker when that chunk starts.
 */

export type Shot = "hook" | "punch" | "childhood" | "flashback" | "close" | "store" | "fire" | "lonely" | "feed" | "end" | "selfie";
export type Beat = { shot: Shot; say: string[]; sign?: Record<number, string>; sticker?: Record<number, string> };

/**
 * The voiceover take in public/audio/founder/voice/story.mp3 (ElevenLabs, Liam – Viral Short-Form
 * Storyteller). When it's on, captions and set changes start on the spoken words; when it's off,
 * they follow at reading pace and the reel plays without a voice. If you change the words above,
 * generate a new take and re-time it, or turn this off.
 */
export const VOICE = true;

/** The taped paper label at the top. */
export const TITLE = "I'm building TikTok for mobile games";

export const SCRIPT: Beat[] = [
  // 1. the hook: the result, then the twist
  { shot: "hook", say: ["thousands", "of developers", "are using *this*", "to promote", "*their games*"] },
  { shot: "punch", say: ["and it only exists because", "my own game *flopped*"] },
  // 2. the story
  { shot: "childhood", say: ["I've wanted to make games", "since I was a *kid*"] },
  { shot: "flashback", say: ["so when I finally built one", "and launched it", "I was so excited…", "and then… *nothing*"] },
  { shot: "close", say: ["and I genuinely thought", "okay…", "maybe my game *just sucks*"] },
  // 3. the real problem
  { shot: "store", say: ["but go open the app store", "on your phone *right now*"] },
  { shot: "fire", say: ["pretty much every game at the top", "is from some *big studio*", "spending *millions* on ads"] },
  { shot: "lonely", say: ["like, when's the last time", "you played a game from someone", "you'd *never heard of*?", "yeah…", "*me neither*"] },
  // 4. what he built
  { shot: "feed", say: ["so I built something", "where you don't have to", "*download anything*", "you just scroll", "and you're *already playing*", "and the feed actually learns", "*what you like*", "instead of just showing you", "whoever *paid the most*"] },
  // 5. where it is now, and the ask
  {
    shot: "end",
    say: ["it's been *three months*", "and we've got over", "*a thousand developers*", "and thousands of", "*player sessions* already"],
    sign: { 0: "3 months", 2: "1,000+ developers", 4: "1000s of player sessions" },
  },
  // 6. he grabs the camera: follow along, comment for the link
  {
    shot: "selfie",
    say: ["follow along", "for the *journey*", "and comment *LINK*", "I'll send it to you"],
    sticker: { 0: "follow the journey", 2: "comment LINK 👇" },
  },
];

/**
 * The YouTube Shorts ending. Shorts can't DM a link, so the last two selfie chunks change: the
 * voice stops after "follow along for the journey" and these captions and sticker take over.
 * Keys are chunk indices in the selfie beat.
 */
export const YOUTUBE_ENDING = {
  say: { 2: "*subscribe* 🔔", 3: "link's in the *description*" } as Record<number, string>,
  sticker: { 2: "link in description 👇" } as Record<number, string>,
};
