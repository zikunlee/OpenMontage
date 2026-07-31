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
  episode2Data,
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

// Opacity fade-in (power1.out) then fade-out (power1.in) for a scene/caption/video
// layer, matching the GSAP tween shapes authored in the HyperFrames composition.
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

const SceneLayer: React.FC<{ scene: Scene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const tSec = frame / fps;
  const progress = clamp01((tSec - scene.start) / scene.duration);
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
        src={staticFile(`episode2/images/${scene.src}`)}
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
        src={staticFile(`episode2/videos/${video.src}`)}
        muted
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    </AbsoluteFill>
  );
};

const CaptionLayer: React.FC<{ caption: Caption }> = ({ caption }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const tSec = frame / fps;
  const opacity = fadeOpacity(tSec, caption.start, 0.3, caption.fadeOutAt, 0.3);
  if (opacity <= 0) return null;

  return (
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
          opacity,
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
        {caption.text}
      </div>
    </AbsoluteFill>
  );
};

const MusicLayer: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { music } = episode2Data;
  const segments = buildMusicSegments(music);

  return (
    <Audio
      src={staticFile(`episode2/music/${music.src}`)}
      volume={(f) => volumeAtTime(f / fps, segments)}
    />
  );
};

const FadeBlackLayer: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const tSec = frame / fps;
  const { fadeBlack } = episode2Data;
  const progress = clamp01((tSec - fadeBlack.start) / fadeBlack.duration);
  if (progress <= 0) return null;
  return (
    <AbsoluteFill style={{ background: "#000", opacity: powerIn(progress) }} />
  );
};

export const Episode2: React.FC = () => {
  const { scenes, videos, captions, narrations, sfx } = episode2Data;

  return (
    <AbsoluteFill style={{ background: "#0b0f14" }}>
      {/* Scenes: static Ken Burns images */}
      {scenes.map((scene) => (
        <SceneLayer key={scene.id} scene={scene} />
      ))}

      {/* Real AI-animated inserts: single play, dissolve to reveal the static
          scene continuing underneath (matches the approved v2 cut). */}
      {videos.map((video) => (
        <VideoLayer key={video.id} video={video} />
      ))}

      {/* Captions */}
      {captions.map((caption) => (
        <CaptionLayer key={caption.id} caption={caption} />
      ))}

      {/* Watermark, top-right, full duration */}
      <Img
        src={staticFile("episode2/watermark.png")}
        style={{ position: "absolute", top: 40, right: 40, width: 192, opacity: 0.4 }}
      />

      {/* Narration */}
      {narrations.map((n) => (
        <Sequence key={n.id} from={Math.round(n.start * 30)}>
          <Audio src={staticFile(`episode2/audio/${n.src}`)} />
        </Sequence>
      ))}

      {/* Music with ducking */}
      <MusicLayer />

      {/* SFX */}
      {sfx.map((x) => (
        <Sequence key={x.id} from={Math.round(x.start * 30)}>
          <Audio src={staticFile(`episode2/audio/${x.src}`)} volume={x.volume} />
        </Sequence>
      ))}

      {/* Fade to black */}
      <FadeBlackLayer />
    </AbsoluteFill>
  );
};
