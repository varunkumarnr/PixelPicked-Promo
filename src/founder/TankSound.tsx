import React from "react";
import { Audio, Sequence, interpolate, staticFile } from "remotion";
import { FPS, T, TANK_CUES, TANK_REEL_DURATION } from "./TankReel";

/**
 * The shark reel's sound: the founder's voice on top, the music bed low under it, a chomp on every
 * bite in the opening, a whoosh on every cut, a swipe for each game on the phone, a pop as each
 * shark drops into their chair, a sting for the one who's out and a thud and ding for each one
 * who's in, coins for the royalty, a click per offer card, and a shimmer on the free skill.
 * Placed from T, so it follows the take.
 */

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const sec = (s: number) => Math.round(s * FPS);

const Cue: React.FC<{ at: number; src: string; volume: number }> = ({ at, src, volume }) => (
  <Sequence from={Math.max(0, sec(at))} layout="none">
    <Audio src={staticFile(`audio/${src}`)} volume={volume} />
  </Sequence>
);

export const TankSound: React.FC = () => (
  <>
    <Audio src={staticFile("audio/founder/voice/tank.mp3")} volume={1} />
    <Audio src={staticFile("audio/music.mp3")} volume={(f) => 0.13 * interpolate(f, [TANK_REEL_DURATION - 20, TANK_REEL_DURATION], [1, 0], clamp)} />
    {/* the opening bites */}
    {Array.from({ length: Math.ceil(T.yes / 0.42) }, (_, i) => (
      <Cue key={`b${i}`} at={i * 0.42 + 0.02} src="impact.mp3" volume={0.15} />
    ))}
    {TANK_CUES.shotStarts()
      .slice(1)
      .map((s, i) => (
        <Cue key={`w${i}`} at={s - 0.05} src="whoosh.mp3" volume={0.22} />
      ))}
    <Cue at={T.tank} src="siblings/sting.wav" volume={0.45} />
    {TANK_CUES.swipes().map((s, i) => (
      <Cue key={`s${i}`} at={s} src="siblings/swipe.wav" volume={0.35} />
    ))}
    <Cue at={T.ask + 0.3} src="impact.mp3" volume={0.5} />
    {Array.from({ length: TANK_CUES.SHARK_COUNT }, (_, i) => (
      <Cue key={`p${i}`} at={TANK_CUES.spawnAt(i)} src="pop.mp3" volume={0.45} />
    ))}
    {TANK_CUES.verdicts().map((v, i) => (
      <React.Fragment key={`v${i}`}>
        <Cue at={v.at} src="impact.mp3" volume={0.65} />
        <Cue at={v.at + 0.05} src={v.in ? "siblings/ding.wav" : "siblings/sting.wav"} volume={0.4} />
      </React.Fragment>
    ))}
    <Cue at={T.forever} src="impact.mp3" volume={0.5} />
    <Cue at={T.offers - 0.8} src="riser.mp3" volume={0.2} />
    {[0, 1, 2, 3].map((i) => (
      <Cue key={`c${i}`} at={TANK_CUES.offerAt(i)} src="click.mp3" volume={0.5} />
    ))}
    <Cue at={T.ship} src="impact.mp3" volume={0.6} />
    <Cue at={T.freeSkill} src="impact.mp3" volume={0.45} />
    <Cue at={T.freeSkill} src="shimmer.mp3" volume={0.3} />
    <Cue at={T.ask2} src="impact.mp3" volume={0.6} />
  </>
);
