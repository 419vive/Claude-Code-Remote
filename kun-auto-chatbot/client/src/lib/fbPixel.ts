/**
 * Facebook Pixel client-side helpers.
 *
 * The base Pixel script is loaded in index.html.
 * This module provides typed wrappers for custom events
 * so components can fire events without touching `fbq` directly.
 */

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

function isPixelReady(): boolean {
  return typeof window !== "undefined" && typeof window.fbq === "function";
}

/** Generate a unique event ID for CAPI deduplication */
export function generateEventId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Get fbclid from current URL (for passing to server) */
export function getFbclid(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const params = new URLSearchParams(window.location.search);
  return params.get("fbclid") ?? undefined;
}

/** Get _fbp cookie value (for passing to server) */
export function getFbp(): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(/(?:^|;\s*)_fbp=([^;]*)/);
  return match?.[1] ?? undefined;
}

// ---------- Standard events ----------

/** Track a page view (already auto-fired in index.html, use for SPA navigation) */
export function trackPageView(eventId?: string) {
  if (!isPixelReady()) return;
  window.fbq!("track", "PageView", {}, { eventID: eventId });
}

/** Track when a user views specific content (e.g. vehicle detail page) */
export function trackViewContent(params: {
  contentName: string;
  contentCategory?: string;
  contentIds?: string[];
  value?: number;
  currency?: string;
}) {
  if (!isPixelReady()) return;
  const eventId = generateEventId();
  window.fbq!(
    "track",
    "ViewContent",
    {
      content_name: params.contentName,
      content_category: params.contentCategory,
      content_ids: params.contentIds,
      value: params.value,
      currency: params.currency ?? "TWD",
    },
    { eventID: eventId },
  );
  return eventId;
}

/** Track a lead (LINE inquiry, form submission, phone call click) */
export function trackLead(params?: {
  contentName?: string;
  value?: number;
}) {
  if (!isPixelReady()) return;
  const eventId = generateEventId();
  window.fbq!(
    "track",
    "Lead",
    {
      content_name: params?.contentName,
      value: params?.value,
      currency: "TWD",
    },
    { eventID: eventId },
  );
  return eventId;
}

/** Track contact initiation (e.g. clicking LINE/phone button) */
export function trackContact() {
  if (!isPixelReady()) return;
  const eventId = generateEventId();
  window.fbq!("track", "Contact", {}, { eventID: eventId });
  return eventId;
}

/** Track search (e.g. vehicle search/filter) */
export function trackSearch(searchString: string) {
  if (!isPixelReady()) return;
  const eventId = generateEventId();
  window.fbq!(
    "track",
    "Search",
    { search_string: searchString },
    { eventID: eventId },
  );
  return eventId;
}
