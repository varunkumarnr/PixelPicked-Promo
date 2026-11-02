import React from "react";
import { Audio, Sequence, interpolate, staticFile } from "remotion";
import { COURT_REEL_DURATION, FPS, T, spawnAt } from "./CourtReel";

/**
 * The trial reel's sound: the founder's voiceover on top, the music bed low under it (lower still
 * for the verdict), a pop for every robot that spawns and every YES, a thud for each card and
 * stamp that slams down, a scratch for the soft launch getting crossed out, the gavel, a click per
 * card, a sting on 8–4 and a shimmer on the free jury. Everything is placed from T, which comes
 * from the voice take, so it stays in sync with the words.
 */

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const sec = (s: number) => Math.round(s * FPS);

const Cue: React.FC<{ at: number; src: string; volume: number }> = ({ at, src, volume }) => (
  <Sequence from={Math.max(0, sec(at))} layout="none">
    <Audio src={staticFile(`audio/${src}`)} volume={volume} />
  </Sequence>
);

/** On YouTube the voice stops after "For the link," and a pop lands on the subscribe button. */
export const CourtSound: React.FC<{ youtube?: boolean }> = ({ youtube = false }) => {
  // computed here, not at module level: this file and CourtReel import each other
  const CARD_TIMES = Array.from({ length: 12 }, (_, i) => T.cards + i * 0.08);
  return (
    <>
      <Audio
        src={staticFile("audio/founder/voice/court.mp3")}
        volume={(f) => (youtube ? interpolate(f, [sec(T.ask) - 6, sec(T.ask) - 2], [1, 0], clamp) : 1)}
      />
      <Audio
        src={staticFile("audio/music.mp3")}
        volume={(f) => {
          const t = f / FPS;
          const dip = t >= T.verdict && t < T.free ? 0.5 : 1;
          const out = interpolate(f, [COURT_REEL_DURATION - 20, COURT_REEL_DURATION], [1, 0], clamp);
          return 0.14 * dip * out;
        }}
      />
      {/* the jury popping in, everyone shouting YES, the lawyers arriving */}
      {Array.from({ length: 12 }, (_, i) => (
        <Cue key={`p${i}`} at={spawnAt(i)} src="pop.mp3" volume={0.35} />
      ))}
      {[0, 1, 2].map((k) => (
        <Cue key={`y${k}`} at={T.yes + k * 0.45} src="impact.mp3" volume={0.3} />
      ))}
      <Cue at={T.lawyers} src="pop.mp3" volume={0.5} />
      {/* a whoosh into each section */}
      {[T.argue, T.pros, T.def, T.vote, T.verdict, T.free].map((s, i) => (
        <Cue key={`w${i}`} at={s - 0.05} src="whoosh.mp3" volume={0.25} />
      ))}
      {/* props slamming down */}
      <Cue at={T.card} src="impact.mp3" volume={0.4} />
      <Cue at={T.faded} src="impact.mp3" volume={0.55} />
      <Cue at={T.months} src="impact.mp3" volume={0.35} />
      <Cue at={T.strike} src="siblings/scratch.wav" volume={0.45} />
      <Cue at={T.days} src="siblings/ding.wav" volume={0.45} />
      <Cue at={T.secret} src="impact.mp3" volume={0.35} />
      {[T.vc, T.teen, T.tiktok, T.fire].map((s, i) => (
        <Cue key={`t${i}`} at={s} src="pop.mp3" volume={0.45} />
      ))}
      {/* the verdict */}
      <Cue at={T.verdict - 1.0} src="riser.mp3" volume={0.2} />
      <Cue at={T.slam} src="impact.mp3" volume={0.8} />
      {CARD_TIMES.map((s, i) => (
        <Cue key={`c${i}`} at={s} src="click.mp3" volume={0.45} />
      ))}
      <Cue at={T.react} src="siblings/sting.wav" volume={0.55} />
      <Cue at={T.freeStamp} src="impact.mp3" volume={0.45} />
      <Cue at={T.freeStamp} src="shimmer.mp3" volume={0.3} />
      <Cue at={T.ask} src="pop.mp3" volume={0.5} />
      {youtube && <Cue at={T.subscribe} src="pop.mp3" volume={0.55} />}
    </>
  );
};
