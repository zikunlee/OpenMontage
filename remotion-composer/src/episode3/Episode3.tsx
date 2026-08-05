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
  episode3Data,
  buildMusicSegments,
  volumeAtTime,
  type Scene,
  type VideoInsert,
  type Caption,
} from "./data";

function sineInOut(t: number): number {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}
function powerOut(t: number): number {
  return 1 - (1 - t) * (1 - t);
}
function powerIn(t: number): number {
  return t * t;
}
function clamp01(t: number): number {
  return Math.max(0, Math.min(1, t));
}

function fadeOpacity(
  tSec: number,
  start: number,
  fadeInDuration: number,
  fadeOutAt: number | null,
  fadeOutDuration: number | null
): number {
  if (tSec < start) return 0;
  const inProgress = clamp01((tSec - start) / fadeInDuration);
  let opacity = powerOut(inProgress);
  if (fadeOutAt !== null && fadeOutDuration !== null) {
    if (tSec >= fadeOutAt) {
      const outProgress = clamp01((tSec - fadeOutAt) / fadeOutDuration);
      opacity = Math.min(opacity, 1 - powerIn(outProgress));
    }
  }
  return opacity;
}

// Ken Burns travel completes within this window, then holds — so even a
// long (20-30s) shot reads as clearly moving instead of crawling too slowly
// to notice.
const KEN_BURNS_TRAVEL_SECONDS = 9;

const SceneLayer: React.FC<{ scene: Scene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const tSec = frame / fps;
  const travelDuration = Math.min(scene.duration, KEN_BURNS_TRAVEL_SECONDS);
  const progress = clamp01((tSec - scene.start) / travelDuration);
  const eased = sineInOut(progress);
  const scale = scene.anim.scaleFrom + (scene.anim.scaleTo - scene.anim.scaleFrom) * eased;
  const x = scene.anim.xFrom + (scene.anim.xTo - scene.anim.xFrom) * eased;
  const opacity = fadeOpacity(
    tSec,
    scene.start,
    scene.fadeInDuration,
    scene.fadeOutAt,
    scene.fadeOutDuration
  );

  return (
    <AbsoluteFill style={{ opacity, overflow: "hidden" }}>
      <Img
        src={staticFile(`episode3/images/${scene.src}`)}
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `translate(-50%, -50%) scale(${scale}) translateX(${x}%)`,
        }}
      />
    </AbsoluteFill>
  );
};

const VideoLayer: React.FC<{ video: VideoInsert }> = ({ video }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const tSec = frame / fps;
  const opacity = fadeOpacity(
    tSec,
    video.start,
    video.fadeInDuration,
    video.fadeOutAt,
    video.fadeOutDuration
  );
  if (opacity <= 0) return null;

  return (
    <AbsoluteFill style={{ opacity }}>
      <OffthreadVideo
        src={staticFile(`episode3/videos/${video.src}`)}
        muted
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    </AbsoluteFill>
  );
};

// TikTok-style word-level captions: a short phrase is on screen at a time,
// with the currently-spoken word popping (scale + accent color) while the
// rest of the phrase stays a plain white — the classic karaoke-caption look.
const CaptionLayer: React.FC<{ caption: Caption }> = ({ caption }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const tSec = frame / fps;
  const opacity = fadeOpacity(tSec, caption.start, 0.15, caption.end, 0.2);
  if (opacity <= 0) return null;

  return (
    <AbsoluteFill
      style={{
        alignItems: "flex-end",
        justifyContent: "center",
        paddingBottom: 90,
        paddingLeft: 60,
        paddingRight: 60,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          opacity,
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "0 18px",
          maxWidth: 1000,
          textAlign: "center",
          fontFamily:
            "'Baloo 2', 'Quicksand', 'Comic Sans MS', 'Segoe UI', sans-serif",
          fontWeight: 700,
          fontSize: 42,
          lineHeight: 1.35,
          background: "rgba(74,46,34,0.4)",
          borderRadius: 28,
          padding: "10px 32px",
        }}
      >
        {caption.words.map((w, i) => {
          const active = tSec >= w.start && tSec < w.end;
          const spoken = tSec >= w.end;
          return (
            <span
              key={i}
              style={{
                color: active ? "#FFD34E" : "#FFFFFF",
                WebkitTextStroke: active ? "2px #7A4A1E" : "2px #4A2E22",
                textShadow: active
                  ? "0 2px 4px #7A4A1E, 0 0 20px rgba(255,211,78,0.7)"
                  : "0 2px 4px #4A2E22",
                transform: active ? "scale(1.14)" : "scale(1)",
                display: "inline-block",
                opacity: spoken ? 0.85 : 1,
                transition: "none",
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

const MusicLayer: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { music } = episode3Data;
  const segments = buildMusicSegments(music);

  return (
    <Audio
      src={staticFile(`episode3/music/${music.src}`)}
      volume={(f) => volumeAtTime(f / fps, segments)}
    />
  );
};

const FadeBlackLayer: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const tSec = frame / fps;
  const { fadeBlackIn, fadeBlackOut } = episode3Data;

  const inProgress = clamp01((tSec - fadeBlackIn.start) / fadeBlackIn.duration);
  const inOpacity = 1 - powerOut(inProgress);

  const outProgress = clamp01((tSec - fadeBlackOut.start) / fadeBlackOut.duration);
  const outOpacity = powerIn(outProgress);

  const opacity = Math.max(inOpacity, outOpacity);
  if (opacity <= 0) return null;
  return <AbsoluteFill style={{ background: "#000", opacity }} />;
};

export const Episode3: React.FC = () => {
  const { scenes, videos, captions, narrations, sfx } = episode3Data;

  return (
    <AbsoluteFill style={{ background: "#0b0f14" }}>
      {/* Scenes: FLUX stills animated via Remotion Ken Burns (per-shot camera movement) */}
      {scenes.map((scene) => (
        <SceneLayer key={scene.id} scene={scene} />
      ))}

      {/* Kling comedic-beat inserts, mix-match over their fallback still */}
      {videos.map((video) => (
        <VideoLayer key={video.id} video={video} />
      ))}

      {/* TikTok-style word-level captions */}
      {captions.map((caption) => (
        <CaptionLayer key={caption.id} caption={caption} />
      ))}

      {/* Watermark, top-right, full duration, per AGENT_GUIDE policy */}
      <Img
        src={staticFile("episode3/watermark.png")}
        style={{ position: "absolute", top: 30, right: 30, width: 130, opacity: 0.4 }}
      />

      {/* Narration */}
      {narrations.map((n) => (
        <Sequence key={n.id} from={Math.round(n.start * 30)}>
          <Audio src={staticFile(`episode3/audio/${n.src}`)} />
        </Sequence>
      ))}

      {/* Music with ducking under narration, lift during the montage */}
      <MusicLayer />

      {/* Comedic SFX */}
      {sfx.map((x) => (
        <Sequence key={x.id} from={Math.round(x.start * 30)}>
          <Audio src={staticFile(`episode3/sfx/${x.src}`)} volume={x.volume} />
        </Sequence>
      ))}

      {/* Fade from/to black */}
      <FadeBlackLayer />
    </AbsoluteFill>
  );
};
