import { Composition } from "remotion";
import { VehicleShowcase } from "./compositions/VehicleShowcase";
import { VehicleCard } from "./compositions/VehicleCard";
import { PodcastRoadRage } from "./compositions/PodcastRoadRage";
import type { VehicleVideoProps, PodcastVideoProps } from "./types";

const defaultProps: VehicleVideoProps = {
  title: "Toyota Camry 2023",
  brand: "Toyota",
  model: "Camry",
  modelYear: "2023",
  price: "58.8",
  mileage: "32,000",
  transmission: "自排",
  fuelType: "汽油",
  color: "白色",
  displacement: "2,000",
  photoUrls: [
    "https://placehold.co/1280x720/1a1a1a/C4A265?text=崑家汽車+Photo+1",
    "https://placehold.co/1280x720/1a1a1a/C4A265?text=崑家汽車+Photo+2",
    "https://placehold.co/1280x720/1a1a1a/C4A265?text=崑家汽車+Photo+3",
    "https://placehold.co/1280x720/1a1a1a/C4A265?text=崑家汽車+Photo+4",
  ],
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Use Case 6: Landscape showcase for website embed */}
      <Composition
        id="VehicleShowcase"
        component={VehicleShowcase}
        durationInFrames={450}
        fps={30}
        width={1280}
        height={720}
        defaultProps={defaultProps}
      />

      {/* Use Case 7: Vertical card for LINE/IG/TikTok sharing */}
      <Composition
        id="VehicleCard"
        component={VehicleCard}
        durationInFrames={150}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={defaultProps}
      />

      {/*
        Use Case 8: Podcast episodes — driven by scripts/podcast/episodes/<ep>.
        durationInFrames is a placeholder; render-podcast.ts overrides it
        at render time using the real TTS timing.json total duration.
      */}
      <Composition
        id="Podcast"
        component={PodcastRoadRage}
        durationInFrames={9000}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={podcastPlaceholderProps}
        calculateMetadata={({ props }) => {
          const totalMs = (props as PodcastVideoProps).timing?.totalDurationMs ?? 300000;
          return { durationInFrames: Math.ceil((totalMs / 1000) * 30) };
        }}
      />
    </>
  );
};

// Minimal no-op props so the Remotion Studio preview doesn't crash when
// no real episode is loaded. The render pipeline always passes real props.
const podcastPlaceholderProps: PodcastVideoProps = {
  script: {
    episodeId: "placeholder",
    title: "Podcast Preview",
    subtitle: "Run scripts/podcast/render-podcast.ts with a real episode",
    language: "cmn-TW",
    estimatedDurationSec: 10,
    hosts: {
      kai: { name: "阿凱", gender: "male", voiceName: "Puck", persona: "主持人", color: "#C4A265" },
      wen: { name: "小雯", gender: "female", voiceName: "Kore", persona: "心理學專家", color: "#E8B4D4" },
    },
    chapters: [{ id: "placeholder", title: "Placeholder", startSec: 0, lines: [] }],
    cta: {
      title: "崑家汽車",
      subtitle: "認證實車 · 高雄",
      phone: "0936-812-818",
      line: "https://page.line.me/825oftez",
      address: "高雄市三民區大順二路269號",
    },
  },
  timing: {
    episodeId: "placeholder",
    model: "none",
    sampleRate: 24000,
    totalDurationMs: 10000,
    totalDurationSec: 10,
    gapMsBetweenLines: 180,
    lines: [],
  },
};
