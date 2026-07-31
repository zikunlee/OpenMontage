import {
  AbsoluteFill,
  Audio,
  Img,
  Loop,
  OffthreadVideo,
  Sequence,
  staticFile,
  useVideoConfig,
} from "remotion";

const VIDEO_SRC = staticFile("demo/sc16_animated.mp4");
const NARRATION_SRC = staticFile("demo/narration_s26.wav");
const WATERMARK_SRC = staticFile("demo/watermark.png");

const CAPTION_TEXT =
  "The two princesses walked back through the garden together, laughing and chatting, the crown gleaming with every step.";

export const EpisodeLoopDemo: React.FC = () => {
  const { fps, durationInFrames } = useVideoConfig();
  // Native clip length: 5.875s at the source's own frame rate, expressed in
  // this composition's 30fps frame count.
  const loopUnitFrames = Math.round(5.875 * fps);

  return (
    <AbsoluteFill style={{ background: "#0b0f14" }}>
      {/* Background: real AI-animated clip, looped natively by Remotion to
          fill the entire scene duration — no manual repeat math, no
          crossfade seams, no track-index juggling. */}
      <Loop durationInFrames={loopUnitFrames}>
        <OffthreadVideo
          src={VIDEO_SRC}
          muted
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </Loop>

      {/* Caption, matching the episode's established style. */}
      <AbsoluteFill
        style={{
          alignItems: "flex-end",
          justifyContent: "center",
          paddingBottom: 64,
          paddingLeft: 100,
          paddingRight: 100,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            display: "inline-block",
            maxWidth: 1500,
            textAlign: "center",
            fontFamily: "Poppins, sans-serif",
            fontWeight: 600,
            fontSize: 56,
            lineHeight: 1.3,
            color: "#FFFFFF",
            WebkitTextStroke: "2px #4A2E22",
            textShadow: "0 2px 4px #4A2E22, 0 0 24px rgba(74,46,34,0.6)",
            background: "rgba(0,0,0,0.33)",
            borderRadius: 24,
            padding: "12px 36px",
          }}
        >
          {CAPTION_TEXT}
        </div>
      </AbsoluteFill>

      {/* Watermark, top-right, matching the standing production rule. */}
      <Img
        src={WATERMARK_SRC}
        style={{
          position: "absolute",
          top: 40,
          right: 40,
          width: 192,
          opacity: 0.4,
        }}
      />

      {/* Narration */}
      <Sequence from={Math.round(0.3 * fps)}>
        <Audio src={NARRATION_SRC} />
      </Sequence>
    </AbsoluteFill>
  );
};
