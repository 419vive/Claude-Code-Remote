import {
  AbsoluteFill,
  Audio,
  Img,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { VehicleVideoProps } from "../types";
import { KUNJIA_BRAND } from "../types";

/**
 * VehicleCard — 5-second shareable video card for LINE / WeChat / IG Stories
 * Compact, auto-loop friendly, vertical 1080x1920
 *
 * Timeline (150 frames at 30fps = 5 seconds):
 *   0–30   Photo zoom in + brand badge
 *   31–90  Title + price animate in
 *   91–120 Spec chips appear
 *   121–150 CTA + phone pulse
 */

export const VehicleCard: React.FC<VehicleVideoProps> = ({
  title,
  brand,
  model,
  modelYear,
  price,
  mileage,
  transmission,
  fuelType,
  photoUrls,
  musicUrl,
  musicVolume = 0.35,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enterSpring = spring({ frame, fps, config: { damping: 20, stiffness: 100 } });
  const photo = photoUrls[0] || "";

  const specs = [
    modelYear && `${modelYear}年`,
    mileage,
    transmission,
    fuelType,
  ].filter(Boolean);

  return (
    <AbsoluteFill style={{
      backgroundColor: KUNJIA_BRAND.darkBg,
      fontFamily: "'Noto Sans TC', sans-serif",
    }}>
      {/* Background music — fade in/out */}
      {musicUrl && (
        <Audio
          src={musicUrl}
          volume={interpolate(frame, [0, 10, 130, 150], [0, musicVolume, musicVolume, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}
        />
      )}

      {/* Background photo — slow zoom */}
      {photo && (
        <Img
          src={photo}
          style={{
            width: "100%",
            height: "70%",
            objectFit: "cover",
            transform: `scale(${interpolate(frame, [0, 150], [1, 1.1])})`,
          }}
        />
      )}

      {/* Gradient overlay */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
        background: "linear-gradient(transparent 30%, rgba(0,0,0,0.95) 70%)",
      }} />

      {/* Top badge */}
      <div style={{
        position: "absolute", top: 40, left: 30,
        backgroundColor: KUNJIA_BRAND.gold, color: "#000",
        fontSize: 20, fontWeight: 700, padding: "6px 18px", borderRadius: 25,
        opacity: interpolate(frame, [0, 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
      }}>
        崑家汽車
      </div>

      {/* Status badge */}
      <div style={{
        position: "absolute", top: 40, right: 30,
        backgroundColor: "rgba(6,199,85,0.9)", color: "#fff",
        fontSize: 18, fontWeight: 600, padding: "6px 16px", borderRadius: 25,
        opacity: interpolate(frame, [5, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
      }}>
        現車在庫
      </div>

      {/* Bottom content area */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        padding: "0 30px 60px",
      }}>
        {/* Title */}
        <div style={{
          color: "#fff", fontSize: 44, fontWeight: 800, lineHeight: 1.2, marginBottom: 12,
          opacity: interpolate(frame, [30, 50], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          transform: `translateY(${interpolate(frame, [30, 50], [25, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px)`,
        }}>
          {title}
        </div>

        {/* Price */}
        <div style={{
          marginBottom: 20,
          opacity: interpolate(frame, [40, 60], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          transform: `translateX(${interpolate(frame, [40, 60], [-30, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px)`,
        }}>
          <span style={{
            backgroundColor: KUNJIA_BRAND.gold, color: "#000",
            fontSize: 40, fontWeight: 800, padding: "8px 24px", borderRadius: 14,
          }}>
            {price}萬
          </span>
        </div>

        {/* Spec chips */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 24 }}>
          {specs.map((spec, i) => (
            <div key={spec} style={{
              backgroundColor: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)",
              color: "#fff", fontSize: 20, padding: "6px 16px", borderRadius: 25,
              opacity: interpolate(frame, [60 + i * 8, 75 + i * 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
            }}>
              {spec}
            </div>
          ))}
        </div>

        {/* CTA bar */}
        <div style={{
          display: "flex", gap: 12,
          opacity: interpolate(frame, [90, 110], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          transform: `translateY(${interpolate(frame, [90, 110], [20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px)`,
        }}>
          <div style={{
            flex: 1, backgroundColor: KUNJIA_BRAND.gold, color: "#000",
            fontSize: 22, fontWeight: 700, padding: "12px 0", borderRadius: 14,
            textAlign: "center",
          }}>
            LINE 預約看車
          </div>
          <div style={{
            flex: 1, backgroundColor: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.3)",
            color: "#fff", fontSize: 22, fontWeight: 600, padding: "12px 0", borderRadius: 14,
            textAlign: "center",
          }}>
            📞 {KUNJIA_BRAND.phone}
          </div>
        </div>

        {/* Address */}
        <div style={{
          color: "rgba(255,255,255,0.35)", fontSize: 16, textAlign: "center", marginTop: 16,
          opacity: interpolate(frame, [100, 120], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}>
          {KUNJIA_BRAND.address} · {KUNJIA_BRAND.hours}
        </div>
      </div>
    </AbsoluteFill>
  );
};
