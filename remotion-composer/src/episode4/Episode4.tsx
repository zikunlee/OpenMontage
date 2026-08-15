import {
  AbsoluteFill,
  Audio,
  Img,
  Loop,
  OffthreadVideo,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  episode4Data,
  buildMusicSegments,
  volumeAtTime,
  type Scene,
  type VideoInsert,
  type EndStill,
  type GeminiLoop,
  type Caption,
  type Intro,
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

// Ken Burns travel completes within this window, then holds — reads as
// clearly moving even on a 20-30s shot instead of crawling unnoticeably.
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
  const opacity = fadeOpacity(tSec, scene.start, scene.fadeInDuration, scene.fadeOutAt, scene.fadeOutDuration);

  return (
    <AbsoluteFill style={{ opacity, overflow: "hidden" }}>
      <Img
        src={staticFile(`episode4/images/${scene.src}`)}
        style={{
          position: "absolute", top: "50%", left: "50%", width: "100%", height: "100%",
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
  const opacity = fadeOpacity(tSec, video.start, video.fadeInDuration, video.fadeOutAt, video.fadeOutDuration);
  if (opacity <= 0) return null;

  // OffthreadVideo seeks using the GLOBAL timeline frame unless wrapped in
  // its own Sequence — without this it requests a frame far past the clip's
  // own length and freezes on the last available frame.
  const startFrame = Math.round(video.start * fps);
  const durationFrames = Math.round(video.duration * fps) + 1;

  return (
    <AbsoluteFill style={{ opacity }}>
      <Sequence from={startFrame} durationInFrames={durationFrames}>
        <OffthreadVideo
          src={staticFile(`episode4/videos/${video.src}`)}
          muted
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </Sequence>
    </AbsoluteFill>
  );
};

// Pre-generated Gemini clips used as full shot content. Wrapped in a native
// Loop so a window longer than the clip (sc02) repeats seamlessly, while a
// window shorter than the clip (sc10) is simply cut off early by the outer
// Sequence — the same component handles both cases.
const GeminiLoopLayer: React.FC<{ loop: GeminiLoop }> = ({ loop }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const tSec = frame / fps;
  const opacity = fadeOpacity(tSec, loop.start, loop.fadeInDuration, loop.fadeOutAt, loop.fadeOutDuration);
  if (opacity <= 0) return null;

  const startFrame = Math.round(loop.start * fps);
  const durationFrames = Math.round(loop.duration * fps) + 1;
  const clipFrames = Math.round(loop.clipDuration * fps);

  return (
    <AbsoluteFill style={{ opacity }}>
      <Sequence from={startFrame} durationInFrames={durationFrames}>
        <Loop durationInFrames={clipFrames}>
          <OffthreadVideo
            src={staticFile(`episode4/videos/${loop.src}`)}
            muted
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </Loop>
      </Sequence>
    </AbsoluteFill>
  );
};

// Holds on the Kling clip's own final (trimmed) frame once the clip fades
// out, crossfading in as the video fades out — replacing a jump back to the
// FLUX still's starting pose.
const EndStillLayer: React.FC<{ endStill: EndStill }> = ({ endStill }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const tSec = frame / fps;
  const opacity = fadeOpacity(tSec, endStill.start, endStill.fadeInDuration, endStill.fadeOutAt, endStill.fadeOutDuration);
  if (opacity <= 0) return null;

  return (
    <AbsoluteFill style={{ opacity }}>
      <Img
        src={staticFile(`episode4/images/${endStill.src}`)}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    </AbsoluteFill>
  );
};

// TikTok-style word-level captions with karaoke highlight.
const CaptionLayer: React.FC<{ caption: Caption }> = ({ caption }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const tSec = frame / fps;
  const fadeDur = 0.15;
  const fadeOutAt = Math.max(caption.start + fadeDur, caption.end - fadeDur);
  const opacity = fadeOpacity(tSec, caption.start, fadeDur, fadeOutAt, fadeDur);
  if (opacity <= 0) return null;

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute", top: "80%", left: "50%", transform: "translate(-50%, -50%)",
          opacity, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "0 18px",
          maxWidth: 1000, textAlign: "center",
          fontFamily: "'Baloo 2', 'Quicksand', 'Comic Sans MS', 'Segoe UI', sans-serif",
          fontWeight: 700, fontSize: 42, lineHeight: 1.35,
          background: "rgba(74,46,34,0.4)", borderRadius: 28, padding: "10px 32px",
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
  const { fps } = useVideoConfig();
  const { music } = episode4Data;
  const segments = buildMusicSegments(music);

  return (
    <Audio
      src={staticFile(`episode4/music/${music.src}`)}
      volume={(f) => volumeAtTime(f / fps, segments)}
    />
  );
};

const FadeBlackLayer: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const tSec = frame / fps;
  const { fadeBlackIn, fadeBlackOut } = episode4Data;

  const inProgress = clamp01((tSec - fadeBlackIn.start) / fadeBlackIn.duration);
  const inOpacity = 1 - powerOut(inProgress);
  const outProgress = clamp01((tSec - fadeBlackOut.start) / fadeBlackOut.duration);
  const outOpacity = powerIn(outProgress);

  const opacity = Math.max(inOpacity, outOpacity);
  if (opacity <= 0) return null;
  return <AbsoluteFill style={{ background: "#000", opacity }} />;
};

// Opening title card: series + episode title and a short story premise, read
// aloud before the story begins, over the closing composite (all 3
// characters together).
const IntroLayer: React.FC<{ intro: Intro }> = ({ intro }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const tSec = frame / fps;

  const layerOpacity = fadeOpacity(tSec, 0, 0.3, intro.fadeOutAt, intro.fadeOutDuration);
  if (layerOpacity <= 0) return null;

  const travelDuration = Math.min(intro.duration, KEN_BURNS_TRAVEL_SECONDS);
  const progress = clamp01(tSec / travelDuration);
  const scale = 1.0 + 0.08 * sineInOut(progress);

  const titleOpacity = fadeOpacity(tSec, intro.titleFadeInAt, 0.6, null, null);
  const storyOpacity = fadeOpacity(tSec, intro.storyFadeInAt, 0.6, null, null);

  return (
    <AbsoluteFill style={{ opacity: layerOpacity, overflow: "hidden" }}>
      <Img
        src={staticFile(`episode4/images/${intro.bgSrc}`)}
        style={{
          position: "absolute", top: "50%", left: "50%", width: "100%", height: "100%",
          objectFit: "cover", transform: `translate(-50%, -50%) scale(${scale})`,
        }}
      />
      <AbsoluteFill style={{ background: "rgba(0,0,0,0.28)" }} />

      <div
        style={{
          position: "absolute", top: "12%", left: "50%", transform: "translateX(-50%)",
          opacity: titleOpacity, textAlign: "center", width: "90%",
        }}
      >
        <div
          style={{
            fontFamily: "'Baloo 2', 'Quicksand', 'Comic Sans MS', sans-serif",
            fontWeight: 800, fontSize: 62, color: "#FFE9A8",
            WebkitTextStroke: "2px #4A2E22",
            textShadow: "0 3px 6px #4A2E22, 0 0 30px rgba(74,46,34,0.7)",
          }}
        >
          {intro.seriesTitle}
        </div>
        <div
          style={{
            marginTop: 14, fontFamily: "'Baloo 2', 'Quicksand', 'Comic Sans MS', sans-serif",
            fontWeight: 600, fontStyle: "italic", fontSize: 36, color: "#FFFFFF",
            WebkitTextStroke: "1.5px #4A2E22", textShadow: "0 2px 4px #4A2E22",
          }}
        >
          {intro.episodeTitle}
        </div>
      </div>

      <div
        style={{
          position: "absolute", top: "78%", left: "50%", transform: "translate(-50%, -50%)",
          opacity: storyOpacity, maxWidth: 900, textAlign: "center",
          fontFamily: "'Baloo 2', 'Quicksand', 'Comic Sans MS', sans-serif",
          fontWeight: 700, fontStyle: "italic", fontSize: 34, lineHeight: 1.3, color: "#FFFFFF",
          WebkitTextStroke: "1.5px #4A2E22", textShadow: "0 2px 4px #4A2E22",
          background: "rgba(74,46,34,0.45)", borderRadius: 28, padding: "16px 40px",
        }}
      >
        {intro.storyText}
      </div>

      <Sequence from={Math.round(intro.narrationStart * fps)}>
        <Audio src={staticFile(`episode4/audio/${intro.narrationSrc}`)} />
      </Sequence>
    </AbsoluteFill>
  );
};

const MainStory: React.FC = () => {
  const { scenes, videos, endStills, geminiLoops, captions, narrations } = episode4Data;

  return (
    <AbsoluteFill>
      {scenes.map((scene) => (
        <SceneLayer key={scene.id} scene={scene} />
      ))}

      {endStills.map((endStill) => (
        <EndStillLayer key={endStill.id} endStill={endStill} />
      ))}

      {geminiLoops.map((loop) => (
        <GeminiLoopLayer key={loop.id} loop={loop} />
      ))}

      {videos.map((video) => (
        <VideoLayer key={video.id} video={video} />
      ))}

      {captions.map((caption) => (
        <CaptionLayer key={caption.id} caption={caption} />
      ))}

      {narrations.map((n) => (
        <Sequence key={n.id} from={Math.round(n.start * 30)}>
          <Audio src={staticFile(`episode4/audio/${n.src}`)} />
        </Sequence>
      ))}

      <MusicLayer />

      <FadeBlackLayer />
    </AbsoluteFill>
  );
};

export const Episode4: React.FC = () => {
  const { intro, introDuration, totalDuration } = episode4Data;
  const fps = 30;
  const introFrames = Math.round(introDuration * fps);
  const mainFrames = Math.round(totalDuration * fps) + 1;

  return (
    <AbsoluteFill style={{ background: "#0b0f14" }}>
      <IntroLayer intro={intro} />

      <Sequence from={introFrames} durationInFrames={mainFrames}>
        <MainStory />
      </Sequence>

      <Img
        src={staticFile("episode4/watermark.png")}
        style={{ position: "absolute", top: 30, right: 30, width: 130, opacity: 0.4 }}
      />
    </AbsoluteFill>
  );
};
