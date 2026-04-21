import {
  AbsoluteFill,
  Audio,
  Img,
  interpolate,
  spring,
  useCurrentFrame,
  staticFile,
} from "remotion";
import type { PodcastVideoProps, PodcastScript, PodcastTimingLine } from "../types";
import { KUNJIA_BRAND } from "../types";

/**
 * PodcastRoadRage — generic podcast composition driven entirely by props.
 * Despite the filename, it renders ANY episode whose script.json + timing.json
 * matches the PodcastScript / PodcastTimingLine schemas — reusable for future episodes.
 *
 * Layout (1920x1080):
 *   - Top band: branded header (logo, chapter indicator, runtime clock)
 *   - Middle: two host portraits side-by-side, active speaker glows
 *   - Bottom band: current line subtitle + vehicle photo carousel + CTA
 *
 * Timing: every visual state is derived from the `timing` prop (ms-accurate
 * from Gemini TTS output). No estSec guessing — we use real audio durations.
 */

const FPS = 30;

export const PodcastRoadRage: React.FC<PodcastVideoProps> = ({
  script,
  timing,
  audioUrl,
  featuredVehicle,
}) => {
  const frame = useCurrentFrame();

  const nowMs = Math.round((frame / FPS) * 1000);

  // Active line = timing entry where startMs <= nowMs < startMs + durationMs
  const activeIdx = timing.lines.findIndex(
    (l: PodcastTimingLine) => nowMs >= l.startMs && nowMs < l.startMs + l.durationMs
  );
  const activeLine = activeIdx >= 0 ? timing.lines[activeIdx] : null;
  const activeSpeaker = activeLine?.speaker ?? null;
  const activeChapterId = activeLine?.chapterId ?? script.chapters[0].id;
  const activeChapter = script.chapters.find((c) => c.id === activeChapterId) ?? script.chapters[0];

  const totalSec = Math.round(timing.totalDurationMs / 1000);
  const elapsedSec = Math.floor(nowMs / 1000);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: KUNJIA_BRAND.darkBg,
        fontFamily: "'Noto Sans TC', sans-serif",
        color: "#fff",
      }}
    >
      {/* ── Master audio track ── */}
      {audioUrl && <Audio src={audioUrl} />}

      {/* ── Background music (ducked under voice) ── */}
      {script.musicCue?.file && (
        <Audio
          src={staticFile(script.musicCue.file.replace(/^public\//, ""))}
          volume={(f) => {
            const totalFrames = Math.ceil((timing.totalDurationMs / 1000) * FPS);
            const intro = script.musicCue!.fadeInFrames;
            const outroStart = totalFrames - script.musicCue!.fadeOutFrames;
            if (f < intro) {
              return interpolate(f, [0, intro], [0, script.musicCue!.volumeBody], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            }
            if (f > outroStart) {
              return interpolate(f, [outroStart, totalFrames], [script.musicCue!.volumeBody, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            }
            return script.musicCue!.volumeBody;
          }}
        />
      )}

      {/* ── Ambient car-photo backdrop (slow Ken Burns, very dim) ── */}
      {featuredVehicle?.photoUrls?.length > 0 && (
        <Img
          src={featuredVehicle.photoUrls[0]}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: 0.15,
            transform: `scale(${interpolate(frame, [0, 9000], [1, 1.12], { extrapolateRight: "clamp" })})`,
            filter: "blur(2px)",
          }}
        />
      )}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(10,10,10,0.88), rgba(10,10,10,0.96))" }} />

      {/* ── TOP BAND ── */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          padding: "30px 50px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              backgroundColor: KUNJIA_BRAND.gold,
              color: "#000",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
              fontWeight: 800,
            }}
          >
            崑
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: KUNJIA_BRAND.gold }}>崑家駕駛心理學</div>
            <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)" }}>Kunjia Driving Psychology · EP01</div>
          </div>
        </div>

        {/* Chapter chip */}
        <div
          style={{
            padding: "10px 20px",
            borderRadius: 28,
            border: `1px solid ${KUNJIA_BRAND.gold}40`,
            backgroundColor: "rgba(196,162,101,0.12)",
            color: KUNJIA_BRAND.gold,
            fontSize: 18,
            fontWeight: 600,
          }}
        >
          {activeChapter.title}
        </div>

        {/* Clock */}
        <div style={{ fontSize: 18, fontWeight: 600, color: "rgba(255,255,255,0.7)", fontVariantNumeric: "tabular-nums" }}>
          {formatClock(elapsedSec)} / {formatClock(totalSec)}
        </div>
      </div>

      {/* ── TITLE CARD (first 3s only) ── */}
      {nowMs < 3000 && (
        <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10 }}>
          <div
            style={{
              textAlign: "center",
              opacity: interpolate(frame, [0, 20, 60, 90], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
              transform: `translateY(${interpolate(frame, [0, 20], [20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px)`,
            }}
          >
            <div style={{ fontSize: 28, color: KUNJIA_BRAND.gold, fontWeight: 600, marginBottom: 20 }}>EP 01</div>
            <div style={{ fontSize: 72, fontWeight: 800, color: "#fff", lineHeight: 1.2, marginBottom: 20, maxWidth: 1400, margin: "0 auto 20px" }}>
              {script.title}
            </div>
            <div style={{ fontSize: 28, color: "rgba(255,255,255,0.6)" }}>{script.subtitle}</div>
          </div>
        </AbsoluteFill>
      )}

      {/* ── HOST PORTRAITS (fade in after title) ── */}
      <div
        style={{
          position: "absolute",
          top: "18%",
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          gap: 80,
          opacity: interpolate(nowMs, [2800, 3500], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      >
        {(["kai", "wen"] as const).map((speakerKey) => {
          const host = script.hosts[speakerKey];
          const isActive = activeSpeaker === speakerKey;
          const glowSpring = isActive
            ? spring({ frame: frame, fps: FPS, config: { damping: 12, stiffness: 200 }, durationInFrames: 15 })
            : 0;
          return (
            <div
              key={speakerKey}
              style={{
                textAlign: "center",
                transform: `translateY(${isActive ? -8 : 0}px) scale(${1 + glowSpring * 0.04})`,
                transition: "transform 0.3s",
              }}
            >
              {/* Portrait frame — placeholder until real portraits generated */}
              <div
                style={{
                  width: 280,
                  height: 280,
                  borderRadius: 140,
                  background: `linear-gradient(135deg, ${host.color}, #222)`,
                  border: `${isActive ? 5 : 2}px solid ${isActive ? host.color : "rgba(255,255,255,0.2)"}`,
                  boxShadow: isActive ? `0 0 80px ${host.color}60, 0 0 40px ${host.color}80` : "0 8px 32px rgba(0,0,0,0.5)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 120,
                  fontWeight: 800,
                  color: "#fff",
                  margin: "0 auto 20px",
                  overflow: "hidden",
                }}
              >
                {/* If real portrait file exists, swap this placeholder via `portraitUrl` in script.hosts */}
                {host.portraitUrl ? (
                  <Img src={host.portraitUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  host.name.slice(0, 1)
                )}
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: isActive ? host.color : "rgba(255,255,255,0.6)" }}>
                {host.name}
              </div>
              <div style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>
                {host.persona.split(",")[0]}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── SUBTITLE PANEL ── */}
      {activeLine && (
        <div
          style={{
            position: "absolute",
            left: "50%",
            bottom: "28%",
            transform: "translateX(-50%)",
            maxWidth: 1500,
            width: "90%",
            padding: "28px 40px",
            borderRadius: 20,
            backgroundColor: "rgba(0,0,0,0.65)",
            border: `2px solid ${script.hosts[activeLine.speaker].color}40`,
            backdropFilter: "blur(8px)",
          }}
        >
          <div
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: script.hosts[activeLine.speaker].color,
              marginBottom: 10,
              letterSpacing: 1,
            }}
          >
            {script.hosts[activeLine.speaker].name.toUpperCase()}
          </div>
          <div style={{ fontSize: 34, fontWeight: 500, color: "#fff", lineHeight: 1.5 }}>
            {activeLine.text}
          </div>
        </div>
      )}

      {/* ── BOTTOM CTA BAR ── */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: "20px 50px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: "rgba(0,0,0,0.4)",
          borderTop: `1px solid ${KUNJIA_BRAND.gold}30`,
        }}
      >
        <div style={{ fontSize: 16, color: "rgba(255,255,255,0.5)" }}>
          {featuredVehicle ? `本集特別車款 · ${featuredVehicle.brand} ${featuredVehicle.model}` : script.cta.subtitle}
        </div>
        <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: KUNJIA_BRAND.gold }}>📞 {script.cta.phone}</div>
          <div style={{ fontSize: 16, color: "rgba(255,255,255,0.6)" }}>{script.cta.address}</div>
        </div>
      </div>

      {/* ── END CARD (last 8 seconds) ── */}
      {nowMs > timing.totalDurationMs - 8000 && (
        <AbsoluteFill
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(10,10,10,0.85)",
            zIndex: 20,
            opacity: interpolate(nowMs, [timing.totalDurationMs - 8000, timing.totalDurationMs - 7000], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 60, fontWeight: 800, color: KUNJIA_BRAND.gold, marginBottom: 20 }}>崑家汽車</div>
            <div style={{ fontSize: 24, color: "#fff", marginBottom: 30 }}>{script.cta.subtitle}</div>
            <div
              style={{
                display: "inline-block",
                padding: "16px 40px",
                backgroundColor: KUNJIA_BRAND.gold,
                color: "#000",
                fontSize: 28,
                fontWeight: 700,
                borderRadius: 16,
              }}
            >
              LINE 預約看車
            </div>
            <div style={{ marginTop: 24, fontSize: 18, color: "rgba(255,255,255,0.6)" }}>
              {script.cta.address} · {script.cta.phone}
            </div>
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

function formatClock(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
