import React from "react";
import { Audio, Sequence, interpolate, staticFile } from "remotion";

/**
 * The founder reel's sound, in layers that follow the story's mood:
 *
 *  - music: a warm build under the hook and the childhood, cut dead on "and then… nothing";
 *    silence (crickets, room tone) for the low point; a dark pulse under the store and the money;
 *    then a riser into the feed and the full track back for the turn and the ending
 *  - ambience: studio room tone throughout, the kid's chiptune in the bedroom, fire crackle
 *    that fades as the camera leaves the money
 *  - foley on the action: typing, the launch click, the excited chime, a tap on the phone,
 *    banknotes fluttering, a ka-ching on "millions", one soft note on "me neither", swipes,
 *    the record beep, sticker pops and the stop click
 *
 * Every cue is placed from the script's timing, so editing script.ts keeps the sound in sync.
 */

type TimedBeat = { shot: string; from: number; len: number; marks: number[]; sticker?: Record<number, string> };

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const FPS = 30;
/** Overall level: the layers are balanced against each other, this sets how loud the whole mix sits. */
const MASTER = 1.8;

/** One sound at a frame. */
const Cue: React.FC<{ at: number; src: string; volume: number; startFrom?: number }> = ({ at, src, volume, startFrom }) => (
  <Sequence from={Math.max(0, at)} layout="none">
    <Audio src={staticFile(`audio/${src}`)} volume={volume * MASTER} startFrom={startFrom} />
  </Sequence>
);

/** A looping bed between two frames, fading in and out over `fade` frames. */
const Bed: React.FC<{ from: number; to: number; src: string; volume: number | ((f: number) => number); fade?: number }> = ({ from, to, src, volume, fade = 8 }) => {
  if (to <= from) return null;
  return (
    <Sequence from={from} durationInFrames={to - from} layout="none">
      <Audio
        src={staticFile(`audio/${src}`)}
        loop
        volume={(f) => MASTER * (typeof volume === "number" ? volume : volume(f)) * interpolate(f, [0, fade, to - from - fade, to - from], [0, 1, 1, 0], clamp)}
      />
    </Sequence>
  );
};

