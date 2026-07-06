import { useState, useEffect } from "react";
import { X, Play } from "lucide-react";

interface VideoShowcaseNudgeProps {
  vehicleName: string;
  delay?: number;
  onWatchClick: () => void;
}

/**
 * Floating nudge that appears after a user has been browsing a vehicle for 20s+.
 * Encourages them to watch the auto-generated showcase video.
 * Only shows once per session per vehicle.
 */
export default function VideoShowcaseNudge({
  vehicleName,
  delay = 20000,
  onWatchClick,
}: VideoShowcaseNudgeProps) {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const key = `kun-video-nudge-${vehicleName}`;
    if (sessionStorage.getItem(key)) return;

    const timer = setTimeout(() => {
      setShow(true);
      sessionStorage.setItem(key, "1");
    }, delay);

    return () => clearTimeout(timer);
  }, [delay, vehicleName]);

  if (!show || dismissed) return null;

  return (
    <div className="fixed bottom-24 md:bottom-20 right-4 z-40 max-w-[260px] animate-in slide-in-from-bottom-4 duration-500">
      <div className="rounded-2xl bg-gradient-to-br from-[#1B3A5C] to-[#0f2440] shadow-2xl border border-[#C4A265]/30 overflow-hidden">
        {/* Close button */}
        <button
          onClick={() => setDismissed(true)}
          className="absolute top-2 right-2 p-1 rounded-full hover:bg-white/10 transition-colors text-white/40 z-10"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        {/* Content */}
        <div className="px-4 py-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-[#C4A265] flex items-center justify-center flex-shrink-0">
              <Play className="w-4 h-4 text-black fill-black" />
            </div>
            <p className="text-white text-sm font-medium leading-tight">
              看 {vehicleName} 的精選影片？
            </p>
          </div>
          <p className="text-white/50 text-xs mb-3">
            15秒快速瀏覽車況・照片・規格
          </p>
          <button
            onClick={() => {
              setDismissed(true);
              onWatchClick();
            }}
            className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-[#C4A265] px-3 py-2 text-sm font-bold text-black hover:bg-[#b8963a] transition-colors"
          >
            <Play className="w-3.5 h-3.5 fill-black" />
            播放影片
          </button>
        </div>
      </div>
    </div>
  );
}
