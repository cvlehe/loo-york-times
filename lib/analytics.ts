import { type BeforeSendEvent } from "@vercel/analytics";

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

export const googleMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
export const hasGoogleAnalytics = Boolean(googleMeasurementId && /^G-[A-Z0-9]+$/.test(googleMeasurementId));

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    looGoogleAnalyticsInitialized?: boolean;
  }
}

const consentKey = "loo-usage-analytics";
export function googleConsent() {
  try { return window.localStorage.getItem(consentKey) === "granted"; } catch { return false; }
}
export function setGoogleConsent(granted: boolean) {
  try { window.localStorage.setItem(consentKey, granted ? "granted" : "denied"); } catch { return; }
  (window as unknown as Record<string, unknown>)[`ga-disable-${googleMeasurementId}`] = !granted;
  window.gtag?.("consent", "update", { analytics_storage: granted ? "granted" : "denied" });
  window.dispatchEvent(new Event("loo-analytics-consent"));
}

/** Configure once, after opt-in and before Google consumes queued events. */
export function initializeGoogleAnalytics() {
  if (!hasGoogleAnalytics || typeof window === "undefined" || !googleConsent() || window.looGoogleAnalyticsInitialized) return;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer!.push(arguments); };
  window.gtag("consent", "default", {
    analytics_storage: "granted", ad_storage: "denied",
    ad_user_data: "denied", ad_personalization: "denied",
  });
  window.gtag("js", new Date());
  window.gtag("config", googleMeasurementId, {
    send_page_view: false,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    page_location: window.location.origin + window.location.pathname,
    page_referrer: "",
    page_title: "The Loo York Times",
    ignore_referrer: true,
  });
  window.looGoogleAnalyticsInitialized = true;
}

/** Custom events go only to GA4; Vercel remains on its free page-view tier. */
export function trackEvent<K extends keyof AnalyticsEvents>(name: K, properties: AnalyticsEvents[K]) {
  if (typeof window === "undefined" || !hasGoogleAnalytics || !googleConsent() || !isTrackedPath(window.location.pathname) ||
      navigator.doNotTrack === "1" ||
      (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl) return;
  try {
    initializeGoogleAnalytics();
    window.gtag?.("event", name, {
      ...properties,
      send_to: googleMeasurementId,
      page_location: window.location.origin + window.location.pathname,
      page_referrer: "",
      page_title: "The Loo York Times",
    });
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
