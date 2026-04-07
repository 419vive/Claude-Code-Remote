import { useState, useEffect } from "react";
import { X, MessageCircle } from "lucide-react";

interface ProactiveChatTriggerProps {
  /** Delay in ms before showing the trigger */
  delay?: number;
  /** Message to display */
  message?: string;
  /** CTA label */
  ctaLabel?: string;
  /** Where to link (default: LINE) */
  ctaHref?: string;
  /** Vehicle name for context */
  vehicleName?: string;
}

/**
 * Proactive chat nudge that appears after user browses for a while.
 * Slides in from the bottom-left with a helpful suggestion.
 *
 * Only shows once per session per page to avoid annoyance.
 */
export default function ProactiveChatTrigger({
  delay = 15000,
  message,
  ctaLabel = "LINE 問問阿家",
  ctaHref = "https://page.line.me/825oftez",
  vehicleName,
}: ProactiveChatTriggerProps) {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const defaultMessage = vehicleName
    ? `看了 ${vehicleName} 有什麼疑問嗎？阿家幫你解答！`
    : "需要幫你算貸款或推薦適合的車嗎？";

  useEffect(() => {
    // Only show once per session
    const key = `kun-proactive-${vehicleName || "home"}`;
    if (sessionStorage.getItem(key)) return;

    const timer = setTimeout(() => {
      setShow(true);
      sessionStorage.setItem(key, "1");
    }, delay);

    return () => clearTimeout(timer);
  }, [delay, vehicleName]);

  if (!show || dismissed) return null;

  return (
    <div className="fixed bottom-24 md:bottom-20 left-4 z-40 max-w-[300px] animate-in slide-in-from-bottom-4 duration-500 ease-quart">
      <div className="rounded-2xl bg-white shadow-elevated ring-1 ring-slate-900/5 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between bg-gradient-to-br from-[#1B3A5C] to-[#13294A] px-3.5 py-2.5">
          <div className="flex items-center gap-2 text-white">
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#E0C695] to-[#C4A265] flex items-center justify-center text-[13px] font-bold text-[#13294A] ring-1 ring-white/20 shadow-sm">阿</div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#1B3A5C]" aria-hidden="true" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-[13px] font-semibold tracking-tight">高雄阿家</span>
              <span className="text-[10px] text-white/60">線上回覆中</span>
            </div>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="p-1.5 rounded-full hover:bg-white/10 ease-quart text-white/70 hover:text-white"
            aria-label="關閉提示"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        {/* Body */}
        <div className="px-4 py-3.5">
          <p className="text-[13px] text-slate-700 leading-relaxed">{message || defaultMessage}</p>
        </div>
        {/* CTA */}
        <div className="px-4 pb-3.5 flex gap-2">
          <a
            href={ctaHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-[#06C755] px-3 py-2 text-xs font-bold text-white shadow-card hover:bg-[#05b04c] hover:shadow-card-hover ease-quart active:scale-[0.98]"
          >
            <MessageCircle className="w-3.5 h-3.5" strokeWidth={2.25} />
            {ctaLabel}
          </a>
          <a
            href="/book-visit"
            className="flex items-center justify-center rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 ease-quart active:scale-[0.98]"
          >
            預約看車
          </a>
        </div>
      </div>
      {/* Speech bubble tail */}
      <div className="ml-6 w-3 h-3 bg-white ring-1 ring-slate-900/5 transform rotate-45 -mt-1.5" />
    </div>
  );
}
