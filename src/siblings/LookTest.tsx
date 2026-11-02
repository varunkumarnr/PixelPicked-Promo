import React from "react";
import { AbsoluteFill } from "remotion";
import { Chibi, Chips, EXPR, JIYA, JIYA_ANIME, Phone, REST, ZACK, ZACK_ANIME } from "./Chibi";
import { Lights, Room } from "./Room";
import { Stage } from "./Stage";

/** Still for checking the characters and the set. */
export const SiblingsLookTest: React.FC<{
  shot?: "wide" | "zack" | "jiya" | "zackFace" | "jiyaFace" | "lineup" | "zackAnime" | "jiyaAnime";
  empty?: boolean;
  film?: boolean;
  expr?: keyof typeof EXPR;
}> = ({ shot = "wide", empty = false, film = false, expr }) => {
  if (shot === "lineup" || shot === "zackAnime" || shot === "jiyaAnime") {
    const face = expr ? EXPR[expr] : {};
    const cam =
      shot === "lineup"
        ? { pos: [-0.1, 1.0, 3.9] as [number, number, number], look: [-0.1, 0.95, 0.3] as [number, number, number], fov: 38 }
        : shot === "zackAnime"
          ? { pos: [-0.5, 1.55, 2.5] as [number, number, number], look: [-0.5, 1.48, 0.4] as [number, number, number], fov: 30 }
          : { pos: [0.35, 1.2, 2.3] as [number, number, number], look: [0.35, 1.18, 0.4] as [number, number, number], fov: 30 };
    return (
      <AbsoluteFill style={{ background: "#000" }}>
        <Stage cam={cam} post={{ style: "anime" }} env={0.12} fill={1.3} exposure={1.15}>
          <Lights mood="night" />
          <Room night />
          <Chibi look={ZACK_ANIME} p={[-0.5, 0, 0.4]} rot={[0, 0.1, 0]} pose={{ ...REST, armRx: 0.2, elbowR: 0.4, gripR: 0.8, smile: 0.7, mouthOpen: 0.5, squint: 0.3, browRaise: 0.4, ...face }} />
          <Chibi look={JIYA_ANIME} p={[0.35, 0, 0.4]} rot={[0, -0.1, 0]} pose={{ ...REST, lid: 0.45, smile: 0.1, ...face }} />
        </Stage>
      </AbsoluteFill>
    );
  }
  if (shot === "zackFace" || shot === "jiyaFace") {
    const z = shot === "zackFace";
    const face = expr ? EXPR[expr] : {};
    const cam = z
      ? { pos: [-0.3, 1.52, 2.3] as [number, number, number], look: [-0.3, 1.48, 0.4] as [number, number, number], fov: 30 }
      : { pos: [-1.7, 1.08, 1.4] as [number, number, number], look: [-1.7, 1.05, -0.5] as [number, number, number], fov: 30 };
    return (
      <AbsoluteFill style={{ background: "#000" }}>
        <Stage cam={cam} post={{}} env={0.12} fill={0.5} exposure={1.0}>
          <Lights mood="night" />
          <Room night />
          {z ? (
            <Chibi look={ZACK} p={[-0.3, 0, 0.4]} pose={{ ...REST, ...face }} />
          ) : (
            <Chibi look={JIYA} p={[-1.7, 0.15, -0.5]} pose={{ ...REST, hipL: -1.5, hipR: -1.5, kneeL: 1.45, kneeR: 1.5, ...face }} />
          )}
        </Stage>
        <div style={{ position: "absolute", top: 60, left: 60, color: "#fff", fontSize: 70, fontFamily: "Arial Black" }}>{expr}</div>
      </AbsoluteFill>
    );
  }
  const cams = {
    wide: { pos: [-0.5, 1.45, 4.6] as [number, number, number], look: [-0.5, 1.0, -1.2] as [number, number, number], fov: 50 },
    zack: { pos: [0.75, 1.55, 2.2] as [number, number, number], look: [0.2, 1.45, -0.4] as [number, number, number], fov: 35 },
    jiya: { pos: [-1.0, 1.15, 1.9] as [number, number, number], look: [-1.7, 1.05, -0.5] as [number, number, number], fov: 35 },
  };
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Stage cam={cams[shot]} post={film ? {} : false} env={film ? 0.12 : 0.35} fill={film ? 0.5 : 0.9} exposure={film ? 1.0 : 1.1}>
        <Lights phoneGlow={film ? null : [0.6, 1.4, -0.2]} mood={film ? "night" : "evening"} />
        <Room night={film} />
        {!empty && (
        <Chibi
          look={ZACK}
          p={[0.2, 0, -0.4]}
          pose={{ ...REST, armRx: 0.5, elbowR: 1.9, armRz: 0.1, headPitch: 0.3, lookY: -0.7, smile: 0.5, lid: 0.05 }}
          rightHand={<Phone rot={[-1.9, 0, 0]} p={[0, -0.03, 0.05]} />}
        />
        )}
        {!empty && (
        <Chibi
          look={JIYA}
          p={[-1.7, 0.15, -0.5]}
          rot={[0, 0.25, 0]}
          pose={{ ...REST, hipL: -1.5, hipR: -1.5, kneeL: 1.4, kneeR: 1.5, lid: 0.5, smile: 0, armLx: 0.9, elbowL: 1.1, armRx: 0.6, elbowR: 1.4, lookX: 0.4 }}
          leftHand={<Chips />}
        />
        )}
      </Stage>
    </AbsoluteFill>
  );
};
