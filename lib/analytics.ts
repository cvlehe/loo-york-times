import { track, type BeforeSendEvent } from "@vercel/analytics";

export type AnalyticsEvents = {
  navigation_clicked: { destination: string };
  directions_clicked: Record<string, never>;
  article_clicked: { article_type: "internal" | "external" };
  article_scroll: { depth: 50 | 90 };
  map_status: { status: "ready" | "error" };
  location_requested: Record<string, never>;
  location_result: { status: "located" | "denied" | "timed-out" | "unavailable" };
  restroom_selected: { source: "map" | "list" };
  directory_searched: { result_count: number; has_query: boolean };
  directory_filtered: { open_only: boolean; accessibility: string; changing_only: boolean; result_count: number };
  form_started: { form: "review" | "submission" | "login" };
  form_submitted: { form: "review" | "submission" | "login" };
  form_result: { form: "review" | "submission" | "login"; status: "success" | "error" };
};

export function isTrackedPath(path: string) {
  return path === "/" || path === "/login" || path === "/city-progress" ||
    path === "/submissions" || path === "/submissions/new" ||
    /^\/restrooms\/[^/]+$/.test(path) || /^\/journalism(?:\/[^/]+(?:\/[^/]+)?)?$/.test(path);
}

/** A closed event schema: never pass form contents, search text, or user identity. */
export function trackEvent<K extends keyof AnalyticsEvents>(name: K, properties: AnalyticsEvents[K]) {
  if (typeof window === "undefined" || !isTrackedPath(window.location.pathname) ||
      navigator.doNotTrack === "1" ||
      (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl) return;
  try {
    track(name, properties);
  } catch {
    // Analytics must never prevent navigation or a successful contribution.
  }
}

/** Strip URL-carried email, auth codes, search terms, and return destinations. */
export function sanitizeAnalyticsEvent(event: BeforeSendEvent): BeforeSendEvent | null {
  if (navigator.doNotTrack === "1" ||
      (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl) return null;
  try {
    const url = new URL(event.url);
    if (!isTrackedPath(url.pathname)) return null;
    url.search = "";
    url.hash = "";
    return { ...event, url: url.toString() };
  } catch {
    return null;
  }
}
