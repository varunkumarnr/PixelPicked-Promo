import React from "react";
import { Audio, Sequence, interpolate, staticFile } from "remotion";
import { VoiceLine } from "./voices";

/**
 * Sound for episode 2, by frame (shot boundaries are in Episode2.tsx). Every round is a run of
 * taps ending in his buzzer; each excuse tag pops and each point ticks. Phonk sits low under the
 * rounds, drops out so "best of fifteen" lands in silence, comes back for his one win, and cuts
 * dead for her last line. A womp and a sponge plop for the ending.
 */

type Cue = { at: number; src: string; volume?: number; rate?: number };

const sib = (name: string) => `audio/siblings/${name}.wav`;

/** Where the phonk drop hits in the track (14.176s). */
const DROP = Math.round(14.176 * 30);

/** A run of screen taps between two frames. */
const taps = (from: number, to: number, every = 6, volume = 0.35): Cue[] =>
  Array.from({ length: Math.floor((to - from) / every) + 1 }, (_, i) => ({ at: from + i * every, src: sib("tap"), volume }));

const CUES: Cue[] = [
  // round 1: he loses
  ...taps(134, 178),
  { at: 180, src: sib("buzzer"), volume: 0.4 },
  { at: 182, src: sib("womp"), volume: 0.35 },
  // excuse 1, and the plaster appears
  { at: 316, src: "audio/pop.mp3", volume: 0.3 },
  // round 2
  ...taps(348, 372),
  { at: 375, src: sib("buzzer"), volume: 0.4 },
  // the window: it's night
  { at: 474, src: sib("crickets"), volume: 0.45 },
  { at: 504, src: sib("crickets"), volume: 0.4 },
  // round 3
  ...taps(603, 627),
  { at: 630, src: sib("buzzer"), volume: 0.4 },
  // she eats one chip, holding eye contact
  { at: 737, src: sib("sting"), volume: 0.25 },
  { at: 745, src: sib("crunch"), volume: 1 },
  // he rattles the phone; she beats his level one-handed
  { at: 800, src: sib("rattle"), volume: 0.4 },
  ...taps(869, 899, 6, 0.5),
  { at: 905, src: sib("ding"), volume: 0.6 },
  { at: 905, src: "audio/pop.mp3", volume: 0.5 },
  // knees hit the floor
  { at: 962, src: "audio/impact.mp3", volume: 0.45 },
  // round 5: he wins one
  ...taps(1103, 1121),
  { at: 1125, src: sib("victory"), volume: 0.4 },
  { at: 1125, src: "audio/pop.mp3", volume: 0.45 },
  // it sinks in; a sponge lands on his head
  { at: 1345, src: sib("womp"), volume: 0.4 },
  { at: 1354, src: "audio/impact.mp3", volume: 0.3 },
  { at: 1354, src: "audio/pop.mp3", volume: 0.35 },
  { at: 1370, src: "audio/pop.mp3", volume: 0.3 },
  // excuse tags and score ticks
  ...[215, 400, 655, 790].map((at) => ({ at, src: "audio/pop.mp3", volume: 0.35 })),
  ...[186, 381, 636, 910, 1131].map((at) => ({ at, src: "audio/tick.mp3", volume: 0.35 })),
];

const Music: React.FC = () => (
  <>
    {/* low under the rounds and excuses */}
    <Sequence from={0} durationInFrames={962}>
      <Audio
        src={staticFile("audio/siblings/phonk-hard.mp3")}
        trimBefore={DROP}
        volume={(f) => interpolate(f, [0, 12, 950, 962], [0, 0.15, 0.15, 0], { extrapolateRight: "clamp" })}
      />
    </Sequence>
    {/* the win: back in hard, then under his line, out before her reply */}
    <Sequence from={1125} durationInFrames={110}>
      <Audio src={staticFile("audio/siblings/phonk-hard.mp3")} trimBefore={DROP} volume={(f) => interpolate(f, [0, 30, 36, 100, 110], [0.45, 0.45, 0.13, 0.13, 0], { extrapolateRight: "clamp" })} />
    </Sequence>
    {/* end card */}
    <Sequence from={1372} durationInFrames={68}>
      <Audio src={staticFile("audio/siblings/phonk-hard.mp3")} trimBefore={DROP + 120} volume={(f) => interpolate(f, [0, 10, 56, 68], [0, 0.3, 0.3, 0], { extrapolateRight: "clamp" })} />
    </Sequence>
  </>
);

export const Episode2Audio: React.FC<{ voices: VoiceLine[] }> = ({ voices }) => (
  <>
    <Music />
    {voices.map((l) => (
      <Sequence key={l.name} from={l.at} durationInFrames={l.maxFrames}>
        <Audio src={staticFile(`audio/siblings/voice/${l.name}.${l.ext ?? "mp3"}`)} volume={l.volume ?? 1} />
      </Sequence>
    ))}
    {CUES.map((c, i) => (
      <Sequence key={i} from={c.at}>
        <Audio src={staticFile(c.src)} volume={c.volume ?? 1} playbackRate={c.rate ?? 1} />
      </Sequence>
    ))}
  </>
);