export const FounderSound: React.FC<{ beats: TimedBeat[]; duration: number; voice?: boolean; voiceUntil?: number }> = ({ beats, duration, voice = false, voiceUntil }) => {
  /** Under a voice, the music and foley step back so every word is clear. */
  const bed = voice ? 0.5 : 1;
  const beat = (shot: string) => beats.find((b) => b.shot === shot);
  /** The reel frame where chunk `i` of a shot starts (the shot's start if it has none). */
  const at = (shot: string, i = 0) => {
    const b = beat(shot);
    return b ? b.from + (b.marks[i] ?? 0) : -1;
  };
  const flash = beat("flashback");
  const lonely = beat("lonely");
  const feed = beat("feed");
  const selfie = beat("selfie");
  const nothing = flash ? at("flashback", flash.marks.length - 1) : 0;
  const darkFrom = at("store");
  const darkTo = lonely ? at("lonely", Math.min(3, lonely.marks.length - 1)) : darkFrom;
  const turn = feed ? feed.from : duration;
  return (
    <>
      {/* ── music ── */}
      {/* the story so far: warm, under the hook and the childhood, cut dead on "nothing" */}
      <Sequence from={0} durationInFrames={nothing + 3} layout="none">
        <Audio src={staticFile("audio/music.mp3")} startFrom={Math.round(7.6 * FPS)} volume={(f) => MASTER * bed * interpolate(f, [0, 8, nothing - 2, nothing + 3], [0, 0.13, 0.13, 0], clamp)} />
      </Sequence>
      <Cue at={nothing + 8} src="siblings/crickets.wav" volume={0.3} />
      <Cue at={nothing + 44} src="siblings/crickets.wav" volume={0.22} />
      {/* the real problem: a low pulse under the store and the money, gone for "yeah…" */}
      <Bed from={darkFrom} to={darkTo + 6} src="founder/tension.wav" volume={0.32} fade={20} />
      {/* the turn: a riser into the feed, then the track at full for the rest */}
      <Cue at={turn - 90} src="riser.mp3" volume={0.28} startFrom={Math.round((13.45 - 3) * FPS)} />
      <Sequence from={turn} durationInFrames={duration - turn} layout="none">
        <Audio
          src={staticFile("audio/music.mp3")}
          startFrom={Math.round(103.7 * FPS)}
          volume={(f) => {
            const end = duration - turn;
            const inSelfie = selfie ? f >= selfie.from - turn : false;
            return MASTER * bed * interpolate(f, [0, 4, end - 20, end], [0, 1, 1, 0], clamp) * (inSelfie ? 0.12 : 0.16);
          }}
        />
      </Sequence>

      {/* ── the voice ── */}
      {voice && <Audio src={staticFile("audio/founder/voice/story.mp3")} volume={(f) => (voiceUntil === undefined ? 1 : interpolate(f, [voiceUntil - 3, voiceUntil], [1, 0], clamp))} />}

      {/* ── ambience ── */}
      <Bed from={0} to={duration} src="founder/roomtone.wav" volume={0.1} fade={10} />
      {beat("childhood") && <Bed from={beat("childhood")!.from} to={beat("childhood")!.from + beat("childhood")!.len} src="founder/chiptune.wav" volume={0.16} fade={6} />}
      {beat("fire") && (
        <Bed
          from={beat("fire")!.from}
          to={turn}
          src="founder/fire.wav"
          // full while we're on the money, fading as the camera drifts away to the lonely game
          volume={(f) => interpolate(f, [0, (lonely?.from ?? turn) - beat("fire")!.from, darkTo - beat("fire")!.from], [0.4, 0.4, 0.06], clamp)}
          fade={6}
        />
      )}

      {/* ── foley ── */}
      {/* the hook: the developer counter ticking up from frame 0, a chime as it lands on 1,000+,
          and a swipe for each game flicking past on the giant phone */}
      {beat("hook") &&
        Array.from({ length: Math.floor((beat("hook")!.len - 12) / 4) }, (_, i) => <Cue key={`tick${i}`} at={beat("hook")!.from + i * 4} src="tick.mp3" volume={0.1 + 0.08 * (i / ((beat("hook")!.len - 12) / 4))} />)}
      {beat("hook") && <Cue at={beat("hook")!.from + beat("hook")!.len - 12} src="chime.mp3" volume={0.3} />}
      {beat("hook") &&
        Array.from({ length: Math.ceil((beat("hook")!.len + 4) / 20) }, (_, i) => <Cue key={`sw${i}`} at={beat("hook")!.from + 4 + i * 20} src="siblings/swipe.wav" volume={0.14} />)}
      {/* the hook lands on "flopped" */}
      {beat("punch") && <Cue at={at("punch", beat("punch")!.marks.length - 1)} src="impact.mp3" volume={0.28} />}
      {/* the childhood bedroom swooshes in */}
      {beat("childhood") && <Cue at={beat("childhood")!.from - 6} src="whoosh.mp3" volume={0.14} />}
      {/* coding, launching, the excitement */}
      {flash && <Bed from={flash.from} to={at("flashback", 1)} src="founder/typing.wav" volume={0.35} fade={4} />}
      {flash && <Cue at={at("flashback", 1)} src="click.mp3" volume={0.5} />}
      {flash && <Cue at={at("flashback", 2)} src="chime.mp3" volume={0.25} />}
      {/* the store: a tap on the phone */}
      {beat("store") && <Cue at={beat("store")!.from - 6} src="whoosh.mp3" volume={0.12} />}
      {beat("store") && <Cue at={beat("store")!.from + 6} src="siblings/tap.wav" volume={0.4} />}
      {/* the money: notes fluttering in, a ka-ching on "millions" */}
      {beat("fire") && <Cue at={beat("fire")!.from} src="founder/flutter.wav" volume={0.4} />}
      {beat("fire") && <Cue at={at("fire", 2)} src="founder/kaching.wav" volume={0.3} />}
      {/* one soft note on "me neither" */}
      {lonely && <Cue at={at("lonely", lonely.marks.length - 1)} src="founder/note.wav" volume={0.4} />}
      {/* the feed: a swipe for each new game, a pop for "for you" */}
      {feed &&
        [3, 5, 7]
          .filter((i) => i < feed.marks.length)
          .map((i) => <Cue key={i} at={at("feed", i) - 2} src="siblings/swipe.wav" volume={0.3} />)}
      {feed && feed.marks[5] !== undefined && <Cue at={at("feed", 5) + 2} src="pop.mp3" volume={0.3} />}
      {/* the selfie: the record beep, a pop for each sticker, the stop click at the end */}
      {selfie && <Cue at={selfie.from - 4} src="whoosh.mp3" volume={0.12} />}
      {selfie && <Cue at={selfie.from + 3} src="founder/record.wav" volume={0.35} />}
      {selfie &&
        Object.keys(selfie.sticker ?? {}).map((i) => <Cue key={i} at={selfie.from + (selfie.marks[Number(i)] ?? 0)} src="pop.mp3" volume={0.35} />)}
      {selfie && <Cue at={duration - 10} src="founder/stop.wav" volume={0.5} />}
    </>
  );
};
