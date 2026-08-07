import raw from "./data.json";

export interface Shot {
  id: string;
  type: "video" | "image";
  src: string;
  start: number;
  duration: number;
  sourceOffset?: number;
}

export interface EndCard {
  bgSrc: string;
  start: number;
  duration: number;
  ctaText: string;
}

export interface TextOverlay {
  id: string;
  text: string;
  start: number;
  end: number;
}

export interface Narration {
  id: string;
  src: string;
  start: number;
  duration: number;
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

export interface DuckSegment {
  start: number;
  end: number;
}

export interface MusicConfig {
  src: string;
  baseVolume: number;
  duckVolume: number;
  duckSegments: DuckSegment[];
}

export interface TeaserData {
  totalDuration: number;
  shots: Shot[];
  endCard: EndCard;
  textOverlays: TextOverlay[];
  narrations: Narration[];
  captions: Caption[];
  music: MusicConfig;
}

export const teaserData = raw as unknown as TeaserData;
