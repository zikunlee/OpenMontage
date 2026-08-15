import raw from "./data.json";

export interface SceneAnim {
  scaleFrom: number;
  scaleTo: number;
  xFrom: number;
  xTo: number;
}

export interface Scene {
  id: string;
  start: number;
  duration: number;
  src: string;
  anim: SceneAnim;
  fadeInDuration: number;
  fadeOutDuration: number | null;
  fadeOutAt: number | null;
}

export interface VideoInsert {
  id: string;
  src: string;
  start: number;
  duration: number;
  fadeInDuration: number;
  fadeOutDuration: number;
  fadeOutAt: number;
}

export interface EndStill {
  id: string;
  src: string;
  start: number;
  fadeInDuration: number;
  fadeOutDuration: number | null;
  fadeOutAt: number | null;
}

export interface GeminiLoop {
  id: string;
  src: string;
  start: number;
  duration: number;
  clipDuration: number;
  fadeInDuration: number;
  fadeOutDuration: number | null;
  fadeOutAt: number | null;
}

export interface CaptionWord {
  text: string;
  start: number;
  end: number;
}

export interface Caption {
  id: string;
  start: number;
  end: number;
  words: CaptionWord[];
}

export interface Narration {
  id: string;
  src: string;
  start: number;
  duration: number;
}

export interface DuckKeyframe {
  time: number;
  volume: number;
  duration: number;
}

export interface MusicConfig {
  src: string;
  start: number;
  duration: number;
  baseVolume: number;
  duckKeyframes: DuckKeyframe[];
  fadeInVolume: number;
  fadeInDuration: number;
  fadeOutAt: number;
  fadeOutDuration: number;
}

export interface Intro {
  bgSrc: string;
  seriesTitle: string;
  episodeTitle: string;
  storyText: string;
  narrationSrc: string;
  narrationStart: number;
  titleFadeInAt: number;
  storyFadeInAt: number;
  duration: number;
  fadeOutAt: number;
  fadeOutDuration: number;
}

export interface Episode4Data {
  totalDuration: number;
  introDuration: number;
  intro: Intro;
  scenes: Scene[];
  videos: VideoInsert[];
  endStills: EndStill[];
  geminiLoops: GeminiLoop[];
  captions: Caption[];
  narrations: Narration[];
  music: MusicConfig;
  fadeBlackIn: { start: number; duration: number };
  fadeBlackOut: { start: number; duration: number };
}

export const episode4Data = raw as unknown as Episode4Data;

interface VolumeSegment {
  fromTime: number;
  toTime: number;
  fromValue: number;
  toValue: number;
}

export function buildMusicSegments(music: MusicConfig): VolumeSegment[] {
  const segments: VolumeSegment[] = [];
  segments.push({ fromTime: 0, toTime: music.fadeInDuration, fromValue: 0, toValue: music.fadeInVolume });
  let prevEndValue = music.fadeInVolume;
  for (const kf of music.duckKeyframes) {
    const endTime = kf.time + kf.duration;
    segments.push({ fromTime: kf.time, toTime: endTime, fromValue: prevEndValue, toValue: kf.volume });
    prevEndValue = kf.volume;
  }
  segments.push({
    fromTime: music.fadeOutAt,
    toTime: music.fadeOutAt + music.fadeOutDuration,
    fromValue: prevEndValue,
    toValue: 0,
  });
  return segments;
}

function sineInOut(t: number): number {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

export function volumeAtTime(t: number, segments: VolumeSegment[]): number {
  if (t <= segments[0].fromTime) return segments[0].fromValue;
  for (const seg of segments) {
    if (t >= seg.fromTime && t <= seg.toTime) {
      const progress = seg.toTime === seg.fromTime ? 1 : (t - seg.fromTime) / (seg.toTime - seg.fromTime);
      return seg.fromValue + (seg.toValue - seg.fromValue) * sineInOut(progress);
    }
  }
  let last = segments[0].fromValue;
  for (const seg of segments) {
    if (seg.fromTime <= t) last = seg.toValue;
  }
  return last;
}
