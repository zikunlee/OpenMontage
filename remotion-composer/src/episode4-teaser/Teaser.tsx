import {
  AbsoluteFill,
  Audio,
  Img,
  OffthreadVideo,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  teaserData,
  type Shot,
  type EndCard,
  type TextOverlay,
  type Caption,
  type MusicConfig,
} from "./data";

function clamp01(t: number): number {
  return Math.max(0, Math.min(1, t));
}
function powerOut(t: number): number {
  return 1 - (1 - t) * (1 - t);
}
function sineInOut(t: number): number {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

// Vertical 9:16 treatment for 16:9-native source media: a blurred, darkened
// cover-fill background plus a centered contain-fit foreground. Both layers
// render the SAME source at full container size with different object-fit
// values (sizing off a naturally-short element leaves black bars).
const VerticalFill: React.FC<{ type: "video" | "image"; src: string; startFrom?: number }> = ({
  type,
  src,
  startFrom,
}) => {
  const bgStyle: React.CSSProperties = { width: "100%", height: "100%", objectFit: "cover" };
  const fgStyle: React.CSSProperties = { width: "100%", height: "100%", objectFit: "contain" };

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <AbsoluteFill style={{ filter: "blur(28px) brightness(0.55)", transform: "scale(1.15)" }}>
        {type === "video" ? (
          <OffthreadVideo src={staticFile(src)} muted startFrom={startFrom} style={bgStyle} />
        ) : (
          <Img src={staticFile(src)} style={bgStyle} />
        )}
      </AbsoluteFill>
      <AbsoluteFill>
        {type === "video" ? (
          <OffthreadVideo src={staticFile(src)} muted startFrom={startFrom} style={fgStyle} />
        ) : (
          <Img src={staticFile(src)} style={fgStyle} />
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const ShotLayer: React.FC<{ shot: Shot }> = ({ shot }) => {
  const { fps } = useVideoConfig();
  const startFrame = Math.round(shot.start * fps);
  const durationFrames = Math.round(shot.duration * fps) + 1;

  return (
    <Sequence from={startFrame} durationInFrames={durationFrames}>
      <VerticalFill
        type={shot.type}
        src={shot.src}
        startFrom={Math.round((shot.sourceOffset ?? 0) * fps)}
      />
    </Sequence>
  );
};

const EndCardLayer: React.FC<{ endCard: EndCard }> = ({ endCard }) => {
  const { fps } = useVideoConfig();
  const startFrame = Math.round(endCard.start * fps);
  const durationFrames = Math.round(endCard.duration * fps) + 1;

  return (
    <Sequence from={startFrame} durationInFrames={durationFrames}>
      <EndCardInner endCard={endCard} />
    </Sequence>
  );
};

const EndCardInner: React.FC<{ endCard: EndCard }> = ({ endCard }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const tSec = frame / fps;

  const scale = 1.0 + 0.05 * sineInOut(clamp01(tSec / Math.min(endCard.duration, 8)));
  const textIn = powerOut(clamp01((tSec - 0.15) / 0.5));
  const arrowBounce = Math.sin(tSec * 2.6) * 14;

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ transform: `scale(${scale})` }}>
        <VerticalFill type="image" src={endCard.bgSrc} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "rgba(0,0,0,0.15)" }} />
      <div
        style={{
          position: "absolute",
          top: "72%",
          left: "50%",
          transform: `translate(-50%, -50%) scale(${0.85 + 0.15 * textIn})`,
          opacity: textIn,
          textAlign: "center",
          width: "88%",
        }}
      >
        <div
          style={{
            fontFamily: "'Baloo 2', 'Quicksand', 'Comic Sans MS', sans-serif",
            fontWeight: 800,
            fontSize: 76,
            lineHeight: 1.15,
            color: "#FFE9A8",
            WebkitTextStroke: "3px #4A2E22",
            textShadow: "0 4px 8px #4A2E22, 0 0 40px rgba(74,46,34,0.8)",
          }}
        >
          {endCard.ctaText}
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          top: `calc(84% + ${arrowBounce}px)`,
          left: "50%",
          transform: "translateX(-50%)",
          opacity: textIn,
        }}
      >
        <svg width="90" height="110" viewBox="0 0 90 110">
          <path
            d="M45 0 L45 78 M20 55 L45 90 L70 55"
            stroke="#FFE9A8"
            strokeWidth="12"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            style={{ filter: "drop-shadow(0 3px 4px rgba(74,46,34,0.9))" }}
          />
        </svg>
      </div>
    </AbsoluteFill>
  );
};

