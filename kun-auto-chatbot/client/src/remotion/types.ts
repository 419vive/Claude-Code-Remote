/**
 * Shared types for Remotion compositions
 */
export interface VehicleVideoProps {
  title: string;
  brand: string;
  model: string;
  modelYear?: string;
  price: string;
  mileage?: string;
  transmission?: string;
  fuelType?: string;
  color?: string;
  displacement?: string;
  photoUrls: string[];
  dealerName?: string;
  dealerPhone?: string;
  dealerAddress?: string;
  lineUrl?: string;
  /** URL to background music audio file (mp3/wav). Optional — plays under the video */
  musicUrl?: string;
  /** 0–1 volume for background music. Default 0.3 */
  musicVolume?: number;
}

export const KUNJIA_BRAND = {
  name: "崑家汽車",
  founder: "賴崑家",
  phone: "0936-812-818",
  address: "高雄市三民區大順二路269號",
  hours: "週一至週六 09:00–21:00",
  lineUrl: "https://page.line.me/825oftez",
  gold: "#C4A265",
  darkBg: "#0a0a0a",
  white: "#ffffff",
};

/**
 * Podcast composition types (EP01+).
 *
 * Shape is driven by scripts/podcast/episodes/<ep>/script.json +
 * scripts/podcast/episodes/<ep>/voices/timing.json. The PodcastRoadRage
 * composition renders ANY episode matching this schema — the filename is
 * historical, it is not road-rage-specific.
 */

export interface PodcastHost {
  name: string;
  gender: "male" | "female";
  voiceName: string;
  persona: string;
  color: string;
  /** Optional URL to a generated portrait image. Falls back to placeholder. */
  portraitUrl?: string;
}

export interface PodcastChapter {
  id: string;
  title: string;
  startSec: number;
  lines: { speaker: "kai" | "wen"; text: string; estSec: number }[];
}

export interface PodcastMusicCue {
  file: string;
  volumeIntro: number;
  volumeBody: number;
  volumeOutro: number;
  fadeInFrames: number;
  fadeOutFrames: number;
}

export interface PodcastScript {
  episodeId: string;
  title: string;
  subtitle: string;
  language: string;
  estimatedDurationSec: number;
  hosts: Record<"kai" | "wen", PodcastHost>;
  chapters: PodcastChapter[];
  cta: {
    title: string;
    subtitle: string;
    phone: string;
    line: string;
    address: string;
  };
  musicCue?: PodcastMusicCue;
}

export interface PodcastTimingLine {
  index: number;
  speaker: "kai" | "wen";
  speakerName: string;
  text: string;
  wav: string;
  startMs: number;
  durationMs: number;
  chapterId: string;
}

export interface PodcastTiming {
  episodeId: string;
  model: string;
  sampleRate: number;
  totalDurationMs: number;
  totalDurationSec: number;
  gapMsBetweenLines: number;
  lines: PodcastTimingLine[];
}

export interface PodcastFeaturedVehicle {
  brand: string;
  model: string;
  modelYear?: string;
  priceDisplay?: string;
  photoUrls: string[];
}

export interface PodcastVideoProps {
  script: PodcastScript;
  timing: PodcastTiming;
  /** Absolute URL to the concatenated voice track (file:// or http). */
  audioUrl?: string;
  featuredVehicle?: PodcastFeaturedVehicle;
}
