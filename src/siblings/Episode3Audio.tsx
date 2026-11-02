import React from "react";
import { Audio, Sequence, interpolate, staticFile } from "remotion";
import { VoiceLine } from "./voices";

/**
 * Sound for episode 3, by frame (shot boundaries are in Episode3.tsx). Phonk low under his
 * commentary, a pop on every type tag, her taps under each phone insert, and the sound of each
 * cartoon extreme: the stadium, the city coming down, the rubber-band arm, a slow clock while time
 * stands still, fireworks, the alarm. The music out of the last line runs into the hook's so the
 * loop is seamless.
 */

type Cue = { at: number; src: string; volume?: number; rate?: number };

const sib = (name: string) => `audio/siblings/${name}.wav`;

/** Where the phonk drop hits in the track (14.176s). */
const DROP = Math.round(14.176 * 30);

/** A run of screen taps between two frames. */
const taps = (from: number, to: number, every = 6, volume = 0.35): Cue[] =>
  Array.from({ length: Math.floor((to - from) / every) + 1 }, (_, i) => ({ at: from + i * every, src: sib("tap"), volume }));

const CUES: Cue[] = [
  // the type tags
  ...[45, 195, 290, 390, 545, 788].map((at) => ({ at, src: "audio/pop.mp3", volume: 0.35 })),
  // drifting into each cartoon extreme
  ...[84, 230, 570, 802, 832].map((at) => ({ at, src: "audio/whoosh.mp3", volume: 0.3 })),
  // the stadium comes alive
  { at: 86, src: "audio/riser.mp3", volume: 0.3 },
  { at: 98, src: sib("victory"), volume: 0.25 },
  // the side-eye
  { at: 183, src: sib("sting"), volume: 0.2 },
  // his tower topples onto downtown
  { at: 236, src: "audio/riser.mp3", volume: 0.35 },
  { at: 268, src: "audio/impact.mp3", volume: 0.7 },
  { at: 269, src: sib("crack"), volume: 0.5 },
  { at: 276, src: "audio/impact.mp3", volume: 0.4, rate: 0.8 },
  // the arm stretches... and snaps back, spinning him
  { at: 298, src: "audio/shimmer.mp3", volume: 0.3, rate: 0.7 },
  { at: 351, src: "audio/impact.mp3", volume: 0.55 },
  { at: 352, src: sib("crack"), volume: 0.4 },
  { at: 356, src: "audio/whoosh.mp3", volume: 0.4, rate: 1.3 },
  // time freezes: a slow clock, then it snaps back on NOW
  ...Array.from({ length: 6 }, (_, i) => ({ at: 414 + i * 15, src: "audio/tick.mp3", volume: 0.45, rate: 0.8 })),
  { at: 504, src: "audio/whoosh.mp3", volume: 0.45 },
  // she taps early through his countdown
  ...taps(510, 538, 6, 0.4),
  { at: 541, src: "audio/chime.mp3", volume: 0.35 },
  // new best
  { at: 549, src: sib("victory"), volume: 0.45 },
  { at: 549, src: "audio/pop.mp3", volume: 0.5 },
  // the ceremony: fireworks under the ceiling
  ...[574, 584, 596, 610, 622].map((at) => ({ at, src: "audio/pop.mp3", volume: 0.3, rate: 0.8 })),
  // his go: one tap, game over
  { at: 750, src: sib("tap"), volume: 0.5 },
  { at: 758, src: sib("buzzer"), volume: 0.45 },
  { at: 762, src: sib("womp"), volume: 0.4 },
  { at: 798, src: sib("rattle"), volume: 0.35 },
  // the server room alarm, then the planet
  ...[812, 824].map((at) => ({ at, src: sib("buzzer"), volume: 0.35, rate: 0.8 })),
  { at: 842, src: "audio/riser.mp3", volume: 0.3 },
];

const Music: React.FC = () => (
  <>
    {/* hook and the first types: low phonk */}
    <Sequence from={0} durationInFrames={400}>
      <Audio src={staticFile("audio/siblings/phonk-hard.mp3")} trimBefore={DROP} volume={(f) => interpolate(f, [0, 380, 400], [0.16, 0.16, 0], { extrapolateRight: "clamp" })} />
    </Sequence>
    {/* the fake pro's hushed countdown sits in near silence; the drop comes back on her combo */}
    <Sequence from={508} durationInFrames={250}>
      <Audio src={staticFile("audio/siblings/phonk-hard.mp3")} trimBefore={DROP} volume={(f) => interpolate(f, [0, 75, 85, 230, 250], [0.4, 0.4, 0.14, 0.14, 0], { extrapolateRight: "clamp" })} />
    </Sequence>
    {/* the excuse: runs into the hook's music, so the end flows into frame 0 */}
    <Sequence from={830} durationInFrames={55}>
      <Audio src={staticFile("audio/siblings/phonk-hard.mp3")} trimBefore={DROP - 55} volume={(f) => interpolate(f, [0, 8], [0, 0.16], { extrapolateRight: "clamp" })} />
    </Sequence>
  </>
);

export const Episode3Audio: React.FC<{ voices: VoiceLine[] }> = ({ voices }) => (
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
