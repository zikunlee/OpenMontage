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

export interface Caption {
  id: string;
  start: number;
  fadeOutAt: number;
  text: string;
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

export interface Sfx {
  id: string;
  src: string;
  start: number;
  duration: number;
  volume: number;
}

export interface Episode2Data {
  totalDuration: number;
  scenes: Scene[];
  videos: VideoInsert[];
  captions: Caption[];
  narrations: Narration[];
  music: MusicConfig;
  sfx: Sfx[];
  fadeBlack: { start: number; duration: number };
}

export const episode2Data = raw as unknown as Episode2Data;

// --- Music volume: expand the GSAP-style duck keyframe list into evaluable
// segments, matching the exact ducking behavior authored in the HyperFrames
// composition (each segment ramps from the previous segment's end value). ---
interface VolumeSegment {
  fromTime: number;
  toTime: number;
  fromValue: number;
  toValue: number;
}

export function buildMusicSegments(music: MusicConfig): VolumeSegment[] {
  const segments: VolumeSegment[] = [];
  segments.push({
    fromTime: 0,
    toTime: music.fadeInDuration,
    fromValue: 0,
    toValue: music.fadeInVolume,
  });
  let prevEndTime = music.fadeInDuration;
  let prevEndValue = music.fadeInVolume;
  for (const kf of music.duckKeyframes) {
    const endTime = kf.time + kf.duration;
    segments.push({
      fromTime: kf.time,
      toTime: endTime,
      fromValue: prevEndValue,
      toValue: kf.volume,
    });
    prevEndTime = endTime;
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
      const progress =
        seg.toTime === seg.fromTime
          ? 1
          : (t - seg.fromTime) / (seg.toTime - seg.fromTime);
      return seg.fromValue + (seg.toValue - seg.fromValue) * sineInOut(progress);
    }
  }
  // Between segments (hold) or after the last one — use the nearest prior segment's end value.
  let last = segments[0].fromValue;
  for (const seg of segments) {
    if (seg.fromTime <= t) last = seg.toValue;
  }
  return last;
}
