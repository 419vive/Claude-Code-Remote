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
 * VehicleShowcase — 15-second vehicle showcase video
 * Designed for embedding on vehicle detail pages via @remotion/player
 *
 * Timeline:
 *   0–90    Slide 1: Hero photo + title + price reveal
 *   91–180  Slide 2: Photo #2 + specs overlay
 *   181–270 Slide 3: Photo #3 + photo #4 split
 *   271–360 Slide 4: Contact info + CTA
 *   361–450 Slide 5: Logo + phone
 */

const FPS = 30;
const SLIDE_FRAMES = 90; // 3 seconds per slide

export const VehicleShowcase: React.FC<VehicleVideoProps> = ({
  title,
  brand,
  model,
  modelYear,
  price,
  mileage,
  transmission,
  fuelType,
  color,
  displacement,
  photoUrls,
  musicUrl,
  musicVolume = 0.3,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const slideIndex = Math.floor(frame / SLIDE_FRAMES);
  const slideFrame = frame % SLIDE_FRAMES;

  // Smooth entrance spring
  const enterSpring = spring({ frame: slideFrame, fps, config: { damping: 30, stiffness: 120 } });

  // Photo fallback
  const photo = (idx: number) => photoUrls[idx % photoUrls.length] || "";

  const specs = [
    modelYear && `${modelYear}年`,
    mileage && `${mileage}km`,
    transmission,
    fuelType,
    displacement && `${displacement}cc`,
    color,
  ].filter(Boolean);

  return (
    <AbsoluteFill style={{ backgroundColor: KUNJIA_BRAND.darkBg, fontFamily: "'Noto Sans TC', sans-serif" }}>

      {/* ── Background music ── */}
      {musicUrl && (
        <Audio
          src={musicUrl}
          volume={interpolate(frame, [0, 15, 420, 450], [0, musicVolume, musicVolume, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}
        />
      )}

      {/* ── Slide 1: Hero + Price ── */}
      {slideIndex === 0 && (
        <AbsoluteFill>
          {photo(0) && (
            <Img
              src={photo(0)}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transform: `scale(${interpolate(slideFrame, [0, SLIDE_FRAMES], [1.05, 1])})`,
              }}
            />
          )}
          {/* Dark gradient overlay */}
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0, height: "60%",
            background: "linear-gradient(transparent, rgba(0,0,0,0.85))",
          }} />
          {/* Title */}
          <div style={{
            position: "absolute", bottom: 120, left: 40, right: 40,
            opacity: enterSpring,
            transform: `translateY(${interpolate(enterSpring, [0, 1], [30, 0])}px)`,
          }}>
            <div style={{ color: KUNJIA_BRAND.gold, fontSize: 24, fontWeight: 600, marginBottom: 8 }}>
              {KUNJIA_BRAND.name}
            </div>
            <div style={{ color: "#fff", fontSize: 42, fontWeight: 700, lineHeight: 1.2 }}>
              {title}
            </div>
          </div>
          {/* Price tag — reveals with delay */}
          <div style={{
            position: "absolute", bottom: 40, left: 40,
            opacity: interpolate(slideFrame, [20, 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
            transform: `translateX(${interpolate(slideFrame, [20, 40], [-20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px)`,
          }}>
            <span style={{
              backgroundColor: KUNJIA_BRAND.gold, color: "#000", fontSize: 36, fontWeight: 800,
              padding: "8px 24px", borderRadius: 12,
            }}>
              {price}萬
            </span>
          </div>
        </AbsoluteFill>
      )}

      {/* ── Slide 2: Photo #2 + Specs ── */}
      {slideIndex === 1 && (
        <AbsoluteFill>
          {photo(1) && (
            <Img
              src={photo(1)}
              style={{
                width: "100%", height: "100%", objectFit: "cover",
                transform: `scale(${interpolate(slideFrame, [0, SLIDE_FRAMES], [1, 1.05])})`,
              }}
            />
          )}
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0, height: "50%",
            background: "linear-gradient(transparent, rgba(0,0,0,0.9))",
          }} />
          {/* Spec chips */}
          <div style={{
            position: "absolute", bottom: 40, left: 40, right: 40,
            display: "flex", flexWrap: "wrap", gap: 12,
          }}>
            {specs.map((spec, i) => (
              <div key={spec} style={{
                backgroundColor: "rgba(196,162,101,0.2)", border: "1px solid rgba(196,162,101,0.4)",
                color: KUNJIA_BRAND.gold, fontSize: 22, padding: "8px 20px", borderRadius: 30,
                opacity: interpolate(slideFrame, [10 + i * 5, 20 + i * 5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
                transform: `translateY(${interpolate(slideFrame, [10 + i * 5, 20 + i * 5], [15, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px)`,
              }}>
                {spec}
              </div>
            ))}
          </div>
        </AbsoluteFill>
      )}

      {/* ── Slide 3: Photos 3 & 4 split ── */}
      {slideIndex === 2 && (
        <AbsoluteFill>
          <div style={{ display: "flex", width: "100%", height: "100%" }}>
            {photo(2) && (
              <Img src={photo(2)} style={{
                width: "50%", height: "100%", objectFit: "cover",
                clipPath: `inset(0 ${interpolate(slideFrame, [0, 20], [100, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}% 0 0)`,
              }} />
            )}
            {photo(3) && (
              <Img src={photo(3)} style={{
                width: "50%", height: "100%", objectFit: "cover",
                clipPath: `inset(0 0 0 ${interpolate(slideFrame, [10, 30], [100, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}%)`,
              }} />
            )}
          </div>
          {/* Photo count badge */}
          <div style={{
            position: "absolute", bottom: 30, right: 30,
            backgroundColor: "rgba(0,0,0,0.7)", color: "#fff",
            padding: "8px 16px", borderRadius: 20, fontSize: 18,
            opacity: enterSpring,
          }}>
            📷 共 {photoUrls.length} 張實車照
          </div>
        </AbsoluteFill>
      )}

      {/* ── Slide 4: Guarantees + CTA ── */}
      {slideIndex === 3 && (
        <AbsoluteFill style={{
          background: `linear-gradient(135deg, ${KUNJIA_BRAND.darkBg}, #1a1a1a)`,
          display: "flex", flexDirection: "column", justifyContent: "center", padding: 50,
        }}>
          <div style={{
            color: KUNJIA_BRAND.gold, fontSize: 28, marginBottom: 30,
            opacity: enterSpring,
          }}>
            為什麼選崑家？
          </div>
          {["🛡️ 第三方認證・安心購買", "💰 超強貸款・輕鬆入手", "🚗 外縣市免費高鐵接駁", "⚡ 最快當天交車", "🔄 舊車高價收購"].map((item, i) => (
            <div key={item} style={{
              color: "#fff", fontSize: 26, marginBottom: 16,
              opacity: interpolate(slideFrame, [10 + i * 8, 20 + i * 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
              transform: `translateX(${interpolate(slideFrame, [10 + i * 8, 20 + i * 8], [-30, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px)`,
            }}>
              {item}
            </div>
          ))}
        </AbsoluteFill>
      )}

      {/* ── Slide 5: Contact + Logo ── */}
      {slideIndex >= 4 && (
        <AbsoluteFill style={{
          background: `linear-gradient(135deg, #1a1a1a, ${KUNJIA_BRAND.darkBg})`,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            fontSize: 48, fontWeight: 800, color: KUNJIA_BRAND.gold, marginBottom: 20,
            opacity: enterSpring,
            transform: `scale(${interpolate(enterSpring, [0, 1], [0.8, 1])})`,
          }}>
            崑家汽車
          </div>
          <div style={{ color: "#fff", fontSize: 22, marginBottom: 8, opacity: enterSpring }}>
            {title} — {price}萬
          </div>
          <div style={{
            color: "rgba(255,255,255,0.6)", fontSize: 20, marginBottom: 30, opacity: enterSpring,
          }}>
            {KUNJIA_BRAND.address}
          </div>
          {/* Phone CTA */}
          <div style={{
            backgroundColor: KUNJIA_BRAND.gold, color: "#000", fontSize: 30, fontWeight: 700,
            padding: "14px 40px", borderRadius: 16,
            opacity: interpolate(slideFrame, [15, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
            transform: `translateY(${interpolate(slideFrame, [15, 30], [20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px)`,
          }}>
            📞 {KUNJIA_BRAND.phone}
          </div>
          <div style={{
            color: "rgba(255,255,255,0.4)", fontSize: 16, marginTop: 20, opacity: enterSpring,
          }}>
            LINE 預約看車 → 立即諮詢
          </div>
        </AbsoluteFill>
      )}

      {/* ── Persistent top-right logo watermark ── */}
      <div style={{
        position: "absolute", top: 20, right: 20,
        backgroundColor: "rgba(0,0,0,0.5)", color: KUNJIA_BRAND.gold,
        fontSize: 14, padding: "4px 12px", borderRadius: 8,
        backdropFilter: "blur(4px)",
      }}>
        崑家汽車
      </div>
    </AbsoluteFill>
  );
};
