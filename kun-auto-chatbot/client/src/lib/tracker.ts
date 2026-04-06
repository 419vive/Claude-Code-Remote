/**
 * Lightweight page view tracker (like Umami's script)
 * Sends page views to /api/track on navigation
 * Privacy-friendly: no cookies, no localStorage, server-side session hashing
 */

let lastPath = "";
let pageEntryTime = Date.now();

function getPageData() {
  return {
    path: window.location.pathname,
    referrer: document.referrer || undefined,
    language: navigator.language,
    screenWidth: window.screen.width,
  };
}

async function sendPageView() {
  const data = getPageData();
  if (data.path === lastPath) return; // skip duplicate
  lastPath = data.path;
  pageEntryTime = Date.now();

  try {
    await fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      keepalive: true,
    });
  } catch {
    // silently fail
  }
}

function sendDuration() {
  const duration = Math.round((Date.now() - pageEntryTime) / 1000);
  if (duration < 1 || duration > 3600) return;
  try {
    navigator.sendBeacon(
      "/api/track",
      JSON.stringify({ path: lastPath, duration })
    );
  } catch {
    // silently fail
  }
}

export function initTracker() {
  // Skip tracking for admin pages and bots
  if (window.location.pathname.startsWith("/admin")) return;
  if (/bot|crawler|spider/i.test(navigator.userAgent)) return;

  // Initial page view
  sendPageView();

  // Track phone clicks and map clicks globally via delegation
  document.addEventListener("click", (e) => {
    const link = (e.target as HTMLElement).closest("a");
    if (!link) return;
    const href = link.getAttribute("href") || "";
    if (href.startsWith("tel:")) {
      if ((window as any).fbq) (window as any).fbq("track", "Contact", { content_category: "phone_call" });
      if ((window as any).gtag) (window as any).gtag("event", "conversion", { send_to: "AW-8142635893/phone_click", event_category: "contact" });
    } else if (href.includes("maps.google") || href.includes("goo.gl/maps")) {
      if ((window as any).fbq) (window as any).fbq("track", "FindLocation");
      if ((window as any).gtag) (window as any).gtag("event", "conversion", { send_to: "AW-8142635893/map_click", event_category: "contact" });
    } else if (href.includes("page.line.me") || href.includes("line.me")) {
      if ((window as any).fbq) (window as any).fbq("track", "Contact", { content_category: "line_add" });
      if ((window as any).gtag) (window as any).gtag("event", "conversion", { send_to: "AW-8142635893/line_click", event_category: "contact" });
    }
  });

  // Track SPA navigation via History API
  const originalPushState = history.pushState;
  history.pushState = function (...args) {
    originalPushState.apply(this, args);
    setTimeout(sendPageView, 50);
  };

  const originalReplaceState = history.replaceState;
  history.replaceState = function (...args) {
    originalReplaceState.apply(this, args);
    setTimeout(sendPageView, 50);
  };

  window.addEventListener("popstate", () => {
    setTimeout(sendPageView, 50);
  });

  // Track duration on page leave
  window.addEventListener("beforeunload", sendDuration);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      sendDuration();
    }
  });
}
