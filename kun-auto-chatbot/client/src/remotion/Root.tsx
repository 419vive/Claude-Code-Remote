import { Composition } from "remotion";
import { VehicleShowcase } from "./compositions/VehicleShowcase";
import { VehicleCard } from "./compositions/VehicleCard";
import { CinematicAd, type CinematicAdProps } from "./compositions/CinematicAd";
import type { VehicleVideoProps } from "./types";

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

const defaultCinematicProps: CinematicAdProps = {
  title: "Toyota Camry 2023",
  price: "58.8",
  scenes: [
    {
      videoUrl: "",
      imageUrl: "https://placehold.co/1920x1080/1a1a1a/C4A265?text=Scene+1",
      durationSec: 8,
      description: "Opening scene",
    },
    {
      videoUrl: "",
      imageUrl: "https://placehold.co/1920x1080/1a1a1a/C4A265?text=Scene+2",
      durationSec: 7,
      description: "Middle scene",
    },
    {
      videoUrl: "",
      imageUrl: "https://placehold.co/1920x1080/1a1a1a/C4A265?text=Scene+3",
      durationSec: 8,
      description: "Closing scene",
    },
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

      {/* Use Case 8: Cinematic multi-scene ad for YouTube */}
      <Composition
        id="CinematicAd"
        component={CinematicAd}
        durationInFrames={30 * 307} /* ~5 min: 3s title + 300s scenes + 4s CTA */
        fps={30}
        width={1920}
        height={1080}
        defaultProps={defaultCinematicProps}
      />
    </>
  );
};