const TextOverlayLayer: React.FC<{ overlay: TextOverlay }> = ({ overlay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const tSec = frame / fps;
  if (tSec < overlay.start || tSec > overlay.end) return null;

  const inProg = clamp01((tSec - overlay.start) / 0.2);
  const outProg = clamp01((tSec - (overlay.end - 0.2)) / 0.2);
  const opacity = powerOut(inProg) * (1 - outProg);
  const scale = 0.9 + 0.1 * powerOut(inProg);

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-start", paddingTop: 170 }}>
      <div
        style={{
          opacity,
          transform: `scale(${scale})`,
          maxWidth: "88%",
          textAlign: "center",
          fontFamily: "'Baloo 2', 'Quicksand', 'Comic Sans MS', sans-serif",
          fontWeight: 800,
          fontSize: 58,
          lineHeight: 1.2,
          color: "#FFFFFF",
          WebkitTextStroke: "2.5px #4A2E22",
          textShadow: "0 3px 6px #4A2E22, 0 0 24px rgba(74,46,34,0.6)",
        }}
      >
        {overlay.text}
      </div>
    </AbsoluteFill>
  );
};

const CaptionLayer: React.FC<{ caption: Caption }> = ({ caption }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const tSec = frame / fps;
  const fadeDur = 0.12;
  const fadeOutAt = Math.max(caption.start + fadeDur, caption.end - fadeDur);
  if (tSec < caption.start || tSec > caption.end + fadeDur) return null;

  const inProg = clamp01((tSec - caption.start) / fadeDur);
  const outProg = clamp01((tSec - fadeOutAt) / fadeDur);
  const opacity = powerOut(inProg) * (1 - outProg);

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          top: "58%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          opacity,
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "0 16px",
          maxWidth: 940,
          textAlign: "center",
          fontFamily: "'Baloo 2', 'Quicksand', 'Comic Sans MS', sans-serif",
          fontWeight: 800,
          fontSize: 58,
          lineHeight: 1.3,
          background: "rgba(74,46,34,0.45)",
          borderRadius: 30,
          padding: "14px 36px",
        }}
      >
        {caption.words.map((w, i) => {
          const active = tSec >= w.start && tSec < w.end;
          return (
            <span
              key={i}
              style={{
                color: active ? "#FFD34E" : "#FFFFFF",
                WebkitTextStroke: active ? "2.5px #7A4A1E" : "2.5px #4A2E22",
                textShadow: active
                  ? "0 3px 5px #7A4A1E, 0 0 26px rgba(255,211,78,0.75)"
                  : "0 3px 5px #4A2E22",
                transform: active ? "scale(1.16)" : "scale(1)",
                display: "inline-block",
              }}
            >
              {w.text}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const MusicLayer: React.FC<{ music: MusicConfig }> = ({ music }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const tSec = frame / fps;

  let volume = music.baseVolume;
  for (const seg of music.duckSegments) {
    if (tSec >= seg.start && tSec <= seg.end) {
      volume = music.duckVolume;
    } else if (tSec >= seg.start - 0.2 && tSec < seg.start) {
      volume = music.baseVolume + (music.duckVolume - music.baseVolume) * ((tSec - (seg.start - 0.2)) / 0.2);
    } else if (tSec > seg.end && tSec <= seg.end + 0.3) {
      volume = music.duckVolume + (music.baseVolume - music.duckVolume) * ((tSec - seg.end) / 0.3);
    }
  }

  return <Audio src={staticFile(music.src)} volume={volume} />;
};

export const Teaser: React.FC = () => {
  const { shots, endCard, textOverlays, narrations, captions, music } = teaserData;
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ background: "#0b0f14" }}>
      {shots.map((shot) => (
        <ShotLayer key={shot.id} shot={shot} />
      ))}

      <EndCardLayer endCard={endCard} />

      {textOverlays.map((ov) => (
        <TextOverlayLayer key={ov.id} overlay={ov} />
      ))}

      {captions.map((cap) => (
        <CaptionLayer key={cap.id} caption={cap} />
      ))}

      {narrations.map((n) => (
        <Sequence key={n.id} from={Math.round(n.start * fps)}>
          <Audio src={staticFile(n.src)} />
        </Sequence>
      ))}

      <MusicLayer music={music} />

      <Img
        src={staticFile("episode4/watermark.png")}
        style={{ position: "absolute", top: 50, right: 40, width: 150, opacity: 0.4 }}
      />
    </AbsoluteFill>
  );
};
