import React from "react";
import { Audio, Sequence, interpolate, staticFile } from "remotion";
import { Narration } from "./narration";

/**
 * Sound for "There's a game for that": the narrator, a light, quiet music bed under the whole
 * spot that dips while she speaks, a soft swipe for each new game, and one chime on the logo.
 * Nothing else, so it stays as calm as the original.
 */

export const GameForThatAudio: React.FC<{ narration: (Narration & { at: number })[]; swipes: number[]; cardAt: number }> = ({ narration, swipes, cardAt }) => {
  const speaking = (f: number) => narration.some((n) => f >= n.at + n.speech[0] - 4 && f <= n.at + n.speech[1] + 4);
  return (
    <>
      <Audio src={staticFile("audio/cute/music-cosy-quirky.mp3")} volume={(f) => interpolate(f, [0, 15], [0, 1], { extrapolateRight: "clamp" }) * (speaking(f) ? 0.09 : 0.16)} />
      {narration.map((n) => (
        <Sequence key={n.name} from={n.at}>
          <Audio src={staticFile(`audio/ad/narrator/${n.name}.wav`)} />
        </Sequence>
      ))}
      {swipes.map((at) => (
        <Sequence key={at} from={at - 2}>
          <Audio src={staticFile("audio/siblings/swipe.wav")} volume={0.25} />
        </Sequence>
      ))}
      <Sequence from={cardAt + 8}>
        <Audio src={staticFile("audio/chime.mp3")} volume={0.35} />
      </Sequence>
    </>
  );
};
