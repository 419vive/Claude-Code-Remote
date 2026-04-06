/**
 * CinematicAd — Multi-scene cinematic vehicle ad composition.
 *
 * Renders a YouTube-ready video with:
 *   - Multiple AI-generated scene videos
 *   - Voiceover narration per scene
 *   - Background music
 *   - Smooth transitions between scenes
 *   - Opening title + closing CTA
 *
 * Designed to be rendered server-side via Remotion's Node API.
 */
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  Video,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { KUNJIA_BRAND } from "../types";

const FPS = 30;

export interface CinematicScene {
  videoUrl: string;
  imageUrl: string;
  narrationUrl?: string;
  durationSec: number;
  description: string;
}

export interface CinematicAdProps {
  /** Vehicle display name */
  title: string;
  /** Price display */
  price: string;
  /** All scenes in order */
  scenes: CinematicScene[];
  /** Background music URL */
  musicUrl?: string;
  /** Music volume 0-1 */
  musicVolume?: number;
}

/** Opening title card — 3 seconds */
const TitleCard: React.FC<{ title: string; price: string }> = ({ title, price }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enterSpring = spring({ frame, fps, config: { damping: 30, stiffness: 100 } });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Noto Sans TC', sans-serif",
      }}
    >
      {/* Brand */}
      <div
        style={{
          color: KUNJIA_BRAND.gold,
          fontSize: 28,
          fontWeight: 600,
          letterSpacing: 8,
          marginBottom: 20,
          opacity: enterSpring,
        }}
      >
        {KUNJIA_BRAND.name}
      </div>

      {/* Vehicle Title */}
      <div
        style={{
          color: "#fff",
          fontSize: 52,
          fontWeight: 800,
          textAlign: "center",
          opacity: enterSpring,
          transform: `translateY(${interpolate(enterSpring, [0, 1], [30, 0])}px)`,
        }}
      >
        {title}
      </div>

      {/* Price */}
      <div
        style={{
          marginTop: 24,
          opacity: interpolate(frame, [30, 50], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        <span
          style={{
            backgroundColor: KUNJIA_BRAND.gold,
            color: "#000",
            fontSize: 36,
            fontWeight: 800,
            padding: "10px 30px",
            borderRadius: 12,
          }}
        >
          {price}萬
        </span>
      </div>

      {/* Subtle divider line */}
      <div
        style={{
          width: interpolate(frame, [10, 40], [0, 200], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          height: 2,
          backgroundColor: KUNJIA_BRAND.gold,
          marginTop: 30,
          opacity: 0.5,
        }}
      />
    </AbsoluteFill>
  );
};

/** Single scene with video + narration overlay */
const SceneSlide: React.FC<{
  scene: CinematicScene;
  sceneIndex: number;
}> = ({ scene, sceneIndex }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enterSpring = spring({ frame, fps, config: { damping: 30, stiffness: 120 } });

  // Fade in/out
  const totalFrames = scene.durationSec * FPS;
  const opacity = interpolate(
    frame,
    [0, 15, totalFrames - 15, totalFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill style={{ opacity }}>
      {/* Scene video (AI-generated) */}
      {scene.videoUrl ? (
        <Video
          src={scene.videoUrl}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : scene.imageUrl ? (
        <Img
          src={scene.imageUrl}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: `scale(${interpolate(frame, [0, totalFrames], [1, 1.08])})`,
          }}
        />
      ) : null}

      {/* Narration audio */}
      {scene.narrationUrl && (
        <Audio src={scene.narrationUrl} volume={0.9} />
      )}

      {/* Subtle scene number indicator */}
      <div
        style={{
          position: "absolute",
          top: 20,
          left: 20,
          backgroundColor: "rgba(0,0,0,0.4)",
          color: "rgba(255,255,255,0.3)",
          fontSize: 12,
          padding: "4px 10px",
          borderRadius: 6,
          backdropFilter: "blur(4px)",
        }}
      >
        {sceneIndex + 1}
      </div>

      {/* Bottom gradient for subtitle readability */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "30%",
          background: "linear-gradient(transparent, rgba(0,0,0,0.7))",
        }}
      />

      {/* Brand watermark */}
      <div
        style={{
          position: "absolute",
          top: 20,
          right: 20,
          backgroundColor: "rgba(0,0,0,0.5)",
          color: KUNJIA_BRAND.gold,
          fontSize: 14,
          padding: "4px 12px",
          borderRadius: 8,
          backdropFilter: "blur(4px)",
        }}
      >
        崑家汽車
      </div>
    </AbsoluteFill>
  );
};

/** Closing CTA card — 4 seconds */
const ClosingCTA: React.FC<{ title: string; price: string }> = ({ title, price }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enterSpring = spring({ frame, fps, config: { damping: 25, stiffness: 100 } });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, #1a1a1a, ${KUNJIA_BRAND.darkBg})`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Noto Sans TC', sans-serif",
      }}
    >
      <div
        style={{
          fontSize: 52,
          fontWeight: 800,
          color: KUNJIA_BRAND.gold,
          marginBottom: 16,
          opacity: enterSpring,
          transform: `scale(${interpolate(enterSpring, [0, 1], [0.8, 1])})`,
        }}
      >
        崑家汽車
      </div>

      <div style={{ color: "#fff", fontSize: 24, marginBottom: 8, opacity: enterSpring }}>
        {title} — {price}萬
      </div>

      <div
        style={{
          color: "rgba(255,255,255,0.5)",
          fontSize: 18,
          marginBottom: 30,
          opacity: enterSpring,
        }}
      >
        {KUNJIA_BRAND.address}
      </div>

      {/* Phone CTA */}
      <div
        style={{
          backgroundColor: KUNJIA_BRAND.gold,
          color: "#000",
          fontSize: 32,
          fontWeight: 700,
          padding: "16px 48px",
          borderRadius: 16,
          opacity: interpolate(frame, [20, 40], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          transform: `translateY(${interpolate(frame, [20, 40], [20, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })}px)`,
        }}
      >
        {KUNJIA_BRAND.phone}
      </div>

      <div
        style={{
          color: "rgba(255,255,255,0.4)",
          fontSize: 16,
          marginTop: 16,
          opacity: enterSpring,
        }}
      >
        LINE 預約看車 | 全台免費交車
      </div>

      {/* Subscribe hint */}
      <div
        style={{
          position: "absolute",
          bottom: 30,
          color: "rgba(255,255,255,0.3)",
          fontSize: 14,
          opacity: interpolate(frame, [40, 60], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        訂閱崑家汽車頻道，掌握最新優質車源
      </div>
    </AbsoluteFill>
  );
};

/**
 * Main CinematicAd composition.
 *
 * Timeline:
 *   [0s - 3s]      Title card
 *   [3s - ...]      Scene 1, 2, 3, ... (each scene.durationSec)
 *   [... - end]    Closing CTA (4s)
 */
export const CinematicAd: React.FC<CinematicAdProps> = ({
  title,
  price,
  scenes,
  musicUrl,
  musicVolume = 0.2,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const TITLE_DURATION = 3 * FPS; // 3 seconds
  const CTA_DURATION = 4 * FPS; // 4 seconds

  // Calculate scene start frames
  let currentFrame = TITLE_DURATION;
  const sceneStartFrames = scenes.map((scene) => {
    const start = currentFrame;
    currentFrame += scene.durationSec * FPS;
    return start;
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#000", fontFamily: "'Noto Sans TC', sans-serif" }}>
      {/* Background music — plays throughout */}
      {musicUrl && (
        <Audio
          src={musicUrl}
          volume={interpolate(
            frame,
            [0, FPS, durationInFrames - FPS * 2, durationInFrames],
            [0, musicVolume, musicVolume, 0],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          )}
        />
      )}

      {/* Title card */}
      <Sequence from={0} durationInFrames={TITLE_DURATION}>
        <TitleCard title={title} price={price} />
      </Sequence>

      {/* Scenes */}
      {scenes.map((scene, i) => (
        <Sequence
          key={i}
          from={sceneStartFrames[i]}
          durationInFrames={scene.durationSec * FPS}
        >
          <SceneSlide scene={scene} sceneIndex={i} />
        </Sequence>
      ))}

      {/* Closing CTA */}
      <Sequence
        from={durationInFrames - CTA_DURATION}
        durationInFrames={CTA_DURATION}
      >
        <ClosingCTA title={title} price={price} />
      </Sequence>
    </AbsoluteFill>
  );
};
